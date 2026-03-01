
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
            <div className="grid grid-cols-7 border-b border-theme-divider">
                {WEEKDAYS.map(day => (
                    <div key={day} className="py-3 text-center text-[10px] font-bold text-theme-textMuted uppercase tracking-widest bg-theme-bg/50">
                        {day}
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-7 grid-rows-6 flex-1 bg-theme-bg">
                {monthDates.map((cell, idx) => {
                    const cellEvents = getEventsForDate(cell.date);
                    const cellProtocols = getProtocolsForDate(cell.date);
                    const cellNotes = getNotesForDate(cell.date);
                    const isToday = cell.date.toDateString() === new Date().toDateString();
                    return (
                        <div
                            key={idx}
                            onClick={() => onAddEvent && onAddEvent(cell.date)}
                            className={`border-r border-b border-theme-divider p-2 relative flex flex-col gap-1 min-h-[100px] hover:bg-theme-highlight/30 transition-colors group cursor-cell ${!cell.isCurrentMonth ? 'bg-theme-card/30 text-theme-textMuted/40' : 'text-theme-text'}`}
                        >
                            <div className="flex justify-between items-start pointer-events-none">
                                <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-theme-orange text-white shadow-glow' : ''}`}>{cell.date.getDate()}</span>
                                {cellEvents.length > 0 && <span className="text-[8px] font-bold text-theme-textMuted">{cellEvents.length}</span>}
                            </div>
                            <div className="flex-1 flex flex-col gap-1 mt-1 overflow-y-auto scroller overflow-x-hidden">
                                {/* Protocol date notes */}
                                {cellProtocols.map((s, i) => (
                                    <div
                                        key={`proto-${i}`}
                                        onClick={(e) => e.stopPropagation()}
                                        className="px-2 py-1.5 rounded-md text-[9px] font-bold truncate border-l-2 border-purple-500 bg-purple-500/20 text-purple-300 shadow-sm pointer-events-none"
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
                                        className="px-2 py-1.5 rounded-md text-[9px] font-bold truncate border-l-2 shadow-sm pointer-events-none text-black/80"
                                        style={{ backgroundColor: n.color, borderLeftColor: '#ff9f43' }}
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
                                        className={`px-2 py-1.5 rounded-md text-[9px] font-bold truncate border-l-2 shadow-sm relative group/event cursor-pointer hover:scale-[1.02] transition-transform hover:z-10 ${ev.type === 'protocol' ? 'border-purple-500 bg-purple-500/20 text-purple-300' : ''}`}
                                        style={ev.type !== 'protocol' ? { backgroundColor: ev.scopeColor + '20', borderLeftColor: ev.scopeColor, color: ev.scopeColor } : {}}
                                        title={`${ev.scopeName}: ${ev.title} ${ev.type === 'protocol' ? '(PROTOCOLO)' : ''}`}
                                    >
                                        {ev.type === 'protocol' && <span className="material-symbols-outlined text-[8px] mr-1 align-middle">gavel</span>}
                                        {ev.title}
                                    </div>
                                ))}
                                {cellEvents.length > 3 && <div className="text-[8px] font-bold text-theme-textMuted text-center hover:text-theme-orange cursor-pointer">+ {cellEvents.length - 3} mais</div>}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );

    const renderWeekView = () => (
        <div className="flex-1 flex flex-col overflow-hidden">
            <div className="grid grid-cols-8 border-b border-theme-divider bg-theme-card">
                <div className="border-r border-theme-divider p-2"></div>
                {weekDates.map((d, i) => (
                    <div key={i} className={`p-2 text-center border-r border-theme-divider ${d.toDateString() === new Date().toDateString() ? 'bg-theme-highlight' : ''}`}>
                        <div className="text-[9px] font-bold text-theme-textMuted uppercase">{WEEKDAYS[d.getDay()]}</div>
                        <div className={`text-lg font-black ${d.toDateString() === new Date().toDateString() ? 'text-theme-orange' : 'text-theme-text'}`}>{d.getDate()}</div>
                    </div>
                ))}
            </div>
            <div className="flex-1 overflow-y-auto scroller">
                <div className="grid grid-cols-8 relative start-scrolling">
                    {/* Time Column */}
                    <div className="col-span-1 border-r border-theme-divider bg-theme-bg/50">
                        {Array.from({ length: 24 }).map((_, h) => (
                            <div key={h} className="h-20 border-b border-theme-divider text-[9px] text-theme-textMuted font-mono flex items-start justify-center pt-1">
                                {String(h).padStart(2, '0')}:00
                            </div>
                        ))}
                    </div>
                    {/* Days Columns */}
                    {weekDates.map((d, colIndex) => {
                        const dayProtocols = getProtocolsForDate(d);
                        const dayNotes = getNotesForDate(d);
                        return (
                            <div key={colIndex} className="col-span-1 border-r border-theme-divider bg-theme-bg relative group">
                                {/* Protocol notes banner at top of day column */}
                                {dayProtocols.map((s, i) => (
                                    <div key={`wp-${i}`} className="mx-1 mt-1 px-2 py-1 rounded-md text-[8px] font-bold border-l-2 border-purple-500 bg-purple-500/20 text-purple-300 truncate" title={`Protocolo: ${s.name}`}>
                                        <span className="material-symbols-outlined text-[8px] mr-0.5 align-middle">gavel</span>{s.name}
                                    </div>
                                ))}
                                {dayNotes.map((n, i) => (
                                    <div key={`wn-${i}`} className="mx-1 mt-1 px-2 py-1 rounded-md text-[8px] font-bold border-l-2 text-black/80 truncate shadow-sm" style={{ backgroundColor: n.color, borderLeftColor: '#ff9f43' }} title={`De: ${n.author}`}>
                                        <span className="material-symbols-outlined text-[8px] mr-0.5 align-middle">sticky_note_2</span>{n.text}
                                    </div>
                                ))}
                                {/* Background Grid Lines matched to hours */}
                                {Array.from({ length: 24 }).map((_, h) => (
                                    <div
                                        key={h}
                                        className="h-20 border-b border-theme-divider hover:bg-theme-highlight/50 transition-colors cursor-cell"
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
                                                className={`mx-1 mt-1 p-1.5 rounded-md text-[8px] font-bold border-l-2 shadow-sm cursor-pointer hover:min-h-fit hover:absolute hover:z-20 hover:w-[150%] ${ev.type === 'protocol' ? 'border-purple-500 bg-purple-500/20 text-purple-300' : ''}`}
                                                style={ev.type !== 'protocol' ? { backgroundColor: ev.scopeColor + '20', borderLeftColor: ev.scopeColor, color: ev.scopeColor } : {}}
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
        <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-theme-divider bg-theme-card flex flex-col items-center gap-2">
                <div className="text-[10px] font-bold text-theme-textMuted uppercase">{WEEKDAYS[currentDate.getDay()]}</div>
                <div className="text-4xl font-black text-theme-orange">{currentDate.getDate()}</div>
                {/* Protocol notes for this day */}
                {getProtocolsForDate(currentDate).map((s, i) => (
                    <div key={i} className="flex items-center gap-1 px-3 py-1 rounded-full border border-purple-500 bg-purple-500/10 text-purple-300 text-[9px] font-bold">
                        <span className="material-symbols-outlined text-[10px]">gavel</span>
                        Protocolo: {s.name}
                    </div>
                ))}
                {getNotesForDate(currentDate).map((n, i) => (
                    <div key={`dn-${i}`} className="flex items-center gap-1 px-3 py-1 rounded-full border text-black/80 text-[9px] font-bold shadow-sm" style={{ backgroundColor: n.color, borderColor: '#ff9f43' }}>
                        <span className="material-symbols-outlined text-[10px]">sticky_note_2</span>
                        Nota para {n.recipient}: {n.text.substring(0, 20)}...
                    </div>
                ))}
            </div>
            <div className="flex-1 overflow-y-auto scroller">
                <div className="relative">
                    {Array.from({ length: 24 }).map((_, h) => (
                        <div key={h} className="flex min-h-[80px] border-b border-theme-divider group">
                            <div className="w-20 shrink-0 border-r border-theme-divider bg-theme-bg/50 text-[10px] text-theme-textMuted font-mono flex items-start justify-center pt-2">
                                {String(h).padStart(2, '0')}:00
                            </div>
                            <div
                                className="flex-1 bg-theme-bg hover:bg-theme-highlight/50 transition-colors cursor-cell p-2 relative"
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
                                        className={`mb-1 p-2 rounded-lg text-xs font-bold border-l-4 shadow-sm cursor-pointer hover:scale-[1.01] transition-transform ${ev.type === 'protocol' ? 'border-purple-500 bg-purple-500/20 text-purple-300' : ''}`}
                                        style={ev.type !== 'protocol' ? { backgroundColor: ev.scopeColor + '20', borderLeftColor: ev.scopeColor, color: ev.scopeColor } : {}}
                                    >
                                        <span className="block opacity-70 text-[9px] mb-0.5">{ev.scopeName}</span>
                                        {ev.type === 'protocol' && <span className="material-symbols-outlined text-[10px] mr-1 align-middle">gavel</span>}
                                        {ev.title}
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
        <div className="flex flex-col h-[800px] bg-theme-bg rounded-[30px] shadow-neuro overflow-hidden border border-theme-divider">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-theme-divider bg-theme-card">
                {/* Left: title + navigation */}
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-0.5 h-5 rounded-full bg-theme-orange"></div>
                        <span className="material-symbols-outlined text-base text-theme-orange">calendar_month</span>
                        <h2 className="font-square font-black text-xs uppercase tracking-widest text-theme-text">
                            {MONTHS[currentDate.getMonth()]} <span className="text-theme-textMuted font-medium">{currentDate.getFullYear()}</span>
                        </h2>
                    </div>
                    <div className="flex items-center gap-1 bg-theme-bg rounded-full p-1 border border-theme-divider shadow-inner">
                        <button onClick={prev} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-theme-highlight text-theme-text transition-colors"><span className="material-symbols-outlined text-sm">chevron_left</span></button>
                        <button onClick={today} className="px-3 py-1 text-[10px] font-black uppercase text-theme-textMuted hover:text-theme-text transition-colors">Hoje</button>
                        <button onClick={next} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-theme-highlight text-theme-text transition-colors"><span className="material-symbols-outlined text-sm">chevron_right</span></button>
                    </div>
                </div>

                {/* Right: sync + view switcher + add */}
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-theme-divider bg-theme-bg hover:bg-white hover:text-black transition-all group" title="Sincronizar com Google Agenda (Em Breve)">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg" className="w-4 h-4 grayscale group-hover:grayscale-0 transition-all" />
                        <span className="text-[9px] font-bold uppercase text-theme-textMuted group-hover:text-black">Sincronizar</span>
                    </button>
                    <div className="flex bg-theme-bg rounded-lg p-1 border border-theme-divider">
                        <button onClick={() => setSelectedView('month')} className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase transition-all ${selectedView === 'month' ? 'bg-[#E8E9F0] text-black shadow-sm' : 'text-theme-textMuted hover:text-theme-text'}`}>Mês</button>
                        <button onClick={() => setSelectedView('week')} className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase transition-all ${selectedView === 'week' ? 'bg-[#E8E9F0] text-black shadow-sm' : 'text-theme-textMuted hover:text-theme-text'}`}>Semana</button>
                        <button onClick={() => setSelectedView('day')} className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase transition-all ${selectedView === 'day' ? 'bg-[#E8E9F0] text-black shadow-sm' : 'text-theme-textMuted hover:text-theme-text'}`}>Dia</button>
                    </div>
                    <button onClick={() => onAddEvent && onAddEvent(new Date())} className="bg-theme-orange text-white w-8 h-8 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
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

