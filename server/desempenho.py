"""Agregações da tela "Desempenho" — o equivalente, no PausaFast, à aba Desempenho do Portal
do Parceiro do iFood. Funções puras (sem Flask): recebem o payload cru das APIs e devolvem
números prontos pra tela e pros relatórios CSV.

Fontes (ver HOMOLOGACAO.md):
- Financial API v3 `sales` — pedido a pedido, mesmo dia (vendas, promoções por patrocinador,
  tempos pelos `orderEvents`, cancelamentos).
- Analytics v1 `orders/kpis` — agregado D-1 (tempos de logística como o entregador esperando na
  loja, atraso, cancelamentos por motivo/origem/estágio, 1º pedido do cliente na loja).
- Review API v2 — avaliações.
- Tabela `pedidos` do Supabase — histórico por `customer.id` pra segmentar clientes.

Sem API pública (confirmado na doc em 10/11/2026): funil de conversão do cardápio, Ads e Super
Restaurante — ficam de fora.
"""
from collections import Counter, defaultdict
from datetime import date, datetime, timedelta, timezone
from statistics import median

# ─────────────────────────────── utilidades ───────────────────────────────


def _num(v):
    try:
        return float(v or 0)
    except (TypeError, ValueError):
        return 0.0


def _dt(iso):
    """ISO do iFood → datetime aware. Aceita nanossegundos ('...04.036634170Z')."""
    if not iso:
        return None
    s = str(iso).replace("Z", "+00:00")
    if "." in s:
        base, resto = s.split(".", 1)
        frac = "".join(ch for ch in resto if ch.isdigit())
        tz = resto[len(frac):]
        s = f"{base}.{frac[:6]}{tz}"
    try:
        d = datetime.fromisoformat(s)
    except ValueError:
        return None
    return d if d.tzinfo else d.replace(tzinfo=timezone.utc)


def _r(v, casas=2):
    return round(v, casas) if v is not None else None


def _estat(valores):
    """Média, mediana e quantidade de uma lista de minutos (ignora None/negativos)."""
    vals = [v for v in valores if v is not None and v >= 0]
    if not vals:
        return {"media": None, "mediana": None, "pedidos": 0}
    return {"media": _r(sum(vals) / len(vals), 1), "mediana": _r(median(vals), 1), "pedidos": len(vals)}


# ─────────────────────────────── patrocinadores ───────────────────────────────
# A doc descreve os patrocinadores como "iFood, loja, rede ou externo"; os exemplos mostram
# IFOOD e CHAIN e a Order API lista IFOOD/EXTERNAL/MERCHANT/CHAIN. O que não estiver no mapa
# aparece com o nome cru (melhor do que sumir com dinheiro).
PATROCINADOR = {
    "IFOOD": "iFood",
    "MERCHANT": "Loja",
    "STORE": "Loja",
    "PARTNER": "Loja",
    "CHAIN": "Rede",
    "EXTERNAL": "Indústria",
    "INDUSTRY": "Indústria",
}
ORDEM_PATROCINADOR = ["Loja", "iFood", "Rede", "Indústria"]


def rotulo_patrocinador(nome):
    return PATROCINADOR.get(str(nome or "").upper(), str(nome or "Outro"))


# ─────────────────────────────── tempos (orderEvents) ───────────────────────────────
MARCOS = {
    "recebido": ("RECEIVED", "PLACED"),
    "confirmado": ("CONFIRMED",),
    "preparo": ("PREPARATION_STARTED", "SEPARATION_STARTED"),
    "pronto": ("READY_TO_DELIVER", "READY_TO_PICKUP", "SEPARATION_ENDED"),
    "despachado": ("DISPATCHED",),
    "chegou": ("ARRIVED", "ARRIVED_AT_DESTINATION"),
    "concluido": ("CONCLUDED",),
    "cancelado": ("CANCELLED",),
}


def _marcos(venda):
    """Primeiro horário de cada marco do pedido, juntando orderEvents e orderStatusHistory."""
    vistos = defaultdict(list)
    for ev in venda.get("orderEvents") or []:
        vistos[str(ev.get("fullCode") or "").upper()].append(_dt(ev.get("createdAt")))
    for st in venda.get("orderStatusHistory") or []:
        vistos[str(st.get("value") or "").upper()].append(_dt(st.get("createdAt")))
    marcos = {}
    for chave, codigos in MARCOS.items():
        horarios = [h for c in codigos for h in vistos.get(c, []) if h]
        marcos[chave] = min(horarios) if horarios else None
    marcos["recebido"] = marcos["recebido"] or _dt(venda.get("createdAt"))
    return marcos


