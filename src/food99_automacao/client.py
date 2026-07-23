"""Cliente fino da API do 99Food / DiDi Food: pedidos, itens e lojas.

Endpoints por-loja recebem `app_shop_id` (id da loja no seu sistema) e resolvem o
`auth_token` sozinhos via `auth.get_auth_token`. Endpoints de nível-app (list_shops)
assinam com `gerar_sign`.
"""
import time

import requests

from .auth import BASE, _app_id, checar, gerar_sign, get_auth_token

# O ambiente de teste do 99 limita list a ~2 req/120s. Cache curto do v3 list evita
# estourar isso quando o usuário edita vários itens seguidos (reusa a mesma leitura).
_v3_cache: dict[str, tuple[float, dict]] = {}
_V3_TTL = 90  # segundos

# Motivos de rejeição aceitos pelo DiDi no cancelamento (reason_id).
MOTIVOS_CANCELAMENTO = {
    1010: "Sem estoque do item",
    1020: "Loja fechada / fora do horário",
    1030: "Fora da área de entrega",
    1040: "Sem entregador",
    1050: "Cozinha sobrecarregada",
    1060: "Problema no sistema/PDV",
    1080: "Outro motivo",
}


def _get(path: str, params: dict):
    resp = requests.get(f"{BASE}{path}", params=params, timeout=30)
    resp.raise_for_status()
    return checar(resp.json())


def _post(path: str, body: dict | None = None, params: dict | None = None):
    resp = requests.post(f"{BASE}{path}", params=params, json=body, timeout=30)
    resp.raise_for_status()
    return checar(resp.json())


# ------------------------------------------------------------------ Pedidos

def order_detail(app_shop_id: str, order_id: int) -> dict:
    """Detalhe completo do pedido (itens, cliente, pagamento, endereço, timestamps)."""
    return _get("/v1/order/order/detail", {"auth_token": get_auth_token(app_shop_id), "order_id": order_id})


def confirm_order(app_shop_id: str, order_id: int):
    """Aceita/confirma o pedido (primeiro passo no KDS)."""
    return _post("/v1/order/order/confirm", {"auth_token": get_auth_token(app_shop_id), "order_id": order_id})


def cancel_order(app_shop_id: str, order_id: int, reason_id: int, reason: str = ""):
    """Rejeita/cancela o pedido. `reason_id` deve ser um de MOTIVOS_CANCELAMENTO."""
    if reason_id not in MOTIVOS_CANCELAMENTO:
        raise ValueError(f"reason_id inválido: {reason_id}. Use um de {sorted(MOTIVOS_CANCELAMENTO)}")
    return _post(
        "/v1/order/order/cancel",
        {"auth_token": get_auth_token(app_shop_id), "order_id": order_id, "reason_id": reason_id, "reason": reason},
    )


def order_ready(app_shop_id: str, order_id: int):
    """Marca o pedido como pronto (refeição preparada)."""
    return _get("/v1/order/order/ready", {"auth_token": get_auth_token(app_shop_id), "order_id": order_id})


def order_delivered(app_shop_id: str, order_id: int):
    """Marca como entregue. Só para pedidos de entrega própria (self-delivery)."""
    return _get("/v1/order/order/delivered", {"auth_token": get_auth_token(app_shop_id), "order_id": order_id})


# ------------------------------------------------------------------ Itens / cardápio

def list_items(app_shop_id: str) -> dict:
    """Cardápio da loja (v1): {menus, categories, items} — bom pra EXIBIR o catálogo."""
    return _get("/v1/item/item/list", {"auth_token": get_auth_token(app_shop_id)})


def list_items_v3(app_shop_id: str, usar_cache: bool = True) -> dict:
    """Cardápio no formato v3 (structs editáveis) — necessário pra EDITAR/salvar item.
    Itens criados via upload v3 só aceitam edição por aqui (o v1/update dá conflito).
    Cacheado por ~90s pra respeitar o rate-limit do ambiente de teste (2 req/120s)."""
    agora = time.time()
    if usar_cache and app_shop_id in _v3_cache:
        ts, dados = _v3_cache[app_shop_id]
        if agora - ts < _V3_TTL:
            return dados
    dados = _get("/v3/item/item/list", {"auth_token": get_auth_token(app_shop_id)})
    _v3_cache[app_shop_id] = (agora, dados)
    return dados


def _achar_item_v3(app_shop_id: str, item_id: str) -> dict:
    for it in list_items_v3(app_shop_id).get("items", []):
        if it.get("app_item_id") == item_id:
            return it
    raise ValueError(f"Item '{item_id}' não encontrado no cardápio do 99Food.")


def update_item_v3(app_shop_id: str, item_struct: dict):
    """Salva um item (struct v3 completo) via /v3/item/item/updateItem."""
    body = {**item_struct, "auth_token": get_auth_token(app_shop_id)}
    resultado = _post("/v3/item/item/updateItem", body=body)
    _v3_cache.pop(app_shop_id, None)  # invalida o cache após salvar
    return resultado


