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
    grupos_opcao: list[dict] | None = None,
) -> dict:
    """Cria ou substitui por completo um item (PUT é idempotente e sempre reenvia a estrutura toda).

    `grupos_opcao` (opcional) associa grupos de complemento JÁ EXISTENTES ao item — mesmo
    formato de `create_combo` sem o `principal`: {"optionGroupId": ..., "min": 1, "max": 1}.
    Confirmado ao vivo contra o sandbox.
    """
    option_groups_produto = [
        {
            "id": grupo["optionGroupId"],
            "min": grupo.get("min", 0),
            "max": grupo.get("max", 1),
            "index": indice,
        }
        for indice, grupo in enumerate(grupos_opcao or [])
    ]
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
                "optionGroups": option_groups_produto,
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


# Schema confirmado ao vivo contra o sandbox (PUT real, resposta 200 com o item criado
# como COMBO_V2 e o grupo de opção linkado corretamente). Só compõe grupos de opção JÁ
# EXISTENTES no catálogo — pra criar um grupo/opção novo do zero, use `create_option_group`
# + `create_option` antes de chamar esta função.
def create_combo(
    merchant_id: str,
    item_id: str,
    product_id: str,
    category_id: str,
    name: str,
    price: float,
    external_code: str,
    grupos_opcao: list[dict],
) -> dict:
    """Cria um item do tipo COMBO_V2 (ex: "Combo hambúrguer e refrigerante").

    `grupos_opcao` é uma lista de dicts, um por grupo de complemento do combo:
        {"optionGroupId": "<uuid já existente>", "principal": True, "min": 1, "max": 1}
    Exatamente um grupo deve ter `principal=True` (o iFood exige um único "grupo principal"
    por combo, usado pelos modelos de IA deles pra entender a composição do combo).
    """
    principais = [g for g in grupos_opcao if g.get("principal")]
    if len(principais) != 1:
        raise ValueError("Um combo precisa de exatamente um grupo de opção marcado como principal")

    option_groups_produto = []
    for indice, grupo in enumerate(grupos_opcao):
        entrada = {
            "id": grupo["optionGroupId"],
            "min": grupo.get("min", 1),
            "max": grupo.get("max", 1),
            "index": indice,
        }
        if grupo.get("principal"):
            entrada["associationType"] = "MAIN"
        option_groups_produto.append(entrada)

    body = {
        "item": {
            "id": item_id,
            "productId": product_id,
            "type": "COMBO_V2",
            "categoryId": category_id,
            "status": "AVAILABLE",
            "price": {"value": price},
            "externalCode": external_code,
        },
        "products": [
            {
                "id": product_id,
                "name": name,
                "description": name,
                "optionGroups": option_groups_produto,
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


def update_item_price(merchant_id: str, item_id: str, price: float) -> None:
    """Atualiza globalmente o preço de um item já existente no catálogo."""
    resp = requests.patch(
        f"{CATALOG_BASE}/merchants/{merchant_id}/items/price",
        headers=auth_headers(),
        json={"itemId": item_id, "price": {"value": price, "originalValue": price}},
        timeout=30,
    )
    resp.raise_for_status()


def get_category(merchant_id: str, catalog_id: str, category_id: str) -> dict:
    resp = requests.get(
        f"{CATALOG_BASE}/merchants/{merchant_id}/catalogs/{catalog_id}/categories/{category_id}",
        headers=auth_headers(),
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()


# Schema do corpo do PATCH não está 100% confirmado na doc oficial (só vimos o request
# do POST) — segue o mesmo formato do create_category, que é o mesmo recurso. Confirmar
# contra a página "Edit a category" do developer.ifood.com.br antes de depender disso
# numa homologação real.
def edit_category(merchant_id: str, catalog_id: str, category_id: str, **campos) -> dict:
    """Edita nome/status/sequência de uma categoria. Ex: edit_category(m, c, cid, status='PAUSED')."""
    resp = requests.patch(
        f"{CATALOG_BASE}/merchants/{merchant_id}/catalogs/{catalog_id}/categories/{category_id}",
        headers=auth_headers(),
        json=campos,
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json() if resp.content else {}


def delete_category(merchant_id: str, category_id: str) -> None:
    resp = requests.delete(
        f"{CATALOG_BASE}/merchants/{merchant_id}/categories/{category_id}",
        headers=auth_headers(),
        timeout=30,
    )
    resp.raise_for_status()


def delete_item(merchant_id: str, category_id: str, product_id: str) -> None:
    resp = requests.delete(
        f"{CATALOG_BASE}/merchants/{merchant_id}/categories/{category_id}/products/{product_id}",
        headers=auth_headers(),
        timeout=30,
    )
    resp.raise_for_status()


def update_item_shifts(merchant_id: str, item_id: str, shifts: list[dict]) -> None:
    """Define os turnos de disponibilidade de um item (ex: item que só vende no almoço).

    `shifts` é uma lista de {startTime, endTime (HH:MM), monday..sunday (bool)} — mesmo
    formato confirmado no schema de leitura de item da API de Catálogo v2. Usa o endpoint
    de JSON Merge Patch do item, então só o campo `shifts` é alterado.
    """
    resp = requests.patch(
        f"{CATALOG_BASE}/merchants/{merchant_id}/items/{item_id}",
        headers={**auth_headers(), "Content-Type": "application/merge-patch+json"},
        json={"shifts": shifts},
        timeout=30,
    )
    resp.raise_for_status()


def get_opening_hours(merchant_id: str) -> dict:
    resp = requests.get(
        f"{MERCHANT_BASE}/merchants/{merchant_id}/opening-hours",
        headers=auth_headers(),
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()


# Schema confirmado ao vivo contra o sandbox (round-trip GET -> PUT -> GET, resposta
# 201, mesmos dias/horários de volta). `shifts` é uma lista de
# {"dayOfWeek": "MONDAY".."SUNDAY", "start": "HH:MM:SS", "duration": <minutos>} — o PUT
# substitui a semana inteira de uma vez (não dá pra mudar só um dia).
def set_opening_hours(merchant_id: str, shifts: list[dict]) -> dict:
    resp = requests.put(
        f"{MERCHANT_BASE}/merchants/{merchant_id}/opening-hours",
        headers=auth_headers(),
        json={"shifts": shifts},
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json() if resp.content else {}


def list_interruptions(merchant_id: str) -> list[dict]:
    resp = requests.get(
        f"{MERCHANT_BASE}/merchants/{merchant_id}/interruptions",
        headers=auth_headers(),
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()


# Schema confirmado ao vivo contra o sandbox (POST real, resposta 201 com o id gerado):
# {"description": str, "start": "<ISO 8601>", "end": "<ISO 8601>"}. O fuso horário
# enviado é descartado pelo iFood — ele sempre usa o fuso da própria loja.
def create_interruption(merchant_id: str, description: str, start_iso: str, end_iso: str) -> dict:
    """Fecha a loja temporariamente (ex: sem entregador, fila da cozinha travada).
    `start_iso`/`end_iso` em ISO 8601 (ex: '2026-07-15T23:00:00.000Z')."""
    resp = requests.post(
        f"{MERCHANT_BASE}/merchants/{merchant_id}/interruptions",
        headers=auth_headers(),
        json={"description": description, "start": start_iso, "end": end_iso},
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()


def delete_interruption(merchant_id: str, interruption_id: str) -> None:
    resp = requests.delete(
        f"{MERCHANT_BASE}/merchants/{merchant_id}/interruptions/{interruption_id}",
        headers=auth_headers(),
        timeout=30,
    )
    resp.raise_for_status()


def list_option_groups(merchant_id: str) -> list[dict]:
    resp = requests.get(
        f"{CATALOG_BASE}/merchants/{merchant_id}/optionGroups",
        headers=auth_headers(),
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()


# Schema confirmado ao vivo contra o sandbox (POST real, resposta 201: {"id", "name"}).
# Não aparece na lista de endpoints da doc de referência que vimos (só tinha GET/PATCH/
# DELETE listados ali), mas existe e funciona de verdade na v2.
def create_option_group(merchant_id: str, name: str) -> dict:
    """Cria um grupo de complemento vazio (ex: "Escolha sua bebida"). Depois associe
    opções com `create_option` e associe o grupo a um item com `upsert_item(...,
    grupos_opcao=[...])` ou `create_combo`."""
    resp = requests.post(
        f"{CATALOG_BASE}/merchants/{merchant_id}/optionGroups",
        headers=auth_headers(),
        json={"name": name},
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()


def delete_option_group(merchant_id: str, option_group_id: str) -> None:
    resp = requests.delete(
        f"{CATALOG_BASE}/merchants/{merchant_id}/optionGroups/{option_group_id}",
        headers=auth_headers(),
        timeout=30,
    )
    resp.raise_for_status()


# Schema confirmado ao vivo contra o sandbox, inclusive os dois erros de validação que o
# próprio iFood devolveu no caminho (status é obrigatório; e precisa de `product` inline
# OU `productId` de um produto já existente — aqui sempre cria um produto novo pra opção).
def create_option(merchant_id: str, option_group_id: str, name: str, price: float, external_code: str) -> dict:
    """Cria uma opção nova (ex: "Coca-Cola") dentro de um grupo de complemento já existente."""
    resp = requests.post(
        f"{CATALOG_BASE}/merchants/{merchant_id}/optionGroups/{option_group_id}/options",
        headers=auth_headers(),
        json={
            "status": "AVAILABLE",
            "price": {"value": price},
            "externalCode": external_code,
            "product": {"name": name, "description": name},
        },
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()


def delete_option(merchant_id: str, option_group_id: str, option_product_id: str) -> None:
    """`option_product_id` é o `productId` devolvido por `create_option` (não o `id` da opção)."""
    resp = requests.delete(
        f"{CATALOG_BASE}/merchants/{merchant_id}/optionGroups/{option_group_id}/products/{option_product_id}/option",
        headers=auth_headers(),
        timeout=30,
    )
    resp.raise_for_status()
