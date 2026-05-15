import React, { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, Globe, Grid, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Mode = 'login' | 'register' | 'forgot' | 'email-sent';

const neu = {
  page: {
    minHeight: '100vh' as const,
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    background: '#ede8e3',
    padding: '24px',
  },
  card: {
    background: '#ede8e3',
    borderRadius: '24px',
    boxShadow: '14px 14px 28px #c9c4bf, -14px -14px 28px #ffffff',
    padding: '40px 36px',
    maxWidth: '380px',
    width: '100%',
  },
  input: {
    background: '#ede8e3',
    border: 'none',
    borderRadius: '14px',
    boxShadow: 'inset 4px 4px 8px #c9c4bf, inset -4px -4px 8px #ffffff',
    padding: '14px 16px 14px 44px',
    outline: 'none',
    width: '100%',
    fontSize: '14px',
    color: '#333',
    boxSizing: 'border-box' as const,
  },
  btnPrimary: {
    background: 'linear-gradient(135deg, #e8826a, #d96b52)',
    color: 'white',
    border: 'none',
    borderRadius: '14px',
    padding: '15px',
    width: '100%',
    fontSize: '13px',
    fontWeight: '700' as const,
    letterSpacing: '1.5px',
    cursor: 'pointer',
    boxShadow: '4px 4px 10px #c9c4bf, -2px -2px 6px #ffffff',
  },
  btnSecondary: {
    background: '#ede8e3',
    border: 'none',
    borderRadius: '14px',
    padding: '13px',
    fontSize: '13px',
    fontWeight: '700' as const,
    cursor: 'pointer',
    boxShadow: '4px 4px 8px #c9c4bf, -4px -4px 8px #ffffff',
    color: '#666',
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: '8px',
    flex: 1,
    letterSpacing: '1px',
  },
};

export const AuthGate: React.FC = () => {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const REDIRECT = 'https://teste-enigami.vercel.app/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || (mode !== 'forgot' && !password)) { setError('Preencha todos os campos.'); return; }
    if (mode === 'register' && password !== confirm) { setError('As senhas nao coincidem.'); return; }
    setLoading(true);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (mode === 'register') {
        const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: REDIRECT } });
        if (error) throw error;
        setMode('email-sent');
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: REDIRECT });
        if (error) throw error;
        setMode('email-sent');
      }
    } catch (err: any) {
      const msg = err?.message || 'Erro ao autenticar.';
      if (msg.includes('Invalid login credentials')) setError('E-mail ou senha incorretos.');
      else if (msg.includes('Email not confirmed')) setError('Confirme seu e-mail antes de entrar.');
      else if (msg.includes('User already registered')) setError('Este e-mail ja esta cadastrado.');
      else setError(msg);
    } finally { setLoading(false); }
  };

  const handleForgot = async () => {
    if (!email) { setError('Digite seu e-mail primeiro.'); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: REDIRECT });
      if (error) throw error;
      setMode('email-sent');
    } catch (err: any) {
      setError(err?.message || 'Erro ao enviar e-mail.');
    } finally { setLoading(false); }
  };

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: REDIRECT } });
  };

  if (mode === 'email-sent') {
    return (
      <div style={neu.page}>
        <div style={{ ...neu.card, textAlign: 'center' }}>
          <div style={{ width: '64px', height: '64px', background: 'linear-gradient(135deg, #e8826a, #d96b52)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '4px 4px 10px #c9c4bf' }}>
            <CheckCircle2 size={32} color="white" />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#1a1a1a', marginBottom: '8px' }}>Verifique seu e-mail</h2>
          <p style={{ color: '#888', fontSize: '14px', lineHeight: '1.6', marginBottom: '28px' }}>
            Enviamos um link para <strong style={{ color: '#333' }}>{email}</strong>. Clique nele para continuar.
          </p>
          <button style={neu.btnPrimary} onClick={() => { setMode('login'); setEmail(''); setPassword(''); setConfirm(''); }}>
            VOLTAR AO LOGIN
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={neu.page}>
      <div style={neu.card}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ width: '60px', height: '60px', background: 'linear-gradient(135deg, #e8826a, #d96b52)', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', boxShadow: '4px 4px 12px #c9c4bf, -2px -2px 6px #ffffff' }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <path d="M9 9v6M12 4v16M15 9v6M6 11v2M18 11v2" />
            </svg>
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: '900', color: '#1a1a1a', letterSpacing: '3px', margin: '0 0 4px' }}>ENIGAMI</h1>
          <p style={{ fontSize: '11px', fontWeight: '700', color: '#e8826a', letterSpacing: '3px', margin: 0 }}>PROJECT · COORDINATE</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '18px' }}>
            <label style={{ fontSize: '11px', fontWeight: '700', color: '#aaa', letterSpacing: '1.5px', display: 'block', marginBottom: '8px' }}>E-MAIL</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} color="#bbb" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="yuri@enigami.com.br" style={neu.input} />
            </div>
          </div>
          {mode !== 'forgot' && (
            <div style={{ marginBottom: '18px' }}>
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#aaa', letterSpacing: '1.5px', display: 'block', marginBottom: '8px' }}>SENHA</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} color="#bbb" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••••" style={{ ...neu.input, paddingRight: '44px' }} />
                <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  {showPw ? <EyeOff size={16} color="#bbb" /> : <Eye size={16} color="#bbb" />}
                </button>
              </div>
            </div>
          )}
          {mode === 'register' && (
            <div style={{ marginBottom: '18px' }}>
              <label style={{ fontSize: '11px', fontWeight: '700', color: '#aaa', letterSpacing: '1.5px', display: 'block', marginBottom: '8px' }}>CONFIRMAR SENHA</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} color="#bbb" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input type={showPw ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="••••••••••" style={neu.input} />
              </div>
            </div>
          )}
          {mode === 'login' && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} style={{ accentColor: '#e8826a', width: '14px', height: '14px' }} />
                <span style={{ fontSize: '11px', color: '#aaa', fontWeight: '700', letterSpacing: '0.5px' }}>LEMBRAR DE MIM</span>
              </label>
              <button type="button" onClick={handleForgot} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: '800', color: '#e8826a', letterSpacing: '0.5px' }}>
                ESQUECI A SENHA
              </button>
            </div>
          )}
          {error && (
            <div style={{ background: '#fee2e2', color: '#dc2626', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', marginBottom: '16px' }}>
              {error}
            </div>
          )}
          <button type="submit" style={neu.btnPrimary} disabled={loading}>
            {loading ? <Loader2 size={18} /> : mode === 'login' ? 'ENTRAR NO PROJETO' : mode === 'register' ? 'CRIAR ACESSO' : 'ENVIAR LINK'}
          </button>
        </form>
        {mode === 'login' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '22px 0' }}>
              <div style={{ flex: 1, height: '1px', background: '#d5cfc9' }} />
              <span style={{ fontSize: '12px', color: '#bbb', fontWeight: '700' }}>OU</span>
              <div style={{ flex: 1, height: '1px', background: '#d5cfc9' }} />
            </div>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '22px' }}>
              <button style={neu.btnSecondary} onClick={handleGoogle} type="button">
                <Globe size={16} color="#e8826a" />
                GOOGLE
              </button>
              <button style={neu.btnSecondary} type="button">
                <Grid size={16} color="#999" />
                SSO
              </button>
            </div>
          </>
        )}
        <div style={{ textAlign: 'center' }}>
          {mode === 'login' ? (
            <>
              <span style={{ fontSize: '13px', color: '#aaa' }}>Novo por aqui? </span>
              <button type="button" onClick={() => { setMode('register'); setError(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '700', color: '#e8826a' }}>Solicitar acesso</button>
            </>
          ) : (
            <button type="button" onClick={() => { setMode('login'); setError(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '700', color: '#e8826a' }}>Voltar ao login</button>
          )}
        </div>
      </div>
    </div>
  );
};
