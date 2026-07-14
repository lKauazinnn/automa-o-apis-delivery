"""Wrapper simples de retry/backoff para chamadas HTTP sujeitas a rate limit (429) ou erro transiente (5xx)."""
import time

import requests


def com_retry(func, *args, tentativas=4, espera_base=1.5, **kwargs):
    for tentativa in range(1, tentativas + 1):
        try:
            return func(*args, **kwargs)
        except requests.exceptions.HTTPError as exc:
            status = exc.response.status_code if exc.response is not None else None
            if status in (429, 500, 502, 503, 504) and tentativa < tentativas:
                time.sleep(espera_base * tentativa)
                continue
            raise
