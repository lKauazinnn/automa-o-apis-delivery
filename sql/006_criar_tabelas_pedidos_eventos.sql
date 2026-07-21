-- Rode isso uma vez no SQL Editor do Supabase, depois de 001-005.
-- Suporte a Pedidos/KDS/Eventos: nenhuma dessas tabelas existia antes (o projeto só cobria
-- Merchant/Catalog). `pedidos`/`itens_pedido` guardam o que a Order API do iFood devolveu
-- (materializado localmente pra não depender de reconsultar o iFood a cada tela aberta);
-- `eventos_ifood` é o log bruto do polling (Events API), usado na tela de Eventos e pra montar
-- a linha do tempo de cada pedido.

create table if not exists public.pedidos (
  id uuid primary key default gen_random_uuid(),
  ifood_order_id text not null unique,
  merchant_id text not null references public.lojas(merchant_id),
  status text not null default 'NOVO' check (status in ('NOVO','CONFIRMADO','DESPACHADO','CONCLUIDO','CANCELADO')),
  tipo text not null default 'ENTREGA',
  pagamento text,
  cliente jsonb,
  total numeric,
  oculto_kds boolean not null default false,
  detalhes_brutos jsonb,
  recebido_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists pedidos_merchant_id_idx on public.pedidos (merchant_id);
create index if not exists pedidos_status_idx on public.pedidos (status);

create table if not exists public.itens_pedido (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos(id) on delete cascade,
  nome text not null,
  quantidade integer not null default 1,
  preco numeric,
  observacao text,
  complementos jsonb
);

create index if not exists itens_pedido_pedido_id_idx on public.itens_pedido (pedido_id);

create table if not exists public.eventos_ifood (
  id uuid primary key default gen_random_uuid(),
  merchant_id text not null references public.lojas(merchant_id),
  pedido_ifood_id text,
  tipo text not null,
  origem text not null default 'Consulta automática',
  tratado boolean not null default false,
  ack_enviado boolean not null default false,
  payload jsonb,
  recebido_em timestamptz not null default now()
);

create index if not exists eventos_ifood_merchant_id_idx on public.eventos_ifood (merchant_id);
create index if not exists eventos_ifood_pedido_ifood_id_idx on public.eventos_ifood (pedido_ifood_id);

alter table public.pedidos enable row level security;
alter table public.itens_pedido enable row level security;
alter table public.eventos_ifood enable row level security;
-- Sem nenhuma policy: só o backend (service_role) lê/escreve. Igual às outras tabelas.
