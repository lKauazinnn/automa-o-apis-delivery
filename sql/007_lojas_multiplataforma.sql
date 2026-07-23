-- Rode no SQL Editor do Supabase, depois das migrations anteriores.
-- Torna a tabela de lojas MULTI-PLATAFORMA (iFood + 99Food).
--
-- Antes: `merchant_id` guardava só o UUID do iFood. Agora:
--   - plataforma: 'ifood' (padrão, não quebra as lojas existentes) ou '99food'
--   - merchant_id: continua sendo o identificador da loja NA plataforma
--       * iFood  -> merchant UUID (ex: a1136885-5932-...)
--       * 99Food -> app_shop_id  (ex: 5764607576333878701)

alter table public.lojas
  add column if not exists plataforma text not null default 'ifood';

-- Garante que as lojas já cadastradas fiquem como iFood.
update public.lojas set plataforma = 'ifood' where plataforma is null;

-- Opcional: já deixa a loja de teste do 99Food cadastrada.
insert into public.lojas (nome, merchant_id, plataforma)
values ('pausefast (99Food teste)', '5764607576333878701', '99food')
on conflict (merchant_id) do nothing;
