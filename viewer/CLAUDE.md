# Design deste painel (PausaFast)

Convenções visuais do `viewer/`. Objetivo: **claro, operacional, sério** — nada de
cara de "template baratinho" (gradiente em todo botão, glow colorido, fonte
serifada só pra "enfeitar"). A especificação completa (tokens, escala, componentes)
está em [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md). Antes de mexer na UI, siga isto.

## White-label: a cor de destaque NÃO é sua

O PausaFast é vendido para várias empresas, e cada uma configura nome, logo e cor
(Administração > Marca, `GET/PUT /api/marca`). Por isso:

- **Nunca escreva a cor de destaque como literal** (`'#2B59C3'`, nem a antiga
  `#F56C35`). No JSX use `C.marca` (preenchimento), `C.marcaTinta` (texto/ícone na cor
  da marca), `C.marcaTexto` (rótulo sobre o preenchimento), `C.marcaSuave`/`C.marcaBorda`
  (item ativo/selecionado), `C.marcaAnel` (foco). No CSS, `var(--marca)` e família.
- Esses tokens são **derivados** por `tokensDaMarca()` em `marca.js`: o rótulo é branco
  ou quase-preto (o que der mais contraste) e a tinta é ajustada por tema até 4,5:1.
  Qualquer cor que o cliente escolher continua legível — não contorne isso.
- Nome e logo vêm de `MarcaContext` / `<LogoMarca />` (`Logo.jsx`). Não escreva o nome
  da empresa nem do produto em tela; o rodapé "com PausaFast" é o único lugar do nome
  do produto quando o cliente usa a própria marca.

## Regras principais

- **Sem gradiente em elemento interativo.** Botão, badge, ícone de ação — tudo cor
  lisa. Gradiente só existe num lugar decorativo: nenhum. A barra de progresso de
  ação em massa também é cor lisa hoje. Não reintroduza.
- **Sem `box-shadow` colorido/glow.** Sombra é só pra elevação (modal, barra
  flutuante), nunca um brilho colorido atrás de botão.
- **Uma família tipográfica só: IBM Plex Sans** (+ IBM Plex Mono via `.fonte-mono` pra preço,
  ID de pedido, código PDV e cronômetro). Não reintroduza uma serifada pra títulos
  — hierarquia é peso/tamanho, não fonte diferente.
- **Piso tipográfico: 12px** pra texto lido; 11,5px só em rótulo caixa-alta com
  `letter-spacing` e em selo numérico. A escala antiga descia a 9,5px e era ilegível.
- **Rótulo sobre preenchimento é calculado, não escolhido**: `--marca-texto` e
  `--perigo-texto`. O hover anda na direção que aumenta o contraste com o rótulo
  (`--marca-hover`). Não fixe `color: '#fff'` em botão.
- **Tema claro é o padrão** (tela de balcão e cozinha iluminada); o escuro é a
  alternativa. Fundo liso, sem vinheta: `--fundo` em `index.css`.

## Classes reutilizáveis (`index.css`)

| Classe | Uso |
|---|---|
| `.botao-primario` | Ação principal (Salvar, Criar, Entrar). Cor da marca lisa (`--marca`) com rótulo calculado (`--marca-texto`); hover `--marca-hover`. |
| `.botao-perigo` | Ação destrutiva (Remover). `--perigo` liso com `--perigo-texto` (branco no claro, escuro no escuro). |
| `.botao-icone-fantasma` | Botão de ícone em listas/tabelas e no header (editar, pausar, tema, sair). Sem fundo em repouso — só aparece um wash neutro no hover. Usado **sempre** que o botão se repete muitas vezes na tela (ex: uma linha de tabela) pra não virar ruído colorido repetido. |
| `.esqueleto` | Placeholder de carregamento (ver "Estados obrigatórios" abaixo). |
| `.fonte-mono` | IBM Plex Mono, pra número que se compara: preço, código PDV, ID de pedido, cronômetro. |

