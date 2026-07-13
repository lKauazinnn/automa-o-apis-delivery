-- Rode isso uma vez no SQL Editor do Supabase, depois de 001_criar_tabela_auditoria.sql.
-- Cria a tabela de perfis (nome + papel) ligada 1:1 com auth.users, e um trigger que
-- preenche o perfil sozinho assim que um convite é aceito (ou um usuário é criado).

create table if not exists public.perfis (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  nome text not null,
  papel text not null default 'operador' check (papel in ('administrador', 'gerente', 'operador')),
  criado_em timestamptz not null default now()
);

alter table public.perfis enable row level security;

-- Cada usuário logado só enxerga o próprio perfil (id = auth.uid()). Ninguém, nem usuário
-- comum, lê a lista inteira por aqui — isso só o backend faz, com a service_role key.
drop policy if exists "usuario le proprio perfil" on public.perfis;
create policy "usuario le proprio perfil" on public.perfis
  for select using (auth.uid() = id);

-- Ao convidar alguém (POST /auth/v1/invite com data: {nome, papel}), o Supabase cria a
-- linha em auth.users; esse trigger cria o perfil correspondente automaticamente.
create or replace function public.lidar_novo_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.perfis (id, email, nome, papel)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'nome', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'papel', 'operador')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists ao_criar_usuario on auth.users;
create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function public.lidar_novo_usuario();

-- Bootstrap do primeiro administrador (só precisa fazer isso 1x, manualmente):
-- 1. No Dashboard do Supabase: Authentication > Users > Add user > Invite.
-- 2. Depois que a linha aparecer em auth.users (e o perfil for criado pelo trigger acima),
--    rode substituindo pelo seu e-mail:
--
-- update public.perfis set papel = 'administrador' where email = 'seu-email@aqui.com';
