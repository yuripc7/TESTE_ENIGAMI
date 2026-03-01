import React, { useMemo, useEffect, useState, useRef } from 'react';
import { Project, Event } from '../types';
import { parseLocalDate } from '../utils/dateUtils';

interface TimelineProps {
    project: Project | null;
    isExecuted: boolean;
    zoomLevel: number;
    setZoomLevel: (z: number) => void;
    onBarClick: (scopeId: string, eventId: string) => void;
    onBarContextMenu: (scopeId: string, eventId: string) => void;
    onAddDependency?: (sourceId: string, targetId: string, type: 'FS' | 'SS' | 'FF' | 'SF') => void;
    onDeleteEvent?: (scopeId: string, eventId: string) => void;
}

const Timeline: React.FC<TimelineProps> = ({ project, isExecuted, zoomLevel, setZoomLevel, onBarClick, onBarContextMenu, onAddDependency, onDeleteEvent }) => {
    const [eventCoords, setEventCoords] = useState<Record<string, { x: number; y: number; w: number; h: number }>>({});
    const [scopeCoords, setScopeCoords] = useState<Record<string, { x: number; y: number }>>({});
    const [activeStartScope, setActiveStartScope] = useState<string | null>(null);

    // Drag and Drop Dependency State
    const [dragState, setDragState] = useState<{ sourceId: string; sourceSide: 'start' | 'end'; startX: number; startY: number; currentX: number; currentY: number } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const totalWidth = useMemo(() => {
        return 3000 * zoomLevel;
    }, [zoomLevel]);

    const handleWheel = (e: React.WheelEvent) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const delta = -e.deltaY * 0.001;
            const newZoom = Math.min(Math.max(zoomLevel + delta, 0.2), 4);
            setZoomLevel(newZoom);
        }
    };

    const getPositionPercent = (dateStr: string, isEnd: boolean = false) => {
        if (!dateStr) return 0;
        const parts = dateStr.split('T')[0].split('-');
        if (parts.length < 3) return 0;
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        const day = parseInt(parts[2], 10);
        if (isNaN(year) || isNaN(month) || isNaN(day)) return 0;

        const mIdx = month - 1;
        const daysInMonth = new Date(year, month, 0).getDate();
        const monthWidth = 100 / 12;

        const fraction = (day - 1 + (isEnd ? 1 : 0)) / daysInMonth;
        return (mIdx * monthWidth) + (fraction * monthWidth);
    };

    const todayPos = useMemo(() => {
        const today = new Date();
        if (today.getFullYear() !== 2026) return -1;
        const localDateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        return getPositionPercent(localDateStr);
    }, []);

    const projectStartPos = useMemo(() => {
        if (!project || !project.scopes.length) return -1;
        const allStarts = project.scopes
            .map(s => (!isExecuted && s.plannedStartDate ? s.plannedStartDate : s.startDate))
            .filter(Boolean)
            .map(d => getPositionPercent(d));
        if (!allStarts.length) return -1;
        return Math.min(...allStarts);
    }, [project, isExecuted]);

    const scopeStartTags = useMemo(() => {
        if (!project) return [];
        return project.scopes.map(s => {
            const effectiveDate = !isExecuted && s.plannedStartDate ? s.plannedStartDate : s.startDate;
            const pos = getPositionPercent(effectiveDate);
            return {
                id: s.id,
                name: s.name,
                color: s.colorClass,
                pos,
                date: effectiveDate,
                protocolDate: s.protocolDate || ''
            };
        });
    }, [project, isExecuted]);

    // Group tags that are within 1.5% of each other (same or nearby date)
    const groupedScopeTags = useMemo(() => {
        const THRESHOLD = 1.5;
        const groups: (typeof scopeStartTags[0])[][] = [];
        scopeStartTags.forEach(tag => {
            const existing = groups.find(g => Math.abs(g[0].pos - tag.pos) <= THRESHOLD);
            if (existing) existing.push(tag);
            else groups.push([tag]);
        });
        return groups;
    }, [scopeStartTags]);

    const getScopeLayout = (events: Event[]) => {
        if (!events || events.length === 0) return { layout: {}, maxRows: 1 };

        const sortedEvents = [...events].sort((a, b) => {
            const startA = parseLocalDate(!isExecuted && a.plannedStartDate ? a.plannedStartDate : a.startDate).getTime();
            const startB = parseLocalDate(!isExecuted && b.plannedStartDate ? b.plannedStartDate : b.startDate).getTime();
            return (isNaN(startA) ? 0 : startA) - (isNaN(startB) ? 0 : startB);
        });

        const rows: number[] = [];
        const layout: Record<string, number> = {};

        sortedEvents.forEach(ev => {
            const startStr = !isExecuted && ev.plannedStartDate ? ev.plannedStartDate : ev.startDate;
            const endStr = !isExecuted && ev.plannedEndDate ? ev.plannedEndDate : ev.endDate;

            let startVal = getPositionPercent(startStr);
            let endVal = getPositionPercent(endStr, true);

            // Safety check for NaN
            if (isNaN(startVal)) startVal = 0;
            if (isNaN(endVal)) endVal = startVal + 1;

            if (isExecuted && ev.plannedEndDate && ev.endDate) {
                const plannedEnd = getPositionPercent(ev.plannedEndDate, true);
                const actualEnd = getPositionPercent(ev.endDate, true);
                if (!isNaN(plannedEnd) && !isNaN(actualEnd)) {
                    endVal = Math.max(plannedEnd, actualEnd);
                }
            }

            endVal += 1; // Padding

            let rowIndex = -1;
            for (let i = 0; i < rows.length; i++) {
                if (rows[i] <= startVal) {
                    rowIndex = i;
                    rows[i] = endVal;
                    break;
                }
            }

            if (rowIndex === -1) {
                rowIndex = rows.length;
                rows.push(endVal);
            }

            layout[ev.id] = rowIndex;
        });

        return { layout, maxRows: Math.max(rows.length, 1) };
    };

    useEffect(() => {
        if (!project) return;
        const timer = setTimeout(() => {
            const coords: Record<string, { x: number; y: number; w: number; h: number }> = {};
            const sCoords: Record<string, { x: number; y: number }> = {};
            const timelineId = isExecuted ? 'executed-timeline' : 'planned-timeline';
            const timelineElement = document.getElementById(timelineId);

            if (!timelineElement) return;

            project.scopes.forEach(s => {
                const sStart = !isExecuted && s.plannedStartDate ? s.plannedStartDate : s.startDate;
                const sPosPercent = getPositionPercent(sStart);
                const rowId = `scope-row-${s.id}-${isExecuted ? 'exe' : 'pla'}`;
                const rowEl = document.getElementById(rowId);
                if (rowEl) {
                    const rect = rowEl.getBoundingClientRect();
                    const parentRect = timelineElement.getBoundingClientRect();
                    sCoords[s.id] = {
                        x: (sPosPercent / 100) * totalWidth,
                        y: (rect.top - parentRect.top) + (rect.height / 2)
                    };
                }

                s.events.forEach(ev => {
                    const elId = `${isExecuted ? 'exe' : 'pla'}-ev-${ev.id}`;
                    const el = document.getElementById(elId);
                    if (el) {
                        const rect = el.getBoundingClientRect();
                        const parentRect = timelineElement.getBoundingClientRect();
                        coords[ev.id] = {
                            x: rect.left - parentRect.left + timelineElement.scrollLeft,
                            y: rect.top - parentRect.top,
                            w: rect.width,
                            h: rect.height
                        };
                    }
                });
            });
            setEventCoords(coords);
            setScopeCoords(sCoords);
        }, 100);
        return () => clearTimeout(timer);
    }, [project, zoomLevel, isExecuted, totalWidth]);

    // Drag handlers omitted for brevity, keeping existing logic
    const handleDragStart = (e: React.MouseEvent, eventId: string, side: 'start' | 'end') => { e.preventDefault(); e.stopPropagation(); const container = containerRef.current; if (!container) return; const rect = container.getBoundingClientRect(); const startX = e.clientX - rect.left + container.scrollLeft; const startY = e.clientY - rect.top; setDragState({ sourceId: eventId, sourceSide: side, startX, startY, currentX: startX, currentY: startY }); };
    const handleDragMove = (e: MouseEvent) => { if (!dragState || !containerRef.current) return; const rect = containerRef.current.getBoundingClientRect(); setDragState(prev => prev ? ({ ...prev, currentX: e.clientX - rect.left + containerRef.current!.scrollLeft, currentY: e.clientY - rect.top }) : null); };
    const handleDragEnd = () => { setDragState(null); };
    const handleNodeMouseUp = (e: React.MouseEvent, targetId: string, targetSide: 'start' | 'end') => { e.stopPropagation(); if (!dragState || !onAddDependency) return; if (dragState.sourceId === targetId) return; let type: 'FS' | 'SS' | 'FF' | 'SF' = 'FS'; if (dragState.sourceSide === 'end' && targetSide === 'start') type = 'FS'; else if (dragState.sourceSide === 'start' && targetSide === 'start') type = 'SS'; else if (dragState.sourceSide === 'end' && targetSide === 'end') type = 'FF'; else if (dragState.sourceSide === 'start' && targetSide === 'end') type = 'SF'; onAddDependency(dragState.sourceId, targetId, type); setDragState(null); };

    useEffect(() => { if (dragState) { window.addEventListener('mousemove', handleDragMove); window.addEventListener('mouseup', handleDragEnd); } else { window.removeEventListener('mousemove', handleDragMove); window.removeEventListener('mouseup', handleDragEnd); } return () => { window.removeEventListener('mousemove', handleDragMove); window.removeEventListener('mouseup', handleDragEnd); }; }, [dragState]);

    if (!project) return (<div className="w-full h-[600px] flex items-center justify-center"><p className="text-zinc-500 font-bold uppercase text-xs tracking-[0.2em] animate-pulse">Aguardando Seleção...</p></div>);

    const months = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
    const ROW_HEIGHT = 70;

    return (
        <div id={isExecuted ? 'executed-timeline' : 'planned-timeline'} className="overflow-x-auto scroller relative bg-transparent min-h-[700px]" onWheel={handleWheel} ref={containerRef}>
            <div className="relative" style={{ width: `${totalWidth}px` }}>
                <svg style={{ position: 'absolute', width: 0, height: 0 }}><defs><marker id="arrowhead-cyan" markerWidth="6" markerHeight="4" refX="6" refY="2" orientation="auto"><polygon points="0 0, 6 2, 0 4" fill="#00D4FF" /></marker><marker id="arrowhead-orange" markerWidth="6" markerHeight="4" refX="6" refY="2" orientation="auto"><polygon points="0 0, 6 2, 0 4" fill="#E86C3F" /></marker><marker id="arrowhead-green" markerWidth="6" markerHeight="4" refX="6" refY="2" orientation="auto"><polygon points="0 0, 6 2, 0 4" fill="#10B981" /></marker><marker id="arrowhead-red" markerWidth="6" markerHeight="4" refX="6" refY="2" orientation="auto"><polygon points="0 0, 6 2, 0 4" fill="#EF4444" /></marker><filter id="glow"><feGaussianBlur stdDeviation="2.5" result="coloredBlur" /><feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs></svg>

                {/* --- TECH TAGS - SIMPLE VISIBLE START ICON (UPDATED) --- */}
                <div className="flex bg-transparent h-16 relative border-b border-theme-divider no-print pointer-events-none">
                    <div className="w-64 shrink-0 border-r border-theme-divider bg-theme-bg/20 backdrop-blur-sm" />
                    <div className="flex-1 relative pointer-events-auto">
                        {groupedScopeTags.map((group, gi) => {
                            const primary = group[0];
                            const dateObj = parseLocalDate(primary.date);
                            const day = String(dateObj.getDate()).padStart(2, '0');
                            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                            const hasMany = group.length > 1;

                            return (
                                <div
                                    key={gi}
                                    className="absolute top-4 -translate-x-1/2 flex flex-col items-center z-[60] cursor-pointer group"
                                    style={{ left: `${primary.pos}%` }}
                                    onClick={() => setActiveStartScope(activeStartScope === primary.id ? null : primary.id)}
                                >
                                    {/* Connector tick */}
                                    <div className={`h-2 w-px bg-theme-divider group-hover:h-3 transition-all duration-300 ${activeStartScope === primary.id ? 'bg-theme-orange' : ''}`} />

                                    {/* Tag pill */}
                                    <div className="relative animate-slideDown hover:scale-105 transition-transform duration-200">
                                        <div
                                            className="flex items-center justify-center px-2 py-1 rounded-sm shadow-md border border-white/20 gap-1"
                                            style={{ backgroundColor: primary.color }}
                                        >
                                            <span className="material-symbols-outlined text-[10px] text-white font-bold">flag</span>
                                            <span className="font-square font-black text-[8px] text-white uppercase tracking-widest leading-none">
                                                {group.map(t => t.name).join(' ► ')}
                                            </span>
                                            {hasMany && (
                                                <span className="ml-0.5 bg-white/30 text-white text-[7px] font-black rounded-full w-3.5 h-3.5 flex items-center justify-center">{group.length}</span>
                                            )}
                                        </div>

                                        {/* Hover dropdown — shows all disciplines in group */}
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-[80] min-w-[120px]">
                                            <div className="bg-theme-bg/95 backdrop-blur-md border border-theme-divider rounded-lg shadow-2xl p-2 flex flex-col gap-1.5">
                                                {group.map((t, ti) => {
                                                    const td = parseLocalDate(t.date);
                                                    return (
                                                        <div key={ti} className="flex items-center gap-2">
                                                            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                                                            <span className="text-[9px] font-black text-theme-text uppercase font-square">{t.name}</span>
                                                            <span className="text-[8px] text-theme-textMuted ml-auto font-mono">
                                                                {String(td.getDate()).padStart(2, '0')}/{String(td.getMonth() + 1).padStart(2, '0')}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Dropline */}
                                    <div className={`w-px bg-theme-divider mt-0.5 transition-colors ${activeStartScope === primary.id ? 'bg-theme-orange h-[800px] shadow-[0_0_10px_#FF6B00]' : 'h-2 opacity-0'}`} />
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Timeline Header */}
                <div className="sticky top-0 left-0 z-50 flex bg-theme-bg/95 backdrop-blur-md border-b border-theme-divider shadow-lg">
                    <div className="w-64 shrink-0 border-r border-theme-divider flex items-center justify-center bg-theme-card">
                        <span className="text-[9px] font-square font-bold text-theme-textMuted uppercase tracking-widest">FLUXO_26</span>
                    </div>
                    <div className="flex flex-1">
                        {months.map((m, idx) => (
                            <div key={idx} className="flex-1 flex flex-col border-r border-theme-divider last:border-r-0">
                                <div className="text-center text-[9px] py-1.5 font-bold text-theme-textMuted uppercase border-b border-theme-divider bg-theme-card/30">
                                    {m}
                                </div>
                                <div className="flex">
                                    {['S1', 'S2', 'S3', 'S4'].map((w, wi) => (
                                        <div key={wi} className="flex-1 text-center text-[7px] py-1 font-mono font-medium text-theme-textMuted/40 border-r border-theme-divider last:border-r-0 hover:bg-theme-highlight transition-colors">
                                            {w}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Main Grid Area */}
                <div className="w-full h-4 bg-theme-highlight/20 flex items-center z-40 relative px-64 border-b border-theme-divider">
                    <div className="w-full h-full flex items-center bg-[url('https://www.transparenttextures.com/patterns/diagonal-stripes.png')] opacity-5"></div>
                </div>

                {/* DRAGGING LINE (SVG OVERLAY) */}
                <svg className="absolute inset-0 pointer-events-none z-[100] overflow-visible" style={{ width: '100%', height: '100%' }}>
                    {dragState && (
                        <path d={`M ${dragState.startX} ${dragState.startY} C ${dragState.startX + 50} ${dragState.startY}, ${dragState.currentX - 50} ${dragState.currentY}, ${dragState.currentX} ${dragState.currentY}`} stroke="#FF6B00" strokeWidth="1.5" strokeDasharray="4 4" fill="none" markerEnd="url(#arrowhead-orange)" />
                    )}
                </svg>

                {/* Layers: Dependencies only — colored by source discipline */}
                <svg className="absolute inset-0 pointer-events-none z-30 overflow-visible" style={{ width: '100%', height: '100%' }}>
                    <defs>
                        {project.scopes.map(s => (
                            <marker key={s.id} id={`arrow-${s.id}`} markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
                                <polygon points="0 0, 6 2, 0 4" fill={s.colorClass} opacity="0.8" />
                            </marker>
                        ))}
                    </defs>
                    {project.scopes.map(s => s.events.map(ev => ev.dependencies?.map(dep => {
                        const from = eventCoords[dep.id];
                        const to = eventCoords[ev.id];
                        if (!from || !to) return null;
                        let startX, startY, endX, endY;
                        switch (dep.type) {
                            case 'SS': startX = from.x; startY = from.y + (from.h / 2); endX = to.x; endY = to.y + (to.h / 2); break;
                            case 'FF': startX = from.x + from.w; startY = from.y + (from.h / 2); endX = to.x + to.w; endY = to.y + (to.h / 2); break;
                            case 'SF': startX = from.x; startY = from.y + (from.h / 2); endX = to.x + to.w; endY = to.y + (to.h / 2); break;
                            case 'FS': default: startX = from.x + from.w; startY = from.y + (from.h / 2); endX = to.x; endY = to.y + (to.h / 2);
                        }
                        const deltaX = Math.abs(endX - startX);
                        const curveDepth = Math.max(deltaX * 0.4, 40);
                        const color = s.colorClass;
                        return (
                            <g key={`${ev.id}-${dep.id}`}>
                                {/* Glow — very faint */}
                                <path d={`M ${startX} ${startY} C ${startX + curveDepth} ${startY}, ${endX - curveDepth} ${endY}, ${endX} ${endY}`} stroke={color} strokeWidth="3" strokeDasharray={dep.type === 'FS' ? '0' : '4 4'} fill="none" opacity="0.05" />
                                {/* Main line in scope color */}
                                <path d={`M ${startX} ${startY} C ${startX + curveDepth} ${startY}, ${endX - curveDepth} ${endY}, ${endX} ${endY}`} stroke={color} strokeWidth="0.8" strokeDasharray={dep.type === 'FS' ? '0' : '4 4'} fill="none" opacity="0.35" markerEnd={`url(#arrow-${s.id})`} />
                            </g>
                        );
                    })))}

                </svg>

                {/* Rows & Bars */}
                <div className="relative pt-6">
                    <div className="absolute inset-0 pointer-events-none flex">
                        <div className="w-64 shrink-0 border-r border-theme-divider bg-theme-highlight" />
                        <div className="flex flex-1 relative">
                            {Array.from({ length: 48 }).map((_, i) => (
                                <div key={i} className={`flex-1 border-r border-theme-divider ${i % 4 === 3 ? 'opacity-100' : 'opacity-20'}`} />
                            ))}
                            {activeStartScope && (() => { const tag = scopeStartTags.find(t => t.id === activeStartScope); if (tag) { return (<><div className="absolute top-0 bottom-0 z-0 opacity-10 transition-all duration-300 pointer-events-none" style={{ left: `${tag.pos}%`, width: `${(7 / 365) * 100}%`, backgroundColor: tag.color }} /><div className="absolute top-0 bottom-0 z-10 w-[1px] shadow-[0_0_10px_rgba(255,255,255,0.8)] animate-fadeIn" style={{ left: `${tag.pos}%`, backgroundColor: tag.color }} /></>); } })()}
                        </div>
                    </div>

                    {todayPos >= 0 && (
                        <div className="absolute top-0 bottom-0 z-40 no-print" style={{ left: `calc(16rem + ${todayPos}%)` }}>
                            <div className={`w-[2px] h-full ${isExecuted ? 'bg-theme-cyan shadow-[0_0_10px_#00A3FF]' : 'bg-zinc-500 shadow-[0_0_6px_rgba(255,255,255,0.3)]'}`} />
                        </div>
                    )}

                    {/* Project progress band: from project start → today */}
                    {projectStartPos >= 0 && todayPos >= 0 && (
                        <div
                            className="absolute top-0 bottom-0 z-[5] no-print pointer-events-none flex items-center justify-center overflow-hidden"
                            style={{
                                left: `calc(16rem + ${projectStartPos}%)`,
                                width: `${todayPos - projectStartPos}%`,
                                background: isExecuted
                                    ? 'linear-gradient(90deg, rgba(0,212,255,0.04) 0%, rgba(0,212,255,0.09) 100%)'
                                    : 'linear-gradient(90deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0.055) 100%)'
                            }}
                        >
                            <span
                                className="font-square font-black text-[11px] uppercase tracking-[0.4em] select-none"
                                style={{ color: isExecuted ? 'rgba(0,212,255,0.18)' : 'rgba(255,255,255,0.1)' }}
                            >
                                PROJETO
                            </span>
                        </div>
                    )}

                    {project.scopes.map(s => {
                        const { layout, maxRows } = getScopeLayout(s.events);
                        const rowHeightPx = Math.max(90, (maxRows * ROW_HEIGHT) + 30);

                        return (
                            <div key={s.id} id={`scope-row-${s.id}-${isExecuted ? 'exe' : 'pla'}`} className="flex w-full relative group items-center border-b border-theme-divider hover:bg-theme-highlight transition-colors" style={{ height: `${rowHeightPx}px` }}>
                                <div className="w-64 shrink-0 z-50 flex justify-end pr-6 sticky left-0 backdrop-blur-md h-full py-5 border-r border-theme-divider">
                                    <div className="flex flex-col items-end mt-2">
                                        <div className="px-3 py-1 rounded-none border-l-2 bg-theme-card border-theme-divider shadow-md transition-all group-hover:border-theme-orange group-hover:translate-x-1 flex items-center gap-2" style={{ borderLeftColor: s.colorClass }}>
                                            <span className="font-black text-[9px] text-theme-text uppercase tracking-widest font-square">{s.name}</span>
                                            <span className="text-[7px] font-black px-1.5 py-0.5 rounded-full bg-theme-bg border border-theme-divider text-theme-textMuted shadow-inner">{s.events.length}</span>
                                        </div>
                                        <span className="text-[7px] font-bold text-theme-textMuted mt-1 uppercase tracking-wider font-mono">{s.resp}</span>
                                    </div>
                                </div>
                                <div className="flex-1 relative h-full">
                                    {s.events.map(ev => {
                                        const effectiveStartDate = (!isExecuted && ev.plannedStartDate) ? ev.plannedStartDate : ev.startDate;
                                        const effectiveEndDate = (!isExecuted && ev.plannedEndDate) ? ev.plannedEndDate : ev.endDate;
                                        const l = getPositionPercent(effectiveStartDate);
                                        const w = getPositionPercent(effectiveEndDate, true) - l;
                                        const rowIndex = layout[ev.id] || 0;
                                        const topPos = (rowIndex * ROW_HEIGHT) + (rowHeightPx / 2) - 18;
                                        let extensionWidth = 0;
                                        let hasExtension = false;
                                        let daysLate = 0;
                                        let mainBarWidth = w;
                                        if (isExecuted && ev.plannedEndDate && ev.endDate) {
                                            const plannedEnd = parseLocalDate(ev.plannedEndDate);
                                            const actualEnd = parseLocalDate(ev.endDate);
                                            if (actualEnd > plannedEnd) {
                                                hasExtension = true;
                                                const diffTime = Math.abs(actualEnd.getTime() - plannedEnd.getTime());
                                                daysLate = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                                const l_plannedEnd = getPositionPercent(ev.plannedEndDate, true);
                                                const l_actualEnd = getPositionPercent(ev.endDate, true);
                                                mainBarWidth = l_plannedEnd - l;
                                                extensionWidth = l_actualEnd - l_plannedEnd;
                                            }
                                        }
                                        let borderColor = s.colorClass;
                                        let bgColor = s.colorClass + '15';
                                        if (isExecuted) {
                                            if (ev.completed) { borderColor = '#00FF94'; bgColor = '#00FF9420'; }
                                        } else { borderColor = '#6C7A89'; bgColor = '#1A1C20'; }

                                        return (
                                            <div key={ev.id} id={`${isExecuted ? 'exe' : 'pla'}-ev-${ev.id}`} className={`absolute h-9 flex flex-col items-center justify-center z-40 group/bar transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl ${!isExecuted ? 'pointer-events-none opacity-50 grayscale' : ''}`} style={{ left: `${l}%`, width: `${Math.max(mainBarWidth + extensionWidth, 0.5)}%`, top: `${topPos}px` }} onClick={() => { if (isExecuted && !dragState) onBarClick(s.id, ev.id); }} onContextMenu={(e) => { e.preventDefault(); if (isExecuted) onBarContextMenu(s.id, ev.id); }}>
                                                {isExecuted && (<><div className="absolute -left-3 w-2 h-2 bg-white rotate-45 border border-theme-card opacity-0 group-hover/bar:opacity-100 hover:scale-150 transition-all cursor-crosshair z-[60]" style={{ borderColor: s.colorClass }} onMouseDown={(e) => handleDragStart(e, ev.id, 'start')} onMouseUp={(e) => handleNodeMouseUp(e, ev.id, 'start')} /><div className="absolute -right-3 w-2 h-2 bg-white rotate-45 border border-theme-card opacity-0 group-hover/bar:opacity-100 hover:scale-150 transition-all cursor-crosshair z-[60]" style={{ borderColor: s.colorClass }} onMouseDown={(e) => handleDragStart(e, ev.id, 'end')} onMouseUp={(e) => handleNodeMouseUp(e, ev.id, 'end')} />
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); if (onDeleteEvent && confirm("Excluir esta ação?")) onDeleteEvent(s.id, ev.id); }}
                                                        className="absolute -top-3 -right-3 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover/bar:opacity-100 transition-all hover:scale-110 shadow-lg z-[70] text-white"
                                                        title="Excluir Ação"
                                                    >
                                                        <span className="material-symbols-outlined text-xs">delete</span>
                                                    </button>
                                                </>)}
                                                {/* Date label */}
                                                <div className="absolute -top-4 left-0 flex items-center gap-1 bg-theme-bg/90 backdrop-blur-sm border border-theme-divider px-1.5 py-0.5 rounded-sm border-l-2 whitespace-nowrap" style={{ borderLeftColor: s.colorClass }}>
                                                    <span className="text-[6px] font-black text-theme-textMuted uppercase tracking-wider font-square">
                                                        {(() => { const sd = parseLocalDate(effectiveStartDate); return `${String(sd.getDate()).padStart(2, '0')}/${String(sd.getMonth() + 1).padStart(2, '0')}`; })()}
                                                        <span className="text-theme-textMuted/50 mx-0.5">→</span>
                                                        {(() => { const ed = parseLocalDate(effectiveEndDate); return `${String(ed.getDate()).padStart(2, '0')}/${String(ed.getMonth() + 1).padStart(2, '0')}`; })()}
                                                        {hasExtension && <span className="text-red-500 ml-1">+{daysLate}d</span>}
                                                    </span>
                                                </div>
                                                <div className={`w-full h-full relative flex ${isExecuted ? 'cursor-grab active:cursor-grabbing' : ''}`}>
                                                    <div className={`h-full border-2 rounded-lg flex items-center justify-center px-2 shadow-lg overflow-hidden relative backdrop-blur-sm ${hasExtension ? 'border-r-0 rounded-r-none' : ''}`} style={{ borderColor: borderColor, backgroundColor: bgColor, width: hasExtension ? `${(mainBarWidth / (mainBarWidth + extensionWidth)) * 100}%` : '100%' }}>
                                                        <div className="flex flex-col items-center justify-center truncate z-10 relative drop-shadow-md select-none w-full">
                                                            <span className="text-[8px] font-black uppercase text-white truncate text-center tracking-tight font-square w-full">{ev.title}</span>
                                                            {ev.resp && <span className="text-[6px] font-bold text-white/70 uppercase tracking-widest mt-0.5 truncate w-full text-center">{ev.resp}</span>}
                                                        </div>
                                                    </div>
                                                    {hasExtension && (
                                                        <div className="h-full border-2 border-red-500 bg-red-500/80 rounded-lg rounded-l-none flex items-center justify-center shadow-lg relative" style={{ width: `${(extensionWidth / (mainBarWidth + extensionWidth)) * 100}%`, borderLeft: 'none' }}>
                                                            <span className="text-[7px] font-bold text-white uppercase drop-shadow-md whitespace-nowrap overflow-hidden">+{daysLate}d</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default Timeline;