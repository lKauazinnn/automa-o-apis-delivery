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
-- merchant_id = o mesmo do IFOOD_MERCHANT_ID do .env (o merchant que as credenciais
-- realmente acessam). Usar um id que as credenciais NÃO acessam gera 403 ao abrir a loja.
insert into public.lojas (nome, merchant_id)
values ('Teste - Caju Integração', '0a9da4ae-905f-4f30-9527-36eba266dfc0')
on conflict (merchant_id) do nothing;
