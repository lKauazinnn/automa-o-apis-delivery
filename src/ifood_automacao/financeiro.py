"""Cliente fino da Financial API v3 do iFood — vendas, repasses (settlements) e eventos
financeiros (taxas, comissões, ajustes). Mesmo padrão de `client.py`.

Confirmado ao vivo contra o sandbox (2026-10-09):
- `GET financial/v3.0/merchants/{id}/sales?beginSalesDate&endSalesDate` — janela máxima de
  8 dias ("The maximum allowed search range is 8 days."); 204 quando não há venda.
- `GET financial/v3.0/merchants/{id}/settlements?beginPaymentDate&endPaymentDate` — 200 com
  {beginDate, endDate, balance, merchantId, settlements: [...]}.
- `GET financial/v3.0/merchants/{id}/financial-events?beginDate&endDate` — janela máxima de
  33 dias ("Date range is greater than 33 days"); 200 com lista.
As versões v2.0/v2.1 não existem mais (404 "no Route matched").

Os campos internos de cada venda/repasse/evento ainda não foram vistos com dados reais (a loja
de sandbox não tem movimento financeiro), então as funções devolvem o payload cru e quem
consome (server/app.py) lê de forma tolerante.
"""
from datetime import date, timedelta

import requests

from .auth import auth_headers, auth_headers_financeiro, tem_credencial_financeira

FINANCIAL_BASE = "https://merchant-api.ifood.com.br/financial/v3.0"

JANELA_MAX_VENDAS = 8
JANELA_MAX_EVENTOS = 33


def _janelas(inicio: date, fim: date, dias: int):
    """Quebra [inicio, fim] (inclusivo) em janelas de no máximo `dias` dias."""
    atual = inicio
    while atual <= fim:
        ate = min(atual + timedelta(days=dias - 1), fim)
        yield atual, ate
        atual = ate + timedelta(days=1)


def _get(caminho: str, params: dict):
    url = f"{FINANCIAL_BASE}{caminho}"
    resp = requests.get(url, headers=auth_headers_financeiro(), params=params, timeout=30)
    # O app financeiro (escopo conciliator) só enxerga as lojas que o autorizaram. Pra uma loja
    # fora dele, tenta a credencial principal antes de desistir — é o comportamento de antes.
    if resp.status_code in (401, 403) and tem_credencial_financeira():
        resp = requests.get(url, headers=auth_headers(), params=params, timeout=30)
    resp.raise_for_status()
    if resp.status_code == 204 or not resp.content:
        return None
    return resp.json()


def _como_lista(corpo, *chaves):
    if corpo is None:
        return []
    if isinstance(corpo, list):
        return corpo
    for chave in chaves:
        if isinstance(corpo.get(chave), list):
            return corpo[chave]
    return []


def get_sales(merchant_id: str, inicio: date, fim: date) -> list[dict]:
    """Vendas do período, já juntando as janelas de 8 dias."""
    vendas = []
    for de, ate in _janelas(inicio, fim, JANELA_MAX_VENDAS):
        corpo = _get(
            f"/merchants/{merchant_id}/sales",
            {"beginSalesDate": de.isoformat(), "endSalesDate": ate.isoformat()},
        )
        vendas.extend(_como_lista(corpo, "sales", "data", "content"))
    return vendas


def get_settlements(merchant_id: str, inicio: date, fim: date) -> dict:
    """Repasses (pagamentos do iFood pra loja) com data de pagamento no período."""
    corpo = _get(
        f"/merchants/{merchant_id}/settlements",
        {"beginPaymentDate": inicio.isoformat(), "endPaymentDate": fim.isoformat()},
    )
    return corpo or {"settlements": [], "balance": 0}


def get_financial_events(merchant_id: str, inicio: date, fim: date) -> list[dict]:
    """Eventos financeiros (comissão, taxa de entrega, ajustes, cancelamentos) do período."""
    eventos = []
    for de, ate in _janelas(inicio, fim, JANELA_MAX_EVENTOS):
        corpo = _get(
            f"/merchants/{merchant_id}/financial-events",
            {"beginDate": de.isoformat(), "endDate": ate.isoformat()},
        )
        eventos.extend(_como_lista(corpo, "financialEvents", "events", "data", "content"))
    return eventos
