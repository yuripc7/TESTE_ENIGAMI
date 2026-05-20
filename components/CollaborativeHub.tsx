import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../contexts/AppContext';

export const CollaborativeHub: React.FC = () => {
  const {
    onlineUsers,
    isRealtimeConnected,
    simulationActive,
    setSimulationActive,
    simulationSpeed,
    setSimulationSpeed,
    theme,
    db
  } = useApp();

  const [isOpen, setIsOpen] = useState(false);
  const [pulse, setPulse] = useState(false);
  const isDark = theme === 'dark';
  const feedEndRef = useRef<HTMLDivElement>(null);

  // Maintain a local log of simulated activity notifications
  const [activityFeed, setActivityFeed] = useState<{ id: string; time: string; user: string; text: string; avatar: string }[]>([]);

  // Monitor db activities changes to feed the Collaborative Hub activity log
  useEffect(() => {
    if (!db.activeProjectId) return;
    const activeProject = db.projects.find(p => p.id === db.activeProjectId);
    if (!activeProject) return;

    // Map project activities to feed items
    const logs = activeProject.activities.slice(-10).map((act, i) => {
      const bot = onlineUsers.find(u => u.name.toUpperCase() === act.author.toUpperCase() || u.name.split(' ')[0].toUpperCase() === act.author.toUpperCase());
      return {
        id: `log-${act.date}-${i}-${act.text}`,
        time: act.date.split(' ')[1] || act.date,
        user: act.author,
        text: act.text,
        avatar: bot?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(act.author)}&background=1f2937&color=fff`
      };
    });

    setActivityFeed(logs);
    
    // Trigger button pulse on new activity
    setPulse(true);
    const timer = setTimeout(() => setPulse(false), 1000);
    return () => clearTimeout(timer);
  }, [db, onlineUsers]);

  // Scroll to bottom of feed
  useEffect(() => {
    if (feedEndRef.current) {
      feedEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activityFeed, isOpen]);

  const activeBotsCount = onlineUsers.filter(u => u.isVirtual).length;

  return (
    <div className={`fixed bottom-6 right-6 z-[180] no-print font-sans transition-all duration-300 ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      {/* Small floating pill — only visible when panel is closed */}
      {!isOpen && (simulationActive || onlineUsers.length > 0) && (
        <button
          onClick={() => setIsOpen(true)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-lg transition-all duration-300 cursor-pointer backdrop-blur-xl pointer-events-auto text-[9px] font-black uppercase tracking-wider ${
            simulationActive
              ? 'bg-theme-orange/10 border-theme-orange/40 text-theme-orange animate-collabGlow'
              : 'bg-theme-card/80 border-theme-divider text-theme-textMuted hover:text-theme-orange hover:border-theme-orange'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${simulationActive ? 'bg-theme-orange animate-ping' : 'bg-emerald-400 animate-pulse'}`} />
          <span className="material-symbols-outlined text-sm leading-none">{simulationActive ? 'bolt' : 'group'}</span>
          {simulationActive ? `${activeBotsCount} bots` : `${onlineUsers.length}`}
        </button>
      )}

      {/* DASHBOARD PANEL */}
      {isOpen && (
        <div
          className={`w-96 rounded-3xl border shadow-2xl overflow-hidden transition-all duration-300 transform scale-100 flex flex-col backdrop-blur-xl max-h-[500px] ${
            isDark
              ? 'bg-[#151B24]/95 border-[#2D3748]'
              : 'bg-white/95 border-[#E8E9F0]'
          }`}
        >
          {/* Header */}
          <div className={`px-5 py-4 border-b flex justify-between items-center ${isDark ? 'border-[#2D3748] bg-white/5' : 'border-[#E8E9F0] bg-black/5'}`}>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-theme-orange shadow-[0_0_8px_#FF6B00] rounded-full p-0.5 text-base">bolt</span>
              <h3 className="font-square font-black text-[11px] uppercase tracking-widest text-theme-text">Escritório Virtual</h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-7 h-7 rounded-full flex items-center justify-center border border-theme-divider hover:text-theme-orange hover:border-theme-orange transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-xs">close</span>
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto scroller p-5 space-y-5">
            {/* Simulation Controls */}
            <div className={`p-4 rounded-2xl border ${isDark ? 'bg-white/5 border-[#2D3748]' : 'bg-black/5 border-[#E8E9F0]'}`}>
              <div className="flex justify-between items-center mb-3">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-theme-text">Modo Força Tarefa</h4>
                  <p className="text-[9px] text-theme-textMuted mt-0.5">Ativar colaboradores virtuais inteligentes</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={simulationActive}
                    onChange={(e) => setSimulationActive(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-400 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-theme-orange"></div>
                </label>
              </div>

              {simulationActive && (
                <div className="mt-4 pt-3 border-t border-theme-divider/50 space-y-2">
                  <div className="flex justify-between items-center text-[9px] font-black uppercase text-theme-textMuted">
                    <span>Intensidade de Trabalho</span>
                    <span className="text-theme-orange">
                      {simulationSpeed <= 4000 ? 'Rápido (Sprint)' : simulationSpeed <= 7000 ? 'Normal (Produção)' : 'Lento (Foco)'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {[
                      { label: 'Foco', speed: 15000 },
                      { label: 'Produção', speed: 8000 },
                      { label: 'Sprint', speed: 4000 }
                    ].map((opt) => (
                      <button
                        key={opt.label}
                        onClick={() => setSimulationSpeed(opt.speed)}
                        className={`flex-1 py-1 rounded-lg text-[9px] font-bold uppercase border transition-all cursor-pointer ${
                          simulationSpeed === opt.speed
                            ? 'bg-theme-orange text-white border-theme-orange shadow-lg shadow-theme-orange/20'
                            : 'bg-theme-bg text-theme-textMuted border-theme-divider hover:text-theme-text'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Online Users List */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-black uppercase tracking-wider text-theme-textMuted">Equipe Ativa ({onlineUsers.length})</h4>
              <div className="space-y-2 max-h-36 overflow-y-auto scroller pr-1">
                {onlineUsers.map(user => (
                  <div
                    key={user.userId}
                    className={`flex items-center gap-3 p-2.5 rounded-xl border text-xs transition-all ${
                      user.isVirtual 
                        ? 'border-dashed border-theme-divider hover:border-theme-orange/50' 
                        : 'border-theme-divider hover:border-[#E85028]/50'
                    }`}
                  >
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <img src={user.avatarUrl} alt={user.name} className="w-8 h-8 rounded-full object-cover ring-1 ring-theme-divider" />
                      <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-theme-card bg-emerald-400" />
                    </div>

                    {/* Meta */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline">
                        <span className="font-bold text-theme-text truncate max-w-[120px]">{user.name}</span>
                        {user.isVirtual && (
                          <span className="text-[7px] font-black uppercase px-1 py-0.5 rounded bg-theme-orange/10 text-theme-orange border border-theme-orange/20">BOT</span>
                        )}
                      </div>
                      <p className="text-[9px] text-theme-textMuted truncate">
                        {user.activeProjectName ? `Em: ${user.activeProjectName}` : 'Fora de projeto'}
                      </p>
                      <p className="text-[8px] text-theme-orange font-bold uppercase tracking-wider truncate mt-0.5">
                        ⚡ {user.currentActivity || 'Inativo'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Live Activities Feed */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-black uppercase tracking-wider text-theme-textMuted">Mural de Atividades Ao Vivo</h4>
              <div className={`rounded-2xl p-3 border h-36 overflow-y-auto scroller space-y-3 ${isDark ? 'bg-white/5 border-[#2D3748]' : 'bg-black/5 border-[#E8E9F0]'}`}>
                {activityFeed.length === 0 ? (
                  <p className="text-[9px] text-theme-textMuted text-center py-10 uppercase font-bold">Nenhuma atividade registrada.</p>
                ) : (
                  activityFeed.map((act) => (
                    <div key={act.id} className="flex gap-2.5 items-start text-[10px]">
                      <img src={act.avatar} alt={act.user} className="w-5 h-5 rounded-full object-cover shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-theme-text leading-tight">
                          <span className="font-black uppercase mr-1">{act.user}:</span>
                          <span className="text-theme-text/80">{act.text.toLowerCase()}</span>
                        </p>
                        <span className="text-[8px] text-theme-textMuted font-mono block mt-0.5">{act.time}</span>
                      </div>
                    </div>
                  ))
                )}
                <div ref={feedEndRef} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollaborativeHub;
