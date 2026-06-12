import React, { useMemo, useState } from 'react';
import { Project, ComprasDB, ComprasItem, ComprasForn, ComprasMeet, ComprasCat } from '../types';
import { useApp } from '../contexts/AppContext';
import { compressImage } from '../utils/imageCompression';
import { validateFileSize } from '../utils/validation';

/**
 * Aba Compras — port do Compras.dc.html para React.
 * Dados vivem em project.comprasData (sincronizados com a equipe via
 * broadcast + Supabase), em vez do localStorage do original.
 */

interface ComprasTabProps {
    project: Project;
    onUpdateProject: (updated: Project) => void;
}

const STATUS = [
    { id: 'levantamento', label: 'LEVANTAMENTO', color: '#9CA3AF', icon: 'checklist' },
    { id: 'cotando', label: 'COTANDO', color: '#00B8DD', icon: 'send' },
    { id: 'recebido', label: 'RECEBIDO', color: '#A770EF', icon: 'mark_email_read' },
    { id: 'analise', label: 'EM ANÁLISE', color: '#EAB308', icon: 'search_insights' },
    { id: 'negociacao', label: 'NEGOCIAÇÃO', color: '#FF6B4A', icon: 'handshake' },
    { id: 'aprovado', label: 'APROVADO', color: '#10B981', icon: 'check_circle' },
    { id: 'comprado', label: 'COMPRADO', color: '#0D9488', icon: 'shopping_cart_checkout' },
];

