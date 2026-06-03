/* global React, PROJECTS, PEOPLE, STATUSES, VALID_STATES, projColor, projCode, person, initials,
   discipline, statusMeta, taskProgress, isDone, isOverdue, isDueToday, parseYmd */
const { useState, useRef, useEffect } = React;

function Icon({ name, size = 18, color, style, className }) {
  return (
    <span className={'material-symbols-outlined ' + (className || '')}
      style={{ fontSize: size, color: color || 'inherit', lineHeight: 1, ...style }}>{name}</span>
  );
}

function Avatar({ name, size = 24, ring }) {
  const p = person(name);
  return (
    <span className="avatar" title={name + (p.role ? ' · ' + p.role : '')}
      style={{ width: size, height: size, fontSize: size * 0.38, background: p.color,
        boxShadow: ring ? `0 0 0 2px #fff, 0 0 0 4px ${p.color}55` : undefined }}>
      {initials(name)}
    </span>
  );
}

function Progress({ value, color, height = 5 }) {
  return (
    <div className="prog-track" style={{ height }}>
      <div className="prog-fill" style={{ width: value + '%', background: color || 'var(--primary)' }} />
    </div>
  );
}

function DiscTag({ code }) {
  const d = discipline(code);
  if (!d) return null;
  return <span className="chip" style={{ background: d.color + '1A', color: d.color, border: `1px solid ${d.color}33` }} title={d.name}>{d.code}</span>;
}

function fmtDue(dueStr) {
  const d = parseYmd(dueStr); if (!d) return '';
  return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0');
}

