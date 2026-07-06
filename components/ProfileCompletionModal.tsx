import React, { useState, useEffect } from 'react';
import { Check, Loader2, Sparkles, User, Briefcase, ChevronRight, Clock, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useApp } from '../contexts/AppContext';
import { encodeAvatarUrl, decodeAvatarUrl } from '../utils/avatarHelper';

interface ProfileCompletionModalProps {
  isOpen: boolean;
  userId: string;
  currentEmail?: string;
  onSubmit: (profile: { name: string; role: string; avatarUrl: string; companyTime?: string }) => void;
  onClose?: () => void;
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

const ROLE_SYMBOLS = [
  {
    name: 'Subir',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad-blue" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#3b82f6" />
          <stop offset="100%" stop-color="#1d4ed8" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="50" fill="url(#grad-blue)"/>
      <path d="M50 25 L75 50 H60 V75 H40 V50 H25 Z" fill="white" stroke="white" stroke-width="2" stroke-linejoin="round" opacity="0.95"/>
    </svg>`
  },
  {
    name: 'Mushroom',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad-orange" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#f59e0b" />
          <stop offset="100%" stop-color="#d97706" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="50" fill="url(#grad-orange)"/>
      <path d="M50 25 C35 25 30 35 30 45 C30 50 35 52 40 52 C45 52 45 48 50 48 C55 48 55 52 60 52 C65 52 70 50 70 45 C70 35 65 25 50 25 Z" fill="white" opacity="0.95"/>
      <rect x="46" y="52" width="8" height="23" rx="2" fill="white" opacity="0.9"/>
    </svg>`
  },
  {
    name: 'Paleta',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad-purple" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ec4899" />
          <stop offset="100%" stop-color="#8b5cf6" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="50" fill="url(#grad-purple)"/>
      <path d="M35 55 C35 45 45 35 55 35 C65 35 70 42 70 50 C70 62 55 70 45 70 C40 70 35 65 35 55 Z" fill="white" opacity="0.95"/>
      <circle cx="43" cy="47" r="3" fill="#ec4899"/>
      <circle cx="53" cy="43" r="3" fill="#8b5cf6"/>
      <circle cx="61" cy="51" r="3" fill="#f59e0b"/>
      <circle cx="51" cy="59" r="3" fill="#10b981"/>
    </svg>`
  },
  {
    name: 'Grupo',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad-green" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#10b981" />
          <stop offset="100%" stop-color="#059669" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="50" fill="url(#grad-green)"/>
      <circle cx="35" cy="43" r="8" fill="white" opacity="0.9"/>
      <circle cx="65" cy="43" r="8" fill="white" opacity="0.9"/>
      <circle cx="50" cy="62" r="10" fill="white"/>
      <path d="M22 65 C22 58 28 53 35 53 C38 53 41 54 43 56 C39 60 37 65 37 70 H22 Z" fill="white" opacity="0.8"/>
      <path d="M78 65 C78 58 72 53 65 53 C62 53 59 54 57 56 C61 60 63 65 63 70 H78 Z" fill="white" opacity="0.8"/>
      <path d="M50 72 C40 72 35 77 35 82 H65 C65 77 60 72 50 72 Z" fill="white"/>
    </svg>`
  },
  {
    name: 'Cadeado',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad-navy" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#3b82f6" />
          <stop offset="100%" stop-color="#1e40af" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="50" fill="url(#grad-navy)"/>
      <rect x="33" y="45" width="34" height="28" rx="4" fill="white" opacity="0.95"/>
      <path d="M40 45 V35 C40 29 44 26 50 26 C56 26 60 29 60 35 V45" fill="none" stroke="white" stroke-width="5" stroke-linecap="round" opacity="0.95"/>
      <circle cx="50" cy="56" r="3.5" fill="#1e40af"/>
      <rect x="48.5" y="58" width="3" height="7" fill="#1e40af"/>
    </svg>`
  },
  {
    name: 'Membro',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad-grey" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#6b7280" />
          <stop offset="100%" stop-color="#374151" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="50" fill="url(#grad-grey)"/>
      <circle cx="50" cy="40" r="14" fill="white" opacity="0.95"/>
      <path d="M50 60 C35 60 25 68 25 78 H75 C75 68 65 60 50 60 Z" fill="white" opacity="0.95"/>
    </svg>`
  },
  {
    name: 'Lâmpada',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad-yellow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fbbf24" />
          <stop offset="100%" stop-color="#f59e0b" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="50" fill="url(#grad-yellow)"/>
      <path d="M50 25 C38 25 32 34 32 44 C32 51 37 57 40 61 C42 63 42 66 42 69 H58 C58 66 58 63 60 61 C63 57 68 51 68 44 C68 34 62 25 50 25 Z" fill="none" stroke="white" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" opacity="0.95"/>
      <path d="M45 74 H55" stroke="white" stroke-width="5" stroke-linecap="round" opacity="0.95"/>
      <path d="M47 79 H53" stroke="white" stroke-width="5" stroke-linecap="round" opacity="0.85"/>
    </svg>`
  },
  {
    name: 'Foguete',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad-rose" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ec4899" />
          <stop offset="100%" stop-color="#be185d" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="50" fill="url(#grad-rose)"/>
      <path d="M50 22 C55 33 58 43 58 55 C58 60 55 64 50 64 C45 64 42 60 42 55 C42 43 45 33 50 22 Z" fill="white" opacity="0.95"/>
      <path d="M42 53 C34 56 34 65 34 68 C42 68 44 60 42 53 Z" fill="white" opacity="0.8"/>
      <path d="M58 53 C66 56 66 65 66 68 C58 68 56 60 58 53 Z" fill="white" opacity="0.8"/>
      <circle cx="50" cy="42" r="3.5" fill="url(#grad-rose)"/>
      <path d="M46 72 L50 78 L54 72" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.9"/>
    </svg>`
  },
  {
    name: 'Raio',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad-yellow-orange" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#facc15" />
          <stop offset="100%" stop-color="#ea580c" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="50" fill="url(#grad-yellow-orange)"/>
      <path d="M55 22 L32 50 H48 L45 78 L68 50 H52 Z" fill="white" stroke="white" stroke-width="2" stroke-linejoin="round"/>
    </svg>`
  },
  {
    name: 'Estrela',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad-star" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fcd34d" />
          <stop offset="100%" stop-color="#f97316" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="50" fill="url(#grad-star)"/>
      <path d="M50 20 L59 38 L79 41 L65 55 L68 75 L50 66 L32 75 L35 55 L21 41 L41 38 Z" fill="white" stroke="white" stroke-width="2" stroke-linejoin="round" opacity="0.95"/>
    </svg>`
  },
  {
    name: 'Engrenagem',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad-steel" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#94a3b8" />
          <stop offset="100%" stop-color="#475569" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="50" fill="url(#grad-steel)"/>
      <circle cx="50" cy="50" r="14" fill="none" stroke="white" stroke-width="8" opacity="0.95"/>
      <circle cx="50" cy="50" r="6" fill="white" opacity="0.95"/>
      <path d="M50 20 V28 M50 72 V80 M20 50 H28 M72 50 H80 M29 29 L35 35 M65 65 L71 71 M29 71 L35 65 M65 29 L71 35" stroke="white" stroke-width="8" stroke-linecap="round" opacity="0.95"/>
    </svg>`
  },
  {
    name: 'Bússola',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad-amber-red" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#f59e0b" />
          <stop offset="100%" stop-color="#dc2626" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="50" fill="url(#grad-amber-red)"/>
      <circle cx="50" cy="50" r="26" fill="none" stroke="white" stroke-width="4" opacity="0.9"/>
      <path d="M50 30 L55 45 L50 50 L45 45 Z" fill="white" opacity="0.95"/>
      <path d="M50 70 L55 55 L50 50 L45 55 Z" fill="#b91c1c" opacity="0.95"/>
      <circle cx="50" cy="50" r="3" fill="white"/>
    </svg>`
  },
  {
    name: 'Alvo',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad-indigo" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#6366f1" />
          <stop offset="100%" stop-color="#4338ca" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="50" fill="url(#grad-indigo)"/>
      <circle cx="50" cy="50" r="26" fill="none" stroke="white" stroke-width="4" opacity="0.8"/>
      <circle cx="50" cy="50" r="16" fill="none" stroke="white" stroke-width="4" opacity="0.9"/>
      <circle cx="50" cy="50" r="6" fill="white" opacity="0.95"/>
      <path d="M50 15 V25 M50 75 V85 M15 50 H25 M75 50 H85" stroke="white" stroke-width="4" stroke-linecap="round" opacity="0.9"/>
    </svg>`
  },
  {
    name: 'Globo',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad-emerald-cyan" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#10b981" />
          <stop offset="100%" stop-color="#06b6d4" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="50" fill="url(#grad-emerald-cyan)"/>
      <circle cx="50" cy="50" r="26" fill="none" stroke="white" stroke-width="4" opacity="0.9"/>
      <ellipse cx="50" cy="50" rx="26" ry="10" fill="none" stroke="white" stroke-width="3" opacity="0.8"/>
      <ellipse cx="50" cy="50" rx="10" ry="26" fill="none" stroke="white" stroke-width="3" opacity="0.8"/>
      <line x1="50" y1="24" x2="50" y2="76" stroke="white" stroke-width="3" opacity="0.8"/>
      <line x1="24" y1="50" x2="76" y2="50" stroke="white" stroke-width="3" opacity="0.8"/>
    </svg>`
  },
  {
    name: 'Pena',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad-teal-green" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#14b8a6" />
          <stop offset="100%" stop-color="#059669" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="50" fill="url(#grad-teal-green)"/>
      <path d="M72 28 C62 28 42 42 36 50 C33 54 36 58 40 58 C46 58 60 44 68 36 M38 52 C32 58 26 72 26 74 C28 74 42 68 48 62" fill="none" stroke="white" stroke-width="5" stroke-linecap="round" opacity="0.95"/>
      <path d="M38 52 L42 56" stroke="white" stroke-width="4" stroke-linecap="round" opacity="0.95"/>
    </svg>`
  },
  {
    name: 'Coração',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad-rose-red" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#f43f5e" />
          <stop offset="100%" stop-color="#e11d48" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="50" fill="url(#grad-rose-red)"/>
      <path d="M50 72 C50 72 26 56 26 40 C26 28 36 22 45 28 C50 31 50 34 50 34 C50 34 50 31 55 28 C64 22 74 28 74 40 C74 56 50 72 50 72 Z" fill="white" stroke="white" stroke-width="2" stroke-linejoin="round" opacity="0.95"/>
    </svg>`
  }
];

const getSymbolForRole = (roleId: string) => {
  let sym = ROLE_SYMBOLS[5]; // Geral/Membro
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
  onClose,
}) => {
  const { currentUser } = useApp();
  const [name, setName] = useState('');
  const [selectedRole, setSelectedRole] = useState(ROLES[0]);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [companyTime, setCompanyTime] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isEditing = currentUser?.profileCompleted === true;

  // Load existing profile details on open
  useEffect(() => {
    if (isOpen && userId) {
      const loadProfileData = async () => {
        try {
          let currentName = '';
          let currentAvatar = '';
          let currentRole = '';
          let currentCompanyTime = '';

          if (userId !== 'demo_user') {
            const { data: dbProfile } = await supabase
              .from('profiles')
              .select('name, avatar_url')
              .eq('id', userId)
              .single();

            const { data: ud } = await supabase.auth.getUser();
            const metadata = ud?.user?.user_metadata;

            if (dbProfile) {
              currentName = dbProfile.name;
              const decoded = decodeAvatarUrl(dbProfile.avatar_url);
              currentAvatar = decoded.avatarUrl;
              currentCompanyTime = decoded.companyTime || metadata?.company_time || '';
            } else if (metadata) {
              currentName = metadata.name || '';
              currentAvatar = metadata.avatar_url || '';
              currentCompanyTime = metadata.company_time || '';
            }
            currentRole = metadata?.role || '';
          } else {
            // Demo user from local storage/context
            currentName = currentUser?.name || '';
            currentAvatar = currentUser?.avatar || '';
            currentRole = currentUser?.role || '';
            currentCompanyTime = (currentUser as any)?.companyTime || '';
          }

          if (currentName) {
            const prefixRegex = /^(Arq\.|Eng\.|Coord\.|Dir\.|Ger\.|Dsgn\.)\s+/i;
            setName(currentName.replace(prefixRegex, '').trim());
          }
          
          if (currentAvatar) {
            setAvatarUrl(currentAvatar);
          }

          if (currentRole) {
            const matched = ROLES.find(r => r.label.toLowerCase() === currentRole.toLowerCase());
            if (matched) setSelectedRole(matched);
          }

          if (currentCompanyTime) {
            setCompanyTime(currentCompanyTime);
          }
        } catch (err) {
          console.warn('Erro ao carregar dados do perfil para edição:', err);
        }
      };
      loadProfileData();
    }
  }, [isOpen, userId, currentUser]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Por favor, informe seu nome.');
      return;
    }

    setSaving(true);
    setError('');

    // Format name with role prefix
    const prefix = selectedRole.prefix ? `${selectedRole.prefix} ` : '';
    const formattedName = `${prefix}${name.trim()}`;
    const baseAvatar = avatarUrl || getSymbolForRole(selectedRole.id);
    const finalAvatarEncoded = encodeAvatarUrl(baseAvatar, companyTime);

    try {
      // 1. Grava no Supabase e ESPERA terminar — se falhar (RLS, coluna
      // ausente, sessão expirada), o usuário precisa ver o erro real em vez
      // de um "salvo com sucesso" mentiroso (era fire-and-forget antes).
      if (userId && userId !== 'demo_user') {
        const { error: authErr } = await supabase.auth.updateUser({
          data: {
            name: formattedName,
            role: selectedRole.label,
            avatar_url: finalAvatarEncoded,
            profile_completed: true,
            company_time: companyTime,
          },
        });
        if (authErr) throw new Error(`Falha ao atualizar login (Auth): ${authErr.message}`);

        let { error: dbErr } = await supabase.from('profiles').upsert({
          id: userId,
          name: formattedName,
          avatar_url: finalAvatarEncoded,
          role: selectedRole.label,
          company_time: companyTime,
          updated_at: new Date().toISOString(),
        });
        if (dbErr) {
          // Colunas role/company_time podem não existir ainda (supabase_setup.sql
          // não rodado) — tenta de novo só com as colunas básicas antes de desistir.
          const retry = await supabase.from('profiles').upsert({
            id: userId,
            name: formattedName,
            avatar_url: finalAvatarEncoded,
            updated_at: new Date().toISOString(),
          });
          if (retry.error) throw new Error(`Falha ao salvar perfil (banco): ${retry.error.message}`);
        }
      }

      // 2. Só atualiza o estado local/UI depois que a nuvem confirmou.
      onSubmit({
        name: formattedName,
        role: selectedRole.label,
        avatarUrl: baseAvatar, // Base image URL (unencoded) for local state
        companyTime: companyTime,
      });
    } catch (err: any) {
      console.error('Erro ao salvar perfil:', err);
      setError(err?.message || 'Erro ao salvar o perfil. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fadeIn no-print">
      <div 
        className="w-full max-w-md rounded-[32px] border border-[#E8E9F0] bg-white p-8 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.1)] relative overflow-hidden animate-scaleIn text-[#1B1D21]"
      >
        {/* Soft blobs */}
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-orange-400/8 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-sky-400/6 rounded-full blur-[100px] pointer-events-none" />

        {/* Close Button */}
        {isEditing && onClose && (
          <button 
            type="button"
            onClick={onClose}
            className="absolute top-6 right-6 text-zinc-500 hover:text-[#1B1D21] bg-[#F3F4F6] hover:bg-[#E5E7EB] w-8 h-8 rounded-full flex items-center justify-center transition-all border border-[#E5E7EB]"
          >
            <X size={16} />
          </button>
        )}

        <div className="flex flex-col items-center text-center mb-6 relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center mb-4 shadow-lg shadow-orange-200">
            <Sparkles size={22} className="text-white animate-pulse" />
          </div>
          <h2 className="text-xl font-black font-square tracking-wider uppercase text-[#1B1D21]">
            {isEditing ? 'EDITAR PERFIL' : 'BEM-VINDO AO ENIGAMI!'}
          </h2>
          <p className="text-xs text-[#6B7280] max-w-xs mt-1">
            {isEditing ? 'Atualize as informações do seu perfil e foto de equipe.' : 'Complete seu cadastro para se integrar à equipe e começar a colaborar no projeto.'}
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-5 relative z-10 max-h-[75vh] overflow-y-auto scroller pr-1">
          {/* Avatar Selection (Symbols only) */}
          <div className="flex flex-col items-center gap-2">
            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-[#9CA3AF]">
              SÍMBOLO DO PERFIL
            </label>
            <div className="flex items-center gap-5 w-full">
              <div 
                className="relative w-16 h-16 rounded-full border border-[#E5E7EB] bg-[#F9FAFB] flex items-center justify-center overflow-hidden shrink-0 shadow-sm"
              >
                <img 
                  src={avatarUrl || getSymbolForRole(selectedRole.id)} 
                  alt="Preview" 
                  className="w-full h-full object-cover" 
                />
              </div>

              {/* Preset Symbols Grid */}
              <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                <span className="text-[9px] font-black text-[#9CA3AF] uppercase tracking-wider">Sugestões de Símbolos:</span>
                <div className="grid grid-cols-8 gap-1.5">
                  {ROLE_SYMBOLS.map((sym, idx) => {
                    const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(sym.svg)}`;
                    const isSelected = avatarUrl === dataUrl || (!avatarUrl && getSymbolForRole(selectedRole.id) === dataUrl);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setAvatarUrl(dataUrl)}
                        className={`w-7 h-7 rounded-full overflow-hidden border transition-all hover:scale-110 active:scale-95 ${
                          isSelected ? 'border-orange-500 scale-105 shadow-[0_0_10px_rgba(249,115,22,0.4)]' : 'border-transparent opacity-50 hover:opacity-100'
                        }`}
                        title={sym.name}
                      >
                        <img src={dataUrl} alt={sym.name} className="w-full h-full object-cover" />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Nome Input */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-[#9CA3AF] flex items-center gap-1.5 ml-1">
              <User size={12} className="text-[#9CA3AF]" /> NOME COMPLETO
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Yuri Cunha"
              className="w-full bg-[#F9FAFB] border border-[#E5E7EB] focus:border-orange-400 focus:bg-white rounded-2xl px-4 py-3.5 text-sm text-[#1B1D21] outline-none placeholder:text-[#D1D5DB] transition-all font-semibold"
              required
            />
          </div>

          {/* Tempo de Empresa Select */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-[#9CA3AF] flex items-center gap-1.5 ml-1">
              <Clock size={12} className="text-[#9CA3AF]" /> TEMPO DE EMPRESA
            </label>
            <div className="relative">
              <select
                value={companyTime}
                onChange={e => setCompanyTime(e.target.value)}
                className="w-full bg-[#F9FAFB] border border-[#E5E7EB] focus:border-orange-400 focus:bg-white rounded-2xl px-4 py-3.5 text-sm text-[#1B1D21] outline-none appearance-none cursor-pointer font-semibold transition-all"
                required
              >
                <option value="" disabled className="text-zinc-400">Selecione o tempo de empresa</option>
                <option value="Recém-chegado">Recém-chegado</option>
                <option value="Menos de 1 ano">Menos de 1 ano</option>
                <option value="1 a 2 anos">1 a 2 anos</option>
                <option value="2 a 5 anos">2 a 5 anos</option>
                <option value="Mais de 5 anos">Mais de 5 anos</option>
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
                <ChevronRight size={14} className="rotate-90" />
              </div>
            </div>
          </div>

          {/* Função / Cargo Selection */}
          <div className="space-y-2">
            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-[#9CA3AF] flex items-center gap-1.5 ml-1">
              <Briefcase size={12} className="text-[#9CA3AF]" /> SUA FUNÇÃO / CARGO
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1 scroller">
              {ROLES.map(role => {
                const isSelected = selectedRole.id === role.id;
                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => setSelectedRole(role)}
                    className={`flex items-center justify-between p-3 rounded-2xl border text-left text-[10px] uppercase tracking-wider font-black transition-all ${
                      isSelected
                        ? 'bg-gradient-to-r from-orange-500 to-red-500 border-transparent text-white shadow-[0_0_15px_rgba(249,115,22,0.3)] scale-[1.01]'
                        : 'bg-[#F9FAFB] border-[#E5E7EB] text-[#374151] hover:border-orange-200 hover:text-[#1B1D21]'
                    }`}
                  >
                    <span>{role.label}</span>
                    {isSelected ? <Check size={12} /> : <ChevronRight size={12} className="opacity-40" />}
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-500 rounded-2xl p-3.5 text-xs font-semibold animate-fadeIn">
              {error}
            </div>
          )}

          {/* Action Button */}
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all hover:shadow-[0_0_20px_rgba(249,115,22,0.4)] flex items-center justify-center gap-2 disabled:opacity-50 active:scale-98 mt-2"
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