const CATS = [
    { id: 'est', cod: 'EST', nome: 'Estrutura & Concreto', color: '#A770EF', foto: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=600&q=70' },
    { id: 'esq', cod: 'ESQ', nome: 'Esquadrias & Brises', color: '#FF6B4A', foto: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&q=70' },
    { id: 'dry', cod: 'DRY', nome: 'Drywall & Forros', color: '#64748B', foto: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&q=70' },
    { id: 'acb', cod: 'ACB', nome: 'Acabamentos & Revestimentos', color: '#EAB308', foto: 'https://images.unsplash.com/photo-1615971677499-5467cbab01c0?w=600&q=70' },
    { id: 'lou', cod: 'LOU', nome: 'Louças & Metais', color: '#00B8DD', foto: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=600&q=70' },
    { id: 'mob', cod: 'MOB', nome: 'Mobiliário & Marcenaria', color: '#10B981', foto: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=600&q=70' },
    { id: 'ins', cod: 'INS', nome: 'Instalações & HVAC', color: '#FF6961', foto: 'https://images.unsplash.com/photo-1581094271901-8022df4466f9?w=600&q=70' },
    { id: 'srv', cod: 'SRV', nome: 'Serviços & Mão de Obra', color: '#2DD4BF', foto: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=600&q=70' },
];

const EMPTY_DB: ComprasDB = { items: [], forns: [], meets: [] };

const money = (v: number | null | undefined) =>
    v == null ? '—' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const fdate = (iso?: string) => { if (!iso) return '—'; const p = iso.split('-'); return `${p[2]}/${p[1]}/${p[0].slice(2)}`; };
const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const statusOf = (id: string) => STATUS.find(s => s.id === id) || STATUS[0];
const catOf = (id: string, cats: ComprasCat[]) => cats.find(c => c.id === id) || cats[0] || CATS[0];
const CAT_COLOR_POOL = ['#A770EF', '#FF6B4A', '#64748B', '#EAB308', '#00B8DD', '#10B981', '#FF6961', '#2DD4BF', '#6366F1', '#EC4899', '#84CC16', '#F97316'];
const bestQuote = (it: ComprasItem) => it.quotes.length ? it.quotes.reduce((a, b) => (b.valor < a.valor ? b : a)) : null;
const avatarOf = (f: ComprasForn) => `https://ui-avatars.com/api/?name=${encodeURIComponent(f.nome)}&background=${f.av || 'FFB7B2'}&color=fff&bold=true&format=svg`;
const parseMoney = (s: string) => { const v = parseFloat((s || '').replace(/\./g, '').replace(',', '.')); return isNaN(v) ? 0 : v; };

const MESES = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
const MESES_FULL = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
const WEEK = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

type View = 'dash' | 'cot' | 'comp' | 'forn' | 'agenda';

const inputCls = "bg-theme-bg border border-theme-divider rounded-xl px-4 py-3 text-xs text-theme-text outline-none focus:border-theme-orange w-full";
const labelCls = "text-[9px] font-black text-theme-textMuted uppercase tracking-widest mb-1 block";
const chipBtn = "px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all border";

// Componentes auxiliares no escopo do módulo — definir dentro do componente
// faria o React remontar os modais a cada render (inputs perderiam o valor).
const StatusBadge = ({ status }: { status: string }) => {
    const st = statusOf(status);
    return <span className="text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider" style={{ background: st.color + '1A', color: st.color }}>{st.label}</span>;
};

const Modal = ({ title, children, onClose, wide }: { title: string; children: React.ReactNode; onClose: () => void; wide?: boolean }) => (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fadeIn no-print" onClick={onClose}>
        <div className={`bg-theme-card w-full ${wide ? 'max-w-[880px]' : 'max-w-[480px]'} max-h-[88vh] overflow-y-auto scroller rounded-3xl border border-theme-divider shadow-2xl animate-scaleIn p-7`} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
                <h3 className="font-square font-black text-sm uppercase tracking-widest text-theme-text">{title}</h3>
                <button onClick={onClose} className="text-theme-textMuted hover:text-theme-text"><span className="material-symbols-outlined">close</span></button>
            </div>
            {children}
        </div>
    </div>
);

const SubTab = ({ k, label, icon, view, setView }: { k: View; label: string; icon: string; view: View; setView: (v: View) => void }) => (
    <button onClick={() => setView(k)}
        className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.18em] font-square flex items-center gap-1.5 border transition-all ${view === k ? 'text-theme-orange bg-theme-orange/10 border-theme-orange/30' : 'text-theme-textMuted border-transparent hover:text-theme-text'}`}>
        <span className="material-symbols-outlined text-sm">{icon}</span>{label}
    </button>
);

export const ComprasTab: React.FC<ComprasTabProps> = ({ project, onUpdateProject }) => {
    const { isViewer, setNotification, addLog, currentUser } = useApp();
    const data: ComprasDB = project.comprasData || EMPTY_DB;

    const [view, setView] = useState<View>('dash');
    const [busca, setBusca] = useState('');
    const [fCat, setFCat] = useState('all');
    const [fStatus, setFStatus] = useState('all');
    const [fForn, setFForn] = useState('all');
    const [sort, setSort] = useState('recentes');
    const [buscaForn, setBuscaForn] = useState('');
    const [compId, setCompId] = useState<string | null>(null);
    const [detailId, setDetailId] = useState<string | null>(null);
    const [fichaId, setFichaId] = useState<string | null>(null);
    const [orcItemId, setOrcItemId] = useState<string | null>(null);
    const [modal, setModal] = useState<'novo' | 'reuniao' | 'forn' | 'orc' | 'cats' | null>(null);
    const [draft, setDraft] = useState<Record<string, string>>({});
    const [formErr, setFormErr] = useState(false);
    const now = new Date();
    const [calY, setCalY] = useState(now.getFullYear());
    const [calM, setCalM] = useState(now.getMonth());

    const D = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
        setDraft(prev => ({ ...prev, [k]: e.target.value }));

    const setData = (fn: (db: ComprasDB) => ComprasDB, log?: string) => {
        if (isViewer) return;
        const next = fn(JSON.parse(JSON.stringify(data)));
        onUpdateProject({ ...project, comprasData: next, updatedAt: new Date().toISOString() });
        if (log) addLog(currentUser?.name || 'SISTEMA', log);
    };

    const fornById = (id: string) => data.forns.find(f => f.id === id);
    const today = new Date(); today.setHours(0, 0, 0, 0);

    // Categorias dinâmicas: personalizadas quando existirem, senão o padrão
    const cats: ComprasCat[] = data.cats && data.cats.length ? data.cats : CATS;

    // ── derivados ──
    const all = useMemo(() => data.items.map(it => ({
        it,
        st: statusOf(it.status),
        cat: catOf(it.cat, cats),
        best: bestQuote(it),
        nextMeet: data.meets.filter(m => m.item === it.id && !m.done && new Date(m.data + 'T23:59') >= today)
            .sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora))[0] || null,
    })), [data]);

    const cotado = all.reduce((s, e) => s + (e.best ? e.best.valor : 0), 0);
    const aprovItems = all.filter(e => e.it.status === 'aprovado' || e.it.status === 'comprado');
    const aprovado = aprovItems.reduce((s, e) => {
        const chosen = e.it.aprovadoId ? e.it.quotes.find(q => q.id === e.it.aprovadoId) : e.best;
        return s + (chosen ? chosen.valor : 0);
    }, 0);
    const economia = aprovItems.reduce((s, e) => {
        if (e.it.quotes.length < 2) return s;
        const chosen = e.it.aprovadoId ? e.it.quotes.find(q => q.id === e.it.aprovadoId) : e.best;
        const max = Math.max(...e.it.quotes.map(q => q.valor));
        return s + (chosen ? max - chosen.valor : 0);
    }, 0);
    const pendentes = all.filter(e => e.it.status === 'cotando' || e.it.status === 'levantamento').length;
    const futureMeets = data.meets
        .filter(m => !m.done && new Date(m.data + 'T23:59') >= today)
        .sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora));
    const reun7 = futureMeets.filter(m => { const d = new Date(m.data + 'T12:00'); const lim = new Date(today); lim.setDate(lim.getDate() + 7); return d <= lim; });

    // ── cotações filtradas ──
    const filtered = useMemo(() => {
        let list = all.filter(e => {
            if (fCat !== 'all' && e.it.cat !== fCat) return false;
            if (fStatus !== 'all' && e.it.status !== fStatus) return false;
            if (fForn !== 'all' && !e.it.quotes.some(q => q.forn === fForn)) return false;
            if (busca) {
                const t = busca.toLowerCase();
                const fornNames = e.it.quotes.map(q => fornById(q.forn)?.nome.toLowerCase() || '').join(' ');
                if (!(e.it.nome.toLowerCase().includes(t) || (e.it.espec || '').toLowerCase().includes(t) || fornNames.includes(t))) return false;
            }
            return true;
        });
        if (sort === 'valor-desc') list = [...list].sort((a, b) => (b.best?.valor ?? -1) - (a.best?.valor ?? -1));
        else if (sort === 'valor-asc') list = [...list].sort((a, b) => (a.best?.valor ?? Infinity) - (b.best?.valor ?? Infinity));
        else if (sort === 'nome') list = [...list].sort((a, b) => a.it.nome.localeCompare(b.it.nome));
        return list;
    }, [all, fCat, fStatus, fForn, busca, sort]);

    const withQuotes = all.filter(e => e.it.quotes.length > 0);
    const compSel = withQuotes.find(e => e.it.id === compId) || withQuotes[0] || null;
    const detE = all.find(e => e.it.id === detailId) || null;
    const fichaF = data.forns.find(f => f.id === fichaId) || null;

    const closeAll = () => { setDraft({}); setModal(null); setDetailId(null); setFichaId(null); setOrcItemId(null); setFormErr(false); };

    // ── upload de foto (comprime e vira dataURL) ──
    const handlePhotoFile = async (e: React.ChangeEvent<HTMLInputElement>, apply: (dataUrl: string) => void) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        const err = validateFileSize(file, 10);
        if (err) { setNotification(err); return; }
        try {
            const dataUrl = await compressImage(file, 900, 900, 0.65);
            apply(dataUrl);
        } catch {
            setNotification('Erro ao processar a imagem.');
        }
    };

    // ── categorias dinâmicas ──
    const slugCatCod = (nome: string) => {
        const clean = nome.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9 ]/g, '').trim().toUpperCase();
        let base = (clean.split(/\s+/).map(w => w[0]).join('').slice(0, 3) || clean.slice(0, 3) || 'CAT');
        if (base.length < 3) base = clean.replace(/\s+/g, '').slice(0, 3) || 'CAT';
        let cod = base, i = 1;
        while (cats.some(c => c.cod === cod)) cod = base.slice(0, 2) + (i++);
        return cod;
    };

    const addCategory = () => {
        const nome = (draft.catNome || '').trim();
        if (!nome) { setFormErr(true); return; }
        if (cats.some(c => c.nome.toLowerCase() === nome.toLowerCase())) { setNotification('Já existe uma categoria com esse nome.'); return; }
        const nova: ComprasCat = {
            id: 'c' + Date.now(),
            cod: (draft.catCod || '').trim().toUpperCase() || slugCatCod(nome),
            nome,
            color: draft.catColor || CAT_COLOR_POOL[cats.length % CAT_COLOR_POOL.length],
            foto: draft.catFoto || undefined,
        };
        setData(db => ({ ...db, cats: [...(db.cats && db.cats.length ? db.cats : CATS), nova] }), `COMPRAS: CATEGORIA ${nova.cod} CRIADA`);
        setDraft(prev => ({ ...prev, catNome: '', catCod: '', catFoto: '' }));
        setFormErr(false);
    };

    const deleteCategory = (catId: string) => {
        const inUse = data.items.filter(i => i.cat === catId).length;
        if (inUse > 0) { setNotification(`Não é possível excluir: ${inUse} ite${inUse > 1 ? 'ns' : 'm'} usa${inUse > 1 ? 'm' : ''} esta categoria.`); return; }
        setData(db => ({ ...db, cats: (db.cats && db.cats.length ? db.cats : CATS).filter(c => c.id !== catId) }), 'COMPRAS: CATEGORIA REMOVIDA');
        if (fCat === catId) setFCat('all');
    };

    // ── ações ──
    const saveNovo = () => {
        if (!draft.nome || !draft.cat) { setFormErr(true); return; }
        const cat = catOf(draft.cat, cats);
        setData(db => ({ ...db, items: [{
            id: 'i' + Date.now(), nome: draft.nome.trim(), cat: draft.cat,
            qtd: parseMoney(draft.qtd || '1') || 1, unid: draft.unid || 'un',
            status: 'levantamento', foto: draft.foto || cat.foto, espec: draft.espec || '', quotes: []
        }, ...db.items] }), `COMPRAS: NOVO ITEM ${draft.nome.trim().toUpperCase()}`);
        closeAll(); setView('cot'); setFCat('all'); setFStatus('all');
        setNotification('Item adicionado ao levantamento!');
    };

    const saveReuniao = () => {
        if (!draft.rForn || !draft.rData || !draft.rHora || !draft.rPauta) { setFormErr(true); return; }
        setData(db => ({ ...db, meets: [...db.meets, {
            id: 'm' + Date.now(), forn: draft.rForn, item: draft.rItem || null,
            data: draft.rData, hora: draft.rHora, fmt: (draft.rFmt as 'online' | 'presencial') || 'online',
            local: draft.rLocal || '', pauta: draft.rPauta.trim()
        }] }), 'COMPRAS: REUNIÃO AGENDADA');
        closeAll(); setView('agenda');
    };

    const saveForn = () => {
        if (!draft.fNome) { setFormErr(true); return; }
        const cat: { nome: string; icon: string; url: string }[] = [];
        if (draft.fCat) cat.push({ nome: 'Catálogo online', icon: 'language', url: draft.fCat });
        const avs = ['FFB7B2', 'D4C1EC', 'B5EAD7'];
        setData(db => ({ ...db, forns: [...db.forns, {
            id: 'f' + Date.now(), nome: draft.fNome.trim(), cidade: (draft.fCidade || '—').toUpperCase(),
            contato: draft.fContato || '', fone: draft.fFone || '', email: draft.fEmail || '',
            tags: draft.fEspec ? draft.fEspec.split(',').map(t => t.trim().toUpperCase()).filter(Boolean) : [],
            rating: 0, av: avs[Math.floor(Math.random() * avs.length)], catalogos: cat
        }] }), `COMPRAS: FORNECEDOR ${draft.fNome.trim().toUpperCase()}`);
        closeAll(); setView('forn');
    };

    const saveOrc = () => {
        const valor = parseMoney(draft.oValor || '');
        if (!draft.oForn || !valor || !orcItemId) { setFormErr(true); return; }
        setData(db => ({ ...db, items: db.items.map(it => it.id !== orcItemId ? it : {
            ...it,
            status: (it.status === 'levantamento' || it.status === 'cotando') ? 'recebido' : it.status,
            quotes: [...it.quotes, {
                id: 'q' + Date.now(), forn: draft.oForn, valor: Math.round(valor),
                prazoDias: parseInt(draft.oPrazo, 10) || 0, frete: draft.oFrete || 'A combinar',
                validade: draft.oValidade || '', pagamento: draft.oPag || '—', obs: draft.oObs || '',
                recebido: todayIso()
            }]
        }) }), 'COMPRAS: ORÇAMENTO RECEBIDO');
        setDraft({}); setModal(null); setFormErr(false);
    };

    const approveQuote = (itemId: string, quoteId: string) => {
        setData(db => ({ ...db, items: db.items.map(it => it.id !== itemId ? it : {
            ...it, aprovadoId: quoteId, status: it.status !== 'comprado' ? 'aprovado' : it.status
        }) }), 'COMPRAS: PROPOSTA APROVADA');
    };

    const setItemStatus = (itemId: string, status: string) => {
        setData(db => ({ ...db, items: db.items.map(it => it.id === itemId ? { ...it, status } : it) }));
    };

    const toggleMeetDone = (meetId: string) => {
        setData(db => ({ ...db, meets: db.meets.map(m => m.id === meetId ? { ...m, done: !m.done } : m) }));
    };

    const deleteItem = (itemId: string) => {
        setData(db => ({ ...db, items: db.items.filter(it => it.id !== itemId) }), 'COMPRAS: ITEM REMOVIDO');
        setDetailId(null);
    };

    // ── calendário ──
    const calCells = useMemo(() => {
        const first = new Date(calY, calM, 1);
        const start = new Date(first); start.setDate(1 - first.getDay());
        const cells = [];
        for (let i = 0; i < 42; i++) {
            const d = new Date(start); d.setDate(start.getDate() + i);
            if (i >= 35 && d.getMonth() !== calM) break;
            const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            cells.push({ d, iso, inMonth: d.getMonth() === calM, isToday: d.getTime() === today.getTime(), meets: data.meets.filter(m => m.data === iso) });
        }
        return cells;
    }, [calY, calM, data.meets]);

    return (
        <div className="w-full h-full flex flex-col relative overflow-hidden animate-fadeIn bg-transparent">
            {/* ── header ── */}
            <div className="flex flex-wrap justify-between items-center gap-3 px-6 py-4 border-b border-theme-divider bg-theme-bg/95 backdrop-blur-md shadow-lg relative z-10 flex-shrink-0">
                <div className="flex items-center gap-2">
                    <div className="w-0.5 h-5 bg-theme-orange shadow-[0_0_10px_#FF6B00]"></div>
                    <span className="material-symbols-outlined text-base text-theme-orange">request_quote</span>
                    <h2 className="font-square font-black text-[11px] uppercase tracking-[0.4em] text-theme-text">Compras</h2>
                </div>
                <nav className="flex items-center gap-1 flex-wrap">
                    <SubTab k="dash" label="Dashboard" icon="space_dashboard" view={view} setView={setView} />
                    <SubTab k="cot" label="Cotações" icon="request_quote" view={view} setView={setView} />
                    <SubTab k="comp" label="Comparativo" icon="compare_arrows" view={view} setView={setView} />
                    <SubTab k="forn" label="Fornecedores" icon="storefront" view={view} setView={setView} />
                    <SubTab k="agenda" label="Agenda" icon="calendar_month" view={view} setView={setView} />
                </nav>
                {!isViewer && (
                    <button onClick={() => { setDraft({}); setModal('novo'); setFormErr(false); }}
                        className="bg-theme-orange text-white rounded-xl px-4 py-2.5 text-[9px] font-black font-square uppercase tracking-[0.18em] flex items-center gap-2 shadow-lg hover:bg-orange-600 transition-all">
                        <span className="material-symbols-outlined text-base">add</span>Nova Cotação
                    </button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto scroller p-6 relative z-0">
                {/* ════ DASHBOARD ════ */}
                {view === 'dash' && (
                    <div className="flex flex-col gap-6 animate-fadeIn">
                        <div className="grid grid-cols-1 lg:grid-cols-[1.7fr_1fr_1fr] gap-5">
                            <div className="rounded-[30px] p-7 text-white relative overflow-hidden shadow-xl" style={{ background: 'linear-gradient(135deg,#FF9966 0%,#FF5E62 100%)' }}>
                                <span className="material-symbols-outlined absolute -right-2 -bottom-4 text-[150px] opacity-15">insights</span>
                                <div className="font-square font-black text-[9px] tracking-[0.24em] opacity-85">RESUMO FINANCEIRO — {MESES_FULL[now.getMonth()]} {now.getFullYear()}</div>
                                <div className="font-square font-black text-4xl mt-3 leading-none">{money(cotado)}</div>
                                <div className="font-square font-bold text-[8px] tracking-[0.22em] opacity-85 mt-2">TOTAL COTADO · MELHORES PROPOSTAS</div>
                                <div className="flex flex-wrap gap-3 mt-5 relative z-10">
                                    <div className="bg-white/20 rounded-2xl px-4 py-3 backdrop-blur-sm">
                                        <div className="font-square font-black text-[8px] tracking-[0.2em] opacity-85">APROVADO + COMPRADO</div>
                                        <div className="font-square font-black text-lg mt-1">{money(aprovado)}</div>
                                    </div>
                                    <div className="bg-white/20 rounded-2xl px-4 py-3 backdrop-blur-sm">
                                        <div className="font-square font-black text-[8px] tracking-[0.2em] opacity-85">ECONOMIA NEGOCIADA</div>
                                        <div className="font-square font-black text-lg mt-1">{money(economia)}</div>
                                    </div>
                                </div>
                            </div>
                            <div onClick={() => { setView('cot'); setFStatus('cotando'); setFCat('all'); setFForn('all'); setBusca(''); }}
                                className="ds-card bg-theme-card p-6 cursor-pointer hover:-translate-y-1 hover:shadow-xl transition-all flex flex-col justify-between">
                                <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(0,212,255,0.12)', color: '#00B8DD' }}>
                                    <span className="material-symbols-outlined text-2xl">hourglass_top</span>
                                </div>
                                <div>
                                    <div className="font-square font-black text-3xl text-theme-text mt-4">{pendentes}</div>
                                    <div className="font-square font-black text-[9px] tracking-[0.2em] text-theme-textMuted mt-1.5">AGUARDANDO RETORNO</div>
                                    <div className="text-xs text-theme-textMuted mt-1">de {all.length} itens no levantamento</div>
                                </div>
                            </div>
                            <div onClick={() => setView('agenda')}
                                className="ds-card bg-theme-card p-6 cursor-pointer hover:-translate-y-1 hover:shadow-xl transition-all flex flex-col justify-between">
                                <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(167,112,239,0.12)', color: '#A770EF' }}>
                                    <span className="material-symbols-outlined text-2xl">calendar_month</span>
                                </div>
                                <div>
                                    <div className="font-square font-black text-3xl text-theme-text mt-4">{reun7.length}</div>
                                    <div className="font-square font-black text-[9px] tracking-[0.2em] text-theme-textMuted mt-1.5">REUNIÕES · PRÓX. 7 DIAS</div>
                                    <div className="text-xs text-theme-textMuted mt-1">{futureMeets.length ? `próxima: ${fdate(futureMeets[0].data)} às ${futureMeets[0].hora}` : 'nenhuma agendada'}</div>
                                </div>
                            </div>
                        </div>

                        {/* categorias */}
                        <div>
                            <div className="flex items-baseline justify-between mb-3">
                                <h3 className="font-square font-black text-sm tracking-[0.18em] uppercase text-theme-text m-0">Categorias</h3>
                                <div className="font-square font-black text-[9px] tracking-[0.2em] text-theme-textMuted">{all.length} ITENS · CLIQUE PARA FILTRAR</div>
                            </div>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                {cats.map(c => {
                                    const its = all.filter(e => e.it.cat === c.id);
                                    const done = its.filter(e => e.it.status === 'aprovado' || e.it.status === 'comprado').length;
                                    const valor = its.reduce((s, e) => s + (e.best ? e.best.valor : 0), 0);
                                    const pct = its.length ? Math.round(done / its.length * 100) : 0;
                                    return (
                                        <div key={c.id} onClick={() => { setView('cot'); setFCat(c.id); setFStatus('all'); setFForn('all'); setBusca(''); }}
                                            className="ds-card bg-theme-card overflow-hidden cursor-pointer hover:-translate-y-1 hover:shadow-xl transition-all">
                                            <div className="h-20 relative bg-theme-highlight">
                                                {c.foto
                                                    ? <img src={c.foto} alt={c.nome} className="w-full h-full object-cover" loading="lazy" />
                                                    : <div className="w-full h-full flex items-center justify-center font-square font-black text-2xl text-white" style={{ background: c.color + 'CC' }}>{c.cod}</div>}
                                                <span className="absolute top-2 left-2 text-[8px] font-black font-square px-2 py-0.5 rounded-md text-white" style={{ background: c.color }}>{c.cod}</span>
                                            </div>
                                            <div className="p-4">
                                                <div className="text-[11px] font-bold text-theme-text uppercase truncate">{c.nome}</div>
                                                <div className="text-[9px] font-black font-square text-theme-textMuted mt-1 tracking-wider">{its.length} {its.length === 1 ? 'ITEM' : 'ITENS'} · {done} OK</div>
                                                <div className="flex items-center justify-between mt-2">
                                                    <span className="text-[10px] font-black text-theme-text">{valor ? money(valor) : '—'}</span>
                                                    <span className="text-[9px] font-black" style={{ color: c.color }}>{pct}%</span>
                                                </div>
                                                <div className="w-full h-1 rounded-full bg-theme-divider mt-1.5 overflow-hidden">
                                                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: c.color }} />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* pipeline + próximas reuniões */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                            <div className="ds-card bg-theme-card p-6">
                                <h3 className="font-square font-black text-xs tracking-[0.18em] uppercase text-theme-text mb-4">Pipeline de Compras</h3>
                                <div className="space-y-2.5">
                                    {STATUS.map(st => {
                                        const count = all.filter(e => e.it.status === st.id).length;
                                        const pct = all.length ? Math.round(count / all.length * 100) : 0;
                                        return (
                                            <div key={st.id} onClick={() => { setView('cot'); setFStatus(st.id); setFCat('all'); setFForn('all'); setBusca(''); }} className="cursor-pointer group">
                                                <div className="flex justify-between text-[9px] font-black uppercase tracking-wider mb-1">
                                                    <span className="group-hover:text-theme-text transition-colors" style={{ color: st.color }}>{st.label}</span>
                                                    <span className="text-theme-textMuted">{count}</span>
                                                </div>
                                                <div className="w-full h-1.5 rounded-full bg-theme-divider overflow-hidden">
                                                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: st.color }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="ds-card bg-theme-card p-6">
                                <h3 className="font-square font-black text-xs tracking-[0.18em] uppercase text-theme-text mb-4">Próximas Reuniões</h3>
                                {futureMeets.length === 0 && <p className="text-xs text-theme-textMuted">Nenhuma reunião agendada.</p>}
                                <div className="space-y-3">
                                    {futureMeets.slice(0, 4).map(m => {
                                        const f = fornById(m.forn);
                                        const d = m.data.split('-');
                                        return (
                                            <div key={m.id} className="flex items-center gap-3 p-3 rounded-2xl bg-theme-bg border border-theme-divider">
                                                <div className="w-12 h-12 rounded-xl bg-theme-orange/10 flex flex-col items-center justify-center shrink-0">
                                                    <span className="font-square font-black text-base text-theme-orange leading-none">{d[2]}</span>
                                                    <span className="font-square font-black text-[8px] text-theme-orange/70">{MESES[parseInt(d[1], 10) - 1]}</span>
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="text-[11px] font-bold text-theme-text truncate">{m.pauta}</div>
                                                    <div className="text-[9px] font-black text-theme-textMuted uppercase tracking-wider mt-0.5">{f ? f.nome.toUpperCase() : '—'} · {m.hora}</div>
                                                </div>
                                                <span className="text-[8px] font-black px-2 py-1 rounded-lg uppercase shrink-0" style={{ background: m.fmt === 'online' ? 'rgba(0,184,221,0.12)' : 'rgba(167,112,239,0.12)', color: m.fmt === 'online' ? '#00B8DD' : '#A770EF' }}>{m.fmt === 'online' ? 'ONLINE' : 'PRESENCIAL'}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ════ COTAÇÕES ════ */}
                {view === 'cot' && (
                    <div className="flex flex-col gap-4 animate-fadeIn">
                        <div className="flex flex-wrap gap-2 items-center">
                            <div className="relative flex-1 min-w-[200px]">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-base text-theme-textMuted">search</span>
                                <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar item, especificação ou fornecedor..." className={inputCls + ' pl-10'} />
                            </div>
                            <select value={fStatus} onChange={e => setFStatus(e.target.value)} className="bg-theme-bg border border-theme-divider rounded-xl px-3 py-3 text-xs text-theme-text outline-none">
                                <option value="all">Todos status</option>
                                {STATUS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                            </select>
                            <select value={fForn} onChange={e => setFForn(e.target.value)} className="bg-theme-bg border border-theme-divider rounded-xl px-3 py-3 text-xs text-theme-text outline-none">
                                <option value="all">Todos fornecedores</option>
                                {data.forns.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                            </select>
                            <select value={sort} onChange={e => setSort(e.target.value)} className="bg-theme-bg border border-theme-divider rounded-xl px-3 py-3 text-xs text-theme-text outline-none">
                                <option value="recentes">Mais recentes</option>
                                <option value="valor-desc">Maior valor</option>
                                <option value="valor-asc">Menor valor</option>
                                <option value="nome">Nome A–Z</option>
                            </select>
                            <button onClick={() => { setBusca(''); setFCat('all'); setFStatus('all'); setFForn('all'); setSort('recentes'); }} className="text-[9px] font-black uppercase text-theme-textMuted hover:text-theme-orange px-2">Limpar</button>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                            {[{ id: 'all', cod: 'TODOS', color: '#374151' } as any].concat(cats as any).map(c => {
                                const active = fCat === c.id;
                                const n = c.id === 'all' ? all.length : all.filter(e => e.it.cat === c.id).length;
                                return (
                                    <button key={c.id} onClick={() => setFCat(c.id)}
                                        className={chipBtn}
                                        style={active
                                            ? { color: c.id === 'all' ? '#fff' : c.color, background: c.id === 'all' ? '#374151' : c.color + '1A', borderColor: c.id === 'all' ? '#374151' : c.color + '55' }
                                            : { color: '#9CA3AF', background: 'transparent', borderColor: 'var(--theme-divider, #E5E7EB)' }}>
                                        {(c.id === 'all' ? 'TODOS' : c.cod)} · {n}
                                    </button>
                                );
                            })}
                            {!isViewer && (
                                <button onClick={() => { setDraft({}); setModal('cats'); setFormErr(false); }}
                                    className={chipBtn + ' border-dashed text-theme-textMuted hover:text-theme-orange hover:border-theme-orange flex items-center gap-1'}
                                    style={{ borderColor: 'var(--theme-divider, #E5E7EB)' }} title="Gerenciar categorias">
                                    <span className="material-symbols-outlined text-[12px]">settings</span>CATEGORIAS
                                </button>
                            )}
                            <span className="ml-auto text-[9px] font-black font-square text-theme-textMuted self-center">{filtered.length} DE {all.length} ITENS</span>
                        </div>

                        {filtered.length === 0 && (
                            <div className="ds-card bg-theme-card p-12 text-center">
                                <span className="material-symbols-outlined text-5xl text-theme-textMuted opacity-40">inventory_2</span>
                                <p className="text-xs text-theme-textMuted mt-3 font-bold uppercase tracking-widest">{all.length === 0 ? 'Nenhum item — crie sua primeira cotação' : 'Nenhum resultado para os filtros'}</p>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {filtered.map(e => {
                                const bf = e.best ? fornById(e.best.forn) : null;
                                return (
                                    <div key={e.it.id} className="ds-card bg-theme-card overflow-hidden hover:-translate-y-1 hover:shadow-xl transition-all cursor-pointer group" onClick={() => setDetailId(e.it.id)}>
                                        <div className="h-28 relative bg-theme-highlight">
                                            {e.it.foto && <img src={e.it.foto} alt={e.it.nome} className="w-full h-full object-cover" loading="lazy" />}
                                            <div className="absolute top-2 left-2 flex gap-1.5">
                                                <span className="text-[8px] font-black font-square px-2 py-0.5 rounded-md text-white" style={{ background: e.cat.color }}>{e.cat.cod}</span>
                                                <StatusBadge status={e.it.status} />
                                            </div>
                                        </div>
                                        <div className="p-4">
                                            <div className="text-xs font-bold text-theme-text uppercase leading-snug line-clamp-2">{e.it.nome}</div>
                                            <div className="text-[9px] font-black font-square text-theme-textMuted mt-1 tracking-wider">
                                                {(e.it.qtd > 1 ? e.it.qtd.toLocaleString('pt-BR') + ' ' : '') + e.it.unid.toUpperCase()}
                                            </div>
                                            <div className="flex items-end justify-between mt-3">
                                                <div>
                                                    {e.best ? (
                                                        <>
                                                            <div className="text-sm font-black text-theme-text">{money(e.best.valor)}</div>
                                                            <div className="text-[9px] text-theme-textMuted truncate max-w-[140px]">{bf?.nome}</div>
                                                        </>
                                                    ) : (
                                                        <div className="text-[9px] font-black text-theme-textMuted uppercase">Sem propostas</div>
                                                    )}
                                                </div>
                                                <div className="flex flex-col items-end gap-1">
                                                    <span className="text-[8px] font-black text-theme-textMuted uppercase">{e.it.quotes.length} {e.it.quotes.length === 1 ? 'ORÇAMENTO' : 'ORÇAMENTOS'}</span>
                                                    {e.it.quotes.length >= 2 && (
                                                        <button onClick={ev => { ev.stopPropagation(); setView('comp'); setCompId(e.it.id); }}
                                                            className="text-[8px] font-black uppercase text-theme-cyan hover:underline flex items-center gap-1">
                                                            <span className="material-symbols-outlined text-[12px]">compare_arrows</span>Comparar
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            {e.nextMeet && (
                                                <div className="mt-2 text-[9px] font-bold text-theme-orange flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-[12px]">event</span>Reunião {fdate(e.nextMeet.data)} · {e.nextMeet.hora}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ════ COMPARATIVO ════ */}
                {view === 'comp' && (
                    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5 animate-fadeIn">
                        <div className="ds-card bg-theme-card p-4 self-start max-h-[70vh] overflow-y-auto scroller">
                            <h3 className="font-square font-black text-[10px] tracking-[0.18em] uppercase text-theme-textMuted mb-3 px-1">Itens com propostas</h3>
                            {withQuotes.length === 0 && <p className="text-xs text-theme-textMuted px-1">Nenhum item com orçamento ainda.</p>}
                            <div className="space-y-1.5">
                                {withQuotes.map(e => (
                                    <button key={e.it.id} onClick={() => setCompId(e.it.id)}
                                        className={`w-full text-left p-3 rounded-xl border transition-all ${compSel?.it.id === e.it.id ? 'bg-theme-orange/10 border-theme-orange/40' : 'border-transparent hover:bg-theme-highlight'}`}>
                                        <div className="text-[11px] font-bold text-theme-text leading-snug">{e.it.nome}</div>
                                        <div className="text-[8px] font-black uppercase tracking-wider mt-1" style={{ color: e.st.color }}>{e.it.quotes.length} ORÇ. · {e.st.label}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                        {!compSel ? (
                            <div className="ds-card bg-theme-card p-12 text-center self-start">
                                <span className="material-symbols-outlined text-5xl text-theme-textMuted opacity-40">compare_arrows</span>
                                <p className="text-xs text-theme-textMuted mt-3 font-bold uppercase tracking-widest">Cadastre orçamentos para comparar propostas</p>
                            </div>
                        ) : (() => {
                            const e = compSel;
                            const vals = e.it.quotes.map(q => q.valor);
                            const minV = Math.min(...vals);
                            const minP = Math.min(...e.it.quotes.map(q => q.prazoDias));
                            return (
                                <div className="flex flex-col gap-4">
                                    <div className="ds-card bg-theme-card p-5 flex flex-wrap items-center gap-4">
                                        {e.it.foto && <img src={e.it.foto} className="w-16 h-16 rounded-2xl object-cover" />}
                                        <div className="flex-1 min-w-[200px]">
                                            <div className="text-sm font-bold text-theme-text uppercase">{e.it.nome}</div>
                                            <div className="text-[9px] font-black font-square text-theme-textMuted tracking-wider mt-1">
                                                {(e.it.qtd > 1 ? e.it.qtd.toLocaleString('pt-BR') + ' ' : '') + e.it.unid.toUpperCase()} · <span style={{ color: e.cat.color }}>{e.cat.cod}</span> · <StatusBadge status={e.it.status} />
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[8px] font-black text-theme-textMuted uppercase tracking-widest">Melhor proposta</div>
                                            <div className="text-lg font-black text-emerald-500">{money(minV)}</div>
                                            <div className="text-[8px] font-black text-theme-textMuted uppercase">Spread: {vals.length > 1 ? money(Math.max(...vals) - minV) : '—'}</div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {e.it.quotes.map(q => {
                                            const f = fornById(q.forn);
                                            const isBest = q.valor === minV && vals.length > 1;
                                            const isApproved = e.it.aprovadoId === q.id;
                                            const unit = e.it.qtd > 1 ? money(Math.round(q.valor / e.it.qtd)) + ' / ' + e.it.unid : 'VALOR GLOBAL';
                                            return (
                                                <div key={q.id} className="ds-card bg-theme-card p-5 border-2 transition-all" style={{ borderColor: isApproved ? '#10B981' : (isBest ? 'rgba(16,185,129,0.4)' : 'transparent') }}>
                                                    <div className="flex items-center gap-3 mb-3">
                                                        {f && <img src={avatarOf(f)} className="w-9 h-9 rounded-full" />}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-[11px] font-bold text-theme-text truncate">{f?.nome || '—'}</div>
                                                            <div className="text-[8px] font-black text-theme-textMuted uppercase">{f?.cidade}</div>
                                                        </div>
                                                        <div className="flex flex-col gap-1 items-end">
                                                            {isBest && <span className="text-[7px] font-black px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 uppercase">Melhor preço</span>}
                                                            {q.prazoDias === minP && e.it.quotes.length > 1 && !isBest && <span className="text-[7px] font-black px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-500 uppercase">Mais rápido</span>}
                                                            {isApproved && <span className="text-[7px] font-black px-1.5 py-0.5 rounded bg-emerald-500 text-white uppercase">Aprovada</span>}
                                                        </div>
                                                    </div>
                                                    <div className="text-xl font-black text-theme-text">{money(q.valor)}</div>
                                                    <div className="text-[9px] font-bold text-theme-textMuted uppercase">{unit}</div>
                                                    <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-3 text-[10px]">
                                                        <div><span className="text-theme-textMuted font-black text-[8px] uppercase block">Prazo</span><span className="text-theme-text font-bold">{q.prazoDias} dias</span></div>
                                                        <div><span className="text-theme-textMuted font-black text-[8px] uppercase block">Frete</span><span className="text-theme-text font-bold">{q.frete}</span></div>
                                                        <div><span className="text-theme-textMuted font-black text-[8px] uppercase block">Validade</span><span className="text-theme-text font-bold">{fdate(q.validade)}</span></div>
                                                        <div><span className="text-theme-textMuted font-black text-[8px] uppercase block">Pagamento</span><span className="text-theme-text font-bold">{q.pagamento}</span></div>
                                                    </div>
                                                    {q.obs && <div className="mt-2 text-[10px] text-theme-textMuted bg-theme-bg rounded-lg px-3 py-2 border border-theme-divider">{q.obs}</div>}
                                                    {!isViewer && !isApproved && (
                                                        <button onClick={() => approveQuote(e.it.id, q.id)}
                                                            className="mt-3 w-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 rounded-xl py-2 text-[9px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all">
                                                            Aprovar proposta
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                )}

                {/* ════ FORNECEDORES ════ */}
                {view === 'forn' && (
                    <div className="flex flex-col gap-4 animate-fadeIn">
                        <div className="flex flex-wrap gap-2 items-center">
                            <div className="relative flex-1 min-w-[200px]">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-base text-theme-textMuted">search</span>
                                <input value={buscaForn} onChange={e => setBuscaForn(e.target.value)} placeholder="Buscar fornecedor, cidade ou especialidade..." className={inputCls + ' pl-10'} />
                            </div>
                            {!isViewer && (
                                <button onClick={() => { setDraft({}); setModal('forn'); setFormErr(false); }}
                                    className="bg-theme-bg border border-theme-divider text-theme-text rounded-xl px-4 py-3 text-[9px] font-black uppercase tracking-widest flex items-center gap-2 hover:border-theme-orange hover:text-theme-orange transition-all">
                                    <span className="material-symbols-outlined text-base">add_business</span>Novo Fornecedor
                                </button>
                            )}
                        </div>
                        {data.forns.length === 0 && (
                            <div className="ds-card bg-theme-card p-12 text-center">
                                <span className="material-symbols-outlined text-5xl text-theme-textMuted opacity-40">storefront</span>
                                <p className="text-xs text-theme-textMuted mt-3 font-bold uppercase tracking-widest">Cadastre seus fornecedores para começar a cotar</p>
                            </div>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {data.forns.filter(f => {
                                if (!buscaForn) return true;
                                const t = buscaForn.toLowerCase();
                                return f.nome.toLowerCase().includes(t) || f.cidade.toLowerCase().includes(t) || f.tags.join(' ').toLowerCase().includes(t);
                            }).map(f => {
                                const orcs = data.items.reduce((s, it) => s + it.quotes.filter(q => q.forn === f.id).length, 0);
                                const reun = data.meets.filter(m => m.forn === f.id).length;
                                return (
                                    <div key={f.id} className="ds-card bg-theme-card p-5 hover:-translate-y-1 hover:shadow-xl transition-all">
                                        <div className="flex items-center gap-3">
                                            <img src={avatarOf(f)} className="w-12 h-12 rounded-2xl" />
                                            <div className="flex-1 min-w-0">
                                                <div className="text-xs font-bold text-theme-text truncate uppercase">{f.nome}</div>
                                                <div className="text-[9px] font-black text-theme-textMuted uppercase tracking-wider">{f.cidade}</div>
                                            </div>
                                            {f.rating > 0 && (
                                                <span className="text-[10px] font-black text-amber-500 flex items-center gap-0.5">
                                                    <span className="material-symbols-outlined text-sm">star</span>{f.rating.toFixed(1)}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap gap-1 mt-3">
                                            {f.tags.map(t => <span key={t} className="text-[7px] font-black px-2 py-0.5 rounded-full bg-theme-bg border border-theme-divider text-theme-textMuted uppercase">{t}</span>)}
                                        </div>
                                        <div className="flex gap-4 mt-3 text-[9px] font-black text-theme-textMuted uppercase">
                                            <span>{orcs} orç.</span><span>{f.catalogos.length} catálogos</span><span>{reun} reuniões</span>
                                        </div>
                                        <div className="flex gap-2 mt-4">
                                            <button onClick={() => setFichaId(f.id)} className="flex-1 bg-theme-bg border border-theme-divider rounded-xl py-2 text-[9px] font-black uppercase tracking-widest text-theme-text hover:border-theme-orange transition-all">Ficha</button>
                                            {!isViewer && (
                                                <button onClick={() => { setDraft({ rForn: f.id }); setModal('reuniao'); setFormErr(false); }}
                                                    className="flex-1 bg-theme-orange/10 border border-theme-orange/30 rounded-xl py-2 text-[9px] font-black uppercase tracking-widest text-theme-orange hover:bg-theme-orange hover:text-white transition-all">Agendar</button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ════ AGENDA ════ */}
                {view === 'agenda' && (
                    <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_1fr] gap-5 animate-fadeIn">
                        <div className="ds-card bg-theme-card p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-square font-black text-xs tracking-[0.18em] uppercase text-theme-text">{MESES_FULL[calM]} · {calY}</h3>
                                <div className="flex gap-1">
                                    <button onClick={() => { setCalM(calM === 0 ? 11 : calM - 1); if (calM === 0) setCalY(calY - 1); }} className="w-8 h-8 rounded-lg border border-theme-divider flex items-center justify-center text-theme-textMuted hover:text-theme-orange"><span className="material-symbols-outlined text-base">chevron_left</span></button>
                                    <button onClick={() => { setCalY(now.getFullYear()); setCalM(now.getMonth()); }} className="px-3 h-8 rounded-lg border border-theme-divider text-[9px] font-black uppercase text-theme-textMuted hover:text-theme-orange">Hoje</button>
                                    <button onClick={() => { setCalM(calM === 11 ? 0 : calM + 1); if (calM === 11) setCalY(calY + 1); }} className="w-8 h-8 rounded-lg border border-theme-divider flex items-center justify-center text-theme-textMuted hover:text-theme-orange"><span className="material-symbols-outlined text-base">chevron_right</span></button>
                                </div>
                            </div>
                            <div className="grid grid-cols-7 gap-1 mb-1">
                                {WEEK.map(w => <div key={w} className="text-center text-[8px] font-black text-theme-textMuted uppercase py-1">{w}</div>)}
                            </div>
                            <div className="grid grid-cols-7 gap-1">
                                {calCells.map((c, i) => (
                                    <div key={i} className={`min-h-[64px] rounded-lg border p-1 ${c.isToday ? 'border-theme-orange' : 'border-theme-divider/50'} ${c.inMonth ? '' : 'opacity-35'}`}>
                                        <div className={`text-[9px] font-black ${c.isToday ? 'text-theme-orange' : 'text-theme-textMuted'}`}>{c.d.getDate()}</div>
                                        {c.meets.map(m => {
                                            const f = fornById(m.forn);
                                            return (
                                                <div key={m.id} title={`${m.pauta} — ${f?.nome || ''}`}
                                                    className="mt-0.5 text-[7px] font-black px-1 py-0.5 rounded truncate"
                                                    style={{ background: m.done ? 'rgba(150,150,150,0.15)' : 'rgba(255,107,74,0.14)', color: m.done ? '#9CA3AF' : '#E04A2B' }}>
                                                    {m.hora} {f ? f.nome.split(' ')[0].toUpperCase() : ''}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="ds-card bg-theme-card p-5 self-start">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-square font-black text-xs tracking-[0.18em] uppercase text-theme-text">Reuniões</h3>
                                {!isViewer && (
                                    <button onClick={() => { setDraft({}); setModal('reuniao'); setFormErr(false); }}
                                        className="bg-theme-orange/10 border border-theme-orange/30 rounded-xl px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-theme-orange hover:bg-theme-orange hover:text-white transition-all flex items-center gap-1">
                                        <span className="material-symbols-outlined text-sm">add</span>Nova
                                    </button>
                                )}
                            </div>
                            {data.meets.length === 0 && <p className="text-xs text-theme-textMuted">Nenhuma reunião agendada.</p>}
                            <div className="space-y-2.5 max-h-[60vh] overflow-y-auto scroller pr-1">
                                {[...data.meets].sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora)).map(m => {
                                    const f = fornById(m.forn);
                                    const it = data.items.find(x => x.id === m.item);
                                    const past = !m.done && new Date(m.data + 'T23:59') < today;
                                    return (
                                        <div key={m.id} className="p-3 rounded-2xl bg-theme-bg border border-theme-divider">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-[9px] font-black font-square text-theme-textMuted">{fdate(m.data)} · {m.hora}</span>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[7px] font-black px-2 py-0.5 rounded-full uppercase" style={{ background: m.done ? 'rgba(16,185,129,0.12)' : (past ? 'rgba(239,68,68,0.1)' : 'rgba(255,107,74,0.12)'), color: m.done ? '#10B981' : (past ? '#EF4444' : '#FF6B4A') }}>
                                                        {m.done ? 'REALIZADA' : (past ? 'VENCIDA' : 'AGENDADA')}
                                                    </span>
                                                    {!isViewer && (
                                                        <button onClick={() => toggleMeetDone(m.id)} title={m.done ? 'Reabrir' : 'Marcar como realizada'} className="text-theme-textMuted hover:text-emerald-500">
                                                            <span className="material-symbols-outlined text-sm">{m.done ? 'undo' : 'task_alt'}</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-[11px] font-bold text-theme-text mt-1 leading-snug">{m.pauta}</div>
                                            <div className="text-[9px] font-black text-theme-textMuted uppercase tracking-wider mt-0.5">
                                                {f ? f.nome.toUpperCase() : '—'} · {m.fmt === 'online' ? 'ONLINE' : 'PRESENCIAL'}{m.local ? ` — ${m.local.toUpperCase()}` : ''}
                                            </div>
                                            {it && <div className="text-[9px] text-theme-cyan font-bold mt-0.5 truncate">↳ {it.nome}</div>}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ════ MODAL: DETALHE DO ITEM ════ */}
            {detE && (
                <Modal title="Detalhe do Item" onClose={closeAll} wide>
                    <div className="flex flex-wrap items-start gap-4 mb-5">
                        <div className="relative group shrink-0">
                            {detE.it.foto
                                ? <img src={detE.it.foto} className="w-20 h-20 rounded-2xl object-cover" />
                                : <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-white font-black text-xs" style={{ background: detE.cat.color }}>{detE.cat.cod}</div>}
                            {!isViewer && (
                                <label className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer" title="Trocar foto do material">
                                    <span className="material-symbols-outlined text-white text-xl">add_a_photo</span>
                                    <input type="file" accept="image/*" className="hidden"
                                        onChange={e => handlePhotoFile(e, url => setData(db => ({ ...db, items: db.items.map(i => i.id === detE.it.id ? { ...i, foto: url } : i) }), 'COMPRAS: FOTO ATUALIZADA'))} />
                                </label>
                            )}
                        </div>
                        <div className="flex-1 min-w-[220px]">
                            <div className="text-sm font-bold text-theme-text uppercase">{detE.it.nome}</div>
                            <div className="text-[9px] font-black font-square text-theme-textMuted tracking-wider mt-1">
                                {(detE.it.qtd > 1 ? detE.it.qtd.toLocaleString('pt-BR') + ' ' : '') + detE.it.unid.toUpperCase()} · <span style={{ color: detE.cat.color }}>{detE.cat.cod} — {detE.cat.nome.toUpperCase()}</span>
                            </div>
                            {detE.it.espec && <p className="text-[11px] text-theme-textMuted mt-2 leading-relaxed">{detE.it.espec}</p>}
                        </div>
                        {!isViewer && (
                            <button onClick={() => deleteItem(detE.it.id)} title="Excluir item" className="text-theme-textMuted hover:text-red-500 p-2 bg-red-500/10 rounded-xl">
                                <span className="material-symbols-outlined text-base">delete</span>
                            </button>
                        )}
                    </div>

                    {/* steps de status */}
                    <div className="flex flex-wrap gap-1.5 mb-5">
                        {STATUS.map((st, i) => {
                            const stIdx = STATUS.findIndex(s => s.id === detE.it.status);
                            const done = i < stIdx, active = i === stIdx;
                            return (
                                <button key={st.id} disabled={isViewer} onClick={() => setItemStatus(detE.it.id, st.id)}
                                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[8px] font-black uppercase tracking-wider transition-all disabled:cursor-default"
                                    style={{ background: active ? st.color : (done ? st.color + '1A' : 'transparent'), borderColor: active || done ? st.color : 'var(--theme-divider, #E5E7EB)', color: active ? '#fff' : (done ? st.color : '#9CA3AF') }}>
                                    <span className="material-symbols-outlined text-[13px]">{done ? 'check' : st.icon}</span>{st.label}
                                </button>
                            );
                        })}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="font-square font-black text-[10px] uppercase tracking-widest text-theme-textMuted">Orçamentos</h4>
                                {!isViewer && (
                                    <button onClick={() => { setDraft({}); setOrcItemId(detE.it.id); setModal('orc'); setFormErr(false); }}
                                        className="text-[9px] font-black uppercase text-theme-orange hover:underline flex items-center gap-1">
                                        <span className="material-symbols-outlined text-sm">add</span>Adicionar
                                    </button>
                                )}
                            </div>
                            {detE.it.quotes.length === 0 && <p className="text-[11px] text-theme-textMuted">Nenhum orçamento recebido.</p>}
                            <div className="space-y-2">
                                {detE.it.quotes.map(q => {
                                    const f = fornById(q.forn);
                                    const minV = Math.min(...detE.it.quotes.map(x => x.valor));
                                    const isBest = q.valor === minV && detE.it.quotes.length > 1;
                                    return (
                                        <div key={q.id} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-theme-bg border" style={{ borderColor: detE.it.aprovadoId === q.id ? '#10B981' : 'var(--theme-divider, #E5E7EB)' }}>
                                            {f && <img src={avatarOf(f)} className="w-8 h-8 rounded-full" />}
                                            <div className="flex-1 min-w-0">
                                                <div className="text-[10px] font-bold text-theme-text truncate">{f?.nome || '—'}</div>
                                                <div className="text-[8px] font-black text-theme-textMuted uppercase">{q.prazoDias}D · val. {fdate(q.validade)}</div>
                                            </div>
                                            <div className={`text-xs font-black ${isBest ? 'text-emerald-500' : 'text-theme-text'}`}>{money(q.valor)}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="font-square font-black text-[10px] uppercase tracking-widest text-theme-textMuted">Reuniões</h4>
                                {!isViewer && (
                                    <button onClick={() => { setDraft({ rItem: detE.it.id }); setModal('reuniao'); setFormErr(false); }}
                                        className="text-[9px] font-black uppercase text-theme-orange hover:underline flex items-center gap-1">
                                        <span className="material-symbols-outlined text-sm">event</span>Agendar
                                    </button>
                                )}
                            </div>
                            {data.meets.filter(m => m.item === detE.it.id).length === 0 && <p className="text-[11px] text-theme-textMuted">Nenhuma reunião vinculada.</p>}
                            <div className="space-y-2">
                                {data.meets.filter(m => m.item === detE.it.id).map(m => {
                                    const f = fornById(m.forn);
                                    return (
                                        <div key={m.id} className="p-2.5 rounded-xl bg-theme-bg border border-theme-divider">
                                            <div className="text-[10px] font-bold text-theme-text leading-snug">{m.pauta}</div>
                                            <div className="text-[8px] font-black text-theme-textMuted uppercase mt-0.5">{f?.nome.toUpperCase() || '—'} · {m.fmt === 'online' ? 'ONLINE' : 'PRESENCIAL'} · {fdate(m.data)} {m.hora}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </Modal>
            )}

            {/* ════ MODAL: FICHA DO FORNECEDOR ════ */}
            {fichaF && (
                <Modal title="Ficha do Fornecedor" onClose={closeAll} wide>
                    <div className="flex flex-wrap items-center gap-4 mb-5">
                        <img src={avatarOf(fichaF)} className="w-14 h-14 rounded-2xl" />
                        <div className="flex-1 min-w-[200px]">
                            <div className="text-sm font-bold text-theme-text uppercase">{fichaF.nome}</div>
                            <div className="text-[9px] font-black text-theme-textMuted uppercase tracking-wider">{fichaF.cidade}</div>
                        </div>
                        {!isViewer && (
                            <button onClick={() => { setDraft({ rForn: fichaF.id }); setFichaId(null); setModal('reuniao'); setFormErr(false); }}
                                className="bg-theme-orange text-white rounded-xl px-4 py-2 text-[9px] font-black uppercase tracking-widest hover:bg-orange-600 transition-all">Agendar reunião</button>
                        )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
                        <div className="p-3 rounded-xl bg-theme-bg border border-theme-divider"><div className="text-[8px] font-black text-theme-textMuted uppercase">Contato</div><div className="text-[11px] font-bold text-theme-text mt-0.5">{fichaF.contato || '—'}</div></div>
                        <div className="p-3 rounded-xl bg-theme-bg border border-theme-divider"><div className="text-[8px] font-black text-theme-textMuted uppercase">Telefone</div><div className="text-[11px] font-bold text-theme-text mt-0.5">{fichaF.fone || '—'}</div></div>
                        <div className="p-3 rounded-xl bg-theme-bg border border-theme-divider"><div className="text-[8px] font-black text-theme-textMuted uppercase">E-mail</div><div className="text-[11px] font-bold text-theme-text mt-0.5 truncate">{fichaF.email || '—'}</div></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <h4 className="font-square font-black text-[10px] uppercase tracking-widest text-theme-textMuted mb-2">Catálogos & Materiais</h4>
                            {fichaF.catalogos.length === 0 && <p className="text-[11px] text-theme-textMuted">Nenhum catálogo cadastrado.</p>}
                            <div className="space-y-2">
                                {fichaF.catalogos.map((c, i) => (
                                    <a key={i} href={c.url} target="_blank" rel="noreferrer" className="flex items-center gap-2.5 p-2.5 rounded-xl bg-theme-bg border border-theme-divider hover:border-theme-orange transition-all group">
                                        <span className="material-symbols-outlined text-base text-theme-cyan">{c.icon}</span>
                                        <span className="text-[10px] font-bold text-theme-text group-hover:text-theme-orange transition-colors truncate">{c.nome}</span>
                                        <span className="material-symbols-outlined text-sm text-theme-textMuted ml-auto">open_in_new</span>
                                    </a>
                                ))}
                            </div>
                        </div>
                        <div>
                            <h4 className="font-square font-black text-[10px] uppercase tracking-widest text-theme-textMuted mb-2">Cotações neste projeto</h4>
                            {(() => {
                                const cots: { it: ComprasItem; valor: number; status: string }[] = [];
                                data.items.forEach(it => it.quotes.forEach(q => { if (q.forn === fichaF.id) cots.push({ it, valor: q.valor, status: it.status }); }));
                                if (cots.length === 0) return <p className="text-[11px] text-theme-textMuted">Nenhuma cotação registrada.</p>;
                                return (
                                    <div className="space-y-2">
                                        {cots.map((c, i) => (
                                            <div key={i} className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-theme-bg border border-theme-divider">
                                                <span className="text-[10px] font-bold text-theme-text truncate flex-1">{c.it.nome}</span>
                                                <span className="text-[10px] font-black text-theme-text">{money(c.valor)}</span>
                                                <StatusBadge status={c.status} />
                                            </div>
                                        ))}
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </Modal>
            )}

            {/* ════ MODAL: GERENCIAR CATEGORIAS ════ */}
            {modal === 'cats' && (
                <Modal title="Categorias de Compras" onClose={closeAll} wide>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h4 className="font-square font-black text-[10px] uppercase tracking-widest text-theme-textMuted mb-2">Categorias atuais</h4>
                            <div className="space-y-2 max-h-[50vh] overflow-y-auto scroller pr-1">
                                {cats.map(c => {
                                    const inUse = data.items.filter(i => i.cat === c.id).length;
                                    return (
                                        <div key={c.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-theme-bg border border-theme-divider">
                                            {c.foto
                                                ? <img src={c.foto} className="w-9 h-9 rounded-lg object-cover shrink-0" />
                                                : <div className="w-9 h-9 rounded-lg shrink-0 flex items-center justify-center text-[8px] font-black text-white" style={{ background: c.color }}>{c.cod}</div>}
                                            <div className="flex-1 min-w-0">
                                                <div className="text-[11px] font-bold text-theme-text truncate uppercase">{c.nome}</div>
                                                <div className="text-[8px] font-black uppercase tracking-wider" style={{ color: c.color }}>{c.cod} · {inUse} {inUse === 1 ? 'item' : 'itens'}</div>
                                            </div>
                                            <button onClick={() => deleteCategory(c.id)} disabled={inUse > 0}
                                                title={inUse > 0 ? 'Em uso — mova os itens antes de excluir' : 'Excluir categoria'}
                                                className={`p-1.5 rounded-lg ${inUse > 0 ? 'text-theme-textMuted/40 cursor-not-allowed' : 'text-theme-textMuted hover:text-red-500 bg-red-500/10'}`}>
                                                <span className="material-symbols-outlined text-base">delete</span>
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <div>
                            <h4 className="font-square font-black text-[10px] uppercase tracking-widest text-theme-textMuted mb-2">Nova categoria</h4>
                            <div className="space-y-3">
                                <div><label className={labelCls}>Nome *</label><input className={inputCls} placeholder="EX: ELÉTRICA & ILUMINAÇÃO" value={draft.catNome || ''} onChange={D('catNome')} /></div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div><label className={labelCls}>Código (sigla)</label><input className={inputCls} placeholder="auto" maxLength={4} value={draft.catCod || ''} onChange={D('catCod')} /></div>
                                    <div>
                                        <label className={labelCls}>Cor</label>
                                        <div className="flex flex-wrap gap-1.5 py-1.5">
                                            {CAT_COLOR_POOL.slice(0, 8).map(col => (
                                                <button key={col} onClick={() => setDraft(prev => ({ ...prev, catColor: col }))}
                                                    className={`w-6 h-6 rounded-full border-2 transition-all ${draft.catColor === col ? 'border-theme-text scale-110' : 'border-transparent'}`}
                                                    style={{ background: col }} />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className={labelCls}>Foto da categoria</label>
                                    <div className="flex items-center gap-3">
                                        {draft.catFoto && <img src={draft.catFoto} className="w-12 h-12 rounded-xl object-cover border border-theme-divider shrink-0" />}
                                        <label className="flex-1 flex items-center justify-center gap-2 bg-theme-bg border border-dashed border-theme-divider rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest text-theme-textMuted hover:border-theme-orange hover:text-theme-orange cursor-pointer transition-all">
                                            <span className="material-symbols-outlined text-base">add_a_photo</span>
                                            {draft.catFoto ? 'Trocar' : 'Enviar foto'}
                                            <input type="file" accept="image/*" className="hidden" onChange={e => handlePhotoFile(e, url => setDraft(prev => ({ ...prev, catFoto: url })))} />
                                        </label>
                                    </div>
                                </div>
                                {formErr && <p className="text-[10px] font-bold text-red-500">Informe o nome da categoria.</p>}
                                <button onClick={addCategory} className="w-full bg-theme-orange text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-orange-600 transition-all">Adicionar categoria</button>
                            </div>
                        </div>
                    </div>
                </Modal>
            )}

            {/* ════ MODAL: NOVO ITEM ════ */}
            {modal === 'novo' && (
                <Modal title="Nova Cotação" onClose={closeAll}>
                    <div className="space-y-3">
                        <div><label className={labelCls}>Nome do item *</label><input className={inputCls} placeholder="EX: PORCELANATO 120X120..." value={draft.nome || ''} onChange={D('nome')} autoFocus /></div>
                        <div><label className={labelCls}>Categoria *</label>
                            <select className={inputCls} value={draft.cat || ''} onChange={D('cat')}>
                                <option value="" disabled>Selecione...</option>
                                {cats.map(c => <option key={c.id} value={c.id}>{c.cod} — {c.nome}</option>)}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className={labelCls}>Quantidade</label><input className={inputCls} placeholder="1" value={draft.qtd || ''} onChange={D('qtd')} /></div>
                            <div><label className={labelCls}>Unidade</label><input className={inputCls} placeholder="m², un, verba..." value={draft.unid || ''} onChange={D('unid')} /></div>
                        </div>
                        <div>
                            <label className={labelCls}>Foto do material</label>
                            <div className="flex items-center gap-3">
                                {draft.foto && <img src={draft.foto} className="w-14 h-14 rounded-xl object-cover border border-theme-divider shrink-0" />}
                                <label className="flex-1 flex items-center justify-center gap-2 bg-theme-bg border border-dashed border-theme-divider rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest text-theme-textMuted hover:border-theme-orange hover:text-theme-orange cursor-pointer transition-all">
                                    <span className="material-symbols-outlined text-base">add_a_photo</span>
                                    {draft.foto ? 'Trocar foto' : 'Enviar foto'}
                                    <input type="file" accept="image/*" className="hidden" onChange={e => handlePhotoFile(e, url => setDraft(prev => ({ ...prev, foto: url })))} />
                                </label>
                                {draft.foto && (
                                    <button onClick={() => setDraft(prev => ({ ...prev, foto: '' }))} className="text-theme-textMuted hover:text-red-500" title="Remover foto">
                                        <span className="material-symbols-outlined text-base">delete</span>
                                    </button>
                                )}
                            </div>
                        </div>
                        <div><label className={labelCls}>Especificação técnica</label><textarea rows={3} className={inputCls + ' resize-none'} placeholder="Descreva o material/serviço..." value={draft.espec || ''} onChange={D('espec')} /></div>
                        {formErr && <p className="text-[10px] font-bold text-red-500">Preencha nome e categoria.</p>}
                        <button onClick={saveNovo} className="w-full bg-theme-orange text-white py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-orange-600 transition-all">Criar item</button>
                    </div>
                </Modal>
            )}

            {/* ════ MODAL: NOVA REUNIÃO ════ */}
            {modal === 'reuniao' && (
                <Modal title="Agendar Reunião" onClose={closeAll}>
                    <div className="space-y-3">
                        <div><label className={labelCls}>Fornecedor *</label>
                            <select className={inputCls} value={draft.rForn || ''} onChange={D('rForn')}>
                                <option value="" disabled>Selecione...</option>
                                {data.forns.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                            </select>
                        </div>
                        <div><label className={labelCls}>Item relacionado</label>
                            <select className={inputCls} value={draft.rItem || ''} onChange={D('rItem')}>
                                <option value="">— Nenhum —</option>
                                {data.items.map(i => <option key={i.id} value={i.id}>{i.nome}</option>)}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className={labelCls}>Data *</label><input type="date" className={inputCls} value={draft.rData || ''} onChange={D('rData')} /></div>
                            <div><label className={labelCls}>Hora *</label><input type="time" className={inputCls} value={draft.rHora || ''} onChange={D('rHora')} /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className={labelCls}>Formato</label>
                                <select className={inputCls} value={draft.rFmt || 'online'} onChange={D('rFmt')}>
                                    <option value="online">Online</option>
                                    <option value="presencial">Presencial</option>
                                </select>
                            </div>
                            <div><label className={labelCls}>Local / Link</label><input className={inputCls} placeholder="Teams, escritório..." value={draft.rLocal || ''} onChange={D('rLocal')} /></div>
                        </div>
                        <div><label className={labelCls}>Pauta *</label><input className={inputCls} placeholder="Assunto da reunião..." value={draft.rPauta || ''} onChange={D('rPauta')} /></div>
                        {formErr && <p className="text-[10px] font-bold text-red-500">Preencha fornecedor, data, hora e pauta.</p>}
                        <button onClick={saveReuniao} className="w-full bg-theme-orange text-white py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-orange-600 transition-all">Agendar</button>
                    </div>
                </Modal>
            )}

            {/* ════ MODAL: NOVO FORNECEDOR ════ */}
            {modal === 'forn' && (
                <Modal title="Novo Fornecedor" onClose={closeAll}>
                    <div className="space-y-3">
                        <div><label className={labelCls}>Nome da empresa *</label><input className={inputCls} placeholder="EX: CERÂMICA ATLÂNTIDA" value={draft.fNome || ''} onChange={D('fNome')} autoFocus /></div>
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className={labelCls}>Cidade / UF</label><input className={inputCls} placeholder="ITAJAÍ / SC" value={draft.fCidade || ''} onChange={D('fCidade')} /></div>
                            <div><label className={labelCls}>Contato</label><input className={inputCls} placeholder="Nome do vendedor" value={draft.fContato || ''} onChange={D('fContato')} /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className={labelCls}>Telefone</label><input className={inputCls} placeholder="(47) 9 ..." value={draft.fFone || ''} onChange={D('fFone')} /></div>
                            <div><label className={labelCls}>E-mail</label><input className={inputCls} placeholder="contato@..." value={draft.fEmail || ''} onChange={D('fEmail')} /></div>
                        </div>
                        <div><label className={labelCls}>Especialidades (separar por vírgula)</label><input className={inputCls} placeholder="PORCELANATO, REVESTIMENTOS" value={draft.fEspec || ''} onChange={D('fEspec')} /></div>
                        <div><label className={labelCls}>Catálogo online (URL)</label><input className={inputCls} placeholder="https://..." value={draft.fCat || ''} onChange={D('fCat')} /></div>
                        {formErr && <p className="text-[10px] font-bold text-red-500">Informe o nome da empresa.</p>}
                        <button onClick={saveForn} className="w-full bg-theme-orange text-white py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-orange-600 transition-all">Cadastrar</button>
                    </div>
                </Modal>
            )}

            {/* ════ MODAL: NOVO ORÇAMENTO ════ */}
            {modal === 'orc' && (
                <Modal title={`Novo Orçamento — ${data.items.find(i => i.id === orcItemId)?.nome || ''}`} onClose={() => { setModal(null); setFormErr(false); }}>
                    <div className="space-y-3">
                        <div><label className={labelCls}>Fornecedor *</label>
                            <select className={inputCls} value={draft.oForn || ''} onChange={D('oForn')}>
                                <option value="" disabled>Selecione...</option>
                                {data.forns.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className={labelCls}>Valor total (R$) *</label><input className={inputCls} placeholder="295.000" value={draft.oValor || ''} onChange={D('oValor')} /></div>
                            <div><label className={labelCls}>Prazo (dias)</label><input className={inputCls} placeholder="30" value={draft.oPrazo || ''} onChange={D('oPrazo')} /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className={labelCls}>Validade</label><input type="date" className={inputCls} value={draft.oValidade || ''} onChange={D('oValidade')} /></div>
                            <div><label className={labelCls}>Frete</label><input className={inputCls} placeholder="Incluso (CIF)" value={draft.oFrete || ''} onChange={D('oFrete')} /></div>
                        </div>
                        <div><label className={labelCls}>Condições de pagamento</label><input className={inputCls} placeholder="30/60/90 dias" value={draft.oPag || ''} onChange={D('oPag')} /></div>
                        <div><label className={labelCls}>Observações</label><textarea rows={2} className={inputCls + ' resize-none'} value={draft.oObs || ''} onChange={D('oObs')} /></div>
                        {formErr && <p className="text-[10px] font-bold text-red-500">Informe fornecedor e valor. {data.forns.length === 0 ? 'Cadastre um fornecedor primeiro na aba Fornecedores.' : ''}</p>}
                        <button onClick={saveOrc} className="w-full bg-theme-orange text-white py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-orange-600 transition-all">Registrar orçamento</button>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default ComprasTab;
