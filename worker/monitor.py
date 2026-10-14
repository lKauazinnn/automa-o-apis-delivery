"""Worker contínuo: o processo que precisa ficar rodando 24h fora da Vercel.

Faz duas coisas em loop:
1. **Polling de pedidos do iFood a cada 30s** pra TODAS as lojas iFood cadastradas (uma chamada
   só, header x-polling-merchants com várias lojas). Além de trazer os pedidos, é esse polling
   que mantém a loja "conectada" no iFood — sem ele a loja aparece FECHADA com o motivo
   "Gestor de Pedidos ou PDV desconectado", mesmo dentro do horário de funcionamento.
2. **Status aberta/fechada de todas as lojas (iFood e 99) a cada 60s**, gravando o estado atual
   em `status_lojas` e cada mudança em `status_lojas_historico`.
3. **Pausas temporárias vencidas a cada 30s**: o que foi pausado com prazo (ex: "volta em 2h")
   é despausado sozinho na plataforma quando passa da hora (tabela `pausas`, sql/010).

A cada ciclo grava um heartbeat em `monitor_heartbeat`. O painel usa isso pra mostrar "monitor
ativo", e o backend pra não fazer polling em duplicidade quando a tela de Pedidos/KDS está aberta.

Rodar:  python worker/monitor.py      (usa o mesmo .env do backend)
Pré-requisito: migrations sql/009_monitor_lojas_financeiro_complementos.sql e
sql/010_pausas_programadas.sql aplicadas.
"""
import logging
import signal
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from server import app as backend  # noqa: E402  (reaproveita os MESMOS helpers da API)
from ifood_automacao.pedidos import MAX_LOJAS_POR_POLLING  # noqa: E402

INTERVALO_POLLING = 30
INTERVALO_STATUS = 60
INTERVALO_RECARREGAR_LOJAS = 300

logger = logging.getLogger("monitor")
_parar = False


def _sinal_parar(*_):
    global _parar
    _parar = True
    logger.info("Sinal de parada recebido — encerrando depois do ciclo atual.")


def _heartbeat(info):
    try:
        backend.requests.post(
            f"{backend.SUPABASE_URL}/rest/v1/monitor_heartbeat",
            headers={**backend._supabase_headers(), "Prefer": "resolution=merge-duplicates"},
            json={"id": backend.MONITOR_ID, "ultimo_ping": backend._agora_iso(), "info": info},
            timeout=10,
        ).raise_for_status()
    except Exception as exc:
        logger.warning("Falha ao gravar heartbeat (rodou a migration 009?): %s", exc)


def _polling(lojas_ifood):
    ids = [l["merchant_id"] for l in lojas_ifood]
    novos = 0
    for i in range(0, len(ids), MAX_LOJAS_POR_POLLING):
        novos += backend._processar_eventos(ids[i : i + MAX_LOJAS_POR_POLLING])
    return novos


def _verificar_status(lojas):
    mudancas = []
    for loja in lojas:
        status = backend.verificar_status_loja(loja)
        try:
            if backend.registrar_status_loja(status):
                mudancas.append(f"{loja.get('nome')}: {'ABERTA' if status['aberta'] else 'FECHADA'} ({status['motivo']})")
        except Exception as exc:
            logger.warning("Não gravei status da loja %s: %s", loja.get("merchant_id"), exc)
    return mudancas


def main():
    signal.signal(signal.SIGINT, _sinal_parar)
    signal.signal(signal.SIGTERM, _sinal_parar)
    if not backend.SUPABASE_CONFIGURADO:
        logger.error("SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY não configurados — o monitor não tem onde gravar.")
        sys.exit(1)

    lojas, lojas_carregadas_em = [], 0.0
    ultimo_status = 0.0
    info = {"pedidos_novos_total": 0, "ultimo_erro": None, "iniciado_em": backend._agora_iso()}
    logger.info("Monitor iniciado (polling %ss, status %ss).", INTERVALO_POLLING, INTERVALO_STATUS)

    while not _parar:
        inicio_ciclo = time.monotonic()

        if not lojas or inicio_ciclo - lojas_carregadas_em > INTERVALO_RECARREGAR_LOJAS:
            try:
                lojas = backend._todas_lojas()
                lojas_carregadas_em = inicio_ciclo
            except Exception as exc:
                logger.error("Não consegui carregar a lista de lojas: %s", exc)
        lojas_ifood = [l for l in lojas if (l.get("plataforma") or "ifood") == "ifood"]

        if lojas_ifood:
            try:
                novos = _polling(lojas_ifood)
                info["pedidos_novos_total"] += novos
                info["ultimo_polling"] = backend._agora_iso()
                if novos:
                    logger.info("%d pedido(s) novo(s).", novos)
            except Exception as exc:
                info["ultimo_erro"] = f"polling: {exc}"[:300]
                logger.error("Falha no polling de eventos: %s", exc)

        try:
            reativadas = backend.reativar_pausas_vencidas()
            if reativadas:
                info["pausas_reativadas_total"] = info.get("pausas_reativadas_total", 0) + reativadas
                logger.info("%d item(ns) com pausa vencida voltaram ao cardápio.", reativadas)
        except Exception as exc:
            info["ultimo_erro"] = f"pausas: {exc}"[:300]
            logger.error("Falha ao reativar pausas vencidas: %s", exc)

        if inicio_ciclo - ultimo_status >= INTERVALO_STATUS:
            ultimo_status = inicio_ciclo
            try:
                for mudanca in _verificar_status(lojas):
                    logger.info("Mudança de status — %s", mudanca)
                info["ultima_verificacao_status"] = backend._agora_iso()
            except Exception as exc:
                info["ultimo_erro"] = f"status: {exc}"[:300]
                logger.error("Falha ao verificar status das lojas: %s", exc)

        info["lojas_ifood"] = len(lojas_ifood)
        info["lojas_total"] = len(lojas)
        _heartbeat(info)

        # Dorme o que falta pra fechar 30s, acordando a cada 1s pra responder rápido a um Ctrl+C.
        while not _parar and time.monotonic() - inicio_ciclo < INTERVALO_POLLING:
            time.sleep(1)

    logger.info("Monitor encerrado.")


if __name__ == "__main__":
    main()