def _min(a, b):
    return (b - a).total_seconds() / 60 if a and b and b >= a else None


def tempos_do_pedido(venda):
    m = _marcos(venda)
    inicio_preparo = m["preparo"] or m["confirmado"]
    return {
        "aceite": _min(m["recebido"], m["confirmado"]),
        "preparo": _min(inicio_preparo, m["pronto"]),
        "ate_despacho": _min(m["recebido"], m["despachado"]),
        "entrega": _min(m["despachado"], m["chegou"] or m["concluido"]),
        "total": _min(m["recebido"], m["chegou"] or m["concluido"]),
    }


# ─────────────────────────────── cancelamento ───────────────────────────────


def motivo_cancelamento(venda):
    """Motivo do cancelamento a partir do metadata do status/evento CANCELLED. Os nomes das chaves
    vêm do evento CAN da Order API (CANCEL_REASON, CANCEL_CODE_DESCRIPTION, CANCEL_ORIGIN...)."""
    fontes = [s.get("metadata") for s in venda.get("orderStatusHistory") or [] if str(s.get("value")).upper() == "CANCELLED"]
    fontes += [e.get("metadata") for e in venda.get("orderEvents") or [] if str(e.get("fullCode")).upper() == "CANCELLED"]
    for meta in fontes:
        if not isinstance(meta, dict):
            continue
        texto = meta.get("CANCEL_REASON") or meta.get("CANCEL_CODE_DESCRIPTION") or meta.get("reason") or meta.get("description")
        origem = meta.get("CANCEL_ORIGIN") or meta.get("origin")
        codigo = meta.get("CANCEL_CODE") or meta.get("code")
        if texto or codigo:
            return {"motivo": str(texto or f"Código {codigo}"), "origem": origem, "codigo": codigo}
    # Na Sales API (confirmado no sandbox em 10/11/2026) o cancelamento só traz o código, dentro
    # do evento REFUND: metadata.cancelCode. O texto vem do evento CAN do polling — a rota completa
    # com `completar_cancelamento` a partir de `eventos_ifood`.
    for ev in venda.get("orderEvents") or []:
        codigo = (ev.get("metadata") or {}).get("cancelCode") if isinstance(ev.get("metadata"), dict) else None
        if codigo:
            return {"motivo": f"Código {codigo}", "origem": None, "codigo": str(codigo)}
    return {"motivo": "Motivo não informado pelo iFood", "origem": None, "codigo": None}


def completar_cancelamento(linha, metadata_can):
    """Completa o motivo de uma linha cancelada com o metadata do evento CAN (Order API)."""
    if not linha or not metadata_can or not linha.get("cancelamento"):
        return
    linha["cancelamento"] = {
        "motivo": metadata_can.get("CANCEL_REASON") or metadata_can.get("details") or linha["cancelamento"]["motivo"],
        "origem": metadata_can.get("CANCEL_ORIGIN") or metadata_can.get("ORIGIN") or linha["cancelamento"]["origem"],
        "codigo": metadata_can.get("CANCEL_CODE") or metadata_can.get("reason_code") or linha["cancelamento"]["codigo"],
        "estagio": str(metadata_can.get("CANCEL_STAGE") or "").strip("[]") or None,
    }


# ─────────────────────────────── vendas ───────────────────────────────


