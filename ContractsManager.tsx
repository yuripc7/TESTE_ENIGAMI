import React, { useState, useRef, useMemo } from 'react';
import { Project, Contract, ContractInstallment, ContractDiscipline, FileLink } from '../types';
import { useApp } from '../contexts/AppContext';
import { readFileAsDataURL } from '../utils/fileReaderUtils';
import { validateFileSize } from '../utils/validation';

interface ContractsManagerProps {
  project: Project;
  db: any;
  onUpdateProject: (updated: Project) => void;
  currentUser: { name: string; avatar?: string } | null;
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (d?: string) => {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
};
const today = () => new Date().toISOString().split('T')[0];
const uid   = () => `${Date.now()}-${Math.random().toString(36).slice(2,6)}`;

const isOverdue = (i: ContractInstallment) =>
  i.status !== 'paid' && i.dueDate && i.dueDate < today();

const paidTotal    = (c: Contract) => (c.installments||[]).filter(i=>i.status==='paid').reduce((s,i)=>s+i.value,0);
const pendingTotal = (c: Contract) => (c.installments||[]).filter(i=>i.status!=='paid').reduce((s,i)=>s+i.value,0);

const STATUS: Record<Contract['status'],{label:string;tw:string}> = {
  active:  { label:'Ativo',     tw:'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  pending: { label:'Pendente',  tw:'text-amber-400  bg-amber-500/10  border-amber-500/30'  },
  closed:  { label:'Encerrado', tw:'text-gray-400   bg-gray-500/10   border-gray-500/30'   },
};

const INST_BADGE: Record<ContractInstallment['status'],{label:string;tw:string}> = {
  paid:    { label:'Pago',    tw:'text-emerald-400 bg-emerald-500/15 border-emerald-500/30' },
  pending: { label:'Pendente',tw:'text-amber-400   bg-amber-500/15  border-amber-500/30'  },
  future:  { label:'Futuro',  tw:'text-sky-400     bg-sky-500/15    border-sky-500/30'    },
};

type DetailTab = 'contrato'|'financeiro'|'disciplinas'|'edicoes';

export const ContractsManager: React.FC<ContractsManagerProps> = ({
  project, onUpdateProject, currentUser,
}) => {
  const { addLog, setNotification } = useApp();
  const contracts: Contract[] = project.contracts || [];

  /* ── List state ── */
  const [selected, setSelected] = useState<Contract|null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('contrato');
  const [showNew,  setShowNew]  = useState(false);
  const [search,   setSearch]   = useState('');
  const [filter,   setFilter]   = useState<'all'|Contract['status']>('all');

  /* ── New contract form ── */
  const EMPTY = { name:'', supplier:'', totalValue:'', startDate:'', endDate:'', responsible:'', linkedWork:'' };
  const [form, setForm] = useState(EMPTY);

  /* ── Installment form ── */
  const [showInstForm, setShowInstForm] = useState(false);
  const [instForm, setInstForm] = useState({ description:'', value:'', dueDate:'', status:'future' as ContractInstallment['status'] });

  /* ── Edit request form ── */
  const [showEditForm, setShowEditForm] = useState(false);
  const [editForm, setEditForm] = useState({ title:'', clause:'', description:'' });

  /* ── Scope picker ── */
  const [showScopePicker, setShowScopePicker] = useState(false);
  const [scopeSearch, setScopeSearch] = useState('');

  /* ── PDF ── */
  const pdfRef  = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  /* ── Computed ── */
  const filtered = useMemo(() => contracts.filter(c => {
    const ms = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.supplier.toLowerCase().includes(search.toLowerCase());
    const mf = filter === 'all' || c.status === filter;
    return ms && mf;
  }), [contracts, search, filter]);

  const availableScopes = useMemo(() => {
    const linked = new Set((selected?.disciplines||[]).map(d=>d.id));
    return (project.scopes||[]).filter(s =>
      !linked.has(s.id) &&
      (!scopeSearch || s.name.toLowerCase().includes(scopeSearch.toLowerCase()))
    );
  }, [project.scopes, selected, scopeSearch]);

  /* ── Save helper ── */
  const save = (updated: Contract[], msg?: string) => {
    onUpdateProject({ ...project, contracts: updated, updatedAt: new Date().toISOString() });
    if (msg) { setNotification(msg); addLog(currentUser?.name||'SISTEMA', msg); }
    if (selected) setSelected(updated.find(c=>c.id===selected.id)||null);
  };

  /* ── Contract handlers ── */
  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.supplier.trim()) { setNotification('Preencha nome e fornecedor.'); return; }
    const novo: Contract = {
      id: uid(), name: form.name.trim(), supplier: form.supplier.trim(),
      totalValue: parseFloat(form.totalValue)||0,
      status: 'pending', createdAt: new Date().toISOString(),
      term: form.endDate ? `${fmtDate(form.startDate)} → ${fmtDate(form.endDate)}` : '',
      responsible: form.responsible, linkedWork: form.linkedWork,
      installments:[], disciplines:[], edits:[],
    };
    save([...contracts, novo], `CONTRATO CRIADO: ${novo.name}`);
    setForm(EMPTY); setShowNew(false);
  };

