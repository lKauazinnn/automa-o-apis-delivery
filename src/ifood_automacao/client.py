"""Cliente fino para os endpoints da Merchant API / Catalog API do iFood usados na automação."""
import requests

from .auth import auth_headers

MERCHANT_BASE = "https://merchant-api.ifood.com.br/merchant/v1.0"
CATALOG_BASE = "https://merchant-api.ifood.com.br/catalog/v2.0"


def list_merchants() -> list[dict]:
    """Lista as lojas (merchants) associadas às credenciais configuradas."""
    resp = requests.get(f"{MERCHANT_BASE}/merchants", headers=auth_headers(), timeout=30)
    resp.raise_for_status()
    return resp.json()


def list_catalogs(merchant_id: str) -> list[dict]:
    resp = requests.get(
        f"{CATALOG_BASE}/merchants/{merchant_id}/catalogs",
        headers=auth_headers(),
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()


def list_categories(merchant_id: str, catalog_id: str, include_items: bool = False) -> list[dict]:
    resp = requests.get(
        f"{CATALOG_BASE}/merchants/{merchant_id}/catalogs/{catalog_id}/categories",
        headers=auth_headers(),
        params={"includeItems": "true"} if include_items else None,
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()


def create_category(merchant_id: str, catalog_id: str, name: str, sequence: int = 0) -> dict:
    resp = requests.post(
        f"{CATALOG_BASE}/merchants/{merchant_id}/catalogs/{catalog_id}/categories",
        headers=auth_headers(),
        json={"name": name, "status": "AVAILABLE", "template": "DEFAULT", "sequence": sequence},
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()


def upsert_item(
    merchant_id: str,
    item_id: str,
    product_id: str,
    category_id: str,
    name: str,
    price: float,
    external_code: str,
    available: bool = True,
) -> dict:
    """Cria ou substitui por completo um item (PUT é idempotente e sempre reenvia a estrutura toda)."""
    body = {
        "item": {
            "id": item_id,
            "productId": product_id,
            "type": "DEFAULT",
            "categoryId": category_id,
            "status": "AVAILABLE" if available else "UNAVAILABLE",
            "price": {"value": price},
            "externalCode": external_code,
        },
        "products": [
            {
                "id": product_id,
                "name": name,
                "description": name,
            }
        ],
        "optionGroups": [],
        "options": [],
    }
    resp = requests.put(
        f"{CATALOG_BASE}/merchants/{merchant_id}/items",
        headers=auth_headers(),
        json=body,
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json() if resp.content else {}


def patch_item_external_code(merchant_id: str, item_id: str, external_code: str) -> None:
    """Atualiza globalmente o código PDV (externalCode) de um item já existente no catálogo."""
    resp = requests.patch(
        f"{CATALOG_BASE}/merchants/{merchant_id}/items/externalCode",
        headers=auth_headers(),
        json={"itemId": item_id, "externalCode": external_code},
        timeout=30,
    )
    resp.raise_for_status()


def update_item_status(merchant_id: str, item_id: str, status: str) -> None:
    """Pausa (UNAVAILABLE) ou despausa (AVAILABLE) um item globalmente."""
    resp = requests.patch(
        f"{CATALOG_BASE}/merchants/{merchant_id}/items/status",
        headers=auth_headers(),
        json={"itemId": item_id, "status": status},
        timeout=30,
    )
    resp.raise_for_status()
