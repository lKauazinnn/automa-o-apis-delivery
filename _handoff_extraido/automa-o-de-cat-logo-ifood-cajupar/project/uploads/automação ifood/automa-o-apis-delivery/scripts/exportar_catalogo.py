"""Puxa o catálogo atual (categorias + itens) direto da API do iFood e exporta pra uma planilha,
pra conferência sem precisar entrar no Portal do Parceiro."""
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from dotenv import load_dotenv  # noqa: E402

load_dotenv()

import pandas as pd  # noqa: E402

from ifood_automacao.client import list_catalogs, list_categories  # noqa: E402

OUT_PATH = Path(__file__).resolve().parent.parent / "data" / "catalogo_atual_ifood.xlsx"

if __name__ == "__main__":
    merchant_id = os.environ["IFOOD_MERCHANT_ID"]
    catalog_id = list_catalogs(merchant_id)[0]["catalogId"]
    categorias = list_categories(merchant_id, catalog_id)

    linhas = []
    for cat in categorias:
        for item in cat.get("items", []):
            linhas.append(
                {
                    "categoria": cat["name"],
                    "nome_item": item.get("name"),
                    "codigo_pdv": item.get("externalCode"),
                    "preco": item.get("price", {}).get("value"),
                    "status": item.get("status"),
                    "itemId": item.get("id"),
                }
            )

    df = pd.DataFrame(linhas)
    df.to_excel(OUT_PATH, index=False)
    print(f"Exportado {len(df)} itens em {len(categorias)} categorias para {OUT_PATH}")
