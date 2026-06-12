import React, { useMemo } from 'react';
import { Project, DB } from '../types';
import { useApp } from '../contexts/AppContext';
import { MembersPresence } from './MembersPresence';

interface ColaboradorTabProps {
  project: Project;
  db: DB;
}

export const ColaboradorTab: React.FC<ColaboradorTabProps> = ({ project, db }) => {
  const { currentUser, onlineUsers } = useApp();

  // onlineUsers comes from the global collaboration context (real + bots)

  // Organiza os dados focados por Disciplina (Scope)
  const viewData = useMemo(() => {
    return project.scopes.map(scope => {
      const disciplineCode = scope.name;
      const fullDisciplineName = db.disciplines.find(d => d.code === disciplineCode)?.name || disciplineCode;
      const leader = scope.resp || 'Sem Líder';

      let totalTasks = 0;
      let completedTasks = 0;
      let totalChecklists = 0;
      let completedChecklists = 0;

      const collabsObj: Record<string, { total: number; completed: number; isLeader: boolean }> = {};

      scope.events.forEach(ev => {
        const resp = ev.resp || 'Sem Resp.';
        totalTasks += 1;
        if (ev.completed) completedTasks += 1;

        if (!collabsObj[resp]) {
          collabsObj[resp] = { total: 0, completed: 0, isLeader: resp === leader };
        }

        collabsObj[resp].total += 1;
        if (ev.completed) collabsObj[resp].completed += 1;

        (ev.checklist || []).forEach(chk => {
          if (chk.status === 'na') return;
          totalChecklists += 1;
          if (chk.done) completedChecklists += 1;

          collabsObj[resp].total += 1;
          if (chk.done) collabsObj[resp].completed += 1;
        });
      });

      // Garante que o líder apareça no gráfico mesmo sem AÇÕES
      if (!collabsObj[leader] && leader !== 'Sem Líder') {
        collabsObj[leader] = { total: 0, completed: 0, isLeader: true };
      }

      const chartData = Object.entries(collabsObj).map(([name, stats]) => {
        // Calculate time spent for this collaborator in this scope
        const timeSpentSecs = project.timeLogs
          ?.filter(log => log.scopeId === scope.id && (log.userId === name || (!log.userId && name === 'SISTEMA')))
          .reduce((acc, log) => acc + (log.duration || 0), 0) || 0;

        const hours = Math.floor(timeSpentSecs / 3600);
        const minutes = Math.floor((timeSpentSecs % 3600) / 60);

        return {
          name,
          total: stats.total,
          completed: stats.completed,
          pending: stats.total - stats.completed,
          isLeader: stats.isLeader,
          timeSpentHours: hours,
          timeSpentMinutes: minutes,
          timeSpentStr: hours > 0 || minutes > 0 ? `${hours}h ${minutes}m` : '0h'
        };
      }).sort((a, b) => b.total - a.total);

      const maxScopeTasks = Math.max(...chartData.map(d => d.total), 1);

      // Find actual start and end dates from events
      let actualStart = scope.startDate ? new Date(scope.startDate) : undefined;
      let actualEnd = scope.protocolDate ? new Date(scope.protocolDate) : undefined;

      scope.events.forEach(ev => {
        if (ev.startDate) {
          const evStart = new Date(ev.startDate);
          if (!actualStart || evStart < actualStart) actualStart = evStart;
        }
        if (ev.endDate) {
          const evEnd = new Date(ev.endDate);
          if (!actualEnd || evEnd > actualEnd) actualEnd = evEnd;
        }
      });

      // Calculate total time spent on this scope by all collaborators
      const scopeTimeSecs = project.timeLogs
        ?.filter(log => log.scopeId === scope.id)
        .reduce((acc, log) => acc + (log.duration || 0), 0) || 0;
      const scopeH = Math.floor(scopeTimeSecs / 3600);
      const scopeM = Math.floor((scopeTimeSecs % 3600) / 60);
      const scopeS = scopeTimeSecs % 60;
      const scopeTimeStr = `${scopeH.toString().padStart(2, '0')}:${scopeM.toString().padStart(2, '0')}:${scopeS.toString().padStart(2, '0')}`;

      return {
        id: scope.id,
        name: disciplineCode,
        fullDisciplineName,
        leader,
        colorClass: scope.colorClass,
        totalTasks,
        completedTasks,
        totalChecklists,
        completedChecklists,
        totalOverall: totalTasks + totalChecklists,
        completedOverall: completedTasks + completedChecklists,
        chartData,
        maxScopeTasks,
        actualStartDate: actualStart ? actualStart.toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '--/--',
        actualEndDate: actualEnd ? actualEnd.toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '--/--',
        scopeTimeStr
      };
    }).sort((a, b) => b.totalOverall - a.totalOverall);
  }, [project, db.disciplines]);

  return (
    <div className="w-full h-full flex flex-col relative overflow-hidden animate-fadeIn text-theme-text bg-transparent">
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="w-full h-full opacity-[0.03]" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/diagonal-stripes.png')" }}></div>
      </div>
      {/* Fixed Sticky Header */}
      <div className="flex justify-between items-center px-6 py-4 border-b border-theme-divider bg-theme-bg/95 backdrop-blur-md shadow-lg relative z-10 flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-0.5 h-5 bg-theme-orange shadow-[0_0_10px_#FF6B00]"></div>
            <span className="material-symbols-outlined text-base text-theme-orange">monitoring</span>
            <h2 className="font-square font-black text-[11px] uppercase tracking-[0.4em] text-theme-text">Status por Colaborador</h2>
          </div>
          {/* Real-time members presence status — now powered by global context */}
          <MembersPresence projectId={String(project.id)} />
        </div>
        <p className="text-[9px] font-bold text-theme-textMuted uppercase tracking-wider">
          Análise de Carga por Disciplina
        </p>
      </div>

      {/* Scrollable Viewport */}
      <div className="flex-1 overflow-y-auto scroller p-6 space-y-8 relative z-10">
        {/* Grid de Dashboards por Disciplina */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {viewData.map(colab => {
            const progressPercent = colab.totalOverall > 0 ? (colab.completedOverall / colab.totalOverall) * 100 : 0;
            const strokeDasharray = 283;
            const strokeDashoffset = strokeDasharray - (strokeDasharray * progressPercent) / 100;

            return (
              <div
                key={colab.id}
                className="ds-card p-8 flex flex-col relative overflow-hidden group"
              >
                <div className="flex flex-col mb-6">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-6 rounded-full" style={{ backgroundColor: colab.colorClass }}></div>
                      <h3 className="text-xl font-square font-black text-theme-text uppercase tracking-widest flex items-baseline gap-2">
                        {colab.name} <span className="text-[10px] font-bold text-theme-textMuted">{colab.fullDisciplineName}</span>
                      </h3>
                    </div>
                    <button className="w-8 h-8 rounded-full bg-theme-highlight text-theme-textMuted hover:text-theme-text hover:bg-theme-border/20 border border-theme-divider flex items-center justify-center transition-colors shrink-0">
                      <span className="material-symbols-outlined text-sm">north_east</span>
                    </button>
                  </div>
                  <div className="text-[10px] font-bold uppercase mt-1 flex items-center gap-4 text-theme-textMuted">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">calendar_month</span>
                      {colab.actualStartDate} até {colab.actualEndDate}
                    </span>
                    {colab.scopeTimeStr !== "00:00:00" && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full border" style={{ color: colab.colorClass, backgroundColor: colab.colorClass + '18', borderColor: colab.colorClass + '40' }}>
                        <span className="material-symbols-outlined text-[12px]">timer</span>
                        {colab.scopeTimeStr}
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6 mb-8">
                  <div className="bg-theme-highlight/50 rounded-3xl p-6 flex items-center gap-6 border border-theme-divider/50 shadow-inner">
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 px-2 py-0.5 rounded text-[8px] font-black bg-theme-divider/70 text-theme-text text-center">{colab.totalTasks}</div>
                        <span className="text-[9px] font-bold text-theme-textMuted uppercase">AÇÕES</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-8 px-2 py-0.5 rounded text-[8px] font-black text-white text-center" style={{ backgroundColor: colab.colorClass }}>{colab.totalChecklists}</div>
                        <span className="text-[9px] font-bold text-theme-textMuted uppercase">Chklist</span>
                      </div>
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-theme-divider/50">
                        <div className="w-8 px-2 py-0.5 rounded text-[8px] font-black bg-theme-text text-theme-card text-center">{colab.totalOverall}</div>
                        <span className="text-[9px] font-bold text-theme-text uppercase">Total</span>
                      </div>
                    </div>

                    <div className="relative w-28 h-28 flex flex-col items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90 drop-shadow-sm" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="45" fill="none" stroke="var(--theme-bg)" strokeWidth="12" />
                        <circle cx="50" cy="50" r="45" fill="none" stroke={colab.colorClass + '30'} strokeWidth="12" />
                        <circle
                          cx="50" cy="50" r="45" fill="none" stroke={colab.colorClass} strokeWidth="12"
                          strokeLinecap="round"
                          strokeDasharray={strokeDasharray}
                          strokeDashoffset={strokeDashoffset}
                          className="transition-all duration-1000 ease-out"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full text-[6px] font-black shadow-sm bg-theme-card border border-theme-divider/40" style={{ color: colab.colorClass }}>
                          {Math.round(progressPercent)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4">
                    <div className="rounded-3xl p-5 flex flex-col relative overflow-hidden" style={{ backgroundColor: colab.colorClass, boxShadow: `0 4px 15px ${colab.colorClass}50` }}>
                      <div className="flex justify-between items-start z-10">
                        <div>
                          <h4 className="text-white font-square font-black text-sm uppercase">Tarefas Finalizadas</h4>
                          <p className="text-white/80 text-[9px] font-bold mt-1">Desempenho Geral</p>
                        </div>
                        <button className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-white backdrop-blur-sm">
                          <span className="material-symbols-outlined text-[10px]">share</span>
                        </button>
                      </div>
                      <div className="flex items-end gap-1 mt-6 h-8 z-10 w-[70%] opacity-90">
                        <div className="flex-1 bg-white/30 h-[20%] rounded-full"></div>
                        <div className="flex-1 bg-white/40 h-[40%] rounded-full"></div>
                        <div className="flex-1 bg-white/60 h-[60%] rounded-full"></div>
                        <div className="flex-[2] bg-white h-[90%] rounded-full flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colab.colorClass }}></div>
                        </div>
                        <div className="flex-[1.5] bg-white/20 h-[100%] rounded-full"></div>
                      </div>
                      <span className="absolute bottom-6 right-6 font-mono font-black text-4xl text-white/90">{colab.completedTasks}</span>
                    </div>

                    <div className="bg-theme-highlight/50 rounded-3xl p-5 flex flex-col border border-theme-divider/50 shadow-inner">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-square font-black text-sm uppercase text-theme-text">Checklist Finalizados</h4>
                          <p className="text-[9px] font-bold mt-1 text-theme-textMuted">Conferência de Qualidade</p>
                        </div>
                        <button className="w-6 h-6 rounded-full bg-theme-bg text-theme-textMuted flex items-center justify-center shadow-sm border border-theme-divider hover:text-theme-orange transition-colors">
                          <span className="material-symbols-outlined text-[10px]">north_east</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-2 mt-4">
                        <div className="flex-1 h-6 bg-theme-bg rounded-full flex overflow-hidden border border-theme-divider p-0.5">
                          <div
                            className="h-full rounded-full transition-all duration-1000"
                            style={{ width: `${colab.totalChecklists > 0 ? (colab.completedChecklists / colab.totalChecklists) * 100 : 0}%`, backgroundColor: colab.colorClass }}
                          ></div>
                        </div>
                        <span className="font-mono font-black text-lg text-theme-text">{colab.completedChecklists}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-6">
                  <h4 className="font-square font-black text-xs tracking-widest text-theme-text uppercase">
                    Status por Colaborador
                  </h4>
                  <div className="flex items-center gap-4 text-[9px] font-bold text-theme-text">
                    <span className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded flex items-center justify-center" style={{ backgroundColor: colab.colorClass }}><div className="w-1 h-1 bg-white rounded-full opacity-50"></div></div> Líder
                    </span>
                    <span className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded bg-theme-text"></div> Normal
                    </span>
                  </div>
                </div>

                <div className="flex flex-col flex-1 relative bg-theme-highlight/50 rounded-3xl pt-8 pb-4 px-4 border border-theme-divider/50 min-h-[200px] shadow-inner">
                  {colab.chartData.length > 0 ? (
                    <div className="h-40 w-full flex items-end justify-around relative">
                      <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" style={{ transform: 'scaleY(-1)' }}>
                        <path
                          d={`M 0,${(colab.chartData[0]?.total / colab.maxScopeTasks) * 100}% ` +
                            colab.chartData.map((d, i) => {
                              const x = (i / (colab.chartData.length - 1 || 1)) * 100;
                              const y = (d.total / colab.maxScopeTasks) * 100;
                              return `L ${x}%,${y}%`;
                            }).join(' ')}
                          fill="none"
                          stroke="var(--theme-divider)"
                          strokeWidth="2"
                          strokeDasharray="4 4"
                        />
                        <path
                          d={`M 5%,${(colab.chartData[0]?.total / colab.maxScopeTasks) * 100}% ` +
                            colab.chartData.map((d, i) => {
                              const step = 90 / (colab.chartData.length - 1 || 1);
                              const x = 5 + (i * step);
                              const y = (d.total / colab.maxScopeTasks) * 100;

                              if (i === 0) return '';

                              const prevX = 5 + ((i - 1) * step);
                              const prevY = (colab.chartData[i - 1].total / colab.maxScopeTasks) * 100;

                              const controlX1 = prevX + (step / 2);
                              const controlY1 = prevY;
                              const controlX2 = x - (step / 2);
                              const controlY2 = y;

                              return `C ${controlX1}%,${controlY1}% ${controlX2}%,${controlY2}% ${x}%,${y}%`;
                            }).join(' ')}
                          fill="none"
                          stroke="var(--theme-text)"
                          strokeWidth="1.5"
                          opacity="0.3"
                        />
                      </svg>

                      {colab.chartData.map(member => {
                        const totalHeightPercent = (member.total / colab.maxScopeTasks) * 100 || 8;

                        let pillClass = "bg-theme-divider text-theme-text";
                        let pillStyle: React.CSSProperties = {};
                        if (member.isLeader) {
                          pillClass = "text-white";
                          pillStyle = { backgroundColor: colab.colorClass };
                        } else if (member.total >= (colab.maxScopeTasks * 0.7)) {
                          pillClass = "bg-theme-text/80 text-theme-card";
                        } else if (member.total >= (colab.maxScopeTasks * 0.4)) {
                          pillClass = "bg-theme-text/55 text-theme-card";
                        } else {
                          pillClass = "bg-theme-divider text-theme-text";
                        }

                        return (
                          <div key={member.name} className="flex flex-col items-center w-12 group/bar relative h-full justify-end z-10">
                            <div className="absolute -top-14 bg-theme-text text-theme-card px-3 py-1.5 flex flex-col items-center justify-center rounded-xl shadow-lg text-[10px] font-bold opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap pointer-events-none mb-2 z-[90]">
                              {member.total} Total
                              <span className="text-[8px] font-normal opacity-70">{member.completed} concluídas</span>
                              <span className="text-[8px] mt-0.5 pt-0.5 border-t border-theme-card/20 text-theme-orange font-black">⏱ {member.timeSpentStr}</span>
                              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-[4px] border-transparent border-t-theme-text"></div>
                            </div>

                            <div
                              className={`w-full rounded-full flex flex-col items-center shadow-sm transition-all duration-700 ease-out relative overflow-hidden ${pillClass}`}
                              style={{ height: `${totalHeightPercent}%`, minHeight: '32px', ...pillStyle }}
                            >
                              {totalHeightPercent > 20 && (
                                <div className="mt-3 text-[9px] font-square font-black opacity-80">
                                  {member.total}
                                </div>
                              )}
                              {member.isLeader && (
                                <div className="absolute top-2 w-1.5 h-1.5 bg-white rounded-full opacity-60"></div>
                              )}
                            </div>

                            {member.isLeader && member.total === colab.maxScopeTasks && (
                              <div className="absolute top-0 -mt-1.5 w-3 h-3 border-2 border-[#FF9F40] bg-white rounded-full z-20" style={{ bottom: `${totalHeightPercent}%` }}></div>
                            )}

                            <span className="mt-4 text-[9px] font-black uppercase text-center max-w-[60px] leading-tight text-theme-text truncate" title={member.name}>
                              {member.name.split(' ').map((n, i, arr) => i === 0 || i === arr.length - 1 ? n : n[0] + '.').join(' ')}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="h-40 flex items-center justify-center text-[10px] text-theme-textMuted font-bold uppercase text-center px-8 border-2 border-dashed border-theme-divider rounded-2xl mx-4">
                      Nenhuma ação de colaborador atribuída.
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {viewData.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 opacity-30">
            <span className="material-symbols-outlined text-6xl mb-4 text-theme-textMuted font-light">monitoring</span>
            <p className="font-square font-black uppercase tracking-widest text-sm text-theme-textMuted">Nenhuma disciplina encontrada.</p>
          </div>
        )}
      </div>
    </div>
  );
};
