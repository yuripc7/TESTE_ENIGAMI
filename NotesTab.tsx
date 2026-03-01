import React, { useState, useRef } from 'react';
import { Project, Note, DB } from '../types';
import { useApp } from '../contexts/AppContext';
import { formatLocalDate } from '../utils/dateUtils';

interface NotesTabProps {
    project: Project;
    db: DB;
    onUpdateProject: (updated: Project) => void;
    currentUser: { name: string, avatar: string } | null;
}

const PASTEL_COLORS = [
    '#FFDEE9', // Soft Pink
    '#B5EAEA', // Mint Green
    '#FDF2F0', // Light Peach
    '#E3E1FA', // Lavender
    '#DFFFF0', // Light Aqua
    '#FFEBB6', // Lemon Yellow
];

export const NotesTab: React.FC<NotesTabProps> = ({ project, db, onUpdateProject, currentUser }) => {
    const { addLog, setNotification } = useApp();
    const [showModal, setShowModal] = useState(false);

    // Form State
    const [recipient, setRecipient] = useState('');
    const [text, setText] = useState('');
    const [deadline, setDeadline] = useState('');
    const [selectedColor, setSelectedColor] = useState(PASTEL_COLORS[0]);
    const [pendingImage, setPendingImage] = useState<string | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    const notes = project.notes || [];

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setPendingImage(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleCreateNote = (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) {
            alert('Faça login para criar notas.');
            return;
        }
        if (!text.trim() || !recipient) {
            alert('Preencha os campos obrigatórios (Destinatário e Mensagem).');
            return;
        }

        const newNote: Note = {
            id: `note-${Date.now()}`,
            author: currentUser.name,
            recipient,
            text,
            color: selectedColor,
            createdAt: new Date().toISOString(),
            deadline: deadline || undefined,
            imageUrl: pendingImage || undefined,
            status: 'pending'
        };

        const updatedProject = {
            ...project,
            notes: [newNote, ...notes],
            updatedAt: new Date().toISOString()
        };

        onUpdateProject(updatedProject);
        addLog(currentUser.name, `CRIOU NOTA PARA ${recipient}`);
        setNotification('Nota adicionada com sucesso!');

        // Reset
        setRecipient('');
        setText('');
        setDeadline('');
        setSelectedColor(PASTEL_COLORS[0]);
        setPendingImage(null);
        setShowModal(false);
    };

    const handleToggleStatus = (noteId: string) => {
        const updatedNotes = notes.map(n =>
            n.id === noteId ? { ...n, status: n.status === 'pending' ? 'completed' : 'pending' } as Note : n
        );
        onUpdateProject({ ...project, notes: updatedNotes, updatedAt: new Date().toISOString() });
    };

    const handleDeleteNote = (noteId: string) => {
        if (!confirm('Deseja excluir esta nota?')) return;
        const updatedNotes = notes.filter(n => n.id !== noteId);
        onUpdateProject({ ...project, notes: updatedNotes, updatedAt: new Date().toISOString() });
    };

    return (
        <div className="w-full flex flex-col gap-6 animate-fadeIn py-4">
            <div className="flex justify-between items-center mb-2 pb-3 border-b border-theme-divider">
                <div className="flex items-center gap-2">
                    <div className="w-0.5 h-5 rounded-full bg-theme-orange"></div>
                    <span className="material-symbols-outlined text-base text-theme-orange">note_stack</span>
                    <h2 className="font-square font-black text-xs uppercase tracking-widest text-theme-text">Mural de Notas</h2>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-theme-divider bg-theme-bg text-theme-textMuted hover:text-theme-text hover:border-theme-orange hover:text-theme-orange text-[10px] font-black uppercase tracking-widest transition-all shadow-sm"
                >
                    <span className="material-symbols-outlined text-sm">edit_note</span>
                    Nova Nota
                </button>
            </div>

            {/* Masonry Grid */}
            <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
                {notes.map(note => (
                    <div
                        key={note.id}
                        className={`break-inside-avoid rounded-3xl p-6 shadow-md relative group transition-all duration-300 hover:shadow-xl ${note.status === 'completed' ? 'opacity-60 grayscale' : ''}`}
                        style={{ backgroundColor: note.color, color: '#1A1C20' }}
                    >
                        {/* Status / Delete controls */}
                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleToggleStatus(note.id)} className="w-8 h-8 rounded-full bg-black/10 flex items-center justify-center hover:bg-black/20" title={note.status === 'pending' ? 'Marcar como Concluída' : 'Reabrir Nota'}>
                                <span className="material-symbols-outlined text-[16px]">{note.status === 'pending' ? 'check' : 'undo'}</span>
                            </button>
                            <button onClick={() => handleDeleteNote(note.id)} className="w-8 h-8 rounded-full bg-red-500/20 text-red-600 flex items-center justify-center hover:bg-red-500 hover:text-white" title="Excluir Nota">
                                <span className="material-symbols-outlined text-[16px]">delete</span>
                            </button>
                        </div>

                        {/* Note Header (Avatars) */}
                        <div className="flex items-center gap-3 mb-4">
                            <div className="relative">
                                <img src={`https://ui-avatars.com/api/?name=${note.author}&background=000&color=fff`} className="w-8 h-8 rounded-full border-2 border-white/50 shadow-sm" title={`De: ${note.author}`} />
                                <img src={`https://ui-avatars.com/api/?name=${note.recipient}&background=FFF&color=000`} className="w-8 h-8 rounded-full border-2 border-white/50 shadow-sm absolute -bottom-2 -right-2" title={`Para: ${note.recipient}`} />
                            </div>
                            <div className="flex flex-col ml-3">
                                <span className="text-[10px] font-black uppercase tracking-widest">{note.recipient}</span>
                                <span className="text-[8px] font-bold text-black/50 uppercase tracking-widest">De: {note.author}</span>
                            </div>
                        </div>

                        {/* Note Content */}
                        <p className="text-sm font-medium mb-4 whitespace-pre-wrap leading-relaxed">
                            {note.text}
                        </p>

                        {/* Image Attachment */}
                        {note.imageUrl && (
                            <div className="mb-4 rounded-xl overflow-hidden shadow-inner border border-black/5">
                                <img src={note.imageUrl} alt="Anexo" className="w-full h-auto max-h-48 object-cover" />
                            </div>
                        )}

                        {/* Footer / Deadline */}
                        <div className="flex items-center justify-between mt-auto pt-4 border-t border-black/10">
                            <span className="text-[9px] font-bold text-black/40 font-mono">
                                {formatLocalDate(note.createdAt)}
                            </span>
                            {note.deadline && (
                                <div className="flex items-center gap-1 text-[9px] font-black uppercase px-2 py-1 rounded-md bg-white/40 text-red-600">
                                    <span className="material-symbols-outlined text-[12px]">calendar_today</span>
                                    Prazo: {formatLocalDate(note.deadline)}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {notes.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 opacity-50">
                    <span className="material-symbols-outlined text-6xl mb-4">note_stack_add</span>
                    <p className="font-square font-black uppercase tracking-widest text-sm">Nenhuma nota criada.</p>
                </div>
            )}

            {/* Note Creation Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-theme-card border border-theme-divider w-full max-w-lg rounded-3xl shadow-2xl p-8 relative">
                        <button onClick={() => setShowModal(false)} className="absolute top-6 right-6 text-theme-textMuted hover:text-theme-orange transition-colors">
                            <span className="material-symbols-outlined">close</span>
                        </button>

                        <h3 className="font-square font-black text-xl uppercase tracking-widest mb-6 text-theme-text">Nova Nota</h3>

                        <form onSubmit={handleCreateNote} className="flex flex-col gap-5">
                            <div>
                                <label className="block text-[10px] font-bold text-theme-textMuted uppercase mb-2">Destinatário</label>
                                <select
                                    value={recipient}
                                    onChange={e => setRecipient(e.target.value)}
                                    className="w-full bg-theme-bg border border-theme-divider rounded-xl px-4 py-3 text-xs text-theme-text outline-none focus:border-theme-orange"
                                    required
                                >
                                    <option value="">Selecione um colaborador</option>
                                    {db.team.map(t => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-theme-textMuted uppercase mb-2">Mensagem do Post-it</label>
                                <textarea
                                    value={text}
                                    onChange={e => setText(e.target.value)}
                                    className="w-full bg-theme-bg border border-theme-divider rounded-xl px-4 py-3 text-xs text-theme-text outline-none focus:border-theme-orange min-h-[120px] resize-none"
                                    placeholder="Escreva sua observação ou pedido..."
                                    required
                                />
                            </div>

                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-[10px] font-bold text-theme-textMuted uppercase mb-2">Prazo (Opcional)</label>
                                    <input
                                        type="date"
                                        value={deadline}
                                        onChange={e => setDeadline(e.target.value)}
                                        className="w-full bg-theme-bg border border-theme-divider rounded-xl px-4 py-3 text-xs text-theme-text outline-none focus:border-theme-orange"
                                    />
                                    <p className="text-[8px] text-theme-textMuted mt-1">Se definido, aparecerá na Agenda.</p>
                                </div>
                                <div className="flex-1">
                                    <label className="block text-[10px] font-bold text-theme-textMuted uppercase mb-2">Cor da Nota</label>
                                    <div className="flex gap-2 flex-wrap">
                                        {PASTEL_COLORS.map(color => (
                                            <button
                                                key={color}
                                                type="button"
                                                onClick={() => setSelectedColor(color)}
                                                className={`w-8 h-8 rounded-full border-2 transition-transform ${selectedColor === color ? 'border-theme-text scale-110 shadow-lg' : 'border-transparent'}`}
                                                style={{ backgroundColor: color }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-theme-textMuted uppercase mb-2">Anexar Imagem (Opcional)</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    ref={fileRef}
                                    onChange={handleImageUpload}
                                    className="hidden"
                                />
                                {pendingImage ? (
                                    <div className="relative inline-block mt-2">
                                        <img src={pendingImage} alt="Anexo" className="h-20 w-auto rounded-lg border border-theme-divider" />
                                        <button type="button" onClick={() => setPendingImage(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center shadow-lg"><span className="material-symbols-outlined text-[10px]">close</span></button>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => fileRef.current?.click()}
                                        className="w-full border-2 border-dashed border-theme-divider bg-theme-bg/50 rounded-xl py-3 text-[10px] font-bold text-theme-textMuted uppercase hover:border-theme-orange hover:text-theme-orange transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-sm align-middle mr-2">upload_file</span>
                                        Clique para anexar
                                    </button>
                                )}
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-theme-orange text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-orange-600 transition-all shadow-lg mt-4"
                            >
                                Adicionar Nota
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
