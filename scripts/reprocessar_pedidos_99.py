"""Reprocessa os pedidos do 99Food de um período: busca de novo o detalhe de cada um na API do 99
(preço completo, status final, cancelamento) e regrava no Supabase. Serve pra corrigir o histórico
gravado antes de o painel guardar o bloco `price` e reconferir pedidos parados.

Precisa no .env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, FOOD99_APP_ID, FOOD99_APP_SECRET.

  python scripts/reprocessar_pedidos_99.py 2026-11-13 2026-11-19            reprocessa
  python scripts/reprocessar_pedidos_99.py 2026-11-13 2026-11-19 --so-faltando   só os sem `preco_99`
  python scripts/reprocessar_pedidos_99.py 2026-11-18 2026-11-19 --recalcular  refaz o total com o preço guardado
  python scripts/reprocessar_pedidos_99.py 2026-11-19 2026-11-19 --comparar  só mostra os números
                                                                             (pra bater com o portal)
"""
import argparse
import sys
from concurrent.futures import ThreadPoolExecutor
from datetime import date, timedelta
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ))

from server import app as backend  # noqa: E402

requests = backend.requests


def pedidos_do_periodo(inicio, fim, campos="ifood_order_id,merchant_id,status,total,detalhes_brutos"):
    """Pedidos do 99 recebidos entre inicio e fim (datas de Brasília), paginando de 1000 em 1000."""
    filtro = f"(recebido_em.gte.{inicio}T00:00:00-03:00,recebido_em.lt.{fim + timedelta(days=1)}T00:00:00-03:00)"
    saida, inicio_pagina = [], 0
    while True:
        resp = requests.get(
            f"{backend.SUPABASE_URL}/rest/v1/pedidos",
            headers={**backend._supabase_headers(), "Range": f"{inicio_pagina}-{inicio_pagina + 999}"},
            params={"select": campos, "ifood_order_id": "like.99-*", "and": filtro, "order": "recebido_em.asc"},
            timeout=30,
        )
        resp.raise_for_status()
        pagina = resp.json()
        saida += pagina
        if len(pagina) < 1000:
            return saida
        inicio_pagina += 1000


def reais(v):
    return (v or 0) / 100.0


