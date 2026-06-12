import { TeamMember, DB } from '../types';

/**
 * Estrutura central de membros — helpers.
 * Regras:
 *  - Membro com `id` veio do login (Supabase profiles); o id é a chave primária.
 *  - Membro sem `id` foi adicionado manualmente; a chave é o nome.
 *  - `db.team` (string[]) é sempre derivado de `db.members` para manter
 *    compatibilidade com componentes legados (resp, assignee, destinatário...).
 */

export const MEMBER_COLOR_POOL = [
  '#6366F1', '#0EA5E9', '#A770EF', '#EC4899', '#F59E0B', '#14B8A6',
  '#84CC16', '#06B6D4', '#EF4444', '#8B5CF6', '#F97316', '#10B981',
];

export function pickMemberColor(existing: TeamMember[]): string {
  const used = new Set(existing.map(m => m.color).filter(Boolean));
  return MEMBER_COLOR_POOL.find(c => !used.has(c)) || MEMBER_COLOR_POOL[existing.length % MEMBER_COLOR_POOL.length];
}

/**
 * Insere/atualiza um membro preservando campos manuais já configurados
 * (cor, capacidade, coordenador, cargo) quando o incoming não os traz.
 */
export function upsertMember(list: TeamMember[], incoming: TeamMember): TeamMember[] {
  const idx = list.findIndex(m =>
    (incoming.id && m.id === incoming.id) ||
    (!incoming.id && !m.id && m.name === incoming.name) ||
    (incoming.id && !m.id && m.name === incoming.name) // membro manual "promovido" a login
  );

  if (idx >= 0) {
    const cur = list[idx];
    const merged: TeamMember = {
      ...cur,
      ...incoming,
      // não apaga configurações manuais quando o incoming vem sem elas
      role: incoming.role || cur.role,
      avatarUrl: incoming.avatarUrl || cur.avatarUrl,
      color: incoming.color || cur.color,
      capacity: incoming.capacity ?? cur.capacity,
      coordinator: incoming.coordinator ?? cur.coordinator,
      email: incoming.email || cur.email,
      source: incoming.id ? 'login' : (cur.source || incoming.source || 'manual'),
    };
    if (JSON.stringify(merged) === JSON.stringify(cur)) return list;
    const next = [...list];
    next[idx] = merged;
    return next;
  }

  return [...list, {
    color: pickMemberColor(list),
    capacity: 10,
    coordinator: false,
    source: incoming.id ? 'login' : 'manual',
    ...incoming,
  }];
}

export function removeMember(list: TeamMember[], name: string): TeamMember[] {
  return list.filter(m => m.name !== name);
}

export function deriveTeam(members: TeamMember[]): string[] {
  return Array.from(new Set(members.map(m => m.name).filter(Boolean)));
}

export function getMember(db: Pick<DB, 'members'>, name: string): TeamMember | undefined {
  return (db.members || []).find(m => m.name === name);
}

/**
 * Normaliza o estado: garante que todo nome em team exista como membro
 * (migra o legado) e que team seja exatamente os nomes de members.
 * Retorna null quando nada precisa mudar (evita loops de setState).
 */
export function normalizeMembers(db: DB): Pick<DB, 'members' | 'team'> | null {
  let members = db.members || [];

  for (const name of db.team || []) {
    if (!members.some(m => m.name === name)) {
      members = upsertMember(members, { name, source: 'manual' });
    }
  }

  const team = deriveTeam(members);
  const teamChanged = team.length !== (db.team || []).length || team.some((n, i) => n !== db.team[i]);
  const membersChanged = members !== (db.members || []);

  if (!teamChanged && !membersChanged) return null;
  return { members, team };
}
