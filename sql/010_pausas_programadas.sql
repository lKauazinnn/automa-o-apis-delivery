-- Rode no SQL Editor do Supabase, depois da 009.
-- Pausas com motivo e prazo (inspirado em iFood / InstaDelivery / Consumer / Swfast):
--   - cada pausa feita pelo painel (item ou complemento, iFood ou 99) vira uma linha aqui;
--   - `volta_em` preenchido = pausa TEMPORÁRIA: o worker (worker/monitor.py) despausa sozinho
--     quando passa da hora; `volta_em` nulo = pausa MANUAL, só volta quando alguém reativar;
--   - `encerrada_em` preenchido = a pausa acabou (reativada à mão ou automaticamente).
-- A tela "Rupturas" lista as linhas com encerrada_em nulo.

create table if not exists public.pausas (
  id uuid primary key default gen_random_uuid(),
  merchant_id text not null,             -- loja na plataforma (merchant UUID iFood / app_shop_id 99)
  plataforma text not null default 'ifood',
  tipo text not null default 'item',     -- 'item' ou 'opcao' (complemento)
  alvo_id text not null,                 -- itemId (item) ou option id (complemento)
  grupo_id text,                         -- só pra complemento
  nome text,
  codigo_pdv text,
  motivo text,
  pausado_por text,
  pausado_em timestamptz not null default now(),
  volta_em timestamptz,                  -- null = manual (sem prazo)
  encerrada_em timestamptz,
  encerrada_por text,                    -- nome do operador ou 'automático'
  erro_reativacao text                   -- última falha ao tentar reativar sozinho
);

create index if not exists pausas_ativas_loja_idx on public.pausas (merchant_id) where encerrada_em is null;
create index if not exists pausas_vencendo_idx on public.pausas (volta_em) where encerrada_em is null and volta_em is not null;

alter table public.pausas enable row level security;
-- Sem nenhuma policy: só o backend (service_role) lê/escreve. Igual às outras tabelas.
