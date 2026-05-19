import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface FlipBookProps { url: string; }

export const FlipBook: React.FC<FlipBookProps> = ({ url }) => {
    const [numPages, setNumPages] = useState(0);
    const [page, setPage] = useState(1);
    const [spread, setSpread] = useState(true);
    const [inputVal, setInputVal] = useState('1');
    const containerRef = useRef<HTMLDivElement>(null);
    const [pageW, setPageW] = useState(400);

    // Calculate page width from container
    useEffect(() => {
        const calc = () => {
            if (!containerRef.current) return;
            const w = containerRef.current.clientWidth;
            // In spread mode: each page is ~45% of container; single: ~80%
            setPageW(Math.floor(spread ? (w * 0.44) : (w * 0.75)));
        };
        calc();
        const ro = new ResizeObserver(calc);
        if (containerRef.current) ro.observe(containerRef.current);
        return () => ro.disconnect();
    }, [spread]);

    const goTo = useCallback((p: number) => {
        const c = Math.max(1, Math.min(numPages, p));
        setPage(c);
        setInputVal(String(c));
    }, [numPages]);

    const prev = () => goTo(spread ? page - 2 : page - 1);
    const next = () => goTo(spread ? page + 2 : page + 1);
    const hasPrev = page > 1;
    const hasNext = spread ? page + 1 <= numPages : page < numPages;
    const rightPage = spread && page + 1 <= numPages ? page + 1 : null;

    useEffect(() => {
        const h = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') prev();
            if (e.key === 'ArrowRight') next();
        };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [page, numPages, spread]);

    const totalSpreads = spread ? Math.ceil(numPages / 2) : numPages;
    const currentSpread = spread ? Math.ceil(page / 2) : page;

    return (
        <div className="flex flex-col h-full w-full" style={{ background: '#0f1623' }}>

            {/* ── Toolbar ── */}
            <div className="flex items-center justify-between px-5 py-2.5 border-b border-white/10" style={{ background: '#16213e' }}>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => { setSpread(s => !s); }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${spread ? 'text-white' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}
                        style={spread ? { background: '#E85028' } : {}}
                    >
                        <span className="material-symbols-outlined text-sm">{spread ? 'menu_book' : 'book'}</span>
                        {spread ? '2 Páginas' : '1 Página'}
                    </button>
                </div>

                {numPages > 0 && (
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-white/40 uppercase tracking-wider">Página</span>
                        <input
                            type="number" min={1} max={numPages}
                            value={inputVal}
                            onChange={e => setInputVal(e.target.value)}
                            onBlur={() => goTo(parseInt(inputVal) || 1)}
                            onKeyDown={e => e.key === 'Enter' && goTo(parseInt(inputVal) || 1)}
                            className="w-12 text-center rounded-lg text-white text-[11px] font-bold py-1 outline-none border border-white/20 focus:border-orange-400"
                            style={{ background: 'rgba(255,255,255,0.08)' }}
                        />
                        <span className="text-[10px] text-white/40">de {numPages}</span>
                    </div>
                )}
            </div>

            {/* ── Book area ── */}
            <div ref={containerRef} className="flex-1 flex items-center justify-center overflow-auto p-4 md:p-8" style={{ background: '#1a1a2e' }}>
                <Document
                    file={url}
                    onLoadSuccess={({ numPages: n }) => { setNumPages(n); setPage(1); setInputVal('1'); }}
                    loading={
                        <div className="flex flex-col items-center gap-4 py-20">
                            <div className="w-12 h-12 border-4 border-orange-400 border-t-transparent rounded-full animate-spin" />
                            <span className="text-xs font-black uppercase tracking-widest text-white/40">Carregando PDF...</span>
                        </div>
                    }
                    error={<div className="text-red-400 text-sm py-8">Erro ao carregar o PDF.</div>}
                >
                    {/* Book wrap with shadow/spine */}
                    <div className="flex items-stretch" style={{
                        filter: 'drop-shadow(0 30px 60px rgba(0,0,0,0.8))',
                        borderRadius: 4,
                    }}>
                        {/* Left page */}
                        <div style={{
                            borderRadius: '4px 0 0 4px',
                            overflow: 'hidden',
                            boxShadow: rightPage ? '4px 0 12px rgba(0,0,0,0.5)' : '0 0 40px rgba(0,0,0,0.6)',
                        }}>
                            <Page
                                pageNumber={page}
                                width={pageW}
                                renderTextLayer={false}
                                renderAnnotationLayer={false}
                            />
                        </div>

                        {/* Spine + right page */}
                        {rightPage && (
                            <>
                                {/* Book spine */}
                                <div style={{
                                    width: 6,
                                    background: 'linear-gradient(to right, #1a1a2e 0%, #2a2a4e 40%, #1a1a2e 100%)',
                                    boxShadow: 'inset 2px 0 4px rgba(0,0,0,0.5), inset -2px 0 4px rgba(0,0,0,0.5)',
                                    flexShrink: 0,
                                }} />
                                <div style={{
                                    borderRadius: '0 4px 4px 0',
                                    overflow: 'hidden',
                                    boxShadow: '-4px 0 12px rgba(0,0,0,0.5)',
                                }}>
                                    <Page
                                        pageNumber={rightPage}
                                        width={pageW}
                                        renderTextLayer={false}
                                        renderAnnotationLayer={false}
                                    />
                                </div>
                            </>
                        )}
                    </div>
                </Document>
            </div>

            {/* ── Nav ── */}
            {numPages > 0 && (
                <div className="flex items-center justify-between px-5 py-3 border-t border-white/10" style={{ background: '#16213e' }}>
                    <button onClick={prev} disabled={!hasPrev}
                        className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-25"
                        style={{ background: hasPrev ? 'rgba(255,255,255,0.1)' : 'transparent', color: 'white' }}
                        onMouseEnter={e => hasPrev && ((e.target as HTMLElement).style.background = 'rgba(255,255,255,0.18)')}
                        onMouseLeave={e => ((e.target as HTMLElement).style.background = hasPrev ? 'rgba(255,255,255,0.1)' : 'transparent')}
                    >
                        <span className="material-symbols-outlined text-base">chevron_left</span> Anterior
                    </button>

                    {/* Progress dots */}
                    <div className="flex items-center gap-1.5">
                        {Array.from({ length: Math.min(totalSpreads, 11) }).map((_, i) => {
                            const s = Math.round(i * (totalSpreads - 1) / Math.max(1, Math.min(totalSpreads, 11) - 1)) + 1;
                            const isActive = s === currentSpread || (i === Math.min(totalSpreads, 11) - 1 && currentSpread === totalSpreads);
                            return (
                                <button key={i}
                                    onClick={() => goTo(spread ? (s - 1) * 2 + 1 : s)}
                                    className="rounded-full transition-all"
                                    style={{
                                        width: isActive ? 18 : 6,
                                        height: 6,
                                        background: isActive ? '#E85028' : 'rgba(255,255,255,0.2)',
                                    }}
                                />
                            );
                        })}
                        <span className="text-[9px] text-white/30 ml-2 font-mono">{currentSpread}/{totalSpreads}</span>
                    </div>

                    <button onClick={next} disabled={!hasNext}
                        className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-25"
                        style={{ background: hasNext ? 'rgba(255,255,255,0.1)' : 'transparent', color: 'white' }}
                        onMouseEnter={e => hasNext && ((e.target as HTMLElement).style.background = 'rgba(255,255,255,0.18)')}
                        onMouseLeave={e => ((e.target as HTMLElement).style.background = hasNext ? 'rgba(255,255,255,0.1)' : 'transparent')}
                    >
                        Próximo <span className="material-symbols-outlined text-base">chevron_right</span>
                    </button>
                </div>
            )}
        </div>
    );
};

export default FlipBook;