def comparar(pedidos):
    """Soma cada campo de preço do 99, pra ver qual fórmula bate com a "Receita de vendas
    estimada" do portal, e os cancelamentos por responsável."""
    com_preco = [p for p in pedidos if (p.get("detalhes_brutos") or {}).get("preco_99")]
    validos = [p for p in com_preco if p["status"] != "CANCELADO"]
    print(f"Pedidos do 99 no período: {len(pedidos)} ({len(com_preco)} com preço completo do 99)")
    por_status = {}
    for p in pedidos:
        por_status[p["status"]] = por_status.get(p["status"], 0) + 1
    print("Por status:", por_status)
    if len(com_preco) < len(pedidos):
        print(f"  ! {len(pedidos) - len(com_preco)} sem preço completo — rode sem --comparar pra reprocessar.")

    def soma(func):
        return sum(func(p["detalhes_brutos"]["preco_99"], p["detalhes_brutos"].get("promocoes_99") or []) for p in validos)

    def g(pr, k):
        return pr.get(k) or 0

    def outros(pr, k):
        return (pr.get("others_fees") or {}).get(k) or 0

    def subsidio_loja(promos):
        return sum(x.get("shop_subside_price") or 0 for x in promos)

    # O 99 de produção NÃO manda real_price/real_pay_price: só order_price (cheio), descontos,
    # entrega cobrada da loja, taxa de serviço, reembolso e as promoções (com a parte da loja).
    formulas = {
        "order_price (itens, preço cheio)": lambda pr, pm: g(pr, "order_price"),
        "order_price - items_discount": lambda pr, pm: g(pr, "order_price") - g(pr, "items_discount"),
        "order_price - subsídio da loja": lambda pr, pm: g(pr, "order_price") - subsidio_loja(pm),
        "order_price - items_discount - refund": lambda pr, pm: g(pr, "order_price") - g(pr, "items_discount") - g(pr, "refund_price"),
        "order_price - subsídio loja - refund": lambda pr, pm: g(pr, "order_price") - subsidio_loja(pm) - g(pr, "refund_price"),
        "(itens - desc.) + entrega da loja": lambda pr, pm: g(pr, "order_price") - g(pr, "items_discount") + g(pr, "store_charged_delivery_price"),
        "(itens - desc.) + taxa de serviço": lambda pr, pm: g(pr, "order_price") - g(pr, "items_discount") + outros(pr, "service_price"),
        "items_discount": lambda pr, pm: g(pr, "items_discount"),
        "subsídio da loja (promoções)": lambda pr, pm: subsidio_loja(pm),
        "store_charged_delivery_price": lambda pr, pm: g(pr, "store_charged_delivery_price"),
        "delivery_discount": lambda pr, pm: g(pr, "delivery_discount"),
        "service_price": lambda pr, pm: outros(pr, "service_price"),
        "refund_price": lambda pr, pm: g(pr, "refund_price"),
        "commission_price": lambda pr, pm: g(pr, "commission_price"),
    }
    print(f"\nSomas dos {len(validos)} pedidos não cancelados (R$):")
    for nome, func in formulas.items():
        print(f"  {nome:42} {reais(soma(func)):>14,.2f}")

    cancelados = [p for p in pedidos if p["status"] == "CANCELADO"]
    print(f"\nCancelados: {len(cancelados)}")
    por_resp = {}
    for p in cancelados:
        c = (p.get("detalhes_brutos") or {}).get("cancelamento") or {}
        chave = f"{c.get('responsavel', '?')} (código {c.get('codigo', '?')})"
        linha = por_resp.setdefault(chave, [0, 0.0])
        linha[0] += 1
        pr = (p.get("detalhes_brutos") or {}).get("preco_99") or {}
        linha[1] += reais((pr.get("order_price") or 0) - (pr.get("items_discount") or 0))
    for chave, (n, valor) in sorted(por_resp.items()):
        print(f"  {chave:30} {n:4}  R$ {valor:,.2f} (itens - desconto)")


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("inicio", type=date.fromisoformat)
    p.add_argument("fim", type=date.fromisoformat)
    p.add_argument("--so-faltando", action="store_true", help="só os pedidos que ainda não têm o preço completo do 99")
    p.add_argument("--comparar", action="store_true", help="não reprocessa; só mostra as somas")
    p.add_argument("--recalcular", action="store_true", help="só recalcula o total com o preço já guardado (sem chamar o 99)")
    args = p.parse_args()

    pedidos = pedidos_do_periodo(args.inicio, args.fim)
    if args.recalcular:
        mudados = 0
        for x in pedidos:
            db = x.get("detalhes_brutos") or {}
            if not db.get("preco_99"):
                continue
            total = round(backend._receita_99(db["preco_99"], db.get("promocoes_99")) / 100.0, 2)
            if abs(total - float(x.get("total") or 0)) >= 0.01:
                requests.patch(
                    f"{backend.SUPABASE_URL}/rest/v1/pedidos",
                    headers=backend._supabase_headers(),
                    params={"ifood_order_id": f"eq.{x['ifood_order_id']}"},
                    json={"total": total},
                    timeout=15,
                ).raise_for_status()
                mudados += 1
        print(f"Total recalculado em {mudados} pedido(s).")
    elif not args.comparar:
        if not backend.FOOD99_CONFIGURADO:
            sys.exit("FOOD99_APP_ID e FOOD99_APP_SECRET precisam estar no .env pra consultar o 99.")
        alvo = [x for x in pedidos if not (args.so_faltando and (x.get("detalhes_brutos") or {}).get("preco_99"))]
        # ~2s por pedido (1s na API do 99 + gravação): 4 em paralelo.
        print(f"Reprocessando {len(alvo)} pedido(s) do 99 (~{len(alvo) * 2 / 4 / 60:.0f} min)…", flush=True)
        lotes = [alvo[i : i + 25] for i in range(0, len(alvo), 25)]
        feitos = vistos = 0
        with ThreadPoolExecutor(max_workers=4) as pool:
            for lote, n in zip(lotes, pool.map(backend.reprocessar_pedidos_99, lotes)):
                feitos += n
                vistos += len(lote)
                print(f"  {vistos}/{len(alvo)} — {feitos} atualizado(s)", flush=True)
        pedidos = pedidos_do_periodo(args.inicio, args.fim)
    comparar(pedidos)


if __name__ == "__main__":
    main()
