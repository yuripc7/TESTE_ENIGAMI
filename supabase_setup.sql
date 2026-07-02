-- ============================================================
-- ENIGAMI Dashboard — Setup completo do Supabase (idempotente)
-- Execute este script no SQL Editor do seu projeto Supabase
-- (Dashboard → SQL Editor → New query → colar → Run).
-- Pode ser executado quantas vezes quiser sem quebrar nada.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. PROFILES — perfil de cada login (usado pela estrutura
--    central de membros do app: nome, avatar, cargo, tempo)
-- ────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text,
  avatar_url text,
  email text,
  created_at timestamptz not null default now()
);

-- Colunas extras (seguro rodar mesmo se já existirem)
alter table public.profiles add column if not exists role text;
alter table public.profiles add column if not exists company_time text;
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists created_at timestamptz default now();

alter table public.profiles enable row level security;

-- Toda a equipe autenticada enxerga os perfis (necessário para a
-- sincronização de membros); cada um edita apenas o próprio.
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select to authenticated using (true);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- Cria o perfil automaticamente quando um usuário se cadastra,
-- para que ele apareça na equipe (db.members) sem passo manual.
-- Se o e-mail estiver no cadastro da empresa (company_emails), o cargo
-- registrado lá já entra no perfil — o histórico fica vinculado ao grupo.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  invited_role text;
begin
  select ce.role into invited_role
  from public.company_emails ce
  where lower(ce.email) = lower(new.email)
  limit 1;

  insert into public.profiles (id, name, email, avatar_url, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data ->> 'avatar_url',
    invited_role
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ────────────────────────────────────────────────────────────
-- 1b. COMPANY_EMAILS — cadastro dos e-mails da empresa.
--     Registre aqui (ou pela Matriz do app) todos os e-mails do
--     escritório: cada um vira membro da equipe, e quando a pessoa
--     criar o login com aquele e-mail o perfil conecta sozinho e
--     todo o histórico do workspace fica salvo para o grupo.
-- ────────────────────────────────────────────────────────────
create table if not exists public.company_emails (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text,                       -- nome de exibição sugerido
  role text,                       -- cargo (Arquiteto(a), Coordenador(a)...)
  company text,                    -- nome da empresa/escritório
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists company_emails_email_idx
  on public.company_emails (lower(email));

alter table public.company_emails enable row level security;

drop policy if exists "company_emails_select" on public.company_emails;
create policy "company_emails_select" on public.company_emails
  for select to authenticated using (true);

drop policy if exists "company_emails_insert" on public.company_emails;
create policy "company_emails_insert" on public.company_emails
  for insert to authenticated with check (true);

drop policy if exists "company_emails_update" on public.company_emails;
create policy "company_emails_update" on public.company_emails
  for update to authenticated using (true);

drop policy if exists "company_emails_delete" on public.company_emails;
create policy "company_emails_delete" on public.company_emails
  for delete to authenticated using (true);

-- ────────────────────────────────────────────────────────────
-- 2. WORKSPACE_ITEMS — persistência do workspace compartilhado
--    (projetos, empresas, viabilidades, equipe, disciplinas...)
-- ────────────────────────────────────────────────────────────
create table if not exists public.workspace_items (
  id text primary key,            -- "<kind>:<key>", ex.: "project:1718000000000"
  kind text not null,             -- project | company | viability | team | members | disciplines | lods
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- Índices para carregamento por tipo e auditoria por data
create index if not exists workspace_items_kind_idx
  on public.workspace_items (kind);
create index if not exists workspace_items_updated_at_idx
  on public.workspace_items (updated_at desc);

-- updated_at automático em qualquer UPDATE (não depende do cliente)
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists workspace_items_touch on public.workspace_items;
create trigger workspace_items_touch
  before update on public.workspace_items
  for each row execute function public.touch_updated_at();

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

-- ────────────────────────────────────────────────────────────
-- 3. REALTIME — o app escuta INSERT/UPDATE em profiles para
--    sincronizar novos membros em tempo real.
-- ────────────────────────────────────────────────────────────
do $$
begin
  alter publication supabase_realtime add table public.profiles;
exception
  when duplicate_object then null; -- já estava na publicação
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.workspace_items;
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.company_emails;
exception
  when duplicate_object then null;
end;
$$;
