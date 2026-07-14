"""Autenticação OAuth2 (client_credentials) com a Merchant API do iFood."""
import os
import time

import requests
from dotenv import load_dotenv

load_dotenv()

TOKEN_URL = "https://merchant-api.ifood.com.br/authentication/v1.0/oauth/token"

_cached_token = None
_cached_expires_at = 0.0


def get_access_token() -> str:
    """Retorna um access token válido, reaproveitando o cache em memória enquanto não expirar."""
    global _cached_token, _cached_expires_at

    if _cached_token and time.monotonic() < _cached_expires_at:
        return _cached_token

    client_id = os.environ["IFOOD_CLIENT_ID"]
    client_secret = os.environ["IFOOD_CLIENT_SECRET"]

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

    _cached_token = payload["accessToken"]
    # Renova com 60s de margem antes do vencimento real.
    _cached_expires_at = time.monotonic() + int(payload["expiresIn"]) - 60
    return _cached_token


def auth_headers() -> dict:
    return {"Authorization": f"Bearer {get_access_token()}"}
