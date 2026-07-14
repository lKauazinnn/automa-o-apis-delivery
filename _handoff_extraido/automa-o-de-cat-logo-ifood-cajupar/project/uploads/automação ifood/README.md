# Automação de Catálogo iFood — Cajupar

Painel interno para gerenciar o catálogo (itens, preços, categorias e disponibilidade) de lojas
do iFood via API, sem depender do Portal do Parceiro pra tarefas do dia a dia.

## Arquitetura

```
viewer/ (React + Vite)  --fetch-->  server/app.py (Flask, :5000)  --requests-->  API do iFood
     :5173                          único ponto que fala com a API do iFood
```

- **`viewer/`** — interface web (React 19 + Vite + Tailwind). Não fala com o iFood diretamente:
  só chama a API local em `http://localhost:5000/api`. Fala direto com o Supabase Auth só pra
  login/definir senha (usando a chave `anon`, feita pra existir no navegador).
- **`server/app.py`** — API local em Flask. Existe pra manter o `client_secret`/`service_role`
  longe do navegador, validar dados antes de gravar de verdade, tentar de novo automaticamente em
  rate limit/erro transiente, checar login/papel de verdade em cada ação sensível, e registrar
  auditoria de tudo que é alterado.
- **`src/ifood_automacao/`** — biblioteca Python fina sobre a Merchant/Catalog API do iFood
  (autenticação OAuth2, criar/listar categorias e itens, pausar/despausar, alterar preço).
- **`scripts/`** — utilitários de linha de comando que usam a biblioteca diretamente (sem passar
  pelo Flask): carga em massa a partir de planilha, exportar catálogo, listar lojas, etc.
- **`data/`** — planilhas de origem, logs de carga e o log técnico de aplicação (`app.log`). Não
  vai pro controle de versão (está no `.gitignore`). A auditoria (quem fez o quê) não fica mais
  aqui — vai pra uma tabela no Supabase, ver seção própria abaixo.
- **`sql/`** — migrações pra rodar no SQL Editor do Supabase.

## Subindo o projeto

### Opção rápida (Windows)
```
iniciar.bat
```
Sobe o backend Flask e o frontend Vite em duas janelas.

### Manual
```bash
# backend
python -m venv .venv
.venv/Scripts/activate
pip install -r requirements.txt
python server/app.py

# frontend (outro terminal)
cd viewer
npm install
cp .env.example .env.local  # preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
npm run dev
```

Acesse `http://localhost:5173`. Antes do primeiro uso, veja "Login, papéis e convites" abaixo —
sem isso feito, ninguém consegue entrar no painel.

## Variáveis de ambiente (`.env`)

Copie `.env.example` para `.env` e preencha:

| Variável | Obrigatória | Descrição |
|---|---|---|
| `IFOOD_CLIENT_ID` / `IFOOD_CLIENT_SECRET` | sim | Credenciais do app cadastrado no iFood Developer (Sandbox ou Produção). |
| `IFOOD_MERCHANT_ID` | sim | Loja padrão. Descubra rodando `python scripts/descobrir_lojas.py`. |
| `VIEWER_ORIGIN` | não | Origem(ns) liberada(s) no CORS do backend — aceita várias separadas por vírgula (ex: IP da rede local + localhost). Padrão: `http://localhost:5173`. |
| `FLASK_DEBUG` | não | `1` liga o modo debug do Flask (só pra depuração local). Padrão: desligado. |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | sim** | Auditoria e login/papéis dos usuários. **Sem isso, ninguém consegue logar (a API inteira vira 401/500). Rode os SQLs em `sql/` antes de configurar. |
| `SUPABASE_ANON_KEY` | sim | Usada pelo backend só pra validar o token de sessão do usuário logado (`GET /auth/v1/user`). |

