import { supabase } from '../lib/supabase';
import { Project, Company, Viability, Discipline, TeamMember } from '../types';

/**
 * Persistência do workspace na tabela `public.workspace_items` do Supabase.
 * Cada linha guarda um item do banco local: id = "<kind>:<key>".
 * Rode `supabase_setup.sql` (raiz do projeto) no SQL Editor do Supabase para criar a tabela.
 * Se a tabela não existir ou o usuário não estiver autenticado, tudo aqui vira no-op silencioso
 * e o app continua funcionando só com IndexedDB + Realtime.
 */

export interface WorkspaceSnapshot {
  projects: Project[];
  companies: Company[];
  viabilities: Viability[];
  team?: string[];
  members?: TeamMember[];
  disciplines?: Discipline[];
  lods?: string[];
}

let available: boolean | null = null;

function markUnavailable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const msg = String(error.message || '');
  if (error.code === '42P01' || error.code === 'PGRST205' || msg.includes('workspace_items')) {
    if (available !== false) {
      available = false;
      console.warn(
        '[Supabase] Tabela workspace_items não encontrada — persistência em nuvem desativada. ' +
        'Execute supabase_setup.sql no SQL Editor do Supabase para ativá-la.'
      );
    }
    return true;
  }
  return false;
}

async function hasSession(): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return !!session;
  } catch {
    return false;
  }
}

export async function fetchWorkspaceSnapshot(): Promise<WorkspaceSnapshot | null> {
  if (available === false) return null;
  if (!(await hasSession())) return null;
  try {
    const { data, error } = await supabase.from('workspace_items').select('kind, data');
    if (error) {
      if (!markUnavailable(error)) console.warn('[Supabase] Falha ao carregar workspace:', error.message);
      return null;
    }
    available = true;
    const snap: WorkspaceSnapshot = { projects: [], companies: [], viabilities: [] };
    for (const row of data || []) {
      switch (row.kind) {
        case 'project': snap.projects.push(row.data); break;
        case 'company': snap.companies.push(row.data); break;
        case 'viability': snap.viabilities.push(row.data); break;
        case 'team': snap.team = row.data; break;
        case 'members': snap.members = row.data; break;
        case 'disciplines': snap.disciplines = row.data; break;
        case 'lods': snap.lods = row.data; break;
      }
    }
    return snap;
  } catch (err) {
    console.warn('[Supabase] Erro inesperado ao carregar workspace:', err);
    return null;
  }
}

export async function upsertWorkspaceItem(kind: string, key: string | number, data: unknown): Promise<void> {
  if (available === false) return;
  if (!(await hasSession())) return;
  try {
    const { error } = await supabase.from('workspace_items').upsert({
      id: `${kind}:${key}`,
      kind,
      data,
      updated_at: new Date().toISOString(),
    });
    if (error && !markUnavailable(error)) {
      console.warn(`[Supabase] Falha ao salvar ${kind}:${key}:`, error.message);
    }
  } catch (err) {
    console.warn(`[Supabase] Erro inesperado ao salvar ${kind}:${key}:`, err);
  }
}

export async function deleteWorkspaceItem(kind: string, key: string | number): Promise<void> {
  if (available === false) return;
  if (!(await hasSession())) return;
  try {
    const { error } = await supabase.from('workspace_items').delete().eq('id', `${kind}:${key}`);
    if (error && !markUnavailable(error)) {
      console.warn(`[Supabase] Falha ao remover ${kind}:${key}:`, error.message);
    }
  } catch (err) {
    console.warn(`[Supabase] Erro inesperado ao remover ${kind}:${key}:`, err);
  }
}
