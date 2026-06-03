/* global React, Icon, PROJECTS, PEOPLE, DAYS, DISCIPLINES, STATUSES, dateForDay, addProject, addPerson, addDiscipline */
const { useState, useEffect } = React;

// Select com opção de criar um novo item na hora
function SelectOrAdd({ value, onChange, options, onAdd, placeholder, addLabel }) {
  const [adding, setAdding] = useState(false);
  const [txt, setTxt] = useState('');
  const confirm = () => { const v = onAdd(txt); if (v) { onChange(v); } setAdding(false); setTxt(''); };
  if (adding) {
    return (
      <div style={{ display: 'flex', gap: 6 }}>
        <input className="input" autoFocus value={txt} onChange={e => setTxt(e.target.value)} placeholder={placeholder}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); confirm(); } if (e.key === 'Escape') { setAdding(false); setTxt(''); } }} style={{ fontSize: 12.5 }} />
        <button type="button" className="btn btn-primary" style={{ flexShrink: 0, padding: '0 12px' }} onClick={confirm}><Icon name="check" size={16} /></button>
        <button type="button" className="btn-icon" style={{ flexShrink: 0 }} onClick={() => { setAdding(false); setTxt(''); }}><Icon name="close" size={16} /></button>
      </div>
    );
  }
  return (
    <select className="select" value={value} onChange={e => { if (e.target.value === '__add') setAdding(true); else onChange(e.target.value); }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      <option value="__add">＋ {addLabel}</option>
    </select>
  );
}

