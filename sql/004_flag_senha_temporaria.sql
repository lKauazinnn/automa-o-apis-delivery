-- Rode isso uma vez no SQL Editor do Supabase, depois de 002_criar_tabela_perfis.sql.
-- Adiciona a flag que força o usuário a trocar a senha no primeiro login, quando um
-- administrador cria a conta ou redefine a senha por ele (server/app.py marca como true
-- nesses dois casos, e o front força a tela de troca de senha antes de liberar o painel).

alter table public.perfis add column if not exists senha_temporaria boolean not null default false;
