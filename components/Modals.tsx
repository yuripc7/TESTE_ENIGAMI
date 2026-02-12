import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Company, Project, Scope, Event, Discipline, DependencyType, EventDependencyView } from '../types';

interface ModalBaseProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
}

const ModalBase: React.FC<ModalBaseProps> = ({ isOpen, onClose, children }) => {
    if (!isOpen) return null;
    return (
        <div data-modal-overlay="true" className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fadeIn p-4 no-print">
            <div className="bg-theme-card w-full max-w-[600px] rounded-[16px] border border-theme-divider shadow-soft animate-scaleIn relative overflow-hidden max-h-[90vh] flex flex-col">
                {children}
            </div>
        </div>
    );
};

export const AdminSettingsModal: React.FC<{ 
    isOpen: boolean; 
    theme: string; 
    onClose: () => void; 
    onToggleTheme: () => void; 
    onPrint: () => void; 
}> = ({ isOpen, theme, onClose, onToggleTheme, onPrint }) => {
    return (
        <ModalBase isOpen={isOpen} onClose={onClose}>
            <div className="p-8 overflow-y-auto">
                <div className="flex justify-between items-center mb-8 border-b border-theme-divider pb-4">
                    <h3 className="text-xl font-square font-black text-theme-text uppercase tracking-widest flex items-center gap-3">
                        <span className="material-symbols-outlined text-theme-orange">tune</span> Admin Board
                    </h3>
                    <button className="text-theme-textMuted hover:text-theme-text" onClick={onClose}>
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
                <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-theme-bg rounded-xl border border-theme-divider">
                        <div>
                            <span className="text-xs font-black text-theme-text uppercase block">Tema da Interface</span>
                            <span className="text-[10px] text-theme-textMuted font-bold uppercase">{theme === 'dark' ? 'Modo Escuro' : 'Modo Claro'}</span>
                        </div>
                        <button onClick={onToggleTheme} className="bg-theme-orange text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all hover:scale-105 active:scale-95 shadow-lg">
                            {theme === 'dark' ? 'Mudar para Light' : 'Mudar para Dark'}
                        </button>
                    </div>
                    <div className="flex flex-col gap-3">
                        <span className="text-[10px] font-black text-theme-textMuted uppercase tracking-widest px-2">Gestão de Documento</span>
                        <div className="grid grid-cols-1 gap-3">
                            <button onClick={onPrint} className="flex items-center justify-center gap-2 p-5 bg-theme-bg border border-theme-divider text-theme-text rounded-xl hover:bg-theme-highlight transition-all text-[10px] font-black uppercase shadow-lg">
                                <span className="material-symbols-outlined text-lg">print</span> Imprimir
                            </button>
                        </div>
                    </div>
                </div>
                <div className="mt-8 text-center border-t border-theme-divider pt-6">
                    <p className="text-[9px] text-theme-textMuted font-bold uppercase tracking-widest">Board Engine v2.9.4 • Tonolher</p>
                </div>
            </div>
        </ModalBase>
    );
};

