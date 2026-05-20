import React, { useState, useRef } from 'react';
import { Camera, Check, Loader2, Sparkles, User, Briefcase, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ProfileCompletionModalProps {
  isOpen: boolean;
  userId: string;
  currentEmail?: string;
  onSubmit: (profile: { name: string; role: string; avatarUrl: string }) => void;
}

const ROLES = [
  { id: 'ARQ', label: 'Arquiteto(a)', prefix: 'Arq.' },
  { id: 'ENG', label: 'Engenheiro(a)', prefix: 'Eng.' },
  { id: 'COORD', label: 'Coordenador(a)', prefix: 'Coord.' },
  { id: 'DIR', label: 'Diretor(a)', prefix: 'Dir.' },
  { id: 'GER', label: 'Gerente', prefix: 'Ger.' },
  { id: 'DESIGN', label: 'Designer', prefix: 'Dsgn.' },
  { id: 'COLLAB', label: 'Colaborador(a)', prefix: '' },
];

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=256&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=256&q=80',
];

const ROLE_SYMBOLS = [
  {
    name: 'Arquitetura',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#4f46e5" />
          <stop offset="100%" stop-color="#06b6d4" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="50" fill="url(#grad1)"/>
      <path d="M50 25 L75 55 H60 V75 H40 V55 H25 Z" fill="white" stroke="white" stroke-width="2" stroke-linejoin="round" opacity="0.9"/>
      <circle cx="50" cy="40" r="4" fill="#4f46e5"/>
    </svg>`
  },
  {
    name: 'Engenharia',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#f59e0b" />
          <stop offset="100%" stop-color="#ef4444" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="50" fill="url(#grad2)"/>
      <path d="M50 22 C37 22 28 30 28 42 C28 44 32 46 35 46 C38 46 41 42 50 42 C59 42 62 46 65 46 C68 46 72 44 72 42 C72 30 63 22 50 22 Z" fill="white" opacity="0.9"/>
      <rect x="47" y="42" width="6" height="30" fill="white" opacity="0.9"/>
      <rect x="35" y="52" width="30" height="4" fill="white" opacity="0.9"/>
    </svg>`
  },
  {
    name: 'Design',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad3" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ec4899" />
          <stop offset="100%" stop-color="#8b5cf6" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="50" fill="url(#grad3)"/>
      <path d="M35 55 C35 45 45 35 55 35 C65 35 70 42 70 50 C70 62 55 70 45 70 C40 70 35 65 35 55 Z" fill="white" opacity="0.9"/>
      <circle cx="43" cy="47" r="3" fill="#ec4899"/>
      <circle cx="53" cy="43" r="3" fill="#8b5cf6"/>
      <circle cx="61" cy="51" r="3" fill="#f59e0b"/>
      <circle cx="51" cy="59" r="3" fill="#10b981"/>
    </svg>`
  },
  {
    name: 'Coordenação',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad4" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#10b981" />
          <stop offset="100%" stop-color="#059669" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="50" fill="url(#grad4)"/>
      <circle cx="35" cy="40" r="8" fill="white" opacity="0.9"/>
      <circle cx="65" cy="40" r="8" fill="white" opacity="0.8"/>
      <circle cx="50" cy="65" r="10" fill="white"/>
      <path d="M22 62 C22 55 28 50 35 50 C38 50 41 51 43 53 C39 57 37 62 37 68 H22 Z" fill="white" opacity="0.8"/>
      <path d="M78 62 C78 55 72 50 65 50 C62 50 59 51 57 53 C61 57 63 62 63 68 H78 Z" fill="white" opacity="0.8"/>
      <path d="M50 78 C40 78 35 83 35 88 H65 C65 83 60 78 50 78 Z" fill="white"/>
    </svg>`
  },
  {
    name: 'Gestão',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad5" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#3b82f6" />
          <stop offset="100%" stop-color="#1d4ed8" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="50" fill="url(#grad5)"/>
      <rect x="30" y="38" width="40" height="32" rx="4" fill="white" opacity="0.9"/>
      <path d="M42 38 V32 C42 29 45 27 48 27 H52 C55 27 58 29 58 32 V38" fill="none" stroke="white" stroke-width="4" opacity="0.9"/>
      <circle cx="50" cy="54" r="4" fill="#3b82f6"/>
    </svg>`
  },
  {
    name: 'Geral',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad6" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#6b7280" />
          <stop offset="100%" stop-color="#374151" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="50" fill="url(#grad6)"/>
      <circle cx="50" cy="40" r="14" fill="white" opacity="0.95"/>
      <path d="M50 60 C35 60 25 68 25 78 H75 C75 68 65 60 50 60 Z" fill="white" opacity="0.95"/>
    </svg>`
  }
];

