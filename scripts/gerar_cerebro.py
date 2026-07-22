# -*- coding: utf-8 -*-
"""
Gera o vault do Obsidian (cerebro-sistema/) a partir do grafo do graphify.

Fluxo:
    graphify update .            -> graphify-out/graph.json   (AST, sem custo de API)
    python scripts/gerar_cerebro.py  -> cerebro-sistema/nos/*.md + home

Cada no de codigo (funcao/classe/store) vira uma nota .md com frontmatter e
wikilinks para as relacoes reais (contem, chama, herda...). Nos de "rationale"
(texto solto, sem tipo) sao ignorados.

O script e deterministico: rodar de novo com o mesmo grafo produz exatamente os
mesmos arquivos, entao pode ser chamado por um hook a cada edicao sem churn.
"""
import json
import re
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
GRAFO = RAIZ / "graphify-out" / "graph.json"
VAULT = RAIZ / "cerebro-sistema"
NOS = VAULT / "nos"

# type do graphify -> rotulo em portugues
TIPOS = {
    "FUNCTION": "função",
    "CLASS": "classe",
    "STATE_STORE": "store",
}

# relation do graphify -> rotulo exibido em "Conexoes de saida"
RELACOES = {
    "contains": "Contém",
    "calls": "Chama",
    "inherits": "Herda",
    "method": "Método",
    "imports_from": "Importa de",
}

# caracteres proibidos em nome de arquivo no Windows
PROIBIDOS = re.compile(r'[<>:"/\\|?*\x00-\x1f]')


def caminho_relativo(source_file: str) -> str:
    """Converte o caminho absoluto (com mojibake) num caminho relativo à raiz."""
    if not source_file:
        return ""
    p = source_file.replace("\\", "/")
    idx = p.lower().find("ifood/")
    return p[idx + 6:] if idx >= 0 else p


def nome_nota(label: str) -> str:
    """Nome-base da nota: label em minúsculas, saneado pro sistema de arquivos."""
    nome = PROIBIDOS.sub("_", label.strip().lower())
    return nome.rstrip(". ") or "sem_nome"


def carregar_grafo():
    with open(GRAFO, encoding="utf-8") as f:
        return json.load(f)


def construir_mapa_nomes(nos):
    """id -> nome único da nota (com sufixo (2), (3)... em colisões)."""
    # ordem estável por id => atribuição de sufixo reproduzível entre execuções
    nos_ord = sorted(nos, key=lambda n: n["id"])
    usados = {}
    mapa = {}
    for n in nos_ord:
        base = nome_nota(n["label"])
        usados[base] = usados.get(base, 0) + 1
        mapa[n["id"]] = base if usados[base] == 1 else f"{base} ({usados[base]})"
    return mapa