  const handleDelete = (id: string) => {
    save(contracts.filter(c=>c.id!==id), 'CONTRATO REMOVIDO');
    if (selected?.id===id) setSelected(null);
  };

  const cycleSt = (id: string) => {
    const cy: Contract['status'][] = ['pending','active','closed'];
    save(contracts.map(c=>c.id===id?{...c,status:cy[(cy.indexOf(c.status)+1)%3]}:c));
  };

  /* ── PDF ── */
  const handlePdf = async (file: File) => {
    if (!selected) return;
    const err = validateFileSize(file, 10);
    if (err) { setNotification(err); return; }
    try {
      setUploading(true);
      const path = await readFileAsDataURL(file);
      const fl: FileLink = { label:file.name, path, author:currentUser?.name, createdAt:new Date().toISOString() };
      save(contracts.map(c=>c.id===selected.id?{...c,pdfAttachment:fl}:c), 'PDF ANEXADO');
    } catch { setNotification('Erro ao carregar arquivo.'); }
    finally { setUploading(false); }
  };

  /* ── Installment handlers ── */
  const handleAddInst = () => {
    if (!selected || !instForm.description.trim() || !instForm.value) return;
    const inst: ContractInstallment = {
      id:uid(), description:instForm.description.trim(),
      value:parseFloat(instForm.value)||0, dueDate:instForm.dueDate, status:instForm.status,
    };
    save(contracts.map(c=>c.id===selected.id?{...c,installments:[...(c.installments||[]),inst]}:c), 'PARCELA ADICIONADA');
    setInstForm({ description:'', value:'', dueDate:'', status:'future' });
    setShowInstForm(false);
  };

  const handlePayInst = (instId: string) => {
    if (!selected) return;
    save(contracts.map(c=>c.id===selected.id?{
      ...c,
      installments:c.installments.map(i=>i.id===instId?{...i,status:'paid',paymentDate:today()}:i),
    }:c), 'PARCELA PAGA');
  };

  const handleDelInst = (instId: string) => {
    if (!selected) return;
    save(contracts.map(c=>c.id===selected.id?{...c,installments:c.installments.filter(i=>i.id!==instId)}:c));
  };

  /* ── Discipline handlers ── */
  const handleLinkScope = (scopeId: string, scopeName: string) => {
    if (!selected) return;
    const disc: ContractDiscipline = { id:scopeId, name:scopeName, progressPct:0 };
    save(contracts.map(c=>c.id===selected.id?{...c,disciplines:[...(c.disciplines||[]),disc]}:c), `DISCIPLINA VINCULADA: ${scopeName}`);
    setShowScopePicker(false); setScopeSearch('');
  };

  const handleDiscProgress = (discId: string, pct: number) => {
    if (!selected) return;
    save(contracts.map(c=>c.id===selected.id?{
      ...c, disciplines:c.disciplines.map(d=>d.id===discId?{...d,progressPct:pct}:d),
    }:c));
  };

  const handleUnlink = (discId: string) => {
    if (!selected) return;
    save(contracts.map(c=>c.id===selected.id?{...c,disciplines:c.disciplines.filter(d=>d.id!==discId)}:c), 'DISCIPLINA DESVINCULADA');
  };

  /* ── Edit request handlers ── */
  const handleAddEdit = () => {
    if (!selected || !editForm.title.trim()) { setNotification('Preencha o título.'); return; }
    const req: any = {
      id:uid(), date:new Date().toISOString(),
      author:currentUser?.name||'Usuário',
      title:editForm.title.trim(), clause:editForm.clause.trim(),
      description:editForm.description.trim(), status:'review',
    };
    save(contracts.map(c=>c.id===selected.id?{...c,edits:[...(c.edits||[]),req]}:c), 'SOLICITAÇÃO DE EDIÇÃO ENVIADA');
    setEditForm({ title:'', clause:'', description:'' }); setShowEditForm(false);
  };