def linha_venda(venda, nome_loja=""):
    """Uma venda já achatada — vira linha do relatório de vendas e do de promoções."""
    bruto = venda.get("saleGrossValue") or {}
    itens = _num(bruto.get("bag"))
    entrega = _num(bruto.get("deliveryFee"))
    servico = _num(bruto.get("serviceFee"))
    por_patrocinador = defaultdict(float)
    for b in (venda.get("benefits") or {}).get("benefits") or []:
        for s in b.get("sponsorships") or []:
            por_patrocinador[rotulo_patrocinador(s.get("name"))] += _num(s.get("value"))
    status = str(venda.get("currentStatus") or "").upper()
    entrega_params = (venda.get("delivery") or {}).get("deliveryParameters") or {}
    criado = _dt(venda.get("createdAt"))
    return {
        "id": venda.get("id"),
        "codigo": venda.get("shortId"),
        "loja": nome_loja or ((venda.get("merchant") or {}).get("name") or ""),
        "merchant_id": (venda.get("merchant") or {}).get("id"),
        "criado_em": venda.get("createdAt"),
        "dia": criado.astimezone(timezone(timedelta(hours=-3))).date().isoformat() if criado else None,
        "hora": criado.astimezone(timezone(timedelta(hours=-3))).hour if criado else None,
        "status": status,
        "canal": venda.get("salesChannel"),
        "entrega_tipo": (venda.get("delivery") or {}).get("type"),
        "logistica": entrega_params.get("logisticProvider"),
        "itens": round(itens, 2),
        "taxa_entrega": round(entrega, 2),
        "taxa_servico": round(servico, 2),
        "total": round(itens + entrega + servico, 2),
        "desconto_total": round(_num((venda.get("benefits") or {}).get("totalValue")), 2),
        "desconto_por_patrocinador": {k: round(v, 2) for k, v in por_patrocinador.items()},
        "pagamentos": ", ".join(str(m.get("method")) for m in (venda.get("payments") or {}).get("methods") or []),
        "tempos": {k: _r(v, 1) for k, v in tempos_do_pedido(venda).items()},
        "cancelamento": motivo_cancelamento(venda) if status == "CANCELLED" else None,
    }


def resumir_vendas(linhas, inicio: date, fim: date):
    validas = [l for l in linhas if l["status"] != "CANCELLED"]
    canceladas = [l for l in linhas if l["status"] == "CANCELLED"]
    total_itens = sum(l["itens"] for l in validas)
    total_com_entrega = sum(l["itens"] + l["taxa_entrega"] for l in validas)

    # série diária com todos os dias do período (dia sem venda = 0, não buraco no gráfico)
    por_dia = {(inicio + timedelta(days=i)).isoformat(): {"pedidos": 0, "valor": 0.0, "cancelados": 0} for i in range((fim - inicio).days + 1)}
    for l in linhas:
        d = por_dia.get(l["dia"])
        if d is None:
            continue
        if l["status"] == "CANCELLED":
            d["cancelados"] += 1
        else:
            d["pedidos"] += 1
            d["valor"] += l["itens"]

    def quebra(chave):
        agg = defaultdict(lambda: {"pedidos": 0, "valor": 0.0})
        for l in validas:
            k = l.get(chave) or "—"
            agg[k]["pedidos"] += 1
            agg[k]["valor"] += l["itens"]
        return sorted(({"chave": k, "pedidos": v["pedidos"], "valor": round(v["valor"], 2)} for k, v in agg.items()), key=lambda x: -x["valor"])

    por_hora = Counter(l["hora"] for l in validas if l["hora"] is not None)
    return {
        "pedidos": len(validas),
        "cancelados": len(canceladas),
        "valor_itens": round(total_itens, 2),
        "valor_com_entrega": round(total_com_entrega, 2),
        "ticket_medio": round(total_itens / len(validas), 2) if validas else 0,
        "ticket_medio_com_entrega": round(total_com_entrega / len(validas), 2) if validas else 0,
        "por_dia": [{"dia": k, **{kk: (round(vv, 2) if isinstance(vv, float) else vv) for kk, vv in v.items()}} for k, v in por_dia.items()],
        "por_canal": quebra("canal"),
        "por_loja": quebra("loja"),
        "por_entrega": quebra("logistica"),
        "por_hora": [{"hora": h, "pedidos": por_hora.get(h, 0)} for h in range(24)],
    }


