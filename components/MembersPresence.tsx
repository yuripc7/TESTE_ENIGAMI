import React, { useState } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { decodeAvatarUrl } from '../utils/avatarHelper';

function buildUiAvatar(name: string): string {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=FFB7B2&color=fff&size=96`;
}

interface AvatarProps {
  name: string;
  avatarUrl: string;
  isOnline?: boolean;
  isMe?: boolean;
  size?: 'sm' | 'md' | 'lg';
  isDark: boolean;
  isVirtual?: boolean;
}

function MemberAvatar({ name, avatarUrl, isOnline, isMe, size = 'md', isDark, isVirtual }: AvatarProps) {
  const [imgError, setImgError] = useState(false);
  const src = imgError || !avatarUrl ? buildUiAvatar(name) : avatarUrl;
  const sizeClass = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-12 h-12 text-base' }[size];
  const dotSize = { sm: 'w-2 h-2 -bottom-0.5 -right-0.5', md: 'w-2.5 h-2.5 -bottom-0.5 -right-0.5', lg: 'w-3 h-3 bottom-0 right-0' }[size];
  const ringColor = isVirtual ? 'ring-theme-orange/50' : isMe ? 'ring-blue-500' : isDark ? 'ring-[#2D3748]' : 'ring-[#E8E9F0]';
  return (
    <div className="relative inline-flex flex-shrink-0" title={name + (isMe ? ' (você)' : '') + (isVirtual ? ' (bot)' : '')}>
      <img src={src} alt={name} onError={() => setImgError(true)}
        className={`${sizeClass} rounded-full object-cover ring-2 ${ringColor}`} />
      {isOnline !== undefined && (
        <span className={`absolute ${dotSize} rounded-full border-2 ${isDark ? 'border-[#0B0C10]' : 'border-white'} ${isOnline ? 'bg-emerald-400' : 'bg-gray-400'}`} />
      )}
    </div>
  );
}

interface MembersPresenceProps {
  projectId: string | null;
  className?: string;
}

export const MembersPresence: React.FC<MembersPresenceProps> = ({ className = '' }) => {
  const { currentUser, theme, onlineUsers, isRealtimeConnected, simulationActive, setShowProfileModal } = useApp();
  const isDark = theme === 'dark';
  const myId     = (currentUser as any)?.id ?? null;
  const myName   = currentUser?.name ?? 'Usuário';
  const myAvatar = currentUser?.avatar ?? buildUiAvatar(myName);

  const isConnected = isRealtimeConnected || simulationActive;

  const card   = isDark ? 'bg-[#1F2937]' : 'bg-white';
  const border = isDark ? 'border-[#2D3748]' : 'border-[#E8E9F0]';
  const textSub = isDark ? 'text-[#9CA3AF]' : 'text-[#6B7280]';

  // Tab label mapping
  const tabLabel = (tab?: string) => {
    const map: Record<string, string> = {
      timeline: 'Cronograma', gallery: 'Galeria', files: 'Arquivos',
      data: 'Dados', viabilidade: 'Contratos', financeiro: 'Financeiro',
      notas: 'Notas', colaborador: 'Equipe'
    };
    return tab ? (map[tab] || tab) : '';
  };

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {/* My profile */}
      <div 
        className={`rounded-2xl border ${card} ${border} p-4 cursor-pointer hover:border-theme-orange/40 hover:shadow-lg transition-all group`}
        onClick={() => setShowProfileModal(true)}
      >
        <p className={`text-xs font-semibold uppercase tracking-wider mb-3 ${textSub} group-hover:text-theme-orange transition-colors`}>Meu perfil</p>
        <div className="flex items-center gap-3">
          <MemberAvatar name={myName} avatarUrl={myAvatar} size="lg" isDark={isDark} />
          <div className="min-w-0 flex-1">
            <p className={`font-semibold truncate ${isDark ? 'text-white' : 'text-[#1B1D21]'}`}>{myName}</p>
            {currentUser?.companyTime ? (
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-theme-orange/10 text-theme-orange border border-theme-orange/20">
                  {currentUser.companyTime}
                </span>
                <span className={`text-[9px] ${textSub}`}>· Editar perfil</span>
              </div>
            ) : (
              <p className={`text-xs ${textSub}`}>{myId ? 'Clique para editar seu perfil' : 'Faça login para editar'}</p>
            )}
          </div>
        </div>
      </div>

      {/* Online users — now from global context, includes bots */}
      <div className={`rounded-2xl border ${card} ${border} p-4`}>
        <div className="flex items-center justify-between mb-3">
          <p className={`text-xs font-semibold uppercase tracking-wider ${textSub}`}>Agora online</p>
          <div className="flex items-center gap-1.5">
            {isConnected
              ? <Wifi size={12} className="text-emerald-400" />
              : <WifiOff size={12} className="text-gray-400" />}
            <span className={`text-xs ${isConnected ? 'text-emerald-400' : 'text-gray-400'}`}>{onlineUsers.length}</span>
            {simulationActive && (
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-theme-orange/10 text-theme-orange border border-theme-orange/20 uppercase ml-1">
                Força Tarefa
              </span>
            )}
          </div>
        </div>

        {onlineUsers.length === 0 ? (
          <p className={`text-xs ${textSub}`}>Nenhum usuário online agora</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto scroller pr-1">
            {onlineUsers.map(u => {
              const { avatarUrl, companyTime } = decodeAvatarUrl(u.avatarUrl);
              return (
                <div
                  key={u.userId}
                  className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl border transition-all ${
                    u.isVirtual
                      ? 'border-dashed border-theme-divider hover:border-theme-orange/50 bg-theme-orange/5'
                      : isDark ? 'bg-[#151B24] border-[#2D3748]' : 'bg-white border-[#E8E9F0]'
                  }`}
                >
                  <MemberAvatar
                    name={u.name}
                    avatarUrl={avatarUrl}
                    isOnline={true}
                    isMe={u.userId === myId}
                    size="sm"
                    isDark={isDark}
                    isVirtual={u.isVirtual}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className={`text-xs font-bold truncate ${isDark ? 'text-white' : 'text-[#1B1D21]'}`}>
                        {u.userId === myId ? `${u.name} (você)` : u.name}
                      </p>
                      {companyTime && (
                        <span className="text-[7px] font-black px-1.5 py-0.5 rounded bg-theme-orange/10 text-theme-orange border border-theme-orange/20 uppercase shrink-0">
                          {companyTime}
                        </span>
                      )}
                      {u.isVirtual && (
                        <span className="text-[7px] font-black px-1 rounded bg-theme-orange/10 text-theme-orange border border-theme-orange/20 uppercase shrink-0">BOT</span>
                      )}
                    </div>
                    {u.currentActivity && (
                      <p className="text-[9px] text-theme-orange font-bold uppercase tracking-wider truncate">
                        ⚡ {u.currentActivity}
                      </p>
                    )}
                    {u.activeProjectName && (
                      <p className={`text-[9px] truncate ${textSub}`}>
                        {tabLabel(u.activeTab)} · {u.activeProjectName}
                      </p>
                    )}
                  </div>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MembersPresence;
