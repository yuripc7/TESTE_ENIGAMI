import { supabase } from '../lib/supabase';

/**
 * Cadastro de e-mails da empresa (tabela public.company_emails).
 * Cada e-mail registrado vira um membro da equipe central; quando a pessoa
 * cria o login com aquele e-mail, o perfil conecta automaticamente e o
 * histórico do workspace fica vinculado ao grupo.
 * Se a tabela não existir (setup SQL ainda não rodado), tudo vira no-op.
 */

export interface CompanyEmail {
  id: string;
  email: string;
  name?: string | null;
  role?: string | null;
  company?: string | null;
  created_at?: string;
}

let available: boolean | null = null;

function markUnavailable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const msg = String(error.message || '');
  if (error.code === '42P01' || error.code === 'PGRST205' || msg.includes('company_emails')) {
    if (available !== false) {
      available = false;
      console.warn(
        '[Supabase] Tabela company_emails não encontrada — cadastro de e-mails desativado. ' +
        'Execute supabase_setup.sql no SQL Editor do Supabase para ativá-lo.'
      );
    }
    return true;
  }
  return false;
}

async function hasSession(): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return !!session;
  } catch {
    return false;
  }
}

export async function listCompanyEmails(): Promise<CompanyEmail[] | null> {
  if (available === false) return null;
  if (!(await hasSession())) return null;
  try {
    const { data, error } = await supabase
      .from('company_emails')
      .select('id, email, name, role, company, created_at')
      .order('created_at', { ascending: true });
    if (error) {
      if (!markUnavailable(error)) console.warn('[Supabase] Falha ao listar e-mails:', error.message);
      return null;
    }
    available = true;
    return (data || []) as CompanyEmail[];
  } catch (err) {
    console.warn('[Supabase] Erro inesperado ao listar e-mails:', err);
    return null;
  }
}

export async function addCompanyEmail(
  email: string,
  name?: string,
  role?: string,
  company?: string
): Promise<{ ok: boolean; message: string }> {
  if (available === false) {
    return { ok: false, message: 'Rode o supabase_setup.sql no Supabase para ativar o cadastro.' };
  }
  if (!(await hasSession())) {
    return { ok: false, message: 'Faça login para cadastrar e-mails da empresa.' };
  }
  const clean = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
    return { ok: false, message: 'E-mail inválido.' };
  }
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('company_emails').upsert(
      {
        email: clean,
        name: name?.trim() || null,
        role: role?.trim() || null,
        company: company?.trim() || null,
        invited_by: user?.id || null,
      },
      { onConflict: 'email' }
    );
    if (error) {
      if (markUnavailable(error)) {
        return { ok: false, message: 'Rode o supabase_setup.sql no Supabase para ativar o cadastro.' };
      }
      return { ok: false, message: `Erro ao cadastrar: ${error.message.slice(0, 80)}` };
    }
    available = true;
    return { ok: true, message: 'E-mail cadastrado na equipe!' };
  } catch (err) {
    return { ok: false, message: 'Erro inesperado ao cadastrar e-mail.' };
  }
}

export async function removeCompanyEmail(email: string): Promise<{ ok: boolean; message: string }> {
  if (available === false || !(await hasSession())) {
    return { ok: false, message: 'Cadastro indisponível.' };
  }
  try {
    const { error } = await supabase.from('company_emails').delete().eq('email', email.trim().toLowerCase());
    if (error) {
      return { ok: false, message: `Erro ao remover: ${error.message.slice(0, 80)}` };
    }
    return { ok: true, message: 'E-mail removido do cadastro.' };
  } catch {
    return { ok: false, message: 'Erro inesperado ao remover e-mail.' };
  }
}