// Modal para criar / editar uma demanda
function TaskModal({ open, initial, weekOffset, onClose, onSave }) {
  const blank = { text: '', day: 'Segunda', assignee: 'Yuri', project: 'Geral', disc: 'ARQ', status: 'todo', weight: 2, time: '', dueDate: '', isCoordPoint: false, valid: 'pending', subtasks: [] };
  const [form, setForm] = useState(blank);
  const [newSub, setNewSub] = useState('');
  const [, bump] = useState(0); // força re-render ao criar projeto/disciplina/pessoa
  const isEdit = initial && initial.id != null;

  useEffect(() => {
    if (open) {
      const base = initial ? { ...blank, ...initial, subtasks: initial.subtasks ? [...initial.subtasks] : [] } : blank;
      if (!base.dueDate) base.dueDate = dateForDay(base.day, weekOffset || 0);
      setForm(base); setNewSub('');
    }
  }, [open, initial]);

  if (!open) return null;
  const set = (k, v) => setForm(f => {
    const next = { ...f, [k]: v };
    if (k === 'day' && (!f.dueDate || f.dueDate === dateForDay(f.day, weekOffset || 0))) next.dueDate = dateForDay(v, weekOffset || 0);
    return next;
  });
  const addSub = () => { if (!newSub.trim()) return; setForm(f => ({ ...f, subtasks: [...f.subtasks, { id: Date.now() + '', text: newSub.trim(), done: false }] })); setNewSub(''); };
  const toggleSub = (id) => setForm(f => ({ ...f, subtasks: f.subtasks.map(s => s.id === id ? { ...s, done: !s.done } : s) }));
  const delSub = (id) => setForm(f => ({ ...f, subtasks: f.subtasks.filter(s => s.id !== id) }));
  const submit = (e) => { e.preventDefault(); if (!form.text.trim()) return; onSave(form); };

  return (
    <div className="overlay no-print" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div style={{ padding: '20px 22px', borderBottom: '1px solid var(--theme-divider)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'var(--theme-card)', zIndex: 2, borderRadius: 'var(--radius-card) var(--radius-card) 0 0' }}>
          <h2 className="t-h2" style={{ margin: 0, fontSize: 16, display: 'flex', alignItems: 'center', gap: 9 }}>
            <Icon name={isEdit ? 'edit_note' : 'add_task'} size={22} color="var(--primary)" />{isEdit ? 'Editar Demanda' : 'Nova Demanda'}
          </h2>
          <button className="btn-icon" onClick={onClose} aria-label="Fechar"><Icon name="close" size={18} /></button>
        </div>

        <form onSubmit={submit} style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="field-label">Descrição da atividade</label>
            <textarea className="textarea" value={form.text} onChange={e => set('text', e.target.value)} placeholder="Descreva a entrega ou tarefa…" autoFocus required />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label className="field-label">Projeto</label>
              <SelectOrAdd value={form.project} onChange={v => set('project', v)} addLabel="Novo projeto" placeholder="Nome do projeto…"
                options={PROJECTS.map(p => ({ value: p.name, label: p.name }))}
                onAdd={(txt) => { const p = addProject(txt); bump(n => n + 1); return p ? p.name : null; }} /></div>
            <div><label className="field-label">Disciplina</label>
              <SelectOrAdd value={form.disc} onChange={v => set('disc', v)} addLabel="Nova disciplina" placeholder="Nome da disciplina…"
                options={DISCIPLINES.map(d => ({ value: d.code, label: d.code + ' · ' + d.name }))}
                onAdd={(txt) => { const d = addDiscipline(txt); bump(n => n + 1); return d ? d.code : null; }} /></div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label className="field-label">Responsável</label>
              <SelectOrAdd value={form.assignee} onChange={v => set('assignee', v)} addLabel="Novo responsável" placeholder="Nome da pessoa…"
                options={PEOPLE.map(p => ({ value: p.name, label: p.name }))}
                onAdd={(txt) => { const p = addPerson(txt); bump(n => n + 1); return p ? p.name : null; }} /></div>
            <div><label className="field-label">Status</label>
              <select className="select" value={form.status} onChange={e => set('status', e.target.value)}>{STATUSES.map(s => <option key={s.key} value={s.key}>{s.label} ({s.pct}%)</option>)}</select></div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div><label className="field-label">Dia</label>
              <select className="select" value={form.day} onChange={e => set('day', e.target.value)}>{DAYS.map(d => <option key={d} value={d}>{d}</option>)}</select></div>
            <div><label className="field-label">Prazo</label>
              <input type="date" className="input" value={form.dueDate || ''} onChange={e => set('dueDate', e.target.value)} /></div>
            <div><label className="field-label">Peso/Esforço</label>
              <input type="number" min="1" max="10" className="input" value={form.weight} onChange={e => set('weight', Math.max(1, +e.target.value || 1))} /></div>
          </div>

          {/* Subtarefas */}
          <div>
            <label className="field-label">Subtarefas (checklist)</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {form.subtasks.map(s => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 10px', borderRadius: 9, background: 'var(--theme-input)' }}>
                  <button type="button" onClick={() => toggleSub(s.id)} style={{ width: 18, height: 18, borderRadius: 5, flexShrink: 0, border: `2px solid ${s.done ? 'var(--success)' : 'var(--theme-divider)'}`, background: s.done ? 'var(--success)' : '#fff', color: '#fff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{s.done && <Icon name="check" size={12} />}</button>
                  <span style={{ flex: 1, fontSize: 12.5, textDecoration: s.done ? 'line-through' : 'none', color: s.done ? 'var(--theme-text-muted)' : 'var(--theme-text)' }}>{s.text}</span>
                  <button type="button" className="row-btn danger" onClick={() => delSub(s.id)}><Icon name="close" size={14} /></button>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="input" value={newSub} onChange={e => setNewSub(e.target.value)} placeholder="Adicionar item…" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSub(); } }} style={{ fontSize: 12.5 }} />
                <button type="button" className="btn btn-ghost" onClick={addSub} style={{ flexShrink: 0 }}><Icon name="add" size={15} /></button>
              </div>
            </div>
            <p style={{ margin: '6px 2px 0', fontSize: 10.5, color: 'var(--theme-text-muted)' }}>Com subtarefas, o progresso passa a ser a média dos itens concluídos.</p>
          </div>

          <button type="button" onClick={() => set('isCoordPoint', !form.isCoordPoint)}
            style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '13px 15px', borderRadius: 'var(--radius-md)', border: `1px solid ${form.isCoordPoint ? '#6366F1' : 'var(--theme-divider)'}`, background: form.isCoordPoint ? '#6366F112' : 'var(--theme-highlight)', cursor: 'pointer', textAlign: 'left' }}>
            <span style={{ width: 22, height: 22, borderRadius: 7, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: form.isCoordPoint ? '#6366F1' : 'var(--theme-card)', border: `2px solid ${form.isCoordPoint ? '#6366F1' : 'var(--theme-divider)'}`, color: '#fff' }}>{form.isCoordPoint && <Icon name="check" size={15} />}</span>
            <span><span className="cap" style={{ fontSize: 10, color: form.isCoordPoint ? '#4F46E5' : 'var(--theme-text)', display: 'block' }}>Requer validação</span>
              <span style={{ fontSize: 11.5, color: 'var(--theme-text-muted)' }}>Entra na fila de coordenação / compatibilização</span></span>
          </button>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', borderTop: '1px solid var(--theme-divider)', paddingTop: 16 }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary"><Icon name={isEdit ? 'save' : 'add'} size={15} />{isEdit ? 'Salvar' : 'Adicionar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

window.TaskModal = TaskModal;

// ===== Gerenciador de Coordenadores =====
function CoordManager({ open, activeCoord, onClose, onAdd, onUpdateRole, onRemove }) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  if (!open) return null;
  const list = window.coordinators();
  const submit = (e) => { e.preventDefault(); if (!name.trim()) return; onAdd(name.trim(), role.trim()); setName(''); setRole(''); };
  return (
    <div className="overlay no-print" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <div style={{ padding: '20px 22px', borderBottom: '1px solid var(--theme-divider)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 className="t-h2" style={{ margin: 0, fontSize: 16, display: 'flex', alignItems: 'center', gap: 9 }}><Icon name="manage_accounts" size={22} color="var(--primary)" />Coordenadores</h2>
          <button className="btn-icon" onClick={onClose}><Icon name="close" size={18} /></button>
        </div>

        <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {list.map(c => {
              const isActive = c.name === activeCoord;
              const canRemove = !isActive && list.length > 1;
              return (
                <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 12px', borderRadius: 12, border: '1px solid var(--theme-divider)', background: isActive ? 'var(--primary-soft)' : 'var(--theme-card)' }}>
                  <span className="avatar" style={{ width: 30, height: 30, fontSize: 11, background: c.color }}>{window.initials(c.name)}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{ fontSize: 13.5, fontWeight: 700 }}>{c.name}</span>
                      {isActive && <span className="chip" style={{ background: 'var(--primary)', color: '#fff' }}>Ativo</span>}
                    </div>
                    <input className="role-input" value={c.role} placeholder="Função…"
                      onChange={e => onUpdateRole(c.name, e.target.value)} />
                  </div>
                  <button className="row-btn danger" disabled={!canRemove}
                    title={isActive ? 'Troque de perfil antes de remover' : list.length <= 1 ? 'Deixe ao menos um coordenador' : 'Remover'}
                    style={{ opacity: canRemove ? 1 : .35, cursor: canRemove ? 'pointer' : 'not-allowed' }}
                    onClick={() => canRemove && onRemove(c.name)}><Icon name="delete" size={17} /></button>
                </div>
              );
            })}
          </div>

          <form onSubmit={submit} style={{ borderTop: '1px solid var(--theme-divider)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span className="field-label" style={{ marginBottom: 0 }}>Adicionar coordenador</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Nome" />
              <input className="input" value={role} onChange={e => setRole(e.target.value)} placeholder="Função (opcional)" />
            </div>
            <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}><Icon name="person_add" size={15} />Adicionar coordenador</button>
            <p style={{ margin: 0, fontSize: 11, color: 'var(--theme-text-muted)' }}>Cada coordenador ganha sua própria agenda. Remover não apaga as tarefas já salvas — apenas tira o perfil da lista.</p>
          </form>
        </div>
      </div>
    </div>
  );
}

window.CoordManager = CoordManager;
