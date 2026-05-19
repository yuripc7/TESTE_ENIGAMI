import React, { useEffect, useRef, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';

interface FinanceiroTabProps {
  project: any;
  db: any;
}

export const FinanceiroTab: React.FC<FinanceiroTabProps> = ({ project, db }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const dadosConfig = useMemo(() => {
    const d = project.details || {};
    const rows: any[] = project.dataRows || [];
    const scopes: any[] = project.scopes || [];
    const toNum = (v: any): number => {
      if (!v) return 0;
      const n = parseFloat(String(v).replace(/[^0-9,.-]/g, '').replace(',', '.'));
      return isNaN(n) ? 0 : n;
    };
    const firstRow = rows[0];
    const areaTerreno = toNum(d.landArea) || toNum(firstRow?.landArea) || 0;
    const areaVendavel = toNum(d.salesArea) || toNum(firstRow?.salesArea) || 0;
    const areaConstruida = toNum(d.builtArea) || toNum(firstRow?.builtArea) || 0;
    const totalScopes = scopes.length;
    const totalEvents = scopes.reduce((s: number, sc: any) => s + (sc.events?.length || 0), 0);
    const doneEvents = scopes.reduce((s: number, sc: any) => s + (sc.events?.filter((e: any) => e.completed)?.length || 0), 0);
    return { projectName: project.name || '', areaTerreno, areaVendavel, areaConstruida, totalScopes, totalEvents, doneEvents, cub: 0, vgv: 0, caBasico: toNum(firstRow?.potential) || 0, prazo: 0, taxaMensal: 0 };
  }, [project]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const onLoad = () => { try { iframe.contentWindow?.postMessage({ type: 'ENIGAMI_INIT', config: dadosConfig }, '*'); } catch {} };
    iframe.addEventListener('load', onLoad);
    return () => iframe.removeEventListener('load', onLoad);
  }, [dadosConfig]);

  const fmt = (v: number, unit = '') => v > 0 ? `${v.toLocaleString('pt-BR')}${unit}` : '—';

  const summaryCards = [
    { label: 'Área Terreno', value: fmt(dadosConfig.areaTerreno, ' m²'), icon: 'landscape', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { label: 'Área Vendável', value: fmt(dadosConfig.areaVendavel, ' m²'), icon: 'storefront', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { label: 'Área Construída', value: fmt(dadosConfig.areaConstruida, ' m²'), icon: 'apartment', color: 'bg-purple-50 text-purple-700 border-purple-200' },
    { label: 'Disciplinas', value: dadosConfig.totalScopes > 0 ? String(dadosConfig.totalScopes) : '—', icon: 'analytics', color: 'bg-orange-50 text-orange-700 border-orange-200' },
    { label: 'Progresso', value: dadosConfig.totalEvents > 0 ? `${Math.round((dadosConfig.doneEvents / dadosConfig.totalEvents) * 100)}%` : '—', icon: 'task_alt', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  ];

  const hasData = dadosConfig.areaTerreno > 0 || dadosConfig.areaVendavel > 0 || dadosConfig.areaConstruida > 0;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#F0F2F5]">
      <div className="shrink-0 px-5 py-2.5 border-b border-gray-200 bg-white/90 backdrop-blur flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 mr-2">
          <div className="w-7 h-7 rounded-lg bg-[#FF6B4A] flex items-center justify-center shadow-sm">
            <span className="material-symbols-outlined text-white text-sm leading-none">analytics</span>
          </div>
          <div className="leading-tight">
            <p className="text-[11px] font-black tracking-widest uppercase text-gray-800">Estudo Financeiro</p>
            <p className="text-[10px] text-gray-400 font-medium">{project.name}</p>
          </div>
        </div>
        <div className="h-6 w-px bg-gray-200 hidden sm:block" />
        <div className="flex gap-2 flex-wrap">
          {summaryCards.map(card => (
            <div key={card.label} className={`flex items-center gap-1.5 border rounded-lg px-2.5 py-1 ${card.color}`}>
              <span className="material-symbols-outlined text-[14px] leading-none">{card.icon}</span>
              <div className="leading-tight">
                <p className="text-[8px] font-bold uppercase tracking-wider opacity-70">{card.label}</p>
                <p className="text-[11px] font-semibold">{card.value}</p>
              </div>
            </div>
          ))}
        </div>
        {!hasData && (
          <p className="text-[11px] text-gray-400 flex items-center gap-1 ml-auto">
            <span className="material-symbols-outlined text-sm text-amber-400">info</span>
            Preencha <strong className="text-gray-600">Detalhes do Projeto</strong> para carregar os valores
          </p>
        )}
      </div>
      <iframe ref={iframeRef} src="/evr.html" className="flex-1 w-full border-0" title="EVR" />
    </div>
  );
};

export default FinanceiroTab;
