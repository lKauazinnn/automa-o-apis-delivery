# Graph Report - C:\Users\Gustavo\Desktop\automação ifood  (2026-07-20)

## Corpus Check
- 49 files · ~87,568 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 284 nodes · 463 edges · 40 communities detected
- Extraction: 88% EXTRACTED · 12% INFERRED · 0% AMBIGUOUS · INFERRED: 55 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]

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
  C:\Users\Gustavo\Desktop\automação ifood\scripts\carga_massa.py → C:\Users\Gustavo\Desktop\automação ifood\src\ifood_automacao\client.py
- `main()` --calls--> `list_categories()`  [INFERRED]
  C:\Users\Gustavo\Desktop\automação ifood\scripts\carga_massa.py → C:\Users\Gustavo\Desktop\automação ifood\src\ifood_automacao\client.py
- `main()` --calls--> `com_retry()`  [INFERRED]
  C:\Users\Gustavo\Desktop\automação ifood\scripts\carga_massa.py → C:\Users\Gustavo\Desktop\automação ifood\src\ifood_automacao\rate_limit.py
- `_catalog_id()` --calls--> `com_retry()`  [INFERRED]
  C:\Users\Gustavo\Desktop\automação ifood\server\app.py → C:\Users\Gustavo\Desktop\automação ifood\src\ifood_automacao\rate_limit.py
- `_categoria_id()` --calls--> `com_retry()`  [INFERRED]
  C:\Users\Gustavo\Desktop\automação ifood\server\app.py → C:\Users\Gustavo\Desktop\automação ifood\src\ifood_automacao\rate_limit.py

## Communities

### Community 0 - "Community 0"
_Handles OAuth2 authentication and CRUD operations for categories, combos, options, and interruptions in the iFood merchant catalog._
Cohesion: 0.07
Nodes (45): auth_headers(), get_access_token(), Autenticação OAuth2 (client_credentials) com a Merchant API do iFood., Retorna um access token válido, reaproveitando o cache em memória enquanto não e, create_category(), create_combo(), create_interruption(), create_option() (+37 more)

### Community 1 - "Community 1"

Cohesion: 0.16
Nodes (26): alterar_codigo_pdv(), alterar_preco(), alterar_status(), alterar_turnos(), criar_grupo_opcao(), criar_interrupcao(), criar_opcao(), definir_horario_funcionamento() (+18 more)

### Community 2 - "Community 2"

Cohesion: 0.14
Nodes (17): ACAO_LABEL, App(), campoPreenchido(), CHAVE_SESSAO, contadorToast, CoresContext, encontrarRelacionados(), MENSAGEM_ERRO_LINK (+9 more)

### Community 3 - "Community 3"

