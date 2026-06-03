import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from '../contexts/AppContext';
import { DB, Project, Discipline, WeeklyTask } from '../types';

// ==========================================
// TYPES & CONTEXT INTEG
// ==========================================

const STORE_PREFIX = 'enigami_agenda_v2_';

const DAYS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];
const DAY_SHORT: Record<string, string> = { 'Segunda': 'SEG', 'Terça': 'TER', 'Quarta': 'QUA', 'Quinta': 'QUI', 'Sexta': 'SEX' };
const DAY_IDX: Record<string, number> = { 'Segunda': 0, 'Terça': 1, 'Quarta': 2, 'Quinta': 3, 'Sexta': 4 };

// Base Hardcoded Lists (used for fallbacks/seed)
const BASE_PROJECTS = [
  { name: 'Miguel Res.',          code: 'MIG', color: '#FF6B4A' },
  { name: 'Sky Green',            code: 'SKY', color: '#10B981' },
  { name: 'Itajaí - Viabilidade', code: 'ITJ', color: '#A770EF' },
  { name: 'Geral',                code: 'GER', color: '#0EA5E9' },
];

const BASE_PEOPLE = [
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

const BASE_DISCIPLINES = [
  { code: 'ARQ', name: 'Arquitetura',  color: '#F97316' },
  { code: 'EST', name: 'Estrutura',    color: '#8B5CF6' },
  { code: 'HID', name: 'Hidráulica',   color: '#0EA5E9' },
  { code: 'ELE', name: 'Elétrica',     color: '#EAB308' },
  { code: 'MEP', name: 'Instalações',  color: '#14B8A6' },
  { code: 'PCI', name: 'Incêndio',     color: '#EF4444' },
  { code: 'LEG', name: 'Legal/Pref.',  color: '#64748B' },
  { code: 'BIM', name: 'Coordenação',  color: '#6366F1' },
];

const STATUSES = [
  { key: 'todo',   label: 'A fazer',     short: 'A FAZER',  pct: 0,   color: '#94A3B8' },
  { key: 'doing',  label: 'Em andamento',short: 'EM AND.',  pct: 50,  color: '#0EA5E9' },
  { key: 'review', label: 'Em revisão',  short: 'REVISÃO',  pct: 85,  color: '#EAB308' },
  { key: 'done',   label: 'Concluído',   short: 'CONCLUÍDO',pct: 100, color: '#10B981' },
];

const VALID_STATES: Record<string, { label: string; color: string }> = {
  pending:  { label: 'Aguardando', color: '#EAB308' },
  approved: { label: 'Aprovado',   color: '#10B981' },
  returned: { label: 'Devolvido',  color: '#EF4444' },
};

const COLOR_POOL = ['#0EA5E9','#10B981','#A770EF','#EC4899','#F59E0B','#14B8A6','#6366F1','#EF4444','#8B5CF6','#84CC16','#F97316','#06B6D4'];

// ==========================================
// HELPERS
// ==========================================

function ymd(d: Date) { return d.toISOString().slice(0, 10); }

function parseYmd(s: string) {
  if (!s) return null;
  const [y, m, dd] = s.split('-').map(Number);
  return new Date(y, m - 1, dd);
}

function mondayOf(offset: number) {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const dow = now.getDay() === 0 ? 7 : now.getDay();
  const mon = new Date(now); mon.setDate(now.getDate() - (dow - 1) + offset * 7);
  return mon;
}

function weekKey(offset: number) { return ymd(mondayOf(offset)); }

function weekLabelFor(offset: number) {
  const mon = mondayOf(offset); const fri = new Date(mon); fri.setDate(mon.getDate() + 4);
  const M = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
  const p = (d: Date) => String(d.getDate()).padStart(2, '0');
  return mon.getMonth() === fri.getMonth()
    ? `${p(mon)} – ${p(fri)} ${M[fri.getMonth()]}`
    : `${p(mon)} ${M[mon.getMonth()]} – ${p(fri)} ${M[fri.getMonth()]}`;
}

function dateForDay(dayName: string, offset: number) {
  const mon = mondayOf(offset); const d = new Date(mon); d.setDate(mon.getDate() + (DAY_IDX[dayName] || 0));
  return ymd(d);
}

function todayName() {
  const map: Record<number, string> = { 1:'Segunda',2:'Terça',3:'Quarta',4:'Quinta',5:'Sexta' };
  return map[new Date().getDay()] || null;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function taskProgress(t: WeeklyTask) {
  if (t.subtasks && t.subtasks.length) {
    return Math.round(t.subtasks.filter(s => s.done).length / t.subtasks.length * 100);
  }
  return (STATUSES.find(s => s.key === (t.status || (t.completed ? 'done' : 'todo'))) || STATUSES[0]).pct;
}

function isDone(t: WeeklyTask) { return (t.status === 'done') || (!t.status && t.completed); }
function taskWeight(t: WeeklyTask) { return (typeof t.weight === 'number' && t.weight > 0) ? t.weight : 1; }

// ---- Duração em dias (atividade pode ocupar mais de um dia) ----
function taskDuration(t: WeeklyTask) { const d = t.durationDays || 1; return d < 1 ? 1 : d; }
function startIdx(t: WeeklyTask) { return DAY_IDX[t.day] != null ? DAY_IDX[t.day] : 0; }
function endIdx(t: WeeklyTask) { return Math.min(startIdx(t) + taskDuration(t) - 1, 4); }
function spansDay(t: WeeklyTask, dayName: string) { const d = DAY_IDX[dayName]; return d >= startIdx(t) && d <= endIdx(t); }
function endDayName(t: WeeklyTask) { return DAYS[endIdx(t)]; }

function weightedProgress(list: WeeklyTask[]) {
  if (!list.length) return 0;
  const tot = list.reduce((a, t) => a + taskWeight(t), 0);
  const acc = list.reduce((a, t) => a + taskWeight(t) * taskProgress(t), 0);
  return tot ? Math.round(acc / tot) : 0;
}

function isOverdue(t: WeeklyTask) {
  if (isDone(t) || !t.dueDate) return false;
  const due = parseYmd(t.dueDate); const today = new Date(); today.setHours(0, 0, 0, 0);
  return due ? due < today : false;
}

function isDueToday(t: WeeklyTask) {
  if (isDone(t) || !t.dueDate) return false;
  return t.dueDate === ymd(new Date());
}

function plannedVsActual(tasks: WeeklyTask[], offset: number) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayIdx = (offset === 0 && todayName()) ? DAY_IDX[todayName() as string] : (offset < 0 ? 4 : -1);
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

function storeKey(coord: string, offset: number) {
  return coord === 'Yuri' ? STORE_PREFIX + weekKey(offset) : STORE_PREFIX + coord + '_' + weekKey(offset);
}

function loadWeek(activeProject: any, coord: string, offset: number) {
  if (activeProject && activeProject.agendaTasks && Array.isArray(activeProject.agendaTasks)) {
    const list = activeProject.agendaTasks.filter((t: any) => t.coord === coord && t.weekOffset === offset);
    if (list.length > 0) return list;
  }
  try {
    const s = localStorage.getItem(storeKey(coord, offset));
    if (s) {
      const list = JSON.parse(s);
      if (Array.isArray(list) && list.length > 0) {
        return list.map((t: any) => ({ ...t, coord, weekOffset: offset }));
      }
    }
  } catch (e) {}
  return (offset === 0 && coord === 'Yuri') ? seedTasks().map(t => ({ ...t, coord, weekOffset: offset })) : [];
}

function progressOfWeek(activeProject: any, coord: string, offset: number) {
  if (activeProject && activeProject.agendaTasks && Array.isArray(activeProject.agendaTasks)) {
    const list = activeProject.agendaTasks.filter((t: any) => t.coord === coord && t.weekOffset === offset);
    if (list.length > 0) return weightedProgress(list);
  }
  try {
    const s = localStorage.getItem(storeKey(coord, offset));
    if (s) return weightedProgress(JSON.parse(s));
  } catch (e) {}
  return null;
}

function seedTasks(): WeeklyTask[] {
  const T = (o: Partial<WeeklyTask>) => {
    const dur = o.durationDays || 1;
    const eIdx = Math.min((DAY_IDX[o.day as string] || 0) + dur - 1, 4);
    return { status: 'todo', weight: 2, subtasks: [], durationDays: 1, ...o, dueDate: o.dueDate || dateForDay(DAYS[eIdx], 0) } as WeeklyTask;
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

// Custom configuration lookups
const CUSTOM_KEY = 'enigami_custom_v1';
const ROSTER_KEY = 'enigami_roster_v1';

function loadCustom() {
  try {
    const c = localStorage.getItem(CUSTOM_KEY);
    if (c) {
      const parsed = JSON.parse(c);
      return { projects: parsed.projects || [], people: parsed.people || [], disciplines: parsed.disciplines || [] };
    }
  } catch (e) {}
  return { projects: [], people: [], disciplines: [] };
}

function saveCustom(c: any) { try { localStorage.setItem(CUSTOM_KEY, JSON.stringify(c)); } catch (e) {} }

function loadRoster() {
  try {
    const r = localStorage.getItem(ROSTER_KEY);
    if (r) {
      const parsed = JSON.parse(r);
      return { removed: parsed.removed || [], patch: parsed.patch || {} };
    }
  } catch (e) {}
  return { removed: [], patch: {} };
}

function saveRoster(r: any) { try { localStorage.setItem(ROSTER_KEY, JSON.stringify(r)); } catch (e) {} }

function slugCode(name: string, taken: string[]) {
  const clean = name.replace(/[^a-zA-Zà-úÀ-Ú0-9 ]/g, '').trim().toUpperCase();
  const words = clean.split(/\s+/).filter(Boolean);
  let base = words.length >= 2 ? (words[0][0] + words[1][0] + (words[1][1] || words[0][1] || '')) : clean.slice(0, 3);
  base = (base || 'XXX').slice(0, 3);
  let code = base, i = 1;
  while (taken.includes(code)) { code = base.slice(0, 2) + (i++); }
  return code;
}

// ==========================================
// CORE SUB-COMPONENTS
// ==========================================

function Icon({ name, size = 18, color, style, className }: { name: string; size?: number; color?: string; style?: React.CSSProperties; className?: string }) {
  return (
    <span className={'material-symbols-outlined ' + (className || '')}
      style={{ fontSize: size, color: color || 'inherit', lineHeight: 1, ...style }}>{name}</span>
  );
}

function Progress({ value, color, height = 5 }: { value: number; color?: string; height?: number }) {
  return (
    <div className="prog-track" style={{ height }}>
      <div className="prog-fill" style={{ width: value + '%', background: color || 'var(--primary)' }} />
    </div>
  );
}

// ==========================================
// COMPONENT: WeeklyAgenda
// ==========================================

export default function WeeklyAgenda() {
  const { db, setDb, currentUser, theme, activeProject } = useApp();

  // local configuration settings (TWEAKS)
  const [t, setTweak] = useState(() => {
    try {
      const saved = localStorage.getItem('enigami_agenda_tweaks');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return TWEAK_DEFAULTS;
  });

  const updateTweak = (key: string, val: any) => {
    setTweak((prev: any) => {
      const next = { ...prev, [key]: val };
      try { localStorage.setItem('enigami_agenda_tweaks', JSON.stringify(next)); } catch (e) {}
      return next;
    });
  };

  // State
  const [coord, setCoord] = useState(() => localStorage.getItem('enigami_active_coord') || currentUser?.name || 'Yuri');
  const [coordMenu, setCoordMenu] = useState(false);
  const [coordMgr, setCoordMgr] = useState(false);
  const [bumpCount, setBumpCount] = useState(0);
  const [saved, setSaved] = useState(false);
  const [offset, setOffset] = useState(0);
  const [tasks, setTasks] = useState<WeeklyTask[]>([]);
  const [groupBy, setGroupBy] = useState<'day' | 'project' | 'assignee'>('day');
  const [layout, setLayout] = useState<'list' | 'board'>(() => (localStorage.getItem('enigami_layout') as 'list' | 'board') || 'list');
  const [fProject, setFProject] = useState('all');
  const [fPerson, setFPerson] = useState('all');
  const [fDisc, setFDisc] = useState('all');
  const [onlyValidate, setOnlyValidate] = useState(false);
  const [onlyOverdue, setOnlyOverdue] = useState(false);
  const [fOrigin, setFOrigin] = useState<'all' | 'unplanned' | 'carried'>('all');
  const [planLock, setPlanLock] = useState<number | null>(null);
  const [exportChecklist, setExportChecklist] = useState<boolean>(false);
  const [modal, setModal] = useState<{ open: boolean; task: WeeklyTask | null }>({ open: false, task: null });
  const [showFilters, setShowFilters] = useState(false);
  const [panel, setPanel] = useState<'insights' | 'validation' | null>(null);
  const [exportMenu, setExportMenu] = useState(false);
  const [exportScope, setExportScope] = useState<'all' | 'filtered'>('all');
  const [dropCol, setDropCol] = useState<string | null>(null);
  const [tweaksOpen, setTweaksOpen] = useState(false);
  
  const dragId = useRef<string | number | null>(null);
  const today = todayName();
  const isCurrentWeek = offset === 0;

  // ----- lançamento / planejamento da semana -----
  const planKeyOf = (c: string, o: number) => 'enigami_plan_' + c + '_' + weekKey(o);
  useEffect(() => {
    let lock: number | null = null;
    try {
      const v = localStorage.getItem(planKeyOf(coord, offset));
      if (v) lock = +v;
    } catch (e) {}
    // a semana já semeada do Yuri nasce "lançada", para sinalizar novas demandas de imediato
    if (!lock && coord === 'Yuri' && offset === 0) {
      lock = Date.parse('2026-06-01T00:00:00');
      try { localStorage.setItem(planKeyOf(coord, offset), String(lock)); } catch (e) {}
    }
    setPlanLock(lock);
  }, [coord, offset]);

  const lockPlan = () => {
    const ts = Date.now();
    try { localStorage.setItem(planKeyOf(coord, offset), String(ts)); } catch (e) {}
    setPlanLock(ts);
  };
  
  const unlockPlan = () => {
    try { localStorage.removeItem(planKeyOf(coord, offset)); } catch (e) {}
    setPlanLock(null);
  };

  // Sync integrated databases
  const custom = useMemo(() => loadCustom(), [bumpCount]);
  const roster = useMemo(() => loadRoster(), [bumpCount]);

  const integratedProjects = useMemo(() => {
    const list = [...BASE_PROJECTS];
    custom.projects.forEach((p: any) => {
      if (!list.some(x => x.name.toLowerCase() === p.name.toLowerCase())) list.push(p);
    });
    db.projects.forEach(p => {
      if (!list.some(x => x.name.toLowerCase() === p.name.toLowerCase())) {
        list.push({
          name: p.name,
          code: p.name.slice(0, 3).toUpperCase(),
          color: COLOR_POOL[list.length % COLOR_POOL.length]
        });
      }
    });
    return list;
  }, [db.projects, custom.projects]);

  const integratedPeople = useMemo(() => {
    const list = [...BASE_PEOPLE];
    custom.people.forEach((p: any) => {
      if (!list.some(x => x.name.toLowerCase() === p.name.toLowerCase())) list.push(p);
    });
    db.team.forEach(name => {
      if (!list.some(x => x.name.toLowerCase() === name.toLowerCase())) {
        list.push({
          name,
          color: COLOR_POOL[(list.length + 3) % COLOR_POOL.length],
          role: 'Colaborador',
          capacity: 10,
          coordinator: false
        });
      }
    });
    // Apply roster edits
    Object.entries(roster.patch).forEach(([name, patch]: [string, any]) => {
      const person = list.find(x => x.name === name);
      if (person) {
        if (patch.role != null) person.role = patch.role;
        if (patch.coordinator != null) person.coordinator = patch.coordinator;
      }
    });
    // Apply roster removals
    return list.filter(p => !roster.removed.includes(p.name));
  }, [db.team, custom.people, roster, bumpCount]);

  const integratedDisciplines = useMemo(() => {
    const list = [...BASE_DISCIPLINES];
    custom.disciplines.forEach((d: any) => {
      if (!list.some(x => x.code.toUpperCase() === d.code.toUpperCase())) list.push(d);
    });
    db.disciplines.forEach(d => {
      if (!list.some(x => x.code.toUpperCase() === d.code.toUpperCase())) {
        list.push({
          code: d.code.toUpperCase(),
          name: d.name,
          color: d.color || '#64748B'
        });
      }
    });
    return list;
  }, [db.disciplines, custom.disciplines]);

  const isCoord = (name: string) => {
    const p = integratedPeople.find(x => x.name === name);
    return !!(p && p.coordinator);
  };
  const coordinatorsList = () => integratedPeople.filter(p => p.coordinator);
  const getPersonMeta = (name: string) => integratedPeople.find(p => p.name === name) || { name, color: '#94A3B8', role: '', capacity: 10 };
  const getProjColor = (name: string) => (integratedProjects.find(x => x.name === name)?.color || '#9CA3AF');
  const getProjCode = (name: string) => (integratedProjects.find(x => x.name === name)?.code || '—');
  const getDiscMeta = (code: string) => integratedDisciplines.find(d => d.code === code) || null;

  const canValidate = isCoord(coord);

  // Load and Persist tasks
  useEffect(() => {
    setTasks(loadWeek(activeProject, coord, offset));
  }, [offset, coord, activeProject]);

  const saveTasks = (newTasks: WeeklyTask[]) => {
    setTasks(newTasks);
    if (!activeProject) return;
    const otherTasks = (activeProject.agendaTasks || []).filter((t: any) => !(t.coord === coord && t.weekOffset === offset));
    const updatedTasks = [
      ...otherTasks,
      ...newTasks.map(t => ({ ...t, coord, weekOffset: offset }))
    ];
    setDb((prev: DB) => ({
      ...prev,
      projects: prev.projects.map(p =>
        p.id === activeProject.id ? { ...p, agendaTasks: updatedTasks, updatedAt: new Date().toISOString() } : p
      )
    }));
    try { localStorage.setItem(storeKey(coord, offset), JSON.stringify(newTasks)); } catch (e) {}
  };

  const prevProgress = useMemo(() => progressOfWeek(activeProject, coord, offset - 1), [offset, coord, activeProject]);

  const saveNow = () => {
    if (!activeProject) return;
    const otherTasks = (activeProject.agendaTasks || []).filter((t: any) => !(t.coord === coord && t.weekOffset === offset));
    const updatedTasks = [
      ...otherTasks,
      ...tasks.map(t => ({ ...t, coord, weekOffset: offset }))
    ];
    setDb((prev: DB) => ({
      ...prev,
      projects: prev.projects.map(p =>
        p.id === activeProject.id ? { ...p, agendaTasks: updatedTasks, updatedAt: new Date().toISOString() } : p
      )
    }));
    try { localStorage.setItem(storeKey(coord, offset), JSON.stringify(tasks)); } catch (e) {}
    setSaved(true); setTimeout(() => setSaved(false), 1900);
  };

  const switchCoord = (name: string) => {
    setCoordMenu(false);
    if (name !== coord) {
      setOffset(0);
      setCoord(name);
      localStorage.setItem('enigami_active_coord', name);
    }
  };

  // Roster Managers
  const handleAddCoord = (nameStr: string, roleStr: string) => {
    const name = nameStr.trim();
    if (!name) return;
    const c = loadCustom(); const r = loadRoster();
    let p = integratedPeople.find(x => x.name.toLowerCase() === name.toLowerCase());
    if (p) {
      r.removed = r.removed.filter((n: string) => n !== p!.name);
      r.patch[p.name] = { ...(r.patch[p.name] || {}), coordinator: true, ...(roleStr.trim() ? { role: roleStr.trim() } : {}) };
      saveRoster(r);
      const cp = c.people.find((x: any) => x.name === p!.name);
      if (cp) { cp.coordinator = true; if (roleStr.trim()) cp.role = roleStr.trim(); saveCustom(c); }
    } else {
      const newP = { name, role: roleStr.trim() || 'Coordenação', color: COLOR_POOL[(integratedPeople.length + 3) % COLOR_POOL.length], capacity: 13, coordinator: true };
      c.people.push(newP);
      saveCustom(c);
    }
    setBumpCount(n => n + 1);
    switchCoord(name);
  };

  const handleUpdateCoordRole = (name: string, roleStr: string) => {
    const r = loadRoster(); r.patch[name] = { ...(r.patch[name] || {}), role: roleStr }; saveRoster(r);
    const c = loadCustom(); const cp = c.people.find((x: any) => x.name === name); if (cp) { cp.role = roleStr; saveCustom(c); }
    setBumpCount(n => n + 1);
  };

  const handleRemoveCoord = (name: string) => {
    const r = loadRoster(); if (!r.removed.includes(name)) r.removed.push(name); delete r.patch[name]; saveRoster(r);
    const c = loadCustom(); c.people = c.people.filter((x: any) => x.name !== name); saveCustom(c);
    setBumpCount(n => n + 1);
    if (name === coord) {
      const first = integratedPeople.filter(p => p.coordinator && p.name !== name)[0];
      if (first) switchCoord(first.name);
    }
  };

  // custom tags additions
  const handleAddProject = (name: string) => {
    const clean = name.trim();
    if (!clean) return null;
    const existing = integratedProjects.find(p => p.name.toLowerCase() === clean.toLowerCase());
    if (existing) return existing;
    const proj = { name: clean, code: slugCode(clean, integratedProjects.map(p => p.code)), color: COLOR_POOL[integratedProjects.length % COLOR_POOL.length] };
    const c = loadCustom(); c.projects.push(proj); saveCustom(c);
    setBumpCount(n => n + 1);
    return proj;
  };

  const handleAddPerson = (name: string) => {
    const clean = name.trim();
    if (!clean) return null;
    const existing = integratedPeople.find(p => p.name.toLowerCase() === clean.toLowerCase());
    if (existing) return existing;
    const p = { name: clean, role: 'Equipe', color: COLOR_POOL[(integratedPeople.length + 3) % COLOR_POOL.length], capacity: 10, coordinator: false };
    const c = loadCustom(); c.people.push(p); saveCustom(c);
    setBumpCount(n => n + 1);
    return p;
  };

  const handleAddDiscipline = (name: string) => {
    const clean = name.trim();
    if (!clean) return null;
    const code = slugCode(clean, integratedDisciplines.map(d => d.code));
    const existing = integratedDisciplines.find(d => d.name.toLowerCase() === clean.toLowerCase());
    if (existing) return existing;
    const d = { code, name: clean, color: COLOR_POOL[(integratedDisciplines.length + 1) % COLOR_POOL.length] };
    const c = loadCustom(); c.disciplines.push(d); saveCustom(c);
    setBumpCount(n => n + 1);
    return d;
  };

  // Close menus on click outside
  useEffect(() => {
    if (!coordMenu && !exportMenu) return;
    const h = () => { setCoordMenu(false); setExportMenu(false); };
    document.addEventListener('click', h);
    return () => document.removeEventListener('click', h);
  }, [coordMenu, exportMenu]);

  // CSS variables injector
  useEffect(() => {
    const r = document.documentElement;
    r.style.setProperty('--weekly-primary', t.accent);
    r.style.setProperty('--weekly-primary-soft', t.accent + '18');
  }, [t.accent]);

  // Actions
  const setStatus = (id: string | number, status: string) => {
    saveTasks(tasks.map(x => x.id === id ? { ...x, status, completed: status === 'done', completedAt: status === 'done' ? Date.now() : null } : x));
  };
  const validate = (id: string | number, valid: 'pending' | 'approved' | 'returned') => {
    if (!canValidate) return;
    saveTasks(tasks.map(x => x.id === id ? { ...x, valid, validBy: coord, validAt: Date.now() } : x));
  };
  const remove = (id: string | number) => saveTasks(tasks.filter(x => x.id !== id));
  
  const postpone = (id: string | number) => {
    if (!activeProject) return;
    const task = tasks.find(x => x.id === id);
    if (!task) return;

    const updatedTasks = (activeProject.agendaTasks || []).map((t: any) => {
      if (t.id === id) {
        return {
          ...t,
          weekOffset: offset + 1,
          dueDate: dateForDay(endDayName(t as WeeklyTask), offset + 1),
          postponedCount: (t.postponedCount || 0) + 1,
          carriedFrom: weekLabelFor(offset),
        };
      }
      return t;
    });

    setDb((prev: DB) => ({
      ...prev,
      projects: prev.projects.map(p =>
        p.id === activeProject.id ? { ...p, agendaTasks: updatedTasks, updatedAt: new Date().toISOString() } : p
      )
    }));

    setTasks(tasks.filter(x => x.id !== id));

    try {
      const curKey = coord === 'Yuri' ? STORE_PREFIX + weekKey(offset) : STORE_PREFIX + coord + '_' + weekKey(offset);
      localStorage.setItem(curKey, JSON.stringify(tasks.filter(x => x.id !== id)));

      const nextKey = coord === 'Yuri' ? STORE_PREFIX + weekKey(offset + 1) : STORE_PREFIX + coord + '_' + weekKey(offset + 1);
      const nextLocal = JSON.parse(localStorage.getItem(nextKey) || '[]');
      nextLocal.push({
        ...task,
        dueDate: dateForDay(endDayName(task), offset + 1),
        postponedCount: (task.postponedCount || 0) + 1,
        carriedFrom: weekLabelFor(offset),
      });
      localStorage.setItem(nextKey, JSON.stringify(nextLocal));
    } catch (e) {}
  };

  const saveTask = (form: WeeklyTask) => {
    const norm = { ...form, completed: form.status === 'done' };
    norm.dueDate = dateForDay(endDayName(norm), offset);
    if (form.id != null) {
      saveTasks(tasks.map(x => x.id === form.id ? { ...x, ...norm } : x));
    } else {
      saveTasks([...tasks, { ...norm, id: Date.now(), createdAt: Date.now(), unplanned: !!planLock }]);
    }
    setModal({ open: false, task: null });
  };

  const onDragStart = (e: React.DragEvent, task: WeeklyTask) => {
    dragId.current = task.id ?? null;
    e.dataTransfer.effectAllowed = 'move';
  };
  const onDragEnd = () => {
    dragId.current = null;
    setDropCol(null);
  };
  const onDropDay = (day: string) => (e: React.DragEvent) => {
    e.preventDefault();
    if (dragId.current != null) {
      saveTasks(tasks.map(x => x.id === dragId.current ? { ...x, day, dueDate: dateForDay(endDayName({ ...x, day }), offset) } : x));
    }
    dragId.current = null;
    setDropCol(null);
  };

  // Filters
  const isNova = (x: WeeklyTask) => x.unplanned && !x.carriedFrom;
  const filtered = useMemo(() => tasks.filter(x =>
    (fProject === 'all' || x.project === fProject) &&
    (fPerson === 'all' || x.assignee === fPerson) &&
    (fDisc === 'all' || x.disc === fDisc) &&
    (!onlyValidate || x.isCoordPoint) &&
    (!onlyOverdue || isOverdue(x)) &&
    (fOrigin === 'all' || (fOrigin === 'unplanned' && isNova(x)) || (fOrigin === 'carried' && x.carriedFrom))
  ), [tasks, fProject, fPerson, fDisc, onlyValidate, onlyOverdue, fOrigin]);

  // Stats
  const stats = useMemo(() => {
    const total = tasks.length, done = tasks.filter(isDone).length;
    const coordTasks = tasks.filter(x => x.isCoordPoint);
    return {
      total, done, progress: weightedProgress(tasks),
      simpleProgress: total ? Math.round(done / total * 100) : 0,
      projects: new Set(tasks.map(x => x.project)).size,
      people: new Set(tasks.filter(x => x.assignee !== 'Equipe').map(x => x.assignee)).size,
      coordPending: coordTasks.filter(x => (x.valid || 'pending') === 'pending').length,
      coordApproved: coordTasks.filter(x => x.valid === 'approved').length, coordTotal: coordTasks.length,
      overdue: tasks.filter(isOverdue).length,
      nova: tasks.filter(x => x.unplanned && !x.carriedFrom).length,
      carried: tasks.filter(x => x.carriedFrom).length,
    };
  }, [tasks]);

  const pva = useMemo(() => plannedVsActual(tasks, offset), [tasks, offset]);

  const trend = prevProgress != null ? stats.progress - prevProgress : null;

  // Columns Layout
  const columns = useMemo(() => {
    if (groupBy === 'project') return integratedProjects.filter(p => filtered.some(x => x.project === p.name)).map(p => ({ key: p.name, label: p.name, accent: p.color, isToday: false, list: filtered.filter(x => x.project === p.name) }));
    if (groupBy === 'assignee') return integratedPeople.filter(p => filtered.some(x => x.assignee === p.name)).map(p => ({ key: p.name, label: p.name, accent: p.color, isToday: false, list: filtered.filter(x => x.assignee === p.name) }));
    return DAYS.map(d => ({ key: d, label: d, accent: undefined, isToday: isCurrentWeek && d === today, list: filtered.filter(x => spansDay(x, d)) }));
  }, [groupBy, filtered, today, isCurrentWeek, integratedProjects, integratedPeople]);

  const wl = weekLabelFor(offset);
  const views = [
    { k: 'day' as const, label: 'Dia', icon: 'calendar_view_week' },
    { k: 'project' as const, label: 'Projeto', icon: 'folder' },
    { k: 'assignee' as const, label: 'Equipe', icon: 'group' },
  ];
  const filtersActive = fProject !== 'all' || fPerson !== 'all' || fDisc !== 'all' || onlyValidate || onlyOverdue || fOrigin !== 'all';
  const clearFilters = () => { setFProject('all'); setFPerson('all'); setFDisc('all'); setOnlyValidate(false); setOnlyOverdue(false); setFOrigin('all'); };

  const doExport = (scope: 'all' | 'filtered') => {
    setExportMenu(false);
    setExportScope(scope);
    setTimeout(() => window.print(), 80);
  };

  const printTasks = exportScope === 'all' ? tasks : filtered;
  const printStats = useMemo(() => {
    const total = printTasks.length, done = printTasks.filter(isDone).length;
    const coordTasks = printTasks.filter(x => x.isCoordPoint);
    return {
      total, done, progress: weightedProgress(printTasks),
      projects: new Set(printTasks.map(x => x.project)).size,
      people: new Set(printTasks.filter(x => x.assignee !== 'Equipe').map(x => x.assignee)).size,
      coordApproved: coordTasks.filter(x => x.valid === 'approved').length, coordTotal: coordTasks.length,
      coordPending: coordTasks.filter(x => (x.valid || 'pending') === 'pending').length,
      overdue: printTasks.filter(isOverdue).length,
      nova: printTasks.filter(x => x.unplanned && !x.carriedFrom).length,
      carried: printTasks.filter(x => x.carriedFrom).length,
    };
  }, [printTasks]);
  const printPva = useMemo(() => plannedVsActual(printTasks, offset), [printTasks, offset]);

  const cardEvents = { onStatus: setStatus, onEdit: (tk: WeeklyTask) => setModal({ open: true, task: tk }), onDelete: remove, onValidate: validate, onPostpone: postpone, onDragStart, onDragEnd };

  const isDark = theme === 'dark';

  return (
    <div className={`weekly-agenda-container ${isDark ? 'dark' : ''} ${t.cardStyle === 'neuro' ? 'neuro' : ''} ${!t.bgGrid ? 'nogrid' : ''}`}>
      <style>{LOCAL_STYLES}</style>
      
      <div className="screen-only" style={{ padding: '20px', minHeight: '100%', display: 'flex', flexDirection: 'column' }}>

        {/* ===== HEADER ===== */}
        <header style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 18px -6px color-mix(in srgb, var(--primary) 60%, transparent)' }}>
              <Icon name="account_tree" size={24} color="#fff" />
            </div>
            <div>
              <h1 className="t-h1" style={{ margin: 0, fontSize: '18px', fontWeight: 900 }}>Agenda da Semana</h1>
              <div style={{ position: 'relative', marginTop: 4 }}>
                <button className="coord-chip" onClick={(e) => { e.stopPropagation(); setCoordMenu(m => !m); }}>
                  <Avatar name={coord} size={20} meta={getPersonMeta(coord)} />
                  <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.15 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--theme-text)' }}>{coord}</span>
                    <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: '.12em', color: 'var(--primary)', textTransform: 'uppercase' }}>{getPersonMeta(coord).role}</span>
                  </span>
                  <Icon name="unfold_more" size={14} color="var(--theme-text-muted)" />
                </button>
                {coordMenu && (
                  <div className="status-menu" style={{ minWidth: 220 }} onClick={e => e.stopPropagation()}>
                    <div style={{ padding: '4px 10px 6px', fontSize: 8, fontWeight: 800, letterSpacing: '.16em', color: 'var(--theme-text-muted)' }}>COORDENADOR / CONFIGURAÇÃO</div>
                    {coordinatorsList().map(c => (
                      <button key={c.name} className={c.name === coord ? 'active' : ''} onClick={() => switchCoord(c.name)}>
                        <Avatar name={c.name} size={20} meta={c} />
                        <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
                          <span style={{ fontWeight: 700 }}>{c.name}</span>
                          <span style={{ fontSize: 10, color: 'var(--theme-text-muted)' }}>{c.role}</span>
                        </span>
                        {c.name === coord && <Icon name="check" size={14} style={{ marginLeft: 'auto' }} color="var(--primary)" />}
                      </button>
                    ))}
                    <div style={{ padding: '7px 10px 3px', fontSize: 10, color: 'var(--theme-text-muted)', borderTop: '1px solid var(--theme-divider)', marginTop: 4 }}>Cada coordenador tem sua própria agenda semanal de entregas.</div>
                    <button onClick={() => { setCoordMenu(false); setCoordMgr(true); }} style={{ marginTop: 2, borderTop: '1px solid var(--theme-divider)' }}><Icon name="manage_accounts" size={15} />Gerenciar coordenadores</button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="no-print" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div className="week-nav">
              <button onClick={() => setOffset(o => o - 1)} aria-label="Semana anterior"><Icon name="chevron_left" size={16} /></button>
              <button className="week-label" onClick={() => setOffset(0)} title="Voltar para a semana atual">
                <span className="font-sq" style={{ fontSize: 11, fontWeight: 800 }}>{wl}</span>
                <span style={{ fontSize: 8, color: isCurrentWeek ? 'var(--primary)' : 'var(--theme-text-muted)', fontWeight: 700, letterSpacing: '.1em' }}>{isCurrentWeek ? 'ESTA SEMANA' : (offset < 0 ? 'PASSADA' : 'FUTURA')}</span>
              </button>
              <button onClick={() => setOffset(o => o + 1)} aria-label="Próxima semana"><Icon name="chevron_right" size={16} /></button>
            </div>
            <button className={'btn ' + (saved ? 'btn-saved' : 'btn-ghost')} onClick={saveNow} title="Salvar configuração neste navegador">
              <Icon name={saved ? 'cloud_done' : 'save'} size={15} />{saved ? 'Salvo' : 'Salvar'}
            </button>
            <button className="btn btn-ghost" onClick={() => setTweaksOpen(true)} title="Design Tweaks"><Icon name="settings" size={15} />Ajustes</button>
            <button className="btn btn-primary" onClick={() => setModal({ open: true, task: null })}><Icon name="add" size={15} />Nova Demanda</button>
          </div>
        </header>

        {/* ===== KPIs ===== */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(168px, 1fr))', gap: 'var(--gap)', marginBottom: 'var(--gap)' }}>
          <div className="card kpi-clickable" onClick={() => setPanel('insights')} style={{ padding: '12px 14px', cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}><Icon name="trending_up" size={15} color="var(--primary)" /><span className="cap" style={{ fontSize: 9, color: 'var(--theme-text-muted)' }}>Avanço Ponderado</span></div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
              <span className="font-sq" style={{ fontSize: 26, fontWeight: 800, color: 'var(--primary)', lineHeight: 1 }}>{stats.progress}%</span>
              {trend != null && trend !== 0 && <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 11, fontWeight: 800, color: trend > 0 ? 'var(--success)' : 'var(--danger)' }}><Icon name={trend > 0 ? 'arrow_upward' : 'arrow_downward'} size={12} />{trend > 0 ? '+' : ''}{trend}%</span>}
            </div>
            <div style={{ marginTop: 8 }}><Progress value={stats.progress} color="var(--primary)" /></div>
          </div>

          <div className="card kpi-clickable" onClick={() => setPanel('insights')} style={{ padding: '12px 14px', cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}><Icon name="speed" size={15} color={pva.onTrackPct >= 90 ? 'var(--success)' : pva.onTrackPct >= 60 ? '#EAB308' : 'var(--danger)'} /><span className="cap" style={{ fontSize: 9, color: 'var(--theme-text-muted)' }}>No Prazo</span></div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
              <span className="font-sq" style={{ fontSize: 26, fontWeight: 800, lineHeight: 1, color: pva.onTrackPct >= 90 ? 'var(--success)' : pva.onTrackPct >= 60 ? '#EAB308' : 'var(--danger)' }}>{pva.hasData ? pva.onTrackPct + '%' : '—'}</span>
              <span style={{ fontSize: 10, color: 'var(--theme-text-muted)' }}>previsto × feito</span>
            </div>
            <div style={{ marginTop: 8 }}><Progress value={pva.onTrackPct} color={pva.onTrackPct >= 90 ? 'var(--success)' : pva.onTrackPct >= 60 ? '#EAB308' : 'var(--danger)'} /></div>
          </div>

          <div className="card kpi-clickable" onClick={() => setPanel('validation')} style={{ padding: '12px 14px', cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}><Icon name="verified" size={15} color="#6366F1" /><span className="cap" style={{ fontSize: 9, color: 'var(--theme-text-muted)' }}>Validações</span></div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
              <span className="font-sq" style={{ fontSize: 26, fontWeight: 800, color: '#4F46E5', lineHeight: 1 }}>{stats.coordPending}</span>
              <span style={{ fontSize: 10, color: 'var(--theme-text-muted)' }}>pendentes · {stats.coordApproved}/{stats.coordTotal} ok</span>
            </div>
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, color: '#6366F1' }}><Icon name="bolt" size={12} />Ver fila de coordenação</div>
          </div>

          <div className="card" style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}><Icon name="warning" size={15} color={stats.overdue ? 'var(--danger)' : 'var(--success)'} /><span className="cap" style={{ fontSize: 9, color: 'var(--theme-text-muted)' }}>Em Atraso</span></div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 2 }}>
              <span className="font-sq" style={{ fontSize: 26, fontWeight: 800, color: stats.overdue ? 'var(--danger)' : 'var(--success)', lineHeight: 1 }}>{stats.overdue}</span>
              <span style={{ fontSize: 10, color: 'var(--theme-text-muted)' }}>{stats.overdue ? 'requer ação imediata' : 'todas metas em dia'}</span>
            </div>
            <div style={{ marginTop: 8 }}><Progress value={stats.overdue ? 100 : 0} color="var(--danger)" /></div>
          </div>
        </div>

        {/* ===== RESUMO: PLANEJADO vs. FORA DO PLANO ===== */}
        <div className="no-print plan-strip" style={{ marginBottom: 'var(--gap)' }}>
          <div className="plan-strip-status">
            {planLock ? (
              <React.Fragment>
                <span className="plan-dot locked"><Icon name="lock" size={14} /></span>
                <div style={{ minWidth: 0 }}>
                  <div className="cap" style={{ fontSize: 9, color: 'var(--theme-text-muted)' }}>Planejamento</div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--theme-text)' }}>Lançado · novas demandas são sinalizadas</div>
                </div>
                <button className="btn-icon" title="Reabrir planejamento (parar de marcar novas)" onClick={unlockPlan} style={{ marginLeft: 'auto' }}><Icon name="lock_open" size={17} /></button>
              </React.Fragment>
            ) : (
              <React.Fragment>
                <span className="plan-dot open"><Icon name="lock_open" size={14} /></span>
                <div style={{ minWidth: 0 }}>
                  <div className="cap" style={{ fontSize: 9, color: 'var(--theme-text-muted)' }}>Planejamento</div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--theme-text)' }}>Em aberto · monte a semana e feche o lançamento</div>
                </div>
                <button className="btn btn-primary" onClick={lockPlan} style={{ marginLeft: 'auto' }}><Icon name="flag" size={15} />Fechar lançamento</button>
              </React.Fragment>
            )}
          </div>
          <div className="plan-strip-chips">
            <button className={'origin-chip nova' + (fOrigin === 'unplanned' ? ' active' : '')} onClick={() => setFOrigin(o => o === 'unplanned' ? 'all' : 'unplanned')} disabled={stats.nova === 0}>
              <span className="oc-count">{stats.nova}</span>
              <span className="oc-label"><Icon name="bolt" size={13} />Novas nesta semana</span>
            </button>
            <button className={'origin-chip carried' + (fOrigin === 'carried' ? ' active' : '')} onClick={() => setFOrigin(o => o === 'carried' ? 'all' : 'carried')} disabled={stats.carried === 0}>
              <span className="oc-count">{stats.carried}</span>
              <span className="oc-label"><Icon name="history" size={13} />Vindas da semana anterior</span>
            </button>
          </div>
        </div>

        {/* ===== TOOLBAR ===== */}
        <div className="no-print" style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--gap)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div className="seg">
              {views.map(v => <button key={v.k} className={groupBy === v.k ? 'active' : ''} onClick={() => setGroupBy(v.k)}><Icon name={v.icon} size={14} />{v.label}</button>)}
            </div>
            <div className="seg desktop-only">
              <button className={layout === 'list' ? 'active' : ''} onClick={() => setLayout('list')} title="Faixas horizontais"><Icon name="view_agenda" size={14} /></button>
              <button className={layout === 'board' ? 'active' : ''} onClick={() => setLayout('board')} title="Colunas (quadro)"><Icon name="view_week" size={14} /></button>
            </div>
          </div>

          <div className="desktop-only" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <select className="select" style={{ width: 'auto', padding: '6px 30px 6px 12px', fontSize: 11.5 }} value={fProject} onChange={e => setFProject(e.target.value)}>
              <option value="all">Todos projetos</option>{integratedProjects.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
            </select>
            <select className="select" style={{ width: 'auto', padding: '6px 30px 6px 12px', fontSize: 11.5 }} value={fPerson} onChange={e => setFPerson(e.target.value)}>
              <option value="all">Toda equipe</option>{integratedPeople.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
            </select>
            <select className="select" style={{ width: 'auto', padding: '6px 30px 6px 12px', fontSize: 11.5 }} value={fDisc} onChange={e => setFDisc(e.target.value)}>
              <option value="all">Disciplinas</option>{integratedDisciplines.map(d => <option key={d.code} value={d.code}>{d.code}</option>)}
            </select>
            <button className={'btn-icon' + (onlyOverdue ? ' on-danger' : '')} title="Só atrasadas" onClick={() => setOnlyOverdue(v => !v)}><Icon name="warning" size={16} /></button>
            {filtersActive && <button className="btn-icon" title="Limpar filtros" onClick={clearFilters}><Icon name="filter_alt_off" size={16} /></button>}

            <div style={{ position: 'relative' }}>
              <button className="btn btn-ghost" style={{ padding: '7px 12px' }} onClick={(e) => { e.stopPropagation(); setExportMenu(m => !m); }}><Icon name="download" size={14} />Relatório PDF<Icon name="expand_more" size={13} /></button>
              {exportMenu && (
                <div className="status-menu" style={{ right: 0, left: 'auto', minWidth: 232 }} onClick={e => e.stopPropagation()}>
                  <label className="export-opt" onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={exportChecklist} onChange={e => setExportChecklist(e.target.checked)} />
                    <span><Icon name="checklist" size={14} />Incluir checklist</span>
                  </label>
                  <div style={{ height: 1, background: 'var(--theme-divider)', margin: '4px 6px' }}></div>
                  <button onClick={() => doExport('all')}><Icon name="calendar_month" size={14} />Exportar semana inteira</button>
                  <button onClick={() => doExport('filtered')}><Icon name="filter_alt" size={14} />Exportar visão filtrada</button>
                </div>
              )}
            </div>
          </div>

          <button className="btn btn-ghost mobile-only" onClick={() => setShowFilters(true)}><Icon name="tune" size={14} />Filtros{filtersActive ? ' •' : ''}</button>
        </div>

        {/* ===== MAIN LIST / BOARD ===== */}
        {(() => {
          const renderCards = (list: WeeklyTask[], dayKey: string | null) => list.map(task => {
            const total = taskDuration(task);
            const span = (dayKey && total > 1) ? {
              part: (DAY_IDX[dayKey] - startIdx(task) + 1),
              total,
              isEnd: DAY_IDX[dayKey] === endIdx(task),
              isStart: DAY_IDX[dayKey] === startIdx(task)
            } : null;
            return (
              <TaskCard
                key={task.id + '@' + (dayKey || 'x')}
                task={task}
                groupBy={groupBy}
                showProjColor={t.projColors}
                canValidate={canValidate}
                span={span}
                getProjColor={getProjColor}
                getProjCode={getProjCode}
                getDiscMeta={getDiscMeta}
                getPersonMeta={getPersonMeta}
                {...cardEvents}
              />
            );
          });

          return (
            <div style={{ flex: 1 }}>
              {layout === 'board' ? (
                <div className="board" style={{ '--cols': columns.length } as React.CSSProperties}>
                  {columns.map(col => (
                    <Column key={col.key} meta={{ label: col.label }} tasks={col.list} accent={col.accent} isToday={col.isToday}
                      dropping={dropCol === col.key && groupBy === 'day'}
                      onDragOver={groupBy === 'day' ? (e: React.DragEvent) => { e.preventDefault(); setDropCol(col.key); } : undefined}
                      onDrop={groupBy === 'day' ? onDropDay(col.key) : undefined}>
                        {renderCards(col.list, groupBy === 'day' ? col.key : null)}
                    </Column>
                  ))}
                </div>
              ) : (
                <div className="stack">
                  {columns.map(col => (
                    <Band key={col.key} meta={{ label: col.label }} tasks={col.list} accent={col.accent} isToday={col.isToday}
                      dropping={dropCol === col.key && groupBy === 'day'}
                      onDragOver={groupBy === 'day' ? (e: React.DragEvent) => { e.preventDefault(); setDropCol(col.key); } : undefined}
                      onDrop={groupBy === 'day' ? onDropDay(col.key) : undefined}>
                        {renderCards(col.list, groupBy === 'day' ? col.key : null)}
                    </Band>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {groupBy === 'day' && (
          <p className="no-print desktop-only" style={{ textAlign: 'center', fontSize: 11, color: 'var(--theme-text-muted)', marginTop: 14 }}>
            <Icon name="drag_indicator" size={13} style={{ marginRight: 4 }} />Dica: arraste os cartões entre os dias da semana para reorganizar a agenda
          </p>
        )}
      </div>

      {/* ===== PRINT DOC ===== */}
      <PrintSheet tasks={printTasks} weekLabel={'SEMANA ' + wl} stats={printStats} pva={printPva} trend={trend} scope={exportScope} coord={coord} getProjColor={getProjColor} getProjCode={getProjCode} getDiscMeta={getDiscMeta} getPersonMeta={getPersonMeta} showChecklist={exportChecklist} />

      {/* ===== MOBILE BOTTOM NAV ===== */}
      <nav className="bottom-nav no-print">
        <NavBtn icon="dashboard" label="Agenda" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} active />
        <NavBtn icon="insights" label="Painel" onClick={() => setPanel('insights')} />
        <button onClick={() => setModal({ open: true, task: null })} style={{ border: 'none', background: 'var(--primary)', width: 44, height: 44, borderRadius: 14, color: '#fff', cursor: 'pointer', boxShadow: '0 8px 18px -6px color-mix(in srgb, var(--primary) 60%, transparent)', marginTop: -20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="add" size={22} /></button>
        <NavBtn icon="verified" label="Validar" onClick={() => setPanel('validation')} badge={stats.coordPending > 0} />
        <NavBtn icon="tune" label="Filtros" onClick={() => setShowFilters(true)} badge={filtersActive} />
      </nav>

      {/* ===== MOBILE FILTER SHEET ===== */}
      {showFilters && (
        <div className="overlay no-print mobile-only" onClick={() => setShowFilters(false)} style={{ alignItems: 'flex-end', padding: 0 }}>
          <div className="card" onClick={e => e.stopPropagation()} style={{ width: '100%', borderRadius: '24px 24px 0 0', padding: 20, animation: 'slideUp .3s cubic-bezier(.16,1,.3,1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 className="t-h2" style={{ margin: 0, fontSize: 14 }}>Filtros de Agenda</h2>
              <button className="btn-icon" onClick={() => setShowFilters(false)}><Icon name="close" size={16} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div><label className="field-label">Projeto</label><select className="select" value={fProject} onChange={e => setFProject(e.target.value)}><option value="all">Todos projetos</option>{integratedProjects.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}</select></div>
              <div><label className="field-label">Responsável</label><select className="select" value={fPerson} onChange={e => setFPerson(e.target.value)}><option value="all">Toda equipe</option>{integratedPeople.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}</select></div>
              <div><label className="field-label">Disciplina</label><select className="select" value={fDisc} onChange={e => setFDisc(e.target.value)}><option value="all">Todas</option>{integratedDisciplines.map(d => <option key={d.code} value={d.code}>{d.code} · {d.name}</option>)}</select></div>
              <button className={'btn ' + (onlyValidate ? 'btn-primary' : 'btn-ghost')} onClick={() => setOnlyValidate(v => !v)} style={{ width: '100%' }}><Icon name="verified" size={14} />Requer validação</button>
              <button className={'btn ' + (onlyOverdue ? 'btn-primary' : 'btn-ghost')} onClick={() => setOnlyOverdue(v => !v)} style={{ width: '100%', ...(onlyOverdue ? { background: 'var(--danger)' } : {}) }}><Icon name="warning" size={14} />Só atrasadas</button>
              <button className="btn btn-ghost" style={{ width: '100%' }} onClick={() => doExport('all')}><Icon name="download" size={14} />Exportar PDF</button>
              <button className="btn btn-ghost" style={{ width: '100%' }} onClick={clearFilters}>Limpar todos filtros</button>
            </div>
          </div>
        </div>
      )}

      {/* Modals & Overlays */}
      <TaskModal open={modal.open} initial={modal.task} weekOffset={offset} onClose={() => setModal({ open: false, task: null })} onSave={saveTask} integratedProjects={integratedProjects} integratedPeople={integratedPeople} integratedDisciplines={integratedDisciplines} handleAddProject={handleAddProject} handleAddPerson={handleAddPerson} handleAddDiscipline={handleAddDiscipline} />
      <CoordManager open={coordMgr} activeCoord={coord} onClose={() => setCoordMgr(false)} onAdd={handleAddCoord} onUpdateRole={handleUpdateCoordRole} onRemove={handleRemoveCoord} integratedPeople={integratedPeople} />
      <InsightsPanel open={panel === 'insights'} onClose={() => setPanel(null)} tasks={tasks} weekOffset={offset} prevProgress={prevProgress} integratedPeople={integratedPeople} integratedDisciplines={integratedDisciplines} getProjColor={getProjColor} getProjCode={getProjCode} />
      <ValidationPanel open={panel === 'validation'} onClose={() => setPanel(null)} tasks={tasks} onValidate={validate} onOpenTask={(tk: any) => { setPanel(null); setModal({ open: true, task: tk }); }} getProjColor={getProjColor} getProjCode={getProjCode} getDiscMeta={getDiscMeta} />

      {/* ===== ADJUSTMENTS (TWEAKS) POPUP ===== */}
      {tweaksOpen && (
        <div className="overlay no-print" onClick={() => setTweaksOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 360 }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--theme-divider)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 className="t-h2" style={{ margin: 0, fontSize: 14 }}>Ajustes de Design</h2>
              <button className="btn-icon" onClick={() => setTweaksOpen(false)}><Icon name="close" size={16} /></button>
            </div>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <TweakColor label="Cor de Destaque" value={t.accent} options={['#FF6B4A', '#6366F1', '#10B981', '#0EA5E9', '#EC4899']} onChange={v => updateTweak('accent', v)} />
              <TweakRadio label="Estilo dos Cards" value={t.cardStyle} options={['soft', 'neuro']} onChange={v => updateTweak('cardStyle', v)} />
              <TweakRadio label="Densidade da Tabela" value={t.density} options={['compact', 'comfy', 'roomy']} onChange={v => updateTweak('density', v)} />
              <TweakToggle label="Cor por Projeto nos Cards" value={t.projColors} onChange={v => updateTweak('projColors', v)} />
              <TweakToggle label="Grade de Fundo Decorativa" value={t.bgGrid} onChange={v => updateTweak('bgGrid', v)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// DETAILED AUX COMPONENTS
// ==========================================

function NavBtn({ icon, label, onClick, active, badge }: { icon: string; label: string; onClick: () => void; active?: boolean; badge?: boolean }) {
  return (
    <button onClick={onClick} style={{ border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '4px 8px', color: active ? 'var(--primary)' : 'var(--theme-text-muted)', position: 'relative' }}>
      <Icon name={icon} size={21} />
      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 8.5, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</span>
      {badge && <span style={{ position: 'absolute', top: 2, right: 6, width: 7, height: 7, borderRadius: '50%', background: 'var(--primary)' }} />}
    </button>
  );
}

function Avatar({ name, size = 24, ring, meta }: { name: string; size?: number; ring?: boolean; meta?: any }) {
  return (
    <span className="avatar" title={name + (meta?.role ? ' · ' + meta.role : '')}
      style={{ width: size, height: size, fontSize: size * 0.38, background: meta?.color || '#94A3B8',
        boxShadow: ring ? `0 0 0 2px #fff, 0 0 0 4px ${meta?.color || '#94A3B8'}55` : undefined }}>
      {initials(name)}
    </span>
  );
}

function DiscTag({ code, meta }: { code: string; meta: any }) {
  if (!meta) return null;
  return <span className="chip" style={{ background: meta.color + '1A', color: meta.color, border: `1px solid ${meta.color}33` }} title={meta.name}>{code}</span>;
}

function fmtDue(dueStr: string) {
  const d = parseYmd(dueStr); if (!d) return '';
  return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0');
}

// Status dropdown selector
function StatusControl({ value, onChange }: { value: string; onChange: (s: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, []);
  const cur = STATUSES.find(s => s.key === value) || STATUSES[0];
  return (
    <span ref={ref} style={{ position: 'relative' }}>
      <button className="status-pill no-print" onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
        style={{ background: cur.color + '1A', color: cur.color, border: `1px solid ${cur.color}44` }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: cur.color }} />{cur.short}
        <Icon name="expand_more" size={12} />
      </button>
      {open && (
        <div className="status-menu" onClick={e => e.stopPropagation()}>
          {STATUSES.map(s => (
            <button key={s.key} onClick={() => { onChange(s.key); setOpen(false); }}
              className={s.key === value ? 'active' : ''}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />{s.label}
              <span style={{ marginLeft: 'auto', fontSize: 9, color: 'var(--theme-text-muted)' }}>{s.pct}%</span>
            </button>
          ))}
        </div>
      )}
    </span>
  );
}

// Task Card
function TaskCard({ task, onStatus, onEdit, onDelete, onValidate, onPostpone, onDragStart, onDragEnd, showProjColor, groupBy, canValidate, getProjColor, getProjCode, getDiscMeta, getPersonMeta, span }: any) {
  const pc = getProjColor(task.project);
  const prog = taskProgress(task);
  const done = isDone(task);
  const showDeadline = !span || span.isEnd;
  const overdue = isOverdue(task) && showDeadline;
  const dueToday = isDueToday(task) && showDeadline;
  const subDone = task.subtasks ? task.subtasks.filter((s: any) => s.done).length : 0;
  const vs = task.isCoordPoint ? (VALID_STATES[task.valid || 'pending'] || VALID_STATES.pending) : null;
  const dur = taskDuration(task);

  return (
    <div
      className={'task animate-fade' + (done ? ' done' : '') + (task.isCoordPoint ? ' validate' : '') + (task.unplanned && !task.carriedFrom ? ' nova' : '') + (task.carriedFrom ? ' carried' : '') + (overdue ? ' overdue' : '')}
      draggable={groupBy === 'day'}
      onDragStart={(e) => onDragStart(e, task)} onDragEnd={onDragEnd}
    >
      {showProjColor && !task.isCoordPoint && <div className="task-accent" style={{ background: pc }} />}

      <div style={{ display: 'flex', gap: 11, alignItems: 'flex-start', paddingLeft: showProjColor && !task.isCoordPoint ? 6 : 0 }}>
        <button className={'checkbox no-print' + (done ? ' checked' : '')}
          onClick={() => onStatus(task.id, done ? 'todo' : 'done')} aria-label="Concluir">
          {done && <Icon name="check" size={13} />}
        </button>
        <span className="print-only" style={{ width: 14, height: 14, border: '1.5px solid #374151', borderRadius: 3, flexShrink: 0, marginTop: 2 }}></span>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 7 }}>
            {groupBy !== 'project' && (
              <span className="chip" style={{ background: pc + '1A', color: pc, border: `1px solid ${pc}33` }}>{getProjCode(task.project)}</span>
            )}
            <DiscTag code={task.disc} meta={getDiscMeta(task.disc)} />
            {task.carriedFrom && (
              <span className="chip" title={'Adiada de ' + task.carriedFrom + (task.postponedCount > 1 ? ' · ' + task.postponedCount + 'ª vez' : '')}
                style={{ background: '#F59E0B', color: '#fff', border: 'none' }}>
                <Icon name="history" size={11} />Adiada{task.postponedCount > 1 ? ' ×' + task.postponedCount : ''}
              </span>
            )}
            {task.unplanned && !task.carriedFrom && (
              <span className="chip" title="Demanda nova — surgiu durante a semana (fora do planejamento inicial)"
                style={{ background: '#FF6B4A', color: '#fff', border: 'none', boxShadow: '0 2px 8px -2px #FF6B4AAA' }}>
                <Icon name="bolt" size={11} />Nova
              </span>
            )}
            {groupBy !== 'assignee' && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <Avatar name={task.assignee} size={18} meta={getPersonMeta(task.assignee)} />
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--theme-text)' }}>{task.assignee}</span>
              </span>
            )}
          </div>

          <p className="task-text" style={{ margin: '0 0 9px', fontSize: 13, lineHeight: 1.45, color: 'var(--theme-text)', textWrap: 'pretty' }}>{task.text}</p>

          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 7 }}>
            <div style={{ flex: 1 }}><Progress value={prog} color={done ? 'var(--success)' : (prog >= 85 ? '#EAB308' : prog > 0 ? '#0EA5E9' : 'var(--theme-divider)')} height={3} /></div>
            <span className="font-sq" style={{ fontSize: 9, fontWeight: 800, color: 'var(--theme-text-muted)', minWidth: 26, textAlign: 'right' }}>{prog}%</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
            <StatusControl value={task.status || (task.completed ? 'done' : 'todo')} onChange={(s) => onStatus(task.id, s)} />
            {task.subtasks && task.subtasks.length > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 600, color: 'var(--theme-text-muted)' }}>
                <Icon name="checklist" size={12} />{subDone}/{task.subtasks.length}
              </span>
            )}
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 600, color: 'var(--theme-text-muted)' }} title="Peso / esforço">
              <Icon name="fitness_center" size={11} />{task.weight || 1}
            </span>
            {dur > 1 && (
              <span className="dur-pill" title={'Atividade de ' + dur + ' dias' + (span ? ' · dia ' + span.part + ' de ' + span.total : '')}>
                <Icon name="date_range" size={12} />{span ? 'Dia ' + span.part + '/' + span.total : dur + ' dias'}
              </span>
            )}
            {task.dueDate && showDeadline && (
              <span className={'due' + (overdue ? ' is-over' : dueToday ? ' is-today' : '')}>
                <Icon name={overdue ? 'event_busy' : 'event'} size={11} />{dur > 1 ? 'Entrega ' : ''}{fmtDue(task.dueDate)}{overdue ? ' · ATRASO' : dueToday ? ' · HOJE' : ''}
              </span>
            )}
            {span && !span.isEnd && (
              <span className="due continues"><Icon name="arrow_forward" size={11} />Continua</span>
            )}
            {task.time && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 600, color: 'var(--theme-text-muted)' }}>
                <Icon name="schedule" size={11} />{task.time}
              </span>
            )}
          </div>

          {task.isCoordPoint && vs && (
            <div className="no-print" style={{ marginTop: 9, padding: '6px 8px', borderRadius: 8, background: vs.color + '14', border: `1px solid ${vs.color}33`, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span className="chip" style={{ background: vs.color + '22', color: vs.color, border: 'none' }}><Icon name="verified" size={11} />{vs.label}</span>
              {canValidate ? (
                <React.Fragment>
                  {task.valid !== 'approved' && <button className="mini-btn ok" onClick={() => onValidate(task.id, 'approved')}><Icon name="check" size={12} />Aprovar</button>}
                  {task.valid !== 'returned' && <button className="mini-btn no" onClick={() => onValidate(task.id, 'returned')}><Icon name="undo" size={12} />Devolver</button>}
                </React.Fragment>
              ) : (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, color: 'var(--theme-text-muted)' }}><Icon name="lock" size={11} />Coordenação</span>
              )}
            </div>
          )}
        </div>

        <div className="no-print task-actions" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <button className="row-btn" onClick={() => onEdit(task)} aria-label="Editar"><Icon name="edit" size={14} /></button>
          {!done && onPostpone && (
            <button className="row-btn warn" onClick={() => onPostpone(task.id)} aria-label="Adiar para próxima semana" title="Adiar para a próxima semana"><Icon name="next_week" size={14} /></button>
          )}
          <button className="row-btn danger" onClick={() => onDelete(task.id)} aria-label="Excluir"><Icon name="delete" size={14} /></button>
        </div>
      </div>
    </div>
  );
}

// Kanban Column
function Column({ meta, tasks, isToday, onDrop, onDragOver, dropping, children, accent }: any) {
  const pct = weightedProgress(tasks);
  return (
    <div className={'col' + (isToday ? ' today' : '') + (dropping ? ' dropping' : '')} onDrop={onDrop} onDragOver={onDragOver}>
      <div style={{ padding: '10px 12px 8px', borderBottom: '1px solid var(--theme-divider)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
            {accent && <span style={{ width: 8, height: 8, borderRadius: '50%', background: accent, flexShrink: 0 }} />}
            <h3 className="t-h3" style={{ margin: 0, fontSize: 12, color: 'var(--theme-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{meta.label}</h3>
            {isToday && <span className="chip" style={{ background: 'var(--primary)', color: '#fff' }}>Hoje</span>}
          </div>
          <span className="font-sq" style={{ fontSize: 10, fontWeight: 800, color: 'var(--theme-text-muted)' }}>{pct}%</span>
        </div>
        <div style={{ marginTop: 6 }}><Progress value={pct} color={accent || 'var(--success)'} height={4} /></div>
      </div>
      <div className="col-body">
        {children}
      </div>
    </div>
  );
}

// Horizontal Band
function Band({ meta, tasks, isToday, accent, dropping, onDrop, onDragOver, children }: any) {
  const pct = weightedProgress(tasks);
  return (
    <div className={'band' + (isToday ? ' today' : '') + (dropping ? ' dropping' : '')} onDrop={onDrop} onDragOver={onDragOver}>
      <div className="band-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          {accent && <span style={{ width: 8, height: 8, borderRadius: '50%', background: accent, flexShrink: 0 }} />}
          <h3 className="t-h3" style={{ margin: 0, fontSize: 12.5, color: 'var(--theme-text)' }}>{meta.label}</h3>
          {isToday && <span className="chip" style={{ background: 'var(--primary)', color: '#fff' }}>Hoje</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <div style={{ width: 100 }}><Progress value={pct} color={accent || 'var(--success)'} height={4} /></div>
          <span className="font-sq" style={{ fontSize: 11, fontWeight: 800, color: 'var(--theme-text-muted)', minWidth: 34, textAlign: 'right' }}>{pct}%</span>
        </div>
      </div>
      <div className="band-body">
        {children}
        {tasks.length === 0 && <div style={{ padding: '8px 4px', color: 'var(--theme-text-muted)', fontSize: 11.5, fontStyle: 'italic' }}>Sem atividades alocadas.</div>}
      </div>
    </div>
  );
}

// KPIs card
function KpiCard({ icon, label, value, sub, color, gradient, trend }: any) {
  const styleBase = gradient ? { background: gradient, color: '#fff', border: 'none' } : { background: 'var(--theme-card)', color: 'var(--theme-text)' };
  return (
    <div className="card" style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6, ...styleBase }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, opacity: gradient ? .92 : 1 }}>
        <Icon name={icon} size={15} color={gradient ? '#fff' : color} />
        <span className="cap" style={{ fontSize: 9, color: gradient ? '#fff' : 'var(--theme-text-muted)' }}>{label}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        <span className="font-sq" style={{ fontSize: 26, fontWeight: 800, color: gradient ? '#fff' : (color || 'var(--theme-text)'), lineHeight: 1 }}>{value}</span>
        {sub && <span style={{ fontSize: 10, fontWeight: 600, opacity: .8 }}>{sub}</span>}
        {trend != null && trend !== 0 && (
          <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 10, fontWeight: 800, color: gradient ? '#fff' : (trend > 0 ? 'var(--success)' : 'var(--danger)') }}>
            <Icon name={trend > 0 ? 'trending_up' : 'trending_down'} size={12} />{trend > 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
    </div>
  );
}

// Select with Add option helper
function SelectOrAdd({ value, onChange, options, onAdd, placeholder, addLabel }: any) {
  const [adding, setAdding] = useState(false);
  const [txt, setTxt] = useState('');
  const confirm = () => { const v = onAdd(txt); if (v) { onChange(v); } setAdding(false); setTxt(''); };
  if (adding) {
    return (
      <div style={{ display: 'flex', gap: 6 }}>
        <input className="input" autoFocus value={txt} onChange={e => setTxt(e.target.value)} placeholder={placeholder}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); confirm(); } if (e.key === 'Escape') { setAdding(false); setTxt(''); } }} style={{ fontSize: 12 }} />
        <button type="button" className="btn btn-primary" style={{ flexShrink: 0, padding: '0 10px' }} onClick={confirm}><Icon name="check" size={14} /></button>
        <button type="button" className="btn-icon" style={{ flexShrink: 0 }} onClick={() => { setAdding(false); setTxt(''); }}><Icon name="close" size={14} /></button>
      </div>
    );
  }
  return (
    <select className="select" value={value} onChange={e => { if (e.target.value === '__add') setAdding(true); else onChange(e.target.value); }}>
      {options.map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}
      <option value="__add">＋ {addLabel}</option>
    </select>
  );
}

// Modal Task edit / create
function TaskModal({ open, initial, weekOffset, onClose, onSave, integratedProjects, integratedPeople, integratedDisciplines, handleAddProject, handleAddPerson, handleAddDiscipline }: any) {
  const blank: WeeklyTask = { text: '', day: 'Segunda', assignee: 'Yuri', project: 'Geral', disc: 'ARQ', status: 'todo', weight: 2, durationDays: 1, time: '', dueDate: '', isCoordPoint: false, valid: 'pending', subtasks: [] };
  const [form, setForm] = useState<WeeklyTask>(blank);
  const [newSub, setNewSub] = useState('');
  const isEdit = initial && initial.id != null;

  useEffect(() => {
    if (open) {
      const base = initial ? { ...blank, ...initial, subtasks: initial.subtasks ? [...initial.subtasks] : [] } : blank;
      if (!base.dueDate) base.dueDate = dateForDay(base.day, weekOffset || 0);
      setForm(base); setNewSub('');
    }
  }, [open, initial]);

  if (!open) return null;
  const set = (k: keyof WeeklyTask, v: any) => setForm(f => {
    const next = { ...f, [k]: v };
    if (k === 'day' && (!f.dueDate || f.dueDate === dateForDay(f.day, weekOffset || 0))) next.dueDate = dateForDay(v, weekOffset || 0);
    return next;
  });
  const addSub = () => { if (!newSub.trim()) return; setForm(f => ({ ...f, subtasks: [...(f.subtasks || []), { id: Date.now() + '', text: newSub.trim(), done: false }] })); setNewSub(''); };
  const toggleSub = (id: string | number) => setForm(f => ({ ...f, subtasks: f.subtasks?.map(s => s.id === id ? { ...s, done: !s.done } : s) }));
  const delSub = (id: string | number) => setForm(f => ({ ...f, subtasks: f.subtasks?.filter(s => s.id !== id) }));
  const submit = (e: React.FormEvent) => { e.preventDefault(); if (!form.text.trim()) return; onSave(form); };

  return (
    <div className="overlay no-print" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--theme-divider)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--theme-card)' }}>
          <h2 className="t-h2" style={{ margin: 0, fontSize: 14, display: 'flex', alignItems: 'center', gap: 9 }}>
            <Icon name={isEdit ? 'edit_note' : 'add_task'} size={20} color="var(--primary)" />{isEdit ? 'Editar Demanda' : 'Nova Demanda'}
          </h2>
          <button className="btn-icon" onClick={onClose} aria-label="Fechar"><Icon name="close" size={16} /></button>
        </div>

        <form onSubmit={submit} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="field-label">Atividade</label>
            <textarea className="textarea" value={form.text} onChange={e => set('text', e.target.value)} placeholder="Descreva a entrega semanal…" autoFocus required />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label className="field-label">Projeto</label>
              <SelectOrAdd value={form.project} onChange={(v: any) => set('project', v)} addLabel="Novo projeto" placeholder="Nome..."
                options={integratedProjects.map((p: any) => ({ value: p.name, label: p.name }))}
                onAdd={(txt: string) => { const p = handleAddProject(txt); return p ? p.name : null; }} /></div>
            <div><label className="field-label">Disciplina</label>
              <SelectOrAdd value={form.disc} onChange={(v: any) => set('disc', v)} addLabel="Nova disc." placeholder="Sigla..."
                options={integratedDisciplines.map((d: any) => ({ value: d.code, label: d.code + ' · ' + d.name }))}
                onAdd={(txt: string) => { const d = handleAddDiscipline(txt); return d ? d.code : null; }} /></div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label className="field-label">Responsável</label>
              <SelectOrAdd value={form.assignee} onChange={(v: any) => set('assignee', v)} addLabel="Novo resp." placeholder="Nome..."
                options={integratedPeople.map((p: any) => ({ value: p.name, label: p.name }))}
                onAdd={(txt: string) => { const p = handleAddPerson(txt); return p ? p.name : null; }} /></div>
            <div><label className="field-label">Status</label>
              <select className="select" value={form.status} onChange={e => set('status', e.target.value)}>{STATUSES.map(s => <option key={s.key} value={s.key}>{s.label} ({s.pct}%)</option>)}</select></div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <div><label className="field-label">Dia de início</label>
              <select className="select" value={form.day} onChange={e => set('day', e.target.value)}>{DAYS.map(d => <option key={d} value={d}>{d}</option>)}</select></div>
            <div><label className="field-label">Duração (dias)</label>
              <input type="number" min="1" max="5" className="input" value={form.durationDays || 1} onChange={e => set('durationDays', Math.min(5, Math.max(1, +e.target.value || 1)))} /></div>
            <div><label className="field-label">Peso (1-10)</label>
              <input type="number" min="1" max="10" className="input" value={form.weight} onChange={e => set('weight', Math.max(1, +e.target.value || 1))} /></div>
          </div>
          {(() => {
            const s = DAY_IDX[form.day] || 0; const dur = form.durationDays || 1; const eIdx = Math.min(s + dur - 1, 4);
            const clamped = s + dur - 1 > 4;
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: -6, fontSize: 11.5, color: 'var(--theme-text-muted)', fontWeight: 600 }}>
                <Icon name="event_available" size={14} color="var(--primary)" />
                {dur > 1
                  ? <span>Ocupa <b style={{ color: 'var(--theme-text)' }}>{DAYS[s]} → {DAYS[eIdx]}</b> · entrega na <b style={{ color: 'var(--theme-text)' }}>{DAYS[eIdx]}</b>{clamped ? ' (limite da semana)' : ''}</span>
                  : <span>Entrega na <b style={{ color: 'var(--theme-text)' }}>{DAYS[s]}</b></span>}
              </div>
            );
          })()}

          <div>
            <label className="field-label">Subtarefas (Checklist)</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {form.subtasks?.map(s => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', borderRadius: 8, background: 'var(--theme-input)' }}>
                  <button type="button" onClick={() => toggleSub(s.id)} style={{ width: 16, height: 16, borderRadius: 5, flexShrink: 0, border: `2px solid ${s.done ? 'var(--success)' : 'var(--theme-divider)'}`, background: s.done ? 'var(--success)' : '#fff', color: '#fff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{s.done && <Icon name="check" size={11} />}</button>
                  <span style={{ flex: 1, fontSize: 12, textDecoration: s.done ? 'line-through' : 'none', color: s.done ? 'var(--theme-text-muted)' : 'var(--theme-text)' }}>{s.text}</span>
                  <button type="button" className="row-btn danger" onClick={() => delSub(s.id)}><Icon name="close" size={12} /></button>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="input" value={newSub} onChange={e => setNewSub(e.target.value)} placeholder="Novo item..." onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSub(); } }} style={{ fontSize: 12 }} />
                <button type="button" className="btn btn-ghost" onClick={addSub} style={{ flexShrink: 0, padding: 6 }}><Icon name="add" size={14} /></button>
              </div>
            </div>
          </div>

          <button type="button" onClick={() => set('isCoordPoint', !form.isCoordPoint)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 'var(--radius-md)', border: `1px solid ${form.isCoordPoint ? '#6366F1' : 'var(--theme-divider)'}`, background: form.isCoordPoint ? '#6366F112' : 'var(--theme-highlight)', cursor: 'pointer', textAlign: 'left' }}>
            <span style={{ width: 20, height: 20, borderRadius: 7, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: form.isCoordPoint ? '#6366F1' : 'var(--theme-card)', border: `2px solid ${form.isCoordPoint ? '#6366F1' : 'var(--theme-divider)'}`, color: '#fff' }}>{form.isCoordPoint && <Icon name="check" size={13} />}</span>
            <span><span className="cap" style={{ fontSize: 9.5, color: form.isCoordPoint ? '#4F46E5' : 'var(--theme-text)', display: 'block' }}>Ponto de Coordenação</span>
              <span style={{ fontSize: 10.5, color: 'var(--theme-text-muted)' }}>Exige validação do coordenador ativo</span></span>
          </button>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', borderTop: '1px solid var(--theme-divider)', paddingTop: 14 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary"><Icon name={isEdit ? 'save' : 'add'} size={14} />{isEdit ? 'Salvar' : 'Adicionar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Coordinator roster modal manager