Ao criar um botão novo: se for ação principal → `.botao-primario`; destrutiva →
`.botao-perigo`; ícone que se repete numa lista/tabela/header → `.botao-icone-fantasma`.
Não escreva `background: 'linear-gradient(...)'` inline de novo — é exatamente o
padrão que foi removido.

## Cores de status (já usadas em `PALETAS` no `ui.jsx`)

`C.good` (disponível/sucesso), `C.neutral` (pausado — âmbar), `C.bad` (erro), `C.info`
(pedido novo/despachado, prazo de pausa) — não invente uma cor nova pra dizer a mesma
coisa, e não use a cor da marca pra status (ela muda de cliente pra cliente). Essas
mesmas cores alimentam os gráficos em `Graficos.jsx`, então trocar uma aqui
desalinha os dois.

## Acessibilidade (não regrida)

- **Foco de teclado visível em tudo** — o `:focus-visible` global no `index.css`
  cobre botão, link, `[role=button]`, `[role=switch]` e checkbox, não só os campos.
  Antes só `input/select/textarea` tinham indicador e a navegação por Tab era
  invisível.
- **Todo texto e status passa de 4,5:1** sobre card, fundo e campo nos dois temas
  (`text3` é `#626A79` no claro / `#858E9C` no escuro). Ao mexer em `PALETAS`, confira
  com `contraste()` de `marca.js` antes — não "clareie um pouquinho" a olho.
- **Alvo de toque nunca abaixo de 44px**; linha de tabela 60px.
- `prefers-reduced-motion` desliga as animações — não adicione animação que ignore
  isso.

## Estados obrigatórios em lista/tabela

- **Carregando** usa `Esqueleto` (de `ui.jsx`), não spinner central — com refresh
  automático a cada 10–15s no KDS e em Pedidos, o spinner faz a tela inteira piscar
  a cada ciclo.
- **Erro** sempre com botão de tentar de novo, nunca só um parágrafo vermelho.
- **Vazio** diferencia "não tem nada" de "o filtro não achou"; o segundo diz quantos
  itens existem fora do filtro e oferece limpar.

## Navegação

A sidebar separa o que **troca de view** (Painel, Pedidos, Cozinha, Cardápio,
Histórico) do que **abre painel por cima** (Rupturas, Pausar por insumo, Categorias,
Complementos, Horário, Interrupções, Usuários, Lojas, Marca — estes levam `↗`). Não misture os dois no mesmo
grupo visual: antes os onze itens eram idênticos e não dava pra saber o que era
navegação sem clicar.

O seletor de loja é **contexto global** e mora no topo da sidebar, não no header.

## Gráficos

Antes de adicionar/alterar qualquer gráfico, invoque a skill `dataviz` — ela já
está calibrada pro método usado neste projeto (forma do gráfico primeiro, cor por
último, validador de paleta). Ver `Graficos.jsx` pros exemplos já aplicados
(tendência de pausas/despausas, itens com pausas recorrentes).

## Antes de considerar terminado

Rode `npm run lint`, `npm run build`, suba o dev server e **tire um screenshot de
verdade** (dark e light) — não assuma que ficou bom só pela leitura do JSX. Erros de
layout, contraste e sobreposição só aparecem olhando renderizado.

Screenshot headless funciona nesta máquina:

```bash
npm run dev -- --port 5199 &
"/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu \
  --window-size=1440,900 --virtual-time-budget=6000 \
  --screenshot='C:\caminho\absoluto\windows\tela.png' http://localhost:5199/
```

O caminho do `--screenshot` precisa ser Windows absoluto; caminho estilo Unix dá
"Acesso negado".

## Referência de design

[`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md) é a especificação visual (tokens, tipo,
componentes, white-label). [`DESIGN_CONTEXT.md`](./DESIGN_CONTEXT.md) descreve telas,
modais, dados e papéis.
