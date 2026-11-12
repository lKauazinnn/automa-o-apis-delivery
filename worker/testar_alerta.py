"""Teste dos avisos de WhatsApp: confere cada número no WhatsApp e manda uma mensagem de teste.

Rodar (no servidor, dentro do container do monitor):
    docker compose run --rm pausafast-monitor python worker/testar_alerta.py

Ou local, com o .env do projeto:  python worker/testar_alerta.py
Usa ALERTA_WHATSAPP_NUMEROS / ALERTA_WHATSAPP_PROVEDOR e, no WAHA, WAHA_URL / WAHA_API_KEY / WAHA_SESSION.
"""
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from dotenv import load_dotenv  # noqa: E402

load_dotenv()

from server import alertas  # noqa: E402


def main():
    provedor = os.environ.get("ALERTA_WHATSAPP_PROVEDOR", "").strip().lower()
    numeros = alertas._numeros()
    print(f"Provedor: {provedor or '(nenhum)'} · números: {', '.join(numeros) or '(nenhum)'}")
    if not provedor or not numeros:
        print("Configure ALERTA_WHATSAPP_PROVEDOR e ALERTA_WHATSAPP_NUMEROS antes.")
        return 1
    if provedor == "waha":
        base = os.environ.get("WAHA_URL", "").rstrip("/")
        if not base:
            print("Falta WAHA_URL (no Docker Compose do WAHA: http://waha:3000).")
            return 1
        headers = {"X-Api-Key": os.environ.get("WAHA_API_KEY", "")}
        sessao = os.environ.get("WAHA_SESSION", "default")
        try:
            r = alertas.requests.get(f"{base}/api/sessions/{sessao}", headers=headers, timeout=10)
            print(f"Sessão {sessao}: HTTP {r.status_code} · {(r.json() or {}).get('status') if r.ok else r.text[:200]}")
        except Exception as exc:  # noqa: BLE001
            print(f"Não consegui falar com o WAHA em {base}: {exc}")
            return 1
        for n in numeros:
            print(f"  {n} → chatId {alertas.chat_id_waha(base, headers, sessao, n)}")
    falhas = 0
    for n in numeros:
        try:
            ok = alertas._enviar(n, "✅ Teste do PausaFast: os avisos de loja fechada/reaberta vão chegar por aqui.", {"teste": True})
            print(f"  {n}: {'enviado' if ok else 'NÃO enviado (sem provedor)'}")
        except Exception as exc:  # noqa: BLE001
            falhas += 1
            print(f"  {n}: FALHOU — {exc}")
    return 1 if falhas else 0


if __name__ == "__main__":
    sys.exit(main())
