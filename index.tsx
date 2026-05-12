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
  const [session, setSession] = useState<any>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return (
      <div className="fixed inset-0 flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #f5f0ee 0%, #ede8e6 100%)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-[3px] border-[#e8604a] border-t-transparent animate-spin" />
          <span className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-400">Carregando...</span>
        </div>
      </div>
    );
  }

  if (!session) return <AuthGate />;

  const userId = session.user?.id || 'anonymous';

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
