import { createClient } from '@supabase/supabase-js';

// A sessao agora usa localStorage (padrao do SDK): sobrevive a fechar o
// navegador, entao o usuario permanece logado entre sessoes e entre maquinas
// diferentes. flowType 'pkce' segue o modelo OAuth 2.0 Authorization Code + PKCE.
export const supabase = createClient(
    'https://qlvvpgfotcdtdypvkrvu.supabase.co',
    'sb_publishable_s894em2YE-BXyabblSnemQ_4Jwx7AoB',
  {
        auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true,
                flowType: 'pkce',
        },
  }
  );
