"""Push de eventos em tempo real para o frontend (novo pedido, mudança de status).
REST cuida do CRUD; o WebSocket só empurra atualizações."""
import json

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self) -> None:
        self.active: list[WebSocket] = []

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        self.active.append(ws)

    def disconnect(self, ws: WebSocket) -> None:
        if ws in self.active:
            self.active.remove(ws)

    async def broadcast(self, message: dict) -> None:
        texto = json.dumps(message, default=str, ensure_ascii=False)
        mortos = []
        for ws in self.active:
            try:
                await ws.send_text(texto)
            except Exception:
                mortos.append(ws)
        for ws in mortos:
            self.disconnect(ws)


manager = ConnectionManager()
