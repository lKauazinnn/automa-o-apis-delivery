# Design system PausaFast

O painel de operação de delivery (iFood + 99Food) que cada empresa cliente usa com a própria
marca. Claro e operacional: lido em pé, no balcão e na cozinha, com tela iluminada e pressa.

Código: tokens em [`src/ui.jsx`](./src/ui.jsx) (`PALETAS`) e [`src/index.css`](./src/index.css)
(`:root`), marca em [`src/marca.js`](./src/marca.js), logo em [`src/Logo.jsx`](./src/Logo.jsx),
escala de cantos e fontes em [`tailwind.config.js`](./tailwind.config.js).

## 1. Princípios

1. **Estado antes de tudo.** O que está fora do cardápio, atrasado ou com erro aparece pela cor
   *e* pela forma (selo, ícone, contagem), nunca só pela cor.
2. **A marca é do cliente.** O produto não tem cor própria em tela: a cor de destaque é a da
   empresa que comprou. O PausaFast assina só no símbolo padrão e no rodapé "com PausaFast".
3. **Densidade com folga.** Tabelas cheias, mas alvo de toque mínimo de 44px e linha de 60px.
4. **Sem enfeite.** Cor lisa, sombra só pra elevação, uma família tipográfica.

## 2. Cor

### Neutros (frios, levemente puxados pro azul-acinzentado)

| Token (`C.`) | Claro | Escuro | Uso |
|---|---|---|---|
| `bg` | `#F4F5F7` | `#0D0F13` | Fundo da página |
| `cardBg` | `#FFFFFF` | `#15181E` | Card, sidebar, header, modal |
| `card2` | `#F7F8FA` | `#1B1F26` | Superfície elevada dentro de card, barra flutuante |
| `inputBg` | `#F1F3F5` | `#111419` | Campo, chip, linha de lista dentro de modal |
| `cardBorder` | `#DFE2E7` | `#272C35` | Borda de card e de campo |
| `rowBorder` | `#ECEEF1` | `#1E2229` | Divisória de linha de tabela |
| `text1` | `#12151B` | `#F1F3F6` | Texto principal |
| `text2` | `#4B5361` | `#A7AFBC` | Texto de apoio |
| `text3` | `#626A79` | `#858E9C` | Rótulo, legenda, placeholder |

### Status (nunca use a cor da marca pra status)

| Token | Claro | Escuro | Significa |
|---|---|---|---|
| `good` | `#1A7F4B` | `#3DC981` | Disponível, sucesso, reativar |
| `neutral` | `#A35406` | `#F0A23B` | **Pausado** (âmbar: pede atenção, é possível ruptura) |
| `bad` | `#C8322B` | `#F26A5F` | Erro, cancelado, excluir |
| `info` | `#0B7285` | `#3BB6D4` | Pedido novo, prazo de pausa, complemento |

Cada um tem `…Bg` (fundo ~9–13%) e `…Bd` (borda ~24–32%). **Todo texto e status passa de 4,5:1**
sobre `cardBg`, `bg` e `inputBg` nos dois temas — conferido com `contraste()` de `marca.js`.

### Marca (white-label, derivada em tempo de execução)

A empresa escolhe UMA cor; `tokensDaMarca(cor, tema)` deriva o resto:

| Token (`C.` / CSS) | Como é calculado | Uso |
|---|---|---|
| `marca` / `--marca` | a cor escolhida | Preenchimento: botão primário, símbolo, barra de progresso, checkbox |
| `marcaTexto` / `--marca-texto` | branco ou `#0F1115`, o de maior contraste | Rótulo sobre `marca` |
| `marcaHover` / `--marca-hover` | escurece 14% (rótulo branco) ou clareia 16% (rótulo escuro) | Hover do primário — sempre aumenta o contraste |
| `marcaTinta` / `--marca-tinta` | a cor misturada com preto (claro) ou branco (escuro) até 4,5:1 sobre o card | Texto, link e ícone na cor da marca |
| `marcaSuave` / `--marca-suave` | cor a ~10% | Fundo de item ativo/selecionado |
| `marcaBorda` / `--marca-borda` | cor a ~28% | Borda de item ativo/selecionado |
| `marcaAnel` / `--marca-anel` | cor a ~25% | Anel de foco de campo |

