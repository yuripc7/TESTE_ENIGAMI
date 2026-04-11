import React, { useMemo } from 'react';
import { Project, DB } from '../types';
import { useApp } from '../contexts/AppContext';

interface ColaboradorTabProps {
    project: Project;
    db: DB;
}

export const ColaboradorTab: React.FC<ColaboradorTabProps> = ({ project, db }) => {
    const { theme } = useApp();
    const isDark = theme === 'dark';

    // Theme adaptive variables
    const themeBg = isDark ? 'bg-[#0B0C10]' : 'bg-[#F2F4F7]';
    const themeCard = isDark ? 'bg-[#151B24]' : 'bg-white';
    const themeCardInner = isDark ? 'bg-[#1F2937]' : 'bg-[#F9FAFC]';
    const themeText = isDark ? 'text-white' : 'text-[#1B1D21]';
    const themeBorder = isDark ? 'border-[#2D3748]' : 'border-[#E8E9F0]';
    const themeButton = isDark ? 'bg-[#1F2937] text-[#9CA3AF] hover:bg-[#374151]' : 'bg-[#F2F4F7] text-[#8A909A] hover:bg-[#E8E9F0]';
    const themeSVGLine = isDark ? '#2D3748' : '#E8E9F0';
    const themeSVGCurve = isDark ? '#E2E8F0' : '#1B1D21';

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

                ev.checklist.forEach(chk => {
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
        <div className={`w-full flex flex-col gap-8 animate-fadeIn py-6 px-4 rounded-3xl ${themeBg} ${themeText}`}>
            <div className="flex justify-between items-center mb-2 pb-3 border-b border-theme-divider px-2">
                <div className="flex items-center gap-2">
                    <div className="w-0.5 h-5 rounded-full bg-theme-orange"></div>
                    <span className="material-symbols-outlined text-base text-theme-orange">monitoring</span>
                    <h2 className="font-square font-black text-xs uppercase tracking-widest text-theme-text">Status por Colaborador</h2>
                </div>
                <p className={`text-[9px] font-bold ${isDark ? "text-gray-400" : "text-[#8A909A]"} uppercase tracking-wider`}>
                    Análise de Carga por Disciplina
                </p>
            </div>

            {/* Grid de Dashboards por Disciplina */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {viewData.map(colab => {
                    const progressPercent = colab.totalOverall > 0 ? (colab.completedOverall / colab.totalOverall) * 100 : 0;
                    const strokeDasharray = 283;
                    const strokeDashoffset = strokeDasharray - (strokeDasharray * progressPercent) / 100;

                    return (
                        <div
                            key={colab.id}
                            className={`${themeCard} rounded-[40px] p-8 ${isDark ? "shadow-[0_8px_30px_rgba(0,0,0,0.7)]" : "shadow-[0_8px_30px_rgba(0,0,0,0.04)]"} flex flex-col relative overflow-hidden group border ${themeBorder}`}
                        >
                            <div className="flex flex-col mb-6">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1 h-6 rounded-full" style={{ backgroundColor: colab.colorClass }}></div>
                                        <h3 className={`text-xl font-square font-black ${themeText} uppercase tracking-widest flex items-baseline gap-2`}>
                                            {colab.name} <span className={`text-[10px] font-bold ${isDark ? "text-gray-400" : "text-[#8A909A]"}`}>{colab.fullDisciplineName}</span>
                                        </h3>
                                    </div>
                                    <button className={`w-8 h-8 rounded-full ${themeButton} flex items-center justify-center transition-colors shrink-0`}>
                                        <span className="material-symbols-outlined text-sm">north_east</span>
                                    </button>
                                </div>
                                <div className={`text-[10px] font-bold uppercase mt-1 flex items-center gap-4 ${isDark ? "text-theme-cyan" : "text-black/60"}`}>
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
                                <div className={`${themeCardInner} rounded-3xl p-6 flex items-center gap-6 border ${themeBorder}`}>
                                    <div className="flex flex-col gap-3">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-8 px-2 py-0.5 rounded text-[8px] font-black ${isDark ? "bg-[#2D3748] text-white" : "bg-[#E8E9F0] text-[#1B1D21]"} text-center`}>{colab.totalTasks}</div>
                                            <span className={`text-[9px] font-bold ${isDark ? "text-gray-400" : "text-[#8A909A]"} uppercase`}>AÇÕES</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 px-2 py-0.5 rounded text-[8px] font-black text-white text-center" style={{ backgroundColor: colab.colorClass }}>{colab.totalChecklists}</div>
                                            <span className={`text-[9px] font-bold ${isDark ? "text-gray-400" : "text-[#8A909A]"} uppercase`}>Chklist</span>
                                        </div>
                                        <div className={`flex items-center gap-2 mt-2 pt-2 border-t ${themeBorder}`}>
                                            <div className={`w-8 px-2 py-0.5 rounded text-[8px] font-black ${isDark ? "bg-white text-black" : "bg-[#1B1D21] text-white"} text-center`}>{colab.totalOverall}</div>
                                            <span className={`text-[9px] font-bold ${themeText} uppercase`}>Total</span>
                                        </div>
                                    </div>

                                    <div className="relative w-28 h-28 flex flex-col items-center justify-center">
                                        <svg className="w-full h-full transform -rotate-90 drop-shadow-sm" viewBox="0 0 100 100">
                                            <circle cx="50" cy="50" r="45" fill="none" stroke={isDark ? "#0B0C10" : "#F2F4F7"} strokeWidth="12" />
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
                                            <span className={`absolute top-2 right-2 px-1.5 py-0.5 rounded-full text-[6px] font-black shadow-sm ${isDark ? 'bg-[#151B24]' : 'bg-white'}`} style={{ color: colab.colorClass }}>
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

                                    <div className={`${themeCardInner} rounded-3xl p-5 flex flex-col border ${themeBorder}`}>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className={`font-square font-black text-sm uppercase ${themeText}`}>Checklist Finalizados</h4>
                                                <p className={`text-[9px] font-bold mt-1 ${isDark ? "text-gray-400" : "text-[#8A909A]"}`}>Conferência de Qualidade</p>
                                            </div>
                                            <button className={`w-6 h-6 rounded-full ${isDark ? "bg-[#2D3748] text-gray-400" : "bg-white text-[#8A909A]"} flex items-center justify-center shadow-sm`}>
                                                <span className="material-symbols-outlined text-[10px]">north_east</span>
                                            </button>
                                        </div>

                                        <div className="flex items-center gap-2 mt-4">
                                            <div className={`flex-1 h-6 ${isDark ? "bg-[#0B0C10]" : "bg-white"} rounded-full flex overflow-hidden border ${themeBorder} p-0.5`}>
                                                <div
                                                    className="h-full rounded-full transition-all duration-1000"
                                                    style={{ width: `${colab.totalChecklists > 0 ? (colab.completedChecklists / colab.totalChecklists) * 100 : 0}%`, backgroundColor: colab.colorClass }}
                                                ></div>
                                            </div>
                                            <span className={`font-mono font-black text-lg ${themeText}`}>{colab.completedChecklists}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between mb-6">
                                <h4 className={`font-square font-black text-sm uppercase text-xs tracking-widest ${themeText}`}>
                                    Status por Colaborador
                                </h4>
                                <div className={`flex items-center gap-4 text-[9px] font-bold ${themeText}`}>
                                    <span className="flex items-center gap-1">
                                        <div className="w-2 h-2 rounded flex items-center justify-center" style={{ backgroundColor: colab.colorClass }}><div className="w-1 h-1 bg-white rounded-full opacity-50"></div></div> Líder
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <div className={`w-2 h-2 rounded ${isDark ? "bg-white" : "bg-[#1B1D21]"}`}></div> Normal
                                    </span>
                                </div>
                            </div>

                            <div className={`flex flex-col flex-1 relative ${themeCardInner} rounded-3xl pt-8 pb-4 px-4 border ${themeBorder} min-h-[200px]`}>
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
                                                stroke={themeSVGLine}
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
                                                stroke={themeSVGCurve}
                                                strokeWidth="1.5"
                                                opacity="0.3"
                                            />
                                        </svg>

                                        {colab.chartData.map(member => {
                                            const totalHeightPercent = (member.total / colab.maxScopeTasks) * 100 || 8;

                                            let pillClass = isDark ? "bg-[#374151]" : "bg-[#DDE2E8]";
                                            let pillStyle: React.CSSProperties = {};
                                            let textClass = isDark ? "text-white" : "text-[#1B1D21]";
                                            if (member.isLeader) {
                                                pillClass = "";
                                                pillStyle = { backgroundColor: colab.colorClass };
                                                textClass = "text-white";
                                            } else if (member.total < (colab.maxScopeTasks * 0.4)) {
                                                pillClass = isDark ? "bg-[#374151]" : "bg-[#DDE2E8]";
                                                textClass = isDark ? "text-white" : "text-[#1B1D21]";
                                            } else if (member.total < (colab.maxScopeTasks * 0.7)) {
                                                pillClass = isDark ? "bg-[#4B5563]" : "bg-[#8A909A]";
                                                textClass = "text-white";
                                            }

                                            return (
                                                <div key={member.name} className="flex flex-col items-center w-12 group/bar relative h-full justify-end z-10">
                                                    <div className={`absolute -top-14 ${isDark ? "bg-gray-100 text-black" : "bg-[#1B1D21] text-white"} px-3 py-1.5 flex flex-col items-center justify-center rounded-xl shadow-lg text-[10px] font-bold opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap pointer-events-none mb-2 z-[90]`}>
                                                        {member.total} Total
                                                        <span className={`text-[8px] font-normal ${isDark ? "text-black/50" : "text-white/50"}`}>{member.completed} concluídas</span>
                                                        <span className={`text-[8px] mt-0.5 pt-0.5 border-t ${isDark ? "border-black/10 text-[#FF9F40]" : "border-white/10 text-[#FF9F40]"} font-black`}>⏱ {member.timeSpentStr}</span>
                                                        <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 border-[4px] border-transparent ${isDark ? "border-t-[#F3F4F6]" : "border-t-[#1B1D21]"}`}></div>
                                                    </div>

                                                    <div
                                                        className={`w-full rounded-full flex flex-col items-center shadow-sm transition-all duration-700 ease-out relative overflow-hidden ${pillClass}`}
                                                        style={{ height: `${totalHeightPercent}%`, minHeight: '32px', ...pillStyle }}
                                                    >
                                                        {totalHeightPercent > 20 && (
                                                            <div className={`mt-3 text-[9px] font-square font-black ${textClass} opacity-80`}>
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

                                                    <span className={`mt-4 text-[9px] font-black uppercase text-center max-w-[60px] leading-tight ${themeText} truncate`} title={member.name}>
                                                        {member.name.split(' ').map((n, i, arr) => i === 0 || i === arr.length - 1 ? n : n[0] + '.').join(' ')}
                                                    </span>

                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className={`h-40 flex items-center justify-center text-[10px] ${isDark ? "text-gray-400" : "text-[#8A909A]"} font-bold uppercase text-center px-8 border-2 border-dashed ${themeBorder} rounded-2xl mx-4`}>
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
                    <span className={`material-symbols-outlined text-6xl mb-4 ${isDark ? "text-gray-400" : "text-[#8A909A]"}`}>monitoring</span>
                    <p className={`font-square font-black uppercase tracking-widest ${isDark ? "text-gray-400" : "text-[#8A909A]"} text-sm`}>Nenhuma disciplina encontrada.</p>
                </div>
            )}
        </div>
    );
};
