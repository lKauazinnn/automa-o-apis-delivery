"""Carga em massa: cria/atualiza todos os itens ATIVOS da planilha no catálogo iFood,
organizados por categoria (coluna Grupo) e já com o código PDV vinculado (externalCode).

Preço é PROVISÓRIO (ver PRECO_PLACEHOLDER) — a planilha de origem não traz preço.
Ajustar os valores reais depois no Portal do Parceiro ou reexecutar com uma fonte de preço.

Resumível: se for interrompido, rodar de novo pula os PDVs já marcados como "ok" no CSV de log.
"""
import csv
import json
import os
import sys
import time
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from dotenv import load_dotenv  # noqa: E402

load_dotenv()

from ifood_automacao.client import create_category, list_catalogs, list_categories, upsert_item  # noqa: E402
from ifood_automacao.planilha import carregar_itens  # noqa: E402
from ifood_automacao.rate_limit import com_retry  # noqa: E402

PRECO_PLACEHOLDER = 0.01  # provisório — ajustar depois no Portal do Parceiro
LOG_PATH = Path(__file__).resolve().parent.parent / "data" / "resultado_carga.csv"
PAUSA_ENTRE_CHAMADAS = 0.15  # segundos, para não estourar rate limit


def carregar_ja_processados() -> set[str]:
    if not LOG_PATH.exists():
        return set()
    with LOG_PATH.open(newline="", encoding="utf-8") as f:
        return {row["codigo_pdv"] for row in csv.DictReader(f) if row["resultado"] == "ok"}


def registrar(writer, codigo_pdv, descricao, grupo, resultado, detalhe):
    writer.writerow(
        {
            "codigo_pdv": codigo_pdv,
            "descricao": descricao,
            "grupo": grupo,
            "resultado": resultado,
            "detalhe": detalhe,
        }
    )


def main():
    merchant_id = os.environ["IFOOD_MERCHANT_ID"]
    catalog_id = list_catalogs(merchant_id)[0]["catalogId"]

    print("Carregando categorias existentes...")
    categorias_existentes = {c["name"]: c["id"] for c in list_categories(merchant_id, catalog_id)}

    df = carregar_itens()
    ativos = df[df["ativo"]].reset_index(drop=True)
    ja_processados = carregar_ja_processados()
    pendentes = ativos[~ativos["codigo_pdv"].isin(ja_processados)]

    print(f"Total ativos: {len(ativos)} | já processados antes: {len(ja_processados)} | pendentes: {len(pendentes)}")

    grupos_necessarios = pendentes["grupo"].unique()
    for grupo in grupos_necessarios:
        if grupo not in categorias_existentes:
            categoria = com_retry(create_category, merchant_id, catalog_id, name=grupo)
            categorias_existentes[grupo] = categoria.get("categoryId") or categoria["id"]
            print(f"  categoria criada: {grupo}")
            time.sleep(PAUSA_ENTRE_CHAMADAS)

    escrever_cabecalho = not LOG_PATH.exists()
    with LOG_PATH.open("a", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["codigo_pdv", "descricao", "grupo", "resultado", "detalhe"])
        if escrever_cabecalho:
            writer.writeheader()

        ok, erro = 0, 0
        for i, row in pendentes.iterrows():
            category_id = categorias_existentes[row["grupo"]]
            try:
                com_retry(
                    upsert_item,
                    merchant_id=merchant_id,
                    item_id=str(uuid.uuid4()),
                    product_id=str(uuid.uuid4()),
                    category_id=category_id,
                    name=row["descricao"],
                    price=PRECO_PLACEHOLDER,
                    external_code=row["codigo_pdv"],
                    available=True,
                )
                registrar(writer, row["codigo_pdv"], row["descricao"], row["grupo"], "ok", "")
                ok += 1
            except Exception as exc:  # segue processando o resto mesmo se um item falhar
                registrar(writer, row["codigo_pdv"], row["descricao"], row["grupo"], "erro", str(exc))
                erro += 1

            if (ok + erro) % 25 == 0:
                f.flush()
                print(f"  progresso: {ok + erro}/{len(pendentes)} (ok={ok}, erro={erro})")

            time.sleep(PAUSA_ENTRE_CHAMADAS)

    print(f"\nConcluído. ok={ok} erro={erro}. Log completo em {LOG_PATH}")


if __name__ == "__main__":
    main()
