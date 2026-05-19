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
  const [session, setSession] = useState<any>(null); // Login aparece imediatamente

  const [useDemo, setUseDemo] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);



  if (!session && !useDemo) return <AuthGate onBypass={() => setUseDemo(true)} />;

  const userId = session?.user?.id || 'demo_user';

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
