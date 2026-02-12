import React, { useMemo, useEffect, useState, useRef } from 'react';
import { Project, Event, DependencyType } from '../types';

interface TimelineProps {
    project: Project | null;
    isExecuted: boolean;
    zoomLevel: number;
    setZoomLevel: (z: number) => void;
    onBarClick: (scopeId: string, eventId: string) => void;
    onBarContextMenu: (scopeId: string, eventId: string) => void;
    onAddDependency?: (sourceId: string, targetId: string, type: DependencyType) => void;
}

interface DragState {
    sourceId: string;
    sourceSide: 'start' | 'end';
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
}

interface Coords {
    x: number;
    y: number;
    w: number;
    h: number;
}

const Timeline: React.FC<TimelineProps> = ({ 
    project, 
    isExecuted, 
    zoomLevel, 
    setZoomLevel, 
    onBarClick, 
    onBarContextMenu, 
    onAddDependency 
}) => {
    const [eventCoords, setEventCoords] = useState<Record<string, Coords>>({});
    const [scopeCoords, setScopeCoords] = useState<Record<string, { x: number; y: number }>>({});
    const [activeStartScope, setActiveStartScope] = useState<string | null>(null);
    
    // Drag and Drop Dependency State
    const [dragState, setDragState] = useState<DragState | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const totalWidth = useMemo(() => {
        return 3000 * zoomLevel;
    }, [zoomLevel]);

    const handleWheel = (e: React.WheelEvent) => {
        // Only zoom if Ctrl key is pressed to avoid interfering with normal scroll
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const delta = -e.deltaY * 0.001; // Sensitivity
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
            return { id: s.id, name: s.name, color: s.colorClass, pos, date: effectiveDate };
        });
    }, [project, isExecuted]);

    // Algoritmo de empilhamento de eventos (Stacking)
    const getScopeLayout = (events: Event[]) => {
        // 1. Ordenar eventos por data de início
        const sortedEvents = [...events].sort((a, b) => {
            const startA = !isExecuted && a.plannedStartDate ? a.plannedStartDate : a.startDate;
            const startB = !isExecuted && b.plannedStartDate ? b.plannedStartDate : b.startDate;
            return new Date(startA).getTime() - new Date(startB).getTime();
        });

        const rows: number[] = []; // Guarda a posição final (em %) do último evento de cada linha virtual
        const layout: Record<string, number> = {}; // Mapa: eventId -> índice da linha (0, 1, 2...)

        sortedEvents.forEach(ev => {
            const startStr = !isExecuted && ev.plannedStartDate ? ev.plannedStartDate : ev.startDate;
            const endStr = !isExecuted && ev.plannedEndDate ? ev.plannedEndDate : ev.endDate;
            
            // Margem de segurança de 1% para evitar colisão visual exata
            const startVal = getPositionPercent(startStr);
            let endVal = getPositionPercent(endStr);

            // Se for executado e tiver extensão, considera o maior final
            if (isExecuted && ev.plannedEndDate && ev.endDate) {
                const plannedEnd = getPositionPercent(ev.plannedEndDate);
                const actualEnd = getPositionPercent(ev.endDate);
                endVal = Math.max(plannedEnd, actualEnd);
            }
            
            endVal += 1; // Buffer visual

            let rowIndex = -1;

            // Tenta encaixar na primeira linha que estiver livre
            for (let i = 0; i < rows.length; i++) {
                if (rows[i] <= startVal) {
                    rowIndex = i;
                    rows[i] = endVal;
                    break;
                }
            }

            // Se não couber em nenhuma, cria uma nova linha
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
        
        // Pequeno delay para garantir que o DOM atualizou com as novas alturas antes de calcular coordenadas
        const timer = setTimeout(() => {
            const coords: Record<string, Coords> = {};
            const sCoords: Record<string, { x: number; y: number }> = {};
            const timelineId = isExecuted ? 'executed-timeline' : 'planned-timeline';
            const timelineElement = document.getElementById(timelineId);
            
            if (!timelineElement) return;

            const parentRect = timelineElement.getBoundingClientRect();

            project.scopes.forEach(s => {
                const sStart = !isExecuted && s.plannedStartDate ? s.plannedStartDate : s.startDate;
                const sPosPercent = getPositionPercent(sStart);
                const rowId = `scope-row-${s.id}-${isExecuted ? 'exe' : 'pla'}`;
                const rowEl = document.getElementById(rowId);
                
                if(rowEl) {
                    const rect = rowEl.getBoundingClientRect();
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

    // DRAG HANDLERS
    const handleDragStart = (e: React.MouseEvent, eventId: string, side: 'start' | 'end') => {
        e.preventDefault();
        e.stopPropagation();
        
        const container = containerRef.current;
        if (!container) return;
        
        const rect = container.getBoundingClientRect();
        const startX = e.clientX - rect.left + container.scrollLeft;
        const startY = e.clientY - rect.top;

        setDragState({
            sourceId: eventId,
            sourceSide: side,
            startX,
            startY,
            currentX: startX,
            currentY: startY
        });
    };

    const handleDragMove = (e: MouseEvent) => {
        if (!dragState || !containerRef.current) return;
        
        const rect = containerRef.current.getBoundingClientRect();
        setDragState(prev => prev ? ({
            ...prev,
            currentX: e.clientX - rect.left + containerRef.current!.scrollLeft,
            currentY: e.clientY - rect.top
        }) : null);
    };

    const handleDragEnd = () => {
        setDragState(null);
    };

    const handleNodeMouseUp = (e: React.MouseEvent, targetId: string, targetSide: 'start' | 'end') => {
        e.stopPropagation();
        if (!dragState || !onAddDependency) return;
        
        if (dragState.sourceId === targetId) return; // Cannot link to self

        // Determine Dependency Type
        let type: DependencyType = 'FS';
        
        if (dragState.sourceSide === 'end' && targetSide === 'start') type = 'FS'; 
        else if (dragState.sourceSide === 'start' && targetSide === 'start') type = 'SS';
        else if (dragState.sourceSide === 'end' && targetSide === 'end') type = 'FF';
        else if (dragState.sourceSide === 'start' && targetSide === 'end') type = 'SF';

        onAddDependency(dragState.sourceId, targetId, type);
        setDragState(null);
    };

    useEffect(() => {
        if (dragState) {
            window.addEventListener('mousemove', handleDragMove);
            window.addEventListener('mouseup', handleDragEnd);
        }
        return () => {
            window.removeEventListener('mousemove', handleDragMove);
            window.removeEventListener('mouseup', handleDragEnd);
        };
    }, [dragState]);

    if (!project) {
        return (
            <div className="w-full h-[600px] flex items-center justify-center">
                <p className="text-zinc-500 font-bold uppercase text-xs tracking-[0.2em] animate-pulse">
                    Aguardando Seleção...
                </p>
            </div>
        );
    }

    const months = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
    const ROW_HEIGHT = 50;
    
    return (
        <div 
            id={isExecuted ? 'executed-timeline' : 'planned-timeline'} 
            className="overflow-x-auto scroller relative bg-transparent min-h-[700px]"
            onWheel={handleWheel}
            ref={containerRef}
        >
            <div className="relative" style={{ width: `${totalWidth}px` }}>
                <svg style={{ position: 'absolute', width: 0, height: 0 }}>
                    <defs>
                        <marker id="arrowhead-cyan" markerWidth="6" markerHeight="4" refX="6" refY="2" orientation="auto"><polygon points="0 0, 6 2, 0 4" fill="#00D4FF" /></marker>
                        <marker id="arrowhead-orange" markerWidth="6" markerHeight="4" refX="6" refY="2" orientation="auto"><polygon points="0 0, 6 2, 0 4" fill="#E86C3F" /></marker>
                        <marker id="arrowhead-green" markerWidth="6" markerHeight="4" refX="6" refY="2" orientation="auto"><polygon points="0 0, 6 2, 0 4" fill="#10B981" /></marker>
                        <marker id="arrowhead-red" markerWidth="6" markerHeight="4" refX="6" refY="2" orientation="auto"><polygon points="0 0, 6 2, 0 4" fill="#EF4444" /></marker>
                        <filter id="glow">
                            <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
                            <feMerge>
                                <feMergeNode in="coloredBlur"/>
                                <feMergeNode in="SourceGraphic"/>
                            </feMerge>
                        </filter>
                    </defs>
                </svg>

                {/* Tags de Início de Escopo */}
                <div className="flex bg-transparent h-12 relative border-b border-theme-divider no-print">
                    <div className="w-64 shrink-0 border-r border-theme-divider" />
                    <div className="flex-1 relative">
                        {scopeStartTags.map((tag, i) => (
                            <div key={i} className="absolute top-2 -translate-x-1/2 flex flex-col items-center z-[60] cursor-pointer group" style={{ left: `${tag.pos}%` }} onClick={() => setActiveStartScope(activeStartScope === tag.id ? null : tag.id)}>
                                <div className={`px-2 py-0.5 rounded-full text-[8px] font-bold text-white shadow-lg whitespace-nowrap backdrop-blur-sm border transition-all ${activeStartScope === tag.id ? 'scale-110 ring-2 ring-white ring-opacity-50' : 'border-white/20 hover:scale-105'}`} style={{ backgroundColor: tag.color + 'aa' }}>
                                    INÍCIO {tag.name}
                                </div>
                                {activeStartScope === tag.id && (
                                    <div className="absolute top-full mt-1 bg-black/80 text-white text-[9px] px-2 py-1 rounded font-mono animate-fadeIn whitespace-nowrap z-[70]">
                                        {new Date(tag.date).toLocaleDateString()}
                                    </div>
                                )}
                                <div className="w-[1px] h-2 bg-theme-divider mt-1" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Timeline Header */}
                <div className="sticky top-0 left-0 z-50 flex bg-theme-bg/90 backdrop-blur-md border-b border-theme-divider shadow-lg">
                    <div className="w-64 shrink-0 border-r border-theme-divider flex items-center justify-center">
                        <span className="text-[9px] font-black text-theme-textMuted uppercase tracking-widest">Fluxo</span>
                    </div>
                    <div className="flex flex-1">
                        {months.map((m, idx) => (
                            <div key={idx} className="flex-1 flex flex-col border-r border-theme-divider last:border-r-0">
                                <div className="text-center text-[9px] py-2 font-black text-theme-textMuted uppercase border-b border-theme-divider bg-theme-card">
                                    {m}
                                </div>
                                <div className="flex">
                                    {[1, 2, 3, 4].map(w => (
                                        <div key={w} className="flex-1 text-center text-[7px] py-1 font-medium text-theme-textMuted/50 border-r border-theme-divider last:border-r-0">
                                            S{w}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Main Grid Area */}
                <div className="w-full h-8 bg-theme-highlight flex items-center z-40 relative px-64 border-b border-theme-divider">
                    <span className="text-theme-textMuted font-bold text-[9px] uppercase tracking-[0.5em] ml-10">Cronograma</span>
                </div>

                {/* Dragging Line */}
                <svg className="absolute inset-0 pointer-events-none z-[100] overflow-visible" style={{ width: '100%', height: '100%' }}>
                    {dragState && (
                        <path 
                            d={`M ${dragState.startX} ${dragState.startY} C ${dragState.startX + 50} ${dragState.startY}, ${dragState.currentX - 50} ${dragState.currentY}, ${dragState.currentX} ${dragState.currentY}`} 
                            stroke="#E86C3F" 
                            strokeWidth="2" 
                            strokeDasharray="5 5" 
                            fill="none" 
                            markerEnd="url(#arrowhead-orange)"
                        />
                    )}
                </svg>

                {/* Layer 1: Scope Connector */}
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
                                <path 
                                    d={`M ${startNode.x} ${startNode.y} C ${controlPoint1X} ${startNode.y}, ${controlPoint2X} ${endNode.y + (endNode.h/2)}, ${endNode.x} ${endNode.y + (endNode.h/2)}`} 
                                    stroke={s.colorClass} 
                                    strokeWidth="1" 
                                    strokeDasharray="3 3" 
                                    fill="none" 
                                    className="opacity-50" 
                                />
                                <circle cx={startNode.x} cy={startNode.y} r="2" fill={s.colorClass} className="animate-pulse" filter="url(#glow)" />
                            </g>
                        );
                    })}
                </svg>

                {/* Layer 2: Dependency Lines */}
                <svg className="absolute inset-0 pointer-events-none z-30 overflow-visible" style={{ width: '100%', height: '100%' }}>
                    {project.scopes.map(s => s.events.map(ev => ev.dependencies?.map(dep => {
                        const from = eventCoords[dep.id];
                        const to = eventCoords[ev.id];
                        if (!from || !to) return null;

                        let startX, startY, endX, endY, color, marker;
                        switch (dep.type) {
                            case 'SS': startX = from.x; startY = from.y + (from.h / 2); endX = to.x; endY = to.y + (to.h / 2); color = "#E86C3F"; marker = "arrowhead-orange"; break;
                            case 'FF': startX = from.x + from.w; startY = from.y + (from.h / 2); endX = to.x + to.w; endY = to.y + (to.h / 2); color = "#10B981"; marker = "arrowhead-green"; break;
                            case 'SF': startX = from.x; startY = from.y + (from.h / 2); endX = to.x + to.w; endY = to.y + (to.h / 2); color = "#EF4444"; marker = "arrowhead-red"; break;
                            case 'FS': default: startX = from.x + from.w; startY = from.y + (from.h / 2); endX = to.x; endY = to.y + (to.h / 2); color = "#00D4FF"; marker = "arrowhead-cyan";
                        }

                        const deltaX = Math.abs(endX - startX);
                        const curveDepth = Math.max(deltaX * 0.5, 50); 

                        return (
                            <g key={`${ev.id}-${dep.id}`}>
                                <path 
                                    d={`M ${startX} ${startY} C ${startX + curveDepth} ${startY}, ${endX - curveDepth} ${endY}, ${endX} ${endY}`} 
                                    stroke={color} 
                                    strokeWidth="1.5" 
                                    strokeDasharray={dep.type === 'FS' ? '0' : '4 2'} 
                                    fill="none" 
                                    className="opacity-60" 
                                    markerEnd={`url(#${marker})`} 
                                />
                            </g>
                        );
                    })))}
                </svg>

                {/* Rows & Bars */}
                <div className="relative pt-6">
                    {/* Grid Background */}
                    <div className="absolute inset-0 pointer-events-none flex">
                        <div className="w-64 shrink-0 border-r border-theme-divider bg-theme-highlight" />
                        <div className="flex flex-1 relative">
                            {Array.from({ length: 48 }).map((_, i) => (
                                <div key={i} className={`flex-1 border-r border-theme-divider ${i % 4 === 3 ? 'opacity-100' : 'opacity-30'}`} />
                            ))}
                            {activeStartScope && (
                                (() => {
                                    const tag = scopeStartTags.find(t => t.id === activeStartScope);
                                    if (tag) {
                                        return (
                                            <>
                                                <div className="absolute top-0 bottom-0 z-0 opacity-10 transition-all duration-300 pointer-events-none" style={{ left: `${tag.pos}%`, width: `${(7 / 365) * 100}%`, backgroundColor: tag.color }} />
                                                <div className="absolute top-0 bottom-0 z-10 w-[1px] shadow-[0_0_10px_rgba(255,255,255,0.8)] animate-fadeIn" style={{ left: `${tag.pos}%`, backgroundColor: tag.color }} />
                                            </>
                                        );
                                    }
                                    return null;
                                })()
                            )}
                        </div>
                    </div>

                    {/* Today Line */}
                    {todayPos >= 0 && (
                        <div className="absolute top-0 bottom-0 z-40 no-print" style={{ left: `calc(16rem + ${todayPos}%)` }}>
                            <div className={`w-[1px] h-full ${isExecuted ? 'bg-theme-cyan shadow-[0_0_10px_#00D4FF]' : 'bg-zinc-600 dashed border-l border-dashed'}`} />
                        </div>
                    )}

                    {/* Scopes & Events */}
                    {project.scopes.map(s => {
                        const { layout, maxRows } = getScopeLayout(s.events);
                        const rowHeightPx = Math.max(90, (maxRows * ROW_HEIGHT) + 30);

                        return (
                            <div 
                                key={s.id} 
                                id={`scope-row-${s.id}-${isExecuted ? 'exe' : 'pla'}`} 
                                className="flex w-full relative group items-center border-b border-theme-divider hover:bg-theme-highlight transition-colors"
                                style={{ height: `${rowHeightPx}px` }}
                            >
                                <div className="w-64 shrink-0 z-50 flex justify-end pr-6 sticky left-0 backdrop-blur-md h-full py-5 border-r border-theme-divider">
                                    <div className="flex flex-col items-end mt-2">
                                        <div className="px-3 py-1.5 rounded-lg bg-theme-card border border-theme-divider shadow-lg transition-all group-hover:border-theme-orange/30 group-hover:translate-x-1" style={{ borderLeft: `4px solid ${s.colorClass}` }}>
                                            <span className="font-bold text-[9px] text-theme-textMuted tracking-widest uppercase">{s.name}</span>
                                        </div>
                                        <span className="text-[7px] font-bold text-zinc-500 mt-1 uppercase tracking-wider">{s.resp}</span>
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
                                        let bgColor = s.colorClass + '20'; 
                                        
                                        if (isExecuted && ev.completed) {
                                            borderColor = '#10B981';
                                            bgColor = '#10B98130';
                                        } else if (!isExecuted) {
                                            borderColor = '#71717a';
                                            bgColor = '#27272a';
                                        }

                                        return (
                                            <div 
                                                key={ev.id}
                                                id={`${isExecuted ? 'exe' : 'pla'}-ev-${ev.id}`}
                                                className={`absolute h-10 flex flex-col items-center justify-center z-40 group/bar transition-transform hover:-translate-y-1 ${!isExecuted ? 'pointer-events-none opacity-60 grayscale' : ''}`}
                                                style={{ left: `${l}%`, width: `${Math.max(mainBarWidth + extensionWidth, 4)}%`, top: `${topPos}px` }}
                                                onClick={() => { if (isExecuted && !dragState) onBarClick(s.id, ev.id); }}
                                                onContextMenu={(e) => { e.preventDefault(); if (isExecuted) onBarContextMenu(s.id, ev.id); }}
                                            >
                                                {isExecuted && (
                                                    <>
                                                        <div 
                                                            className="absolute -left-3 w-3 h-3 bg-white rounded-full border-2 border-theme-card opacity-0 group-hover/bar:opacity-100 hover:scale-150 transition-all cursor-crosshair z-[60]"
                                                            style={{ borderColor: s.colorClass }}
                                                            onMouseDown={(e) => handleDragStart(e, ev.id, 'start')}
                                                            onMouseUp={(e) => handleNodeMouseUp(e, ev.id, 'start')}
                                                        />
                                                        <div 
                                                            className="absolute -right-3 w-3 h-3 bg-white rounded-full border-2 border-theme-card opacity-0 group-hover/bar:opacity-100 hover:scale-150 transition-all cursor-crosshair z-[60]"
                                                            style={{ borderColor: s.colorClass }}
                                                            onMouseDown={(e) => handleDragStart(e, ev.id, 'end')}
                                                            onMouseUp={(e) => handleNodeMouseUp(e, ev.id, 'end')}
                                                        />
                                                    </>
                                                )}

                                                <div className="absolute -top-3 left-0 bg-theme-bg/80 backdrop-blur-sm border border-theme-divider px-1 rounded-sm z-50 whitespace-nowrap pointer-events-none">
                                                    <span className="text-[6px] font-black text-theme-textMuted uppercase tracking-wider">
                                                        {ev.resp.split(' ')[0]} {hasExtension && <span className="text-red-500">(!ATRASO)</span>}
                                                    </span>
                                                </div>
                                                
                                                <div className={`w-full h-full relative flex ${isExecuted ? 'cursor-grab active:cursor-grabbing' : ''}`}>
                                                    <div 
                                                        className={`h-full rounded-md border flex items-center justify-center px-2 shadow-lg overflow-hidden relative ${hasExtension ? 'rounded-r-none border-r-0' : ''}`}
                                                        style={{ borderColor: borderColor, backgroundColor: bgColor, borderLeftWidth: '3px', width: hasExtension ? `${(mainBarWidth / (mainBarWidth + extensionWidth)) * 100}%` : '100%' }}
                                                    >
                                                        <span className="text-[8px] font-bold uppercase text-white truncate text-center tracking-tight z-10 relative drop-shadow-md select-none">{ev.title}</span>
                                                    </div>
                                                    {hasExtension && (
                                                        <div className="h-full rounded-r-md border border-red-500 bg-red-500/80 flex items-center justify-center shadow-lg relative" style={{ width: `${(extensionWidth / (mainBarWidth + extensionWidth)) * 100}%`, borderLeft: 'none' }}>
                                                             <span className="material-symbols-outlined text-[10px] text-white animate-pulse">warning</span>
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