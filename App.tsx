import React, { useState, useMemo, useRef, useEffect, useCallback, Suspense } from 'react';

import { INITIAL_DB, MAX_CHAT_HISTORY } from './constants';

import { DB, ChatMessage, Project, Event, Company, ProjectDataRow, Scope, Dependency, ChecklistItem, Activity, FileLink, GalleryImage, GalleryFolder, ProtocolData, ProtocolRevision, ProtocolFolder, ProjectDetails, PavementType } from './types';

import { generateChatResponse, isAiConnected } from './services/geminiService';

import {

    LodModal, CompanyModal, ProjectModal, ScopeModal, EventModal,

    ChecklistModal, TeamModal, TimelineSettingsModal, AdminSettingsModal, DisciplinesManagerModal, LoginModal, UploadInstructionsModal

} from './components/Modals';

import { ProfileCompletionModal } from './components/ProfileCompletionModal';

import { TextReveal } from './components/ui/TextReveal';

import { parseLocalDate, formatLocalDate } from './utils/dateUtils';
import { upsertMember, removeMember, deriveTeam } from './utils/membersHelper';

import { readFileAsDataURL } from './utils/fileReaderUtils';
import { validateFileSize } from './utils/validation';

// Code-split heavy tab components for faster initial load
const Timeline = React.lazy(() => import('./components/Timeline'));
const Agenda = React.lazy(() => import('./components/Agenda').then(m => ({ default: m.Agenda })));
const NotesTab = React.lazy(() => import('./components/NotesTab').then(m => ({ default: m.NotesTab })));
const ColaboradorTab = React.lazy(() => import('./components/ColaboradorTab').then(m => ({ default: m.ColaboradorTab })));
const FinanceiroTab = React.lazy(() => import('./components/FinanceiroTab').then(m => ({ default: m.FinanceiroTab })));
const ComprasTab = React.lazy(() => import('./components/ComprasTab').then(m => ({ default: m.ComprasTab })));
const ContractsManager = React.lazy(() => import('./components/ContractsManager').then(m => ({ default: m.ContractsManager })));
const FlipBook = React.lazy(() => import('./components/FlipBook').then(m => ({ default: m.FlipBook })));
const Panorama360 = React.lazy(() => import('./components/Panorama360').then(m => ({ default: m.Panorama360 })));
const GalleryTab = React.lazy(() => import('./components/GalleryTab').then(m => ({ default: m.GalleryTab })));
const WeeklyAgenda = React.lazy(() => import('./components/WeeklyAgenda'));
import { CollaborativeHub } from './components/CollaborativeHub';



type Tab = 'timeline' | 'gallery' | 'files' | 'data' | 'viabilidade' | 'financeiro' | 'compras' | 'notas' | 'colaborador' | 'agenda_semana';



import { useApp } from './contexts/AppContext';
import { useConfirm } from './components/ConfirmDialog';
import { ViabilidadesPanel } from './components/ViabilidadesPanel';
import { Viability, ViabilityVersion } from './types';



