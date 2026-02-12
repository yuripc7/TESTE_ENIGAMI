import React, { useMemo, useEffect, useState, useRef } from 'react';
import { Project, Event } from '../types';

interface TimelineProps {
    project: Project | null;
    isExecuted: boolean;
    zoomLevel: number;
    setZoomLevel: (z: number) => void;
    onBarClick: (scopeId: string, eventId: string) => void;
    onBarContextMenu: (scopeId: string, eventId: string) => void;
    onAddDependency?: (sourceId: string, targetId: string, type: 'FS' | 'SS' | 'FF' | 'SF') => void;
}

const Timeline: React.FC<TimelineProps> = ({ project, isExecuted, zoomLevel, setZoomLevel, onBarClick, onBarContextMenu, onAddDependency }) => {
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

    const getPositionPercent = (dateStr: string) => {
        if (!dateStr) return 0;
        const d = new Date(dateStr);
        const startOfYear = new Date(2026, 0, 1);
        const dayOfYear = (d.getTime() - startOfYear.getTime()) / 86400000;
        return (dayOfYear / 365) * 100;
    };

    const todayPos = useMemo(() => {
        const today = new Date();
        if (today.getFullYear() !== 2026) return -1;
        return getPositionPercent(today.toISOString());
    }, []);

    const scopeStartTags = useMemo(() => {
        if (!project) return [];
        return project.scopes.map(s => {
            const effectiveDate = !isExecuted && s.plannedStartDate ? s.plannedStartDate : s.startDate;
            const pos = getPositionPercent(effectiveDate);
            // Include Protocol Week in the data passed to render
            return { 
                id: s.id, 
                name: s.name, 
                color: s.colorClass, 
                pos, 
                date: effectiveDate,
                protocolWeek: s.protocolWeek || 1 // Default to 1 if not set
            };
        });
    }, [project, isExecuted]);

    const getScopeLayout = (events: Event[]) => {
        const sortedEvents = [...events].sort((a, b) => {
            const startA = !isExecuted && a.plannedStartDate ? a.plannedStartDate : a.startDate;
            const startB = !isExecuted && b.plannedStartDate ? b.plannedStartDate : b.startDate;
            return new Date(startA).getTime() - new Date(startB).getTime();
        });

        const rows: number[] = []; 
        const layout: Record<string, number> = {}; 

        sortedEvents.forEach(ev => {
            const startStr = !isExecuted && ev.plannedStartDate ? ev.plannedStartDate : ev.startDate;
            const endStr = !isExecuted && ev.plannedEndDate ? ev.plannedEndDate : ev.endDate;
            
            const startVal = getPositionPercent(startStr);
            let endVal = getPositionPercent(endStr);

            if (isExecuted && ev.plannedEndDate && ev.endDate) {
                const plannedEnd = getPositionPercent(ev.plannedEndDate);
                const actualEnd = getPositionPercent(ev.endDate);
                endVal = Math.max(plannedEnd, actualEnd);
            }
            
            endVal += 1; 

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
                if(rowEl) {
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
    const ROW_HEIGHT = 50; 

    return (
        <div id={isExecuted ? 'executed-timeline' : 'planned-timeline'} className="overflow-x-auto scroller relative bg-transparent min-h-[700px]" onWheel={handleWheel} ref={containerRef}>
            <div className="relative" style={{ width: `${totalWidth}px` }}>
                <svg style={{ position: 'absolute', width: 0, height: 0 }}><defs><marker id="arrowhead-cyan" markerWidth="6" markerHeight="4" refX="6" refY="2" orientation="auto"><polygon points="0 0, 6 2, 0 4" fill="#00D4FF" /></marker><marker id="arrowhead-orange" markerWidth="6" markerHeight="4" refX="6" refY="2" orientation="auto"><polygon points="0 0, 6 2, 0 4" fill="#E86C3F" /></marker><marker id="arrowhead-green" markerWidth="6" markerHeight="4" refX="6" refY="2" orientation="auto"><polygon points="0 0, 6 2, 0 4" fill="#10B981" /></marker><marker id="arrowhead-red" markerWidth="6" markerHeight="4" refX="6" refY="2" orientation="auto"><polygon points="0 0, 6 2, 0 4" fill="#EF4444" /></marker><filter id="glow"><feGaussianBlur stdDeviation="2.5" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs></svg>

                {/* --- TECH TAGS - SIMPLE VISIBLE START ICON (UPDATED) --- */}
                <div className="flex bg-transparent h-16 relative border-b border-theme-divider no-print pointer-events-none">
                    <div className="w-64 shrink-0 border-r border-theme-divider bg-theme-bg/20 backdrop-blur-sm" />
                    <div className="flex-1 relative pointer-events-auto">
                        {scopeStartTags.map((tag, i) => {
                            const dateObj = new Date(tag.date);
                            const day = String(dateObj.getDate()).padStart(2, '0');
                            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                            
                            return (
                                <div 
                                    key={i} 
                                    className="absolute top-4 -translate-x-1/2 flex flex-col items-center z-[60] cursor-pointer group" 
                                    style={{ left: `${tag.pos}%` }} 
                                    onClick={() => setActiveStartScope(activeStartScope === tag.id ? null : tag.id)}
                                >
                                    {/* Tech Line Connector */}
                                    <div className={`h-2 w-px bg-theme-divider group-hover:h-3 transition-all duration-300 ease-out ${activeStartScope === tag.id ? 'bg-theme-orange' : ''}`}></div>
                                    
                                    {/* Main Tag Container (Simplified Flag Style) */}
                                    <div className="relative animate-slideDown hover:scale-110 transition-transform duration-300">
                                        <div 
                                            className="flex items-center justify-center px-2 py-1 rounded-sm shadow-md border border-white/20"
                                            style={{ backgroundColor: tag.color }}
                                        >
                                            <span className="material-symbols-outlined text-[10px] text-white mr-1 font-bold">flag</span>
                                            <span className="font-square font-black text-[8px] text-white uppercase tracking-widest leading-none">{tag.name}</span>
                                        </div>
                                        {/* Date Label on Hover */}
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 px-1 py-0.5 rounded text-[8px] text-white whitespace-nowrap z-50 pointer-events-none">
                                            {day}/{month} • W{String(tag.protocolWeek).padStart(2, '0')}
                                        </div>
                                    </div>

                                    {/* Dropline */}
                                    <div className={`w-px h-full bg-theme-divider mt-0.5 group-hover:bg-theme-orange/50 transition-colors ${activeStartScope === tag.id ? 'bg-theme-orange h-[800px] shadow-[0_0_10px_#FF6B00]' : 'h-2 opacity-0'}`} />
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
                                    {[1, 2, 3, 4].map(w => (
                                        <div key={w} className="flex-1 text-center text-[7px] py-1 font-mono font-medium text-theme-textMuted/40 border-r border-theme-divider last:border-r-0 hover:bg-theme-highlight transition-colors">
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
                        <path d={`M ${dragState.startX} ${dragState.startY} C ${dragState.startX + 50} ${dragState.startY}, ${dragState.currentX - 50} ${dragState.currentY}, ${dragState.currentX} ${dragState.currentY}`} stroke="#FF6B00" strokeWidth="1.5" strokeDasharray="4 4" fill="none" markerEnd="url(#arrowhead-orange)"/>
                    )}
                </svg>

                {/* Layers: Connections & Dependencies */}
                <svg className="absolute inset-0 pointer-events-none z-30 overflow-visible" style={{ width: '100%', height: '100%' }}>
                    {project.scopes.map(s => {
                        if(!s.events || s.events.length === 0) return null;
                        const firstEvent = [...s.events].sort((a,b) => {
                            const dateA = !isExecuted && a.plannedStartDate ? a.plannedStartDate : a.startDate;
                            const dateB = !isExecuted && b.plannedStartDate ? b.plannedStartDate : b.startDate;
                            return new Date(dateA).getTime() - new Date(dateB).getTime();
                        })[0];
                        const startNode = scopeCoords[s.id];
                        const endNode = eventCoords[firstEvent.id];
                        if (!startNode || !endNode) return null;
                        const dx = endNode.x - startNode.x;
                        const controlPoint1X = startNode.x + (dx * 0.6);
                        const controlPoint2X = endNode.x - (dx * 0.4);
                        return (
                            <g key={`scope-conn-${s.id}`}>
                                <path d={`M ${startNode.x} ${startNode.y} C ${controlPoint1X} ${startNode.y}, ${controlPoint2X} ${endNode.y + (endNode.h/2)}, ${endNode.x} ${endNode.y + (endNode.h/2)}`} stroke={s.colorClass} strokeWidth="1" strokeDasharray="2 2" fill="none" className="opacity-20" />
                                <circle cx={startNode.x} cy={startNode.y} r="1.5" fill={s.colorClass} className="animate-pulse" />
                            </g>
                        );
                    })}
                    {project.scopes.map(s => s.events.map(ev => ev.dependencies?.map(dep => {
                        const from = eventCoords[dep.id];
                        const to = eventCoords[ev.id];
                        if (!from || !to) return null;
                        let startX, startY, endX, endY, color, marker;
                        switch (dep.type) {
                            case 'SS': startX = from.x; startY = from.y + (from.h / 2); endX = to.x; endY = to.y + (to.h / 2); color = "#FF6B00"; marker = "arrowhead-orange"; break;
                            case 'FF': startX = from.x + from.w; startY = from.y + (from.h / 2); endX = to.x + to.w; endY = to.y + (to.h / 2); color = "#00FF94"; marker = "arrowhead-green"; break;
                            case 'SF': startX = from.x; startY = from.y + (from.h / 2); endX = to.x + to.w; endY = to.y + (to.h / 2); color = "#EF4444"; marker = "arrowhead-red"; break;
                            case 'FS': default: startX = from.x + from.w; startY = from.y + (from.h / 2); endX = to.x; endY = to.y + (to.h / 2); color = "#00A3FF"; marker = "arrowhead-cyan";
                        }
                        const deltaX = Math.abs(endX - startX);
                        const curveDepth = Math.max(deltaX * 0.5, 50); 
                        return (<g key={`${ev.id}-${dep.id}`}><path d={`M ${startX} ${startY} C ${startX + curveDepth} ${startY}, ${endX - curveDepth} ${endY}, ${endX} ${endY}`} stroke={color} strokeWidth="1" strokeDasharray={dep.type === 'FS' ? '0' : '3 3'} fill="none" className="opacity-50" markerEnd={`url(#${marker})`} /></g>);
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

                    {todayPos >= 0 && (<div className="absolute top-0 bottom-0 z-40 no-print" style={{ left: `calc(16rem + ${todayPos}%)` }}><div className={`w-[1px] h-full ${isExecuted ? 'bg-theme-cyan shadow-[0_0_10px_#00A3FF]' : 'bg-zinc-700 dashed border-l border-dashed'}`} /></div>)}

                    {project.scopes.map(s => {
                        const { layout, maxRows } = getScopeLayout(s.events);
                        const rowHeightPx = Math.max(90, (maxRows * ROW_HEIGHT) + 30); 

                        return (
                            <div key={s.id} id={`scope-row-${s.id}-${isExecuted ? 'exe' : 'pla'}`} className="flex w-full relative group items-center border-b border-theme-divider hover:bg-theme-highlight transition-colors" style={{ height: `${rowHeightPx}px` }}>
                                <div className="w-64 shrink-0 z-50 flex justify-end pr-6 sticky left-0 backdrop-blur-md h-full py-5 border-r border-theme-divider">
                                    <div className="flex flex-col items-end mt-2">
                                        <div className="px-3 py-1 rounded-none border-l-2 bg-theme-card border-theme-divider shadow-md transition-all group-hover:border-theme-orange group-hover:translate-x-1" style={{ borderLeftColor: s.colorClass }}>
                                            <span className="font-black text-[9px] text-theme-text uppercase tracking-widest font-square">{s.name}</span>
                                        </div>
                                        <span className="text-[7px] font-bold text-theme-textMuted mt-1 uppercase tracking-wider font-mono">{s.resp}</span>
                                    </div>
                                </div>
                                <div className="flex-1 relative h-full">
                                    {s.events.map(ev => {
                                        const effectiveStartDate = (!isExecuted && ev.plannedStartDate) ? ev.plannedStartDate : ev.startDate;
                                        const effectiveEndDate = (!isExecuted && ev.plannedEndDate) ? ev.plannedEndDate : ev.endDate;
                                        const l = getPositionPercent(effectiveStartDate);
                                        const w = getPositionPercent(effectiveEndDate) - l;
                                        const rowIndex = layout[ev.id] || 0;
                                        const topPos = (rowIndex * ROW_HEIGHT) + 20;
                                        let extensionWidth = 0;
                                        let hasExtension = false;
                                        let mainBarWidth = w; 
                                        if (isExecuted && ev.plannedEndDate && ev.endDate) {
                                            const plannedEnd = new Date(ev.plannedEndDate);
                                            const actualEnd = new Date(ev.endDate);
                                            if (actualEnd > plannedEnd) {
                                                hasExtension = true;
                                                const l_plannedEnd = getPositionPercent(ev.plannedEndDate);
                                                const l_actualEnd = getPositionPercent(ev.endDate);
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
                                            <div key={ev.id} id={`${isExecuted ? 'exe' : 'pla'}-ev-${ev.id}`} className={`absolute h-8 flex flex-col items-center justify-center z-40 group/bar transition-transform hover:-translate-y-1 ${!isExecuted ? 'pointer-events-none opacity-50 grayscale' : ''}`} style={{ left: `${l}%`, width: `${Math.max(mainBarWidth + extensionWidth, 4)}%`, top: `${topPos}px` }} onClick={() => { if (isExecuted && !dragState) onBarClick(s.id, ev.id); }} onContextMenu={(e) => { e.preventDefault(); if (isExecuted) onBarContextMenu(s.id, ev.id); }}>
                                                {isExecuted && (<><div className="absolute -left-3 w-2 h-2 bg-white rotate-45 border border-theme-card opacity-0 group-hover/bar:opacity-100 hover:scale-150 transition-all cursor-crosshair z-[60]" style={{ borderColor: s.colorClass }} onMouseDown={(e) => handleDragStart(e, ev.id, 'start')} onMouseUp={(e) => handleNodeMouseUp(e, ev.id, 'start')} /><div className="absolute -right-3 w-2 h-2 bg-white rotate-45 border border-theme-card opacity-0 group-hover/bar:opacity-100 hover:scale-150 transition-all cursor-crosshair z-[60]" style={{ borderColor: s.colorClass }} onMouseDown={(e) => handleDragStart(e, ev.id, 'end')} onMouseUp={(e) => handleNodeMouseUp(e, ev.id, 'end')} /></>)}
                                                <div className="absolute -top-3 left-0 bg-theme-bg/90 backdrop-blur-sm border border-theme-divider px-1 rounded-none border-l-2" style={{ borderLeftColor: s.colorClass }}>
                                                    <span className="text-[6px] font-black text-theme-text uppercase tracking-wider font-square">{ev.resp.split(' ')[0]} {hasExtension && <span className="text-red-500">(!ATRASO)</span>}</span>
                                                </div>
                                                <div className={`w-full h-full relative flex ${isExecuted ? 'cursor-grab active:cursor-grabbing' : ''}`}>
                                                    <div className={`h-full border flex items-center justify-center px-1 shadow-lg overflow-hidden relative ${hasExtension ? 'border-r-0' : ''}`} style={{ borderColor: borderColor, backgroundColor: bgColor, borderLeftWidth: '2px', width: hasExtension ? `${(mainBarWidth / (mainBarWidth + extensionWidth)) * 100}%` : '100%' }}>
                                                        <span className="text-[8px] font-black uppercase text-white truncate text-center tracking-tight z-10 relative drop-shadow-md select-none font-square">{ev.title}</span>
                                                    </div>
                                                    {hasExtension && (<div className="h-full border border-red-500 bg-red-500/80 flex items-center justify-center shadow-lg relative" style={{ width: `${(extensionWidth / (mainBarWidth + extensionWidth)) * 100}%`, borderLeft: 'none' }}><span className="material-symbols-outlined text-[8px] text-white animate-pulse">warning</span></div>)}
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