import React, { useEffect, useRef, useMemo } from 'react';

interface FinanceiroTabProps {
  project: any;
  db: any;
}

const toNum = (v: any): number => {
  if (!v) return 0;
  const n = parseFloat(String(v).replace(/[^0-9,.-]/g, '').replace(',', '.'));
  return isNaN(n) ? 0 : n;
};

export const FinanceiroTab: React.FC<FinanceiroTabProps> = ({ project, db }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const enigamiConfig = useMemo(() => {
    const details = project.details || {};
    const rows = project.dataRows || [];
    const pavements = details.pavements || [];

    const areaTerreno = toNum(details.landArea) || toNum(rows[0]?.landArea) || 0;
    const caBasico    = toNum(rows[0]?.potential) || 0;
    const cidade      = (details.location || rows[0]?.location || '').split(',').pop()?.trim() || '';

    const categoryToTipo = (cat: string): 'Torre' | 'Embasamento' | 'Telhado' => {
      if (cat === 'Garagem' || cat === 'Lazer Interno') return 'Embasamento';
      if (cat === 'Lazer Externo') return 'Telhado';
      return 'Torre';
    };

    const categoryToCoef = (cat: string): number => {
      if (cat === 'Garagem') return 0.5;
      if (cat === 'Lazer Interno') return 0.8;
      if (cat === 'Lazer Externo') return 0.3;
      return 1.0;
    };

    const areas = pavements.map((p: any) => ({
      nome: p.type, tipo: categoryToTipo(p.category),
      qtd: p.count, comp: p.areaPerPavement, cob: p.areaPerPavement,
      desc: 0, total: p.areaPerPavement, coef: categoryToCoef(p.category),
    }));

    const units = pavements
      .filter((p: any) => p.category === 'Habitacional' || p.category === 'Garagem')
      .map((p: any) => ({
        nome: p.type,
        tipo: p.category === 'Garagem' ? 'Estacionamento' : 'Residencial',
        qtd:  p.count * p.unitsPerPavement,
        area: p.unitArea, pm2: 0, permuta: 0,
      }));

    return {
      nome: project.name || '', cidade, areaTerreno, caBasico,
      areas: areas.length > 0 ? areas : null,
      units: units.length > 0 ? units : null,
    };
  }, [project]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const send = () => {
      try { iframe.contentWindow?.postMessage({ type: 'ENIGAMI_INIT', config: enigamiConfig }, '*'); } catch {}
    };
    iframe.addEventListener('load', send);
    return () => iframe.removeEventListener('load', send);
  }, [enigamiConfig]);

  return (
    <iframe
      ref={iframeRef}
      src="/evr.html"
      className="w-full border-0 block"
      style={{ height: 'calc(100vh - 56px)' }}
      title="EVR — Estudo Financeiro"
    />
  );
};

export default FinanceiroTab;import React, { useEffect, useRef, useMemo } from 'react';

interface FinanceiroTabProps {
  project: any;
  db: any;
}

const toNum = (v: any): number => {
  if (!v) return 0;
  const n = parseFloat(String(v).replace(/[^0-9,.-]/g, '').replace(',', '.'));
  return isNaN(n) ? 0 : n;
};

export const FinanceiroTab: React.FC<FinanceiroTabProps> = ({ project, db }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const enigamiConfig = useMemo(() => {
    const details = project.details || {};
    const rows = project.dataRows || [];
    const pavements = details.pavements || [];

    const areaTerreno = toNum(details.landArea) || toNum(rows[0]?.landArea) || 0;
    const caBasico    = toNum(rows[0]?.potential) || 0;
    const cidade      = (details.location || rows[0]?.location || '').split(',').pop()?.trim() || '';

    const categoryToTipo = (cat: string): 'Torre' | 'Embasamento' | 'Telhado' => {
      if (cat === 'Garagem' || cat === 'Lazer Interno') return 'Embasamento';
      if (cat === 'Lazer Externo') return 'Telhado';
      return 'Torre';
    };

    const categoryToCoef = (cat: string): number => {
      if (cat === 'Garagem') return 0.5;
      if (cat === 'Lazer Interno') return 0.8;
      if (cat === 'Lazer Externo') return 0.3;
      return 1.0;
    };

    const areas = pavements.map((p: any) => ({
      nome: p.type, tipo: categoryToTipo(p.category),
      qtd: p.count, comp: p.areaPerPavement, cob: p.areaPerPavement,
      desc: 0, total: p.areaPerPavement, coef: categoryToCoef(p.category),
    }));

    const units = pavements
      .filter((p: any) => p.category === 'Habitacional' || p.category === 'Garagem')
      .map((p: any) => ({
        nome: p.type,
        tipo: p.category === 'Garagem' ? 'Estacionamento' : 'Residencial',
        qtd:  p.count * p.unitsPerPavement,
        area: p.unitArea, pm2: 0, permuta: 0,
      }));

    return {
      nome: project.name || '', cidade, areaTerreno, caBasico,
      areas: areas.length > 0 ? areas : null,
      units: units.length > 0 ? units : null,
    };
  }, [project]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const send = () => {
      try { iframe.contentWindow?.postMessage({ type: 'ENIGAMI_INIT', config: enigamiConfig }, '*'); } catch {}
    };
    iframe.addEventListener('load', send);
    return () => iframe.removeEventListener('load', send);
  }, [enigamiConfig]);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#F0F2F5]">
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
