
import React, { useState, useMemo } from 'react';
import { Project, Event } from '../types';

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
                const start = new Date(e.startDate);
                const end = new Date(e.endDate);
                const check = new Date(date).setHours(0, 0, 0, 0);
                const sTime = new Date(start).setHours(0, 0, 0, 0);
                const eTime = new Date(end).setHours(23, 59, 59, 999);
                return check >= sTime && check <= eTime;
            }).map(e => ({ ...e, scopeColor: s.colorClass, scopeName: s.name, scopeId: s.id }))
        );
    };

    const getEventsForTimeSlot = (date: Date, hour: number) => {
        if (!project) return [];
        // Determine the time window for this slot
        const slotStart = new Date(date);
        slotStart.setHours(hour, 0, 0, 0);
        const slotEnd = new Date(date);
        slotEnd.setHours(hour, 59, 59, 999);

        return project.scopes.flatMap(s =>
            s.events.filter(e => {
                const start = new Date(e.startDate);
                const end = new Date(e.endDate);

                // Detailed check: Does the event overlap with this hour?
                // Overlap logic: Start < SlotEnd AND End > SlotStart
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
                                {cellEvents.slice(0, 4).map((ev, i) => (
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
                                {cellEvents.length > 4 && <div className="text-[8px] font-bold text-theme-textMuted text-center hover:text-theme-orange cursor-pointer">+ {cellEvents.length - 4} mais</div>}
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
                    {weekDates.map((d, colIndex) => (
                        <div key={colIndex} className="col-span-1 border-r border-theme-divider bg-theme-bg relative group">
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
                    ))}
                </div>
            </div>
        </div>
    );

    const renderDayView = () => (
        <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-theme-divider bg-theme-card flex flex-col items-center">
                <div className="text-[10px] font-bold text-theme-textMuted uppercase">{WEEKDAYS[currentDate.getDay()]}</div>
                <div className="text-4xl font-black text-theme-orange">{currentDate.getDate()}</div>
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
            <div className="flex items-center justify-between p-6 border-b border-theme-divider bg-theme-card">
                <div className="flex items-center gap-6">
                    <h2 className="text-3xl font-square font-black text-theme-text uppercase tracking-widest flex items-center gap-2">
                        {selectedView === 'month' && MONTHS[currentDate.getMonth()]}
                        {selectedView !== 'month' && <span className="text-xl">{MONTHS[currentDate.getMonth()]}</span>}
                        <span className="text-theme-textMuted font-light">{currentDate.getFullYear()}</span>
                    </h2>
                    <div className="flex items-center gap-2 bg-theme-bg rounded-full p-1 border border-theme-divider shadow-inner">
                        <button onClick={prev} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-theme-highlight text-theme-text transition-colors"><span className="material-symbols-outlined text-sm">chevron_left</span></button>
                        <button onClick={today} className="px-4 py-1 text-[10px] font-bold uppercase text-theme-textMuted hover:text-theme-orange transition-colors">Hoje</button>
                        <button onClick={next} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-theme-highlight text-theme-text transition-colors"><span className="material-symbols-outlined text-sm">chevron_right</span></button>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* Google Sync Placeholder */}
                    <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-theme-divider bg-theme-bg hover:bg-white hover:text-black transition-all group" title="Sincronizar com Google Agenda (Em Breve)">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg" className="w-4 h-4 grayscale group-hover:grayscale-0 transition-all" />
                        <span className="text-[9px] font-bold uppercase text-theme-textMuted group-hover:text-black">Sincronizar</span>
                    </button>

                    <div className="flex bg-theme-bg rounded-lg p-1 border border-theme-divider">
                        <button onClick={() => setSelectedView('month')} className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase transition-all ${selectedView === 'month' ? 'bg-theme-card shadow-sm text-theme-text' : 'text-theme-textMuted hover:text-theme-text'}`}>Mês</button>
                        <button onClick={() => setSelectedView('week')} className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase transition-all ${selectedView === 'week' ? 'bg-theme-card shadow-sm text-theme-text' : 'text-theme-textMuted hover:text-theme-text'}`}>Semana</button>
                        <button onClick={() => setSelectedView('day')} className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase transition-all ${selectedView === 'day' ? 'bg-theme-card shadow-sm text-theme-text' : 'text-theme-textMuted hover:text-theme-text'}`}>Dia</button>
                    </div>

                    <button onClick={() => onAddEvent && onAddEvent(new Date())} className="bg-theme-orange text-white w-8 h-8 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                        <span className="material-symbols-outlined text-lg">add</span>
                    </button>
                </div>
            </div>

            {selectedView === 'month' && renderMonthView()}
            {selectedView === 'week' && renderWeekView()}
            {selectedView === 'day' && renderDayView()}
        </div>
    );
};
