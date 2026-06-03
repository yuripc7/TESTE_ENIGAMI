/* global window */
// Agenda — modelo de dados, paletas e helpers (v2)

const DAYS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];
const DAY_SHORT = { 'Segunda': 'SEG', 'Terça': 'TER', 'Quarta': 'QUA', 'Quinta': 'QUI', 'Sexta': 'SEX' };
const DAY_IDX = { 'Segunda': 0, 'Terça': 1, 'Quarta': 2, 'Quinta': 3, 'Sexta': 4 };

// ---- Projetos (cor por projeto) ----
const PROJECTS = [
  { name: 'Miguel Res.',          code: 'MIG', color: '#FF6B4A' },
  { name: 'Sky Green',            code: 'SKY', color: '#10B981' },
  { name: 'Itajaí - Viabilidade', code: 'ITJ', color: '#A770EF' },
  { name: 'Geral',                code: 'GER', color: '#0EA5E9' },
];

// ---- Colaboradores (cor única + capacidade semanal em pontos de esforço) ----
// coordinator: true  → pode validar pontos de coordenação e tem sua própria configuração/agenda
const PEOPLE = [
  { name: 'Yuri',     color: '#6366F1', role: 'Coord. BIM',             capacity: 13, coordinator: true },
  { name: 'Mariana',  color: '#0EA5E9', role: 'Coord. Projetos',        capacity: 13, coordinator: true },
  { name: 'Vergílio', color: '#A770EF', role: 'Coord. Compatibilização',capacity: 13, coordinator: true },
  { name: 'Lourrane', color: '#EC4899', role: 'Projeto Legal',    capacity: 10 },
  { name: 'Cassio',   color: '#F59E0B', role: 'Viabilidade',      capacity: 10 },
  { name: 'Isabela',  color: '#14B8A6', role: 'Modelagem',        capacity: 10 },
  { name: 'Isa',      color: '#F97316', role: 'Modelagem',        capacity: 10 },
  { name: 'Ju',       color: '#84CC16', role: 'Documentação',     capacity: 10 },
  { name: 'Kauna',    color: '#06B6D4', role: 'Projeto Legal',    capacity: 10 },
  { name: 'Equipe',   color: '#64748B', role: 'Multidisciplinar', capacity: 16 },
];

// ---- Disciplinas BIM (código + cor, padrão ENIGAMI) ----
const DISCIPLINES = [
  { code: 'ARQ', name: 'Arquitetura',  color: '#F97316' },
  { code: 'EST', name: 'Estrutura',    color: '#8B5CF6' },
  { code: 'HID', name: 'Hidráulica',   color: '#0EA5E9' },
  { code: 'ELE', name: 'Elétrica',     color: '#EAB308' },
  { code: 'MEP', name: 'Instalações',  color: '#14B8A6' },
  { code: 'PCI', name: 'Incêndio',     color: '#EF4444' },
  { code: 'LEG', name: 'Legal/Pref.',  color: '#64748B' },
  { code: 'BIM', name: 'Coordenação',  color: '#6366F1' },
];

// ---- Status (não-binário) ----
const STATUSES = [
  { key: 'todo',   label: 'A fazer',     short: 'A FAZER',  pct: 0,   color: '#94A3B8' },
  { key: 'doing',  label: 'Em andamento',short: 'EM AND.',  pct: 50,  color: '#0EA5E9' },
  { key: 'review', label: 'Em revisão',  short: 'REVISÃO',  pct: 85,  color: '#EAB308' },
  { key: 'done',   label: 'Concluído',   short: 'CONCLUÍDO',pct: 100, color: '#10B981' },
];

// ---- Validação (pontos de coordenação) ----
const VALID_STATES = {
  pending:  { label: 'Aguardando', color: '#EAB308' },
  approved: { label: 'Aprovado',   color: '#10B981' },
  returned: { label: 'Devolvido',  color: '#EF4444' },
};

// ---- Lookups ----
function projColor(name) { const p = PROJECTS.find(p => p.name === name); return p ? p.color : '#9CA3AF'; }
function projCode(name)  { const p = PROJECTS.find(p => p.name === name); return p ? p.code : '—'; }
function person(name)    { return PEOPLE.find(p => p.name === name) || { name, color: '#94A3B8', role: '', capacity: 10 }; }
function isCoordinator(name) { const p = PEOPLE.find(p => p.name === name); return !!(p && p.coordinator); }
function coordinators()  { return PEOPLE.filter(p => p.coordinator); }
function discipline(code){ return DISCIPLINES.find(d => d.code === code) || null; }
function statusMeta(key) { return STATUSES.find(s => s.key === key) || STATUSES[0]; }
function initials(name) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

