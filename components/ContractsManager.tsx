import React, { useState, useRef, useMemo } from 'react';
import { Project, Contract, ContractInstallment, ContractDiscipline, FileLink } from '../types';
import { useApp } from '../contexts/AppContext';
import { readFileAsDataURL } from '../utils/fileReaderUtils';
import { validateFileSize } from '../utils/validation';

// ─── Props ────────────────────────────────────────────────────────────────────
interface ContractsManagerProps {
  project: Project;
  db: any;
  onUpdateProject: (updated: Project) => void;
  currentUser: { name: string; avatar?: string } | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const fmtDate = (d: string) => {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
};

const today = () => new Date().toISOString().split('T')[0];

const isOverdue = (inst: ContractInstallment) =>
  inst.status !== 'paid' && inst.dueDate && inst.dueDate < today();

const paidTotal = (c: Contract) =>
  (c.installments || []).filter(i => i.status === 'paid').reduce((s, i) => s + i.value, 0);

const pendingTotal = (c: Contract) =>
  (c.installments || []).filter(i => i.status !== 'paid').reduce((s, i) => s + i.value, 0);

const overdueCount = (c: Contract) =>
  (c.installments || []).filter(isOverdue).length;

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS: Record<Contract['status'], { label: string; tw: string; dot: string }> = {
  active:  { label: 'Ativo',    tw: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', dot: 'bg-emerald-400' },
  pending: { label: 'Pendente', tw: 'text-amber-400  bg-amber-500/10  border-amber-500/30',  dot: 'bg-amber-400'  },
  closed:  { label: 'Encerrado',tw: 'text-gray-400   bg-gray-500/10   border-gray-500/30',   dot: 'bg-gray-400'   },
};

const INST_STATUS: Record<ContractInstallment['status'], { label: string; tw: string }> = {
  paid:    { label: 'Pago',     tw: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  pending: { label: 'Pendente', tw: 'text-amber-400   bg-amber-500/10  border-amber-500/30'  },
  future:  { label: 'Futuro',   tw: 'text-blue-400    bg-blue-500/10   border-blue-500/30'   },
};

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

// ══════════════════════════════════════════════════════════════════════════════
export const ContractsManager: React.FC<ContractsManagerProps> = ({
  project, onUpdateProject, currentUser,
}) => {
  const { addLog, setNotification } = useApp();
  const contracts: Contract[] = project.contracts || [];

  // Modal & form state
  const [selected, setSelected]   = useState<Contract | null>(null);
  const [showNew,  setShowNew]     = useState(false);
  const [tab, setTab]              = useState<'installments' | 'disciplines' | 'info'>('info');
  const [search, setSearch]        = useState('');
  const [filter, setFilter]        = useState<'all' | Contract['status']>('all');

  // New contract form
  const EMPTY_FORM = { name: '', supplier: '', totalValue: '', term: '', responsible: '', linkedWork: '' };
  const [form, setForm] = useState(EMPTY_FORM);

  // New installment form
  const [instForm, setInstForm] = useState({ description: '', value: '', dueDate: '', status: 'pending' as ContractInstallment['status'] });
  const [showInstForm, setShowInstForm] = useState(false);

  // New discipline form
  const [discForm, setDiscForm] = useState({ name: '', progressPct: '0' });
  const [showDiscForm, setShowDiscForm] = useState(false);

  // PDF upload
  const pdfRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // ── Computed ────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return contracts.filter(c => {
      const matchSearch = !search ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.supplier.toLowerCase().includes(search.toLowerCase());
      const matchFilter = filter === 'all' || c.status === filter;
      return matchSearch && matchFilter;
    });
  }, [contracts, search, filter]);

  const totalContratado = contracts.reduce((s, c) => s + (c.totalValue || 0), 0);
  const totalPago       = contracts.reduce((s, c) => s + paidTotal(c), 0);
  const totalPendente   = contracts.reduce((s, c) => s + pendingTotal(c), 0);
  const totalAtraso     = contracts.reduce((s, c) => s + overdueCount(c), 0);

  // ── Update helper ────────────────────────────────────────────────────────────
  const saveContracts = (updated: Contract[], msg?: string) => {
    onUpdateProject({ ...project, contracts: updated, updatedAt: new Date().toISOString() });
    if (msg) { setNotification(msg); addLog(currentUser?.name || 'SISTEMA', msg); }
    // Refresh selected if open
    if (selected) {
      const fresh = updated.find(c => c.id === selected.id);
      setSelected(fresh || null);
    }
  };

  // ── Contract handlers ────────────────────────────────────────────────────────
  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.supplier.trim()) { setNotification('Preencha nome e fornecedor.'); return; }
    const novo: Contract = {
      id: uid(), name: form.name.trim(), supplier: form.supplier.trim(),
      totalValue: parseFloat(form.totalValue) || 0,
      status: 'pending', createdAt: new Date().toISOString(),
      term: form.term, responsible: form.responsible, linkedWork: form.linkedWork,
      installments: [], disciplines: [], edits: [],
    };
    saveContracts([...contracts, novo], `CONTRATO CRIADO: ${novo.name}`);
    setForm(EMPTY_FORM);
    setShowNew(false);
  };

  const handleDelete = (id: string) => {
    saveContracts(contracts.filter(c => c.id !== id), 'CONTRATO REMOVIDO');
    if (selected?.id === id) setSelected(null);
  };

  const handleStatusCycle = (id: string) => {
    const cycle: Contract['status'][] = ['pending', 'active', 'closed'];
    saveContracts(contracts.map(c =>
      c.id === id ? { ...c, status: cycle[(cycle.indexOf(c.status) + 1) % 3] } : c
    ));
  };

  // ── PDF upload ───────────────────────────────────────────────────────────────
  const handlePdfUpload = async (file: File) => {
    if (!selected) return;
    const err = validateFileSize(file, 10);
    if (err) { setNotification(err); return; }
    try {
      setUploading(true);
      const path = await readFileAsDataURL(file);
      const fl: FileLink = { label: file.name, path, author: currentUser?.name, createdAt: new Date().toISOString() };
      saveContracts(contracts.map(c => c.id === selected.id ? { ...c, pdfAttachment: fl } : c), 'PDF ANEXADO');
    } catch { setNotification('Erro ao carregar arquivo.'); }
    finally { setUploading(false); }
  };

  // ── Installment handlers ─────────────────────────────────────────────────────
  const handleAddInstallment = () => {
    if (!selected || !instForm.description.trim() || !instForm.value) return;
    const inst: ContractInstallment = {
      id: uid(), description: instForm.description.trim(),
      value: parseFloat(instForm.value) || 0,
      dueDate: instForm.dueDate, status: instForm.status,
    };
    saveContracts(contracts.map(c =>
      c.id === selected.id ? { ...c, installments: [...(c.installments || []), inst] } : c
    ), 'PARCELA ADICIONADA');
    setInstForm({ description: '', value: '', dueDate: '', status: 'pending' });
    setShowInstForm(false);
  };

  const handlePayInstallment = (instId: string) => {
    if (!selected) return;
    saveContracts(contracts.map(c =>
      c.id === selected.id ? {
        ...c,
        installments: c.installments.map(i =>
          i.id === instId ? { ...i, status: 'paid', paymentDate: today() } : i
        ),
      } : c
    ), 'PARCELA MARCADA COMO PAGA');
  };

  const handleDeleteInstallment = (instId: string) => {
    if (!selected) return;
    saveContracts(contracts.map(c =>
      c.id === selected.id ? { ...c, installments: c.installments.filter(i => i.id !== instId) } : c
    ));
  };

  // ── Discipline handlers ──────────────────────────────────────────────────────
  const handleAddDiscipline = () => {
    if (!selected || !discForm.name.trim()) return;
    const disc: ContractDiscipline = { id: uid(), name: discForm.name.trim(), progressPct: parseInt(discForm.progressPct) || 0 };
    saveContracts(contracts.map(c =>
      c.id === selected.id ? { ...c, disciplines: [...(c.disciplines || []), disc] } : c
    ));
    setDiscForm({ name: '', progressPct: '0' });
    setShowDiscForm(false);
  };

  const handleUpdateProgress = (discId: string, pct: number) => {
    if (!selected) return;
    saveContracts(contracts.map(c =>
      c.id === selected.id ? {
        ...c,
        disciplines: c.disciplines.map(d => d.id === discId ? { ...d, progressPct: pct } : d),
      } : c
    ));
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 flex flex-col gap-6">

      {/* ── Dashboard ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Contratos', value: contracts.length.toString(), icon: 'description',       color: 'text-blue-400',    bg: 'bg-blue-500/10'    },
          { label: 'Valor Total',     value: fmt(totalContratado),        icon: 'account_balance',   color: 'text-purple-400',  bg: 'bg-purple-500/10'  },
          { label: 'Total Pago',      value: fmt(totalPago),              icon: 'check_circle',      color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Parcelas Atraso', value: totalAtraso.toString(),      icon: 'warning',           color: totalAtraso > 0 ? 'text-red-400' : 'text-gray-400', bg: totalAtraso > 0 ? 'bg-red-500/10' : 'bg-gray-500/10' },
        ].map(k => (
          <div key={k.label} className={`${k.bg} border border-theme-border rounded-2xl p-4 flex items-center gap-3`}>
            <span className={`material-symbols-outlined text-2xl ${k.color}`}>{k.icon}</span>
            <div>
              <p className="text-[10px] font-bold text-theme-textMuted uppercase tracking-wider">{k.label}</p>
              <p className={`text-base font-black ${k.color}`}>{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Header controls ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {/* Busca */}
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-theme-textMuted text-base">search</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar contrato..."
              className="pl-8 pr-3 py-2 text-xs bg-theme-card border border-theme-border rounded-xl text-theme-text outline-none focus:border-theme-orange w-44" />
          </div>
          {/* Filtro */}
          {(['all','active','pending','closed'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-2 text-[10px] font-black uppercase rounded-xl border transition-all ${filter === f ? 'bg-theme-orange text-white border-theme-orange' : 'bg-theme-card text-theme-textMuted border-theme-border hover:text-theme-text'}`}>
              {f === 'all' ? 'Todos' : STATUS[f as Contract['status']].label}
            </button>
          ))}
        </div>
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2 bg-theme-orange text-white rounded-xl text-xs font-black uppercase transition-all hover:opacity-90 shadow-lg">
          <span className="material-symbols-outlined text-base">add</span>
          Novo Contrato
        </button>
      </div>

      {/* ── Contract list ─────────────────────────────────────────────────────────── */}
      {filtered.length === 0 && (
        <div className="text-center py-12 text-theme-textMuted">
          <span className="material-symbols-outlined text-4xl mb-2 block opacity-40">description</span>
          <p className="text-xs font-bold uppercase">Nenhum contrato encontrado</p>
        </div>
      )}

      <div className="grid gap-3">
        {filtered.map(c => {
          const paid = paidTotal(c);
          const pct  = c.totalValue > 0 ? Math.min(100, Math.round((paid / c.totalValue) * 100)) : 0;
          const over = overdueCount(c);
          const st   = STATUS[c.status];

          return (
            <div key={c.id} onClick={() => { setSelected(c); setTab('info'); }}
              className="bg-theme-card border border-theme-border rounded-2xl p-4 cursor-pointer hover:border-theme-orange transition-all group">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-lg border ${st.tw}`}>{st.label}</span>
                    {over > 0 && (
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-lg border text-red-400 bg-red-500/10 border-red-500/30 flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">warning</span>{over} em atraso
                      </span>
                    )}
                    {c.pdfAttachment && (
                      <span className="text-[10px] text-blue-400 bg-blue-500/10 border border-blue-500/30 px-2 py-0.5 rounded-lg font-bold">📄 PDF</span>
                    )}
                  </div>
                  <p className="font-black text-sm text-theme-text truncate">{c.name}</p>
                  <p className="text-xs text-theme-textMuted">{c.supplier} · {c.responsible}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-black text-theme-text text-sm">{fmt(c.totalValue)}</p>
                  <p className="text-[10px] text-emerald-400">{fmt(paid)} pago</p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-3">
                <div className="flex justify-between text-[9px] text-theme-textMuted mb-1">
                  <span>{c.installments?.length || 0} parcela(s)</span>
                  <span>{pct}% quitado</span>
                </div>
                <div className="h-1.5 bg-theme-bg rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all"
                    style={{ width: `${pct}%` }} />
                </div>
              </div>

              {/* Discipline pills */}
              {(c.disciplines || []).length > 0 && (
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {c.disciplines.slice(0, 4).map(d => (
                    <div key={d.id} className="flex items-center gap-1 bg-theme-bg border border-theme-border rounded-lg px-2 py-0.5">
                      <span className="text-[9px] text-theme-textMuted">{d.name}</span>
                      <span className="text-[9px] font-bold text-theme-orange">{d.progressPct}%</span>
                    </div>
                  ))}
                  {c.disciplines.length > 4 && <span className="text-[9px] text-theme-textMuted">+{c.disciplines.length - 4}</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL — New Contract
      ══════════════════════════════════════════════════════════════════════ */}
      {showNew && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowNew(false); }}>
          <div className="bg-theme-card border border-theme-border rounded-2xl p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-black text-theme-text uppercase tracking-widest">Novo Contrato</h3>
              <button onClick={() => setShowNew(false)} className="text-theme-textMuted hover:text-theme-text text-xl">×</button>
            </div>
            <form onSubmit={handleCreate} className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="lbl-sm">Nome do Contrato *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Ex: Projeto Estrutural" required className="inp-sm" />
                </div>
                <div>
                  <label className="lbl-sm">Fornecedor *</label>
                  <input value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))}
                    placeholder="Empresa / Profissional" required className="inp-sm" />
                </div>
                <div>
                  <label className="lbl-sm">Valor Total (R$)</label>
                  <input type="number" value={form.totalValue} onChange={e => setForm(f => ({ ...f, totalValue: e.target.value }))}
                    placeholder="0,00" min="0" step="0.01" className="inp-sm" />
                </div>
                <div>
                  <label className="lbl-sm">Prazo</label>
                  <input value={form.term} onChange={e => setForm(f => ({ ...f, term: e.target.value }))}
                    placeholder="Ex: 6 meses" className="inp-sm" />
                </div>
                <div>
                  <label className="lbl-sm">Responsável</label>
                  <input value={form.responsible} onChange={e => setForm(f => ({ ...f, responsible: e.target.value }))}
                    placeholder="Nome" className="inp-sm" />
                </div>
                <div className="col-span-2">
                  <label className="lbl-sm">Obra Vinculada</label>
                  <input value={form.linkedWork} onChange={e => setForm(f => ({ ...f, linkedWork: e.target.value }))}
                    placeholder="Nome da obra ou serviço" className="inp-sm" />
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-2 border-t border-theme-border mt-1">
                <button type="button" onClick={() => setShowNew(false)}
                  className="px-4 py-2 text-xs text-theme-textMuted border border-theme-border rounded-xl hover:text-theme-text transition-colors">Cancelar</button>
                <button type="submit"
                  className="px-4 py-2 text-xs font-black bg-theme-orange text-white rounded-xl hover:opacity-90 transition-opacity">Criar Contrato</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL — Contract Detail
      ══════════════════════════════════════════════════════════════════════ */}
      {selected && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999] p-4"
          onClick={e => { if (e.target === e.currentTarget) setSelected(null); }}>
          <div className="bg-theme-card border border-theme-border rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

            {/* Modal header */}
            <div className="p-5 border-b border-theme-border shrink-0">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <button onClick={() => handleStatusCycle(selected.id)}
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-lg border cursor-pointer hover:opacity-80 transition-opacity ${STATUS[selected.status].tw}`}>
                      {STATUS[selected.status].label} ↻
                    </button>
                    {overdueCount(selected) > 0 && (
                      <span className="text-[10px] font-black text-red-400 bg-red-500/10 border border-red-500/30 px-2 py-0.5 rounded-lg flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">warning</span>
                        {overdueCount(selected)} parcela(s) em atraso
                      </span>
                    )}
                  </div>
                  <h2 className="text-base font-black text-theme-text">{selected.name}</h2>
                  <p className="text-xs text-theme-textMuted">{selected.supplier} · {selected.responsible} · {selected.term}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleDelete(selected.id)}
                    className="text-red-400 hover:text-red-300 transition-colors" title="Excluir contrato">
                    <span className="material-symbols-outlined text-base">delete</span>
                  </button>
                  <button onClick={() => setSelected(null)} className="text-theme-textMuted hover:text-theme-text text-xl">×</button>
                </div>
              </div>

              {/* Financial summary */}
              <div className="grid grid-cols-3 gap-2 mt-3">
                {[
                  { label: 'Valor Total',  value: fmt(selected.totalValue), color: 'text-theme-text'   },
                  { label: 'Pago',         value: fmt(paidTotal(selected)),    color: 'text-emerald-400' },
                  { label: 'Pendente',     value: fmt(pendingTotal(selected)),  color: 'text-amber-400'   },
                ].map(k => (
                  <div key={k.label} className="bg-theme-bg border border-theme-border rounded-xl p-2.5 text-center">
                    <p className="text-[9px] text-theme-textMuted uppercase font-bold tracking-wide">{k.label}</p>
                    <p className={`text-xs font-black ${k.color} mt-0.5`}>{k.value}</p>
                  </div>
                ))}
              </div>

              {/* Progress bar */}
              <div className="mt-3">
                {(() => {
                  const pct = selected.totalValue > 0 ? Math.min(100, Math.round((paidTotal(selected) / selected.totalValue) * 100)) : 0;
                  return (
                    <>
                      <div className="flex justify-between text-[9px] text-theme-textMuted mb-1">
                        <span>Progresso financeiro</span><span>{pct}%</span>
                      </div>
                      <div className="h-2 bg-theme-bg rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-theme-border shrink-0 px-5">
              {([
                { key: 'info',         label: 'Informações', icon: 'info'            },
                { key: 'installments', label: 'Parcelas',    icon: 'payments'        },
                { key: 'disciplines',  label: 'Disciplinas', icon: 'analytics'       },
              ] as const).map(t => (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className={`flex items-center gap-1.5 px-3 py-2.5 text-[11px] font-bold border-b-2 transition-all -mb-px ${
                    tab === t.key ? 'border-theme-orange text-theme-orange' : 'border-transparent text-theme-textMuted hover:text-theme-text'
                  }`}>
                  <span className="material-symbols-outlined text-sm">{t.icon}</span>{t.label}
                  {t.key === 'installments' && overdueCount(selected) > 0 && (
                    <span className="ml-1 w-4 h-4 bg-red-500 text-white rounded-full text-[8px] font-black flex items-center justify-center">
                      {overdueCount(selected)}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto p-5">

              {/* ── INFO TAB ─────────────────────────────────────────────────────── */}
              {tab === 'info' && (
                <div className="flex flex-col gap-4">
                  {/* PDF Attachment */}
                  <div>
                    <p className="text-[10px] font-black text-theme-textMuted uppercase tracking-wider mb-2">Documento do Contrato (PDF)</p>
                    <input ref={pdfRef} type="file" accept=".pdf" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handlePdfUpload(f); e.target.value = ''; }} />
                    {selected.pdfAttachment ? (
                      <div className="flex items-center gap-3 p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl">
                        <span className="material-symbols-outlined text-blue-400 text-xl">picture_as_pdf</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-blue-400 truncate">{selected.pdfAttachment.label}</p>
                          <a href={selected.pdfAttachment.path} target="_blank" rel="noopener noreferrer"
                            className="text-[10px] text-theme-textMuted hover:text-theme-text" onClick={e => e.stopPropagation()}>
                            Abrir documento →
                          </a>
                        </div>
                        <button onClick={() => pdfRef.current?.click()}
                          className="text-[10px] text-theme-textMuted hover:text-theme-text border border-theme-border rounded-lg px-2 py-1 transition-colors">
                          Trocar
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => pdfRef.current?.click()} disabled={uploading}
                        className="w-full border border-dashed border-theme-border rounded-xl p-4 text-center text-theme-textMuted hover:border-theme-orange hover:text-theme-text transition-all text-xs">
                        {uploading ? 'Carregando...' : '📄 Clique para anexar o PDF do contrato'}
                      </button>
                    )}
                  </div>

                  {/* Contract details */}
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Fornecedor',      value: selected.supplier    },
                      { label: 'Responsável',      value: selected.responsible },
                      { label: 'Prazo',            value: selected.term        },
                      { label: 'Obra Vinculada',   value: selected.linkedWork  },
                      { label: 'Data de Criação',  value: fmtDate(selected.createdAt?.split('T')[0]) },
                    ].map(d => d.value ? (
                      <div key={d.label} className="bg-theme-bg border border-theme-border rounded-xl p-3">
                        <p className="text-[9px] text-theme-textMuted uppercase font-bold tracking-wide">{d.label}</p>
                        <p className="text-xs font-bold text-theme-text mt-0.5">{d.value}</p>
                      </div>
                    ) : null)}
                  </div>
                </div>
              )}

              {/* ── INSTALLMENTS TAB ─────────────────────────────────────────────── */}
              {tab === 'installments' && (
                <div className="flex flex-col gap-3">
                  {/* Totals */}
                  <div className="flex gap-2 flex-wrap text-[10px]">
                    <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-1 rounded-lg font-bold">
                      Pago: {fmt(paidTotal(selected))}
                    </span>
                    <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-1 rounded-lg font-bold">
                      Pendente: {fmt(pendingTotal(selected))}
                    </span>
                    {overdueCount(selected) > 0 && (
                      <span className="bg-red-500/10 text-red-400 border border-red-500/30 px-2 py-1 rounded-lg font-bold flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">warning</span>
                        {overdueCount(selected)} em atraso
                      </span>
                    )}
                  </div>

                  {/* Installment list */}
                  {(selected.installments || []).length === 0 && (
                    <p className="text-xs text-theme-textMuted text-center py-6">Nenhuma parcela cadastrada</p>
                  )}
                  <div className="flex flex-col gap-2">
                    {(selected.installments || [])
                      .slice()
                      .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''))
                      .map(inst => {
                        const over = isOverdue(inst);
                        const ist  = INST_STATUS[inst.status];
                        return (
                          <div key={inst.id}
                            className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${over ? 'bg-red-500/5 border-red-500/30' : 'bg-theme-bg border-theme-border'}`}>
                            {/* Status icon */}
                            <span className={`material-symbols-outlined text-base shrink-0 ${
                              inst.status === 'paid' ? 'text-emerald-400' : over ? 'text-red-400' : 'text-amber-400'
                            }`}>{inst.status === 'paid' ? 'check_circle' : over ? 'error' : 'schedule'}</span>

                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-theme-text truncate">{inst.description}</p>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${ist.tw}`}>{ist.label}</span>
                                {inst.dueDate && (
                                  <span className={`text-[9px] ${over ? 'text-red-400 font-bold' : 'text-theme-textMuted'}`}>
                                    Venc. {fmtDate(inst.dueDate)}
                                  </span>
                                )}
                                {inst.paymentDate && (
                                  <span className="text-[9px] text-emerald-400">Pago em {fmtDate(inst.paymentDate)}</span>
                                )}
                              </div>
                            </div>

                            <p className="text-xs font-black text-theme-text shrink-0">{fmt(inst.value)}</p>

                            <div className="flex gap-1 shrink-0">
                              {inst.status !== 'paid' && (
                                <button onClick={() => handlePayInstallment(inst.id)}
                                  className="text-emerald-400 hover:text-emerald-300 transition-colors" title="Marcar como pago">
                                  <span className="material-symbols-outlined text-base">check_circle</span>
                                </button>
                              )}
                              <button onClick={() => handleDeleteInstallment(inst.id)}
                                className="text-red-400 hover:text-red-300 transition-colors" title="Excluir">
                                <span className="material-symbols-outlined text-base">delete</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>

                  {/* Add installment form */}
                  {showInstForm ? (
                    <div className="border border-theme-border rounded-xl p-3 flex flex-col gap-2 bg-theme-bg">
                      <input value={instForm.description} onChange={e => setInstForm(f => ({ ...f, description: e.target.value }))}
                        placeholder="Descrição (ex: Parcela 1/3)" className="inp-sm" />
                      <div className="grid grid-cols-2 gap-2">
                        <input type="number" value={instForm.value} onChange={e => setInstForm(f => ({ ...f, value: e.target.value }))}
                          placeholder="Valor (R$)" min="0" step="0.01" className="inp-sm" />
                        <input type="date" value={instForm.dueDate} onChange={e => setInstForm(f => ({ ...f, dueDate: e.target.value }))}
                          className="inp-sm" />
                      </div>
                      <select value={instForm.status} onChange={e => setInstForm(f => ({ ...f, status: e.target.value as any }))}
                        className="inp-sm">
                        <option value="future">Futuro</option>
                        <option value="pending">Pendente</option>
                        <option value="paid">Pago</option>
                      </select>
                      <div className="flex gap-2">
                        <button onClick={() => setShowInstForm(false)}
                          className="flex-1 py-2 text-[10px] font-bold border border-theme-border rounded-xl text-theme-textMuted hover:text-theme-text transition-colors">Cancelar</button>
                        <button onClick={handleAddInstallment}
                          className="flex-1 py-2 text-[10px] font-black bg-theme-orange text-white rounded-xl hover:opacity-90">Adicionar</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setShowInstForm(true)}
                      className="w-full border border-dashed border-theme-border rounded-xl py-2.5 text-xs text-theme-textMuted hover:text-theme-text hover:border-theme-textMuted/40 transition-all flex items-center justify-center gap-1">
                      <span className="material-symbols-outlined text-sm">add</span> Adicionar Parcela
                    </button>
                  )}
                </div>
              )}

              {/* ── DISCIPLINES TAB ──────────────────────────────────────────────── */}
              {tab === 'disciplines' && (
                <div className="flex flex-col gap-3">
                  {(selected.disciplines || []).length === 0 && (
                    <p className="text-xs text-theme-textMuted text-center py-6">Nenhuma disciplina cadastrada</p>
                  )}

                  {(selected.disciplines || []).map(d => (
                    <div key={d.id} className="bg-theme-bg border border-theme-border rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-bold text-theme-text">{d.name}</p>
                        <span className="text-xs font-black text-theme-orange">{d.progressPct}%</span>
                      </div>
                      <div className="h-2 bg-theme-card rounded-full overflow-hidden mb-2">
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${d.progressPct}%`, background: `hsl(${d.progressPct * 1.2}, 70%, 50%)` }} />
                      </div>
                      <input type="range" min="0" max="100" value={d.progressPct}
                        onChange={e => handleUpdateProgress(d.id, parseInt(e.target.value))}
                        className="w-full accent-orange-500 cursor-pointer" />
                    </div>
                  ))}

                  {showDiscForm ? (
                    <div className="border border-theme-border rounded-xl p-3 flex flex-col gap-2 bg-theme-bg">
                      <input value={discForm.name} onChange={e => setDiscForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="Nome da disciplina (ex: Arquitetura)" className="inp-sm" />
                      <div>
                        <div className="flex justify-between text-[10px] text-theme-textMuted mb-1">
                          <span>Progresso inicial</span><span>{discForm.progressPct}%</span>
                        </div>
                        <input type="range" min="0" max="100" value={discForm.progressPct}
                          onChange={e => setDiscForm(f => ({ ...f, progressPct: e.target.value }))}
                          className="w-full accent-orange-500" />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setShowDiscForm(false)}
                          className="flex-1 py-2 text-[10px] font-bold border border-theme-border rounded-xl text-theme-textMuted hover:text-theme-text transition-colors">Cancelar</button>
                        <button onClick={handleAddDiscipline}
                          className="flex-1 py-2 text-[10px] font-black bg-theme-orange text-white rounded-xl hover:opacity-90">Adicionar</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setShowDiscForm(true)}
                      className="w-full border border-dashed border-theme-border rounded-xl py-2.5 text-xs text-theme-textMuted hover:text-theme-text hover:border-theme-textMuted/40 transition-all flex items-center justify-center gap-1">
                      <span className="material-symbols-outlined text-sm">add</span> Adicionar Disciplina
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Shared input styles via Tailwind arbitrary ─────────────────────────── */}
      <style>{`
        .lbl-sm { display: block; font-size: 10px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 4px; }
        .inp-sm { width: 100%; background: var(--color-bg, #0d1117); border: 1px solid var(--color-border, #30363d); border-radius: 10px; padding: 7px 10px; font-size: 12px; color: var(--color-text, #e6edf3); outline: none; transition: border-color 0.15s; }
        .inp-sm:focus { border-color: var(--color-orange, #f97316); }
      `}</style>
    </div>
  );
};
