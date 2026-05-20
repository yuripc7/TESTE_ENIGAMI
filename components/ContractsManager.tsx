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
const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (d: string) => {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
};
const today = () => new Date().toISOString().split('T')[0];
const isOverdue = (inst: ContractInstallment) => inst.status !== 'paid' && inst.dueDate && inst.dueDate < today();
const paidTotal = (c: Contract) => (c.installments || []).filter(i => i.status === 'paid').reduce((s, i) => s + i.value, 0);
const pendingTotal = (c: Contract) => (c.installments || []).filter(i => i.status !== 'paid').reduce((s, i) => s + i.value, 0);
const overdueCount = (c: Contract) => (c.installments || []).filter(isOverdue).length;

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

const STATUS_PILL: Record<Contract['status'], { label: string; tw: string }> = {
  active:  { label: 'ATIVO',    tw: 'text-[#00b87c] border-[#00b87c]' },
  pending: { label: 'PENDENTE', tw: 'text-[#facc15] border-[#facc15]' },
  closed:  { label: 'ENCERRADO',tw: 'text-theme-textMuted border-theme-divider' },
};

const INST_STATUS_PILL: Record<ContractInstallment['status'], { label: string; tw: string }> = {
  paid:    { label: 'PAGO',     tw: 'text-[#00b87c] border-[#00b87c]' },
  pending: { label: 'PENDENTE', tw: 'text-[#facc15] border-[#facc15]' },
  future:  { label: 'FUTURO',   tw: 'text-theme-textMuted border-theme-divider' },
};

const SCOPE_STATUS_LABEL: Record<string, string> = { stopped: 'Parado', walking: 'Em andamento', running: 'Correndo', done: 'Concluído' };