function CoordManager({ open, activeCoord, onClose, onAdd, onUpdateRole, onRemove, integratedPeople }: any) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  if (!open) return null;
  const list = integratedPeople.filter((p: any) => p.coordinator);
  const submit = (e: React.FormEvent) => { e.preventDefault(); if (!name.trim()) return; onAdd(name.trim(), role.trim()); setName(''); setRole(''); };
  return (
    <div className="overlay no-print" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--theme-divider)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 className="t-h2" style={{ margin: 0, fontSize: 14, display: 'flex', alignItems: 'center', gap: 9 }}><Icon name="manage_accounts" size={20} color="var(--primary)" />Coordenadores</h2>
          <button className="btn-icon" onClick={onClose}><Icon name="close" size={16} /></button>
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {list.map((c: any) => {
              const isActive = c.name === activeCoord;
              const canRemove = !isActive && list.length > 1;
              return (
                <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10, border: '1px solid var(--theme-divider)', background: isActive ? 'var(--primary-soft)' : 'var(--theme-card)' }}>
                  <Avatar name={c.name} size={28} meta={c} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>{c.name}</span>
                      {isActive && <span className="chip" style={{ background: 'var(--primary)', color: '#fff' }}>Ativo</span>}
                    </div>
                    <input className="role-input" value={c.role} placeholder="Função…"
                      onChange={e => onUpdateRole(c.name, e.target.value)} />
                  </div>
                  <button className="row-btn danger" disabled={!canRemove}
                    title={isActive ? 'Troque de perfil para remover' : 'Remover'}
                    style={{ opacity: canRemove ? 1 : .35 }}
                    onClick={() => canRemove && onRemove(c.name)}><Icon name="delete" size={15} /></button>
                </div>
              );
            })}
          </div>

          <form onSubmit={submit} style={{ borderTop: '1px solid var(--theme-divider)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span className="field-label">Promover Coordenador</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Nome" />
              <input className="input" value={role} onChange={e => setRole(e.target.value)} placeholder="Cargo" />
            </div>
            <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}><Icon name="person_add" size={14} />Adicionar</button>
          </form>
        </div>
      </div>
    </div>
  );
}

