import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Company, Project, Scope, Event, Discipline } from '../types';
import Plan from './ui/agent-plan';

interface ModalBaseProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
}

const ModalBase: React.FC<ModalBaseProps> = ({ isOpen, onClose, children }) => {
    if (!isOpen) return null;
    return (
        <div data-modal-overlay="true" className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fadeIn p-4 no-print">
            <div className="bg-theme-card w-full max-w-[600px] rounded-[30px] border border-theme-divider shadow-neuro animate-scaleIn relative overflow-hidden">
                {children}
            </div>
        </div>
    );
};

export const GalleryModal: React.FC<{
    isOpen: boolean;
    images: string[];
    onClose: () => void;
    onUpload: (url: string) => void;
    onDelete: (idx: number) => void;
}> = ({ isOpen, images, onClose, onUpload, onDelete }) => {
    const fileRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => onUpload(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const isVideo = (url: string) => {
        return url.startsWith('data:video') || url.match(/\.(mp4|webm|ogg)$/i);
    };

    return (
        <ModalBase isOpen={isOpen} onClose={onClose}>
            <div className="p-8 h-[600px] flex flex-col">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-square font-black text-theme-text uppercase tracking-widest flex items-center gap-2">
                        <span className="material-symbols-outlined text-theme-orange">photo_library</span> Galeria
                    </h3>
                    <button onClick={onClose} className="text-theme-textMuted hover:text-theme-text"><span className="material-symbols-outlined">close</span></button>
                </div>

                <div className="flex-1 overflow-y-auto scroller p-2 bg-theme-bg border border-theme-divider rounded-xl grid grid-cols-2 md:grid-cols-3 gap-4 content-start">
                    {images.map((img, idx) => (
                        <div key={idx} className="relative group rounded-lg overflow-hidden border border-theme-divider bg-black aspect-square">
                            {isVideo(img) ? (
                                <video src={img} className="w-full h-full object-cover" />
                            ) : (
                                <img src={img} className="w-full h-full object-cover" />
                            )}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <button onClick={() => onDelete(idx)} className="bg-red-500 text-white p-2 rounded-full hover:scale-110 transition-transform shadow-lg">
                                    <span className="material-symbols-outlined">delete</span>
                                </button>
                            </div>
                            {isVideo(img) && (
                                <div className="absolute bottom-2 right-2 bg-black/60 p-1 rounded-full text-white pointer-events-none">
                                    <span className="material-symbols-outlined text-sm">videocam</span>
                                </div>
                            )}
                        </div>
                    ))}
                    {images.length === 0 && (
                        <div className="col-span-full flex flex-col items-center justify-center h-48 text-theme-textMuted">
                            <span className="material-symbols-outlined text-4xl mb-2 opacity-50">perm_media</span>
                            <span className="text-[10px] font-bold uppercase">Nenhuma mídia na galeria</span>
                        </div>
                    )}
                </div>

                <div className="mt-4 pt-4 border-t border-theme-divider">
                    <input type="file" ref={fileRef} className="hidden" accept="image/*,video/*" onChange={handleFileChange} />
                    <button onClick={() => fileRef.current?.click()} className="w-full bg-theme-orange text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-orange-600 transition-all flex items-center justify-center gap-2 shadow-lg">
                        <span className="material-symbols-outlined">upload</span> Upload Nova Mídia
                    </button>
                </div>
            </div>
        </ModalBase>
    );
};

export const AdminSettingsModal: React.FC<{
    isOpen: boolean;
    theme: string;
    onClose: () => void;
    onToggleTheme: () => void;
    onPrint: () => void;
    onExportJSON: () => void;
    onImportJSON: (e: React.ChangeEvent<HTMLInputElement>) => void;
}> = ({ isOpen, theme, onClose, onToggleTheme, onPrint, onExportJSON, onImportJSON }) => {
    const importInputRef = useRef<HTMLInputElement>(null);

    return (
        <ModalBase isOpen={isOpen} onClose={onClose}>
            <div className="p-8">
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
                            <button onClick={onPrint} className="flex items-center justify-center gap-2 p-4 bg-theme-bg border border-theme-divider text-theme-text rounded-xl hover:bg-theme-highlight transition-all text-[10px] font-black uppercase shadow-lg">
                                <span className="material-symbols-outlined text-lg">print</span> Imprimir Visualização Atual
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <span className="text-[10px] font-black text-theme-textMuted uppercase tracking-widest px-2">Backup & Migração</span>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={onExportJSON} className="flex items-center justify-center gap-2 p-4 bg-theme-cyan/10 border border-theme-cyan/30 text-theme-cyan rounded-xl hover:bg-theme-cyan/20 transition-all text-[10px] font-black uppercase shadow-lg">
                                <span className="material-symbols-outlined text-lg">download</span> Baixar Projeto (.json)
                            </button>

                            <button onClick={() => importInputRef.current?.click()} className="flex items-center justify-center gap-2 p-4 bg-theme-bg border border-theme-divider text-theme-text rounded-xl hover:bg-theme-highlight transition-all text-[10px] font-black uppercase shadow-lg">
                                <span className="material-symbols-outlined text-lg">upload</span> Importar Backup
                            </button>
                            <input
                                type="file"
                                ref={importInputRef}
                                className="hidden"
                                accept=".json"
                                onChange={onImportJSON}
                            />
                        </div>
                        <p className="text-[9px] text-theme-textMuted px-2 text-center">Use o arquivo .json para salvar seu progresso e carregar em outro dispositivo.</p>
                    </div>
                </div>
                <div className="mt-8 text-center border-t border-theme-divider pt-6">
                    <p className="text-[9px] text-theme-textMuted font-bold uppercase tracking-widest">Board Engine v2.9.2 • Tonolher</p>
                </div>
            </div>
        </ModalBase>
    );
};

export const ChecklistModal: React.FC<{
    isOpen: boolean; event: Event | null; project: Project | null; onClose: () => void;
    onToggleCheck: (idx: number) => void; onComplete: () => void;
    onToggleLink: (targetId: string) => void; onChangeType: (targetId: string) => void;
    onEdit: () => void;
}> = ({ isOpen, event, project, onClose, onToggleCheck, onComplete, onToggleLink, onChangeType, onEdit }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [showAgentPlan, setShowAgentPlan] = useState(false);

    useEffect(() => {
        if (!isOpen) setShowAgentPlan(false);
    }, [isOpen]);

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

    const currentDependencies = useMemo(() => {
        if (!event) return [];
        return (event.dependencies || []).map(d => {
            const target = allOtherEvents.find(e => e.id === d.id);
            return target ? { ...target, type: d.type } : null;
        }).filter(Boolean);
    }, [allOtherEvents, event?.dependencies]);

    const allDone = useMemo(() => {
        if (!event) return false;
        if (!event.checklist || event.checklist.length === 0) return true;
        return event.checklist.every(i => i.done);
    }, [event?.checklist]);

    const DEP_DEFINITIONS = {
        'FS': { label: 'TI', name: 'Término-a-Início', desc: 'A tarefa A deve terminar para B iniciar.' },
        'SS': { label: 'II', name: 'Início-a-Início', desc: 'A tarefa B pode iniciar junto com A.' },
        'FF': { label: 'TT', name: 'Término-a-Término', desc: 'A tarefa B não termina antes de A.' },
        'SF': { label: 'IT', name: 'Início-a-Término', desc: 'A tarefa A deve iniciar para B terminar.' }
    };

    if (!event || !project || !isOpen) return null;

    return (
        <ModalBase isOpen={isOpen} onClose={onClose}>
            <div className="p-6 max-h-[90vh] overflow-y-auto scroller h-[600px] flex flex-col">
                <div className="flex justify-between items-start mb-4 border-b border-theme-divider pb-4 flex-shrink-0">
                    <div>
                        <h3 className="text-xl font-square font-black text-theme-text flex items-center gap-2">Validação Técnica</h3>
                        <p className="text-xs text-theme-textMuted mt-1 uppercase tracking-widest">{event.title}</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowAgentPlan(!showAgentPlan)}
                            className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all flex items-center gap-1 ${showAgentPlan ? 'bg-theme-orange text-white' : 'bg-theme-bg border border-theme-divider text-theme-textMuted hover:text-theme-text'}`}
                        >
                            <span className="material-symbols-outlined text-sm">smart_toy</span> {showAgentPlan ? 'Voltar' : 'Plano IA'}
                        </button>
                        <button className="text-theme-textMuted hover:text-theme-orange transition-colors" onClick={onEdit} title="Editar Detalhes">
                            <span className="material-symbols-outlined">edit</span>
                        </button>
                        <button className="text-theme-textMuted hover:text-theme-text" onClick={onClose}>
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                </div>

                {showAgentPlan ? (
                    <div className="flex-1 overflow-hidden relative rounded-xl border border-theme-divider bg-theme-bg">
                        <Plan />
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto scroller">
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
                                    {currentDependencies.map((dep: any) => {
                                        const def = DEP_DEFINITIONS[dep.type as keyof typeof DEP_DEFINITIONS] || { label: dep.type, name: dep.type, desc: '' };
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
                )}
            </div>
        </ModalBase>
    );
};

export const LodModal: React.FC<{ isOpen: boolean; lods: string[]; activeLod: string; onClose: () => void; onSelect: (lod: string) => void; onAdd: (l: string) => void; onRemove: (l: string) => void; onReorder: (l: string[]) => void; }> = ({ isOpen, lods, activeLod, onClose, onSelect, onAdd, onRemove, onReorder }) => {
    // ... LodModal implementation (no changes needed) ...
    const [isEditing, setIsEditing] = useState(false);
    const [newLod, setNewLod] = useState('');
    const [draggedItem, setDraggedItem] = useState<number | null>(null);

    const handleDragStart = (e: React.DragEvent, index: number) => {
        setDraggedItem(index);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedItem === null || draggedItem === index) return;
        const newItems = [...lods];
        const item = newItems[draggedItem];
        newItems.splice(draggedItem, 1);
        newItems.splice(index, 0, item);
        setDraggedItem(index);
        onReorder(newItems);
    };

    return (
        <ModalBase isOpen={isOpen} onClose={onClose}>
            <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-square font-black text-theme-text uppercase tracking-widest">Fase do Projeto</h3>
                    <div className="flex gap-2">
                        <button onClick={() => setIsEditing(!isEditing)} className={`text-[9px] font-black uppercase px-3 py-1 rounded-lg border transition-all ${isEditing ? 'bg-theme-orange text-white border-theme-orange' : 'bg-theme-bg text-theme-textMuted border-theme-divider hover:text-theme-text'}`}>
                            {isEditing ? 'Concluir' : 'Editar Lista'}
                        </button>
                        <button onClick={onClose} className="text-theme-textMuted hover:text-theme-text flex items-center gap-1 text-[9px] font-black uppercase">
                            Sair <span className="material-symbols-outlined text-lg">close</span>
                        </button>
                    </div>
                </div>

                <div className="grid gap-3 max-h-60 overflow-y-auto scroller pr-1 mb-4">
                    {lods.map((l, index) => (
                        <div
                            key={l}
                            draggable={isEditing}
                            onDragStart={(e) => handleDragStart(e, index)}
                            onDragOver={(e) => handleDragOver(e, index)}
                            className={`flex gap-2 items-center w-full p-1 transition-all ${isEditing ? 'cursor-move opacity-90 hover:opacity-100' : ''}`}
                        >
                            {isEditing && <span className="material-symbols-outlined text-theme-textMuted">drag_indicator</span>}

                            <button
                                onClick={() => !isEditing && onSelect(l)}
                                className={`flex-1 p-3 rounded-xl border font-black text-xs uppercase tracking-widest text-left transition-all ${!isEditing && l.startsWith(activeLod) ? 'bg-theme-orange border-theme-orange text-white shadow-lg' : 'bg-theme-bg border-theme-divider text-theme-textMuted hover:border-theme-orange'}`}
                            >
                                {l}
                            </button>

                            {isEditing && (
                                <button onClick={() => onRemove(l)} className="p-3 bg-red-500/10 border border-red-500/30 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all">
                                    <span className="material-symbols-outlined text-sm">delete</span>
                                </button>
                            )}
                        </div>
                    ))}
                </div>

                {isEditing && (
                    <form onSubmit={(e) => { e.preventDefault(); if (newLod) { onAdd(newLod.toUpperCase()); setNewLod(''); } }} className="flex gap-2 border-t border-theme-divider pt-4">
                        <input value={newLod} onChange={e => setNewLod(e.target.value)} placeholder="NOVA FASE (EX: CD_ CONCEITUAL)..." className="flex-1 bg-theme-bg border border-theme-divider rounded-xl px-4 py-3 text-xs text-theme-text outline-none" />
                        <button type="submit" className="bg-theme-orange text-white px-4 rounded-xl flex items-center justify-center"><span className="material-symbols-outlined">add</span></button>
                    </form>
                )}

                <div className="mt-4 pt-4 border-t border-theme-divider flex justify-end">
                    <button onClick={onClose} className="bg-theme-bg border border-theme-divider text-theme-textMuted hover:text-theme-text hover:bg-theme-highlight px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">logout</span> Sair
                    </button>
                </div>
            </div>
        </ModalBase>
    );
};

export const CompanyModal: React.FC<{
    isOpen: boolean;
    companies: Company[];
    onClose: () => void;
    onSelect: (id: number) => void;
    onAdd: (name: string, logoUrl?: string) => void;
    onUpdate: (id: number, name: string, logoUrl?: string) => void;
    onRemove: (id: number) => void;
    onReorder: (c: Company[]) => void;
}> = ({ isOpen, companies, onClose, onSelect, onAdd, onUpdate, onRemove, onReorder }) => {
    // ... CompanyModal implementation ...
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState('');
    const [logo, setLogo] = useState<string | undefined>(undefined);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [draggedItem, setDraggedItem] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Reset when modal opens/closes
    useEffect(() => {
        if (!isOpen) {
            setEditingId(null);
            setName('');
            setLogo(undefined);
            setIsEditing(false);
        }
    }, [isOpen]);

    const handleDragStart = (e: React.DragEvent, index: number) => {
        setDraggedItem(index);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedItem === null || draggedItem === index) return;
        const newItems = [...companies];
        const item = newItems[draggedItem];
        newItems.splice(draggedItem, 1);
        newItems.splice(index, 0, item);
        setDraggedItem(index);
        onReorder(newItems);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setLogo(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleStartEdit = (c: Company) => {
        setEditingId(c.id);
        setName(c.name);
        setLogo(c.logoUrl);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name) {
            if (editingId) {
                onUpdate(editingId, name.toUpperCase(), logo);
                setEditingId(null);
            } else {
                onAdd(name.toUpperCase(), logo);
            }
            setName('');
            setLogo(undefined);
        }
    };

    return (
        <ModalBase isOpen={isOpen} onClose={onClose}>
            <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-square font-black text-theme-text uppercase tracking-widest">Clientes</h3>
                    <div className="flex gap-2">
                        <button onClick={() => setIsEditing(!isEditing)} className={`text-[9px] font-black uppercase px-3 py-1 rounded-lg border transition-all ${isEditing ? 'bg-theme-orange text-white border-theme-orange' : 'bg-theme-bg text-theme-textMuted border-theme-divider hover:text-theme-text'}`}>
                            {isEditing ? 'Concluir' : 'Editar Lista'}
                        </button>
                        <button onClick={onClose} className="text-theme-textMuted hover:text-theme-text flex items-center gap-1 text-[10px] font-black uppercase">
                            Sair <span className="material-symbols-outlined text-lg">close</span>
                        </button>
                    </div>
                </div>

                <div className="space-y-3 mb-6 max-h-60 overflow-y-auto scroller pr-2">
                    {companies.map((c, index) => (
                        <div
                            key={c.id}
                            draggable={isEditing}
                            onDragStart={(e) => handleDragStart(e, index)}
                            onDragOver={(e) => handleDragOver(e, index)}
                            className={`flex gap-2 items-center w-full transition-all ${isEditing ? 'cursor-move opacity-90 hover:opacity-100' : ''}`}
                        >
                            {isEditing && <span className="material-symbols-outlined text-theme-textMuted">drag_indicator</span>}

                            <button
                                onClick={() => !isEditing && onSelect(c.id)}
                                className={`flex-1 p-2 rounded-xl bg-theme-bg border text-theme-text font-bold text-xs uppercase hover:border-theme-orange transition-all text-left flex items-center gap-3 ${editingId === c.id ? 'border-theme-orange ring-1 ring-theme-orange' : 'border-theme-divider'}`}
                            >
                                {c.logoUrl ? <img src={c.logoUrl} className="w-8 h-8 object-contain rounded bg-white/10" /> : <span className="material-symbols-outlined text-xl text-theme-textMuted">business</span>}
                                {c.name}
                            </button>

                            {isEditing && (
                                <div className="flex gap-1">
                                    <button onClick={() => handleStartEdit(c)} className="p-3 bg-theme-highlight border border-theme-divider text-theme-textMuted rounded-xl hover:bg-theme-text hover:text-theme-bg transition-all">
                                        <span className="material-symbols-outlined text-sm">edit</span>
                                    </button>
                                    <button onClick={() => onRemove(c.id)} className="p-3 bg-red-500/10 border border-red-500/30 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all">
                                        <span className="material-symbols-outlined text-sm">delete</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <form onSubmit={handleSubmit} className="flex gap-2 border-t border-theme-divider pt-4 mb-4">
                    <button type="button" onClick={() => fileInputRef.current?.click()} className={`p-3 rounded-xl border border-theme-divider flex items-center justify-center ${logo ? 'bg-theme-green text-white border-theme-green' : 'bg-theme-bg text-theme-textMuted hover:text-theme-text'}`}>
                        <span className="material-symbols-outlined text-lg">image</span>
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                    <input value={name} onChange={e => setName(e.target.value)} placeholder={editingId ? "EDITAR NOME..." : "NOVO CLIENTE..."} className="flex-1 bg-theme-bg border border-theme-divider rounded-xl px-4 py-3 text-xs text-theme-text outline-none" />
                    <button type="submit" className={`p-3 rounded-xl flex items-center justify-center text-white ${editingId ? 'bg-theme-cyan hover:bg-cyan-600' : 'bg-theme-orange hover:bg-orange-600'}`}>
                        <span className="material-symbols-outlined">{editingId ? 'save' : 'add'}</span>
                    </button>
                    {editingId && (
                        <button type="button" onClick={() => { setEditingId(null); setName(''); setLogo(undefined); }} className="bg-theme-bg border border-theme-divider text-theme-textMuted px-4 rounded-xl font-bold text-xs uppercase hover:bg-theme-highlight">
                            Cancelar
                        </button>
                    )}
                </form>

                <div className="border-t border-theme-divider pt-4 flex justify-end">
                    <button onClick={onClose} className="bg-theme-bg border border-theme-divider text-theme-textMuted hover:text-theme-text hover:bg-theme-highlight px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">logout</span> Sair
                    </button>
                </div>
            </div>
        </ModalBase>
    );
};

// ... ProjectModal, ScopeModal ...
export const ProjectModal: React.FC<{ isOpen: boolean; companyName: string; projects: Project[]; onClose: () => void; onSelect: (id: number) => void; onAdd: (name: string, logo?: string, cover?: string) => void; onDelete: (id: number) => void; onEdit: (id: number, name: string, logo?: string, cover?: string) => void; }> = ({ isOpen, companyName, projects, onClose, onSelect, onAdd, onDelete, onEdit }) => {
    // ... ProjectModal implementation ...
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState('');
    const [logo, setLogo] = useState<string | undefined>(undefined);
    const [cover, setCover] = useState<string | undefined>(undefined);
    const [editingId, setEditingId] = useState<number | null>(null);

    const logoInputRef = useRef<HTMLInputElement>(null);
    const coverInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!isOpen) {
            setEditingId(null);
            setName('');
            setLogo(undefined);
            setCover(undefined);
            setIsEditing(false);
        }
    }, [isOpen]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (s: string) => void) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setter(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name) {
            if (editingId) {
                onEdit(editingId, name.toUpperCase(), logo, cover);
            } else {
                onAdd(name.toUpperCase(), logo, cover);
            }
            setName(''); setLogo(undefined); setCover(undefined); setEditingId(null);
        }
    };

    const handleStartEdit = (p: Project) => {
        setEditingId(p.id);
        setName(p.name);
        setLogo(p.logoUrl);
        setCover(p.coverUrl);
    };

    return (
        <ModalBase isOpen={isOpen} onClose={onClose}>
            <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-xl font-square font-black text-theme-text uppercase tracking-widest">Projetos</h3>
                        <p className="text-[10px] font-bold text-theme-textMuted uppercase">{companyName}</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setIsEditing(!isEditing)} className={`text-[9px] font-black uppercase px-3 py-1 rounded-lg border transition-all ${isEditing ? 'bg-theme-orange text-white border-theme-orange' : 'bg-theme-bg text-theme-textMuted border-theme-divider hover:text-theme-text'}`}>
                            {isEditing ? 'Concluir' : 'Editar Lista'}
                        </button>
                        <button onClick={onClose} className="text-theme-textMuted hover:text-theme-text flex items-center gap-1 text-[10px] font-black uppercase">
                            Sair <span className="material-symbols-outlined text-lg">close</span>
                        </button>
                    </div>
                </div>

                <div className="grid gap-3 max-h-60 overflow-y-auto scroller pr-2 mb-6">
                    {projects.map(p => (
                        <div key={p.id} className="flex gap-2 items-center group">
                            <button
                                onClick={() => !isEditing && onSelect(p.id)}
                                className={`flex-1 p-3 rounded-xl border text-left flex items-center gap-4 transition-all overflow-hidden relative ${isEditing ? 'opacity-90' : 'hover:border-theme-orange cursor-pointer'} bg-theme-bg border-theme-divider`}
                            >
                                {p.coverUrl && <div className="absolute inset-0 bg-cover bg-center opacity-20 group-hover:opacity-30 transition-opacity" style={{ backgroundImage: `url(${p.coverUrl})` }} />}
                                <div className="relative z-10 flex items-center gap-3 w-full">
                                    {p.logoUrl ? <img src={p.logoUrl} className="w-10 h-10 object-contain bg-white/10 rounded-lg backdrop-blur-md" /> : <div className="w-10 h-10 bg-theme-highlight rounded-lg flex items-center justify-center"><span className="material-symbols-outlined text-theme-textMuted">folder</span></div>}
                                    <div className="flex flex-col">
                                        <span className="text-xs font-black text-theme-text uppercase tracking-wider">{p.name}</span>
                                        <span className="text-[9px] font-medium text-theme-textMuted">{new Date(p.updatedAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </button>
                            {isEditing && (
                                <div className="flex gap-1">
                                    <button onClick={() => handleStartEdit(p)} className="p-3 bg-theme-highlight border border-theme-divider text-theme-textMuted rounded-xl hover:bg-theme-text hover:text-theme-bg transition-all">
                                        <span className="material-symbols-outlined text-sm">edit</span>
                                    </button>
                                    <button onClick={() => onDelete(p.id)} className="p-3 bg-red-500/10 border border-red-500/30 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all">
                                        <span className="material-symbols-outlined text-sm">delete</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                    {projects.length === 0 && <p className="text-center text-xs text-theme-textMuted py-4 uppercase">Nenhum projeto encontrado.</p>}
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-2 border-t border-theme-divider pt-4">
                    <div className="flex gap-2">
                        <input value={name} onChange={e => setName(e.target.value)} placeholder={editingId ? "EDITAR NOME DO PROJETO..." : "NOVO PROJETO..."} className="flex-1 bg-theme-bg border border-theme-divider rounded-xl px-4 py-3 text-xs text-theme-text outline-none focus:border-theme-orange transition-colors" />
                    </div>
                    <div className="flex gap-2">
                        <button type="button" onClick={() => logoInputRef.current?.click()} className={`flex-1 p-3 rounded-xl border border-dashed border-theme-divider flex items-center justify-center gap-2 text-[9px] font-bold uppercase transition-all ${logo ? 'bg-theme-green text-white border-theme-green' : 'bg-theme-bg text-theme-textMuted hover:text-theme-text'}`}>
                            <span className="material-symbols-outlined text-base">image</span> {logo ? 'Logo Definido' : 'Add Logo'}
                        </button>
                        <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, setLogo)} />

                        <button type="button" onClick={() => coverInputRef.current?.click()} className={`flex-1 p-3 rounded-xl border border-dashed border-theme-divider flex items-center justify-center gap-2 text-[9px] font-bold uppercase transition-all ${cover ? 'bg-theme-green text-white border-theme-green' : 'bg-theme-bg text-theme-textMuted hover:text-theme-text'}`}>
                            <span className="material-symbols-outlined text-base">wallpaper</span> {cover ? 'Capa Definida' : 'Add Capa'}
                        </button>
                        <input type="file" ref={coverInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, setCover)} />

                        <button type="submit" className={`px-6 rounded-xl font-bold text-xs uppercase text-white shadow-lg transition-all ${editingId ? 'bg-theme-cyan hover:bg-cyan-600' : 'bg-theme-orange hover:bg-orange-600'}`}>
                            {editingId ? 'Salvar' : 'Criar'}
                        </button>
                    </div>
                    {editingId && (
                        <button type="button" onClick={() => { setEditingId(null); setName(''); setLogo(undefined); setCover(undefined); }} className="bg-theme-bg border border-theme-divider text-theme-textMuted py-2 rounded-xl font-bold text-[10px] uppercase hover:bg-theme-highlight">
                            Cancelar Edição
                        </button>
                    )}
                </form>
            </div>
        </ModalBase>
    );
};

export const ScopeModal: React.FC<{
    isOpen: boolean;
    scope: Scope | null;
    disciplines: Discipline[];
    team: string[];
    onClose: () => void;
    onManage: () => void;
    onSave: (name: string, startDate: string, color: string, status: string, pWeek: number, resp: string) => void;
}> = ({ isOpen, scope, disciplines, team, onClose, onManage, onSave }) => {
    // ... ScopeModal implementation ...
    const [discCode, setDiscCode] = useState('');
    const [start, setStart] = useState('');
    const [status, setStatus] = useState('walking');
    const [protocolWeek, setProtocolWeek] = useState(1);
    const [resp, setResp] = useState('');

    useEffect(() => {
        if (scope) {
            setDiscCode(scope.name);
            setStart(scope.startDate);
            setStatus(scope.status);
            setProtocolWeek(scope.protocolWeek || 1);
            setResp(scope.resp);
        } else {
            setDiscCode(disciplines[0]?.code || '');
            setStart(new Date().toISOString().split('T')[0]);
            setStatus('walking');
            setProtocolWeek(1);
            setResp(team[0] || '');
        }
    }, [scope, isOpen, disciplines, team]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const selectedDisc = disciplines.find(d => d.code === discCode);
        if (discCode && start && selectedDisc && resp) {
            onSave(discCode, start, selectedDisc.color, status, protocolWeek, resp);
        }
    };

    return (
        <ModalBase isOpen={isOpen} onClose={onClose}>
            <form onSubmit={handleSubmit} className="p-8">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-square font-black text-theme-text uppercase tracking-widest">{scope ? 'Editar Disciplina' : 'Nova Disciplina'}</h3>
                    <button type="button" onClick={onClose} className="text-theme-textMuted hover:text-theme-text"><span className="material-symbols-outlined">close</span></button>
                </div>

                <div className="space-y-4">
                    <div className="flex flex-col gap-1">
                        <div className="flex justify-between">
                            <label className="text-[9px] font-black text-theme-textMuted uppercase tracking-widest">Disciplina / Área</label>
                            <button type="button" onClick={onManage} className="text-[8px] font-bold text-theme-cyan uppercase hover:underline">Gerenciar Lista</button>
                        </div>
                        <select value={discCode} onChange={e => setDiscCode(e.target.value)} className="bg-theme-bg border border-theme-divider rounded-xl px-4 py-3 text-xs text-theme-text outline-none focus:border-theme-orange">
                            {disciplines.map(d => <option key={d.code} value={d.code}>{d.name}</option>)}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-black text-theme-textMuted uppercase tracking-widest">Responsável</label>
                            <select value={resp} onChange={e => setResp(e.target.value)} className="bg-theme-bg border border-theme-divider rounded-xl px-4 py-3 text-xs text-theme-text outline-none focus:border-theme-orange">
                                {team.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-black text-theme-textMuted uppercase tracking-widest">Início</label>
                            <input type="date" value={start} onChange={e => setStart(e.target.value)} className="bg-theme-bg border border-theme-divider rounded-xl px-4 py-3 text-xs text-theme-text outline-none focus:border-theme-orange" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-black text-theme-textMuted uppercase tracking-widest">Status Inicial</label>
                            <select value={status} onChange={e => setStatus(e.target.value)} className="bg-theme-bg border border-theme-divider rounded-xl px-4 py-3 text-xs text-theme-text outline-none focus:border-theme-orange">
                                <option value="stopped">Parado</option>
                                <option value="walking">Em Andamento</option>
                                <option value="running">Acelerado</option>
                                <option value="done">Concluído</option>
                            </select>
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-black text-theme-textMuted uppercase tracking-widest">Semana Protocolo</label>
                            <input type="number" min="1" max="52" value={protocolWeek} onChange={e => setProtocolWeek(parseInt(e.target.value))} className="bg-theme-bg border border-theme-divider rounded-xl px-4 py-3 text-xs text-theme-text outline-none focus:border-theme-orange" />
                        </div>
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t border-theme-divider flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="bg-theme-bg border border-theme-divider text-theme-textMuted px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:text-theme-text hover:bg-theme-highlight transition-all">Cancelar</button>
                    <button type="submit" className="bg-theme-orange text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-orange-600 transition-all">Salvar</button>
                </div>
            </form>
        </ModalBase>
    );
};

export const EventModal: React.FC<{
    isOpen: boolean;
    team: string[];
    event: Event | null;
    scopes?: Scope[];
    initialScopeId?: string | null;
    initialDate?: string;
    onClose: () => void;
    onSave: (title: string, resp: string, start: string, end: string, checklist: string, selectedScopeId?: string, type?: 'default' | 'protocol') => void;
}> = ({ isOpen, team, event, scopes, initialScopeId, initialDate, onClose, onSave }) => {
    const [title, setTitle] = useState('');
    const [resp, setResp] = useState('');
    const [start, setStart] = useState('');
    const [end, setEnd] = useState('');
    const [checklist, setChecklist] = useState('');
    const [delay, setDelay] = useState(0);
    const [selectedScopeId, setSelectedScopeId] = useState<string>('');
    const [type, setType] = useState<'default' | 'protocol'>('default'); // New State
    const plannedEndRef = useRef('');

    useEffect(() => {
        if (event) {
            setTitle(event.title);
            setResp(event.resp);
            setStart(event.startDate);
            setEnd(event.endDate);
            setType(event.type || 'default'); // Load type

            const pEnd = event.plannedEndDate || event.endDate;
            plannedEndRef.current = pEnd;

            setChecklist(event.checklist?.map(i => i.text).join('\n') || '');

            const diffTime = new Date(event.endDate).getTime() - new Date(pEnd).getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            setDelay(diffDays > 0 ? diffDays : 0);
            setSelectedScopeId('');
        } else {
            setTitle('');
            setResp(team[0] || '');
            const defaultDate = initialDate || new Date().toISOString().split('T')[0];
            setStart(defaultDate);
            setEnd(defaultDate);
            setType('default'); // Default type
            plannedEndRef.current = defaultDate;
            setChecklist('');
            setDelay(0);
            setSelectedScopeId(initialScopeId || (scopes && scopes.length > 0 ? scopes[0].id : ''));
        }
    }, [event, isOpen, team, initialDate, initialScopeId, scopes]);

    const handleDelayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const d = parseInt(e.target.value) || 0;
        setDelay(d);
        if (plannedEndRef.current) {
            const date = new Date(plannedEndRef.current);
            const newDate = new Date(date.getTime() + (d * 24 * 60 * 60 * 1000));
            setEnd(newDate.toISOString().split('T')[0]);
        }
    };

    const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newEnd = e.target.value;
        setEnd(newEnd);
        if (plannedEndRef.current && newEnd) {
            const diffTime = new Date(newEnd).getTime() - new Date(plannedEndRef.current).getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            setDelay(diffDays > 0 ? diffDays : 0);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (title && resp && start && end) {
            onSave(title, resp, start, end, checklist, selectedScopeId, type);
        }
    };

    return (
        <ModalBase isOpen={isOpen} onClose={onClose}>
            <form onSubmit={handleSubmit} className="p-8">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-square font-black text-theme-text uppercase tracking-widest">{event ? 'Editar Ação' : 'Nova Ação'}</h3>
                    <button type="button" onClick={onClose} className="text-theme-textMuted hover:text-theme-text"><span className="material-symbols-outlined">close</span></button>
                </div>

                <div className="space-y-4">
                    <div className="flex gap-4">
                        {/* Type Selector */}
                        <div className="flex flex-col gap-1 w-1/3">
                            <label className="text-[9px] font-black text-theme-textMuted uppercase tracking-widest">Tipo</label>
                            <div className="flex bg-theme-bg border border-theme-divider rounded-xl p-1">
                                <button type="button" onClick={() => setType('default')} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${type === 'default' ? 'bg-theme-highlight text-theme-text shadow-sm' : 'text-theme-textMuted hover:text-theme-text'}`}>Ação</button>
                                <button type="button" onClick={() => setType('protocol')} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${type === 'protocol' ? 'bg-purple-500 text-white shadow-sm' : 'text-theme-textMuted hover:text-theme-text'}`}>Protocolo</button>
                            </div>
                        </div>

                        {/* Scope Selector for New Events */}
                        {!event && scopes && scopes.length > 0 && (
                            <div className="flex flex-col gap-1 flex-1">
                                <label className="text-[9px] font-black text-theme-textMuted uppercase tracking-widest">Disciplina</label>
                                <select value={selectedScopeId} onChange={e => setSelectedScopeId(e.target.value)} className="bg-theme-bg border border-theme-divider rounded-xl px-4 py-3 text-xs text-theme-text outline-none focus:border-theme-orange w-full">
                                    {scopes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-black text-theme-textMuted uppercase tracking-widest">Nome da Entrega</label>
                        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="EX: ANTEPROJETO, COMPATIBILIZAÇÃO..." className="bg-theme-bg border border-theme-divider rounded-xl px-4 py-3 text-xs text-theme-text outline-none focus:border-theme-orange" autoFocus />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-black text-theme-textMuted uppercase tracking-widest">Responsável</label>
                            <select value={resp} onChange={e => setResp(e.target.value)} className="bg-theme-bg border border-theme-divider rounded-xl px-4 py-3 text-xs text-theme-text outline-none focus:border-theme-orange">
                                {team.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-black text-theme-textMuted uppercase tracking-widest">Atraso (+ Dias)</label>
                            <input type="number" min="0" value={delay} onChange={handleDelayChange} className="bg-theme-bg border border-theme-divider rounded-xl px-4 py-3 text-xs text-theme-text outline-none focus:border-theme-orange" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-black text-theme-textMuted uppercase tracking-widest">Data Início</label>
                            <input type="date" value={start} onChange={e => setStart(e.target.value)} className="bg-theme-bg border border-theme-divider rounded-xl px-4 py-3 text-xs text-theme-text outline-none focus:border-theme-orange" />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-black text-theme-textMuted uppercase tracking-widest">Data Entrega</label>
                            <input type="date" value={end} onChange={handleEndDateChange} className="bg-theme-bg border border-theme-divider rounded-xl px-4 py-3 text-xs text-theme-text outline-none focus:border-theme-orange" />
                        </div>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-black text-theme-textMuted uppercase tracking-widest">Checklist / Subtarefas</label>
                        <textarea rows={5} value={checklist} onChange={e => setChecklist(e.target.value)} placeholder="Uma tarefa por linha..." className="bg-theme-bg border border-theme-divider rounded-xl px-4 py-3 text-xs text-theme-text outline-none focus:border-theme-orange resize-none min-h-[100px]" />
                    </div>

                    <button type="submit" className="w-full bg-theme-orange text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-orange-600 transition-all shadow-lg mt-2">
                        {event ? 'Salvar Alterações' : 'Criar Ação'}
                    </button>
                </div>
            </form>
        </ModalBase>
    );
};

// ... TeamModal, TimelineSettingsModal, DisciplinesManagerModal ...
export const TeamModal: React.FC<{ isOpen: boolean; team: string[]; onClose: () => void; onAdd: (name: string) => void; onRemove: (idx: number) => void; }> = ({ isOpen, team, onClose, onAdd, onRemove }) => {
    // ... TeamModal implementation (no changes needed) ...
    const [newName, setNewName] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newName) {
            onAdd(newName);
            setNewName('');
        }
    };

    return (
        <ModalBase isOpen={isOpen} onClose={onClose}>
            <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-square font-black text-theme-text uppercase tracking-widest">Gestão de Equipe</h3>
                    <button onClick={onClose} className="text-theme-textMuted hover:text-theme-text"><span className="material-symbols-outlined">close</span></button>
                </div>

                <div className="mb-6 max-h-60 overflow-y-auto scroller pr-2">
                    {team.map((t, idx) => (
                        <div key={idx} className="flex justify-between items-center p-3 mb-2 bg-theme-bg border border-theme-divider rounded-xl">
                            <span className="text-xs font-bold text-theme-text uppercase">{t}</span>
                            <button onClick={() => onRemove(idx)} className="text-red-500 hover:text-red-400 bg-red-500/10 p-2 rounded-lg transition-colors"><span className="material-symbols-outlined text-sm">delete</span></button>
                        </div>
                    ))}
                </div>

                <form onSubmit={handleSubmit} className="flex gap-2 border-t border-theme-divider pt-4">
                    <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="NOVO MEMBRO (EX: ENG. LUCAS)..." className="flex-1 bg-theme-bg border border-theme-divider rounded-xl px-4 py-3 text-xs text-theme-text outline-none focus:border-theme-orange" />
                    <button type="submit" className="bg-theme-orange text-white px-4 rounded-xl flex items-center justify-center"><span className="material-symbols-outlined">add</span></button>
                </form>
            </div>
        </ModalBase>
    );
};

export const TimelineSettingsModal: React.FC<{ isOpen: boolean; project: Project | null; onClose: () => void; onSave: (start: string, end: string) => void; }> = ({ isOpen, project, onClose, onSave }) => {
    // ... TimelineSettingsModal implementation (no changes needed) ...
    const [start, setStart] = useState('');
    const [end, setEnd] = useState('');

    useEffect(() => {
        if (project) {
            setStart(project.timelineStart);
            setEnd(project.timelineEnd);
        }
    }, [project, isOpen]);

    return (
        <ModalBase isOpen={isOpen} onClose={onClose}>
            <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-square font-black text-theme-text uppercase tracking-widest">Ajuste de Cronograma</h3>
                    <button onClick={onClose} className="text-theme-textMuted hover:text-theme-text"><span className="material-symbols-outlined">close</span></button>
                </div>

                <div className="space-y-4 mb-6">
                    <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-black text-theme-textMuted uppercase tracking-widest">Início do Projeto</label>
                        <input type="date" value={start} onChange={e => setStart(e.target.value)} className="bg-theme-bg border border-theme-divider rounded-xl px-4 py-3 text-xs text-theme-text outline-none focus:border-theme-orange" />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-black text-theme-textMuted uppercase tracking-widest">Previsão de Entrega</label>
                        <input type="date" value={end} onChange={e => setEnd(e.target.value)} className="bg-theme-bg border border-theme-divider rounded-xl px-4 py-3 text-xs text-theme-text outline-none focus:border-theme-orange" />
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-theme-divider">
                    <button onClick={onClose} className="bg-theme-bg border border-theme-divider text-theme-textMuted px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:text-theme-text hover:bg-theme-highlight transition-all">Cancelar</button>
                    <button onClick={() => onSave(start, end)} className="bg-theme-orange text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-orange-600 transition-all">Salvar</button>
                </div>
            </div>
        </ModalBase>
    );
};

export const DisciplinesManagerModal: React.FC<{
    isOpen: boolean;
    disciplines: Discipline[];
    onClose: () => void;
    onAdd: (d: Discipline) => void;
    onUpdate: (oldCode: string, d: Discipline) => void;
    onRemove: (code: string) => void;
    onReorder: (d: Discipline[]) => void;
}> = ({ isOpen, disciplines, onClose, onAdd, onUpdate, onRemove, onReorder }) => {
    // ... DisciplinesManagerModal implementation (no changes needed) ...
    const [isEditing, setIsEditing] = useState(false);
    const [draggedItem, setDraggedItem] = useState<number | null>(null);

    // Form State
    const [code, setCode] = useState('');
    const [name, setName] = useState('');
    const [color, setColor] = useState('#ffffff');
    const [editingCode, setEditingCode] = useState<string | null>(null);

    const resetForm = () => {
        setCode('');
        setName('');
        setColor('#ffffff');
        setEditingCode(null);
    };

    const handleEdit = (d: Discipline) => {
        setCode(d.code);
        setName(d.name);
        setColor(d.color);
        setEditingCode(d.code);
        setIsEditing(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (code && name) {
            if (editingCode) {
                onUpdate(editingCode, { code, name, color });
            } else {
                onAdd({ code, name, color });
            }
            resetForm();
        }
    };

    const handleDragStart = (e: React.DragEvent, index: number) => {
        setDraggedItem(index);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedItem === null || draggedItem === index) return;
        const newItems = [...disciplines];
        const item = newItems[draggedItem];
        newItems.splice(draggedItem, 1);
        newItems.splice(index, 0, item);
        setDraggedItem(index);
        onReorder(newItems);
    };

    return (
        <ModalBase isOpen={isOpen} onClose={onClose}>
            <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-square font-black text-theme-text uppercase tracking-widest">Gerenciar Disciplinas</h3>
                    <div className="flex gap-2">
                        <button onClick={() => { setIsEditing(!isEditing); resetForm(); }} className={`text-[9px] font-black uppercase px-3 py-1 rounded-lg border transition-all ${isEditing ? 'bg-theme-orange text-white border-theme-orange' : 'bg-theme-bg text-theme-textMuted border-theme-divider hover:text-theme-text'}`}>
                            {isEditing ? 'Cancelar Edição' : 'Editar / Nova'}
                        </button>
                        <button onClick={onClose} className="text-theme-textMuted hover:text-theme-text"><span className="material-symbols-outlined">close</span></button>
                    </div>
                </div>

                <div className="grid gap-2 max-h-60 overflow-y-auto scroller pr-1 mb-6">
                    {disciplines.map((d, index) => (
                        <div
                            key={d.code}
                            draggable={isEditing}
                            onDragStart={(e) => handleDragStart(e, index)}
                            onDragOver={(e) => handleDragOver(e, index)}
                            className={`flex items-center gap-3 p-2 rounded-xl border border-theme-divider bg-theme-bg ${isEditing ? 'cursor-move' : ''}`}
                        >
                            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: d.color }}></div>
                            <div className="flex-1">
                                <span className="text-[10px] font-black text-theme-textMuted uppercase mr-2">{d.code}</span>
                                <span className="text-xs font-bold text-theme-text uppercase">{d.name}</span>
                            </div>
                            {isEditing && (
                                <div className="flex gap-1">
                                    <button onClick={() => handleEdit(d)} className="text-theme-textMuted hover:text-theme-text p-1"><span className="material-symbols-outlined text-sm">edit</span></button>
                                    <button onClick={() => onRemove(d.code)} className="text-red-500 hover:text-red-400 p-1"><span className="material-symbols-outlined text-sm">delete</span></button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {isEditing && (
                    <form onSubmit={handleSubmit} className="border-t border-theme-divider pt-4 grid grid-cols-4 gap-2">
                        <div className="col-span-1">
                            <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="CÓD" className="w-full bg-theme-bg border border-theme-divider rounded-xl px-3 py-2 text-xs text-theme-text outline-none focus:border-theme-orange uppercase" maxLength={5} />
                        </div>
                        <div className="col-span-2">
                            <input value={name} onChange={e => setName(e.target.value)} placeholder="NOME DA DISCIPLINA" className="w-full bg-theme-bg border border-theme-divider rounded-xl px-3 py-2 text-xs text-theme-text outline-none focus:border-theme-orange" />
                        </div>
                        <div className="col-span-1 flex gap-1">
                            <input type="color" value={color} onChange={e => setColor(e.target.value)} className="h-full w-8 bg-transparent border-none cursor-pointer" />
                            <button type="submit" className="flex-1 bg-theme-orange text-white rounded-xl flex items-center justify-center"><span className="material-symbols-outlined text-sm">check</span></button>
                        </div>
                    </form>
                )}
            </div>
        </ModalBase>
    );
};

export const LoginModal: React.FC<{ isOpen: boolean; onClose: () => void; onLogin: (name: string) => void; }> = ({ isOpen, onClose, onLogin }) => {
    const [name, setName] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim()) {
            onLogin(name);
            setName('');
        }
    };

    return (
        <ModalBase isOpen={isOpen} onClose={onClose}>
            <div className="p-12 flex flex-col items-center text-center">
                <div className="w-24 h-24 bg-gradient-to-tr from-theme-orange to-theme-purple rounded-full flex items-center justify-center mb-8 shadow-glow animate-pulse">
                    <span className="material-symbols-outlined text-5xl text-white">person</span>
                </div>

                <h3 className="text-3xl font-square font-black text-theme-text uppercase tracking-widest mb-3">Bem-vindo</h3>
                <p className="text-sm font-bold text-theme-textMuted uppercase mb-10">Acesse seu painel de projetos</p>

                <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-6">
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="DIGITE SEU NOME..."
                        className="w-full bg-theme-bg border-2 border-theme-divider rounded-2xl px-6 py-5 text-base font-bold text-theme-text text-center outline-none focus:border-theme-orange transition-all placeholder:text-theme-textMuted/50"
                        autoFocus
                    />
                    <button
                        type="submit"
                        disabled={!name.trim()}
                        className="w-full bg-theme-text text-theme-bg py-5 rounded-2xl font-black text-sm uppercase tracking-[0.2em] hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl"
                    >
                        Entrar na Plataforma
                    </button>
                </form>

                <button onClick={onClose} className="mt-8 text-xs font-bold text-theme-textMuted hover:text-theme-text uppercase transition-colors tracking-widest">
                    Cancelar Acesso
                </button>
            </div>
        </ModalBase>
    );
};