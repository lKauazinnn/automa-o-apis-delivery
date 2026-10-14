# Contexto de design — PausaFast (iFood + 99Food)

> **Visual atual: [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md).** Este arquivo descreve telas, fluxos e
> dados do painel. Onde ele cita cor, fonte ou logo, vale o que está no DESIGN_SYSTEM.md — a cor de
> destaque é da empresa cliente (white-label) e nunca é fixa.

> **Para o Claude Design.** Este arquivo é a fonte única de verdade sobre **o que existe hoje**
> na interface: cada tela, cada modal, cada estado, cada token de cor, os dados reais que
> aparecem na tela e os problemas conhecidos. Foi escrito lendo o código, não a documentação
> antiga — onde os dois discordam, vale este arquivo.
>
> Objetivo do trabalho: **upgrade completo de UI/UX** — visual mais moderno, hierarquia melhor
> resolvida, densidade adequada ao uso real, responsividade e acessibilidade. A funcionalidade
> não muda (ver §12, "Regras invioláveis").
>
> Documentos relacionados neste repositório:
> - [`CLAUDE.md`](./CLAUDE.md) — convenções visuais atuais (parcialmente desatualizado, ver §14)
> - [`BRIEFING_REDESIGN.md`](./BRIEFING_REDESIGN.md) — briefing anterior, **desatualizado**
>   (escrito antes de Sidebar, Pedidos, KDS e 99Food existirem). Substituído por este.

---

## 1. O produto em uma página

**O que é:** painel da equipe de uma empresa de delivery (cliente do PausaFast) para operar a rede — cardápio,
pedidos e cozinha — sem depender do Portal do Parceiro do iFood nem do app do 99Food.

**Quem usa:** três perfis, todos funcionários (não existe cadastro aberto; contas são criadas
por um administrador).

| Papel | Quem é na prática | O que faz no painel |
|---|---|---|
| `operador` | atendente / cozinha | vê tudo, pausa/despausa item, edita preço e código PDV, move pedido no KDS |
| `gerente` | gerente de loja | tudo do operador + criar item, categorias, complementos, horário, interrupções |
| `administrador` | dono / TI | tudo + gerenciar lojas e usuários (criar conta, trocar papel, definir senha) |

**Onde é usado — importante pro design:**

- **Escritório**, em monitor grande: gestão de cardápio, histórico, usuários. Uso calmo.
- **Cozinha / balcão**, em tela de 15"–24" muitas vezes montada na parede, olhada **de longe e
  de relance**: a view KDS. Uso urgente, mãos ocupadas, ambiente barulhento. Hoje o KDS usa o
  mesmo texto de 11px do resto do painel — é o maior descompasso de UX do sistema.
- Ocasionalmente **celular**, pelo IP da rede local, pra pausar um item que acabou no meio do
  serviço. Hoje isso é quase inutilizável (ver §11).

**A tarefa mais frequente e mais urgente:** acabou o insumo → achar o item → pausar → conferir
que sumiu do cardápio. Isso acontece no meio do rush. Todo o resto do painel é secundário em
relação a isso.

**Multi-plataforma:** cada "loja" cadastrada tem uma `plataforma` (`ifood` ou `99food`). A UI é
a mesma para as duas, com pequenas diferenças de comportamento (99Food recebe pedido por
webhook e ganha um botão extra de "Criar pedido teste"; iFood faz polling). O redesign precisa
comportar essa diferença sem duplicar telas.

---

## 2. Restrições técnicas (o que o redesign pode usar)

| | |
|---|---|
| Framework | React 19 (function components + hooks). Sem router — a navegação é um `useState('dashboard' \| 'pedidos' \| 'kds' \| 'catalogo' \| 'auditoria')` |
| Build | Vite 8 |
| CSS | Tailwind 3 (`darkMode: 'class'`) **+ estilos inline** vindos de um objeto de tokens JS |
| Ícones | `lucide-react` — **usar só ícones do lucide** |
| Gráficos | `recharts` 3 |
| Fonte | `IBM Plex Sans` + `IBM Plex Mono`, carregadas via `@import` do Google Fonts no `index.css` |
| Sem | design system externo (shadcn, MUI, Radix), sem framer-motion, sem CSS-in-JS |

### Como o tema funciona hoje (padrão a manter ou substituir conscientemente)

Não existe `dark:` do Tailwind na prática. Existe um objeto `PALETAS = { escuro, claro }` em
[`src/ui.jsx`](./src/ui.jsx); o componente `Painel` escolhe uma paleta (`C`), joga num
`CoresContext`, e **cada componente aplica cor via `style={{ color: C.text1 }}`**. O `<body>`
ganha/perde a classe `tema-claro`, e o tema é persistido no `localStorage`.

Consequência para o design: **cor não vem de classe utilitária, vem de token nomeado.** Se o
redesign introduzir uma cor nova, ela precisa nascer como token nas duas paletas. Um mockup que
use uma cor solta que não existe nos tokens gera divergência entre claro e escuro na hora de
implementar. Propor a migração para CSS custom properties (`--cor-texto-1`) + `dark:` do
Tailwind é bem-vindo — mas diga explicitamente, porque é uma refatoração transversal.

---

## 3. Design tokens atuais (dump literal de `src/ui.jsx`)

### Cores

