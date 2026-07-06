import React, { useEffect, useState } from 'react';
import { X, UserCheck, UserX, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface PendingProfile {
  id: string;
  name: string;
  role: string | null;
}

interface PendingApprovalsPanelProps {
  onClose: () => void;
}

export const PendingApprovalsPanel: React.FC<PendingApprovalsPanelProps> = ({ onClose }) => {
  const [pending, setPending] = useState<PendingProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    const { data, error } = await supabase.from('profiles').select('id, name, role').eq('approved', false);
    if (error) setError(error.message);
    setPending((data as PendingProfile[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const decide = async (id: string, approve: boolean) => {
    setBusyId(id);
    setError('');
    const { error } = await supabase.rpc('set_profile_approval', { target_id: id, is_approved: approve });
    if (error) {
      setError(error.message);
    } else {
      setPending(prev => prev.filter(p => p.id !== id));
    }
    setBusyId(null);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="w-full max-w-md rounded-[32px] border border-[#E8E9F0] bg-white p-8 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.1)] relative text-[#1B1D21]">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-zinc-500 hover:text-[#1B1D21] bg-[#F3F4F6] hover:bg-[#E5E7EB] w-8 h-8 rounded-full flex items-center justify-center transition-all border border-[#E5E7EB]"
        >
          <X size={16} />
        </button>

        <h2 className="text-xl font-black uppercase tracking-wider mb-1">Aprovar acessos</h2>
        <p className="text-xs text-[#6B7280] mb-6">Usuários que fizeram login e aguardam liberação.</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-500 rounded-2xl p-3.5 text-xs font-semibold mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-10 text-[#9CA3AF]">
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : pending.length === 0 ? (
          <p className="text-sm text-[#9CA3AF] text-center py-10">Nenhum acesso pendente.</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto scroller pr-1">
            {pending.map(p => (
              <div key={p.id} className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB]">
                <div className="min-w-0">
                  <div className="text-sm font-bold truncate">{p.name}</div>
                  {p.role && <div className="text-[10px] text-[#9CA3AF] uppercase tracking-wider">{p.role}</div>}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => decide(p.id, true)}
                    disabled={busyId === p.id}
                    title="Aprovar"
                    className="w-8 h-8 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center transition-all disabled:opacity-50"
                  >
                    <UserCheck size={14} />
                  </button>
                  <button
                    onClick={() => decide(p.id, false)}
                    disabled={busyId === p.id}
                    title="Recusar"
                    className="w-8 h-8 rounded-full bg-[#F3F4F6] hover:bg-red-100 text-[#6B7280] hover:text-red-500 flex items-center justify-center transition-all disabled:opacity-50"
                  >
                    <UserX size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