O frontend (`viewer/.env.local`, copiado de `viewer/.env.example`) também precisa de
`VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (a mesma URL/chave `anon` de cima — essa chave é
segura pra expor no navegador, é pra isso que ela existe) e opcionalmente `VITE_API_URL` se o
backend não estiver em `localhost:5000`.

## API local (`server/app.py`)

Toda rota, exceto `/api/saude`, exige login: header `Authorization: Bearer <access_token>` (o
token que o Supabase Auth devolve no login). Sem isso, ou com token inválido/expirado, é 401.

| Rota | Acesso | O que faz |
|---|---|---|
| `GET /api/saude` | livre | Health check. |
| `GET /api/eu` | logado | Quem é o usuário logado (id, email, nome, papel). |
| `GET /api/lojas` | logado | Lista as lojas (merchants) vinculadas às credenciais. |
| `GET /api/catalogo?loja=<id>` | logado | Categorias + itens da loja (padrão: `IFOOD_MERCHANT_ID`). |
| `POST /api/itens` | administrador/gerente | Cria um item novo (categoria é criada automaticamente se não existir). |
| `PATCH /api/itens/<id>/status` | logado | Pausa (`UNAVAILABLE`) ou despausa (`AVAILABLE`) um item. |
| `PATCH /api/itens/<id>/preco` | logado | Atualiza o preço de um item. |
| `PATCH /api/itens/<id>/codigo-pdv` | logado | Atualiza o código PDV (`externalCode`) de um item. |
| `POST /api/itens/pausar-em-massa` | logado | Pausa/despausa vários itens de uma vez (`item_ids: []`). Uma falha em um item não trava os outros. |
| `GET /api/auditoria?limite=50` | logado | Últimas ações registradas (quem, o quê, quando), lidas do Supabase. |
| `GET /api/usuarios` | administrador | Lista usuários (id, email, nome, papel). |
| `POST /api/usuarios/convidar` | administrador | Cria a conta de alguém já com senha definida (`{email, nome, papel}`), sem depender de e-mail — devolve a senha na resposta pro admin repassar por fora. |
| `PATCH /api/usuarios/<id>/papel` | administrador | Troca o papel de alguém. |
| `POST /api/usuarios/<id>/resetar-senha` | administrador | Define uma senha nova pra alguém que já tem conta. Aceita `{senha: "..."}` opcional no corpo (senão gera uma aleatória) e devolve a senha final na resposta pro admin repassar por fora. |
| `POST /api/eu/senha-trocada` | logado | Chamado pelo front depois que o próprio usuário troca a senha — desliga a flag `senha_temporaria` que força a troca no próximo login. |

O `operador` gravado na auditoria não vem mais do corpo da requisição — é sempre o nome do
usuário autenticado (`g.usuario`), resolvido a partir do token. O corpo não precisa (e não deve)
mandar `operador`/`papel` mais.

Trocar de loja: qualquer rota aceita `?loja=<merchantId>` na query string; sem isso, usa a
`IFOOD_MERCHANT_ID` do `.env`.

## Pausar / despausar itens

O botão de pausa numa linha da tabela chama `PATCH /api/itens/<id>/status`. Antes de executar,
o front procura **itens parecidos** pelo nome (ex: "Com Ancho Black", "Fam Ancho Black", "Exec
Ancho Black" são o mesmo corte em tamanhos diferentes) e, se encontrar algum, abre um modal
perguntando se quer pausar todos de uma vez — pensado pra ruptura de insumo, onde pausar item
por item é lento. O usuário pode desmarcar o que não fizer sentido antes de confirmar, ou optar
por mexer só no item clicado.

Também dá pra selecionar vários itens manualmente pela caixinha de seleção da tabela e usar a
barra "Pausar/Despausar selecionados" que aparece no topo.

**Limitação conhecida:** a API do iFood não tem endpoint de exclusão de item — o mais próximo
de "remover" um item do cardápio é pausá-lo (`UNAVAILABLE`). Por isso não existe botão de
excluir no painel.

## Auditoria e logs

- **Tabela `auditoria` no Supabase** — uma linha por ação que muda o catálogo real (criar item,
  pausar, despausar, alterar preço/código PDV, ações em massa), com quem fez, quando e detalhe.
  Visível no painel em "Atividade recente" e via `GET /api/auditoria`. Pra habilitar: rode
  `sql/001_criar_tabela_auditoria.sql` no SQL Editor do projeto Supabase e preencha
  `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` no `.env`. Sem isso configurado, a API funciona
  normalmente, só que a auditoria fica vazia (gravação é best-effort — nunca trava uma ação real
  no iFood por causa de falha na auditoria). RLS está ligado na tabela sem nenhuma policy, então
  só a `service_role` key (guardada só no backend) consegue ler/gravar nela.
- `data/app.log` — log técnico (requests, erros, retries) com rotação automática (até ~2MB × 3
  arquivos), pra investigar problemas depois de uma demonstração ou incidente. Esse continua
  local (é log de infraestrutura, não dado de negócio).

## Login, papéis e convites

Autenticação de verdade via Supabase Auth — login é obrigatório pra usar o painel. Não existe
cadastro aberto: um administrador cria a conta pelo modal "Usuários" (nome, e-mail, papel) e o
painel mostra a senha gerada na hora, pra repassar pra pessoa por fora (WhatsApp, presencial
etc). Não depende de e-mail nenhum chegar — o problema real que isso evita: link de convite/
recuperação por e-mail depende do Supabase mandar o e-mail E de ninguém "clicar" nele antes da
pessoa (scanner de segurança de e-mail corporativo costuma pré-visitar links e queimar o token
de um só uso antes da pessoa conseguir usar). Toda senha definida por um administrador (criação
de conta ou reset) fica marcada como **temporária** (coluna `senha_temporaria` em `perfis`) — no
próximo login, o painel obriga a pessoa a escolher uma senha só dela antes de liberar qualquer
outra tela. Depois disso, dá pra trocar de novo a qualquer momento pelo ícone de chave no
cabeçalho ("Trocar minha senha").

**Bootstrap do primeiro administrador** (só uma vez, manual, porque ainda não existe nenhum
usuário no sistema pra criar o primeiro):
1. Rode `sql/001_criar_tabela_auditoria.sql`, `sql/002_criar_tabela_perfis.sql` e
   `sql/004_flag_senha_temporaria.sql`, nessa ordem, no SQL Editor do projeto Supabase.
2. Peça pra alguém com acesso ao backend (ou rode você mesmo com a `service_role` key) chamar
   `POST {SUPABASE_URL}/auth/v1/admin/users` com
   `{"email": "...", "password": "...", "email_confirm": true, "user_metadata": {"nome": "...", "papel": "administrador"}}` —
   o trigger do banco já cria o perfil com esse papel. (Alternativa sem chamar a API: crie o
   usuário pelo Dashboard do Supabase em Authentication > Users, e depois rode
   `update public.perfis set papel = 'administrador' where email = '...'` no SQL Editor.)
3. A partir daí, esse administrador cria todo mundo pelo próprio painel.

Como o backend valida o papel direto na tabela `perfis` (não confia em nada que o navegador
manda), essa é segurança de verdade — diferente de um seletor autodeclarado. Papéis: administrador
e gerente podem criar item; qualquer um logado pode ver o catálogo, pausar/despausar, editar
preço/código PDV; só administrador convida gente nova e troca papel de alguém.

**Simplificação atual:** a sessão não tem refresh automático — expira em ~1h (padrão do Supabase)
e a pessoa precisa logar de novo. Suficiente pra uso do dia a dia; se incomodar, dá pra
implementar refresh token depois.

**Links de convite/recuperação por e-mail são frágeis.** Já aconteceu de um filtro de segurança
de e-mail corporativo "clicar" no link sozinho pra escanear, queimando o token de um só uso antes
da pessoa de verdade clicar (`otp_expired`). Duas mitigações:
1. Confira em Authentication > URL Configuration no Supabase se `Site URL` e `Redirect URLs`
   apontam pra onde o front realmente roda (`http://localhost:5173` em dev) — sem isso, o
   redirecionamento cai num endereço errado mesmo quando o link é válido.
