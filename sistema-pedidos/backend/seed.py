"""Popula o banco com dados de teste: 4 lojas + ~20 pedidos em status variados
(cobrindo todas as colunas do KDS), com timelines coerentes. Rode: python seed.py"""
import random
from datetime import datetime, timedelta

from sqlalchemy import delete

from app import crud, models
from app.database import SessionLocal, init_db
from app.enums import OrderStatus, OrderType
from app.schemas import ComplementIn, ItemIn, OrderCreate

STORES = [
    ("Cajupar Burger - Centro", "Av. Central, 100 - Centro"),
    ("Cajupar Pizza - Zona Sul", "Rua das Flores, 250 - Jardim"),
    ("Cajupar Açaí - Praia", "Av. Beira Mar, 900 - Orla"),
    ("Cajupar Sushi - Norte", "Rua do Porto, 45 - Setor Norte"),
]

# (nome, preço, código PDV, [(complemento, nível, preço)])
MENU = [
    ("X-Salada", 22.0, "PDV-001", [("Bacon extra", "Adicional", 4.0), ("Sem cebola", "Observação", 0.0)]),
    ("X-Bacon", 26.5, "PDV-002", [("Cheddar", "Adicional", 3.5)]),
    ("Pizza Marguerita", 39.9, "PDV-010", [("Borda catupiry", "Adicional", 8.0)]),
    ("Açaí 500ml", 18.0, "PDV-020", [("Granola", "Cobertura", 2.0), ("Leite condensado", "Cobertura", 2.0)]),
    ("Combo Sushi 20pç", 59.9, "PDV-030", [("Hashi extra", "Adicional", 0.0)]),
    ("Refrigerante Lata", 6.0, "PDV-040", []),
    ("Batata Frita M", 14.0, "PDV-050", [("Cheddar e bacon", "Adicional", 6.0)]),
]

PAGAMENTOS = [("Crédito — Master", True), ("Pix", True), ("Dinheiro", False), ("Débito — Visa", True)]

ENDERECOS = [
    ("Rua das Acácias, 120", "Centro", "Recife", "50000-000"),
    ("Av. Boa Viagem, 3200", "Boa Viagem", "Recife", "51020-000"),
    ("Rua do Sol, 44", "São José", "Recife", "50020-000"),
]

# Distribuição dos 20 pedidos — cobre todas as 5 colunas do KDS.
DISTRIBUICAO = (
    [OrderStatus.PENDENTE] * 3
    + [OrderStatus.CONFIRMADO] * 3
    + [OrderStatus.PRONTO] * 2
    + [OrderStatus.SAIU_PARA_ENTREGA] * 2
    + [OrderStatus.RETIRADO] * 1
    + [OrderStatus.CONCLUIDO] * 5
    + [OrderStatus.CANCELADO] * 4
)

# Caminho de transições (a partir de Pendente) até cada status alvo.
PATHS = {
    OrderStatus.PENDENTE: [],
    OrderStatus.CONFIRMADO: [OrderStatus.CONFIRMADO],
    OrderStatus.PRONTO: [OrderStatus.CONFIRMADO, OrderStatus.PRONTO],
    OrderStatus.SAIU_PARA_ENTREGA: [OrderStatus.CONFIRMADO, OrderStatus.PRONTO, OrderStatus.SAIU_PARA_ENTREGA],
    OrderStatus.RETIRADO: [OrderStatus.CONFIRMADO, OrderStatus.PRONTO, OrderStatus.RETIRADO],
    OrderStatus.CONCLUIDO: [
        OrderStatus.CONFIRMADO,
        OrderStatus.PRONTO,
        OrderStatus.SAIU_PARA_ENTREGA,
        OrderStatus.CONCLUIDO,
    ],
    OrderStatus.CANCELADO: [OrderStatus.CANCELADO],
}

MOTIVOS_CANCEL = ["Cliente desistiu", "Item indisponível", "Endereço fora da área", "Loja sem entregador"]


def documento_fake() -> str:
    return f"{random.randint(100,999)}.{random.randint(100,999)}.{random.randint(100,999)}-{random.randint(10,99)}"


def montar_itens() -> list[ItemIn]:
    escolhidos = random.sample(MENU, k=random.randint(1, 3))
    itens = []
    for nome, preco, pdv, comps in escolhidos:
        usar = [c for c in comps if random.random() < 0.5]
        itens.append(
            ItemIn(
                quantidade=random.randint(1, 2),
                nome=nome,
                codigo_pdv=pdv,
                preco=preco,
                complements=[ComplementIn(nome=c[0], nivel=c[1], preco=c[2]) for c in usar],
            )
        )
    return itens


def tipo_para(alvo: OrderStatus) -> OrderType:
    path = PATHS[alvo]
    if OrderStatus.RETIRADO in path:
        return OrderType.RETIRADA
    if OrderStatus.SAIU_PARA_ENTREGA in path:
        return OrderType.ENTREGA
    return random.choice([OrderType.ENTREGA, OrderType.ENTREGA, OrderType.RETIRADA, OrderType.AGENDADO, OrderType.MANUAL])


def wipe(db) -> None:
    for modelo in (models.OrderEvent, models.ItemComplement, models.OrderItem, models.Order, models.Store):
        db.execute(delete(modelo))
    db.commit()


def main() -> None:
    init_db()
    db = SessionLocal()
    try:
        wipe(db)
        stores = [models.Store(nome=n, endereco=e) for n, e in STORES]
        db.add_all(stores)
        db.commit()
        for s in stores:
            db.refresh(s)

        alvos = DISTRIBUICAO[:]
        random.shuffle(alvos)

        for alvo in alvos:
            store = random.choice(stores)
            tipo = tipo_para(alvo)
            forma, online = random.choice(PAGAMENTOS)
            entrega = tipo == OrderType.ENTREGA
            end = random.choice(ENDERECOS) if entrega else (None, None, None, None)

            payload = OrderCreate(
                tipo=tipo,
                status=OrderStatus.PENDENTE,
                store_id=store.id,
                pagamento_forma=forma,
                pagamento_online=online,
                documento=documento_fake() if random.random() < 0.7 else None,
                entrega_endereco=end[0],
                entrega_bairro=end[1],
                entrega_cidade=end[2],
                entrega_cep=end[3],
                observacoes=random.choice([None, None, "Sem talheres", "Troco para R$ 100", "Apto 302"]),
                taxa_entrega=random.choice([0.0, 4.99, 6.90, 8.0]) if entrega else 0.0,
                items=montar_itens(),
            )
            order = crud.create_order(db, payload)

            # Espalha o horário de recebimento nas últimas ~4h.
            recebido = datetime.utcnow() - timedelta(minutes=random.randint(2, 240))
            order.recebido_em = recebido
            order.criado_em = recebido
            db.commit()

            # Caminha a máquina de estados até o status alvo (gera os eventos da timeline).
            for st in PATHS[alvo]:
                motivo = random.choice(MOTIVOS_CANCEL) if st == OrderStatus.CANCELADO else None
                crud.transition_status(db, order, st, motivo)

            # Reescreve os timestamps da timeline pra ficarem coerentes com o recebido_em.
            order = crud.get_order(db, order.id)
            for i, ev in enumerate(order.events):
                ev.timestamp = recebido + timedelta(minutes=4 * i)
            db.commit()

        total = db.query(models.Order).count()
        print(f"Seed pronto: {len(stores)} lojas, {total} pedidos.")
        for col_status in OrderStatus:
            n = db.query(models.Order).filter(models.Order.status == col_status.value).count()
            print(f"  {col_status.value:<20} {n}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
