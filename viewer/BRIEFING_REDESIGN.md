# Briefing do sistema — pra quem for redesenhar

Isso aqui descreve **o que existe hoje** no painel (funcionalidade, telas, dados),
sem julgamento de estilo — é o material pra quem for refazer o visual entender o
que precisa continuar funcionando. Convenções de estilo que já foram definidas
ficam em [`CLAUDE.md`](./CLAUDE.md); este arquivo é sobre **conteúdo e comportamento**,
não sobre cor de botão.

## O que é

Painel interno (uso da equipe Cajupar, não do cliente final) pra gerenciar o
catálogo de itens de uma ou mais lojas no iFood: pausar/despausar item quando
falta insumo, criar item novo, ajustar preço e código PDV, e acompanhar quem
mexeu em quê. Roda local (`localhost:5173` + backend Flask em `localhost:5000`,
ou pelo IP da rede local pra acesso de outros dispositivos).

## Stack técnica

- **Frontend**: React 19 + Vite + Tailwind CSS, ícones `lucide-react`, gráficos
  `recharts`. Um único componente gigante (`App.jsx`) concentra quase toda a UI
  logada (`Painel`); `TelasAuth.jsx` tem as telas de login/senha;
  `Graficos.jsx` tem os dois gráficos do topo do painel; `ErroFatal.jsx` é um
  error boundary; `auth.js` fala direto com o Supabase Auth via `fetch` (sem SDK).
- **Backend**: Flask (`server/app.py`), ponte entre o front e a Merchant/Catalog
  API do iFood — nunca expõe client secret nem a `service_role` key do Supabase
  pro navegador.
- **Autenticação/dados de usuário**: Supabase (Auth + tabela `perfis` + tabela
  `auditoria`).

## Papéis e permissões

Três papéis: **administrador**, **gerente**, **operador**. Qualquer logado vê o
catálogo e pausa/despausa/edita preço/código PDV. Só admin e gerente criam item
novo. Só admin gerencia lojas e usuários (criar, trocar papel, definir senha).

## Telas (fora do painel logado)

1. **Login** — e-mail + senha, link "Esqueci minha senha", texto "Sem conta? Peça
   pra um administrador criar a sua" (não existe cadastro aberto).
2. **Recuperar senha** — só pede o e-mail (via Supabase, e-mail com link).
3. **Definir senha** — mesma tela serve dois casos diferentes:
   - **Convite/recuperação**: chegou por link de e-mail (hash da URL tem o token).
   - **Troca obrigatória de senha temporária**: acontece **depois de logar**,
     quando um admin criou a conta ou redefiniu a senha dela — a pessoa é
     obrigada a escolher uma senha só dela antes de ver qualquer outra tela do
     painel (só pode "Sair" em vez de trocar).
4. **Tela de carregamento** — spinner simples enquanto valida a sessão salva.
5. **Tela de erro fatal** — se o React travar renderizando algo, mostra "Algo
   travou a tela" + botão Recarregar, em vez de ficar em branco.

## O painel logado — layout de cima pra baixo

**Header** (fixo no topo): logo Cajupar, título "Catálogo iFood / Gestão de
itens", e à direita: toggle de tema claro/escuro, botão da loja ativa (abre
"Gerenciar lojas"), botão "Usuários" (só admin, abre "Gerenciar usuários"),
nome+papel da pessoa logada, botão "Trocar minha senha", botão "Sair". Uma linha
fina de destaque embaixo do header.

Quando uma ação em massa (pausar/despausar vários itens) está rodando, aparece
uma **barra de progresso** logo abaixo do header: "Pausando/Despausando itens:
X/Y" com barra de porcentagem — existe porque antes o usuário não tinha nenhum
feedback visual durante uma ação em massa e achava que tinha travado.

**Linha de 4 cartões de estatística**: total de itens no catálogo, total de
categorias, total disponíveis, total pausados.

**Dois gráficos lado a lado** (`Graficos.jsx`):
- *Tendência de pausas x despausas* — área/linha dos últimos 14 dias, duas
  séries (pausas e despausas), com selos de total no topo.
- *Itens com pausas recorrentes* — barra horizontal dos itens pausados mais de
  uma vez (sinal de ruptura de estoque frequente); estado vazio quando não há
  nenhum.

