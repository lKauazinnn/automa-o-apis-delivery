# Deploy do backend na Vercel (URL fixa pro webhook do iFood)

O backend Flask (`server/app.py`) roda na Vercel como função serverless. Isso dá uma
**URL pública fixa** pro webhook do iFood — registra uma vez e nunca mais muda (adeus
túnel cloudflared com URL aleatória).

Já deixei tudo configurado no repo (formato oficial do builder novo da Vercel, que usa `uv`):
- `pyproject.toml` — tem a tabela `[project]` com as dependências (o `uv` exige) e o
  `[tool.vercel] entrypoint = "server.app:app"`, que faz a Vercel servir o Flask como
  **função única** roteando TODAS as rotas (`/api/...`, `/webhook/ifood`, `/webhook/99food`).
- `vercel.json` — só configura a função (`maxDuration`) keyed por `server/app.py`.
- `.vercelignore` — manda só o backend Python (sem viewer/venv/dados/grafo).
- `requirements.txt` — dependências pro `vercel dev`/pip local (espelha o `pyproject.toml`).

> Não precisa de pasta `api/` nem de `rewrites` — o `entrypoint` do `pyproject.toml` cuida disso.

> ⚠️ O deploy precisa da **sua conta Vercel** (o login é no navegador). Eu não consigo
> fazer isso daqui — siga os passos abaixo, é rápido.

## 1. Instalar a CLI (uma vez)
```bash
npm i -g vercel
```

## 2. Login e criar o projeto (na RAIZ do repo)
```bash
cd "automação ifood"
vercel login          # abre o navegador
vercel link           # cria/associa o projeto — Root Directory = a RAIZ do repo (NÃO a viewer/)
```

## 3. Definir as variáveis de ambiente (OBRIGATÓRIO antes do deploy)
O app lê o `.env` local, mas na Vercel elas vêm das **Environment Variables** do projeto.
Sem elas, a função quebra no boot. Defina para **Production** (dashboard da Vercel →
Settings → Environment Variables, ou `vercel env add <NOME> production`):

| Variável | Pra quê |
|---|---|
| `IFOOD_CLIENT_ID` | auth iFood (obrigatória) |
| `IFOOD_CLIENT_SECRET` | auth iFood (obrigatória) |
| `IFOOD_MERCHANT_ID` | merchant sandbox (obrigatória) |
| `SUPABASE_URL` | banco (pedidos/eventos) |
| `SUPABASE_SERVICE_ROLE_KEY` | banco (escrita server-side) |
| `SUPABASE_ANON_KEY` | login de usuário |
| `VIEWER_ORIGIN` | CORS — a URL do seu viewer (ex: `https://seu-viewer.vercel.app`) |
| `FOOD99_APP_ID` / `FOOD99_APP_SECRET` | só se for usar as rotas do 99Food na Vercel |

Os valores estão no seu `.env` local (que **não** vai pro git). É só copiar.

## 4. Deploy
```bash
vercel --prod
```
No fim ele imprime a URL, algo como `https://automacao-ifood-xxxx.vercel.app`.

## 5. Testar
```bash
curl https://SEU-PROJETO.vercel.app/webhook/ifood
# -> {"status":"ok"}
```

## 6. Registrar no portal do iFood
No Portal do Desenvolvedor → sua Aplicação → configuração de **Webhook**, cole:
```
https://SEU-PROJETO.vercel.app/webhook/ifood
```
Essa URL **não muda mais**. Depois crie um pedido de teste no sandbox → ele cai no KDS.

## Observações
- **Polling vs webhook:** os dois caminhos usam o mesmo pipeline. Na Vercel (serverless)
  o **webhook é o modo certo** — não precisa de processo rodando 24/7. O polling contínuo
  precisaria de um worker/cron (a fazer, se um dia quiser).
- **Frontend (viewer):** continua sendo um deploy separado (a pasta `viewer/`). Pra ele
  falar com este backend, aponte a URL da API do viewer pra `https://SEU-PROJETO.vercel.app`.
- **Assinatura do webhook:** hoje não valido o header `x-ifood-signature`. Se quiser, adiciono
  a validação HMAC com o `IFOOD_CLIENT_SECRET`.
