import React, { useState, useRef } from 'react';
import { Camera, Check, Wifi, WifiOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useApp } from '../contexts/AppContext';
import { usePresence } from '../hooks/usePresence';

function buildUiAvatar(name: string): string {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=FFB7B2&color=fff&size=96`;
}

interface AvatarProps {
  name: string; avatarUrl: string; isOnline?: boolean;
  isMe?: boolean; size?: 'sm' | 'md' | 'lg'; isDark: boolean;
}

function MemberAvatar({ name, avatarUrl, isOnline, isMe, size = 'md', isDark }: AvatarProps) {
  const [imgError, setImgError] = useState(false);
  const src = imgError || !avatarUrl ? buildUiAvatar(name) : avatarUrl;
  const sizeClass = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-12 h-12 text-base' }[size];
  const dotSize = { sm: 'w-2 h-2 -bottom-0.5 -right-0.5', md: 'w-2.5 h-2.5 -bottom-0.5 -right-0.5', lg: 'w-3 h-3 bottom-0 right-0' }[size];
  return (
    <div className="relative inline-flex flex-shrink-0" title={name + (isMe ? ' (você)' : '')}>
      <img src={src} alt={name} onError={() => setImgError(true)}
        className={`${sizeClass} rounded-full object-cover ring-2 ${isMe ? 'ring-blue-500' : isDark ? 'ring-[#2D3748]' : 'ring-[#E8E9F0]'}`} />
      {isOnline !== undefined && (
        <span className={`absolute ${dotSize} rounded-full border-2 ${isDark ? 'border-[#0B0C10]' : 'border-white'} ${isOnline ? 'bg-emerald-400' : 'bg-gray-400'}`} />
      )}
    </div>
  );
}

interface MemberRowProps {
  name: string; avatarUrl: string; subtitle: string;
  isOnline: boolean; isMe: boolean; isDark: boolean;
}

function MemberRow({ name, avatarUrl, subtitle, isOnline, isMe, isDark }: MemberRowProps) {
  return (
    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${isDark ? 'bg-[#151B24] border-[#2D3748]' : 'bg-white border-[#E8E9F0]'}`}>
      <MemberAvatar name={name} avatarUrl={avatarUrl} isOnline={isOnline} isMe={isMe} size="md" isDark={isDark} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-[#1B1D21]'}`}>
          {name}{isMe && <span className="ml-1 text-xs text-blue-400">(você)</span>}
        </p>
        <p className={`text-xs truncate ${isDark ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}`}>{subtitle}</p>
      </div>
      {isOnline && <span className="text-xs text-emerald-400 font-medium whitespace-nowrap">online</span>}
    </div>
  );
}

interface AvatarUploadProps {
  userId: string; name: string; avatarUrl: string;
  isDark: boolean; onUploaded: (url: string) => void;
}

function AvatarUpload({ userId, name, avatarUrl, isDark, onUploaded }: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${userId}/avatar.${ext}`;
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      const url = `${data.publicUrl}?t=${Date.now()}`;
      await supabase.from('profiles').update({ avatar_url: url }).eq('id', userId);
      onUploaded(url);
      setDone(true);
      setTimeout(() => setDone(false), 2000);
    } catch (err) {
      console.error('Erro no upload do avatar:', err);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="relative group cursor-pointer" onClick={() => inputRef.current?.click()}>
      <MemberAvatar name={name} avatarUrl={avatarUrl} size="lg" isDark={isDark} />
      <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        {uploading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          : done ? <Check size={14} className="text-white" />
          : <Camera size={14} className="text-white" />}
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
}

interface MembersPresenceProps {
  projectId: string | null;
  className?: string;
}

export const MembersPresence: React.FC<MembersPresenceProps> = ({ projectId, className = '' }) => {
  const { currentUser, theme, setCurrentUser } = useApp();
  const isDark = theme === 'dark';
  const myId     = (currentUser as any)?.id ?? null;
  const myName   = currentUser?.name ?? 'Usuário';
  const myAvatar = currentUser?.avatar ?? buildUiAvatar(myName);

  const { onlineUsers, isConnected } = usePresence({
    projectId, currentUserId: myId,
    currentName: myName, currentAvatar: myAvatar,
  });

  const card   = isDark ? 'bg-[#1F2937]' : 'bg-white';
  const border = isDark ? 'border-[#2D3748]' : 'border-[#E8E9F0]';
  const textH  = isDark ? 'text-white' : 'text-[#1B1D21]';
  const textSub = isDark ? 'text-[#9CA3AF]' : 'text-[#6B7280]';

  function handleAvatarUploaded(url: string) {
    if (currentUser) setCurrentUser({ ...currentUser, avatar: url });
  }

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {/* Meu perfil */}
      <div className={`rounded-2xl border ${card} ${border} p-4`}>
        <p className={`text-xs font-semibold uppercase tracking-wider mb-3 ${textSub}`}>Meu perfil</p>
        <div className="flex items-center gap-3">
          {myId
            ? <AvatarUpload userId={myId} name={myName} avatarUrl={myAvatar} isDark={isDark} onUploaded={handleAvatarUploaded} />
            : <MemberAvatar name={myName} avatarUrl={myAvatar} size="lg" isDark={isDark} />}
          <div className="min-w-0">
            <p className={`font-semibold truncate ${textH}`}>{myName}</p>
            <p className={`text-xs ${textSub}`}>{myId ? 'Clique na foto para trocar' : 'Faça login para editar'}</p>
          </div>
        </div>
      </div>

      {/* Agora online */}
      <div className={`rounded-2xl border ${card} ${border} p-4`}>
        <div className="flex items-center justify-between mb-3">
          <p className={`text-xs font-semibold uppercase tracking-wider ${textSub}`}>Agora online</p>
          <div className="flex items-center gap-1.5">
            {isConnected ? <Wifi size={12} className="text-emerald-400" /> : <WifiOff size={12} className="text-gray-400" />}
            <span className={`text-xs ${isConnected ? 'text-emerald-400' : 'text-gray-400'}`}>{onlineUsers.length}</span>
          </div>
        </div>
        {onlineUsers.length === 0
          ? <p className={`text-xs ${textSub}`}>{projectId ? 'Nenhum usuário online agora' : 'Selecione um projeto'}</p>
          : <div className="flex flex-wrap gap-2">
              {onlineUsers.map(u => (
                <div key={u.userId} className="flex flex-col items-center gap-1">
                  <MemberAvatar name={u.name} avatarUrl={u.avatarUrl} isOnline={true}
                    isMe={u.userId === myId} size="md" isDark={isDark} />
                  <span className={`text-[10px] text-center max-w-[40px] truncate ${textSub}`}>
                    {u.userId === myId ? 'você' : u.name.split(' ')[0]}
                  </span>
                </div>
              ))}
            </div>}
      </div>
    </div>
  );
};

export default MembersPresence;
