"""Aviso no WhatsApp quando uma loja fecha (e quando reabre).

Chamado por `registrar_status_loja` (server/app.py) sempre que o estado aberta/fechada muda — o
monitor (worker/monitor.py) verifica as lojas a cada ciclo, então o aviso sai em ~30-60s.

Configuração (.env):
    ALERTA_WHATSAPP_NUMEROS=55DDDNUMERO           # um ou mais, separados por vírgula (com DDI 55)
    ALERTA_WHATSAPP_PROVEDOR=callmebot|zapi|evolution|webhook
    ALERTA_IGNORAR_FORA_DO_HORARIO=1               # padrão 1: não avisa fechamento só por horário

  callmebot (grátis, 1 número): cada número manda "I allow callmebot to send me messages" para
      +34 644 66 32 62 no WhatsApp e recebe uma apikey →  CALLMEBOT_APIKEY=...
      (vários números: CALLMEBOT_APIKEY=5561999999999:chave1,5561888888888:chave2)
  zapi:      ZAPI_INSTANCIA=..., ZAPI_TOKEN=..., ZAPI_CLIENT_TOKEN=...
  evolution: EVOLUTION_URL=https://..., EVOLUTION_INSTANCIA=..., EVOLUTION_APIKEY=...
  webhook:   ALERTA_WEBHOOK_URL=https://...  (recebe POST JSON {numero, mensagem, loja, ...};
             serve pra Make/n8n/Zapier ou qualquer provedor)
  waha:      WAHA_URL=https://... (endereço PÚBLICO do WAHA — o Vercel não enxerga a rede
             interna do Docker, então http://waha:3000 não serve aqui), WAHA_API_KEY=...,
             WAHA_SESSION=... (a mesma sessão do WhatsApp já conectada no WAHA)

Sem provedor configurado, o aviso só vai pro log — nunca derruba o registro de status.
"""
import logging
import os
from datetime import datetime, timedelta, timezone

import requests

logger = logging.getLogger(__name__)
FUSO_BR = timezone(timedelta(hours=-3))


def _numeros():
    return [n.strip().replace("+", "").replace(" ", "").replace("-", "") for n in os.environ.get("ALERTA_WHATSAPP_NUMEROS", "").split(",") if n.strip()]


# 99Food: sub_biz_status "3" = Loja fechada — o fechamento normal fora do expediente. Os
# fechamentos que importam têm código próprio (2 operação pausada, 4 desconectada, 5 fechada
# pelo resto do dia, 6 bloqueada, 7 sem entregador) e continuam avisando.
ESTADOS_99_POR_HORARIO = {"3"}


def _so_horario(status):
    """True se a loja fechou só porque está fora do horário de funcionamento (fechamento
    esperado, todo dia — não vale acordar ninguém)."""
    if (status.get("plataforma") or "ifood") == "99food":
        return str(status.get("estado")) in ESTADOS_99_POR_HORARIO
    problemas = [p for p in status.get("problemas") or [] if p.get("estado") not in ("OK", None)]
    return bool(problemas) and all(str(p.get("id") or "").lower() in ("opening-hours", "during-opening-hours") for p in problemas)


def montar_mensagem(status, abriu):
    nome = status.get("nome") or status.get("merchant_id")
    plataforma = "iFood" if (status.get("plataforma") or "ifood") == "ifood" else "99Food"
    hora = datetime.now(FUSO_BR).strftime("%d/%m %H:%M")
    if abriu:
        return f"✅ Loja REABERTA — {nome} ({plataforma})\n{hora}"
    linhas = [f"🔴 Loja FECHADA — {nome} ({plataforma})", hora]
    if status.get("motivo"):
        linhas.append(f"Motivo: {status['motivo']}")
    for p in (status.get("problemas") or [])[:3]:
        texto = " — ".join(x for x in (p.get("titulo"), p.get("detalhe")) if x)
        if texto and texto != status.get("motivo"):
            linhas.append(f"• {texto}")
    return "\n".join(linhas)


_chat_ids_waha: dict[str, str] = {}


def chat_id_waha(base, headers, sessao, numero):
    """Pergunta ao WAHA o chatId real do número (GET /api/contacts/check-exists). Se o WAHA não
    responder, cai no formato padrão "<número>@c.us". Guarda em memória pra não repetir."""
    if numero in _chat_ids_waha:
        return _chat_ids_waha[numero]
    try:
        r = requests.get(f"{base}/api/contacts/check-exists", params={"phone": numero, "session": sessao}, headers=headers, timeout=10)
        if r.ok:
            dados = r.json() or {}
            if dados.get("numberExists") and dados.get("chatId"):
                _chat_ids_waha[numero] = dados["chatId"]
                return dados["chatId"]
            if dados.get("numberExists") is False:
                logger.warning("WAHA: o número %s não tem WhatsApp.", numero)
    except Exception as exc:  # noqa: BLE001
        logger.warning("WAHA: não consegui conferir o número %s: %s", numero, exc)
    return f"{numero}@c.us"


