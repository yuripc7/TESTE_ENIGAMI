import React, { useState, useMemo, useRef, useEffect } from 'react';
import { INITIAL_DB } from './constants';
import { DB, ChatMessage, Project, Event, Company, ProjectDataRow, Scope } from './types';
import { generateChatResponse } from './services/geminiService';
import {
    LodModal, CompanyModal, ProjectModal, ScopeModal, EventModal,
    ChecklistModal, TeamModal, TimelineSettingsModal, AdminSettingsModal, DisciplinesManagerModal
} from './components/Modals';
import Timeline from './components/Timeline';
import { TextReveal } from './components/ui/TextReveal';

const STORAGE_KEY = 'design_board_db_v1';
const THEME_KEY = 'design_board_theme_v1';

type Tab = 'timeline' | 'gallery' | 'files' | 'data';

export const App = () => {
    const [db, setDb] = useState<DB>(() => {
        try {
            const savedDb = localStorage.getItem(STORAGE_KEY);
            return savedDb ? JSON.parse(savedDb) : INITIAL_DB;
        } catch (error) {
            console.error("Erro ao carregar dados locais, resetando para padrão:", error);
            return INITIAL_DB;
        }
    });

    const [theme, setTheme] = useState(() => {
        const savedTheme = localStorage.getItem(THEME_KEY);
        return savedTheme || 'light'; 
    });

    const [currentUser, setCurrentUser] = useState<{ name: string; avatar?: string } | null>(null);
    const [activeTab, setActiveTab] = useState<Tab>('timeline');

    // Filters & UI State
    const [deadlineRespFilter, setDeadlineRespFilter] = useState('');
    const [logSearch, setLogSearch] = useState('');
    const [logAuthorFilter, setLogAuthorFilter] = useState('');
    const [zoomLevel, setZoomLevel] = useState<number>(1);
    
    const [activityImage, setActivityImage] = useState<string | undefined>(undefined);
    const activityFileRef = useRef<HTMLInputElement>(null);
    const [activeHealthTab, setActiveHealthTab] = useState<'total' | 'progress' | 'done' | 'efficiency'>('efficiency');
    const [viewingImage, setViewingImage] = useState<string | null>(null);
    const [notification, setNotification] = useState<string | null>(null);
    const [memberFilter, setMemberFilter] = useState<string | null>(null);

    // Gallery State
    const [currentGalleryIndex, setCurrentGalleryIndex] = useState(0);
    const galleryFileRef = useRef<HTMLInputElement>(null);

    // Files Upload
    const scopeFileRef = useRef<HTMLInputElement>(null); 

    // Modals state
    const [showLodModal, setShowLodModal] = useState(false);
    const [showCompanyModal, setShowCompanyModal] = useState(false);
    const [showProjectModal, setShowProjectModal] = useState(false);
    const [showScopeModal, setShowScopeModal] = useState(false);
    const [showDisciplinesModal, setShowDisciplinesModal] = useState(false);
    const [showEventModal, setShowEventModal] = useState(false);
    const [showChecklistModal, setShowChecklistModal] = useState(false);
    const [showTeamModal, setShowTeamModal] = useState(false);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [showAdminModal, setShowAdminModal] = useState(false);

    // Chat
    const [showAIChat, setShowAIChat] = useState(false);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [aiLoading, setAiLoading] = useState(false);
    const [userInput, setUserInput] = useState('');
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Selection IDs
    const [editingScopeId, setEditingScopeId] = useState<string | null>(null);
    const [editingEventId, setEditingEventId] = useState<string | null>(null);
    const [selectedScopeIdForFiles, setSelectedScopeIdForFiles] = useState<string | null>(null);
    const [activeScopeIdForEvent, setActiveScopeIdForEvent] = useState<string | null>(null);
    const [activeChecklistIds, setActiveChecklistIds] = useState<{ sid: string; eid: string } | null>(null);

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
        } catch (error) {
            console.error("Erro ao salvar dados:", error);
            setNotification("Erro ao salvar alterações localmente!");
        }
    }, [db]);

    useEffect(() => {
        document.documentElement.className = theme;
        localStorage.setItem(THEME_KEY, theme);
    }, [theme]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    const activeProject = useMemo(() => {
        return db.projects.find(p => p.id === db.activeProjectId) || null;
    }, [db.projects, db.activeProjectId]);

    const activeCompany = useMemo(() => {
        return db.companies.find(c => c.id === db.activeCompanyId) || null;
    }, [db.companies, db.activeCompanyId]);

    const selectedScope = useMemo(() => {
        return activeProject?.scopes.find(s => s.id === (selectedScopeIdForFiles || editingScopeId)) || null;
    }, [activeProject, selectedScopeIdForFiles, editingScopeId]);

    const editingEvent = useMemo(() => {
        if (!activeProject || !activeScopeIdForEvent || !editingEventId) return null;
        const scope = activeProject.scopes.find(s => s.id === activeScopeIdForEvent);
        return scope?.events.find(e => e.id === editingEventId) || null;
    }, [activeProject, activeScopeIdForEvent, editingEventId]);

    const teamStats = useMemo(() => {
        const stats: Record<string, { count: number; leaderOf: string[] }> = {};
        db.team.forEach(t => { stats[t] = { count: 0, leaderOf: [] }; });
        if (activeProject) {
            activeProject.scopes.forEach(s => {
                if (stats[s.resp]) {
                    if (!stats[s.resp]) stats[s.resp] = { count: 0, leaderOf: [] };
                    stats[s.resp].leaderOf.push(s.name);
                }
                s.events.forEach(e => {
                    if (stats[e.resp]) stats[e.resp].count++;
                    else if (stats[e.resp] === undefined) stats[e.resp] = { count: 1, leaderOf: [] };
                });
            });
        }
        return stats;
    }, [activeProject, db.team]);

    const projectBounds = useMemo(() => {
        if (!activeProject || activeProject.scopes.length === 0) return activeProject ? { start: activeProject.timelineStart, end: activeProject.timelineEnd } : { start: '2026-01-01', end: '2026-12-31' };
        let minStart = new Date(3000, 0, 1).getTime(); let maxEnd = new Date(2000, 0, 1).getTime(); let hasData = false;
        activeProject.scopes.forEach(s => { const scopeStart = new Date(s.startDate).getTime(); if (scopeStart < minStart) minStart = scopeStart; hasData = true; s.events.forEach(e => { const eventEnd = new Date(e.endDate).getTime(); if (eventEnd > maxEnd) maxEnd = eventEnd; }); });
        if (maxEnd < minStart) maxEnd = new Date(minStart).getTime() + (30 * 24 * 60 * 60 * 1000);
        return { start: hasData ? new Date(minStart).toISOString().split('T')[0] : activeProject.timelineStart, end: hasData ? new Date(maxEnd).toISOString().split('T')[0] : activeProject.timelineEnd };
    }, [activeProject]);

    const globalProgress = useMemo(() => {
        if (!activeProject) return 0;
        const start = new Date(activeProject.timelineStart).getTime(); const end = new Date(activeProject.timelineEnd).getTime(); const now = new Date().getTime();
        if (now < start) return 0; if (now > end) return 100;
        const total = end - start; const elapsed = now - start;
        if (total <= 0) return 0;
        return Math.min(Math.max((elapsed / total) * 100, 0), 100);
    }, [activeProject]);

    const getNowString = () => {
        const d = new Date();
        return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    };

    const handleLogin = () => {
        const name = prompt("Digite seu nome de usuário:");
        if (name) { setCurrentUser({ name, avatar: `https://ui-avatars.com/api/?name=${name}&background=E86C3F&color=fff` }); setNotification(`Bem-vindo, ${name}!`); setTimeout(() => setNotification(null), 3000); }
    };

    const handleManualSave = () => { 
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(db)); 
            setNotification("Projeto Salvo com Sucesso!"); 
        } catch (e) {
            setNotification("Erro ao salvar!");
        }
        setTimeout(() => setNotification(null), 3000); 
    };
    
    const onUpdateCompany = (id: number, name: string, logoUrl?: string) => { setDb(prev => ({ ...prev, companies: prev.companies.map(c => c.id === id ? { ...c, name, logoUrl } : c) })); addLog("SISTEMA", `CLIENTE ATUALIZADO: ${name}`); };
    const addLog = (author: string, text: string, imageUrl?: string) => { if (!db.activeProjectId) return; setDb(prev => ({ ...prev, projects: prev.projects.map(p => p.id === db.activeProjectId ? { ...p, updatedAt: new Date().toISOString(), activities: [...p.activities, { date: getNowString(), author: author.toUpperCase(), text: text.toUpperCase(), imageUrl }] } : p) })); };
    const onDeleteScope = (sid: string) => { if (!activeProject) return; setDb(prev => ({ ...prev, projects: prev.projects.map(p => p.id === activeProject.id ? { ...p, updatedAt: new Date().toISOString(), scopes: p.scopes.filter(s => s.id !== sid) } : p) })); if (selectedScopeIdForFiles === sid) setSelectedScopeIdForFiles(null); addLog("SISTEMA", `DISCIPLINA REMOVIDA`); };
    const onAddFile = (label: string, path: string) => { if (!activeProject || !selectedScopeIdForFiles) return; setDb(prev => ({ ...prev, projects: prev.projects.map(p => p.id === activeProject.id ? { ...p, updatedAt: new Date().toISOString(), scopes: p.scopes.map(s => s.id === selectedScopeIdForFiles ? { ...s, fileLinks: [...(s.fileLinks || []), { label, path }] } : s) } : p) })); addLog("SISTEMA", `ARQUIVO VINCULADO: ${label}`); };
    const onDeleteEvent = (sid: string, eid: string) => { if (!activeProject) return; setDb(prev => ({ ...prev, projects: prev.projects.map(p => p.id === activeProject.id ? { ...p, updatedAt: new Date().toISOString(), scopes: p.scopes.map(s => s.id === sid ? { ...s, events: s.events.filter(e => e.id !== eid) } : s) } : p) })); addLog("SISTEMA", `AÇÃO REMOVIDA`); };
    const onToggleDependency = (sid: string, eid: string, targetId: string) => { setDb(prev => ({ ...prev, projects: prev.projects.map(p => p.id === activeProject?.id ? { ...p, scopes: p.scopes.map(s => s.id === sid ? { ...s, events: s.events.map(ev => ev.id === eid ? { ...ev, dependencies: ev.dependencies?.find(d => d.id === targetId) ? ev.dependencies.filter(d => d.id !== targetId) : [...(ev.dependencies||[]), { id: targetId, type: 'FS' as const }] } : ev) } : s) } : p) })); };
    const onChangeDependencyType = (sid: string, eid: string, targetId: string) => { const types = ['FS', 'SS', 'FF', 'SF'] as const; setDb(prev => ({ ...prev, projects: prev.projects.map(p => p.id === activeProject?.id ? { ...p, scopes: p.scopes.map(s => s.id === sid ? { ...s, events: s.events.map(e => e.id === eid ? { ...e, dependencies: (e.dependencies||[]).map(d => d.id === targetId ? { ...d, type: types[(types.indexOf(d.type)+1)%types.length] } : d) } : e) } : s) } : p) })); };
    const onAddDependency = (sourceId: string, targetId: string, type: 'FS' | 'SS' | 'FF' | 'SF') => { if (!activeProject) return; const sourceScope = activeProject.scopes.find(s => s.events.some(e => e.id === sourceId)); if (!sourceScope) return; const targetScope = activeProject.scopes.find(s => s.events.some(e => e.id === targetId)); if (!targetScope) return; const targetEvent = targetScope.events.find(e => e.id === targetId); if (targetEvent?.dependencies?.some(d => d.id === sourceId)) { setNotification("Vínculo já existe!"); setTimeout(() => setNotification(null), 2000); return; } setDb(prev => ({ ...prev, projects: prev.projects.map(p => p.id === activeProject.id ? { ...p, updatedAt: new Date().toISOString(), scopes: p.scopes.map(s => s.id === targetScope.id ? { ...s, events: s.events.map(e => e.id === targetId ? { ...e, dependencies: [...(e.dependencies || []), { id: sourceId, type }] } : e) } : s) } : p) })); addLog("SISTEMA", `VÍNCULO CRIADO: ${type}`); };
    const onDeleteProject = (id: number) => { setDb(prev => ({ ...prev, projects: prev.projects.filter(p => p.id !== id), activeProjectId: prev.activeProjectId === id ? null : prev.activeProjectId })); };
    const onEditProject = (id: number, name: string, logo?: string, cover?: string) => { setDb(prev => ({ ...prev, projects: prev.projects.map(p => p.id === id ? { ...p, name, logoUrl: logo, coverUrl: cover, updatedAt: new Date().toISOString() } : p) })); };
    
    // EXPORT JSON
    const handleExportJSON = () => {
        const jsonString = JSON.stringify(db, null, 2);
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `enigami-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        addLog("SISTEMA", "BACKUP DO SISTEMA EXPORTADO");
    };

    // IMPORT JSON
    const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const importedData = JSON.parse(event.target?.result as string);
                if (importedData && importedData.companies && importedData.projects) {
                    if (confirm("ATENÇÃO: Isso substituirá todos os dados atuais pelos dados do backup. Deseja continuar?")) {
                        setDb(importedData);
                        setNotification("Backup importado com sucesso!");
                        addLog("SISTEMA", "BACKUP DO SISTEMA IMPORTADO");
                    }
                } else {
                    alert("Arquivo de backup inválido.");
                }
            } catch (err) {
                console.error("Erro ao importar JSON", err);
                alert("Erro ao ler o arquivo de backup.");
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const printDashboard = () => { window.print(); addLog("SISTEMA", "DASHBOARD ENVIADO PARA IMPRESSÃO"); };

    const filteredActivities = useMemo(() => { if (!activeProject) return []; return activeProject.activities.filter(a => { const matchText = a.text.toLowerCase().includes(logSearch.toLowerCase()); const matchAuthor = logAuthorFilter === '' || a.author === logAuthorFilter.toUpperCase(); return matchText && matchAuthor; }); }, [activeProject, logSearch, logAuthorFilter]);
    const stats = useMemo(() => { if (!activeProject) return { tot: 0, don: 0, lat: 0, rate: 0, inProgress: 0, taskCount: 0 }; let totItems = 0; let donItems = 0; let latEvents = 0; let inProg = 0; let tasks = 0; const today = new Date(); activeProject.scopes.forEach(sc => { sc.events.forEach(ev => { tasks++; const items = ev.checklist && ev.checklist.length > 0 ? ev.checklist.length : 1; const done = ev.checklist && ev.checklist.length > 0 ? ev.checklist.filter(i => i.done).length : (ev.completed ? 1 : 0); totItems += items; donItems += done; if (!ev.completed && new Date(ev.startDate) <= today) { inProg++; } if (!ev.completed && new Date(ev.endDate) < today) latEvents++; }); }); return { tot: totItems, don: donItems, lat: latEvents, rate: totItems ? Math.round((donItems / totItems) * 100) : 0, inProgress: inProg, taskCount: tasks }; }, [activeProject]);
    const progressPercentage = useMemo(() => { if (!activeProject) return 0; const start = new Date(activeProject.createdAt); const end = new Date(projectBounds.end); const today = new Date(); if (today < start) return 0; if (today > end) return 100; const totalDuration = end.getTime() - start.getTime(); const elapsed = today.getTime() - start.getTime(); if (totalDuration <= 0) return 0; return Math.min(Math.max((elapsed / totalDuration) * 100, 0), 100); }, [activeProject, projectBounds]);
    const projectHealth = useMemo(() => { if (!activeProject) return { label: '---', color: 'text-theme-textMuted', border: 'border-theme-card', bg: 'bg-theme-card' }; const today = new Date(); const isAnyEventLate = activeProject.scopes.some(scope => scope.events.some(ev => { const endDate = new Date(ev.endDate); return !ev.completed && today > endDate; })); if (isAnyEventLate) { return { label: 'CRÍTICO', color: 'text-theme-red', border: 'border-theme-red', bg: 'bg-theme-red/10' }; } const diff = stats.rate - progressPercentage; if (diff < 0) return { label: 'ATENÇÃO', color: 'text-yellow-500', border: 'border-yellow-500', bg: 'bg-yellow-500/10' }; return { label: 'ESTÁVEL', color: 'text-theme-green', border: 'border-theme-green', bg: 'bg-theme-green/10' }; }, [activeProject, stats.rate, progressPercentage]);

    const handleAISend = async () => { if (!userInput.trim() || !activeProject) return; const query = userInput; setUserInput(''); setChatMessages(prev => [...prev, { role: 'user', text: query }]); setAiLoading(true); const contextData = { project: activeProject.name, health: projectHealth.label, completionRate: `${stats.rate}%` }; const responseText = await generateChatResponse(query, `DesignBot Context: ${JSON.stringify(contextData)}`); setChatMessages(prev => [...prev, { role: 'ai', text: responseText }]); setAiLoading(false); };
    
    // New Feature: Generate Project Report for Feed
    const generateProjectReport = async () => {
        if (!activeProject) return;
        setNotification("Gerando Relatório Inteligente...");
        setAiLoading(true);
        
        const summaryData = {
            project: activeProject.name,
            phase: activeProject.lod,
            stats: stats,
            health: projectHealth,
            scopes: activeProject.scopes.map(s => ({ 
                name: s.name, 
                resp: s.resp, 
                status: s.status,
                delayedEvents: s.events.filter(e => !e.completed && new Date(e.endDate) < new Date()).length
            })),
            dataRows: activeProject.dataRows
        };

        const prompt = `Atue como um Gerente de Projetos Sênior. Gere um Relatório de Status Executivo (em pt-BR) para o projeto.
        
        Use a seguinte estrutura:
        1. 📊 RESUMO GERAL (Saúde do projeto e progresso)
        2. ⚠️ PONTOS DE ATENÇÃO (Atrasos e riscos baseados nos dados)
        3. 🚀 PRÓXIMOS PASSOS (Sugestões baseadas no status atual)
        
        Seja conciso, direto e profissional. Use emojis moderados.
        Dados do Projeto: ${JSON.stringify(summaryData)}`;

        const report = await generateChatResponse(prompt, "Você é um especialista em gestão de projetos de arquitetura e engenharia.");
        
        addLog("IA MANAGER", report);
        setAiLoading(false);
        setNotification("Relatório Gerado no Feed!");
        setTimeout(() => setNotification(null), 3000);
    };

    const isVideo = (url: string) => {
        return url.startsWith('data:video') || !!url.match(/\.(mp4|webm|ogg)$/i);
    };

    const handleScopeFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && activeProject && selectedScopeIdForFiles) {
             const fakePath = `/uploads/${activeProject.id}/${selectedScopeIdForFiles}/${file.name}`;
             onAddFile(file.name, fakePath);
             addLog("SISTEMA", `ARQUIVO ADICIONADO: ${file.name}`);
        }
        if (scopeFileRef.current) scopeFileRef.current.value = '';
    };

    const handleGalleryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0 && activeProject) {
            Array.from(files).forEach(file => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const result = reader.result as string;
                    setDb(prev => ({
                        ...prev,
                        projects: prev.projects.map(p => p.id === activeProject.id ? {
                            ...p,
                            gallery: [...(p.gallery || []), result],
                            updatedAt: new Date().toISOString()
                        } : p)
                    }));
                };
                reader.readAsDataURL(file);
            });
            addLog("SISTEMA", `${files.length} MÍDIA(S) ADICIONADA(S) À GALERIA`);
        }
        if (galleryFileRef.current) galleryFileRef.current.value = '';
    };

    const handleDeleteGalleryImage = (index: number) => {
        if (!activeProject || !activeProject.gallery) return;
        setDb(prev => ({
            ...prev,
            projects: prev.projects.map(p => p.id === activeProject.id ? {
                ...p,
                gallery: p.gallery!.filter((_, i) => i !== index),
                galleryDescriptions: p.galleryDescriptions ? Object.fromEntries(Object.entries(p.galleryDescriptions).filter(([k]) => parseInt(k) !== index)) : {},
                updatedAt: new Date().toISOString()
            } : p)
        }));
        if (currentGalleryIndex >= (activeProject.gallery.length - 1)) {
            setCurrentGalleryIndex(Math.max(0, activeProject.gallery.length - 2));
        }
        addLog("SISTEMA", `MÍDIA REMOVIDA DA GALERIA`);
    };

    const updateGalleryDescription = (text: string) => {
        if (!activeProject) return;
        setDb(prev => ({
            ...prev,
            projects: prev.projects.map(p => p.id === activeProject.id ? {
                ...p,
                galleryDescriptions: { ...(p.galleryDescriptions || {}), [currentGalleryIndex]: text }
            } : p)
        }));
    };

    const generateGalleryAI = async () => {
        if (!activeProject || !activeProject.gallery?.[currentGalleryIndex]) return;
        setNotification("Analisando mídia com IA...");
        const prompt = `Atue como um Arquiteto Sênior. Gere uma descrição técnica breve (máx 200 caracteres) para uma imagem de acompanhamento de obra ou render do projeto ${activeProject.name}, considerando a fase ${activeProject.lod}. Foco em evolução e qualidade.`;
        const description = await generateChatResponse(prompt, "Você é um especialista em documentação arquitetônica.");
        updateGalleryDescription(description);
        setNotification("Descrição Gerada!");
        setTimeout(() => setNotification(null), 3000);
    };

    const onAddDataRow = () => {
        if (!activeProject) return;
        const newRow: ProjectDataRow = {
            id: `row-${Date.now()}`,
            order: ((activeProject.dataRows?.length || 0) + 1).toString(),
            location: '',
            status: 'NÃO INICIADO',
            landArea: '',
            builtArea: '',
            salesArea: '',
            zoning: '',
            potential: '',
            broker: '',
            resp: '',
            updatedAt: new Date().toLocaleDateString()
        };
        setDb(prev => ({
            ...prev,
            projects: prev.projects.map(p => p.id === activeProject.id ? {
                ...p,
                dataRows: [...(p.dataRows || []), newRow],
                updatedAt: new Date().toISOString()
            } : p)
        }));
        addLog("SISTEMA", "NOVA LINHA DE DADOS ADICIONADA");
    };

    const onUpdateDataRow = (id: string, field: keyof ProjectDataRow, value: string) => {
        if (!activeProject) return;
        setDb(prev => ({
            ...prev,
            projects: prev.projects.map(p => p.id === activeProject.id ? {
                ...p,
                dataRows: p.dataRows?.map(r => r.id === id ? { ...r, [field]: value } : r),
                updatedAt: new Date().toISOString()
            } : p)
        }));
    };

    const onDeleteDataRow = (id: string) => {
        if (!activeProject) return;
        setDb(prev => ({
            ...prev,
            projects: prev.projects.map(p => p.id === activeProject.id ? {
                ...p,
                dataRows: p.dataRows?.filter(r => r.id !== id),
                updatedAt: new Date().toISOString()
            } : p)
        }));
        addLog("SISTEMA", "LINHA DE DADOS REMOVIDA");
    };

    const hasLod = !!db.activeLod; const hasCompany = !!db.activeCompanyId; const hasProject = !!db.activeProjectId;

    return (
        <div className={`min-h-screen p-4 md:p-8 flex flex-col items-center font-sans relative pb-32 overflow-x-hidden bg-transparent text-theme-text`}>
            
            {/* Top Bar - Made Glassy */}
            <div className="w-full flex justify-between items-center mb-10 py-4 px-8 bg-theme-card/60 backdrop-blur-xl border border-theme-divider rounded-full shadow-sm no-print sticky top-4 z-[90]">
                <div className="flex items-center gap-3">
                    {/* ENIGAMI LOGO - SIMPLIFIED */}
                    <div className="flex items-center gap-4">
                        <h1 className="font-square font-black text-3xl tracking-[0.15em] text-theme-text uppercase drop-shadow-sm leading-none">
                             ENIGAMI
                        </h1>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <button onClick={handleManualSave} className="flex items-center gap-2 text-[10px] font-black uppercase text-theme-textMuted hover:text-theme-orange transition-colors">
                        <span className="material-symbols-outlined text-lg">cloud_upload</span> Salvar
                    </button>
                    <div className="h-4 w-px bg-theme-divider"></div>
                    {currentUser ? (
                        <div className="flex items-center gap-3">
                            <div className="text-right hidden sm:block">
                                <span className="block text-[10px] font-black uppercase text-theme-text">{currentUser.name}</span>
                                <span className="block text-[8px] font-bold text-theme-green uppercase tracking-widest">Online</span>
                            </div>
                            <img src={currentUser.avatar} alt="User" className="w-8 h-8 rounded-full border border-theme-divider shadow-md" />
                        </div>
                    ) : (
                        <button onClick={handleLogin} className="flex items-center gap-2 bg-theme-text text-theme-bg border border-theme-text px-4 py-1.5 rounded-full text-[10px] font-black uppercase hover:bg-theme-bg hover:text-theme-text transition-all shadow-md">
                            <span className="material-symbols-outlined text-sm">login</span> Login
                        </button>
                    )}
                </div>
            </div>

            {/* Notifications & Overlays */}
            {notification && (<div className="fixed top-8 left-1/2 -translate-x-1/2 z-[300] bg-theme-green text-white px-6 py-3 rounded-full font-bold uppercase tracking-widest shadow-xl animate-scaleIn flex items-center gap-3 backdrop-blur-md"><span className="material-symbols-outlined">check_circle</span>{notification}</div>)}
            {viewingImage && (<div data-modal-overlay="true" className="fixed inset-0 z-[200] bg-theme-card/80 backdrop-blur-md flex items-center justify-center p-10 animate-fadeIn" onClick={() => setViewingImage(null)}><button className="absolute top-5 right-5 text-theme-text/50 hover:text-theme-orange transition-colors z-[210]"><span className="material-symbols-outlined text-4xl">close</span></button><img src={viewingImage} className="max-w-full max-h-full rounded-3xl shadow-2xl border border-white" onClick={(e) => e.stopPropagation()} /></div>)}

            {/* Floating Buttons */}
            <div className="fixed bottom-8 right-8 z-[110] flex flex-col gap-4 no-print">
                <button onClick={() => setShowAIChat(!showAIChat)} className="w-16 h-16 bg-theme-card rounded-full shadow-neuro flex items-center justify-center group relative hover:scale-110 transition-transform"><span className="material-symbols-outlined text-3xl text-theme-cyan group-hover:animate-pulse">smart_toy</span>{!showAIChat && <div className="absolute -top-1 -right-1 bg-theme-orange text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-white animate-bounce">AI</div>}</button>
                <button onClick={() => setShowAdminModal(true)} className="w-16 h-16 bg-theme-card rounded-full shadow-neuro flex items-center justify-center group hover:scale-110 transition-transform"><span className="material-symbols-outlined text-3xl text-theme-orange group-hover:rotate-90 transition-transform duration-500">settings</span></button>
            </div>
            
            {/* ... Chat Window ... */}
            {showAIChat && (<div className="fixed bottom-28 right-8 z-[120] w-[380px] h-[550px] bg-theme-card/80 backdrop-blur-xl rounded-[30px] flex flex-col overflow-hidden animate-scaleIn no-print shadow-2xl border border-white/20"><div className="bg-gradient-to-r from-theme-cyan to-blue-400 p-5 flex justify-between items-center"><div className="flex items-center gap-3"><span className="material-symbols-outlined text-white bg-white/20 rounded-lg p-1.5 text-xl">smart_toy</span><div><h4 className="text-white font-square font-bold text-sm tracking-wide leading-none">DesignBot</h4><span className="text-white/80 text-[10px] font-medium uppercase tracking-wider">Online</span></div></div><button onClick={() => setShowAIChat(false)} className="text-white/70 hover:text-white transition-colors"><span className="material-symbols-outlined">close</span></button></div><div className="flex-1 overflow-y-auto scroller p-5 space-y-4">{chatMessages.length === 0 && <div className="flex flex-col items-center justify-center h-full text-center p-6 gap-3 opacity-50"><span className="material-symbols-outlined text-5xl text-theme-textMuted">chat_bubble</span><p className="text-[11px] font-medium text-theme-textMuted uppercase tracking-widest">Estou analisando o projeto...</p></div>}{chatMessages.map((msg, i) => <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[85%] p-3.5 rounded-2xl text-[13px] leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-theme-cyan text-white rounded-tr-sm' : 'bg-theme-card border border-theme-divider text-theme-textMuted rounded-tl-sm'}`}>{msg.text}</div></div>)}{aiLoading && <div className="flex justify-start animate-pulse"><div className="bg-theme-card border border-theme-divider text-theme-textMuted px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest">Pensando...</div></div>}<div ref={chatEndRef} /></div><div className="p-4 border-t border-theme-divider bg-theme-card/50"><form onSubmit={(e) => { e.preventDefault(); handleAISend(); }} className="flex gap-2"><input type="text" placeholder="Perguntar sobre o projeto..." className="flex-1 bg-theme-bg border border-theme-divider rounded-xl px-4 py-3 text-xs text-theme-text outline-none focus:border-theme-cyan transition-all placeholder:text-theme-textMuted shadow-sm" value={userInput} onChange={(e) => setUserInput(e.target.value)} disabled={aiLoading} /><button type="submit" className="bg-theme-cyan text-white rounded-xl px-4 flex items-center justify-center hover:bg-cyan-600 transition-all disabled:opacity-50 shadow-lg" disabled={aiLoading || !userInput.trim()}><span className="material-symbols-outlined text-lg">send</span></button></form></div></div>)}

            {/* --- MODALS INJECTION --- */}
            <CompanyModal
                isOpen={showCompanyModal}
                companies={db.companies}
                onClose={() => setShowCompanyModal(false)}
                onSelect={(id) => { setDb(prev => ({ ...prev, activeCompanyId: id, activeProjectId: null })); setShowCompanyModal(false); }}
                onAdd={(name, logo) => { const newId = Date.now(); setDb(prev => ({ ...prev, companies: [...prev.companies, { id: newId, name, logoUrl: logo }] })); }}
                onUpdate={onUpdateCompany}
                onRemove={(id) => { setDb(prev => ({ ...prev, companies: prev.companies.filter(c => c.id !== id), activeCompanyId: prev.activeCompanyId === id ? null : prev.activeCompanyId })); }}
                onReorder={(newCompanies) => setDb(prev => ({ ...prev, companies: newCompanies }))}
            />
            
            <LodModal
                isOpen={showLodModal}
                lods={db.lods}
                activeLod={db.activeLod}
                onClose={() => setShowLodModal(false)}
                onSelect={(lod) => { setDb(prev => ({ ...prev, activeLod: lod })); setShowLodModal(false); }}
                onAdd={(l) => setDb(prev => ({ ...prev, lods: [...prev.lods, l] }))}
                onRemove={(l) => setDb(prev => ({ ...prev, lods: prev.lods.filter(item => item !== l), activeLod: prev.activeLod === l ? "" : prev.activeLod }))}
                onReorder={(newLods) => setDb(prev => ({ ...prev, lods: newLods }))}
            />

            <ProjectModal
                isOpen={showProjectModal}
                companyName={activeCompany?.name || ''}
                projects={db.projects.filter(p => p.companyId === db.activeCompanyId)}
                onClose={() => setShowProjectModal(false)}
                onSelect={(id) => { setDb(prev => ({ ...prev, activeProjectId: id })); setShowProjectModal(false); }}
                onAdd={(name, logo, cover) => { 
                    if (!db.activeCompanyId || !db.activeLod) return;
                    const newProj: Project = { 
                        id: Date.now(), 
                        companyId: db.activeCompanyId, 
                        lod: db.activeLod, 
                        name, 
                        logoUrl: logo,
                        coverUrl: cover,
                        createdAt: new Date().toISOString(), 
                        updatedAt: new Date().toISOString(), 
                        timelineStart: '2026-01-01', 
                        timelineEnd: '2026-12-31', 
                        activities: [], 
                        scopes: [] 
                    };
                    setDb(prev => ({ ...prev, projects: [...prev.projects, newProj], activeProjectId: newProj.id }));
                    setShowProjectModal(false);
                }}
                onDelete={onDeleteProject}
                onEdit={onEditProject}
            />

            <ScopeModal
                isOpen={showScopeModal}
                scope={selectedScope}
                disciplines={db.disciplines}
                team={db.team}
                onClose={() => { setShowScopeModal(false); setEditingScopeId(null); }}
                onManage={() => { setShowScopeModal(false); setShowDisciplinesModal(true); }}
                onSave={(name, startDate, color, status, pWeek, resp) => {
                    if (!activeProject) return;
                    if (editingScopeId) {
                         setDb(prev => ({ ...prev, projects: prev.projects.map(p => p.id === activeProject.id ? { ...p, updatedAt: new Date().toISOString(), scopes: p.scopes.map(s => s.id === editingScopeId ? { ...s, name, startDate, colorClass: color, status, protocolWeek: pWeek, resp } : s) } : p) }));
                    } else {
                        const newScope: Scope = { id: `sc${Date.now()}`, name, colorClass: color, startDate, resp, status, protocolWeek: pWeek, events: [] };
                        setDb(prev => ({ ...prev, projects: prev.projects.map(p => p.id === activeProject.id ? { ...p, updatedAt: new Date().toISOString(), scopes: [...p.scopes, newScope] } : p) }));
                    }
                    setShowScopeModal(false);
                    setEditingScopeId(null);
                }}
            />

            <EventModal
                isOpen={showEventModal}
                team={db.team}
                event={editingEvent}
                onClose={() => { setShowEventModal(false); setEditingEventId(null); }}
                onSave={(title, resp, start, end, checklistStr) => {
                    if (!activeProject || !activeScopeIdForEvent) return;
                    const checklist = checklistStr.split('\n').filter(t => t.trim()).map(t => ({ text: t, done: false }));
                    if (editingEventId) {
                        setDb(prev => ({ ...prev, projects: prev.projects.map(p => p.id === activeProject.id ? { ...p, updatedAt: new Date().toISOString(), scopes: p.scopes.map(s => s.id === activeScopeIdForEvent ? { ...s, events: s.events.map(e => e.id === editingEventId ? { ...e, title, resp, startDate: start, endDate: end, checklist: e.checklist } : e) } : s) } : p) }));
                    } else {
                        const newEvent: Event = { id: `ev${Date.now()}`, title, resp, startDate: start, endDate: end, plannedStartDate: start, plannedEndDate: end, checklist, completed: false };
                        setDb(prev => ({ ...prev, projects: prev.projects.map(p => p.id === activeProject.id ? { ...p, updatedAt: new Date().toISOString(), scopes: p.scopes.map(s => s.id === activeScopeIdForEvent ? { ...s, events: [...s.events, newEvent] } : s) } : p) }));
                        addLog("SISTEMA", `NOVA AÇÃO: ${title}`);
                    }
                    setShowEventModal(false);
                    setEditingEventId(null);
                }}
            />

            <ChecklistModal
                isOpen={showChecklistModal}
                event={activeChecklistIds ? activeProject?.scopes.find(s => s.id === activeChecklistIds.sid)?.events.find(e => e.id === activeChecklistIds.eid) || null : null}
                project={activeProject}
                onClose={() => setShowChecklistModal(false)}
                onEdit={() => { 
                    if(activeChecklistIds) {
                         setActiveScopeIdForEvent(activeChecklistIds.sid); 
                         setEditingEventId(activeChecklistIds.eid); 
                         setShowChecklistModal(false); 
                         setShowEventModal(true); 
                    }
                }}
                onToggleCheck={(idx) => {
                    if (!activeProject || !activeChecklistIds) return;
                    setDb(prev => ({ ...prev, projects: prev.projects.map(p => p.id === activeProject.id ? { ...p, scopes: p.scopes.map(s => s.id === activeChecklistIds.sid ? { ...s, events: s.events.map(e => e.id === activeChecklistIds.eid ? { ...e, checklist: e.checklist.map((it, i) => i === idx ? { ...it, done: !it.done } : it) } : e) } : s) } : p) }));
                }}
                onComplete={() => {
                    if (!activeProject || !activeChecklistIds) return;
                    setDb(prev => ({ ...prev, projects: prev.projects.map(p => p.id === activeProject.id ? { ...p, scopes: p.scopes.map(s => s.id === activeChecklistIds.sid ? { ...s, events: s.events.map(e => e.id === activeChecklistIds.eid ? { ...e, completed: !e.completed } : e) } : s) } : p) }));
                    setShowChecklistModal(false);
                }}
                onToggleLink={(targetId) => onAddDependency(activeChecklistIds!.eid, targetId, 'FS')}
                onChangeType={(targetId) => onChangeDependencyType(activeChecklistIds!.sid, activeChecklistIds!.eid, targetId)}
            />

            <TeamModal 
                isOpen={showTeamModal} 
                team={db.team} 
                onClose={() => setShowTeamModal(false)} 
                onAdd={(name) => setDb(prev => ({ ...prev, team: [...prev.team, name] }))} 
                onRemove={(idx) => setDb(prev => ({ ...prev, team: prev.team.filter((_, i) => i !== idx) }))} 
            />
            
            <TimelineSettingsModal 
                isOpen={showSettingsModal} 
                project={activeProject} 
                onClose={() => setShowSettingsModal(false)} 
                onSave={(start, end) => {
                     if (!activeProject) return;
                     setDb(prev => ({ ...prev, projects: prev.projects.map(p => p.id === activeProject.id ? { ...p, timelineStart: start, timelineEnd: end } : p) }));
                     setShowSettingsModal(false);
                }}
            />
            
            <AdminSettingsModal 
                isOpen={showAdminModal} 
                theme={theme} 
                onClose={() => setShowAdminModal(false)} 
                onToggleTheme={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')} 
                onPrint={printDashboard} 
                onExportJSON={handleExportJSON}
                onImportJSON={handleImportJSON}
            />

            <DisciplinesManagerModal
                isOpen={showDisciplinesModal}
                disciplines={db.disciplines}
                onClose={() => setShowDisciplinesModal(false)}
                onAdd={(d) => setDb(prev => ({ ...prev, disciplines: [...prev.disciplines, d] }))}
                onUpdate={(oldCode, d) => setDb(prev => ({ ...prev, disciplines: prev.disciplines.map(item => item.code === oldCode ? d : item) }))}
                onRemove={(code) => setDb(prev => ({ ...prev, disciplines: prev.disciplines.filter(d => d.code !== code) }))}
                onReorder={(list) => setDb(prev => ({ ...prev, disciplines: list }))}
            />

            <div className="flex flex-col gap-10 w-full max-w-[1600px]">
                {/* Header Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 no-print">
                     <div className="lg:col-span-4 flex flex-col gap-8">
                        <div className="grid grid-cols-2 gap-6">
                            {/* 1. Cliente - Vibrant Orange */}
                            <div className={`ds-card-accent gradient-orange p-6 flex flex-col items-center justify-center text-center h-56 transition-all relative cursor-pointer hover:-translate-y-2 hover:shadow-2xl`} onClick={() => setShowCompanyModal(true)}>
                                <span className="text-[10px] font-bold text-white/90 uppercase tracking-widest mb-4 flex items-center gap-1 border border-white/30 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm">1. Cliente <span className="material-symbols-outlined text-xs">chevron_right</span></span>
                                {activeCompany?.logoUrl && <img src={activeCompany.logoUrl} className="w-20 h-20 object-contain my-2 bg-white/20 rounded-2xl backdrop-blur-md shadow-lg" />}
                                <div className="w-full px-2 mt-2">
                                    <TextReveal text={activeCompany?.name || 'Selecione'} className="font-square font-black text-white uppercase text-xl truncate w-full drop-shadow-sm" />
                                </div>
                                {hasCompany && <span className="material-symbols-outlined absolute right-4 bottom-4 text-white/40 text-3xl">check_circle</span>}
                            </div>
                            
                            <div className={`grid grid-rows-2 gap-4 h-56 transition-all ${!hasProject ? 'opacity-50 blur-[1px]' : ''}`}>
                                <div className={`ds-card p-3 flex flex-col justify-center items-center`}><span className="text-theme-orange font-bold text-[9px] mb-1 uppercase tracking-widest text-center opacity-80">Última Atualização</span><span className="text-sm font-mono font-medium text-theme-text bg-theme-highlight px-3 py-1 rounded-lg border border-theme-divider">{activeProject ? new Date(activeProject.updatedAt).toLocaleDateString() : '--/--/--'}</span></div>
                                <div className={`ds-card p-3 flex flex-col justify-center items-center`}><span className="text-theme-orange font-bold text-[9px] mb-1 uppercase tracking-widest opacity-80">Início do Projeto</span><span className="text-sm font-mono font-medium text-theme-text bg-theme-highlight px-3 py-1 rounded-lg border border-theme-divider">{activeProject ? new Date(activeProject.createdAt).toLocaleDateString() : '--/--/--'}</span></div>
                            </div>

                            {/* 2. Fase - Vibrant Purple */}
                            <div className={`ds-card-accent gradient-purple cursor-pointer p-6 flex flex-col justify-center items-center text-center h-56 transition-all relative group overflow-hidden ${!hasCompany ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:-translate-y-2 hover:shadow-2xl'}`} onClick={() => hasCompany && setShowLodModal(true)}>
                                <span className="text-[10px] font-bold text-white/90 uppercase tracking-widest mb-2 flex items-center gap-1 border border-white/30 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm">2. Fase <span className="material-symbols-outlined text-xs">chevron_right</span></span>
                                <div className="mt-2 flex flex-col items-center">
                                    {db.activeLod ? (
                                        <>
                                            <TextReveal text={db.activeLod + "_"} className="text-3xl md:text-4xl font-square font-black text-white leading-tight uppercase drop-shadow-md" />
                                            <TextReveal text={db.lods.find(l => l.startsWith(db.activeLod))?.split('_ ')[1] || '---'} className="text-xl opacity-90 font-medium font-sans text-white mt-1" delay={0.5} />
                                        </>
                                    ) : (
                                        <TextReveal text="Selecionar" className="text-3xl md:text-4xl font-square font-black text-white leading-tight uppercase drop-shadow-md" />
                                    )}
                                </div>
                                {hasLod && <span className="material-symbols-outlined absolute right-4 bottom-4 text-white/40 text-3xl">check_circle</span>}
                            </div>

                            {/* 3. Projeto - Vibrant Cyan */}
                            <div className={`ds-card-accent gradient-cyan p-6 flex flex-col items-center justify-center h-56 transition-all relative group overflow-hidden ${!hasCompany || !hasLod ? 'opacity-50 grayscale cursor-not-allowed' : 'cursor-pointer hover:-translate-y-2 hover:shadow-2xl'}`} onClick={() => hasCompany && hasLod && setShowProjectModal(true)}>
                                {activeProject?.coverUrl && (<div className="absolute inset-0 bg-cover bg-center opacity-30 transition-all duration-500 z-0 mix-blend-multiply" style={{ backgroundImage: `url(${activeProject.coverUrl})` }} />)}
                                <div className="relative z-10 flex flex-col items-center w-full">
                                    <span className="text-[10px] font-bold text-theme-text/80 uppercase tracking-widest mb-2 flex items-center gap-1 border border-black/10 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm">3. Projeto <span className="material-symbols-outlined text-xs">chevron_right</span></span>
                                    {activeProject?.logoUrl ? <img src={activeProject.logoUrl} className="w-16 h-16 object-contain mb-2 mt-2 bg-white/30 rounded-2xl shadow-sm" /> : <span className="material-symbols-outlined text-5xl text-theme-text/80 mb-1 mt-2">rocket_launch</span>}
                                    <div className="w-full px-2 mt-2">
                                        <TextReveal text={activeProject?.name || 'Selecione'} className="text-lg font-square font-black text-theme-text uppercase truncate w-full text-center drop-shadow-sm" />
                                    </div>
                                </div>
                                {hasProject && <span className="material-symbols-outlined absolute right-4 bottom-4 text-black/20 text-3xl z-10">check_circle</span>}
                            </div>
                        </div>
                        
                        {/* Stats Panel */}
                        <div className={`ds-card p-8 h-[396px] flex flex-col relative overflow-hidden group transition-all duration-1000 ${!hasProject ? 'opacity-0 translate-y-4 pointer-events-none' : 'opacity-100'}`}>
                            <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full blur-[80px] opacity-10 bg-theme-purple"></div>
                            <div className="grid grid-cols-4 gap-4 mb-6 relative z-20">
                                <button onClick={() => setActiveHealthTab('total')} className={`flex flex-col p-4 rounded-2xl border transition-all ${activeHealthTab === 'total' ? 'bg-indigo-500/10 border-indigo-200 scale-105 shadow-lg' : 'bg-theme-card border-transparent hover:bg-theme-highlight'}`}><span className="text-[9px] font-bold uppercase text-indigo-400 mb-2">Total</span><span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{stats.taskCount}</span></button>
                                <button onClick={() => setActiveHealthTab('progress')} className={`flex flex-col p-4 rounded-2xl border transition-all ${activeHealthTab === 'progress' ? 'bg-orange-500/10 border-orange-200 scale-105 shadow-lg' : 'bg-theme-card border-transparent hover:bg-theme-highlight'}`}><span className="text-[9px] font-bold uppercase text-orange-400 mb-2">Andamento</span><span className="text-2xl font-black text-orange-600 dark:text-orange-400">{stats.inProgress}</span></button>
                                <button onClick={() => setActiveHealthTab('done')} className={`flex flex-col p-4 rounded-2xl border transition-all ${activeHealthTab === 'done' ? 'bg-emerald-500/10 border-emerald-200 scale-105 shadow-lg' : 'bg-theme-card border-transparent hover:bg-theme-highlight'}`}><span className="text-[9px] font-bold uppercase text-emerald-400 mb-2">Feito</span><span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.don}</span></button>
                                <button onClick={() => setActiveHealthTab('efficiency')} className={`flex flex-col p-4 rounded-2xl border transition-all ${activeHealthTab === 'efficiency' ? 'bg-pink-500/10 border-pink-200 scale-105 shadow-lg' : 'bg-theme-card border-transparent hover:bg-theme-highlight'}`}><span className="text-[9px] font-bold uppercase text-pink-400 mb-2">Efic.</span><span className="text-2xl font-black text-pink-600 dark:text-pink-400">{stats.rate}%</span></button>
                            </div>
                            <div className="flex-1 flex flex-col justify-end relative z-10 border-t border-dashed border-theme-divider pt-4">
                                {activeHealthTab === 'efficiency' && (
                                    <div className="animate-fadeIn flex flex-col items-center justify-center h-full pb-4">
                                        <h3 className={`font-square font-bold text-[10px] uppercase tracking-[0.3em] mb-4 text-theme-textMuted w-full text-left`}>Saúde Geral</h3>
                                        <div className="relative w-36 h-36">
                                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                                <defs>
                                                    <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                                        <stop offset="0%" stopColor="#2DD4BF" />
                                                        <stop offset="100%" stopColor="#FF6B4A" />
                                                    </linearGradient>
                                                </defs>
                                                <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-theme-divider/30" />
                                                <circle cx="50" cy="50" r="40" stroke="url(#scoreGradient)" strokeWidth="8" fill="transparent" strokeDasharray="251.2" strokeDashoffset={251.2 - (251.2 * stats.rate / 100)} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
                                            </svg>
                                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                <span className="text-3xl font-black text-theme-text font-square tracking-tighter">{stats.rate}%</span>
                                                <span className="text-[8px] font-bold text-theme-textMuted uppercase tracking-widest mt-1 px-2 py-0.5 rounded-full border border-theme-divider bg-theme-bg">{projectHealth.label}</span>
                                            </div>
                                        </div>
                                        <div className="mt-2 flex items-center gap-6">
                                             <div className="text-center">
                                                <span className="text-[9px] font-bold text-theme-textMuted block uppercase mb-0.5">Feito</span>
                                                <span className="text-sm font-black text-theme-cyan">{stats.don}</span>
                                             </div>
                                             <div className="h-6 w-px bg-theme-divider"></div>
                                             <div className="text-center">
                                                <span className="text-[9px] font-bold text-theme-textMuted block uppercase mb-0.5">Total</span>
                                                <span className="text-sm font-black text-theme-text">{stats.tot}</span>
                                             </div>
                                        </div>
                                    </div>
                                )}
                                {activeHealthTab === 'total' && (<div className="animate-fadeIn"><h3 className="font-square font-bold text-[10px] uppercase tracking-[0.3em] mb-2 text-theme-textMuted">Disciplinas & Escopo</h3><p className="text-4xl font-bold text-theme-text tracking-tight">{activeProject?.scopes.length || 0} <span className="text-sm text-theme-textMuted font-medium align-middle">Áreas Ativas</span></p></div>)}
                                {activeHealthTab === 'progress' && (<div className="animate-fadeIn"><h3 className="font-square font-bold text-[10px] uppercase tracking-[0.3em] mb-2 text-theme-textMuted">Cronograma Ativo</h3><p className="text-4xl font-bold text-orange-500 tracking-tight">{stats.inProgress} <span className="text-sm text-theme-textMuted font-medium align-middle">Tarefas Hoje</span></p></div>)}
                                {activeHealthTab === 'done' && (<div className="animate-fadeIn"><h3 className="font-square font-bold text-[10px] uppercase tracking-[0.3em] mb-2 text-theme-textMuted">Entregas Realizadas</h3><p className="text-4xl font-bold text-emerald-500 tracking-tight">{stats.don} <span className="text-sm text-theme-textMuted font-medium align-middle">Validadas</span></p></div>)}
                            </div>
                        </div>
                    </div>
                    
                    {/* --- CENTER COLUMN (Activity Log) --- */}
                    <div className={`lg:col-span-4 flex flex-col gap-8 transition-all duration-700 ${!hasProject ? 'opacity-0 translate-y-4 pointer-events-none' : 'opacity-100'}`}>
                         <div className="ds-card-accent gradient-orange p-6 flex flex-col items-center justify-center h-32 relative overflow-hidden shadow-lg">
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
                            
                            {/* Updated Header with Report Button */}
                            <div className="flex justify-between items-center w-full relative z-10 mb-4 px-2">
                                <h2 className="text-xs font-square font-black text-white tracking-[0.25em] uppercase flex items-center gap-2">
                                    <span className="material-symbols-outlined text-lg">history</span> Feed de Projeto
                                </h2>
                                <button 
                                    onClick={generateProjectReport} 
                                    disabled={aiLoading}
                                    className="bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/40 text-white text-[9px] font-black uppercase px-3 py-1.5 rounded-lg transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
                                >
                                    <span className="material-symbols-outlined text-sm">{aiLoading ? 'hourglass_empty' : 'auto_awesome'}</span>
                                    {aiLoading ? 'Gerando...' : 'Gerar Relatório'}
                                </button>
                            </div>

                            <div className="w-full flex gap-3 px-2 relative z-10">
                                <input type="text" placeholder="PESQUISAR..." className="flex-1 bg-white/20 backdrop-blur-md border border-white/30 rounded-xl py-2 px-4 text-[10px] font-bold text-white placeholder:text-white/70 outline-none focus:bg-white/30 transition-all shadow-inner" value={logSearch} onChange={(e) => setLogSearch(e.target.value)} />
                                <select className="w-28 bg-white/20 backdrop-blur-md border border-white/30 rounded-xl px-2 text-[9px] font-bold text-white outline-none focus:bg-white/30 shadow-inner" value={logAuthorFilter} onChange={(e) => setLogAuthorFilter(e.target.value)}>
                                    <option value="" className="text-black">TODOS</option>
                                    {db.team.map(t => <option key={t} value={t} className="text-black">{t}</option>)}
                                    <option value="SISTEMA" className="text-black">SISTEMA</option>
                                    <option value="IA MANAGER" className="text-black">IA MANAGER</option>
                                </select>
                            </div>
                        </div>
                         <div className={`ds-card p-8 flex flex-col h-[740px] overflow-hidden relative shadow-neuro bg-theme-card`}>
                            <div className="flex-grow scroller overflow-y-auto space-y-6 pr-3 mb-4 pt-2">
                                {filteredActivities.slice().reverse().map((a, i) => (
                                    <div key={i} className="flex flex-col gap-2 border-l-2 border-theme-divider pl-6 pb-2 relative group">
                                        <div className="absolute -left-[5px] top-1.5 w-[8px] h-[8px] rounded-full bg-theme-bg border-2 border-theme-orange shadow-sm" />
                                        <div className="flex justify-between items-baseline">
                                            <span className={`font-black text-[10px] uppercase tracking-wide ${a.author === 'SISTEMA' || a.author === 'IA MANAGER' ? 'text-theme-orange' : 'text-theme-purple'}`}>{a.author}</span>
                                            <span className="text-theme-textMuted font-mono text-[9px] bg-theme-highlight px-2 py-0.5 rounded-full">{a.date}</span>
                                        </div>
                                        <p className={`text-xs font-medium leading-relaxed text-theme-text ${a.author === 'IA MANAGER' ? 'whitespace-pre-wrap' : ''}`}>{a.text}</p>
                                        {a.imageUrl && <img src={a.imageUrl} onClick={() => setViewingImage(a.imageUrl)} className="mt-3 rounded-2xl border border-theme-divider shadow-md max-w-full hover:scale-105 transition-transform cursor-zoom-in" />}
                                    </div>
                                ))}
                            </div>
                            <form className={`mt-auto pt-6 border-t border-theme-divider flex flex-col gap-4`} onSubmit={(e) => { e.preventDefault(); const f = e.currentTarget; const t = (f.elements.namedItem('t') as HTMLInputElement).value; const a = (f.elements.namedItem('a') as HTMLSelectElement).value; if (t && activeProject) { addLog(a, t, activityImage); setActivityImage(undefined); f.reset(); } }}>
                                <div className="flex gap-3">
                                    <button type="button" onClick={() => activityFileRef.current?.click()} className={`rounded-xl w-12 flex items-center justify-center border border-theme-divider bg-theme-bg text-theme-textMuted hover:text-theme-orange hover:border-theme-orange transition-all`}><span className="material-symbols-outlined text-xl">add_a_photo</span></button>
                                    <input type="file" ref={activityFileRef} onChange={(e) => { const file = e.target.files?.[0]; if (file) { const r = new FileReader(); r.onloadend = () => setActivityImage(r.result as string); r.readAsDataURL(file); } }} className="hidden" accept="image/*" />
                                    <select name="a" className={`text-[10px] font-bold rounded-xl px-3 py-3 border border-theme-divider outline-none uppercase bg-theme-bg text-theme-textMuted focus:border-theme-orange w-32`}>{db.team.map(t => <option key={t} value={t} className="bg-theme-card">{t}</option>)}</select>
                                    <button className="bg-theme-orange text-white rounded-xl w-12 shadow-lg hover:bg-orange-600 transition-all flex items-center justify-center" type="submit"><span className="material-symbols-outlined text-xl font-bold">send</span></button>
                                </div>
                                <input name="t" className={`w-full text-xs font-medium rounded-xl px-4 py-4 border border-theme-divider outline-none focus:border-theme-orange transition-all bg-theme-bg text-theme-text placeholder:text-theme-textMuted shadow-inner`} placeholder="Registrar nova atividade..." required />
                            </form>
                        </div>
                    </div>

                    <div className={`lg:col-span-4 flex flex-col gap-8 transition-all duration-1000 ${!hasProject ? 'opacity-0 translate-y-4 pointer-events-none' : 'opacity-100'}`}>
                        {/* List */}
                        <div className={`ds-card p-8 h-[900px] flex flex-col overflow-hidden relative shadow-neuro bg-theme-card`}>
                            <div className={`flex justify-between items-center mb-8 border-b border-theme-divider pb-6 sticky top-0 bg-theme-card z-20`}>
                                <div className="flex items-center gap-3">
                                    <div className="bg-theme-orange/10 p-2 rounded-xl text-theme-orange"><span className="material-symbols-outlined">check_box</span></div>
                                    <h3 className={`font-square font-bold text-xs uppercase tracking-widest text-theme-text`}>Disciplinas & Ações</h3>
                                </div>
                                <button className="text-theme-textMuted hover:text-theme-orange transition-colors bg-theme-highlight p-2 rounded-full" onClick={() => { setEditingScopeId(null); setShowScopeModal(true); }}><span className="material-symbols-outlined text-xl">add</span></button>
                            </div>
                            <div className="flex-grow scroller overflow-y-auto space-y-4 pr-3 pb-2">
                                {activeProject?.scopes.filter(s => !memberFilter || s.resp === memberFilter || s.events.some(ev => ev.resp === memberFilter)).map(scope => (
                                    <div key={scope.id} className={`group flex items-center gap-5 cursor-pointer p-4 rounded-2xl border border-transparent hover:border-theme-divider hover:bg-theme-highlight transition-all shadow-sm bg-theme-bg ${selectedScopeIdForFiles === scope.id ? 'bg-indigo-500/10 border-indigo-200' : ''}`} onClick={() => setSelectedScopeIdForFiles(scope.id)}>
                                        <div className="w-1.5 h-10 rounded-full" style={{ backgroundColor: scope.colorClass }}></div>
                                        <div className="flex flex-col flex-1 overflow-hidden">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-bold text-theme-text truncate">{scope.name}</span>
                                                <div className="flex opacity-0 group-hover:opacity-100 transition-opacity gap-2">
                                                    <button onClick={(e) => { e.stopPropagation(); setActiveScopeIdForEvent(scope.id); setEditingEventId(null); setShowEventModal(true); }} className="text-theme-textMuted hover:text-theme-orange bg-theme-card p-1.5 rounded-lg shadow-sm" title="Nova Ação"><span className="material-symbols-outlined text-sm">add_task</span></button>
                                                    <button onClick={(e) => { e.stopPropagation(); setEditingScopeId(scope.id); setShowScopeModal(true); }} className="text-theme-textMuted hover:text-theme-purple bg-theme-card p-1.5 rounded-lg shadow-sm" title="Editar Disciplina"><span className="material-symbols-outlined text-sm">edit</span></button>
                                                    <button onClick={(e) => { e.stopPropagation(); setSelectedScopeIdForFiles(scope.id); scopeFileRef.current?.click(); }} className="text-theme-textMuted hover:text-theme-cyan bg-theme-card p-1.5 rounded-lg shadow-sm" title="Anexar Arquivos"><span className="material-symbols-outlined text-sm">folder</span></button>
                                                    <button onClick={(e) => { e.stopPropagation(); if(confirm('Apagar disciplina?')) onDeleteScope(scope.id); }} className="text-theme-textMuted hover:text-red-500 bg-theme-card p-1.5 rounded-lg shadow-sm" title="Remover Disciplina"><span className="material-symbols-outlined text-sm">delete</span></button>
                                                </div>
                                            </div>
                                            <span className="text-[10px] font-black text-theme-textMuted uppercase tracking-wider truncate mt-1">{db.disciplines.find(d => d.code === scope.name)?.name || scope.name}</span>
                                            <span className="text-[9px] text-theme-textMuted uppercase mt-2 flex items-center gap-2 bg-theme-highlight w-fit px-2 py-0.5 rounded-full"><span className="material-symbols-outlined text-[10px]">person</span> {scope.resp}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-auto pt-6 border-t border-theme-divider">
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="text-[9px] font-black text-theme-textMuted uppercase tracking-widest flex items-center gap-2"><span className="material-symbols-outlined text-sm">groups</span> Equipe & Carga</h4>
                                    <button className="text-[9px] font-bold text-theme-cyan hover:underline bg-theme-highlight px-3 py-1 rounded-full" onClick={() => setShowTeamModal(true)}>Gerenciar</button>
                                </div>
                                <div className="flex gap-3 overflow-x-auto scroller pb-2">
                                    {db.team.map(member => { const count = teamStats[member]?.count || 0; if (count === 0 && !teamStats[member]?.leaderOf.length) return null; const initials = member.split(' ').map((n, i) => i < 2 ? n[0] : '').join('').toUpperCase(); return (
                                        <div key={member} className="flex items-center bg-theme-bg rounded-full px-3 py-1.5 border border-theme-divider shadow-sm shrink-0" title={`${member}: ${count} tarefas`}>
                                            <div className="w-5 h-5 rounded-full bg-theme-text text-theme-bg flex items-center justify-center text-[8px] font-black mr-2">{initials}</div>
                                            <span className="text-[9px] font-bold text-theme-text">{count}</span>
                                        </div>
                                    ); })}
                                </div>
                            </div>
                            <input type="file" ref={scopeFileRef} className="hidden" onChange={handleScopeFileUpload} />
                        </div>
                    </div>
                </div>

                {/* --- MAIN CONTENT AREA --- */}
                
                {/* GLOBAL TAB NAVIGATION - MAIN VIEW SWITCH */}
                {hasProject && (
                    <div className="w-full flex justify-center items-center gap-4 py-4 no-print sticky top-0 z-50 bg-theme-card/70 backdrop-blur-xl border-b border-theme-divider mb-10 shadow-sm rounded-full max-w-2xl mx-auto">
                         <button onClick={() => setActiveTab('timeline')} className={`px-8 py-3 rounded-full text-xs font-black uppercase tracking-[0.2em] transition-all relative flex items-center gap-2 ${activeTab === 'timeline' ? 'bg-theme-text text-theme-bg shadow-lg scale-105' : 'text-theme-textMuted hover:text-theme-text hover:bg-theme-highlight'}`}>
                            <span className="material-symbols-outlined text-lg">view_timeline</span> Cronograma
                        </button>
                        <button onClick={() => setActiveTab('gallery')} className={`px-8 py-3 rounded-full text-xs font-black uppercase tracking-[0.2em] transition-all relative flex items-center gap-2 ${activeTab === 'gallery' ? 'bg-theme-cyan text-white shadow-lg scale-105' : 'text-theme-textMuted hover:text-theme-text hover:bg-theme-highlight'}`}>
                            <span className="material-symbols-outlined text-lg">photo_library</span> Galeria
                        </button>
                         <button onClick={() => setActiveTab('files')} className={`px-8 py-3 rounded-full text-xs font-black uppercase tracking-[0.2em] transition-all relative flex items-center gap-2 ${activeTab === 'files' ? 'bg-theme-orange text-white shadow-lg scale-105' : 'text-theme-textMuted hover:text-theme-text hover:bg-theme-highlight'}`}>
                            <span className="material-symbols-outlined text-lg">folder_open</span> Arquivos
                        </button>
                        <button onClick={() => setActiveTab('data')} className={`px-8 py-3 rounded-full text-xs font-black uppercase tracking-[0.2em] transition-all relative flex items-center gap-2 ${activeTab === 'data' ? 'bg-theme-text text-theme-bg shadow-lg scale-105' : 'text-theme-textMuted hover:text-theme-text hover:bg-theme-highlight'}`}>
                            <span className="material-symbols-outlined text-lg">dataset</span> Dados
                        </button>
                    </div>
                )}

                {/* --- TAB: TIMELINE VIEW --- */}
                {activeTab === 'timeline' && hasProject && (
                    <div className={`transition-all duration-1000 flex flex-col gap-12 animate-fadeIn`}>
                        <div className={`self-center bg-theme-card rounded-full p-2 flex gap-2 no-print shadow-neuro`}>
                            <button onClick={() => setZoomLevel(0.6)} className={`px-6 py-2 rounded-full text-[10px] font-bold uppercase transition-all ${zoomLevel < 0.8 ? 'bg-theme-text text-theme-bg shadow-md' : 'text-theme-textMuted hover:text-theme-text hover:bg-theme-highlight'}`}>MACRO</button>
                            <button onClick={() => setZoomLevel(1)} className={`px-6 py-2 rounded-full text-[10px] font-bold uppercase transition-all ${zoomLevel >= 0.8 && zoomLevel <= 1.2 ? 'bg-theme-text text-theme-bg shadow-md' : 'text-theme-textMuted hover:text-theme-text hover:bg-theme-highlight'}`}>NORMAL</button>
                            <button onClick={() => setZoomLevel(1.8)} className={`px-6 py-2 rounded-full text-[10px] font-bold uppercase transition-all ${zoomLevel > 1.2 ? 'bg-theme-text text-theme-bg shadow-md' : 'text-theme-textMuted hover:text-theme-text hover:bg-theme-highlight'}`}>MICRO</button>
                        </div>

                        <div className="ds-card rounded-[40px] overflow-hidden bg-theme-card shadow-neuro">
                            <div className="bg-gradient-to-r from-theme-orange to-red-500 py-6 text-center"><h2 className="font-square font-black text-white text-2xl uppercase tracking-[0.3em] drop-shadow-md">Cronograma Planejado</h2></div>
                            <div className="bg-theme-bg">
                                <Timeline 
                                    project={activeProject} 
                                    isExecuted={false} 
                                    zoomLevel={zoomLevel} 
                                    setZoomLevel={setZoomLevel} 
                                    onBarClick={(sid, eid) => { setActiveChecklistIds({ sid, eid }); setShowChecklistModal(true); }} 
                                    onBarContextMenu={() => {}} 
                                    onAddDependency={onAddDependency} 
                                />
                            </div>
                        </div>

                        <div className="ds-card rounded-[40px] overflow-hidden border-2 border-theme-cyan/20 bg-theme-card shadow-neuro">
                            <div className="bg-gradient-to-r from-theme-cyan to-teal-500 py-6 text-center"><h2 className="font-square font-black text-white text-2xl uppercase tracking-[0.3em] drop-shadow-md">Cronograma Executado</h2></div>
                            <div className="bg-theme-bg">
                                <Timeline 
                                    project={activeProject} 
                                    isExecuted={true} 
                                    zoomLevel={zoomLevel} 
                                    setZoomLevel={setZoomLevel} 
                                    onBarClick={(sid, eid) => { setActiveChecklistIds({ sid, eid }); setShowChecklistModal(true); }} 
                                    onBarContextMenu={(sid, eid) => { setActiveScopeIdForEvent(sid); setEditingEventId(eid); setShowEventModal(true); }} 
                                    onAddDependency={onAddDependency}
                                />
                            </div>
                        </div>

                        <div className={`ds-card p-10 h-[280px] flex flex-col relative overflow-hidden bg-theme-card border border-theme-divider shadow-neuro mb-20`}>
                            <div className="flex justify-between items-start mb-8">
                                <div>
                                    <h2 className="text-2xl font-square font-black text-theme-text uppercase tracking-widest flex items-center gap-4"><span className="material-symbols-outlined text-theme-orange text-4xl">timer</span>Controle de Prazo Global</h2>
                                    <div className="mt-6 flex items-center gap-6"><button onClick={() => setShowTeamModal(true)} className="bg-theme-highlight border border-theme-divider hover:border-theme-orange text-theme-textMuted px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all group shadow-sm"><span className="material-symbols-outlined text-xl group-hover:text-theme-orange transition-colors">groups</span> Equipe Técnica</button><div className="h-10 w-px bg-theme-divider mx-2"></div><div className="flex items-center gap-3 overflow-x-auto scroller pb-2 max-w-[800px]"><button onClick={() => setMemberFilter(null)} className={`flex flex-col items-center px-4 py-2 rounded-xl border transition-all shrink-0 shadow-sm ${!memberFilter ? 'bg-theme-orange border-theme-orange' : 'bg-theme-card border-theme-divider hover:bg-theme-highlight'}`}><span className={`text-[10px] font-black uppercase ${!memberFilter ? 'text-white' : 'text-theme-textMuted'}`}>Todos</span></button>{db.team.map(member => { const isLeader = teamStats[member]?.leaderOf.length > 0; const actionCount = teamStats[member]?.count || 0; const isActive = memberFilter === member; return (<button key={member} onClick={() => setMemberFilter(isActive ? null : member)} className={`flex items-center gap-3 px-4 py-2 rounded-xl border transition-all shrink-0 group shadow-sm ${isActive ? 'bg-theme-text border-theme-text' : 'bg-theme-card border-theme-divider hover:bg-theme-highlight'}`}><div className="flex flex-col items-start"><span className={`text-[10px] font-bold uppercase truncate max-w-[100px] ${isActive ? 'text-theme-bg' : 'text-theme-textMuted group-hover:text-theme-text'}`}>{member}</span><div className="flex gap-2 mt-0.5">{isLeader && <span className="text-[7px] font-black text-theme-orange bg-orange-500/10 px-1 rounded uppercase">LÍDER</span>}<span className="text-[7px] font-bold text-theme-textMuted">{actionCount} AÇÕES</span></div></div></button>)})}</div></div>
                                </div>
                                <div className="flex flex-col items-end gap-3"><button onClick={() => setShowDisciplinesModal(true)} className="bg-theme-card border border-theme-divider text-theme-textMuted hover:text-theme-orange px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-sm hover:shadow-md"><span className="material-symbols-outlined text-base">view_list</span> Disciplinas</button><button onClick={() => setShowSettingsModal(true)} className="bg-theme-card border border-theme-divider text-theme-textMuted hover:text-theme-orange px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-sm hover:shadow-md"><span className="material-symbols-outlined text-base">settings</span> Ajustar Período</button></div>
                            </div>
                            <div className="flex-1 flex flex-col justify-center pb-2"><div className="h-4 w-full bg-theme-bg rounded-full relative overflow-hidden border border-theme-divider shadow-inner"><div className="h-full bg-gradient-to-r from-theme-orange to-red-500 transition-all duration-1000 ease-out shadow-glow" style={{ width: `${globalProgress}%` }} /><div className="absolute top-0 bottom-0 w-[4px] bg-theme-card shadow-[0_0_15px_rgba(0,0,0,0.2)] z-10 transition-all duration-1000 ease-out" style={{ left: `${globalProgress}%` }} /></div><div className="flex justify-between mt-4"><div className="flex flex-col items-start"><span className="text-[9px] font-black text-theme-cyan uppercase tracking-widest mb-1">START</span><div className="bg-theme-highlight border border-theme-divider px-3 py-1 rounded-lg text-xs font-bold text-theme-textMuted shadow-sm">{activeProject ? new Date(activeProject.timelineStart).toLocaleDateString() : '--/--/--'}</div></div><div className="flex flex-col items-end"><span className="text-[9px] font-black text-theme-green uppercase tracking-widest mb-1">ENTREGA</span><div className="bg-theme-highlight border border-theme-divider px-3 py-1 rounded-lg text-xs font-bold text-theme-textMuted shadow-sm">{activeProject ? new Date(activeProject.timelineEnd).toLocaleDateString() : '--/--/--'}</div></div></div></div>
                        </div>
                    </div>
                )}

                {/* --- TAB: GALLERY VIEW --- */}
                {activeTab === 'gallery' && hasProject && (
                    <div className="animate-fadeIn">
                        <div className="ds-card p-8 bg-theme-card relative overflow-hidden min-h-[600px]">
                            {activeProject.gallery && activeProject.gallery.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-full">
                                    <div className="relative rounded-3xl overflow-hidden shadow-2xl group border border-theme-divider bg-black aspect-video md:aspect-auto">
                                        {isVideo(activeProject.gallery[currentGalleryIndex]) ? (
                                            <video src={activeProject.gallery[currentGalleryIndex]} controls className="w-full h-full object-contain" />
                                        ) : (
                                            <img src={activeProject.gallery[currentGalleryIndex]} className="w-full h-full object-contain" />
                                        )}
                                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleDeleteGalleryImage(currentGalleryIndex)} className="bg-red-500 text-white p-2 rounded-full shadow-lg hover:scale-110 transition-transform"><span className="material-symbols-outlined">delete</span></button>
                                        </div>
                                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 p-2 bg-black/50 rounded-full backdrop-blur-md">
                                            <button onClick={() => setCurrentGalleryIndex(prev => (prev - 1 + activeProject.gallery!.length) % activeProject.gallery!.length)} className="text-white hover:text-theme-orange"><span className="material-symbols-outlined">chevron_left</span></button>
                                            <span className="text-white text-xs font-mono self-center">{currentGalleryIndex + 1} / {activeProject.gallery.length}</span>
                                            <button onClick={() => setCurrentGalleryIndex(prev => (prev + 1) % activeProject.gallery!.length)} className="text-white hover:text-theme-orange"><span className="material-symbols-outlined">chevron_right</span></button>
                                        </div>
                                    </div>
                                    <div className="flex flex-col h-full">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="font-square font-black text-xl uppercase tracking-widest text-theme-text">Detalhes da Mídia</h3>
                                            <button onClick={generateGalleryAI} className="flex items-center gap-2 bg-theme-purple/10 text-theme-purple px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-theme-purple hover:text-white transition-all border border-theme-purple/20">
                                                <span className="material-symbols-outlined text-lg">auto_awesome</span> Gerar Descrição IA
                                            </button>
                                        </div>
                                        <textarea 
                                            className="flex-1 w-full bg-theme-bg border border-theme-divider rounded-2xl p-6 text-sm text-theme-text outline-none focus:border-theme-orange transition-all resize-none shadow-inner leading-relaxed" 
                                            placeholder="Adicione uma descrição técnica ou observações sobre esta imagem..."
                                            value={activeProject.galleryDescriptions?.[currentGalleryIndex] || ""}
                                            onChange={(e) => updateGalleryDescription(e.target.value)}
                                        />
                                        <div className="mt-6 grid grid-cols-4 gap-2 overflow-x-auto pb-2">
                                            {activeProject.gallery.map((img, idx) => (
                                                <div key={idx} onClick={() => setCurrentGalleryIndex(idx)} className={`cursor-pointer rounded-xl overflow-hidden border-2 aspect-square relative ${currentGalleryIndex === idx ? 'border-theme-orange ring-2 ring-theme-orange/30' : 'border-transparent opacity-60 hover:opacity-100'}`}>
                                                    {isVideo(img) ? <video src={img} className="w-full h-full object-cover" /> : <img src={img} className="w-full h-full object-cover" />}
                                                </div>
                                            ))}
                                            <button onClick={() => galleryFileRef.current?.click()} className="aspect-square rounded-xl border-2 border-dashed border-theme-divider flex flex-col items-center justify-center text-theme-textMuted hover:text-theme-orange hover:border-theme-orange transition-all bg-theme-bg">
                                                <span className="material-symbols-outlined text-2xl">add_photo_alternate</span>
                                                <span className="text-[8px] font-bold uppercase mt-1">Upload</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-theme-textMuted border-2 border-dashed border-theme-divider rounded-3xl m-4 bg-theme-bg/50">
                                    <span className="material-symbols-outlined text-6xl mb-4 opacity-50">photo_library</span>
                                    <h3 className="font-square font-black text-xl uppercase tracking-widest mb-2">Galeria Vazia</h3>
                                    <p className="text-xs mb-6 max-w-md text-center">Adicione renders, fotos de obra ou referências visuais para documentar o projeto.</p>
                                    <button onClick={() => galleryFileRef.current?.click()} className="bg-theme-orange text-white px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-orange-600 transition-all flex items-center gap-2">
                                        <span className="material-symbols-outlined">upload</span> Carregar Mídia
                                    </button>
                                </div>
                            )}
                            <input type="file" ref={galleryFileRef} className="hidden" multiple accept="image/*,video/*" onChange={handleGalleryUpload} />
                        </div>
                    </div>
                )}

                {/* --- TAB: FILES VIEW --- */}
                {activeTab === 'files' && hasProject && (
                    <div className="animate-fadeIn ds-card p-8 bg-theme-card min-h-[600px]">
                        <div className="flex justify-between items-center mb-8 border-b border-theme-divider pb-4">
                            <h3 className="font-square font-black text-xl uppercase tracking-widest text-theme-text flex items-center gap-3">
                                <span className="material-symbols-outlined text-theme-orange">folder_open</span> Central de Arquivos
                            </h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {activeProject.scopes.map(scope => (
                                <div key={scope.id} className="bg-theme-bg border border-theme-divider rounded-2xl p-5 hover:border-theme-orange transition-all group shadow-sm">
                                    <div className="flex items-center gap-3 mb-4 pb-3 border-b border-theme-divider">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: scope.colorClass }}></div>
                                        <span className="font-black text-xs text-theme-text uppercase tracking-wider flex-1">{scope.name}</span>
                                        <button onClick={() => { setSelectedScopeIdForFiles(scope.id); scopeFileRef.current?.click(); }} className="text-theme-textMuted hover:text-theme-orange"><span className="material-symbols-outlined">add_circle</span></button>
                                    </div>
                                    <div className="space-y-2 max-h-40 overflow-y-auto scroller pr-1">
                                        {scope.fileLinks && scope.fileLinks.length > 0 ? scope.fileLinks.map((f, i) => (
                                            <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-theme-card border border-theme-divider hover:bg-theme-highlight cursor-pointer">
                                                <span className="material-symbols-outlined text-theme-cyan text-sm">description</span>
                                                <span className="text-[10px] font-bold text-theme-text truncate flex-1">{f.label}</span>
                                                <span className="material-symbols-outlined text-theme-textMuted text-xs hover:text-theme-orange">download</span>
                                            </div>
                                        )) : <p className="text-[9px] text-theme-textMuted italic text-center py-2">Nenhum arquivo vinculado.</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* --- TAB: DATA VIEW --- */}
                {activeTab === 'data' && hasProject && (
                    <div className="animate-fadeIn ds-card p-8 bg-theme-card min-h-[600px] overflow-hidden flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-square font-black text-xl uppercase tracking-widest text-theme-text flex items-center gap-3">
                                <span className="material-symbols-outlined text-theme-orange">table_chart</span> Dados & Processos
                            </h3>
                            <button onClick={onAddDataRow} className="bg-theme-text text-theme-bg px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-theme-textMuted transition-all flex items-center gap-2 shadow-lg">
                                <span className="material-symbols-outlined text-sm">add</span> Nova Linha
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto scroller border border-theme-divider rounded-2xl bg-theme-bg shadow-inner">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-theme-card sticky top-0 z-10 shadow-sm">
                                    <tr>
                                        {['ORDEM', 'LOCAL', 'STATUS', 'ÁREA TERRENO', 'ÁREA CONSTR.', 'ÁREA VENDÁVEL', 'ZONEAMENTO', 'POTENCIAL', 'CORRETOR', 'RESP.', 'ATUALIZAÇÃO', 'AÇÕES'].map(h => (
                                            <th key={h} className="p-4 text-[9px] font-black text-theme-textMuted uppercase tracking-widest border-b border-theme-divider whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-theme-divider">
                                    {activeProject.dataRows?.map(row => (
                                        <tr key={row.id} className="hover:bg-theme-highlight transition-colors group">
                                            <td className="p-3"><input className="bg-transparent text-xs font-bold text-center w-12 outline-none text-theme-text" value={row.order} onChange={(e) => onUpdateDataRow(row.id, 'order', e.target.value)} /></td>
                                            <td className="p-3"><input className="bg-transparent text-xs font-medium w-full outline-none text-theme-text placeholder:text-theme-textMuted/50" placeholder="..." value={row.location} onChange={(e) => onUpdateDataRow(row.id, 'location', e.target.value)} /></td>
                                            <td className="p-3">
                                                <select className={`bg-transparent text-[9px] font-black uppercase outline-none px-2 py-1 rounded-full border ${row.status === 'VIÁVEL' ? 'border-theme-green text-theme-green bg-green-500/10' : row.status === 'STAND BY' ? 'border-orange-500 text-orange-500 bg-orange-500/10' : 'border-theme-divider text-theme-textMuted'}`} value={row.status} onChange={(e) => onUpdateDataRow(row.id, 'status', e.target.value)}>
                                                    <option value="NÃO INICIADO">NÃO INICIADO</option>
                                                    <option value="EM ANÁLISE">EM ANÁLISE</option>
                                                    <option value="VIÁVEL">VIÁVEL</option>
                                                    <option value="STAND BY">STAND BY</option>
                                                </select>
                                            </td>
                                            <td className="p-3"><input className="bg-transparent text-xs font-mono text-theme-text w-20 outline-none" value={row.landArea} onChange={(e) => onUpdateDataRow(row.id, 'landArea', e.target.value)} /></td>
                                            <td className="p-3"><input className="bg-transparent text-xs font-mono text-theme-text w-20 outline-none" value={row.builtArea} onChange={(e) => onUpdateDataRow(row.id, 'builtArea', e.target.value)} /></td>
                                            <td className="p-3"><input className="bg-transparent text-xs font-mono text-theme-text w-20 outline-none" value={row.salesArea} onChange={(e) => onUpdateDataRow(row.id, 'salesArea', e.target.value)} /></td>
                                            <td className="p-3"><input className="bg-transparent text-xs text-theme-text w-24 outline-none" value={row.zoning} onChange={(e) => onUpdateDataRow(row.id, 'zoning', e.target.value)} /></td>
                                            <td className="p-3"><input className="bg-transparent text-xs text-theme-text w-20 outline-none" value={row.potential} onChange={(e) => onUpdateDataRow(row.id, 'potential', e.target.value)} /></td>
                                            <td className="p-3"><input className="bg-transparent text-xs text-theme-text w-24 outline-none" value={row.broker} onChange={(e) => onUpdateDataRow(row.id, 'broker', e.target.value)} /></td>
                                            <td className="p-3"><select className="bg-transparent text-[10px] text-theme-text w-24 outline-none uppercase font-bold" value={row.resp} onChange={(e) => onUpdateDataRow(row.id, 'resp', e.target.value)}><option value="">-</option>{db.team.map(t => <option key={t} value={t}>{t}</option>)}</select></td>
                                            <td className="p-3 text-[10px] font-mono text-theme-textMuted">{row.updatedAt}</td>
                                            <td className="p-3 text-center"><button onClick={() => onDeleteDataRow(row.id)} className="text-red-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><span className="material-symbols-outlined text-lg">delete</span></button></td>
                                        </tr>
                                    ))}
                                    {(!activeProject.dataRows || activeProject.dataRows.length === 0) && (
                                        <tr><td colSpan={12} className="p-8 text-center text-xs text-theme-textMuted font-bold uppercase tracking-widest">Nenhum dado registrado</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};