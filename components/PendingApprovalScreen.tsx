import React, { useState } from 'react';
import { Clock, RefreshCw, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface PendingApprovalScreenProps {
  userName?: string;
}

export const PendingApprovalScreen: React.FC<PendingApprovalScreenProps> = ({ userName }) => {
  const [checking, setChecking] = useState(false);

  const handleCheckAgain = () => {
    setChecking(true);
    window.location.reload();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F0F2F5] p-4">
      <div className="w-full max-w-md rounded-[32px] border border-[#E8E9F0] bg-white p-8 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.1)] text-center text-[#1B1D21]">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center mb-5 mx-auto shadow-lg shadow-orange-200">
          <Clock size={26} className="text-white" />
        </div>
        <h2 className="text-xl font-black uppercase tracking-wider mb-2">Aguardando aprovação</h2>
        <p className="text-sm text-[#6B7280] mb-6">
          {userName ? `${userName}, seu` : 'Seu'} acesso ainda precisa ser aprovado por um coordenador da equipe.
          Assim que for aprovado, você entra normalmente.
        </p>
        <div className="flex flex-col gap-2.5">
          <button
            onClick={handleCheckAgain}
            disabled={checking}
            className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white py-3.5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <RefreshCw size={14} className={checking ? 'animate-spin' : ''} />
            Verificar novamente
          </button>
          <button
            onClick={handleLogout}
            className="w-full bg-[#F3F4F6] hover:bg-[#E5E7EB] text-[#374151] py-3.5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2"
          >
            <LogOut size={14} />
            Sair
          </button>
        </div>
      </div>
    </div>
  );
};
