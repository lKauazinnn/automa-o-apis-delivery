# Mapa de homologação — Módulo de Catálogo iFood

Status de cada capacidade da API do iFood relevante pra homologação do módulo de
Catálogo, e onde ela está implementada neste projeto. Atualizado em 2026-07-15.

Legenda de confiança:
- 🟢 **Confirmado ao vivo** — testado de verdade contra o sandbox (`IFOOD_CLIENT_ID`/
  `IFOOD_MERCHANT_ID` do `.env`), request e response reais conferidos.
- 🟡 **Implementado, não testado ao vivo** — schema veio de doc oficial, mas não rodei
  contra o sandbox ainda.
- 🔴 **Bloqueado** — falta informação (schema não confirmado, ou bug do próprio iFood).

## Tabela geral

| Capacidade | Rota da API local | Função em `client.py` | Endpoint real do iFood | Confiança |
|---|---|---|---|---|
| Listar lojas | — (usa Supabase) | `list_merchants` | `GET merchant/v1.0/merchants` | 🟢 |
| Listar catálogos | `GET /api/catalogo` | `list_catalogs` | `GET catalog/v2.0/.../catalogs` | 🟢 |
| Listar categorias | `GET /api/catalogo` | `list_categories` | `GET .../categories` | 🟢 |
| Ler 1 categoria | `GET /api/categorias/<id>` | `get_category` | `GET .../categories/{id}` | 🟢 |
| Criar categoria | interno (`_categoria_id`) | `create_category` | `POST .../categories` | 🟢 |
| Editar categoria | `PATCH /api/categorias/<id>` | `edit_category` | `PATCH .../categories/{id}` | 🟢 |
| Excluir categoria | `DELETE /api/categorias/<id>` | `delete_category` | `DELETE .../categories/{id}` | 🟢 |
| Criar item | `POST /api/itens` | `upsert_item` | `PUT .../items` | 🟢 |
| Pausar/despausar item | `PATCH /api/itens/<id>/status` | `update_item_status` | `PATCH .../items/status` (deprecado, funciona) | 🟢 |
| Alterar preço | `PATCH /api/itens/<id>/preco` | `update_item_price` | `PATCH .../items/price` (deprecado, funciona) | 🟢 |
| Alterar código PDV | `PATCH /api/itens/<id>/codigo-pdv` | `patch_item_external_code` | `PATCH .../items/externalCode` (deprecado, funciona) | 🟢 |
| Excluir item | `DELETE /api/itens/<id>` | `delete_item` | `DELETE .../categories/{c}/products/{p}` | 🟢 |
| Definir turnos do item | `PATCH /api/itens/<id>/turnos` | `update_item_shifts` | `PATCH .../items/{id}` (JSON Merge Patch) | 🟢 |
| Anexar grupo de opção a item comum | via `upsert_item(grupos_opcao=...)` | `upsert_item` | `PUT .../items` | 🟢 |
| Criar combo (COMBO_V2) | `POST /api/itens/combo` | `create_combo` | `PUT .../items` (type=COMBO_V2) | 🟢 |
| Listar grupos de opção | `GET /api/grupos-opcao` | `list_option_groups` | `GET .../optionGroups` | 🟢 |
| Criar grupo de opção | `POST /api/grupos-opcao` | `create_option_group` | `POST .../optionGroups` | 🟢 |
| Excluir grupo de opção | `DELETE /api/grupos-opcao/<id>` | `delete_option_group` | `DELETE .../optionGroups/{id}` | 🟢 |
| Criar opção | `POST /api/grupos-opcao/<id>/opcoes` | `create_option` | `POST .../optionGroups/{id}/options` | 🟢 |
| Excluir opção | `DELETE /api/grupos-opcao/<id>/opcoes/<pid>` | `delete_option` | `DELETE .../optionGroups/{id}/products/{pid}/option` | 🟢 |
| Ler horário de funcionamento | `GET /api/horario-funcionamento` | `get_opening_hours` | `GET merchant/v1.0/.../opening-hours` | 🟢 |
| Definir horário de funcionamento | `PUT /api/horario-funcionamento` | `set_opening_hours` | `PUT .../opening-hours` | 🟢 |
| Listar interrupções | `GET /api/interrupcoes` | `list_interruptions` | `GET .../interruptions` | 🟢 |
| Criar interrupção | `POST /api/interrupcoes` | `create_interruption` | `POST .../interruptions` | 🟢 |
| Excluir interrupção | `DELETE /api/interrupcoes/<id>` | `delete_interruption` | `DELETE .../interruptions/{id}` | 🟢 |
| **Promoção (desconto com data de início/fim)** | — | — | `POST promotion/v1.0/.../promotions` | 🔴 |
| Upload de imagem de item | — | — | `POST catalog/v2.0/.../image/upload` | 🔴 |
| Tags do item (VEGAN, ORGANIC...) | — | — | dentro do `products[]` no `PUT .../items` | 🔴 |

## O que está 100% pronto e testado

Tudo com 🟢 foi exercitado contra o catálogo sandbox de verdade (merchant "Teste - Caju
Integração", `a1136885-...`) nesta sessão: criei categoria/item/grupo/opção/combo/
interrupção de teste, confirmei que a API aceitou, e apaguei tudo depois — não sobrou
nada de teste no catálogo real.

Destaque: **grupo de opção e opção do zero** (`create_option_group`/`create_option`)
não aparecem na lista de endpoints da doc de referência oficial que foi consultada
(só tinha GET/PATCH/DELETE listados pra Option Group) — mas **existem e funcionam**
na API v2 de verdade. Descobri isso testando ao vivo, não por doc.

## O que está bloqueado, e por quê

### 🔴 Promoção (duração de desconto)
Achei a rota certa por tentativa (`promotion/v1.0/merchants/{id}/promotions`, POST) —
ela existe (não dá 404). Mas toda tentativa de corpo que mandei (vazio ou com item
real) devolve um **erro 500 do lado do iFood**:
```
java.lang.NoSuchMethodError: 'void com.fasterxml.jackson.databind.exc.InvalidNullException...'
```
Isso é um bug/incompatibilidade de versão da lib Jackson deles, não uma validação —
não dá pra descobrir o schema certo só tentando payloads diferentes, porque qualquer
formato quebra do mesmo jeito. Preciso do **Request body oficial** da página de
Promotion (`developer.ifood.com.br/.../guides/promotion/`), ou reportar esse erro
pro suporte técnico do iFood.

### 🔴 Upload de imagem e tags do item
Não tentei ainda — endpoint de imagem provavelmente é multipart/base64 (não sei qual),
e tags é campo simples mas não confirmei o nome exato/localização no payload.

## O que ainda NÃO está na interface (`viewer/`)

Nada disso foi ligado em tela ainda — é tudo só backend (`client.py` + rotas Flask)
até agora. Categoria (editar/excluir), turnos por item, combo, grupos de
opção/opções, horário de funcionamento e interrupções não têm botão/modal no React.