**Coluna esquerda**:
- Card "Adicionar item ao catálogo": nome, categoria (select + opção de criar
  categoria nova), código PDV, preço, checklist visual dos requisitos
  preenchidos, botão Criar item — só aparece o formulário se o papel tiver
  permissão; senão mostra um aviso de acesso restrito.
- Card "Atividade recente": lista das últimas 20 ações da tabela `auditoria`
  (quem fez, o quê, em qual item/pessoa/loja, quando).

**Coluna direita — "Itens cadastrados"**: busca por nome/código PDV, filtro de
categoria, filtro de status (Todos/Disponível/Pausado), botão Recarregar,
contagem "X de Y itens". Quando há itens selecionados via checkbox, aparece uma
barra "N itens selecionados" com botão "Ações em massa". Tabela com colunas
Categoria, Item, Código PDV, Preço, Status (pill colorida), Ações (editar =
lápis, pausar/despausar = ícone que muda conforme o status).

## Modais

- **Gerenciar lojas** — lista lojas cadastradas (nome + merchant ID), marca qual
  é a ativa, remove loja (com confirmação), formulário pra cadastrar loja nova
  (só admin).
- **Gerenciar usuários** — lista usuários (nome, e-mail, papel via select,
  botão "Definir senha"), formulário "Criar novo usuário" (nome, e-mail, papel).
- **Definir senha** (pra outro usuário) — duas opções: gerar senha aleatória ou
  escolher uma específica.
- **Senha nova** — mostra a senha (gerada ao criar usuário ou ao definir/redefinir
  pra alguém) com botão de copiar, pra admin repassar por fora (WhatsApp,
  presencial).
- **Trocar minha senha** — qualquer logado troca a própria senha a qualquer
  momento (além da troca obrigatória do primeiro acesso).
- **Editar item** — preço e código PDV do item clicado.
- **Ações em massa** — lista os itens selecionados com status atual, botões
  "Pausar todos" / "Despausar todos".
- **Itens parecidos** — ao pausar/despausar um item, se existirem outros com
  nome parecido (ex: "Com/Fam/Exec Ancho Black" = mesmo corte, tamanhos
  diferentes), pergunta se quer aplicar a mudança a todos de uma vez; dá pra
  desmarcar o que não fizer sentido ou escolher "só este item".
- **Confirmação genérica** — usado hoje só pra "Remover loja?", mas é um
  componente reaproveitável pra qualquer ação destrutiva futura.

## Toasts (avisos temporários)

Canto superior direito, com ícone por tipo (sucesso/erro/aviso), barra de
progresso do tempo até sumir sozinho, botão de fechar manual.

## Dados que a tela consome (via API do backend Flask)

- `GET /api/catalogo` — itens (nome, categoria, status, código PDV, preço) e
  lista de categorias da loja ativa.
- `GET /api/lojas`, `POST /api/lojas`, `DELETE /api/lojas/<id>`.
- `POST /api/itens`, `PATCH /api/itens/<id>/status`, `PATCH /api/itens/<id>/preco`,
  `PATCH /api/itens/<id>/codigo-pdv`.
- `GET /api/auditoria?limite=200` — alimenta tanto a lista "Atividade recente"
  (mostra só as 20 primeiras) quanto os dois gráficos de tendência.
- `GET /api/usuarios`, `POST /api/usuarios/convidar`, `PATCH /api/usuarios/<id>/papel`,
  `POST /api/usuarios/<id>/resetar-senha`, `POST /api/eu/senha-trocada`.
- `GET /api/eu` — quem é a pessoa logada (id, email, nome, papel,
  `senha_temporaria`).

## O que precisa continuar existindo num redesign

Tudo que está listado acima em "Telas" e "Modais" — nenhuma dessas
funcionalidades é decorativa, cada uma resolve um problema real que já
apareceu (a barra de progresso, a troca obrigatória de senha, o modal de itens
parecidos, etc. — todas vieram de uma reclamação ou bug específico). Um
redesign pode mudar completamente a aparência, mas precisa manter cada fluxo
funcionando. Se alguma tela for cortada ou fundida com outra, isso é uma
decisão de produto que vale confirmar com quem pediu antes de fazer.
