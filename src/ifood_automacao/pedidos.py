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
    "CANCELLATION_REQUEST_FAILED": "Falha ao solicitar cancelamento",
    "HANDSHAKE_DISPUTE": "Cliente abriu negociação (cancelamento/reembolso)",
    "HANDSHAKE_SETTLEMENT": "Negociação encerrada",
}

# O header x-polling-merchants aceita várias lojas separadas por vírgula (limite do iFood: 100).
MAX_LOJAS_POR_POLLING = 100


def poll_events(merchant_ids) -> list[dict]:
    """Busca eventos pendentes (novos pedidos, mudanças de status) de uma ou mais lojas
    (`merchant_ids` = str ou lista). Cada evento tem id/code/fullCode/orderId/merchantId/
    createdAt/metadata. Precisa ser confirmado depois com `acknowledge_events`, senão o iFood
    devolve o mesmo evento de novo na próxima consulta. É ESTE polling (a cada 30s) que mantém a
    loja "conectada" no iFood — sem ele a loja aparece fechada ("Gestor de Pedidos desconectado")."""
    if isinstance(merchant_ids, str):
        merchant_ids = [merchant_ids]
    resp = requests.get(
        f"{EVENTS_BASE}/events:polling",
        headers={**auth_headers(), "x-polling-merchants": ",".join(merchant_ids[:MAX_LOJAS_POR_POLLING])},
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


def get_cancellation_reasons(order_id: str) -> list[dict]:
    """Motivos de cancelamento VÁLIDOS para este pedido agora (variam por pedido/momento).
    Cada um: {"cancelCode": "501", "description": "..."}. O iFood exige que o código usado em
    `cancel_order` venha desta lista. 204/vazio = pedido não pode mais ser cancelado pela loja."""
    resp = requests.get(f"{ORDER_BASE}/orders/{order_id}/cancellationReasons", headers=auth_headers(), timeout=30)
    resp.raise_for_status()
    if resp.status_code == 204 or not resp.content:
        return []
    return resp.json()


# Plataforma de Negociação (handshake): quando o cliente pede cancelamento/reembolso, chega um
# evento HANDSHAKE_DISPUTE com `metadata.disputeId`. A loja aceita ou recusa (com motivo) antes
# de expirar (`metadata.expiresAt`); se não responder, vale o `metadata.timeoutAction`.
# Rotas confirmadas ao vivo contra o sandbox (accept → DISPUTE_NOT_FOUND com id falso;
# reject → exige o campo `reason`).
def accept_dispute(dispute_id: str) -> None:
    resp = requests.post(f"{ORDER_BASE}/disputes/{dispute_id}/accept", headers=auth_headers(), json={}, timeout=30)
    resp.raise_for_status()


def reject_dispute(dispute_id: str, reason: str) -> None:
    resp = requests.post(
        f"{ORDER_BASE}/disputes/{dispute_id}/reject",
        headers=auth_headers(),
        json={"reason": reason},
        timeout=30,
    )
    resp.raise_for_status()


def cancel_order(order_id: str, reason_code: str = "501", reason: str = "Cancelado pelo estabelecimento") -> None:
    resp = requests.post(
        f"{ORDER_BASE}/orders/{order_id}/requestCancellation",
        headers=auth_headers(),
        json={"reason": reason, "cancellationCode": reason_code},
        timeout=30,
    )
    resp.raise_for_status()
