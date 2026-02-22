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

  // Persist db to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch (error) {
      console.error("Erro ao salvar dados:", error);
      setNotification("Erro ao salvar alterações localmente!");
    }
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
      } catch (error) {
        console.error("Erro ao importar JSON", error);
        alert("Erro ao ler o arquivo de backup.");
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
