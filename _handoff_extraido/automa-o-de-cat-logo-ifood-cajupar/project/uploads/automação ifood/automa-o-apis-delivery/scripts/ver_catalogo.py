"""Lista catálogos e categorias da loja configurada no .env, para inspeção manual."""
import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from dotenv import load_dotenv  # noqa: E402

load_dotenv()

from ifood_automacao.client import list_catalogs, list_categories  # noqa: E402

if __name__ == "__main__":
    merchant_id = os.environ["IFOOD_MERCHANT_ID"]
    catalogs = list_catalogs(merchant_id)
    print("Catálogos:")
    print(json.dumps(catalogs, indent=2, ensure_ascii=False))

    for catalog in catalogs:
        catalog_id = catalog["catalogId"] if "catalogId" in catalog else catalog.get("id")
        print(f"\nCategorias do catálogo {catalog_id}:")
        categories = list_categories(merchant_id, catalog_id)
        print(json.dumps(categories, indent=2, ensure_ascii=False))
