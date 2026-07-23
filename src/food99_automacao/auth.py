"""Autenticação da API do 99Food / DiDi Food (https://openapi.didi-food.com).

Credenciais do app (portal do desenvolvedor DiDi) via variáveis de ambiente:
    FOOD99_APP_ID       — id numérico do app
    FOOD99_APP_SECRET   — segredo do app

Dois modelos de auth na API:
  1. Endpoints POR LOJA (pedidos, itens): usam um `auth_token` obtido por loja.
     `app_shop_id` = id da loja no SEU sistema (o mesmo usado no vínculo).
  2. Endpoints de NÍVEL-APP (ex: listar lojas): usam `app_id` + `timestamp` + `sign`.

Fluxo do token (conforme a doc): se a loja ainda não tem token ou ele expirou, chame
`authtoken/refresh` (gera um novo) e então `authtoken/get` (recupera). `get_auth_token`
faz isso automaticamente e mantém um cache em memória.
"""
import hashlib
import os
import time

import requests

BASE = "https://openapi.didi-food.com"


class Food99Error(Exception):
    """Erro de negócio devolvido pela API (errno != 0)."""


def _app_id() -> int:
    return int(os.environ["FOOD99_APP_ID"])


def _app_secret() -> str:
    return os.environ["FOOD99_APP_SECRET"]


def checar(payload: dict):
    """Desembrulha o StandardResponse: errno==0 => ok. Devolve o campo `data`."""
    if payload.get("errno", 0) != 0:
        raise Food99Error(f"[{payload.get('errno')}] {payload.get('errmsg', 'erro')}")
    return payload.get("data")


# cache em memória: app_shop_id -> (auth_token, epoch_de_expiração)
_cache: dict[str, tuple[str, float]] = {}


def refresh_auth_token(app_shop_id: str) -> None:
    """GET authtoken/refresh — gera um token novo pra loja (depois recupere com get)."""
    resp = requests.get(
        f"{BASE}/v1/auth/authtoken/refresh",
        params={"app_id": _app_id(), "app_secret": _app_secret(), "app_shop_id": app_shop_id},
        timeout=30,
    )
    resp.raise_for_status()
    checar(resp.json())


def _buscar_token(app_shop_id: str) -> tuple[str, int]:
    resp = requests.get(
        f"{BASE}/v1/auth/authtoken/get",
        params={"app_id": _app_id(), "app_secret": _app_secret(), "app_shop_id": app_shop_id},
        timeout=30,
    )
    resp.raise_for_status()
    data = checar(resp.json())
    return data["auth_token"], int(data["token_expiration_time"])


def get_auth_token(app_shop_id: str, forcar: bool = False) -> str:
    """Token válido da loja, com cache. Se não existir/expirar, faz refresh e recupera."""
    if not forcar and app_shop_id in _cache:
        token, exp = _cache[app_shop_id]
        if time.time() < exp - 60:  # 60s de margem
            return token
    try:
        token, exp = _buscar_token(app_shop_id)
    except Food99Error:
        # token inexistente/expirado — gera um novo e tenta de novo
        refresh_auth_token(app_shop_id)
        token, exp = _buscar_token(app_shop_id)
    _cache[app_shop_id] = (token, float(exp))
    return token


def gerar_sign(params: dict) -> str:
    """Assinatura pros endpoints de nível-app (ex: shop/list).

    Algoritmo CONFIRMADO ao vivo contra a API de teste do 99Food (errno=0):
        1. ordena os parâmetros por chave (menos o próprio `sign`);
        2. junta como `chave=valor` separados por `&`;
        3. concatena o `app_secret` no final (sem separador);
        4. MD5, hex minúsculo.
    Importante: o `timestamp` deve ir como STRING (o servidor rejeita inteiro), e o valor
    assinado tem que ser exatamente o mesmo enviado no corpo.
    """
    itens = sorted((k, v) for k, v in params.items() if k != "sign")
    base = "&".join(f"{k}={v}" for k, v in itens)
    return hashlib.md5((base + _app_secret()).encode("utf-8")).hexdigest()


def get_authorization_url(app_shop_id: str) -> str:
    """POST auth/authorizationpage/getUrl — devolve a página de auto-vínculo pro lojista
    (equivalente ao fluxo distribuído do iFood)."""
    resp = requests.post(
        f"{BASE}/v1/auth/authorizationpage/getUrl",
        json={"app_id": _app_id(), "app_shop_id": app_shop_id},
        timeout=30,
    )
    resp.raise_for_status()
    data = checar(resp.json())
    return data.get("url") if isinstance(data, dict) else data