Padrão do produto: `#2B59C3` (rótulo branco, 6,3:1). Exemplos de derivação: `#FFD400` vira
rótulo escuro (13,2:1) e tinta `#856E00` no claro; `#0B8F3A` vira tinta `#1F984A` no escuro.
Cor com menos de 3:1 contra o branco é aceita, mas a tela de Marca avisa que vai ficar discreta.

## 3. Tipografia

- **IBM Plex Sans** 400/500/600/700 — toda a interface. Hierarquia por peso e tamanho, não por
  outra família.
- **IBM Plex Mono** 400/500/600 (`.fonte-mono`) — número que se compara: preço, código PDV, ID de
  pedido, cronômetro do KDS. `font-variant-numeric: tabular-nums` no `body`.

| Estilo | Tamanho / peso | Onde |
|---|---|---|
| Título de tela | 21px / 700, `-0.02em` | Header |
| Título de card | 15,5px / 700 | "Itens cadastrados", "Pausados agora" |
| Corpo | 14px / 400–600 | Tabela, sidebar |
| Apoio | 13–13,5px | Botão secundário, subtítulo |
| Rótulo caixa-alta | 11,5px / 700, `0.08em` | Seções da sidebar, campos de modal |
| Piso | **12px** pra texto lido; 11,5px só em rótulo caixa-alta e selo numérico |

## 4. Forma e espaço

| Tailwind | Valor | Uso |
|---|---|---|
| `rounded-md` | 5px | Selo pequeno, miniatura |
| `rounded-lg` | 7px | Botão de ícone, chip, campo de tabela |
| `rounded-xl` | 9px | Botão, campo, item de sidebar |
| `rounded-2xl` | 12px | Card, modal |
| `rounded-full` | — | Pílula de status, avatar, toggle |

Cantos mais retos que o padrão do Tailwind: cara de ferramenta, não de app de consumo.
Espaçamento em múltiplos de 4px (escala do Tailwind); padding de card 24px, de modal 20–24px.
Sombra só pra elevação (`C.sh` modal/barra flutuante, `C.shSm` item ativo de segmentado).

## 5. Componentes

| Componente | Onde | Regra |
|---|---|---|
| `.botao-primario` | `index.css` | Uma ação principal por tela |
| `.botao-perigo` | `index.css` | Destrutivo, sempre com confirmação |
| `.botao-icone-fantasma` | `index.css` | Ícone repetido em lista/tabela/header |
| `Pill` | `ui.jsx` | Status. `dot` = pílula com ponto; `marcador` = ícone no lugar do ponto (ex: relógio de prazo); sem `dot` = selo caixa-alta (tipo, ex: "Complemento") |
| `Toggle` | `ui.jsx` | Disponível/pausado na linha do cardápio |
| `StatCard` | `ui.jsx` | Número-resumo do Painel |
| `Modal` | `ui.jsx` | Painel por cima; `eyebrow` na `marcaTinta` |
| `Esqueleto` | `ui.jsx` | Carregando em lista/tabela (nunca spinner central) |
| `LogoMarca` / `SimboloPausaFast` | `Logo.jsx` | Logo do cliente ou símbolo na cor da marca |

**Símbolo PausaFast:** quadrado de cantos 8/32 na cor da marca com o sinal de pausa; a segunda
barra inclinada, de quem já volta ao movimento. Arquivo estático: `public/favicon.svg`.

## 6. White-label

- Configuração: Administração > **Marca** (só administrador) → `PUT /api/marca` → tabela `marca`
  (`sql/011_marca_white_label.sql`). Sem linha no banco: `MARCA_NOME`/`MARCA_COR` do `.env`,
  depois o padrão PausaFast.
- `GET /api/marca` é público (a tela de login já mostra a marca). O painel abre com a marca em
  cache (`localStorage`) e confirma com o servidor, pra não piscar a cor padrão.
- Logo: PNG, SVG, JPEG ou WEBP até 220 KB no navegador (300 KB no servidor), guardada como data URL.
- Rodapé das telas de acesso: "{marca} · Operação delivery com PausaFast" quando o cliente usa a
  própria marca.

## 7. Acessibilidade

Foco visível em tudo (`:focus-visible` na `marcaTinta`), alvo de toque ≥ 44px,
`prefers-reduced-motion` desliga animação, estado nunca só por cor, contraste conferido por
código (não a olho).
