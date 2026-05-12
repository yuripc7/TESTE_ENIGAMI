import React, { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, AlertCircle, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Mode = 'login' | 'register' | 'forgot' | 'email-sent';

export const AuthGate: React.FC = () => {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const REDIRECT = 'https://yuripc7.github.io/TESTE_ENIGAMI/';

  const strength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : 3;
  const strengthLabel = ['', 'Fraca', 'Media', 'Forte'];
  const strengthColor = ['', '#ef4444', '#f59e0b', '#22c55e'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || (mode !== 'forgot' && !password)) {
      setError('Preencha todos os campos.');
      return;
    }
    if (mode === 'register' && password !== confirm) {
      setError('As senhas nao coincidem.');
      return;
    }
    if (mode === 'register' && password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (mode === 'register') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: REDIRECT }
        });
        if (error) throw error;
        setMode('email-sent');
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: REDIRECT
        });
        if (error) throw error;
        setMode('email-sent');
      }
    } catch (err: any) {
      const msg = err?.message || 'Erro ao autenticar.';
      if (msg.includes('Invalid login credentials')) setError('E-mail ou senha incorretos.');
      else if (msg.includes('Email not confirmed')) setError('Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.');
      else if (msg.includes('User already registered')) setError('Este e-mail ja esta cadastrado. Faca login.');
      else setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'email-sent') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'linear-gradient(135deg, #0f0f10 0%, #1a1a1e 100%)' }}>
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 bg-green-500/10 border border-green-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="text-green-400" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Verifique seu e-mail</h2>
          <p className="text-gray-400 text-sm leading-relaxed mb-6">
            Enviamos um link para <span className="text-white font-medium">{email}</span>.
            Clique no link para {mode === 'forgot' ? 'redefinir sua senha' : 'confirmar sua conta'} e entrar.
          </p>
          <button
            onClick={() => { setMode('login'); setEmail(''); setPassword(''); setConfirm(''); }}
            className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw size={14} /> Voltar ao login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'linear-gradient(135deg, #0f0f10 0%, #1a1a1e 100%)' }}>
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#f5f0ee] to-[#ede8e6] flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-2xl font-black text-gray-900">E</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">ENIGAMI</h1>
          <p className="text-gray-500 text-sm mt-1">
            {mode === 'login' ? 'Bem-vindo de volta' : mode === 'register' ? 'Crie sua conta' : 'Recuperar acesso'}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">

          {/* Mode tabs (login/register) */}
          {mode !== 'forgot' && (
            <div className="grid grid-cols-2 bg-black/30 rounded-xl p-1 mb-6">
              {(['login', 'register'] as const).map((m, i) => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setError(''); }}
                  className={'py-2 rounded-lg text-sm font-semibold transition-all ' + (mode === m ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300')}
                >
                  {['Entrar', 'Criar conta'][i]}
                </button>
              ))}
            </div>
          )}

          {mode === 'forgot' && (
            <div className="mb-5">
              <button onClick={() => { setMode('login'); setError(''); }} className="text-gray-500 hover:text-white text-xs flex items-center gap-1 transition-colors mb-4">
                &larr; Voltar ao login
              </button>
              <h3 className="text-white font-semibold">Recuperar senha</h3>
              <p className="text-gray-500 text-xs mt-1">Enviaremos um link para seu e-mail.</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-5">
              <AlertCircle size={15} className="text-red-400 mt-0.5 flex-shrink-0" />
              <span className="text-red-300 text-xs leading-relaxed">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="text-xs text-gray-400 font-medium mb-1.5 block uppercase tracking-wider">E-mail</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com" autoComplete="email"
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 pl-10 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-white/30 transition-all"
                />
              </div>
            </div>

            {/* Password */}
            {mode !== 'forgot' && (
              <div>
                <label className="text-xs text-gray-400 font-medium mb-1.5 block uppercase tracking-wider">Senha</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="Minimo 6 caracteres" autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 pl-10 pr-10 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-white/30 transition-all"
                  />
                  <button type="button" onClick={() => setShowPw(s => !s)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                    {showPw ? <EyeOff size={15}/> : <Eye size={15}/>}
                  </button>
                </div>
                {mode === 'register' && password.length > 0 && (
                  <div className="flex items-center gap-2 mt-2">
                    {[1,2,3].map(i => (
                      <div key={i} style={{ flex:1, height:3, borderRadius:999, background: strength >= i ? strengthColor[strength] : 'rgba(255,255,255,0.1)', transition: 'background .3s' }}/>
                    ))}
                    <span style={{ fontSize:10, color: strengthColor[strength], marginLeft:4, fontWeight:600, minWidth:28 }}>{strengthLabel[strength]}</span>
                  </div>
                )}
              </div>
            )}

            {/* Confirm password */}
            {mode === 'register' && (
              <div>
                <label className="text-xs text-gray-400 font-medium mb-1.5 block uppercase tracking-wider">Confirmar senha</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                    placeholder="Repita a senha" autoComplete="new-password"
                    className={'w-full bg-black/30 border rounded-xl px-4 py-3 pl-10 text-sm text-white placeholder:text-gray-600 focus:outline-none transition-all ' + (confirm && confirm !== password ? 'border-red-500/50 focus:border-red-500/70' : 'border-white/10 focus:border-white/30')}
                  />
                </div>
                {confirm && confirm !== password && <p className="text-red-400 text-xs mt-1">As senhas nao coincidem</p>}
              </div>
            )}

            <button
              type="submit" disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #f5f0ee, #ddd8d4)', color: '#111' }}
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  {mode === 'login' ? 'Entrar' : mode === 'register' ? 'Criar minha conta' : 'Enviar link de recuperacao'}
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Forgot link */}
          {mode === 'login' && (
            <button onClick={() => { setMode('forgot'); setError(''); }} className="mt-4 text-xs text-gray-500 hover:text-gray-300 w-full text-center transition-colors">
              Esqueci minha senha
            </button>
          )}
        </div>

        <p className="text-center text-gray-600 text-xs mt-6">
          Acesso restrito &mdash; Plataforma ENIGAMI
        </p>
      </div>
    </div>
  );
};
