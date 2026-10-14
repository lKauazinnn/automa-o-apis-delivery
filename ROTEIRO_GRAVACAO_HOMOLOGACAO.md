# Roteiro de gravação — Homologação iFood (Merchant + Catalog)

Pré-validação: **grave um vídeo por cenário, separado**, e envie os links ao suporte.
São **6 vídeos** (Merchant 1-3, Catalog 1-3). Reprovar custa **15 dias**, então **ensaie
cada cenário antes de gravar de verdade**.

## Pré-requisitos (antes de gravar qualquer coisa)

- Logado como **administrador** ou **gerente** — senão o grupo "Cardápio avançado"
  (Categorias, Complementos, Horário, Interrupções) nem aparece na barra lateral.
- Loja selecionada com o **badge iFood** (a "Teste - MULT COMERCIO...", sandbox).
- **Portal do Parceiro aberto em outra aba** — os cenários de Interrupção e Horário
  pedem "validar que reflete no Portal do Parceiro"; mostre o reflexo na hora.
- Gravador de tela pronto (plugin de navegador ou app).

## ⚠️ Armadilhas que reprovam (decoradas do teste ao vivo)

> **Atualização (2026-09-01, testado ao vivo contra a loja sandbox "Teste - MULT COMERCIO"):**
> a **leitura** do iFood no módulo Merchant é *eventualmente consistente* — a escrita é aceita na
> hora, mas o GET/lista leva de **~10s a mais de 40s** (variável) pra refletir. O sistema agora
> **trata isso sozinho** (o modal de horário reconsulta e confirma; o de interrupção reconsulta
> em silêncio; a remoção de interrupção re-tenta o cooldown). Ainda assim, na gravação **dê o
> tempo à interface** — espere a confirmação aparecer antes de seguir.

1. **Horário — a leitura demora (10-40s), não 5s.** Depois de "Salvar horário" o modal agora
   fica aberto mostrando **"Confirmando no iFood…"** e só troca pra **"Confirmado no iFood — o
   horário acima é exatamente o que está gravado"** quando o iFood devolve o dado certo. **Grave
   até aparecer essa confirmação verde** (é a "consulta" do cenário) — não precisa mais fechar e
   reabrir no susto. Se aparecer o aviso laranja de "propagação demorando", espere e reabra.
2. **Interrupção — espere a lista atualizar.** Ao criar/remover, a lista leva ~10-15s pra
   refletir; o modal reconsulta sozinho algumas vezes. A **remoção** logo após criar era
   recusada pelo iFood (cooldown de ~5s) — o backend agora **re-tenta automaticamente**, então o
   botão "Remover" funciona mesmo se você clicar rápido; só aguarde o spinner terminar.
3. **Complementos somem no refresh.** O iFood não devolve os complementos já criados
   no GET — eles só ficam visíveis na **mesma sessão** em que você criou. **NÃO
   recarregue a página** entre o Catalog Cenário 2 e o 3.
4. **Editar complemento EXIGE foto.** O iFood recusa a edição de opção sem imagem —
   sempre suba uma foto ao editar um complemento.
5. **"Detalhes" da loja só aparece na loja ativa.** Selecione a loja primeiro (isso
   fecha o modal), depois reabra "Gerenciar lojas" pra ver o botão "Detalhes".

---

# MÓDULO MERCHANT

## Cenário 1 — Informações da Loja
1. Clique no **nome da loja no topo** (ou **"Lojas"** na barra lateral) → abre **"Gerenciar lojas"**.
2. Mostre a **lista de lojas vinculadas** (nome, merchant_id, badge iFood, pill "Ativa").
3. Na loja ativa, clique **"Detalhes"** → abre **"Detalhes e disponibilidade da loja"**.
4. Mostre os **detalhes completos**: nome, razão social, "Status da conta", pill "Sandbox", Endereço.
5. Mostre **"Disponibilidade por canal"** (delivery · ifood-app → Disponível/Indisponível).
6. Feche. → **Grave o processo inteiro.**

## Cenário 2 — Interrupção na Loja  (Portal do Parceiro aberto ao lado)
1. Barra lateral → Cardápio avançado → **"Interrupções"**.
2. Em **"Nova interrupção"**: Motivo = `Teste homologação`; início e fim (ex: agora até +2h).
3. Clique **"Fechar loja nesse período"** → toast de sucesso; a pausa aparece na lista de ativas
   (pode levar alguns segundos — o modal reconsulta sozinho).
4. **Valide no Portal do Parceiro** que a loja consta pausada/fechada.
5. Volte ao sistema, clique a **lixeira "Remover interrupção"** → **aguarde o spinner** (o backend
   trata o cooldown do iFood sozinho); a interrupção some da lista em ~10-15s (a tela reconsulta).
6. **Valide no Portal do Parceiro** que a loja voltou. → **Grave tudo.**

