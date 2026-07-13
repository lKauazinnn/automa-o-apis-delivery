-- Rode isso uma vez no SQL Editor do Supabase, depois de 001 e 002.
-- Antes, a lista de lojas vinha só de list_merchants() do iFood (o que a API achasse pras
-- credenciais do .env). Agora fica registrada aqui, pra dar pra cadastrar loja nova (com
-- nome bonito) mesmo que ela ainda não apareça pro iFood, e pra não depender só do que uma
-- única credencial de app enxerga.

create table if not exists public.lojas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  merchant_id text not null unique,
  criado_em timestamptz not null default now()
);

alter table public.lojas enable row level security;
-- Sem nenhuma policy: só o backend (service_role) lê/escreve. Igual às outras tabelas.

-- Mantém cadastrada a loja que já estava em uso (IFOOD_MERCHANT_ID do .env), pra não sumir
-- do seletor quando a tabela for criada.
insert into public.lojas (nome, merchant_id)
values ('Teste - Caju Integração', 'a1136885-5932-417c-bbac-86b184752495')
on conflict (merchant_id) do nothing;
