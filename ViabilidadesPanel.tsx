// ╔══════════════════════════════════════════════════════════════════╗
// ║  ViabilidadesPanel.tsx — Kanban completo com upload de PDFs     ║
// ║  Integrado com useApp() · Substitui o painel anterior           ║
// ╚══════════════════════════════════════════════════════════════════╝

import React, { useState, useRef, useCallback } from 'react';
import { FileLink } from '../types';
import { useApp } from '../contexts/AppContext';
import { readFileAsDataURL } from '../utils/fileReaderUtils';
import { validateFileSize } from '../utils/validation';

// ── Colunas do Kanban ──────────────────────────────────────────────────────
const COLS = [
  { id: 'em_aberto',           label: 'Em Aberto',                tw: 'text-gray-400',    border: 'border-l-gray-400',    headerBorder: 'border-b-gray-400/60',    dot: 'bg-gray-400'    },
  { id: 'a_fazer',             label: 'A Fazer',                  tw: 'text-blue-400',    border: 'border-l-blue-400',    headerBorder: 'border-b-blue-400/60',    dot: 'bg-blue-400'    },
  { id: 'estudos_finalizados', label: 'Estudos Finalizados',      tw: 'text-emerald-400', border: 'border-l-emerald-400', headerBorder: 'border-b-emerald-400/60', dot: 'bg-emerald-400' },
  { id: 'dados_permuta',       label: 'Dados Intenção Permuta',   tw: 'text-amber-400',   border: 'border-l-amber-400',   headerBorder: 'border-b-amber-400/60',   dot: 'bg-amber-400'   },
  { id: 'contratos',           label: 'Contratos',                tw: 'text-pink-400',    border: 'border-l-pink-400',    headerBorder: 'border-b-pink-400/60',    dot: 'bg-pink-400'    },
  { id: 'contratos_assinados', label: 'Contratos Assinados',      tw: 'text-green-400',   border: 'border-l-green-400',   headerBorder: 'border-b-green-400/60',   dot: 'bg-green-400'   },
] as const;

type KanbanStatus = typeof COLS[number]['id'];

// ── Tipo Estendido de Viabilidade ──────────────────────────────────────────
// Adicione estes campos à interface Viability em types.ts:
//   titulo?: string;
//   responsavel?: string;
//   kanbanStatus?: KanbanStatus;
//   pdfConsultaPrefeitura?: FileLink;  // Obrigatório ao criar
//   pdfLocalizacao?: FileLink;          // Obrigatório ao criar
//   pdfEstudoTerceiro?: FileLink;       // Opcional
//   obs?: string;
interface ExtViab {
  id: string;
  companyId: number;
  address: string;
  titulo?: string;
  responsavel?: string;
  date: string;
  status: 'VIÁVEL' | 'STAND BY' | 'EM ANÁLISE' | 'NÃO INICIADO';
  kanbanStatus?: KanbanStatus;
  pdfConsultaPrefeitura?: FileLink;
  pdfLocalizacao?: FileLink;
  pdfEstudoTerceiro?: FileLink;
  pdfSummary?: FileLink;
  obs?: string;
  versions: { id: string; version: number; date: string; notes?: string; pdfAttachment?: FileLink }[];
  createdAt: string;
}

const EMPTY_FORM = {
  titulo: '',
  address: '',
  responsavel: '',
  date: new Date().toISOString().slice(0, 10),
  kanbanStatus: 'em_aberto' as KanbanStatus,
  pdfConsultaPrefeitura: null as FileLink | null,
  pdfLocalizacao: null as FileLink | null,
  pdfEstudoTerceiro: null as FileLink | null,
  obs: '',
};

// ── Props ──────────────────────────────────────────────────────────────────
interface ViabilidadesPanelProps {
  companyId: number;
  companyName: string;
  // Props legadas abaixo — mantidas para compatibilidade com App.tsx atual
  // Podem ser removidas quando App.tsx for atualizado
  isOpen?: boolean;
  onClose?: () => void;
  viabilities?: ExtViab[];
  onAdd?: (v: any) => void;
  onDelete?: (id: string) => void;
  onAddVersion?: (viabilityId: string, version: any) => void;
  onUpdateStatus?: (id: string, status: ExtViab['status']) => void;
}

