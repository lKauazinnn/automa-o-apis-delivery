# Backend — Sistema de Pedidos (FastAPI)

API REST + WebSocket para o painel de pedidos / KDS. SQLite em dev (troque `DATABASE_URL` por Postgres depois).

## Rodar

```bash
cd sistema-pedidos/backend
python -m venv .venv
.venv/Scripts/activate        # Windows;  no Linux/Mac: source .venv/bin/activate
pip install -r requirements.txt

python seed.py                # cria o banco e popula ~20 pedidos de teste
uvicorn app.main:app --reload --port 8000
```

- API: http://localhost:8000/api/orders
- Docs (Swagger): http://localhost:8000/docs
- WebSocket: ws://localhost:8000/ws

## Endpoints (Fase 1)

| Método | Rota | O quê |
|---|---|---|
| GET | `/api/orders` | Lista com filtros (`q`, `status`, `tipo`, `pagamento`, `documento`, `recebido_de/ate`), ordenação e paginação (`page`, `per_page`) |
| GET | `/api/orders/{id}` | Detalhe completo (itens+complementos, entrega, pagamento, timeline) |
| POST | `/api/orders` | Cria pedido (usado pelo seed / dados de teste) |
| POST | `/api/orders/{id}/transition` | Muda o status (gera evento na timeline; valida a máquina de estados) |
| GET | `/api/health` | Healthcheck |

## Estrutura

```
app/
  database.py   engine + Session + Base (SQLite → Postgres trocando DATABASE_URL)
  enums.py      máquina de estados (status/tipo), transições, mapa de colunas do KDS
  models.py     Order, OrderItem, ItemComplement, OrderEvent (timeline append-only), Store
  schemas.py    Pydantic: resumo (lista), detalhe, criação, transição, paginação
  crud.py       queries com filtro/paginação, criação, transição de status
  ws.py         ConnectionManager do WebSocket (push em tempo real)
  routers/orders.py   endpoints REST
  main.py       app FastAPI + CORS + /ws
seed.py         dados de teste
```
