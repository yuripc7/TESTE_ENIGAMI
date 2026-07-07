import React, { useEffect, useState, useCallback } from 'react';
import { X, UserCheck, UserX, Loader2, Building2, Mail, Trash2, Plus, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';

type AdminTab = 'users' | 'companies' | 'invites';
type UserFilter = 'all' | 'pending' | 'approved';

interface Profile {
  id: string;
  name: string;
  role: string | null;
  approved: boolean;
  company_id?: string | null;
}
interface Company { id: string; name: string; }
interface Invite {
  id: string; email: string; company_id: string; created_at: string;
  companies?: { name: string } | null;
}
interface Props { onClose: () => void; }

export const PendingApprovalsPanel: React.FC<Props> = ({ onClose }) => {
  const [tab, setTab] = useState<AdminTab>('users');
  const [userFilter, setUserFilter] = useState<UserFilter>('pending');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteCompanyId, setInviteCompanyId] = useState('');
  const [error, setError] = useState('');

  const loadProfiles = useCallback(async () => {
    setLoadingUsers(true); setError('');
    const { data, error } = await supabase
      .from('profiles').select('id, name, role, approved, company_id')
      .order('approved', { ascending: true });
    if (error) setError(error.message);
    setProfiles((data as Profile[]) || []);
    setLoadingUsers(false);
  }, []);

  const loadCompanies = useCallback(async () => {
    setLoadingCompanies(true);
    const { data, error } = await supabase.from('companies').select('*').order('name');
    if (!error) setCompanies((data as Company[]) || []); else setCompanies([]);
    setLoadingCompanies(false);
  }, []);

  const loadInvites = useCallback(async () => {
    setLoadingInvites(true);
    const { data, error } = await supabase
      .from('invites').select('*, companies(name)').order('created_at', { ascending: false });
    if (!error) setInvites((data as Invite[]) || []); else setInvites([]);
    setLoadingInvites(false);
  }, []);

  useEffect(() => { loadProfiles(); }, [loadProfiles]);

  const switchTab = (t: AdminTab) => {
    setTab(t); setError('');
    if (t === 'users') loadProfiles();
    if (t === 'companies') loadCompanies();
    if (t === 'invites') { loadCompanies(); loadInvites(); }
  };

  const decide = async (id: string, approve: boolean) => {
    setBusyId(id);
    const { error } = await supabase.rpc('set_profile_approval', { target_id: id, is_approved: approve });
    if (error) setError(error.message);
    else setProfiles(prev => prev.map(p => p.id === id ? { ...p, approved: approve } : p));
    setBusyId(null);
  };

  const createCompany = async () => {
    if (!newCompanyName.trim()) return;
    const { error } = await supabase.from('companies').insert({ name: newCompanyName.trim() });
    if (error) setError(error.message); else { setNewCompanyName(''); loadCompanies(); }
  };

  const deleteCompany = async (id: string) => {
    if (!window.confirm('Deletar empresa?')) return;
    const { error } = await supabase.from('companies').delete().eq('id', id);
    if (error) setError(error.message); else loadCompanies();
  };

  const createInvite = async () => {
    if (!inviteEmail.trim() || !inviteCompanyId) { setError('Preencha e-mail e empresa.'); return; }
    const { error } = await supabase.from('invites').insert({
      email: inviteEmail.trim().toLowerCase(), company_id: inviteCompanyId
    });
    if (error) setError(error.message.includes('unique') ? 'E-mail ja convidado.' : error.message);
    else { setInviteEmail(''); setInviteCompanyId(''); loadInvites(); }
  };

  const deleteInvite = async (id: string) => {
    const { error } = await supabase.from('invites').delete().eq('id', id);
    if (error) setError(error.message); else loadInvites();
  };

  const filtered = userFilter === 'all' ? profiles
    : userFilter === 'pending' ? profiles.filter(p => !p.approved)
    : profiles.filter(p => p.approved);
  const pendingCount = profiles.filter(p => !p.approved).length;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="w-full max-w-xl rounded-[24px] border border-[#E8E9F0] bg-white shadow-[0_20px_60px_-10px_rgba(0,0,0,0.15)] relative text-[#1B1D21] flex flex-col" style={{maxHeight:'90vh'}}>

        <div className="flex items-center justify-between px-7 pt-6 pb-4 border-b border-[#F0F1F5]">
          <div>
            <h2 className="text-base font-black uppercase tracking-wider">Controle de Acesso</h2>
            <p className="text-[11px] text-[#9CA3AF] mt-0.5">Usuarios, empresas e convites</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-[#1B1D21] bg-[#F3F4F6] hover:bg-[#E5E7EB] w-8 h-8 rounded-full flex items-center justify-center transition-all">
            <X size={15} />
          </button>
        </div>

        <div className="flex gap-1 px-6 pt-3 pb-1">
          {(['users', 'companies', 'invites'] as AdminTab[]).map(t => (
            <button key={t} onClick={() => switchTab(t)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${tab === t ? 'bg-[#1B1D21] text-white' : 'text-[#6B7280] hover:bg-[#F3F4F6]'}`}>
              {t === 'users' ? 'Usuarios' : t === 'companies' ? 'Empresas' : 'Convites'}
              {t === 'users' && pendingCount > 0 && (
                <span className="bg-amber-400 text-amber-900 text-[9px] font-black px-1.5 py-0.5 rounded-full">{pendingCount}</span>
              )}
            </button>
          ))}
        </div>

        {error && (
          <div className="mx-6 mt-2 bg-red-50 border border-red-200 text-red-500 rounded-xl p-2.5 text-xs font-semibold flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError('')} className="ml-2 text-red-400 hover:text-red-600"><X size={12} /></button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-4" style={{ minHeight: 0 }}>

          {tab === 'users' && (
            <div>
              <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                {(['all', 'pending', 'approved'] as UserFilter[]).map(f => (
                  <button key={f} onClick={() => setUserFilter(f)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${userFilter === f ? 'bg-[#1B1D21] text-white' : 'bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]'}`}>
                    {f === 'all' ? `Todos (${profiles.length})` : f === 'pending' ? `Pendentes (${pendingCount})` : `Aprovados (${profiles.length - pendingCount})`}
                  </button>
                ))}
                <button onClick={loadProfiles} className="ml-auto text-[#9CA3AF] hover:text-[#6B7280] p-1 rounded-full hover:bg-[#F3F4F6]" title="Atualizar">
                  <RefreshCw size={13} className={loadingUsers ? 'animate-spin' : ''} />
                </button>
              </div>
              {loadingUsers ? (
                <div className="flex justify-center py-8"><Loader2 size={18} className="animate-spin text-[#9CA3AF]" /></div>
              ) : filtered.length === 0 ? (
                <p className="text-center text-[#9CA3AF] text-sm py-8">Nenhum usuario.</p>
              ) : (
                <div className="space-y-2">
                  {filtered.map(p => (
                    <div key={p.id} className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-[#F0F1F5] bg-[#FAFAFA]">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold truncate">{p.name || 'Sem nome'}</div>
                        {p.role && <div className="text-[10px] text-[#9CA3AF] uppercase tracking-wider mt-0.5">{p.role}</div>}
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.approved ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {p.approved ? 'Aprovado' : 'Pendente'}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {!p.approved ? (
                          <button onClick={() => decide(p.id, true)} disabled={busyId === p.id} title="Aprovar"
                            className="w-8 h-8 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center transition-all disabled:opacity-50">
                            {busyId === p.id ? <Loader2 size={12} className="animate-spin" /> : <UserCheck size={13} />}
                          </button>
                        ) : (
                          <button onClick={() => decide(p.id, false)} disabled={busyId === p.id} title="Revogar"
                            className="w-8 h-8 rounded-full bg-[#FEF2F2] hover:bg-red-100 text-red-400 hover:text-red-600 flex items-center justify-center transition-all disabled:opacity-50">
                            {busyId === p.id ? <Loader2 size={12} className="animate-spin" /> : <UserX size={13} />}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'companies' && (
            <div>
              <div className="flex gap-2 mb-4">
                <input value={newCompanyName} onChange={e => setNewCompanyName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && createCompany()}
                  placeholder="Nome da empresa..." className="flex-1 text-sm border border-[#E5E7EB] rounded-xl px-3 py-2 outline-none focus:border-[#1B1D21] bg-white" />
                <button onClick={createCompany} className="flex items-center gap-1 px-4 py-2 rounded-xl bg-[#1B1D21] text-white text-xs font-bold hover:bg-[#2D3039] transition-all">
                  <Plus size={13} /> Criar
                </button>
              </div>
              {loadingCompanies ? (
                <div className="flex justify-center py-8"><Loader2 size={18} className="animate-spin text-[#9CA3AF]" /></div>
              ) : companies.length === 0 ? (
                <p className="text-center text-[#9CA3AF] text-sm py-8">Nenhuma empresa. Execute o SQL de setup primeiro.</p>
              ) : (
                <div className="space-y-2">
                  {companies.map(c => (
                    <div key={c.id} className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-[#F0F1F5] bg-[#FAFAFA]">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-[#F3F4F6] flex items-center justify-center shrink-0">
                          <Building2 size={14} className="text-[#9CA3AF]" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-bold">{c.name}</div>
                          <div className="text-[10px] text-[#9CA3AF] font-mono truncate">{c.id}</div>
                        </div>
                      </div>
                      <button onClick={() => deleteCompany(c.id)} className="w-7 h-7 rounded-full hover:bg-red-50 text-[#D1D5DB] hover:text-red-400 flex items-center justify-center transition-all">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'invites' && (
            <div>
              <div className="flex flex-col gap-2 mb-4">
                <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                  placeholder="email@exemplo.com" type="email"
                  className="text-sm border border-[#E5E7EB] rounded-xl px-3 py-2 outline-none focus:border-[#1B1D21] bg-white" />
                <div className="flex gap-2">
                  <select value={inviteCompanyId} onChange={e => setInviteCompanyId(e.target.value)}
                    className="flex-1 text-sm border border-[#E5E7EB] rounded-xl px-3 py-2 outline-none focus:border-[#1B1D21] bg-white text-[#6B7280]">
                    <option value="">Selecionar empresa...</option>
                    {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <button onClick={createInvite} className="flex items-center gap-1 px-4 py-2 rounded-xl bg-[#1B1D21] text-white text-xs font-bold hover:bg-[#2D3039] transition-all">
                    <Mail size={13} /> Convidar
                  </button>
                </div>
              </div>
              {loadingInvites ? (
                <div className="flex justify-center py-8"><Loader2 size={18} className="animate-spin text-[#9CA3AF]" /></div>
              ) : invites.length === 0 ? (
                <p className="text-center text-[#9CA3AF] text-sm py-8">Nenhum convite ativo.</p>
              ) : (
                <div className="space-y-2">
                  {invites.map(inv => (
                    <div key={inv.id} className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-[#F0F1F5] bg-[#FAFAFA]">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-[#F3F4F6] flex items-center justify-center shrink-0">
                          <Mail size={14} className="text-[#9CA3AF]" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-bold truncate">{inv.email}</div>
                          <div className="text-[10px] text-[#9CA3AF]">{inv.companies?.name || 'Sem empresa'}</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 shrink-0">Pendente</span>
                      <button onClick={() => deleteInvite(inv.id)} className="w-7 h-7 rounded-full hover:bg-red-50 text-[#D1D5DB] hover:text-red-400 flex items-center justify-center transition-all">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