def resumir_promocoes(linhas):
    """Igual ao bloco "Promoções" do Portal: pedidos com promoção, receita dos itens nesses
    pedidos e investimento por patrocinador com o retorno a cada R$ 1 investido.

    Retorno do patrocinador X = receita dos itens dos pedidos em que X bancou desconto ÷ quanto
    X investiu. É a leitura do Portal ("Retorno a cada real investido"); o Portal não publica a
    fórmula exata, então os números podem diferir um pouco dos dele."""
    validas = [l for l in linhas if l["status"] != "CANCELLED"]
    com_promo = [l for l in validas if l["desconto_total"] > 0]
    receita = sum(l["itens"] for l in com_promo)
    invest = defaultdict(lambda: {"valor": 0.0, "pedidos": 0, "receita": 0.0})
    for l in com_promo:
        for pat, valor in l["desconto_por_patrocinador"].items():
            invest[pat]["valor"] += valor
            invest[pat]["pedidos"] += 1
            invest[pat]["receita"] += l["itens"]
    total_invest = sum(v["valor"] for v in invest.values())
    nomes = ORDEM_PATROCINADOR + sorted(k for k in invest if k not in ORDEM_PATROCINADOR)
    patrocinadores = []
    for nome in nomes:
        v = invest.get(nome, {"valor": 0.0, "pedidos": 0, "receita": 0.0})
        patrocinadores.append({
            "patrocinador": nome,
            "investimento": round(v["valor"], 2),
            "participacao": round(v["valor"] / total_invest * 100, 1) if total_invest else 0,
            "pedidos": v["pedidos"],
            "por_pedido": round(v["valor"] / v["pedidos"], 2) if v["pedidos"] else 0,
            "retorno_por_real": round(v["receita"] / v["valor"], 2) if v["valor"] else None,
        })
    return {
        "pedidos_com_promocao": len(com_promo),
        "pedidos_total": len(validas),
        "percentual": round(len(com_promo) / len(validas) * 100, 1) if validas else 0,
        "receita_itens": round(receita, 2),
        "ticket_medio": round(receita / len(com_promo), 2) if com_promo else 0,
        "investimento_total": round(total_invest, 2),
        "patrocinadores": patrocinadores,
    }


def resumir_operacao(linhas):
    """Tempos pelos eventos do pedido (mesmo dia). Só pedidos não cancelados."""
    validas = [l for l in linhas if l["status"] != "CANCELLED"]
    return {k: _estat([l["tempos"][k] for l in validas]) for k in ("aceite", "preparo", "ate_despacho", "entrega", "total")}


def resumir_cancelamentos(linhas):
    canc = [l for l in linhas if l["status"] == "CANCELLED"]
    total = len(linhas)
    motivos = Counter(l["cancelamento"]["motivo"] for l in canc)
    origens = Counter(ORIGEM_CANCELAMENTO.get(l["cancelamento"]["origem"], l["cancelamento"]["origem"] or "Não informada") for l in canc)
    return {
        "cancelados": len(canc),
        "taxa": round(len(canc) / total * 100, 1) if total else 0,
        "valor_perdido": round(sum(l["itens"] for l in canc), 2),
        "motivos": [{"motivo": k, "pedidos": v} for k, v in motivos.most_common()],
        "origens": [{"origem": k, "pedidos": v} for k, v in origens.most_common()],
        "lista": [
            {
                "pedido": l["codigo"],
                "loja": l["loja"],
                "criado_em": l["criado_em"],
                "valor": l["itens"],
                "motivo": l["cancelamento"]["motivo"],
                "origem": ORIGEM_CANCELAMENTO.get(l["cancelamento"]["origem"], l["cancelamento"]["origem"] or "Não informada"),
                "estagio": ESTAGIO_CANCELAMENTO.get(l["cancelamento"].get("estagio"), l["cancelamento"].get("estagio")),
                "codigo_cancelamento": l["cancelamento"]["codigo"],
            }
            for l in sorted(canc, key=lambda x: x["criado_em"] or "", reverse=True)[:200]
        ],
    }


# ─────────────────────────────── Analytics (D-1) ───────────────────────────────
METRICAS_TEMPO = {
    "preparationTimeInMin": "Preparo real",
    "timeAtOriginInMin": "Entregador esperando na loja",
    "timeToOriginInMin": "Entregador indo até a loja",
    "timeToAssignInMin": "Até alocar entregador",
    "timeToDestinationInMin": "Entregador até o cliente",
    "timeToDeliveryInMin": "Tempo total de entrega",
    "timeToDeliveryExpectedInMin": "Entrega prometida",
    "timeDelayedInMin": "Atraso na entrega",
}

ORIGEM_CANCELAMENTO = {
    "MERCHANT": "Loja",
    "PARTNER": "Parceiro",
    "CUSTOMER": "Cliente",
    "LOGISTICS": "Logística",
    "SYSTEM": "Sistema",
    "SCHEDULER": "Sistema (prazo esgotado)",  # visto no sandbox: pedido não confirmado a tempo
    "IFOOD": "iFood",
}
ESTAGIO_CANCELAMENTO = {
    "PRE_CONFIRMED": "Antes de confirmar",
    "PREPARATION_TIME": "Durante o preparo",
    "DISPATCHED": "Depois de despachar",
    "CONCLUDED": "Depois de concluído",
}