def gerar():
    if not GRAFO.exists():
        print(f"[cerebro] {GRAFO} não existe — rode 'graphify update .' antes.")
        return 1

    g = carregar_grafo()
    nos = g.get("nodes", [])
    links = g.get("links", [])

    # só nós reais de código (rationale/descrição têm type nulo)
    nos_cod = [n for n in nos if n.get("type") in TIPOS]
    ids_cod = {n["id"] for n in nos_cod}
    mapa = construir_mapa_nomes(nos_cod)

    # índices de arestas
    saidas = {}       # src -> [(relation, tgt)]
    chamado_por = {}  # tgt -> [src]  (apenas relation == calls)
    contido_em = {}   # tgt -> [src]  (apenas relation == contains)
    for l in links:
        src, tgt, rel = l.get("_src"), l.get("_tgt"), l.get("relation")
        if src not in ids_cod or tgt not in ids_cod:
            continue
        if rel == "rationale_for":
            continue
        saidas.setdefault(src, []).append((rel, tgt))
        if rel == "calls":
            chamado_por.setdefault(tgt, []).append(src)
        elif rel == "contains":
            contido_em.setdefault(tgt, []).append(src)

    NOS.mkdir(parents=True, exist_ok=True)
    # limpa notas antigas (o vault é 100% gerado)
    for antigo in NOS.glob("*.md"):
        antigo.unlink()

    for n in nos_cod:
        nid = n["id"]
        label = n["label"]
        tipo = TIPOS[n["type"]]
        comunidade = n.get("community", 0)
        heat = round(float(n.get("heat", 0)), 3)
        complexidade = int(n.get("complexity", 0) or 0)
        arquivo = caminho_relativo(n.get("source_file", ""))
        local = n.get("source_location", "")

        linhas = [
            "---",
            f"tipo: {tipo}",
            f"comunidade: {comunidade}",
            f"heat: {heat}",
            f"complexidade: {complexidade}",
            f'arquivo: "{arquivo}"',
            f"local: {local}",
            f"tags: [c/{comunidade}, tipo/{tipo}]",
            "---",
            "",
            f"# {label}",
            "",
        ]

        # Conexões de saída, agrupadas por relação na ordem de RELACOES
        outs = saidas.get(nid, [])
        if outs:
            linhas.append("## Conexões de saída")
            for rel_key, rotulo in RELACOES.items():
                alvos = sorted({mapa[t] for r, t in outs if r == rel_key})
                for alvo in alvos:
                    linhas.append(f"- **{rotulo}:** [[{alvo}]]")
            linhas.append("")

        # Contido em (relação contains de entrada)
        pais = sorted({mapa[s] for s in contido_em.get(nid, [])})
        if pais:
            linhas.append("## Contido em")
            for pai in pais:
                linhas.append(f"- [[{pai}]]")
            linhas.append("")

        # Chamado por
        entradas = sorted({mapa[s] for s in chamado_por.get(nid, [])})
        if entradas:
            linhas.append("## Chamado por")
            for e in entradas:
                linhas.append(f"- [[{e}]]")
            linhas.append("")

        (NOS / f"{mapa[nid]}.md").write_text("\n".join(linhas).rstrip() + "\n", encoding="utf-8")

    gerar_home(nos_cod, mapa)
    print(f"[cerebro] {len(nos_cod)} notas geradas em {NOS}")
    return 0


def gerar_home(nos_cod, mapa):
    quentes = sorted(nos_cod, key=lambda n: n.get("heat", 0), reverse=True)[:12]
    linhas = [
        "---",
        "tags: [home]",
        "---",
        "",
        "# 🧠 Cérebro do Sistema",
        "",
        "Mapa vivo do projeto **Automação iFood**, gerado a partir do grafo de",
        "conhecimento do [graphify](../graphify-out/) (`graph.json`). Cada nota é uma",
        f"função, arquivo ou classe real do código — {len(nos_cod)} nós ao todo,",
        "conectados pelas relações reais (**chama**, **contém**, **herda**...).",
        "",
        "> [!tip] Abra o Graph View",
        "> Pressione `Ctrl+G` (ou o ícone de grafo na barra lateral) pra ver o cérebro",
        "> inteiro. As cores agrupam por **comunidade** (módulos que o graphify detectou).",
        "",
        '## Núcleos mais "quentes" (maior centralidade)',
        "",
    ]
    for n in quentes:
        linhas.append(f"- [[{mapa[n['id']]}]] — {TIPOS[n['type']]}, comunidade {n.get('community', 0)}")
    linhas += [
        "",
        "## Como foi feito",
        "",
        "1. `graphify update .` gera `graphify-out/graph.json`",
        "2. `python scripts/gerar_cerebro.py` converte cada nó em uma nota com wikilinks",
        "3. o Obsidian renderiza tudo no Graph View",
        "",
        "Isso roda **automático a cada edição de código** (hook do Claude Code), então o",
        "cérebro no Obsidian fica sempre em sincronia com o código.",
    ]
    (VAULT / "🧠 Cérebro do Sistema.md").write_text("\n".join(linhas) + "\n", encoding="utf-8")


if __name__ == "__main__":
    sys.exit(gerar())
