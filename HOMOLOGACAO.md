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

## Módulo de Pedidos (Order + Events) — atualizado 2026-10-09

| Capacidade | Onde | Endpoint real do iFood | Confiança |
|---|---|---|---|
| Polling a cada 30s, 24h, várias lojas numa chamada | `worker/monitor.py` → `_processar_eventos` | `GET events/v1.0/events:polling` (`x-polling-merchants` com várias lojas) | 🟢 |
| Ack de TODOS os eventos recebidos (inclusive os que falharam ao processar) | `_processar_eventos` | `POST events/v1.0/events/acknowledgment` | 🟢 |
| Evento duplicado no mesmo lote processado uma vez só; pedido não duplica | `_processar_eventos` / `_criar_pedido_local` | — | 🟢 |
| Confirmar pedido | `POST /api/pedidos/<id>/status` (CONFIRMADO) | `POST order/v1.0/orders/{id}/confirm` | 🟡 |
| Despachar (entrega) / Pronto pra retirada (TAKEOUT/mesa) | idem (DESPACHADO, decide pelo tipo) | `.../dispatch` ou `.../readyToPickup` | 🟡 |
| Motivos de cancelamento válidos do pedido | `GET /api/pedidos/<id>/motivos-cancelamento` | `GET order/v1.0/orders/{id}/cancellationReasons` (rota confirmada: 403 com id falso) | 🟡 |
| Cancelar com motivo escolhido pelo operador | `POST /api/pedidos/<id>/status` (CANCELADO + `motivo_codigo`) | `POST .../requestCancellation` | 🟡 |
| Negociação (cliente pede cancelamento/reembolso) | evento `HANDSHAKE_DISPUTE` → alerta no KDS; `POST /api/pedidos/<id>/disputa/aceitar` e `/recusar` | `POST order/v1.0/disputes/{id}/accept` e `/reject` (rotas confirmadas ao vivo; reject exige `reason`) | 🟡 |
| Exibir: agendado, troco, cobrar na entrega, cupons, código de coleta, localizador, documento, obs. de entrega | `DetalhesPedidoModal.jsx` (`resumoIfood`) | campos do `GET orders/{id}` (conferidos num pedido real do sandbox) | 🟢 |
| Webhook com validação de assinatura | `POST /webhook/ifood` | HMAC-SHA256 do corpo cru com o clientSecret, header `X-IFood-Signature` | 🟡 |

🟡 aqui = rota existe e foi confirmada no sandbox, mas o fluxo completo ainda não foi
exercitado com um pedido de teste VIVO (o pedido de teste do Portal expira em poucas horas).
**Antes da homologação:** suba o monitor, gere pedidos de teste no Developer Portal e passe
por: confirmar → despachar (entrega) / pronto (retirada) → cancelar com motivo → negociação.

### Por que o monitor (worker) é obrigatório
`GET merchants/{id}/status` do sandbox hoje responde **"Loja fechada — Gestor de Pedidos ou
PDV desconectado"** (`is-connected = ERROR`), mesmo dentro do horário. O iFood considera a loja
conectada só enquanto alguém faz polling a cada 30s. Na Vercel (serverless) isso só acontecia
com a tela aberta. `worker/monitor.py` resolve: rode com `iniciar_monitor.bat` (PC sempre
ligado) ou `Dockerfile.monitor` (VPS/Railway/Fly). Com ele ativo, a rota `/api/pedidos/buscar`
para de fazer polling próprio (evita processar o mesmo evento duas vezes).

## Status da loja (aberta/fechada)

| Capacidade | Onde | Confiança |
|---|---|---|
| Estado de todas as lojas (iFood + 99) com motivo e validações | `GET /api/lojas/status` + tela "Status das lojas" | 🟢 iFood / 🟡 99 (`shop/detail`, não testado ao vivo) |
| Histórico de cada abertura/fechamento | `status_lojas_historico` (gravado pelo monitor) | 🟢 |
| Fechar agora por X minutos / reabrir (iFood) | tela → `/api/interrupcoes` | 🟢 |

## Financeiro

| Capacidade | Onde | Endpoint | Confiança |
|---|---|---|---|
| Faturamento por dia/plataforma/loja/pagamento/tipo (pedidos do painel) | `GET /api/financeiro/resumo` | Supabase `pedidos` | 🟢 |
| Vendas oficiais do iFood (bruto, entrega, cupons, saldo) | `GET /api/financeiro/ifood` | `GET financial/v3.0/merchants/{id}/sales` (janela máx. 8 dias — o cliente quebra sozinho) | 🟢 (3 vendas reais do sandbox) |
| Repasses | idem | `GET financial/v3.0/.../settlements` | 🟡 (sandbox sem repasse — campos de cada linha ainda não vistos) |
| Eventos financeiros (comissão, taxas, ajustes) | idem | `GET financial/v3.0/.../financial-events` (janela máx. 33 dias) | 🟡 (sandbox vazio) |
| Financeiro 99Food | — | a API aberta do 99 não tem endpoint financeiro | 🔴 |

## O que ainda NÃO está na interface (`viewer/`)

- **Turnos por item** fora do modal de edição do item (já dá pra definir turno ao editar
  um item, mas não tem visão em lista de "quais itens têm turno restrito").
- Promoção e tags do item — bloqueados no backend também (ver seção acima).

(Editar categoria já existe no `CategoriasModal` — renomear e pausar/reativar.)

### Complementos agora persistem após recarregar
O iFood continua devolvendo `options: []` vazio ao listar grupos. Desde 2026-10-09 o backend
grava cada complemento criado pelo painel em `public.complementos` (migration 009) e mescla
na listagem — então não somem mais no refresh. Complementos criados direto no Portal do
Parceiro continuam sem aparecer (a API não devolve).

### Endpoints deprecados ainda em uso
`PATCH .../items/status`, `.../items/price` e `.../items/externalCode` estão marcados como
deprecados pelo iFood (ainda funcionam). Trocar exige testar o substituto contra o sandbox
alterando item real — pendente. Se o avaliador apontar, é a próxima troca a fazer.
