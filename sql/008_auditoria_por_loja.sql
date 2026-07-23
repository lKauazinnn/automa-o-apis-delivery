-- Rode no SQL Editor do Supabase, depois da 007.
-- Faz a auditoria ser POR LOJA, pra o dashboard não misturar histórico de lojas/plataformas
-- diferentes (ex: mostrar itens do Caju/iFood enquanto você está na loja do 99Food).

alter table public.auditoria
  add column if not exists merchant_id text;

-- Backfill: o histórico antigo (sem loja) é atribuído à 1ª loja iFood cadastrada (o Caju),
-- pra continuar aparecendo no dashboard dela e sumir das outras lojas.
update public.auditoria
set merchant_id = (
  select merchant_id from public.lojas where plataforma = 'ifood' order by criado_em asc limit 1
)
where merchant_id is null;

create index if not exists auditoria_merchant_idx on public.auditoria (merchant_id, criado_em desc);