// ══════════════════════════════════════════════════════════════════════════════
export const ContractsManager: React.FC<ContractsManagerProps> = ({ project, onUpdateProject, currentUser }) => {
  const { addLog, setNotification } = useApp();
  const contracts: Contract[] = project.contracts || [];

  // State
  const [selected, setSelected] = useState<Contract | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [tab, setTab] = useState<'contract' | 'financeiro' | 'disciplines' | 'edits'>('contract');
  const [search, setSearch] = useState('');
  
  // Forms
  const EMPTY_FORM = { name: '', supplier: '', totalValue: '', term: '', responsible: '', linkedWork: '' };
  const [form, setForm] = useState(EMPTY_FORM);
  const [instForm, setInstForm] = useState({ description: '', value: '', dueDate: '', status: 'pending' as ContractInstallment['status'] });
  const [showInstForm, setShowInstForm] = useState(false);
  
  // Edit request form
  const [editForm, setEditForm] = useState({ title: '', clause: '', description: '' });

  // PDF upload
  const pdfRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Scope picker
  const [showScopePicker, setShowScopePicker] = useState(false);
  const [discSearch, setDiscSearch] = useState('');

  // ── Computed ────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return contracts.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.supplier.toLowerCase().includes(search.toLowerCase()));
  }, [contracts, search]);

  const availableScopes = useMemo(() => {
    const linkedIds = new Set((selected?.disciplines || []).map(d => d.id));
    return (project.scopes || []).filter(s => !linkedIds.has(s.id) && (!discSearch || s.name.toLowerCase().includes(discSearch.toLowerCase())));
  }, [project.scopes, selected, discSearch]);

  // ── Update helper ────────────────────────────────────────────────────────────
  const saveContracts = (updated: Contract[], msg?: string) => {
    onUpdateProject({ ...project, contracts: updated, updatedAt: new Date().toISOString() });
    if (msg) { setNotification(msg); addLog(currentUser?.name || 'SISTEMA', msg); }
    if (selected) {
      const fresh = updated.find(c => c.id === selected.id);
      setSelected(fresh || null);
    }
  };

  // ── Handlers ────────────────────────────────────────────────────────
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

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Tem certeza de que deseja excluir o contrato "${name}"?`)) {
      saveContracts(contracts.filter(c => c.id !== id), 'CONTRATO REMOVIDO');
      if (selected?.id === id) setSelected(null);
    }
  };

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

  const handleAddInstallment = () => {
    if (!selected || !instForm.description.trim() || !instForm.value) return;
    const inst: ContractInstallment = {
      id: uid(), description: instForm.description.trim(), value: parseFloat(instForm.value) || 0,
      dueDate: instForm.dueDate, status: instForm.status,
    };
    saveContracts(contracts.map(c => c.id === selected.id ? { ...c, installments: [...(c.installments || []), inst] } : c), 'PARCELA ADICIONADA');
    setInstForm({ description: '', value: '', dueDate: '', status: 'pending' });
    setShowInstForm(false);
  };

  const handlePayInstallment = (instId: string) => {
    if (!selected) return;
    saveContracts(contracts.map(c => c.id === selected.id ? { ...c, installments: c.installments.map(i => i.id === instId ? { ...i, status: 'paid', paymentDate: today() } : i) } : c), 'PARCELA PAGA');
  };

  const handleLinkScope = (scopeId: string, scopeName: string) => {
    if (!selected) return;
    const disc: ContractDiscipline = { id: scopeId, name: scopeName, progressPct: 0 };
    saveContracts(contracts.map(c => c.id === selected.id ? { ...c, disciplines: [...(c.disciplines || []), disc] } : c), `DISCIPLINA VINCULADA: ${scopeName}`);
    setShowScopePicker(false);
    setDiscSearch('');
  };

  const handleUpdateProgress = (discId: string, pct: number) => {
    if (!selected) return;
    saveContracts(contracts.map(c => c.id === selected.id ? { ...c, disciplines: c.disciplines.map(d => d.id === discId ? { ...d, progressPct: pct } : d) } : c));
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  
  if (selected) {
    const paid = paidTotal(selected);
    const pend = pendingTotal(selected);
    const pct = selected.totalValue > 0 ? Math.min(100, Math.round((paid / selected.totalValue) * 100)) : 0;
    const st = STATUS_PILL[selected.status] || STATUS_PILL.pending;

    return (
      <div className="flex flex-col bg-transparent w-full min-h-[calc(100vh-140px)] animate-fadeIn text-theme-text">
        {/* Header Back */}
        <div className="flex items-center justify-between mb-6 p-2">
          <div className="flex items-center gap-3">
            <button onClick={() => setSelected(null)} className="w-10 h-10 rounded-full bg-theme-highlight text-theme-text hover:bg-theme-border/20 border border-theme-divider flex items-center justify-center transition-all shrink-0">
              <span className="material-symbols-outlined text-xl">arrow_back</span>
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-square font-black text-theme-text uppercase tracking-widest leading-none">{selected.name}</h1>
                <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full border bg-transparent ${st.tw}`}>{st.label}</span>
              </div>
              <p className="text-sm text-theme-textMuted font-bold mt-1.5">{selected.supplier} • {fmt(selected.totalValue)}</p>
            </div>
          </div>
          <button onClick={() => handleDelete(selected.id, selected.name)} className="w-10 h-10 rounded-full bg-red-500/10 text-red-500 border border-red-500/20 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shrink-0" title="Excluir Contrato">
            <span className="material-symbols-outlined text-lg">delete</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-8 border-b border-theme-divider mb-8 overflow-x-auto scroller">
          {[
            { id: 'contract', label: 'CONTRATO', icon: 'receipt_long' },
            { id: 'financeiro', label: 'FINANCEIRO', icon: 'account_balance' },
            { id: 'disciplines', label: 'DISCIPLINAS', icon: 'category' },
            { id: 'edits', label: 'EDIÇÕES', icon: 'edit_note' },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              className={`flex items-center gap-2 pb-4 text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${tab === t.id ? 'text-theme-orange border-b-2 border-theme-orange' : 'text-theme-textMuted hover:text-theme-text'}`}>
              <span className="material-symbols-outlined text-base">{t.icon}</span> {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex flex-col gap-4 pb-12 max-w-5xl">
          
          {tab === 'contract' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="ds-card p-6">
                  <p className="text-[10px] font-black uppercase tracking-widest text-theme-textMuted mb-1 flex items-center gap-2">
                    <span className="material-symbols-outlined text-theme-orange text-sm">attach_money</span> VALOR TOTAL
                  </p>
                  <p className="text-2xl font-black font-square tracking-wider text-theme-text">{fmt(selected.totalValue)}</p>
                </div>
                <div className="ds-card p-6">
                  <p className="text-[10px] font-black uppercase tracking-widest text-theme-textMuted mb-1 flex items-center gap-2">
                    <span className="material-symbols-outlined text-theme-orange text-sm">calendar_month</span> VIGÊNCIA
                  </p>
                  <p className="text-lg font-bold text-theme-text">{selected.term || '—'}</p>
                </div>
                <div className="ds-card p-6">
                  <p className="text-[10px] font-black uppercase tracking-widest text-theme-textMuted mb-1 flex items-center gap-2">
                    <span className="material-symbols-outlined text-theme-orange text-sm">person</span> RESPONSÁVEL
                  </p>
                  <p className="text-lg font-bold text-theme-text">{selected.responsible || '—'}</p>
                </div>
                <div className="ds-card p-6">
                  <p className="text-[10px] font-black uppercase tracking-widest text-theme-textMuted mb-1 flex items-center gap-2">
                    <span className="material-symbols-outlined text-theme-orange text-sm">domain</span> OBRA VINCULADA
                  </p>
                  <p className="text-lg font-bold text-theme-text">{selected.linkedWork || '—'}</p>
                </div>
              </div>

              <div className="ds-card p-10 mt-4 flex flex-col items-center justify-center text-center min-h-[300px]">
                <span className="material-symbols-outlined text-6xl text-theme-textMuted mb-4">picture_as_pdf</span>
                <h3 className="text-lg font-square font-black uppercase tracking-widest mb-1 text-theme-text">ANEXO DO CONTRATO</h3>
                {selected.pdfAttachment ? (
                  <>
                    <p className="text-sm text-[#00b87c] font-bold mb-6">{selected.pdfAttachment.label}</p>
                    <div className="flex gap-4">
                      <a href={selected.pdfAttachment.path} target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-theme-highlight hover:bg-theme-border/20 border border-theme-divider text-theme-text rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-sm">
                        <span className="material-symbols-outlined text-sm">visibility</span> ABRIR PDF
                      </a>
                      <button onClick={() => pdfRef.current?.click()} className="px-6 py-3 bg-theme-highlight hover:bg-theme-border/20 border border-theme-divider text-theme-text rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-sm">
                        <span className="material-symbols-outlined text-sm">upload_file</span> SUBSTITUIR
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-theme-textMuted mb-8">Nenhum PDF vinculado ainda.</p>
                    <div className="flex gap-4">
                      <button onClick={() => pdfRef.current?.click()} className="px-6 py-3 bg-theme-highlight hover:bg-theme-border/20 border border-theme-divider text-theme-text rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-sm">
                        <span className="material-symbols-outlined text-sm">upload</span> UPLOAD PDF
                      </button>
                      <button onClick={() => setTab('edits')} className="px-6 py-3 bg-theme-highlight hover:bg-theme-border/20 border border-theme-divider text-theme-text rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-sm">
                        <span className="material-symbols-outlined text-sm">edit_document</span> SOLICITAR EDIÇÃO
                      </button>
                    </div>
                  </>
                )}
                <input ref={pdfRef} type="file" accept=".pdf" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handlePdfUpload(f); e.target.value = ''; }} />
              </div>
            </>
          )}

          {tab === 'financeiro' && (
            <>
              <div className="ds-card p-6 mb-4">
                <div className="grid grid-cols-3 gap-6 mb-8">
                  <div className="bg-theme-highlight border border-[#00b87c]/30 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-theme-textMuted mb-2">PAGO</p>
                    <p className="text-2xl font-square font-black text-[#00b87c]">{fmt(paid)}</p>
                  </div>
                  <div className="bg-theme-highlight border border-[#facc15]/30 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-theme-textMuted mb-2">A PAGAR</p>
                    <p className="text-2xl font-square font-black text-[#facc15]">{fmt(pend)}</p>
                  </div>
                  <div className="bg-theme-highlight border border-theme-divider rounded-2xl p-6 flex flex-col items-center justify-center text-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-theme-textMuted mb-2">PROGRESSO</p>
                    <p className="text-2xl font-square font-black text-theme-text">{pct}%</p>
                  </div>
                </div>
                
                <div className="px-2">
                  <div className="h-3 bg-theme-bg rounded-full overflow-hidden border border-theme-divider">
                    <div className="h-full bg-[#00b87c] rounded-full transition-all duration-1000" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex justify-between mt-2 text-[10px] font-bold text-theme-textMuted">
                    <span className="text-[#00b87c]">{pct}% pago</span>
                    <span>{fmt(selected.totalValue)} total</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mb-4 mt-6">
                <h3 className="text-xs font-black uppercase tracking-widest text-theme-textMuted">PARCELAS ({(selected.installments || []).length})</h3>
                <button onClick={() => setShowInstForm(true)} className="px-4 py-2.5 bg-[#00b87c] text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-[#00a06c] transition-colors flex items-center gap-2 shadow-md">
                  <span className="material-symbols-outlined text-sm">receipt_long</span> REGISTRAR PAGAMENTO
                </button>
              </div>

              {showInstForm && (
                <div className="bg-theme-card border border-[#00b87c] rounded-2xl p-5 mb-4 animate-scaleIn shadow-lg">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <input value={instForm.description} onChange={e => setInstForm(f => ({ ...f, description: e.target.value }))} placeholder="Descrição (ex: Parcela 1)" className="col-span-2 bg-theme-bg border border-theme-divider rounded-xl px-4 py-3 text-sm text-theme-text outline-none focus:border-[#00b87c]" />
                    <input type="number" value={instForm.value} onChange={e => setInstForm(f => ({ ...f, value: e.target.value }))} placeholder="Valor (R$)" className="bg-theme-bg border border-theme-divider rounded-xl px-4 py-3 text-sm text-theme-text outline-none focus:border-[#00b87c]" />
                    <input type="date" value={instForm.dueDate} onChange={e => setInstForm(f => ({ ...f, dueDate: e.target.value }))} className="bg-theme-bg border border-theme-divider rounded-xl px-4 py-3 text-sm text-theme-textMuted outline-none focus:border-[#00b87c]" />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setShowInstForm(false)} className="px-6 py-2 text-xs font-bold text-theme-textMuted hover:text-theme-text transition-colors">CANCELAR</button>
                    <button onClick={handleAddInstallment} className="px-6 py-2 bg-[#00b87c] text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-md">ADICIONAR</button>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-3">
                {(selected.installments || []).map(inst => {
                  const over = isOverdue(inst);
                  const ist = INST_STATUS_PILL[inst.status] || INST_STATUS_PILL.future;
                  return (
                    <div key={inst.id} className="bg-theme-card border border-theme-divider rounded-2xl p-5 flex items-center justify-between group shadow-sm">
                      <div>
                        <p className="text-sm font-black text-theme-text mb-1">{inst.description}</p>
                        <p className="text-[10px] text-theme-textMuted font-bold">Venc: {fmtDate(inst.dueDate)} {inst.paymentDate && <span className="text-[#00b87c] ml-2">Pago em {fmtDate(inst.paymentDate)}</span>}</p>
                      </div>
                      <div className="flex items-center gap-6">
                        <p className="text-lg font-square font-black text-theme-text">{fmt(inst.value)}</p>
                        <div className={`px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider ${ist.tw}`}>
                          {ist.label}
                        </div>
                        {inst.status !== 'paid' && (
                          <button onClick={() => handlePayInstallment(inst.id)} className="w-10 h-10 rounded-full bg-theme-highlight border border-theme-divider text-[#00b87c] flex items-center justify-center hover:bg-[#00b87c] hover:text-white transition-colors shrink-0">
                            <span className="material-symbols-outlined text-lg">check</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {(selected.installments || []).length === 0 && !showInstForm && (
                  <p className="text-sm text-theme-textMuted text-center py-10 italic">Nenhuma parcela registrada ainda.</p>
                )}
              </div>
            </>
          )}

          {tab === 'disciplines' && (
            <>
              <div className="ds-card p-6 flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-square font-black text-theme-text uppercase tracking-widest mb-1">DISCIPLINAS VINCULADAS</h3>
                  <p className="text-xs text-theme-textMuted">Escopos do projeto associados a este contrato.</p>
                </div>
                <button onClick={() => setShowScopePicker(true)} className="px-5 py-2.5 bg-[#00b87c] text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-[#00a06c] transition-colors flex items-center gap-2 shadow-md">
                  <span className="material-symbols-outlined text-sm">link</span> VINCULAR
                </button>
              </div>

              <div className="flex flex-col gap-3">
                {(selected.disciplines || []).map(d => {
                  const scope = (project.scopes || []).find(s => s.id === d.id);
                  const color = scope?.colorClass ? scope.colorClass.replace('bg-', 'text-') : 'text-[#00b87c]';
                  return (
                    <div key={d.id} className="bg-theme-card border border-theme-divider rounded-2xl p-6 relative overflow-hidden shadow-sm">
                      <div className="absolute left-0 bottom-0 top-0 w-2 bg-theme-bg">
                        <div className="absolute bottom-0 left-0 right-0 bg-[#00b87c] transition-all" style={{ height: `${d.progressPct}%` }} />
                      </div>
                      <div className="pl-6 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-theme-bg border border-theme-divider flex items-center justify-center font-square font-black text-xl text-theme-text">
                            {d.name.trim()[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="text-base font-black text-theme-text uppercase tracking-wider">{d.name}</p>
                            <p className="text-xs text-theme-textMuted mt-1">{scope?.resp || 'Arquitetura'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col items-end">
                            <input type="range" min="0" max="100" value={d.progressPct} onChange={e => handleUpdateProgress(d.id, parseInt(e.target.value))} className="w-32 accent-[#00b87c] h-1 bg-theme-bg rounded-full appearance-none outline-none cursor-pointer mb-2 border border-theme-divider" />
                          </div>
                          <div className="px-4 py-1.5 rounded-full border border-[#00b87c]/30 bg-[#00b87c]/10 text-[#00b87c] font-black text-xs">
                            {d.progressPct}%
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {(selected.disciplines || []).length === 0 && (
                  <p className="text-sm text-theme-textMuted text-center py-10 italic">Nenhuma disciplina vinculada ainda.</p>
                )}
              </div>
            </>
          )}

          {tab === 'edits' && (
            <div className="ds-card p-8 border-t-[#facc15] border-t-4">
              <h3 className="text-sm font-black text-[#facc15] uppercase tracking-widest mb-8">NOVA SOLICITAÇÃO DE EDIÇÃO</h3>
              <div className="flex flex-col gap-6">
                <div>
                  <label className="block text-[10px] font-black text-theme-textMuted uppercase tracking-widest mb-2">TÍTULO *</label>
                  <input value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} placeholder="Ex: Ajuste no prazo de entrega" className="w-full bg-theme-bg border border-theme-divider rounded-xl px-5 py-3.5 text-sm text-theme-text outline-none focus:border-[#facc15] transition-colors" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-theme-textMuted uppercase tracking-widest mb-2">CLÁUSULA / ITEM</label>
                  <input value={editForm.clause} onChange={e => setEditForm(f => ({ ...f, clause: e.target.value }))} placeholder="Ex: Cláusula 4.2 — Prazo" className="w-full bg-theme-bg border border-theme-divider rounded-xl px-5 py-3.5 text-sm text-theme-text outline-none focus:border-[#facc15] transition-colors" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-theme-textMuted uppercase tracking-widest mb-2">DESCRIÇÃO DA MUDANÇA</label>
                  <textarea value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} placeholder="Descreva o que precisa ser alterado no contrato..." className="w-full bg-theme-bg border border-theme-divider rounded-xl px-5 py-3.5 text-sm text-theme-text outline-none focus:border-[#facc15] transition-colors min-h-[120px] resize-none" />
                </div>
                <div className="flex justify-end gap-4 mt-2">
                  <button onClick={() => setEditForm({title:'',clause:'',description:''})} className="px-6 py-3 border border-theme-divider text-theme-text text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-theme-highlight transition-colors">CANCELAR</button>
                  <button onClick={() => { if(editForm.title) { setNotification('Solicitação enviada!'); setEditForm({title:'',clause:'',description:''}); } }} className="px-8 py-3 bg-[#b4860b] hover:bg-[#d4af37] text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-colors flex items-center gap-2 shadow-md">
                    <span className="material-symbols-outlined text-sm">send</span> ENVIAR
                  </button>
                </div>
              </div>

              <div className="mt-12 bg-theme-highlight rounded-2xl p-6 text-center text-theme-textMuted text-xs italic border border-theme-divider">
                Nenhuma solicitação registrada.
              </div>
            </div>
          )}

        </div>
        
        {/* Scope Picker Modal */}
        {showScopePicker && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={e => { if (e.target === e.currentTarget) setShowScopePicker(false); }}>
            <div className="ds-card w-full max-w-md shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-theme-divider flex items-center justify-between bg-theme-highlight">
                <div>
                  <p className="text-base font-black text-theme-text uppercase tracking-wider">VINCULAR DISCIPLINA</p>
                  <p className="text-[10px] text-theme-textMuted mt-1">Escopos disponíveis neste projeto</p>
                </div>
                <button onClick={() => setShowScopePicker(false)} className="text-theme-textMuted hover:text-theme-text transition-colors"><span className="material-symbols-outlined">close</span></button>
              </div>
              <div className="p-4">
                <input value={discSearch} onChange={e => setDiscSearch(e.target.value)} placeholder="Buscar disciplina..." className="w-full bg-theme-bg border border-theme-divider rounded-xl px-4 py-3 text-sm text-theme-text outline-none focus:border-[#00b87c] mb-4" autoFocus />
                <div className="flex flex-col gap-2 max-h-72 overflow-y-auto scroller pr-2">
                  {availableScopes.map(s => (
                    <button key={s.id} onClick={() => handleLinkScope(s.id, s.name)} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-theme-highlight border border-transparent hover:border-theme-divider text-left transition-all w-full group">
                      <div className={`w-10 h-10 rounded-xl ${s.colorClass || 'bg-[#00b87c]'} flex items-center justify-center text-white font-black text-sm shrink-0`}>
                        {s.name.trim()[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-theme-text truncate">{s.name}</p>
                        <p className="text-[10px] text-theme-textMuted mt-1">{s.resp || 'Sem responsável'}</p>
                      </div>
                      <span className="material-symbols-outlined text-sm text-[#00b87c] opacity-0 group-hover:opacity-100 transition-opacity">add_link</span>
                    </button>
                  ))}
                  {availableScopes.length === 0 && <p className="text-xs text-theme-textMuted text-center py-6">Nenhuma disciplina disponível.</p>}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Main List View ────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-8 w-full animate-fadeIn min-h-[calc(100vh-140px)] p-2">
      
      {/* Header text and Add Button */}
      <div className="flex items-center justify-between border-b border-theme-divider pb-6">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-theme-orange text-xl">receipt_long</span>
          <p className="text-sm font-bold text-theme-textMuted">{contracts.length} contrato(s) neste projeto</p>
        </div>
        <button onClick={() => setShowNew(true)} className="px-5 py-2.5 bg-theme-orange text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-orange-600 transition-colors flex items-center gap-2 shadow-lg">
          <span className="material-symbols-outlined text-sm">add</span> NOVO CONTRATO
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(c => {
          const st = STATUS_PILL[c.status] || STATUS_PILL.pending;
          const paid = paidTotal(c);
          const pct = c.totalValue > 0 ? Math.min(100, Math.round((paid / c.totalValue) * 100)) : 0;
          return (
            <div key={c.id} onClick={() => setSelected(c)} className="ds-card p-6 cursor-pointer group flex flex-col relative overflow-hidden min-h-[220px]">
              <div className="flex justify-between items-start mb-8">
                <div className="flex-1 pr-4">
                  <h3 className="text-lg font-square font-black text-theme-text uppercase tracking-wider mb-2 leading-tight">{c.name}</h3>
                  <p className="text-[10px] text-theme-textMuted font-bold flex items-center gap-1"><span className="material-symbols-outlined text-[10px]">storefront</span> {c.supplier}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className={`px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-wider whitespace-nowrap ${st.tw}`}>
                    {st.label}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(c.id, c.name);
                    }}
                    className="w-7 h-7 rounded-full bg-red-500/10 text-red-500 border border-red-500/20 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white transition-all shadow-sm flex-shrink-0"
                    title="Excluir Contrato"
                  >
                    <span className="material-symbols-outlined text-sm">delete</span>
                  </button>
                </div>
              </div>

              <div className="mt-auto">
                <p className="text-[9px] font-black uppercase tracking-widest text-theme-textMuted mb-2">VALOR TOTAL</p>
                <div className="flex justify-between items-end mb-3">
                  <div className="h-1.5 flex-1 bg-theme-bg border border-theme-divider rounded-full mr-4 overflow-hidden relative mb-1.5">
                    <div className="absolute top-0 bottom-0 left-0 bg-[#00b87c] transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-lg font-square font-black text-theme-text leading-none">{fmt(c.totalValue)}</p>
                </div>
                <div className="flex justify-between text-[10px] font-bold">
                  <span className="text-theme-textMuted">Pago: {fmt(paid)}</span>
                  <span className="text-[#00b87c]">{pct}%</span>
                </div>
              </div>

              {c.linkedWork && (
                <div className="mt-5 pt-4 border-t border-theme-divider flex items-center gap-2 text-theme-textMuted">
                  <span className="material-symbols-outlined text-[14px]">domain</span>
                  <span className="text-[10px] font-black uppercase tracking-wider">{c.linkedWork}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showNew && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) setShowNew(false); }}>
          <div className="ds-card p-8 w-full max-w-lg shadow-2xl relative">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-sm font-square font-black text-theme-text uppercase tracking-widest">NOVO CONTRATO</h3>
              <button onClick={() => setShowNew(false)} className="text-theme-textMuted hover:text-theme-text transition-colors"><span className="material-symbols-outlined">close</span></button>
            </div>
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-[10px] font-black text-theme-textMuted uppercase tracking-widest mb-2">NOME DO CONTRATO *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required className="w-full bg-theme-bg border border-theme-divider rounded-xl px-4 py-3 text-sm text-theme-text outline-none focus:border-theme-orange" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-theme-textMuted uppercase tracking-widest mb-2">FORNECEDOR *</label>
                  <input value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} required className="w-full bg-theme-bg border border-theme-divider rounded-xl px-4 py-3 text-sm text-theme-text outline-none focus:border-theme-orange" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-theme-textMuted uppercase tracking-widest mb-2">VALOR TOTAL (R$)</label>
                  <input type="number" value={form.totalValue} onChange={e => setForm(f => ({ ...f, totalValue: e.target.value }))} min="0" step="0.01" className="w-full bg-theme-bg border border-theme-divider rounded-xl px-4 py-3 text-sm text-theme-text outline-none focus:border-theme-orange" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-theme-textMuted uppercase tracking-widest mb-2">PRAZO / VIGÊNCIA</label>
                  <input value={form.term} onChange={e => setForm(f => ({ ...f, term: e.target.value }))} className="w-full bg-theme-bg border border-theme-divider rounded-xl px-4 py-3 text-sm text-theme-text outline-none focus:border-theme-orange" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-theme-textMuted uppercase tracking-widest mb-2">RESPONSÁVEL</label>
                  <input value={form.responsible} onChange={e => setForm(f => ({ ...f, responsible: e.target.value }))} className="w-full bg-theme-bg border border-theme-divider rounded-xl px-4 py-3 text-sm text-theme-text outline-none focus:border-theme-orange" />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-black text-theme-textMuted uppercase tracking-widest mb-2">OBRA VINCULADA</label>
                  <input value={form.linkedWork} onChange={e => setForm(f => ({ ...f, linkedWork: e.target.value }))} className="w-full bg-theme-bg border border-theme-divider rounded-xl px-4 py-3 text-sm text-theme-text outline-none focus:border-theme-orange" />
                </div>
              </div>
              <div className="flex gap-4 justify-end mt-4">
                <button type="button" onClick={() => setShowNew(false)} className="px-6 py-3 text-[10px] font-black text-theme-textMuted hover:text-theme-text uppercase tracking-widest transition-colors">CANCELAR</button>
                <button type="submit" className="px-6 py-3 font-black bg-theme-orange text-white rounded-xl text-[10px] uppercase tracking-widest hover:bg-orange-600 transition-colors shadow-lg">CRIAR CONTRATO</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
