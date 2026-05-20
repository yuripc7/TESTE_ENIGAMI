import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { DB, Project, Note, Activity } from '../types';

export interface CollaborationUser {
  userId: string;
  name: string;
  avatarUrl: string;
  activeProjectId?: string | null;
  activeProjectName?: string | null;
  activeTab?: string;
  currentActivity?: string;
  joinedAt: number;
  isVirtual?: boolean;
}

interface UseCollaborationOptions {
  projectId: string | null;
  projectName: string | null;
  currentUserId: string | null;
  currentName: string;
  currentAvatar: string;
  activeTab: string;
  db: DB;
  setDb: React.Dispatch<React.SetStateAction<DB>>;
  addLog: (author: string, text: string) => void;
  showToast: (message: string, author: string, avatarUrl: string) => void;
}

const BOTS = [
  { name: 'Arq. Yuri', avatar: 'https://ui-avatars.com/api/?name=Arq+Yuri&background=3B82F6&color=fff' },
  { name: 'Arq. Lourraine', avatar: 'https://ui-avatars.com/api/?name=Arq+Lourraine&background=EC4899&color=fff' },
  { name: 'Eng. Lucas', avatar: 'https://ui-avatars.com/api/?name=Eng+Lucas&background=10B981&color=fff' },
  { name: 'Arq. Isabela', avatar: 'https://ui-avatars.com/api/?name=Arq+Isabela&background=F59E0B&color=fff' },
  { name: 'Mkt Gisele', avatar: 'https://ui-avatars.com/api/?name=Mkt+Gisele&background=06B6D4&color=fff' }
];

const BOT_TABS = ['timeline', 'gallery', 'financeiro', 'notas', 'colaborador'];

const BOT_ACTIVITIES = [
  'Analisando cronograma',
  'Revisando notas do mural',
  'Ajustando custos na planilha',
  'Organizando arquivos de entrega',
  'Analisando viabilidade técnica',
  'Atualizando galeria de fotos',
  'Adicionando anotações no post-it',
  'Verificando prazos do projeto'
];

const BOT_FEED_MESSAGES = [
  'Revisou a compatibilidade estrutural.',
  'Enviou novos detalhamentos executivos.',
  'Atualizou a planilha de custos de insumos.',
  'Subiu os novos renders 3D na galeria.',
  'Conversou com o fornecedor de esquadrias.',
  'Finalizou a minuta de alteração de escopo.',
  'Validou o levantamento topográfico.',
  'Reuniu-se com a equipe técnica da Prefeitura.'
];

const BOT_NOTE_MESSAGES = [
  'Verificar a cota de soleira do portão de acesso principal.',
  'Ajustar o layout elétrico para coincidir com os pontos de gesso.',
  'Ligar para o cliente para agendar a entrega do Estudo Preliminar.',
  'Lucas, favor conferir o quantitativo de impermeabilização no orçamento.',
  'Yuri, atualizar o arquivo DWG com as alterações do condomínio.',
  'Revisar a espessura da alvenaria do poço do elevador.'
];

const PASTEL_COLORS = ['#FFDEE9', '#B5EAEA', '#FDF2F0', '#E3E1FA', '#DFFFF0', '#FFEBB6'];

