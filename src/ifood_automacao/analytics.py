"""Cliente fino do módulo Analytics do iFood (`analytics/v1.0`, lançado em 23/07/2026).

KPIs AGREGADOS de pedidos em D-1 (snapshot às 4h, disponível até as 9h de Brasília): tempos de
preparo/entrega/espera do entregador, cancelamentos por código/origem/estágio/motivo, 1º pedido
do cliente na loja, GMV etc. Não devolve pedido a pedido — pra isso é a Financial API (sales).

Confirmado ao vivo contra o sandbox (2026-11-10): o token atual (client_credentials) já tem
acesso — `POST /merchants/{id}/orders/kpis` responde 200. `page` e `size` vão NO CORPO (sem eles,
400 "page is required"). Doc: developer.ifood.com.br/pt-BR/docs/guides/modules/analytics/endpoints
"""
from datetime import date, timedelta

import requests

from .auth import auth_headers

ANALYTICS_BASE = "https://merchant-api.ifood.com.br/analytics/v1.0"


def ultimo_dia_disponivel() -> date:
    """O Analytics é D-1: o dia mais recente com dado é ontem."""
    return date.today() - timedelta(days=1)


def get_kpis(merchant_id: str, inicio: date, fim: date, agg: dict, filtro: dict | None = None, size: int = 1000) -> list[dict]:
    """Uma consulta de KPIs. `fim` é cortado em D-1 (dias depois disso não têm dado ainda).
    Devolve a lista `data` (vazia quando não há pedido no período), já juntando as páginas."""
    fim = min(fim, ultimo_dia_disponivel())
    if fim < inicio:
        return []
    corpo = {
        "filter": {
            "referenceDate": {"gte": f"{inicio.isoformat()} 00:00:00", "lte": f"{fim.isoformat()} 23:59:59"},
            **(filtro or {}),
        },
        "agg": agg,
        "page": 1,
        "size": size,
    }
    dados = []
    while True:
        resp = requests.post(
            f"{ANALYTICS_BASE}/merchants/{merchant_id}/orders/kpis",
            headers={**auth_headers(), "Content-Type": "application/json"},
            json=corpo,
            timeout=30,
        )
        resp.raise_for_status()
        pagina = resp.json() if resp.content else {}
        dados.extend(pagina.get("data") or [])
        if corpo["page"] >= int(pagina.get("totalPages") or 1):
            return dados
        corpo["page"] += 1