## Cenário 3 — Horário de Funcionamento  ⚠️ (Portal do Parceiro aberto ao lado)
1. Barra lateral → Cardápio avançado → **"Horário de funcionamento"**.
2. Marque **Sábado**: `10:00` até `19:00` (1 faixa).
3. Marque **Domingo** e monte as **3 faixas**:
   - faixa 1: `09:00` até `12:00`
   - clique **"adicionar faixa"** → faixa 2: `13:00` até `16:00`
   - clique **"adicionar faixa"** → faixa 3: `17:00` até `23:00`
   *(O checklist só cita Sábado e Domingo; pode deixar os outros dias como "Fechado".)*
4. Clique **"Salvar horário"** → o modal **continua aberto** mostrando **"Confirmando no iFood…"**.
5. **Aguarde a confirmação** (pode levar de ~10s a ~40s) até aparecer o texto verde **"Confirmado
   no iFood — o horário acima é exatamente o que está gravado"**. Os campos acima já mostram
   Sábado (1 faixa) e Domingo (3 faixas) **relidos da API** — essa é a **consulta** do cenário,
   sem precisar fechar e reabrir. (Se vier o aviso laranja "propagação demorando", feche e reabra
   o modal após alguns segundos que ele mostra o horário persistido.)
6. **Valide no Portal do Parceiro**. → **Grave tudo** (a espera da confirmação faz parte da prova;
   se quiser, corte só o tempo morto durante a edição, nunca a confirmação).

---

# MÓDULO CATALOG

## Cenário 1 — Cadastro de Categoria e Criação de Item
1. Barra lateral → Cardápio avançado → **"Categorias"**.
2. Em **"Nova categoria"**: nome = `Teste Homologação` → **"Criar"** (aparece na lista). Feche o modal.
3. Barra lateral → **"Catálogo"** → botão **"Adicionar item"**.
4. **Nome do material** = `Produto Teste`.
5. **Categoria** = selecione `Teste Homologação`.
6. **Código PDV** = ex `1001`. **Preço (R$)** = ex `19,90`.
7. **Foto (opcional)** → suba uma imagem (o checklist exige foto).
8. Confira o checklist de requisitos ficar todo ✓ → **"Criar item"** → sucesso.
9. Mostre o **"Produto Teste"** no catálogo com status **Disponível** (= Ativo).
   *(O form não tem toggle "Ativo": o item já nasce disponível; mostre o badge "Disponível" na linha.)*
   → **Grave o processo completo.**

## Cenário 2 — Grupo de Complemento e Complementos  ⚠️ NÃO RECARREGUE A PÁGINA
1. Cardápio avançado → **"Complementos"**.
2. Em **"Novo grupo de complementos"**: nome = ex `Adicionais` → **"Criar"**.
3. **Expanda o grupo** (seta/chevron na linha).
4. **Complemento 1**: Nome = `Bacon`, Preço = `3,00`, suba **foto** → clique **"+"**.
5. **Complemento 2**: Nome = `Cheddar`, Preço = `2,00`, suba **foto** → clique **"+"**.
6. Os dois aparecem com nome, preço, foto e status ativo. → **Grave a criação completa.**
   ⚠️ Siga direto pro Cenário 3 **sem recarregar** (senão os complementos somem da tela).

## Cenário 3 — Alteração de Item e Complemento  ⚠️ (faça logo após o C2, sem refresh)
**Item:**
1. **"Catálogo"** → no **"Produto Teste"** clique o **lápis (Editar)**.
2. Altere o **nome** (ex `Produto Teste Editado`), troque a **foto**, mude o **preço** → **"Salvar alterações"**.
3. Na linha do item, use o **toggle** pra **pausar** (fica "Pausado").

**Complemento (o segundo, "Cheddar"):**
4. **"Complementos"** → expanda `Adicionais` → no complemento 2, **lápis "Editar complemento"**.
5. Altere o **nome**, troque a **foto** (obrigatória!), mude o **preço** → **check verde** pra salvar.
6. Clique **"Pausar opção"** no complemento. → **Grave tudo.**

---

## Limpeza (só DEPOIS de gravar todos os vídeos)
- Apague a categoria `Teste Homologação` e o grupo `Adicionais` pra não sujar o catálogo.

## Antes de enviar ao suporte
- [ ] 6 vídeos, um por cenário, mostrando o processo **completo dentro do sistema**.
- [ ] Reflexo no **Portal do Parceiro** visível nos cenários de Interrupção e Horário.
- [ ] Links dos vídeos prontos.

> Validado ao vivo contra o sandbox em 23/07: leituras de loja/disponibilidade/
> interrupções/catálogo OK, e o Horário com Sábado + Domingo (3 faixas) faz round-trip
> correto no iFood (a propagação do GET leva ~2-3s — ver armadilha #1).
