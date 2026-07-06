import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { DB, Project, Company } from '../types';
import { INITIAL_DB, STORAGE_KEY, THEME_KEY, DEBOUNCE_SAVE_MS, NOTIFICATION_TIMEOUT_MS } from '../constants';
import { readFileAsText } from '../utils/fileReaderUtils';
import { useConfirm } from '../components/ConfirmDialog';
import { getIndexedDBItem, setIndexedDBItem } from '../utils/indexedDbHelper';
import { useCollaboration, CollaborationUser } from '../hooks/useCollaboration';
import { decodeAvatarUrl } from '../utils/avatarHelper';
import { upsertMember, deriveTeam, normalizeMembers } from '../utils/membersHelper';

const USER_KEY = 'enigami_user_v1';

interface User {
  id?: string;
  name: string;
  avatar?: string;
  role?: string;
  profileCompleted?: boolean;
  companyTime?: string;
}

// Helpers
const buildAvatar = (name: string) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=FFB7B2&color=fff`;

interface AppContextType {
  // State
  db: DB;
  theme: string;
  currentUser: User | null;
  notification: string | null;
  lastSavedAt: Date | null;

  // Computed values
  activeProject: Project | null;
  activeCompany: Company | null;
  isViewer: boolean;

  // Actions
  setDb: React.Dispatch<React.SetStateAction<DB>>;
  setTheme: (theme: string) => void;
  setCurrentUser: (user: User | null) => void;
  setNotification: (message: string | null) => void;
  addLog: (author: string, text: string, imageUrl?: string) => void;
  handleManualSave: () => void;
  handleExportJSON: () => void;
  handleImportJSON: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleLogout: () => void;

  // Collaboration
  onlineUsers: CollaborationUser[];
  realOnlineCount: number;
  isRealtimeConnected: boolean;
  simulationActive: boolean;
  setSimulationActive: (active: boolean) => void;
  simulationSpeed: number;
  setSimulationSpeed: (speed: number) => void;
  collaborationToast: { message: string; author: string; avatarUrl: string } | null;
  setCollaborationToast: (toast: { message: string; author: string; avatarUrl: string } | null) => void;
  activeTab: string;
  setActiveTab: (tab: any) => void;
  showProfileModal: boolean;
  setShowProfileModal: (show: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};

interface AppProviderProps {
  children: ReactNode;
  userId: string;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children, userId }) => {
  const { requestConfirm, showAlert } = useConfirm();
  const [db, setDb] = useState<DB>(INITIAL_DB);
  const [dbLoaded, setDbLoaded] = useState(false);

  // Load database from IndexedDB on startup (with backwards compatible localStorage migration!)
  useEffect(() => {
    async function loadData() {
      try {
        const key = STORAGE_KEY + "_" + userId;
        let data = await getIndexedDBItem<DB>(key);
        
        if (!data) {
          const oldSaved = localStorage.getItem(key);
          if (oldSaved) {
            data = JSON.parse(oldSaved);
            await setIndexedDBItem(key, data);
            localStorage.removeItem(key);
            console.log("Migrated localStorage database state to IndexedDB successfully!");
          }
        }

        const finalData = data || INITIAL_DB;

        if (finalData && Array.isArray(finalData.team)) {
          const preconfigured = ["Arq. Yuri", "Arq. Lourraine", "Eng. Lucas", "Arq. Isabela", "Mkt Gisele", "Gugu (guzinho)"];
          finalData.team = finalData.team.filter((m: string) => !preconfigured.includes(m));
        }

        setDb(finalData);
        lastSavedRef.current = JSON.stringify(finalData);
      } catch (err) {
        console.error("Erro ao carregar dados do IndexedDB:", err);
      } finally {
        setDbLoaded(true);
      }
    }
    loadData();
  }, [userId]);

  const [theme, setThemeState] = useState(() => {
    const savedTheme = localStorage.getItem(THEME_KEY);
    return savedTheme || 'light';
  });

  const [currentUser, setCurrentUserState] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(USER_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [notification, setNotification] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  // Collaboration & Real-Time Sync States
  const [activeTab, setActiveTab] = useState<string>('timeline');
  const [collaborationToast, setCollaborationToast] = useState<{ message: string; author: string; avatarUrl: string } | null>(null);

  // Profile Completion Modal State
  const [showProfileModal, setShowProfileModal] = useState<boolean>(() => {
    return localStorage.getItem('enigami_profile_completed') !== 'true';
  });
  
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const showToast = useCallback((message: string, author: string, avatarUrl: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setCollaborationToast({ message, author, avatarUrl });
    toastTimeoutRef.current = setTimeout(() => {
      setCollaborationToast(null);
    }, 4000);
  }, []);

  // Sincroniza currentUser com o perfil do Supabase Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) loadProfile(session.user.id);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) { await loadProfile(session.user.id); }
        else {
          // Sem sessão Supabase: preserva perfis demo (criados localmente),
          // limpando apenas usuários autenticados que de fato saíram.
          setCurrentUserState(prev => {
            if (prev && prev.id === 'demo_user') return prev;
            localStorage.removeItem(USER_KEY);
            return null;
          });
        }
      }
    );
    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadProfile(userId: string) {
    // role/company_time são colunas opcionais (supabase_setup.sql) — se ainda
    // não existirem no projeto do usuário, cai pro select básico.
    let data: { id: string; name: string; avatar_url: string; role?: string; company_time?: string } | null = null;
    const full = await supabase.from('profiles').select('id, name, avatar_url, role, company_time').eq('id', userId).single();
    if (full.error) {
      const basic = await supabase.from('profiles').select('id, name, avatar_url').eq('id', userId).single();
      data = basic.data;
    } else {
      data = full.data;
    }

    const { data: ud } = await supabase.auth.getUser();
    const metadata = ud?.user?.user_metadata;
    const isCompleted = metadata?.profile_completed === true;

    if (data) {
      const decoded = decodeAvatarUrl(data.avatar_url);
      setCurrentUser({
        id: data.id,
        name: data.name,
        avatar: decoded.avatarUrl || buildAvatar(data.name),
        role: data.role || metadata?.role || 'Colaborador',
        profileCompleted: isCompleted,
        companyTime: data.company_time || decoded.companyTime || metadata?.company_time || '',
      });
    } else {
      if (ud?.user) {
        const decoded = decodeAvatarUrl(metadata?.avatar_url);
        setCurrentUser({
          id: ud.user.id,
          name: ud.user.email?.split('@')[0] ?? 'Usuário',
          avatar: decoded.avatarUrl || buildAvatar(ud.user.email?.split('@')[0] ?? 'Usuário'),
          role: metadata?.role,
          profileCompleted: isCompleted,
          companyTime: decoded.companyTime || metadata?.company_time || '',
        });
      }
    }
  }

  // Persist user to localStorage
  const setCurrentUser = useCallback((user: User | null) => {
    setCurrentUserState(user);
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_KEY);
    }
  }, []);

  const handleLogout = useCallback(() => {
    supabase.auth.signOut().then(() => {
      setCurrentUser(null);
      setNotification('Sessão encerrada.');
    });
  }, [setCurrentUser, setNotification]);

  // Track last saved JSON to skip redundant writes
  const lastSavedRef = useRef<string>('');

  // Persist db to IndexedDB (DEBOUNCED & UNLIMITED SIZE SAFE)
  useEffect(() => {
    if (!dbLoaded) return;

    const handler = setTimeout(async () => {
      try {
        const json = JSON.stringify(db);

        if (json === lastSavedRef.current) return;

        const key = STORAGE_KEY + "_" + userId;
        await setIndexedDBItem(key, db);
        
        lastSavedRef.current = json;
        setLastSavedAt(new Date());
        
        const sizeMb = (json.length / (1024 * 1024)).toFixed(2);
        console.log(`Persistence: Projeto Salvo no IndexedDB (${sizeMb}MB).`);
      } catch (error) {
        console.error("Erro ao salvar dados no IndexedDB:", error);
        setNotification("Erro crítico ao salvar no banco de dados!");
      }
    }, DEBOUNCE_SAVE_MS);

    return () => clearTimeout(handler);
  }, [db, dbLoaded, userId]);

  // Persist theme to localStorage and update DOM
  useEffect(() => {
    document.documentElement.className = theme;
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  // ── ESTRUTURA CENTRAL DE MEMBROS ────────────────────────────────────────
  // Todo perfil registrado no Supabase (login) vira um TeamMember em db.members.
  // db.team (nomes) é derivado de members para compatibilidade com o restante do app.
  useEffect(() => {
    async function syncProfilesToMembers() {
      try {
        // select('*') para aproveitar colunas extras (role, company_time) se existirem
        const { data, error } = await supabase.from('profiles').select('*');

        if (error) {
          console.warn('Erro ao carregar perfis do Supabase:', error);
          return;
        }
        if (!data || data.length === 0) return;

        setDb(prev => {
          let members = prev.members || [];
          for (const p of data as any[]) {
            if (!p.name) continue;
            const decoded = decodeAvatarUrl(p.avatar_url);
            members = upsertMember(members, {
              id: p.id,
              name: p.name,
              avatarUrl: decoded.avatarUrl || undefined,
              role: p.role || undefined,
              email: p.email || undefined,
              source: 'login',
            });
          }
          if (members === prev.members) return prev;
          return { ...prev, members, team: deriveTeam(members) };
        });
      } catch (err) {
        console.error('Erro na sincronização de perfis:', err);
      }
    }

    syncProfilesToMembers();

    // Escuta em tempo real novos cadastros/alterações na tabela profiles
    const channel = supabase
      .channel('profiles-realtime-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        syncProfilesToMembers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Normalização: migra nomes legados de team para members e mantém team derivado
  useEffect(() => {
    setDb(prev => {
      const normalized = normalizeMembers(prev);
      if (!normalized) return prev;
      return { ...prev, ...normalized };
    });
  }, [db.team, db.members]);

  // Garante que o próprio usuário ativo esteja sempre registrado como membro,
  // atualizando o nome anterior se houver alteração (evita duplicados).
  const prevNameRef = useRef<string | null>(null);
  useEffect(() => {
    if (currentUser?.name && currentUser.profileCompleted) {
      const newName = currentUser.name;
      const oldName = prevNameRef.current;

      setDb(prev => {
        let members = prev.members || [];

        if (oldName && oldName !== newName) {
          members = members.filter(m => m.name !== oldName || (m.id && m.id === currentUser.id));
          const renamed = members.find(m => m.id && m.id === currentUser.id);
          if (renamed) {
            members = members.map(m => m === renamed ? { ...m, name: newName } : m);
          }
        }

        members = upsertMember(members, {
          id: currentUser.id !== 'demo_user' ? currentUser.id : undefined,
          name: newName,
          role: currentUser.role,
          avatarUrl: currentUser.avatar,
          source: currentUser.id && currentUser.id !== 'demo_user' ? 'login' : 'manual',
        });

        if (members === prev.members) return prev;
        return { ...prev, members, team: deriveTeam(members) };
      });

      prevNameRef.current = newName;
    }
  }, [currentUser]);

  // Auto-hide notification after 3 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), NOTIFICATION_TIMEOUT_MS);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Computed values
  const activeProject = useMemo(() => {
    return db.projects.find(p => String(p.id) === String(db.activeProjectId)) || null;
  }, [db.projects, db.activeProjectId]);

  const activeCompany = useMemo(() => {
    return db.companies.find(c => String(c.id) === String(db.activeCompanyId)) || null;
  }, [db.companies, db.activeCompanyId]);

  const isViewer = useMemo(() => {
    if (!currentUser) return true;
    if (currentUser.id === 'demo_user') return false;
    const r = (currentUser.role || '').toLowerCase();
    const isEditor = r.includes('arquiteto') || 
                     r.includes('engenheiro') || 
                     r.includes('arq') || 
                     r.includes('eng') || 
                     r.includes('coord') || 
                     r.includes('ger') || 
                     r.includes('dir') || 
                     r.includes('design') ||
                     r.includes('collab');
    return !isEditor;
  }, [currentUser]);

  // Helper function to get current timestamp
  const getNowString = () => {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  // Add log entry to active project
  const addLog = useCallback((author: string, text: string, imageUrl?: string) => {
    setDb(prev => {
      if (!prev.activeProjectId) return prev;
      return {
        ...prev,
        projects: prev.projects.map(p =>
          p.id === prev.activeProjectId
            ? {
              ...p,
              updatedAt: new Date().toISOString(),
              activities: [
                ...p.activities,
                {
                  date: getNowString(),
                  author: author.toUpperCase(),
                  text: text.toUpperCase(),
                  imageUrl
                }
              ].slice(-500)
            }
            : p
        )
      };
    });
  }, []);

  // Collaboration hook — placed after addLog so it can be passed as a prop
  const activeProjectIdStr = db.activeProjectId ? String(db.activeProjectId) : null;
  const activeProj = db.projects.find(p => p.id === db.activeProjectId);
  const activeProjectName = activeProj ? activeProj.name : null;

  const {
    onlineUsers,
    realOnlineCount,
    isConnected: isRealtimeConnected,
    simulationActive,
    setSimulationActive,
    simulationSpeed,
    setSimulationSpeed
  } = useCollaboration({
    projectId: activeProjectIdStr,
    projectName: activeProjectName,
    currentUserId: currentUser?.id || 'demo_user',
    currentName: currentUser?.name || 'Visitante',
    currentAvatar: currentUser?.avatar || buildAvatar(currentUser?.name || 'Visitante'),
    activeTab,
    db,
    setDb,
    addLog,
    showToast
  });

  // Manual save trigger
  const handleManualSave = useCallback(async () => {
    try {
      const json = JSON.stringify(db);
      const key = STORAGE_KEY + "_" + userId;
      await setIndexedDBItem(key, db);
      lastSavedRef.current = json;
      setLastSavedAt(new Date());
      setNotification('Projeto salvo com sucesso!');
    } catch (error) {
      setNotification('Erro ao salvar!');
    }
  }, [db, userId]);

  // Export JSON backup
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

  // Import JSON backup
  const handleImportJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await readFileAsText(file);
      const rawData = JSON.parse(text);
      if (!rawData || typeof rawData !== 'object') throw new Error("Formato inválido.");

      // Deep Patching Function
      const patchProject = (p: any): Project => ({
        ...p,
        activities: Array.isArray(p.activities) ? p.activities : [],
        galleryFolders: Array.isArray(p.galleryFolders) ? p.galleryFolders : [],
        dataRows: Array.isArray(p.dataRows) ? p.dataRows : [],
        timeLogs: Array.isArray(p.timeLogs) ? p.timeLogs : [],
        viabilityFiles: Array.isArray(p.viabilityFiles) ? p.viabilityFiles : [],
        details: p.details ? {
          pavements: (Array.isArray(p.details.pavements) ? p.details.pavements : []).map((pt: any) => ({
            ...pt,
            category: pt.category || 'Habitacional',
            areaPerPavement: Number(pt.areaPerPavement) || 0,
            unitArea: Number(pt.unitArea) || 0,
          })),
          totalParkingSpaces: Number(p.details.totalParkingSpaces) || 0,
          totalLeisureArea: p.details.totalLeisureArea || '',
          landArea: p.details.landArea || '',
          builtArea: p.details.builtArea || '',
          salesArea: p.details.salesArea || '',
          zoning: p.details.zoning || '',
          height: p.details.height || '',
          location: p.details.location || '',
          broker: p.details.broker || '',
          resp: p.details.resp || ''
        } : undefined,
        scopes: (Array.isArray(p.scopes) ? p.scopes : []).map((s: any) => ({
          ...s,
          events: (Array.isArray(s.events) ? s.events : []).map((ev: any) => ({
            ...ev,
            checklist: Array.isArray(ev.checklist) ? ev.checklist : [],
            completed: !!ev.completed,
            dependencies: Array.isArray(ev.dependencies) ? ev.dependencies : []
          }))
        }))
      });

      const importedData: DB = {
        ...INITIAL_DB,
        ...rawData,
        projects: (Array.isArray(rawData.projects) ? rawData.projects : []).map(patchProject),
        companies: Array.isArray(rawData.companies) ? rawData.companies : INITIAL_DB.companies,
        team: Array.isArray(rawData.team) ? rawData.team : INITIAL_DB.team,
        disciplines: Array.isArray(rawData.disciplines) ? rawData.disciplines : INITIAL_DB.disciplines
      };

      // Validate Active IDs
      const projectExists = importedData.projects.some(p => p.id === importedData.activeProjectId);
      if (!projectExists) importedData.activeProjectId = importedData.projects[0]?.id || null;

      if (await requestConfirm({ message: "Isso substituirá todos os dados atuais. Deseja continuar?", variant: 'warning', title: 'Importar Backup' })) {
        // Inject log directly into the new state
        const activeP = importedData.projects.find(p => p.id === importedData.activeProjectId);
        if (activeP) {
          activeP.activities = [
            { date: new Date().toLocaleString('pt-BR').slice(0, 11), author: "SISTEMA", text: "BACKUP DO SISTEMA IMPORTADO" },
            ...activeP.activities
          ];
        }

        setDb(importedData);
        setNotification("Backup importado e validado com sucesso!");
      }
    } catch (err) {
      console.error("Erro ao importar JSON:", err);
      showAlert("Erro crítico ao ler o backup. Verifique a estrutura do arquivo.");
    }
    e.target.value = '';
  };

  const setTheme = (newTheme: string) => {
    setThemeState(newTheme);
  };

  const value: AppContextType = {
    db,
    theme,
    currentUser,
    notification,
    lastSavedAt,
    activeProject,
    activeCompany,
    isViewer,
    setDb,
    setTheme,
    setCurrentUser,
    setNotification,
    addLog,
    handleManualSave,
    handleExportJSON,
    handleImportJSON,
    handleLogout,
    onlineUsers,
    realOnlineCount,
    isRealtimeConnected,
    simulationActive,
    setSimulationActive,
    simulationSpeed,
    setSimulationSpeed,
    collaborationToast,
    setCollaborationToast,
    activeTab,
    setActiveTab,
    showProfileModal,
    setShowProfileModal,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
