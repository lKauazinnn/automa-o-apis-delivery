"""Cria uma categoria de teste e alguns itens de exemplo da planilha no catálogo sandbox,
já com o código PDV vinculado, só para validar o fluxo ponta a ponta."""
import json
import os
import sys
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from dotenv import load_dotenv  # noqa: E402

load_dotenv()

from ifood_automacao.client import create_category, list_catalogs, list_categories, upsert_item  # noqa: E402
from ifood_automacao.planilha import carregar_itens  # noqa: E402

PRECO_PLACEHOLDER = 1.00  # a planilha não tem preço; isto é só para validar o fluxo no sandbox
NOME_CATEGORIA_TESTE = "Teste Automacao"

if __name__ == "__main__":
    merchant_id = os.environ["IFOOD_MERCHANT_ID"]
    catalog_id = list_catalogs(merchant_id)[0]["catalogId"]

    categorias_existentes = list_categories(merchant_id, catalog_id)
    existente = next((c for c in categorias_existentes if c["name"] == NOME_CATEGORIA_TESTE), None)
    if existente:
        category_id = existente["id"]
        print("Reaproveitando categoria existente:", category_id)
    else:
        categoria = create_category(merchant_id, catalog_id, name=NOME_CATEGORIA_TESTE)
        category_id = categoria.get("categoryId") or categoria["id"]
        print("Categoria criada:", json.dumps(categoria, indent=2, ensure_ascii=False))

    df = carregar_itens()
    amostra = df[df["ativo"]].head(3)

    for _, row in amostra.iterrows():
        item_id = str(uuid.uuid4())
        product_id = str(uuid.uuid4())
        resultado = upsert_item(
            merchant_id=merchant_id,
            item_id=item_id,
            product_id=product_id,
            category_id=category_id,
            name=row["descricao"],
            price=PRECO_PLACEHOLDER,
            external_code=row["codigo_pdv"],
            available=True,
        )
        print(f"\nItem criado: {row['descricao']} (PDV {row['codigo_pdv']})")
        print(json.dumps(resultado, indent=2, ensure_ascii=False))