2. Pra não depender de e-mail nenhum, qualquer administrador pode clicar em "Redefinir senha" ao
   lado do nome de alguém no modal de Usuários — gera uma senha nova na hora (via Admin API do
   Supabase) pra repassar por fora. A tela de login também tem "Esqueci minha senha" (envia link
   de recuperação, mesma limitação de e-mail corporativo acima se aplica).

## Scripts (`scripts/`)

| Script | Uso |
|---|---|
| `descobrir_lojas.py` | Lista as lojas vinculadas às credenciais do `.env`. |
| `ver_catalogo.py` | Imprime catálogos/categorias da loja configurada. |
| `exportar_catalogo.py` | Exporta o catálogo atual do iFood pra uma planilha. |
| `carga_massa.py` | Cria/atualiza em massa os itens ativos de `data/material.xlsx` no catálogo (preço fica com um valor provisório — a planilha de origem não traz preço real). |
| `testar_sandbox.py` | Sobe 3 itens de teste pra validar a integração ponta a ponta no sandbox. |

## Sandbox vs. Produção

As credenciais do `.env` valem só pra uma loja/ambiente por vez (sandbox de teste ou produção
homologada). Pra conectar uma loja real, é preciso homologar o app com o iFood e o dono da loja
aprovar o acesso pelo Portal do Parceiro — não tem atalho por a loja já existir. Veja a aba
Suporte do [iFood Developer](https://developer.ifood.com.br/pt-BR) para abrir esse processo.