export const App = () => {

    const {

        db, setDb, theme, setTheme, currentUser, setCurrentUser,

        notification, setNotification, addLog, handleManualSave,

        handleExportJSON, handleImportJSON, activeProject, activeCompany,

        handleLogout,

        onlineUsers, isRealtimeConnected, simulationActive,
        collaborationToast,
        setActiveTab: ctxSetActiveTab,
        showProfileModal,
        setShowProfileModal,
        isViewer

    } = useApp();

    const { requestConfirm, showAlert } = useConfirm();

    const [activeTab, setActiveTab] = useState<Tab>('timeline');

    // Sync local activeTab with global context so collaboration hook knows which tab we're on
    useEffect(() => {
        ctxSetActiveTab(activeTab);
    }, [activeTab, ctxSetActiveTab]);

    const [activeTimelineView, setActiveTimelineView] = useState<'timeline' | 'agenda'>('timeline');



    // Filters & UI State

    const [deadlineRespFilter, setDeadlineRespFilter] = useState('');

    const [logSearch, setLogSearch] = useState('');

    const [logAuthorFilter, setLogAuthorFilter] = useState('');

    const [zoomLevel, setZoomLevel] = useState<number>(1);



    const [activityImage, setActivityImage] = useState<string | undefined>(undefined);

    const activityFileRef = useRef<HTMLInputElement>(null);

    const [activeHealthTab, setActiveHealthTab] = useState<'total' | 'progress' | 'done' | 'efficiency'>('efficiency');

    const [viewingImage, setViewingImage] = useState<string | null>(null);

    const [memberFilter, setMemberFilter] = useState<string | null>(null);



    // Gallery State

    const [currentGalleryIndex, setCurrentGalleryIndex] = useState(-1);

    const [selectedGalleryFolderId, setSelectedGalleryFolderId] = useState<string | null>(null);
    const [gallerySubTab, setGallerySubTab] = useState<'midia' | 'ebook' | '360'>('midia');

    const galleryFileRef = useRef<HTMLInputElement>(null);



    // Modals state

    const [showLodModal, setShowLodModal] = useState(false);

    // Reset gallery state when project changes
    useEffect(() => {
        setSelectedGalleryFolderId(null);
        setCurrentGalleryIndex(0);
    }, [activeProject?.id]);

    const [showCompanyModal, setShowCompanyModal] = useState(false);

    const [showProjectModal, setShowProjectModal] = useState(false);

    const [showScopeModal, setShowScopeModal] = useState(false);

    const [showDisciplinesModal, setShowDisciplinesModal] = useState(false);

    const [showEventModal, setShowEventModal] = useState(false);

    const [showChecklistModal, setShowChecklistModal] = useState(false);

    const [showTeamModal, setShowTeamModal] = useState(false);

    const [showSettingsModal, setShowSettingsModal] = useState(false);

    const [showAdminModal, setShowAdminModal] = useState(false);

    const [showLoginModal, setShowLoginModal] = useState(false);

    const [showUploadInstructionsModal, setShowUploadInstructionsModal] = useState(false);

    useEffect(() => {
        if (currentUser && !currentUser.profileCompleted) {
            setShowProfileModal(true);
        }
    }, [currentUser, setShowProfileModal]);

    const [newEventDate, setNewEventDate] = useState<string | undefined>(undefined); // New State for Agenda

    const [showViabilidadesModal, setShowViabilidadesModal] = useState(false);

    // Prompt dialog state (replaces browser prompt())
    const [promptDialog, setPromptDialog] = useState<{ title: string; value: string; onSubmit: (value: string) => void } | null>(null);



    // Chat

    const [chatOpen, setChatOpen] = useState(false);

    const [chatQuery, setChatQuery] = useState('');

    const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'ai', text: string }[]>([]);

    const [isTyping, setIsTyping] = useState(false);

    // Report modal
    const [showReportModal, setShowReportModal] = useState(false);
    const [reportText, setReportText] = useState('');
    const [reportTitle, setReportTitle] = useState('Relatório Executivo');
    const [isPolishingReport, setIsPolishingReport] = useState(false);

    // Banco de Horas modal
    const [showHorasModal, setShowHorasModal] = useState(false);
    const [horasFilterMember, setHorasFilterMember] = useState<string>('todos');



    // Selection IDs

    const [editingScopeId, setEditingScopeId] = useState<string | null>(null);

    const [editingEventId, setEditingEventId] = useState<string | null>(null);

    const [selectedScopeIdForFiles, setSelectedScopeIdForFiles] = useState<string | null>(null);

    const [activeScopeIdForEvent, setActiveScopeIdForEvent] = useState<string | null>(null);

    const [activeChecklistIds, setActiveChecklistIds] = useState<{ sid: string; eid: string } | null>(null);



    // New File Modal State

    const [showFileModal, setShowFileModal] = useState(false);

    const [pendingUploadFile, setPendingUploadFile] = useState<{ file: File, scopeId: string } | null>(null);

    const [viewingFile, setViewingFile] = useState<{ path: string, type: 'pdf' | 'image' } | null>(null);


    const [fileMemberFilter, setFileMemberFilter] = useState<string | null>(null);



    // Protocol Data state

    const [dataSubTab, setDataSubTab] = useState<'dados' | 'protocolo'>('dados');
    const [financeiroSubTab, setFinanceiroSubTab] = useState<'powerbi' | 'contratos'>('powerbi');

    const [newRevisionText, setNewRevisionText] = useState('');

    const [newRevisionStatus, setNewRevisionStatus] = useState<'stopped' | 'approved' | 'needs_correction'>('stopped');

    const protocolFileRef = useRef<HTMLInputElement>(null);

    const [selectedProtocolFolder, setSelectedProtocolFolder] = useState<string>('legal_arq');

    const [newFolderName, setNewFolderName] = useState('');

    const [showNewFolderInput, setShowNewFolderInput] = useState(false);



    // Time Tracker State

    const [activeTimer, setActiveTimer] = useState<{ startTime: string; activity: string; scopeId?: string; eventId?: string } | null>(null);

    const [elapsedTime, setElapsedTime] = useState(0);

    const [timerScopeId, setTimerScopeId] = useState<string>("");

    const [timerEventId, setTimerEventId] = useState<string>("");

    const [editingLogId, setEditingLogId] = useState<string | null>(null); // For editing logs



    // Timer Effect

    useEffect(() => {

        let interval: NodeJS.Timeout;

        if (activeTimer) {

            interval = setInterval(() => {

                const start = new Date(activeTimer.startTime).getTime();

                const now = new Date().getTime();

                setElapsedTime(Math.floor((now - start) / 1000));

            }, 1000);

        } else {

            setElapsedTime(0);

        }

        return () => clearInterval(interval);

    }, [activeTimer]);



    const formatTime = (seconds: number) => {

        const h = Math.floor(seconds / 3600);

        const m = Math.floor((seconds % 3600) / 60);

        const s = seconds % 60;

        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

    };



    const handleStartTimer = (activity: string) => {

        if (!activeProject || !currentUser) return showAlert("Selecione um projeto e faça login primeiro.");

        if (!activity.trim()) return showAlert("Descreva a atividade.");



        setActiveTimer({

            startTime: new Date().toISOString(),

            activity,

            scopeId: timerScopeId || undefined,

            eventId: timerEventId || undefined

        });

        const scopeName = timerScopeId ? activeProject.scopes.find(s => s.id === timerScopeId)?.name : '';

        addLog(currentUser.name, `INICIOU CRONÔMETRO: ${activity} ${scopeName ? `[${scopeName}]` : ''}`);

    };



    const handleStopTimer = () => {

        if (!activeProject || !activeTimer || !currentUser) return;

        const projectId = activeProject.id;
        const endTime = new Date().toISOString();

        const start = new Date(activeTimer.startTime);

        const end = new Date(endTime);

        const duration = Math.floor((end.getTime() - start.getTime()) / 1000);



        const newLog: import('./types').TimeLog = {

            id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,

            projectId: projectId,

            userId: currentUser.name,

            activity: activeTimer.activity,

            scopeId: activeTimer.scopeId,

            eventId: activeTimer.eventId,

            startTime: activeTimer.startTime,

            endTime: endTime,

            duration: duration

        };



        setDb(prev => ({

            ...prev,

            projects: prev.projects.map(p => p.id === projectId ? {

                ...p,

                timeLogs: [newLog, ...(p.timeLogs || [])],

                updatedAt: new Date().toISOString()

            } : p)

        }));



        addLog(currentUser.name, `FINALIZOU: ${activeTimer.activity} (${formatTime(duration)})`);

        setActiveTimer(null);

        setElapsedTime(0);

        setTimerScopeId("");

        setTimerEventId("");

    };



    const handleUpdateLog = (logId: string, newDuration: number) => {

        if (!activeProject) return;

        const projectId = activeProject.id;
        setDb(prev => ({

            ...prev,

            projects: prev.projects.map(p => p.id === projectId ? {

                ...p,

                timeLogs: p.timeLogs?.map(log => log.id === logId ? { ...log, duration: newDuration } : log)

            } : p)

        }));

        setEditingLogId(null);

    };



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

        activeProject.scopes.forEach(s => { const scopeStart = parseLocalDate(s.startDate).getTime(); if (scopeStart < minStart) minStart = scopeStart; hasData = true; s.events.forEach(e => { const eventEnd = parseLocalDate(e.endDate).getTime(); if (eventEnd > maxEnd) maxEnd = eventEnd; }); });

        if (maxEnd < minStart) maxEnd = new Date(minStart).getTime() + (30 * 24 * 60 * 60 * 1000);

        return { start: hasData ? new Date(minStart).toISOString().split('T')[0] : activeProject.timelineStart, end: hasData ? new Date(maxEnd).toISOString().split('T')[0] : activeProject.timelineEnd };

    }, [activeProject]);



    const safeParseDate = (dateStr: string | undefined, fallback: string = '2026-01-01') => {

        if (!dateStr) return parseLocalDate(fallback);

        const d = parseLocalDate(dateStr);

        return isNaN(d.getTime()) ? parseLocalDate(fallback) : d;

    };



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
        setShowLoginModal(true);
    };

    const handleProfileComplete = (profile: { name: string; role: string; avatarUrl: string; companyTime?: string }) => {
        if (currentUser) {
            setCurrentUser({
                ...currentUser,
                name: profile.name,
                avatar: profile.avatarUrl,
                role: profile.role,
                profileCompleted: true,
                companyTime: profile.companyTime
            });
        } else {
            setCurrentUser({
                id: 'demo_user',
                name: profile.name,
                avatar: profile.avatarUrl,
                role: profile.role,
                profileCompleted: true,
                companyTime: profile.companyTime
            });
        }

        setDb(prev => {
            const members = upsertMember(prev.members || [], {
                id: currentUser?.id && currentUser.id !== 'demo_user' ? currentUser.id : undefined,
                name: profile.name,
                role: profile.role,
                avatarUrl: profile.avatarUrl,
                source: currentUser?.id && currentUser.id !== 'demo_user' ? 'login' : 'manual',
            });
            if (members === prev.members) return prev;
            return { ...prev, members, team: deriveTeam(members) };
        });

        localStorage.setItem('enigami_profile_completed', 'true');
        setShowProfileModal(false);
        setNotification(`Perfil atualizado e ${profile.name} adicionado à equipe técnica!`);
    };



    const onAddFile = (scopeId: string, label: string, path: string) => {

        const author = currentUser?.name || 'SISTEMA';

        const createdAt = new Date().toISOString();



        setDb(prev => {

            const activePId = prev.activeProjectId;

            if (!activePId) return prev;



            return {

                ...prev,

                projects: prev.projects.map(p => p.id === activePId ? {

                    ...p,

                    updatedAt: new Date().toISOString(),

                    scopes: p.scopes.map(s => s.id === scopeId ? {

                        ...s,

                        fileLinks: [...(s.fileLinks || []), { label, path, author, createdAt }]

                    } : s)

                } : p)

            };

        });

        addLog("SISTEMA", `ARQUIVO VINCULADO: ${label}`);

        setNotification("Arquivo vinculado com sucesso!");

    };





    const onUpdateCompany = (id: number, name: string, logoUrl?: string) => { if (isViewer) return; setDb(prev => ({ ...prev, companies: prev.companies.map(c => c.id === id ? { ...c, name, logoUrl } : c) })); addLog("SISTEMA", `CLIENTE ATUALIZADO: ${name}`); };

    const onDeleteScope = useCallback((sid: string) => { if (isViewer) return; if (!activeProject) return; const projectId = activeProject.id; setDb(prev => ({ ...prev, projects: prev.projects.map(p => p.id === projectId ? { ...p, updatedAt: new Date().toISOString(), scopes: p.scopes.filter(s => s.id !== sid) } : p) })); if (selectedScopeIdForFiles === sid) setSelectedScopeIdForFiles(null); addLog("SISTEMA", `DISCIPLINA REMOVIDA`); }, [activeProject, selectedScopeIdForFiles, addLog, isViewer]);

    const onDeleteFile = (sid: string, fidx: number) => { if (isViewer) return; if (!activeProject) return; const projectId = activeProject.id; setDb(prev => ({ ...prev, projects: prev.projects.map(p => p.id === projectId ? { ...p, updatedAt: new Date().toISOString(), scopes: p.scopes.map(s => s.id === sid ? { ...s, fileLinks: s.fileLinks?.filter((_, i) => i !== fidx) } : s) } : p) })); addLog("SISTEMA", `ARQUIVO REMOVIDO`); };

    const onUpdatePowerBiUrl = (url: string) => { if (isViewer) return; if (!activeProject) return; const projectId = activeProject.id; setDb(prev => ({ ...prev, projects: prev.projects.map(p => p.id === projectId ? { ...p, powerBiUrl: url } : p) })); };



    const onDeleteEvent = useCallback((sid: string, eid: string) => { if (isViewer) return; if (!activeProject) return; const projectId = activeProject.id; setDb(prev => ({ ...prev, projects: prev.projects.map(p => p.id === projectId ? { ...p, updatedAt: new Date().toISOString(), scopes: p.scopes.map(s => s.id === sid ? { ...s, events: s.events.filter(e => e.id !== eid) } : s) } : p) })); addLog("SISTEMA", `AÇÃO REMOVIDA`); }, [activeProject, addLog, isViewer]);

    const onToggleDependency = (sid: string, eid: string, targetId: string) => { if (isViewer) return; const projectId = activeProject?.id; if (!projectId) return; setDb(prev => ({ ...prev, projects: prev.projects.map(p => p.id === projectId ? { ...p, scopes: p.scopes.map(s => s.id === sid ? { ...s, events: s.events.map(ev => ev.id === eid ? { ...ev, dependencies: ev.dependencies?.find(d => d.id === targetId) ? ev.dependencies.filter(d => d.id !== targetId) : [...(ev.dependencies || []), { id: targetId, type: 'FS' as const }] } : ev) } : s) } : p) })); };

    const onChangeDependencyType = (sid: string, eid: string, targetId: string) => { if (isViewer) return; const projectId = activeProject?.id; if (!projectId) return; const types = ['FS', 'SS', 'FF', 'SF'] as const; setDb(prev => ({ ...prev, projects: prev.projects.map(p => p.id === projectId ? { ...p, scopes: p.scopes.map(s => s.id === sid ? { ...s, events: s.events.map(e => e.id === eid ? { ...e, dependencies: (e.dependencies || []).map(d => d.id === targetId ? { ...d, type: types[(types.indexOf(d.type) + 1) % types.length] } : d) } : e) } : s) } : p) })); };

    const onAddDependency = useCallback((sourceId: string, targetId: string, type: 'FS' | 'SS' | 'FF' | 'SF') => { if (isViewer) return; if (!activeProject) return; const projectId = activeProject.id; const sourceScope = activeProject.scopes.find(s => s.events.some(e => e.id === sourceId)); if (!sourceScope) return; const targetScope = activeProject.scopes.find(s => s.events.some(e => e.id === targetId)); if (!targetScope) return; const targetEvent = targetScope.events.find(e => e.id === targetId); if (targetEvent?.dependencies?.some(d => d.id === sourceId)) { setNotification("Vínculo já existe!"); return; } setDb(prev => ({ ...prev, projects: prev.projects.map(p => p.id === projectId ? { ...p, updatedAt: new Date().toISOString(), scopes: p.scopes.map(s => s.id === targetScope.id ? { ...s, events: s.events.map(e => e.id === targetId ? { ...e, dependencies: [...(e.dependencies || []), { id: sourceId, type }] } : e) } : s) } : p) })); addLog("SISTEMA", `VÍNCULO CRIADO: ${type}`); }, [activeProject, setNotification, addLog, isViewer]);

    const onDeleteProject = (id: number) => { if (isViewer) return; setDb(prev => ({ ...prev, projects: prev.projects.filter(p => p.id !== id), activeProjectId: prev.activeProjectId === id ? null : prev.activeProjectId })); };

    const onEditProject = (id: number, name: string, logo?: string, cover?: string) => { if (isViewer) return; setDb(prev => ({ ...prev, projects: prev.projects.map(p => p.id === id ? { ...p, name, logoUrl: logo, coverUrl: cover, updatedAt: new Date().toISOString() } : p) })); };



    const printDashboard = () => { window.print(); addLog("SISTEMA", "DASHBOARD ENVIADO PARA IMPRESSÃO"); };



    const filteredActivities = useMemo(() => { if (!activeProject) return []; return activeProject.activities.filter(a => { const matchText = a.text.toLowerCase().includes(logSearch.toLowerCase()); const matchAuthor = logAuthorFilter === '' || a.author === logAuthorFilter.toUpperCase(); return matchText && matchAuthor; }); }, [activeProject, logSearch, logAuthorFilter]);

    // Stats: Calculated ONLY when the project actually changes

    const stats = useMemo(() => {

        if (!activeProject) return { tot: 0, don: 0, lat: 0, rate: 0, inProgress: 0, taskCount: 0, totalTime: 0 };



        let totItems = 0; let donItems = 0; let latEvents = 0; let inProg = 0; let tasks = 0;

        const today = new Date();



        // Optimized walkthrough: only compute necessary metrics

        activeProject.scopes.forEach(sc => {

            sc.events.forEach(ev => {

                tasks++;

                const applicableChecklist = ev.checklist ? ev.checklist.filter(i => i.status !== 'na') : [];
                const items = applicableChecklist.length > 0 ? applicableChecklist.length : 1;
                const done = applicableChecklist.length > 0 ? applicableChecklist.filter(i => i.done).length : (ev.completed ? 1 : 0);

                totItems += items;

                donItems += done;

                if (!ev.completed && parseLocalDate(ev.startDate) <= today) { inProg++; }

                if (!ev.completed && parseLocalDate(ev.endDate) < today) latEvents++;

            });

        });



        const totalTime = activeProject.timeLogs?.reduce((acc, log) => acc + log.duration, 0) || 0;



        return {

            tot: totItems,

            don: donItems,

            lat: latEvents,

            rate: totItems ? Math.round((donItems / totItems) * 100) : 0,

            inProgress: inProg,

            taskCount: tasks,

            totalTime

        };

    }, [activeProject?.id, activeProject?.updatedAt]); // Only recompute on ID or update timestamp



    // --- EFFECT: DATA MIGRATION & DEFAULT FOLDERS ---
    const migrationLock = useRef<string | null>(null);

    useEffect(() => {
        if (!activeProject) return;

        // Prevent infinite migration loops for the same project version
        const lockKey = `${activeProject.id}-${activeProject.updatedAt}-${activeProject.galleryFolders?.length || 0}`;
        if (migrationLock.current === lockKey) return;

        const currentGalleryFolders = activeProject.galleryFolders || [];
        const legacyProj = activeProject as Project & { gallery?: GalleryImage[] };
        const hasLegacyGallery = legacyProj.gallery && legacyProj.gallery.length > 0;
        const hasFolders = currentGalleryFolders.length > 0;

        if (hasLegacyGallery || !hasFolders) {
            const projectId = activeProject.id;
            console.log("Migration: Iniciando para", projectId);
            migrationLock.current = lockKey;

            setDb(prev => {
                const proj = prev.projects.find(p => p.id === projectId);
                if (!proj) return prev;
                const legacyFields = proj as Project & { gallery?: GalleryImage[] };
                const migratedFolders: GalleryFolder[] = (!proj.galleryFolders || proj.galleryFolders.length === 0)
                    ? [{ id: 'default-system-folder', name: 'Geral', images: legacyFields.gallery || [] }]
                    : proj.galleryFolders;

                const { gallery: _removed, ...cleanProj } = legacyFields;
                const newProj: Project = {
                    ...cleanProj,
                    galleryFolders: migratedFolders,
                    updatedAt: new Date().toISOString(),
                };

                return {
                    ...prev,
                    projects: prev.projects.map(p => p.id === projectId ? newProj : p)
                };
            });
        }
    }, [activeProject?.id, activeProject?.updatedAt]);

    const onUpdateProjectDetails = useCallback((field: keyof ProjectDetails, value: ProjectDetails[keyof ProjectDetails]) => {
        if (isViewer) return;
        if (!activeProject) return;
        const projectId = activeProject.id;
        setDb(prev => ({
            ...prev,
            projects: prev.projects.map(p => p.id === projectId ? {
                ...p,
                details: {
                    ...(p.details || { pavements: [], totalParkingSpaces: 0, totalLeisureArea: '', landArea: '', builtArea: '', salesArea: '', zoning: '', height: '', location: '', broker: '', resp: '' }),
                    [field]: value
                },
                updatedAt: new Date().toISOString()
            } : p)
        }));
    }, [activeProject, isViewer]);

    const progressPercentage = useMemo(() => { if (!activeProject) return 0; const start = new Date(activeProject.createdAt); const end = new Date(projectBounds.end); const today = new Date(); if (today < start) return 0; if (today > end) return 100; const totalDuration = end.getTime() - start.getTime(); const elapsed = today.getTime() - start.getTime(); if (totalDuration <= 0) return 0; return Math.min(Math.max((elapsed / totalDuration) * 100, 0), 100); }, [activeProject, projectBounds]);

    const projectHealth = useMemo(() => { if (!activeProject) return { label: '---', color: 'text-theme-textMuted', border: 'border-theme-card', bg: 'bg-theme-card' }; const today = new Date(); const isAnyEventLate = activeProject.scopes.some(scope => scope.events.some(ev => { const endDate = new Date(ev.endDate); return !ev.completed && today > endDate; })); if (isAnyEventLate) { return { label: 'CRÍTICO', color: 'text-theme-red', border: 'border-theme-red', bg: 'bg-theme-red/10' }; } const diff = stats.rate - progressPercentage; if (diff < 0) return { label: 'ATENÇÃO', color: 'text-yellow-500', border: 'border-yellow-500', bg: 'bg-yellow-500/10' }; return { label: 'ESTÁVEL', color: 'text-theme-green', border: 'border-theme-green', bg: 'bg-theme-green/10' }; }, [activeProject, stats.rate, progressPercentage]);


    // Generate Project Report - works 100% locally, no API required

    const generateProjectReport = () => {

        if (!activeProject) return;

        setNotification("Gerando Relatório...");



        const today = new Date();

        const fmt = (d: string) => { try { return parseLocalDate(d).toLocaleDateString('pt-BR'); } catch { return d; } };

        const allEvents = activeProject.scopes.flatMap(s => s.events.map(e => ({ ...e, scopeName: s.name, scopeResp: s.resp })));

        const completed = allEvents.filter(e => e.completed);

        const lateEvents = allEvents.filter(e => !e.completed && parseLocalDate(e.endDate) < today);

        const upcoming = allEvents.filter(e => {

            const end = parseLocalDate(e.endDate);

            const diff = (end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);

            return !e.completed && diff >= 0 && diff <= 14;

        });

        const totalLoggedSec = (activeProject.timeLogs || []).reduce((a, l) => a + (l.duration || 0), 0);

        const totalHours = (totalLoggedSec / 3600).toFixed(1);

        const progressPct = allEvents.length > 0 ? Math.round((completed.length / allEvents.length) * 100) : 0;

        const pendingNotes = (activeProject.notes || []).filter(n => n.status !== 'completed');

        const pd = activeProject.protocolData;



        const healthIcon = lateEvents.length > 0 ? '🔴' : upcoming.length > 0 ? '🟡' : '🟢';

        const healthLabel = lateEvents.length > 0 ? 'CRÍTICO' : upcoming.length > 0 ? 'ATENÇÃO' : 'ESTÁVEL';



        const lines: string[] = [

            `## 📊 RELATÓRIO EXECUTIVO — ${activeProject.name.toUpperCase()}`,

            `**Data:** ${today.toLocaleDateString('pt-BR')} · **Fase:** ${activeProject.lod || '—'} · **Saúde:** ${healthIcon} ${healthLabel}`,

            `**Progresso:** ${progressPct}% (${completed.length}/${allEvents.length} AÇÕES) · **Horas Rastreadas:** ${totalHours}h`,

            `**Período:** ${fmt(activeProject.timelineStart)} → ${fmt(activeProject.timelineEnd)}`,

            '',

        ];



        // Late Actions

        if (lateEvents.length > 0) {

            lines.push('### 🚨 AÇÕES EM ATRASO');

            lateEvents.forEach(e => {

                lines.push(`• **${e.title}** — ${e.scopeName} · Resp: ${e.resp || '—'} · Prazo: ${fmt(e.endDate)}`);

            });

            lines.push('');

        }



        // Upcoming

        if (upcoming.length > 0) {

            lines.push('### ⏰ PRÓXIMOS 14 DIAS');

            upcoming.forEach(e => {

                const days = Math.round((parseLocalDate(e.endDate).getTime() - today.getTime()) / 86400000);

                lines.push(`• **${e.title}** — ${e.scopeName} · Resp: ${e.resp || '—'} · Prazo: ${fmt(e.endDate)} (${days}d)`);

            });

            lines.push('');

        }



        // Disciplines

        lines.push('### 🏗️ STATUS POR DISCIPLINA');

        activeProject.scopes.forEach(s => {

            const done = s.events.filter(e => e.completed).length;

            const total = s.events.length;

            const late = s.events.filter(e => !e.completed && parseLocalDate(e.endDate) < today).length;

            const pct = total > 0 ? Math.round((done / total) * 100) : 0;

            const icon = late > 0 ? '🔴' : done === total && total > 0 ? '✅' : '🔵';

            let statusLabel = '';

            if (s.status === 'done') statusLabel = ' · FINALIZADA';

            else if (s.status === 'walking' || s.status === 'running') statusLabel = ' · EM ANDAMENTO';

            lines.push(`${icon} **${s.name}**${statusLabel} · Líder: ${s.resp || '—'} · ${done}/${total} AÇÕES (${pct}%)${late > 0 ? ` · ⚠️ ${late} atrasada(s)` : ''}`);

        });

        lines.push('');



        // Protocol

        if (pd && (pd.protocolNumber || pd.prefecture)) {

            const statusMap: Record<string, string> = { stopped: '⏸️ Parado', approved: '✅ Aprovado', needs_correction: '⚠️ Correções' };

            lines.push('### 🏛️ PROTOCOLO MUNICIPAL');

            lines.push(`• **Nº** ${pd.protocolNumber || '—'} · **Prefeitura:** ${pd.prefecture || '—'}`);

            lines.push(`• **Status:** ${statusMap[pd.status] || pd.status} · **Revisões:** ${(pd.revisions?.length || 0)}`);

            lines.push('');

        }



        // Data Rows

        if ((activeProject.dataRows || []).length > 0) {

            lines.push('### 🗺️ TERRENOS / VIABILIDADE');

            activeProject.dataRows!.forEach(r => {

                lines.push(`• **${r.location || '—'}** · ${r.status} · Zoneamento: ${r.zoning || '—'} · Aproveitamento: ${r.potential || '—'}`);

            });

            lines.push('');

        }



        // Pending notes

        if (pendingNotes.length > 0) {

            lines.push('### 📝 NOTAS PENDENTES');

            pendingNotes.slice(0, 5).forEach(n => {

                lines.push(`• ${n.text.slice(0, 80)}${n.deadline ? ` · Prazo: ${fmt(n.deadline)}` : ''}${n.recipient ? ` · Para: ${n.recipient}` : ''}`);

            });

            if (pendingNotes.length > 5) lines.push(`  _(+ ${pendingNotes.length - 5} notas)_`);

            lines.push('');

        }



        // Team

        if (db.team.length > 0) {

            lines.push(`**Equipe:** ${db.team.join(', ')}`);

        }



        const report = lines.join('\n');

        setReportTitle('Relatório Executivo');
        setReportText(report);
        setShowReportModal(true);
        setNotification("Relatório gerado com sucesso!");

    };



    // ── Contexto compartilhado enviado à IA ─────────────────────────────
    // Reúne o macro (cronograma), disciplinas, equipe e agenda semanal para
    // que relatórios e planejamentos usem os dados reais do workspace.
    const buildProjectAIContext = useCallback(() => {
        const today = new Date();
        if (!activeProject) return null;
        const agendaSource = activeCompany?.agendaTasks?.length ? activeCompany.agendaTasks : (activeProject.agendaTasks || []);
        return {
            projectName: activeProject.name,
            lod: activeProject.lod,
            currentDate: today.toLocaleDateString('pt-BR'),
            timelineStart: activeProject.timelineStart,
            timelineEnd: activeProject.timelineEnd,
            disciplines: db.disciplines.map(d => ({ code: d.code, name: d.name })),
            team: (db.members || []).map(m => ({
                name: m.name,
                role: m.role || 'Colaborador',
                capacity: m.capacity ?? 10,
                coordinator: !!m.coordinator
            })),
            scopes: activeProject.scopes.map(s => ({
                name: s.name,
                disciplineName: db.disciplines.find(d => d.code === s.name)?.name || s.name,
                resp: s.resp,
                status: s.status,
                events: s.events.map(e => ({
                    title: e.title,
                    resp: e.resp,
                    startDate: e.startDate,
                    endDate: e.endDate,
                    completed: e.completed,
                    late: !e.completed && new Date(e.endDate) < today,
                    checklistPending: (e.checklist || []).filter(c => !c.done).map(c => c.text).slice(0, 6)
                }))
            })),
            weeklyAgenda: agendaSource.slice(-80).map(t => ({
                text: t.text,
                day: t.day,
                assignee: t.assignee,
                disc: t.disc,
                status: t.status,
                weekKey: t.weekKey,
                standby: !!t.standby
            })),
            notes: (activeProject.notes || []).filter(n => n.status !== 'completed').map(n => ({ text: n.text.slice(0, 100), recipient: n.recipient, deadline: n.deadline })),
            contracts: (activeProject.contracts || []).map(c => ({ name: c.name, supplier: c.supplier, totalValue: c.totalValue, status: c.status, responsible: c.responsible })),
            timeLogs: {
                totalHours: ((activeProject.timeLogs || []).reduce((a, l) => a + l.duration, 0) / 3600).toFixed(1),
                sessions: (activeProject.timeLogs || []).length
            },
            protocol: activeProject.protocolData ? {
                number: activeProject.protocolData.protocolNumber,
                prefecture: activeProject.protocolData.prefecture,
                status: activeProject.protocolData.status
            } : null
        };
    }, [activeProject, activeCompany, db.disciplines, db.members]);



    // ── Planejamento Semanal gerado pela IA a partir do macro ───────────
    const generateWeeklyPlanAI = async () => {
        if (!activeProject || isTyping) return;
        const context = buildProjectAIContext();
        if (!context) return;

        setIsTyping(true);
        setNotification("IA montando o planejamento semanal a partir do macro...");

        try {
            const monday = new Date();
            monday.setHours(0, 0, 0, 0);
            const dow = monday.getDay() === 0 ? 7 : monday.getDay();
            monday.setDate(monday.getDate() - (dow - 1) + 7); // segunda-feira da próxima semana
            const friday = new Date(monday);
            friday.setDate(monday.getDate() + 4);
            const fmtBr = (d: Date) => d.toLocaleDateString('pt-BR');

            const systemInstruction = `Você é ENIGAMI AI, planejador sênior de projetos de arquitetura e engenharia.
Sua tarefa: transformar o planejamento MACRO (cronograma de disciplinas e ações) em um planejamento semanal MICRO, realista e acionável.
Regras:
- Responda em Português brasileiro, em markdown (## títulos, tabelas ou listas com -).
- Estruture por dia (Segunda a Sexta) e por colaborador, respeitando a capacidade semanal (pontos) de cada um.
- Priorize: 1) ações atrasadas, 2) ações que vencem na semana, 3) ações que iniciam na semana, 4) checklists pendentes.
- Cite disciplina, responsável e prazo reais dos dados. Não invente atividades nem pessoas.
- Aponte sobrecargas de capacidade e sugira redistribuição.
- Termine com um bloco "### ⚠️ Riscos & Pontos de Coordenação" com no máximo 5 itens.`;

            const query = `[DADOS DO PROJETO (MACRO + EQUIPE + AGENDA ATUAL)]:\n${JSON.stringify(context, null, 1)}\n\n[TAREFA]: Gere o planejamento semanal de ${fmtBr(monday)} a ${fmtBr(friday)} para a equipe, derivado do planejamento macro acima. Considere as tarefas já existentes na agenda semanal para não duplicar.`;

            const plan = await generateChatResponse(query, systemInstruction);

            setReportTitle('Planejamento Semanal · IA');
            setReportText(plan);
            setShowReportModal(true);
            setNotification("Planejamento semanal gerado!");
        } catch (error) {
            console.error('Erro ao gerar planejamento semanal:', error);
            setNotification("Erro ao gerar planejamento com IA.");
        } finally {
            setIsTyping(false);
        }
    };









    const handleSendMessage = async (e?: React.FormEvent) => {

        e?.preventDefault();

        if (!chatQuery.trim()) return;



        const userMsg = chatQuery;

        setChatHistory(prev => {
            const next = [...prev, { role: 'user' as const, text: userMsg }];
            return next.length > MAX_CHAT_HISTORY ? next.slice(-MAX_CHAT_HISTORY) : next;
        });

        setChatQuery('');

        setIsTyping(true);



        try {

            const contextData = buildProjectAIContext();

            const systemInstruction = `Você é ENIGAMI AI, a inteligência artificial especializada em coordenação de projetos de arquitetura e engenharia.
Suas responsabilidades: analisar prazos, alertar atrasos, calcular progresso, sugerir prioridades, resumir contratos e notas, planejar semanas a partir do macro e auxiliar no gerenciamento do projeto.
Sempre responda em Português brasileiro. Seja direto, conciso e profissional.
Use listas e formatação markdown quando útil (negrito **texto**, listas com -, headers com ##).
Quando os dados do projeto estiverem disponíveis, baseie suas respostas neles — cite nomes de disciplinas, responsáveis, capacidades e datas reais. Nunca invente dados que não estejam no contexto.`;

            const enrichedQuery = contextData
                ? `[DADOS DO PROJETO]:\n${JSON.stringify(contextData, null, 2)}\n\n[PERGUNTA]: ${userMsg}`
                : `[PERGUNTA]: ${userMsg}`;

            const response = await generateChatResponse(enrichedQuery, systemInstruction);

            setChatHistory(prev => {
                const next = [...prev, { role: 'ai' as const, text: response }];
                return next.length > MAX_CHAT_HISTORY ? next.slice(-MAX_CHAT_HISTORY) : next;
            });

        } catch (error) {

            setChatHistory(prev => {
                const next = [...prev, { role: 'ai' as const, text: "Erro ao conectar. Tente novamente." }];
                return next.length > MAX_CHAT_HISTORY ? next.slice(-MAX_CHAT_HISTORY) : next;
            });

        } finally {

            setIsTyping(false);

        }

    };



    const isVideo = (url: string) => {

        return url.startsWith('data:video') || !!url.match(/\.(mp4|webm|ogg)$/i);

    };



    const [pendingLinkScopeId, setPendingLinkScopeId] = useState<string | null>(null);
    const [linkName, setLinkName] = useState('');
    const [linkUrl, setLinkUrl] = useState('');

    const handleAddLink = (scopeId: string) => {
        setPendingLinkScopeId(scopeId);
        setLinkName('');
        setLinkUrl('');
    };

    const handleSubmitLink = () => {
        if (!pendingLinkScopeId || !linkName.trim() || !linkUrl.trim()) return;
        onAddFile(pendingLinkScopeId, linkName.trim(), linkUrl.trim());
        setPendingLinkScopeId(null);
        setLinkName('');
        setLinkUrl('');
    };



    // New handler for uploading files directly in the Files tab

    const handleFileTabUpload = (e: React.ChangeEvent<HTMLInputElement>, scopeId: string) => {

        const file = e.target.files?.[0];

        if (file) {

            setPendingUploadFile({ file, scopeId });

            setShowFileModal(true);

            e.target.value = ''; // Reset input

        }

    };



    const handleConfirmFileUpload = async (name: string) => {

        if (!pendingUploadFile) return;

        const { file, scopeId } = pendingUploadFile;

        const sizeError = validateFileSize(file);
        if (sizeError) {
            setNotification(sizeError);
            return;
        }

        try {
            const result = await readFileAsDataURL(file);
            onAddFile(scopeId, name, result);
            setPendingUploadFile(null);
            setShowFileModal(false);
        } catch (err) {
            console.error('File operation failed:', err);
            setNotification('Erro ao processar arquivo. Tente novamente.');
        }

    };



    const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {

        const files = e.target.files;

        if (files && files.length > 0 && activeProject && selectedGalleryFolderId) {

            const projectId = activeProject.id;
            const folderId = selectedGalleryFolderId;

            const fileArray = Array.from(files);
            for (const file of fileArray) {
                const sizeError = validateFileSize(file);
                if (sizeError) {
                    setNotification(sizeError);
                    return;
                }
            }

            const results = await Promise.allSettled(
                fileArray.map((file: File) => readFileAsDataURL(file))
            );

            results.forEach((result, idx) => {
                if (result.status === 'fulfilled') {
                    const file = fileArray[idx];
                    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
                    const uploadType = (galleryFileRef.current as any)?.dataset?.uploadType;
                    const imageType = isPdf ? 'flipbook' : uploadType === '360' ? 'panorama' : undefined;
                    const newImage: GalleryImage = {
                        url: result.value,
                        description: "",
                        date: new Date().toISOString(),
                        type: imageType
                    };
                    setDb(prev => ({
                        ...prev,
                        projects: prev.projects.map(p => p.id === projectId ? {
                            ...p,
                            galleryFolders: p.galleryFolders?.map(f => f.id === folderId ? {
                                ...f,
                                images: [...(f.images ?? []), newImage]
                            } : f),
                            updatedAt: new Date().toISOString()
                        } : p)
                    }));
                } else {
                    console.error('File operation failed:', result.reason);
                    setNotification('Erro ao processar arquivo. Tente novamente.');
                }
            });

        }

    };



    const handleDeleteGalleryImage = async (index: number) => {

        if (!activeProject || !selectedGalleryFolderId) return;
        const confirmed = await requestConfirm({ message: "Tem certeza que deseja apagar esta mídia?", variant: 'danger', title: 'Apagar Mídia' });
        if (!confirmed) return;

        const projectId = activeProject.id;
        setDb(prev => ({

            ...prev,

            projects: prev.projects.map(p => p.id === projectId ? {

                ...p,

                galleryFolders: p.galleryFolders?.map(f => f.id === selectedGalleryFolderId ? {

                    ...f,

                    images: (f.images ?? []).filter((_, i) => i !== index)

                } : f),

                updatedAt: new Date().toISOString()

            } : p)

        }));

        if (currentGalleryIndex >= index && currentGalleryIndex > 0) {

            setCurrentGalleryIndex(prev => prev - 1);

        }

    };



    const updateGalleryDescription = (text: string) => {

        if (!activeProject || !selectedGalleryFolderId) return;

        const projectId = activeProject.id;
        setDb(prev => ({

            ...prev,

            projects: prev.projects.map(p => p.id === projectId ? {

                ...p,

                galleryFolders: p.galleryFolders?.map(f => f.id === selectedGalleryFolderId ? {

                    ...f,

                    images: (f.images ?? []).map((img, i) => i === currentGalleryIndex ? { ...img, description: text } : img)

                } : f),

                updatedAt: new Date().toISOString()

            } : p)

        }));

    };



    const generateGalleryAI = async () => {

        if (!activeProject || !selectedGalleryFolderId) return;

        const currentFolder = activeProject.galleryFolders?.find(f => f.id === selectedGalleryFolderId);

        const currentImg = (currentFolder?.images ?? [])[currentGalleryIndex];

        if (!currentImg) return;



        setNotification("IA analisando imagem...");

        setIsTyping(true);



        try {

            const prompt = "Descreva esta imagem técnica de arquitetura/engenharia de forma profissional e concisa, focando em detalhes construtivos ou estéticos relevantes.";

            const aiText = await generateChatResponse(prompt, "Você é um assistente técnico de arquitetura especializado em análise visual. Analise a imagem em anexo (representada pelo contexto) e forneça um resumo técnico.");

            updateGalleryDescription(aiText);

            setNotification("Descrição gerada com sucesso!");

        } catch (error) {

            setNotification("Erro ao gerar descrição IA.");

        } finally {

            setIsTyping(false);

        }

    };



    const handleCreateGalleryFolder = () => {
        if (!newFolderName.trim() || !activeProject) return;

        const name = newFolderName.trim();
        const projectId = activeProject.id;
        const id = `folder-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        setShowNewFolderInput(false);
        setNewFolderName('');

        const newFolder: GalleryFolder = { id, name: name.toUpperCase(), images: [] };



        setDb(prev => ({

            ...prev,

            projects: prev.projects.map(p => p.id === projectId ? {

                ...p,

                galleryFolders: [...(p.galleryFolders || []), newFolder],

                updatedAt: new Date().toISOString()

            } : p)

        }));

    };



    const handleDeleteGalleryFolder = async (folderId: string) => {

        if (!activeProject) return;
        const confirmed = await requestConfirm({ message: "Tem certeza que deseja apagar esta pasta e todas as imagens nela?", variant: 'danger', title: 'Apagar Pasta' });
        if (!confirmed) return;

        const projectId = activeProject.id;
        setDb(prev => ({

            ...prev,

            projects: prev.projects.map(p => p.id === projectId ? {

                ...p,

                galleryFolders: p.galleryFolders?.filter(f => f.id !== folderId),

                updatedAt: new Date().toISOString()

            } : p)

        }));

        if (selectedGalleryFolderId === folderId) {

            setSelectedGalleryFolderId(null);

        }

    };

    const hasProject = !!activeProject;

    const hasCompany = !!activeCompany;

    const hasLod = !!db.activeLod;

    const companyViabilities = useMemo(() => {
        if (!db.activeCompanyId) return [];
        return (db.viabilities || []).filter(v => String(v.companyId) === String(db.activeCompanyId));
    }, [db.viabilities, db.activeCompanyId]);

    const onAddViability = (v: Omit<Viability, 'id' | 'createdAt' | 'versions'>) => {
        const newV: Viability = { ...v, id: `viab-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, createdAt: new Date().toISOString(), versions: [] };
        setDb(prev => ({ ...prev, viabilities: [...(prev.viabilities || []), newV] }));
        addLog("SISTEMA", `VIABILIDADE CADASTRADA: ${v.address}`);
        setNotification('Viabilidade cadastrada!');
    };

    const onDeleteViability = (id: string) => {
        setDb(prev => ({ ...prev, viabilities: (prev.viabilities || []).filter(v => v.id !== id) }));
        addLog("SISTEMA", "VIABILIDADE REMOVIDA");
    };

    const onAddViabilityVersion = (viabilityId: string, version: Omit<ViabilityVersion, 'id' | 'version'>) => {
        setDb(prev => ({
            ...prev,
            viabilities: (prev.viabilities || []).map(v => {
                if (v.id !== viabilityId) return v;
                const nextVersion = v.versions.length + 1;
                return { ...v, versions: [...v.versions, { ...version, id: `ver-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, version: nextVersion }] };
            })
        }));
        addLog("SISTEMA", "NOVA VERSÃO DE VIABILIDADE ADICIONADA");
        setNotification('Versão adicionada!');
    };

    const onUpdateViabilityStatus = (id: string, status: Viability['status']) => {
        setDb(prev => ({ ...prev, viabilities: (prev.viabilities || []).map(v => v.id === id ? { ...v, status } : v) }));
    };

    const onAddDataRow = () => {

        if (!activeProject) return;

        const projectId = activeProject.id;
        const newRow: ProjectDataRow = {

            id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,

            order: ((activeProject.dataRows?.length || 0) + 1).toString(),

            location: '',

            status: 'NÃO INICIADO',

            landArea: '',

            builtArea: '',

            salesArea: '',

            zoning: '',

            potential: '',

            height: '',

            broker: '',

            resp: '',

            updatedAt: new Date().toLocaleDateString()

        };

        setDb(prev => ({

            ...prev,

            projects: prev.projects.map(p => p.id === projectId ? {

                ...p,

                dataRows: [...(p.dataRows || []), newRow],

                updatedAt: new Date().toISOString()

            } : p)

        }));

        addLog("SISTEMA", "NOVA LINHA DE DADOS ADICIONADA");

    };



    const onUpdateDataRow = (id: string, field: keyof ProjectDataRow, value: string) => {

        if (!activeProject) return;

        const projectId = activeProject.id;
        setDb(prev => ({

            ...prev,

            projects: prev.projects.map(p => p.id === projectId ? {

                ...p,

                dataRows: p.dataRows?.map(r => {

                    if (r.id !== id) return r;

                    const updatedRow = { ...r, [field]: value };



                    // Automatic calculation of Potential

                    const parseNum = (s: string) => parseFloat(String(s).replace(/\./g, '').replace(',', '.'));

                    const bArea = parseNum(updatedRow.builtArea);

                    const sArea = parseNum(updatedRow.salesArea);

                    if (!isNaN(bArea) && !isNaN(sArea) && bArea > 0) {

                        updatedRow.potential = ((sArea / bArea) * 100).toFixed(2) + '%';

                    }



                    return updatedRow;

                }),

                updatedAt: new Date().toISOString()

            } : p)

        }));

    };



    const onDeleteDataRow = (id: string) => {

        if (!activeProject) return;

        const projectId = activeProject.id;
        setDb(prev => ({

            ...prev,

            projects: prev.projects.map(p => p.id === projectId ? {

                ...p,

                dataRows: p.dataRows?.filter(r => r.id !== id),

                updatedAt: new Date().toISOString()

            } : p)

        }));

        addLog("SISTEMA", "LINHA DE DADOS REMOVIDA");

    };



    const DEFAULT_PROTOCOL_FOLDERS = [

        { id: 'legal_arq', name: 'Legal de Arquitetura', files: [] },

        { id: 'hidro', name: 'Hidro', files: [] },

        { id: 'unificacao', name: 'Unificação', files: [] },

        { id: 'documentos', name: 'Documentos', files: [] },

    ];



    const ensureFolders = (pd: any): ProtocolData => ({

        protocolNumber: '', prefecture: '', prefectureUrl: '',

        startDate: '', status: 'stopped' as const, revisions: [],

        ...pd,

        folders: (pd?.folders && pd.folders.length > 0) ? pd.folders : DEFAULT_PROTOCOL_FOLDERS,

    });



    // Protocol Data Handlers

    const handleUpdateProtocol = useCallback(<K extends keyof ProtocolData>(field: K, value: ProtocolData[K]) => {

        if (!activeProject || !currentUser) return;

        const projectId = activeProject.id;
        setDb(prev => ({

            ...prev,

            projects: prev.projects.map(p => p.id === projectId ? {

                ...p,

                protocolData: { ...ensureFolders(p.protocolData), [field]: value },

                updatedAt: new Date().toISOString()

            } : p)

        }));

    }, [activeProject, currentUser]);



    const handleAddRevision = () => {

        if (!activeProject || !newRevisionText.trim() || !currentUser) return;

        const projectId = activeProject.id;
        const rev: ProtocolRevision = {

            id: `rev-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,

            date: new Date().toLocaleDateString('pt-BR'),

            author: currentUser.name,

            text: newRevisionText.trim(),

            status: newRevisionStatus

        };

        setDb(prev => ({

            ...prev,

            projects: prev.projects.map(p => p.id === projectId ? {

                ...p,

                protocolData: {

                    ...ensureFolders(p.protocolData),

                    revisions: [...(p.protocolData?.revisions || []), rev]

                },

                updatedAt: new Date().toISOString()

            } : p)

        }));

        setNewRevisionText('');

        addLog(currentUser.name, `NOVA REVISÃO DE PROTOCOLO ADICIONADA`);

    };



    const handleDeleteRevision = (revId: string) => {

        if (!activeProject) return;

        const projectId = activeProject.id;
        setDb(prev => ({

            ...prev,

            projects: prev.projects.map(p => p.id === projectId ? {

                ...p,

                protocolData: p.protocolData ? {

                    ...p.protocolData,

                    revisions: p.protocolData.revisions.filter(r => r.id !== revId)

                } : p.protocolData,

                updatedAt: new Date().toISOString()

            } : p)

        }));

    };



    const handleProtocolFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {

        const file = e.target.files?.[0];

        if (file && activeProject) {

            const sizeError = validateFileSize(file);
            if (sizeError) {
                setNotification(sizeError);
                if (protocolFileRef.current) protocolFileRef.current.value = '';
                return;
            }

            const fileName = file.name;
            const projectId = activeProject.id;

            try {
                const result = await readFileAsDataURL(file);

                const newFile: FileLink = {
                    label: fileName,
                    path: result,
                    author: currentUser?.name || 'SISTEMA',
                    createdAt: new Date().toISOString()
                };

                setDb(prev => ({
                    ...prev,
                    projects: prev.projects.map(p => {
                        if (p.id !== projectId) return p;
                        const base = ensureFolders(p.protocolData);
                        return {
                            ...p,
                            protocolData: {
                                ...base,
                                folders: base.folders.map((f: any) =>
                                    f.id === selectedProtocolFolder
                                        ? { ...f, files: [...f.files, newFile] }
                                        : f
                                )
                            },
                            updatedAt: new Date().toISOString()
                        };
                    })
                }));
            } catch (err) {
                console.error('File operation failed:', err);
                setNotification('Erro ao processar arquivo. Tente novamente.');
            }

        }

        if (protocolFileRef.current) protocolFileRef.current.value = '';

    };



    const handleDeleteProtocolFile = (folderId: string, fileIndex: number) => {

        if (!activeProject) return;

        const projectId = activeProject.id;
        setDb(prev => ({

            ...prev,

            projects: prev.projects.map(p => p.id === projectId ? {

                ...p,

                protocolData: p.protocolData ? {

                    ...p.protocolData,

                    folders: (p.protocolData.folders || []).map(f =>

                        f.id === folderId

                            ? { ...f, files: f.files.filter((_, i) => i !== fileIndex) }

                            : f

                    )

                } : p.protocolData,

                updatedAt: new Date().toISOString()

            } : p)

        }));

    };



    const handleAddProtocolFolder = () => {

        if (!activeProject || !newFolderName.trim()) return;

        const projectId = activeProject.id;
        const newFolder = { id: `folder-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name: newFolderName.trim(), files: [] };

        setDb(prev => ({

            ...prev,

            projects: prev.projects.map(p => p.id === projectId ? {

                ...p,

                protocolData: {
                    ...ensureFolders(p.protocolData),
                    folders: [...(ensureFolders(p.protocolData).folders || []), newFolder]
                },

                updatedAt: new Date().toISOString()

            } : p)

        }));

        setSelectedProtocolFolder(newFolder.id);

        setNewFolderName('');

        setShowNewFolderInput(false);

    };



    const handleDeleteProtocolFolder = (folderId: string) => {

        if (!activeProject) return;

        const projectId = activeProject.id;
        setDb(prev => ({

            ...prev,

            projects: prev.projects.map(p => p.id === projectId ? {

                ...p,

                protocolData: p.protocolData ? {

                    ...p.protocolData,

                    folders: p.protocolData.folders.filter(f => f.id !== folderId)

                } : p.protocolData,

                updatedAt: new Date().toISOString()

            } : p)

        }));

        setSelectedProtocolFolder('legal_arq');

    };



    const handleViabilityFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {

        const file = e.target.files?.[0];

        if (file && activeProject) {

            const sizeError = validateFileSize(file);
            if (sizeError) {
                setNotification(sizeError);
                return;
            }

            const fileName = file.name;
            const projectId = activeProject.id;

            try {
                const result = await readFileAsDataURL(file);
                setDb(prev => ({
                    ...prev,
                    projects: prev.projects.map(p => p.id === projectId ? {
                        ...p,
                        updatedAt: new Date().toISOString(),
                        viabilityFiles: [...(p.viabilityFiles || []), { label: fileName, path: result }]
                    } : p)
                }));
            } catch (err) {
                console.error('File operation failed:', err);
                setNotification('Erro ao processar arquivo. Tente novamente.');
            }

        }

    };



    // Empresa selecionada sem projeto: só a Agenda (planejamento micro) fica
    // disponível — direciona para ela automaticamente.
    useEffect(() => {
        if (hasCompany && !hasProject && activeTab !== 'agenda_semana') {
            setActiveTab('agenda_semana');
        }
    }, [hasCompany, hasProject, activeTab, setActiveTab]);

    // Robust auto-scroll when tab changes
    useEffect(() => {
        if ((hasProject || hasCompany) && activeTab !== 'timeline') {
            const attemptScroll = () => {
                const scroller = document.getElementById('main-scroller');
                const target = document.getElementById('tab-content-area');
                if (scroller && target) {
                    scroller.scrollTo({
                        top: target.offsetTop - 20,
                        behavior: 'smooth'
                    });
                }
            };
            
            // Multiple attempts to ensure it catches the layout after lazy load
            requestAnimationFrame(attemptScroll);
            setTimeout(attemptScroll, 100);
            setTimeout(attemptScroll, 300);
            setTimeout(attemptScroll, 600);
        }
    }, [activeTab, hasProject]);


    return (
        <>
        <div className={`h-screen flex flex-col items-center font-sans relative overflow-hidden bg-transparent text-theme-text`}>

            {/* ── TOP BAR ── */}
            <div className="w-full flex flex-wrap items-center gap-x-4 gap-y-2 px-3 sm:px-6 py-2.5 sm:py-3 bg-theme-card/90 backdrop-blur-xl border-b border-theme-divider no-print sticky top-0 z-[90] shadow-sm">

                {/* Logo */}
                <div className="flex items-center gap-2.5 flex-shrink-0 sm:mr-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden" style={{ background: '#E85028' }}>
                        <svg viewBox="0 0 48 38" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8">
                            <path d="M24 2 L44 13 L44 25 L36 30 L36 18 L24 25 L12 18 L12 30 L4 25 L4 13 Z" stroke="white" strokeWidth="2.2" fill="none" strokeLinejoin="round"/>
                            <path d="M24 2 L24 25" stroke="white" strokeWidth="2.2"/>
                            <path d="M4 13 L24 2 L44 13" stroke="white" strokeWidth="2.2" fill="none"/>
                            <path d="M14 17 L24 11 L34 17" stroke="white" strokeWidth="1.8" fill="none"/>
                            <path d="M14 22 L24 16 L34 22" stroke="white" strokeWidth="1.5" fill="none"/>
                        </svg>
                    </div>
                    <div className="leading-tight">
                        <h1 className="font-square font-black text-base tracking-[0.18em] text-theme-text uppercase leading-none">ENIGAMI</h1>
                        <span className="text-[8px] font-bold tracking-[0.22em] uppercase" style={{ color: '#E85028' }}>Arquitetura A· Coordinate</span>
                    </div>
                </div>

                {/* Tabs centradas — Agenda (planejamento micro do escritório) libera só com a empresa;
                    as demais abas dependem de um projeto selecionado */}
                {(hasProject || hasCompany) && (
                    <div className="order-3 w-full lg:order-none lg:w-auto lg:flex-1 flex justify-start lg:justify-center min-w-0">
                        <div className="flex items-center gap-1 bg-theme-bg/60 rounded-full px-2 py-1.5 border border-theme-divider overflow-x-auto scroller max-w-full">
                            {[
                                { id: 'timeline', label: 'Cronograma', icon: 'view_timeline' },
                                { id: 'agenda_semana', label: 'Agenda', icon: 'calendar_view_week' },
                                { id: 'gallery', label: 'Galeria', icon: 'photo_library' },
                                { id: 'files', label: 'Arquivos', icon: 'folder_open' },
                                { id: 'data', label: 'Dados', icon: 'database' },
                                { id: 'viabilidade', label: 'Contratos', icon: 'contract' },
                                { id: 'financeiro', label: 'Financeiro', icon: 'payments' },
                                { id: 'compras', label: 'Compras', icon: 'shopping_cart' },
                                { id: 'notas', label: 'Notas', icon: 'sticky_note_2' },
                                { id: 'colaborador', label: 'Colaborador', icon: 'group' },
                            ].map(tab => {
                                const enabled = hasProject || tab.id === 'agenda_semana';
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => enabled && setActiveTab(tab.id as Tab)}
                                        title={enabled ? tab.label : 'Selecione um projeto para acessar'}
                                        className={`px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.12em] transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                                            activeTab === tab.id
                                                ? 'text-theme-orange border border-theme-orange bg-theme-orange/10 shadow-sm'
                                                : enabled
                                                    ? 'text-theme-textMuted hover:text-theme-text hover:bg-theme-highlight/60'
                                                    : 'text-theme-textMuted/40 cursor-not-allowed'
                                        }`}
                                    >
                                        <span className="material-symbols-outlined text-[13px] leading-none hidden xl:inline">{tab.icon}</span>
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Ações direita */}
                <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
                    <button onClick={() => window.print()} title="Imprimir" className="w-8 h-8 rounded-full border border-theme-divider hidden sm:flex items-center justify-center text-theme-textMuted hover:text-theme-orange hover:border-theme-orange transition-all">
                        <span className="material-symbols-outlined text-base">print</span>
                    </button>
                    <button onClick={handleExportJSON} title="Exportar" className="w-8 h-8 rounded-full border border-theme-divider hidden sm:flex items-center justify-center text-theme-textMuted hover:text-theme-orange hover:border-theme-orange transition-all">
                        <span className="material-symbols-outlined text-base">download</span>
                    </button>
                    <button onClick={handleManualSave} title="Salvar" className="w-8 h-8 rounded-full border border-theme-divider flex items-center justify-center text-theme-textMuted hover:text-theme-orange hover:border-theme-orange transition-all">
                        <span className="material-symbols-outlined text-base">cloud_upload</span>
                    </button>

                    {/* Online Users - Presence Avatars */}
                    {onlineUsers.length > 0 && (
                        <div className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded-full border border-theme-divider bg-theme-bg/50">
                            <span className={`w-1.5 h-1.5 rounded-full ${isRealtimeConnected || simulationActive ? 'bg-emerald-400 animate-pulse' : 'bg-gray-400'}`} />
                            <div className="flex -space-x-2">
                                {onlineUsers.slice(0, 5).map(user => (
                                    <div key={user.userId} className="relative group" title={`${user.name}${user.currentActivity ? ` — ${user.currentActivity}` : ''}`}>
                                        <img
                                            src={user.avatarUrl}
                                            alt={user.name}
                                            className={`w-6 h-6 rounded-full object-cover ring-2 transition-transform group-hover:scale-125 group-hover:z-10 relative ${user.isVirtual ? 'ring-theme-orange/50' : 'ring-theme-card'}`}
                                        />
                                    </div>
                                ))}
                            </div>
                            {onlineUsers.length > 5 && (
                                <span className="text-[9px] font-black text-theme-textMuted">+{onlineUsers.length - 5}</span>
                            )}
                        </div>
                    )}

                    <div className="w-px h-5 bg-theme-divider mx-1"></div>

                    {currentUser ? (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowProfileModal(true)}
                                title="Editar Perfil"
                                className="flex items-center gap-2 hover:opacity-85 transition-all group"
                            >
                                {currentUser.avatar ? (
                                    <img
                                        src={currentUser.avatar}
                                        alt={currentUser.name}
                                        className="w-8 h-8 rounded-full object-cover ring-2 ring-theme-orange/40 group-hover:ring-theme-orange transition-all"
                                    />
                                ) : (
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-black ring-2 ring-theme-orange/40 group-hover:ring-theme-orange transition-all" style={{ background: '#E85028' }}>
                                        {currentUser.name.slice(0, 2).toUpperCase()}
                                    </div>
                                )}
                                <span className="text-[10px] font-black uppercase tracking-widest text-theme-text hidden sm:block">
                                    {currentUser.name}
                                </span>
                            </button>
                            <button
                                onClick={handleLogout}
                                title="Sair"
                                className="w-7 h-7 rounded-full border border-theme-divider flex items-center justify-center text-theme-textMuted hover:text-red-400 hover:border-red-300 transition-all ml-1"
                            >
                                <span className="material-symbols-outlined text-sm">logout</span>
                            </button>
                        </div>
                    ) : (
                        <button onClick={handleLogin} className="flex items-center gap-2 border border-theme-divider px-4 py-1.5 rounded-full text-[10px] font-black uppercase hover:border-theme-orange hover:text-theme-orange transition-all">
                            <span className="material-symbols-outlined text-sm">login</span> Login
                        </button>
                    )}
                </div>
            </div>



            {/* Notifications & Overlays */}

            {notification && (<div className="fixed top-4 sm:top-8 left-1/2 -translate-x-1/2 z-[300] max-w-[92vw] bg-theme-green text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-full text-xs sm:text-sm font-bold uppercase tracking-widest shadow-xl animate-scaleIn flex items-center gap-2 sm:gap-3 backdrop-blur-md text-center"><span className="material-symbols-outlined shrink-0">check_circle</span><span className="truncate">{notification}</span></div>)}

            {viewingImage && (<div data-modal-overlay="true" className="fixed inset-0 z-[200] bg-theme-card/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-10 animate-fadeIn" onClick={() => setViewingImage(null)}><button className="absolute top-5 right-5 text-theme-text/50 hover:text-theme-orange transition-colors z-[210]"><span className="material-symbols-outlined text-4xl">close</span></button><img src={viewingImage} className="max-w-full max-h-full rounded-3xl shadow-2xl border border-white" onClick={(e) => e.stopPropagation()} /></div>)}

            {viewingFile && (

                <div className="fixed inset-0 z-[200] bg-theme-card/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-10 animate-fadeIn" onClick={() => setViewingFile(null)}>

                    <button aria-label="Fechar visualizador" className="absolute top-5 right-5 text-theme-text/50 hover:text-theme-orange transition-colors z-[210]"><span className="material-symbols-outlined text-4xl">close</span></button>

                    <div className="w-full h-full max-w-6xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-theme-divider flex flex-col" onClick={(e) => e.stopPropagation()}>

                        {viewingFile.type === 'pdf' ? (

                            <iframe src={viewingFile.path} className="w-full h-full" title="PDF Viewer" />

                        ) : (

                            <img src={viewingFile.path} className="w-full h-full object-contain" />

                        )}
                    </div>
                </div>
            )}







            {/* File Naming Modal */}

            {showFileModal && pendingUploadFile && (

                <div className="fixed inset-0 z-[250] bg-black/50 backdrop-blur-sm flex items-center justify-center animate-fadeIn">

                    <div className="bg-theme-card p-6 sm:p-8 rounded-3xl shadow-2xl border border-theme-divider w-full max-w-96 mx-4 relative">

                        <button onClick={() => { setShowFileModal(false); setPendingUploadFile(null); }} className="absolute top-4 right-4 text-theme-textMuted hover:text-theme-text"><span className="material-symbols-outlined">close</span></button>

                        <h3 className="font-square font-black text-lg uppercase tracking-widest mb-6 text-theme-text text-center">Nomear Arquivo</h3>

                        <form onSubmit={(e) => {

                            e.preventDefault();

                            const formData = new FormData(e.currentTarget);

                            const name = formData.get('fileName') as string;

                            if (name) handleConfirmFileUpload(name);

                        }}>

                            <div className="mb-6">

                                <label className="block text-[10px] font-bold text-theme-textMuted uppercase mb-2">Nome do Documento</label>

                                <input name="fileName" defaultValue={pendingUploadFile.file.name} className="w-full bg-theme-bg border border-theme-divider rounded-xl px-4 py-3 text-xs text-theme-text outline-none focus:border-theme-orange transition-all font-bold" autoFocus />

                            </div>

                            <button type="submit" className="w-full bg-theme-orange text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-orange-600 transition-all shadow-lg">Confirmar Upload</button>

                        </form>

                    </div>

                </div>

            )}



            {/* Floating Buttons moved to bottom of file */}



            {/* --- MODALS INJECTION --- */}

            <CompanyModal

                isOpen={showCompanyModal}

                companies={db.companies}

                onClose={() => setShowCompanyModal(false)}

                onSelect={(id) => { setDb(prev => ({ ...prev, activeCompanyId: id, activeProjectId: null })); setShowCompanyModal(false); }}

                onAdd={(name, logo) => { const newId = Date.now() + Math.floor(Math.random() * 1000); setDb(prev => ({ ...prev, companies: [...prev.companies, { id: newId, name, logoUrl: logo }] })); }}

                onUpdate={onUpdateCompany}

                onRemove={(id) => { setDb(prev => ({ ...prev, companies: prev.companies.filter(c => String(c.id) !== String(id)), activeCompanyId: String(prev.activeCompanyId) === String(id) ? null : prev.activeCompanyId })); }}

                onReorder={(newCompanies) => setDb(prev => ({ ...prev, companies: newCompanies }))}

                isViewer={isViewer}

            />



            <LodModal

                isOpen={showLodModal}

                lods={db.lods}

                activeLod={db.activeLod}

                phases={activeProject?.phases}

                onClose={() => setShowLodModal(false)}

                onSelect={(lod) => { setDb(prev => ({ ...prev, activeLod: lod })); setShowLodModal(false); }}

                onAdd={(l) => setDb(prev => ({ ...prev, lods: [...prev.lods, l] }))}

                onRemove={(l) => setDb(prev => ({ ...prev, lods: prev.lods.filter(item => item !== l), activeLod: prev.activeLod === l ? "" : prev.activeLod }))}

                onReorder={(newLods) => setDb(prev => ({ ...prev, lods: newLods }))}

                onUpdatePhase={(lodCode, info) => {
                    if (isViewer) return;
                    if (!activeProject) return;
                    const projectId = activeProject.id;
                    setDb(prev => ({
                        ...prev,
                        projects: prev.projects.map(p => p.id === projectId ? {
                            ...p,
                            updatedAt: new Date().toISOString(),
                            phases: { ...(p.phases || {}), [lodCode]: { ...(p.phases?.[lodCode] || { status: 'pending' }), ...info } }
                        } : p)
                    }));
                    addLog("SISTEMA", `FASE ${lodCode}: ${info.status === 'done' ? 'CONCLUÍDA' : info.status === 'active' ? 'INICIADA' : 'RESETADA'}`);
                }}

                isViewer={isViewer}

            />



            <ProjectModal

                isOpen={showProjectModal}

                companyName={activeCompany?.name || ''}

                projects={db.projects.filter(p => String(p.companyId) === String(db.activeCompanyId))}

                onClose={() => setShowProjectModal(false)}

                isViewer={isViewer}

                onSelect={(id) => { setDb(prev => ({ ...prev, activeProjectId: id })); setShowProjectModal(false); }}

                onAdd={(name, logo, cover) => {

                    if (!db.activeCompanyId || !db.activeLod) return;

                    const newProj: Project = {

                        id: Date.now() + Math.floor(Math.random() * 1000),

                        companyId: db.activeCompanyId,

                        lod: db.activeLod,

                        name,

                        logoUrl: logo,

                        coverUrl: cover,

                        createdAt: new Date().toISOString(),

                        updatedAt: new Date().toISOString(),

                        timelineStart: `${new Date().getFullYear()}-01-01`,

                        timelineEnd: `${new Date().getFullYear()}-12-31`,

                        activities: [],

                        scopes: []

                    };

                    setDb(prev => ({ ...prev, projects: [...prev.projects, newProj], activeProjectId: newProj.id }));

                    setShowProjectModal(false);

                }}

                onDelete={onDeleteProject}

                onEdit={onEditProject}

            />



            <LoginModal
                isOpen={showLoginModal}
                onClose={() => setShowLoginModal(false)}
            />

            <ProfileCompletionModal
                isOpen={showProfileModal}
                userId={currentUser?.id || 'demo_user'}
                currentEmail={currentUser?.name}
                onSubmit={handleProfileComplete}
                onClose={() => setShowProfileModal(false)}
            />



            <UploadInstructionsModal

                isOpen={showUploadInstructionsModal}

                onClose={() => setShowUploadInstructionsModal(false)}

            />

            {showViabilidadesModal && (
            <ViabilidadesPanel
              companyId={db.activeCompanyId || 0}
              companyName={activeCompany?.name || ''}
              onClose={() => setShowViabilidadesModal(false)}
            />
          )}

            {/* Link Add Dialog */}
            {pendingLinkScopeId && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fadeIn p-4 no-print">
                    <div className="bg-theme-card w-full max-w-[400px] rounded-2xl border border-theme-divider shadow-neuro animate-scaleIn p-6 space-y-4">
                        <h3 className="text-lg font-square font-bold text-theme-text tracking-wider uppercase">Vincular Arquivo</h3>
                        <input type="text" placeholder="Nome do Arquivo / Documento" value={linkName} onChange={e => setLinkName(e.target.value)} className="w-full px-4 py-2 bg-theme-bg border border-theme-divider rounded-xl text-theme-text text-sm" autoFocus />
                        <input type="text" placeholder="Link / URL de Acesso" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} className="w-full px-4 py-2 bg-theme-bg border border-theme-divider rounded-xl text-theme-text text-sm" />
                        <div className="flex gap-2 justify-end">
                            <button onClick={() => setPendingLinkScopeId(null)} className="px-4 py-2 text-sm text-theme-textMuted hover:bg-theme-bg rounded-lg">Cancelar</button>
                            <button onClick={handleSubmitLink} disabled={!linkName.trim() || !linkUrl.trim()} className="px-4 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50">Vincular</button>
                        </div>
                    </div>
                </div>
            )}

            <ScopeModal

                isOpen={showScopeModal}

                scope={selectedScope}

                disciplines={db.disciplines}

                team={db.team}

                onClose={() => { setShowScopeModal(false); setEditingScopeId(null); }}

                onManage={() => { setShowScopeModal(false); setShowDisciplinesModal(true); }}

                onSave={(name, startDate, color, status: 'stopped' | 'walking' | 'running' | 'done', pDate, resp) => {

                    if (!activeProject) return;

                    const projectId = activeProject.id;
                    if (editingScopeId) {

                        setDb(prev => ({ ...prev, projects: prev.projects.map(p => p.id === projectId ? { ...p, updatedAt: new Date().toISOString(), scopes: p.scopes.map(s => s.id === editingScopeId ? { ...s, name, startDate, colorClass: color, status, protocolDate: pDate, resp } : s) } : p) }));

                    } else {

                        const newScope: Scope = { id: `sc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name, colorClass: color, startDate, resp, status, protocolDate: pDate, events: [] };

                        setDb(prev => ({ ...prev, projects: prev.projects.map(p => p.id === projectId ? { ...p, updatedAt: new Date().toISOString(), scopes: [...p.scopes, newScope] } : p) }));

                    }

                    setShowScopeModal(false);

                    setEditingScopeId(null);



                    if (status === 'done') {

                        setShowUploadInstructionsModal(true);

                    }

                }}

            />



            <EventModal

                isOpen={showEventModal}

                team={db.team}

                event={editingEvent}

                scopes={activeProject?.scopes} // Pass scopes for selection

                initialScopeId={activeScopeIdForEvent}

                initialDate={newEventDate}

                onClose={() => { setShowEventModal(false); setEditingEventId(null); setNewEventDate(undefined); }}

                onSave={(title, resp, start, end, checklistStr, selectedScopeId, type) => {

                    if (!activeProject) return;

                    const projectId = activeProject.id;

                    // Use selectedScopeId if provided (new event), otherwise use activeScopeIdForEvent

                    const targetScopeId = selectedScopeId || activeScopeIdForEvent;



                    if (!targetScopeId) {

                        showAlert("Erro: Nenhuma disciplina selecionada."); // Should not happen with UI validation

                        return;

                    }



                    const checklist = checklistStr
                        .split('\n')
                        .map(t => t.replace(/^[\s\-\*•]+(\[[\sx]\]\s*)?/i, '').trim()) // strip [ ], - [ ], *, •, - prefixes
                        .filter(t => t.length > 0)
                        .map(t => ({ text: t, done: false }));



                    if (editingEventId && activeScopeIdForEvent) {

                        // Editing existing event

                        setDb(prev => ({ ...prev, projects: prev.projects.map(p => p.id === projectId ? { ...p, updatedAt: new Date().toISOString(), scopes: p.scopes.map(s => s.id === activeScopeIdForEvent ? { ...s, events: s.events.map(e => e.id === editingEventId ? { ...e, title, resp, startDate: start, endDate: end, checklist: checklist.map(newItem => { const existing = e.checklist.find(old => old.text === newItem.text); return existing ? { ...existing } : newItem; }), type: type || 'default' } : e) } : s) } : p) }));

                    } else {

                        // Creating new event

                        const newEvent: Event = { id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, title, resp, startDate: start, endDate: end, plannedStartDate: start, plannedEndDate: end, checklist, completed: false, type: type || 'default' };

                        setDb(prev => ({ ...prev, projects: prev.projects.map(p => p.id === projectId ? { ...p, updatedAt: new Date().toISOString(), scopes: p.scopes.map(s => s.id === targetScopeId ? { ...s, events: [...s.events, newEvent] } : s) } : p) }));

                        addLog("SISTEMA", `NOVA AÇÃO: ${title}`);

                    }

                    setShowEventModal(false);

                    setEditingEventId(null);

                    setNewEventDate(undefined);

                }}

            />



            <ChecklistModal
                isOpen={showChecklistModal}
                event={activeChecklistIds ? activeProject?.scopes.find(s => s.id === activeChecklistIds.sid)?.events.find(e => e.id === activeChecklistIds.eid) || null : null}
                project={activeProject}
                onClose={() => setShowChecklistModal(false)}
                onEdit={() => {
                    if (isViewer) return;
                    if (activeChecklistIds) {
                        setActiveScopeIdForEvent(activeChecklistIds.sid);
                        setEditingEventId(activeChecklistIds.eid);
                        setShowChecklistModal(false);
                        setShowEventModal(true);
                    }
                }}
                onUpdateChecklist={(updatedChecklist) => {
                    if (isViewer) return;
                    if (!activeProject || !activeChecklistIds) return;
                    const projectId = activeProject.id;
                    setDb(prev => ({ ...prev, projects: prev.projects.map(p => p.id === projectId ? { ...p, updatedAt: new Date().toISOString(), scopes: p.scopes.map(s => s.id === activeChecklistIds.sid ? { ...s, events: s.events.map(e => e.id === activeChecklistIds.eid ? { ...e, checklist: updatedChecklist } : e) } : s) } : p) }));
                }}
                onComplete={() => {
                    if (isViewer) return;
                    if (!activeProject || !activeChecklistIds) return;
                    const projectId = activeProject.id;
                    setDb(prev => ({ ...prev, projects: prev.projects.map(p => p.id === projectId ? { ...p, updatedAt: new Date().toISOString(), scopes: p.scopes.map(s => s.id === activeChecklistIds.sid ? { ...s, events: s.events.map(e => e.id === activeChecklistIds.eid ? { ...e, completed: !e.completed } : e) } : s) } : p) }));
                    setShowChecklistModal(false);
                }}
                onToggleLink={(targetId) => onAddDependency(activeChecklistIds!.eid, targetId, 'FS')}
                onChangeType={(targetId) => onChangeDependencyType(activeChecklistIds!.sid, activeChecklistIds!.eid, targetId)}
                isViewer={isViewer}

            />



            <TeamModal

                isOpen={showTeamModal}

                team={db.team}

                onClose={() => setShowTeamModal(false)}

                onAdd={(name) => { if (isViewer) return; setDb(prev => { const members = upsertMember(prev.members || [], { name, source: 'manual' }); return { ...prev, members, team: deriveTeam(members) }; }); }}

                onRemove={(idx) => { if (isViewer) return; setDb(prev => { const name = prev.team[idx]; const members = removeMember(prev.members || [], name); return { ...prev, members, team: deriveTeam(members) }; }); }}

                isViewer={isViewer}

            />



            <TimelineSettingsModal

                isOpen={showSettingsModal}

                project={activeProject}

                onClose={() => setShowSettingsModal(false)}

                onSave={(start, end) => {

                    if (isViewer) return;

                    if (!activeProject) return;

                    const projectId = activeProject.id;
                    setDb(prev => ({ ...prev, projects: prev.projects.map(p => p.id === projectId ? { ...p, updatedAt: new Date().toISOString(), timelineStart: start, timelineEnd: end } : p) }));

                    setShowSettingsModal(false);

                }}

            />



            <AdminSettingsModal

                isOpen={showAdminModal}

                theme={theme}

                onClose={() => setShowAdminModal(false)}

                onToggleTheme={() => setTheme(theme === 'light' ? 'dark' : 'light')}

                onPrint={printDashboard}

                onExportJSON={handleExportJSON}

                onImportJSON={handleImportJSON}

                isViewer={isViewer}

            />



            <DisciplinesManagerModal

                isOpen={showDisciplinesModal}

                disciplines={db.disciplines}

                onClose={() => setShowDisciplinesModal(false)}

                onAdd={(d) => { if (isViewer) return; setDb(prev => ({ ...prev, disciplines: [...prev.disciplines, d] })); }}

                onUpdate={(oldCode, d) => { if (isViewer) return; setDb(prev => ({ ...prev, disciplines: prev.disciplines.map(item => item.code === oldCode ? d : item) })); }}

                onRemove={(code) => { if (isViewer) return; setDb(prev => ({ ...prev, disciplines: prev.disciplines.filter(d => d.code !== code) })); }}

                onReorder={(list) => { if (isViewer) return; setDb(prev => ({ ...prev, disciplines: list })); }}

                isViewer={isViewer}

            />



            <div id="main-scroller" className="flex flex-col gap-6 sm:gap-10 w-full max-w-[1920px] mx-auto flex-1 min-h-0 relative overflow-y-auto scroller px-3 sm:px-4 2xl:px-10 pt-4 sm:pt-6">

                {/* Header Cards */}
                {activeTab !== 'financeiro' && activeTab !== 'viabilidade' && activeTab !== 'gallery' && (
                <div className={`${hasProject ? 'grid grid-cols-1 lg:grid-cols-12 gap-6 2xl:gap-8 lg:h-[calc(100vh-120px)]' : 'flex justify-center'} no-print`}>

                    <div className={`${hasProject ? 'lg:col-span-4 h-full overflow-y-auto scroller pr-2' : 'w-full max-w-3xl'} flex flex-col gap-8`}>

                        <div className="grid grid-cols-2 gap-4 lg:gap-6 2xl:gap-8">

                            {/* 1. Cliente - Vibrant Orange */}

                            <div className={`ds-card-accent gradient-orange p-6 flex flex-col items-center justify-center text-center h-48 lg:h-56 2xl:h-64 transition-all relative cursor-pointer hover:-translate-y-2 hover:shadow-2xl`} onClick={() => setShowCompanyModal(true)}>

                                <span className="text-[10px] font-bold text-white/90 uppercase tracking-widest mb-4 flex items-center gap-1 border border-white/30 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm">1. Cliente <span className="material-symbols-outlined text-xs">chevron_right</span></span>

                                {activeCompany?.logoUrl && <img src={activeCompany.logoUrl} className="w-20 h-20 object-contain my-2 bg-white/20 rounded-2xl backdrop-blur-md shadow-lg" />}

                                <div className="w-full px-2 mt-2">

                                    <TextReveal text={activeCompany?.name || 'Selecione'} className="font-square font-black text-white uppercase text-xl truncate w-full drop-shadow-sm" />

                                </div>

                                {hasCompany && <span className="material-symbols-outlined absolute right-4 bottom-4 text-white/40 text-3xl">check_circle</span>}

                            </div>



                            <div className={`grid grid-rows-2 gap-4 h-48 lg:h-56 2xl:h-64 transition-all`}>

                                <div className={`ds-card p-3 flex justify-center items-center gap-4 ${!hasProject ? 'opacity-50 blur-[1px]' : ''}`}>
                                    <div className="flex flex-col items-center">
                                        <span className="text-theme-orange font-bold text-[8px] mb-1 uppercase tracking-widest opacity-80">Atualização</span>
                                        <span className="text-xs font-mono font-medium text-theme-text bg-theme-highlight px-2 py-0.5 rounded-lg border border-theme-divider">{activeProject ? new Date(activeProject.updatedAt).toLocaleDateString() : '--/--'}</span>
                                    </div>
                                    <div className="w-px h-8 bg-theme-divider" />
                                    <div className="flex flex-col items-center">
                                        <span className="text-theme-orange font-bold text-[8px] mb-1 uppercase tracking-widest opacity-80">Início</span>
                                        <span className="text-xs font-mono font-medium text-theme-text bg-theme-highlight px-2 py-0.5 rounded-lg border border-theme-divider">{activeProject ? new Date(activeProject.createdAt).toLocaleDateString() : '--/--'}</span>
                                    </div>
                                </div>

                                <div className={`ds-card-accent bg-gradient-to-br from-emerald-500 to-teal-600 p-3 flex flex-col justify-center items-center cursor-pointer hover:shadow-xl hover:-translate-y-0.5 transition-all relative ${!hasCompany ? 'opacity-50 grayscale cursor-not-allowed' : ''}`} onClick={() => hasCompany && setShowViabilidadesModal(true)}>
                                    <span className="material-symbols-outlined text-white/80 text-2xl mb-1">analytics</span>
                                    <span className="text-[9px] font-bold text-white/90 uppercase tracking-widest">Viabilidades</span>
                                    <span className="text-lg font-black text-white">{companyViabilities.length}</span>
                                </div>

                            </div>



                            {/* 2. Fase - Vibrant Purple */}

                            <div className={`ds-card-accent gradient-purple cursor-pointer p-6 flex flex-col justify-center items-center text-center h-48 lg:h-56 2xl:h-64 transition-all relative group overflow-hidden ${!hasCompany ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:-translate-y-2 hover:shadow-2xl'}`} onClick={() => hasCompany && setShowLodModal(true)}>

                                <span className="text-[10px] font-bold text-white/90 uppercase tracking-widest mb-2 flex items-center gap-1 border border-white/30 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm">2. Fase <span className="material-symbols-outlined text-xs">chevron_right</span></span>

                                <div className="mt-2 flex flex-col items-center">

                                    {db.activeLod ? (

                                        <>

                                            <TextReveal text={db.activeLod + "_"} className="text-xl font-square font-black text-white leading-tight uppercase drop-shadow-md" />

                                            <TextReveal text={db.lods.find(l => l.startsWith(db.activeLod))?.split('_ ')[1] || '---'} className="text-sm opacity-90 font-medium font-sans text-white mt-1" delay={0.5} />

                                        </>

                                    ) : (

                                        <TextReveal text="Selecionar" className="text-xl font-square font-black text-white leading-tight uppercase drop-shadow-md" />

                                    )}

                                </div>

                                {hasLod && <span className="material-symbols-outlined absolute right-4 bottom-4 text-white/40 text-3xl">check_circle</span>}

                            </div>

                            {/* 3. Projeto - Vibrant Cyan */}

                            <div className={`ds-card-accent gradient-cyan p-6 flex flex-col items-center justify-center h-48 lg:h-56 2xl:h-64 transition-all relative group overflow-hidden ${!hasCompany ? 'opacity-50 grayscale cursor-not-allowed' : 'cursor-pointer hover:-translate-y-2 hover:shadow-2xl'}`} onClick={() => hasCompany && setShowProjectModal(true)}>

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

                        {/* Stats Panel - tabs */}
                        {hasProject && (
                        <div className="ds-card p-6 flex flex-col gap-5 relative overflow-hidden bg-theme-card/65 backdrop-blur-xl border border-theme-divider/50 shadow-[0_8px_32px_0_rgba(0,0,0,0.06)] rounded-3xl">

                            {/* Tab buttons */}
                            <div className="grid grid-cols-4 gap-2.5">
                                {[
                                    { id: 'total',      label: 'Total',      value: activeProject?.scopes.length || 0, color: 'indigo', icon: 'folder_open' },
                                    { id: 'progress',   label: 'Andamento',  value: stats.inProgress,                  color: 'orange', icon: 'trending_up' },
                                    { id: 'done',       label: 'Feito',      value: stats.don,                         color: 'emerald', icon: 'check_circle' },
                                    { id: 'efficiency', label: 'Tempo',      value: `${Math.round(stats.totalTime / 3600)}h`, color: 'pink', icon: 'timer' },
                                ].map(tab => {
                                    const active = activeHealthTab === tab.id;
                                    const colors: Record<string, { num: string; bg: string; border: string; activeBg: string; shadow: string }> = {
                                        indigo:  { num: 'text-indigo-500',  bg: 'bg-theme-card',       border: 'border-indigo-500/50',  activeBg: 'bg-indigo-500/10', shadow: 'shadow-[0_0_20px_rgba(99,102,241,0.15)]' },
                                        orange:  { num: 'text-theme-orange',bg: 'bg-theme-card',       border: 'border-theme-orange/50',  activeBg: 'bg-theme-orange/10', shadow: 'shadow-[0_0_20px_rgba(232,80,40,0.15)]' },
                                        emerald: { num: 'text-emerald-500', bg: 'bg-theme-card',       border: 'border-emerald-500/50', activeBg: 'bg-emerald-500/10', shadow: 'shadow-[0_0_20px_rgba(16,185,129,0.15)]' },
                                        pink:    { num: 'text-pink-500',    bg: 'bg-theme-card',       border: 'border-pink-500/50',    activeBg: 'bg-pink-500/10', shadow: 'shadow-[0_0_20px_rgba(236,72,153,0.15)]' },
                                    };
                                    const c = colors[tab.color];
                                    return (
                                        <button key={tab.id} onClick={() => setActiveHealthTab(tab.id as any)}
                                            className={`flex flex-col items-center justify-between py-3.5 px-2 rounded-2xl border transition-all duration-300 relative overflow-hidden ${
                                                active 
                                                    ? `${c.activeBg} ${c.border} ${c.shadow} scale-[1.03] -translate-y-0.5` 
                                                    : 'bg-theme-bg/30 border-transparent hover:bg-theme-highlight hover:border-theme-divider/40'
                                            }`}
                                        >
                                            {active && <div className={`absolute top-0 inset-x-3 h-[3px] rounded-full ${tab.color === 'indigo' ? 'bg-indigo-500' : tab.color === 'orange' ? 'bg-theme-orange' : tab.color === 'emerald' ? 'bg-emerald-500' : 'bg-pink-500'}`} />}
                                            <span className={`material-symbols-outlined text-xs ${active ? c.num : 'text-theme-textMuted'} mb-1`}>{tab.icon}</span>
                                            <span className={`text-lg font-black ${active ? c.num : 'text-theme-text'}`}>{tab.value}</span>
                                            <span className="text-[7.5px] font-black uppercase text-theme-textMuted mt-1 tracking-wider">{tab.label}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Tab content */}
                            <div className="border-t border-dashed border-theme-divider/70 pt-4 min-h-[170px]">

                                {/* TOTAL — disciplinas com barra */}
                                {activeHealthTab === 'total' && (
                                    <div className="animate-fadeIn space-y-1">
                                        <p className="text-[9px] font-black uppercase tracking-[0.25em] text-theme-textMuted mb-3.5 flex items-center gap-1.5">
                                            <span className="material-symbols-outlined text-xs">folder_open</span> Disciplinas & Escopo
                                        </p>
                                        {activeProject?.scopes.length === 0 && <p className="text-xs text-theme-textMuted">Nenhuma disciplina cadastrada.</p>}
                                        <div className="space-y-3 max-h-[145px] overflow-y-auto scroller pr-1">
                                            {activeProject?.scopes.map(s => {
                                                const evTotal = s.events.reduce((acc, ev) => {
                                                    const applicableChecklist = ev.checklist ? ev.checklist.filter(i => i.status !== 'na') : [];
                                                    return acc + (applicableChecklist.length || 1);
                                                }, 0);
                                                const evDone  = s.events.reduce((acc, ev) => {
                                                    const applicableChecklist = ev.checklist ? ev.checklist.filter(i => i.status !== 'na') : [];
                                                    return acc + (applicableChecklist.length > 0 ? applicableChecklist.filter(i => i.done).length : (ev.completed ? 1 : 0));
                                                }, 0);
                                                const pct = evTotal > 0 ? Math.round((evDone / evTotal) * 100) : 0;
                                                const statusMap: Record<string, { label: string; bg: string; text: string }> = { 
                                                    stopped: { label: 'Parado', bg: 'bg-red-500/10', text: 'text-red-500' }, 
                                                    walking: { label: 'Andamento', bg: 'bg-orange-500/10', text: 'text-theme-orange' }, 
                                                    running: { label: 'Acelerado', bg: 'bg-blue-500/10', text: 'text-blue-500' }, 
                                                    done: { label: 'Concluído', bg: 'bg-emerald-500/10', text: 'text-emerald-500' } 
                                                };
                                                const currentStatus = statusMap[s.status] || { label: s.status, bg: 'bg-theme-bg', text: 'text-theme-textMuted' };
                                                return (
                                                    <div key={s.id} className="bg-theme-bg/30 border border-theme-divider/30 rounded-xl p-2.5 hover:bg-theme-highlight/40 transition-colors">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-1.5 h-1.5 rounded-full shrink-0 animate-pulse" style={{ backgroundColor: s.colorClass }} />
                                                                <span className="text-[10px] font-bold text-theme-text uppercase tracking-wide">{s.name}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className={`text-[7.5px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${currentStatus.bg} ${currentStatus.text}`}>
                                                                    {currentStatus.label}
                                                                </span>
                                                                <span className="text-[10px] font-black text-theme-text">{pct}%</span>
                                                            </div>
                                                        </div>
                                                        <div className="w-full h-1.5 rounded-full bg-theme-divider overflow-hidden relative">
                                                            <div className="h-full rounded-full transition-all duration-700 relative overflow-hidden" 
                                                                style={{ 
                                                                    width: `${pct}%`, 
                                                                    backgroundColor: s.colorClass || '#E85028',
                                                                    boxShadow: `0 0 8px ${s.colorClass || '#E85028'}`
                                                                }} 
                                                            >
                                                                <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)] bg-[length:8px_8px] animate-[progressStripes_1s_linear_infinite]" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* ANDAMENTO — tarefas ativas */}
                                {activeHealthTab === 'progress' && (
                                    <div className="animate-fadeIn">
                                        <p className="text-[9px] font-black uppercase tracking-[0.25em] text-theme-textMuted mb-3.5 flex items-center gap-1.5">
                                            <span className="material-symbols-outlined text-xs">trending_up</span> Tarefas em Execução
                                        </p>
                                        <div className="space-y-2.5 max-h-[145px] overflow-y-auto scroller pr-1">
                                            {activeProject?.scopes.flatMap(s =>
                                                s.events.filter(ev => !ev.completed && parseLocalDate(ev.startDate) <= new Date()).map(ev => ({ ev, scope: s }))
                                            ).length === 0 && <p className="text-xs text-theme-textMuted">Nenhuma tarefa em andamento.</p>}
                                            {activeProject?.scopes.flatMap(s =>
                                                s.events.filter(ev => !ev.completed && parseLocalDate(ev.startDate) <= new Date()).map(ev => {
                                                    const isLate = parseLocalDate(ev.endDate) < new Date();
                                                    return (
                                                        <div key={ev.id} className="flex items-center justify-between p-3 rounded-xl bg-theme-bg/40 border border-theme-divider/40 hover:border-theme-divider transition-all hover:bg-theme-highlight/40 gap-3">
                                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                                <div className="w-1.5 h-10 rounded-full shrink-0" style={{ backgroundColor: s.colorClass }} />
                                                                <div className="flex flex-col min-w-0">
                                                                    <span className="text-[10px] font-bold text-theme-text truncate">{ev.title}</span>
                                                                    <span className="text-[8px] text-theme-textMuted uppercase tracking-wider truncate mt-0.5 flex items-center gap-1">
                                                                        <span className="material-symbols-outlined text-[10px]">folder</span> {s.name}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <div className="flex flex-col items-end shrink-0 gap-1">
                                                                <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-full ${isLate ? 'bg-red-500/10 text-red-500 border border-red-500/20 shadow-[0_0_8px_rgba(239,68,68,0.1)]' : 'bg-orange-500/10 text-theme-orange border border-orange-500/20'}`}>
                                                                    {isLate ? 'ATRASADO' : 'ATIVO'}
                                                                </span>
                                                                <span className="text-[8px] text-theme-textMuted font-mono flex items-center gap-0.5">
                                                                    <span className="material-symbols-outlined text-[9px]">calendar_today</span> {formatLocalDate(ev.endDate)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* FEITO — gauge + saúde */}
                                {activeHealthTab === 'done' && (
                                    <div className="animate-fadeIn flex flex-col items-center gap-3">
                                        <p className="text-[9px] font-black uppercase tracking-[0.25em] text-theme-textMuted self-start flex items-center gap-1.5">
                                            <span className="material-symbols-outlined text-xs">verified_user</span> Saúde Geral do Projeto
                                        </p>
                                        <div className="flex items-center gap-6 w-full justify-center">
                                            <div className="relative w-24 h-24 shrink-0">
                                                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                                                    <defs>
                                                        <linearGradient id="gaugeGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
                                                            <stop offset="0%" stopColor="#10b981" />
                                                            <stop offset="100%" stopColor="#3b82f6" />
                                                        </linearGradient>
                                                    </defs>
                                                    <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="7" fill="transparent" className="text-theme-divider/30" />
                                                    <circle cx="50" cy="50" r="40" stroke="url(#gaugeGrad2)" strokeWidth="8" fill="transparent"
                                                        strokeDasharray="251.2" strokeDashoffset={251.2 - (251.2 * stats.rate / 100)}
                                                        strokeLinecap="round" className="transition-all duration-1000 ease-out" 
                                                        style={{ filter: 'drop-shadow(0 0 4px rgba(16,185,129,0.3))' }}
                                                    />
                                                </svg>
                                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                    <span className="text-xl font-black text-theme-text leading-none">{stats.rate}%</span>
                                                    <span className="text-[6.5px] font-bold text-theme-textMuted uppercase mt-1">Concluído</span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-1.5 flex-1 max-w-[150px]">
                                                <div className="flex items-center justify-between bg-theme-bg/30 border border-theme-divider/40 rounded-xl px-2.5 py-1">
                                                    <span className="text-[7.5px] font-black text-theme-textMuted uppercase">Status</span>
                                                    <span className={`text-[7.5px] font-black px-1.5 py-0.5 rounded border ${projectHealth.border} ${projectHealth.bg} ${projectHealth.color} tracking-wider`}>{projectHealth.label}</span>
                                                </div>
                                                <div className="flex items-center justify-between bg-theme-bg/30 border border-theme-divider/40 rounded-xl px-2.5 py-1">
                                                    <span className="text-[7.5px] font-black text-theme-textMuted uppercase">Feito</span>
                                                    <span className="text-[10px] font-black text-theme-text">{stats.don} / {stats.tot}</span>
                                                </div>
                                                <div className="flex items-center justify-between bg-theme-bg/30 border border-theme-divider/40 rounded-xl px-2.5 py-1">
                                                    <span className="text-[7.5px] font-black text-theme-textMuted uppercase">Atraso</span>
                                                    <span className={`text-[10px] font-black ${stats.lat > 0 ? 'text-red-400' : 'text-theme-textMuted'}`}>{stats.lat}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* TEMPO — horas por disciplina */}
                                {activeHealthTab === 'efficiency' && (
                                    <div className="animate-fadeIn">
                                        <p className="text-[9px] font-black uppercase tracking-[0.25em] text-theme-textMuted mb-3 flex items-center gap-1.5">
                                            <span className="material-symbols-outlined text-xs">timer</span> Tempo Investido
                                        </p>

                                        {/* Running Timer Live Alert */}
                                        {activeTimer ? (
                                            <div className="mb-3.5 bg-pink-500/10 border border-pink-500/35 rounded-xl p-3 flex items-center justify-between gap-2 shadow-[0_0_15px_rgba(236,72,153,0.08)] animate-pulse">
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <div className="w-2 h-2 rounded-full bg-pink-500 shrink-0 shadow-[0_0_8px_#ec4899] animate-ping" />
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-[8px] font-black text-pink-500 uppercase tracking-widest leading-none">Rastreando Agora</span>
                                                        <span className="text-[10px] font-bold text-theme-text truncate mt-1">{activeTimer.activity}</span>
                                                    </div>
                                                </div>
                                                <span className="text-xs font-mono font-black text-pink-500 shrink-0 bg-pink-500/15 px-2 py-0.5 rounded border border-pink-500/25">{formatTime(elapsedTime)}</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-end gap-2 mb-3.5 bg-theme-bg/30 border border-theme-divider/40 rounded-xl p-3">
                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-3xl font-black text-pink-500 leading-none">{Math.round(stats.totalTime / 3600)}</span>
                                                    <span className="text-[9px] font-black uppercase text-theme-textMuted">Horas</span>
                                                </div>
                                                <div className="h-6 w-px bg-theme-divider mx-2"></div>
                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-lg font-black text-theme-text">{activeProject?.timeLogs?.length || 0}</span>
                                                    <span className="text-[9px] font-black uppercase text-theme-textMuted">Sessões</span>
                                                </div>
                                            </div>
                                        )}

                                        <div className="space-y-2 max-h-[85px] overflow-y-auto scroller pr-1">
                                            {activeProject?.scopes.length === 0 && <p className="text-xs text-theme-textMuted">Sem dados de tempo.</p>}
                                            {activeProject?.scopes.map(s => {
                                                const scopeTime = activeProject.timeLogs?.filter(l => l.scopeId === s.id).reduce((a, l) => a + l.duration, 0) || 0;
                                                const totalLoggedSec = activeProject.timeLogs?.reduce((a, l) => a + l.duration, 0) || 0;
                                                const pct = totalLoggedSec > 0 ? Math.round((scopeTime / totalLoggedSec) * 100) : 0;
                                                if (scopeTime === 0) return null;
                                                return (
                                                    <div key={s.id} className="flex flex-col gap-1.5">
                                                        <div className="flex items-center justify-between text-[10px]">
                                                            <div className="flex items-center gap-1.5 min-w-0">
                                                                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: s.colorClass }} />
                                                                <span className="font-bold text-theme-text uppercase truncate">{s.name}</span>
                                                            </div>
                                                            <span className="font-black text-pink-500 shrink-0">{Math.round(scopeTime / 3600)}h <span className="text-theme-textMuted font-medium">({pct}%)</span></span>
                                                        </div>
                                                        <div className="w-full h-1 bg-theme-divider/50 rounded-full overflow-hidden">
                                                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: s.colorClass || '#ec4899' }} />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>

                        </div>)}

                    </div>{/* Close lg:col-span-4 left column */}

                    {/* --- CENTER COLUMN (Activity Log) --- */}

                    {hasProject && (<div className="lg:col-span-4 flex flex-col gap-8 transition-all duration-700 opacity-100 h-full overflow-y-auto">

                        <div className="ds-card-accent gradient-orange p-6 flex flex-col items-center justify-center h-32 relative overflow-hidden shadow-lg">

                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>



                            {/* Updated Header with Report Button */}

                            <div className="flex justify-between items-center w-full relative z-10 mb-4 px-2">

                                <h2 className="text-xs font-square font-black text-white tracking-[0.25em] uppercase flex items-center gap-2">

                                    <span className="material-symbols-outlined text-lg">history</span> Feed de Projeto

                                </h2>

                                <div className="flex items-center gap-2">

                                    <button

                                        onClick={generateWeeklyPlanAI}

                                        disabled={isTyping}

                                        title="A IA transforma o planejamento macro do cronograma em um plano semanal por colaborador"

                                        className="bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/40 text-white text-[9px] font-black uppercase px-3 py-1.5 rounded-lg transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"

                                    >

                                        <span className="material-symbols-outlined text-sm">{isTyping ? 'hourglass_empty' : 'calendar_view_week'}</span>

                                        {isTyping ? 'Gerando...' : 'Plano Semanal IA'}

                                    </button>

                                    <button

                                        onClick={generateProjectReport}

                                        disabled={isTyping}

                                        className="bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/40 text-white text-[9px] font-black uppercase px-3 py-1.5 rounded-lg transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"

                                    >

                                        <span className="material-symbols-outlined text-sm">{isTyping ? 'hourglass_empty' : 'auto_awesome'}</span>

                                        {isTyping ? 'Gerando...' : 'Gerar Relatório'}

                                    </button>

                                </div>

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

                        <div className={`ds-card p-8 flex flex-col flex-1 overflow-hidden relative shadow-neuro bg-theme-card`}>

                            <div className="flex-grow scroller overflow-y-auto space-y-6 pr-3 mb-4 pt-2">

                                {filteredActivities.slice().reverse().map((a, i) => {

                                    const isSystem = a.author === 'SISTEMA';

                                    const isAI = a.author === 'IA MANAGER';

                                    const isReport = a.author === 'RELATÓRIO';

                                    const authorColor = isReport

                                        ? 'text-emerald-400'

                                        : (isSystem || isAI)

                                            ? 'text-theme-orange'

                                            : 'text-theme-purple';

                                    return (

                                        <div key={i} className="flex flex-col gap-2 border-l-2 border-theme-divider pl-6 pb-2 relative group">

                                            <div className="absolute -left-[5px] top-1.5 w-[8px] h-[8px] rounded-full bg-theme-bg border-2 border-theme-orange shadow-sm" />

                                            <div className="flex justify-between items-baseline">

                                                <span className={`font-black text-[10px] uppercase tracking-wide flex items-center gap-1.5 ${authorColor}`}>

                                                    {isReport && <span className="material-symbols-outlined text-[12px]">summarize</span>}

                                                    {isAI && <span className="material-symbols-outlined text-[12px]">smart_toy</span>}

                                                    {a.author}

                                                </span>

                                                <span className="text-theme-textMuted font-mono text-[9px] bg-theme-highlight px-2 py-0.5 rounded-full">{a.date}</span>

                                            </div>

                                            <p className={`text-xs font-medium leading-relaxed text-theme-text ${(isAI || isReport) ? 'whitespace-pre-wrap' : ''}`}>{a.text}</p>

                                            {a.imageUrl && <img src={a.imageUrl} onClick={() => setViewingImage(a.imageUrl || null)} className="mt-3 rounded-2xl border border-theme-divider shadow-md max-w-full hover:scale-105 transition-transform cursor-zoom-in" />}

                                        </div>

                                    );

                                })}

                            </div>

                            <form className={`mt-auto pt-6 border-t border-theme-divider flex flex-col gap-4`} onSubmit={(e) => { e.preventDefault(); const f = e.currentTarget; const t = (f.elements.namedItem('t') as HTMLInputElement).value; const a = (f.elements.namedItem('a') as HTMLSelectElement).value; if (t && activeProject) { addLog(a, t, activityImage); setActivityImage(undefined); f.reset(); } }}>

                                <div className="flex gap-3">

                                    <button type="button" onClick={() => activityFileRef.current?.click()} className={`rounded-xl w-12 flex items-center justify-center border border-theme-divider bg-theme-bg text-theme-textMuted hover:text-theme-orange hover:border-theme-orange transition-all`}><span className="material-symbols-outlined text-xl">add_a_photo</span></button>

                                    <input type="file" ref={activityFileRef} onChange={async (e) => { const file = e.target.files?.[0]; if (file) { const sizeError = validateFileSize(file); if (sizeError) { setNotification(sizeError); return; } try { const result = await readFileAsDataURL(file); setActivityImage(result); } catch (err) { console.error('File operation failed:', err); setNotification('Erro ao processar arquivo. Tente novamente.'); } } }} className="hidden" accept="image/*" />

                                    <select name="a" className={`text-[10px] font-bold rounded-xl px-3 py-3 border border-theme-divider outline-none uppercase bg-theme-bg text-theme-textMuted focus:border-theme-orange w-32`}>{db.team.map(t => <option key={t} value={t} className="bg-theme-card">{t}</option>)}</select>

                                    <button className="bg-theme-orange text-white rounded-xl w-12 shadow-lg hover:bg-orange-600 transition-all flex items-center justify-center" type="submit"><span className="material-symbols-outlined text-xl font-bold">send</span></button>

                                </div>

                                <input name="t" className={`w-full text-xs font-medium rounded-xl px-4 py-4 border border-theme-divider outline-none focus:border-theme-orange transition-all bg-theme-bg text-theme-text placeholder:text-theme-textMuted shadow-inner`} placeholder="Registrar nova atividade..." required />

                            </form>

                        </div>

                    </div>)}



                    {hasProject && (<div className="lg:col-span-4 flex flex-col gap-8 transition-all duration-1000 opacity-100 h-full overflow-hidden">


                        {/* List */}

                        <div className={`ds-card p-8 flex flex-1 flex-col overflow-hidden relative shadow-neuro bg-theme-card`}>

                            <div className={`flex justify-between items-center mb-8 border-b border-theme-divider pb-6 sticky top-0 bg-theme-card z-20`}>

                                <div className="flex items-center gap-3">

                                    <div className="bg-theme-orange/10 p-2 rounded-xl text-theme-orange"><span className="material-symbols-outlined">check_box</span></div>

                                    <h3 className={`font-square font-bold text-xs uppercase tracking-widest text-theme-text`}>Disciplinas & ATIVIDADES</h3>

                                </div>

                                {!isViewer && (
                                    <button className="text-theme-textMuted hover:text-theme-orange transition-colors bg-theme-highlight p-2 rounded-full" onClick={() => { setEditingScopeId(null); setShowScopeModal(true); }}><span className="material-symbols-outlined text-xl">add</span></button>
                                )}

                            </div>

                            <div className="flex-grow scroller overflow-y-auto space-y-4 pr-3 pb-2">

                                {activeProject?.scopes.filter(s => !memberFilter || s.resp === memberFilter || s.events.some(ev => ev.resp === memberFilter)).map(scope => (

                                    <div key={scope.id} className={`group flex items-center gap-5 cursor-pointer p-4 rounded-2xl border border-transparent hover:border-theme-divider hover:bg-theme-highlight transition-all shadow-sm bg-theme-bg ${selectedScopeIdForFiles === scope.id ? 'bg-indigo-500/10 border-indigo-200' : ''}`} onClick={() => setSelectedScopeIdForFiles(scope.id)}>

                                        <div className="w-1.5 h-10 rounded-full" style={{ backgroundColor: scope.colorClass }}></div>

                                        <div className="flex flex-col flex-1 overflow-hidden">

                                            <div className="flex items-center justify-between">

                                                <span className="text-sm font-bold text-theme-text truncate">{scope.name}</span>

                                                {!isViewer ? (
                                                    <div className="flex opacity-0 group-hover:opacity-100 transition-opacity gap-2">

                                                        <button onClick={(e) => { e.stopPropagation(); setActiveScopeIdForEvent(scope.id); setEditingEventId(null); setShowEventModal(true); }} className="text-theme-textMuted hover:text-theme-orange bg-theme-card p-1.5 rounded-lg shadow-sm" title="Nova Ação"><span className="material-symbols-outlined text-sm">add_task</span></button>

                                                        <button onClick={(e) => { e.stopPropagation(); setEditingScopeId(scope.id); setShowScopeModal(true); }} className="text-theme-textMuted hover:text-theme-purple bg-theme-card p-1.5 rounded-lg shadow-sm" title="Editar Disciplina"><span className="material-symbols-outlined text-sm">edit</span></button>

                                                        <button onClick={(e) => { e.stopPropagation(); handleAddLink(scope.id); }} className="text-theme-textMuted hover:text-theme-cyan bg-theme-card p-1.5 rounded-lg shadow-sm" title="Anexar Arquivos"><span className="material-symbols-outlined text-sm">link</span></button>

                                                        <button onClick={async (e) => { e.stopPropagation(); if (await requestConfirm({ message: 'Apagar disciplina?', variant: 'danger', title: 'Remover Disciplina' })) onDeleteScope(scope.id); }} className="text-theme-textMuted hover:text-red-500 bg-theme-card p-1.5 rounded-lg shadow-sm" title="Remover Disciplina"><span className="material-symbols-outlined text-sm">delete</span></button>

                                                    </div>
                                                ) : (
                                                    <div className="flex gap-2">
                                                        <button onClick={(e) => { e.stopPropagation(); handleAddLink(scope.id); }} className="opacity-0 group-hover:opacity-100 text-theme-textMuted hover:text-theme-cyan bg-theme-card p-1.5 rounded-lg shadow-sm" title="Visualizar Arquivos"><span className="material-symbols-outlined text-sm">link</span></button>
                                                    </div>
                                                )}

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

                                    {db.team.map(member => {

                                        const count = teamStats[member]?.count || 0; if (count === 0 && !(teamStats[member]?.leaderOf?.length ?? 0)) return null; const initials = member.split(' ').map((n, i) => i < 2 ? n[0] : '').join('').toUpperCase(); return (

                                            <div key={member} className="flex items-center bg-theme-bg rounded-full px-3 py-1.5 border border-theme-divider shadow-sm shrink-0" title={`${member}: ${count} tarefas`}>

                                                <div className="w-5 h-5 rounded-full bg-theme-text text-theme-bg flex items-center justify-center text-[8px] font-black mr-2">{initials}</div>

                                                <span className="text-[9px] font-bold text-theme-text">{count}</span>

                                            </div>

                                        );

                                    })}

                                </div>

                            </div>



                            {/* Time Tracker UI - Replaces Maps */}

                            <div className="h-72 border-t border-theme-divider bg-theme-bg relative z-20 shadow-[0_-5px_15px_rgba(0,0,0,0.1)] p-6 flex flex-col">

                                <div className="flex justify-between items-center mb-4">

                                    <h4 className="text-[10px] font-black text-theme-textMuted uppercase tracking-widest flex items-center gap-2">

                                        <span className="material-symbols-outlined text-sm">timer</span> Rastreador de Horas

                                    </h4>

                                    <div className="flex items-center gap-2">
                                        <div className="text-2xl font-mono font-black text-theme-text tracking-widest">
                                            {formatTime(elapsedTime)}
                                        </div>
                                        {activeProject?.timeLogs && activeProject.timeLogs.length > 0 && (
                                            <button
                                                onClick={() => setShowHorasModal(true)}
                                                title="Banco de Horas"
                                                className="w-7 h-7 rounded-lg bg-theme-highlight border border-theme-divider hover:border-theme-orange text-theme-textMuted hover:text-theme-orange flex items-center justify-center transition-all"
                                            >
                                                <span className="material-symbols-outlined text-sm">bar_chart</span>
                                            </button>
                                        )}
                                    </div>

                                </div>



                                <div className="flex flex-col gap-2 mb-4">

                                    <div className="flex gap-2">

                                        <select

                                            className="flex-1 bg-theme-card border border-theme-divider rounded-xl px-2 py-2 text-[10px] font-bold text-theme-text outline-none focus:border-theme-orange transition-all"

                                            value={timerScopeId}

                                            onChange={(e) => { setTimerScopeId(e.target.value); setTimerEventId(""); }}

                                            disabled={!!activeTimer}

                                        >

                                            <option value="">SELECIONE A DISCIPLINA</option>

                                            {activeProject?.scopes.map(s => <option key={s.id} value={s.id}>{s.name.toUpperCase()}</option>)}

                                        </select>

                                        <select

                                            className="flex-1 bg-theme-card border border-theme-divider rounded-xl px-2 py-2 text-[10px] font-bold text-theme-text outline-none focus:border-theme-orange transition-all"

                                            value={timerEventId}

                                            onChange={(e) => {

                                                setTimerEventId(e.target.value);

                                                const ev = activeProject?.scopes.find(s => s.id === timerScopeId)?.events.find(evt => evt.id === e.target.value);

                                                if (ev) {

                                                    const input = document.getElementById('timer-activity') as HTMLInputElement;

                                                    if (input) input.value = ev.title;

                                                }

                                            }}

                                            disabled={!!activeTimer || !timerScopeId}

                                        >

                                            <option value="">SELECIONE A AÇÃO</option>

                                            {timerScopeId && activeProject?.scopes.find(s => s.id === timerScopeId)?.events.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}

                                        </select>

                                    </div>

                                    <div className="flex gap-2">

                                        <input

                                            type="text"

                                            id="timer-activity"

                                            placeholder="Descreva a atividade..."

                                            className="flex-1 bg-theme-card border border-theme-divider rounded-xl px-4 py-2 text-xs font-bold text-theme-text outline-none focus:border-theme-orange transition-all placeholder:text-theme-textMuted/50"

                                            disabled={!!activeTimer}

                                            defaultValue={activeTimer?.activity || ''}

                                        />

                                        {!activeTimer ? (

                                            <button

                                                onClick={() => {

                                                    const input = document.getElementById('timer-activity') as HTMLInputElement;

                                                    handleStartTimer(input.value);

                                                }}

                                                className="bg-theme-green text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-green-600 transition-all flex items-center gap-2 shadow-sm"

                                            >

                                                <span className="material-symbols-outlined text-lg">play_arrow</span> Iniciar

                                            </button>

                                        ) : (

                                            <button

                                                onClick={handleStopTimer}

                                                className="bg-theme-red text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-red-600 transition-all flex items-center gap-2 shadow-sm animate-pulse"

                                            >

                                                <span className="material-symbols-outlined text-lg">stop</span> Parar

                                            </button>

                                        )}

                                    </div>

                                </div>



                                <div className="flex-1 overflow-y-auto scroller space-y-2 border-t border-theme-divider pt-2">

                                    {activeProject?.timeLogs && activeProject.timeLogs.length > 0 ? (

                                        activeProject.timeLogs.slice(0, 5).map(log => (

                                            <div key={log.id} className="flex justify-between items-center bg-theme-card p-2 rounded-lg border border-theme-divider hover:border-theme-orange transition-colors group">

                                                <div className="flex flex-col overflow-hidden">

                                                    <span className="text-[10px] font-bold text-theme-text truncate max-w-[150px]" title={log.activity}>{log.activity}</span>

                                                    <div className="flex items-center gap-1">

                                                        <span className="text-[9px] text-theme-textMuted">{new Date(log.startTime).toLocaleDateString()}</span>

                                                        {log.scopeId && <span className="text-[8px] px-1 py-0.5 rounded bg-theme-highlight text-theme-textMuted uppercase">{activeProject.scopes.find(s => s.id === log.scopeId)?.name}</span>}

                                                    </div>

                                                </div>

                                                {editingLogId === log.id ? (

                                                    <div className="flex items-center gap-1">

                                                        <input

                                                            type="number"

                                                            autoFocus

                                                            className="w-12 bg-theme-bg border border-theme-orange rounded px-1 py-0.5 text-[10px] text-theme-text outline-none"

                                                            defaultValue={Math.floor(log.duration / 60)}

                                                            onBlur={(e) => handleUpdateLog(log.id, parseInt(e.target.value) * 60)}

                                                            onKeyDown={(e) => e.key === 'Enter' && handleUpdateLog(log.id, parseInt(e.currentTarget.value) * 60)}

                                                        />

                                                        <span className="text-[8px] text-theme-textMuted">min</span>

                                                    </div>

                                                ) : (

                                                    <span

                                                        onClick={() => setEditingLogId(log.id)}

                                                        className="text-[10px] font-mono font-bold text-theme-textMuted bg-theme-bg px-2 py-1 rounded-md border border-theme-divider group-hover:text-theme-orange group-hover:border-theme-orange transition-colors cursor-pointer hover:bg-theme-highlight"

                                                        title="Clique para editar"

                                                    >

                                                        {formatTime(log.duration)}

                                                    </span>

                                                )}

                                            </div>

                                        ))

                                    ) : (

                                        <div className="text-center py-4 text-[9px] text-theme-textMuted uppercase font-bold opacity-50">

                                            Nenhum registro recente

                                        </div>

                                    )}

                                </div>

                            </div>





                        </div>

                    </div>)}

                </div>
                )}

                {/* --- MAIN CONTENT AREA --- */}
                <div id="tab-content-area" className="w-full h-1"></div>



                {/* --- TAB: TIMELINE VIEW --- */}
                <Suspense fallback={<div className="flex items-center justify-center h-64"><span className="material-symbols-outlined text-4xl text-theme-textMuted animate-pulse">hourglass_top</span></div>}>

                    {activeTab === 'timeline' && hasProject && (

                        <div className={`transition-all duration-1000 flex flex-col gap-12 animate-fadeIn max-w-[1920px] mx-auto w-full`}>

                            <div className={`self-center bg-theme-card rounded-full p-2 flex gap-4 items-center no-print shadow-neuro px-6`}>

                                <button onClick={() => setZoomLevel(Math.max(0.2, zoomLevel - 0.2))} className="w-8 h-8 rounded-full bg-theme-bg border border-theme-divider flex items-center justify-center hover:bg-theme-highlight text-theme-text transition-all active:scale-95"><span className="material-symbols-outlined text-sm">remove</span></button>

                                <div className="flex flex-col items-center w-48">

                                    <input

                                        type="range"

                                        min="0.2"

                                        max="3"

                                        step="0.1"

                                        value={zoomLevel}

                                        onChange={(e) => setZoomLevel(parseFloat(e.target.value))}

                                        className="w-full h-1.5 bg-theme-bg rounded-lg appearance-none cursor-pointer accent-theme-orange"

                                    />

                                    <span className="text-[9px] font-bold text-theme-textMuted mt-1 w-full text-center flex justify-between px-1">

                                        <span>MACRO</span>

                                        <span className="text-theme-orange">{Math.round(zoomLevel * 100)}%</span>

                                        <span>MICRO</span>

                                    </span>

                                </div>

                                <button onClick={() => setZoomLevel(Math.min(3, zoomLevel + 0.2))} className="w-8 h-8 rounded-full bg-theme-bg border border-theme-divider flex items-center justify-center hover:bg-theme-highlight text-theme-text transition-all active:scale-95"><span className="material-symbols-outlined text-sm">add</span></button>

                            </div>



                            {/* View Switcher: Timeline vs Agenda */}

                            <div className="self-center flex bg-theme-bg rounded-xl p-1 border border-theme-divider shadow-inner no-print">

                                <button

                                    onClick={() => setActiveTimelineView('timeline')}

                                    className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-2 ${activeTimelineView === 'timeline' ? 'bg-[#E8E9F0] text-black shadow-sm' : 'text-theme-textMuted hover:text-theme-text'}`}

                                >

                                    <span className="material-symbols-outlined text-base">view_timeline</span> Cronograma

                                </button>

                                <button

                                    onClick={() => setActiveTimelineView('agenda')}

                                    className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-2 ${activeTimelineView === 'agenda' ? 'bg-[#E8E9F0] text-black shadow-sm' : 'text-theme-textMuted hover:text-theme-text'}`}

                                >

                                    <span className="material-symbols-outlined text-base">calendar_month</span> Agenda

                                </button>

                            </div>



                            {activeTimelineView === 'timeline' ? (

                                <>

                                    <div className="ds-card overflow-hidden bg-theme-card shadow-neuro">

                                        <div className="flex items-center gap-3 px-6 py-4 border-b border-theme-divider">

                                            <div className="w-0.5 h-5 rounded-full bg-theme-orange"></div>

                                            <span className="material-symbols-outlined text-base text-theme-orange">view_timeline</span>

                                            <h2 className="font-square font-black text-xs uppercase tracking-widest text-theme-text">Cronograma Planejado</h2>

                                        </div>

                                        <div className="bg-theme-bg">

                                            <Timeline

                                                project={activeProject}

                                                isExecuted={false}

                                                zoomLevel={zoomLevel}

                                                setZoomLevel={setZoomLevel}

                                                onBarClick={(sid, eid) => { setActiveChecklistIds({ sid, eid }); setShowChecklistModal(true); }}

                                                onBarContextMenu={() => { }}

                                                onAddDependency={onAddDependency}

                                                onDeleteEvent={onDeleteEvent}

                                                isViewer={isViewer}

                                            />

                                        </div>

                                    </div>



                                    <div className="ds-card overflow-hidden border border-theme-cyan/20 bg-theme-card shadow-neuro">

                                        <div className="flex items-center gap-3 px-6 py-4 border-b border-theme-divider">

                                            <div className="w-0.5 h-5 rounded-full bg-theme-cyan"></div>

                                            <span className="material-symbols-outlined text-base text-theme-cyan">view_timeline</span>

                                            <h2 className="font-square font-black text-xs uppercase tracking-widest text-theme-text">Cronograma Executado</h2>

                                        </div>

                                        <div className="bg-theme-bg">

                                            <Timeline

                                                project={activeProject}

                                                isExecuted={true}

                                                zoomLevel={zoomLevel}

                                                setZoomLevel={setZoomLevel}

                                                onBarClick={(sid, eid) => { setActiveChecklistIds({ sid, eid }); setShowChecklistModal(true); }}

                                                onBarContextMenu={(sid, eid) => { setActiveScopeIdForEvent(sid); setEditingEventId(eid); setShowEventModal(true); }}

                                                onAddDependency={onAddDependency}

                                                onDeleteEvent={onDeleteEvent}

                                                isViewer={isViewer}

                                            />

                                        </div>

                                    </div>

                                </>

                            ) : (

                                <div className="animate-fadeIn">

                                    <Agenda

                                        project={activeProject}

                                        onAddEvent={(date) => {

                                            setNewEventDate(date.toISOString().split('T')[0]);

                                            setActiveScopeIdForEvent(null); // Clear specific scope so modal asks/defaults

                                            setEditingEventId(null);

                                            setShowEventModal(true);

                                        }}

                                        onEditEvent={(scopeId, eventId) => {

                                            if (isViewer) {

                                                setActiveChecklistIds({ sid: scopeId, eid: eventId });

                                                setShowChecklistModal(true);

                                            } else {

                                                setActiveScopeIdForEvent(scopeId);

                                                setEditingEventId(eventId);

                                                setShowEventModal(true);

                                            }

                                        }}

                                        isViewer={isViewer}

                                    />

                                </div>

                            )}



                            <div className={`ds-card p-10 h-[280px] flex flex-col relative overflow-hidden bg-theme-card border border-theme-divider shadow-neuro mb-20`}>

                                <div className="flex justify-between items-start mb-8">

                                    <div>

                                        <div className="flex items-center gap-2 mb-3"><div className="w-0.5 h-5 rounded-full bg-theme-orange"></div><span className="material-symbols-outlined text-base text-theme-orange">timer</span><h2 className="font-square font-black text-xs uppercase tracking-widest text-theme-text">Controle de Prazo Global</h2></div>

                                        <div className="mt-6 flex items-center gap-6"><button onClick={() => setShowTeamModal(true)} className="bg-theme-highlight border border-theme-divider hover:border-theme-orange text-theme-textMuted px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all group shadow-sm"><span className="material-symbols-outlined text-xl group-hover:text-theme-orange transition-colors">groups</span> Equipe Técnica</button><div className="h-10 w-px bg-theme-divider mx-2"></div><div className="flex items-center gap-3 overflow-x-auto scroller pb-2 max-w-[800px]"><button onClick={() => setMemberFilter(null)} className={`flex flex-col items-center px-4 py-2 rounded-xl border transition-all shrink-0 shadow-sm ${!memberFilter ? 'bg-theme-orange border-theme-orange' : 'bg-theme-card border-theme-divider hover:bg-theme-highlight'}`}><span className={`text-[10px] font-black uppercase ${!memberFilter ? 'text-white' : 'text-theme-textMuted'}`}>Todos</span></button>{db.team.map(member => { const isLeader = (teamStats[member]?.leaderOf?.length ?? 0) > 0; const actionCount = teamStats[member]?.count || 0; const isActive = memberFilter === member; return (<button key={member} onClick={() => setMemberFilter(isActive ? null : member)} className={`flex items-center gap-3 px-4 py-2 rounded-xl border transition-all shrink-0 group shadow-sm ${isActive ? 'bg-theme-text border-theme-text' : 'bg-theme-card border-theme-divider hover:bg-theme-highlight'}`}><div className="flex flex-col items-start"><span className={`text-[10px] font-bold uppercase truncate max-w-[100px] ${isActive ? 'text-theme-bg' : 'text-theme-textMuted group-hover:text-theme-text'}`}>{member}</span><div className="flex gap-2 mt-0.5">{isLeader && <span className="text-[7px] font-black text-theme-orange bg-orange-500/10 px-1 rounded uppercase">LÍDER</span>}<span className="text-[7px] font-bold text-theme-textMuted">{actionCount} AÇÕES</span></div></div></button>) })}</div></div>

                                    </div>

                                    <div className="flex flex-col items-end gap-3"><button onClick={() => setShowDisciplinesModal(true)} className="bg-theme-card border border-theme-divider text-theme-textMuted hover:text-theme-orange px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-sm hover:shadow-md"><span className="material-symbols-outlined text-base">view_list</span> Disciplinas</button><button onClick={() => setShowSettingsModal(true)} className="bg-theme-card border border-theme-divider text-theme-textMuted hover:text-theme-orange px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-sm hover:shadow-md"><span className="material-symbols-outlined text-base">settings</span> Ajustar Período</button></div>

                                </div>

                                <div className="flex-1 flex flex-col justify-center pb-2">

                                    {/* Dynamic Progress Logic with Member Filter */}

                                    {(() => {

                                        // 1. Gather all events for the project (or filtered by team member)

                                        const allEvents = activeProject ? activeProject.scopes.flatMap(s => s.events).filter(e => !memberFilter || e.resp === memberFilter) : [];



                                        // 2. Determine Start Date

                                        // If filtered by member: Start date is the EARLIEST event date for that member.

                                        // If NOT filtered: Start date is the Project Timeline Start (fixed usually).

                                        // Actually user wants: "start é quando eu criei o projeto esta vinculada a data de início" -> activeProject.timelineStart

                                        // BUT "podendo filtrar pela equipe onde vejo individualmente onde a pessoa foi responsável pela primeira ação"



                                        let dynamicStart = activeProject ? new Date(activeProject.timelineStart) : new Date();

                                        let dynamicEnd = activeProject ? new Date(activeProject.timelineEnd) : new Date();



                                        if (memberFilter && allEvents.length > 0) {

                                            // If filtered, find min start date of this person's tasks

                                            const starts = allEvents.map(e => new Date(e.startDate).getTime());

                                            dynamicStart = new Date(Math.min(...starts));

                                        }



                                        // 3. Determine End Date

                                        // "entrega é sempre a ultima ação que eu coloquei seguindo de sempre ser o prazo mais longo"

                                        if (allEvents.length > 0) {

                                            const ends = allEvents.map(e => new Date(e.endDate).getTime());

                                            const currentProjectEnd = activeProject ? new Date(activeProject.timelineEnd).getTime() : 0;

                                            // Use MAX of last event end date

                                            dynamicEnd = new Date(Math.max(...ends));

                                        }



                                        // 4. Calculate Progress

                                        const now = new Date().getTime();

                                        const totalDuration = dynamicEnd.getTime() - dynamicStart.getTime();

                                        const elapsed = now - dynamicStart.getTime();

                                        let p = totalDuration > 0 ? (elapsed / totalDuration) * 100 : 0;

                                        p = Math.min(Math.max(p, 0), 100);



                                        return (

                                            <>

                                                <div className="h-4 w-full bg-theme-bg rounded-full relative overflow-hidden border border-theme-divider shadow-inner"><div className="h-full bg-gradient-to-r from-theme-orange to-red-500 transition-all duration-1000 ease-out shadow-glow" style={{ width: `${p}%` }} /><div className="absolute top-0 bottom-0 w-[4px] bg-theme-card shadow-[0_0_15px_rgba(0,0,0,0.2)] z-10 transition-all duration-1000 ease-out" style={{ left: `${p}%` }} /></div><div className="flex justify-between mt-4"><div className="flex flex-col items-start"><span className="text-[9px] font-black text-theme-cyan uppercase tracking-widest mb-1">START {memberFilter ? `(${memberFilter})` : ''}</span><div className="bg-theme-highlight border border-theme-divider px-3 py-1 rounded-lg text-xs font-bold text-theme-textMuted shadow-sm">{dynamicStart.toLocaleDateString()}</div></div><div className="flex flex-col items-end"><span className="text-[9px] font-black text-[#00b87c] uppercase tracking-widest mb-1">ENTREGA {memberFilter ? `(${memberFilter})` : ''}</span><div className="bg-theme-highlight border border-theme-divider px-3 py-1 rounded-lg text-xs font-bold text-theme-textMuted shadow-sm">{dynamicEnd.toLocaleDateString()}</div></div></div>
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>
                    )}

                                                     {/* --- TAB: GALLERY VIEW --- */}
                    {activeTab === 'gallery' && hasProject && (
                        <div className="animate-fadeIn w-full max-w-[1920px] mx-auto">
                            <div className="ds-card bg-theme-card overflow-hidden w-full border border-theme-border rounded-3xl min-h-[calc(100vh-140px)] shadow-neuro">
                                <Suspense fallback={<div className="flex items-center justify-center h-full text-theme-textMuted text-sm p-8">Carregando galeria...</div>}>
                                    <GalleryTab
                                        project={activeProject}
                                        onUpdateProject={(upd) => setDb(prev => ({ ...prev, projects: prev.projects.map(p => p.id === upd.id ? { ...upd, updatedAt: new Date().toISOString() } : p) }))}
                                        currentUser={currentUser}
                                    />
                                </Suspense>
                            </div>
                        </div>
                    )}



                    {/* --- TAB: FILES VIEW --- */}

                    {activeTab === 'files' && hasProject && (
                        <div className="animate-fadeIn max-w-[1920px] mx-auto w-full">
                            <div className="ds-card bg-theme-card overflow-hidden w-full border border-theme-border rounded-3xl h-[calc(100vh-140px)] shadow-neuro p-6 md:p-8 flex flex-col gap-6">
                                {/* Header and Filter */}
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-theme-bg/60 backdrop-blur-md px-6 py-4 rounded-2xl border border-theme-border shadow-sm shrink-0 gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-0.5 h-5 rounded-full bg-theme-orange"></div>
                                        <span className="material-symbols-outlined text-base text-theme-orange">folder_special</span>
                                        <div>
                                            <h2 className="font-square font-black text-xs uppercase tracking-widest text-theme-text">Central de Arquivos</h2>
                                            <p className="text-[9px] font-bold text-theme-textMuted uppercase tracking-wider mt-0.5">Painel de Documentação ({activeProject.scopes.reduce((acc, s) => acc + (s.fileLinks?.length || 0), 0)} arquivos)</p>
                                        </div>
                                    </div>

                                    {/* Filter by Collaborator */}
                                    <div className="flex gap-2 overflow-x-auto scroller px-2 py-1 items-center max-w-full md:max-w-[50vw]">
                                        <span className="text-[9px] font-black uppercase text-theme-textMuted mr-2 flex items-center gap-1 shrink-0"><span className="material-symbols-outlined text-[10px]">filter_list</span> Filtrar por:</span>
                                        <button onClick={() => setFileMemberFilter(null)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all shadow-sm border shrink-0 ${!fileMemberFilter ? 'bg-[#E8E9F0] text-black border-transparent' : 'bg-theme-card text-theme-textMuted border-theme-divider hover:bg-theme-highlight'}`}>TODOS</button>
                                        {db.team.map((member, idx) => {
                                            const defaultColors = ['bg-red-500', 'bg-yellow-500', 'bg-green-400', 'bg-blue-400', 'bg-purple-400', 'bg-pink-400', 'bg-orange-400', 'bg-teal-400'];
                                            const colorClass = defaultColors[idx % defaultColors.length];
                                            const isActive = fileMemberFilter === member;
                                            return (
                                                <button key={member} onClick={() => setFileMemberFilter(member)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all shadow-sm border shrink-0 ${isActive ? 'bg-theme-card border-theme-text scale-105 text-theme-text' : 'bg-theme-card border-theme-border text-theme-textMuted hover:bg-theme-highlight'}`}>
                                                    <div className={`w-3 h-3 rounded-full ${colorClass} shadow-sm border border-black/20`} />
                                                    {member}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Folders Grid Container with internal scroll */}
                                <div className="flex-1 overflow-y-auto scroller pr-1">
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8 pb-6">
                                        {activeProject.scopes.map(scope => {
                                            const sortedFiles = (scope.fileLinks || [])
                                                .filter(f => !fileMemberFilter || f.author === fileMemberFilter)
                                                .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

                                            if (fileMemberFilter && sortedFiles.length === 0 && scope.resp !== fileMemberFilter) return null; // Hide empty folders when filtering

                                            // distinct authors in this scope
                                            const authors = Array.from(new Set(scope.fileLinks?.map(f => f.author || 'SISTEMA')));

                                            const scopeTimeSecs = activeProject.timeLogs
                                                ?.filter(log => log.scopeId === scope.id)
                                                .reduce((acc, log) => acc + (log.duration || 0), 0) || 0;
                                            const scopeH = Math.floor(scopeTimeSecs / 3600);
                                            const scopeM = Math.floor((scopeTimeSecs % 3600) / 60);
                                            const scopeS = scopeTimeSecs % 60;
                                            const scopeTimeStr = `${scopeH.toString().padStart(2, '0')}:${scopeM.toString().padStart(2, '0')}:${scopeS.toString().padStart(2, '0')}`;

                                            return (
                                                <div key={scope.id} className={`rounded-[2rem] flex flex-col transition-all duration-300 shadow-neuro group overflow-hidden relative border ${theme === 'dark' ? 'bg-[#151B24]/40 hover:bg-[#151B24]/60' : 'bg-white hover:shadow-xl'}`} style={{ borderColor: `${scope.colorClass}40` }}>
                                                    {/* Accent Glow */}
                                                    <div className="absolute top-0 right-0 w-32 h-32 blur-[60px] opacity-20 pointer-events-none rounded-full" style={{ backgroundColor: scope.colorClass }}></div>

                                                    {/* Folder Header */}
                                                    <div className="p-6 pb-4 border-b border-theme-divider relative z-10">
                                                        <div className="flex justify-between items-start mb-4">
                                                            <div className="w-16 h-16 rounded-2xl bg-theme-highlight flex items-center justify-center mb-2 group-hover:opacity-90 transition-all" style={{ backgroundColor: `${scope.colorClass}18` }}>
                                                                <span className="material-symbols-outlined text-4xl" style={{ color: scope.colorClass }}>folder_open</span>
                                                            </div>

                                                            <div className="flex flex-col items-end gap-2">
                                                                {scopeTimeStr !== "00:00:00" && (
                                                                    <span className="text-[9px] font-black bg-theme-bg border border-theme-divider px-3 py-1 rounded-full text-theme-orange uppercase tracking-widest flex items-center gap-1 shadow-sm">
                                                                        <span className="material-symbols-outlined text-[12px]">timer</span> {scopeTimeStr}
                                                                    </span>
                                                                )}
                                                                <span className="text-[9px] font-black bg-theme-bg border border-theme-divider px-3 py-1 rounded-full text-theme-textMuted uppercase tracking-widest flex items-center gap-1 shadow-sm">
                                                                    LÍDER <span className="text-theme-text">{scope.resp}</span>
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <h3 className="font-square font-black text-xl text-theme-text uppercase tracking-widest truncate">{scope.name}</h3>

                                                        <div className="flex justify-between items-end mt-4">
                                                            {/* Author Avatars */}
                                                            <div className="flex -space-x-2">
                                                                {authors.length > 0 ? authors.slice(0, 5).map(author => {
                                                                    const idx = db.team.indexOf(author);
                                                                    const defaultColors = ['bg-red-500', 'bg-yellow-500', 'bg-green-400', 'bg-blue-400', 'bg-purple-400', 'bg-pink-400', 'bg-orange-400', 'bg-teal-400'];
                                                                    const colorClass = idx >= 0 ? defaultColors[idx % defaultColors.length] : 'bg-gray-500';
                                                                    const initials = author.substring(0, 2).toUpperCase();
                                                                    return (
                                                                        <div key={author} className={`w-8 h-8 rounded-full flex items-center justify-center text-[9px] font-black text-white border-[3px] border-theme-card shadow-sm ${colorClass}`} title={author}>
                                                                            {initials}
                                                                        </div>
                                                                    )
                                                                }) : (
                                                                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-[9px] font-black text-white border-[3px] border-theme-card shadow-sm bg-theme-divider" title="SISTEMA">
                                                                        --
                                                                    </div>
                                                                )}
                                                                {authors.length > 5 && <div className="w-8 h-8 rounded-full flex items-center justify-center text-[9px] font-black text-theme-textMuted bg-theme-bg border-2 border-theme-card shadow-sm">+{authors.length - 5}</div>}
                                                            </div>

                                                            <div className="flex gap-2 shrink-0">
                                                                <label className="text-theme-text cursor-pointer transition-transform hover:scale-110 hover:-translate-y-1 p-2 bg-theme-bg border border-theme-divider rounded-xl shadow-lg flex items-center justify-center" title="Upload de Arquivo">
                                                                    <span className="material-symbols-outlined text-sm">upload_file</span>
                                                                    <input type="file" className="hidden" onChange={(e) => handleFileTabUpload(e, scope.id)} />
                                                                </label>
                                                                <button onClick={() => handleAddLink(scope.id)} className="text-theme-text transition-transform hover:scale-110 hover:-translate-y-1 p-2 bg-theme-bg border border-theme-divider rounded-xl shadow-lg flex items-center justify-center" title="Adicionar Link Externo">
                                                                    <span className="material-symbols-outlined text-sm">add_link</span>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* File List */}
                                                    <div className="p-4 space-y-2 flex-1 max-h-[300px] overflow-y-auto scroller relative z-10 bg-black/5 dark:bg-black/20">
                                                        {sortedFiles.length > 0 ? sortedFiles.map((f, i) => {
                                                            const authorIdx = db.team.indexOf(f.author || '');
                                                            const defaultColors = ['#ef4444', '#eab308', '#4ade80', '#60a5fa', '#c084fc', '#f472b6', '#fb923c', '#2dd4bf'];
                                                            const hexColor = authorIdx >= 0 ? defaultColors[authorIdx % defaultColors.length] : '#888';

                                                            return (
                                                                <div key={i} className="flex flex-col p-4 rounded-2xl bg-theme-bg border border-theme-divider hover:border-theme-orange group/link cursor-pointer transition-all shadow-md hover:shadow-xl hover:-translate-y-1" onClick={() => {
                                                                    if (f.path.startsWith('data:application/pdf')) {
                                                                        setViewingFile({ path: f.path, type: 'pdf' });
                                                                    } else if (f.path.startsWith('data:image')) {
                                                                        setViewingFile({ path: f.path, type: 'image' });
                                                                    } else {
                                                                        window.open(f.path, '_blank');
                                                                    }
                                                                }}>
                                                                    <div className="flex items-start justify-between mb-3">
                                                                        <div className="flex items-start gap-3 max-w-[85%]">
                                                                            <div className="w-8 h-8 rounded-xl bg-theme-card flex items-center justify-center border border-theme-divider shrink-0 shadow-inner">
                                                                                <span className="material-symbols-outlined text-[16px] text-theme-cyan">description</span>
                                                                            </div>
                                                                            <span className="text-xs font-bold text-theme-text line-clamp-2 uppercase leading-snug group-hover/link:text-theme-orange transition-colors tracking-wide">{f.label}</span>
                                                                        </div>
                                                                        <button onClick={(e) => { e.stopPropagation(); onDeleteFile(scope.id, scope.fileLinks!.indexOf(f!)); }} className="text-theme-textMuted hover:text-red-500 opacity-0 group-hover/link:opacity-100 transition-opacity p-1 bg-red-500/10 rounded-lg shrink-0">
                                                                            <span className="material-symbols-outlined text-[16px]">delete</span>
                                                                        </button>
                                                                    </div>
                                                                    <div className="flex justify-between items-center mt-auto border-t border-theme-divider pt-3">
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: hexColor }}></div>
                                                                            <span className="text-[10px] font-black uppercase tracking-widest truncate max-w-[150px]" style={{ color: hexColor }}>{f.author || 'SISTEMA'}</span>
                                                                        </div>
                                                                        <span className="text-[9px] font-mono font-bold text-theme-textMuted opacity-60">
                                                                            {f.createdAt ? new Date(f.createdAt).toLocaleDateString() : '--/--/----'}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            )
                                                        }) : <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-10"><span className="material-symbols-outlined text-5xl mb-3 text-theme-textMuted font-light">inventory_2</span><span className="text-[10px] font-black uppercase tracking-widest text-theme-textMuted">NENHUM ARQUIVO VINCULADO</span></div>}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}



                    {/* --- TAB: DATA VIEW --- */}

                    {activeTab === 'data' && hasProject && (() => {


                        const pd = activeProject.protocolData;

                        const protocolStatusConfig = {

                            stopped: { label: 'Parado', cls: 'border-orange-500 text-orange-500 bg-orange-500/10' },

                            approved: { label: 'Aprovado', cls: 'border-green-500 text-green-500 bg-green-500/10' },

                            needs_correction: { label: 'Necessita Correções', cls: 'border-red-500 text-red-500 bg-red-500/10' },

                        };

                        const revStatusConfig = {

                            stopped: { label: 'Parado', cls: 'bg-orange-500/20 text-orange-400 border-orange-500/50' },

                            approved: { label: 'Aprovado', cls: 'bg-green-500/20 text-green-400 border-green-500/50' },

                            needs_correction: { label: 'Correção', cls: 'bg-red-500/20 text-red-400 border-red-500/50' },

                        };

                        return (

                            <div className="animate-fadeIn ds-card p-0 bg-theme-card flex flex-col max-w-[1920px] mx-auto w-full mb-10 min-h-[600px]">

                                {/* Sub-Tab Header */}

                                <div className="flex items-center justify-between p-4 border-b border-theme-divider bg-theme-card z-10 gap-4 flex-shrink-0">

                                    <div className="flex items-center gap-2 bg-theme-bg rounded-xl p-1 border border-theme-divider">

                                        <button

                                            onClick={() => setDataSubTab('dados')}

                                            className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${dataSubTab === 'dados' ? 'bg-[#E8E9F0] text-black' : 'text-theme-textMuted hover:text-theme-text'}`}

                                        >

                                            <span className="material-symbols-outlined text-[13px] mr-1 align-middle text-theme-orange">table_chart</span>

                                            Dados do Projeto

                                        </button>

                                        <button

                                            onClick={() => setDataSubTab('protocolo')}

                                            className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${dataSubTab === 'protocolo' ? 'bg-[#E8E9F0] text-black' : 'text-theme-textMuted hover:text-theme-text'}`}

                                        >

                                            <span className="material-symbols-outlined text-[13px] mr-1 align-middle text-purple-400">gavel</span>

                                            Dados Protocolo

                                        </button>

                                    </div>



                                    {dataSubTab === 'protocolo' && pd && (

                                        <div className={`px-3 py-1.5 rounded-full border text-[10px] font-black uppercase ${protocolStatusConfig[pd.status]?.cls || protocolStatusConfig.stopped.cls}`}>

                                            {protocolStatusConfig[pd.status]?.label || 'Parado'}

                                        </div>

                                    )}

                                </div>



                                {/* === SUB-TAB: DADOS DO PROJETO === */}
                                {dataSubTab === 'dados' && (
                                    <div className="flex-1 flex flex-col min-h-0">
                                        <div className="flex-1 overflow-auto scroller bg-theme-bg p-6 space-y-6">
                                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                                {/* Áreas / Dimensões Card */}
                                                <div className="bg-theme-card rounded-2xl border border-theme-divider p-6 shadow-sm flex flex-col">
                                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-theme-orange mb-6 flex items-center gap-2">
                                                        <span className="material-symbols-outlined text-base">square_foot</span>
                                                        Áreas &amp; Zoneamento
                                                    </h4>
                                                    <div className="grid grid-cols-2 gap-x-6 gap-y-4 flex-1">
                                                        <div className="flex flex-col gap-1.5">
                                                            <label className="text-[8px] font-black text-theme-textMuted uppercase tracking-widest">Área do Terreno</label>
                                                            <input
                                                                className="bg-theme-bg border border-theme-divider rounded-xl px-4 py-3 text-xs text-theme-text outline-none focus:border-theme-orange transition-colors font-mono font-bold"
                                                                placeholder="Ex: 1000 m²"
                                                                value={activeProject.details?.landArea || ''}
                                                                onChange={e => onUpdateProjectDetails('landArea', e.target.value)}
                                                            />
                                                        </div>
                                                        <div className="flex flex-col gap-1.5 opacity-80 cursor-not-allowed">
                                                            <label className="text-[8px] font-black text-theme-textMuted uppercase tracking-widest flex items-center gap-1" title="Calculado automaticamente nas tipologias">Área Construída <span className="material-symbols-outlined text-[10px]">lock</span></label>
                                                            <div className="bg-theme-bg/50 border border-theme-divider rounded-xl px-4 py-3 text-xs text-theme-text font-mono font-black italic">
                                                                {(() => {
                                                                    const pavs = activeProject.details?.pavements || [];
                                                                    const habGar = pavs.filter(p => p.category === 'Habitacional' || p.category === 'Garagem').reduce((acc, p) => acc + (p.count * (p.unitsPerPavement || 0) * (p.unitArea || 0)), 0);
                                                                    const lazer = pavs.filter(p => p.category === 'Lazer Interno' || p.category === 'Lazer Externo').reduce((acc, p) => acc + (p.count * (p.areaPerPavement || 0)), 0);
                                                                    return (habGar + lazer).toLocaleString('pt-BR');
                                                                })()} m²
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col gap-1.5 opacity-80 cursor-not-allowed">
                                                            <label className="text-[8px] font-black text-theme-textMuted uppercase tracking-widest flex items-center gap-1" title="Calculado automaticamente nas tipologias habitacionais">Área Vendável <span className="material-symbols-outlined text-[10px] align-middle">lock</span></label>
                                                            <div className="bg-theme-bg/50 border border-theme-divider rounded-xl px-4 py-3 text-xs text-theme-text font-mono font-black italic">
                                                                {((activeProject.details?.pavements || []).filter(p => p.category === 'Habitacional').reduce((acc, p) => acc + (p.count * (p.unitsPerPavement || 0) * (p.unitArea || 0)), 0)).toLocaleString('pt-BR')} m²
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col gap-1.5 opacity-80 cursor-not-allowed">
                                                            <label className="text-[8px] font-black text-theme-textMuted uppercase tracking-widest flex items-center gap-1" title="Calculado automaticamente (Área Vendável / Área Construída)">Eficiência de Projeto <span className="material-symbols-outlined text-[10px] align-middle">percent</span></label>
                                                            <div className="bg-[#a855f7]/10 border border-[#a855f7]/30 text-[#a855f7] rounded-xl px-4 py-3 text-xs font-mono font-black italic flex items-center justify-between shadow-sm">
                                                                {(() => {
                                                                    const pavs = activeProject.details?.pavements || [];
                                                                    const habGar = pavs.filter(p => p.category === 'Habitacional' || p.category === 'Garagem').reduce((acc, p) => acc + (p.count * (p.unitsPerPavement || 0) * (p.unitArea || 0)), 0);
                                                                    const lazer = pavs.filter(p => p.category === 'Lazer Interno' || p.category === 'Lazer Externo').reduce((acc, p) => acc + (p.count * (p.areaPerPavement || 0)), 0);
                                                                    const construida = habGar + lazer;
                                                                    const vendavel = (activeProject.details?.pavements || []).filter(p => p.category === 'Habitacional').reduce((acc, p) => acc + (p.count * (p.unitsPerPavement || 0) * (p.unitArea || 0)), 0);
                                                                    return construida > 0 ? ((vendavel / construida) * 100).toFixed(1) + '%' : '0%';
                                                                })()}
                                                                <span className="material-symbols-outlined text-[14px]">insights</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col gap-1.5 opacity-80 cursor-not-allowed">
                                                            <label className="text-[8px] font-black text-theme-textMuted uppercase tracking-widest flex items-center gap-1" title="Calculado automaticamente nas tipologias de lazer">Área de Lazer <span className="material-symbols-outlined text-[10px]">lock</span></label>
                                                            <div className="bg-theme-bg/50 border border-theme-divider rounded-xl px-4 py-3 text-xs text-theme-text font-mono font-black italic">
                                                                {((activeProject.details?.pavements || []).filter(p => p.category === 'Lazer Interno' || p.category === 'Lazer Externo').reduce((acc, p) => acc + (p.count * (p.areaPerPavement || 0)), 0)).toLocaleString('pt-BR')} m²
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col gap-1.5">
                                                            <label className="text-[8px] font-black text-theme-textMuted uppercase tracking-widest">Zoneamento</label>
                                                            <input
                                                                className="bg-theme-bg border border-theme-divider rounded-xl px-4 py-3 text-xs text-theme-text outline-none focus:border-theme-orange transition-colors uppercase font-bold"
                                                                placeholder="Ex: ZC-2"
                                                                value={activeProject.details?.zoning || ''}
                                                                onChange={e => onUpdateProjectDetails('zoning', e.target.value)}
                                                            />
                                                        </div>
                                                        <div className="flex flex-col gap-1.5">
                                                            <label className="text-[8px] font-black text-theme-textMuted uppercase tracking-widest">Gabarito (Altura)</label>
                                                            <input
                                                                className="bg-theme-bg border border-theme-divider rounded-xl px-4 py-3 text-xs text-theme-text outline-none focus:border-theme-orange transition-colors font-bold uppercase"
                                                                placeholder="Ex: 24m"
                                                                value={activeProject.details?.height || ''}
                                                                onChange={e => onUpdateProjectDetails('height', e.target.value)}
                                                            />
                                                        </div>
                                                        <div className="flex flex-col gap-1.5 col-span-2 opacity-80 cursor-not-allowed">
                                                            <label className="text-[8px] font-black text-theme-textMuted uppercase tracking-widest flex items-center gap-1" title="Calculado automaticamente nas tipologias de garagem"><span className="material-symbols-outlined text-[10px] text-theme-cyan">directions_car</span> Total de Vagas de Garagem <span className="material-symbols-outlined text-[10px]">lock</span></label>
                                                            <div className="bg-theme-bg/50 border border-theme-divider rounded-xl px-4 py-4 text-sm text-theme-text font-mono font-black italic">
                                                                {((activeProject.details?.pavements || []).filter(p => p.category === 'Garagem').reduce((acc, p) => acc + (p.count * (p.unitsPerPavement || 0)), 0)).toLocaleString('pt-BR')} vagas
                                                            </div>
                                                        </div>

                                                        {/* INFORMAÇÕES GERAIS / EQUIPE */}
                                                        <div className="flex flex-col gap-1.5 col-span-2 mt-2 pt-4 border-t border-theme-divider">
                                                            <h5 className="text-[9px] font-black uppercase tracking-widest text-theme-textMuted mb-2 flex items-center gap-2">
                                                                <span className="material-symbols-outlined text-xs">group</span>
                                                                Equipe &amp; Endereço
                                                            </h5>
                                                            <div className="grid grid-cols-2 gap-4">
                                                                <div className="flex flex-col gap-1.5">
                                                                    <label className="text-[8px] font-black text-theme-textMuted uppercase tracking-widest">Responsável</label>
                                                                    <input
                                                                        list="team-list"
                                                                        className="bg-theme-bg border border-theme-divider rounded-xl px-4 py-3 text-xs text-theme-text outline-none focus:border-theme-orange transition-colors font-bold"
                                                                        placeholder="Selecione ou digite..."
                                                                        value={activeProject.details?.resp || ''}
                                                                        onChange={e => onUpdateProjectDetails('resp', e.target.value)}
                                                                    />
                                                                    <datalist id="team-list">
                                                                        {(db.team || []).map((t, i) => (
                                                                            <option key={i} value={t}>{t}</option>

                                                                        ))}
                                                                    </datalist>
                                                                </div>
                                                                <div className="flex flex-col gap-1.5">
                                                                    <label className="text-[8px] font-black text-theme-textMuted uppercase tracking-widest">Corretor</label>
                                                                    <input
                                                                        className="bg-theme-bg border border-theme-divider rounded-xl px-4 py-3 text-xs text-theme-text outline-none focus:border-theme-orange transition-colors font-bold"
                                                                        placeholder="Nome do Corretor"
                                                                        value={activeProject.details?.broker || ''}
                                                                        onChange={e => onUpdateProjectDetails('broker', e.target.value)}
                                                                    />
                                                                </div>
                                                                <div className="flex flex-col gap-1.5 col-span-2">
                                                                    <label className="text-[8px] font-black text-theme-textMuted uppercase tracking-widest flex items-center gap-1"><span className="material-symbols-outlined text-[10px]">location_on</span> Endereço (Google Maps)</label>
                                                                    <input
                                                                        className="bg-theme-bg border border-theme-divider rounded-xl px-4 py-3 text-xs text-theme-text outline-none focus:border-[#4285F4] transition-colors font-bold"
                                                                        placeholder="Digite o endereço completo"
                                                                        value={activeProject.details?.location || ''}
                                                                        onChange={e => onUpdateProjectDetails('location', e.target.value)}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Pavimentos/Tipologia Card */}
                                                <div className="bg-theme-card rounded-2xl border border-theme-divider p-6 shadow-sm flex flex-col h-full">
                                                    <div className="flex justify-between items-center mb-6">
                                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-[#a855f7] flex items-center gap-2">
                                                            <span className="material-symbols-outlined text-base">apartment</span>
                                                            Tipologia &amp; Pavimentos
                                                        </h4>
                                                        <button
                                                            onClick={() => {
                                                                const p = activeProject.details?.pavements || [];
                                                                onUpdateProjectDetails('pavements', [...p, { id: `p-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, type: 'Apto', count: 1, unitsPerPavement: 1, category: 'Habitacional' as const, areaPerPavement: 0, unitArea: 0 }]);
                                                            }}
                                                            className="bg-theme-bg border border-theme-divider hover:border-[#a855f7] hover:text-[#a855f7] text-theme-textMuted px-4 py-2 rounded-xl text-[9px] font-black uppercase flex items-center gap-2 transition-all shadow-sm"
                                                        >
                                                            <span className="material-symbols-outlined text-sm">add</span> Adicionar Tipologia
                                                        </button>
                                                    </div>

                                                    <div className="flex-1 overflow-y-auto scroller space-y-4 pr-2 border-b border-theme-divider pb-6 mb-6 min-h-[250px]">
                                                        {(!activeProject.details?.pavements || activeProject.details.pavements.length === 0) ? (
                                                            <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-10">
                                                                <span className="material-symbols-outlined text-4xl mb-3 text-theme-textMuted font-light">domain_disabled</span>
                                                                <span className="text-[10px] font-black uppercase tracking-widest text-theme-textMuted">Nenhuma tipologia cadastrada</span>
                                                            </div>
                                                        ) : activeProject.details.pavements.map((p, idx) => (
                                                            <div key={p.id} className="flex flex-col gap-3 p-4 bg-theme-bg rounded-2xl border border-theme-divider relative group hover:border-[#a855f7] transition-all shadow-sm">
                                                                <div className="grid grid-cols-12 gap-4 items-end">
                                                                    {/* Row 1 */}
                                                                    <div className="col-span-4 flex flex-col gap-1.5">
                                                                        <label className="text-[8px] font-black text-theme-textMuted uppercase tracking-widest">Categoria</label>
                                                                        <select
                                                                            className="w-full bg-theme-bg border border-theme-divider rounded-xl px-4 py-3 text-[11px] font-bold text-theme-text outline-none focus:border-[#a855f7] transition-colors appearance-none"
                                                                            value={p.category || 'Habitacional'}
                                                                            onChange={e => {
                                                                                const cat = e.target.value as PavementType['category'];
                                                                                const pts = activeProject.details!.pavements.map((pt, i) => i !== idx ? pt : {
                                                                                    ...pt,
                                                                                    category: cat,
                                                                                    unitArea: cat !== 'Habitacional' ? 0 : pt.unitArea,
                                                                                    unitsPerPavement: (cat !== 'Habitacional' && cat !== 'Garagem') ? 0 : pt.unitsPerPavement,
                                                                                });
                                                                                onUpdateProjectDetails('pavements', pts);
                                                                            }}
                                                                        >
                                                                            <option value="Habitacional">Habitacional</option>
                                                                            <option value="Garagem">Garagem</option>
                                                                            <option value="Lazer Interno">Lazer Interno</option>
                                                                            <option value="Lazer Externo">Lazer Externo</option>
                                                                        </select>
                                                                    </div>
                                                                    <div className="col-span-5 flex flex-col gap-1.5">
                                                                        <label className="text-[8px] font-black text-theme-textMuted uppercase tracking-widest">Tipo / Nome</label>
                                                                        <input
                                                                            type="text"
                                                                            className="w-full bg-theme-bg border border-theme-divider rounded-xl px-4 py-3 text-[11px] font-bold text-theme-text outline-none focus:border-[#a855f7] transition-colors uppercase"
                                                                            placeholder="Ex: TIPO A"
                                                                            value={p.type}
                                                                            onChange={e => {
                                                                                const pts = activeProject.details!.pavements.map((pt, i) => i !== idx ? pt : { ...pt, type: e.target.value });
                                                                                onUpdateProjectDetails('pavements', pts);
                                                                            }}
                                                                        />
                                                                    </div>
                                                                    <div className="col-span-3 flex flex-col gap-1.5">
                                                                        <label className="text-[8px] font-black text-theme-textMuted uppercase tracking-widest" title="Quantos pavimentos deste tipo?">Pavs.</label>
                                                                        <input type="number" min="0" className="w-full bg-theme-bg border border-theme-divider rounded-xl px-2 py-3 text-xs font-mono font-bold text-center text-theme-text outline-none focus:border-[#a855f7]" value={p.count}
                                                                            onChange={e => {
                                                                                const pts = activeProject.details!.pavements.map((pt, i) => i !== idx ? pt : { ...pt, count: Number(e.target.value) });
                                                                                onUpdateProjectDetails('pavements', pts);
                                                                            }}
                                                                        />
                                                                    </div>

                                                                    {/* M²/Pav: auto-calculated for Habitacional, manual for Lazer/Garagem */}
                                                                    <div className="col-span-3 flex flex-col gap-1.5">
                                                                        <label className="text-[8px] font-black text-theme-textMuted uppercase tracking-widest flex items-center gap-1">
                                                                            m² / Pav
                                                                            {(p.category === 'Habitacional') && (
                                                                                <span className="material-symbols-outlined text-[9px] text-theme-orange" title="Calculado automaticamente: Unid/Pav × m²/Unid">calculate</span>
                                                                            )}
                                                                        </label>
                                                                        {p.category === 'Habitacional' ? (
                                                                            /* Auto-calculated: each typology contributes only its own area */
                                                                            <div className="w-full bg-theme-bg/50 border border-dashed border-theme-divider rounded-xl px-2 py-3 text-xs font-mono font-black text-center text-theme-textMuted italic cursor-not-allowed" title="Calculado: Unid/Pav × m²/Unid">
                                                                                {((p.unitsPerPavement || 0) * (p.unitArea || 0)).toLocaleString('pt-BR')}
                                                                            </div>
                                                                        ) : (
                                                                            /* Manual for Garagem, Lazer Interno, Lazer Externo */
                                                                            <input type="number" min="0"
                                                                                className="w-full bg-theme-bg border border-theme-divider rounded-xl px-2 py-3 text-xs font-mono font-bold text-center text-theme-text outline-none focus:border-theme-orange"
                                                                                value={p.areaPerPavement || 0}
                                                                                onChange={e => {
                                                                                    const pts = activeProject.details!.pavements.map((pt, i) => i !== idx ? pt : { ...pt, areaPerPavement: Number(e.target.value) });
                                                                                    onUpdateProjectDetails('pavements', pts);
                                                                                }}
                                                                            />
                                                                        )}
                                                                    </div>

                                                                    {(p.category === 'Habitacional' || p.category === 'Garagem') ? (
                                                                        <div className="col-span-3 flex flex-col gap-1.5">
                                                                            <label className="text-[8px] font-black text-theme-textMuted uppercase tracking-widest">{p.category === 'Garagem' ? 'Vagas / Pav' : 'Unid / Pav'}</label>
                                                                            <input type="number" min="0" className="w-full bg-theme-bg border border-theme-divider rounded-xl px-2 py-3 text-xs font-mono font-bold text-center text-theme-text outline-none focus:border-[#a855f7]" value={p.unitsPerPavement || 0}
                                                                                onChange={e => {
                                                                                    const pts = activeProject.details!.pavements.map((pt, i) => i !== idx ? pt : { ...pt, unitsPerPavement: Number(e.target.value) });
                                                                                    onUpdateProjectDetails('pavements', pts);
                                                                                }}
                                                                            />
                                                                        </div>
                                                                    ) : <div className="col-span-3"></div>}

                                                                    {p.category === 'Habitacional' ? (
                                                                        <div className="col-span-3 flex flex-col gap-1.5">
                                                                            <label className="text-[8px] font-black text-theme-textMuted uppercase tracking-widest flex items-center gap-1">m² / Unid</label>
                                                                            <input type="number" min="0" className="w-full bg-theme-bg border border-theme-divider rounded-xl px-2 py-3 text-xs font-mono font-bold text-center text-theme-text outline-none focus:border-theme-orange" value={p.unitArea || 0}
                                                                                onChange={e => {
                                                                                    const pts = activeProject.details!.pavements.map((pt, i) => i !== idx ? pt : { ...pt, unitArea: Number(e.target.value) });
                                                                                    onUpdateProjectDetails('pavements', pts);
                                                                                }}
                                                                            />
                                                                        </div>
                                                                    ) : <div className="col-span-3"></div>}

                                                                    <div className="col-span-3 flex flex-col gap-1.5 justify-end">
                                                                        <label className="text-[8px] font-black text-theme-textMuted uppercase tracking-widest text-center">Subtotal</label>
                                                                        <div className="bg-[#a855f7]/10 border border-[#a855f7]/30 text-[#a855f7] rounded-xl px-2 py-3 text-sm font-mono font-black text-center flex items-center justify-center">
                                                                            {(p.category === 'Habitacional' || p.category === 'Garagem') ? p.count * (p.unitsPerPavement || 0) : '-'}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <button
                                                                    onClick={() => {
                                                                        const pts = activeProject.details!.pavements.filter(pt => pt.id !== p.id);
                                                                        onUpdateProjectDetails('pavements', pts);
                                                                    }}
                                                                    className="absolute -top-3 -right-3 bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-md transform hover:scale-110 flex items-center justify-center"
                                                                    title="Remover Tipologia"
                                                                >
                                                                    <span className="material-symbols-outlined text-[14px]">close</span>
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* Totalizer */}
                                                    <div className="flex justify-between items-center bg-theme-highlight p-5 rounded-2xl border border-theme-divider shadow-sm">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-xl bg-theme-bg flex items-center justify-center border border-theme-divider">
                                                                <span className="material-symbols-outlined text-theme-text text-xl">meeting_room</span>
                                                            </div>
                                                            <span className="text-[11px] font-black uppercase tracking-widest text-theme-text">Unidades<br /><span className="text-theme-textMuted text-[9px]">Habitacionais Total</span></span>
                                                        </div>
                                                        <span className="text-3xl font-black font-square text-[#a855f7] drop-shadow-sm">
                                                            {activeProject.details?.pavements?.filter(p => p.category === 'Habitacional').reduce((acc, p) => acc + (p.count * (p.unitsPerPavement || 0)), 0) || 0}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {activeProject.details?.location && (
                                                <div className="h-72 mt-6 rounded-2xl border border-theme-divider bg-theme-bg relative z-20 shadow-[0_-5px_15px_rgba(0,0,0,0.1)] overflow-hidden">
                                                    <div className="w-full h-full relative group">
                                                        <iframe
                                                            width="100%"
                                                            height="100%"
                                                            frameBorder="0"
                                                            scrolling="no"
                                                            marginHeight={0}
                                                            marginWidth={0}
                                                            src={`https://www.google.com/maps?q=${encodeURIComponent(activeProject.details?.location)}&output=embed`}
                                                        ></iframe>
                                                        <div className="absolute top-4 right-4 bg-theme-bg/80 backdrop-blur text-theme-text text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow-sm border border-theme-divider flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <span className="material-symbols-outlined text-[12px] text-[#4285F4]">location_on</span> Mapa Interativo
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}{/* end dados subtab */}

                                {/* === SUB-TAB: DADOS PROTOCOLO === */}
                                {dataSubTab === 'protocolo' && (
                                    <div className="flex-1 overflow-auto scroller bg-theme-bg p-6 space-y-6 w-full">

                                        <div className="bg-theme-card rounded-2xl border border-theme-divider p-6 shadow-sm">

                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-purple-400 mb-4 flex items-center gap-2">

                                                <span className="material-symbols-outlined text-base">gavel</span>

                                                InformAÇÕES do Protocolo

                                            </h4>

                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

                                                <div className="flex flex-col gap-1">

                                                    <label className="text-[8px] font-black text-theme-textMuted uppercase tracking-widest">Nº Protocolo</label>

                                                    <input

                                                        className="bg-theme-bg border border-theme-divider rounded-xl px-3 py-2.5 text-xs text-theme-text outline-none focus:border-purple-500 transition-colors font-mono font-bold"

                                                        placeholder="Ex: 2026/000123"

                                                        value={pd?.protocolNumber || ''}

                                                        onChange={e => handleUpdateProtocol('protocolNumber', e.target.value)}

                                                    />

                                                </div>

                                                <div className="flex flex-col gap-1">

                                                    <label className="text-[8px] font-black text-theme-textMuted uppercase tracking-widest">Prefeitura</label>

                                                    <input

                                                        className="bg-theme-bg border border-theme-divider rounded-xl px-3 py-2.5 text-xs text-theme-text outline-none focus:border-purple-500 transition-colors"

                                                        placeholder="Ex: Prefeitura de São Paulo"

                                                        value={pd?.prefecture || ''}

                                                        onChange={e => handleUpdateProtocol('prefecture', e.target.value)}

                                                    />

                                                </div>

                                                <div className="flex flex-col gap-1">

                                                    <label className="text-[8px] font-black text-theme-textMuted uppercase tracking-widest">Data de Início</label>

                                                    <input

                                                        type="date"

                                                        className="bg-theme-bg border border-theme-divider rounded-xl px-3 py-2.5 text-xs text-theme-text outline-none focus:border-purple-500 transition-colors"

                                                        value={pd?.startDate || ''}

                                                        onChange={e => handleUpdateProtocol('startDate', e.target.value)}

                                                    />

                                                </div>

                                                <div className="flex flex-col gap-1">

                                                    <label className="text-[8px] font-black text-theme-textMuted uppercase tracking-widest">Status Atual</label>

                                                    <select

                                                        className={`border rounded-xl px-3 py-2.5 text-xs font-black uppercase outline-none transition-colors ${protocolStatusConfig[pd?.status || 'stopped'].cls}`}

                                                        value={pd?.status || 'stopped'}

                                                        onChange={e => handleUpdateProtocol('status', e.target.value as ProtocolData['status'])}

                                                    >

                                                        <option value="stopped">Parado</option>

                                                        <option value="approved">Aprovado</option>

                                                        <option value="needs_correction">Necessita Correções</option>

                                                    </select>

                                                </div>

                                            </div>



                                            {/* Prefecture URL */}

                                            <div className="mt-4 flex flex-col gap-1">

                                                <label className="text-[8px] font-black text-theme-textMuted uppercase tracking-widest">Site da Prefeitura</label>

                                                <div className="flex gap-2">

                                                    <input

                                                        className="flex-1 bg-theme-bg border border-theme-divider rounded-xl px-3 py-2.5 text-xs text-theme-text outline-none focus:border-purple-500 transition-colors font-mono"

                                                        placeholder="https://..."

                                                        value={pd?.prefectureUrl || ''}

                                                        onChange={e => handleUpdateProtocol('prefectureUrl', e.target.value)}

                                                    />

                                                    {pd?.prefectureUrl && (

                                                        <a href={pd.prefectureUrl} target="_blank" rel="noreferrer"

                                                            className="px-4 py-2 bg-purple-500/20 border border-purple-500/40 text-purple-400 rounded-xl text-[10px] font-black uppercase hover:bg-purple-500/30 transition-all flex items-center gap-1 shrink-0">

                                                            <span className="material-symbols-outlined text-sm">open_in_new</span> Abrir

                                                        </a>

                                                    )}

                                                </div>

                                                {pd?.prefectureUrl && (

                                                    <div className="mt-2 rounded-xl overflow-hidden border border-theme-divider h-48 bg-theme-bg">

                                                        <iframe src={pd.prefectureUrl} title="Preview Prefeitura" className="w-full h-full" sandbox="allow-scripts allow-same-origin" />

                                                    </div>

                                                )}

                                            </div>

                                        </div>



                                        {/* Block 2: Revisions */}

                                        <div className="bg-theme-card rounded-2xl border border-theme-divider p-6 shadow-sm">

                                            <div className="flex items-center justify-between mb-4">

                                                <h4 className="text-[10px] font-black uppercase tracking-widest text-theme-text flex items-center gap-2">

                                                    <span className="material-symbols-outlined text-base text-purple-400">history</span>

                                                    Revisões da Prefeitura

                                                    <span className="ml-1 px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-[9px] font-black">{pd?.revisions?.length || 0} revisão(ões)</span>

                                                </h4>

                                            </div>



                                            {/* New Revision Input */}

                                            <div className="flex gap-3 mb-5 p-3 bg-theme-bg rounded-xl border border-theme-divider">

                                                <textarea

                                                    rows={2}

                                                    className="flex-1 bg-transparent text-xs text-theme-text outline-none resize-none placeholder:text-theme-textMuted/50"

                                                    placeholder="Descreva a revisão ou observação da prefeitura..."

                                                    value={newRevisionText}

                                                    onChange={e => setNewRevisionText(e.target.value)}

                                                />

                                                <div className="flex flex-col gap-2 shrink-0">

                                                    <select

                                                        className={`border rounded-lg px-2 py-1 text-[9px] font-black uppercase outline-none ${revStatusConfig[newRevisionStatus].cls}`}

                                                        value={newRevisionStatus}

                                                        onChange={e => setNewRevisionStatus(e.target.value as ProtocolRevision['status'])}

                                                    >

                                                        <option value="stopped">Parado</option>

                                                        <option value="approved">Aprovado</option>

                                                        <option value="needs_correction">Correção</option>

                                                    </select>

                                                    <button

                                                        onClick={handleAddRevision}

                                                        className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-[9px] font-black uppercase hover:bg-purple-700 transition-all flex items-center gap-1"

                                                    >

                                                        <span className="material-symbols-outlined text-sm">add</span> Adicionar

                                                    </button>

                                                </div>

                                            </div>



                                            {/* Revisions List */}

                                            <div className="space-y-3 max-h-64 overflow-y-auto scroller pr-1">

                                                {(!pd?.revisions || pd.revisions.length === 0) && (

                                                    <div className="flex flex-col items-center justify-center py-8 text-theme-textMuted/40">

                                                        <span className="material-symbols-outlined text-4xl mb-2">history_toggle_off</span>

                                                        <p className="text-[10px] font-black uppercase tracking-widest">Nenhuma revisão registrada</p>

                                                    </div>

                                                )}

                                                {pd?.revisions?.map((rev, i) => (

                                                    <div key={rev.id} className="flex gap-3 p-3 rounded-xl border border-theme-divider bg-theme-bg group hover:border-purple-500/30 transition-all">

                                                        <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">

                                                            <div className="w-7 h-7 rounded-full bg-purple-500/20 flex items-center justify-center border border-purple-500/30">

                                                                <span className="text-[9px] font-black text-purple-400">{i + 1}</span>

                                                            </div>

                                                            {i < (pd?.revisions?.length || 0) - 1 && <div className="w-px flex-1 bg-theme-divider" />}

                                                        </div>

                                                        <div className="flex-1 min-w-0">

                                                            <div className="flex items-center gap-2 mb-1">

                                                                <span className={`px-2 py-0.5 rounded-full border text-[8px] font-black uppercase ${revStatusConfig[rev.status].cls}`}>

                                                                    {revStatusConfig[rev.status].label}

                                                                </span>

                                                                <span className="text-[9px] font-bold text-theme-textMuted">{rev.author}</span>

                                                                <span className="text-[9px] font-mono text-theme-textMuted ml-auto">{rev.date}</span>

                                                            </div>

                                                            <p className="text-xs text-theme-text leading-relaxed">{rev.text}</p>

                                                        </div>

                                                        <button

                                                            onClick={() => handleDeleteRevision(rev.id)}

                                                            className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-400 shrink-0 self-start p-1"

                                                        >

                                                            <span className="material-symbols-outlined text-sm">delete</span>

                                                        </button>

                                                    </div>

                                                ))}

                                            </div>

                                        </div>



                                        {/* Block 3: Protocol Files by Folder */}

                                        {(() => {

                                            const folders: ProtocolFolder[] = pd?.folders?.length ? pd.folders : [

                                                { id: 'legal_arq', name: 'Legal de Arquitetura', files: [] },

                                                { id: 'hidro', name: 'Hidro', files: [] },

                                                { id: 'unificacao', name: 'Unificação', files: [] },

                                                { id: 'documentos', name: 'Documentos', files: [] },

                                            ];

                                            const activeFolder = folders.find(f => f.id === selectedProtocolFolder) || folders[0];

                                            const defaultIds = ['legal_arq', 'hidro', 'unificacao', 'documentos'];

                                            const totalFiles = folders.reduce((a, f) => a + f.files.length, 0);

                                            return (

                                                <div className="bg-theme-card rounded-2xl border border-theme-divider shadow-sm overflow-hidden">

                                                    {/* Header */}

                                                    <div className="flex items-center justify-between px-6 py-4 border-b border-theme-divider">

                                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-theme-text flex items-center gap-2">

                                                            <span className="material-symbols-outlined text-base text-purple-400">folder_special</span>

                                                            Arquivos do Protocolo

                                                            <span className="ml-1 px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-[9px] font-black">{totalFiles}</span>

                                                        </h4>

                                                        <div className="flex gap-2 items-center">

                                                            <button

                                                                onClick={() => setShowNewFolderInput(v => !v)}

                                                                className="px-3 py-1.5 bg-purple-600/20 border border-purple-500/40 text-purple-400 rounded-xl text-[9px] font-black uppercase hover:bg-purple-600/30 transition-all flex items-center gap-1"

                                                            >

                                                                <span className="material-symbols-outlined text-sm">create_new_folder</span> Nova Pasta

                                                            </button>

                                                            <button

                                                                onClick={() => protocolFileRef.current?.click()}

                                                                className="px-3 py-1.5 bg-purple-600 text-white rounded-xl text-[9px] font-black uppercase hover:bg-purple-700 transition-all flex items-center gap-1"

                                                            >

                                                                <span className="material-symbols-outlined text-sm">upload</span> Upload

                                                            </button>

                                                            <input type="file" ref={protocolFileRef} className="hidden" accept=".pdf,.dwg,.jpg,.png,.docx,.xlsx,.rvt,.ifc" onChange={handleProtocolFileUpload} />

                                                        </div>

                                                    </div>



                                                    {/* New Folder Input */}

                                                    {showNewFolderInput && (

                                                        <div className="flex gap-2 px-6 py-3 bg-purple-500/5 border-b border-theme-divider">

                                                            <select
                                                                className="flex-1 bg-theme-bg border border-purple-500/30 rounded-xl px-3 py-1.5 text-xs text-theme-text outline-none focus:border-purple-500 transition-colors"
                                                                value={newFolderName}
                                                                onChange={e => setNewFolderName(e.target.value)}
                                                            >
                                                                <option value="" disabled>Selecione uma disciplina...</option>
                                                                {db.disciplines.map(d => (
                                                                    <option key={d.code} value={d.name}>{d.code} - {d.name}</option>
                                                                ))}
                                                            </select>

                                                            <button onClick={handleAddProtocolFolder} className="px-4 py-1.5 bg-purple-600 text-white rounded-xl text-[9px] font-black uppercase hover:bg-purple-700 transition-all">Criar</button>

                                                            <button onClick={() => setShowNewFolderInput(false)} className="px-2 py-1.5 bg-theme-bg border border-theme-divider text-theme-textMuted rounded-xl text-[9px] font-black hover:text-theme-text transition-all">✕</button>

                                                        </div>

                                                    )}



                                                    {/* Two-pane layout */}

                                                    <div className="flex bg-theme-bg/10 h-[400px]">

                                                        {/* Folder Sidebar */}

                                                        <div className="w-52 shrink-0 border-r border-theme-divider bg-theme-bg/40 p-3 space-y-1">

                                                            {folders.map(folder => {

                                                                const isActive = folder.id === (activeFolder?.id);

                                                                const isDefault = defaultIds.includes(folder.id);

                                                                return (

                                                                    <button

                                                                        key={folder.id}

                                                                        onClick={() => setSelectedProtocolFolder(folder.id)}

                                                                        className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-left transition-all group ${isActive ? 'bg-purple-500/20 border border-purple-500/40' : 'hover:bg-theme-highlight border border-transparent'}`}

                                                                    >

                                                                        <div className="flex items-center gap-2 min-w-0">

                                                                            <span className={`material-symbols-outlined text-[16px] ${isActive ? 'text-purple-400' : 'text-theme-textMuted'}`}>

                                                                                {isActive ? 'folder_open' : 'folder'}

                                                                            </span>

                                                                            <span className={`text-[10px] font-bold truncate ${isActive ? 'text-purple-300' : 'text-theme-textMuted'}`}>{folder.name}</span>

                                                                        </div>

                                                                        <div className="flex items-center gap-1 shrink-0">

                                                                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${folder.files.length > 0 ? 'bg-purple-500/20 text-purple-400' : 'bg-theme-divider text-theme-textMuted/50'}`}>

                                                                                {folder.files.length}

                                                                            </span>

                                                                            {!isDefault && (

                                                                                <button

                                                                                    onClick={e => { e.stopPropagation(); handleDeleteProtocolFolder(folder.id); }}

                                                                                    className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-400 transition-opacity"

                                                                                >

                                                                                    <span className="material-symbols-outlined text-[13px]">delete</span>

                                                                                </button>

                                                                            )}

                                                                        </div>

                                                                    </button>

                                                                );

                                                            })}

                                                        </div>



                                                        {/* File Content Area */}

                                                        <div className="flex-1 p-4 overflow-y-auto scroller">

                                                            <div className="flex items-center justify-between mb-3">

                                                                <span className="text-[9px] font-black text-purple-400 uppercase tracking-widest flex items-center gap-1">

                                                                    <span className="material-symbols-outlined text-[14px]">folder_open</span>

                                                                    {activeFolder?.name}

                                                                </span>

                                                                <span className="text-[9px] text-theme-textMuted">{activeFolder?.files.length || 0} arquivo(s)</span>

                                                            </div>



                                                            {(!activeFolder?.files || activeFolder.files.length === 0) ? (

                                                                <div className="flex flex-col items-center justify-center h-32 text-theme-textMuted/40 border-2 border-dashed border-theme-divider rounded-xl">

                                                                    <span className="material-symbols-outlined text-3xl mb-1">upload_file</span>

                                                                    <p className="text-[9px] font-black uppercase tracking-widest">Pasta vazia</p>

                                                                    <p className="text-[8px] mt-0.5">Clique em Upload para adicionar</p>

                                                                </div>

                                                            ) : (

                                                                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">

                                                                    {activeFolder.files.map((f, i) => (

                                                                        <div key={i}

                                                                            className="group flex flex-col p-3 rounded-2xl bg-theme-bg border border-theme-divider hover:border-purple-500/40 transition-all cursor-pointer shadow-sm"

                                                                            onClick={() => {

                                                                                if (f.path.startsWith('data:application/pdf')) setViewingFile({ path: f.path, type: 'pdf' });

                                                                                else if (f.path.startsWith('data:image')) setViewingFile({ path: f.path, type: 'image' });

                                                                                else window.open(f.path, '_blank');

                                                                            }}>

                                                                            <div className="flex items-start justify-between mb-2">

                                                                                <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center border border-purple-500/30 shrink-0">

                                                                                    <span className="material-symbols-outlined text-[13px] text-purple-400">description</span>

                                                                                </div>

                                                                                <button onClick={e => { e.stopPropagation(); handleDeleteProtocolFile(activeFolder.id, i); }}

                                                                                    className="text-theme-textMuted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 bg-red-500/10 rounded-lg">

                                                                                    <span className="material-symbols-outlined text-[12px]">delete</span>

                                                                                </button>

                                                                            </div>

                                                                            <span className="text-[10px] font-bold text-theme-text line-clamp-2 uppercase leading-snug group-hover:text-purple-400 transition-colors">{f.label}</span>

                                                                            <div className="flex justify-between items-center mt-auto pt-2 border-t border-theme-divider">

                                                                                <span className="text-[8px] font-black uppercase text-purple-400 truncate">{f.author || 'SISTEMA'}</span>

                                                                                <span className="text-[8px] font-mono text-theme-textMuted">{f.createdAt ? formatLocalDate(f.createdAt) : '--/--'}</span>

                                                                            </div>

                                                                        </div>

                                                                    ))}

                                                                </div>

                                                            )}

                                                        </div>

                                                    </div>

                                                </div>

                                            );
                                        })()}

                                    </div>
                                )}



                            </div>

                        );
                    })()}



                    {/* --- TAB: VIABILITY VIEW --- */}



                    {

                        activeTab === 'viabilidade' && hasProject && (

                            <div className="animate-fadeIn flex flex-col gap-8 max-w-[1920px] mx-auto w-full pb-20">
                                {/* Contracts Section Card */}
                                <div className="ds-card bg-theme-card overflow-hidden w-full border border-theme-border rounded-3xl min-h-[calc(100vh-140px)]">
                                    <Suspense fallback={<div className="flex items-center justify-center h-full text-theme-textMuted text-sm p-8">Carregando contratos...</div>}>
                                      <ContractsManager
                                        project={activeProject}
                                        db={db}
                                        onUpdateProject={(upd) => setDb(prev => ({ ...prev, projects: prev.projects.map(p => p.id === upd.id ? { ...upd, updatedAt: new Date().toISOString() } : p) }))}
                                        currentUser={currentUser}
                                    />
                                    </Suspense>
                                </div>
                            </div>
                        )

                    }

              {/* Aba Financeiro — EVR */}
              {activeTab === 'financeiro' && hasProject && (
                <div className="animate-fadeIn max-w-[1920px] mx-auto w-full">
                  <div className="ds-card bg-theme-card overflow-hidden w-full border border-theme-border rounded-3xl h-[calc(100vh-140px)] shadow-neuro">
                    <Suspense fallback={<div className="flex items-center justify-center h-full text-theme-textMuted text-sm">Carregando...</div>}>
                      <FinanceiroTab
                        project={activeProject}
                        db={db}
                        onUpdateProject={(upd) => setDb(prev => ({ ...prev, projects: prev.projects.map(p => p.id === upd.id ? upd : p) }))}
                      />
                    </Suspense>
                  </div>
                </div>
              )}



                    {/* --- TAB: COMPRAS VIEW --- */}
                    {activeTab === 'compras' && hasProject && (
                        <div className="animate-fadeIn max-w-[1920px] mx-auto w-full">
                            <div className="ds-card bg-theme-card overflow-hidden w-full border border-theme-border rounded-3xl h-[calc(100vh-140px)] shadow-neuro">
                                <Suspense fallback={<div className="flex items-center justify-center h-full text-theme-textMuted text-sm p-8">Carregando compras...</div>}>
                                    <ComprasTab
                                        project={activeProject}
                                        onUpdateProject={(upd) => setDb(prev => ({ ...prev, projects: prev.projects.map(p => p.id === upd.id ? upd : p) }))}
                                    />
                                </Suspense>
                            </div>
                        </div>
                    )}

                    {/* --- TAB: NOTAS VIEW --- */}
                    {
                        activeTab === 'notas' && hasProject && (
                            <div className="animate-fadeIn max-w-[1920px] mx-auto w-full">
                                <div className="ds-card bg-theme-card overflow-hidden w-full border border-theme-border rounded-3xl h-[calc(100vh-140px)] shadow-neuro">
                                    <NotesTab
                                        project={activeProject}
                                        db={db}
                                        onUpdateProject={(upd) => {
                                            setDb(prev => ({ ...prev, projects: prev.projects.map(p => p.id === upd.id ? { ...upd, updatedAt: new Date().toISOString() } : p) }));
                                        }}
                                        currentUser={currentUser as { name: string; avatar: string; } | null}
                                    />
                                </div>
                            </div>
                        )
                    }

                    {/* --- TAB: COLABORADOR VIEW --- */}
                    {
                        activeTab === 'colaborador' && hasProject && (
                            <div className="animate-fadeIn max-w-[1920px] mx-auto w-full">
                                <div className="ds-card bg-theme-card overflow-hidden w-full border border-theme-border rounded-3xl h-[calc(100vh-140px)] shadow-neuro">
                                    <ColaboradorTab
                                        project={activeProject}
                                        db={db}
                                    />
                                </div>
                            </div>
                        )
                    }

                    {/* --- TAB: AGENDA DA SEMANA VIEW (libera com empresa, sem exigir projeto) --- */}
                    {
                        activeTab === 'agenda_semana' && (hasProject || hasCompany) && (
                            <div className="animate-fadeIn max-w-[1920px] mx-auto w-full">
                                <div className="ds-card bg-theme-card overflow-hidden w-full border border-theme-border rounded-3xl min-h-[calc(100vh-140px)] shadow-neuro">
                                    <Suspense fallback={<div className="flex items-center justify-center h-full text-theme-textMuted text-sm p-8">Carregando agenda...</div>}>
                                        <WeeklyAgenda />
                                    </Suspense>
                                </div>
                            </div>
                        )
                    }



                </Suspense>

            </div>

            {/* Floating Buttons: Settings & Chat */}

            <div className="fixed bottom-4 right-4 sm:bottom-8 sm:right-8 z-[150] flex flex-col items-end gap-4 sm:gap-6 pointer-events-none">

                {/* Settings Button */}

                {!chatOpen && (

                    <button onClick={() => setShowAdminModal(true)} className="w-14 h-14 bg-theme-bg border border-theme-divider rounded-full shadow-lg flex items-center justify-center pointer-events-auto hover:scale-110 transition-transform group">

                        <span className="material-symbols-outlined text-theme-text group-hover:rotate-90 transition-transform duration-500">settings</span>

                    </button>

                )}



                {/* Chat Button */}

                <div className={`${chatOpen ? 'w-[min(460px,calc(100vw-2rem))] h-[min(620px,calc(100dvh-6rem))]' : 'w-14 h-14'} pointer-events-auto transition-all duration-300`}>

                    {!chatOpen && (

                        <button onClick={() => setChatOpen(true)} className="w-full h-full bg-theme-orange text-white rounded-full shadow-xl flex items-center justify-center hover:scale-110 transition-transform">

                            <span className="material-symbols-outlined text-2xl">smart_toy</span>

                        </button>

                    )}

                    {chatOpen && (

                        <div className="w-full h-full bg-theme-card rounded-3xl shadow-2xl border border-theme-divider flex flex-col overflow-hidden animate-scaleIn">

                            {/* Header */}
                            <div className="flex-shrink-0 bg-gradient-to-r from-theme-orange to-orange-400 px-4 py-3 flex justify-between items-center text-white">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-xl">smart_toy</span>
                                    <div>
                                        <h3 className="font-black text-sm uppercase tracking-widest leading-none">Enigami AI</h3>
                                        <p className="text-[9px] text-white/70 mt-0.5 flex items-center gap-1.5">
                                            <span className={`w-1.5 h-1.5 rounded-full ${isAiConnected() ? 'bg-emerald-300' : 'bg-red-300'} animate-pulse`} />
                                            {isAiConnected() ? 'Conectada' : 'Modo Demo — configure a chave na Matriz'}
                                            {activeProject ? ` · ${activeProject.name}` : ''}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {chatHistory.length > 0 && (
                                        <button onClick={() => setChatHistory([])} title="Limpar conversa" className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all">
                                            <span className="material-symbols-outlined text-sm">delete_sweep</span>
                                        </button>
                                    )}
                                    <button onClick={() => setChatOpen(false)} className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all">
                                        <span className="material-symbols-outlined text-sm">close</span>
                                    </button>
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-theme-bg" id="chat-container">

                                {chatHistory.length === 0 && (
                                    <div className="flex flex-col items-center gap-5 mt-6">
                                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-theme-orange to-orange-400 flex items-center justify-center shadow-lg">
                                            <span className="material-symbols-outlined text-white text-3xl">smart_toy</span>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-[11px] font-black uppercase tracking-widest text-theme-text">Olá! Sou a ENIGAMI AI</p>
                                            <p className="text-[10px] text-theme-textMuted mt-1">Especialista em coordenação de projetos de arquitetura.</p>
                                        </div>
                                        {/* Quick prompts */}
                                        <div className="w-full space-y-2">
                                            <p className="text-[9px] text-theme-textMuted uppercase tracking-widest text-center">Perguntas rápidas</p>
                                            {[
                                                { icon: 'warning', label: 'Quais ações estão atrasadas?' },
                                                { icon: 'trending_up', label: 'Qual o progresso geral do projeto?' },
                                                { icon: 'schedule', label: 'O que vence nos próximos 14 dias?' },
                                                { icon: 'person', label: 'Quem é o responsável por cada disciplina?' },
                                                { icon: 'calendar_view_week', label: 'Monte o planejamento da próxima semana a partir do macro' },
                                                { icon: 'balance', label: 'Como está a carga de trabalho de cada colaborador?' },
                                            ].map(q => (
                                                <button key={q.label} onClick={() => { setChatQuery(q.label); }}
                                                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-theme-card border border-theme-divider hover:border-theme-orange text-left transition-all group">
                                                    <span className="material-symbols-outlined text-sm text-theme-orange">{q.icon}</span>
                                                    <span className="text-[10px] text-theme-text group-hover:text-theme-orange transition-colors">{q.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {chatHistory.map((msg, idx) => (
                                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        {msg.role === 'ai' && (
                                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-theme-orange to-orange-400 flex items-center justify-center mr-2 flex-shrink-0 mt-1">
                                                <span className="material-symbols-outlined text-white text-[11px]">smart_toy</span>
                                            </div>
                                        )}
                                        <div className={`max-w-[80%] px-3 py-2.5 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${msg.role === 'user'
                                            ? 'bg-theme-orange text-white rounded-br-none shadow-md'
                                            : 'bg-theme-card border border-theme-divider text-theme-text rounded-bl-none shadow-sm'}`}>
                                            {msg.role === 'ai'
                                                ? msg.text
                                                    .replace(/\*\*(.*?)\*\*/g, '**$1**') // kept as-is, rendered via CSS
                                                    .split('\n').map((line, i) => {
                                                        if (line.startsWith('## ')) return <p key={i} className="font-black text-[11px] uppercase tracking-wide text-theme-orange mt-1 mb-0.5">{line.slice(3)}</p>;
                                                        if (line.startsWith('### ')) return <p key={i} className="font-black text-[10px] uppercase tracking-wide text-theme-text mt-1">{line.slice(4)}</p>;
                                                        if (line.startsWith('- ') || line.startsWith('• ')) return <p key={i} className="pl-2 before:content-['•'] before:mr-1.5 before:text-theme-orange">{line.slice(2)}</p>;
                                                        if (/^\*\*(.*)\*\*$/.test(line.trim())) return <p key={i} className="font-bold">{line.replace(/\*\*/g, '')}</p>;
                                                        return <span key={i}>{line.replace(/\*\*(.*?)\*\*/g, (_, t) => t)}<br /></span>;
                                                    })
                                                : msg.text
                                            }
                                        </div>
                                    </div>
                                ))}

                                {isTyping && (
                                    <div className="flex items-end gap-2">
                                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-theme-orange to-orange-400 flex items-center justify-center flex-shrink-0">
                                            <span className="material-symbols-outlined text-white text-[11px]">smart_toy</span>
                                        </div>
                                        <div className="bg-theme-card border border-theme-divider rounded-2xl rounded-bl-none px-4 py-3 flex gap-1 items-center">
                                            <span className="w-1.5 h-1.5 bg-theme-orange rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <span className="w-1.5 h-1.5 bg-theme-orange rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <span className="w-1.5 h-1.5 bg-theme-orange rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>
                                    </div>
                                )}

                            </div>

                            {/* Input */}
                            <form className="flex-shrink-0 p-3 bg-theme-card border-t border-theme-divider" onSubmit={handleSendMessage}>
                                <div className="flex gap-2 items-end">
                                    <textarea
                                        value={chatQuery}
                                        onChange={(e) => { setChatQuery(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 96) + 'px'; }}
                                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                                        placeholder="Pergunte sobre o projeto... (Enter para enviar)"
                                        rows={1}
                                        className="flex-1 bg-theme-bg border border-theme-divider rounded-xl px-3 py-2 text-xs text-theme-text outline-none focus:border-theme-orange transition-all resize-none overflow-hidden"
                                        style={{ minHeight: 36 }}
                                    />
                                    <button type="submit" disabled={!chatQuery.trim() || isTyping}
                                        className="w-9 h-9 bg-theme-orange text-white rounded-xl hover:bg-orange-600 transition-all disabled:opacity-40 flex items-center justify-center flex-shrink-0">
                                        <span className="material-symbols-outlined text-lg">send</span>
                                    </button>
                                </div>
                            </form>

                        </div>

                    )}

                </div>

            </div>

        </div>

        {/* ── Report Modal ── */}
        {showReportModal && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}>
                <div className="bg-theme-card border border-theme-divider rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-scaleIn">
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-theme-divider flex-shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-theme-orange to-orange-400 flex items-center justify-center shadow-md">
                                <span className="material-symbols-outlined text-white text-lg">analytics</span>
                            </div>
                            <div>
                                <h2 className="text-sm font-black uppercase tracking-widest text-theme-text">{reportTitle}</h2>
                                <p className="text-[9px] text-theme-textMuted">{activeProject?.name} · {new Date().toLocaleDateString('pt-BR')}</p>
                            </div>
                        </div>
                        <button onClick={() => setShowReportModal(false)} className="w-8 h-8 rounded-full bg-theme-bg border border-theme-divider flex items-center justify-center hover:border-theme-orange transition-all">
                            <span className="material-symbols-outlined text-sm">close</span>
                        </button>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="bg-theme-bg rounded-2xl border border-theme-divider p-5 font-mono text-[11px] leading-relaxed text-theme-text whitespace-pre-wrap">
                            {reportText.split('\n').map((line, i) => {
                                if (line.startsWith('# ') && !line.startsWith('## ')) return <p key={i} className="text-theme-orange font-black text-sm uppercase tracking-wide mt-4 mb-1">{line.slice(2)}</p>;
                                if (line.startsWith('## ')) return <p key={i} className="text-theme-orange font-black text-sm uppercase tracking-wide mt-4 mb-1">{line.slice(3)}</p>;
                                if (line.startsWith('### ')) return <p key={i} className="text-theme-text font-black text-xs uppercase tracking-wide mt-3 mb-1 border-b border-theme-divider pb-1">{line.slice(4)}</p>;
                                if (line.startsWith('#### ')) return <p key={i} className="text-theme-text font-bold text-[11px] uppercase tracking-wide mt-2">{line.slice(5)}</p>;
                                if (/^\s*[•\-\*]\s/.test(line)) return <p key={i} className="pl-3 text-theme-textMuted">{line.replace(/\*\*(.*?)\*\*/g, (_, t) => t)}</p>;
                                if (/^\s*\d+[\.\)]\s/.test(line)) return <p key={i} className="pl-3 text-theme-textMuted">{line.replace(/\*\*(.*?)\*\*/g, (_, t) => t)}</p>;
                                if (line.trim().startsWith('|')) return <p key={i} className="whitespace-pre text-[10px] text-theme-textMuted overflow-x-auto">{line}</p>;
                                if (line.startsWith('**') && line.endsWith('**')) return <p key={i} className="font-bold text-theme-text">{line.replace(/\*\*/g, '')}</p>;
                                if (line === '') return <div key={i} className="h-2" />;
                                return <p key={i}>{line.replace(/\*\*(.*?)\*\*/g, (_, t) => t)}</p>;
                            })}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-theme-divider flex-shrink-0">
                        <button
                            onClick={async () => {
                                setIsPolishingReport(true);
                                try {
                                    const ctx = buildProjectAIContext();
                                    const polished = await generateChatResponse(
                                        `${ctx ? `[DADOS COMPLETOS DO PROJETO PARA REFERÊNCIA]:\n${JSON.stringify(ctx, null, 1)}\n\n` : ''}Você receberá um documento de projeto de arquitetura gerado automaticamente. Reescreva-o de forma mais profissional, clara e executiva. Mantenha todas as informações, corrija inconsistências usando os dados do projeto acima e acrescente análises relevantes (riscos, prioridades) quando os dados permitirem. Use markdown. Documento:\n\n${reportText}`,
                                        'Você é um consultor sênior de gestão de projetos de arquitetura e engenharia. Escreva em Português brasileiro formal. Baseie-se apenas nos dados fornecidos.'
                                    );
                                    setReportText(polished);
                                } catch { setNotification('Erro ao polir com IA.'); }
                                finally { setIsPolishingReport(false); }
                            }}
                            disabled={isPolishingReport}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-theme-divider hover:border-theme-orange text-xs font-bold text-theme-text transition-all disabled:opacity-50">
                            {isPolishingReport
                                ? <><span className="w-4 h-4 border-2 border-theme-orange border-t-transparent rounded-full animate-spin" /><span>Polindo...</span></>
                                : <><span className="material-symbols-outlined text-sm text-theme-orange">auto_fix_high</span><span>Polir com IA</span></>
                            }
                        </button>
                        <div className="flex gap-2">
                            <button
                                onClick={() => { navigator.clipboard.writeText(reportText); setNotification('Relatório copiado!'); }}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-theme-divider hover:border-theme-orange text-xs font-bold text-theme-text transition-all">
                                <span className="material-symbols-outlined text-sm">content_copy</span> Copiar
                            </button>
                            <button
                                onClick={() => { addLog("RELATÓRIO", reportText); setShowReportModal(false); setNotification('Relatório salvo no feed!'); }}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-theme-orange text-white text-xs font-bold transition-all hover:bg-orange-600">
                                <span className="material-symbols-outlined text-sm">save</span> Salvar no Feed
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}
        {/* ── Banco de Horas Modal ── */}
        {showHorasModal && activeProject && (() => {
            const logs = activeProject.timeLogs || [];
            const allMembers = Array.from(new Set(logs.map(l => l.userId))).sort();
            const filteredLogs = horasFilterMember === 'todos' ? logs : logs.filter(l => l.userId === horasFilterMember);

            // Per-member totals
            const memberTotals: Record<string, number> = {};
            logs.forEach(l => { memberTotals[l.userId] = (memberTotals[l.userId] || 0) + l.duration; });

            // Discipline breakdown for filtered logs
            const disciplineBreakdown: Record<string, Record<string, number>> = {};
            filteredLogs.forEach(l => {
                const memberKey = l.userId;
                const scopeName = l.scopeId ? (activeProject.scopes.find(s => s.id === l.scopeId)?.name || 'Sem disciplina') : 'Sem disciplina';
                if (!disciplineBreakdown[memberKey]) disciplineBreakdown[memberKey] = {};
                disciplineBreakdown[memberKey][scopeName] = (disciplineBreakdown[memberKey][scopeName] || 0) + l.duration;
            });

            // Activity breakdown for filtered logs (top 10 by duration)
            const activityMap: Record<string, { activity: string; scope: string; member: string; duration: number; date: string }[]> = {};
            filteredLogs.forEach(l => {
                const scopeName = l.scopeId ? (activeProject.scopes.find(s => s.id === l.scopeId)?.name || '—') : '—';
                if (!activityMap[l.userId]) activityMap[l.userId] = [];
                activityMap[l.userId].push({ activity: l.activity, scope: scopeName, member: l.userId, duration: l.duration, date: new Date(l.startTime).toLocaleDateString('pt-BR') });
            });

            const totalFiltrado = filteredLogs.reduce((a, l) => a + l.duration, 0);
            const fmtH = (s: number) => `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}min`;

            const copyReport = () => {
                let text = `BANCO DE HORAS — ${activeProject.name}\n`;
                text += `Gerado em: ${new Date().toLocaleDateString('pt-BR')}\n\n`;
                text += `RESUMO POR MEMBRO\n`;
                allMembers.forEach(m => { text += `  ${m}: ${fmtH(memberTotals[m] || 0)}\n`; });
                text += `\nDETALHE POR DISCIPLINA\n`;
                Object.entries(disciplineBreakdown).forEach(([member, scopes]) => {
                    text += `\n  ${member}:\n`;
                    Object.entries(scopes).sort(([,a],[,b]) => b - a).forEach(([scope, dur]) => { text += `    ${scope}: ${fmtH(dur)}\n`; });
                });
                navigator.clipboard.writeText(text).then(() => setNotification('Copiado!'));
            };

            return (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}>
                    <div className="bg-theme-card border border-theme-divider rounded-3xl shadow-2xl w-full max-w-3xl max-h-[88vh] flex flex-col overflow-hidden animate-scaleIn">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-theme-divider">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-theme-highlight flex items-center justify-center">
                                    <span className="material-symbols-outlined text-theme-orange">bar_chart</span>
                                </div>
                                <div>
                                    <h2 className="text-sm font-black text-theme-text uppercase tracking-widest">Banco de Horas</h2>
                                    <p className="text-[10px] text-theme-textMuted">{activeProject.name} · {logs.length} registros</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={copyReport} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-theme-divider hover:border-theme-orange text-[10px] font-bold text-theme-text transition-all">
                                    <span className="material-symbols-outlined text-xs">content_copy</span> Copiar
                                </button>
                                <button onClick={() => setShowHorasModal(false)} className="w-8 h-8 rounded-full bg-theme-bg border border-theme-divider flex items-center justify-center hover:border-theme-orange transition-all">
                                    <span className="material-symbols-outlined text-sm">close</span>
                                </button>
                            </div>
                        </div>

                        {/* Member Filter Tabs */}
                        <div className="flex items-center gap-1.5 px-6 py-3 border-b border-theme-divider overflow-x-auto">
                            <button
                                onClick={() => setHorasFilterMember('todos')}
                                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${horasFilterMember === 'todos' ? 'bg-theme-orange text-white' : 'bg-theme-highlight text-theme-textMuted hover:text-theme-text border border-theme-divider'}`}
                            >
                                Todos
                            </button>
                            {allMembers.map(m => (
                                <button
                                    key={m}
                                    onClick={() => setHorasFilterMember(m)}
                                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${horasFilterMember === m ? 'bg-theme-orange text-white' : 'bg-theme-highlight text-theme-textMuted hover:text-theme-text border border-theme-divider'}`}
                                >
                                    {m}
                                </button>
                            ))}
                        </div>

                        <div className="overflow-y-auto scroller flex-1 p-6 space-y-6">

                            {/* Overview cards */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                <div className="bg-theme-bg border border-theme-divider rounded-2xl p-4 text-center">
                                    <div className="text-2xl font-black text-theme-orange">{fmtH(totalFiltrado)}</div>
                                    <div className="text-[9px] text-theme-textMuted uppercase tracking-widest mt-1">Total de horas</div>
                                </div>
                                <div className="bg-theme-bg border border-theme-divider rounded-2xl p-4 text-center">
                                    <div className="text-2xl font-black text-theme-text">{filteredLogs.length}</div>
                                    <div className="text-[9px] text-theme-textMuted uppercase tracking-widest mt-1">Sessões</div>
                                </div>
                                <div className="bg-theme-bg border border-theme-divider rounded-2xl p-4 text-center col-span-2 sm:col-span-1">
                                    <div className="text-2xl font-black text-theme-text">{horasFilterMember === 'todos' ? allMembers.length : 1}</div>
                                    <div className="text-[9px] text-theme-textMuted uppercase tracking-widest mt-1">Membros</div>
                                </div>
                            </div>

                            {/* Per member summary (only shown when "todos") */}
                            {horasFilterMember === 'todos' && allMembers.length > 0 && (
                                <div>
                                    <h3 className="text-[10px] font-black text-theme-textMuted uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-sm">group</span> Horas por Membro
                                    </h3>
                                    <div className="space-y-2">
                                        {allMembers.sort((a, b) => (memberTotals[b] || 0) - (memberTotals[a] || 0)).map(member => {
                                            const dur = memberTotals[member] || 0;
                                            const pct = totalFiltrado > 0 ? (dur / totalFiltrado) * 100 : 0;
                                            return (
                                                <div key={member} className="bg-theme-bg border border-theme-divider rounded-xl p-3">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="text-xs font-bold text-theme-text">{member}</span>
                                                        <span className="text-xs font-mono font-black text-theme-orange">{fmtH(dur)}</span>
                                                    </div>
                                                    <div className="h-1.5 bg-theme-highlight rounded-full overflow-hidden">
                                                        <div className="h-full bg-theme-orange rounded-full transition-all" style={{ width: `${pct}%` }} />
                                                    </div>
                                                    <div className="text-[9px] text-theme-textMuted mt-1">{pct.toFixed(0)}% do total</div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Discipline breakdown */}
                            {Object.entries(disciplineBreakdown).map(([member, scopes]) => {
                                const memberTotal = Object.values(scopes).reduce((a, b) => a + b, 0);
                                return (
                                    <div key={member}>
                                        <h3 className="text-[10px] font-black text-theme-textMuted uppercase tracking-widest mb-3 flex items-center gap-2">
                                            <span className="material-symbols-outlined text-sm">category</span>
                                            {horasFilterMember === 'todos' ? `${member} — Disciplinas` : 'Horas por Disciplina'}
                                        </h3>
                                        <div className="space-y-1.5">
                                            {Object.entries(scopes).sort(([,a],[,b]) => b - a).map(([scope, dur]) => {
                                                const pct = memberTotal > 0 ? (dur / memberTotal) * 100 : 0;
                                                return (
                                                    <div key={scope} className="flex items-center gap-3 bg-theme-bg border border-theme-divider rounded-xl px-3 py-2">
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex justify-between items-center mb-1">
                                                                <span className="text-[10px] font-bold text-theme-text truncate">{scope}</span>
                                                                <span className="text-[10px] font-mono font-black text-theme-orange ml-2 shrink-0">{fmtH(dur)}</span>
                                                            </div>
                                                            <div className="h-1 bg-theme-highlight rounded-full overflow-hidden">
                                                                <div className="h-full bg-pink-500 rounded-full" style={{ width: `${pct}%` }} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Activity log */}
                            {Object.entries(activityMap).map(([member, activities]) => (
                                <div key={member}>
                                    <h3 className="text-[10px] font-black text-theme-textMuted uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-sm">task_alt</span>
                                        {horasFilterMember === 'todos' ? `${member} — Atividades` : 'Atividades'}
                                    </h3>
                                    <div className="space-y-1">
                                        {activities.sort((a, b) => b.duration - a.duration).slice(0, 15).map((act, i) => (
                                            <div key={i} className="flex items-center justify-between gap-2 bg-theme-bg border border-theme-divider rounded-xl px-3 py-2 hover:border-theme-orange/30 transition-colors">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[10px] font-bold text-theme-text truncate">{act.activity || '—'}</p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        {act.scope !== '—' && <span className="text-[8px] px-1.5 py-0.5 rounded bg-theme-highlight text-theme-textMuted uppercase">{act.scope}</span>}
                                                        <span className="text-[9px] text-theme-textMuted">{act.date}</span>
                                                    </div>
                                                </div>
                                                <span className="text-[10px] font-mono font-black text-theme-textMuted shrink-0">{fmtH(act.duration)}</span>
                                            </div>
                                        ))}
                                        {activities.length > 15 && (
                                            <div className="text-[9px] text-theme-textMuted text-center pt-1">+{activities.length - 15} atividades adicionais</div>
                                        )}
                                    </div>
                                </div>
                            ))}

                        </div>
                    </div>
                </div>
            );
        })()}

            {/* Collaborative Hub Floating Panel */}
            <CollaborativeHub />

            {/* Collaboration Toast Notification */}
            {collaborationToast && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[500] no-print animate-scaleIn">
                    <div className="flex items-center gap-3 bg-theme-card/95 backdrop-blur-xl border border-theme-orange/30 text-theme-text px-5 py-3 rounded-2xl shadow-2xl shadow-theme-orange/10 max-w-sm">
                        <img
                            src={collaborationToast.avatarUrl}
                            alt={collaborationToast.author}
                            className="w-8 h-8 rounded-full object-cover ring-2 ring-theme-orange/40 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-wider text-theme-orange">{collaborationToast.author}</p>
                            <p className="text-[11px] text-theme-text truncate mt-0.5">{collaborationToast.message}</p>
                        </div>
                        <span className="w-2 h-2 rounded-full bg-theme-orange animate-ping shrink-0" />
                    </div>
                </div>
            )}

        </>
    );
};

export default App;