// ---- Progresso de uma tarefa (subtarefas têm prioridade sobre status) ----
function taskProgress(t) {
  if (t.subtasks && t.subtasks.length) {
    return Math.round(t.subtasks.filter(s => s.done).length / t.subtasks.length * 100);
  }
  return statusMeta(t.status || (t.completed ? 'done' : 'todo')).pct;
}
function isDone(t) { return (t.status === 'done') || (!t.status && t.completed); }
function taskWeight(t) { return (typeof t.weight === 'number' && t.weight > 0) ? t.weight : 1; }

// ---- Duração em dias (atividade pode ocupar mais de um dia) ----
function taskDuration(t) { const d = t.durationDays || 1; return d < 1 ? 1 : d; }
function startIdx(t) { return DAY_IDX[t.day] != null ? DAY_IDX[t.day] : 0; }
function endIdx(t) { return Math.min(startIdx(t) + taskDuration(t) - 1, 4); }
function spansDay(t, dayName) { const d = DAY_IDX[dayName]; return d >= startIdx(t) && d <= endIdx(t); }
function endDayName(t) { return DAYS[endIdx(t)]; }

// Avanço ponderado (por esforço) de uma lista
function weightedProgress(list) {
  if (!list.length) return 0;
  const tot = list.reduce((a, t) => a + taskWeight(t), 0);
  const acc = list.reduce((a, t) => a + taskWeight(t) * taskProgress(t), 0);
  return tot ? Math.round(acc / tot) : 0;
}

// ---- Datas / prazos ----
function ymd(d) { return d.toISOString().slice(0, 10); }
function parseYmd(s) { if (!s) return null; const [y, m, dd] = s.split('-').map(Number); return new Date(y, m - 1, dd); }
function isOverdue(t) {
  if (isDone(t) || !t.dueDate) return false;
  const due = parseYmd(t.dueDate); const today = new Date(); today.setHours(0, 0, 0, 0);
  return due < today;
}
function isDueToday(t) {
  if (isDone(t) || !t.dueDate) return false;
  return t.dueDate === ymd(new Date());
}

// ---- Semana ISO ----
function mondayOf(offset) {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const dow = now.getDay() === 0 ? 7 : now.getDay();
  const mon = new Date(now); mon.setDate(now.getDate() - (dow - 1) + offset * 7);
  return mon;
}
function weekKey(offset) { return ymd(mondayOf(offset)); }
function weekLabelFor(offset) {
  const mon = mondayOf(offset); const fri = new Date(mon); fri.setDate(mon.getDate() + 4);
  const M = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
  const p = (d) => String(d.getDate()).padStart(2, '0');
  return mon.getMonth() === fri.getMonth()
    ? `${p(mon)} – ${p(fri)} ${M[fri.getMonth()]}`
    : `${p(mon)} ${M[mon.getMonth()]} – ${p(fri)} ${M[fri.getMonth()]}`;
}
// Data (YYYY-MM-DD) de um dia da semana, dado o offset
function dateForDay(dayName, offset) {
  const mon = mondayOf(offset); const d = new Date(mon); d.setDate(mon.getDate() + (DAY_IDX[dayName] || 0));
  return ymd(d);
}
function todayName() { const map = { 1:'Segunda',2:'Terça',3:'Quarta',4:'Quinta',5:'Sexta' }; return map[new Date().getDay()] || null; }

// ===== Registros customizáveis (projetos / pessoas / disciplinas criados pelo usuário) =====
const CUSTOM_KEY = 'enigami_custom_v1';
const COLOR_POOL = ['#0EA5E9','#10B981','#A770EF','#EC4899','#F59E0B','#14B8A6','#6366F1','#EF4444','#8B5CF6','#84CC16','#F97316','#06B6D4'];
function loadCustom() {
  try { const c = JSON.parse(localStorage.getItem(CUSTOM_KEY)); if (c) return { projects: c.projects || [], people: c.people || [], disciplines: c.disciplines || [] }; } catch (e) {}
  return { projects: [], people: [], disciplines: [] };
}
function saveCustom(c) { try { localStorage.setItem(CUSTOM_KEY, JSON.stringify(c)); } catch (e) {} }
function pickColor(n) { return COLOR_POOL[n % COLOR_POOL.length]; }
function slugCode(name, taken) {
  const clean = name.replace(/[^a-zA-Zà-úÀ-Ú0-9 ]/g, '').trim().toUpperCase();
  const words = clean.split(/\s+/).filter(Boolean);
  let base = words.length >= 2 ? (words[0][0] + words[1][0] + (words[1][1] || words[0][1] || '')) : clean.slice(0, 3);
  base = (base || 'XXX').slice(0, 3);
  let code = base, i = 1;
  while (taken.includes(code)) { code = base.slice(0, 2) + (i++); }
  return code;
}

