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
    const [session, setSession] = useState<any>(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [useDemo, setUseDemo] = useState(false);

    useEffect(() => {
          supabase.auth.getSession().then(({ data: { session } }) => {
                  setSession(session ?? null);
                  setAuthLoading(false);
          });
          const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
                  setSession(session ?? null);
          });
          return () => subscription.unsubscribe();
    }, []);

    if (authLoading) return (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f0f0f' }}>
                  <div style={{ color: '#FF7A00', fontSize: 14, fontFamily: 'sans-serif', opacity: 0.7 }}>Carregando...</div>div>
          </div>div>
        );

    if (!session && !useDemo) return <AuthGate onBypass={() => setUseDemo(true)} />;

    const userId = session?.user?.id || 'demo_user';

    return (
          <React.StrictMode>
                <ErrorBoundary>
                        <ConfirmProvider>
                                  <AppProvider userId={userId}>
                                              <App />
                                  </AppProvider>AppProvider>
                        </ConfirmProvider>ConfirmProvider>
                </ErrorBoundary>ErrorBoundary>
          </React.StrictMode>React.StrictMode>
        );
};

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Could not find root element to mount to');
ReactDOM.createRoot(rootElement).render(<Root />);</React.StrictMode>
