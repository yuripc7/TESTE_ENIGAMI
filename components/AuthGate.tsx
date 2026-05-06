import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

export const AuthGate: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [done, setDone]         = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError('Preencha todos os campos.'); return; }
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setDone(true);
      }
    } catch (e: any) {
      setError(e.message || 'Erro ao autenticar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f5f0ee 0%, #ede8e6 100%)' }}>
      <div className="w-full max-w-sm mx-4 rounded-[28px] p-8" style={{ background: '#f0ebe8', boxShadow: '12px 12px 28px #d4cfcd, -12px -12px 28px #ffffff' }}>
        <div className="flex flex-col items-center mb-7">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f4846a 0%, #e8604a 100%)', boxShadow: '0 4px 12px rgba(232,96,74,0.35)' }}>
              <span className="material-symbols-outlined text-white text-lg">graphic_eq</span>
            </div>
            <span className="text-2xl font-black tracking-widest text-gray-800 uppercase">ENIGAMI</span>
          </div>
          <span className="text-[10px] font-bold tracking-[0.25em] uppercase" style={{ color: '#e8604a' }}>Project · Coordinate</span>
        </div>
        {done ? (
          <div className="text-center py-4">
            <div className="text-4xl mb-4">✅</div>
            <p className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-2">Cadastro enviado</p>
            <p className="text-xs text-gray-400 mb-6 leading-relaxed">Verifique seu e-mail para confirmar a conta e depois faça login.</p>
            <button onClick={() => { setDone(false); setMode('login'); setEmail(''); setPassword(''); }} className="w-full py-3 rounded-2xl text-white text-[11px] font-black uppercase tracking-widest" style={{ background: 'linear-gradient(135deg, #f4846a, #e8604a)' }}>Ir para login</button>
          </div>
        ) : (
          <>
            <div className="flex mb-6 p-1 rounded-2xl" style={{ background: '#ece7e4', boxShadow: 'inset 2px 2px 6px #d4cfcd, inset -2px -2px 6px #ffffff' }}>
              {(['login', 'register'] as const).map(m => (
                <button key={m} onClick={() => { setMode(m); setError(''); }} className="flex-1 py-2 text-[9px] font-black uppercase tracking-[0.2em] transition-all rounded-xl" style={mode === m ? { background: '#f0ebe8', color: '#e8604a', boxShadow: '3px 3px 8px #d4cfcd, -3px -3px 8px #ffffff' } : { color: '#aaa' }}>
                  {m === 'login' ? 'Entrar' : 'Cadastrar'}
                </button>
              ))}
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1 block mb-1">E-mail</label>
                <div className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ background: '#ece7e4', boxShadow: 'inset 4px 4px 8px #d4cfcd, inset -4px -4px 8px #ffffff' }}>
                  <span className="material-symbols-outlined text-gray-400 text-[18px]">mail</span>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="yuri@enigami.com.br" autoFocus className="flex-1 bg-transparent text-sm text-gray-600 outline-none placeholder:text-gray-400" />
                </div>
              </div>
              <div>
                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1 block mb-1">Senha</label>
                <div className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ background: '#ece7e4', boxShadow: 'inset 4px 4px 8px #d4cfcd, inset -4px -4px 8px #ffffff' }}>
                  <span className="material-symbols-outlined text-gray-400 text-[18px]">lock</span>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••••" className="flex-1 bg-transparent text-sm text-gray-600 outline-none placeholder:text-gray-400" />
                </div>
              </div>
              {error && <div className="rounded-2xl px-4 py-3 text-xs font-bold" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>{error}</div>}
              <button type="submit" disabled={loading} className="w-full py-3.5 rounded-2xl text-white text-[11px] font-black uppercase tracking-widest" style={{ background: loading ? '#ccc' : 'linear-gradient(135deg, #f4846a, #e8604a)', boxShadow: loading ? 'none' : '0 8px 20px rgba(232,96,74,0.35)', cursor: loading ? 'default' : 'pointer' }}>
                {loading ? '...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};