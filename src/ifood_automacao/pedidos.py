"""Cliente fino para a Order API e a Events API (polling) do iFood — mesmo padrão de
`client.py` (funções soltas, `auth_headers()`, `raise_for_status()`), usado pelas rotas de
Pedidos/KDS/Eventos em `server/app.py`."""
import requests

from .auth import auth_headers

ORDER_BASE = "https://merchant-api.ifood.com.br/order/v1.0"
EVENTS_BASE = "https://merchant-api.ifood.com.br/events/v1.0"

TIPO_IFOOD_PARA_INTERNO = {"DELIVERY": "ENTREGA", "TAKEOUT": "RETIRADA", "DINE_IN": "MESA"}

CODIGO_EVENTO_LABEL = {
    "PLACED": "Novo pedido recebido",
    "CONFIRMED": "Pedido confirmado",
    "STARTED_PREPARATION": "Preparo iniciado",
    "READY_TO_PICKUP": "Pronto para retirada",
    "DISPATCHED": "Pedido despachado",
    "CONCLUDED": "Pedido concluído",
    "CANCELLED": "Pedido cancelado",
    "CANCELLATION_REQUESTED": "Cancelamento solicitado",
}


def poll_events(merchant_id: str) -> list[dict]:
    """Busca eventos pendentes (novos pedidos, mudanças de status) da loja. Cada evento tem
    id/code/orderId/createdAt/fullCode. Precisa ser confirmado depois com `acknowledge_events`,
    senão o iFood devolve o mesmo evento de novo na próxima consulta."""
    resp = requests.get(
        f"{EVENTS_BASE}/events:polling",
        headers={**auth_headers(), "x-polling-merchants": merchant_id},
        timeout=30,
    )
    resp.raise_for_status()
    if resp.status_code == 204 or not resp.content:
        return []
    return resp.json()


def acknowledge_events(event_ids: list[str]) -> None:
    """Confirma o recebimento dos eventos — obrigatório, senão o iFood reenvia os mesmos
    eventos na próxima consulta indefinidamente."""
    if not event_ids:
        return
    resp = requests.post(
        f"{EVENTS_BASE}/events/acknowledgment",
        headers=auth_headers(),
        json=[{"id": eid} for eid in event_ids],
        timeout=30,
    )
    resp.raise_for_status()


def get_order_details(order_id: str) -> dict:
    """Payload completo do pedido: cliente, itens com complementos, pagamento, entrega,
    benefícios/cupons — o schema real documentado em `Order.detalhes_brutos`."""
    resp = requests.get(f"{ORDER_BASE}/orders/{order_id}", headers=auth_headers(), timeout=30)
    resp.raise_for_status()
    return resp.json()


def confirm_order(order_id: str) -> None:
    resp = requests.post(f"{ORDER_BASE}/orders/{order_id}/confirm", headers=auth_headers(), timeout=30)
    resp.raise_for_status()


def start_preparation(order_id: str) -> None:
    resp = requests.post(f"{ORDER_BASE}/orders/{order_id}/startPreparation", headers=auth_headers(), timeout=30)
    resp.raise_for_status()


def ready_to_pickup(order_id: str) -> None:
    resp = requests.post(f"{ORDER_BASE}/orders/{order_id}/readyToPickup", headers=auth_headers(), timeout=30)
    resp.raise_for_status()


def dispatch_order(order_id: str) -> None:
    resp = requests.post(f"{ORDER_BASE}/orders/{order_id}/dispatch", headers=auth_headers(), timeout=30)
    resp.raise_for_status()


def cancel_order(order_id: str, reason_code: str = "501", reason: str = "Cancelado pelo estabelecimento") -> None:
    resp = requests.post(
        f"{ORDER_BASE}/orders/{order_id}/requestCancellation",
        headers=auth_headers(),
        json={"reason": reason, "cancellationCode": reason_code},
        timeout=30,
    )
    resp.raise_for_status()