// Insights Drawer Panel
function InsightsPanel({ open, onClose, tasks, weekOffset, prevProgress, integratedPeople, integratedDisciplines, getProjColor, getProjCode }: any) {
  if (!open) return null;
  const pva = plannedVsActual(tasks, weekOffset);
  const current = weightedProgress(tasks);
  const trend = prevProgress != null ? current - prevProgress : null;
  const overdue = tasks.filter(isOverdue);

  const load = integratedPeople.filter((p: any) => tasks.some((t: any) => t.assignee === p.name)).map((p: any) => {
    const list = tasks.filter((t: any) => t.assignee === p.name);
    const w = list.reduce((a: any, t: any) => a + taskWeight(t), 0);
    return { ...p, w, ratio: Math.round(w / p.capacity * 100), prog: weightedProgress(list), count: list.length };
  });

  const discs = integratedDisciplines.filter((d: any) => tasks.some((t: any) => t.disc === d.code)).map((d: any) => {
    const list = tasks.filter((t: any) => t.disc === d.code);
    return { ...d, prog: weightedProgress(list), count: list.length };
  });

  return (
    <div className="overlay no-print" onClick={onClose} style={{ justifyContent: 'flex-end', padding: 0 }}>
      <div className="drawer" onClick={e => e.stopPropagation()}>
        <div className="drawer-head">
          <h2 className="t-h2" style={{ margin: 0, fontSize: 14, display: 'flex', alignItems: 'center', gap: 9 }}><Icon name="insights" size={20} color="var(--primary)" />Painel de Avanço</h2>
          <button className="btn-icon" onClick={onClose}><Icon name="close" size={16} /></button>
        </div>
        <div className="drawer-body">
          <section className="ins-block">
            <div className="ins-title"><Icon name="speed" size={14} />Previsto × Realizado</div>
            {pva.hasData ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8 }}>
                  <span className="font-sq" style={{ fontSize: 28, fontWeight: 900, color: pva.onTrackPct >= 90 ? 'var(--success)' : pva.onTrackPct >= 60 ? '#EAB308' : 'var(--danger)' }}>{pva.onTrackPct}%</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: pva.onTrackPct >= 90 ? 'var(--success)' : pva.onTrackPct >= 60 ? '#EAB308' : 'var(--danger)' }}>{pva.onTrackPct >= 90 ? 'NO PRAZO' : pva.onTrackPct >= 60 ? 'ATENÇÃO' : 'ATRASADO'}</span>
                </div>
                <Progress value={pva.onTrackPct} color={pva.onTrackPct >= 90 ? 'var(--success)' : pva.onTrackPct >= 60 ? '#EAB308' : 'var(--danger)'} height={6} />
              </div>
            ) : <p style={{ fontSize: 11, color: 'var(--theme-text-muted)', margin: 0 }}>Sem dados de prazo para esta semana.</p>}
          </section>

          <section className="ins-block">
            <div className="ins-title"><Icon name="trending_up" size={14} />Avanço Semanal</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span className="font-sq" style={{ fontSize: 28, fontWeight: 900, color: 'var(--primary)' }}>{current}%</span>
              {trend != null && (
                <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 12, fontWeight: 800, color: trend > 0 ? 'var(--success)' : trend < 0 ? 'var(--danger)' : 'var(--theme-text-muted)' }}>
                  <Icon name={trend > 0 ? 'arrow_upward' : trend < 0 ? 'arrow_downward' : 'remove'} size={14} />{trend > 0 ? '+' : ''}{trend}% vs. semana anterior
                </span>
              )}
            </div>
          </section>

          <section className="ins-block">
            <div className="ins-title"><Icon name="balance" size={14} />Carga por Integrante</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {load.map((p: any) => {
                const over = p.ratio > 100;
                return (
                  <div key={p.name}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <Avatar name={p.name} size={18} meta={p} />
                      <span style={{ fontSize: 12, fontWeight: 700 }}>{p.name}</span>
                      <span style={{ fontSize: 10, color: 'var(--theme-text-muted)', marginLeft: 'auto' }}>{p.w}/{p.capacity} pts</span>
                    </div>
                    <Progress value={Math.min(p.ratio, 100)} color={over ? 'var(--danger)' : p.color} height={4} />
                  </div>
                );
              })}
            </div>
          </section>

          <section className="ins-block">
            <div className="ins-title"><Icon name="category" size={14} />Avanço por Disciplina</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {discs.map((d: any) => (
                <div key={d.code} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 42, fontSize: 10, fontWeight: 700 }}><DiscTag code={d.code} meta={d} /></span>
                  <div style={{ flex: 1 }}><Progress value={d.prog} color={d.color} height={4} /></div>
                  <span className="font-sq" style={{ fontSize: 10, width: 40, textAlign: 'right', color: 'var(--theme-text-muted)' }}>{d.prog}%</span>
                </div>
              ))}
            </div>
          </section>

          {overdue.length > 0 && (
            <section className="ins-block" style={{ borderColor: '#fecaca', background: '#FEF2F2' }}>
              <div className="ins-title" style={{ color: 'var(--danger)' }}><Icon name="warning" size={14} />Demandas Atrasadas ({overdue.length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {overdue.map((t: any) => (
                  <div key={t.id} style={{ display: 'flex', gap: 7, alignItems: 'center', fontSize: 11 }}>
                    <span className="chip" style={{ background: getProjColor(t.project) + '1A', color: getProjColor(t.project), border: 'none', flexShrink: 0 }}>{getProjCode(t.project)}</span>
                    <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.text}</span>
                    <span style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--theme-text-muted)' }}>{t.assignee}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

// Validation Popover Panel
function ValidationPanel({ open, onClose, tasks, onValidate, onOpenTask, getProjColor, getProjCode, getDiscMeta }: any) {
  if (!open) return null;
  const coord = tasks.filter((t: any) => t.isCoordPoint);
  const groups: Record<string, WeeklyTask[]> = {
    pending: coord.filter((t: any) => (t.valid || 'pending') === 'pending'),
    returned: coord.filter((t: any) => t.valid === 'returned'),
    approved: coord.filter((t: any) => t.valid === 'approved'),
  };
  const Section = ({ keyName, title, icon }: { keyName: string; title: string; icon: string }) => groups[keyName].length ? (
    <section className="ins-block">
      <div className="ins-title" style={{ color: VALID_STATES[keyName].color }}><Icon name={icon} size={14} />{title} ({groups[keyName].length})</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {groups[keyName].map((t: any) => (
          <div key={t.id} style={{ border: '1px solid var(--theme-divider)', borderRadius: 10, padding: 10, borderLeft: `3px solid ${VALID_STATES[keyName].color}` }}>
            <div style={{ display: 'flex', gap: 6, marginBottom: 5, flexWrap: 'wrap', alignItems: 'center' }}>
              <span className="chip" style={{ background: getProjColor(t.project) + '1A', color: getProjColor(t.project), border: 'none' }}>{getProjCode(t.project)}</span>
              <DiscTag code={t.disc} meta={getDiscMeta(t.disc)} />
              <span style={{ fontSize: 11, fontWeight: 600 }}>{t.assignee}</span>
              <span style={{ fontSize: 10, color: 'var(--theme-text-muted)', marginLeft: 'auto' }}>{t.day}</span>
            </div>
            <p style={{ margin: '0 0 8px', fontSize: 12, lineHeight: 1.4 }}>{t.text}</p>
            <div style={{ display: 'flex', gap: 6 }}>
              {keyName !== 'approved' && <button className="mini-btn ok" onClick={() => onValidate(t.id, 'approved')}><Icon name="check" size={11} />Aprovar</button>}
              {keyName !== 'returned' && <button className="mini-btn no" onClick={() => onValidate(t.id, 'returned')}><Icon name="undo" size={11} />Devolver</button>}
              {keyName !== 'pending' && <button className="mini-btn" style={{ background: 'var(--theme-input)', color: 'var(--theme-text)' }} onClick={() => onValidate(t.id, 'pending')}><Icon name="schedule" size={11} />Reabrir</button>}
              <button className="mini-btn" style={{ background: 'var(--theme-input)', color: 'var(--theme-text)', marginLeft: 'auto' }} onClick={() => onOpenTask(t)}><Icon name="open_in_new" size={11} />Abrir</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  ) : null;

  return (
    <div className="overlay no-print" onClick={onClose} style={{ justifyContent: 'flex-end', padding: 0 }}>
      <div className="drawer" onClick={e => e.stopPropagation()}>
        <div className="drawer-head">
          <h2 className="t-h2" style={{ margin: 0, fontSize: 14, display: 'flex', alignItems: 'center', gap: 9 }}><Icon name="verified" size={20} color="#6366F1" />Fila de Validações</h2>
          <button className="btn-icon" onClick={onClose}><Icon name="close" size={16} /></button>
        </div>
        <div className="drawer-body">
          {coord.length === 0 && <p style={{ fontSize: 12, color: 'var(--theme-text-muted)' }}>Sem pontos de validação pendentes.</p>}
          <Section keyName="pending" title="Aguardando aprovação" icon="hourglass_top" />
          <Section keyName="returned" title="Devolvidos para ajuste" icon="undo" />
          <Section keyName="approved" title="Aprovados" icon="task_alt" />
        </div>
      </div>
    </div>
  );
}

// Print Sheet layout
function MiniBar({ value, color }: { value: number; color?: string }) {
  return (
    <div style={{ height: 7, borderRadius: 99, background: '#eef0f2', overflow: 'hidden', width: '100%' }}>
      <div style={{ height: '100%', width: value + '%', background: color, borderRadius: 99 }}></div>
    </div>
  );
}

function PrintSheet({ tasks, weekLabel, stats, pva, trend, scope, coord, getProjColor, getProjCode, getDiscMeta, getPersonMeta, showChecklist }: any) {
  const coordTotal = tasks.filter((t: any) => t.isCoordPoint);
  const trackColor = !pva || !pva.hasData ? '#9ca3af' : pva.onTrackPct >= 90 ? '#10B981' : pva.onTrackPct >= 60 ? '#EAB308' : '#EF4444';

  const usedProjects = Array.from(new Set(tasks.map((t: any) => t.project))).map(name => {
    return {
      name: name as string,
      code: getProjCode(name) as string,
      color: getProjColor(name) as string
    };
  });

  const usedPeople = Array.from(new Set(tasks.map((t: any) => t.assignee))).map(name => {
    const meta = getPersonMeta(name);
    return {
      name: name as string,
      role: meta.role || 'Colaborador',
      color: meta.color || '#94A3B8',
      capacity: meta.capacity || 10
    };
  });

  const usedDiscs = Array.from(new Set(tasks.map((t: any) => t.disc))).map(code => {
    const meta = getDiscMeta(code);
    return {
      code: code as string,
      name: meta ? meta.name : code,
      color: meta ? meta.color : '#64748B'
    };
  });

  return (
    <div className="print-sheet" style={{ padding: '0', color: '#1f2937', fontFamily: "'Inter', sans-serif" }}>

      {/* ===== CABEÇALHO ===== */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '3px solid #FF6B4A', paddingBottom: 10, marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 900, fontSize: 17, letterSpacing: '0.1em' }}>RELATÓRIO EXECUTIVO</div>
          <div style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 700, fontSize: 9, letterSpacing: '0.28em', color: '#6b7280', marginTop: 2 }}>COORDENAÇÃO BIM · ACOMPANHAMENTO SEMANAL{scope === 'filtered' ? ' · VISÃO FILTRADA' : ''}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 800, fontSize: 13, letterSpacing: '0.08em' }}>{weekLabel}</div>
          <div style={{ fontSize: 10, color: '#6b7280' }}>Gestor: {coord || 'Yuri'} · Emitido {new Date().toLocaleDateString('pt-BR')}</div>
        </div>
      </div>

      {/* ===== PANORAMA ===== */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, breakInside: 'avoid' }}>
        <div style={{ flex: '0 0 150px', border: '1px solid #e5e7eb', borderRadius: 12, padding: '13px 15px', background: 'linear-gradient(135deg,#FFF4F0,#fff)' }}>
          <div style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 800, fontSize: 7.5, letterSpacing: '0.2em', color: '#6b7280', marginBottom: 6 }}>AVANÇO PONDERADO</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 900, fontSize: 36, lineHeight: 1, color: '#FF6B4A' }}>{stats.progress}%</span>
            {trend != null && trend !== 0 && <span style={{ fontSize: 11, fontWeight: 800, color: trend > 0 ? '#10B981' : '#EF4444' }}>{trend > 0 ? '▲ +' : '▼ '}{trend}%</span>}
          </div>
          <div style={{ margin: '8px 0 5px' }}><MiniBar value={stats.progress} color="#FF6B4A" /></div>
          <div style={{ fontSize: 9.5, color: '#6b7280', fontWeight: 600 }}>{stats.done}/{stats.total} demandas{trend != null ? ' · vs. sem. anterior' : ''}</div>
        </div>

        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 9 }}>
          {[
            { label: 'NO PRAZO', value: pva && pva.hasData ? pva.onTrackPct + '%' : '—', sub: 'previsto × feito', color: trackColor },
            { label: 'PROJETOS', value: usedProjects.length, sub: 'ativos', color: '#0EA5E9' },
            { label: 'EQUIPE', value: usedPeople.filter(p => p.name !== 'Equipe').length, sub: 'alocados', color: '#10B981' },
            { label: 'VALIDAÇÕES', value: stats.coordApproved + '/' + stats.coordTotal, sub: stats.coordPending + ' pendentes', color: '#6366F1' },
            { label: 'ATRASADAS', value: stats.overdue, sub: stats.overdue ? 'requer ação' : 'em dia', color: stats.overdue ? '#EF4444' : '#10B981' },
            { label: 'PENDENTES', value: stats.total - stats.done, sub: 'a concluir', color: '#EAB308' },
          ].map((k, i) => (
            <div key={i} style={{ border: '1px solid #e5e7eb', borderRadius: 11, padding: '9px 12px' }}>
              <div style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 800, fontSize: 7, letterSpacing: '0.16em', color: '#9ca3af' }}>{k.label}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginTop: 2 }}>
                <span style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 800, fontSize: 19, color: k.color, lineHeight: 1 }}>{k.value}</span>
                <span style={{ fontSize: 8, color: '#6b7280' }}>{k.sub}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ===== FORA DO PLANEJADO ===== */}
      {(() => {
        const novas = tasks.filter((t: any) => t.unplanned && !t.carriedFrom);
        const adiadas = tasks.filter((t: any) => t.carriedFrom);
        if (!novas.length && !adiadas.length) return null;
        return (
          <div style={{ marginBottom: 16, breakInside: 'avoid', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', background: '#FFF7ED', borderBottom: '1px solid #fde9d3' }}>
              <span style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 800, fontSize: 9.5, letterSpacing: '0.2em' }}>FORA DO PLANEJAMENTO INICIAL</span>
              <span style={{ marginLeft: 'auto', display: 'flex', gap: 12 }}>
                <span style={{ fontSize: 9, fontWeight: 800, color: '#FF6B4A' }}>● {novas.length} NOVAS</span>
                <span style={{ fontSize: 9, fontWeight: 800, color: '#B45309' }}>● {adiadas.length} ADIADAS</span>
              </span>
            </div>
            <div style={{ padding: '8px 12px' }}>
              {[
                { tag: 'NOVA', color: '#FF6B4A', arr: novas },
                { tag: 'ADIADA', color: '#B45309', arr: adiadas }
              ].map(({ tag, color, arr }) => arr.map((t: any) => (
                <div key={tag + t.id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '3px 0', borderBottom: '1px solid #f3f4f6' }}>
                  <span style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 800, fontSize: 7, color, width: 58, flexShrink: 0 }}>● {tag}{tag === 'ADIADA' && t.postponedCount > 1 ? ' ×' + t.postponedCount : ''}</span>
                  <span style={{ fontSize: 7.5, fontWeight: 800, color: getProjColor(t.project), width: 26, flexShrink: 0 }}>{getProjCode(t.project)}</span>
                  <span style={{ fontSize: 10, flex: 1 }}>{t.text}</span>
                  <span style={{ fontSize: 9, color: '#6b7280', flexShrink: 0 }}>{t.assignee} · {t.day}{t.carriedFrom ? ' · de ' + t.carriedFrom : ''}</span>
                </div>
              )))}
            </div>
          </div>
        );
      })()}

      {/* ===== AVANÇO POR PROJETO + DISCIPLINA ===== */}
      <div style={{ display: 'flex', gap: 18, marginBottom: 16, breakInside: 'avoid' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 800, fontSize: 9.5, letterSpacing: '0.2em', marginBottom: 9, display: 'flex', alignItems: 'center', gap: 7 }}><span style={{ width: 12, height: 3, background: '#FF6B4A', borderRadius: 2 }}></span>POR PROJETO</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {usedProjects.map(p => {
              const list = tasks.filter((t: any) => t.project === p.name); const v = weightedProgress(list);
              return (
                <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 800, fontSize: 7.5, color: p.color, width: 26, flexShrink: 0 }}>{p.code}</span>
                  <span style={{ fontSize: 9.5, fontWeight: 600, width: 92, flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
                  <div style={{ flex: 1 }}><MiniBar value={v} color={p.color} /></div>
                  <span style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 800, fontSize: 9, width: 30, textAlign: 'right', flexShrink: 0 }}>{v}%</span>
                </div>
              );
            })}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 800, fontSize: 9.5, letterSpacing: '0.2em', marginBottom: 9, display: 'flex', alignItems: 'center', gap: 7 }}><span style={{ width: 12, height: 3, background: '#FF6B4A', borderRadius: 2 }}></span>POR DISCIPLINA</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {usedDiscs.map(d => {
              const list = tasks.filter((t: any) => t.disc === d.code); const v = weightedProgress(list);
              return (
                <div key={d.code} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 800, fontSize: 7.5, color: d.color, width: 30, flexShrink: 0 }}>{d.code}</span>
                  <div style={{ flex: 1 }}><MiniBar value={v} color={d.color} /></div>
                  <span style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 800, fontSize: 9, width: 46, textAlign: 'right', flexShrink: 0 }}>{list.length}× · {v}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ===== ENTREGAS POR COLABORADOR ===== */}
      <div style={{ marginBottom: 16, breakInside: 'avoid' }}>
        <div style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 800, fontSize: 9.5, letterSpacing: '0.2em', marginBottom: 9, display: 'flex', alignItems: 'center', gap: 7 }}><span style={{ width: 12, height: 3, background: '#FF6B4A', borderRadius: 2 }}></span>ENTREGAS E CARGA POR COLABORADOR</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
          <thead>
            <tr style={{ borderBottom: '1.5px solid #d1d5db' }}>
              {['Colaborador', 'Cargo', 'Demandas', 'Carga', 'Validações', 'Avanço'].map((h, i) => (
                <th key={i} style={{ textAlign: i > 1 ? 'center' : 'left', padding: '5px 6px', fontFamily: "'Orbitron', sans-serif", fontWeight: 800, fontSize: 7, letterSpacing: '0.1em', color: '#6b7280' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {usedPeople.map(p => {
              const list = tasks.filter((t: any) => t.assignee === p.name);
              const v = weightedProgress(list);
              const w = list.reduce((a: any, t: any) => a + taskWeight(t), 0);
              const ratio = Math.round(w / p.capacity * 100);
              const valids = list.filter((t: any) => t.isCoordPoint);
              const validsOk = valids.filter((t: any) => t.valid === 'approved').length;
              return (
                <tr key={p.name} style={{ borderBottom: '1px solid #eef0f2' }}>
                  <td style={{ padding: '5px 6px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 16, height: 16, borderRadius: '50%', background: p.color, color: '#fff', fontSize: 6.5, fontWeight: 800, fontFamily: "'Orbitron', sans-serif", display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{initials(p.name)}</span>
                      <span style={{ fontWeight: 700 }}>{p.name}</span>
                    </span>
                  </td>
                  <td style={{ padding: '5px 6px', color: '#6b7280', fontSize: 9 }}>{p.role}</td>
                  <td style={{ padding: '5px 6px', textAlign: 'center' }}>{list.length}</td>
                  <td style={{ padding: '5px 6px', textAlign: 'center', fontWeight: 700, color: ratio > 100 ? '#EF4444' : ratio < 50 ? '#64748B' : '#10B981' }}>{w}/{p.capacity}</td>
                  <td style={{ padding: '5px 6px', textAlign: 'center', color: valids.length ? '#4F46E5' : '#d1d5db', fontWeight: 700 }}>{valids.length ? validsOk + '/' + valids.length : '—'}</td>
                  <td style={{ padding: '5px 6px', width: 105 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ flex: 1 }}><MiniBar value={v} color={p.color} /></span>
                      <span style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 800, fontSize: 8.5, width: 26, textAlign: 'right' }}>{v}%</span>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ===== VALIDAÇÕES ===== */}
      {coordTotal.length > 0 && (
        <div style={{ marginBottom: 16, breakInside: 'avoid' }}>
          <div style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 800, fontSize: 9.5, letterSpacing: '0.2em', marginBottom: 9, display: 'flex', alignItems: 'center', gap: 7 }}><span style={{ width: 12, height: 3, background: '#6366F1', borderRadius: 2 }}></span>PONTOS DE COORDENAÇÃO / VALIDAÇÃO</div>
          {coordTotal.map((t: any) => {
            const vs = VALID_STATES[t.valid || 'pending'];
            return (
              <div key={t.id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '4px 8px', borderBottom: '1px solid #eef0f2', borderLeft: `3px solid ${vs.color}`, paddingLeft: 9 }}>
                <span style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 800, fontSize: 7, letterSpacing: '0.06em', color: vs.color, width: 64, flexShrink: 0, textTransform: 'uppercase' }}>{vs.label}</span>
                <span style={{ fontSize: 7.5, fontWeight: 800, color: getProjColor(t.project), width: 26, flexShrink: 0 }}>{getProjCode(t.project)}</span>
                <span style={{ fontSize: 10, flex: 1 }}>{t.text}</span>
                <span style={{ fontSize: 9, color: '#6b7280', flexShrink: 0 }}>{t.assignee} · {t.day}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* ===== AGENDA DETALHADA ===== */}
      <div style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 800, fontSize: 9.5, letterSpacing: '0.2em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 7 }}><span style={{ width: 12, height: 3, background: '#FF6B4A', borderRadius: 2 }}></span>AGENDA DETALHADA DA SEMANA</div>
      {DAYS.map(day => {
        const list = tasks.filter((t: any) => t.day === day);
        if (!list.length) return null;
        const dayPct = weightedProgress(list);
        return (
          <div key={day} style={{ marginBottom: 11, breakInside: 'avoid' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f3f4f6', padding: '5px 10px', borderRadius: 6, marginBottom: 5 }}>
              <span style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 800, fontSize: 10.5, letterSpacing: '0.22em', textTransform: 'uppercase' }}>{day}</span>
              <span style={{ fontSize: 9, fontWeight: 700, color: '#6b7280' }}>{list.filter(isDone).length}/{list.length} · {dayPct}%</span>
            </div>
            {list.map((t: any) => {
              const prog = taskProgress(t); const done = isDone(t); const over = isOverdue(t);
              return (
                <div key={t.id} style={{ display: 'flex', gap: 9, alignItems: 'flex-start', padding: '4px 8px', borderBottom: '1px solid #eef0f2', borderLeft: `3px solid ${over ? '#EF4444' : getProjColor(t.project)}`, paddingLeft: 10 }}>
                  <span style={{ width: 12, height: 12, border: done ? 'none' : '1.5px solid #6b7280', background: done ? '#10B981' : 'transparent', borderRadius: 3, flexShrink: 0, marginTop: 2, color: '#fff', fontSize: 10, lineHeight: '12px', textAlign: 'center', fontWeight: 900 }}>{done ? '✓' : ''}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 6, marginBottom: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 800, fontSize: 7, letterSpacing: '0.08em', color: getProjColor(t.project) }}>{getProjCode(t.project)}</span>
                      {getDiscMeta(t.disc) && <span style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 800, fontSize: 7, color: getDiscMeta(t.disc).color }}>{t.disc}</span>}
                      {(t.durationDays || 1) > 1 && <span style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 800, fontSize: 7, color: '#7C3AED' }}>{t.durationDays} DIAS</span>}
                      <span style={{ fontSize: 8.5, fontWeight: 700, color: '#374151' }}>{t.assignee}</span>
                      {t.isCoordPoint && <span style={{ fontSize: 7, fontWeight: 800, letterSpacing: '0.06em', color: '#4F46E5' }}>● VALIDAÇÃO</span>}
                      {t.unplanned && !t.carriedFrom && <span style={{ fontSize: 7, fontWeight: 800, color: '#FF6B4A' }}>● NOVA</span>}
                      {t.carriedFrom && <span style={{ fontSize: 7, fontWeight: 800, color: '#B45309' }}>● ADIADA{t.postponedCount > 1 ? ' ×' + t.postponedCount : ''}</span>}
                      {over && <span style={{ fontSize: 7, fontWeight: 800, color: '#EF4444' }}>● ATRASO</span>}
                      <span style={{ marginLeft: 'auto', fontFamily: "'Orbitron', sans-serif", fontWeight: 800, fontSize: 8, color: done ? '#10B981' : prog > 0 ? '#0EA5E9' : '#9ca3af' }}>{prog}%</span>
                    </div>
                    <div style={{ fontSize: 10.5, lineHeight: 1.3, textDecoration: done ? 'line-through' : 'none', color: done ? '#9ca3af' : '#1f2937' }}>{t.text}</div>
                    {showChecklist && t.subtasks && t.subtasks.length > 0 && (
                      <div style={{ margin: '3px 0 2px', display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {t.subtasks.map((s: any) => (
                          <div key={s.id} style={{ display: 'flex', gap: 5, alignItems: 'center', fontSize: 9 }}>
                            <span style={{ width: 8, height: 8, border: s.done ? 'none' : '1px solid #9ca3af', background: s.done ? '#10B981' : 'transparent', borderRadius: 2, flexShrink: 0, color: '#fff', fontSize: 7, lineHeight: '8px', textAlign: 'center', fontWeight: 900 }}>{s.done ? '✓' : ''}</span>
                            <span style={{ color: s.done ? '#9ca3af' : '#4b5563', textDecoration: s.done ? 'line-through' : 'none' }}>{s.text}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}

      <div style={{ marginTop: 16, paddingTop: 9, borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', fontSize: 8, color: '#9ca3af', fontFamily: "'Orbitron', sans-serif", letterSpacing: '0.1em' }}>
        <span>COORDENAÇÃO BIM</span>
        <span>RELATÓRIO DE ACOMPANHAMENTO SEMANAL</span>
      </div>
    </div>
  );
}

// Design Tweaks Panel controls
function TweakSection({ label, children }: { label: string; children?: React.ReactNode }) {
  return (
    <>
      <div className="twk-sect">{label}</div>
      {children}
    </>
  );
}

function TweakRow({ label, value, children, inline = false }: { label: string; value?: string; children?: React.ReactNode; inline?: boolean }) {
  return (
    <div className={inline ? 'twk-row twk-row-h' : 'twk-row'}>
      <div className="twk-lbl">
        <span>{label}</span>
        {value != null && <span className="twk-val">{value}</span>}
      </div>
      {children}
    </div>
  );
}

function TweakToggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="twk-row twk-row-h">
      <div className="twk-lbl"><span>{label}</span></div>
      <button type="button" className="twk-toggle" data-on={value ? '1' : '0'}
        role="switch" aria-checked={value}
        onClick={() => onChange(!value)}><i /></button>
    </div>
  );
}

function TweakRadio({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const n = options.length;
  const idx = Math.max(0, options.indexOf(value));
  const onPointerDown = (e: React.PointerEvent) => {
    const r = trackRef.current?.getBoundingClientRect();
    if (!r) return;
    const inner = r.width - 4;
    const i = Math.floor(((e.clientX - r.left - 2) / inner) * n);
    const chosen = options[Math.max(0, Math.min(n - 1, i))];
    onChange(chosen);
  };
  return (
    <TweakRow label={label}>
      <div ref={trackRef} role="radiogroup" onPointerDown={onPointerDown} className="twk-seg">
        <div className="twk-seg-thumb"
          style={{ left: `calc(2px + ${idx} * (100% - 4px) / ${n})`,
            width: `calc((100% - 4px) / ${n})` }} />
        {options.map(o => (
          <button key={o} type="button" role="radio" aria-checked={o === value}>
            {o}
          </button>
        ))}
      </div>
    </TweakRow>
  );
}

function TweakColor({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  const key = (o: string) => String(o).toLowerCase();
  const cur = key(value);
  return (
    <TweakRow label={label}>
      <div className="twk-chips" role="radiogroup">
        {options.map((o, i) => {
          const on = key(o) === cur;
          const light = rbgIsLight(o);
          return (
            <button key={i} type="button" className="twk-chip" role="radio"
              aria-checked={on} data-on={on ? '1' : '0'}
              style={{ background: o }}
              onClick={() => onChange(o)}>
              {on && (
                <svg viewBox="0 0 14 14" aria-hidden="true" style={{ position: 'absolute', top: 6, left: 6, width: 13, height: 13 }}>
                  <path d="M3 7.2 5.8 10 11 4.2" fill="none" strokeWidth="2.2"
                    strokeLinecap="round" strokeLinejoin="round"
                    stroke={light ? 'rgba(0,0,0,.78)' : '#fff'} />
                </svg>
              )}
            </button>
          );
        })}
      </div>
    </TweakRow>
  );
}

function rbgIsLight(hex: string) {
  const h = String(hex).replace('#', '');
  const x = h.length === 3 ? h.replace(/./g, (c) => c + c) : h.padEnd(6, '0');
  const n = parseInt(x.slice(0, 6), 16);
  if (Number.isNaN(n)) return true;
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return r * 299 + g * 587 + b * 114 > 148000;
}

// ==========================================
// TWEAK DEFAULTS & GLOBAL CSS STYLES
// ==========================================

const TWEAK_DEFAULTS = {
  accent: '#FF6B4A',
  cardStyle: 'soft',
  density: 'comfy',
  projColors: true,
  bgGrid: true
};

const LOCAL_STYLES = `
.weekly-agenda-container {
  --theme-bg: #F0F2F5;
  --theme-card: #FFFFFF;
  --theme-highlight: #F9FAFB;
  --theme-input: #F3F4F6;
  --theme-text: #374151;
  --theme-text-muted: #9CA3AF;
  --theme-divider: #E5E7EB;

  --primary: var(--weekly-primary, #FF6B4A);
  --primary-soft: var(--weekly-primary-soft, #FF6B4A18);
  --primary-fg: #FFFFFF;

  --success: #10B981;
  --warning: #EAB308;
  --danger: #EF4444;
  --info: #00D4FF;

  --font-sans: 'Inter', system-ui, sans-serif;
  --font-display: 'Orbitron', 'Inter', sans-serif;

  --radius-card: 20px;
  --radius-lg: 14px;
  --radius-md: 10px;
  --radius-sm: 8px;

  --shadow-soft: 0 4px 18px -6px rgba(17,24,39,0.06), 0 0 1px 0 rgba(0,0,0,0.04);
  --shadow-hover: 0 12px 28px -10px rgba(17,24,39,0.12);
  --shadow-neuro: 10px 10px 24px #d6dae0, -10px -10px 24px #ffffff;

  --tracking-wide: 0.1em;
  --tracking-widest: 0.2em;

  --gap: 12px;
  --card-pad: 12px;

  background-color: transparent;
  color: var(--theme-text);
  font-family: var(--font-sans);
  min-height: 100%;
  border-radius: 0px;
  transition: background-color 0.2s, color 0.2s;
  box-sizing: border-box;

  background-image:
    linear-gradient(rgba(255,255,255,0.4) 2px, transparent 2px),
    linear-gradient(90deg, rgba(255,255,255,0.4) 2px, transparent 2px),
    linear-gradient(rgba(255,255,255,0.2) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.2) 1px, transparent 1px);
  background-size: 100px 100px, 100px 100px, 20px 20px, 20px 20px;
}

.weekly-agenda-container.dark {
  --theme-bg: #0F172A;
  --theme-card: #1E293B;
  --theme-highlight: #334155;
  --theme-input: #0F172A;
  --theme-text: #F3F4F6;
  --theme-text-muted: #9CA3AF;
  --theme-divider: #334155;
  --shadow-neuro: 6px 6px 20px #090d16, -6px -6px 20px #1c2738;
  
  background-image:
    linear-gradient(rgba(15,23,42,0.3) 2px, transparent 2px),
    linear-gradient(90deg, rgba(15,23,42,0.3) 2px, transparent 2px),
    linear-gradient(rgba(15,23,42,0.15) 1px, transparent 1px),
    linear-gradient(90deg, rgba(15,23,42,0.15) 1px, transparent 1px);
}

.weekly-agenda-container.nogrid {
  background-image: none !important;
}

.weekly-agenda-container * {
  box-sizing: border-box;
}

.weekly-agenda-container .font-sq {
  font-family: var(--font-display);
}

.weekly-agenda-container .t-h1 {
  font-family: var(--font-display);
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
  color: var(--theme-text);
}

.weekly-agenda-container .t-h2 {
  font-family: var(--font-display);
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
  color: var(--theme-text);
}

.weekly-agenda-container .t-h3 {
  font-family: var(--font-display);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--tracking-widest);
  color: var(--theme-text);
}

.weekly-agenda-container .cap {
  text-transform: uppercase;
  letter-spacing: var(--tracking-widest);
  font-family: var(--font-display);
  font-weight: 900;
}

/* Cards style */
.weekly-agenda-container .card {
  background: var(--theme-card);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-soft);
  border: 1px solid var(--theme-divider);
  transition: transform .18s, box-shadow .18s;
}

.weekly-agenda-container.neuro .card {
  box-shadow: var(--shadow-neuro);
  border: none;
}

/* Buttons */
.weekly-agenda-container .btn {
  border: none;
  cursor: pointer;
  font-family: var(--font-display);
  font-weight: 900;
  font-size: 9px;
  letter-spacing: var(--tracking-widest);
  text-transform: uppercase;
  border-radius: var(--radius-md);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 16px;
  transition: transform .18s, box-shadow .18s, background .18s;
}

.weekly-agenda-container .btn:active {
  transform: scale(.95);
}

.weekly-agenda-container .btn-primary {
  background: var(--primary);
  color: #fff;
  box-shadow: 0 8px 18px -6px color-mix(in srgb, var(--primary) 65%, transparent);
}

.weekly-agenda-container .btn-primary:hover {
  transform: translateY(-1px);
}

.weekly-agenda-container .btn-ghost {
  background: var(--theme-card);
  color: var(--theme-text);
  border: 1px solid var(--theme-divider);
}

.weekly-agenda-container .btn-ghost:hover {
  background: var(--theme-highlight);
}

.weekly-agenda-container .btn-saved {
  background: var(--success);
  color: #fff;
}

.weekly-agenda-container .coord-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  background: var(--theme-card);
  border: 1px solid var(--theme-divider);
  border-radius: 12px;
  padding: 4px 10px;
  box-shadow: var(--shadow-soft);
  transition: background .15s, transform .15s;
}

.weekly-agenda-container .coord-chip:hover {
  background: var(--theme-highlight);
}

.weekly-agenda-container .btn-icon {
  width: 34px;
  height: 34px;
  padding: 0;
  border-radius: var(--radius-md);
  background: var(--theme-card);
  border: 1px solid var(--theme-divider);
  color: var(--theme-text);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all .18s;
}

.weekly-agenda-container .btn-icon:hover {
  background: var(--theme-highlight);
  transform: translateY(-1px);
}

.weekly-agenda-container .btn-icon.on-danger {
  background: var(--danger);
  color: #fff;
  border-color: var(--danger);
}

/* Week nav */
.weekly-agenda-container .week-nav {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  background: var(--theme-card);
  border: 1px solid var(--theme-divider);
  border-radius: var(--radius-md);
  padding: 3px;
  box-shadow: var(--shadow-soft);
}

.weekly-agenda-container .week-nav button {
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 8px;
  color: var(--theme-text);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background .15s;
}

.weekly-agenda-container .week-nav button:not(.week-label) {
  width: 32px;
  height: 32px;
}

.weekly-agenda-container .week-nav button:hover {
  background: var(--theme-highlight);
}

.weekly-agenda-container .week-nav .week-label {
  flex-direction: column;
  gap: 0;
  padding: 4px 10px;
  min-width: 110px;
  line-height: 1.25;
}

.weekly-agenda-container .kpi-clickable {
  transition: transform .16s, box-shadow .16s;
}

.weekly-agenda-container .kpi-clickable:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-hover);
}

/* Inputs */
.weekly-agenda-container .field-label {
  font-family: var(--font-display);
  font-weight: 900;
  font-size: 9px;
  letter-spacing: var(--tracking-widest);
  text-transform: uppercase;
  color: var(--theme-text-muted);
  display: block;
  margin-bottom: 6px;
}

.weekly-agenda-container .input,
.weekly-agenda-container .select,
.weekly-agenda-container .textarea {
  width: 100%;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  background: var(--theme-input);
  border: 1px solid var(--theme-divider);
  font-family: var(--font-sans);
  font-size: 13px;
  color: var(--theme-text);
  outline: none;
  transition: border .15s, box-shadow .15s;
}

.weekly-agenda-container .input:focus,
.weekly-agenda-container .select:focus,
.weekly-agenda-container .textarea:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-soft);
  background: var(--theme-card);
}

.weekly-agenda-container .textarea {
  resize: vertical;
  min-height: 64px;
  line-height: 1.45;
}

.weekly-agenda-container .select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='3'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  padding-right: 28px;
}

/* Avatars */
.weekly-agenda-container .avatar {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 9px;
  color: #fff;
  box-shadow: 0 2px 6px -2px rgba(0,0,0,.2);
}

/* Chips */
.weekly-agenda-container .chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-family: var(--font-display);
  font-weight: 900;
  letter-spacing: var(--tracking-wide);
  text-transform: uppercase;
  font-size: 8.5px;
  padding: 3px 6px;
  border-radius: 6px;
  line-height: 1.3;
}

/* Task card styles */
.weekly-agenda-container .task {
  position: relative;
  background: var(--theme-card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--theme-divider);
  padding: var(--card-pad);
  box-shadow: 0 3px 10px -8px rgba(17,24,39,.1);
  transition: transform .16s, box-shadow .16s, opacity .2s;
  cursor: grab;
}

.weekly-agenda-container .task:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-hover);
}

.weekly-agenda-container .task.done {
  opacity: .6;
}

.weekly-agenda-container .task.done .task-text {
  text-decoration: line-through;
  color: var(--theme-text-muted);
}

.weekly-agenda-container .task.validate {
  border-left: 3px solid #6366F1;
}

.weekly-agenda-container .task.overdue {
  border-left: 3px solid var(--danger);
}

.weekly-agenda-container .task-accent {
  position: absolute;
  left: 0;
  top: 12px;
  bottom: 12px;
  width: 3px;
  border-radius: 0 4px 4px 0;
}

/* Status Pill Dropdown */
.weekly-agenda-container .status-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  font-family: var(--font-display);
  font-weight: 900;
  letter-spacing: var(--tracking-wide);
  text-transform: uppercase;
  font-size: 8.5px;
  padding: 3px 6px;
  border-radius: 6px;
  line-height: 1.3;
}

.weekly-agenda-container .status-menu {
  position: absolute;
  top: calc(100% + 5px);
  left: 0;
  z-index: 100;
  min-width: 170px;
  background: var(--theme-card);
  border: 1px solid var(--theme-divider);
  border-radius: 10px;
  box-shadow: var(--shadow-hover);
  padding: 4px;
}

.weekly-agenda-container .status-menu button {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 6px 8px;
  border-radius: 6px;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--theme-text);
  text-align: left;
}

.weekly-agenda-container .status-menu button:hover {
  background: var(--theme-highlight);
}

.weekly-agenda-container .status-menu button.active {
  background: var(--primary-soft);
  color: var(--primary);
}

.weekly-agenda-container .role-input {
  width: 100%;
  border: none;
  border-bottom: 1px dashed var(--theme-divider);
  background: transparent;
  font-family: var(--font-sans);
  font-size: 11px;
  color: var(--theme-text-muted);
  padding: 2px 0;
  outline: none;
}

.weekly-agenda-container .role-input:focus {
  border-bottom-color: var(--primary);
  color: var(--theme-text);
}

.weekly-agenda-container .due {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 8.5px;
  letter-spacing: .06em;
  text-transform: uppercase;
  color: var(--theme-text-muted);
  padding: 2px 5px;
  border-radius: 5px;
  background: var(--theme-input);
}

.weekly-agenda-container .due.is-today {
  color: var(--primary);
  background: var(--primary-soft);
}

.weekly-agenda-container .due.is-over {
  color: #fff;
  background: var(--danger);
}

.weekly-agenda-container .mini-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: none;
  cursor: pointer;
  font-family: var(--font-display);
  font-weight: 900;
  font-size: 8.5px;
  letter-spacing: .08em;
  text-transform: uppercase;
  padding: 4px 8px;
  border-radius: 6px;
  transition: filter .15s;
}

.weekly-agenda-container .mini-btn.ok {
  background: var(--success);
  color: #fff;
}

.weekly-agenda-container .mini-btn.no {
  background: var(--theme-card);
  color: var(--danger);
  border: 1px solid var(--theme-divider);
}

.weekly-agenda-container .checkbox {
  width: 20px;
  height: 20px;
  border-radius: 6px;
  flex-shrink: 0;
  cursor: pointer;
  border: 2px solid var(--theme-divider);
  background: var(--theme-card);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: transparent;
}

.weekly-agenda-container .checkbox.checked {
  background: var(--success);
  border-color: var(--success);
  color: #fff;
}

.weekly-agenda-container .row-btn {
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--theme-text-muted);
  width: 24px;
  height: 24px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.weekly-agenda-container .row-btn:hover {
  background: var(--theme-input);
  color: var(--theme-text);
}

.weekly-agenda-container .row-btn.danger:hover {
  background: #FEE2E2;
  color: var(--danger);
}

.weekly-agenda-container .row-btn.warn:hover {
  background: #FEF3C7;
  color: #B45309;
}

.weekly-agenda-container .task-actions {
  opacity: 0;
  transition: opacity .15s;
}

.weekly-agenda-container .task:hover .task-actions {
  opacity: 1;
}

/* Kanban Board columns */
.weekly-agenda-container .board {
  display: grid;
  grid-template-columns: repeat(var(--cols, 5), minmax(220px, 1fr));
  gap: var(--gap);
  align-items: start;
}

.weekly-agenda-container .stack {
  display: flex;
  flex-direction: column;
  gap: var(--gap);
}

/* Horizontal Bands */
.weekly-agenda-container .band {
  background: var(--theme-card);
  border-radius: var(--radius-card);
  border: 1px solid var(--theme-divider);
  overflow: hidden;
}

.weekly-agenda-container .band.today {
  box-shadow: 0 0 0 2px var(--primary), var(--shadow-soft);
}

.weekly-agenda-container .band.dropping {
  box-shadow: 0 0 0 2px var(--primary);
  background: var(--primary-soft);
}

.weekly-agenda-container .band-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--theme-divider);
  background: var(--theme-highlight);
}

.weekly-agenda-container .band-body {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(270px, 1fr));
  gap: 10px;
  padding: var(--card-pad);
}

/* Columns */
.weekly-agenda-container .col {
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: var(--theme-card);
  border-radius: var(--radius-card);
  border: 1px solid var(--theme-divider);
}

.weekly-agenda-container .col.today {
  box-shadow: 0 0 0 2px var(--primary), var(--shadow-soft);
}

.weekly-agenda-container .col.dropping {
  box-shadow: 0 0 0 2px var(--primary);
  background: var(--primary-soft);
}

.weekly-agenda-container .col-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  flex: 1;
  overflow-y: auto;
}

/* Progress trackers */
.weekly-agenda-container .prog-track {
  height: 4px;
  border-radius: 99px;
  background: var(--theme-divider);
  overflow: hidden;
}

.weekly-agenda-container .prog-fill {
  height: 100%;
  border-radius: 99px;
  transition: width .4s ease-out;
}

/* Segments Toggle */
.weekly-agenda-container .seg {
  display: inline-flex;
  background: var(--theme-input);
  border-radius: var(--radius-md);
  padding: 3px;
  gap: 2px;
}

.weekly-agenda-container .seg button {
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 8px;
  font-family: var(--font-display);
  font-weight: 900;
  font-size: 8.5px;
  letter-spacing: var(--tracking-wide);
  text-transform: uppercase;
  padding: 6px 10px;
  color: var(--theme-text-muted);
  display: inline-flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}

.weekly-agenda-container .seg button.active {
  background: var(--theme-card);
  color: var(--primary);
  box-shadow: 0 2px 6px -4px rgba(0,0,0,.15);
}

.weekly-agenda-container .overlay {
  position: fixed;
  inset: 0;
  background: rgba(15,23,42,.45);
  backdrop-filter: blur(2px);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  animation: fadeIn 0.15s ease-out;
}

.weekly-agenda-container .modal {
  width: 100%;
  max-width: 440px;
  max-height: 90vh;
  overflow-y: auto;
  background: var(--theme-card);
  border-radius: var(--radius-card);
  box-shadow: 0 20px 50px -15px rgba(0,0,0,.3);
  animation: scaleIn 0.2s cubic-bezier(.34,1.56,.64,1);
}

.weekly-agenda-container .drawer {
  width: 100%;
  max-width: 400px;
  height: 100vh;
  background: var(--theme-bg);
  box-shadow: -15px 0 50px -15px rgba(0,0,0,.25);
  display: flex;
  flex-direction: column;
  animation: drawerIn 0.25s cubic-bezier(.16,1,.3,1);
}

@keyframes drawerIn {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

.weekly-agenda-container .drawer-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid var(--theme-divider);
  background: var(--theme-card);
  flex-shrink: 0;
}

.weekly-agenda-container .drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.weekly-agenda-container .ins-block {
  background: var(--theme-card);
  border: 1px solid var(--theme-divider);
  border-radius: var(--radius-lg);
  padding: 12px 14px;
}

.weekly-agenda-container .ins-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-display);
  font-weight: 900;
  font-size: 9.5px;
  letter-spacing: var(--tracking-wide);
  text-transform: uppercase;
  color: var(--theme-text);
  margin-bottom: 10px;
}

.weekly-agenda-container .bottom-nav {
  display: none;
}

/* TWEAKS COMPONENT LOCAL CLASSES */
.weekly-agenda-container .twk-sect {
  font-size: 9px;
  font-weight: 600;
  letter-spacing: .06em;
  text-transform: uppercase;
  color: var(--theme-text-muted);
  padding: 8px 0 0;
}

.weekly-agenda-container .twk-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.weekly-agenda-container .twk-row-h {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.weekly-agenda-container .twk-lbl {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  color: var(--theme-text);
  font-weight: 600;
}

.weekly-agenda-container .twk-seg {
  position: relative;
  display: flex;
  padding: 2px;
  border-radius: 6px;
  background: var(--theme-input);
}

.weekly-agenda-container .twk-seg-thumb {
  position: absolute;
  top: 2px;
  bottom: 2px;
  border-radius: 5px;
  background: var(--theme-card);
  box-shadow: 0 1px 2px rgba(0,0,0,.1);
  transition: left .15s cubic-bezier(.3,.7,.4,1), width .15s;
}

.weekly-agenda-container .twk-seg button {
  appearance: none;
  position: relative;
  z-index: 1;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  font-weight: 500;
  min-height: 20px;
  border-radius: 5px;
  cursor: pointer;
  padding: 3px 6px;
  line-height: 1.2;
  flex: 1;
}

.weekly-agenda-container .twk-toggle {
  position: relative;
  width: 30px;
  height: 16px;
  border: 0;
  border-radius: 99px;
  background: var(--theme-divider);
  transition: background .15s;
  cursor: pointer;
}

.weekly-agenda-container .twk-toggle[data-on="1"] {
  background: var(--success);
}

.weekly-agenda-container .twk-toggle i {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #fff;
  transition: transform .15s;
}

.weekly-agenda-container .twk-toggle[data-on="1"] i {
  transform: translateX(14px);
}

.weekly-agenda-container .twk-chips {
  display: flex;
  gap: 6px;
}

.weekly-agenda-container .twk-chip {
  position: relative;
  appearance: none;
  flex: 1;
  min-width: 0;
  height: 26px;
  padding: 0;
  border: 0;
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  box-shadow: 0 0 0 1px rgba(0,0,0,.1);
}

.weekly-agenda-container .twk-chip[data-on="1"] {
  box-shadow: 0 0 0 2px var(--theme-text);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes scaleIn {
  from { transform: scale(.97); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

/* Print CSS */
.weekly-agenda-container .print-sheet {
  display: none;
}

@media print {
  .weekly-agenda-container .screen-only { display: none !important; }
  .weekly-agenda-container .no-print { display: none !important; }
  .weekly-agenda-container .print-sheet { display: block !important; }
}

@media (max-width: 860px) {
  .weekly-agenda-container .desktop-only { display: none !important; }
  .weekly-agenda-container .bottom-nav { display: flex; }
}

/* Plan strip (planejado vs fora do plano) */
.weekly-agenda-container .plan-strip { display: grid; grid-template-columns: 1.3fr 1fr; gap: var(--gap); }
@media (max-width: 760px) { .weekly-agenda-container .plan-strip { grid-template-columns: 1fr; } }
.weekly-agenda-container .plan-strip-status { display: flex; align-items: center; gap: 11px; background: var(--theme-card); border: 1px solid var(--theme-divider); border-radius: var(--radius-lg); padding: 12px 15px; box-shadow: var(--shadow-soft); }
.weekly-agenda-container.neuro .plan-strip-status { box-shadow: var(--shadow-soft); }
.weekly-agenda-container .plan-dot { width: 32px; height: 32px; border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
.weekly-agenda-container .plan-dot.locked { background: var(--success); color: #fff; }
.weekly-agenda-container .plan-dot.open { background: #FEF3C7; color: #B45309; }
.weekly-agenda-container .plan-strip-chips { display: grid; grid-template-columns: 1fr 1fr; gap: var(--gap); }
@media (max-width: 420px) { .weekly-agenda-container .plan-strip-chips { grid-template-columns: 1fr; } }
.weekly-agenda-container .origin-chip { display: flex; align-items: center; gap: 11px; text-align: left; cursor: pointer; background: var(--theme-card); border: 1px solid var(--theme-divider); border-radius: var(--radius-lg); padding: 11px 14px; box-shadow: var(--shadow-soft); transition: transform .15s, box-shadow .15s, border-color .15s; }
.weekly-agenda-container .origin-chip:hover:not(:disabled) { transform: translateY(-2px); box-shadow: var(--shadow-hover); }
.weekly-agenda-container .origin-chip:disabled { opacity: .5; cursor: default; }
.weekly-agenda-container .origin-chip .oc-count { font-family: var(--font-display); font-weight: 900; font-size: 24px; line-height: 1; min-width: 26px; }
.weekly-agenda-container .origin-chip .oc-label { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 700; color: var(--theme-text); line-height: 1.25; }
.weekly-agenda-container .origin-chip.nova .oc-count { color: #FF6B4A; }
.weekly-agenda-container .origin-chip.nova.active { border-color: #FF6B4A; box-shadow: 0 0 0 2px #FF6B4A55; }
.weekly-agenda-container .origin-chip.carried .oc-count { color: #B45309; }
.weekly-agenda-container .origin-chip.carried.active { border-color: #F59E0B; box-shadow: 0 0 0 2px #F59E0B55; }

/* Nova/Carried Tasks */
.weekly-agenda-container .task.nova { border-color: #FFCBB8; border-left: 4px solid #FF6B4A; background: #FFF3F0; }
.weekly-agenda-container .task.nova .task-accent { display: none; }
.weekly-agenda-container .task.carried { border-color: #FCD34D; border-left: 4px solid #D97706; background: #FEF3C7; }
.weekly-agenda-container .task.carried .task-accent { display: none; }

/* Duration pill + continues */
.weekly-agenda-container .dur-pill { display: inline-flex; align-items: center; gap: 3px; font-family: var(--font-display); font-weight: 800; font-size: 9px; letter-spacing: .06em; text-transform: uppercase; color: #7C3AED; background: #7C3AED14; border: 1px solid #7C3AED33; padding: 2px 6px; border-radius: 6px; }
.weekly-agenda-container .due.continues { color: #6D28D9; background: #7C3AED1A; }

/* Export options */
.weekly-agenda-container .export-opt { display: flex; align-items: center; gap: 9px; padding: 9px 10px; border-radius: 8px; cursor: pointer; font-size: 12px; font-weight: 600; color: var(--theme-text); }
.weekly-agenda-container .export-opt:hover { background: var(--theme-highlight); }
.weekly-agenda-container .export-opt input { width: 16px; height: 16px; accent-color: var(--primary); cursor: pointer; flex-shrink: 0; }
.weekly-agenda-container .export-opt span { display: inline-flex; align-items: center; gap: 6px; }
`;