| Token | Escuro | Claro | Uso |
|---|---|---|---|
| `bg` | `#0A0A0D` | `#F4F4F6` | fundo da página |
| `bg2` | `#08080B` | `#ECECEF` | fundo recuado (colunas do KDS) |
| `cardBg` | `#141419` | `#FFFFFF` | superfície de card, sidebar, tabela |
| `card2` | `#1B1B22` | `#F6F6F8` | superfície secundária |
| `inputBg` | `#101015` | `#F0F0F3` | input, chip, botão neutro |
| `hover` | `rgba(255,255,255,.04)` | `rgba(16,16,20,.035)` | wash de hover |
| `cardBorder` | `#26262F` | `#E6E6EA` | borda de card/input |
| `rowBorder` | `#1D1D25` | `#EDEDF1` | divisória de linha de lista/tabela |
| `text1` | `#F5F5F7` | `#15151A` | texto primário |
| `text2` | `#9A9AA6` | `#6A6A75` | texto secundário |
| `text3` | `#5C5C67` | `#9A9AA4` | texto terciário / label |
| `headerBg` | `#141419` | `#FFFFFF` | header fixo |
| `good` | `#34C77B` | `#12924C` | disponível / sucesso / concluído |
| `neutral` | `#F5A623` | `#B57200` | **pausado / em preparo** (âmbar, não cinza) |
| `bad` | `#F0473F` | `#DB3B33` | erro / cancelado / destrutivo |
| `info` | `#5B8CFF` | `#2F6BE0` | pedido novo / despachado / informativo |
| `brand2` | `#FBB34A` | `#FBB34A` | na cor da marca claro (só decorativo) |
| `overlay` | `rgba(4,4,8,.6)` | idem | fundo de modal (+ `blur(6px)`) |

Cada cor de status tem par `...Bg` (fundo ~9–13% de opacidade) e `...Bd` (borda ~22–32%),
usados por `Pill` e por cards de destaque.

**Cor de marca:** `var(--marca)` (cor de destaque — hoje vem da marca do cliente) — hardcoded como string literal em ~30 lugares,
não como token. É a cor de ação primária, do eyebrow dos modais, dos links "Ver tudo →" e do
`Nx` na frente dos itens do card de KDS.

> **Decisão de design já tomada e que vale manter:** `neutral` = âmbar, não cinza. Um item
> pausado não é um estado neutro — é possível ruptura de estoque e merece atenção. As mesmas
> cores alimentam os gráficos, então trocar uma aqui desalinha os dois.

### Tipografia

- Família única: **IBM Plex Sans** (400/500/600/700/800). `IBM Plex Mono` via classe `.fonte-mono` para
  preço, ID de pedido, código PDV e cronômetro.
- `font-variant-numeric: tabular-nums` global.
- Escala usada hoje, em px literais dentro do JSX — é **muito comprimida**, e resolver isso é
  parte do trabalho: `9px`, `9.5px`, `10px`, `11px`, `11.5px`, `12px` (`text-xs`), `13px`,
  `14px` (`text-sm`), `15px`, `16px` (`text-base`), `20px`, `30px` (`text-3xl`).
- Hierarquia é feita por **peso e tamanho**, nunca por família diferente.
- Título de card: `text-sm font-bold` (14px/700). Título de página: `text-base font-extrabold`
  (16px/800). Número de stat: `text-3xl font-black` com `letter-spacing: -0.04em`.
- Label de formulário: `text-[10px] font-bold uppercase tracking-widest`.

### Forma e elevação

- Raios: `rounded-2xl` (16px) em cards e modais; `rounded-xl` (12px) em botões e inputs;
  `rounded-lg` (8px) em chips, botões de ícone e células editáveis; `rounded-full` em pills,
  avatares e toggles.
- Sombra: só para elevação real. `sh` = `0 1px 0 rgba(255,255,255,.02), 0 18px 48px -16px rgba(0,0,0,.65)`;
  modal usa `0 20px 60px rgba(0,0,0,.35)`; barra flutuante usa `0 20px 50px -12px rgba(0,0,0,.6)`.
- Modais têm `backdrop-filter: blur(24px) saturate(180%)` sobre um overlay com `blur(6px)`.

### Movimento (definido em `src/index.css`)

`toast-entrar` (0.22s), `toast-progresso` (5s linear — a barra que esvazia no toast),
`modal-entrar` (0.16s scale+translate), `barra-flutuante-entrar`, `pulso-vivo` (1.8s, o
pontinho âmbar de "Pausados agora"), `salvo-flash`. Botões têm `transition: all .15s` e
`transform: scale(.98)` no `:active`.

### Regras de estilo já firmadas (de `CLAUDE.md`) — respeitar salvo justificativa explícita

1. **Sem gradiente em elemento interativo.** Botão, badge, ícone de ação: cor lisa. Gradiente
   existe hoje em três lugares decorativos: preenchimento da barra de progresso de ação em
   massa, avatares (`CORES_AVATAR`) e o avatar do rodapé da sidebar.
2. **Sem `box-shadow` colorido/glow.** Sombra é elevação, não brilho.
3. **Uma família tipográfica só.**
4. **Fundo liso**, sem vinheta nem radial-gradient decorativo.
5. Três classes utilitárias existem e devem continuar cobrindo os casos:
   `.botao-primario` (na cor da marca liso), `.botao-perigo` (vermelho liso), `.botao-icone-fantasma`
   (sem fundo em repouso, wash neutro no hover — obrigatório para ícone que se repete numa
   lista/tabela, pra não virar ruído colorido repetido).

---

## 4. Arquitetura da informação

