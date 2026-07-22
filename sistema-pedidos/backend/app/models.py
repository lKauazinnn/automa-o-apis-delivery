"""Modelos SQLAlchemy. status/tipo são gravados como string (o .value do enum) pra evitar
a ambiguidade nome-vs-valor do Enum nativo no SQLite; a camada de schema/crud converte."""
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base
from .enums import OrderStatus, OrderType


class Store(Base):
    __tablename__ = "stores"

    id: Mapped[int] = mapped_column(primary_key=True)
    nome: Mapped[str] = mapped_column(String(120))
    endereco: Mapped[str | None] = mapped_column(String(255), default=None)
    status_integracao: Mapped[str] = mapped_column(String(40), default="Conectado")
    criado_em: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    orders: Mapped[list["Order"]] = relationship(back_populates="store")


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(primary_key=True)
    codigo: Mapped[str] = mapped_column(String(20), unique=True, index=True)  # ex: IF-9101
    identificador_ifood: Mapped[str | None] = mapped_column(String(64), default=None)

    tipo: Mapped[str] = mapped_column(String(30), default=OrderType.ENTREGA.value)
    status: Mapped[str] = mapped_column(String(30), default=OrderStatus.PENDENTE.value, index=True)

    # Pagamento
    pagamento_forma: Mapped[str | None] = mapped_column(String(60), default=None)
    pagamento_online: Mapped[bool] = mapped_column(Boolean, default=False)
    pre_pago: Mapped[float] = mapped_column(Float, default=0.0)
    a_receber: Mapped[float] = mapped_column(Float, default=0.0)
    documento: Mapped[str | None] = mapped_column(String(40), default=None)

    # Loja
    store_id: Mapped[int | None] = mapped_column(ForeignKey("stores.id"), default=None)

    # Entrega
    entrega_endereco: Mapped[str | None] = mapped_column(String(255), default=None)
    entrega_bairro: Mapped[str | None] = mapped_column(String(120), default=None)
    entrega_cidade: Mapped[str | None] = mapped_column(String(120), default=None)
    entrega_cep: Mapped[str | None] = mapped_column(String(20), default=None)
    entrega_complemento: Mapped[str | None] = mapped_column(String(255), default=None)
    entrega_referencia: Mapped[str | None] = mapped_column(String(255), default=None)
    entrega_modo: Mapped[str | None] = mapped_column(String(40), default=None)
    entrega_descricao: Mapped[str | None] = mapped_column(String(120), default=None)
    entregue_por: Mapped[str | None] = mapped_column(String(120), default=None)
    cod_retirada: Mapped[str | None] = mapped_column(String(20), default=None)
    previsto_em: Mapped[datetime | None] = mapped_column(DateTime, default=None)

    observacoes: Mapped[str | None] = mapped_column(Text, default=None)
    separacao_responsavel: Mapped[str | None] = mapped_column(String(120), default=None)

    # Totais
    subtotal: Mapped[float] = mapped_column(Float, default=0.0)
    taxa_entrega: Mapped[float] = mapped_column(Float, default=0.0)
    outras_taxas: Mapped[float] = mapped_column(Float, default=0.0)
    total: Mapped[float] = mapped_column(Float, default=0.0)

    # Disputa de cancelamento (seção 4 e 6): solicitado | negociando | aceito | recusado
    cancelamento_solicitado: Mapped[bool] = mapped_column(Boolean, default=False)
    cancelamento_status: Mapped[str | None] = mapped_column(String(30), default=None)

    # KDS: ocultar do board sem apagar (o pedido continua buscável em Pedidos)
    oculto_no_kds: Mapped[bool] = mapped_column(Boolean, default=False)

    recebido_em: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    atualizado_em: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    store: Mapped["Store | None"] = relationship(back_populates="orders")
    items: Mapped[list["OrderItem"]] = relationship(
        back_populates="order", cascade="all, delete-orphan", order_by="OrderItem.id"
    )
    events: Mapped[list["OrderEvent"]] = relationship(
        back_populates="order", cascade="all, delete-orphan", order_by="OrderEvent.timestamp"
    )

    # Campos derivados lidos pelo schema OrderSummary (from_attributes).
    @property
    def loja_nome(self) -> str | None:
        return self.store.nome if self.store else None

    @property
    def itens_count(self) -> int:
        return sum(i.quantidade for i in self.items)


class OrderItem(Base):
    __tablename__ = "order_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"))
    quantidade: Mapped[int] = mapped_column(Integer, default=1)
    nome: Mapped[str] = mapped_column(String(180))
    tag: Mapped[str | None] = mapped_column(String(80), default=None)  # ex: "NÃO ENTREGAR - Primeiro Nível"
    codigo_pdv: Mapped[str | None] = mapped_column(String(60), default=None)
    preco: Mapped[float] = mapped_column(Float, default=0.0)

    order: Mapped["Order"] = relationship(back_populates="items")
    complements: Mapped[list["ItemComplement"]] = relationship(
        back_populates="item", cascade="all, delete-orphan", order_by="ItemComplement.id"
    )


class ItemComplement(Base):
    __tablename__ = "item_complements"

    id: Mapped[int] = mapped_column(primary_key=True)
    order_item_id: Mapped[int] = mapped_column(ForeignKey("order_items.id"))
    nome: Mapped[str] = mapped_column(String(180))
    nivel: Mapped[str | None] = mapped_column(String(40), default=None)
    preco: Mapped[float] = mapped_column(Float, default=0.0)

    item: Mapped["OrderItem"] = relationship(back_populates="complements")


class OrderEvent(Base):
    """Linha do tempo append-only: cada mudança de status/ação vira um evento novo,
    nunca reescreve os anteriores (permite ramificar em cancelamento)."""

    __tablename__ = "order_events"

    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"))
    tipo: Mapped[str] = mapped_column(String(80))  # ex: "Pedido confirmado"
    info: Mapped[str | None] = mapped_column(Text, default=None)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    order: Mapped["Order"] = relationship(back_populates="events")
