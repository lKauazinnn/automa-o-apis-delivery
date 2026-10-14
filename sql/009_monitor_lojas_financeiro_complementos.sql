-- Rode no SQL Editor do Supabase, depois da 008.
-- Três coisas novas:
--   1. Monitor de loja aberta/fechada: `status_lojas` (estado atual de cada loja, uma linha por
--      loja) + `status_lojas_historico` (uma linha a cada MUDANÇA de estado — abriu, fechou, por quê).
--   2. `monitor_heartbeat`: o worker contínuo (worker/monitor.py) grava aqui a cada ciclo. O painel
--      usa pra mostrar "monitor ativo/parado", e o backend pra não duplicar o polling de pedidos
--      quando o worker já está rodando.
--   3. `complementos`: o iFood devolve `options: []` vazio ao listar grupos de complementos, então
--      guardamos aqui cada complemento criado pelo painel, pra ele não sumir da tela ao recarregar.

create table if not exists public.status_lojas (
  merchant_id text primary key references public.lojas(merchant_id) on delete cascade,
  plataforma text not null default 'ifood',
  aberta boolean,                       -- null = não deu pra consultar
  estado text,                          -- OK / WARNING / CLOSED / ERROR (iFood) ou sub_biz_status (99)
  motivo text,                          -- texto curto do motivo ("Gestor de Pedidos desconectado")
  detalhes jsonb,                       -- resposta crua da plataforma
  verificado_em timestamptz not null default now(),
  mudou_em timestamptz not null default now()
);

create table if not exists public.status_lojas_historico (
  id uuid primary key default gen_random_uuid(),
  merchant_id text not null references public.lojas(merchant_id) on delete cascade,
  plataforma text not null default 'ifood',
  aberta boolean,
  estado text,
  motivo text,
  em timestamptz not null default now()
);

create index if not exists status_lojas_historico_merchant_idx on public.status_lojas_historico (merchant_id, em desc);

create table if not exists public.monitor_heartbeat (
  id text primary key,                  -- nome do worker (ex: 'monitor')
  ultimo_ping timestamptz not null default now(),
  info jsonb
);

create table if not exists public.complementos (
  product_id text primary key,
  option_id text,
  merchant_id text not null,
  grupo_id text not null,
  nome text not null,
  preco numeric,
  codigo_pdv text,
  status text not null default 'AVAILABLE',
  imagem_path text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists complementos_grupo_idx on public.complementos (merchant_id, grupo_id);

alter table public.status_lojas enable row level security;
alter table public.status_lojas_historico enable row level security;
alter table public.monitor_heartbeat enable row level security;
alter table public.complementos enable row level security;
-- Sem nenhuma policy: só o backend (service_role) lê/escreve. Igual às outras tabelas.
