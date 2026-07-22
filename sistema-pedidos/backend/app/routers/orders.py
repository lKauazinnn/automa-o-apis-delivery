"""Endpoints REST de pedidos + push por WebSocket nas mutações."""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from .. import crud, schemas
from ..database import get_db
from ..enums import OrderStatus, OrderType
from ..ws import manager

router = APIRouter(prefix="/api/orders", tags=["orders"])


@router.get("", response_model=schemas.PaginatedOrders)
def listar(
    q: str | None = None,
    status: list[OrderStatus] | None = Query(default=None),
    tipo: list[OrderType] | None = Query(default=None),
    pagamento: str | None = None,
    documento: str | None = None,
    recebido_de: datetime | None = None,
    recebido_ate: datetime | None = None,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=25, ge=1, le=200),
    order_by: str = "recebido_em",
    order_dir: str = Query(default="desc", pattern="^(asc|desc)$"),
    incluir_ocultos: bool = True,
    db: Session = Depends(get_db),
):
    rows, total = crud.list_orders(
        db,
        q=q,
        status=status,
        tipo=tipo,
        pagamento=pagamento,
        documento=documento,
        recebido_de=recebido_de,
        recebido_ate=recebido_ate,
        page=page,
        per_page=per_page,
        order_by=order_by,
        order_dir=order_dir,
        incluir_ocultos=incluir_ocultos,
    )
    return schemas.PaginatedOrders(
        registros=[schemas.OrderSummary.model_validate(r) for r in rows],
        total=total,
        page=page,
        per_page=per_page,
    )


@router.get("/{order_id}", response_model=schemas.OrderDetail)
def detalhe(order_id: int, db: Session = Depends(get_db)):
    order = crud.get_order(db, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    return order


@router.post("", response_model=schemas.OrderDetail, status_code=201)
async def criar(payload: schemas.OrderCreate, db: Session = Depends(get_db)):
    order = crud.create_order(db, payload)
    order = crud.get_order(db, order.id)
    await manager.broadcast({"tipo": "pedido_criado", "order_id": order.id, "status": order.status})
    return order


@router.post("/{order_id}/transition", response_model=schemas.OrderDetail)
async def transicionar(order_id: int, payload: schemas.TransitionIn, db: Session = Depends(get_db)):
    order = crud.get_order(db, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    if payload.novo_status == OrderStatus.CANCELADO and not (payload.motivo or "").strip():
        raise HTTPException(status_code=400, detail="Informe o motivo do cancelamento.")
    try:
        crud.transition_status(db, order, payload.novo_status, payload.motivo)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
    order = crud.get_order(db, order_id)
    await manager.broadcast({"tipo": "status_alterado", "order_id": order.id, "status": order.status})
    return order
