"""Wrapper simples de retry/backoff para chamadas HTTP sujeitas a rate limit (429), erro
transiente (5xx) ou conflito temporário (409) que se resolve sozinho com o tempo."""
import time

import requests


def _codigo_erro(resp):
    """Extrai `error.code` do corpo JSON da resposta do iFood, se houver."""
    try:
        return ((resp.json() or {}).get("error") or {}).get("code")
    except Exception:
        return None


def com_retry(func, *args, tentativas=4, espera_base=1.5, conflitos_reprocessaveis=(), **kwargs):
    """Reexecuta `func` em rate limit (429) / erro transiente (5xx).

    `conflitos_reprocessaveis`: códigos de erro de 409 (Conflict) que o iFood devolve mas que
    resolvem sozinhos em alguns segundos, e portanto devem ser re-tentados. Caso concreto:
    `RecentlyCreatedInterruption` — o iFood recusa remover uma interrupção recém-criada por um
    curto período (~5s); em vez de estourar o erro pra tela, esperamos e tentamos de novo.
    """
    for tentativa in range(1, tentativas + 1):
        try:
            return func(*args, **kwargs)
        except requests.exceptions.HTTPError as exc:
            resp = exc.response
            status = resp.status_code if resp is not None else None
            transiente = status in (429, 500, 502, 503, 504)
            conflito_ok = status == 409 and _codigo_erro(resp) in conflitos_reprocessaveis
            if (transiente or conflito_ok) and tentativa < tentativas:
                # o cooldown do 409 precisa de uma espera mínima maior (a janela é de ~5s)
                espera = max(espera_base * tentativa, 3.0) if conflito_ok else espera_base * tentativa
                time.sleep(espera)
                continue
            raise