```
┌─ não logado ────────────────────────────────────────────────┐
│  Login  ⇄  Recuperar senha                                  │
│  Definir senha  (convite por e-mail | troca obrigatória)    │
│  Carregando (valida sessão)   ·   Erro fatal (crash)        │
└─────────────────────────────────────────────────────────────┘
                          ↓ logado
┌─ shell ─────────────────────────────────────────────────────┐
│ Sidebar 230px fixa          │  Header fixo                  │
│  OPERAÇÃO                   │   título + subtítulo da view  │
│   • Painel      (dashboard) │   [loja ativa] [tema ☀/☾]     │
│   • Pedidos                 ├───────────────────────────────┤
│   • Cozinha (KDS)           │  barra de progresso           │
│   • Cardápio  [badge N]     │  (só durante ação em massa)   │
│   • Histórico               ├───────────────────────────────┤
│  CARDÁPIO AVANÇADO (modais) │                               │
│   • Categorias              │  <view ativa>                 │
│   • Complementos            │                               │
│   • Horário de funcionamento│                               │
│   • Interrupções            │                               │
│  CONTA                      │                               │
│   • Usuários (só admin)     │                               │
│   • Lojas                   │  rodapé: "<marca> · Operação    │
│  ── avatar, nome, papel     │   iFood · N itens sincroniz."  │
│     [🔑 senha] [⎋ sair]     │                               │
└─────────────────────────────────────────────────────────────┘
   toasts: canto superior direito, sobrepostos a tudo
```

**Ponto de atenção de IA:** os 4 itens de "Cardápio avançado" e os 2 de "Conta" **não são
navegação** — são botões que abrem modal, mas moram na mesma lista visual dos itens que trocam
de view. Só o estilo de "ativo" diferencia. Isso é uma inconsistência real do modelo mental e é
um dos itens abertos para o redesign resolver (§11).

---

## 5. Telas fora do painel

Todas usam a mesma casca: página centrada, cartão `max-w-sm`, logo da marca (`LogoMarca`, 44px)
acima, rodapé "<marca> · Operação delivery". Arquivo: [`src/TelasAuth.jsx`](./src/TelasAuth.jsx).

**5.1 Login** — eyebrow na cor da marca "CATÁLOGO IFOOD", h1 "Entrar", campo e-mail (ícone `Mail` à
esquerda) e senha (ícone `Lock`), botão primário full-width em uppercase, link "Esqueci minha
senha", e o texto "Sem conta? Peça pra um administrador criar a sua". Estados: erro (faixa
vermelha acima do form), carregando (spinner no botão, "Entrando..."), aviso inicial (quando o
link do e-mail expirou — cai aqui com a mensagem).

**5.2 Recuperar senha** — mesmo cartão, só campo e-mail + parágrafo explicando que o filtro de
segurança corporativo às vezes queima o link e que dá pra pedir pro admin redefinir direto.
Estado de sucesso: ícone `CheckCircle2` verde + "Se esse e-mail tiver uma conta, um link de
recuperação foi enviado." + voltar.

**5.3 Definir senha** — a mesma tela serve dois casos com pesos emocionais diferentes:

- **convite/recuperação por link de e-mail** (token vem no `#hash` da URL);
- **troca obrigatória de senha temporária**, que acontece **depois** do login bem-sucedido,
  quando o admin criou a conta ou redefiniu a senha. A pessoa fica presa aqui — a única saída
  alternativa é "Sair". Hoje as duas variantes são visualmente idênticas; a segunda merece
  deixar claro "por que estou aqui e o que acontece depois".

**5.4 Carregando** — spinner centralizado enquanto valida a sessão do `localStorage`.

**5.5 Erro fatal** ([`src/ErroFatal.jsx`](./src/ErroFatal.jsx)) — error boundary. "Algo travou a
tela" + botão Recarregar. Existe pra não deixar tela branca.

---

## 6. Views do painel

### 6.1 Painel / dashboard — [`src/views/DashboardView.jsx`](./src/views/DashboardView.jsx)

Header: "Painel" / "Visão geral da operação na loja ativa". De cima pra baixo:

1. **4 stat cards** (`grid-cols-2 sm:grid-cols-4`): Itens no catálogo (`Boxes`, na cor da marca),
   Categorias (`Layers`, `brand2`), Disponíveis (`CheckCircle2`, `good`), Pausados (`Pause`,
   `neutral`). Cada card: quadradinho de ícone 36px com fundo a 18% + borda a 30%, número
   `text-3xl font-black`, label 12px.
2. **Card "Pausados agora"** — o card mais importante da tela. Cabeçalho com pontinho âmbar
   pulsante (`.pulso-vivo`), título, contador em pill âmbar e link "Ver no catálogo →" (que
   troca a view **e** aplica o filtro de status). Corpo: lista em 2 colunas, altura máxima
   256px com scroll, cada linha = nome do item, "categoria · R$ preço · quando foi pausado" e
   um botão `Play` verde de despausar direto. **Estado vazio (o bom):** check verde + "Tudo
   disponível — nenhum item pausado no momento."
3. **Dois gráficos lado a lado** ([`src/Graficos.jsx`](./src/Graficos.jsx)):
   - *Tendência de pausas x despausas* — AreaChart, 14 dias, duas séries, selos de total no
     topo, eixo X mostrando ~7 datas.
   - *Itens com pausas recorrentes* — BarChart horizontal, até 8 itens pausados mais de uma vez
     ("possível ruptura de estoque frequente"), altura dinâmica (34px por linha), estado vazio
     próprio com `ShieldCheck`.
