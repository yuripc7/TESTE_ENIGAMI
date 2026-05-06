import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { DB, Project, Company } from '../types';
import { INITIAL_DB, STORAGE_KEY, THEME_KEY, DEBOUNCE_SAVE_MS, NOTIFICATION_TIMEOUT_MS } from '../constants';
import { readFileAsText } from '../utils/fileReaderUtils';
import { useConfirm } from '../components/ConfirmDialog';

const USER_KEY = 'enigami_user_v1';

interface User {
  name: string;
  avatar?: string;
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
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const { requestConfirm, showAlert } = useConfirm();
  const [db, setDb] = useState<DB>(() => {
    try {
      const savedDb = localStorage.getItem(STORAGE_KEY);
      return savedDb ? JSON.parse(savedDb) : INITIAL_DB;
    } catch (error) {
      console.error("Erro ao carregar dados locais, resetando para padrÃ£o:", error);
      return INITIAL_DB;
    }
  });

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
    setCurrentUser(null);
    setNotification('SessÃ£o encerrada.');
  }, [setCurrentUser, setNotification]);

  // Track last saved JSON to skip redundant writes
  const lastSavedRef = useRef<string>('');

  // Persist db to localStorage (DEBOUNCED & SIZE SAFE)
  useEffect(() => {
    const handler = setTimeout(() => {
      try {
        const json = JSON.stringify(db);

        // Skip write if data hasn't changed since last save
        if (json === lastSavedRef.current) return;

        const sizeMb = (json.length / (1024 * 1024)).toFixed(2);

        if (parseFloat(sizeMb) > 4.5) {
          console.warn(`DATABASE SIZE WARNING: ${sizeMb}MB. Perto do limite do navegador.`);
          setNotification(`Aviso: Banco de dados grande (${sizeMb}MB). Recomenda-se exportar e limpar backups antigos.`);
        }

        localStorage.setItem(STORAGE_KEY, json);
        lastSavedRef.current = json;
        setLastSavedAt(new Date());
        console.log(`Persistence: Projeto Salvo (${sizeMb}MB).`);
      } catch (error) {
        console.error("Erro ao salvar dados:", error);
        if (error instanceof DOMException && error.name === 'QuotaExceededError') {
          setNotification("ERRO CRÃTICO: Limite de armazenamento excedido! Exporte um backup e remova imagens/arquivos antigos para continuar salvando.");
        } else {
          setNotification("Erro crÃ­tico ao salvar! Verifique o console (F12).");
        }
      }
    }, DEBOUNCE_SAVE_MS); // debounce for safety

    return () => clearTimeout(handler);
  }, [db]);

  // Persist theme to localStorage and update DOM
  useEffect(() => {
    document.documentElement.className = theme;
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  // Auto-hide notification after 3 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), NOTIFICATION_TIMEOUT_MS);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Computed values
  const activeProject = useMemo(() => {
    return db.projects.find(p => p.id === db.activeProjectId) || null;
  }, [db.projects, db.activeProjectId]);

  const activeCompany = useMemo(() => {
    return db.companies.find(c => c.id === db.activeCompanyId) || null;
  }, [db.companies, db.activeCompanyId]);

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

  // Manual save trigger
  const handleManualSave = useCallback(() => {
    try {
      const json = JSON.stringify(db);
      localStorage.setItem(STORAGE_KEY, json);
      lastSavedRef.current = json;
      setLastSavedAt(new Date());
      setNotification('Projeto salvo com sucesso!');
    } catch (error) {
      setNotification('Erro ao salvar!');
    }
  }, [db]);

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
      if (!rawData || typeof rawData !== 'object') throw new Error("Formato invÃ¡lido.");

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

      if (await requestConfirm({ message: "Isso substituirÃ¡ todos os dados atuais. Deseja continuar?", variant: 'warning', title: 'Importar Backup' })) {
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
      showAlert("Erro crÃ­tico ao ler o backup. Verifique a estrutura do arquivo.");
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
    setDb,
    setTheme,
    setCurrentUser,
    setNotification,
    addLog,
    handleManualSave,
    handleExportJSON,
    handleImportJSON,
    handleLogout,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
