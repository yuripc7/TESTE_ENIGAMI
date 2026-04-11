import React, { useState, useRef } from 'react';
import { Viability, ViabilityVersion, FileLink } from '../types';
import { useApp } from '../contexts/AppContext';
import { formatLocalDate } from '../utils/dateUtils';
import { validateFileSize } from '../utils/validation';
import { readFileAsDataURL } from '../utils/fileReaderUtils';

interface ViabilidadesPanelProps {
    isOpen: boolean;
    onClose: () => void;
    viabilities: Viability[];
    companyId: number;
    companyName: string;
    onAdd: (v: Omit<Viability, 'id' | 'createdAt' | 'versions'>) => void;
    onDelete: (id: string) => void;
    onAddVersion: (viabilityId: string, version: Omit<ViabilityVersion, 'id' | 'version'>) => void;
    onUpdateStatus: (id: string, status: Viability['status']) => void;
}

const STATUS_CONFIG = {
    'VIÁVEL': { color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/20', icon: 'check_circle' },
    'STAND BY': { color: 'text-yellow-500', bg: 'bg-yellow-500/10 border-yellow-500/20', icon: 'pause_circle' },
    'EM ANÁLISE': { color: 'text-blue-500', bg: 'bg-blue-500/10 border-blue-500/20', icon: 'pending' },
    'NÃO INICIADO': { color: 'text-gray-400', bg: 'bg-gray-500/10 border-gray-500/20', icon: 'schedule' },
};

const STATUS_OPTIONS: Viability['status'][] = ['NÃO INICIADO', 'EM ANÁLISE', 'STAND BY', 'VIÁVEL'];

export const ViabilidadesPanel: React.FC<ViabilidadesPanelProps> = ({
    isOpen, onClose, viabilities, companyId, companyName,
    onAdd, onDelete, onAddVersion, onUpdateStatus
}) => {
    const { setNotification } = useApp();
    const [showForm, setShowForm] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [showVersionForm, setShowVersionForm] = useState<string | null>(null);

    // Form state
    const [address, setAddress] = useState('');
    const [date, setDate] = useState('');
    const [status, setStatus] = useState<Viability['status']>('NÃO INICIADO');
    const [pendingPdf, setPendingPdf] = useState<FileLink | null>(null);
    const pdfRef = useRef<HTMLInputElement>(null);

    // Version form state
    const [versionNotes, setVersionNotes] = useState('');
    const [versionDate, setVersionDate] = useState('');
    const [versionPdf, setVersionPdf] = useState<FileLink | null>(null);
    const versionPdfRef = useRef<HTMLInputElement>(null);

    const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>, setter: (f: FileLink | null) => void) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!validateFileSize(file)) {
            setNotification('Arquivo muito grande (max 5MB).');
            return;
        }
        try {
            const dataUrl = await readFileAsDataURL(file);
            setter({ label: file.name, path: dataUrl, createdAt: new Date().toISOString() });
        } catch (err) {
            console.error('Erro ao ler PDF:', err);
        }
        e.target.value = '';
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!address.trim() || !date) {
            setNotification('Preencha endereço e data.');
            return;
        }
        onAdd({
            companyId,
            address: address.trim(),
            date,
            status,
            pdfSummary: pendingPdf || undefined,
        });
        resetForm();
    };

    const handleSubmitVersion = (viabilityId: string) => {
        if (!versionDate) {
            setNotification('Preencha a data da versão.');
            return;
        }
        onAddVersion(viabilityId, {
            date: versionDate,
            notes: versionNotes.trim() || undefined,
            pdfAttachment: versionPdf || undefined,
        });
        setVersionNotes('');
        setVersionDate('');
        setVersionPdf(null);
        setShowVersionForm(null);
    };

    const resetForm = () => {
        setAddress('');
        setDate('');
        setStatus('NÃO INICIADO');
        setPendingPdf(null);
        setShowForm(false);
    };

    const downloadFile = (file: FileLink) => {
        const link = document.createElement('a');
        link.href = file.path;
        link.download = file.label;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fadeIn p-4 no-print">
            <div className="bg-theme-card w-full max-w-[700px] max-h-[85vh] rounded-[30px] border border-theme-divider shadow-neuro animate-scaleIn relative overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-6 pb-4 border-b border-theme-divider">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="text-xl font-square font-black text-theme-text uppercase tracking-widest flex items-center gap-2">
                                <span className="material-symbols-outlined text-emerald-500">analytics</span>
                                Viabilidades
                            </h3>
                            <p className="text-xs text-theme-textMuted mt-1">{companyName} &middot; {viabilities.length} registro(s)</p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setShowForm(!showForm)} className="px-3 py-1.5 bg-emerald-500 text-white rounded-full text-[9px] font-bold uppercase hover:bg-emerald-600 transition-colors">
                                {showForm ? 'Cancelar' : '+ Nova'}
                            </button>
                            <button onClick={onClose} className="text-theme-textMuted hover:text-theme-text">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                    </div>

                    {/* New viability form */}
                    {showForm && (
                        <form onSubmit={handleSubmit} className="mt-4 space-y-3 p-4 bg-theme-bg rounded-xl border border-theme-divider">
                            <input type="text" placeholder="Endereço / Localização" value={address} onChange={e => setAddress(e.target.value)}
                                className="w-full px-3 py-2 bg-theme-card border border-theme-divider rounded-lg text-theme-text text-sm" autoFocus />
                            <div className="grid grid-cols-2 gap-3">
                                <input type="date" value={date} onChange={e => setDate(e.target.value)}
                                    className="w-full px-3 py-2 bg-theme-card border border-theme-divider rounded-lg text-theme-text text-sm" />
                                <select value={status} onChange={e => setStatus(e.target.value as Viability['status'])}
                                    className="w-full px-3 py-2 bg-theme-card border border-theme-divider rounded-lg text-theme-text text-sm">
                                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div className="flex items-center gap-3">
                                <input ref={pdfRef} type="file" accept=".pdf" onChange={e => handlePdfUpload(e, setPendingPdf)} className="hidden" />
                                <button type="button" onClick={() => pdfRef.current?.click()}
                                    className="flex items-center gap-1 px-3 py-2 bg-theme-card border border-theme-divider rounded-lg text-theme-textMuted text-xs hover:text-theme-text transition-colors">
                                    <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
                                    {pendingPdf ? pendingPdf.label : 'Anexar PDF'}
                                </button>
                                {pendingPdf && <button type="button" onClick={() => setPendingPdf(null)} className="text-red-500 text-xs">Remover</button>}
                            </div>
                            <button type="submit" className="w-full py-2 bg-emerald-500 text-white rounded-lg text-sm font-bold hover:bg-emerald-600 transition-colors">
                                CADASTRAR VIABILIDADE
                            </button>
                        </form>
                    )}
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto scroller p-6 space-y-3">
                    {viabilities.length === 0 && !showForm && (
                        <div className="flex flex-col items-center justify-center py-12 text-theme-textMuted">
                            <span className="material-symbols-outlined text-5xl mb-3 opacity-30">analytics</span>
                            <p className="text-sm">Nenhuma viabilidade cadastrada.</p>
                            <p className="text-xs mt-1">Clique em "+ Nova" para começar.</p>
                        </div>
                    )}

                    {viabilities.map(v => {
                        const config = STATUS_CONFIG[v.status];
                        const isExpanded = expandedId === v.id;

                        return (
                            <div key={v.id} className={`rounded-xl border transition-all ${isExpanded ? 'border-theme-orange shadow-lg' : 'border-theme-divider hover:border-theme-orange/50'}`}>
                                {/* Main row */}
                                <div className="p-4 flex items-center gap-3 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : v.id)}>
                                    <span className={`material-symbols-outlined ${config.color}`}>{config.icon}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-theme-text truncate">{v.address}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[10px] text-theme-textMuted font-mono">{formatLocalDate(v.date)}</span>
                                            <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${config.bg} ${config.color}`}>{v.status}</span>
                                            {v.versions.length > 0 && (
                                                <span className="text-[9px] text-theme-textMuted">v{v.versions.length}</span>
                                            )}
                                        </div>
                                    </div>
                                    {v.pdfSummary && (
                                        <button onClick={(e) => { e.stopPropagation(); downloadFile(v.pdfSummary!); }}
                                            className="text-red-500 hover:text-red-400 transition-colors" title="Baixar PDF">
                                            <span className="material-symbols-outlined">picture_as_pdf</span>
                                        </button>
                                    )}
                                    <span className={`material-symbols-outlined text-theme-textMuted transition-transform ${isExpanded ? 'rotate-180' : ''}`}>expand_more</span>
                                </div>

                                {/* Expanded content */}
                                {isExpanded && (
                                    <div className="px-4 pb-4 border-t border-theme-divider pt-3 space-y-3 animate-fadeIn">
                                        {/* Status change */}
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-[9px] font-bold text-theme-textMuted uppercase">Status:</span>
                                            {STATUS_OPTIONS.map(s => (
                                                <button key={s} onClick={() => onUpdateStatus(v.id, s)}
                                                    className={`text-[9px] font-bold px-2 py-1 rounded-full border transition-all ${v.status === s ? `${STATUS_CONFIG[s].bg} ${STATUS_CONFIG[s].color}` : 'border-theme-divider text-theme-textMuted hover:text-theme-text'}`}>
                                                    {s}
                                                </button>
                                            ))}
                                        </div>

                                        {/* Versions timeline */}
                                        <div>
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-[10px] font-bold text-theme-textMuted uppercase tracking-widest">Versões ({v.versions.length})</span>
                                                <button onClick={() => setShowVersionForm(showVersionForm === v.id ? null : v.id)}
                                                    className="text-[9px] font-bold text-emerald-500 hover:text-emerald-400 uppercase">
                                                    {showVersionForm === v.id ? 'Cancelar' : '+ Versão'}
                                                </button>
                                            </div>

                                            {/* Version form */}
                                            {showVersionForm === v.id && (
                                                <div className="mb-3 p-3 bg-theme-bg rounded-lg border border-theme-divider space-y-2">
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <input type="date" value={versionDate} onChange={e => setVersionDate(e.target.value)}
                                                            className="px-2 py-1.5 bg-theme-card border border-theme-divider rounded-lg text-theme-text text-xs" />
                                                        <div className="flex items-center gap-1">
                                                            <input ref={versionPdfRef} type="file" accept=".pdf" onChange={e => handlePdfUpload(e, setVersionPdf)} className="hidden" />
                                                            <button type="button" onClick={() => versionPdfRef.current?.click()}
                                                                className="flex-1 flex items-center gap-1 px-2 py-1.5 bg-theme-card border border-theme-divider rounded-lg text-theme-textMuted text-xs hover:text-theme-text">
                                                                <span className="material-symbols-outlined text-xs">picture_as_pdf</span>
                                                                {versionPdf ? versionPdf.label.slice(0, 15) + '...' : 'PDF'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <input type="text" placeholder="Observações (opcional)" value={versionNotes} onChange={e => setVersionNotes(e.target.value)}
                                                        className="w-full px-2 py-1.5 bg-theme-card border border-theme-divider rounded-lg text-theme-text text-xs" />
                                                    <button onClick={() => handleSubmitVersion(v.id)}
                                                        className="w-full py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-bold hover:bg-emerald-600">
                                                        Salvar Versão
                                                    </button>
                                                </div>
                                            )}

                                            {/* Versions list */}
                                            {v.versions.length > 0 ? (
                                                <div className="space-y-1">
                                                    {v.versions.slice().reverse().map((ver, idx) => (
                                                        <div key={ver.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-theme-bg transition-colors">
                                                            <div className="flex flex-col items-center w-5 shrink-0">
                                                                <div className={`w-2.5 h-2.5 rounded-full ${idx === 0 ? 'bg-emerald-500' : 'bg-theme-divider'}`} />
                                                                {idx < v.versions.length - 1 && <div className="w-0.5 h-4 bg-theme-divider mt-0.5" />}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-xs font-bold text-theme-text">v{ver.version}</span>
                                                                    <span className="text-[10px] font-mono text-theme-textMuted">{formatLocalDate(ver.date)}</span>
                                                                </div>
                                                                {ver.notes && <p className="text-[10px] text-theme-textMuted mt-0.5 truncate">{ver.notes}</p>}
                                                            </div>
                                                            {ver.pdfAttachment && (
                                                                <button onClick={() => downloadFile(ver.pdfAttachment!)}
                                                                    className="text-red-500 hover:text-red-400 text-sm">
                                                                    <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
                                                                </button>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-[10px] text-theme-textMuted italic">Sem versões registradas.</p>
                                            )}
                                        </div>

                                        {/* Delete */}
                                        <div className="flex justify-end pt-2 border-t border-theme-divider">
                                            <button onClick={() => onDelete(v.id)} className="text-[9px] font-bold text-red-500 hover:text-red-400 uppercase flex items-center gap-1">
                                                <span className="material-symbols-outlined text-sm">delete</span> Excluir
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
