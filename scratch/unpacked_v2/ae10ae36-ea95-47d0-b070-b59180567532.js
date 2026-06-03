/* global React, ReactDOM, useTweaks, TweaksPanel, TweakSection, TweakRadio, TweakColor, TweakToggle,
   DAYS, PROJECTS, PEOPLE, DISCIPLINES, projColor, person, initials, weekKey, weekLabelFor, weekOffset,
   seedTasks, weightedProgress, isDone, isOverdue, taskWeight, dateForDay, todayName, plannedVsActual,
   Icon, Avatar, Progress, TaskCard, Column, Band, KpiCard, TaskModal, PrintSheet, InsightsPanel, ValidationPanel */
const { useState, useEffect, useMemo, useRef } = React;

const STORE_PREFIX = 'enigami_agenda_v2_';

// chave de armazenamento por coordenador (Yuri mantém a chave antiga p/ não perder dados)
function storeKey(coord, offset) {
  return coord === 'Yuri' ? STORE_PREFIX + weekKey(offset) : STORE_PREFIX + coord + '_' + weekKey(offset);
}
function loadWeek(coord, offset) {
  try { const s = localStorage.getItem(storeKey(coord, offset)); if (s) return JSON.parse(s); } catch (e) {}
  return (offset === 0 && coord === 'Yuri') ? seedTasks() : [];
}
function progressOfWeek(coord, offset) {
  try { const s = localStorage.getItem(storeKey(coord, offset)); if (s) return weightedProgress(JSON.parse(s)); } catch (e) {}
  return null;
}
function loadCoord() { try { return localStorage.getItem('enigami_active_coord') || 'Yuri'; } catch (e) { return 'Yuri'; } }

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#FF6B4A",
  "cardStyle": "soft",
  "density": "comfy",
  "projColors": true,
  "bgGrid": true
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [coord, setCoord] = useState(loadCoord);
  const [coordMenu, setCoordMenu] = useState(false);
  const [coordMgr, setCoordMgr] = useState(false);
  const [, bumpCoords] = useState(0);
  const [saved, setSaved] = useState(false); // toast "configuração salva"
  const [offset, setOffset] = useState(0);
  const [tasks, setTasks] = useState(() => loadWeek(loadCoord(), 0));
  const canValidate = isCoordinator(coord);
  const [groupBy, setGroupBy] = useState('day');
  const [layout, setLayout] = useState(() => { try { return localStorage.getItem('enigami_layout') || 'list'; } catch (e) { return 'list'; } });
  const [fProject, setFProject] = useState('all');
  const [fPerson, setFPerson] = useState('all');
  const [fDisc, setFDisc] = useState('all');
  const [onlyValidate, setOnlyValidate] = useState(false);
  const [onlyOverdue, setOnlyOverdue] = useState(false);
  const [fOrigin, setFOrigin] = useState('all'); // all | unplanned | carried
  const [planLock, setPlanLock] = useState(null);
  const [modal, setModal] = useState({ open: false, task: null });
  const [showFilters, setShowFilters] = useState(false);
  const [panel, setPanel] = useState(null); // 'insights' | 'validation'
  const [exportMenu, setExportMenu] = useState(false);
  const [exportScope, setExportScope] = useState('all'); // all | filtered
  const [exportChecklist, setExportChecklist] = useState(false);
  const [dropCol, setDropCol] = useState(null);
  const dragId = useRef(null);
  const today = todayName();
  const isCurrentWeek = offset === 0;

  // load tasks when week OR coordinator changes
  useEffect(() => { setTasks(loadWeek(coord, offset)); }, [offset, coord]);
  // persist
  useEffect(() => { try { localStorage.setItem(storeKey(coord, offset), JSON.stringify(tasks)); } catch (e) {} }, [tasks, offset, coord]);
  useEffect(() => { try { localStorage.setItem('enigami_layout', layout); } catch (e) {} }, [layout]);
  useEffect(() => { try { localStorage.setItem('enigami_active_coord', coord); } catch (e) {} }, [coord]);

  const prevProgress = useMemo(() => progressOfWeek(coord, offset - 1), [offset, coord, tasks]);

  // ----- lançamento / planejamento da semana -----
  const planKeyOf = (c, o) => 'enigami_plan_' + c + '_' + weekKey(o);
  useEffect(() => {
    let lock = null;
    try { const v = localStorage.getItem(planKeyOf(coord, offset)); if (v) lock = +v; } catch (e) {}
    // a semana já semeada do Yuri nasce "lançada", para sinalizar novas demandas de imediato
    if (!lock && coord === 'Yuri' && offset === 0) {
      lock = Date.parse('2026-06-01T00:00:00');
      try { localStorage.setItem(planKeyOf(coord, offset), String(lock)); } catch (e) {}
    }
    setPlanLock(lock);
  }, [coord, offset]);
  const lockPlan = () => { const ts = Date.now(); try { localStorage.setItem(planKeyOf(coord, offset), String(ts)); } catch (e) {} setPlanLock(ts); };
  const unlockPlan = () => { try { localStorage.removeItem(planKeyOf(coord, offset)); } catch (e) {} setPlanLock(null); };

  // salvar explícito (com feedback) — além do autosave
  const saveNow = () => {
    try { localStorage.setItem(storeKey(coord, offset), JSON.stringify(tasks)); } catch (e) {}
    setSaved(true); setTimeout(() => setSaved(false), 1900);
  };
  const switchCoord = (name) => { setCoordMenu(false); if (name !== coord) { setOffset(0); setCoord(name); } };

  // gerenciar coordenadores
  const handleAddCoord = (name, role) => { const p = addCoordinator(name, role); bumpCoords(n => n + 1); if (p) switchCoord(p.name); };
  const handleUpdateCoordRole = (name, role) => { updateCoordinatorRole(name, role); bumpCoords(n => n + 1); };
  const handleRemoveCoord = (name) => {
    removeCoordinator(name); bumpCoords(n => n + 1);
    if (name === coord) { const first = coordinators()[0]; if (first) { setOffset(0); setCoord(first.name); } }
  };

  // fecha menus ao clicar fora
  useEffect(() => {
    if (!coordMenu && !exportMenu) return;
    const h = () => { setCoordMenu(false); setExportMenu(false); };
    document.addEventListener('click', h);
    return () => document.removeEventListener('click', h);
  }, [coordMenu, exportMenu]);

  // apply tweaks
  useEffect(() => {
    const r = document.documentElement;
    r.style.setProperty('--primary', t.accent);
    r.style.setProperty('--primary-soft', t.accent + '18');
    const dens = { compact: ['10px', '10px'], comfy: ['14px', '13px'], roomy: ['18px', '17px'] }[t.density] || ['14px', '13px'];
    r.style.setProperty('--gap', dens[0]); r.style.setProperty('--card-pad', dens[1]);
    document.body.classList.toggle('neuro', t.cardStyle === 'neuro');
    document.body.classList.toggle('nogrid', !t.bgGrid);
  }, [t]);

  // ----- handlers -----
  const setStatus = (id, status) => setTasks(ts => ts.map(x => x.id === id ? { ...x, status, completed: status === 'done', completedAt: status === 'done' ? Date.now() : null } : x));
  const validate = (id, valid) => { if (!canValidate) return; setTasks(ts => ts.map(x => x.id === id ? { ...x, valid, validBy: coord, validAt: Date.now() } : x)); };
  const remove = (id) => setTasks(ts => ts.filter(x => x.id !== id));
  // adiar para a próxima semana: tira da atual, joga na seguinte (mesmo dia), marca como adiada
  const postpone = (id) => {
    const task = tasks.find(x => x.id === id);
    if (!task) return;
    const moved = {
      ...task,
      dueDate: dateForDay(endDayName(task), offset + 1),
      postponedCount: (task.postponedCount || 0) + 1,
      carriedFrom: weekLabelFor(offset),
    };
    try {
      const key = storeKey(coord, offset + 1);
      const next = JSON.parse(localStorage.getItem(key) || '[]');
      next.push(moved);
      localStorage.setItem(key, JSON.stringify(next));
    } catch (e) {}
    setTasks(ts => ts.filter(x => x.id !== id));
  };
  const save = (form) => {
    const norm = { ...form, completed: form.status === 'done' };
    norm.dueDate = dateForDay(endDayName(norm), offset);
    if (form.id != null) setTasks(ts => ts.map(x => x.id === form.id ? { ...x, ...norm } : x));
    else setTasks(ts => [...ts, { ...norm, id: Date.now(), createdAt: Date.now(), unplanned: !!planLock }]);
    setModal({ open: false, task: null });
  };
  const onDragStart = (e, task) => { dragId.current = task.id; e.dataTransfer.effectAllowed = 'move'; setTimeout(() => { e.target.classList && e.target.classList.add('dragging'); }, 0); };
  const onDragEnd = (e) => { e.target.classList && e.target.classList.remove('dragging'); setDropCol(null); };
  const onDropDay = (day) => (e) => {
    e.preventDefault();
    if (dragId.current != null) setTasks(ts => ts.map(x => x.id === dragId.current ? { ...x, day, dueDate: dateForDay(endDayName({ ...x, day }), offset) } : x));
    dragId.current = null; setDropCol(null);
  };

  // ----- filtering -----
  const isNova = (x) => x.unplanned && !x.carriedFrom;
  const filtered = useMemo(() => tasks.filter(x =>
    (fProject === 'all' || x.project === fProject) &&
    (fPerson === 'all' || x.assignee === fPerson) &&
    (fDisc === 'all' || x.disc === fDisc) &&
    (!onlyValidate || x.isCoordPoint) &&
    (!onlyOverdue || isOverdue(x)) &&
    (fOrigin === 'all' || (fOrigin === 'unplanned' && isNova(x)) || (fOrigin === 'carried' && x.carriedFrom))
  ), [tasks, fProject, fPerson, fDisc, onlyValidate, onlyOverdue, fOrigin]);

  // ----- stats -----
  const stats = useMemo(() => {
    const total = tasks.length, done = tasks.filter(isDone).length;
    const coord = tasks.filter(x => x.isCoordPoint);
    return {
      total, done, progress: weightedProgress(tasks),
      simpleProgress: total ? Math.round(done / total * 100) : 0,
      projects: new Set(tasks.map(x => x.project)).size,
      people: new Set(tasks.filter(x => x.assignee !== 'Equipe').map(x => x.assignee)).size,
      coordPending: coord.filter(x => (x.valid || 'pending') === 'pending').length,
      coordApproved: coord.filter(x => x.valid === 'approved').length, coordTotal: coord.length,
      overdue: tasks.filter(isOverdue).length,
      nova: tasks.filter(x => x.unplanned && !x.carriedFrom).length,
      carried: tasks.filter(x => x.carriedFrom).length,
    };
  }, [tasks]);
  const trend = prevProgress != null ? stats.progress - prevProgress : null;
  const pva = useMemo(() => plannedVsActual(tasks, offset), [tasks, offset]);

  // ----- columns -----
  const columns = useMemo(() => {
    if (groupBy === 'project') return PROJECTS.map(p => ({ key: p.name, label: p.name, accent: p.color, list: filtered.filter(x => x.project === p.name) }));
    if (groupBy === 'assignee') return PEOPLE.map(p => ({ key: p.name, label: p.name, accent: p.color, list: filtered.filter(x => x.assignee === p.name) }));
    return DAYS.map(d => ({ key: d, label: d, isToday: isCurrentWeek && d === today, list: filtered.filter(x => spansDay(x, d)) }));
  }, [groupBy, filtered, today, isCurrentWeek]);

  const wl = weekLabelFor(offset);
  const views = [
    { k: 'day', label: 'Dia', icon: 'calendar_view_week' },
    { k: 'project', label: 'Projeto', icon: 'folder' },
    { k: 'assignee', label: 'Equipe', icon: 'group' },
  ];
  const filtersActive = fProject !== 'all' || fPerson !== 'all' || fDisc !== 'all' || onlyValidate || onlyOverdue || fOrigin !== 'all';
  const clearFilters = () => { setFProject('all'); setFPerson('all'); setFDisc('all'); setOnlyValidate(false); setOnlyOverdue(false); setFOrigin('all'); };

  // export scope
  const doExport = (scope) => {
    setExportMenu(false);
    setExportScope(scope);
    setTimeout(() => window.print(), 80);
  };
  const printTasks = exportScope === 'all' ? tasks : filtered;
  const printStats = useMemo(() => {
    const total = printTasks.length, done = printTasks.filter(isDone).length;
    const coord = printTasks.filter(x => x.isCoordPoint);
    return {
      total, done, progress: weightedProgress(printTasks),
      projects: new Set(printTasks.map(x => x.project)).size,
      people: new Set(printTasks.filter(x => x.assignee !== 'Equipe').map(x => x.assignee)).size,
      coordApproved: coord.filter(x => x.valid === 'approved').length, coordTotal: coord.length,
      coordPending: coord.filter(x => (x.valid || 'pending') === 'pending').length,
      overdue: printTasks.filter(isOverdue).length,
      nova: printTasks.filter(x => x.unplanned && !x.carriedFrom).length,
      carried: printTasks.filter(x => x.carriedFrom).length,
    };
  }, [printTasks]);
  const printPva = useMemo(() => plannedVsActual(printTasks, offset), [printTasks, offset]);

  const cardEvents = { onStatus: setStatus, onEdit: (tk) => setModal({ open: true, task: tk }), onDelete: remove, onValidate: validate, onPostpone: postpone, onDragStart, onDragEnd };

  const renderCards = (list, dayKey) => list.map(task => {
    const total = taskDuration(task);
    const span = (dayKey && total > 1) ? { part: (DAY_IDX[dayKey] - startIdx(task) + 1), total, isEnd: DAY_IDX[dayKey] === endIdx(task), isStart: DAY_IDX[dayKey] === startIdx(task) } : null;
    return <TaskCard key={task.id + '@' + (dayKey || 'x')} task={task} groupBy={groupBy} showProjColor={t.projColors} canValidate={canValidate} span={span} {...cardEvents} />;
  });

  return (
    <div>
      <div className="screen-only" style={{ maxWidth: 1480, margin: '0 auto', padding: 'clamp(14px, 3vw, 30px)', paddingBottom: 96 }}>

        {/* ===== HEADER ===== */}
        <header style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 46, height: 46, borderRadius: 14, background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 18px -6px color-mix(in srgb, var(--primary) 60%, transparent)' }}>
              <Icon name="account_tree" size={26} color="#fff" />
            </div>
            <div>
              <h1 className="t-h1" style={{ margin: 0, fontSize: 'clamp(18px, 2.6vw, 24px)' }}>Agenda da Semana</h1>
              <div style={{ position: 'relative', marginTop: 4 }}>
                <button className="coord-chip" onClick={(e) => { e.stopPropagation(); setCoordMenu(m => !m); }}>
                  <Avatar name={coord} size={20} />
                  <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.15 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--theme-text)' }}>{coord}</span>
                    <span style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: '.12em', color: 'var(--primary)', textTransform: 'uppercase' }}>{person(coord).role}</span>
                  </span>
                  <Icon name="unfold_more" size={15} color="var(--theme-text-muted)" />
                </button>
                {coordMenu && (
                  <div className="status-menu" style={{ minWidth: 220 }} onClick={e => e.stopPropagation()}>
                    <div style={{ padding: '4px 10px 6px', fontSize: 8.5, fontWeight: 800, letterSpacing: '.16em', color: 'var(--theme-text-muted)', fontFamily: 'var(--font-display)' }}>COORDENADOR / CONFIGURAÇÃO</div>
                    {coordinators().map(c => (
                      <button key={c.name} className={c.name === coord ? 'active' : ''} onClick={() => switchCoord(c.name)}>
                        <Avatar name={c.name} size={20} />
                        <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
                          <span style={{ fontWeight: 700 }}>{c.name}</span>
                          <span style={{ fontSize: 10, color: 'var(--theme-text-muted)' }}>{c.role}</span>
                        </span>
                        {c.name === coord && <Icon name="check" size={15} style={{ marginLeft: 'auto' }} color="var(--primary)" />}
                      </button>
                    ))}
                    <div style={{ padding: '7px 10px 3px', fontSize: 10, color: 'var(--theme-text-muted)', borderTop: '1px solid var(--theme-divider)', marginTop: 4 }}>Cada coordenador tem sua própria agenda e equipe, salvas neste navegador.</div>
                    <button onClick={() => { setCoordMenu(false); setCoordMgr(true); }} style={{ marginTop: 2 }}><Icon name="manage_accounts" size={16} />Gerenciar coordenadores</button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="no-print" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* week nav */}
            <div className="week-nav">
              <button onClick={() => setOffset(o => o - 1)} aria-label="Semana anterior"><Icon name="chevron_left" size={18} /></button>
              <button className="week-label" onClick={() => setOffset(0)} title="Voltar para a semana atual">
                <span className="font-sq" style={{ fontSize: 12, fontWeight: 800 }}>{wl}</span>
                <span style={{ fontSize: 8.5, color: isCurrentWeek ? 'var(--primary)' : 'var(--theme-text-muted)', fontWeight: 700, letterSpacing: '.1em' }}>{isCurrentWeek ? 'ESTA SEMANA' : (offset < 0 ? 'PASSADA' : 'FUTURA')}</span>
              </button>
              <button onClick={() => setOffset(o => o + 1)} aria-label="Próxima semana"><Icon name="chevron_right" size={18} /></button>
            </div>
            <button className={'btn ' + (saved ? 'btn-saved' : 'btn-ghost')} onClick={saveNow} title="Salvar configuração neste navegador">
              <Icon name={saved ? 'cloud_done' : 'save'} size={16} />{saved ? 'Salvo' : 'Salvar'}
            </button>
            <button className="btn btn-primary" onClick={() => setModal({ open: true, task: null })}><Icon name="add" size={16} />Nova</button>
          </div>
        </header>

        {/* ===== KPIs ===== */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(168px, 1fr))', gap: 'var(--gap)', marginBottom: 'var(--gap)' }}>
          <div className="card kpi-clickable" onClick={() => setPanel('insights')} style={{ padding: '16px 18px', cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}><Icon name="trending_up" size={16} color="var(--primary)" /><span className="cap" style={{ fontSize: 9, color: 'var(--theme-text-muted)' }}>Avanço Ponderado</span></div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              <span className="font-sq" style={{ fontSize: 30, fontWeight: 800, color: 'var(--primary)', lineHeight: 1 }}>{stats.progress}%</span>
              {trend != null && trend !== 0 && <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 11, fontWeight: 800, color: trend > 0 ? 'var(--success)' : 'var(--danger)' }}><Icon name={trend > 0 ? 'arrow_upward' : 'arrow_downward'} size={13} />{trend > 0 ? '+' : ''}{trend}%</span>}
            </div>
            <div style={{ marginTop: 9 }}><Progress value={stats.progress} color="var(--primary)" /></div>
          </div>

          <div className="card kpi-clickable" onClick={() => setPanel('insights')} style={{ padding: '16px 18px', cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}><Icon name="speed" size={16} color={pva.onTrackPct >= 90 ? 'var(--success)' : pva.onTrackPct >= 60 ? '#EAB308' : 'var(--danger)'} /><span className="cap" style={{ fontSize: 9, color: 'var(--theme-text-muted)' }}>No Prazo</span></div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 8 }}>
              <span className="font-sq" style={{ fontSize: 30, fontWeight: 800, lineHeight: 1, color: pva.onTrackPct >= 90 ? 'var(--success)' : pva.onTrackPct >= 60 ? '#EAB308' : 'var(--danger)' }}>{pva.hasData ? pva.onTrackPct + '%' : '—'}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--theme-text-muted)' }}>previsto × feito</span>
            </div>
            <div style={{ marginTop: 9 }}><Progress value={pva.onTrackPct} color={pva.onTrackPct >= 90 ? 'var(--success)' : pva.onTrackPct >= 60 ? '#EAB308' : 'var(--danger)'} /></div>
          </div>

          <div className="card kpi-clickable" onClick={() => setPanel('validation')} style={{ padding: '16px 18px', cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}><Icon name="verified" size={16} color="#6366F1" /><span className="cap" style={{ fontSize: 9, color: 'var(--theme-text-muted)' }}>Validações</span></div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 8 }}>
              <span className="font-sq" style={{ fontSize: 30, fontWeight: 800, color: '#4F46E5', lineHeight: 1 }}>{stats.coordPending}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--theme-text-muted)' }}>aguardando · {stats.coordApproved}/{stats.coordTotal} ok</span>
            </div>
            <div style={{ marginTop: 9, display: 'flex', alignItems: 'center', gap: 4, fontSize: 10.5, fontWeight: 700, color: '#6366F1' }}><Icon name="bolt" size={13} />Abrir fila</div>
          </div>

          <KpiCard icon="warning" label="Em Atraso" value={stats.overdue} sub={stats.overdue ? 'requer ação' : 'tudo em dia'} color={stats.overdue ? 'var(--danger)' : 'var(--success)'} />
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
            <select className="select" style={{ width: 'auto', padding: '9px 30px 9px 12px', fontSize: 12 }} value={fProject} onChange={e => setFProject(e.target.value)}>
              <option value="all">Todos projetos</option>{PROJECTS.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
            </select>
            <select className="select" style={{ width: 'auto', padding: '9px 30px 9px 12px', fontSize: 12 }} value={fPerson} onChange={e => setFPerson(e.target.value)}>
              <option value="all">Toda equipe</option>{PEOPLE.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
            </select>
            <select className="select" style={{ width: 'auto', padding: '9px 30px 9px 12px', fontSize: 12 }} value={fDisc} onChange={e => setFDisc(e.target.value)}>
              <option value="all">Disciplinas</option>{DISCIPLINES.map(d => <option key={d.code} value={d.code}>{d.code}</option>)}
            </select>
            <button className={'btn-icon' + (onlyOverdue ? ' on-danger' : '')} title="Só atrasadas" onClick={() => setOnlyOverdue(v => !v)}><Icon name="warning" size={17} /></button>
            {filtersActive && <button className="btn-icon" title="Limpar filtros" onClick={clearFilters}><Icon name="filter_alt_off" size={17} /></button>}

            <div style={{ position: 'relative' }}>
              <button className="btn btn-ghost" onClick={(e) => { e.stopPropagation(); setExportMenu(m => !m); }}><Icon name="download" size={15} />PDF<Icon name="expand_more" size={14} /></button>
              {exportMenu && (
                <div className="status-menu" style={{ right: 0, left: 'auto', minWidth: 232 }} onClick={e => e.stopPropagation()}>
                  <label className="export-opt" onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={exportChecklist} onChange={e => setExportChecklist(e.target.checked)} />
                    <span><Icon name="checklist" size={15} />Incluir checklist das tarefas</span>
                  </label>
                  <div style={{ height: 1, background: 'var(--theme-divider)', margin: '4px 6px' }}></div>
                  <button onClick={() => doExport('all')}><Icon name="calendar_month" size={15} />Semana completa</button>
                  <button onClick={() => doExport('filtered')}><Icon name="filter_alt" size={15} />Visão filtrada atual</button>
                </div>
              )}
            </div>
          </div>

          <button className="btn btn-ghost mobile-only" onClick={() => setShowFilters(true)}><Icon name="tune" size={15} />Filtros{filtersActive ? ' •' : ''}</button>
        </div>

        {/* ===== BOARD / BANDS ===== */}
        {layout === 'board' ? (
          <div className="board" style={{ '--cols': columns.length }}>
            {columns.map(col => (
              <Column key={col.key} meta={{ label: col.label }} tasks={col.list} accent={col.accent} isToday={col.isToday}
                dropping={dropCol === col.key && groupBy === 'day'}
                onDragOver={groupBy === 'day' ? (e) => { e.preventDefault(); setDropCol(col.key); } : undefined}
                onDrop={groupBy === 'day' ? onDropDay(col.key) : undefined}>{renderCards(col.list, groupBy === 'day' ? col.key : null)}</Column>
            ))}
          </div>
        ) : (
          <div className="stack">
            {columns.map(col => (
              <Band key={col.key} meta={{ label: col.label }} tasks={col.list} accent={col.accent} isToday={col.isToday}
                dropping={dropCol === col.key && groupBy === 'day'}
                onDragOver={groupBy === 'day' ? (e) => { e.preventDefault(); setDropCol(col.key); } : undefined}
                onDrop={groupBy === 'day' ? onDropDay(col.key) : undefined}>{renderCards(col.list, groupBy === 'day' ? col.key : null)}</Band>
            ))}
          </div>
        )}

        {groupBy === 'day' && (
          <p className="no-print desktop-only" style={{ textAlign: 'center', fontSize: 11.5, color: 'var(--theme-text-muted)', marginTop: 16 }}>
            <Icon name="drag_indicator" size={14} style={{ marginRight: 4 }} />Arraste os cards entre os dias para reorganizar a semana
          </p>
        )}
      </div>

      {/* ===== PRINT DOC ===== */}
      <PrintSheet tasks={printTasks} weekLabel={'SEMANA ' + wl} stats={printStats} pva={printPva} trend={trend} scope={exportScope} coord={coord} showChecklist={exportChecklist} />

      {/* ===== MOBILE BOTTOM NAV ===== */}
      <nav className="bottom-nav no-print" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(10px)', borderTop: '1px solid var(--theme-divider)', padding: '8px 12px calc(8px + env(safe-area-inset-bottom))', justifyContent: 'space-around', alignItems: 'center' }}>
        <NavBtn icon="dashboard" label="Agenda" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} active />
        <NavBtn icon="insights" label="Avanço" onClick={() => setPanel('insights')} />
        <button onClick={() => setModal({ open: true, task: null })} style={{ border: 'none', background: 'var(--primary)', width: 52, height: 52, borderRadius: 18, color: '#fff', cursor: 'pointer', boxShadow: '0 10px 22px -6px color-mix(in srgb, var(--primary) 60%, transparent)', marginTop: -22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="add" size={26} /></button>
        <NavBtn icon="verified" label="Validar" onClick={() => setPanel('validation')} badge={stats.coordPending > 0} />
        <NavBtn icon="tune" label="Filtros" onClick={() => setShowFilters(true)} badge={filtersActive} />
      </nav>

      {/* ===== MOBILE FILTER SHEET ===== */}
      {showFilters && (
        <div className="overlay no-print mobile-only" onClick={() => setShowFilters(false)} style={{ alignItems: 'flex-end', padding: 0 }}>
          <div className="card" onClick={e => e.stopPropagation()} style={{ width: '100%', borderRadius: '24px 24px 0 0', padding: 22, animation: 'slideUp .3s cubic-bezier(.16,1,.3,1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h2 className="t-h2" style={{ margin: 0, fontSize: 15 }}>Filtros</h2>
              <button className="btn-icon" onClick={() => setShowFilters(false)}><Icon name="close" size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div><label className="field-label">Projeto</label><select className="select" value={fProject} onChange={e => setFProject(e.target.value)}><option value="all">Todos projetos</option>{PROJECTS.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}</select></div>
              <div><label className="field-label">Responsável</label><select className="select" value={fPerson} onChange={e => setFPerson(e.target.value)}><option value="all">Toda equipe</option>{PEOPLE.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}</select></div>
              <div><label className="field-label">Disciplina</label><select className="select" value={fDisc} onChange={e => setFDisc(e.target.value)}><option value="all">Todas</option>{DISCIPLINES.map(d => <option key={d.code} value={d.code}>{d.code} · {d.name}</option>)}</select></div>
              <button className={'btn ' + (onlyValidate ? 'btn-primary' : 'btn-ghost')} onClick={() => setOnlyValidate(v => !v)} style={{ width: '100%' }}><Icon name="verified" size={15} />Só validações</button>
              <button className={'btn ' + (onlyOverdue ? 'btn-primary' : 'btn-ghost')} onClick={() => setOnlyOverdue(v => !v)} style={{ width: '100%', ...(onlyOverdue ? { background: 'var(--danger)' } : {}) }}><Icon name="warning" size={15} />Só atrasadas</button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className={'btn ' + (fOrigin === 'unplanned' ? 'btn-primary' : 'btn-ghost')} onClick={() => setFOrigin(o => o === 'unplanned' ? 'all' : 'unplanned')} style={{ flex: 1, ...(fOrigin === 'unplanned' ? { background: '#FF6B4A' } : {}) }}><Icon name="bolt" size={15} />Novas</button>
                <button className={'btn ' + (fOrigin === 'carried' ? 'btn-primary' : 'btn-ghost')} onClick={() => setFOrigin(o => o === 'carried' ? 'all' : 'carried')} style={{ flex: 1, ...(fOrigin === 'carried' ? { background: '#D97706' } : {}) }}><Icon name="history" size={15} />Adiadas</button>
              </div>
              <button className="btn btn-ghost" style={{ width: '100%' }} onClick={() => doExport('all')}><Icon name="download" size={15} />Exportar PDF</button>
              <label className="export-opt" style={{ padding: '8px 4px' }}>
                <input type="checkbox" checked={exportChecklist} onChange={e => setExportChecklist(e.target.checked)} />
                <span><Icon name="checklist" size={15} />Incluir checklist no PDF</span>
              </label>
              <button className="btn btn-ghost" style={{ width: '100%' }} onClick={clearFilters}>Limpar filtros</button>
            </div>
          </div>
        </div>
      )}

      <TaskModal open={modal.open} initial={modal.task} weekOffset={offset} onClose={() => setModal({ open: false, task: null })} onSave={save} />
      <CoordManager open={coordMgr} activeCoord={coord} onClose={() => setCoordMgr(false)} onAdd={handleAddCoord} onUpdateRole={handleUpdateCoordRole} onRemove={handleRemoveCoord} />
      <InsightsPanel open={panel === 'insights'} onClose={() => setPanel(null)} tasks={tasks} weekOffset={offset} prevProgress={prevProgress} />
      <ValidationPanel open={panel === 'validation'} onClose={() => setPanel(null)} tasks={tasks} onValidate={validate} onOpenTask={(tk) => { setPanel(null); setModal({ open: true, task: tk }); }} />

      {/* ===== TWEAKS ===== */}
      <TweaksPanel title="Tweaks">
        <TweakSection label="Estilo" />
        <TweakColor label="Cor de destaque" value={t.accent} options={['#FF6B4A', '#6366F1', '#10B981', '#0EA5E9', '#EC4899']} onChange={v => setTweak('accent', v)} />
        <TweakRadio label="Cards" value={t.cardStyle} options={['soft', 'neuro']} onChange={v => setTweak('cardStyle', v)} />
        <TweakRadio label="Densidade" value={t.density} options={['compact', 'comfy', 'roomy']} onChange={v => setTweak('density', v)} />
        <TweakSection label="Detalhes" />
        <TweakToggle label="Cor por projeto nos cards" value={t.projColors} onChange={v => setTweak('projColors', v)} />
        <TweakToggle label="Grade de fundo" value={t.bgGrid} onChange={v => setTweak('bgGrid', v)} />
      </TweaksPanel>
    </div>
  );
}

function NavBtn({ icon, label, onClick, active, badge }) {
  return (
    <button onClick={onClick} style={{ border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '4px 8px', color: active ? 'var(--primary)' : 'var(--theme-text-muted)', position: 'relative' }}>
      <Icon name={icon} size={21} />
      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 8.5, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</span>
      {badge && <span style={{ position: 'absolute', top: 2, right: 6, width: 7, height: 7, borderRadius: '50%', background: 'var(--primary)' }} />}
    </button>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