def update_item_price(app_shop_id: str, item_id: str, preco_reais: float):
    """Altera o preço de um item (recebe em reais; o 99 guarda em centavos)."""
    it = _achar_item_v3(app_shop_id, item_id)
    it["price"] = int(round(float(preco_reais) * 100))
    return update_item_v3(app_shop_id, it)


def update_item_campos(app_shop_id: str, item_id: str, **campos):
    """Altera campos livres do item (ex: item_name, short_desc, app_external_id) e salva."""
    it = _achar_item_v3(app_shop_id, item_id)
    it.update(campos)
    return update_item_v3(app_shop_id, it)


# ------------------------------------------------------------------ Import de cardápio (upload)

def upload_menu(app_shop_id: str, menus: list, categories: list, items: list, modifier_groups: list):
    """Sobe o cardápio INTEIRO (assíncrono) via /v3/item/item/upload. Devolve TaskInfo (task_id).

    ⚠️ ATENÇÃO: este endpoint SUBSTITUI o cardápio da loja. Só chame com o payload completo
    e validado (menus + categories + items + modifier_groups). Depois acompanhe a tarefa com
    get_menu_task_info(task_id). Ainda NÃO validado ao vivo — teste com cuidado numa loja de teste.
    """
    body = {
        "auth_token": get_auth_token(app_shop_id),
        "menus": menus,
        "categories": categories,
        "items": items,
        "modifier_groups": modifier_groups,
    }
    resultado = _post("/v3/item/item/upload", body=body)
    _v3_cache.pop(app_shop_id, None)
    return resultado


def get_menu_task_info(app_shop_id: str, task_id: str):
    """Status da tarefa assíncrona de upload de cardápio (status: 0=aguardando, 1=sucesso, 2=falha)."""
    return _get("/v1/item/item/getMenuTaskInfo", {"auth_token": get_auth_token(app_shop_id), "task_id": str(task_id)})


def aguardar_upload(app_shop_id: str, resultado_upload: dict, timeout: int = 60, intervalo: int = 3) -> dict:
    """Acompanha a task de upload até concluir (status 1=sucesso, 2=falha). Confirmado ao vivo."""
    task_id = (resultado_upload or {}).get("taskID")
    if not task_id:
        return resultado_upload or {}
    fim = time.time() + timeout
    info = {}
    while time.time() < fim:
        info = get_menu_task_info(app_shop_id, task_id) or {}
        if info.get("status") in (1, 2):
            return info
        time.sleep(intervalo)
    return info


def criar_item(
    app_shop_id: str,
    *,
    categoria_id: str,
    nome: str,
    preco_reais: float,
    item_id: str | None = None,
    descricao: str = "",
    pdv: str = "",
    menu: dict | None = None,
) -> dict:
    """Cria um item novo no cardápio: reconstrói o menu COMPLETO e sobe (upload v3).
    NÃO é destrutivo — preserva menus/categorias/itens/modifiers e só adiciona o item novo.
    `menu` (v3 list) opcional evita uma leitura extra (útil por causa do rate-limit)."""
    m = menu or list_items_v3(app_shop_id, usar_cache=False)
    items = [dict(it) for it in m.get("items", [])]
    categories = [dict(c) for c in m.get("categories", [])]
    item_id = item_id or f"item_{int(time.time())}"
    if any(it.get("app_item_id") == item_id for it in items):
        raise ValueError(f"Item '{item_id}' já existe no cardápio.")
    cat = next((c for c in categories if c.get("app_category_id") == categoria_id), None)
    if not cat:
        raise ValueError(f"Categoria '{categoria_id}' não encontrada.")
    items.append(
        {
            "app_item_id": item_id,
            "item_name": nome[:50],
            "short_desc": (descricao or "")[:300],
            "price": int(round(float(preco_reais) * 100)),
            "status": 1,
            "is_sold_separately": True,
            "app_external_id": pdv or "",
            "app_modifier_group_ids": [],
        }
    )
    cat["app_item_ids"] = list(cat.get("app_item_ids", [])) + [item_id]
    resultado = upload_menu(app_shop_id, m.get("menus", []), categories, items, m.get("modifier_groups", []))
    return {"item_id": item_id, "task": aguardar_upload(app_shop_id, resultado)}


def update_item_status(app_shop_id: str, item_id: str, disponivel: bool):
    """Pausa/despausa um item (status 1=disponível, 2=indisponível)."""
    return _post(
        "/v1/item/item/updateItemStatus",
        body={"item_id": item_id, "status": 1 if disponivel else 2},
        params={"auth_token": get_auth_token(app_shop_id)},
    )


# ------------------------------------------------------------------ Lojas (nível-app, assinado)

def list_shops(page_no: int = 1, page_size: int = 30) -> dict:
    """Lista as lojas vinculadas ao app. Endpoint de nível-app — exige assinatura.
    (Ver o aviso sobre o algoritmo do `sign` em auth.gerar_sign.)"""
    # timestamp como STRING (o servidor do 99 rejeita inteiro na validação de tempo).
    params = {"app_id": _app_id(), "timestamp": str(int(time.time())), "page_no": page_no, "page_size": page_size}
    params["sign"] = gerar_sign(params)
    return _post("/v1/shop/shop/list", body=params)