  /* ══════════════════════════════════════════════════════════════════════
      RENDER
  ══════════════════════════════════════════════════════════════════════ */
  return (
    <div className="p-4 md:p-6 flex flex-col gap-5">

      {/* ── Header controls ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-2 flex-wrap items-center">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-theme-textMuted text-sm">search</span>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar..."
              className="pl-8 pr-3 py-1.5 text-xs bg-theme-card border border-theme-border rounded-xl text-theme-text outline-none focus:border-emerald-500 w-40" />
          </div>
          {(['all','active','pending','closed'] as const).map(f=>(
            <button key={f} onClick={()=>setFilter(f)}
              className={`px-3 py-1.5 text-[10px] font-black uppercase rounded-xl border transition-all ${filter===f?'bg-emerald-500 text-white border-emerald-500':'bg-theme-card text-theme-textMuted border-theme-border hover:text-theme-text'}`}>
              {f==='all'?'Todos':STATUS[f as Contract['status']].label}
            </button>
          ))}
        </div>
        <button onClick={()=>setShowNew(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-black transition-colors">
          <span className="material-symbols-outlined text-sm">add</span>
          Novo Contrato
        </button>
      </div>

      {/* ── Contract list ── */}
      <p className="text-[10px] text-theme-textMuted">{filtered.length} contrato(s) neste projeto</p>

      <div className="flex flex-col gap-3">
        {filtered.length === 0 && (
          <div className="text-center py-10 text-theme-textMuted">
            <span className="material-symbols-outlined text-4xl block mb-2 opacity-30">description</span>
            <p className="text-xs">Nenhum contrato encontrado</p>
          </div>
        )}
        {filtered.map(c => {
          const paid = paidTotal(c);
          const pct  = c.totalValue > 0 ? Math.min(100, Math.round((paid/c.totalValue)*100)) : 0;
          const st   = STATUS[c.status];
          return (
            <div key={c.id} onClick={()=>{ setSelected(c); setDetailTab('contrato'); }}
              className="bg-theme-card border border-theme-border rounded-2xl p-4 cursor-pointer hover:border-emerald-500/50 transition-all">

              {/* Top row */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-lg border ${st.tw}`}>{st.label}</span>
                  <p className="font-black text-sm text-theme-text mt-1">{c.name}</p>
                  <p className="text-xs text-theme-textMuted flex items-center gap-1 mt-0.5">
                    <span className="material-symbols-outlined text-xs">apartment</span>
                    {c.linkedWork || c.supplier}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[9px] text-theme-textMuted uppercase font-bold">Valor Total</p>
                  <p className="font-black text-sm text-theme-text">{fmt(c.totalValue)}</p>
                  <p className="text-[10px] text-emerald-400">Pago: {fmt(paid)}</p>
                </div>
              </div>

              {/* Progress */}
              <div className="h-1.5 bg-theme-bg rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all" style={{width:`${pct}%`}} />
              </div>
              <div className="flex justify-between text-[9px] text-theme-textMuted mt-1">
                <span>{pct}% pago</span>
                <span>{c.installments?.length||0} parcela(s)</span>
              </div>

              {/* Discipline pills */}
              {(c.disciplines||[]).length > 0 && (
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {c.disciplines.slice(0,5).map(d=>{
                    const sc = (project.scopes||[]).find(s=>s.id===d.id);
                    return (
                      <div key={d.id} className="flex items-center gap-1 bg-theme-bg border border-theme-border rounded-lg px-2 py-0.5">
                        {sc?.colorClass && <div className={`w-2 h-2 rounded-full ${sc.colorClass}`} />}
                        <span className="text-[9px] text-theme-textMuted">{d.name}</span>
                        <span className="text-[9px] font-bold text-emerald-400">{d.progressPct}%</span>
                      </div>
                    );
                  })}
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
          onClick={e=>{if(e.target===e.currentTarget)setShowNew(false);}}>
          <div className="bg-theme-card border border-theme-border rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-black text-theme-text uppercase tracking-wider">Novo Contrato</h3>
              <button onClick={()=>setShowNew(false)} className="text-theme-textMuted hover:text-theme-text text-xl leading-none">×</button>
            </div>
            <form onSubmit={handleCreate} className="flex flex-col gap-3">
              <div>
                <label className="lbl">Nome do Contrato *</label>
                <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Ex: Contrato Arquitetura" required className="inp" />
              </div>
              <div>
                <label className="lbl">Fornecedor / Empresa *</label>
                <input value={form.supplier} onChange={e=>setForm(f=>({...f,supplier:e.target.value}))} placeholder="Nome do fornecedor" required className="inp" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="lbl">Valor Total (R$)</label>
                  <input type="number" value={form.totalValue} onChange={e=>setForm(f=>({...f,totalValue:e.target.value}))} placeholder="0,00" min="0" step="0.01" className="inp" />
                </div>
                <div>
                  <label className="lbl">Responsável</label>
                  <input value={form.responsible} onChange={e=>setForm(f=>({...f,responsible:e.target.value}))} placeholder="Nome" className="inp" />
                </div>
                <div>
                  <label className="lbl">Início</label>
                  <input type="date" value={form.startDate} onChange={e=>setForm(f=>({...f,startDate:e.target.value}))} className="inp" />
                </div>
                <div>
                  <label className="lbl">Término</label>
                  <input type="date" value={form.endDate} onChange={e=>setForm(f=>({...f,endDate:e.target.value}))} className="inp" />
                </div>
              </div>
              <div>
                <label className="lbl">Obra Vinculada</label>
                <input value={form.linkedWork} onChange={e=>setForm(f=>({...f,linkedWork:e.target.value}))} placeholder="Nome da obra" className="inp" />
              </div>
              <div className="flex gap-2 justify-end pt-2 border-t border-theme-border">
                <button type="button" onClick={()=>setShowNew(false)} className="px-4 py-2 text-xs text-theme-textMuted border border-theme-border rounded-xl hover:text-theme-text">Cancelar</button>
                <button type="submit" className="px-4 py-2 text-xs font-black bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl">Criar Contrato</button>
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
          onClick={e=>{if(e.target===e.currentTarget)setSelected(null);}}>
          <div className="bg-theme-card border border-theme-border rounded-2xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden">

            {/* ── Modal header ── */}
            <div className="p-5 border-b border-theme-border shrink-0">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <button onClick={()=>cycleSt(selected.id)}
                      className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-lg border cursor-pointer hover:opacity-70 ${STATUS[selected.status].tw}`}>
                      {STATUS[selected.status].label} ↻
                    </button>
                  </div>
                  <h2 className="text-base font-black text-theme-text">{selected.name}</h2>
                  <p className="text-xs text-theme-textMuted">{selected.supplier} • {fmt(selected.totalValue)}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={()=>handleDelete(selected.id)} className="text-red-400/60 hover:text-red-400 transition-colors">
                    <span className="material-symbols-outlined text-base">delete</span>
                  </button>
                  <button onClick={()=>setSelected(null)} className="text-theme-textMuted hover:text-theme-text text-xl leading-none">×</button>
                </div>
              </div>
            </div>

            {/* ── Tabs ── */}
            <div className="flex border-b border-theme-border shrink-0 px-5 gap-1">
              {([
                { key:'contrato',    label:'Contrato',    icon:'description' },
                { key:'financeiro',  label:'Financeiro',  icon:'payments'    },
                { key:'disciplinas', label:'Disciplinas', icon:'analytics'   },
                { key:'edicoes',     label:'Edições',     icon:'edit_note'   },
              ] as const).map(t=>(
                <button key={t.key} onClick={()=>setDetailTab(t.key)}
                  className={`flex items-center gap-1.5 px-3 py-2.5 text-[10px] font-bold border-b-2 transition-all -mb-px uppercase tracking-wide ${
                    detailTab===t.key ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-theme-textMuted hover:text-theme-text'
                  }`}>
                  <span className="material-symbols-outlined text-sm">{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </div>

            {/* ── Tab content ── */}
            <div className="flex-1 overflow-y-auto p-5">

              {/* ━━ CONTRATO TAB ━━ */}
              {detailTab === 'contrato' && (
                <div className="flex flex-col gap-4">
                  {/* 4 info cards */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-theme-bg border border-theme-border rounded-xl p-4">
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="material-symbols-outlined text-emerald-400 text-base">attach_money</span>
                        <p className="text-[9px] font-black uppercase tracking-widest text-theme-textMuted">Valor Total</p>
                      </div>
                      <p className="text-base font-black text-theme-text">{fmt(selected.totalValue)}</p>
                    </div>
                    <div className="bg-theme-bg border border-theme-border rounded-xl p-4">
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="material-symbols-outlined text-emerald-400 text-base">calendar_month</span>
                        <p className="text-[9px] font-black uppercase tracking-widest text-theme-textMuted">Vigência</p>
                      </div>
                      <p className="text-sm font-bold text-theme-text">{selected.term || '—'}</p>
                    </div>
                    <div className="bg-theme-bg border border-theme-border rounded-xl p-4">
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="material-symbols-outlined text-emerald-400 text-base">person</span>
                        <p className="text-[9px] font-black uppercase tracking-widest text-theme-textMuted">Responsável</p>
                      </div>
                      <p className="text-sm font-bold text-theme-text">{selected.responsible || '—'}</p>
                    </div>
                    <div className="bg-theme-bg border border-theme-border rounded-xl p-4">
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="material-symbols-outlined text-emerald-400 text-base">apartment</span>
                        <p className="text-[9px] font-black uppercase tracking-widest text-theme-textMuted">Obra Vinculada</p>
                      </div>
                      <p className="text-sm font-bold text-theme-text">{selected.linkedWork || '—'}</p>
                    </div>
                  </div>

                  {/* PDF attachment */}
                  <input ref={pdfRef} type="file" accept=".pdf" className="hidden"
                    onChange={e=>{ const f=e.target.files?.[0]; if(f) handlePdf(f); e.target.value=''; }} />

                  <div className="bg-theme-bg border border-theme-border rounded-xl p-5 flex flex-col items-center gap-3 text-center">
                    <span className="material-symbols-outlined text-theme-textMuted/40 text-5xl">picture_as_pdf</span>
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-theme-text">Anexo do Contrato</p>
                      {selected.pdfAttachment ? (
                        <a href={selected.pdfAttachment.path} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-emerald-400 hover:underline mt-1 block truncate max-w-xs">
                          {selected.pdfAttachment.label}
                        </a>
                      ) : (
                        <p className="text-xs text-theme-textMuted mt-1">Nenhum PDF vinculado ainda.</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={()=>pdfRef.current?.click()} disabled={uploading}
                        className="flex items-center gap-1.5 px-4 py-2 border border-theme-border rounded-xl text-xs text-theme-textMuted hover:text-theme-text transition-colors">
                        <span className="material-symbols-outlined text-sm">upload</span>
                        {uploading ? 'Carregando...' : 'Upload PDF'}
                      </button>
                      <button onClick={()=>{ setDetailTab('edicoes'); setShowEditForm(true); }}
                        className="flex items-center gap-1.5 px-4 py-2 border border-theme-border rounded-xl text-xs text-theme-textMuted hover:text-theme-text transition-colors">
                        <span className="material-symbols-outlined text-sm">edit_note</span>
                        Solicitar Edição
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ━━ FINANCEIRO TAB ━━ */}
              {detailTab === 'financeiro' && (
                <div className="flex flex-col gap-4">
                  {/* Summary card */}
                  {(() => {
                    const paid = paidTotal(selected);
                    const pend = pendingTotal(selected);
                    const pct  = selected.totalValue > 0 ? Math.min(100, Math.round((paid/selected.totalValue)*100)) : 0;
                    return (
                      <div className="bg-theme-bg border border-theme-border rounded-xl p-4">
                        <div className="grid grid-cols-3 gap-3 mb-4">
                          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-center">
                            <p className="text-[9px] font-black uppercase tracking-widest text-emerald-400 mb-1">Pago</p>
                            <p className="text-base font-black text-emerald-400">{fmt(paid)}</p>
                          </div>
                          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-center">
                            <p className="text-[9px] font-black uppercase tracking-widest text-amber-400 mb-1">A Pagar</p>
                            <p className="text-base font-black text-amber-400">{fmt(pend)}</p>
                          </div>
                          <div className="bg-theme-card border border-theme-border rounded-xl p-3 text-center">
                            <p className="text-[9px] font-black uppercase tracking-widest text-theme-textMuted mb-1">Progresso</p>
                            <p className="text-base font-black text-theme-text">{pct}%</p>
                          </div>
                        </div>
                        <div className="h-2 bg-theme-card rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full transition-all" style={{width:`${pct}%`}} />
                        </div>
                        <div className="flex justify-between text-[9px] text-theme-textMuted mt-1.5">
                          <span>{pct}% pago</span>
                          <span>{fmt(selected.totalValue)} total</span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Parcelas header */}
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-black uppercase tracking-wide text-theme-text">
                      Parcelas ({(selected.installments||[]).length})
                    </p>
                    <button onClick={()=>setShowInstForm(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[10px] font-black transition-colors">
                      <span className="material-symbols-outlined text-sm">add_card</span>
                      Registrar Pagamento
                    </button>
                  </div>

                  {/* Installment form */}
                  {showInstForm && (
                    <div className="bg-theme-bg border border-theme-border rounded-xl p-4 flex flex-col gap-3">
                      <input value={instForm.description} onChange={e=>setInstForm(f=>({...f,description:e.target.value}))}
                        placeholder="Descrição (ex: Parcela 1)" className="inp" />
                      <div className="grid grid-cols-2 gap-2">
                        <input type="number" value={instForm.value} onChange={e=>setInstForm(f=>({...f,value:e.target.value}))}
                          placeholder="Valor (R$)" min="0" step="0.01" className="inp" />
                        <input type="date" value={instForm.dueDate} onChange={e=>setInstForm(f=>({...f,dueDate:e.target.value}))} className="inp" />
                      </div>
                      <select value={instForm.status} onChange={e=>setInstForm(f=>({...f,status:e.target.value as any}))} className="inp">
                        <option value="future">Futuro</option>
                        <option value="pending">Pendente</option>
                        <option value="paid">Pago</option>
                      </select>
                      <div className="flex gap-2">
                        <button onClick={()=>setShowInstForm(false)} className="flex-1 py-2 text-[10px] border border-theme-border rounded-xl text-theme-textMuted hover:text-theme-text">Cancelar</button>
                        <button onClick={handleAddInst} className="flex-1 py-2 text-[10px] font-black bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl">Adicionar</button>
                      </div>
                    </div>
                  )}

                  {/* Installment list */}
                  {(selected.installments||[]).length === 0 && !showInstForm && (
                    <p className="text-xs text-theme-textMuted text-center py-4">Nenhuma parcela cadastrada</p>
                  )}
                  <div className="flex flex-col gap-2">
                    {(selected.installments||[]).map((inst,i)=>{
                      const over = isOverdue(inst);
                      const bd   = INST_BADGE[inst.status];
                      return (
                        <div key={inst.id}
                          className={`flex items-center gap-3 p-3 rounded-xl border ${over?'bg-red-500/5 border-red-500/30':'bg-theme-bg border-theme-border'}`}>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-theme-text">
                              {inst.description || `Parcela ${i+1}`}
                            </p>
                            <p className={`text-[9px] mt-0.5 ${over?'text-red-400':'text-theme-textMuted'}`}>
                              Venc: {fmtDate(inst.dueDate)}
                              {inst.paymentDate && ` · Pago em ${fmtDate(inst.paymentDate)}`}
                            </p>
                          </div>
                          <p className="text-xs font-black text-theme-text shrink-0">{fmt(inst.value)}</p>
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg border shrink-0 ${bd.tw}`}>{bd.label}</span>
                          <div className="flex gap-1 shrink-0">
                            {inst.status !== 'paid' && (
                              <button onClick={()=>handlePayInst(inst.id)} className="text-emerald-400 hover:text-emerald-300" title="Marcar como pago">
                                <span className="material-symbols-outlined text-base">check_circle</span>
                              </button>
                            )}
                            <button onClick={()=>handleDelInst(inst.id)} className="text-red-400/50 hover:text-red-400">
                              <span className="material-symbols-outlined text-base">delete</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ━━ DISCIPLINAS TAB ━━ */}
              {detailTab === 'disciplinas' && (
                <div className="flex flex-col gap-3">
                  {/* Header */}
                  <div className="bg-theme-bg border border-theme-border rounded-xl p-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-theme-text">Disciplinas Vinculadas</p>
                      <p className="text-[10px] text-theme-textMuted mt-0.5">Escopo do projeto associado a este contrato.</p>
                    </div>
                    <button onClick={()=>{ setShowScopePicker(true); setScopeSearch(''); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[10px] font-black shrink-0 transition-colors">
                      <span className="material-symbols-outlined text-sm">link</span>
                      Vincular
                    </button>
                  </div>

                  {/* Empty */}
                  {(selected.disciplines||[]).length === 0 && (
                    <div className="border border-dashed border-theme-border rounded-xl p-8 text-center">
                      <span className="material-symbols-outlined text-3xl text-theme-textMuted/30 block mb-2">analytics</span>
                      <p className="text-xs text-theme-textMuted">Nenhuma disciplina vinculada ainda.</p>
                    </div>
                  )}

                  {/* Discipline cards */}
                  {(selected.disciplines||[]).map(d=>{
                    const sc = (project.scopes||[]).find(s=>s.id===d.id);
                    const cl = sc?.colorClass || 'bg-emerald-600';
                    return (
                      <div key={d.id} className="bg-theme-bg border border-theme-border rounded-xl p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`w-10 h-10 rounded-xl ${cl} flex items-center justify-center text-white font-black text-sm shrink-0`}>
                            {d.name[0]?.toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-black text-theme-text">{d.name}</p>
                            {sc?.resp && <p className="text-[10px] text-theme-textMuted">{sc.resp}</p>}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-xs font-black px-2 py-0.5 rounded-lg border ${
                              d.progressPct>=100?'text-emerald-400 bg-emerald-500/10 border-emerald-500/30':
                              d.progressPct>0?'text-sky-400 bg-sky-500/10 border-sky-500/30':
                              'text-theme-textMuted bg-theme-card border-theme-border'
                            }`}>{d.progressPct}%</span>
                            <button onClick={()=>handleUnlink(d.id)} className="text-red-400/40 hover:text-red-400 transition-colors">
                              <span className="material-symbols-outlined text-sm">link_off</span>
                            </button>
                          </div>
                        </div>
                        <div className="h-1.5 bg-theme-card rounded-full overflow-hidden mb-2">
                          <div className="h-full rounded-full transition-all"
                            style={{ width:`${d.progressPct}%`, background: d.progressPct>=100?'#10b981':`hsl(${d.progressPct*1.2},70%,50%)` }} />
                        </div>
                        <div className="flex items-center gap-2">
                          <input type="range" min="0" max="100" value={d.progressPct}
                            onChange={e=>handleDiscProgress(d.id,parseInt(e.target.value))}
                            className="flex-1 accent-emerald-500 cursor-pointer h-1" />
                          <input type="number" min="0" max="100" value={d.progressPct}
                            onChange={e=>handleDiscProgress(d.id,Math.min(100,Math.max(0,parseInt(e.target.value)||0)))}
                            className="w-12 text-center text-[10px] bg-theme-card border border-theme-border rounded-lg py-1 text-theme-text outline-none focus:border-emerald-500" />
                          <span className="text-[10px] text-theme-textMuted">%</span>
                        </div>
                      </div>
                    );
                  })}

                  {/* Scope picker modal */}
                  {showScopePicker && (
                    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 p-4"
                      onClick={e=>{if(e.target===e.currentTarget)setShowScopePicker(false);}}>
                      <div className="bg-theme-card border border-theme-border rounded-2xl w-full max-w-sm">
                        <div className="p-4 border-b border-theme-border flex items-center justify-between">
                          <div>
                            <p className="text-sm font-black text-theme-text">Vincular Disciplina</p>
                            <p className="text-[10px] text-theme-textMuted">Escopos deste projeto</p>
                          </div>
                          <button onClick={()=>setShowScopePicker(false)} className="text-theme-textMuted hover:text-theme-text">
                            <span className="material-symbols-outlined text-base">close</span>
                          </button>
                        </div>
                        <div className="px-3 pt-3">
                          <input value={scopeSearch} onChange={e=>setScopeSearch(e.target.value)}
                            placeholder="Buscar disciplina..." autoFocus
                            className="w-full inp" />
                        </div>
                        <div className="p-3 flex flex-col gap-1.5 max-h-64 overflow-y-auto">
                          {availableScopes.length === 0 ? (
                            <p className="text-xs text-theme-textMuted text-center py-4">
                              {(project.scopes||[]).length === 0 ? 'Projeto sem escopos.' : 'Todos os escopos já vinculados.'}
                            </p>
                          ) : availableScopes.map(s=>(
                            <button key={s.id} onClick={()=>handleLinkScope(s.id,s.name)}
                              className="flex items-center gap-3 p-3 rounded-xl hover:bg-theme-bg border border-transparent hover:border-theme-border text-left transition-colors w-full">
                              <div className={`w-8 h-8 rounded-lg ${s.colorClass||'bg-emerald-600'} flex items-center justify-center text-white font-black text-sm shrink-0`}>
                                {s.name[0]?.toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-theme-text">{s.name}</p>
                                {s.resp && <p className="text-[9px] text-theme-textMuted">{s.resp}</p>}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ━━ EDIÇÕES TAB ━━ */}
              {detailTab === 'edicoes' && (
                <div className="flex flex-col gap-4">
                  {/* Edit request form */}
                  {showEditForm && (
                    <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 flex flex-col gap-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-amber-400">Nova Solicitação de Edição</p>
                      <div>
                        <label className="lbl">Título *</label>
                        <input value={editForm.title} onChange={e=>setEditForm(f=>({...f,title:e.target.value}))}
                          placeholder="Ex: Ajuste no prazo de entrega" className="inp" />
                      </div>
                      <div>
                        <label className="lbl">Cláusula / Item</label>
                        <input value={editForm.clause} onChange={e=>setEditForm(f=>({...f,clause:e.target.value}))}
                          placeholder="Ex: Cláusula 4.2 — Prazo" className="inp" />
                      </div>
                      <div>
                        <label className="lbl">Descrição da Mudança</label>
                        <textarea value={editForm.description} onChange={e=>setEditForm(f=>({...f,description:e.target.value}))}
                          placeholder="Descreva o que precisa ser alterado no contrato..."
                          rows={3} className="inp resize-none" />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button onClick={()=>{ setShowEditForm(false); setEditForm({title:'',clause:'',description:''}); }}
                          className="px-4 py-2 text-[10px] font-bold border border-theme-border rounded-xl text-theme-textMuted hover:text-theme-text">Cancelar</button>
                        <button onClick={handleAddEdit}
                          className="flex items-center gap-1.5 px-4 py-2 text-[10px] font-black bg-amber-500 hover:bg-amber-600 text-white rounded-xl">
                          <span className="material-symbols-outlined text-sm">send</span>Enviar
                        </button>
                      </div>
                    </div>
                  )}

                  {!showEditForm && (
                    <button onClick={()=>setShowEditForm(true)}
                      className="flex items-center gap-2 w-full border border-dashed border-amber-500/30 rounded-xl py-3 px-4 text-xs text-amber-400 hover:bg-amber-500/5 transition-colors">
                      <span className="material-symbols-outlined text-sm">add</span>
                      Nova Solicitação de Edição
                    </button>
                  )}

                  {/* Edit request list */}
                  {(selected.edits||[]).length === 0 && !showEditForm && (
                    <div className="bg-theme-bg border border-theme-border rounded-xl p-6 text-center">
                      <p className="text-xs text-theme-textMuted">Nenhuma solicitação registrada.</p>
                    </div>
                  )}
                  <div className="flex flex-col gap-2">
                    {(selected.edits||[]).map((ed:any)=>(
                      <div key={ed.id} className="bg-theme-bg border border-theme-border rounded-xl p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-theme-text">{ed.title || ed.description}</p>
                            {ed.clause && <p className="text-[9px] text-theme-textMuted mt-0.5">{ed.clause}</p>}
                            {ed.description && ed.title && <p className="text-[10px] text-theme-textMuted mt-1">{ed.description}</p>}
                          </div>
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg border shrink-0 ${
                            ed.status==='approved'?'text-emerald-400 bg-emerald-500/10 border-emerald-500/30':
                            ed.status==='refused'?'text-red-400 bg-red-500/10 border-red-500/30':
                            'text-amber-400 bg-amber-500/10 border-amber-500/30'
                          }`}>{ed.status==='approved'?'Aprovado':ed.status==='refused'?'Recusado':'Em Revisão'}</span>
                        </div>
                        <p className="text-[9px] text-theme-textMuted mt-2">{ed.author} · {new Date(ed.date).toLocaleDateString('pt-BR')}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .lbl { display:block; font-size:10px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; margin-bottom:4px; color:var(--color-textMuted,#6b7280); }
        .inp { width:100%; background:var(--color-bg,#0d1117); border:1px solid var(--color-border,#30363d); border-radius:10px; padding:7px 10px; font-size:12px; color:var(--color-text,#e6edf3); outline:none; transition:border-color .15s; }
        .inp:focus { border-color:#10b981; }
      `}</style>
    </div>
  );
};
