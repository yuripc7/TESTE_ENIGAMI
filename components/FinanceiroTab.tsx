import React, { useEffect, useRef, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';

interface FinanceiroTabProps {
  project: any;
  db: any;
}

export const FinanceiroTab: React.FC<FinanceiroTabProps> = ({ project, db }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Pega dados da aba Dados linkados a este projeto
  const dataRows = useMemo(() => {
        return project.dataRows || [];
  }, [project.dataRows]);

  const findVal = (keywords: string[]): number => {
    for (const kw of keywords) {
      const row = dataRows.find((r: any) =>
        r.key?.toLowerCase().includes(kw.toLowerCase()) ||
        r.label?.toLowerCase().includes(kw.toLowerCase())
      );
      if (row) {
        const raw = row.value ?? row.val ?? '';
        const n = parseFloat(String(raw).replace(/[^0-9,.-]/g, '').replace(',', '.'));
        if (!isNaN(n) && n > 0) return n;
      }
    }
    return 0;
  };

  const dadosConfig = useMemo(() => ({
    projectName: project.name || '',
    cub: findVal(['cub', 'custo unitário básico', 'custo unit']),
    areaTerreno: findVal(['terreno', 'área terreno', 'area terreno', 'lote', 'área do lote']),
    vgv: findVal(['vgv', 'valor geral de vendas', 'valor geral']),
    caBasico: findVal(['ca básico', 'coeficiente de aproveitamento', 'ca_bas']),
    prazo: findVal(['prazo', 'prazo obra', 'meses']),
    taxaMensal: findVal(['taxa', 'juros', 'taxa mensal']),
  }), [dataRows, project.id]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const onLoad = () => {
      try {
        iframe.contentWindow?.postMessage({ type: 'ENIGAMI_INIT', config: dadosConfig }, '*');
      } catch {}
    };
    iframe.addEventListener('load', onLoad);
    return () => iframe.removeEventListener('load', onLoad);
  }, [dadosConfig]);

  const summaryCards = [
    { label: 'CUB', value: dadosConfig.cub > 0 ? `R$ ${dadosConfig.cub.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—', icon: 'construction', color: 'bg-orange-50 text-orange-600 border-orange-200' },
    { label: 'Área Terreno', value: dadosConfig.areaTerreno > 0 ? `${dadosConfig.areaTerreno.toLocaleString('pt-BR')} m²` : '—', icon: 'landscape', color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
    { label: 'VGV Previsto', value: dadosConfig.vgv > 0 ? `R$ ${(dadosConfig.vgv / 1e6).toFixed(1)}M` : '—', icon: 'payments', color: 'bg-blue-50 text-blue-600 border-blue-200' },
    { label: 'Prazo', value: dadosConfig.prazo > 0 ? `${dadosConfig.prazo} meses` : '—', icon: 'schedule', color: 'bg-purple-50 text-purple-600 border-purple-200' },
    { label: 'CA Básico', value: dadosConfig.caBasico > 0 ? dadosConfig.caBasico.toFixed(2) : '—', icon: 'apartment', color: 'bg-amber-50 text-amber-600 border-amber-200' },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#F0F2F5]">
      {/* Barra superior com dados do projeto */}
      <div className="shrink-0 px-5 py-2.5 border-b border-gray-200 bg-white/90 backdrop-blur flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 mr-2">
          <div className="w-7 h-7 rounded-lg bg-[#FF6B4A] flex items-center justify-center shadow-sm">
            <span className="material-symbols-outlined text-white text-sm leading-none">analytics</span>
          </div>
          <div className="leading-tight">
            <p className="text-[11px] font-black tracking-widest uppercase text-gray-800 font-[Orbitron,sans-serif]">Estudo Financeiro</p>
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
        {dataRows.length === 0 && (
          <p className="text-[11px] text-gray-400 flex items-center gap-1 ml-auto">
            <span className="material-symbols-outlined text-sm text-amber-400">info</span>
            Preencha a aba <strong className="text-gray-600">Dados</strong> para pré‑carregar os valores no EVR
          </p>
        )}
      </div>

      {/* EVR embutido */}
      <iframe
        ref={iframeRef}
        src="/evr.html"
        className="flex-1 w-full border-0"
        title="EVR — Estudo Financeiro"
      />
    </div>
  );
};

export default FinanceiroTab;