// ══════════════════════════════════════════════════════════════════════════
export const ViabilidadesPanel: React.FC<ViabilidadesPanelProps> = ({
  companyId,
  companyName,
onClose,
}) => {
  const { db, setDb, currentUser, setNotification, addLog } = useApp();

  // Viabilidades desta empresa
  const viabs = ((db as any).viabilities || []).filter(
    (v: ExtViab) => v.companyId === companyId
  ) as ExtViab[];

  const [showNew, setShowNew]     = useState(false);
  const [detail, setDetail]       = useState<ExtViab | null>(null);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [errs, setErrs]           = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [dragId, setDragId]       = useState<string | null>(null);
  const [dragOver, setDragOver]   = useState<string | null>(null);
  const [search, setSearch]       = useState('');

  const refConsulta = useRef<HTMLInputElement>(null);
  const refLoc      = useRef<HTMLInputElement>(null);
  const refEstudo   = useRef<HTMLInputElement>(null);

  // Helpers
  const col    = (id?: string) => COLS.find(c => c.id === id) || COLS[0];
  const byCol  = (colId: string) =>
    viabs.filter(v => {
      const matchCol = (v.kanbanStatus || 'em_aberto') === colId;
      const matchSearch = !search ||
        (v.titulo || v.address).toLowerCase().includes(search.toLowerCase()) ||
        (v.responsavel || '').toLowerCase().includes(search.toLowerCase());
      return matchCol && matchSearch;
    });

  // ── Upload de arquivo ────────────────────────────────────────────────────
  const uploadFile = useCallback(async (
    field: 'pdfConsultaPrefeitura' | 'pdfLocalizacao' | 'pdfEstudoTerceiro',
    file: File
  ) => {
    const err = validateFileSize(file, 10);
    if (err) { setNotification(err); return; }
    try {
      setUploading(true);
      const path = await readFileAsDataURL(file);
      const fl: FileLink = {
        label: file.name,
        path,
        author: currentUser?.name,
        createdAt: new Date().toISOString(),
      };
      setForm(f => ({ ...f, [field]: fl }));
    } catch {
      setNotification('Erro ao carregar arquivo. Tente novamente.');
    } finally {
      setUploading(false);
    }
  }, [currentUser, setNotification]);

  // ── Validação ────────────────────────────────────────────────────────────
  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.titulo.trim())              e.titulo    = 'Obrigatório';
    if (!form.address.trim())             e.address   = 'Obrigatório';
    if (!form.pdfConsultaPrefeitura)      e.consulta  = 'Arquivo obrigatório';
    if (!form.pdfLocalizacao)             e.localizacao = 'Arquivo obrigatório';
    return e;
  };

  // ── Salvar nova viabilidade ──────────────────────────────────────────────
  const handleSave = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrs(e); return; }

    const nova: ExtViab = {
      id: `via-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      companyId,
      address: form.address,
      titulo: form.titulo,
      responsavel: form.responsavel || undefined,
      date: form.date,
      status: 'NÃO INICIADO',
      kanbanStatus: form.kanbanStatus,
      pdfConsultaPrefeitura: form.pdfConsultaPrefeitura || undefined,
      pdfLocalizacao: form.pdfLocalizacao || undefined,
      pdfEstudoTerceiro: form.pdfEstudoTerceiro || undefined,
      obs: form.obs || undefined,
      versions: [],
      createdAt: new Date().toISOString(),
    };

    setDb(prev => ({
      ...prev,
      viabilities: [...((prev as any).viabilities || []), nova],
    }));

    addLog(currentUser?.name || 'SISTEMA', `VIABILIDADE CRIADA: ${form.titulo}`);
    setNotification('Viabilidade criada com sucesso!');
    setShowNew(false);
    setForm(EMPTY_FORM);
    setErrs({});
  };

  // ── Mover coluna ─────────────────────────────────────────────────────────
  const move = (id: string, to: KanbanStatus) => {
    setDb(prev => ({
      ...prev,
      viabilities: ((prev as any).viabilities || []).map((v: ExtViab) =>
        v.id === id ? { ...v, kanbanStatus: to } : v
      ),
    }));
    setDetail(d => d ? { ...d, kanbanStatus: to } : null);
    addLog(currentUser?.name || 'SISTEMA', `VIABILIDADE MOVIDA: ${col(to).label.toUpperCase()}`);
  };

  // ── Excluir ──────────────────────────────────────────────────────────────
  const del = (id: string) => {
    setDb(prev => ({
      ...prev,
      viabilities: ((prev as any).viabilities || []).filter((v: ExtViab) => v.id !== id),
    }));
    setDetail(null);
    addLog(currentUser?.name || 'SISTEMA', 'VIABILIDADE EXCLUÍDA');
    setNotification('Viabilidade excluída.');
  };

  // ── Zona de Upload (componente interno) ───────────────────────────────────
  const UploadZone = ({
    label, field, refEl, required, file, error,
  }: {
    label: string;
    field: 'pdfConsultaPrefeitura' | 'pdfLocalizacao' | 'pdfEstudoTerceiro';
    refEl: React.RefObject<HTMLInputElement>;
    required?: boolean;
    file: FileLink | null;
    error?: string;
  }) => (
    <div>
      <p className="text-xs font-semibold text-theme-textMuted uppercase tracking-wide mb-1">
        {label}
        {required ? <span className="text-red-400 ml-1">*</span> : (
          <span className="text-theme-textMuted font-normal normal-case tracking-normal ml-1">(opcional)</span>
        )}
      </p>
      <input
        ref={refEl} type="file" accept=".pdf,.png,.jpg,.jpeg,.kml"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(field, f); e.target.value = ''; }}
      />
      <div
        onClick={() => refEl.current?.click()}
        className={[
          'border border-dashed rounded-lg p-3 text-center cursor-pointer transition-all select-none',
          file
            ? 'border-emerald-500/50 bg-emerald-500/5'
            : error
              ? 'border-red-500/50 bg-red-500/5'
              : 'border-theme-border hover:border-theme-textMuted/60 bg-theme-card/50',
        ].join(' ')}
      >
        {file
          ? <p className="text-sm text-emerald-400 font-medium truncate">✓ {file.label}</p>
          : <p className="text-sm text-theme-textMuted">📄 Clique para selecionar</p>}
      </div>
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );

  // ════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════
  return (
    <div className="flex flex-col h-full">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-theme-border shrink-0">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-sm font-semibold text-theme-text leading-none">Viabilidades</h2>
            <p className="text-xs text-theme-textMuted mt-0.5">{companyName} · {viabs.length} registro(s)</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
{onClose && (
                <button
                  onClick={onClose}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-theme-border hover:border-red-400/40 hover:text-red-400 text-theme-textMuted rounded-lg text-xs font-semibold transition-colors"
                >
                  <span className="material-symbols-outlined text-base leading-none">arrow_back</span>
                  Voltar
                </button>
              )}
                        {/* Busca */}
          <div className="relative">
            <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-theme-textMuted text-base">search</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="pl-7 pr-3 py-1.5 text-xs bg-theme-card border border-theme-border rounded-lg text-theme-text outline-none focus:border-emerald-500 w-40"
            />
          </div>
          {/* Botão nova */}
          <button
            onClick={() => { setForm(EMPTY_FORM); setErrs({}); setShowNew(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            <span className="material-symbols-outlined text-base">add</span>
            Nova Viabilidade
          </button>
        </div>
      </div>

      {/* ── Stats rápidas ────────────────────────────────────────────────── */}
      <div className="flex gap-2 px-5 py-2 border-b border-theme-border shrink-0 overflow-x-auto">
        {COLS.map(c => {
          const n = byCol(c.id).length;
          return (
            <div key={c.id} className="flex items-center gap-1.5 shrink-0">
              <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
              <span className="text-xs text-theme-textMuted">{c.label}</span>
              <span className={`text-xs font-semibold ${c.tw}`}>{n}</span>
            </div>
          );
        })}
      </div>

      {/* ── Kanban Board ─────────────────────────────────────────────────── */}
      <div className="flex gap-3 p-4 overflow-x-auto flex-1 items-start">
        {COLS.map(c => {
          const cards = byCol(c.id);
          return (
            <div
              key={c.id}
              className={`flex-none w-[220px] rounded-xl border border-theme-border bg-theme-card transition-colors ${dragOver === c.id ? 'ring-1 ring-emerald-500/30' : ''}`}
              onDragOver={e => { e.preventDefault(); setDragOver(c.id); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={() => { if (dragId) { move(dragId, c.id); setDragId(null); setDragOver(null); } }}
            >
              {/* Cabeçalho da coluna */}
              <div className={`flex items-center justify-between px-3 py-2.5 border-b-2 ${c.headerBorder}`}>
                <span className={`text-[10px] font-bold uppercase tracking-wider leading-tight ${c.tw}`}>
                  {c.label}
                </span>
                <span className="text-xs bg-theme-bg px-1.5 py-0.5 rounded text-theme-textMuted font-medium">
                  {cards.length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex flex-col gap-2 p-2">
                {cards.length === 0 && (
                  <p className="text-xs text-center text-theme-textMuted py-4 opacity-50">Vazio</p>
                )}
                {cards.map(v => (
                  <div
                    key={v.id}
                    draggable
                    onDragStart={() => setDragId(v.id)}
                    onDragEnd={() => { setDragId(null); setDragOver(null); }}
                    onClick={() => setDetail(v)}
                    className={`bg-theme-bg border border-l-[3px] border-theme-border rounded-lg p-2.5 cursor-pointer hover:border-theme-textMuted/40 transition-all group ${c.border}`}
                  >
                    <p className="text-xs font-semibold text-theme-text leading-snug mb-0.5">
                      {v.titulo || v.address}
                    </p>
                    {v.titulo && (
                      <p className="text-[11px] text-theme-textMuted mb-1.5 truncate">
                        📍 {v.address}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1 mb-1">
                      {v.pdfConsultaPrefeitura && (
                        <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-400/20 rounded px-1 py-0.5 leading-none">
                          Consulta
                        </span>
                      )}
                      {v.pdfLocalizacao && (
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-400/20 rounded px-1 py-0.5 leading-none">
                          Mapa
                        </span>
                      )}
                      {v.pdfEstudoTerceiro && (
                        <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-400/20 rounded px-1 py-0.5 leading-none">
                          Estudo
                        </span>
                      )}
                    </div>
                    {v.responsavel && (
                      <p className="text-[11px] text-theme-textMuted">👤 {v.responsavel}</p>
                    )}
                    {v.obs && (
                      <p className="text-[11px] text-theme-textMuted/70 italic mt-0.5 truncate">
                        "{v.obs}"
                      </p>
                    )}
                    {/* Data */}
                    <p className="text-[10px] text-theme-textMuted/50 mt-1">
                      {new Date(v.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                ))}

                {/* Botão adicionar nesta coluna */}
                <button
                  onClick={() => { setForm({ ...EMPTY_FORM, kanbanStatus: c.id }); setErrs({}); setShowNew(true); }}
                  className="w-full border border-dashed border-theme-border rounded-lg py-1.5 text-[11px] text-theme-textMuted hover:text-theme-text hover:border-theme-textMuted/40 transition-all"
                >
                  + Adicionar
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          MODAL — Nova Viabilidade
      ════════════════════════════════════════════════════════════════════ */}
      {showNew && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowNew(false); }}
        >
          <div className="bg-theme-card border border-theme-border rounded-xl p-5 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Header modal */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-theme-text">Nova Viabilidade</h3>
              <button onClick={() => setShowNew(false)} className="text-theme-textMuted hover:text-theme-text text-xl leading-none">×</button>
            </div>

            <div className="flex flex-col gap-3.5">
              {/* Nome do estudo */}
              <div>
                <label className="text-[11px] font-semibold text-theme-textMuted uppercase tracking-wide mb-1 block">
                  Nome do Estudo <span className="text-red-400">*</span>
                </label>
                <input
                  className={`w-full bg-theme-bg border rounded-lg px-3 py-2 text-sm text-theme-text outline-none focus:border-emerald-500 transition-colors ${errs.titulo ? 'border-red-500' : 'border-theme-border'}`}
                  value={form.titulo}
                  placeholder="Ex: Área São José — Rua das Flores"
                  onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                />
                {errs.titulo && <p className="text-[11px] text-red-400 mt-1">{errs.titulo}</p>}
              </div>

              {/* Localização */}
              <div>
                <label className="text-[11px] font-semibold text-theme-textMuted uppercase tracking-wide mb-1 block">
                  Localização / Endereço <span className="text-red-400">*</span>
                </label>
                <input
                  className={`w-full bg-theme-bg border rounded-lg px-3 py-2 text-sm text-theme-text outline-none focus:border-emerald-500 transition-colors ${errs.address ? 'border-red-500' : 'border-theme-border'}`}
                  value={form.address}
                  placeholder="Rua, Bairro, Cidade — UF"
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                />
                {errs.address && <p className="text-[11px] text-red-400 mt-1">{errs.address}</p>}
              </div>

              {/* ── PDFs ── */}
              <div className="border border-theme-border rounded-lg p-3 flex flex-col gap-3">
                <p className="text-[11px] font-bold text-theme-textMuted uppercase tracking-wider">Documentos</p>

                {/* Consulta da Prefeitura (OBRIGATÓRIO) */}
                <UploadZone
                  label="PDF — Consulta de Viabilidade da Prefeitura"
                  field="pdfConsultaPrefeitura"
                  refEl={refConsulta}
                  required
                  file={form.pdfConsultaPrefeitura}
                  error={errs.consulta}
                />

                {/* Localização do Terreno (OBRIGATÓRIO) */}
                <UploadZone
                  label="Arquivo — Localização do Terreno"
                  field="pdfLocalizacao"
                  refEl={refLoc}
                  required
                  file={form.pdfLocalizacao}
                  error={errs.localizacao}
                />

                {/* Estudo outra construtora (OPCIONAL) */}
                <UploadZone
                  label="PDF — Estudo de Outra Construtora"
                  field="pdfEstudoTerceiro"
                  refEl={refEstudo}
                  file={form.pdfEstudoTerceiro}
                />
              </div>

              {/* Responsável + Coluna inicial */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-semibold text-theme-textMuted uppercase tracking-wide mb-1 block">Responsável</label>
                  <input
                    className="w-full bg-theme-bg border border-theme-border rounded-lg px-3 py-2 text-sm text-theme-text outline-none focus:border-emerald-500"
                    value={form.responsavel}
                    placeholder="Nome"
                    onChange={e => setForm(f => ({ ...f, responsavel: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-theme-textMuted uppercase tracking-wide mb-1 block">Coluna Inicial</label>
                  <select
                    className="w-full bg-theme-bg border border-theme-border rounded-lg px-3 py-2 text-sm text-theme-text outline-none focus:border-emerald-500"
                    value={form.kanbanStatus}
                    onChange={e => setForm(f => ({ ...f, kanbanStatus: e.target.value as KanbanStatus }))}
                  >
                    {COLS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Observações */}
              <div>
                <label className="text-[11px] font-semibold text-theme-textMuted uppercase tracking-wide mb-1 block">Observações</label>
                <textarea
                  className="w-full bg-theme-bg border border-theme-border rounded-lg px-3 py-2 text-sm text-theme-text outline-none focus:border-emerald-500 resize-none"
                  value={form.obs}
                  placeholder="Notas, reuniões agendadas, status atual..."
                  rows={2}
                  onChange={e => setForm(f => ({ ...f, obs: e.target.value }))}
                />
              </div>

              {uploading && (
                <p className="text-xs text-amber-400 text-center animate-pulse">Carregando arquivo...</p>
              )}

              {/* Ações */}
              <div className="flex gap-2 justify-end pt-2 border-t border-theme-border">
                <button
                  onClick={() => setShowNew(false)}
                  className="px-4 py-2 text-sm text-theme-textMuted hover:text-theme-text border border-theme-border rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={uploading}
                  className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg transition-colors font-medium"
                >
                  Salvar Viabilidade
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          MODAL — Detalhe da Viabilidade
      ════════════════════════════════════════════════════════════════════ */}
      {detail && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4"
          onClick={e => { if (e.target === e.currentTarget) setDetail(null); }}
        >
          <div className="bg-theme-card border border-theme-border rounded-xl p-5 w-full max-w-md max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-2 h-2 rounded-full flex-none ${col(detail.kanbanStatus).dot}`} />
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${col(detail.kanbanStatus).tw}`}>
                    {col(detail.kanbanStatus).label}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-theme-text leading-snug">
                  {detail.titulo || detail.address}
                </h3>
              </div>
              <button onClick={() => setDetail(null)} className="text-theme-textMuted hover:text-theme-text text-xl leading-none ml-3 shrink-0">×</button>
            </div>

            <div className="flex flex-col gap-3 text-sm">
              {/* Info */}
              <div className="flex flex-col gap-2">
                <div>
                  <p className="text-[10px] text-theme-textMuted uppercase tracking-wide mb-0.5">Endereço</p>
                  <p className="text-theme-text text-xs">📍 {detail.address}</p>
                </div>
                {detail.responsavel && (
                  <div>
                    <p className="text-[10px] text-theme-textMuted uppercase tracking-wide mb-0.5">Responsável</p>
                    <p className="text-theme-text text-xs">👤 {detail.responsavel}</p>
                  </div>
                )}
                {detail.obs && (
                  <div>
                    <p className="text-[10px] text-theme-textMuted uppercase tracking-wide mb-0.5">Observações</p>
                    <p className="text-theme-text text-xs italic">{detail.obs}</p>
                  </div>
                )}
                <div>
                  <p className="text-[10px] text-theme-textMuted uppercase tracking-wide mb-0.5">Criado em</p>
                  <p className="text-theme-text text-xs">{new Date(detail.createdAt).toLocaleDateString('pt-BR')}</p>
                </div>
              </div>

              {/* Documentos */}
              <div className="border-t border-theme-border pt-3">
                <p className="text-[10px] font-bold text-theme-textMuted uppercase tracking-wider mb-2">Documentos</p>
                {[
                  { fl: detail.pdfConsultaPrefeitura, label: 'Consulta de Viabilidade', req: true,  colorClass: 'blue'    },
                  { fl: detail.pdfLocalizacao,        label: 'Localização do Terreno',   req: true,  colorClass: 'emerald' },
                  { fl: detail.pdfEstudoTerceiro,     label: 'Estudo de Outra Construtora', req: false, colorClass: 'amber' },
                ].map(({ fl, label, req, colorClass }) => (
                  <div
                    key={label}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border mb-1.5 ${
                      fl
                        ? `bg-${colorClass}-500/5 border-${colorClass}-500/20`
                        : 'bg-theme-bg border-theme-border opacity-40'
                    }`}
                  >
                    <span className="text-base flex-none">📄</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[11px] font-medium ${fl ? `text-${colorClass}-400` : 'text-theme-textMuted'}`}>
                        {label}
                      </p>
                      {fl ? (
                        <a
                          href={fl.path}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-theme-textMuted hover:text-theme-text truncate block"
                          onClick={e => e.stopPropagation()}
                        >
                          {fl.label}
                        </a>
                      ) : (
                        <p className="text-[10px] text-theme-textMuted">Não anexado</p>
                      )}
                    </div>
                    <span className={`text-[10px] shrink-0 px-1.5 py-0.5 rounded border ${
                      req
                        ? 'bg-red-500/10 text-red-400 border-red-400/20'
                        : 'bg-theme-bg text-theme-textMuted border-theme-border'
                    }`}>
                      {req ? 'Obrig.' : 'Opcional'}
                    </span>
                  </div>
                ))}
              </div>

              {/* Mover para */}
              <div className="border-t border-theme-border pt-3">
                <p className="text-[10px] font-bold text-theme-textMuted uppercase tracking-wider mb-2">Mover para</p>
                <div className="flex flex-wrap gap-1.5">
                  {COLS.filter(c => c.id !== detail.kanbanStatus).map(c => (
                    <button
                      key={c.id}
                      onClick={() => move(detail.id, c.id)}
                      className={`text-[11px] px-2.5 py-1 rounded-full border ${c.border.replace('border-l-', 'border-')} ${c.tw} hover:opacity-70 transition-opacity`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Excluir */}
              <div className="border-t border-theme-border pt-3 flex justify-end">
                <button
                  onClick={() => del(detail.id)}
                  className="text-xs text-red-400 border border-red-400/30 rounded-lg px-3 py-1.5 hover:bg-red-400/10 transition-colors"
                >
                  Excluir viabilidade
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
