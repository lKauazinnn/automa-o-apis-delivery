# Graph Report - automa-o-apis-delivery  (2026-07-22)

## Corpus Check
- 50 files · ~37,440 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 486 nodes · 990 edges · 34 communities (30 shown, 4 thin omitted)
- Extraction: 89% EXTRACTED · 11% INFERRED · 0% AMBIGUOUS · INFERRED: 105 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `cf817df5`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- devDependencies
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Mapa de homologação — Módulos de Catálogo e Merchant iFood
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- CLAUDE.md

## God Nodes (most connected - your core abstractions)
1. `auth_headers()` - 44 edges
2. `_merchant_id()` - 39 edges
3. `com_retry()` - 39 edges
4. `registrar_auditoria()` - 34 edges
5. `_supabase_headers()` - 22 edges
6. `react` - 15 edges
7. `criar_item()` - 13 edges
8. `_catalog_id()` - 12 edges
9. `main()` - 11 edges
10. `Automação de Catálogo iFood — Cajupar` - 11 edges

## Surprising Connections (you probably didn't know these)
- `main()` --calls--> `list_catalogs()`  [INFERRED]
  scripts/carga_massa.py → src/ifood_automacao/client.py
- `main()` --calls--> `list_categories()`  [INFERRED]
  scripts/carga_massa.py → src/ifood_automacao/client.py
- `main()` --calls--> `com_retry()`  [INFERRED]
  scripts/carga_massa.py → src/ifood_automacao/rate_limit.py
- `main()` --indirect_call--> `create_category()`  [INFERRED]
  scripts/carga_massa.py → src/ifood_automacao/client.py
- `main()` --indirect_call--> `upsert_item()`  [INFERRED]
  scripts/carga_massa.py → src/ifood_automacao/client.py

## Import Cycles
- None detected.

## Communities (34 total, 4 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (61): Pausa (UNAVAILABLE) ou despausa (AVAILABLE) um item globalmente., Atualiza globalmente o preço de um item já existente no catálogo., Atualiza globalmente o código PDV (externalCode) de um item já existente no catá, Pausa (UNAVAILABLE) ou despausa (AVAILABLE) um item globalmente., Atualiza globalmente o preço de um item já existente no catálogo., Cria ou substitui por completo um item (PUT é idempotente e sempre reenvia a est, Cria ou substitui por completo um item (PUT é idempotente e sempre reenvia a est, Atualiza globalmente o código PDV (externalCode) de um item já existente no catá (+53 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (97): Loja alvo da requisição: vem de ?loja=<id> na query string, ou a padrão do .env., Grava uma linha na tabela `auditoria` do Supabase para toda ação que altera o ca, Loja alvo da requisição: vem de ?loja=<id> na query string, ou a padrão do .env., Grava uma linha na tabela `auditoria` do Supabase para toda ação que altera o ca, Devolve quem é o usuário logado (id, email, nome, papel) — o front usa isso depo, Lojas cadastradas em `public.lojas` no Supabase (não é mais list_merchants() do, Devolve quem é o usuário logado (id, email, nome, papel) — o front usa isso depo, Lojas cadastradas em `public.lojas` no Supabase (não é mais list_merchants() do (+89 more)

### Community 2 - "Community 2"
Cohesion: 0.05
Nodes (59): ACAO_LABEL, CHAVE_SESSAO, contadorToast, CoresContext, PALETAS, react, campoPreenchido(), encontrarRelacionados() (+51 more)

### Community 3 - "devDependencies"
Cohesion: 0.06
Nodes (35): autoprefixer, lucide-react, oxlint, postcss, react, react-dom, recharts, tailwindcss (+27 more)

### Community 4 - "Community 4"
Cohesion: 0.11
Nodes (19): buscar_pedidos(), _criar_pedido_local(), _preco_item(), _processar_eventos_da_loja(), Busca os detalhes completos do pedido na Order API e materializa localmente em, Um ciclo de polling pra uma loja: busca eventos pendentes, materializa pedido no, Consulta agora os eventos pendentes no iFood (Events API) pra loja informada. Ch, acknowledge_events() (+11 more)

