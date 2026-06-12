import React, { useMemo, useRef, useState } from 'react';
import { DB, Viability, FileLink } from '../types';
import { useApp } from '../contexts/AppContext';
import { readFileAsDataURL } from '../utils/fileReaderUtils';
import { validateFileSize } from '../utils/validation';
import { getMember } from '../utils/membersHelper';

/**
 * Painel de Viabilidades — redesign (port do Viabilidades.dc.html).
 * Kanban por fases com tipos de estudo e prazo automático, permuta,
 * urgência e responsável ligado à estrutura central de membros (db.members).
 * Dados em db.viabilities — sincronizados com a equipe + Supabase.
 */

interface ViabilidadesPanelProps {
  companyId: number;
  companyName: string;
  onClose?: () => void;
  // Props legadas — mantidas para compatibilidade
  isOpen?: boolean;
  viabilities?: Viability[];
  onAdd?: (v: unknown) => void;
  onDelete?: (id: string) => void;
  onAddVersion?: (viabilityId: string, version: unknown) => void;
  onUpdateStatus?: (id: string, status: Viability['status']) => void;
}

type KanbanCol = NonNullable<Viability['kanbanStatus']>;

// Tipos de estudo e prazos de entrega
const STUDY_TYPES = [
  { id: 'viab', label: 'VIAB', nome: 'Viabilidade', days: 5, color: '#FF6B4A' },
  { id: 'vgv', label: 'VGV', nome: 'Estudo de VGV', days: 8, color: '#A770EF' },
  { id: 'mercado', label: 'MERCADO', nome: 'Estudo de Mercado', days: 25, color: '#4AC29A' },
  { id: 'permuta', label: 'PERMUTA', nome: 'Análise de Permuta', days: 12, color: '#EAB308' },
] as const;

// Região de atuação do escritório — cidade fora desta lista sugere Estudo de Mercado
const BASE_CITIES = ['balneário camboriú', 'balneario camboriu', 'camboriú', 'camboriu', 'itajaí', 'itajai', 'itapema', 'penha', 'navegantes', 'brusque'];

// Fases do kanban (ids preservam os dados existentes)
const PHASES: { phase: string; cols: { id: KanbanCol; label: string; color: string }[] }[] = [
  { phase: 'ANÁLISE', cols: [
    { id: 'em_aberto', label: 'Em Aberto', color: '#FF6B4A' },
    { id: 'a_fazer', label: 'A Fazer', color: '#00B8DD' },
  ]},
  { phase: 'ESTUDOS', cols: [
    { id: 'estudos_finalizados', label: 'Estudos Finalizados', color: '#A770EF' },
    { id: 'dados_permuta', label: 'Dados de Permuta', color: '#4AC29A' },
  ]},
  { phase: 'CONTRATOS', cols: [
    { id: 'contratos', label: 'Contratos', color: '#EAB308' },
    { id: 'contratos_assinados', label: 'Assinados', color: '#10B981' },
  ]},
];
const ALL_COLS = PHASES.flatMap(p => p.cols);
const DONE_COLS: KanbanCol[] = ['estudos_finalizados', 'dados_permuta', 'contratos', 'contratos_assinados'];

