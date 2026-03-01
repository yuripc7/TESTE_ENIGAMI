import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { DB, Project, Company } from '../types';
import { INITIAL_DB } from '../constants';

const STORAGE_KEY = 'design_board_db_v1';
const THEME_KEY = 'design_board_theme_v1';

interface User {
  name: string;
  avatar?: string;
}

interface AppContextType {
  // State
  db: DB;
  theme: string;
  currentUser: User | null;
  notification: string | null;

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
  const [db, setDb] = useState<DB>(() => {
    try {
      const savedDb = localStorage.getItem(STORAGE_KEY);
      return savedDb ? JSON.parse(savedDb) : INITIAL_DB;
    } catch (error) {
      console.error("Erro ao carregar dados locais, resetando para padrão:", error);
      return INITIAL_DB;
    }
  });

  const [theme, setThemeState] = useState(() => {
    const savedTheme = localStorage.getItem(THEME_KEY);
    return savedTheme || 'light';
  });

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // Persist db to localStorage (DEBOUNCED & SIZE SAFE)
  useEffect(() => {
    const handler = setTimeout(() => {
      try {
        const json = JSON.stringify(db);
        const sizeMb = (json.length / (1024 * 1024)).toFixed(2);

        if (parseFloat(sizeMb) > 4.5) {
          console.warn(`DATABASE SIZE WARNING: ${sizeMb}MB. Perto do limite do navegador.`);
          setNotification(`Aviso: Banco de dados grande (${sizeMb}MB). Recomenda-se exportar e limpar backups antigos.`);
        }

        localStorage.setItem(STORAGE_KEY, json);
        console.log(`Persistence: Projeto Salvo (${sizeMb}MB).`);
      } catch (error) {
        console.error("Erro ao salvar dados:", error);
        setNotification("Erro crítico ao salvar! (Possível limite excedido)");
      }
    }, 3000); // 3 seconds debounce for safety

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
      const timer = setTimeout(() => setNotification(null), 3000);
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
  const addLog = (author: string, text: string, imageUrl?: string) => {
    if (!db.activeProjectId) return;

    setDb(prev => ({
      ...prev,
      projects: prev.projects.map(p =>
        p.id === db.activeProjectId
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
            ]
          }
          : p
      )
    }));
  };

  // Manual save trigger
  const handleManualSave = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
      setNotification("Projeto Salvo com Sucesso!");
    } catch (error) {
      setNotification("Erro ao salvar!");
    }
  };

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
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const rawData = JSON.parse(event.target?.result as string);
        if (!rawData || typeof rawData !== 'object') throw new Error("Formato inválido.");

        // Deep Patching Function
        const patchProject = (p: any): Project => ({
          ...p,
          activities: Array.isArray(p.activities) ? p.activities : [],
          galleryFolders: Array.isArray(p.galleryFolders) ? p.galleryFolders : [],
          dataRows: Array.isArray(p.dataRows) ? p.dataRows : [],
          timeLogs: Array.isArray(p.timeLogs) ? p.timeLogs : [],
          viabilityFiles: Array.isArray(p.viabilityFiles) ? p.viabilityFiles : [],
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

        if (confirm("ATENÇÃO: Isso substituirá todos os dados atuais. Deseja continuar?")) {
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
        alert("Erro crítico ao ler o backup. Verifique a estrutura do arquivo.");
      }
    };
    reader.readAsText(file);
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
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
