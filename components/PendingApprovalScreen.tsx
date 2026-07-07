import React, { useState } from 'react';
import { Key, LogOut, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Props { userName?: string; }

export const PendingApprovalScreen: React.FC<Props> = ({ userName }) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!code.trim()) return;
    setLoading(true); setError('');
    const { data, error } = await supabase.rpc('use_invite_code', { p_code: code.trim().toUpperCase() });
    if (error || !data?.success) {
      setError(data?.error || error?.message || 'Código inválido.');
    } else {
      setSuccess(true);
      setTimeout(() => window.location.reload(), 1500);
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  if (success) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F0F2F5] p-4">
      <div className="w-full max-w-md rounded-[32px] border border-[#E8E9F0] bg-white p-8 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.1)] text-center text-[#1B1D21]">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500 flex items-center justify-center mb-5 mx-auto">
          <CheckCircle size={26} className="text-white" />
        </div>
        <h2 className="text-xl font-black uppercase tracking-wider mb-2">Acesso liberado!</h2>
        <p className="text-sm text-[#6B7280]">Entrando no sistema...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F0F2F5] p-4">
      <div className="w-full max-w-md rounded-[32px] border border-[#E8E9F0] bg-white p-8 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.1)] text-[#1B1D21]">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-[#1B1D21] flex items-center justify-center mb-4 mx-auto">
            <Key size={24} className="text-white" />
          </div>
          <h2 className="text-xl font-black uppercase tracking-wider mb-1">Código de acesso</h2>
          <p className="text-sm text-[#6B7280]">
            {userName ? `Olá, ${userName.split(' ')[0]}! ` : ''}
            Digite o código recebido para entrar no sistema.
          </p>
        </div>

        <input
          type="text"
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          placeholder="Ex: A3F79B2C"
          maxLength={12}
          className="w-full border-2 border-[#E5E7EB] focus:border-[#1B1D21] rounded-2xl px-4 py-4 text-center text-2xl font-mono font-black tracking-[0.35em] outline-none transition-all mb-3 uppercase"
          autoFocus
          autoComplete="off"
          spellCheck={false}
        />

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-500 rounded-2xl p-3 text-xs font-semibold mb-3">
            <AlertCircle size={14} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex flex-col gap-2.5 mt-2">
          <button
            onClick={handleSubmit}
            disabled={loading || code.length < 6}
            className="w-full bg-[#1B1D21] hover:bg-[#2D3039] text-white py-3.5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {loading ? <><Loader2 size={14} className="animate-spin" /> Verificando...</> : 'Entrar'}
          </button>
          <button
            onClick={handleLogout}
            className="w-full bg-[#F3F4F6] hover:bg-[#E5E7EB] text-[#374151] py-3.5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2"
          >
            <LogOut size={14} />
            Sair
          </button>
        </div>

        <p className="text-[10px] text-[#9CA3AF] text-center mt-4">
          Não tem código? Solicite ao administrador do sistema.
        </p>
      </div>
    </div>
  );
};
