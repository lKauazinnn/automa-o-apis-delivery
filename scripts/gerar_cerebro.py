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
import collections
import json
import re
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
GRAFO = RAIZ / "graphify-out" / "graph.json"
VAULT = RAIZ / "cerebro-sistema"
NOS = VAULT / "nos"
OBS = VAULT / ".obsidian"

# Paleta viva pros núcleos coloridos. Ideia da "Estrela da Morte": a esfera é uma
# casca cinza (CSS) e cada comunidade grande acende como uma luz colorida.
PALETA = [
    "ff3b3b", "ff9f1c", "ffd60a", "06d6a0", "00b4d8", "4361ee", "9b5de5", "f15bb5",
    "ef476f", "8ac926", "1982c4", "c77dff", "ff6b6b", "2ec4b6", "f4a261", "b5179e",
]

# Snippet CSS aplicado só ao Graph View (não mexe no resto do Obsidian).
CSS_ESTRELA = """/* ===== Cérebro "Estrela da Morte" — gerado por scripts/gerar_cerebro.py =====
   NÃO edite à mão: é regenerado a cada atualização do cérebro. */

/* fundo espacial, só no grafo */
.workspace-leaf-content[data-type="graph"] .view-content,
.workspace-leaf-content[data-type="localgraph"] .view-content {
  --background-primary: #04050a;
  background-color: #04050a;
}

/* casca cinza da estação + linhas discretas; as cores vêm dos color groups */
.workspace-leaf-content[data-type="graph"],
.workspace-leaf-content[data-type="localgraph"] {
  --graph-node: #b9bec8;
  --graph-node-unresolved: #4f545f;
  --graph-node-tag: #8b909b;
  --graph-node-attachment: #8b909b;
  --graph-line: rgba(150, 165, 190, 0.16);
  --graph-node-focused: #ffffff;
  --graph-node-hover: #ffffff;
}
"""

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

EXT_CODIGO = re.compile(r"\.(py|jsx?|tsx?|mjs|cjs|html|vue|sql)$", re.I)


def classificar_tipo(n: dict) -> str | None:
    """Rótulo PT do nó. Infere o tipo quando o graphify (modo AST-only) deixa `type=None`.
    Devolve None se o nó NÃO for código (ex: "rationale" = frase solta sem arquivo)."""
    t = n.get("type")
    if t in TIPOS:
        return TIPOS[t]
    if t is not None:
        return None  # tipo conhecido mas não-código
    # type=None: só é código se tiver arquivo de origem e um label com cara de código
    lbl = (n.get("label") or "").strip()
    if not lbl or not n.get("source_file"):
        return None
    if lbl.endswith("()"):
        return "função"
    if EXT_CODIGO.search(lbl):
        return "arquivo"
    if " " not in lbl and len(lbl) <= 60:  # identificador/classe; frase com espaço = rationale
        return "classe"
    return None

EXT_CODIGO = re.compile(r"\.(py|jsx?|tsx?|mjs|cjs|html|vue|sql)$", re.I)


def classificar_tipo(n: dict) -> str | None:
    """Rótulo PT do nó. Infere o tipo quando o graphify (modo AST-only) deixa `type=None`.
    Devolve None se o nó NÃO for código (ex: "rationale" = frase solta sem arquivo)."""
    t = n.get("type")
    if t in TIPOS:
        return TIPOS[t]
    if t is not None:
        return None  # tipo conhecido mas não-código
    # type=None: só é código se tiver arquivo de origem e um label com cara de código
    lbl = (n.get("label") or "").strip()
    if not lbl or not n.get("source_file"):
        return None
    if lbl.endswith("()"):
        return "função"
    if EXT_CODIGO.search(lbl):
        return "arquivo"
    if " " not in lbl and len(lbl) <= 60:  # identificador/classe; frase com espaço = rationale
        return "classe"
    return None


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
    nos_cod = [n for n in nos if classificar_tipo(n) is not None]
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
        tipo = classificar_tipo(n)
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
    escrever_visual_obsidian(nos_cod)
    print(f"[cerebro] {len(nos_cod)} notas geradas em {NOS}")
    return 0


def escrever_visual_obsidian(nos_cod):
    """Configura o Graph View com cara de 'Estrela da Morte': esfera densa (forças)
    + casca cinza (CSS) + núcleos coloridos por comunidade. Idempotente."""
    OBS.mkdir(parents=True, exist_ok=True)

    # comunidades por tamanho — as maiores ganham as cores mais vivas da paleta
    tamanho = collections.Counter(n.get("community", 0) for n in nos_cod)
    principais = [cid for cid, _ in tamanho.most_common(len(PALETA))]
    color_groups = [
        {"query": f"tag:#c/{cid}", "color": {"a": 1, "rgb": int(PALETA[i], 16)}}
        for i, cid in enumerate(principais)
    ]

    # graph.json — preserva chaves existentes, cravando cores + forças da esfera densa
    gj_path = OBS / "graph.json"
    try:
        gj = json.loads(gj_path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        gj = {}
    gj.update({
        "colorGroups": color_groups,
        "showArrow": False,
        "showOrphans": True,
        "showTags": False,
        "showAttachments": False,
        # forças: puxa tudo pro centro numa bola densa (a "estação")
        "centerStrength": 0.8,
        "repelStrength": 6,
        "linkStrength": 0.7,
        "linkDistance": 45,
        "nodeSizeMultiplier": 0.62,
        "lineSizeMultiplier": 0.2,
        "textFadeMultiplier": -1.2,   # esconde os rótulos com zoom-out => casca limpa
        "scale": 0.45,
        "collapse-color-groups": False,
        "collapse-forces": False,
    })
    gj_path.write_text(json.dumps(gj, ensure_ascii=False, indent=2), encoding="utf-8")

    # snippet CSS (casca cinza + fundo espacial)
    snip = OBS / "snippets"
    snip.mkdir(parents=True, exist_ok=True)
    (snip / "estrela-da-morte.css").write_text(CSS_ESTRELA, encoding="utf-8")

    # appearance.json — tema escuro + habilita o snippet (preserva o resto)
    ap_path = OBS / "appearance.json"
    try:
        ap = json.loads(ap_path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        ap = {}
    ap["theme"] = "obsidian"
    snippets = set(ap.get("enabledCssSnippets", []))
    snippets.add("estrela-da-morte")
    ap["enabledCssSnippets"] = sorted(snippets)
    ap_path.write_text(json.dumps(ap, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"[cerebro] visual Estrela da Morte: {len(color_groups)} núcleos coloridos + esfera densa")


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
        linhas.append(f"- [[{mapa[n['id']]}]] — {classificar_tipo(n) or 'nó'}, comunidade {n.get('community', 0)}")
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