def consultas_analytics():
    """As consultas feitas no Analytics por loja: (chave, agg, filtro)."""
    return [
        ("tempos", {"metrics": {m: ["avg"] for m in METRICAS_TEMPO}, "terms": {"orderStatus": ["count"]}}, {"orderStatus": ["CONCLUDED"]}),
        ("geral", {"metrics": {"gmv": ["sum", "avg"], "refundedTotalValue": ["sum"], "benefitByTypePartnerTotalValue": ["sum"]},
                   "terms": {"orderStatus": ["count"], "customerFirstOrderInMerchant": ["count"], "deliveredBy": ["count"]}}, None),
        ("cancelamentos", {"terms": {"cancellationReason": ["count"], "cancellationOrigin": ["count"], "cancellationStage": ["count"], "cancellationCode": ["count"]},
                           "metrics": {"refundedTotalValue": ["sum"]}}, {"orderStatus": ["CANCELLED"]}),
    ]


def juntar_analytics(por_loja):
    """`por_loja`: lista de {chave: data[]} (uma por loja). Soma contagens entre lojas e faz a
    média dos tempos ponderada pelo nº de pedidos concluídos de cada loja."""
    tempos_pond = defaultdict(lambda: [0.0, 0])
    termos = defaultdict(Counter)
    somas = defaultdict(float)
    for loja in por_loja:
        t = (loja.get("tempos") or [{}])[0] if loja.get("tempos") else {}
        peso = sum(((t.get("orderStatus") or {}).get("value") or {}).values()) or 0
        for m in METRICAS_TEMPO:
            v = (t.get(m) or {}).get("avg")
            if v is not None and peso:
                tempos_pond[m][0] += v * peso
                tempos_pond[m][1] += peso
        for bloco in ("geral", "cancelamentos"):
            dado = (loja.get(bloco) or [{}])[0] if loja.get(bloco) else {}
            for campo, val in dado.items():
                if isinstance(val, dict) and isinstance(val.get("value"), dict):
                    termos[f"{bloco}.{campo}"].update({k: int(v or 0) for k, v in val["value"].items()})
                elif isinstance(val, dict) and val.get("sum") is not None:
                    somas[f"{bloco}.{campo}"] += _num(val.get("sum"))
    status = termos.get("geral.orderStatus", Counter())
    primeiro = termos.get("geral.customerFirstOrderInMerchant", Counter())
    cancel_total = sum(termos.get("cancelamentos.cancellationOrigin", Counter()).values())
    return {
        "tempos": [
            {"chave": m, "rotulo": rot, "media_min": _r(tempos_pond[m][0] / tempos_pond[m][1], 1) if tempos_pond[m][1] else None}
            for m, rot in METRICAS_TEMPO.items()
        ],
        "pedidos_concluidos": status.get("CONCLUDED", 0),
        "pedidos_cancelados": status.get("CANCELLED", 0),
        "gmv": round(somas.get("geral.gmv", 0), 2),
        "subsidio_parceiros": round(somas.get("geral.benefitByTypePartnerTotalValue", 0), 2),
        "reembolsado": round(somas.get("cancelamentos.refundedTotalValue", 0), 2),
        "clientes_novos": primeiro.get("true", 0),
        "clientes_recorrentes": primeiro.get("false", 0),
        "por_logistica": [{"chave": k, "pedidos": v} for k, v in termos.get("geral.deliveredBy", Counter()).most_common()],
        "cancelamentos": {
            "total": cancel_total,
            "motivos": [{"motivo": k, "pedidos": v} for k, v in termos.get("cancelamentos.cancellationReason", Counter()).most_common()],
            "origens": [{"origem": ORIGEM_CANCELAMENTO.get(k, k), "pedidos": v} for k, v in termos.get("cancelamentos.cancellationOrigin", Counter()).most_common()],
            "estagios": [{"estagio": ESTAGIO_CANCELAMENTO.get(k, k), "pedidos": v} for k, v in termos.get("cancelamentos.cancellationStage", Counter()).most_common()],
            "codigos": [{"codigo": k, "pedidos": v} for k, v in termos.get("cancelamentos.cancellationCode", Counter()).most_common()],
        },
    }


# ─────────────────────────────── clientes ───────────────────────────────
DIAS_RECUPERADO = 45   # voltou depois de ficar 45+ dias sem pedir
DIAS_ALERTA = 30       # cliente frequente sem pedir há 30–60 dias
DIAS_PERDIDO = 60      # sem pedir há mais de 60 dias