// aplica os customizados sobre as listas base (mutação in-place para refs existentes)
(function mergeCustom() {
  const c = loadCustom();
  c.projects.forEach(p => { if (!PROJECTS.some(x => x.name === p.name)) PROJECTS.push(p); });
  c.people.forEach(p => { if (!PEOPLE.some(x => x.name === p.name)) PEOPLE.push(p); });
  c.disciplines.forEach(d => { if (!DISCIPLINES.some(x => x.code === d.code)) DISCIPLINES.push(d); });
})();

function addProject(name) {
  name = (name || '').trim(); if (!name) return null;
  const existing = PROJECTS.find(p => p.name.toLowerCase() === name.toLowerCase());
  if (existing) return existing;
  const proj = { name, code: slugCode(name, PROJECTS.map(p => p.code)), color: pickColor(PROJECTS.length) };
  PROJECTS.push(proj);
  const c = loadCustom(); c.projects.push(proj); saveCustom(c);
  return proj;
}
function addPerson(name, role) {
  name = (name || '').trim(); if (!name) return null;
  const existing = PEOPLE.find(p => p.name.toLowerCase() === name.toLowerCase());
  if (existing) return existing;
  const p = { name, role: (role || '').trim() || 'Equipe', color: pickColor(PEOPLE.length + 3), capacity: 10 };
  PEOPLE.push(p);
  const c = loadCustom(); c.people.push(p); saveCustom(c);
  return p;
}
function addDiscipline(name) {
  name = (name || '').trim(); if (!name) return null;
  const code = slugCode(name, DISCIPLINES.map(d => d.code));
  const existing = DISCIPLINES.find(d => d.name.toLowerCase() === name.toLowerCase());
  if (existing) return existing;
  const d = { code, name, color: pickColor(DISCIPLINES.length + 1) };
  DISCIPLINES.push(d);
  const c = loadCustom(); c.disciplines.push(d); saveCustom(c);
  return d;
}

// ===== Gerenciamento de coordenadores (add / editar função / remover) =====
const ROSTER_KEY = 'enigami_roster_v1';
function loadRoster() { try { const r = JSON.parse(localStorage.getItem(ROSTER_KEY)); if (r) return { removed: r.removed || [], patch: r.patch || {} }; } catch (e) {} return { removed: [], patch: {} }; }
function saveRoster(r) { try { localStorage.setItem(ROSTER_KEY, JSON.stringify(r)); } catch (e) {} }

// aplica remoções/edições persistidas sobre PEOPLE (roda após mergeCustom)
(function applyRoster() {
  const r = loadRoster();
  Object.entries(r.patch).forEach(([name, p]) => {
    const person = PEOPLE.find(x => x.name === name);
    if (person) { if (p.role != null) person.role = p.role; if (p.coordinator != null) person.coordinator = p.coordinator; }
  });
  r.removed.forEach(name => { const i = PEOPLE.findIndex(x => x.name === name); if (i >= 0) PEOPLE.splice(i, 1); });
})();

