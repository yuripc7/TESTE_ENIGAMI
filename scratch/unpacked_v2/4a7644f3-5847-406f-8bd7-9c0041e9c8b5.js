/* global React, DAYS, PROJECTS, PEOPLE, DISCIPLINES, VALID_STATES, projColor, projCode, discipline,
   person, initials, taskProgress, isDone, isOverdue, taskWeight, weightedProgress */

function MiniBar({ value, color }) {
  return (
    <div style={{ height: 7, borderRadius: 99, background: '#eef0f2', overflow: 'hidden', width: '100%' }}>
      <div style={{ height: '100%', width: value + '%', background: color, borderRadius: 99 }}></div>
    </div>
  );
}

function PrintSheet({ tasks, weekLabel, stats, pva, trend, scope, coord, showChecklist }) {
  const usedProjects = PROJECTS.filter(p => tasks.some(t => t.project === p.name));
  const usedPeople = PEOPLE.filter(p => tasks.some(t => t.assignee === p.name));
  const usedDiscs = DISCIPLINES.filter(d => tasks.some(t => t.disc === d.code));
  const coordTotal = tasks.filter(t => t.isCoordPoint);
  const overdue = tasks.filter(isOverdue);
  const trackColor = !pva || !pva.hasData ? '#9ca3af' : pva.onTrackPct >= 90 ? '#10B981' : pva.onTrackPct >= 60 ? '#EAB308' : '#EF4444';

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
        const novas = tasks.filter(t => t.unplanned && !t.carriedFrom);
        const adiadas = tasks.filter(t => t.carriedFrom);
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
              {[['NOVA', '#FF6B4A', novas], ['ADIADA', '#B45309', adiadas]].map(([tag, color, arr]) => arr.map(t => (
                <div key={tag + t.id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '3px 0', borderBottom: '1px solid #f3f4f6' }}>
                  <span style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 800, fontSize: 7, color, width: 58, flexShrink: 0 }}>● {tag}{tag === 'ADIADA' && t.postponedCount > 1 ? ' ×' + t.postponedCount : ''}</span>
                  <span style={{ fontSize: 7.5, fontWeight: 800, color: projColor(t.project), width: 26, flexShrink: 0 }}>{projCode(t.project)}</span>
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
              const list = tasks.filter(t => t.project === p.name); const v = weightedProgress(list);
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
              const list = tasks.filter(t => t.disc === d.code); const v = weightedProgress(list);
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
              {['Colaborador', 'Função', 'Demandas', 'Carga', 'Validações', 'Avanço'].map((h, i) => (
                <th key={i} style={{ textAlign: i > 1 ? 'center' : 'left', padding: '5px 6px', fontFamily: "'Orbitron', sans-serif", fontWeight: 800, fontSize: 7, letterSpacing: '0.1em', color: '#6b7280' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {usedPeople.map(p => {
              const list = tasks.filter(t => t.assignee === p.name);
              const v = weightedProgress(list);
              const w = list.reduce((a, t) => a + taskWeight(t), 0);
              const ratio = Math.round(w / p.capacity * 100);
              const valids = list.filter(t => t.isCoordPoint);
              const validsOk = valids.filter(t => t.valid === 'approved').length;
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
          {coordTotal.map(t => {
            const vs = VALID_STATES[t.valid || 'pending'];
            return (
              <div key={t.id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '4px 8px', borderBottom: '1px solid #eef0f2', borderLeft: `3px solid ${vs.color}`, paddingLeft: 9 }}>
                <span style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 800, fontSize: 7, letterSpacing: '0.06em', color: vs.color, width: 64, flexShrink: 0, textTransform: 'uppercase' }}>{vs.label}</span>
                <span style={{ fontSize: 7.5, fontWeight: 800, color: projColor(t.project), width: 26, flexShrink: 0 }}>{projCode(t.project)}</span>
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
        const list = tasks.filter(t => t.day === day);
        if (!list.length) return null;
        const dayPct = weightedProgress(list);
        return (
          <div key={day} style={{ marginBottom: 11, breakInside: 'avoid' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f3f4f6', padding: '5px 10px', borderRadius: 6, marginBottom: 5 }}>
              <span style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 800, fontSize: 10.5, letterSpacing: '0.22em', textTransform: 'uppercase' }}>{day}</span>
              <span style={{ fontSize: 9, fontWeight: 700, color: '#6b7280' }}>{list.filter(isDone).length}/{list.length} · {dayPct}%</span>
            </div>
            {list.map(t => {
              const prog = taskProgress(t); const done = isDone(t); const over = isOverdue(t);
              return (
                <div key={t.id} style={{ display: 'flex', gap: 9, alignItems: 'flex-start', padding: '4px 8px', borderBottom: '1px solid #eef0f2', borderLeft: `3px solid ${over ? '#EF4444' : projColor(t.project)}`, paddingLeft: 10 }}>
                  <span style={{ width: 12, height: 12, border: done ? 'none' : '1.5px solid #6b7280', background: done ? '#10B981' : 'transparent', borderRadius: 3, flexShrink: 0, marginTop: 2, color: '#fff', fontSize: 10, lineHeight: '12px', textAlign: 'center', fontWeight: 900 }}>{done ? '✓' : ''}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 6, marginBottom: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 800, fontSize: 7, letterSpacing: '0.08em', color: projColor(t.project) }}>{projCode(t.project)}</span>
                      {discipline(t.disc) && <span style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 800, fontSize: 7, color: discipline(t.disc).color }}>{t.disc}</span>}
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
                        {t.subtasks.map(s => (
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
        <span>RELATÓRIO GERADO AUTOMATICAMENTE</span>
      </div>
    </div>
  );
}

window.PrintSheet = PrintSheet;