Cohesion: 0.18
Nodes (15): alterar_papel_usuario(), criar_loja(), get_auditoria(), get_lojas(), listar_usuarios(), API local que serve de ponte entre a interface React e a Merchant/Catalog API do, Valida a sessão (header Authorization: Bearer <token>, emitido pelo Supabase Aut, Lojas cadastradas em `public.lojas` no Supabase (não é mais list_merchants() do (+7 more)

### Community 4 - "Community 4"
_Manages user authentication, session handling, password setup, login/logout, URL-based invite handling, and error processing via Supabase._
Cohesion: 0.26
Nodes (13): API, buscarEu(), definirSenha(), headersSupabase(), lerConviteDaUrl(), lerErroDaUrl(), limparHashDaUrl(), login() (+5 more)

### Community 5 - "Community 5"

Cohesion: 0.12
Nodes (7): ACOES_DESPAUSAR, ACOES_PAUSAR, ALTURA_LINHA, ALTURA_MINIMA, DIAS_TENDENCIA, INTERVALO_EIXO_DIAS, MAX_ITENS_REINCIDENTES

### Community 6 - "Community 6"

Cohesion: 0.21
Nodes (13): AvisoErro(), BORDER, CARD_BG, Casca(), estiloInput(), INPUT_BG, inputCls, inputStyle (+5 more)

### Community 7 - "Community 7"

Cohesion: 0.16
Nodes (10): ErroAutenticacao, eu(), Falha de login/permissão — sessão ausente/expirada (401) ou papel sem acesso (40, Converte qualquer falha (login, rede, API do iFood/Supabase, validação) numa res, Converte qualquer falha (login, rede, API do iFood/Supabase, validação) numa res, Devolve quem é o usuário logado (id, email, nome, papel) — o front usa isso depo, Devolve quem é o usuário logado (id, email, nome, papel) — o front usa isso depo, Falha de login/permissão — sessão ausente/expirada (401) ou papel sem acesso (40 (+2 more)

### Community 8 - "Community 8"

Cohesion: 0.2
Nodes (11): convidar_usuario(), _gerar_senha_aleatoria(), _marcar_senha_temporaria(), Convida alguém por e-mail (Supabase manda o link de convite). O perfil (nome + p, Define uma senha nova pra alguém direto pela Admin API do Supabase e devolve ela, Liga/desliga a flag que força troca de senha no próximo login. Chamado com True, Cria a conta do usuário direto pela Admin API do Supabase, já com senha definida, Define uma senha nova pra alguém direto pela Admin API do Supabase e devolve ela (+3 more)

### Community 9 - "Community 9"

Cohesion: 0.2
Nodes (6): ACAO_LABEL, Avatar(), CORES_AVATAR, CoresContext, iniciaisDe(), PALETAS

### Community 10 - "Community 10"

Cohesion: 0.33
Nodes (6): carregar_ja_processados(), main(), Carga em massa: cria/atualiza todos os itens ATIVOS da planilha no catálogo iFoo, registrar(), carregar_itens(), Leitura da planilha de itens/PDV.

### Community 11 - "Community 11"

Cohesion: 0.36
Nodes (8): _catalog_id(), criar_categoria_dedicada(), editar_categoria(), get_catalogo(), get_categoria(), get_categorias(), Edita nome/status/sequência de uma categoria (ex: pausar a categoria inteira,, requer_login()

### Community 12 - "Community 12"

Cohesion: 0.33
Nodes (6): _categoria_id(), criar_combo(), criar_item(), Cria um item novo. Só administrador/gerente pode — e agora isso é checado de ver, Cria um item novo. Só administrador/gerente pode — e agora isso é checado de ver, Cria um item do tipo COMBO_V2 compondo grupos de opção que já existem no catálog

### Community 13 - "Community 13"

Cohesion: 0.33
Nodes (4): ARESTAS_BASE, ARESTAS_SINAL, CORES, NOS

### Community 14 - "Community 14"

Cohesion: 0.4
Nodes (1): ErroFatal

### Community 15 - "Community 15"

Cohesion: 0.4
Nodes (1): DIAS

### Community 16 - "Community 16"

Cohesion: 0.5
Nodes (1): VIEWS

### Community 17 - "Community 17"

Cohesion: 0.67
Nodes (1): Lista as lojas (merchants) vinculadas às credenciais do .env.

### Community 18 - "Community 18"

Cohesion: 0.67
Nodes (1): Puxa o catálogo atual (categorias + itens) direto da API do iFood e exporta pra

### Community 19 - "Community 19"

Cohesion: 0.67
Nodes (1): Cria uma categoria de teste e alguns itens de exemplo da planilha no catálogo sa

### Community 20 - "Community 20"

Cohesion: 0.67
Nodes (1): Lista catálogos e categorias da loja configurada no .env, para inspeção manual.

### Community 21 - "Community 21"

Cohesion: 0.67
Nodes (3): pausar_em_massa(), Pausa ou despausa vários itens de uma vez, item por item (a API do iFood não tem, Pausa ou despausa vários itens de uma vez, item por item (a API do iFood não tem

### Community 22 - "Community 22"
_Unable to determine domain due to missing code entities._
Cohesion: 0.67
Nodes (1): Wrapper simples de retry/backoff para chamadas HTTP sujeitas a rate limit (429)

### Community 23 - "Community 23"
_Unable to determine domain due to missing code entities._
Cohesion: 0.67
Nodes (0): 

### Community 24 - "Community 24"
_Unable to determine domain due to missing code entities._
Cohesion: 0.67
Nodes (0): 

### Community 25 - "Community 25"
_Unable to determine domain due to missing code entities._
Cohesion: 1.0
Nodes (0): 

### Community 26 - "Community 26"
_Unable to determine domain due to missing code entities._
Cohesion: 1.0
Nodes (0): 

### Community 27 - "Community 27"
_Unable to determine domain due to missing code entities._
Cohesion: 1.0
Nodes (0): 

### Community 28 - "Community 28"
_Unable to determine domain due to missing code entities._
Cohesion: 1.0
Nodes (0): 

### Community 29 - "Community 29"
_Unable to determine domain due to missing code entities._
Cohesion: 1.0
Nodes (0): 

### Community 30 - "Community 30"
_Unable to determine domain due to missing code entities._
Cohesion: 1.0
Nodes (0): 

### Community 31 - "Community 31"
_Unable to determine domain due to missing code entities._
Cohesion: 1.0
Nodes (0): 

### Community 32 - "Community 32"
_Unable to determine domain due to missing code entities._
Cohesion: 1.0
Nodes (0): 

### Community 33 - "Community 33"
_Unable to determine domain due to missing code entities._
Cohesion: 1.0
Nodes (0): 

### Community 34 - "Community 34"
_Unable to determine domain due to missing code entities._
Cohesion: 1.0
Nodes (0): 

### Community 35 - "Community 35"
_Unable to determine domain due to missing code entities._
Cohesion: 1.0
Nodes (0): 

### Community 36 - "Community 36"
_Unable to determine domain due to missing code entities._
Cohesion: 1.0
Nodes (0): 

### Community 37 - "Community 37"
_Unable to determine domain due to missing code entities._
Cohesion: 1.0
Nodes (0): 

### Community 38 - "Community 38"
_Unable to determine domain due to missing code entities._
Cohesion: 1.0
Nodes (0): 

### Community 39 - "Community 39"
_Unable to determine domain due to missing code entities._
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **73 isolated node(s):** `Falha de login/permissão — sessão ausente/expirada (401) ou papel sem acesso (40`, `Valida a sessão (header Authorization: Bearer <token>, emitido pelo Supabase Aut`, `Loja alvo da requisição: vem de ?loja=<id> na query string, ou a padrão do .env.`, `Grava uma linha na tabela `auditoria` do Supabase para toda ação que altera o ca`, `Converte qualquer falha (login, rede, API do iFood/Supabase, validação) numa res` (+68 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 25`** (2 nodes): `CategoriasModal.jsx`, `CategoriasModal()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 26`** (2 nodes): `ComboModal.jsx`, `ComboModal()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 27`** (2 nodes): `InterrupcoesModal.jsx`, `InterrupcoesModal()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 28`** (2 nodes): `AuditoriaView()`, `AuditoriaView.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 29`** (2 nodes): `DashboardView.jsx`, `DashboardView()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 30`** (1 nodes): `__init__.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 31`** (1 nodes): `postcss.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 32`** (1 nodes): `tailwind.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (1 nodes): `vite.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 34`** (1 nodes): `main.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 35`** (1 nodes): `__init__.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 36`** (1 nodes): `postcss.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 37`** (1 nodes): `tailwind.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 38`** (1 nodes): `vite.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 39`** (1 nodes): `main.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.