function addCoordinator(name, role) {
  name = (name || '').trim(); if (!name) return null;
  const c = loadCustom(); const r = loadRoster();
  let p = PEOPLE.find(x => x.name.toLowerCase() === name.toLowerCase());
  if (p) { // promove pessoa existente a coordenador
    p.coordinator = true; if (role && role.trim()) p.role = role.trim();
    r.removed = r.removed.filter(n => n !== p.name);
    r.patch[p.name] = { ...(r.patch[p.name] || {}), coordinator: true, ...(role && role.trim() ? { role: role.trim() } : {}) };
    saveRoster(r);
    const cp = c.people.find(x => x.name === p.name); if (cp) { cp.coordinator = true; if (role && role.trim()) cp.role = role.trim(); saveCustom(c); }
    return p;
  }
  p = { name, role: (role || '').trim() || 'Coordenação', color: pickColor(PEOPLE.length + 3), capacity: 13, coordinator: true };
  PEOPLE.push(p); c.people.push(p); saveCustom(c);
  return p;
}
function updateCoordinatorRole(name, role) {
  const p = PEOPLE.find(x => x.name === name); if (!p) return;
  p.role = role;
  const r = loadRoster(); r.patch[name] = { ...(r.patch[name] || {}), role }; saveRoster(r);
  const c = loadCustom(); const cp = c.people.find(x => x.name === name); if (cp) { cp.role = role; saveCustom(c); }
}
function removeCoordinator(name) {
  const i = PEOPLE.findIndex(x => x.name === name); if (i >= 0) PEOPLE.splice(i, 1);
  const r = loadRoster(); if (!r.removed.includes(name)) r.removed.push(name); delete r.patch[name]; saveRoster(r);
  const c = loadCustom(); const before = c.people.length; c.people = c.people.filter(x => x.name !== name); if (c.people.length !== before) saveCustom(c);
}

// "Previsto até hoje" — quanto já deveria estar concluído (dias até hoje, nesta semana)
function plannedVsActual(tasks, offset) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayIdx = (offset === 0 && todayName()) ? DAY_IDX[todayName()] : (offset < 0 ? 4 : -1);
  // tarefas cujo dia já chegou (ou semana passada inteira)
  const due = tasks.filter(t => (DAY_IDX[t.day] ?? 0) <= todayIdx);
  const plannedW = due.reduce((a, t) => a + taskWeight(t), 0);
  const doneW = due.reduce((a, t) => a + (isDone(t) ? taskWeight(t) : 0), 0);
  return {
    hasData: due.length > 0,
    planned: due.length,
    plannedW,
    doneW,
    onTrackPct: plannedW ? Math.round(doneW / plannedW * 100) : 0,
  };
}

