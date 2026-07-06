import { supabase } from './supabase';
import { DB, Project, Company, Discipline, Viability, TeamMember } from '../types';
import { INITIAL_DB } from '../constants';

/**
 * Persistência do workspace inteiro (projetos, empresas, viabilidades,
 * disciplinas, lods, membros e seleção ativa) na tabela `workspace_items`
 * do Supabase (ver supabase_setup.sql) — substitui o IndexedDB por-usuário
 * que cada navegador mantinha isolado. Agora todo mundo que faz login lê e
 * escreve o MESMO workspace compartilhado da equipe.
 *
 * Cada linha é `{ id: "<kind>:<key>", kind, data }` — uma linha por
 * projeto/empresa/viabilidade, e uma linha "singleton" para
 * disciplinas/lods/membros/seleção-ativa. Isso permite que dois usuários
 * editando projetos DIFERENTES ao mesmo tempo não sobrescrevam um ao
 * outro (cada projeto é sua própria linha), e dá ao Postgres Realtime
 * eventos por entidade em vez de um blob monolítico.
 */

interface WorkspaceRow {
  id: string;
  kind: string;
  data: any;
}

const DISCIPLINES_ID = 'disciplines:main';
const LODS_ID = 'lods:main';
const MEMBERS_ID = 'team:main';
const META_ID = 'meta:main';

interface MetaData {
  activeLod?: string;
  activeCompanyId?: number | null;
  activeProjectId?: number | null;
}

/** Lê todas as linhas e reconstrói o DB inteiro. Retorna null se a tabela ainda não tem nenhuma linha (nunca migrada). */
export async function loadWorkspace(): Promise<DB | null> {
  const { data, error } = await supabase.from('workspace_items').select('id, kind, data');
  if (error) throw error;
  if (!data || data.length === 0) return null;

  const rows = data as WorkspaceRow[];
  const projects: Project[] = [];
  const companies: Company[] = [];
  const viabilities: Viability[] = [];
  let disciplines: Discipline[] = INITIAL_DB.disciplines;
  let lods: string[] = INITIAL_DB.lods;
  let members: TeamMember[] = [];
  let meta: MetaData = {};

  for (const row of rows) {
    switch (row.kind) {
      case 'project': projects.push(row.data); break;
      case 'company': companies.push(row.data); break;
      case 'viability': viabilities.push(row.data); break;
      case 'disciplines': disciplines = row.data; break;
      case 'lods': lods = row.data; break;
      case 'team': members = row.data; break;
      case 'meta': meta = row.data || {}; break;
      default: break;
    }
  }

  return {
    activeLod: meta.activeLod ?? INITIAL_DB.activeLod,
    activeCompanyId: meta.activeCompanyId ?? null,
    activeProjectId: meta.activeProjectId ?? null,
    lods,
    companies,
    disciplines,
    projects,
    team: [], // recalculado a partir de members pelo efeito normalizeMembers já existente no AppContext
    members,
    viabilities,
  };
}

function metaOf(db: DB): MetaData {
  return { activeLod: db.activeLod, activeCompanyId: db.activeCompanyId, activeProjectId: db.activeProjectId };
}

/**
 * Migração única: se a tabela workspace_items estiver vazia, publica o
 * conteúdo local atual (do IndexedDB do usuário que abriu primeiro após
 * esta atualização) como o workspace inicial compartilhado.
 */
export async function seedWorkspaceFromLocal(db: DB): Promise<void> {
  const rows: WorkspaceRow[] = [
    ...db.projects.map(p => ({ id: `project:${p.id}`, kind: 'project', data: p })),
    ...db.companies.map(c => ({ id: `company:${c.id}`, kind: 'company', data: c })),
    ...(db.viabilities || []).map(v => ({ id: `viability:${v.id}`, kind: 'viability', data: v })),
    { id: DISCIPLINES_ID, kind: 'disciplines', data: db.disciplines },
    { id: LODS_ID, kind: 'lods', data: db.lods },
    { id: MEMBERS_ID, kind: 'team', data: db.members || [] },
    { id: META_ID, kind: 'meta', data: metaOf(db) },
  ];
  const { error } = await supabase.from('workspace_items').upsert(rows, { onConflict: 'id' });
  if (error) throw error;
}

/**
 * Sincroniza o DB inteiro com a tabela: publica (upsert) tudo que existe
 * hoje e apaga as linhas de projeto/empresa/viabilidade que sumiram do
 * DB local (foram excluídos). Chamado no save debounced do AppContext.
 */
export async function syncWorkspace(db: DB, prevDb: DB | null): Promise<void> {
  const upserts: WorkspaceRow[] = [
    ...db.projects.map(p => ({ id: `project:${p.id}`, kind: 'project', data: p })),
    ...db.companies.map(c => ({ id: `company:${c.id}`, kind: 'company', data: c })),
    ...(db.viabilities || []).map(v => ({ id: `viability:${v.id}`, kind: 'viability', data: v })),
    { id: DISCIPLINES_ID, kind: 'disciplines', data: db.disciplines },
    { id: LODS_ID, kind: 'lods', data: db.lods },
    { id: MEMBERS_ID, kind: 'team', data: db.members || [] },
    { id: META_ID, kind: 'meta', data: metaOf(db) },
  ];

  const deletes: string[] = [];
  if (prevDb) {
    const curIds = new Set(upserts.map(r => r.id));
    const prevIds = [
      ...prevDb.projects.map(p => `project:${p.id}`),
      ...prevDb.companies.map(c => `company:${c.id}`),
      ...(prevDb.viabilities || []).map(v => `viability:${v.id}`),
    ];
    for (const id of prevIds) if (!curIds.has(id)) deletes.push(id);
  }

  const { error: upsertError } = await supabase.from('workspace_items').upsert(upserts, { onConflict: 'id' });
  if (upsertError) throw upsertError;

  if (deletes.length > 0) {
    const { error: deleteError } = await supabase.from('workspace_items').delete().in('id', deletes);
    if (deleteError) throw deleteError;
  }
}
