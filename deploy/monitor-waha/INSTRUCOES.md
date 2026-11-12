# Subir o monitor do PausaFast junto do WAHA

Instruções para o Claude Code que está no projeto do **WAHA** (o Docker Compose da automação
de chamados). Leia tudo antes de começar e confirme com o usuário antes de reiniciar o WAHA.

## O que é e por que aqui

O PausaFast (painel de pausas iFood/99Food) tem um **monitor** (`worker/monitor.py`) que precisa
rodar 24h. A cada ciclo ele:

- verifica se cada loja está **aberta ou fechada** (iFood e 99Food) e grava no Supabase;
- quando uma loja **fecha ou reabre**, manda aviso no **WhatsApp** para os números de
  `ALERTA_WHATSAPP_NUMEROS` (hoje: Kauã e Rodrigo; os números estão só no `.env`);
- devolve ao cardápio os itens com **pausa programada vencida**;
- faz o polling de pedidos do iFood (mantém a loja iFood "conectada").

O aviso sai pelo **WAHA**, na sessão `PAUSAFAST` (a mesma já usada aqui). Rodando dentro do
mesmo Docker Compose, o monitor chama `http://waha:3000` pela rede interna. **Não exponha o WAHA
na internet** por causa disso.

## Passo a passo

1. **Código.** Ao lado da pasta deste projeto (ou onde o usuário preferir), clone o repositório:

   ```bash
   git clone https://github.com/lKauazinnn/automa-o-apis-delivery.git
   ```

   Se já existir, só `git pull` na branch `main`.

2. **Segredos.** Peça ao usuário o arquivo **`.env` do PausaFast** (está na máquina principal,
   em `automa-o-apis-delivery/.env`) e coloque na raiz do repositório clonado. Ele tem as
   chaves do Supabase, iFood e 99Food e os números dos avisos. **Nunca commite esse arquivo**
   (ele já está no `.gitignore`). Não peça o conteúdo no chat: o usuário copia o arquivo.

3. **Compose.** Abra o `docker-compose.yml` deste projeto (o que tem o serviço `waha`) e cole,
   dentro de `services:`, o bloco de
   `automa-o-apis-delivery/deploy/monitor-waha/servico-pausafast-monitor.yml`. Confira:
   - o nome do serviço do WAHA é `waha` (se for outro, ajuste `WAHA_URL` e `depends_on`);
   - `PAUSAFAST_REPO` aponta pro repositório clonado, **relativo à pasta do compose** (padrão
     `../automa-o-apis-delivery`). Pode definir `PAUSAFAST_REPO=...` no `.env` do compose;
   - `WAHA_API_KEY` e `WAHA_SESSION` já existem no `.env` deste projeto (o compose interpola).

4. **Build e teste antes de ligar:**

   ```bash
   docker compose build pausafast-monitor
   docker compose run --rm pausafast-monitor python worker/testar_alerta.py
   ```

   O esperado: `Sessão PAUSAFAST: HTTP 200 · WORKING`, um `chatId` para cada número e
   `enviado` para os dois. **Pergunte ao usuário se as duas mensagens de teste chegaram.**
   O `chatId` vem do próprio WhatsApp; se o do Rodrigo vier com um 9 a mais depois do DDD,
   está certo e o envio já usa esse.

5. **Ligar de vez:**

   ```bash
   docker compose up -d pausafast-monitor
   docker compose logs -f --tail=50 pausafast-monitor
   ```

   Deve aparecer `Monitor iniciado (polling 30s, status 60s).` e, a cada minuto, nenhum erro.

6. **Conferir no painel** (https://pausa-fast.vercel.app → Status das lojas): o aviso
   "Monitor de status desligado" some em até 1 minuto e o horário da última verificação passa
   a atualizar sozinho.

## Problemas comuns

| Sintoma | Causa provável |
|---|---|
| `HTTP 401` na sessão | `WAHA_API_KEY` errada no compose |
| Sessão não está `WORKING` | WhatsApp desconectado: reconectar a sessão `PAUSAFAST` no dashboard do WAHA |
| `Não consegui falar com o WAHA` | serviço não se chama `waha` ou o monitor está em outra rede |
| `numberExists: false` / "não tem WhatsApp" | número errado em `ALERTA_WHATSAPP_NUMEROS` (no `.env` do PausaFast) |
| `SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY não configurados` | `.env` do PausaFast não foi copiado ou o caminho do `env_file` está errado |
| `rodou a migration 009?` no heartbeat | tabelas do monitor faltando no Supabase: avisar o usuário |

## Não fazer

- Não rode **dois** monitores (nem aqui e no PC principal ao mesmo tempo): os avisos duplicariam.
- Não exponha a porta do WAHA nem mude a configuração da sessão `PAUSAFAST`: ela também atende
  a automação de chamados.
- Não mexa nas variáveis do Vercel: o painel e a API já estão configurados.

## Comportamento esperado (avisar o usuário)

Lojas do **99Food** que fecham no fim do expediente vão gerar "Loja FECHADA" à noite e
"Loja REABERTA" de manhã: o 99 não diz se o fechamento foi por horário. Se isso incomodar, a
sessão do Claude no projeto do PausaFast pode adicionar um horário de silêncio.
