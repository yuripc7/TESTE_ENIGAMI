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

-- ============================================================
-- Controle de acesso: aprovação manual de novos usuários
-- ============================================================

-- Nova coluna — todo mundo que já está na equipe hoje entra aprovado
-- automaticamente (grandfather); só quem logar DEPOIS deste script fica
-- pendente até um coordenador aprovar.
alter table public.profiles add column if not exists approved boolean not null default false;
update public.profiles set approved = true;

-- Função que aprova/recusa um usuário. Roda com privilégio elevado
-- (security definer) mas só executa se quem chamou já for um coordenador
-- aprovado — a checagem de permissão fica dentro da função, não depende
-- de RLS de update em profiles (que continua restrito a "seu próprio
-- registro" pra edição normal de perfil).
create or replace function public.set_profile_approval(target_id uuid, is_approved boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and approved = true
      and role in ('Coordenador(a)', 'Diretor(a)', 'Gerente')
  ) then
    raise exception 'Não autorizado: apenas coordenadores/diretores/gerentes aprovados podem aprovar usuários.';
  end if;
  update public.profiles set approved = is_approved where id = target_id;
end;
$$;

grant execute on function public.set_profile_approval(uuid, boolean) to authenticated;

-- Workspace só é acessível pra quem já foi aprovado.
drop policy if exists "workspace_items_select" on public.workspace_items;
create policy "workspace_items_select" on public.workspace_items
  for select to authenticated using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.approved = true)
  );

drop policy if exists "workspace_items_insert" on public.workspace_items;
create policy "workspace_items_insert" on public.workspace_items
  for insert to authenticated with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.approved = true)
  );

drop policy if exists "workspace_items_update" on public.workspace_items;
create policy "workspace_items_update" on public.workspace_items
  for update to authenticated using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.approved = true)
  );

drop policy if exists "workspace_items_delete" on public.workspace_items;
create policy "workspace_items_delete" on public.workspace_items
  for delete to authenticated using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.approved = true)
  );