4. **Card "Atividade recente"** — 20 últimas ações em 2 colunas, cada uma com avatar de
   iniciais colorido, "**Fulano** pausou **Picanha 400g**" e o timestamp.

### 6.2 Pedidos — [`src/views/PedidosView.jsx`](./src/views/PedidosView.jsx)

Tabela de histórico de pedidos, **auto-refresh a cada 15s**. Um card grande com:

- Cabeçalho: ícone `PackageSearch`, "Pedidos", chip "atualiza sozinho a cada 15s", botão
  primário "Atualizar do iFood" (spinner no ícone enquanto roda).
- Barra de filtros: busca por ID + um segmented control de 6 posições (Todos / Novo /
  Confirmado / Despachado / Concluído / Cancelado).
- Tabela: Pedido (mono, na cor da marca) · Loja · Tipo · Pagamento · Status (pill) · Recebido · botão
  "Detalhes". `max-height: calc(100vh - 290px)` com header sticky.
- Rodapé: "Mostrando 1 até N de N registros".
- Estados: carregando (spinner na linha), vazio ("Nenhum pedido encontrado").

### 6.3 Cozinha / KDS — [`src/views/KDSView.jsx`](./src/views/KDSView.jsx)

Quadro kanban de 5 colunas fixas, **auto-refresh a cada 10s**, relógio interno de 1s.

- Colunas: Novo · Confirmado · Despachado · Concluído · Cancelado. Cada uma é um painel `bg2`
  com título uppercase 11px e um contador.
- **Card de pedido** (o objeto mais importante da tela): borda esquerda de 3px na cor do
  status; linha 1 = ID mono + **cronômetro** `mm:ss` desde que chegou; linha 2 = nome do
  cliente; linha 3 = tipo (Entrega/Retirada/Mesa) + total em mono; bloco de itens (até 4,
  `2× Picanha` com o `2×` em na cor da marca, complementos em cinza, e a observação do cliente em âmbar
  com ícone de alerta — é o que a cozinha mais precisa ler); rodapé = pill de status + "ver
  detalhes →" ou, se concluído/cancelado, um `X` para limpar do quadro.
- **Cronômetro com semáforo:** < 10min neutro, ≥ 10min âmbar (`#e0a44c`), ≥ 20min vermelho +
  ícone `AlertTriangle`. Só roda em pedidos ativos.
- Clique no card → modal de detalhes (abre instantâneo com os dados já em memória e enriquece
  em segundo plano). Mudança de status é **otimista**: move na hora, desfaz se o servidor
  recusar.
- Botões do topo: "Histórico" (vai pra Pedidos), "Atualizar", e só em loja 99Food, "Criar
  pedido teste" (abre um picker do cardápio real com stepper de quantidade).
- Estado vazio por coluna: "Nenhum pedido".

### 6.4 Cardápio — [`src/views/CatalogoView.jsx`](./src/views/CatalogoView.jsx)

A view mais densa e mais usada. Um card único contendo:

- **Cabeçalho:** ícone `Tag` + "Itens cadastrados", pill verde "N disp.", pill âmbar "N
  pausados"; à direita chip "N de M itens" e botão primário "Adicionar item" (só
  gerente/admin). Existe também um botão "Criar combo" atrás da flag `COMBO_HABILITADO = false`.
- **Barra de filtros:** busca (nome ou código PDV), select de categoria, segmented control
  Todos/Disponível/Pausado, botão "Recarregar".
- **Tabela** de larguras fixas: `[checkbox 4%] Item 25% · Categoria 13% · Código PDV 13% ·
  Preço 13% · Status 12% · Ação 20%`, header sticky, `max-height: calc(100vh - 290px)`.
  - Coluna Item: thumbnail 36px (ou placeholder `ImageOff`) + nome truncado.
  - **Código PDV e Preço são editáveis inline** — clique vira input, Enter salva, Esc cancela,
    blur salva. Feedback: "Salvando…" e depois "✓ Salvo" abaixo do valor.
  - Status: pill com bolinha (verde Disponível / âmbar Pausado).
  - Ação: `Pencil` (abre modal completo), **`Toggle`** disponível/pausado, `Trash2` (só
    gerente/admin).
  - Linha selecionada ganha wash na cor da marca a 6%.
- **Barra flutuante de seleção** (aparece quando há checkbox marcado): ancorada na parte de
  baixo, contador em quadradinho na cor da marca, "N itens selecionados", botões âmbar "Pausar" e verde
  "Despausar", e um `X` pra limpar.
