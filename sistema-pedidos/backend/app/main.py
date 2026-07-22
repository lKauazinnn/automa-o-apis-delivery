"""App FastAPI: REST de pedidos + WebSocket para push em tempo real."""
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from .database import init_db
from .routers import orders
from .ws import manager


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="Sistema de Pedidos — Delivery", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    # Dev: aceita qualquer porta local (o Vite pode subir em 5173/5174/5175... conforme o que estiver livre).
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(orders.router)


@app.get("/api/health")
def health():
    return {"ok": True}


@app.websocket("/ws")
async def ws_endpoint(ws: WebSocket):
    await manager.connect(ws)
    try:
        while True:
            # Mantém a conexão aberta; o cliente só recebe pushes, não precisa mandar nada.
            await ws.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(ws)
