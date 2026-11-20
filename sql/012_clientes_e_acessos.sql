-- Rode no SQL Editor do Supabase, depois da 011.
-- Multi-cliente: cada loja pertence a UM cliente (empresa: Caju, ...) e cada usuário só enxerga
-- as lojas em que tem acesso, com um papel POR LOJA (pode ser gerente numa e operador noutra).
-- Quem tem acesso a lojas de dois clientes vê as duas, mas os dados continuam separados por loja.
--   - clientes:  a empresa; guarda também a marca (white-label) dela.
--   - lojas.cliente_id: dono da loja.
--   - acessos:   usuário × loja, com o papel naquela loja. Sem linha = sem acesso.
--   - perfis.super_admin: dono da plataforma — vê todas as lojas como administrador e é o único
--     que cria cliente/loja/usuário e dá acesso (pela CLI scripts/gerenciar.py ou pelo painel).
-- `perfis.papel` deixa de valer pra permissão (fica só como histórico).

create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),  -- usado no link do login: ?cliente=<slug>
  marca_nome text,
  marca_cor text,                       -- hex #RRGGBB
  marca_logo text,                      -- data URL (png/svg/jpeg/webp), até ~300 KB
  criado_em timestamptz not null default now()
);

alter table public.clientes enable row level security;

alter table public.lojas
  add column if not exists cliente_id uuid references public.clientes (id) on delete restrict;
create index if not exists lojas_cliente_idx on public.lojas (cliente_id);

alter table public.perfis
  add column if not exists super_admin boolean not null default false;

create table if not exists public.acessos (
  usuario_id uuid not null references public.perfis (id) on delete cascade,
  loja_id uuid not null references public.lojas (id) on delete cascade,
  papel text not null check (papel in ('administrador', 'gerente', 'operador')),
  criado_em timestamptz not null default now(),
  primary key (usuario_id, loja_id)
);
create index if not exists acessos_loja_idx on public.acessos (loja_id);

alter table public.acessos enable row level security;
-- Sem nenhuma policy: só o backend (service_role) lê/escreve. Igual às outras tabelas.

-- ---------------------------------------------------------------------------------------------
-- Migração dos dados que já existem: tudo o que está cadastrado hoje é da Caju.
-- A marca salva na tabela `marca` (011) vira a marca da Caju; cada usuário ganha acesso a todas
-- as lojas atuais com o papel que já tinha — ninguém perde nem ganha acesso nesta migração.
insert into public.clientes (nome, slug, marca_nome, marca_cor, marca_logo)
select 'Caju', 'caju', m.nome, m.cor, m.logo
from (select 1) as um
left join public.marca m on m.id = 1
on conflict (slug) do nothing;

update public.lojas
set cliente_id = (select id from public.clientes where slug = 'caju')
where cliente_id is null;

alter table public.lojas alter column cliente_id set not null;

insert into public.acessos (usuario_id, loja_id, papel)
select p.id, l.id, p.papel
from public.perfis p
cross join public.lojas l
on conflict (usuario_id, loja_id) do nothing;

-- Por fim, marque você como super admin (troque o e-mail) — ou pela CLI:
--   python scripts/gerenciar.py super-admin seu-email@aqui.com
-- update public.perfis set super_admin = true where email = 'seu-email@aqui.com';
