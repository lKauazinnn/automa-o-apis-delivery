---
tags: [home]
---

# 🧠 Cérebro do Sistema

Mapa vivo do projeto **Automação iFood**, gerado a partir do grafo de
conhecimento do [graphify](../graphify-out/) (`graph.json`). Cada nota é uma
função, arquivo ou classe real do código — 504 nós ao todo,
conectados pelas relações reais (**chama**, **contém**, **herda**...).

> [!tip] Abra o Graph View
> Pressione `Ctrl+G` (ou o ícone de grafo na barra lateral) pra ver o cérebro
> inteiro. As cores agrupam por **comunidade** (módulos que o graphify detectou).

## Núcleos mais "quentes" (maior centralidade)

- [[painel()]] — função, comunidade 7
- [[app.py (2)]] — função, comunidade 0
- [[kdsview()]] — função, comunidade 1
- [[lucide-react]] — classe, comunidade 1
- [[react]] — classe, comunidade 1
- [[readme.md]] — classe, comunidade 12
- [[arquitetura]] — classe, comunidade 12
- [[manual]] — classe, comunidade 12
- [[readme.md (2)]] — classe, comunidade 20
- [[catalogoview()]] — função, comunidade 1
- [[gruposopcaomodal()]] — função, comunidade 1
- [[registrar_auditoria()]] — função, comunidade 0

## Como foi feito

1. `graphify update .` gera `graphify-out/graph.json`
2. `python scripts/gerar_cerebro.py` converte cada nó em uma nota com wikilinks
3. o Obsidian renderiza tudo no Graph View

Isso roda **automático a cada edição de código** (hook do Claude Code), então o
cérebro no Obsidian fica sempre em sincronia com o código.