const typeOf = (v: Viability) => STUDY_TYPES.find(t => t.id === v.studyType) || null;
const isoToday = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const fdate = (iso?: string) => { if (!iso) return ''; const p = iso.split('T')[0].split('-'); return `${p[2]}/${p[1]}/${p[0].slice(2)}`; };
const addDays = (days: number) => { const d = new Date(); d.setDate(d.getDate() + days); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const moneyBR = (v?: number) => v == null || isNaN(v) ? '' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

const needsMercado = (v: Viability) =>
  !!v.cidade && v.studyType !== 'mercado' && !BASE_CITIES.some(c => v.cidade!.toLowerCase().includes(c));

const isComplete = (v: Viability) => DONE_COLS.includes((v.kanbanStatus || 'em_aberto') as KanbanCol);

const daysLeft = (v: Viability): number | null => {
  if (!v.deadline) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dl = new Date(v.deadline + 'T00:00:00');
  return Math.round((dl.getTime() - today.getTime()) / 86400000);
};

const progressPct = (v: Viability): number | null => {
  const t = typeOf(v);
  if (!t || !v.deadline || !v.createdAt) return null;
  const start = new Date(v.createdAt).getTime();
  const end = new Date(v.deadline + 'T23:59:59').getTime();
  if (end <= start) return 100;
  const pct = Math.round(((Date.now() - start) / (end - start)) * 100);
  return Math.min(Math.max(pct, 0), 100);
};

const inputCls = "w-full bg-theme-bg border border-theme-divider rounded-xl px-4 py-2.5 text-[13px] text-theme-text outline-none focus:border-theme-orange transition-colors";
const microLabel = "font-square font-black text-[7.5px] tracking-[0.2em] text-theme-textMuted uppercase mb-1.5 block";

// Zona de upload de documento
const DocZone = ({ label, required, file, onPick, accept, inputRef, onChange }: {
  label: string; required?: boolean; file?: FileLink; onPick: () => void; accept: string;
  inputRef: React.RefObject<HTMLInputElement | null>; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) => (
  <div>
    <div className="font-square font-black text-[7px] tracking-[0.15em] text-theme-text uppercase mb-1">
      {label} {required ? <span className="text-red-500">*</span> : <span className="text-theme-textMuted font-normal normal-case tracking-normal text-[10px]">(opcional)</span>}
    </div>
    <div onClick={onPick}
      className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border-[1.5px] cursor-pointer transition-all ${file ? 'border-emerald-400/50 bg-emerald-500/5' : 'border-dashed border-theme-divider bg-theme-bg hover:border-theme-orange'}`}>
      <input type="file" ref={inputRef} accept={accept} onChange={onChange} className="hidden" />
      <span className={`material-symbols-outlined text-base ${file ? 'text-emerald-500' : 'text-theme-textMuted'}`}>{file ? 'description' : 'upload_file'}</span>
      <span className="text-xs text-theme-textMuted flex-1 truncate">{file ? file.label : 'Clique para enviar'}</span>
      {file && <span className="material-symbols-outlined text-sm text-emerald-500">check_circle</span>}
    </div>
  </div>
);

export const ViabilidadesPanel: React.FC<ViabilidadesPanelProps> = ({ companyId, companyName, onClose }) => {
  const { db, setDb, currentUser, setNotification, addLog, isViewer } = useApp();

  const viabs = useMemo(
    () => ((db.viabilities || []) as Viability[]).filter(v => String(v.companyId) === String(companyId)),
    [db.viabilities, companyId]
  );

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'viab' | 'vgv' | 'mercado' | 'permuta' | 'atrasados'>('all');
  const [showAdd, setShowAdd] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [showTeamPicker, setShowTeamPicker] = useState(false);
  const [formErr, setFormErr] = useState('');

  // form
  const [fType, setFType] = useState<'viab' | 'vgv' | 'mercado' | 'permuta'>('viab');
  const [fNome, setFNome] = useState('');
  const [fAddr, setFAddr] = useState('');
  const [fArea, setFArea] = useState('');
  const [fCidade, setFCidade] = useState('');
  const [fPermuta, setFPermuta] = useState(false);
  const [fPedida, setFPedida] = useState('');
  const [fVenda, setFVenda] = useState('');
  const [fResp, setFResp] = useState('');
  const [fCol, setFCol] = useState<KanbanCol>('em_aberto');
  const [fObs, setFObs] = useState('');
  const [fDocPref, setFDocPref] = useState<FileLink | undefined>();
  const [fDocLoc, setFDocLoc] = useState<FileLink | undefined>();
  const [fDocOutra, setFDocOutra] = useState<FileLink | undefined>();
  const refPref = useRef<HTMLInputElement>(null);
  const refLoc = useRef<HTMLInputElement>(null);
  const refOutra = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const members = db.members || [];
  const memberColor = (name?: string) => getMember(db as DB, name || '')?.color || '#94A3B8';
  const initials = (name?: string) => (name || '?').replace(/^(Arq\.|Eng\.|Coord\.|Dir\.|Ger\.|Dsgn\.|Mkt)\s+/i, '').split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase();

  // ── stats ──
  const stats = useMemo(() => {
    const active = viabs.filter(v => !isComplete(v));
    const overdue = viabs.filter(v => { const d = daysLeft(v); return !isComplete(v) && d != null && d < 0; });
    return {
      total: viabs.length,
      active: active.length,
      overdue: overdue.length,
      needsMercado: viabs.filter(v => !isComplete(v) && needsMercado(v)).length,
      byType: STUDY_TYPES.map(t => ({ ...t, count: viabs.filter(v => v.studyType === t.id).length })),
    };
  }, [viabs]);

  // ── filtro/busca ──
  const visible = useMemo(() => viabs.filter(v => {
    if (filter === 'atrasados') { const d = daysLeft(v); if (isComplete(v) || d == null || d >= 0) return false; }
    else if (filter !== 'all' && v.studyType !== filter) return false;
    if (search) {
      const t = search.toLowerCase();
      if (!((v.titulo || '').toLowerCase().includes(t) || v.address.toLowerCase().includes(t) || (v.cidade || '').toLowerCase().includes(t) || (v.responsavel || '').toLowerCase().includes(t))) return false;
    }
    return true;
  }), [viabs, filter, search]);

  const detail = viabs.find(v => v.id === detailId) || null;

  // ── mutações ──
  const updateViab = (id: string, patch: Partial<Viability>, log?: string) => {
    if (isViewer) return;
    setDb((prev: DB) => ({
      ...prev,
      viabilities: (prev.viabilities || []).map(v => v.id === id ? { ...v, ...patch } : v),
    }));
    if (log) addLog(currentUser?.name || 'SISTEMA', log);
  };

  const moveCol = (id: string, col: KanbanCol) => {
    updateViab(id, { kanbanStatus: col }, `VIABILIDADE MOVIDA: ${ALL_COLS.find(c => c.id === col)?.label.toUpperCase()}`);
  };

  const delViab = (id: string) => {
    if (isViewer) return;
    setDb((prev: DB) => ({ ...prev, viabilities: (prev.viabilities || []).filter(v => v.id !== id) }));
    setDetailId(null);
    addLog(currentUser?.name || 'SISTEMA', 'VIABILIDADE EXCLUÍDA');
    setNotification('Viabilidade excluída.');
  };

  const uploadDoc = async (e: React.ChangeEvent<HTMLInputElement>, set: (f: FileLink) => void) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const err = validateFileSize(file, 10);
    if (err) { setNotification(err); return; }
    try {
      setUploading(true);
      const path = await readFileAsDataURL(file);
      set({ label: file.name, path, author: currentUser?.name, createdAt: new Date().toISOString() });
    } catch {
      setNotification('Erro ao carregar arquivo.');
    } finally { setUploading(false); }
  };

  const resetForm = () => {
    setFType('viab'); setFNome(''); setFAddr(''); setFArea(''); setFCidade('');
    setFPermuta(false); setFPedida(''); setFVenda(''); setFResp(''); setFCol('em_aberto'); setFObs('');
    setFDocPref(undefined); setFDocLoc(undefined); setFDocOutra(undefined);
    setFormErr(''); setShowTeamPicker(false);
  };

  const saveStudy = () => {
    if (!fNome.trim()) { setFormErr('Informe o nome do estudo.'); return; }
    if (!fAddr.trim()) { setFormErr('Informe a localização / endereço.'); return; }
    if (!fDocPref) { setFormErr('Anexe o PDF da consulta de viabilidade da prefeitura.'); return; }
    if (!fDocLoc) { setFormErr('Anexe o arquivo de localização do terreno.'); return; }
    const t = STUDY_TYPES.find(x => x.id === fType)!;
    const nova: Viability = {
      id: `via-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      companyId,
      address: fAddr.trim(),
      titulo: fNome.trim(),
      responsavel: fResp || undefined,
      date: isoToday(),
      status: 'EM ANÁLISE',
      kanbanStatus: fCol,
      studyType: fType,
      areaM2: fArea.trim() || undefined,
      cidade: fCidade.trim() || undefined,
      aceitaPermuta: fPermuta,
      pedidaPct: fPermuta && fPedida ? parseFloat(fPedida) : undefined,
      vendaValor: fPermuta && fVenda ? parseFloat(fVenda) : undefined,
      deadline: addDays(t.days),
      pdfConsultaPrefeitura: fDocPref,
      pdfLocalizacao: fDocLoc,
      pdfEstudoTerceiro: fDocOutra,
      obs: fObs.trim() || undefined,
      versions: [],
      createdAt: new Date().toISOString(),
    };
    setDb((prev: DB) => ({ ...prev, viabilities: [...(prev.viabilities || []), nova] }));
    addLog(currentUser?.name || 'SISTEMA', `VIABILIDADE CRIADA: ${nova.titulo}`);
    setNotification(`Viabilidade criada — prazo ${t.days}d (${fdate(nova.deadline)})`);
    resetForm(); setShowAdd(false);
  };

  const suggestMercado = fType !== 'mercado' && !!fCidade && !BASE_CITIES.some(c => fCidade.toLowerCase().includes(c));

  const openFile = (f?: FileLink) => { if (f?.path) window.open(f.path, '_blank'); };

  // ── card ──
  const renderCard = (v: Viability) => {
    const t = typeOf(v);
    const dl = daysLeft(v);
    const pct = progressPct(v);
    const done = isComplete(v);
    const warn = !done && needsMercado(v);
    const overdue = !done && dl != null && dl < 0;
    return (
      <div
        key={v.id}
        draggable={!isViewer}
        onDragStart={() => setDragId(v.id)}
        onClick={() => setDetailId(v.id)}
        className={`bg-theme-card rounded-2xl p-3.5 border cursor-pointer shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all ${overdue ? 'border-red-400/50' : 'border-theme-divider'}`}
      >
        <div className="flex items-center justify-between mb-2">
          {t ? (
            <span className="font-square font-black text-[7.5px] tracking-[0.12em] px-2 py-1 rounded-md uppercase" style={{ background: t.color + '1A', color: t.color }}>{t.label} ~{t.days}d</span>
          ) : (
            <span className="font-square font-black text-[7.5px] tracking-[0.12em] px-2 py-1 rounded-md uppercase bg-theme-bg text-theme-textMuted">ESTUDO</span>
          )}
          {done ? (
            <span className="font-square font-black text-[7.5px] tracking-[0.1em] px-2 py-1 rounded-md uppercase bg-emerald-500/15 text-emerald-600">✓ FEITO</span>
          ) : dl != null && (
            <span className={`font-square font-black text-[7.5px] tracking-[0.1em] px-2 py-1 rounded-md uppercase ${dl < 0 ? 'bg-red-500/15 text-red-500' : dl <= 1 ? 'bg-amber-500/15 text-amber-600' : 'bg-theme-bg text-theme-textMuted'}`}>
              {dl < 0 ? `${-dl}D ATRASO` : dl === 0 ? 'HOJE' : `${dl}D`}
            </span>
          )}
        </div>

        {warn && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/25 mb-2">
            <span className="material-symbols-outlined text-[11px] text-emerald-500">public</span>
            <span className="font-square font-black text-[7px] tracking-[0.1em] text-emerald-600 uppercase">Est. Mercado necessário</span>
          </div>
        )}

        {v.titulo ? (
          <>
            <div className="text-[12.5px] font-bold text-theme-text leading-snug">{v.titulo}</div>
            <div className="text-[10.5px] text-theme-textMuted leading-snug">{v.address}</div>
          </>
        ) : (
          <div className="text-xs font-semibold text-theme-text leading-snug">{v.address}</div>
        )}
        <div className="text-[10.5px] text-theme-textMuted mt-0.5">{v.cidade}{v.areaM2 ? ` · ${v.areaM2} m²` : ''}</div>

        {v.aceitaPermuta && (
          <div className="flex items-center gap-1.5 mt-1.5 px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20">
            <span className="material-symbols-outlined text-[11px] text-emerald-500">swap_horiz</span>
            <span className="font-square font-black text-[7.5px] tracking-[0.1em] text-emerald-600 uppercase">
              Permuta{v.pedidaPct ? ` ${v.pedidaPct}%` : ''}{v.vendaValor ? ` · ${moneyBR(v.vendaValor)}` : ''}
            </span>
          </div>
        )}

        {!done && pct != null ? (
          <div className="mt-2.5">
            <div className="h-[3px] bg-theme-divider rounded-full overflow-hidden mb-1">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: overdue ? '#EF4444' : (t?.color || '#FF6B4A') }} />
            </div>
            <div className="flex justify-between items-center">
              <span className="font-square font-bold text-[8px] text-theme-textMuted">{pct}%</span>
              <span className={`font-square font-black text-[7.5px] uppercase ${overdue ? 'text-red-500' : 'text-theme-textMuted'}`}>{fdate(v.deadline)}</span>
            </div>
          </div>
        ) : !done && t && (
          <div className="mt-2.5 flex items-center gap-1.5 px-2 py-1.5 bg-theme-bg rounded-lg border border-dashed border-theme-divider">
            <span className="material-symbols-outlined text-[11px] text-theme-textMuted">schedule</span>
            <span className="font-square font-black text-[7.5px] tracking-[0.12em] text-theme-textMuted uppercase">~{t.days} dias estimados</span>
          </div>
        )}

        <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-theme-divider">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="w-5 h-5 rounded-full flex items-center justify-center text-[7px] font-black text-white shrink-0" style={{ background: memberColor(v.responsavel) }}>{initials(v.responsavel)}</div>
            <span className="text-[10px] text-theme-textMuted font-medium truncate">{(v.responsavel || '—').split(' ').slice(0, 2).join(' ')}</span>
          </div>
          {v.deadline && <span className="font-square font-bold text-[7.5px] text-theme-textMuted shrink-0">{fdate(v.deadline)}</span>}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/45 backdrop-blur-sm p-3 animate-fadeIn no-print" onClick={onClose}>
      <div className="bg-theme-bg w-full max-w-[1500px] h-[94vh] rounded-3xl border border-theme-divider shadow-2xl animate-scaleIn flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>

        {/* ── TOP BAR ── */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-theme-divider bg-theme-card/90 backdrop-blur-md shrink-0 flex-wrap">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-md" style={{ background: 'linear-gradient(135deg,#FF9966,#FF5E62)' }}>
            <span className="material-symbols-outlined text-white text-lg">domain</span>
          </div>
          <div className="leading-none shrink-0">
            <div className="font-square font-black text-[13px] tracking-[0.18em] text-theme-text">ENIGAMI</div>
            <div className="font-square font-black text-[6.5px] tracking-[0.35em] text-theme-orange uppercase mt-1">VIABILIDADES · {companyName.toUpperCase()}</div>
          </div>
          <div className="w-px h-6 bg-theme-divider mx-1 shrink-0" />
          <div className="flex gap-1.5 items-center flex-wrap">
            <span className="px-2.5 py-1 rounded-lg font-square font-black text-[8.5px] tracking-[0.12em] bg-theme-orange/10 border border-theme-orange/20 text-theme-orange whitespace-nowrap">{stats.active} ATIVOS</span>
            <span className="px-2.5 py-1 rounded-lg font-square font-black text-[8.5px] tracking-[0.12em] bg-red-500/10 border border-red-500/20 text-red-500 whitespace-nowrap">{stats.overdue} ATRASO</span>
            <span className="px-2.5 py-1 rounded-lg font-square font-black text-[8.5px] tracking-[0.12em] bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 whitespace-nowrap">{stats.needsMercado} C. DIFERENTE</span>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-2 px-3 py-2 bg-theme-bg border border-theme-divider rounded-xl w-[190px] shrink-0">
            <span className="material-symbols-outlined text-sm text-theme-textMuted">search</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar estudo..." className="bg-transparent text-xs text-theme-text outline-none w-full" />
          </div>
          {!isViewer && (
            <button onClick={() => { resetForm(); setShowAdd(true); }}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white font-square font-black text-[8.5px] tracking-[0.15em] uppercase shadow-lg shrink-0 hover:scale-[1.03] transition-transform"
              style={{ background: 'linear-gradient(135deg,#FF9966,#FF5E62)' }}>
              <span className="material-symbols-outlined text-sm">add</span>Nova Viabilidade
            </button>
          )}
          <button onClick={onClose} className="w-9 h-9 rounded-xl border border-theme-divider bg-theme-card flex items-center justify-center text-theme-textMuted hover:text-theme-text shrink-0">
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scroller p-5">
          {/* ── STAT CARDS ── */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
            <div className="rounded-[22px] p-5 text-white relative overflow-hidden shadow-lg" style={{ background: 'linear-gradient(135deg,#FF9966,#FF5E62)' }}>
              <div className="absolute -top-4 -right-4 w-20 h-20 bg-white/10 rounded-full" />
              <div className="font-square font-black text-[8px] tracking-[0.25em] opacity-85 uppercase mb-2">Total Ativos</div>
              <div className="font-square font-black text-4xl leading-none mb-1">{stats.active}</div>
              <div className="text-[11px] opacity-70">de {stats.total} registros</div>
            </div>
            <div className="rounded-[22px] p-5 relative overflow-hidden shadow-lg text-zinc-800" style={{ background: 'linear-gradient(135deg,#4AC29A,#BDFFF3)' }}>
              <div className="absolute -top-4 -right-4 w-20 h-20 bg-white/20 rounded-full" />
              <div className="font-square font-black text-[8px] tracking-[0.25em] opacity-70 uppercase mb-2">Precisam Mercado</div>
              <div className="font-square font-black text-4xl leading-none mb-1">{stats.needsMercado}</div>
              <div className="text-[11px] opacity-60">cidades fora da base</div>
            </div>
            <div className="rounded-[22px] p-5 bg-theme-card border-[1.5px] border-red-500/20 relative overflow-hidden shadow-md">
              <div className="absolute -top-4 -right-4 w-20 h-20 bg-red-500/5 rounded-full" />
              <div className="font-square font-black text-[8px] tracking-[0.25em] text-red-500 uppercase mb-2">Em Atraso</div>
              <div className="font-square font-black text-4xl leading-none text-red-500 mb-1">{stats.overdue}</div>
              <div className="text-[11px] text-theme-textMuted">requer atenção imediata</div>
            </div>
            <div className="rounded-[22px] p-5 bg-theme-card border border-theme-divider shadow-md">
              <div className="font-square font-black text-[8px] tracking-[0.25em] text-theme-textMuted uppercase mb-3">Por Tipo</div>
              <div className="flex flex-col gap-1.5">
                {stats.byType.map(t => (
                  <div key={t.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: t.color }} />
                      <span className="font-square font-black text-[8px] tracking-[0.12em] text-theme-text">{t.label} ~{t.days}d</span>
                    </div>
                    <span className="font-square font-black text-base" style={{ color: t.color }}>{t.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── FILTROS ── */}
          <div className="flex items-center gap-1.5 mb-4 flex-wrap">
            <span className="font-square font-black text-[8px] tracking-[0.22em] text-theme-textMuted uppercase mr-1">Filtro:</span>
            {([{ id: 'all', label: 'TODOS', color: '#374151' }] as { id: typeof filter; label: string; color: string }[])
              .concat(STUDY_TYPES.map(t => ({ id: t.id as typeof filter, label: t.label, color: t.color })))
              .concat([{ id: 'atrasados' as typeof filter, label: 'ATRASADOS', color: '#EF4444' }])
              .map(f => (
                <button key={f.id} onClick={() => setFilter(f.id)}
                  className="px-3 py-1.5 rounded-full font-square font-black text-[8px] tracking-[0.12em] uppercase border transition-all"
                  style={filter === f.id
                    ? { color: '#fff', background: f.color, borderColor: f.color }
                    : { color: '#9CA3AF', background: 'transparent', borderColor: 'var(--theme-divider, #E5E7EB)' }}>
                  {f.label}
                </button>
              ))}
          </div>

          {/* ── KANBAN ── */}
          <div className="overflow-x-auto scroller pb-4 -mx-5 px-5">
            <div className="flex gap-3 min-w-max items-start">
              {PHASES.map(phase => phase.cols.map((col, ci) => {
                const cards = visible.filter(v => (v.kanbanStatus || 'em_aberto') === col.id);
                return (
                  <div key={col.id} className="w-[256px] shrink-0 flex flex-col">
                    <div className="h-6 flex items-center gap-1.5 px-1 font-square font-black text-[7.5px] tracking-[0.22em] uppercase" style={{ color: col.color }}>
                      {ci === 0 && <><span className="w-[3px] h-[11px] rounded-sm" style={{ background: col.color }} />{phase.phase}</>}
                    </div>
                    <div
                      onDragOver={e => { e.preventDefault(); setDragOver(col.id); }}
                      onDragLeave={() => setDragOver(d => d === col.id ? null : d)}
                      onDrop={() => { if (dragId) moveCol(dragId, col.id); setDragId(null); setDragOver(null); }}
                      className={`rounded-2xl border transition-all ${dragOver === col.id ? 'border-theme-orange bg-theme-orange/5' : 'border-theme-divider bg-theme-card/50'}`}
                    >
                      <div className="flex items-center justify-between px-3.5 pt-3 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ background: col.color }} />
                          <span className="font-square font-black text-[8.5px] tracking-[0.2em] uppercase text-theme-text">{col.label}</span>
                        </div>
                        <span className="font-square font-black text-[9px] px-1.5 py-0.5 rounded-md" style={{ background: col.color + '1A', color: col.color }}>{cards.length}</span>
                      </div>
                      <div className="h-px bg-theme-divider mx-3" />
                      <div className="p-2.5 flex flex-col gap-2 min-h-[100px]">
                        {cards.map(v => renderCard(v))}
                        {cards.length === 0 && <div className="text-center py-4 text-theme-textMuted/50 text-[11px] font-medium">Vazio</div>}
                        {!isViewer && (
                          <button onClick={() => { resetForm(); setFCol(col.id); setShowAdd(true); }}
                            className="w-full py-2 border-[1.5px] border-dashed border-theme-divider rounded-xl text-theme-textMuted font-square font-black text-[7.5px] tracking-[0.2em] uppercase hover:border-theme-orange hover:text-theme-orange transition-all">
                            + Adicionar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }))}
            </div>
          </div>
        </div>

        {/* ═══ MODAL: NOVA VIABILIDADE ═══ */}
        {showAdd && (
          <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/45 backdrop-blur-sm p-4" onClick={() => setShowAdd(false)}>
            <div className="bg-theme-card rounded-3xl w-[540px] max-w-full max-h-[92vh] overflow-y-auto scroller shadow-2xl animate-scaleIn" onClick={e => e.stopPropagation()}>
              <div className="flex items-start justify-between p-6 pb-0">
                <div>
                  <div className="font-square font-black text-[15px] tracking-[0.1em] text-theme-text uppercase">Nova Viabilidade</div>
                  <div className="text-xs text-theme-textMuted mt-1">Cadastrar terreno para análise</div>
                </div>
                <button onClick={() => setShowAdd(false)} className="w-8 h-8 rounded-lg border border-theme-divider flex items-center justify-center text-theme-textMuted hover:text-theme-text">
                  <span className="material-symbols-outlined text-base">close</span>
                </button>
              </div>

              <div className="p-6 pt-4 flex flex-col gap-4">
                {/* TIPO */}
                <div>
                  <div className={microLabel}>Tipo de Estudo</div>
                  <div className="grid grid-cols-4 gap-2">
                    {STUDY_TYPES.map(t => (
                      <button key={t.id} onClick={() => setFType(t.id)}
                        className="py-2.5 rounded-xl border-[1.5px] font-square font-black text-[8.5px] tracking-[0.1em] uppercase transition-all"
                        style={fType === t.id
                          ? { background: t.color + '14', borderColor: t.color, color: t.color }
                          : { background: 'transparent', borderColor: 'var(--theme-divider, #E5E7EB)', color: '#9CA3AF' }}>
                        <div>{t.label}</div>
                        <div className="text-[7px] opacity-70 mt-0.5">~{t.days} dias</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* IDENTIFICAÇÃO */}
                <div>
                  <div className={microLabel}>Nome do Estudo <span className="text-red-500">*</span></div>
                  <input className={inputCls} value={fNome} onChange={e => setFNome(e.target.value)} placeholder="Ex: Área São José — Rua das Flores" />
                </div>
                <div>
                  <div className={microLabel}>Localização / Endereço <span className="text-red-500">*</span></div>
                  <input className={inputCls} value={fAddr} onChange={e => setFAddr(e.target.value)} placeholder="Rua, Bairro, Cidade — UF" />
                </div>

                {/* DOCUMENTOS */}
                <div className="flex flex-col gap-2.5">
                  <div className={microLabel + ' mb-0'}>Documentos</div>
                  <DocZone label="PDF — Consulta de viabilidade da prefeitura" required file={fDocPref} accept=".pdf" inputRef={refPref}
                    onPick={() => refPref.current?.click()} onChange={e => uploadDoc(e, setFDocPref)} />
                  <DocZone label="Arquivo — Localização do terreno" required file={fDocLoc} accept=".pdf,.jpg,.jpeg,.png,.kml" inputRef={refLoc}
                    onPick={() => refLoc.current?.click()} onChange={e => uploadDoc(e, setFDocLoc)} />
                  <DocZone label="PDF — Estudo de outra construtora" file={fDocOutra} accept=".pdf" inputRef={refOutra}
                    onPick={() => refOutra.current?.click()} onChange={e => uploadDoc(e, setFDocOutra)} />
                </div>

                {/* DADOS DO TERRENO */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className={microLabel}>Área (m²)</div>
                    <input className={inputCls} value={fArea} onChange={e => setFArea(e.target.value)} placeholder="2.651,95" />
                  </div>
                  <div>
                    <div className={microLabel}>Cidade / Município</div>
                    <input className={inputCls} value={fCidade} onChange={e => setFCidade(e.target.value)} placeholder="Balneário Camboriú" />
                  </div>
                </div>

                {/* PERMUTA */}
                <div onClick={() => setFPermuta(p => !p)}
                  className="flex items-center justify-between px-3.5 py-3 bg-theme-bg rounded-xl border-[1.5px] border-theme-divider cursor-pointer">
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-lg text-emerald-500">swap_horiz</span>
                    <span className="font-square font-black text-[9px] tracking-[0.15em] text-theme-text uppercase">Aceita Permuta</span>
                  </div>
                  <div className={`w-10 h-[22px] rounded-full p-0.5 transition-colors ${fPermuta ? 'bg-emerald-500' : 'bg-theme-divider'}`}>
                    <div className={`w-[18px] h-[18px] rounded-full bg-white shadow transition-transform ${fPermuta ? 'translate-x-[18px]' : ''}`} />
                  </div>
                </div>
                {fPermuta && (
                  <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 -mt-1">
                    <div>
                      <div className="font-square font-black text-[7.5px] tracking-[0.15em] text-emerald-600 uppercase mb-1.5">Pedida (%)</div>
                      <input type="number" className={inputCls} value={fPedida} onChange={e => setFPedida(e.target.value)} placeholder="20" />
                    </div>
                    <div>
                      <div className="font-square font-black text-[7.5px] tracking-[0.15em] text-emerald-600 uppercase mb-1.5">Venda (R$)</div>
                      <input type="number" className={inputCls} value={fVenda} onChange={e => setFVenda(e.target.value)} placeholder="8500000" />
                    </div>
                  </div>
                )}

                {suggestMercado && (
                  <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-emerald-500/10 border-[1.5px] border-emerald-500/30 -mt-1">
                    <span className="material-symbols-outlined text-base text-emerald-500">info</span>
                    <span className="text-xs text-theme-text">Cidade fora da base — considere usar <strong>MERCADO</strong> (~25d).</span>
                  </div>
                )}

                {/* RESPONSÁVEL + COLUNA */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <div className={microLabel}>Responsável</div>
                    <div onClick={() => setShowTeamPicker(p => !p)} className={inputCls + ' flex items-center gap-2 cursor-pointer'}>
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: memberColor(fResp) }} />
                      <span className="flex-1 truncate">{fResp || 'Selecionar...'}</span>
                      <span className="material-symbols-outlined text-base text-theme-textMuted">expand_more</span>
                    </div>
                    {showTeamPicker && (
                      <div className="absolute top-full mt-1 left-0 right-0 bg-theme-card border-[1.5px] border-theme-divider rounded-xl shadow-2xl z-[200] overflow-hidden max-h-52 overflow-y-auto scroller">
                        {members.length === 0 && <div className="px-3 py-2.5 text-xs text-theme-textMuted">Nenhum membro — cadastre a equipe.</div>}
                        {members.map(m => (
                          <div key={m.name} onClick={() => { setFResp(m.name); setShowTeamPicker(false); }}
                            className="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer hover:bg-theme-highlight transition-colors">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: m.color || '#94A3B8' }} />
                            <div className="min-w-0">
                              <div className="text-[13px] font-semibold text-theme-text truncate">{m.name}</div>
                              <div className="text-[10px] text-theme-textMuted">{m.role || 'Colaborador'}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className={microLabel}>Coluna Inicial</div>
                    <select className={inputCls + ' cursor-pointer'} value={fCol} onChange={e => setFCol(e.target.value as KanbanCol)}>
                      {ALL_COLS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </select>
                  </div>
                </div>

                {/* OBS */}
                <div>
                  <div className={microLabel}>Observações</div>
                  <textarea rows={3} className={inputCls + ' resize-none'} value={fObs} onChange={e => setFObs(e.target.value)} placeholder="Notas, reuniões agendadas, status atual..." />
                </div>

                {formErr && <p className="text-[11px] font-bold text-red-500">{formErr}</p>}

                <div className="flex gap-2.5">
                  <button onClick={() => setShowAdd(false)} className="px-5 py-3 bg-theme-bg border-[1.5px] border-theme-divider rounded-2xl text-theme-textMuted font-square font-black text-[9px] tracking-[0.18em] uppercase">Cancelar</button>
                  <button onClick={saveStudy} disabled={uploading}
                    className="flex-1 py-3 rounded-2xl text-white font-square font-black text-[10px] tracking-[0.2em] uppercase shadow-lg disabled:opacity-60"
                    style={{ background: 'linear-gradient(135deg,#FF9966,#FF5E62)' }}>
                    {uploading ? 'Carregando arquivo…' : 'Salvar Viabilidade'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ MODAL: DETALHE ═══ */}
        {detail && (() => {
          const t = typeOf(detail);
          const dl = daysLeft(detail);
          const pct = progressPct(detail);
          const done = isComplete(detail);
          return (
            <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setDetailId(null)}>
              <div className="bg-theme-card rounded-3xl p-7 w-[500px] max-w-full max-h-[90vh] overflow-y-auto scroller shadow-2xl animate-scaleIn" onClick={e => e.stopPropagation()}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    {t && <span className="font-square font-black text-[8px] tracking-[0.12em] px-2.5 py-1 rounded-md uppercase" style={{ background: t.color + '1A', color: t.color }}>{t.label} · {t.nome} ~{t.days}d</span>}
                    <div className="font-bold text-lg text-theme-text mt-2.5 leading-snug">{detail.titulo || detail.address}</div>
                    {detail.titulo && <div className="text-xs text-theme-textMuted mt-0.5">{detail.address}</div>}
                    <div className="text-xs text-theme-textMuted mt-0.5">{detail.cidade}{detail.areaM2 ? ` · ${detail.areaM2} m²` : ''}</div>
                  </div>
                  <button onClick={() => setDetailId(null)} className="w-8 h-8 rounded-lg border border-theme-divider flex items-center justify-center text-theme-textMuted hover:text-theme-text shrink-0 ml-3">
                    <span className="material-symbols-outlined text-base">close</span>
                  </button>
                </div>

                {detail.aceitaPermuta && (
                  <div className="flex items-center gap-3 px-3.5 py-3 rounded-2xl bg-emerald-500/10 border-[1.5px] border-emerald-500/25 mb-3.5">
                    <span className="material-symbols-outlined text-xl text-emerald-500 shrink-0">swap_horiz</span>
                    <div className="flex gap-4 flex-wrap">
                      <div><div className="font-square font-black text-[7px] tracking-[0.15em] text-emerald-600 uppercase">Aceita Permuta</div><div className="text-xs font-semibold text-theme-text mt-0.5">Sim</div></div>
                      {detail.pedidaPct != null && <div><div className="font-square font-black text-[7px] tracking-[0.15em] text-emerald-600 uppercase">Pedida</div><div className="text-xs font-semibold text-theme-text mt-0.5">{detail.pedidaPct}%</div></div>}
                      {detail.vendaValor != null && <div><div className="font-square font-black text-[7px] tracking-[0.15em] text-emerald-600 uppercase">Venda</div><div className="text-xs font-semibold text-theme-text mt-0.5">{moneyBR(detail.vendaValor)}</div></div>}
                    </div>
                  </div>
                )}

                {needsMercado(detail) && !done && (
                  <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 mb-3.5">
                    <span className="material-symbols-outlined text-base text-emerald-500">public</span>
                    <span className="text-xs text-theme-text">Cidade fora da base de atuação — <strong>estudo de mercado recomendado</strong>.</span>
                  </div>
                )}

                {detail.deadline && (
                  <div className="p-3.5 rounded-2xl bg-theme-bg border border-theme-divider mb-3.5">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="font-square font-black text-[8px] tracking-[0.18em] text-theme-textMuted uppercase">Prazo de Entrega</span>
                      <span className={`font-square font-black text-[9px] uppercase ${done ? 'text-emerald-500' : (dl != null && dl < 0 ? 'text-red-500' : 'text-theme-text')}`}>
                        {done ? '✓ Concluído' : dl != null ? (dl < 0 ? `${-dl} dias de atraso` : dl === 0 ? 'Entrega hoje' : `${dl} dias restantes`) : ''} · {fdate(detail.deadline)}
                      </span>
                    </div>
                    {pct != null && !done && (
                      <div className="h-1 bg-theme-divider rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: dl != null && dl < 0 ? '#EF4444' : (t?.color || '#FF6B4A') }} />
                      </div>
                    )}
                  </div>
                )}

                <div className="mb-3.5">
                  <div className="font-square font-black text-[8px] tracking-[0.18em] text-theme-textMuted uppercase mb-2">Documentos</div>
                  <div className="flex flex-col gap-1.5">
                    {[{ f: detail.pdfConsultaPrefeitura, l: 'Consulta prefeitura' }, { f: detail.pdfLocalizacao, l: 'Localização do terreno' }, { f: detail.pdfEstudoTerceiro, l: 'Estudo de outra construtora' }].map((d, i) => d.f ? (
                      <button key={i} onClick={() => openFile(d.f)} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-theme-bg border border-theme-divider hover:border-theme-orange transition-all text-left group">
                        <span className="material-symbols-outlined text-base text-theme-cyan">picture_as_pdf</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] font-bold text-theme-text truncate group-hover:text-theme-orange transition-colors">{d.f.label}</div>
                          <div className="text-[9px] text-theme-textMuted uppercase font-black tracking-wider">{d.l}</div>
                        </div>
                        <span className="material-symbols-outlined text-sm text-theme-textMuted">open_in_new</span>
                      </button>
                    ) : null)}
                  </div>
                </div>

                {detail.obs && (
                  <div className="mb-3.5">
                    <div className="font-square font-black text-[8px] tracking-[0.18em] text-theme-textMuted uppercase mb-1.5">Observações</div>
                    <p className="text-xs text-theme-text leading-relaxed bg-theme-bg rounded-xl px-3.5 py-3 border border-theme-divider">{detail.obs}</p>
                  </div>
                )}

                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black text-white shrink-0" style={{ background: memberColor(detail.responsavel) }}>{initials(detail.responsavel)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-theme-text truncate">{detail.responsavel || 'Sem responsável'}</div>
                    <div className="text-[9px] text-theme-textMuted uppercase font-black tracking-wider">criado em {fdate(detail.createdAt)}</div>
                  </div>
                  {!isViewer && (
                    <select className="bg-theme-bg border border-theme-divider rounded-xl px-2.5 py-2 text-[11px] text-theme-text outline-none cursor-pointer max-w-[150px]"
                      value={detail.responsavel || ''} onChange={e => updateViab(detail.id, { responsavel: e.target.value || undefined })}>
                      <option value="">— Responsável —</option>
                      {members.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
                    </select>
                  )}
                </div>

                {!isViewer && (
                  <div className="flex gap-2.5">
                    <select className={inputCls + ' cursor-pointer flex-1'} value={detail.kanbanStatus || 'em_aberto'} onChange={e => moveCol(detail.id, e.target.value as KanbanCol)}>
                      {ALL_COLS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </select>
                    <button onClick={() => delViab(detail.id)} className="px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 font-square font-black text-[9px] tracking-[0.15em] uppercase hover:bg-red-500 hover:text-white transition-all">
                      Excluir
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};

export default ViabilidadesPanel;
