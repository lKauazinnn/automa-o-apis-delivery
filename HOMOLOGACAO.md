# Mapa de homologação — Módulos de Catálogo e Merchant iFood

Status de cada capacidade da API do iFood relevante pra homologação, e onde ela está
implementada neste projeto. Atualizado em 2026-07-21.

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
| Upload de imagem (item ou complemento) | `POST /api/imagens` | `upload_image` | `POST catalog/v2.0/.../image/upload` | 🟢 |
| Anexar foto ao criar/editar item | `POST /api/itens` (imagem_path) / `PATCH /api/itens/<id>` | `upsert_item(image_path=...)` | campo `imagePath` dentro de `products[]` no `PUT .../items` | 🟢 |
| Anexar foto ao criar opção (complemento) | `POST /api/grupos-opcao/<id>/opcoes` (imagem_path) | `create_option(image_path=...)` | campo `imagePath` dentro de `product` no `POST .../options` | 🟢 |
| Editar nome/preço/PDV/foto de item existente | `PATCH /api/itens/<id>` | `upsert_item` (reenvio completo) | `PUT .../items` | 🟢 |
| Pausar/despausar opção (complemento) sem excluir | `PATCH /api/grupos-opcao/<id>/opcoes/<opId>/status` | `update_option_status` | `PATCH catalog/v2.0/.../options/status` | 🟢 |
| Editar nome/foto de opção (complemento) existente | `PATCH /api/grupos-opcao/opcoes/<productId>` | `edit_option` | `PATCH catalog/v2.0/.../products/{productId}` | 🟢 |
| Editar preço de opção (complemento) existente | `PATCH /api/grupos-opcao/opcoes/<productId>` | `update_option_price` | `PATCH catalog/v2.0/.../products/price` (lote, `resources:["OPTION"]`) | 🟢 |
| Detalhes completos da loja | `GET /api/loja/detalhes` | `get_merchant_details` | `GET merchant/v1.0/merchants/{id}` | 🟢 |
| Disponibilidade da loja (por operação/canal) | `GET /api/loja/disponibilidade` | `get_merchant_status` | `GET merchant/v1.0/merchants/{id}/status` | 🟢 |
| **Promoção (desconto com data de início/fim)** | — | — | `POST promotion/v1.0/.../promotions` | 🔴 |
| Tags do item (VEGAN, ORGANIC...) | — | — | dentro do `products[]` no `PUT .../items` | 🔴 |

## O que está 100% pronto e testado

Tudo com 🟢 foi exercitado contra o catálogo sandbox de verdade (merchant "Teste - Caju
Integração", `a1136885-...`): criei categoria/item/grupo/opção/combo/interrupção de
teste, confirmei que a API aceitou, e apaguei tudo depois — não sobrou nada de teste no
catálogo real.

**Sessão de 2026-07-21** confirmou ao vivo, e com respostas reais documentadas (não só
doc pública, testado de fato):
- `image/upload` devolve `{"imagePath": "<merchantId>/<arquivo>.png"}` (path relativo —
  vira URL completa `https://static-images.ifood.com.br/pratos/...` só depois de anexado
  a um item/opção via `imagePath` no `PUT .../items` ou `POST .../options`).
- Item criado com `imagePath` e depois lido de volta (`GET .../categories/{id}`) mostra o
  campo `imagePath` já resolvido pra URL completa — usado pra pré-visualizar a foto atual
  ao editar um item sem trocar a imagem.
- `PATCH .../options/status` aceita só `{optionId, status}` (sem precisar de
  `parentCustomizationOptionId` pra opção de primeiro nível) — pausou e despausou sem
  erro.
- `GET merchants/{id}` e `GET merchants/{id}/status` responderam com o schema completo
  documentado na doc pública (endereço, operações/canais, `available`/`message`/
  `validations` por canal).

Destaque: **grupo de opção e opção do zero** (`create_option_group`/`create_option`)
não aparecem na lista de endpoints da doc de referência oficial que foi consultada
(só tinha GET/PATCH/DELETE listados pra Option Group) — mas **existem e funcionam**
na API v2 de verdade. Descobri isso testando ao vivo, não por doc.

**Sessão de 2026-07-21 (2)** — pra fechar o Cenário 3 do checklist de homologação
(editar nome/foto/preço de um complemento já existente), não existe PUT/PATCH direto em
`.../optionGroups/{id}/options/{optionId}` (devolve 404 — testado). Descobri por tentativa
contra o sandbox (criei grupo/opção de teste, testei 4 variações de endpoint, apaguei tudo
depois) que o caminho certo é:
- **Nome/foto**: `PATCH catalog/v2.0/merchants/{id}/products/{productId}` com
  `{name, description, imagePath}` — `imagePath` é obrigatório mesmo sem trocar a foto
  (sem ele o iFood recusa com "Product image cannot be null"), então reenviamos o path
  atual da opção quando o usuário não troca a imagem.
- **Preço**: `PATCH catalog/v2.0/merchants/{id}/products/price`, endpoint em lote (aceita
  array), com `resources: ["OPTION"]` e `productId` (não precisa de `externalCode`, que na
  prática costuma vir vazio pelo form do complemento). Resposta é `202` com `batchId` —
  processamento assíncrono, não é garantido estar refletido no instante seguinte.

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

### 🔴 Tags do item (VEGAN, ORGANIC...)
Não tentei ainda — campo simples mas não confirmei o nome exato/localização no payload.
(Upload de imagem saiu da lista de bloqueados — ver seção 2026-07-21 acima.)

## O que ainda NÃO está na interface (`viewer/`)

Atualizado 2026-07-21 — a maior parte já tem tela: categoria (`CategoriasModal`), combo
(`ComboModal`), grupos de opção/opções com foto e pausa (`GruposOpcaoModal`), horário de
funcionamento (`HorarioFuncionamentoModal`), interrupções (`InterrupcoesModal`), e
detalhes/disponibilidade da loja (dentro de "Gerenciar lojas").

Ainda faltam tela pra:
- **Editar categoria** (a rota `PATCH /api/categorias/<id>` existe, mas não tem botão de
  editar nome/status no `CategoriasModal`, só criar/excluir).
- **Turnos por item** fora do modal de edição do item (já dá pra definir turno ao editar
  um item, mas não tem visão em lista de "quais itens têm turno restrito").
- Promoção e tags do item — bloqueados no backend também (ver seção acima), então nem
  faz sentido ter tela ainda.

### Limitação conhecida: opções (complementos) somem da tela após recarregar
O iFood não devolve as opções já cadastradas dentro de um grupo (`GET
/optionGroups` sempre volta sem a lista de opções) — o `GruposOpcaoModal` só mostra as
que você criar durante a sessão atual do navegador. Um refresh de página faz elas
sumirem da tela (embora continuem existindo de verdade no catálogo do iFood). Isso
afeta a gravação do vídeo de homologação: não dê refresh no meio da gravação do
Cenário 2/3 do Catalog, ou a opção que você quer pausar/editar não vai aparecer na
lista pra clicar.
