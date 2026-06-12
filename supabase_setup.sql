-- ============================================================
-- ENIGAMI Dashboard — Persistência do workspace no Supabase
-- Execute este script no SQL Editor do seu projeto Supabase
-- (Dashboard → SQL Editor → New query → colar → Run).
-- ============================================================

-- Colunas extras no profiles: cargo e tempo de empresa de cada membro
-- (a estrutura central de membros do app lê esses campos para todos os logins).
alter table public.profiles add column if not exists role text;
alter table public.profiles add column if not exists company_time text;

create table if not exists public.workspace_items (
  id text primary key,            -- "<kind>:<key>", ex.: "project:1718000000000"
  kind text not null,             -- project | company | viability | team | disciplines | lods
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.workspace_items enable row level security;

-- Qualquer usuário autenticado da equipe pode ler e escrever o workspace.
drop policy if exists "workspace_items_select" on public.workspace_items;
create policy "workspace_items_select" on public.workspace_items
  for select to authenticated using (true);

drop policy if exists "workspace_items_insert" on public.workspace_items;
create policy "workspace_items_insert" on public.workspace_items
  for insert to authenticated with check (true);

drop policy if exists "workspace_items_update" on public.workspace_items;
create policy "workspace_items_update" on public.workspace_items
  for update to authenticated using (true);

drop policy if exists "workspace_items_delete" on public.workspace_items;
create policy "workspace_items_delete" on public.workspace_items
  for delete to authenticated using (true);
