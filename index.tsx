import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AppProvider } from './contexts/AppContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ConfirmProvider } from './components/ConfirmDialog';
import { AuthGate } from './components/AuthGate';
import { supabase } from './lib/supabase';
import './index.css';

const Root = () => {
  console.log("Enigami Root mounted - v2.9.3");
  const [session, setSession] = useState<any>(null); // Login aparece imediatamente
  const [isCleanedUp, setIsCleanedUp] = useState(false);

  useEffect(() => {
    async function performCleanup() {
      const CLEANUP_KEY = 'enigami_cleanup_v5';
      if (!localStorage.getItem(CLEANUP_KEY)) {
        console.log("Starting Enigami clean-up of storage and sessions...");
        
        // 1. Clear IndexedDB
        try {
          await new Promise<void>((resolve) => {
            const req = indexedDB.deleteDatabase('EnigamiOfflineDB_v2');
            req.onsuccess = () => {
              console.log("IndexedDB database deleted successfully.");
              resolve();
            };
            req.onerror = () => {
              console.error("Failed to delete IndexedDB database.");
              resolve();
            };
            req.onblocked = () => {
              console.warn("IndexedDB delete blocked.");
              resolve();
            };
          });
        } catch (e) {
          console.error("Error deleting IndexedDB database:", e);
        }

        // 2. Clear localStorage
        localStorage.clear();

        // 3. Mark cleanup as done
        localStorage.setItem(CLEANUP_KEY, 'true');

        // 4. Clear Supabase auth session
        try {
          await supabase.auth.signOut();
        } catch (e) {
          console.error("Error signing out from Supabase:", e);
        }

        console.log("Enigami clean-up complete! Reloading page...");
        window.location.reload();
      } else {
        setIsCleanedUp(true);
      }
    }
    performCleanup();
  }, []);

  useEffect(() => {
    if (!isCleanedUp) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session ?? null);
    });
    return () => subscription.unsubscribe();
  }, [isCleanedUp]);

  if (!isCleanedUp) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F0F2F5] text-sm text-[#1B1D21] font-sans font-bold uppercase tracking-widest gap-3">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        <span>Limpando histórico antigo...</span>
      </div>
    );
  }

  if (!session) return <AuthGate />;

  const userId = session.user.id;

  return (
    <React.StrictMode>
      <ErrorBoundary>
        <ConfirmProvider>
          <AppProvider userId={userId}>
            <App />
          </AppProvider>
        </ConfirmProvider>
      </ErrorBoundary>
    </React.StrictMode>
  );
};

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Could not find root element to mount to');
ReactDOM.createRoot(rootElement).render(<Root />);
