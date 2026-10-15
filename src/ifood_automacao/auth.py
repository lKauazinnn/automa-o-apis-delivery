"""Autenticação OAuth2 (client_credentials) com a Merchant API do iFood.

Duas credenciais possíveis:
- principal (`IFOOD_CLIENT_ID`/`IFOOD_CLIENT_SECRET`): catálogo, pedidos, eventos, loja;
- financeira (`IFOOD_FIN_CLIENT_ID`/`IFOOD_FIN_CLIENT_SECRET`, opcional): um app com escopo
  `conciliator` (audience `financial`), que só enxerga a Financial API. Sem ela, o financeiro
  usa a principal.
"""
import os
import time

import requests
from dotenv import load_dotenv

load_dotenv()

TOKEN_URL = "https://merchant-api.ifood.com.br/authentication/v1.0/oauth/token"

# client_id -> (token, expira_em). Um cache por credencial, pra principal e financeira não se
# sobrescreverem.
_cache: dict[str, tuple[str, float]] = {}


def _token(client_id: str, client_secret: str) -> str:
    """Retorna um access token válido, reaproveitando o cache em memória enquanto não expirar."""
    em_cache = _cache.get(client_id)
    if em_cache and time.monotonic() < em_cache[1]:
        return em_cache[0]

    response = requests.post(
        TOKEN_URL,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        data={
            "grantType": "client_credentials",
            "clientId": client_id,
            "clientSecret": client_secret,
        },
        timeout=30,
    )
    response.raise_for_status()
    payload = response.json()

    # Renova com 60s de margem antes do vencimento real.
    _cache[client_id] = (payload["accessToken"], time.monotonic() + int(payload["expiresIn"]) - 60)
    return payload["accessToken"]


def get_access_token() -> str:
    return _token(os.environ["IFOOD_CLIENT_ID"], os.environ["IFOOD_CLIENT_SECRET"])


def auth_headers() -> dict:
    return {"Authorization": f"Bearer {get_access_token()}"}


def tem_credencial_financeira() -> bool:
    return bool(os.environ.get("IFOOD_FIN_CLIENT_ID") and os.environ.get("IFOOD_FIN_CLIENT_SECRET"))


def auth_headers_financeiro() -> dict:
    """Header da credencial financeira, ou da principal se ela não estiver configurada."""
    if not tem_credencial_financeira():
        return auth_headers()
    token = _token(os.environ["IFOOD_FIN_CLIENT_ID"], os.environ["IFOOD_FIN_CLIENT_SECRET"])
    return {"Authorization": f"Bearer {token}"}