export const ChecklistModal: React.FC<{
    isOpen: boolean; 
    event: Event | null; 
    project: Project | null; 
    onClose: () => void;
    onToggleCheck: (idx: number) => void; 
    onComplete: () => void;
    onToggleLink: (targetId: string) => void; 
    onChangeType: (targetId: string) => void;
    onEdit: () => void;
}> = ({ isOpen, event, project, onClose, onToggleCheck, onComplete, onToggleLink, onChangeType, onEdit }) => {
    const [searchTerm, setSearchTerm] = useState('');
    
    const allOtherEvents = useMemo(() => {
        if (!project || !event) return [];
        const list: { id: string; title: string; scopeName: string; color: string }[] = [];
        project.scopes.forEach(s => {
            s.events.forEach(ev => {
                if (ev.id !== event.id) {
                    list.push({ id: ev.id, title: ev.title, scopeName: s.name, color: s.colorClass });
                }
            });
        });
        return list;
    }, [project, event?.id]);

    const filteredEvents = useMemo(() => {
        return allOtherEvents.filter(e => 
            e.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
            e.scopeName.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [allOtherEvents, searchTerm]);

    const currentDependencies: EventDependencyView[] = useMemo(() => {
        if (!event) return [];
        return (event.dependencies || []).map(d => {
            const target = allOtherEvents.find(e => e.id === d.id);
            return target ? { ...target, type: d.type } : null;
        }).filter((item): item is EventDependencyView => item !== null);
    }, [allOtherEvents, event?.dependencies]);

    const allDone = useMemo(() => {
        if (!event) return false;
        if (!event.checklist || event.checklist.length === 0) return true;
        return event.checklist.every(i => i.done);
    }, [event?.checklist]);

    const DEP_DEFINITIONS: Record<DependencyType, { label: string; name: string; desc: string }> = {
        'FS': { label: 'TI', name: 'Término-a-Início', desc: 'A tarefa A deve terminar para B iniciar.' },
        'SS': { label: 'II', name: 'Início-a-Início', desc: 'A tarefa B pode iniciar junto com A.' },
        'FF': { label: 'TT', name: 'Término-a-Término', desc: 'A tarefa B não termina antes de A.' },
        'SF': { label: 'IT', name: 'Início-a-Término', desc: 'A tarefa A deve iniciar para B terminar.' }
    };

    if (!event || !project || !isOpen) return null;

    return (
        <ModalBase isOpen={isOpen} onClose={onClose}>
            <div className="p-6 max-h-[90vh] overflow-y-auto scroller">
                <div className="flex justify-between items-start mb-4 border-b border-theme-divider pb-4">
                    <div>
                        <h3 className="text-xl font-square font-black text-theme-text flex items-center gap-2">Validação Técnica</h3>
                        <p className="text-xs text-theme-textMuted mt-1 uppercase tracking-widest">{event.title}</p>
                    </div>
                    <div className="flex gap-2">
                        <button className="text-theme-textMuted hover:text-theme-orange transition-colors" onClick={onEdit} title="Editar Detalhes">
                            <span className="material-symbols-outlined">edit</span>
                        </button>
                        <button className="text-theme-textMuted hover:text-theme-text" onClick={onClose}>
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                </div>
                <div className="mb-6">
                    <label className="text-[10px] font-black text-theme-textMuted uppercase tracking-widest mb-2 block">Checklist</label>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                        {event.checklist && event.checklist.length > 0 ? event.checklist.map((it, i) => (
                            <div key={i} className={`flex items-center gap-3 p-3 bg-theme-bg rounded-xl border cursor-pointer transition-all ${it.done ? 'border-theme-green bg-green-900/10' : 'border-theme-divider hover:border-theme-textMuted'}`} onClick={() => onToggleCheck(i)}>
                                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${it.done ? 'bg-theme-green border-theme-green' : 'bg-transparent border-zinc-600'}`}>
                                    {it.done && <span className="material-symbols-outlined text-white text-[14px] font-bold">check</span>}
                                </div>
                                <span className={`text-xs font-medium ${it.done ? 'text-theme-textMuted line-through' : 'text-theme-text'}`}>{it.text}</span>
                            </div>
                        )) : (
                            <div className="p-4 border border-dashed border-theme-divider rounded-xl text-center">
                                <span className="text-[10px] font-bold text-theme-textMuted uppercase">Sem itens vinculados</span>
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="mb-6 border-t border-theme-divider pt-6">
                    <label className="text-[10px] font-black text-theme-cyan uppercase tracking-widest mb-3 block flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">link</span> Vínculos de Dependência
                    </label>
                    {currentDependencies.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                            {currentDependencies.map((dep) => {
                                const def = DEP_DEFINITIONS[dep.type] || { label: dep.type, name: dep.type, desc: '' };
                                return (
                                    <div key={dep.id} className="bg-theme-cyan/10 border border-theme-cyan/30 px-2 py-1 rounded-lg flex items-center gap-2 group">
                                        <span className="text-[9px] font-black text-theme-cyan uppercase">{dep.scopeName}: {dep.title}</span>
                                        <button 
                                            onClick={() => onChangeType(dep.id)} 
                                            className="bg-theme-cyan text-black text-[8px] font-black px-1.5 py-0.5 rounded hover:bg-white transition-colors cursor-pointer" 
                                            title={`${def.name}: ${def.desc}`}
                                        >
                                            {def.label}
                                        </button>
                                        <button onClick={() => onToggleLink(dep.id)} className="text-theme-cyan hover:text-red-500 transition-colors">
                                            <span className="material-symbols-outlined text-xs">close</span>
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-theme-textMuted text-sm">search</span>
                        <input type="text" placeholder="Buscar entrega para vincular..." className="w-full bg-theme-bg border border-theme-divider rounded-xl py-2 pl-9 pr-4 text-xs text-theme-text outline-none focus:border-theme-cyan transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        {searchTerm && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-theme-bg border border-theme-divider rounded-xl shadow-2xl z-[110] max-h-48 overflow-y-auto scroller">
                                {filteredEvents.map(e => (
                                    <button key={e.id} className="w-full text-left p-3 hover:bg-theme-highlight border-b border-theme-divider flex justify-between items-center group" onClick={() => { onToggleLink(e.id); setSearchTerm(''); }}>
                                        <div>
                                            <span className="text-[10px] block opacity-50 uppercase font-black" style={{ color: e.color }}>{e.scopeName}</span>
                                            <span className="text-xs font-bold text-theme-text">{e.title}</span>
                                        </div>
                                        <span className="material-symbols-outlined text-theme-cyan opacity-0 group-hover:opacity-100 transition-opacity">add_link</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <button className={`w-full py-4 rounded-2xl font-black text-xs tracking-[0.2em] flex items-center justify-center gap-3 transition-all transform active:scale-95 ${event.completed ? 'bg-theme-bg border border-theme-divider text-theme-textMuted' : allDone ? 'bg-theme-green text-white shadow-lg' : 'bg-theme-bg border border-theme-divider text-theme-textMuted opacity-50'}`} onClick={onComplete}>
                    <span className="material-symbols-outlined">{event.completed ? 'undo' : 'task_alt'}</span>
                    {event.completed ? 'REABRIR ENTREGA' : 'VALIDAR ENTREGA'}
                </button>
            </div>
        </ModalBase>
    );
};

export const LodModal: React.FC<{
    isOpen: boolean; lods: string[]; activeLod: string; onClose: () => void;
    onSelect: (l: string) => void; onAdd: (l: string) => void; onRemove: (l: string) => void;
    onReorder?: (l: string[]) => void;
}> = ({ isOpen, lods, activeLod, onClose, onSelect, onAdd, onRemove }) => {
    const [newItem, setNewItem] = useState('');
    return (
        <ModalBase isOpen={isOpen} onClose={onClose}>
            <div className="p-6 flex flex-col h-full">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-square font-black text-lg text-theme-text uppercase tracking-widest">Fase do Projeto</h3>
                    <button onClick={onClose}><span className="material-symbols-outlined text-theme-textMuted hover:text-theme-text">close</span></button>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2 mb-4">
                    {lods.map(l => (
                        <div key={l} className={`p-3 rounded-lg border flex justify-between items-center cursor-pointer transition-all ${activeLod === l ? 'bg-theme-orange/20 border-theme-orange' : 'bg-theme-bg border-theme-divider hover:border-theme-textMuted'}`} onClick={() => onSelect(l)}>
                            <span className={`text-xs font-bold uppercase ${activeLod === l ? 'text-theme-orange' : 'text-theme-text'}`}>{l}</span>
                            <button onClick={(e) => { e.stopPropagation(); if (confirm('Remover?')) onRemove(l); }} className="text-theme-textMuted hover:text-red-500"><span className="material-symbols-outlined text-sm">delete</span></button>
                        </div>
                    ))}
                </div>
                <div className="flex gap-2 mt-auto">
                    <input className="flex-1 bg-theme-bg border border-theme-divider rounded-lg px-3 text-xs outline-none focus:border-theme-orange" placeholder="Nova fase..." value={newItem} onChange={e => setNewItem(e.target.value)} />
                    <button className="bg-theme-orange text-white px-4 rounded-lg font-bold text-xs uppercase" onClick={() => { if (newItem) { onAdd(newItem); setNewItem(''); } }}>Adicionar</button>
                </div>
            </div>
        </ModalBase>
    );
};

export const CompanyModal: React.FC<{
    isOpen: boolean; companies: Company[]; onClose: () => void;
    onSelect: (id: number) => void; onAdd: (name: string) => void; onRemove: (id: number) => void;
    onReorder?: (c: Company[]) => void;
}> = ({ isOpen, companies, onClose, onSelect, onAdd, onRemove }) => {
    const [newItem, setNewItem] = useState('');
    return (
        <ModalBase isOpen={isOpen} onClose={onClose}>
            <div className="p-6 flex flex-col h-full">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-square font-black text-lg text-theme-text uppercase tracking-widest">Cliente / Empresa</h3>
                    <button onClick={onClose}><span className="material-symbols-outlined text-theme-textMuted hover:text-theme-text">close</span></button>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2 mb-4">
                    {companies.map(c => (
                        <div key={c.id} className="p-3 rounded-lg border border-theme-divider bg-theme-bg flex justify-between items-center hover:border-theme-textMuted cursor-pointer" onClick={() => onSelect(c.id)}>
                            <span className="text-xs font-bold text-theme-text uppercase">{c.name}</span>
                            <button onClick={(e) => { e.stopPropagation(); if (confirm('Remover?')) onRemove(c.id); }} className="text-theme-textMuted hover:text-red-500"><span className="material-symbols-outlined text-sm">delete</span></button>
                        </div>
                    ))}
                </div>
                <div className="flex gap-2 mt-auto">
                    <input className="flex-1 bg-theme-bg border border-theme-divider rounded-lg px-3 text-xs outline-none focus:border-theme-orange" placeholder="Nome do cliente..." value={newItem} onChange={e => setNewItem(e.target.value)} />
                    <button className="bg-theme-orange text-white px-4 rounded-lg font-bold text-xs uppercase" onClick={() => { if (newItem) { onAdd(newItem); setNewItem(''); } }}>Criar</button>
                </div>
            </div>
        </ModalBase>
    );
};

export const ProjectModal: React.FC<{
    isOpen: boolean; companyName: string; projects: Project[]; onClose: () => void;
    onSelect: (id: number) => void; onAdd: (name: string, logo?: string, cover?: string) => void;
    onDelete: (id: number) => void; onEdit: (id: number, name: string, logo?: string, cover?: string) => void;
}> = ({ isOpen, companyName, projects, onClose, onSelect, onAdd, onDelete, onEdit }) => {
    const [mode, setMode] = useState<'list' | 'create' | 'edit'>('list');
    const [editId, setEditId] = useState<number | null>(null);
    const [name, setName] = useState('');
    const [logo, setLogo] = useState('');
    const [cover, setCover] = useState('');
    
    // Refs for file inputs
    const logoInputRef = useRef<HTMLInputElement>(null);
    const coverInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!isOpen) setMode('list');
    }, [isOpen]);

    const handleSave = () => {
        if (!name) return;
        if (mode === 'create') onAdd(name, logo, cover);
        if (mode === 'edit' && editId) onEdit(editId, name, logo, cover);
        setMode('list'); setName(''); setLogo(''); setCover(''); setEditId(null);
    };

    const startEdit = (p: Project) => {
        setEditId(p.id); setName(p.name); setLogo(p.logoUrl || ''); setCover(p.coverUrl || ''); setMode('edit');
    };

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>, setter: (s: string) => void) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setter(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    return (
        <ModalBase isOpen={isOpen} onClose={onClose}>
            <div className="p-6 flex flex-col h-full">
                <div className="flex justify-between items-center mb-6 border-b border-theme-divider pb-4">
                    <div>
                        <h3 className="font-square font-black text-lg text-theme-text uppercase tracking-widest">{mode === 'list' ? 'Selecione o Projeto' : mode === 'create' ? 'Novo Projeto' : 'Editar Projeto'}</h3>
                        <p className="text-xs text-theme-textMuted uppercase tracking-wider">{companyName}</p>
                    </div>
                    <div className="flex gap-2">
                        {mode !== 'list' && <button onClick={() => setMode('list')} className="text-theme-textMuted hover:text-white uppercase text-[10px] font-bold">Voltar</button>}
                        <button onClick={onClose}><span className="material-symbols-outlined text-theme-textMuted hover:text-theme-text">close</span></button>
                    </div>
                </div>
                
                {mode === 'list' ? (
                    <div className="flex-1 overflow-y-auto pr-1">
                        <div className="grid grid-cols-2 gap-4">
                            {projects.length === 0 && <div className="col-span-2 text-center py-10 text-theme-textMuted text-xs">Nenhum projeto encontrado.</div>}
                            {projects.map(p => (
                                <div key={p.id} className="relative aspect-video rounded-2xl overflow-hidden cursor-pointer group border border-theme-divider hover:border-theme-orange transition-all shadow-lg" onClick={() => onSelect(p.id)}>
                                    <div className="absolute inset-0 bg-theme-bg">
                                        {p.coverUrl ? (
                                            <img src={p.coverUrl} className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity" />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-theme-card to-theme-bg opacity-50" />
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                                    </div>
                                    
                                    <div className="absolute inset-0 p-4 flex flex-col justify-end items-start z-10">
                                        <div className="flex items-center gap-3 w-full mb-1">
                                             {p.logoUrl ? <img src={p.logoUrl} className="w-8 h-8 rounded-lg object-contain bg-white/10 backdrop-blur-sm" /> : <span className="material-symbols-outlined text-white/50">folder</span>}
                                             <h4 className="font-square font-bold text-sm text-white uppercase truncate shadow-black drop-shadow-md">{p.name}</h4>
                                        </div>
                                        <span className="text-[9px] text-white/60 font-medium">Atualizado: {new Date(p.updatedAt).toLocaleDateString()}</span>
                                    </div>

                                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                        <button onClick={(e) => { e.stopPropagation(); startEdit(p); }} className="bg-black/50 text-white p-1.5 rounded-lg hover:bg-theme-orange backdrop-blur-sm"><span className="material-symbols-outlined text-sm">edit</span></button>
                                        <button onClick={(e) => { e.stopPropagation(); if(confirm('Excluir projeto?')) onDelete(p.id); }} className="bg-black/50 text-white p-1.5 rounded-lg hover:bg-red-500 backdrop-blur-sm"><span className="material-symbols-outlined text-sm">delete</span></button>
                                    </div>
                                </div>
                            ))}
                            <button className="aspect-video rounded-2xl border-2 border-dashed border-theme-divider hover:border-theme-orange hover:bg-theme-highlight flex flex-col items-center justify-center gap-2 transition-all group" onClick={() => { setName(''); setLogo(''); setCover(''); setMode('create'); }}>
                                <span className="material-symbols-outlined text-3xl text-theme-textMuted group-hover:text-theme-orange transition-colors">add_circle</span>
                                <span className="text-[10px] font-bold text-theme-textMuted uppercase">Novo Projeto</span>
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div><label className="block text-[10px] uppercase font-bold text-theme-textMuted mb-2">Nome do Projeto</label><input className="w-full bg-theme-bg border border-theme-divider rounded-lg px-4 py-3 text-sm text-theme-text outline-none focus:border-theme-orange font-bold" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Residencial Skyline" /></div>
                        
                        <div className="flex items-center gap-4 p-3 border border-theme-divider rounded-xl bg-theme-bg/50">
                            <div onClick={() => logoInputRef.current?.click()} className="w-16 h-16 rounded-xl border border-dashed border-theme-textMuted flex items-center justify-center cursor-pointer hover:border-theme-orange overflow-hidden relative bg-theme-card">
                                {logo ? <img src={logo} className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-theme-textMuted">image</span>}
                                <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={(e) => handleFile(e, setLogo)} />
                            </div>
                            <div className="flex-1">
                                <label className="block text-[10px] uppercase font-bold text-theme-textMuted mb-1">Logo do Projeto</label>
                                <div className="flex gap-2">
                                     <button onClick={() => logoInputRef.current?.click()} className="bg-theme-highlight border border-theme-divider text-theme-text px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase hover:bg-theme-divider">Escolher Arquivo</button>
                                     {logo && <button onClick={() => setLogo('')} className="text-red-500 text-[10px] font-bold uppercase hover:underline">Remover</button>}
                                </div>
                            </div>
                        </div>

                        <div>
                             <label className="block text-[10px] uppercase font-bold text-theme-textMuted mb-2">Imagem de Capa (Fundo)</label>
                             <div onClick={() => coverInputRef.current?.click()} className="w-full h-32 rounded-xl border border-dashed border-theme-textMuted flex flex-col items-center justify-center cursor-pointer hover:border-theme-orange overflow-hidden relative bg-theme-card group">
                                {cover ? (
                                    <>
                                        <img src={cover} className="w-full h-full object-cover opacity-50" />
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <span className="text-white font-bold text-xs uppercase">Alterar Imagem</span>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-3xl text-theme-textMuted mb-2">add_photo_alternate</span>
                                        <span className="text-[10px] font-bold text-theme-textMuted uppercase">Clique para selecionar capa</span>
                                    </>
                                )}
                                <input type="file" ref={coverInputRef} className="hidden" accept="image/*" onChange={(e) => handleFile(e, setCover)} />
                            </div>
                        </div>

                        <button className="w-full bg-theme-orange text-white py-4 rounded-xl font-bold uppercase text-xs mt-4 shadow-lg hover:bg-orange-600 transition-colors" onClick={handleSave}>Confirmar</button>
                    </div>
                )}
            </div>
        </ModalBase>
    );
};

export const ScopeModal: React.FC<{
    isOpen: boolean; scope: Scope | null; disciplines: Discipline[]; onClose: () => void;
    onManage: () => void; team: string[];
    onSave: (name: string, start: string, color: string, status: string, pWeek: number, resp: string) => void;
}> = ({ isOpen, scope, disciplines, onClose, onManage, team, onSave }) => {
    const [name, setName] = useState('');
    const [start, setStart] = useState('');
    const [color, setColor] = useState('#808080');
    const [resp, setResp] = useState('');
    
    useEffect(() => {
        if (scope) {
            setName(scope.name); setStart(scope.startDate); setColor(scope.colorClass); setResp(scope.resp);
        } else {
            setName(''); setStart(new Date().toISOString().split('T')[0]); setColor('#808080'); setResp(team[0] || '');
        }
    }, [scope, isOpen, team]);

    const handleDisciplineSelect = (d: Discipline) => {
        setName(d.code); setColor(d.color);
    };

    return (
        <ModalBase isOpen={isOpen} onClose={onClose}>
             <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-square font-black text-lg text-theme-text uppercase tracking-widest">{scope ? 'Editar Disciplina' : 'Nova Disciplina'}</h3>
                    <button onClick={onClose}><span className="material-symbols-outlined text-theme-textMuted hover:text-theme-text">close</span></button>
                </div>
                <div className="space-y-4">
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="text-[10px] uppercase font-bold text-theme-textMuted">Disciplina</label>
                            <button onClick={onManage} className="text-[9px] text-theme-orange hover:underline">Gerenciar Lista</button>
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-2 mb-2">
                            {disciplines.map(d => (
                                <button key={d.code} type="button" onClick={() => handleDisciplineSelect(d)} className={`px-2 py-1 rounded text-[9px] font-bold uppercase shrink-0 border ${name === d.code ? 'border-white text-white' : 'border-transparent text-theme-textMuted bg-theme-highlight'}`} style={{ backgroundColor: name === d.code ? d.color : undefined }}>
                                    {d.code}
                                </button>
                            ))}
                        </div>
                        <input className="w-full bg-theme-bg border border-theme-divider rounded-lg px-3 py-2 text-xs text-theme-text outline-none focus:border-theme-orange uppercase" value={name} onChange={e => setName(e.target.value)} placeholder="Código ou Nome..." />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-[10px] uppercase font-bold text-theme-textMuted mb-1">Responsável</label><select className="w-full bg-theme-bg border border-theme-divider rounded-lg px-3 py-2 text-xs text-theme-text outline-none focus:border-theme-orange" value={resp} onChange={e => setResp(e.target.value)}>{team.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                        <div><label className="block text-[10px] uppercase font-bold text-theme-textMuted mb-1">Início</label><input type="date" className="w-full bg-theme-bg border border-theme-divider rounded-lg px-3 py-2 text-xs text-theme-text outline-none focus:border-theme-orange" value={start} onChange={e => setStart(e.target.value)} /></div>
                    </div>
                    <div><label className="block text-[10px] uppercase font-bold text-theme-textMuted mb-1">Cor</label><div className="flex gap-2 items-center"><input type="color" className="w-10 h-10 rounded cursor-pointer bg-transparent border-none" value={color} onChange={e => setColor(e.target.value)} /><span className="text-xs text-theme-textMuted font-mono">{color}</span></div></div>
                    <button className="w-full bg-theme-orange text-white py-3 rounded-xl font-bold uppercase text-xs mt-4 shadow-lg" onClick={() => onSave(name, start, color, 'walking', 0, resp)}>Salvar</button>
                </div>
            </div>
        </ModalBase>
    );
};

export const EventModal: React.FC<{
    isOpen: boolean; team: string[]; event: Event | null; onClose: () => void;
    onSave: (title: string, resp: string, start: string, end: string, checklist: string) => void;
}> = ({ isOpen, team, event, onClose, onSave }) => {
    const [title, setTitle] = useState('');
    const [resp, setResp] = useState('');
    const [start, setStart] = useState('');
    const [end, setEnd] = useState('');
    const [checklist, setChecklist] = useState('');

    useEffect(() => {
        if (event) {
            setTitle(event.title); setResp(event.resp); setStart(event.startDate); setEnd(event.endDate);
            setChecklist(event.checklist?.map(c => c.text).join('\n') || '');
        } else {
            setTitle(''); setResp(team[0] || ''); setStart(new Date().toISOString().split('T')[0]); setEnd(new Date().toISOString().split('T')[0]); setChecklist('');
        }
    }, [event, isOpen, team]);

    return (
        <ModalBase isOpen={isOpen} onClose={onClose}>
            <div className="p-6 flex flex-col h-full">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-square font-black text-lg text-theme-text uppercase tracking-widest">{event ? 'Editar Ação' : 'Nova Ação'}</h3>
                    <button onClick={onClose}><span className="material-symbols-outlined text-theme-textMuted hover:text-theme-text">close</span></button>
                </div>
                <div className="flex-1 overflow-y-auto space-y-4">
                    <div><label className="block text-[10px] uppercase font-bold text-theme-textMuted mb-1">Título</label><input className="w-full bg-theme-bg border border-theme-divider rounded-lg px-3 py-2 text-xs text-theme-text outline-none focus:border-theme-orange uppercase" value={title} onChange={e => setTitle(e.target.value)} /></div>
                    <div><label className="block text-[10px] uppercase font-bold text-theme-textMuted mb-1">Responsável</label><select className="w-full bg-theme-bg border border-theme-divider rounded-lg px-3 py-2 text-xs text-theme-text outline-none focus:border-theme-orange" value={resp} onChange={e => setResp(e.target.value)}>{team.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-[10px] uppercase font-bold text-theme-textMuted mb-1">Início</label><input type="date" className="w-full bg-theme-bg border border-theme-divider rounded-lg px-3 py-2 text-xs text-theme-text outline-none focus:border-theme-orange" value={start} onChange={e => setStart(e.target.value)} /></div>
                        <div><label className="block text-[10px] uppercase font-bold text-theme-textMuted mb-1">Fim</label><input type="date" className="w-full bg-theme-bg border border-theme-divider rounded-lg px-3 py-2 text-xs text-theme-text outline-none focus:border-theme-orange" value={end} onChange={e => setEnd(e.target.value)} /></div>
                    </div>
                    <div className="flex-1 flex flex-col"><label className="block text-[10px] uppercase font-bold text-theme-textMuted mb-1">Checklist (1 por linha)</label><textarea className="flex-1 w-full bg-theme-bg border border-theme-divider rounded-lg px-3 py-2 text-xs text-theme-text outline-none focus:border-theme-orange min-h-[100px]" value={checklist} onChange={e => setChecklist(e.target.value)} placeholder="Ex: Planta Baixa..." /></div>
                </div>
                <button className="w-full bg-theme-orange text-white py-3 rounded-xl font-bold uppercase text-xs mt-4 shadow-lg" onClick={() => onSave(title, resp, start, end, checklist)}>Salvar</button>
            </div>
        </ModalBase>
    );
};

export const TeamModal: React.FC<{
    isOpen: boolean; team: string[]; onClose: () => void; onAdd: (name: string) => void; onRemove: (idx: number) => void;
}> = ({ isOpen, team, onClose, onAdd, onRemove }) => {
    const [newItem, setNewItem] = useState('');
    return (
        <ModalBase isOpen={isOpen} onClose={onClose}>
            <div className="p-6 flex flex-col h-full">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-square font-black text-lg text-theme-text uppercase tracking-widest">Equipe Técnica</h3>
                    <button onClick={onClose}><span className="material-symbols-outlined text-theme-textMuted hover:text-theme-text">close</span></button>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2 mb-4">
                    {team.map((t, i) => (
                        <div key={i} className="p-3 rounded-lg border border-theme-divider bg-theme-bg flex justify-between items-center">
                            <span className="text-xs font-bold text-theme-text uppercase">{t}</span>
                            <button onClick={() => { if (confirm('Remover membro?')) onRemove(i); }} className="text-theme-textMuted hover:text-red-500"><span className="material-symbols-outlined text-sm">delete</span></button>
                        </div>
                    ))}
                </div>
                <div className="flex gap-2 mt-auto">
                    <input className="flex-1 bg-theme-bg border border-theme-divider rounded-lg px-3 text-xs outline-none focus:border-theme-orange" placeholder="Nome do membro..." value={newItem} onChange={e => setNewItem(e.target.value)} />
                    <button className="bg-theme-orange text-white px-4 rounded-lg font-bold text-xs uppercase" onClick={() => { if (newItem) { onAdd(newItem); setNewItem(''); } }}>Add</button>
                </div>
            </div>
        </ModalBase>
    );
};

export const TimelineSettingsModal: React.FC<{
    isOpen: boolean; project: Project | null; onClose: () => void; onSave: (start: string, end: string) => void;
}> = ({ isOpen, project, onClose, onSave }) => {
    const [start, setStart] = useState('');
    const [end, setEnd] = useState('');
    useEffect(() => {
        if(project) { setStart(project.timelineStart); setEnd(project.timelineEnd); }
    }, [project, isOpen]);

    return (
        <ModalBase isOpen={isOpen} onClose={onClose}>
            <div className="p-6">
                <h3 className="font-square font-black text-lg text-theme-text uppercase tracking-widest mb-6">Período do Projeto</h3>
                <div className="space-y-4">
                    <div><label className="block text-[10px] uppercase font-bold text-theme-textMuted mb-1">Início da Timeline</label><input type="date" className="w-full bg-theme-bg border border-theme-divider rounded-lg px-3 py-2 text-xs text-theme-text outline-none focus:border-theme-orange" value={start} onChange={e => setStart(e.target.value)} /></div>
                    <div><label className="block text-[10px] uppercase font-bold text-theme-textMuted mb-1">Fim da Timeline</label><input type="date" className="w-full bg-theme-bg border border-theme-divider rounded-lg px-3 py-2 text-xs text-theme-text outline-none focus:border-theme-orange" value={end} onChange={e => setEnd(e.target.value)} /></div>
                    <button className="w-full bg-theme-orange text-white py-3 rounded-xl font-bold uppercase text-xs mt-4 shadow-lg" onClick={() => onSave(start, end)}>Salvar</button>
                </div>
            </div>
        </ModalBase>
    );
};

export const DisciplinesManagerModal: React.FC<{
    isOpen: boolean; disciplines: Discipline[]; onClose: () => void;
    onAdd: (d: Discipline) => void; onUpdate: (code: string, d: Discipline) => void; onRemove: (code: string) => void;
    onReorder?: (d: Discipline[]) => void;
}> = ({ isOpen, disciplines, onClose, onAdd, onUpdate, onRemove }) => {
    const [code, setCode] = useState('');
    const [name, setName] = useState('');
    const [color, setColor] = useState('#808080');

    return (
        <ModalBase isOpen={isOpen} onClose={onClose}>
            <div className="p-6 flex flex-col h-full">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-square font-black text-lg text-theme-text uppercase tracking-widest">Gerenciar Disciplinas</h3>
                    <button onClick={onClose}><span className="material-symbols-outlined text-theme-textMuted hover:text-theme-text">close</span></button>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2 mb-4">
                    {disciplines.map(d => (
                        <div key={d.code} className="p-2 rounded-lg border border-theme-divider bg-theme-bg flex items-center gap-3">
                            <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: d.color }}></div>
                            <div className="flex-1">
                                <span className="text-xs font-bold text-theme-text block">{d.code}</span>
                                <span className="text-[9px] text-theme-textMuted block uppercase">{d.name}</span>
                            </div>
                            <button onClick={() => { if(confirm('Remover?')) onRemove(d.code); }} className="text-theme-textMuted hover:text-red-500"><span className="material-symbols-outlined text-sm">delete</span></button>
                        </div>
                    ))}
                </div>
                <div className="border-t border-theme-divider pt-4 space-y-2">
                    <div className="flex gap-2">
                         <input className="w-20 bg-theme-bg border border-theme-divider rounded-lg px-2 py-2 text-xs text-theme-text outline-none focus:border-theme-orange uppercase" placeholder="COD" value={code} onChange={e => setCode(e.target.value)} maxLength={3} />
                         <input className="flex-1 bg-theme-bg border border-theme-divider rounded-lg px-2 py-2 text-xs text-theme-text outline-none focus:border-theme-orange" placeholder="Nome da Disciplina" value={name} onChange={e => setName(e.target.value)} />
                    </div>
                    <div className="flex gap-2">
                        <div className="flex items-center gap-2 border border-theme-divider rounded-lg px-2 bg-theme-bg"><input type="color" className="w-6 h-6 bg-transparent border-none cursor-pointer" value={color} onChange={e => setColor(e.target.value)} /></div>
                        <button className="flex-1 bg-theme-orange text-white rounded-lg font-bold text-xs uppercase py-2" onClick={() => { if (code && name) { onAdd({ code, name, color }); setCode(''); setName(''); setColor('#808080'); } }}>Adicionar Nova</button>
                    </div>
                </div>
            </div>
        </ModalBase>
    );
};