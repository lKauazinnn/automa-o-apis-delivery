-- Rode isso uma vez no SQL Editor do Supabase, depois de 001_criar_tabela_auditoria.sql.
-- Guarda o valor antes/depois em alterações de preço e código PDV, pra tela de Auditoria
-- mostrar "de R$ 64,90 → R$ 68,90" em vez de só o valor novo.

alter table public.auditoria add column if not exists valor_de text not null default '';
alter table public.auditoria add column if not exists valor_para text not null default '';