def segmentar_clientes(pedidos, inicio: date, fim: date):
    """Segmenta clientes pelo histórico de pedidos que entraram no painel.

    `pedidos`: [{cliente_id, nome, quando (datetime), anteriores (ordersCountOnMerchant|None)}]
    (não cancelados). Regras (no período [inicio, fim]):
      - novo: 1º pedido na loja dentro do período (ordersCountOnMerchant == 0, ou, se o iFood não
        mandou esse campo, o 1º que o painel viu);
      - recorrente: pediu no período e já tinha pedido antes;
      - recuperado: pediu no período depois de 45+ dias sem pedir;
      - em alerta: tem 2+ pedidos e o último foi há 30–60 dias (contando do fim do período);
      - perdido: 2+ pedidos e nada há mais de 60 dias.
    O histórico só começa quando o painel começou a receber pedidos da loja."""
    ini = datetime.combine(inicio, datetime.min.time(), tzinfo=timezone.utc)
    ref = datetime.combine(fim, datetime.max.time(), tzinfo=timezone.utc)
    por_cliente = defaultdict(list)
    for p in pedidos:
        if p.get("cliente_id") and p.get("quando") and p["quando"] <= ref:
            por_cliente[p["cliente_id"]].append(p)
    seg = {"novos": [], "recorrentes": [], "recuperados": [], "em_alerta": [], "perdidos": []}
    ativos = 0
    for cid, lista in por_cliente.items():
        lista.sort(key=lambda p: p["quando"])
        no_periodo = [p for p in lista if p["quando"] >= ini]
        antes = [p for p in lista if p["quando"] < ini]
        nome = lista[-1].get("nome") or ""
        resumo = {"cliente_id": cid, "nome": nome, "pedidos": len(lista), "ultimo": lista[-1]["quando"].isoformat()}
        if no_periodo:
            ativos += 1
            primeiro = no_periodo[0]
            eh_novo = primeiro.get("anteriores") == 0 if primeiro.get("anteriores") is not None else not antes
            if eh_novo:
                seg["novos"].append(resumo)
            else:
                seg["recorrentes"].append(resumo)
                if antes and (primeiro["quando"] - antes[-1]["quando"]).days >= DIAS_RECUPERADO:
                    seg["recuperados"].append(resumo)
        elif len(lista) >= 2:
            sem_pedir = (ref - lista[-1]["quando"]).days
            if DIAS_ALERTA <= sem_pedir <= DIAS_PERDIDO:
                seg["em_alerta"].append({**resumo, "dias_sem_pedir": sem_pedir})
            elif sem_pedir > DIAS_PERDIDO:
                seg["perdidos"].append({**resumo, "dias_sem_pedir": sem_pedir})
    return {
        "clientes_no_periodo": ativos,
        "clientes_total": len(por_cliente),
        **{k: len(v) for k, v in seg.items()},
        "listas": {k: sorted(v, key=lambda x: x["ultimo"], reverse=True)[:100] for k, v in seg.items()},
        "regras": {"dias_recuperado": DIAS_RECUPERADO, "dias_alerta": DIAS_ALERTA, "dias_perdido": DIAS_PERDIDO},
    }


# ─────────────────────────────── avaliações ───────────────────────────────


def resumir_avaliacoes(resumos, avaliacoes):
    notas = [_num(a.get("score")) for a in avaliacoes if a.get("score") is not None]
    dist = Counter(int(round(n)) for n in notas)
    score_geral = [r for r in resumos if r and r.get("score") is not None]
    return {
        "nota_geral": _r(sum(_num(r["score"]) for r in score_geral) / len(score_geral), 2) if score_geral else None,
        "total_avaliacoes": int(sum(_num(r.get("totalReviewsCount")) for r in resumos if r)),
        "no_periodo": len(avaliacoes),
        "media_periodo": _r(sum(notas) / len(notas), 2) if notas else None,
        "distribuicao": [{"nota": n, "avaliacoes": dist.get(n, 0)} for n in range(5, 0, -1)],
        "lista": [
            {
                "id": a.get("id"),
                "nota": a.get("score"),
                "comentario": a.get("comment"),
                "criado_em": a.get("createdAt"),
                "loja": a.get("_loja"),
                "pedido": (a.get("order") or {}).get("shortId") or (a.get("order") or {}).get("id"),
                "respondida": bool(a.get("replies")),
            }
            for a in sorted(avaliacoes, key=lambda x: x.get("createdAt") or "", reverse=True)[:200]
        ],
    }
