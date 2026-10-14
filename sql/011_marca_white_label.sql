-- Rode no SQL Editor do Supabase, depois da 010.
-- White-label: a marca da empresa cliente (nome, cor de destaque e logo) que o painel mostra.
-- Uma linha só (id = 1). Sem linha, o painel usa MARCA_NOME/MARCA_COR do .env ou o padrão PausaFast.

create table if not exists public.marca (
  id int primary key default 1 check (id = 1),
  nome text not null,
  cor text not null,                    -- hex #RRGGBB
  logo text,                            -- data URL (png/svg/jpeg/webp), até ~300 KB
  atualizado_por text,
  atualizado_em timestamptz not null default now()
);

alter table public.marca enable row level security;
-- Sem nenhuma policy: só o backend (service_role) lê/escreve. Igual às outras tabelas.
