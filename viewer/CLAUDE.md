# Design deste painel

Convenções visuais do `viewer/`. Objetivo: **clean, sério, minimalista** — nada de
cara de "template baratinho" (gradiente em todo botão, glow colorido, fonte
serifada só pra "enfeitar"). Antes de mexer na UI, siga isto.

## Regras principais

- **Sem gradiente em elemento interativo.** Botão, badge, ícone de ação — tudo cor
  lisa. Gradiente só existe em dois lugares decorativos (não interativos): a linha
  fina de 2px embaixo do header, e o preenchimento da barra de progresso de ações
  em massa. Nunca adicione um terceiro caso.
- **Sem `box-shadow` colorido/glow.** Sombra é só pra elevação de modal
  (`0 20px 60px rgba(0,0,0,0.35)`), nunca um brilho laranja atrás de botão.
- **Uma família tipográfica só: Barlow.** Não reintroduza uma serifada (tipo Roboto
  Slab) pra títulos — hierarquia é peso/tamanho, não fonte diferente.
- **Fundo liso**, não vinheta/radial-gradient decorativo atrás da página
  (`#0a0a0c` no escuro, `#f7f7f8` no claro — ver `body` em `index.css`).

## Classes reutilizáveis (`index.css`)

| Classe | Uso |
|---|---|
| `.botao-primario` | Ação principal (Salvar, Criar, Entrar). Laranja `#f56c35` liso, escurece no hover. |
| `.botao-perigo` | Ação destrutiva (Remover). Vermelho `#dc2626` liso, escurece no hover. |
| `.botao-icone-fantasma` | Botão de ícone em listas/tabelas e no header (editar, pausar, tema, sair). Sem fundo em repouso — só aparece um wash neutro no hover. Usado **sempre** que o botão se repete muitas vezes na tela (ex: uma linha de tabela) pra não virar ruído colorido repetido. |

Ao criar um botão novo: se for ação principal → `.botao-primario`; destrutiva →
`.botao-perigo`; ícone que se repete numa lista/tabela/header → `.botao-icone-fantasma`.
Não escreva `background: 'linear-gradient(...)'` inline de novo — é exatamente o
padrão que foi removido.

## Cores de status (já usadas em `PALETAS` no `App.jsx`)

`C.good` (disponível/sucesso), `C.neutral` (pausado), `C.bad` (erro) — não invente
uma cor nova pra dizer a mesma coisa. Essas mesmas cores alimentam os gráficos em
`Graficos.jsx`, então trocar uma aqui desalinha os dois.

## Gráficos

Antes de adicionar/alterar qualquer gráfico, invoque a skill `dataviz` — ela já
está calibrada pro método usado neste projeto (forma do gráfico primeiro, cor por
último, validador de paleta). Ver `Graficos.jsx` pros exemplos já aplicados
(tendência de pausas/despausas, itens com pausas recorrentes).

## Antes de considerar terminado

Rode `npm run lint`, suba o dev server e **tire um screenshot de verdade** (dark e
light) — não assuma que ficou bom só pela leitura do JSX. Erros de layout,
contraste e sobreposição só aparecem olhando renderizado.
