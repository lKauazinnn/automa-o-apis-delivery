-- Rode isso uma vez no SQL Editor do seu projeto Supabase (https://supabase.com/dashboard/project/_/sql/new).
-- Cria a tabela que passa a guardar a auditoria do painel (antes era data/auditoria.csv local).

create table if not exists public.auditoria (
  id bigint generated always as identity primary key,
  criado_em timestamptz not null default now(),
  operador text not null default 'desconhecido',
  acao text not null,
  item_id text not null default '',
  codigo_pdv text not null default '',
  nome text not null default '',
  detalhe text not null default ''
);

create index if not exists auditoria_criado_em_idx on public.auditoria (criado_em desc);

-- RLS ligado e sem nenhuma policy: só quem usa a service_role key (o backend) consegue
-- ler/gravar. Ninguém com a chave anon/publishable acessa essa tabela, nem por engano.
alter table public.auditoria enable row level security;