- Estados: carregando (spinner na linha), vazio filtrado ("Nenhum item encontrado com esses
  filtros"), erro de carregamento (parágrafo vermelho no lugar da tabela).

### 6.5 Histórico / auditoria — [`src/views/AuditoriaView.jsx`](./src/views/AuditoriaView.jsx)

Coluna centrada de 820px. Dois mini-stats no topo (Ações registradas; Pessoas com acesso — só
admin) e uma **linha do tempo vertical**: avatar de iniciais com um fio conectando ao próximo,
frase "**Fulano** alterou o preço de **Picanha 400g**", e quando a ação tem antes/depois, um
delta em mono: `29,90` riscado em vermelho `→` `34,90` em verde. Timestamp em 11px embaixo.

O verbo de cada ação vem do dicionário `ACAO_LABEL` em `ui.jsx` (30 ações mapeadas: criou o
item, pausou, despausou, alterou o preço de, definiu os turnos de, cadastrou a loja…).

---

## 7. Modais (13)

Todos usam o mesmo componente `Modal` de `ui.jsx`: overlay escuro com blur, painel
`rounded-2xl` com blur+saturate, `max-h-80vh` com scroll, eyebrow na cor da marca opcional, título
`text-sm font-bold`, botão `X` num quadradinho 28px.

| Modal | Largura | Conteúdo |
|---|---|---|
| **Gerenciar lojas** | `max-w-lg` | lista de lojas (nome + merchant ID + plataforma), marca a ativa, remove (com confirmação), form de cadastrar loja (só admin) |
| **Detalhes e disponibilidade da loja** | `max-w-md` | nome/razão social, pill de status da conta, selo "Sandbox", endereço, e "Disponibilidade por canal" (uma caixa por operação/canal com pill Disponível/Indisponível e a mensagem do iFood) |
| **Gerenciar usuários** | `max-w-lg` | lista (nome, e-mail, select de papel inline, botão "Definir senha") + form "Criar novo usuário" |
| **Definir senha (pra outro)** | `max-w-md` | toggle de 2 posições "Gerar aleatória" / "Escolher senha" |
| **Senha nova** | `max-w-md` | mostra a senha gerada com botão de copiar, pra o admin repassar por fora (WhatsApp/presencial) |
| **Trocar minha senha** | `max-w-md` | qualquer logado troca a própria senha |
| **Editar item** | `max-w-md` | nome, preço, código PDV, foto (preview 48px + file input), e uma seção "Só vende em turno específico": checkbox → dois `input[type=time]` + 7 chips de dia da semana + botão "Salvar turno" separado do "Salvar alterações" |
| **Adicionar item** | `max-w-md` | nome, categoria (select com opção "+ Criar nova categoria"), código PDV, preço, foto, e um **checklist de requisitos** (cada linha com bolinha que vira check na cor da marca quando preenchida) que habilita o botão |
| **Ações em massa** | `max-w-lg` | lista dos selecionados com status atual + "Pausar todos" / "Despausar todos" |
| **Itens parecidos** | `max-w-lg` | ao pausar um item, se existirem outros de nome parecido (ex.: "Com Ancho Black" / "Fam Ancho Black" / "Exec Ancho Black" = mesmo corte, tamanhos diferentes), pergunta se aplica a todos; dá pra desmarcar individualmente ou escolher "só este item" |
| **Gerenciar categorias** | `max-w-lg` | listar / criar / renomear / excluir categoria |
| **Complementos** | `max-w-lg` | lista de grupos expansíveis (accordion); dentro de cada grupo, os complementos com preço, toggle de status, editar e excluir; form inline "nome + preço + ➕". Traz um aviso honesto: *"O iFood não devolve os complementos já cadastrados num grupo — só mostramos aqui os que você criar agora, nesta sessão."* |
| **Horário de funcionamento** | `max-w-lg` | 7 linhas (uma por dia): checkbox aberto/fechado + N faixas de `hora até hora` com remover + "adicionar faixa". Salvar mostra "Confirmando no iFood…" porque a propagação é assíncrona |
| **Interrupções** | `max-w-lg` | fechamento temporário: motivo + início/fim; lista as ativas com remover |
| **Confirmação genérica** | `max-w-sm` | ícone de alerta em quadradinho, título, mensagem, Cancelar + botão de confirmar (variante `perigo` = vermelho) |

### Feedback transitório

- **Toasts** — canto superior direito, empilhados, `max-w-sm`. Ícone por tipo
  (sucesso/erro/aviso), texto 12px, botão de fechar, e uma barra de 2px na base que esvazia em
  5s (`.toast-progresso`) mostrando quanto falta pra sumir sozinho.
- **Barra de progresso de ação em massa** — aparece colada abaixo do header durante
  pausar/despausar vários: spinner + "Pausando itens: 7/23" + barra com preenchimento em
  gradiente na cor da marca + "30%". Existe porque antes o usuário achava que tinha travado.

---

## 8. Componentes reutilizáveis (specs atuais, em `src/ui.jsx`)

| Componente | Spec |
|---|---|
| `StatCard` | card 16px de raio, padding 20px, ícone 36×36 `rounded-xl` com fundo `cor+18` e borda `cor+30`, valor `text-3xl font-black`, label 12px `text3` |
| `Pill` | duas variantes: com bolinha (11px, `font-semibold`, `rounded-full`) e sem (10px, `font-bold uppercase tracking-wider`, `rounded-lg`). Sempre `cor` no texto, `cor+15` no fundo, `cor+30` na borda |
| `Toggle` | 38×21px, bolinha branca de 15px, verde (`good`) quando ligado e `text3` quando desligado. É o controle principal de pausar/despausar na tabela |
| `Avatar` | círculo com 1–2 iniciais, cor por índice de uma lista de 4 gradientes (na cor da marca, índigo, ciano, rosa) |
| `Modal` | ver §7 |
| `ItemNav` (Sidebar) | 13px, ícone 16px, altura ~34px; ativo = fundo `inputBg` + borda `cardBorder` + peso 600; badge âmbar opcional à direita |
| `.botao-primario` | `var(--marca)` liso → `#E0491A` no hover |
| `.botao-perigo` | `#F0473F` liso → `#D33530` no hover |
| `.botao-icone-fantasma` | transparente, `rgba(148,163,184,.16)` no hover |

---

## 9. Dados reais — use isto para preencher os mockups

Nada de "Lorem ipsum" e nada de "Product Name". O sistema é 100% em **português do Brasil** e o
catálogo é de uma **churrascaria/restaurante**. Nomes de item de verdade seguem o padrão
`<porção> <corte>`: `Com Ancho Black`, `Fam Ancho Black`, `Exec Ancho Black`,
`Picanha Fatiada 400g`, `Coca-Cola 350ml`, `Costela no Bafo`, `Fraldinha Premium`.
Categorias: `Carnes`, `Bebidas`, `Sobremesas`, `Porções`, `Combos`, `Executivos`.

```jsonc
// GET /api/catalogo
{
  "itens": [{
    "itemId": "0f5a…", "productId": "8c2b…",
    "categoria": "Carnes", "categoryId": "3ad1…",
    "nome": "Com Ancho Black", "codigo_pdv": "10452",
    "preco": 89.9, "status": "AVAILABLE",   // ou "UNAVAILABLE"
    "foto": "https://static-images.ifood.com.br/image/upload/…"
  }],
  "categorias": ["Bebidas", "Carnes", "Porções", "Sobremesas"]
}

// GET /api/pedidos
[{
  "id": "…", "ifood_order_id": "3f81a2c9",   // 99Food vem prefixado: "99-8812"
  "status": "NOVO",                           // NOVO|CONFIRMADO|DESPACHADO|CONCLUIDO|CANCELADO
  "tipo": "ENTREGA",                          // ENTREGA|RETIRADA|MESA
  "pagamento": "Crédito - online", "total": 134.8,
  "recebido_em": "2026-07-23T19:41:02Z", "oculto_kds": false,
  "cliente": { "name": "Marina R." },
  "detalhes_brutos": { "items": [ /* iFood */ ], "itens": [ /* 99Food */ ], "timeline": [] }
}]

// GET /api/auditoria?limite=200
[{
  "timestamp": "2026-07-23T18:12:44Z", "operador": "Admin Exemplo",
  "acao": "alterar_preco",       // 30 valores possíveis, ver ACAO_LABEL em ui.jsx
  "item_id": "0f5a…", "codigo_pdv": "10452", "nome": "Com Ancho Black",
  "detalhe": null, "valor_de": "29.90", "valor_para": "34.90"
}]

// GET /api/eu
{ "id": "…", "email": "admin@exemplo.com", "nome": "Admin Exemplo",
  "papel": "administrador", "senha_temporaria": false }
```

Volume real esperado: **150–400 itens** no catálogo, 8–20 categorias, 5–15 pedidos ativos no
KDS em pico, centenas de linhas de auditoria. Os mockups precisam aguentar essa escala — uma
tela desenhada com 6 itens mente sobre o problema.

---

## 10. O que muda por papel (variações a desenhar)

| Elemento | operador | gerente | administrador |
|---|---|---|---|
| Views Painel/Pedidos/KDS/Cardápio/Histórico | ✅ | ✅ | ✅ |
| Toggle pausar/despausar, edição inline de preço e PDV | ✅ | ✅ | ✅ |
| Botão "Adicionar item", `Trash2` na linha | ❌ | ✅ | ✅ |
| Seção "Cardápio avançado" na sidebar (4 itens) | ❌ oculta | ✅ | ✅ |
| Item "Usuários" na sidebar | ❌ oculto | ❌ oculto | ✅ |
| Cadastrar/remover loja | ❌ | ❌ | ✅ |
| Excluir grupo de complementos | ❌ | ❌ | ✅ |
| Stat "Pessoas com acesso" no Histórico | ❌ | ❌ | ✅ |

Hoje a sidebar do operador fica visivelmente mais curta e o cabeçalho do Cardápio fica com um
buraco onde estaria o botão primário. **Vale desenhar explicitamente a tela do operador**, não
só a do admin — é o papel mais numeroso.

---

## 11. Problemas conhecidos — a lista de trabalho do redesign

Ordenados por impacto. Estes são os motivos do upgrade; não são preferências estéticas soltas.

**Densidade e legibilidade**

1. **Tipografia comprimida demais.** A escala vive entre 9px e 13px. `9.5px uppercase
   tracking-wider` nos títulos de seção da sidebar e `10px` em label de formulário estão abaixo
   do legível confortável, e o `text3` sobre `cardBg` no tema escuro (`#5C5C67` sobre `#141419`
   = **2,78:1**) **reprova no contraste AA**. Precisa de uma escala tipográfica
   real, com mínimo praticável de 12px para texto de interface.
2. **O KDS herda a densidade do escritório.** É a tela olhada de longe, no rush, e usa 11px.
   Deveria ter sua própria escala — card maior, ID e cronômetro grandes, item do pedido legível
   a 2 metros. Talvez até um "modo TV".

**Responsividade**

3. **O app é desktop-only na prática.** Existem 11 usos de breakpoint em todo o código-fonte.
   Consequências concretas: a sidebar de 230px é fixa e não colapsa; o KDS é
   `grid-template-columns: repeat(5, 1fr)` **fixo** (5 colunas espremidas em qualquer largura);
   a tabela do Cardápio tem colunas de porcentagem fixa e só rola horizontalmente; a barra
   flutuante de seleção é posicionada com `left: calc(50% + 115px)` — um número mágico amarrado
   à largura da sidebar, que quebra se ela mudar. Como o pausar-item-no-rush acontece **pelo
   celular**, isso é um problema de operação, não de vaidade.

**Modelo mental / IA**

4. **Sidebar mistura navegação com ações.** 5 itens trocam a view; 6 abrem modal; visualmente
   são idênticos. Ou separar claramente, ou promover "Cardápio avançado" a sub-navegação real
   dentro da view Cardápio.
5. **Excesso de modal.** Categorias, Complementos, Horário, Interrupções, Lojas e Usuários são
   telas de gestão com listas, formulários e estados de erro — espremidas em `max-w-lg` com
   scroll interno. Complementos em especial (accordion + form aninhado + edição inline) é uma
   página inteira dentro de um modal.
6. **Modal sobre modal.** "Ações em massa" e "Itens parecidos" podem abrir por cima de outra
   coisa, e a confirmação genérica usa `z-[60]` para vencer o `z-50` dos modais. Empilhamento
   frágil.

**Feedback e estado**

7. **Estados vazios inconsistentes.** Alguns são bem resolvidos (o "Tudo disponível" do
   dashboard, o `ShieldCheck` do gráfico); outros são um parágrafo cinza solto ("Nenhum pedido
   encontrado.", "Nenhum grupo de complementos ainda."). Faltam ilustração e ação de saída.
8. **Sem skeleton.** Todo carregamento é um spinner + texto no meio da área, o que faz a página
   inteira "piscar" a cada refresh de 10–15s no KDS/Pedidos.
9. **Erro sem ação.** Erro de carregamento do catálogo é um parágrafo vermelho, sem botão de
   tentar de novo.
10. **Duas linguagens para a mesma ação.** Pausar/despausar aparece como `Toggle` na tabela,
    como botão `Play` no dashboard, e como par de botões âmbar/verde na barra flutuante. Uma
    delas deveria ganhar.

**Acessibilidade**

11. **Sem indicador de foco de teclado.** O `:focus` estilizado no `index.css` cobre só
    `input/select/textarea`. Botões, o `Toggle`, os cards clicáveis do KDS e os itens da
    sidebar não têm anel de foco visível.
12. **Semântica fraca.** 9 atributos `aria-*`/`role` no projeto inteiro. O card de pedido do
    KDS é uma `div` com `role="button"` sem `tabIndex` nem handler de teclado. Os modais não
    prendem o foco nem fecham com `Esc` (só clique no overlay ou no X). Segmented controls não
    são `role="tablist"`/`radiogroup`.
13. **Contraste.** Além do `text3` já citado (2,78:1): **texto branco sobre `.botao-primario`
    (`var(--marca)`) dá 2,97:1 e sobre `.botao-perigo` (`#F0473F`) dá 3,70:1 — os dois reprovam
    em AA**, e são os controles mais usados do painel. O cinza do rodapé (`#334155` no
    escuro) também precisa de revisão.

**Acabamento**

14. `<title>` da aba é literalmente **"viewer"**. Nenhuma meta description, nenhum
    `theme-color`, nenhum apple-touch-icon.
15. Sem `prefers-reduced-motion` — o `.pulso-vivo` e a barra de toast piscam para todo mundo.
16. Sem estado offline / de reconexão, num app que faz polling a cada 10s.

---

## 12. Regras invioláveis

Cada tela e cada modal listado nas §5–§7 existe porque resolveu um problema real de operação (a
barra de progresso, a troca obrigatória de senha, o modal de itens parecidos, o cronômetro com
semáforo, o aviso de que o iFood não devolve complementos). **O visual pode mudar
completamente; os fluxos precisam continuar existindo.** Se o redesign quiser fundir, mover ou
cortar alguma tela, marque isso como uma *proposta explícita* na entrega, não como fato
consumado — é decisão de produto.

Duas limitações de API que a UI precisa continuar respeitando:

- **Não existe endpoint de exclusão de item no iFood** que se comporte como "tirar do
  cardápio" — o `Trash2` chama um delete real de produto na categoria; a operação do dia a dia
  é **pausar**. O desenho não pode sugerir que pausar é temporário-e-menor e excluir é o "de
  verdade".
- **Combo está desabilitado por flag** (`COMBO_HABILITADO = false`) porque o payload `COMBO_V2`
  ainda dá conflito. Desenhe o botão "Criar combo" como estado previsto, mas não conte com ele
  no fluxo principal.

---

## 13. O que eu quero de volta

Um **canvas com artboards**, tema escuro como principal (é o padrão de uso) e o claro nos
componentes onde ele muda o jogo. Prioridade nesta ordem:

**Prioridade 1 — as telas de rush**

1. `Cozinha (KDS)` — desktop 1440px, quadro cheio (12+ pedidos, colunas desbalanceadas), com
   card em 3 variações de cronômetro (normal / ≥10min / ≥20min) e um card com observação longa
   do cliente.
2. `Cardápio` — desktop 1440px, ~15 linhas visíveis, com: uma linha selecionada, uma em edição
   inline de preço, um item sem foto, a barra flutuante de seleção ativa, e as pills de status.
3. `Cardápio — mobile 390px`. A tela mais importante no celular. Como fica a tabela? Cards?
4. `Painel` — desktop 1440px, com "Pausados agora" cheio (8+ itens) e os dois gráficos.

**Prioridade 2 — o shell e os estados**

5. `Shell` isolado: sidebar (variante admin e variante operador) + header + barra de progresso
   de ação em massa ativa.
6. `Shell — mobile`: proposta de navegação (sidebar colapsada? bottom nav? drawer?).
7. `Estados`: skeleton de carregamento do Cardápio e do KDS, erro com ação de retry, e 3
   estados vazios redesenhados.

**Prioridade 3 — o resto**

8. `Pedidos`, `Histórico`.
9. `Login` + `Definir senha (troca obrigatória)` — as duas variantes precisam se distinguir.
10. Modais: `Editar item` (o mais completo, com a seção de turnos), `Complementos` (o mais
    complexo — proposta de virar página é bem-vinda), `Itens parecidos`, `Confirmação`.
11. `Folha de componentes`: botões (3 variantes × 4 estados), inputs, select, checkbox,
    `Toggle`, `Pill` nos 5 status, `StatCard`, `Avatar`, toast (3 tipos), tabela
    (header / linha / linha selecionada / linha em edição), card de KDS, chips de filtro e
    segmented control.

**Junto com o canvas, entregue:**

- A **escala tipográfica** proposta (tamanho / peso / line-height / uso), resolvendo o problema
  §11.1.
- Os **tokens novos ou alterados**, nas duas paletas, no mesmo formato do objeto `PALETAS` de
  `ui.jsx` — para colar direto no código.
- A **grade de espaçamento** e os raios definitivos.
- Um bilhete curto sobre cada decisão que quebra uma das regras da §3 (é permitido quebrar,
  desde que seja consciente e explicado).

---

## 14. Divergências entre a documentação atual e o código (não se confunda)

Levantadas ao escrever este arquivo — o `CLAUDE.md` do `viewer/` está parcialmente defasado:

| `CLAUDE.md` diz | O código faz |
|---|---|
| "Uma família tipográfica só: **Barlow**" | `index.css` carrega **IBM Plex Sans** + IBM Plex Mono; Barlow não é carregada em lugar nenhum |
| `tailwind.config.js` declara `sans: Barlow`, `display: Roboto Slab` | nenhuma das duas é carregada; o único `font-sans` do projeto ([CatalogoView.jsx:46](./src/views/CatalogoView.jsx#L46)) cai em fallback do sistema |
| "gradiente só existe em 2 lugares decorativos" | são 3: barra de progresso, `CORES_AVATAR` e o avatar do rodapé da sidebar |
| fundo `#0a0a0c` / `#f7f7f8` | `index.css` usa `#0a0a0d` / `#f4f4f6` |
| `.botao-perigo` = `#dc2626` | é `#f0473f` |
| `BRIEFING_REDESIGN.md` descreve um painel de coluna dupla com header e sem sidebar | a arquitetura atual é sidebar + 5 views; Pedidos, KDS e 99Food nem existiam quando aquele arquivo foi escrito |

Além disso, a cor de marca `var(--marca)` **não é um token** — está escrita à mão em ~30 pontos do
JSX. Se o redesign mexer na marca, isso vira um token primeiro.

---

## 15. Mapa de arquivos (onde cada coisa mora)

```
viewer/src/
├── main.jsx                  entrada
├── App.jsx            2203L  ⚠️ shell + estado global + 10 modais inline
├── ui.jsx              264L  PALETAS, ACAO_LABEL, Avatar, StatCard, Pill, Toggle, Modal
├── index.css           213L  fonte, body, scrollbar, .botao-*, keyframes
├── Sidebar.jsx         148L  navegação
├── TelasAuth.jsx       293L  Login, Recuperar senha, Definir senha
├── ErroFatal.jsx        37L  error boundary
├── Graficos.jsx        243L  os 2 gráficos do dashboard (recharts)
├── DetalhesPedidoModal.jsx   detalhe de pedido usado pelo KDS
├── auth.js             125L  Supabase Auth via fetch puro
├── components/CerebroGraphify.jsx   mascote SVG animado (grafo/cérebro)
├── views/
│   ├── DashboardView.jsx   149L
│   ├── PedidosView.jsx     311L
│   ├── KDSView.jsx         499L
│   ├── CatalogoView.jsx    596L
│   └── AuditoriaView.jsx    90L
└── modals/
    ├── CategoriasModal.jsx           218L
    ├── ComboModal.jsx                214L  (atrás de flag)
    ├── GruposOpcaoModal.jsx          501L  ⚠️ o mais complexo
    ├── HorarioFuncionamentoModal.jsx 255L
    └── InterrupcoesModal.jsx         170L
```

**Nota estrutural:** `App.jsx` tem 2203 linhas e concentra o estado global, o shell e 10 modais
escritos inline. Qualquer redesign vai esbarrar nele. Extrair os modais para `src/modals/`
seguindo o padrão que já existe é um pré-requisito prático — vale sinalizar isso na entrega,
mesmo sendo trabalho de código e não de design.

### Backend (contexto, não precisa desenhar)

`server/app.py` (Flask, ~2110 linhas, 58 rotas) é a única coisa que fala com as APIs do iFood e
do 99Food; guarda `client_secret` e `service_role` do Supabase fora do navegador; registra
auditoria de tudo. Autenticação e perfis ficam no Supabase. Existe também `sistema-pedidos/` na
raiz do repositório — um protótipo standalone de KDS (FastAPI + React 18 + TypeScript +
WebSocket) que **foi superado** pelas views `Pedidos`/`KDS` dentro do `viewer/`. Não faz parte
do escopo do redesign.

### Marca

a logo enviada pela empresa cliente (Administração > Marca) ou, sem ela, o símbolo do PausaFast
(`SimboloPausaFast` em `src/Logo.jsx`) desenhado na cor da marca. Laranja `var(--marca)`. Não existe manual de
marca — o redesign tem liberdade sobre tudo que não seja o logo em si.
