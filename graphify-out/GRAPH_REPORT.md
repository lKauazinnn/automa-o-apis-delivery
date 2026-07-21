# Graph Report - .  (2026-07-17)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 278 nodes · 458 edges · 36 communities (28 shown, 8 thin omitted)
- Extraction: 88% EXTRACTED · 12% INFERRED · 0% AMBIGUOUS · INFERRED: 55 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `edf7a8a6`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 20
- Community 21

## God Nodes (most connected - your core abstractions)
1. `com_retry()` - 29 edges
2. `_merchant_id()` - 28 edges
3. `registrar_auditoria()` - 28 edges
4. `auth_headers()` - 27 edges
5. `_supabase_headers()` - 13 edges
6. `_catalog_id()` - 10 edges
7. `criar_item()` - 9 edges
8. `main()` - 8 edges
9. `convidar_usuario()` - 8 edges
10. `resetar_senha_usuario()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `main()` --calls--> `list_catalogs()`  [INFERRED]
  C:/Users/Gustavo/Desktop/automação ifood/scripts/carga_massa.py → C:/Users/Gustavo/Desktop/automação ifood/src/ifood_automacao/client.py
- `main()` --calls--> `list_categories()`  [INFERRED]
  C:/Users/Gustavo/Desktop/automação ifood/scripts/carga_massa.py → C:/Users/Gustavo/Desktop/automação ifood/src/ifood_automacao/client.py
- `main()` --calls--> `com_retry()`  [INFERRED]
  C:/Users/Gustavo/Desktop/automação ifood/scripts/carga_massa.py → C:/Users/Gustavo/Desktop/automação ifood/src/ifood_automacao/rate_limit.py
- `auth_headers()` --calls--> `delete_category()`  [INFERRED]
  C:/Users/Gustavo/Desktop/automação ifood/src/ifood_automacao/auth.py → C:/Users/Gustavo/Desktop/automação ifood/src/ifood_automacao/client.py
- `auth_headers()` --calls--> `delete_interruption()`  [INFERRED]
  C:/Users/Gustavo/Desktop/automação ifood/src/ifood_automacao/auth.py → C:/Users/Gustavo/Desktop/automação ifood/src/ifood_automacao/client.py

## Import Cycles
- None detected.

## Communities (36 total, 8 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (45): auth_headers(), get_access_token(), Autenticação OAuth2 (client_credentials) com a Merchant API do iFood., Retorna um access token válido, reaproveitando o cache em memória enquanto não e, create_category(), create_combo(), create_interruption(), create_option() (+37 more)

### Community 1 - "Community 1"
Cohesion: 0.10
Nodes (55): alterar_codigo_pdv(), alterar_papel_usuario(), alterar_preco(), alterar_status(), alterar_turnos(), _catalog_id(), _categoria_id(), criar_categoria_dedicada() (+47 more)

### Community 2 - "Community 2"
Cohesion: 0.14
Nodes (17): ACAO_LABEL, App(), campoPreenchido(), CHAVE_SESSAO, contadorToast, CoresContext, encontrarRelacionados(), MENSAGEM_ERRO_LINK (+9 more)

### Community 4 - "Community 4"
Cohesion: 0.26
Nodes (13): API, buscarEu(), definirSenha(), headersSupabase(), lerConviteDaUrl(), lerErroDaUrl(), limparHashDaUrl(), login() (+5 more)

### Community 5 - "Community 5"
Cohesion: 0.12
Nodes (7): ACOES_DESPAUSAR, ACOES_PAUSAR, ALTURA_LINHA, ALTURA_MINIMA, DIAS_TENDENCIA, INTERVALO_EIXO_DIAS, MAX_ITENS_REINCIDENTES

### Community 6 - "Community 6"
Cohesion: 0.21
Nodes (13): AvisoErro(), BORDER, CARD_BG, Casca(), estiloInput(), INPUT_BG, inputCls, inputStyle (+5 more)

### Community 7 - "Community 7"
Cohesion: 0.20
Nodes (11): convidar_usuario(), _gerar_senha_aleatoria(), _marcar_senha_temporaria(), Convida alguém por e-mail (Supabase manda o link de convite). O perfil (nome + p, Define uma senha nova pra alguém direto pela Admin API do Supabase e devolve ela, Liga/desliga a flag que força troca de senha no próximo login. Chamado com True, Cria a conta do usuário direto pela Admin API do Supabase, já com senha definida, Define uma senha nova pra alguém direto pela Admin API do Supabase e devolve ela (+3 more)

### Community 8 - "Community 8"
Cohesion: 0.20
Nodes (6): ACAO_LABEL, Avatar(), CORES_AVATAR, CoresContext, iniciaisDe(), PALETAS

### Community 9 - "Community 9"
Cohesion: 0.33
Nodes (6): carregar_ja_processados(), main(), Carga em massa: cria/atualiza todos os itens ATIVOS da planilha no catálogo iFoo, registrar(), carregar_itens(), Leitura da planilha de itens/PDV.

### Community 10 - "Community 10"
Cohesion: 0.18
Nodes (10): ErroAutenticacao, Falha de login/permissão — sessão ausente/expirada (401) ou papel sem acesso (40, Valida a sessão (header Authorization: Bearer <token>, emitido pelo Supabase Aut, Converte qualquer falha (login, rede, API do iFood/Supabase, validação) numa res, Converte qualquer falha (login, rede, API do iFood/Supabase, validação) numa res, Falha de login/permissão — sessão ausente/expirada (401) ou papel sem acesso (40, Valida a sessão (header Authorization: Bearer <token>, emitido pelo Supabase Aut, tratar_erro() (+2 more)

### Community 20 - "Community 20"
Cohesion: 0.67
Nodes (3): eu(), Devolve quem é o usuário logado (id, email, nome, papel) — o front usa isso depo, Devolve quem é o usuário logado (id, email, nome, papel) — o front usa isso depo

## Knowledge Gaps
- **23 isolated node(s):** `PALETAS`, `CoresContext`, `ACAO_LABEL`, `CARD_BG`, `BORDER` (+18 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `main()` connect `Community 9` to `Community 0`, `Community 1`?**
  _High betweenness centrality (0.141) - this node is a cross-community bridge._
- **Why does `com_retry()` connect `Community 1` to `Community 9`, `Community 21`?**
  _High betweenness centrality (0.140) - this node is a cross-community bridge._
- **Are the 27 inferred relationships involving `com_retry()` (e.g. with `alterar_codigo_pdv()` and `alterar_preco()`) actually correct?**
  _`com_retry()` has 27 INFERRED edges - model-reasoned connections that need verification._
- **Are the 24 inferred relationships involving `auth_headers()` (e.g. with `create_category()` and `create_combo()`) actually correct?**
  _`auth_headers()` has 24 INFERRED edges - model-reasoned connections that need verification._
- **What connects `PALETAS`, `CoresContext`, `ACAO_LABEL` to the rest of the system?**
  _23 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.07142857142857142 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.10150375939849623 - nodes in this community are weakly interconnected._