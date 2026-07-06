import React, { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, Globe, Grid, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Mode = 'login' | 'register' | 'forgot' | 'email-sent';

export const AuthGate: React.FC = () => {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const REDIRECT = window.location.origin + '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || (mode !== 'forgot' && !password)) { setError('Preencha todos os campos.'); return; }
    if (mode === 'register' && password !== confirm) { setError('As senhas não coincidem.'); return; }
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
      else if (msg.includes('User already registered')) setError('Este e-mail já está cadastrado.');
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

  // Shared page wrapper (light)
  const PageWrapper = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen flex items-center justify-center bg-[#F0F2F5] p-6 relative overflow-hidden font-sans">
      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-60"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.9) 2px, transparent 2px),
            linear-gradient(90deg, rgba(255,255,255,0.9) 2px, transparent 2px),
            linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)
          `,
          backgroundSize: '100px 100px, 100px 100px, 20px 20px, 20px 20px'
        }}
      />
      {/* Soft blobs */}
      <div className="absolute -top-32 -right-32 w-[500px] h-[500px] bg-orange-400/8 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] bg-sky-400/6 rounded-full blur-[150px] pointer-events-none" />
      {children}
    </div>
  );

  if (mode === 'email-sent') {
    return (
      <PageWrapper>
        <div
          className="w-full max-w-[420px] rounded-[32px] bg-white border border-[#E8E9F0] p-10 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.1)] relative z-10 text-center"
        >
          <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
            <CheckCircle2 size={32} className="text-white" />
          </div>
          <h2 className="text-2xl font-black tracking-wider uppercase text-[#1B1D21] mb-3">
            Verifique seu e-mail
          </h2>
          <p className="text-[#6B7280] text-sm leading-relaxed mb-8">
            Enviamos um link de confirmação para <strong className="text-[#1B1D21] font-bold">{email}</strong>. Clique nele para continuar.
          </p>
          <button
            onClick={() => { setMode('login'); setEmail(''); setPassword(''); setConfirm(''); }}
            className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-200"
          >
            VOLTAR AO LOGIN
          </button>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div
        className="w-full max-w-[420px] rounded-[32px] bg-white border border-[#E8E9F0] p-10 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.1)] relative z-10"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-[20px] flex items-center justify-center mx-auto mb-4 shadow-md border border-orange-100" style={{ background: '#E85028' }}>
            <svg viewBox="0 0 48 38" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8">
              <path d="M24 2 L44 13 L44 25 L36 30 L36 18 L24 25 L12 18 L12 30 L4 25 L4 13 Z" stroke="white" strokeWidth="2.2" fill="none" strokeLinejoin="round"/>
              <path d="M24 2 L24 25" stroke="white" strokeWidth="2.2"/>
              <path d="M4 13 L24 2 L44 13" stroke="white" strokeWidth="2.2" fill="none"/>
              <path d="M14 17 L24 11 L34 17" stroke="white" strokeWidth="1.8" fill="none"/>
              <path d="M14 22 L24 16 L34 22" stroke="white" strokeWidth="1.5" fill="none"/>
            </svg>
          </div>
          <h1 className="text-3xl font-black font-square tracking-[0.1em] text-[#1B1D21] uppercase mb-1">
            ENIGAMI
          </h1>
          <p className="text-[10px] font-black tracking-[0.25em] uppercase" style={{ color: '#E85028' }}>
            PROJECT · COORDINATE
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* E-mail */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#9CA3AF] ml-1">E-MAIL</label>
            <div className="relative">
              <Mail size={15} className="text-[#D1D5DB] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seuemail@enigami.com.br"
                className="w-full bg-[#F9FAFB] border border-[#E5E7EB] focus:border-orange-400 focus:bg-white rounded-2xl pl-11 pr-4 py-3.5 text-sm text-[#1B1D21] outline-none placeholder:text-[#D1D5DB] transition-all font-semibold"
                required
              />
            </div>
          </div>

          {/* Senha */}
          {mode !== 'forgot' && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#9CA3AF] ml-1">SENHA</label>
              <div className="relative">
                <Lock size={15} className="text-[#D1D5DB] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  className="w-full bg-[#F9FAFB] border border-[#E5E7EB] focus:border-orange-400 focus:bg-white rounded-2xl pl-11 pr-12 py-3.5 text-sm text-[#1B1D21] outline-none placeholder:text-[#D1D5DB] transition-all font-semibold"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#D1D5DB] hover:text-[#6B7280] transition-colors"
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          )}

          {/* Confirmar Senha */}
          {mode === 'register' && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#9CA3AF] ml-1">CONFIRMAR SENHA</label>
              <div className="relative">
                <Lock size={15} className="text-[#D1D5DB] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="••••••••••"
                  className="w-full bg-[#F9FAFB] border border-[#E5E7EB] focus:border-orange-400 focus:bg-white rounded-2xl pl-11 pr-4 py-3.5 text-sm text-[#1B1D21] outline-none placeholder:text-[#D1D5DB] transition-all font-semibold"
                  required
                />
              </div>
            </div>
          )}

          {/* Lembrar e Esqueci */}
          {mode === 'login' && (
            <div className="flex items-center justify-between py-1 px-1">
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={e => setRemember(e.target.checked)}
                  className="accent-orange-500 rounded border-[#E5E7EB] w-4 h-4"
                />
                <span className="text-[10px] font-bold text-[#9CA3AF] group-hover:text-[#6B7280] transition-colors uppercase tracking-[0.05em]">LEMBRAR DE MIM</span>
              </label>
              <button
                type="button"
                onClick={handleForgot}
                className="text-[10px] font-black text-orange-500 hover:text-orange-600 transition-colors uppercase tracking-[0.05em]"
              >
                ESQUECI A SENHA
              </button>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-500 rounded-2xl p-3.5 text-xs font-semibold animate-fadeIn">
              {error}
            </div>
          )}

          {/* Entrar Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-orange-200/60 hover:shadow-orange-300/60 hover:-translate-y-0.5"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : mode === 'login' ? 'ENTRAR NO PROJETO' : mode === 'register' ? 'CRIAR ACESSO' : 'ENVIAR LINK'}
          </button>
        </form>

        {mode === 'login' && (
          <div className="space-y-4 mt-6">
            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-[#F3F4F6]" />
              <span className="text-[10px] font-black text-[#D1D5DB] tracking-wider">OU ENTRAR COM</span>
              <div className="flex-1 h-px bg-[#F3F4F6]" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleGoogle}
                type="button"
                className="flex items-center justify-center gap-2 bg-[#F9FAFB] hover:bg-[#F3F4F6] border border-[#E5E7EB] hover:border-orange-200 text-[#374151] font-black text-[10px] uppercase tracking-wider py-3.5 rounded-2xl transition-all"
              >
                <Globe size={14} className="text-orange-500" />
                GOOGLE
              </button>
              <button
                type="button"
                className="flex items-center justify-center gap-2 bg-[#F9FAFB] opacity-40 cursor-not-allowed border border-[#E5E7EB] text-[#9CA3AF] font-black text-[10px] uppercase tracking-wider py-3.5 rounded-2xl"
                disabled
              >
                <Grid size={14} />
                SSO
              </button>
            </div>
          </div>
        )}

        <div className="text-center mt-7 pt-6 border-t border-[#F3F4F6]">
          {mode === 'login' ? (
            <p className="text-xs text-[#9CA3AF]">
              Novo por aqui?{' '}
              <button
                type="button"
                onClick={() => { setMode('register'); setError(''); }}
                className="font-bold text-orange-500 hover:text-orange-600 transition-colors"
              >
                Solicitar acesso
              </button>
            </p>
          ) : (
            <button
              type="button"
              onClick={() => { setMode('login'); setError(''); }}
              className="text-xs font-bold text-orange-500 hover:text-orange-600 transition-colors"
            >
              Voltar ao login
            </button>
          )}
        </div>
      </div>
    </PageWrapper>
  );
};
