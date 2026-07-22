"""Schemas Pydantic (v2) de entrada e saída da API."""
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from .enums import OrderStatus, OrderType


class ComplementOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    nome: str
    nivel: str | None = None
    preco: float


class ItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    quantidade: int
    nome: str
    tag: str | None = None
    codigo_pdv: str | None = None
    preco: float
    complements: list[ComplementOut] = []


class EventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    tipo: str
    info: str | None = None
    timestamp: datetime


class StoreOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    nome: str
    endereco: str | None = None
    status_integracao: str


class OrderSummary(BaseModel):
    """Linha da tabela de Pedidos / card do KDS."""
    model_config = ConfigDict(from_attributes=True)
    id: int
    codigo: str
    tipo: str
    status: str
    pagamento_forma: str | None = None
    documento: str | None = None
    loja_nome: str | None = None
    total: float
    itens_count: int = 0
    oculto_no_kds: bool = False
    recebido_em: datetime


class OrderDetail(BaseModel):
    """Drawer de detalhes (seção 4)."""
    model_config = ConfigDict(from_attributes=True)
    id: int
    codigo: str
    identificador_ifood: str | None = None
    tipo: str
    status: str

    pagamento_forma: str | None = None
    pagamento_online: bool = False
    pre_pago: float = 0.0
    a_receber: float = 0.0
    documento: str | None = None

    store: StoreOut | None = None

    entrega_endereco: str | None = None
    entrega_bairro: str | None = None
    entrega_cidade: str | None = None
    entrega_cep: str | None = None
    entrega_complemento: str | None = None
    entrega_referencia: str | None = None
    entrega_modo: str | None = None
    entrega_descricao: str | None = None
    entregue_por: str | None = None
    cod_retirada: str | None = None
    previsto_em: datetime | None = None

    observacoes: str | None = None
    separacao_responsavel: str | None = None

    subtotal: float = 0.0
    taxa_entrega: float = 0.0
    outras_taxas: float = 0.0
    total: float = 0.0

    cancelamento_solicitado: bool = False
    cancelamento_status: str | None = None
    oculto_no_kds: bool = False

    recebido_em: datetime
    items: list[ItemOut] = []
    events: list[EventOut] = []


# ---- entrada ----

class ComplementIn(BaseModel):
    nome: str
    nivel: str | None = None
    preco: float = 0.0


class ItemIn(BaseModel):
    quantidade: int = 1
    nome: str
    tag: str | None = None
    codigo_pdv: str | None = None
    preco: float = 0.0
    complements: list[ComplementIn] = []


class OrderCreate(BaseModel):
    """Cria um pedido (usado pelo seed e para popular dados de teste)."""
    codigo: str | None = None  # gerado se ausente
    tipo: OrderType = OrderType.ENTREGA
    status: OrderStatus = OrderStatus.PENDENTE
    store_id: int | None = None

    pagamento_forma: str | None = None
    pagamento_online: bool = False
    documento: str | None = None

    entrega_endereco: str | None = None
    entrega_bairro: str | None = None
    entrega_cidade: str | None = None
    entrega_cep: str | None = None
    entrega_complemento: str | None = None
    entrega_referencia: str | None = None

    observacoes: str | None = None
    taxa_entrega: float = 0.0
    outras_taxas: float = 0.0
    items: list[ItemIn] = []


class TransitionIn(BaseModel):
    novo_status: OrderStatus
    motivo: str | None = None  # obrigatório quando novo_status == Cancelado


class PaginatedOrders(BaseModel):
    registros: list[OrderSummary]
    total: int
    page: int
    per_page: int