// ---- Status dropdown (segmented popover) ----
function StatusControl({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, []);
  const cur = statusMeta(value);
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

// ---- Task card ----
function TaskCard({ task, onStatus, onEdit, onDelete, onValidate, onPostpone, onDragStart, onDragEnd, showProjColor, groupBy, canValidate }) {
  const pc = projColor(task.project);
  const prog = taskProgress(task);
  const done = isDone(task);
  const overdue = isOverdue(task);
  const dueToday = isDueToday(task);
  const subDone = task.subtasks ? task.subtasks.filter(s => s.done).length : 0;
  const vs = task.isCoordPoint ? (VALID_STATES[task.valid] || VALID_STATES.pending) : null;

  return (
    <div
      className={'task animate-fade' + (done ? ' done' : '') + (task.isCoordPoint ? ' validate' : '') + (overdue ? ' overdue' : '')}
      draggable={groupBy === 'day'}
      onDragStart={(e) => onDragStart(e, task)} onDragEnd={onDragEnd}
    >
      {showProjColor && !task.isCoordPoint && <div className="task-accent" style={{ background: pc }} />}

      <div style={{ display: 'flex', gap: 11, alignItems: 'flex-start', paddingLeft: showProjColor && !task.isCoordPoint ? 6 : 0 }}>
        <button className={'checkbox no-print' + (done ? ' checked' : '')}
          onClick={() => onStatus(task.id, done ? 'todo' : 'done')} aria-label="Concluir">
          {done && <Icon name="check" size={15} />}
        </button>
        <span className="print-only" style={{ width: 14, height: 14, border: '1.5px solid #374151', borderRadius: 3, flexShrink: 0, marginTop: 2 }}></span>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 7 }}>
            {groupBy !== 'project' && (
              <span className="chip" style={{ background: pc + '1A', color: pc, border: `1px solid ${pc}33` }}>{projCode(task.project)}</span>
            )}
            <DiscTag code={task.disc} />
            {task.carriedFrom && (
              <span className="chip" title={'Adiada de ' + task.carriedFrom + (task.postponedCount > 1 ? ' · ' + task.postponedCount + 'ª vez' : '')}
                style={{ background: '#F59E0B1A', color: '#B45309', border: '1px solid #F59E0B44' }}>
                <Icon name="history" size={11} />Adiada{task.postponedCount > 1 ? ' ×' + task.postponedCount : ''}
              </span>
            )}
            {groupBy !== 'assignee' && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <Avatar name={task.assignee} size={20} />
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--theme-text)' }}>{task.assignee}</span>
              </span>
            )}
          </div>

          <p className="task-text" style={{ margin: '0 0 9px', fontSize: 13.5, lineHeight: 1.45, color: 'var(--theme-text)', textWrap: 'pretty' }}>{task.text}</p>

          {/* progress + status row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 7 }}>
            <div style={{ flex: 1 }}><Progress value={prog} color={done ? 'var(--success)' : (prog >= 85 ? '#EAB308' : prog > 0 ? '#0EA5E9' : 'var(--theme-divider)')} height={4} /></div>
            <span className="font-sq" style={{ fontSize: 9, fontWeight: 800, color: 'var(--theme-text-muted)', minWidth: 26, textAlign: 'right' }}>{prog}%</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
            <StatusControl value={task.status || (task.completed ? 'done' : 'todo')} onChange={(s) => onStatus(task.id, s)} />
            {task.subtasks && task.subtasks.length > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10.5, fontWeight: 600, color: 'var(--theme-text-muted)' }}>
                <Icon name="checklist" size={13} />{subDone}/{task.subtasks.length}
              </span>
            )}
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10.5, fontWeight: 600, color: 'var(--theme-text-muted)' }} title="Peso / esforço">
              <Icon name="fitness_center" size={12} />{task.weight || 1}
            </span>
            {task.dueDate && (
              <span className={'due' + (overdue ? ' is-over' : dueToday ? ' is-today' : '')}>
                <Icon name={overdue ? 'event_busy' : 'event'} size={12} />{fmtDue(task.dueDate)}{overdue ? ' · ATRASO' : dueToday ? ' · HOJE' : ''}
              </span>
            )}
            {task.time && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10.5, fontWeight: 600, color: 'var(--theme-text-muted)' }}>
                <Icon name="schedule" size={12} />{task.time}
              </span>
            )}
          </div>

          {/* validation strip */}
          {task.isCoordPoint && (
            <div className="no-print" style={{ marginTop: 9, padding: '8px 10px', borderRadius: 10, background: vs.color + '14', border: `1px solid ${vs.color}33`, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span className="chip" style={{ background: vs.color + '22', color: vs.color, border: 'none' }}><Icon name="verified" size={11} />{vs.label}</span>
              {canValidate ? (
                <React.Fragment>
                  {task.valid !== 'approved' && <button className="mini-btn ok" onClick={() => onValidate(task.id, 'approved')}><Icon name="check" size={13} />Aprovar</button>}
                  {task.valid !== 'returned' && <button className="mini-btn no" onClick={() => onValidate(task.id, 'returned')}><Icon name="undo" size={13} />Devolver</button>}
                </React.Fragment>
              ) : (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, color: 'var(--theme-text-muted)' }}><Icon name="lock" size={12} />Somente coordenação</span>
              )}
            </div>
          )}
        </div>

        <div className="no-print task-actions" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <button className="row-btn" onClick={() => onEdit(task)} aria-label="Editar"><Icon name="edit" size={15} /></button>
          {!done && onPostpone && (
            <button className="row-btn warn" onClick={() => onPostpone(task.id)} aria-label="Adiar para a próxima semana" title="Adiar para a próxima semana"><Icon name="next_week" size={15} /></button>
          )}
          <button className="row-btn danger" onClick={() => onDelete(task.id)} aria-label="Excluir"><Icon name="delete" size={15} /></button>
        </div>
      </div>
    </div>
  );
}

