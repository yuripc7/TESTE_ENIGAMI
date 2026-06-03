/* global React, Icon, Avatar, Progress, DiscTag, PEOPLE, PROJECTS, DISCIPLINES, VALID_STATES,
   person, projColor, projCode, taskWeight, taskProgress, isDone, isOverdue, weightedProgress, plannedVsActual */

// ====== Painel de Insights (drawer) ======
function InsightsPanel({ open, onClose, tasks, weekOffset, prevProgress }) {
  if (!open) return null;
  const pva = plannedVsActual(tasks, weekOffset);
  const current = weightedProgress(tasks);
  const trend = prevProgress != null ? current - prevProgress : null;
  const overdue = tasks.filter(isOverdue);

  // carga por pessoa (peso alocado vs capacidade)
  const load = PEOPLE.filter(p => tasks.some(t => t.assignee === p.name)).map(p => {
    const list = tasks.filter(t => t.assignee === p.name);
    const w = list.reduce((a, t) => a + taskWeight(t), 0);
    return { ...p, w, ratio: Math.round(w / p.capacity * 100), prog: weightedProgress(list), count: list.length };
  });

  // por disciplina
  const discs = DISCIPLINES.filter(d => tasks.some(t => t.disc === d.code)).map(d => {
    const list = tasks.filter(t => t.disc === d.code);
    return { ...d, prog: weightedProgress(list), count: list.length };
  });

  return (
    <div className="overlay no-print" onClick={onClose} style={{ justifyContent: 'flex-end', padding: 0 }}>
      <div className="drawer" onClick={e => e.stopPropagation()}>
        <div className="drawer-head">
          <h2 className="t-h2" style={{ margin: 0, fontSize: 16, display: 'flex', alignItems: 'center', gap: 9 }}><Icon name="insights" size={22} color="var(--primary)" />Painel de Avanço</h2>
          <button className="btn-icon" onClick={onClose}><Icon name="close" size={18} /></button>
        </div>
        <div className="drawer-body">

          {/* Previsto x Realizado */}
          <section className="ins-block">
            <div className="ins-title"><Icon name="speed" size={15} />Previsto × Realizado (até hoje)</div>
            {pva.hasData ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8 }}>
                  <span className="font-sq" style={{ fontSize: 34, fontWeight: 900, color: pva.onTrackPct >= 90 ? 'var(--success)' : pva.onTrackPct >= 60 ? '#EAB308' : 'var(--danger)' }}>{pva.onTrackPct}%</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: pva.onTrackPct >= 90 ? 'var(--success)' : pva.onTrackPct >= 60 ? '#EAB308' : 'var(--danger)' }}>{pva.onTrackPct >= 90 ? 'NO PRAZO' : pva.onTrackPct >= 60 ? 'ATENÇÃO' : 'ATRASADO'}</span>
                </div>
                <Progress value={pva.onTrackPct} color={pva.onTrackPct >= 90 ? 'var(--success)' : pva.onTrackPct >= 60 ? '#EAB308' : 'var(--danger)'} height={8} />
                <p style={{ margin: '8px 0 0', fontSize: 11.5, color: 'var(--theme-text-muted)' }}>Das demandas que já deveriam ter avançado, {pva.doneW} de {pva.plannedW} pontos de esforço foram concluídos.</p>
              </div>
            ) : <p style={{ fontSize: 12, color: 'var(--theme-text-muted)', margin: 0 }}>Sem dados de prazo para esta semana ainda.</p>}
          </section>

          {/* Avanço geral + variação */}
          <section className="ins-block">
            <div className="ins-title"><Icon name="trending_up" size={15} />Avanço Ponderado da Semana</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
              <span className="font-sq" style={{ fontSize: 34, fontWeight: 900, color: 'var(--primary)' }}>{current}%</span>
              {trend != null && (
                <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 13, fontWeight: 800, color: trend > 0 ? 'var(--success)' : trend < 0 ? 'var(--danger)' : 'var(--theme-text-muted)' }}>
                  <Icon name={trend > 0 ? 'arrow_upward' : trend < 0 ? 'arrow_downward' : 'remove'} size={15} />{trend > 0 ? '+' : ''}{trend}% vs. semana anterior
                </span>
              )}
            </div>
            {trend == null && <p style={{ margin: '6px 0 0', fontSize: 11, color: 'var(--theme-text-muted)' }}>Sem semana anterior registrada para comparar.</p>}
          </section>

          {/* Carga por pessoa */}
          <section className="ins-block">
            <div className="ins-title"><Icon name="balance" size={15} />Carga por Colaborador</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              {load.map(p => {
                const over = p.ratio > 100;
                return (
                  <div key={p.name}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                      <Avatar name={p.name} size={22} />
                      <span style={{ fontSize: 12.5, fontWeight: 700 }}>{p.name}</span>
                      <span style={{ fontSize: 10.5, color: 'var(--theme-text-muted)' }}>{p.count} demandas · {p.w}/{p.capacity} pts</span>
                      <span className="chip" style={{ marginLeft: 'auto', background: over ? '#FEE2E2' : p.ratio < 50 ? '#F1F5F9' : '#DCFCE7', color: over ? 'var(--danger)' : p.ratio < 50 ? '#64748B' : 'var(--success)', border: 'none' }}>
                        {over ? 'Sobrecarga' : p.ratio < 50 ? 'Ocioso' : 'Equilibrado'}
                      </span>
                    </div>
                    <Progress value={Math.min(p.ratio, 100)} color={over ? 'var(--danger)' : p.color} height={6} />
                  </div>
                );
              })}
            </div>
          </section>

          {/* Por disciplina */}
          <section className="ins-block">
            <div className="ins-title"><Icon name="category" size={15} />Avanço por Disciplina</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {discs.map(d => (
                <div key={d.code} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 42 }}><DiscTag code={d.code} /></span>
                  <div style={{ flex: 1 }}><Progress value={d.prog} color={d.color} height={6} /></div>
                  <span className="font-sq" style={{ fontSize: 11, fontWeight: 800, width: 60, textAlign: 'right', color: 'var(--theme-text-muted)' }}>{d.count}× · {d.prog}%</span>
                </div>
              ))}
            </div>
          </section>

          {/* Atrasos */}
          {overdue.length > 0 && (
            <section className="ins-block" style={{ borderColor: '#fecaca', background: '#FEF2F2' }}>
              <div className="ins-title" style={{ color: 'var(--danger)' }}><Icon name="warning" size={15} />Demandas em Atraso ({overdue.length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {overdue.map(t => (
                  <div key={t.id} style={{ display: 'flex', gap: 7, alignItems: 'flex-start', fontSize: 12 }}>
                    <span className="chip" style={{ background: projColor(t.project) + '1A', color: projColor(t.project), border: 'none', flexShrink: 0 }}>{projCode(t.project)}</span>
                    <span style={{ flex: 1 }}>{t.text}</span>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--theme-text-muted)', flexShrink: 0 }}>{t.assignee}</span>
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

// ====== Fila de Validações (drawer) ======
function ValidationPanel({ open, onClose, tasks, onValidate, onOpenTask }) {
  if (!open) return null;
  const coord = tasks.filter(t => t.isCoordPoint);
  const groups = {
    pending: coord.filter(t => (t.valid || 'pending') === 'pending'),
    returned: coord.filter(t => t.valid === 'returned'),
    approved: coord.filter(t => t.valid === 'approved'),
  };
  const Section = ({ keyName, title, icon }) => groups[keyName].length ? (
    <section className="ins-block">
      <div className="ins-title" style={{ color: VALID_STATES[keyName].color }}><Icon name={icon} size={15} />{title} ({groups[keyName].length})</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {groups[keyName].map(t => (
          <div key={t.id} style={{ border: '1px solid var(--theme-divider)', borderRadius: 12, padding: 12, borderLeft: `4px solid ${VALID_STATES[keyName].color}` }}>
            <div style={{ display: 'flex', gap: 7, marginBottom: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <span className="chip" style={{ background: projColor(t.project) + '1A', color: projColor(t.project), border: 'none' }}>{projCode(t.project)}</span>
              <DiscTag code={t.disc} />
              <span style={{ fontSize: 11, fontWeight: 600 }}>{t.assignee}</span>
              <span style={{ fontSize: 10.5, color: 'var(--theme-text-muted)', marginLeft: 'auto' }}>{t.day}</span>
            </div>
            <p style={{ margin: '0 0 9px', fontSize: 13, lineHeight: 1.4 }}>{t.text}</p>
            <div style={{ display: 'flex', gap: 7 }}>
              {keyName !== 'approved' && <button className="mini-btn ok" onClick={() => onValidate(t.id, 'approved')}><Icon name="check" size={13} />Aprovar</button>}
              {keyName !== 'returned' && <button className="mini-btn no" onClick={() => onValidate(t.id, 'returned')}><Icon name="undo" size={13} />Devolver</button>}
              {keyName !== 'pending' && <button className="mini-btn" style={{ background: 'var(--theme-input)', color: 'var(--theme-text)' }} onClick={() => onValidate(t.id, 'pending')}><Icon name="schedule" size={13} />Reabrir</button>}
              <button className="mini-btn" style={{ background: 'var(--theme-input)', color: 'var(--theme-text)', marginLeft: 'auto' }} onClick={() => onOpenTask(t)}><Icon name="open_in_new" size={13} />Abrir</button>
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
          <h2 className="t-h2" style={{ margin: 0, fontSize: 16, display: 'flex', alignItems: 'center', gap: 9 }}><Icon name="verified" size={22} color="#6366F1" />Fila de Validações</h2>
          <button className="btn-icon" onClick={onClose}><Icon name="close" size={18} /></button>
        </div>
        <div className="drawer-body">
          {coord.length === 0 && <p style={{ fontSize: 12.5, color: 'var(--theme-text-muted)' }}>Nenhum ponto de coordenação nesta semana.</p>}
          <Section keyName="pending" title="Aguardando aprovação" icon="hourglass_top" />
          <Section keyName="returned" title="Devolvidos para ajuste" icon="undo" />
          <Section keyName="approved" title="Aprovados" icon="task_alt" />
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { InsightsPanel, ValidationPanel });
