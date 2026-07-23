# OrderStatus

> God node · 30 connections · [C:\Users\Gustavo\Desktop\automação ifood\sistema-pedidos\backend\app\enums.py](file:///C:/Users/Gustavo/Desktop/automa%C3%A7%C3%A3o%20ifood/sistema-pedidos/backend/app/enums.py#L5)

## Call Trace Diagram

```mermaid
sequenceDiagram
    participant P0 as OrderStatus
    participant P1 as OrderEvent
    participant P2 as OrderType
    participant P3 as OrderCreate
    participant P4 as Popula o banco com dados de teste: 4 lojas + ~20 pedidos em status variados (co
    participant P5 as Store
    participant P6 as Order
    participant P7 as OrderItem
    participant P8 as ItemComplement
    participant P9 as ComplementIn
    participant P10 as ItemIn
    participant P11 as OrderSummary
    participant P12 as OrderDetail
    participant P13 as PaginatedOrders
    participant P14 as Modelos SQLAlchemy. status/tipo são gravados como string (o .value do enum) pra
    participant P15 as Linha do tempo append-only: cada mudança de status/ação vira um evento novo,
    participant P16 as ComplementOut
    participant P17 as ItemOut
    participant P18 as EventOut
    participant P19 as StoreOut
    participant P20 as TransitionIn
    participant P21 as Schemas Pydantic (v2) de entrada e saída da API.
    participant P22 as Linha da tabela de Pedidos / card do KDS.
    participant P23 as Drawer de detalhes (seção 4).
    participant P24 as Cria um pedido (usado pelo seed e para popular dados de teste).
    participant P25 as Endpoints REST de pedidos + push por WebSocket nas mutações.
    participant P26 as Base
    participant P27 as create_order()
    participant P28 as transition_status()
    participant P29 as registrar_evento()
    participant P30 as Operações de banco: listagem com filtros/paginação, detalhe, criação, transição
    participant P31 as Normaliza uma lista de enums/strings para os valores string usados no banco.
    P0->>+ P1: uses
    P1-->>- P0: return
    P1->>+ P0: uses
    P0-->>- P1: return
    P1->>+ P2: uses
    P2-->>- P1: return
    P2->>+ P1: uses
    P1-->>- P2: return
    P2->>+ P3: uses
    P3-->>- P2: return
    P2->>+ P4: uses
    P4-->>- P2: return
    P2->>+ P5: uses
    P5-->>- P2: return
    P2->>+ P6: uses
    P6-->>- P2: return
    P2->>+ P7: uses
    P7-->>- P2: return
    P2->>+ P8: uses
    P8-->>- P2: return
    P2->>+ P9: uses
    P9-->>- P2: return
    P2->>+ P10: uses
    P10-->>- P2: return
    P2->>+ P11: uses
    P11-->>- P2: return
    P2->>+ P12: uses
    P12-->>- P2: return
    P2->>+ P13: uses
    P13-->>- P2: return
    P2->>+ P14: uses
    P14-->>- P2: return
    P2->>+ P15: uses
    P15-->>- P2: return
    P2->>+ P16: uses
    P16-->>- P2: return
    P2->>+ P17: uses
    P17-->>- P2: return
    P2->>+ P18: uses
    P18-->>- P2: return
    P2->>+ P19: uses
    P19-->>- P2: return
    P2->>+ P20: uses
    P20-->>- P2: return
    P2->>+ P21: uses
    P21-->>- P2: return
    P2->>+ P22: uses
    P22-->>- P2: return
    P2->>+ P23: uses
    P23-->>- P2: return
    P2->>+ P24: uses
    P24-->>- P2: return
    P2->>+ P25: uses
    P25-->>- P2: return
    P1->>+ P26: uses
    P26-->>- P1: return
    P1->>+ P27: calls
    P27-->>- P1: return
    P1->>+ P28: calls
    P28-->>- P1: return
    P1->>+ P29: calls
    P29-->>- P1: return
    P0->>+ P3: uses
    P3-->>- P0: return
    P0->>+ P4: uses
    P4-->>- P0: return
    P0->>+ P5: uses
    P5-->>- P0: return
    P0->>+ P6: uses
    P6-->>- P0: return
    P0->>+ P7: uses
    P7-->>- P0: return
    P0->>+ P8: uses
    P8-->>- P0: return
    P0->>+ P9: uses
    P9-->>- P0: return
    P0->>+ P10: uses
    P10-->>- P0: return
    P0->>+ P28: calls
    P28-->>- P0: return
    P0->>+ P11: uses
    P11-->>- P0: return
    P0->>+ P12: uses
    P12-->>- P0: return
    P0->>+ P13: uses
    P13-->>- P0: return
    P0->>+ P14: uses
    P14-->>- P0: return
    P0->>+ P15: uses
    P15-->>- P0: return
    P0->>+ P16: uses
    P16-->>- P0: return
    P0->>+ P17: uses
    P17-->>- P0: return
    P0->>+ P18: uses
    P18-->>- P0: return
    P0->>+ P19: uses
    P19-->>- P0: return
    P0->>+ P20: uses
    P20-->>- P0: return
    P0->>+ P30: uses
    P30-->>- P0: return
    P0->>+ P31: uses
    P31-->>- P0: return
    P0->>+ P21: uses
    P21-->>- P0: return
    P0->>+ P22: uses
    P22-->>- P0: return
    P0->>+ P23: uses
    P23-->>- P0: return
    P0->>+ P24: uses
    P24-->>- P0: return
    P0->>+ P25: uses
    P25-->>- P0: return
```

## Connections by Relation

### calls
- [[transition_status()]] `INFERRED`

### contains
- [[enums.py]] `EXTRACTED`

### inherits
- [[str]] `EXTRACTED`
- [[Enum]] `EXTRACTED`

### uses
- [[OrderEvent]] `INFERRED`
- [[OrderCreate]] `INFERRED`
- [[Popula o banco com dados de teste: 4 lojas + ~20 pedidos em status variados (co]] `INFERRED`
- [[Store]] `INFERRED`
- [[Order]] `INFERRED`
- [[OrderItem]] `INFERRED`
- [[ItemComplement]] `INFERRED`
- [[ComplementIn]] `INFERRED`
- [[ItemIn]] `INFERRED`
- [[OrderSummary]] `INFERRED`
- [[OrderDetail]] `INFERRED`
- [[PaginatedOrders]] `INFERRED`
- [[Modelos SQLAlchemy. status/tipo são gravados como string (o .value do enum) pra]] `INFERRED`
- [[Linha do tempo append-only: cada mudança de status/ação vira um evento novo,]] `INFERRED`
- [[ComplementOut]] `INFERRED`
- [[ItemOut]] `INFERRED`
- [[EventOut]] `INFERRED`
- [[StoreOut]] `INFERRED`
- [[TransitionIn]] `INFERRED`
- [[Operações de banco: listagem com filtros/paginação, detalhe, criação, transição]] `INFERRED`

---

*Part of the graphify knowledge wiki. See [[index]] to navigate.*