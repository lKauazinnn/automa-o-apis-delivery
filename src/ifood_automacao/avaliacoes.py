"""Cliente fino da Review API v2 do iFood (avaliações dos clientes).

Confirmado ao vivo contra o sandbox (2026-11-10): `GET review/v2.0/merchants/{id}/reviews` → 200
`{"page":1,"size":N,"reviews":[]}`; `GET .../summary` → 404 "Summary not found" quando a loja
ainda não tem avaliação (tratamos como "sem resumo", não como erro). `pageSize` máximo 50.
Doc: developer.ifood.com.br/pt-BR/docs/guides/modules/review/flow
"""
from datetime import date

import requests

from .auth import auth_headers

REVIEW_BASE = "https://merchant-api.ifood.com.br/review/v2.0"
TAMANHO_PAGINA = 50
MAX_PAGINAS = 40  # até 2000 avaliações por consulta


def get_resumo(merchant_id: str) -> dict | None:
    """Nota geral e contagens ({score, totalReviewsCount, validReviewsCount}). None se não houver."""
    resp = requests.get(f"{REVIEW_BASE}/merchants/{merchant_id}/summary", headers=auth_headers(), timeout=30)
    if resp.status_code == 404:
        return None
    resp.raise_for_status()
    return resp.json()


def get_avaliacoes(merchant_id: str, inicio: date, fim: date) -> list[dict]:
    """Avaliações criadas no período, juntando as páginas."""
    avaliacoes = []
    for pagina in range(1, MAX_PAGINAS + 1):
        resp = requests.get(
            f"{REVIEW_BASE}/merchants/{merchant_id}/reviews",
            headers=auth_headers(),
            params={
                "page": pagina,
                "pageSize": TAMANHO_PAGINA,
                "addCount": "true",
                "dateFrom": f"{inicio.isoformat()}T00:00:00Z",
                "dateTo": f"{fim.isoformat()}T23:59:59Z",
            },
            timeout=30,
        )
        resp.raise_for_status()
        corpo = resp.json() if resp.content else {}
        lote = corpo.get("reviews") or []
        avaliacoes.extend(lote)
        total_paginas = corpo.get("pageCount")
        if not lote or len(lote) < TAMANHO_PAGINA or (total_paginas and pagina >= int(total_paginas)):
            break
    return avaliacoes
