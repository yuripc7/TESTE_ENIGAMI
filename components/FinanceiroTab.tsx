import React, { useEffect, useRef } from 'react';
import { Project, Database } from '../types';

interface FinanceiroTabProps {
  project: Project | null;
  db: Database;
}

export function FinanceiroTab({ project, db }: FinanceiroTabProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!project || !iframeRef.current) return;

    // Converter string de área (ex: "1000 m²") para número
    const toNum = (str: string | undefined | null) => {
      if (!str) return 0;
      const parsed = parseFloat(str.replace(/[^\d.,]/g, '').replace(',', '.'));
      return isNaN(parsed) ? 0 : parsed;
    };

    const areaTerreno = toNum(project.details?.landArea);
    const pavements = project.details?.pavements || [];

    // Para cfg.areas, mapeamos a tipologia
    // evr.html suporta: Residencial, Comercial, Garagem, Lazer, etc.
    const areas = pavements.map((p) => {
      let tipo = 'Comum';
      let coef = 1;
      if (p.category === 'Habitacional') { tipo = 'Privativa'; coef = 1; }
      else if (p.category === 'Garagem') { tipo = 'Garagem'; coef = 0.5; }
      else if (p.category === 'Lazer Interno') { tipo = 'Comum'; coef = 0.8; }
      else if (p.category === 'Lazer Externo') { tipo = 'Descoberta'; coef = 0; }

      // Para Habitacional: área do pav = Unid/Pav × m²/Unid (evita dupla contagem)
      // Para Garagem/Lazer: usa areaPerPavement (entrada manual)
      const areaPav = (p.category === 'Habitacional')
        ? (p.unitsPerPavement || 0) * (p.unitArea || 0)
        : (p.areaPerPavement || 0);

      return {
        nome: p.type || p.category,
        tipo: tipo,
        qtd: p.count || 1,
        comp: areaPav,
        cob: areaPav,
        desc: 0,
        total: areaPav,
        coef: coef
      };
    });


    // Para cfg.units (unidades vendáveis)
    const units = pavements
      .filter((p) => p.category === 'Habitacional' || p.category === 'Garagem')
      .map((p) => {
        return {
          nome: p.type || p.category,
          tipo: p.category === 'Habitacional' ? 'Residencial' : 'Estacionamento',
          qtd: p.count * (p.unitsPerPavement || 0),
          area: p.unitArea || 0,
          pm2: 0, // Usuário preenche depois no EVR
          permuta: 0
        };
      });

    const dadosConfig = {
      nome: project.name || '',
      cidade: project.details?.location || '',
      areaTerreno: areaTerreno,
      caBasico: 0, // Será calculado ou preenchido pelo usuário
      areas: areas.length > 0 ? areas : null,
      units: units.length > 0 ? units : null,
    };

    const iframe = iframeRef.current;
    const onLoad = () => {
      try {
        iframe.contentWindow?.postMessage({ type: 'ENIGAMI_INIT', config: dadosConfig }, '*');
      } catch (err) {
        console.error("Erro ao enviar postMessage para evr.html:", err);
      }
    };

    iframe.addEventListener('load', onLoad);
    
    // Se o iframe já estiver carregado (hot reload)
    if (iframe.contentWindow && iframe.contentDocument?.readyState === 'complete') {
        onLoad();
    }

    return () => {
      iframe.removeEventListener('load', onLoad);
    };
  }, [project]);

  return (
    <div className="w-full h-[800px] flex flex-col relative overflow-hidden bg-transparent">
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="w-full h-full opacity-[0.03]" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/diagonal-stripes.png')" }}></div>
      </div>
      <div className="flex justify-between items-center px-6 py-4 border-b border-theme-divider bg-theme-bg/95 backdrop-blur-md shadow-lg relative z-10 flex-shrink-0">
        <div className="flex items-center gap-2">
            <div className="w-0.5 h-5 bg-theme-orange shadow-[0_0_10px_#FF6B00]"></div>
            <span className="material-symbols-outlined text-base text-theme-orange">monitoring</span>
            <h2 className="font-square font-black text-[11px] uppercase tracking-[0.4em] text-theme-text">Financeiro</h2>
        </div>
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
    </div>
  );
}