// ===== Tarefas iniciais (semana atual) — agora com status, peso, disciplina, prazo, subtarefas, validação =====
function seedTasks() {
  const T = (o) => {
    const dur = o.durationDays || 1;
    const eIdx = Math.min((DAY_IDX[o.day] || 0) + dur - 1, 4);
    return { status: 'todo', weight: 2, subtasks: [], durationDays: 1, ...o, dueDate: o.dueDate || dateForDay(DAYS[eIdx], 0) };
  };
  return [
    T({ id: 1,  day: 'Segunda', assignee: 'Cassio',   project: 'Itajaí - Viabilidade', disc: 'LEG', weight: 3, status: 'done',   text: 'Levantamento de dados, lotes, diretrizes e pequeno estudo de mercado' }),
    T({ id: 2,  day: 'Segunda', assignee: 'Lourrane', project: 'Sky Green',            disc: 'LEG', weight: 2, status: 'done',   text: 'Projeto Legal: Planta baixa do pavimento térreo (Padrão Prefeitura)' }),
    T({ id: 3,  day: 'Segunda', assignee: 'Isabela',  project: 'Sky Green',            disc: 'ARQ', weight: 2, status: 'doing',  text: 'Catalogação de ambientes, lista e Moodboard (Térreo e Lazer 1)', subtasks: [{ id: 'a', text: 'Térreo', done: true }, { id: 'b', text: 'Lazer 1', done: false }] }),
    T({ id: 4,  day: 'Segunda', assignee: 'Yuri',     project: 'Miguel Res.',          disc: 'ARQ', weight: 2, status: 'done',   text: 'Atualização do modelo executivo: Alvenaria do embasamento' }),
    T({ id: 5,  day: 'Segunda', assignee: 'Yuri',     project: 'Miguel Res.',          disc: 'ARQ', weight: 2, status: 'review', text: 'Finalização e validação: Planta de piso do pavimento tipo' }),

    T({ id: 6,  day: 'Terça', assignee: 'Cassio',   project: 'Itajaí - Viabilidade', disc: 'ARQ', weight: 3, durationDays: 2, status: 'doing', text: 'Estudo de massa volumétrica e implantação preliminar' }),
    T({ id: 7,  day: 'Terça', assignee: 'Lourrane', project: 'Sky Green',            disc: 'LEG', weight: 2, status: 'todo',  text: 'Projeto Legal: Detalhamento do pavimento térreo' }),
    T({ id: 8,  day: 'Terça', assignee: 'Isabela',  project: 'Sky Green',            disc: 'ARQ', weight: 2, status: 'todo',  text: 'Modelagem 3D paramétrica: Hall de Entrada' }),
    T({ id: 9,  day: 'Terça', assignee: 'Yuri',     project: 'Miguel Res.',          disc: 'EST', weight: 3, durationDays: 2, status: 'todo',  text: 'Modelagem executiva da alvenaria (Pav. Tipo) e planta de forro' }),
    T({ id: 10, day: 'Terça', assignee: 'Yuri',     project: 'Miguel Res.',          disc: 'BIM', weight: 1, status: 'todo',  isCoordPoint: true, valid: 'pending', time: 'A definir', text: 'Reunião de Compatibilização com Estrutural' }),

    T({ id: 11, day: 'Quarta', assignee: 'Cassio',   project: 'Itajaí - Viabilidade', disc: 'ARQ', weight: 2, status: 'todo', text: 'Fechamento e entrega da viabilidade volumétrica para revisão' }),
    T({ id: 12, day: 'Quarta', assignee: 'Lourrane', project: 'Sky Green',            disc: 'LEG', weight: 2, status: 'todo', text: 'Projeto Legal: Início do lançamento de garagens e acessos' }),
    T({ id: 13, day: 'Quarta', assignee: 'Yuri',     project: 'Itajaí - Viabilidade', disc: 'BIM', weight: 2, status: 'todo', isCoordPoint: true, valid: 'pending', text: 'Revisão Técnica (Coord. BIM): Validação da viabilidade' }),
    T({ id: 14, day: 'Quarta', assignee: 'Equipe',   project: 'Sky Green',            disc: 'BIM', weight: 3, status: 'todo', isCoordPoint: true, valid: 'pending', text: 'Compatibilização Multidisciplinar: Ambientes do Lazer 1' }),
    T({ id: 15, day: 'Quarta', assignee: 'Yuri',     project: 'Miguel Res.',          disc: 'ARQ', weight: 2, status: 'todo', text: 'Finalização do modelo de alvenaria do tipo e emissão da planta de forro' }),

    T({ id: 16, day: 'Quinta', assignee: 'Lourrane', project: 'Sky Green',   disc: 'LEG', weight: 2, status: 'todo', text: 'Projeto Legal: Detalhamento de garagens e quadro de áreas' }),
    T({ id: 17, day: 'Quinta', assignee: 'Equipe',   project: 'Sky Green',   disc: 'BIM', weight: 3, status: 'todo', isCoordPoint: true, valid: 'pending', text: 'Fechamento de Compatibilização: Resolução Lazer 1' }),
    T({ id: 18, day: 'Quinta', assignee: 'Yuri',     project: 'Miguel Res.', disc: 'MEP', weight: 3, durationDays: 2, status: 'todo', text: 'Lançamento de elementos MEP (Elétrica e Hidráulica)' }),

    T({ id: 19, day: 'Sexta', assignee: 'Lourrane', project: 'Sky Green',   disc: 'LEG', weight: 2, status: 'todo', text: 'Projeto Legal: Revisão final padrão prefeitura (Térreo e Garagens)' }),
    T({ id: 20, day: 'Sexta', assignee: 'Isabela',  project: 'Sky Green',   disc: 'ARQ', weight: 2, status: 'todo', text: 'Modelagem de exteriores: Área externa do Lazer 1' }),
    T({ id: 21, day: 'Sexta', assignee: 'Yuri',     project: 'Miguel Res.', disc: 'ELE', weight: 2, status: 'todo', text: 'Finalização do lançamento de pontos elétricos e hidráulicos' }),
    T({ id: 22, day: 'Sexta', assignee: 'Equipe',   project: 'Geral',       disc: 'BIM', weight: 1, status: 'todo', isCoordPoint: true, valid: 'pending', time: 'Final do Dia', text: 'Reunião de Coordenação: Alinhamento de evolução' }),
  ];
}

Object.assign(window, {
  DAYS, DAY_SHORT, DAY_IDX, PROJECTS, PEOPLE, DISCIPLINES, STATUSES, VALID_STATES,
  projColor, projCode, person, isCoordinator, coordinators, discipline, statusMeta, initials,
  taskProgress, isDone, taskWeight, weightedProgress,
  taskDuration, startIdx, endIdx, spansDay, endDayName,
  ymd, parseYmd, isOverdue, isDueToday,
  mondayOf, weekKey, weekLabelFor, dateForDay, todayName, plannedVsActual, seedTasks,
  addProject, addPerson, addDiscipline,
  addCoordinator, updateCoordinatorRole, removeCoordinator,
});