const getSymbolForRole = (roleId: string) => {
  let sym = ROLE_SYMBOLS[5]; // Geral
  if (roleId === 'ARQ') sym = ROLE_SYMBOLS[0];
  else if (roleId === 'ENG') sym = ROLE_SYMBOLS[1];
  else if (roleId === 'DESIGN') sym = ROLE_SYMBOLS[2];
  else if (roleId === 'COORD') sym = ROLE_SYMBOLS[3];
  else if (roleId === 'GER' || roleId === 'DIR') sym = ROLE_SYMBOLS[4];
  return `data:image/svg+xml;utf8,${encodeURIComponent(sym.svg)}`;
};

export const ProfileCompletionModal: React.FC<ProfileCompletionModalProps> = ({
  isOpen,
  userId,
  currentEmail,
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [selectedRole, setSelectedRole] = useState(ROLES[0]);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarType, setAvatarType] = useState<'symbols' | 'photos'>('symbols');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');

    try {
      const ext = file.name.split('.').pop();
      const path = `${userId}/avatar_${Date.now()}.${ext}`;

      // Upload file to avatars bucket
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
      if (upErr) throw upErr;

      // Get public URL
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      const url = `${data.publicUrl}?t=${Date.now()}`;
      setAvatarUrl(url);
    } catch (err: any) {
      console.error('Erro ao fazer upload do avatar:', err);
      setError('Não foi possível enviar a imagem. Use uma das opções prontas abaixo.');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Por favor, informe seu nome.');
      return;
    }

    setSaving(true);
    setError('');

    // Formatar nome com o prefixo do cargo/função
    const prefix = selectedRole.prefix ? `${selectedRole.prefix} ` : '';
    const formattedName = `${prefix}${name.trim()}`;
    const finalAvatar = avatarUrl || getSymbolForRole(selectedRole.id);

    try {
      // 1. Executar atualizações no Supabase de forma assíncrona (não-bloqueante)
      if (userId && userId !== 'demo_user') {
        supabase.auth.updateUser({
          data: {
            name: formattedName,
            role: selectedRole.label,
            avatar_url: finalAvatar,
            profile_completed: true,
          },
        }).then(({ error: authErr }) => {
          if (authErr) console.warn('Erro em background ao atualizar metadados do Supabase Auth:', authErr);
        }).catch(err => {
          console.warn('Erro em background ao atualizar Auth:', err);
        });

        supabase.from('profiles').upsert({
          id: userId,
          name: formattedName,
          avatar_url: finalAvatar,
          updated_at: new Date().toISOString(),
        }).then(({ error: dbErr }) => {
          if (dbErr) console.warn('Erro em background ao atualizar tabela de profiles:', dbErr);
        }).catch(err => {
          console.warn('Erro em background ao salvar profile na DB:', err);
        });
      }

      // 2. Chamar o callback imediatamente para destravar a UI e entrar no app
      onSubmit({
        name: formattedName,
        role: selectedRole.label,
        avatarUrl: finalAvatar,
      });
    } catch (err: any) {
      console.error('Erro ao salvar perfil:', err);
      setError(err?.message || 'Erro ao salvar o perfil. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fadeIn">
      <div 
        className="w-full max-w-lg rounded-[32px] border border-zinc-800 bg-[#0f1115] p-8 shadow-2xl relative overflow-hidden animate-scaleIn text-white"
        style={{
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        }}
      >
        {/* Glow Effects */}
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-orange-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="flex flex-col items-center text-center mb-6 relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center mb-4 shadow-glow">
            <Sparkles size={22} className="text-white animate-pulse" />
          </div>
          <h2 className="text-2xl font-black font-square tracking-wider uppercase bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
            Bem-vindo ao Enigami!
          </h2>
          <p className="text-xs text-zinc-400 max-w-xs mt-1">
            Complete seu cadastro para se integrar à equipe e começar a colaborar no projeto.
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-6 relative z-10">
          {/* Avatar Upload / Selection */}
          <div className="flex flex-col items-center gap-3">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
              FOTO DE PERFIL
            </label>
            <div className="flex items-center gap-6">
              <div 
                className="relative w-20 h-20 rounded-full border-2 border-zinc-800 bg-zinc-900 flex items-center justify-center overflow-hidden group cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center justify-center text-zinc-500 group-hover:text-white transition-colors">
                    <Camera size={24} />
                    <span className="text-[9px] mt-1 font-bold">Enviar</span>
                  </div>
                )}
                {uploading && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <Loader2 size={18} className="animate-spin text-orange-500" />
                  </div>
                )}
              </div>

              {/* Preset Avatars Grid */}
              <div className="flex flex-col gap-2 flex-1">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[9px] font-bold text-zinc-500 uppercase">Sugestões:</span>
                  <div className="flex bg-zinc-950 rounded-lg p-0.5 border border-zinc-800">
                    <button
                      type="button"
                      onClick={() => setAvatarType('symbols')}
                      className={`px-2 py-0.5 text-[8px] font-black uppercase rounded-md transition-all ${
                        avatarType === 'symbols' ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white' : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      Símbolos
                    </button>
                    <button
                      type="button"
                      onClick={() => setAvatarType('photos')}
                      className={`px-2 py-0.5 text-[8px] font-black uppercase rounded-md transition-all ${
                        avatarType === 'photos' ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white' : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      Fotos
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-6 gap-2">
                  {avatarType === 'photos' ? (
                    PRESET_AVATARS.map((url, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setAvatarUrl(url)}
                        className={`w-8 h-8 rounded-full overflow-hidden border-2 transition-all hover:scale-105 active:scale-95 ${
                          avatarUrl === url ? 'border-orange-500 scale-105' : 'border-transparent opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img src={url} alt="preset" className="w-full h-full object-cover" />
                      </button>
                    ))
                  ) : (
                    ROLE_SYMBOLS.map((sym, idx) => {
                      const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(sym.svg)}`;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setAvatarUrl(dataUrl)}
                          className={`w-8 h-8 rounded-full overflow-hidden border-2 transition-all hover:scale-105 active:scale-95 ${
                            avatarUrl === dataUrl ? 'border-orange-500 scale-105' : 'border-transparent opacity-60 hover:opacity-100'
                          }`}
                          title={sym.name}
                        >
                          <img src={dataUrl} alt={sym.name} className="w-full h-full object-cover" />
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
            <input 
              ref={fileInputRef} 
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={handleFileUpload} 
            />
          </div>

          {/* Nome Input */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-1.5 ml-1">
              <User size={12} className="text-zinc-500" /> NOME COMPLETO
            </label>
            <div className="relative">
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ex: Yuri Tonolher"
                className="w-full bg-[#16181d] border border-zinc-800 focus:border-orange-500 rounded-2xl px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600 transition-all font-semibold"
                required
              />
            </div>
          </div>

          {/* Função / Cargo Selection */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-1.5 ml-1">
              <Briefcase size={12} className="text-zinc-500" /> SUA FUNÇÃO / CARGO
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1 scroller">
              {ROLES.map(role => {
                const isSelected = selectedRole.id === role.id;
                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => setSelectedRole(role)}
                    className={`flex items-center justify-between p-3 rounded-2xl border text-left text-xs uppercase tracking-wider font-black transition-all ${
                      isSelected
                        ? 'bg-gradient-to-r from-orange-500 to-red-500 border-transparent text-white shadow-glow scale-[1.02]'
                        : 'bg-[#16181d] border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white'
                    }`}
                  >
                    <span>{role.label}</span>
                    {isSelected ? <Check size={14} /> : <ChevronRight size={14} className="opacity-40" />}
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-2xl p-3.5 text-xs font-semibold animate-fadeIn">
              {error}
            </div>
          )}

          {/* Action Button */}
          <button
            type="submit"
            disabled={saving || uploading}
            className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all hover:shadow-glow flex items-center justify-center gap-2 disabled:opacity-50 active:scale-98"
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                SALVANDO PERFIL...
              </>
            ) : (
              <>
                CONCLUIR E ENTRAR NA EQUIPE
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
