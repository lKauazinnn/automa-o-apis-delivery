"""Máquina de estados do pedido e mapeamentos derivados (seção 14 da especificação)."""
from enum import Enum


class OrderStatus(str, Enum):
    PENDENTE = "Pendente"
    CONFIRMADO = "Confirmado"
    PRONTO = "Pronto"
    SAIU_PARA_ENTREGA = "Saiu para entrega"
    RETIRADO = "Retirado"
    CONCLUIDO = "Concluído"
    CANCELADO = "Cancelado"


class OrderType(str, Enum):
    AGENDADO = "Agendado"
    MANUAL = "Manual"
    RETIRADA = "Retirada"
    ENTREGA = "Entrega"


# Transições permitidas a partir de cada status. Cancelar é permitido de qualquer
# estado não-terminal (ver seção 14: "Qualquer estado ──(cancelamento)──▶ Cancelado").
ALLOWED_TRANSITIONS: dict[OrderStatus, list[OrderStatus]] = {
    OrderStatus.PENDENTE: [OrderStatus.CONFIRMADO, OrderStatus.CANCELADO],
    OrderStatus.CONFIRMADO: [OrderStatus.PRONTO, OrderStatus.CANCELADO],
    OrderStatus.PRONTO: [OrderStatus.SAIU_PARA_ENTREGA, OrderStatus.RETIRADO, OrderStatus.CANCELADO],
    OrderStatus.SAIU_PARA_ENTREGA: [OrderStatus.CONCLUIDO, OrderStatus.CANCELADO],
    OrderStatus.RETIRADO: [OrderStatus.CONCLUIDO],
    OrderStatus.CONCLUIDO: [],
    OrderStatus.CANCELADO: [],
}

TERMINAL_STATUSES = {OrderStatus.CONCLUIDO, OrderStatus.CANCELADO}
STATUSES_ATIVOS = {
    OrderStatus.PENDENTE,
    OrderStatus.CONFIRMADO,
    OrderStatus.PRONTO,
    OrderStatus.SAIU_PARA_ENTREGA,
    OrderStatus.RETIRADO,
}

# Coluna do KDS ⇄ quais status caem nela (seção 3 e 14).
KDS_COLUNAS: dict[str, list[OrderStatus]] = {
    "novo": [OrderStatus.PENDENTE],
    "confirmado": [OrderStatus.CONFIRMADO],
    "despachado": [OrderStatus.PRONTO, OrderStatus.SAIU_PARA_ENTREGA, OrderStatus.RETIRADO],
    "concluido": [OrderStatus.CONCLUIDO],
    "cancelado": [OrderStatus.CANCELADO],
}

# Texto do evento gravado na timeline quando o pedido entra em cada status.
EVENTO_LABEL: dict[OrderStatus, str] = {
    OrderStatus.PENDENTE: "Novo pedido recebido",
    OrderStatus.CONFIRMADO: "Pedido confirmado",
    OrderStatus.PRONTO: "Pronto para retirada",
    OrderStatus.SAIU_PARA_ENTREGA: "Saiu para entrega",
    OrderStatus.RETIRADO: "Retirado no balcão",
    OrderStatus.CONCLUIDO: "Pedido concluído",
    OrderStatus.CANCELADO: "Pedido cancelado",
}


def pode_transicionar(atual: OrderStatus, novo: OrderStatus) -> bool:
    return novo in ALLOWED_TRANSITIONS.get(atual, [])
