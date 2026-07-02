import { createClient } from '@supabase/supabase-js';

// URL e chave podem ser sobrescritas por variáveis de ambiente (Vercel/CI):
// VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY. Sem elas, usa o projeto padrão.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://qlvvpgfotcdtdypvkrvu.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_s894em2YE-BXyabblSnemQ_4Jwx7AoB';

// ── Persistência de sessão ──────────────────────────────────────────────
// "Lembrar de mim" marcado → sessão vive no localStorage (sobrevive a fechar
// o navegador — essencial no celular). Desmarcado → sessionStorage (encerra
// ao fechar a aba), comportamento original.
const PERSIST_FLAG = 'enigami_auth_persist_v1';

export const setAuthPersistence = (remember: boolean): void => {
  try { localStorage.setItem(PERSIST_FLAG, remember ? 'true' : 'false'); } catch { /* noop */ }
};

const wantsPersistence = (): boolean => {
  try { return localStorage.getItem(PERSIST_FLAG) === 'true'; } catch { return false; }
};

const authStorage = {
  getItem: (key: string): string | null => {
    try { return localStorage.getItem(key) ?? sessionStorage.getItem(key); } catch { return null; }
  },
  setItem: (key: string, value: string): void => {
    try {
      if (wantsPersistence()) {
        localStorage.setItem(key, value);
        sessionStorage.removeItem(key);
      } else {
        sessionStorage.setItem(key, value);
        localStorage.removeItem(key);
      }
    } catch { /* noop */ }
  },
  removeItem: (key: string): void => {
    try { localStorage.removeItem(key); sessionStorage.removeItem(key); } catch { /* noop */ }
  },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: authStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: { eventsPerSecond: 5 },
  },
});
