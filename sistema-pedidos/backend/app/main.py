"""App FastAPI: REST de pedidos + WebSocket para push em tempo real."""
import json
import logging
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path

from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from .database import init_db
from .routers import orders
from .ws import manager

logger = logging.getLogger("webhook")
# Cada evento recebido do 99Food é anexado aqui (1 JSON por linha) pra inspeção/automação.
EVENTOS_99 = Path(__file__).resolve().parent.parent / "eventos_99food.jsonl"


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


# ------------------------------------------------------------------ Webhook 99Food
# O 99Food (DiDi) NÃO tem polling — ele faz POST aqui a cada evento (pedido novo,
# status de upload de cardápio, etc.). Registramos o payload cru e respondemos errno:0
# (o que o 99 espera como confirmação). A partir daqui dá pra automatizar as lojas.

def _registrar_evento_99(origem: str, data) -> None:
    linha = {"recebido_em": datetime.utcnow().isoformat() + "Z", "origem": origem, "payload": data}
    try:
        with open(EVENTOS_99, "a", encoding="utf-8") as f:
            f.write(json.dumps(linha, ensure_ascii=False) + "\n")
    except Exception as e:  # nunca deixa o registro derrubar a resposta ao 99
        logger.warning("falha ao gravar evento 99: %s", e)
    logger.info("99Food webhook (%s): %s", origem, data)


@app.get("/webhook/99food")
def webhook_99food_check():
    """Verificação/health que o portal do 99 pode fazer ao cadastrar o webhook."""
    return {"errno": 0, "errmsg": "ok"}


@app.post("/webhook/99food")
async def webhook_99food(request: Request):
    """Recebe os eventos que o 99Food empurra. Responde errno:0 pra confirmar."""
    corpo = await request.body()
    try:
        data = json.loads(corpo) if corpo else {}
    except json.JSONDecodeError:
        data = corpo.decode("utf-8", errors="replace")
    _registrar_evento_99("99food", data)
    # TODO(automação): materializar pedido novo / atualizar status a partir do evento.
    return {"errno": 0, "errmsg": "ok"}


@app.websocket("/ws")
async def ws_endpoint(ws: WebSocket):
    await manager.connect(ws)
    try:
        while True:
            # Mantém a conexão aberta; o cliente só recebe pushes, não precisa mandar nada.
            await ws.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(ws)