export function useCollaboration({
  projectId,
  projectName,
  currentUserId,
  currentName,
  currentAvatar,
  activeTab,
  db,
  setDb,
  addLog,
  showToast
}: UseCollaborationOptions) {
  const [onlineUsers, setOnlineUsers] = useState<CollaborationUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [simulationActive, setSimulationActive] = useState(false);
  const [simulationSpeed, setSimulationSpeed] = useState<number>(10000); // 10s default
  const [lastSyncFromSelf, setLastSyncFromSelf] = useState<number>(0);

  const globalChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const broadcastChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const isSyncingRef = useRef(false);
  const dbRef = useRef<DB>(db);
  const currentUserIdRef = useRef<string | null>(currentUserId);

  // Keep refs up to date
  useEffect(() => {
    dbRef.current = db;
  }, [db]);

  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  // Determine current activity string
  const getCurrentActivityText = useCallback(() => {
    switch (activeTab) {
      case 'timeline': return 'Visualizando Cronograma';
      case 'gallery': return 'Navegando na Galeria';
      case 'files': return 'Gerenciando Arquivos';
      case 'data': return 'Analisando Dados';
      case 'viabilidade': return 'Revisando Contratos';
      case 'financeiro': return 'Atualizando Financeiro';
      case 'notas': return 'Postando Notas';
      case 'colaborador': return 'Visualizando Equipe';
      default: return 'No Dashboard';
    }
  }, [activeTab]);

  // Handle Syncing Presence
  const handlePresenceSync = useCallback((state: Record<string, unknown[]>) => {
    const list: CollaborationUser[] = [];
    for (const presences of Object.values(state)) {
      for (const p of presences as CollaborationUser[]) {
        if (p.userId) list.push(p);
      }
    }
    // Remove duplicates
    const unique = list.filter((v, i, a) => a.findIndex(t => t.userId === v.userId) === i);
    unique.sort((a, b) => a.joinedAt - b.joinedAt);
    setOnlineUsers(unique);
  }, []);

  // Set up Global Presence Channel
  useEffect(() => {
    if (!currentUserId) {
      setIsConnected(false);
      setOnlineUsers([]);
      return;
    }

    const channel = supabase.channel('presence:global', {
      config: { presence: { key: currentUserId } }
    });

    globalChannelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => handlePresenceSync(channel.presenceState()))
      .on('presence', { event: 'join' }, () => handlePresenceSync(channel.presenceState()))
      .on('presence', { event: 'leave' }, () => handlePresenceSync(channel.presenceState()))
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          await channel.track({
            userId: currentUserId,
            name: currentName,
            avatarUrl: currentAvatar,
            activeProjectId: projectId,
            activeProjectName: projectName,
            activeTab: activeTab,
            currentActivity: getCurrentActivityText(),
            joinedAt: Date.now()
          } as CollaborationUser);
        } else {
          setIsConnected(false);
        }
      });

    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
      globalChannelRef.current = null;
      setIsConnected(false);
      setOnlineUsers([]);
    };
  }, [currentUserId, currentName, currentAvatar, projectId, projectName, activeTab, getCurrentActivityText, handlePresenceSync]);

  // Set up Project Broadcast Channel
  useEffect(() => {
    if (!projectId || !currentUserId) {
      if (broadcastChannelRef.current) {
        supabase.removeChannel(broadcastChannelRef.current);
        broadcastChannelRef.current = null;
      }
      return;
    }

    const channel = supabase.channel(`project-broadcast:${projectId}`);
    broadcastChannelRef.current = channel;

    channel
      .on('broadcast', { event: 'PROJECT_SYNC' }, ({ payload }) => {
        // Prevent loopback or handling outdated syncs
        if (payload.senderId === currentUserIdRef.current) return;
        
        const incomingProject = payload.project as Project;
        const currentDb = dbRef.current;
        const localProject = currentDb.projects.find(p => p.id === Number(projectId));

        if (!localProject) return;

        // Apply if incoming has a newer updatedAt
        const localTime = new Date(localProject.updatedAt || 0).getTime();
        const incomingTime = new Date(incomingProject.updatedAt || 0).getTime();

        if (incomingTime > localTime) {
          isSyncingRef.current = true;
          setDb(prev => ({
            ...prev,
            projects: prev.projects.map(p => p.id === Number(projectId) ? incomingProject : p)
          }));
          
          showToast(
            `Sincronizado: ${payload.senderName} atualizou o projeto!`,
            payload.senderName,
            payload.senderAvatar
          );

          // Clear sync flag after state updates
          setTimeout(() => {
            isSyncingRef.current = false;
          }, 200);
        }
      })
      .subscribe();

    return () => {
      if (broadcastChannelRef.current) {
        supabase.removeChannel(broadcastChannelRef.current);
        broadcastChannelRef.current = null;
      }
    };
  }, [projectId, currentUserId, setDb, showToast]);

  // Broadcast Project Updates on Local Changes
  const broadcastProjectUpdate = useCallback((updatedProject: Project) => {
    if (!projectId || !broadcastChannelRef.current || isSyncingRef.current || !currentUserId) return;

    broadcastChannelRef.current.send({
      type: 'broadcast',
      event: 'PROJECT_SYNC',
      payload: {
        senderId: currentUserId,
        senderName: currentName,
        senderAvatar: currentAvatar,
        project: updatedProject
      }
    });
    setLastSyncFromSelf(Date.now());
  }, [projectId, currentUserId, currentName, currentAvatar]);

  // Observe activeProject changes to broadcast them
  useEffect(() => {
    if (!projectId) return;
    const activeP = db.projects.find(p => p.id === Number(projectId));
    if (activeP && !isSyncingRef.current) {
      // Debounce slightly to prevent overwhelming the broadcast channel
      const timer = setTimeout(() => {
        broadcastProjectUpdate(activeP);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [db, projectId, broadcastProjectUpdate]);

  // ----------------------------------------------------
  // SIMULATION (BOTS / OFFICE TASK FORCE MODE)
  // ----------------------------------------------------
  const [simulatedBots, setSimulatedBots] = useState<CollaborationUser[]>([]);

  useEffect(() => {
    if (!simulationActive) {
      setSimulatedBots([]);
      return;
    }

    // Spawn bots on simulation start
    const spawned: CollaborationUser[] = BOTS.map((b, i) => ({
      userId: `bot-${i}`,
      name: b.name,
      avatarUrl: b.avatar,
      activeProjectId: projectId,
      activeProjectName: projectName,
      activeTab: BOT_TABS[i % BOT_TABS.length],
      currentActivity: BOT_ACTIVITIES[i % BOT_ACTIVITIES.length],
      joinedAt: Date.now() - (i * 1000),
      isVirtual: true
    }));

    setSimulatedBots(spawned);
  }, [simulationActive, projectId, projectName]);

  // Simulation Actions Timer
  useEffect(() => {
    if (!simulationActive || simulatedBots.length === 0 || !projectId) return;

    const timer = setInterval(() => {
      // Pick random bot
      const botIndex = Math.floor(Math.random() * simulatedBots.length);
      const bot = simulatedBots[botIndex];

      // Pick random action type
      const actionType = Math.floor(Math.random() * 4); // 0: Change Presence, 1: Mural Log, 2: Sticky Note, 3: Task Check

      const currentDb = dbRef.current;
      const project = currentDb.projects.find(p => p.id === Number(projectId));
      if (!project) return;

      if (actionType === 0) {
        // Change presence (tab/activity)
        const nextTab = BOT_TABS[Math.floor(Math.random() * BOT_TABS.length)];
        const nextActivity = BOT_ACTIVITIES[Math.floor(Math.random() * BOT_ACTIVITIES.length)];
        
        setSimulatedBots(prev => prev.map(b => 
          b.userId === bot.userId 
            ? { ...b, activeTab: nextTab, currentActivity: nextActivity }
            : b
        ));
      } 
      else if (actionType === 1) {
        // Mural Log Activity
        const message = BOT_FEED_MESSAGES[Math.floor(Math.random() * BOT_FEED_MESSAGES.length)];
        const now = new Date();
        const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        
        const newActivity: Activity = {
          date: dateStr,
          author: bot.name.toUpperCase(),
          text: message.toUpperCase()
        };

        const updatedProject = {
          ...project,
          activities: [...project.activities, newActivity].slice(-500),
          updatedAt: new Date().toISOString()
        };

        setDb(prev => ({
          ...prev,
          projects: prev.projects.map(p => p.id === project.id ? updatedProject : p)
        }));

        showToast(`${bot.name}: ${message}`, bot.name, bot.avatarUrl);
      }
      else if (actionType === 2) {
        // Create Sticky Note
        const message = BOT_NOTE_MESSAGES[Math.floor(Math.random() * BOT_NOTE_MESSAGES.length)];
        const recipient = currentDb.team[Math.floor(Math.random() * currentDb.team.length)] || 'Equipe';
        
        const newNote: Note = {
          id: `note-sim-${Date.now()}`,
          author: bot.name,
          recipient,
          text: message,
          color: PASTEL_COLORS[Math.floor(Math.random() * PASTEL_COLORS.length)],
          createdAt: new Date().toISOString(),
          status: 'pending'
        };

        const updatedProject = {
          ...project,
          notes: [newNote, ...(project.notes || [])],
          updatedAt: new Date().toISOString()
        };

        setDb(prev => ({
          ...prev,
          projects: prev.projects.map(p => p.id === project.id ? updatedProject : p)
        }));

        showToast(`${bot.name} criou um Post-it para ${recipient}`, bot.name, bot.avatarUrl);
      }
      else if (actionType === 3) {
        // Complete/Toggle Task in Cronograma
        // Find a random scope and random incomplete event
        const walkingScopes = project.scopes.filter(s => s.events && s.events.some(e => !e.completed));
        if (walkingScopes.length > 0) {
          const scope = walkingScopes[Math.floor(Math.random() * walkingScopes.length)];
          const incompleteEvents = scope.events.filter(e => !e.completed);
          
          if (incompleteEvents.length > 0) {
            const event = incompleteEvents[Math.floor(Math.random() * incompleteEvents.length)];
            
            // Toggle event completion
            const updatedScopes = project.scopes.map(s => {
              if (s.id === scope.id) {
                return {
                  ...s,
                  events: s.events.map(ev => 
                    ev.id === event.id 
                      ? { ...ev, completed: true } 
                      : ev
                  )
                };
              }
              return s;
            });

            // Also log this in activities
            const now = new Date();
            const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            const newActivity: Activity = {
              date: dateStr,
              author: bot.name.toUpperCase(),
              text: `CONCLUIU AÇÃO: ${event.title.toUpperCase()} NA DISCIPLINA ${scope.name}`
            };

            const updatedProject = {
              ...project,
              scopes: updatedScopes,
              activities: [...project.activities, newActivity].slice(-500),
              updatedAt: new Date().toISOString()
            };

            setDb(prev => ({
              ...prev,
              projects: prev.projects.map(p => p.id === project.id ? updatedProject : p)
            }));

            showToast(`${bot.name} concluiu a ação "${event.title}" no cronograma`, bot.name, bot.avatarUrl);
          }
        }
      }

    }, simulationSpeed);

    return () => clearInterval(timer);
  }, [simulationActive, simulatedBots, projectId, setDb, simulationSpeed, showToast]);

  // Combine real presence with simulated bots
  const combinedOnlineUsers = useMemo(() => {
    const list = [...onlineUsers];
    if (simulationActive) {
      simulatedBots.forEach(b => {
        if (!list.some(u => u.userId === b.userId)) {
          list.push(b);
        }
      });
    }
    return list;
  }, [onlineUsers, simulatedBots, simulationActive]);

  return {
    onlineUsers: combinedOnlineUsers,
    realOnlineCount: onlineUsers.length,
    isConnected,
    simulationActive,
    setSimulationActive,
    simulationSpeed,
    setSimulationSpeed,
    lastSyncFromSelf
  };
}