// ---- Column ----
function Column({ meta, tasks, isToday, onDrop, onDragOver, dropping, children, accent }) {
  const pct = window.weightedProgress(tasks);
  const done = tasks.filter(isDone).length;
  return (
    <div className={'col' + (isToday ? ' today' : '') + (dropping ? ' dropping' : '')} onDrop={onDrop} onDragOver={onDragOver}>
      <div style={{ padding: '14px 14px 12px', borderBottom: '1px solid var(--theme-divider)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            {accent && <span style={{ width: 9, height: 9, borderRadius: '50%', background: accent, flexShrink: 0 }} />}
            <h3 className="t-h3" style={{ margin: 0, fontSize: 12.5, color: 'var(--theme-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{meta.label}</h3>
            {isToday && <span className="chip" style={{ background: 'var(--primary)', color: '#fff' }}>Hoje</span>}
          </div>
          <span className="font-sq" style={{ fontSize: 11, fontWeight: 800, color: 'var(--theme-text-muted)' }}>{pct}%</span>
        </div>
        <div style={{ marginTop: 9 }}><Progress value={pct} color={accent || 'var(--success)'} /></div>
      </div>
      <div className="col-body">
        {children}
        {tasks.length === 0 && (
          <div style={{ padding: '24px 8px', textAlign: 'center', color: 'var(--theme-text-muted)', fontSize: 12, fontStyle: 'italic' }}>
            <Icon name="drag_pan" size={20} style={{ display: 'block', margin: '0 auto 6px', opacity: .5 }} />Sem atividades
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Band (horizontal) ----
function Band({ meta, tasks, isToday, accent, dropping, onDrop, onDragOver, children }) {
  const pct = window.weightedProgress(tasks);
  return (
    <div className={'band' + (isToday ? ' today' : '') + (dropping ? ' dropping' : '')} onDrop={onDrop} onDragOver={onDragOver}>
      <div className="band-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          {accent && <span style={{ width: 10, height: 10, borderRadius: '50%', background: accent, flexShrink: 0 }} />}
          <h3 className="t-h3" style={{ margin: 0, fontSize: 13.5, color: 'var(--theme-text)' }}>{meta.label}</h3>
          {isToday && <span className="chip" style={{ background: 'var(--primary)', color: '#fff' }}>Hoje</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <div style={{ width: 'clamp(80px, 18vw, 160px)' }}><Progress value={pct} color={accent || 'var(--success)'} /></div>
          <span className="font-sq" style={{ fontSize: 12, fontWeight: 800, color: 'var(--theme-text-muted)', minWidth: 34, textAlign: 'right' }}>{pct}%</span>
        </div>
      </div>
      <div className="band-body">
        {children}
        {tasks.length === 0 && <div style={{ padding: '14px 4px', color: 'var(--theme-text-muted)', fontSize: 12, fontStyle: 'italic' }}>Sem atividades alocadas.</div>}
      </div>
    </div>
  );
}

// ---- KPI ----
function KpiCard({ icon, label, value, sub, color, gradient, trend }) {
  const styleBase = gradient ? { background: gradient, color: '#fff', border: 'none' } : { background: 'var(--theme-card)', color: 'var(--theme-text)' };
  return (
    <div className="card" style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 8, ...styleBase }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, opacity: gradient ? .92 : 1 }}>
        <Icon name={icon} size={16} color={gradient ? '#fff' : color} />
        <span className="cap" style={{ fontSize: 9, color: gradient ? '#fff' : 'var(--theme-text-muted)' }}>{label}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        <span className="font-sq" style={{ fontSize: 30, fontWeight: 800, color: gradient ? '#fff' : (color || 'var(--theme-text)'), lineHeight: 1 }}>{value}</span>
        {sub && <span style={{ fontSize: 11, fontWeight: 600, opacity: .8 }}>{sub}</span>}
        {trend != null && trend !== 0 && (
          <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 11, fontWeight: 800, color: gradient ? '#fff' : (trend > 0 ? 'var(--success)' : 'var(--danger)') }}>
            <Icon name={trend > 0 ? 'trending_up' : 'trending_down'} size={14} />{trend > 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { Icon, Avatar, Progress, DiscTag, StatusControl, TaskCard, Column, Band, KpiCard, fmtDue });
