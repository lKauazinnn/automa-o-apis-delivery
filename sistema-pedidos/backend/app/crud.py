"""Operações de banco: listagem com filtros/paginação, detalhe, criação, transição de status."""
import random
from datetime import datetime

from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session, selectinload

from . import models
from .enums import EVENTO_LABEL, OrderStatus, pode_transicionar
from .schemas import OrderCreate


def gerar_codigo(db: Session) -> str:
    while True:
        codigo = f"IF-{random.randint(1000, 9999)}"
        if not db.scalar(select(models.Order.id).where(models.Order.codigo == codigo)):
            return codigo


def _valores(seq):
    """Normaliza uma lista de enums/strings para os valores string usados no banco."""
    return [x.value if hasattr(x, "value") else x for x in seq]


def list_orders(
    db: Session,
    *,
    q: str | None = None,
    status: list | None = None,
    tipo: list | None = None,
    pagamento: str | None = None,
    documento: str | None = None,
    recebido_de: datetime | None = None,
    recebido_ate: datetime | None = None,
    page: int = 1,
    per_page: int = 25,
    order_by: str = "recebido_em",
    order_dir: str = "desc",
    incluir_ocultos: bool = True,
) -> tuple[list[models.Order], int]:
    conds = []
    if q:
        like = f"%{q}%"
        conds.append(or_(models.Order.codigo.ilike(like), models.Order.documento.ilike(like)))
    if status:
        conds.append(models.Order.status.in_(_valores(status)))
    if tipo:
        conds.append(models.Order.tipo.in_(_valores(tipo)))
    if pagamento:
        conds.append(models.Order.pagamento_forma == pagamento)
    if documento:
        conds.append(models.Order.documento.ilike(f"%{documento}%"))
    if recebido_de:
        conds.append(models.Order.recebido_em >= recebido_de)
    if recebido_ate:
        conds.append(models.Order.recebido_em <= recebido_ate)
    if not incluir_ocultos:
        conds.append(models.Order.oculto_no_kds.is_(False))

    coluna = getattr(models.Order, order_by, models.Order.recebido_em)
    ordem = coluna.desc() if order_dir == "desc" else coluna.asc()

    count_stmt = select(func.count(models.Order.id))
    data_stmt = (
        select(models.Order)
        .options(selectinload(models.Order.items), selectinload(models.Order.store))
        .order_by(ordem)
        .offset(max(page - 1, 0) * per_page)
        .limit(per_page)
    )
    # Só aplica o filtro quando há condições — .where(None) não funciona no SQLAlchemy.
    if conds:
        cond = and_(*conds)
        count_stmt = count_stmt.where(cond)
        data_stmt = data_stmt.where(cond)

    total = db.scalar(count_stmt) or 0
    rows = list(db.scalars(data_stmt).unique().all())
    return rows, total


def get_order(db: Session, order_id: int) -> models.Order | None:
    stmt = (
        select(models.Order)
        .where(models.Order.id == order_id)
        .options(
            selectinload(models.Order.items).selectinload(models.OrderItem.complements),
            selectinload(models.Order.events),
            selectinload(models.Order.store),
        )
    )
    return db.scalars(stmt).unique().first()


def create_order(db: Session, data: OrderCreate) -> models.Order:
    subtotal = 0.0
    itens = []
    for it in data.items:
        comp_total = sum(c.preco for c in it.complements)
        subtotal += (it.preco + comp_total) * it.quantidade
        itens.append(
            models.OrderItem(
                quantidade=it.quantidade,
                nome=it.nome,
                tag=it.tag,
                codigo_pdv=it.codigo_pdv,
                preco=it.preco,
                complements=[
                    models.ItemComplement(nome=c.nome, nivel=c.nivel, preco=c.preco) for c in it.complements
                ],
            )
        )

    total = subtotal + data.taxa_entrega + data.outras_taxas
    pre_pago = total if data.pagamento_online else 0.0

    order = models.Order(
        codigo=data.codigo or gerar_codigo(db),
        identificador_ifood=None,
        tipo=data.tipo.value,
        status=data.status.value,
        pagamento_forma=data.pagamento_forma,
        pagamento_online=data.pagamento_online,
        pre_pago=pre_pago,
        a_receber=0.0 if data.pagamento_online else total,
        documento=data.documento,
        store_id=data.store_id,
        entrega_endereco=data.entrega_endereco,
        entrega_bairro=data.entrega_bairro,
        entrega_cidade=data.entrega_cidade,
        entrega_cep=data.entrega_cep,
        entrega_complemento=data.entrega_complemento,
        entrega_referencia=data.entrega_referencia,
        observacoes=data.observacoes,
        subtotal=subtotal,
        taxa_entrega=data.taxa_entrega,
        outras_taxas=data.outras_taxas,
        total=total,
        items=itens,
    )
    # Evento inicial da timeline (sempre "Novo pedido recebido").
    order.events = [models.OrderEvent(tipo=EVENTO_LABEL[OrderStatus.PENDENTE])]
    db.add(order)
    db.commit()
    db.refresh(order)
    return order


def registrar_evento(db: Session, order: models.Order, tipo: str, info: str | None = None) -> models.OrderEvent:
    ev = models.OrderEvent(order_id=order.id, tipo=tipo, info=info)
    db.add(ev)
    db.commit()
    db.refresh(order)
    return ev


def transition_status(db: Session, order: models.Order, novo: OrderStatus, motivo: str | None = None) -> models.Order:
    atual = OrderStatus(order.status)
    if novo == atual:
        return order
    if not pode_transicionar(atual, novo):
        raise ValueError(f"Transição inválida: {atual.value} → {novo.value}")

    order.status = novo.value
    if novo == OrderStatus.CANCELADO:
        order.cancelamento_status = "aceito"
    # Evento novo na timeline (append-only — nunca reescreve os anteriores).
    db.add(models.OrderEvent(order_id=order.id, tipo=EVENTO_LABEL[novo], info=motivo))
    db.commit()
    db.refresh(order)
    return order