def _enviar(numero, mensagem, contexto):
    provedor = os.environ.get("ALERTA_WHATSAPP_PROVEDOR", "").strip().lower()
    if provedor == "callmebot":
        chaves = dict(x.split(":", 1) for x in os.environ.get("CALLMEBOT_APIKEY", "").split(",") if ":" in x)
        apikey = chaves.get(numero) or os.environ.get("CALLMEBOT_APIKEY", "").split(":")[-1]
        resp = requests.get("https://api.callmebot.com/whatsapp.php", params={"phone": numero, "text": mensagem, "apikey": apikey}, timeout=20)
    elif provedor == "zapi":
        resp = requests.post(
            f"https://api.z-api.io/instances/{os.environ['ZAPI_INSTANCIA']}/token/{os.environ['ZAPI_TOKEN']}/send-text",
            headers={"Client-Token": os.environ.get("ZAPI_CLIENT_TOKEN", "")},
            json={"phone": numero, "message": mensagem},
            timeout=20,
        )
    elif provedor == "evolution":
        resp = requests.post(
            f"{os.environ['EVOLUTION_URL'].rstrip('/')}/message/sendText/{os.environ['EVOLUTION_INSTANCIA']}",
            headers={"apikey": os.environ["EVOLUTION_APIKEY"]},
            json={"number": numero, "text": mensagem},
            timeout=20,
        )
    elif provedor == "waha":
        # WAHA (WhatsApp HTTP API): POST /api/sendText. O chatId vem do próprio WhatsApp
        # (check-exists), porque celular brasileiro antigo às vezes está registrado SEM o 9.
        base = os.environ["WAHA_URL"].rstrip("/")
        headers = {"X-Api-Key": os.environ.get("WAHA_API_KEY", "")}
        sessao = os.environ.get("WAHA_SESSION", "default")
        resp = requests.post(
            f"{base}/api/sendText",
            headers=headers,
            json={"session": sessao, "chatId": chat_id_waha(base, headers, sessao, numero), "text": mensagem},
            timeout=20,
        )
    elif provedor == "webhook":
        resp = requests.post(os.environ["ALERTA_WEBHOOK_URL"], json={"numero": numero, "mensagem": mensagem, **contexto}, timeout=20)
    else:
        logger.info("Aviso de loja (sem provedor de WhatsApp configurado) para %s: %s", numero, mensagem.replace("\n", " | "))
        return False
    resp.raise_for_status()
    return True


def avisar_mudanca_loja(status, aberta_antes, estado_antes=None):
    """Dispara o aviso se a loja passou de aberta → fechada (ou fechada → aberta). Nunca levanta.
    `estado_antes` é o código de estado da verificação anterior: no 99Food, a reabertura depois
    de um fechamento por horário (código 3) também fica em silêncio — é a abertura normal do dia."""
    try:
        agora = status.get("aberta")
        if aberta_antes is None or agora is None or aberta_antes == agora:
            return
        abriu = bool(agora)
        ignorar_horario = os.environ.get("ALERTA_IGNORAR_FORA_DO_HORARIO", "1") == "1"
        if not abriu and ignorar_horario and _so_horario(status):
            logger.info("Loja %s fechou por horário — sem aviso.", status.get("merchant_id"))
            return
        if abriu and ignorar_horario and status.get("plataforma") == "99food" and str(estado_antes) in ESTADOS_99_POR_HORARIO:
            logger.info("Loja %s abriu no horário normal — sem aviso.", status.get("merchant_id"))
            return
        numeros = _numeros()
        if not numeros:
            return
        mensagem = montar_mensagem(status, abriu)
        contexto = {"loja": status.get("nome"), "merchant_id": status.get("merchant_id"), "aberta": abriu, "motivo": status.get("motivo")}
        for numero in numeros:
            try:
                if _enviar(numero, mensagem, contexto):
                    logger.info("Aviso de loja %s enviado para %s", "reaberta" if abriu else "fechada", numero)
            except Exception as exc:  # noqa: BLE001
                logger.warning("Falha ao enviar aviso de loja para %s: %s", numero, exc)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Aviso de mudança de loja falhou: %s", exc)
