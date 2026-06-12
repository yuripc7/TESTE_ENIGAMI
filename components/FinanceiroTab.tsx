import React, { useEffect, useRef, useState } from 'react';
import { Project, DB } from '../types';

interface FinanceiroTabProps {
  project: Project | null;
  db: DB;
  onUpdateProject?: (updated: Project) => void;
}

export function FinanceiroTab({ project, db, onUpdateProject }: FinanceiroTabProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [showGuide, setShowGuide] = useState(false);

  // Refs para os listeners não dependerem de re-render
  const projectRef = useRef(project);
  const onUpdateRef = useRef(onUpdateProject);
  useEffect(() => { projectRef.current = project; }, [project]);
  useEffect(() => { onUpdateRef.current = onUpdateProject; }, [onUpdateProject]);

  // Monta o config a partir da aba Dados (pré-preenchimento quando não há estado salvo)
  const buildConfig = (p: Project) => {
    const toNum = (str: string | undefined | null) => {
      if (!str) return 0;
      const parsed = parseFloat(str.replace(/[^\d.,]/g, '').replace(',', '.'));
      return isNaN(parsed) ? 0 : parsed;
    };

    const pavements = p.details?.pavements || [];

    const areas = pavements.map((pv) => {
      let tipo = 'Embasamento';
      let coef = 1;
      if (pv.category === 'Habitacional') { tipo = 'Torre'; coef = 1.05; }
      else if (pv.category === 'Garagem') { tipo = 'Embasamento'; coef = 0.7; }
      else if (pv.category === 'Lazer Interno') { tipo = 'Embasamento'; coef = 1.1; }
      else if (pv.category === 'Lazer Externo') { tipo = 'Telhado'; coef = 0.5; }

      // Habitacional: área computável = Unid/Pav × m²/Unid; demais usam areaPerPavement
      const comp = pv.category === 'Habitacional' ? (pv.unitsPerPavement || 0) * (pv.unitArea || 0) : 0;
      const cob = pv.category === 'Habitacional' ? 0 : (pv.category === 'Lazer Externo' ? 0 : (pv.areaPerPavement || 0));
      const desc = pv.category === 'Lazer Externo' ? (pv.areaPerPavement || 0) : 0;
      const total = Math.max(comp + cob + desc, pv.areaPerPavement || 0);

      return { nome: pv.type || pv.category, tipo, qtd: pv.count || 1, comp, cob, desc, total, coef };
    });

    const units = pavements
      .filter((pv) => pv.category === 'Habitacional' || pv.category === 'Garagem')
      .map((pv) => ({
        nome: pv.type || pv.category,
        tipo: pv.category === 'Habitacional' ? 'Residencial' : 'Estacionamento',
        qtd: pv.count * (pv.unitsPerPavement || 0),
        area: pv.unitArea || 0,
        pm2: 0,
        permuta: 0
      }));

    return {
      nome: p.name || '',
      cidade: p.details?.location || '',
      areaTerreno: toNum(p.details?.landArea),
      caBasico: 0,
      areas: areas.length > 0 ? areas : null,
      units: units.length > 0 ? units : null,
    };
  };

  const sendInit = () => {
    const p = projectRef.current;
    const iframe = iframeRef.current;
    if (!p || !iframe?.contentWindow) return;
    try {
      iframe.contentWindow.postMessage({
        type: 'ENIGAMI_INIT',
        config: buildConfig(p),
        savedState: p.evrState || null
      }, '*');
    } catch (err) {
      console.error('Erro ao enviar ENIGAMI_INIT para evr.html:', err);
    }
  };

  // Handshake: o EVR novo avisa quando está pronto (ENIGAMI_EVR_READY);
  // o evento load do iframe fica como fallback. Também recebe o estado
  // do estudo (ENIGAMI_EVR_STATE) e grava no projeto — sincronizado com a equipe.
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const onMessage = (e: MessageEvent) => {
      if (e.source !== iframe.contentWindow) return;
      const d = e.data;
      if (!d || !d.type) return;

      if (d.type === 'ENIGAMI_EVR_READY') {
        sendInit();
      } else if (d.type === 'ENIGAMI_EVR_STATE' && d.state) {
        const p = projectRef.current;
        const update = onUpdateRef.current;
        if (!p || !update) return;
        // Evita gravações redundantes
        if (JSON.stringify(p.evrState || null) === JSON.stringify(d.state)) return;
        update({ ...p, evrState: d.state, updatedAt: new Date().toISOString() });
      }
    };

    const onLoad = () => sendInit();

    window.addEventListener('message', onMessage);
    iframe.addEventListener('load', onLoad);
    if (iframe.contentWindow && iframe.contentDocument?.readyState === 'complete') {
      onLoad();
    }

    return () => {
      window.removeEventListener('message', onMessage);
      iframe.removeEventListener('load', onLoad);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id]);

  return (
    <div className="w-full h-full min-h-[800px] flex flex-col relative overflow-hidden bg-transparent">
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="w-full h-full opacity-[0.03]" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/diagonal-stripes.png')" }}></div>
      </div>
      <div className="flex justify-between items-center px-6 py-4 border-b border-theme-divider bg-theme-bg/95 backdrop-blur-md shadow-lg relative z-10 flex-shrink-0">
        <div className="flex items-center gap-2">
            <div className="w-0.5 h-5 bg-theme-orange shadow-[0_0_10px_#FF6B00]"></div>
            <span className="material-symbols-outlined text-base text-theme-orange">monitoring</span>
            <h2 className="font-square font-black text-[11px] uppercase tracking-[0.4em] text-theme-text">Financeiro</h2>
        </div>
        <button
          onClick={() => setShowGuide(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-theme-divider bg-theme-bg text-theme-textMuted hover:text-theme-orange hover:border-theme-orange text-[10px] font-black uppercase tracking-widest transition-all"
        >
          <span className="material-symbols-outlined text-sm">school</span>
          Guia do Quadro CUG
        </button>
      </div>
      <div className="flex-1 overflow-hidden relative z-10 p-6">
        <div className="ds-card w-full h-full overflow-hidden">
            <iframe
                ref={iframeRef}
                src="/evr.html"
                className="w-full h-full border-0"
                title="Estudo de Viabilidade EVR"
            />
        </div>
      </div>

      {/* Modal do guia passo a passo do Quadro CUG */}
      {showGuide && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn no-print" onClick={() => setShowGuide(false)}>
          <div className="bg-theme-card w-full max-w-[860px] h-[85vh] rounded-2xl border border-theme-divider shadow-2xl animate-scaleIn flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center px-5 py-3 border-b border-theme-divider shrink-0">
              <h3 className="font-square font-black text-xs uppercase tracking-widest text-theme-text flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-theme-orange">school</span>
                Guia passo a passo — Quadro CUG
              </h3>
              <button onClick={() => setShowGuide(false)} className="text-theme-textMuted hover:text-theme-text">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <iframe src="/cug_guide.html" className="flex-1 w-full border-0 bg-white" title="Guia Quadro CUG" />
          </div>
        </div>
      )}
    </div>
  );
}