### Community 5 - "Community 5"
Cohesion: 0.17
Nodes (12): ALTURA_LINHA, ALTURA_MINIMA, DIAS_TENDENCIA, MAX_ITENS_REINCIDENTES, ACOES_DESPAUSAR, ACOES_PAUSAR, chaveDia(), GraficoItensReincidentes() (+4 more)

### Community 6 - "Community 6"
Cohesion: 0.14
Nodes (28): API, SUPABASE_ANON_KEY, SUPABASE_URL, BORDER, CARD_BG, INPUT_BG, inputCls, inputStyle (+20 more)

### Community 7 - "Community 7"
Cohesion: 0.11
Nodes (16): Briefing do sistema — pra quem for redesenhar, Dados que a tela consome (via API do backend Flask), Modais, O painel logado — layout de cima pra baixo, O que precisa continuar existindo num redesign, O que é, Papéis e permissões, Stack técnica (+8 more)

### Community 8 - "Community 8"
Cohesion: 0.14
Nodes (13): API local (`server/app.py`), Arquitetura, Auditoria e logs, Automação de Catálogo iFood — Cajupar, Deploy no Vercel, Login, papéis e convites, Manual, Opção rápida (Windows) (+5 more)

### Community 9 - "Community 9"
Cohesion: 0.14
Nodes (10): DataFrame, Path, carregar_ja_processados(), main(), Carga em massa: cria/atualiza todos os itens ATIVOS da planilha no catálogo iFoo, registrar(), Cria uma categoria de teste e alguns itens de exemplo da planilha no catálogo sa, carregar_itens() (+2 more)

### Community 10 - "Community 10"
Cohesion: 0.15
Nodes (13): Falha de login/permissão — sessão ausente/expirada (401) ou papel sem acesso (40, Valida a sessão (header Authorization: Bearer <token>, emitido pelo Supabase Aut, Converte qualquer falha (login, rede, API do iFood/Supabase, validação) numa res, Converte qualquer falha (login, rede, API do iFood/Supabase, validação) numa res, Falha de login/permissão — sessão ausente/expirada (401) ou papel sem acesso (40, Valida a sessão (header Authorization: Bearer <token>, emitido pelo Supabase Aut, Exception, ErroAutenticacao (+5 more)

### Community 11 - "Mapa de homologação — Módulos de Catálogo e Merchant iFood"
Cohesion: 0.22
Nodes (8): Limitação conhecida: opções (complementos) somem da tela após recarregar, Mapa de homologação — Módulos de Catálogo e Merchant iFood, O que ainda NÃO está na interface (`viewer/`), O que está 100% pronto e testado, O que está bloqueado, e por quê, 🔴 Promoção (duração de desconto), Tabela geral, 🔴 Tags do item (VEGAN, ORGANIC...)

### Community 12 - "Community 12"
Cohesion: 0.25
Nodes (7): oxc, warn, plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 13 - "Community 13"
Cohesion: 0.33
Nodes (4): ARESTAS_BASE, ARESTAS_SINAL, CORES, NOS

### Community 14 - "Community 14"
Cohesion: 0.40
Nodes (4): functions, server/app.py, $schema, maxDuration

### Community 17 - "Community 17"
Cohesion: 0.50
Nodes (3): Expanding the Oxlint configuration, React Compiler, React + Vite

## Knowledge Gaps
- **87 isolated node(s):** `$schema`, `maxDuration`, `$schema`, `oxc`, `react/rules-of-hooks` (+82 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `auth_headers()` connect `Community 0` to `Community 4`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `com_retry()` connect `Community 1` to `Community 9`, `Community 4`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Why does `react` connect `Community 2` to `Community 12`, `Community 5`, `Community 6`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Are the 24 inferred relationships involving `auth_headers()` (e.g. with `create_category()` and `create_combo()`) actually correct?**
  _`auth_headers()` has 24 INFERRED edges - model-reasoned connections that need verification._
- **Are the 36 inferred relationships involving `com_retry()` (e.g. with `alterar_codigo_pdv()` and `alterar_preco()`) actually correct?**
  _`com_retry()` has 36 INFERRED edges - model-reasoned connections that need verification._
- **What connects `$schema`, `maxDuration`, `$schema` to the rest of the system?**
  _87 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06151062867480778 - nodes in this community are weakly interconnected._