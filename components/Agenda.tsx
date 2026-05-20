
import React, { useState, useMemo } from 'react';
import { Project, Event } from '../types';
import { parseLocalDate } from '../utils/dateUtils';

interface AgendaProps {
    project: Project | null;
    onAddEvent?: (date: Date) => void;
    onEditEvent?: (scopeId: string, eventId: string) => void;
}

const WEEKDAYS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
const MONTHS = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];

export const Agenda: React.FC<AgendaProps> = ({ project, onAddEvent, onEditEvent }) => {
    const [currentDate, setCurrentDate] = useState(new Date(2026, 0, 1));
    const [selectedView, setSelectedView] = useState<'month' | 'week' | 'day'>('month');

    // --- Helpers ---
    const getEventsForDate = (date: Date) => {
        if (!project) return [];
        return project.scopes.flatMap(s =>
            s.events.filter(e => {
                const start = parseLocalDate(e.startDate);
                const end = parseLocalDate(e.endDate);
                const check = new Date(date).setHours(0, 0, 0, 0);
                const sTime = start.setHours(0, 0, 0, 0);
                const eTime = end.setHours(23, 59, 59, 999);
                return check >= sTime && check <= eTime;
            }).map(e => ({ ...e, scopeColor: s.colorClass, scopeName: s.name, scopeId: s.id }))
        );
    };

    // Returns scopes whose protocolDate matches this calendar day
    const getProtocolsForDate = (date: Date) => {
        if (!project) return [];
        const check = new Date(date).setHours(0, 0, 0, 0);
        return project.scopes.filter(s => {
            if (!s.protocolDate) return false;
            const pd = parseLocalDate(s.protocolDate).setHours(0, 0, 0, 0);
            return pd === check;
        });
    };

    const getNotesForDate = (date: Date) => {
        if (!project || !project.notes) return [];
        const check = new Date(date).setHours(0, 0, 0, 0);
        return project.notes.filter(n => {
            if (!n.deadline || n.status === 'completed') return false;
            const pd = parseLocalDate(n.deadline).setHours(0, 0, 0, 0);
            return pd === check;
        });
    };

    const getEventsForTimeSlot = (date: Date, hour: number) => {
        if (!project) return [];
        const slotStart = new Date(date);
        slotStart.setHours(hour, 0, 0, 0);
        const slotEnd = new Date(date);
        slotEnd.setHours(hour, 59, 59, 999);

        return project.scopes.flatMap(s =>
            s.events.filter(e => {
                const start = parseLocalDate(e.startDate);
                const end = parseLocalDate(e.endDate);
                return start < slotEnd && end > slotStart;
            }).map(e => ({ ...e, scopeColor: s.colorClass, scopeName: s.name, scopeId: s.id }))
        );
    };


    // --- Navigation Logic ---
    const next = () => {
        const newDate = new Date(currentDate);
        if (selectedView === 'month') newDate.setMonth(newDate.getMonth() + 1);
        else if (selectedView === 'week') newDate.setDate(newDate.getDate() + 7);
        else newDate.setDate(newDate.getDate() + 1);
        setCurrentDate(newDate);
    };

    const prev = () => {
        const newDate = new Date(currentDate);
        if (selectedView === 'month') newDate.setMonth(newDate.getMonth() - 1);
        else if (selectedView === 'week') newDate.setDate(newDate.getDate() - 7);
        else newDate.setDate(newDate.getDate() - 1);
        setCurrentDate(newDate);
    };

    const today = () => setCurrentDate(new Date());

    // --- Data Grids ---
    const monthDates = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDayOfWeek = firstDay.getDay();
        const days = [];

        for (let i = 0; i < startDayOfWeek; i++) {
            days.push({ date: new Date(year, month, 0 - (startDayOfWeek - 1 - i)), isCurrentMonth: false });
        }
        for (let i = 1; i <= lastDay.getDate(); i++) {
            days.push({ date: new Date(year, month, i), isCurrentMonth: true });
        }
        const remainingCells = 42 - days.length;
        for (let i = 1; i <= remainingCells; i++) {
            days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
        }
        return days;
    }, [currentDate]);

    const weekDates = useMemo(() => {
        const curr = new Date(currentDate);
        const first = curr.getDate() - curr.getDay();
        const days = [];
        for (let i = 0; i < 7; i++) {
            const next = new Date(curr);
            next.setDate(first + i);
            days.push(next);
        }
        return days;
    }, [currentDate]);

    // --- Renderers ---
    const renderMonthView = () => (
        <div className="flex-1 flex flex-col">
            <div className="grid grid-cols-7 border-b border-theme-divider bg-theme-bg/30">
                {WEEKDAYS.map(day => (
                    <div key={day} className="py-3 text-center text-[10px] font-black font-square text-theme-textMuted uppercase tracking-widest bg-theme-card/30">
                        {day}
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-7 grid-rows-6 flex-1 bg-theme-bg/20">
                {monthDates.map((cell, idx) => {
                    const cellEvents = getEventsForDate(cell.date);
                    const cellProtocols = getProtocolsForDate(cell.date);
                    const cellNotes = getNotesForDate(cell.date);
                    const isToday = cell.date.toDateString() === new Date().toDateString();
                    return (
                        <div
                            key={idx}
                            onClick={() => onAddEvent && onAddEvent(cell.date)}
                            className={`border-r border-b border-theme-divider p-2.5 relative flex flex-col gap-1.5 min-h-[105px] hover:bg-theme-orange/[0.02] dark:hover:bg-theme-orange/[0.03] transition-colors duration-200 group cursor-cell ${!cell.isCurrentMonth ? 'bg-theme-card/10 text-theme-textMuted/30' : 'bg-theme-card/60 text-theme-text'}`}
                        >
                            <div className="flex justify-between items-start pointer-events-none">
                                <span className={`text-[10px] font-black font-square w-6 h-6 flex items-center justify-center rounded-lg transition-all duration-200 ${isToday ? 'bg-theme-orange text-white shadow-[0_3px_10px_rgba(255,107,0,0.4)]' : 'text-theme-text group-hover:text-theme-orange'}`}>{cell.date.getDate()}</span>
                                {cellEvents.length > 0 && <span className="text-[8px] font-black font-square text-theme-textMuted bg-theme-bg px-1.5 py-0.5 rounded border border-theme-divider">{cellEvents.length}</span>}
                            </div>
                            <div className="flex-1 flex flex-col gap-1 mt-1 overflow-y-auto scroller overflow-x-hidden relative">
                                {/* Protocol date notes */}
                                {cellProtocols.map((s, i) => (
                                    <div
                                        key={`proto-${i}`}
                                        onClick={(e) => e.stopPropagation()}
                                        className="px-2 py-1 rounded-md text-[8px] font-black font-square tracking-wider uppercase truncate border-l-2 border-purple-500 bg-purple-500/10 text-purple-700 dark:text-purple-300 shadow-sm pointer-events-none"
                                        title={`Protocolo: ${s.name}`}
                                    >
                                        <span className="material-symbols-outlined text-[8px] mr-1 align-middle">gavel</span>
                                        {s.name}
                                    </div>
                                ))}
                                {cellNotes.map((n, i) => (
                                    <div
                                        key={`note-${i}`}
                                        onClick={(e) => e.stopPropagation()}
                                        className="px-2 py-1 rounded-md text-[8px] font-bold truncate border-l-2 shadow-sm pointer-events-none text-zinc-800"
                                        style={{ backgroundColor: n.color, borderLeftColor: '#FF6B00' }}
                                        title={`De: ${n.author} Para: ${n.recipient}`}
                                    >
                                        <span className="material-symbols-outlined text-[8px] mr-1 align-middle">sticky_note_2</span>
                                        {n.text}
                                    </div>
                                ))}
                                {cellEvents.slice(0, 3).map((ev, i) => (
                                    <div
                                        key={i}
                                        onClick={(e) => { e.stopPropagation(); onEditEvent && onEditEvent(ev.scopeId, ev.id); }}
                                        className={`px-2 py-1 rounded-md text-[8px] font-black font-square tracking-wider uppercase truncate border-l-2 shadow-sm relative group/event cursor-pointer hover:scale-[1.02] active:scale-98 transition-all hover:z-10 ${ev.type === 'protocol' ? 'border-purple-500 bg-purple-500/10 text-purple-700 dark:text-purple-300' : ''}`}
                                        style={ev.type !== 'protocol' ? { backgroundColor: ev.scopeColor + '10', borderLeftColor: ev.scopeColor, color: ev.scopeColor } : {}}
                                        title={`${ev.scopeName}: ${ev.title} ${ev.type === 'protocol' ? '(PROTOCOLO)' : ''}`}
                                    >
                                        {ev.type === 'protocol' && <span className="material-symbols-outlined text-[8px] mr-1 align-middle">gavel</span>}
                                        {ev.title}
                                    </div>
                                ))}
                                {cellEvents.length > 3 && <div className="text-[8px] font-black font-square tracking-wide text-theme-textMuted text-center hover:text-theme-orange cursor-pointer py-0.5 mt-0.5 border border-dashed border-theme-divider hover:border-theme-orange/40 rounded transition-all">+ {cellEvents.length - 3} mais</div>}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );

    const renderWeekView = () => (
        <div className="flex-1 flex flex-col overflow-hidden bg-theme-bg/10">
            <div className="grid grid-cols-8 border-b border-theme-divider bg-theme-card">
                <div className="border-r border-theme-divider p-2 bg-theme-card/30"></div>
                {weekDates.map((d, i) => {
                    const isToday = d.toDateString() === new Date().toDateString();
                    return (
                        <div key={i} className={`p-2.5 text-center border-r border-theme-divider transition-all duration-200 ${isToday ? 'bg-theme-orange/[0.03] border-t-2 border-t-theme-orange' : ''}`}>
                            <div className="text-[9px] font-black font-square text-theme-textMuted uppercase tracking-wider">{WEEKDAYS[d.getDay()]}</div>
                            <div className={`text-base font-black font-square tracking-wider mt-0.5 ${isToday ? 'text-theme-orange' : 'text-theme-text'}`}>{d.getDate()}</div>
                        </div>
                    );
                })}
            </div>
            <div className="flex-1 overflow-y-auto scroller">
                <div className="grid grid-cols-8 relative start-scrolling">
                    {/* Time Column */}
                    <div className="col-span-1 border-r border-theme-divider bg-theme-card/25 backdrop-blur-sm">
                        {Array.from({ length: 24 }).map((_, h) => (
                            <div key={h} className="h-20 border-b border-theme-divider text-[9px] text-theme-textMuted font-mono flex items-start justify-center pt-2">
                                {String(h).padStart(2, '0')}:00
                            </div>
                        ))}
                    </div>
                    {/* Days Columns */}
                    {weekDates.map((d, colIndex) => {
                        const dayProtocols = getProtocolsForDate(d);
                        const dayNotes = getNotesForDate(d);
                        const isToday = d.toDateString() === new Date().toDateString();
                        return (
                            <div key={colIndex} className={`col-span-1 border-r border-theme-divider relative group transition-colors duration-200 ${isToday ? 'bg-theme-orange/[0.01]' : 'bg-transparent'}`}>
                                {/* Protocol notes banner at top of day column */}
                                {dayProtocols.map((s, i) => (
                                    <div key={`wp-${i}`} className="mx-1 mt-1 px-2 py-1 rounded-md text-[8px] font-black font-square tracking-wider uppercase border-l-2 border-purple-500 bg-purple-500/10 text-purple-700 dark:text-purple-300 truncate" title={`Protocolo: ${s.name}`}>
                                        <span className="material-symbols-outlined text-[8px] mr-0.5 align-middle">gavel</span>{s.name}
                                    </div>
                                ))}
                                {dayNotes.map((n, i) => (
                                    <div key={`wn-${i}`} className="mx-1 mt-1 px-2 py-1 rounded-md text-[8px] font-bold border-l-2 text-zinc-800 truncate shadow-sm" style={{ backgroundColor: n.color, borderLeftColor: '#FF6B00' }} title={`De: ${n.author}`}>
                                        <span className="material-symbols-outlined text-[8px] mr-0.5 align-middle">sticky_note_2</span>{n.text}
                                    </div>
                                ))}
                                {/* Background Grid Lines matched to hours */}
                                {Array.from({ length: 24 }).map((_, h) => (
                                    <div
                                        key={h}
                                        className="h-20 border-b border-theme-divider hover:bg-theme-orange/[0.02] transition-colors cursor-cell"
                                        onClick={() => {
                                            const dateWithTime = new Date(d);
                                            dateWithTime.setHours(h);
                                            onAddEvent && onAddEvent(dateWithTime);
                                        }}
                                    >
                                        {/* Events for this specific slot */}
                                        {getEventsForTimeSlot(d, h).map((ev, i) => (
                                            <div
                                                key={i}
                                                onClick={(e) => { e.stopPropagation(); onEditEvent && onEditEvent(ev.scopeId, ev.id); }}
                                                className={`mx-1 mt-1 p-1.5 rounded-md text-[8px] font-black font-square tracking-wider uppercase border-l-2 shadow-sm cursor-pointer hover:min-h-fit hover:absolute hover:z-20 hover:w-[150%] transition-all hover:scale-105 active:scale-95 ${ev.type === 'protocol' ? 'border-purple-500 bg-purple-500/10 text-purple-700 dark:text-purple-300' : ''}`}
                                                style={ev.type !== 'protocol' ? { backgroundColor: ev.scopeColor + '10', borderLeftColor: ev.scopeColor, color: ev.scopeColor } : {}}
                                            >
                                                {ev.type === 'protocol' && <span className="material-symbols-outlined text-[8px] mr-1 align-middle">gavel</span>}
                                                {ev.title}
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );

    const renderDayView = () => (
        <div className="flex-1 flex flex-col overflow-hidden bg-theme-bg/10">
            <div className="p-5 border-b border-theme-divider bg-theme-card flex flex-col items-center gap-3">
                <div className="text-[10px] font-black font-square text-theme-textMuted uppercase tracking-[0.3em]">{WEEKDAYS[currentDate.getDay()]}</div>
                <div className="text-5xl font-black font-square text-theme-orange drop-shadow-[0_0_15px_rgba(255,107,0,0.15)]">{currentDate.getDate()}</div>
                
                {/* Protocols and Notes tags */}
                <div className="flex flex-wrap gap-2 justify-center mt-1">
                    {getProtocolsForDate(currentDate).map((s, i) => (
                        <div key={i} className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300 text-[9px] font-black font-square tracking-wider uppercase">
                            <span className="material-symbols-outlined text-[10px]">gavel</span>
                            Protocolo: {s.name}
                        </div>
                    ))}
                    {getNotesForDate(currentDate).map((n, i) => (
                        <div key={`dn-${i}`} className="flex items-center gap-1.5 px-3 py-1 rounded-full border text-zinc-800 text-[9px] font-bold shadow-sm" style={{ backgroundColor: n.color, borderColor: '#FF6B00' }}>
                            <span className="material-symbols-outlined text-[10px]">sticky_note_2</span>
                            Nota para {n.recipient}: {n.text.substring(0, 30)}...
                        </div>
                    ))}
                </div>
            </div>
            <div className="flex-1 overflow-y-auto scroller">
                <div className="relative">
                    {Array.from({ length: 24 }).map((_, h) => (
                        <div key={h} className="flex min-h-[85px] border-b border-theme-divider group">
                            <div className="w-20 shrink-0 border-r border-theme-divider bg-theme-card/30 text-[10px] text-theme-textMuted font-mono flex items-start justify-center pt-3">
                                {String(h).padStart(2, '0')}:00
                            </div>
                            <div
                                className="flex-1 bg-transparent hover:bg-theme-orange/[0.01] transition-colors cursor-cell p-3.5 relative"
                                onClick={() => {
                                    const dateWithTime = new Date(currentDate);
                                    dateWithTime.setHours(h);
                                    onAddEvent && onAddEvent(dateWithTime);
                                }}
                            >
                                {getEventsForTimeSlot(currentDate, h).map((ev, i) => (
                                    <div
                                        key={i}
                                        onClick={(e) => { e.stopPropagation(); onEditEvent && onEditEvent(ev.scopeId, ev.id); }}
                                        className={`mb-2 p-3 rounded-xl text-xs font-bold border-l-4 shadow-sm cursor-pointer hover:scale-[1.01] hover:shadow-md transition-all ${ev.type === 'protocol' ? 'border-purple-500 bg-purple-500/10 text-purple-700 dark:text-purple-300' : ''}`}
                                        style={ev.type !== 'protocol' ? { backgroundColor: ev.scopeColor + '10', borderLeftColor: ev.scopeColor, color: ev.scopeColor } : {}}
                                    >
                                        <span className="block opacity-75 font-square font-black text-[8px] uppercase tracking-widest mb-1">{ev.scopeName}</span>
                                        <div className="flex items-center gap-1.5 font-square font-bold text-xs uppercase tracking-wide">
                                            {ev.type === 'protocol' && <span className="material-symbols-outlined text-[12px] align-middle">gavel</span>}
                                            {ev.title}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    return (
        <div className="ds-card flex flex-col h-[800px] bg-theme-card border border-theme-divider shadow-neuro overflow-hidden relative animate-fadeIn">
            <div className="absolute inset-0 pointer-events-none z-0">
                <div className="w-full h-full opacity-[0.02] dark:opacity-[0.03]" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/diagonal-stripes.png')" }}></div>
            </div>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-theme-divider bg-theme-card/95 backdrop-blur-md relative z-10 flex-shrink-0">
                {/* Left: title + navigation */}
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-0.5 h-5 bg-theme-orange shadow-[0_0_10px_#FF6B00] rounded-full"></div>
                        <span className="material-symbols-outlined text-base text-theme-orange">calendar_month</span>
                        <h2 className="font-square font-black text-[11px] uppercase tracking-[0.4em] text-theme-text">
                            {MONTHS[currentDate.getMonth()]} <span className="text-theme-textMuted font-medium">{currentDate.getFullYear()}</span>
                        </h2>
                    </div>
                    <div className="flex items-center gap-1 bg-theme-bg rounded-full p-1 border border-theme-divider shadow-inner">
                        <button onClick={prev} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-theme-highlight text-theme-text transition-all hover:scale-105 active:scale-95"><span className="material-symbols-outlined text-sm">chevron_left</span></button>
                        <button onClick={today} className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-theme-textMuted hover:text-theme-orange transition-all hover:scale-105 active:scale-95">Hoje</button>
                        <button onClick={next} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-theme-highlight text-theme-text transition-all hover:scale-105 active:scale-95"><span className="material-symbols-outlined text-sm">chevron_right</span></button>
                    </div>
                </div>

                {/* Right: sync + view switcher + add */}
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-theme-divider bg-theme-bg hover:border-theme-orange hover:bg-theme-orange/5 transition-all duration-300 group shadow-sm" title="Sincronizar com Google Agenda (Em Breve)">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg" className="w-4 h-4 grayscale group-hover:grayscale-0 transition-all duration-300" />
                        <span className="text-[9px] font-black tracking-wider uppercase text-theme-textMuted group-hover:text-theme-orange transition-colors">Sincronizar</span>
                    </button>
                    <div className="flex bg-theme-bg rounded-xl p-1 border border-theme-divider shadow-inner">
                        <button onClick={() => setSelectedView('month')} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-200 ${selectedView === 'month' ? 'bg-theme-card text-theme-text border border-theme-divider/50 shadow-sm' : 'text-theme-textMuted hover:text-theme-text'}`}>Mês</button>
                        <button onClick={() => setSelectedView('week')} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-200 ${selectedView === 'week' ? 'bg-theme-card text-theme-text border border-theme-divider/50 shadow-sm' : 'text-theme-textMuted hover:text-theme-text'}`}>Semana</button>
                        <button onClick={() => setSelectedView('day')} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-200 ${selectedView === 'day' ? 'bg-theme-card text-theme-text border border-theme-divider/50 shadow-sm' : 'text-theme-textMuted hover:text-theme-text'}`}>Dia</button>
                    </div>
                    <button onClick={() => onAddEvent && onAddEvent(new Date())} className="bg-theme-orange text-white w-8 h-8 rounded-xl flex items-center justify-center shadow-[0_4px_12px_rgba(255,107,0,0.3)] hover:shadow-[0_4px_20px_rgba(255,107,0,0.5)] hover:scale-105 active:scale-95 transition-all duration-300">
                        <span className="material-symbols-outlined text-base">add</span>
                    </button>
                </div>
            </div>

            {selectedView === 'month' && renderMonthView()}
            {selectedView === 'week' && renderWeekView()}
            {selectedView === 'day' && renderDayView()}
        </div>
    );
};

