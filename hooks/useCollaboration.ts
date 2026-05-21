import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { DB, Project, Note, Activity, Company } from '../types';

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

// Helper functions for merging databases
function mergeProjects(local: Project[], incoming: Project[]): Project[] {
  const merged = [...local];
  incoming.forEach(incProj => {
    const locIdx = merged.findIndex(p => p.id === incProj.id);
    if (locIdx >= 0) {
      const locProj = merged[locIdx];
      const locTime = new Date(locProj.updatedAt || 0).getTime();
      const incTime = new Date(incProj.updatedAt || 0).getTime();
      if (incTime > locTime) {
        merged[locIdx] = incProj;
      }
    } else {
      merged.push(incProj);
    }
  });
  return merged;
}

function mergeCompanies(local: Company[], incoming: Company[]): Company[] {
  const merged = [...local];
  incoming.forEach(incComp => {
    const locIdx = merged.findIndex(c => c.id === incComp.id);
    if (locIdx >= 0) {
      merged[locIdx] = incComp;
    } else {
      merged.push(incComp);
    }
  });
  return merged;
}

function mergeTeam(local: string[], incoming: string[]): string[] {
  return Array.from(new Set([...local, ...incoming]));
}

function mergeDisciplines(local: any[], incoming: any[]): any[] {
  const merged = [...local];
  incoming.forEach(incDisc => {
    const locIdx = merged.findIndex(d => d.code === incDisc.code);
    if (locIdx >= 0) {
      merged[locIdx] = incDisc;
    } else {
      merged.push(incDisc);
    }
  });
  return merged;
}

function mergeViabilities(local: any[] = [], incoming: any[] = []): any[] {
  const merged = [...local];
  incoming.forEach(incViab => {
    const locIdx = merged.findIndex(v => v.id === incViab.id);
    if (locIdx >= 0) {
      const locTime = new Date(merged[locIdx].createdAt || 0).getTime();
      const incTime = new Date(incViab.createdAt || 0).getTime();
      const locVers = merged[locIdx].versions?.length || 0;
      const incVers = incViab.versions?.length || 0;
      if (incVers > locVers || incTime > locTime) {
        merged[locIdx] = incViab;
      }
    } else {
      merged.push(incViab);
    }
  });
  return merged;
}

function mergeLods(local: string[] = [], incoming: string[] = []): string[] {
  return Array.from(new Set([...local, ...incoming]));
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
  const dbRef = useRef<DB>(db);
  const currentUserIdRef = useRef<string | null>(currentUserId);

  // Refs for tracking local changes and avoiding loopback sync broadcasts
  const prevProjectsRef = useRef<Project[]>(db.projects);
  const prevCompaniesRef = useRef<Company[]>(db.companies);
  const prevDisciplinesRef = useRef<any[]>(db.disciplines);
  const prevTeamRef = useRef<string[]>(db.team);
  const prevViabilitiesRef = useRef<any[]>(db.viabilities || []);
  const prevLodsRef = useRef<string[]>(db.lods);

  // Refs for tracking network-received item IDs and list flags to prevent feedback loop
  const receivedProjectsRef = useRef<Set<number>>(new Set());
  const receivedCompaniesRef = useRef<Set<number>>(new Set());
  const receivedViabilitiesRef = useRef<Set<string>>(new Set());
  const receivedDisciplinesRef = useRef<boolean>(false);
  const receivedTeamRef = useRef<boolean>(false);
  const receivedLodsRef = useRef<boolean>(false);

  // Ref to always have the latest online users inside callbacks without re-subscribing
  const onlineUsersRef = useRef<CollaborationUser[]>([]);
  useEffect(() => {
    onlineUsersRef.current = onlineUsers;
  }, [onlineUsers]);

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

  // Set up Global Channel (Presence + Sync Broadcast)
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
      .on('broadcast', { event: 'WORKSPACE_PROJECT_UPDATED' }, ({ payload }) => {
        if (payload.senderId === currentUserIdRef.current) return;
        if (payload.targetUserId && payload.targetUserId !== currentUserIdRef.current) return;
        const incoming = payload.project as Project;
        
        // Add to tracking set so we skip broadcasting it back
        receivedProjectsRef.current.add(incoming.id);

        setDb(prev => {
          const exists = prev.projects.find(p => p.id === incoming.id);
          if (!exists) {
            if (!payload.isBootstrap) {
              showToast(`Projeto criado: ${incoming.name}`, payload.senderName, payload.senderAvatar);
            }
            return { ...prev, projects: [...prev.projects, incoming] };
          }
          const locTime = new Date(exists.updatedAt || 0).getTime();
          const incTime = new Date(incoming.updatedAt || 0).getTime();
          if (incTime > locTime) {
            if (!payload.isBootstrap) {
              showToast(`Projeto atualizado: ${incoming.name}`, payload.senderName, payload.senderAvatar);
            }
            return {
              ...prev,
              projects: prev.projects.map(p => p.id === incoming.id ? incoming : p)
            };
          }
          // If state didn't change, clean from tracking set
          receivedProjectsRef.current.delete(incoming.id);
          return prev;
        });
      })
      .on('broadcast', { event: 'WORKSPACE_PROJECT_DELETED' }, ({ payload }) => {
        if (payload.senderId === currentUserIdRef.current) return;
        if (payload.targetUserId && payload.targetUserId !== currentUserIdRef.current) return;
        
        receivedProjectsRef.current.add(payload.projectId);

        setDb(prev => {
          const exists = prev.projects.some(p => p.id === payload.projectId);
          if (!exists) {
            receivedProjectsRef.current.delete(payload.projectId);
            return prev;
          }
          return {
            ...prev,
            projects: prev.projects.filter(p => p.id !== payload.projectId),
            activeProjectId: prev.activeProjectId === payload.projectId ? null : prev.activeProjectId
          };
        });
      })
      .on('broadcast', { event: 'WORKSPACE_COMPANY_UPDATED' }, ({ payload }) => {
        if (payload.senderId === currentUserIdRef.current) return;
        if (payload.targetUserId && payload.targetUserId !== currentUserIdRef.current) return;
        const incoming = payload.company as Company;
        
        receivedCompaniesRef.current.add(incoming.id);

        setDb(prev => {
          const exists = prev.companies.some(c => c.id === incoming.id);
          if (!exists) {
            return { ...prev, companies: [...prev.companies, incoming] };
          }
          return {
            ...prev,
            companies: prev.companies.map(c => c.id === incoming.id ? incoming : c)
          };
        });
      })
      .on('broadcast', { event: 'WORKSPACE_COMPANY_DELETED' }, ({ payload }) => {
        if (payload.senderId === currentUserIdRef.current) return;
        if (payload.targetUserId && payload.targetUserId !== currentUserIdRef.current) return;
        
        receivedCompaniesRef.current.add(payload.companyId);

        setDb(prev => {
          const exists = prev.companies.some(c => c.id === payload.companyId);
          if (!exists) {
            receivedCompaniesRef.current.delete(payload.companyId);
            return prev;
          }
          return {
            ...prev,
            companies: prev.companies.filter(c => c.id !== payload.companyId),
            activeCompanyId: prev.activeCompanyId === payload.companyId ? null : prev.activeCompanyId
          };
        });
      })
      .on('broadcast', { event: 'WORKSPACE_DISCIPLINES_UPDATED' }, ({ payload }) => {
        if (payload.senderId === currentUserIdRef.current) return;
        if (payload.targetUserId && payload.targetUserId !== currentUserIdRef.current) return;
        
        receivedDisciplinesRef.current = true;

        setDb(prev => {
          return { ...prev, disciplines: payload.disciplines };
        });
      })
      .on('broadcast', { event: 'WORKSPACE_TEAM_UPDATED' }, ({ payload }) => {
        if (payload.senderId === currentUserIdRef.current) return;
        if (payload.targetUserId && payload.targetUserId !== currentUserIdRef.current) return;
        
        receivedTeamRef.current = true;

        setDb(prev => {
          return { ...prev, team: payload.team };
        });
      })
      .on('broadcast', { event: 'WORKSPACE_VIABILITY_UPDATED' }, ({ payload }) => {
        if (payload.senderId === currentUserIdRef.current) return;
        if (payload.targetUserId && payload.targetUserId !== currentUserIdRef.current) return;
        const incoming = payload.viability;
        
        receivedViabilitiesRef.current.add(incoming.id);

        setDb(prev => {
          const viabs = prev.viabilities || [];
          const exists = viabs.some(v => v.id === incoming.id);
          if (!exists) {
            return { ...prev, viabilities: [...viabs, incoming] };
          }
          return {
            ...prev,
            viabilities: viabs.map(v => v.id === incoming.id ? incoming : v)
          };
        });
      })
      .on('broadcast', { event: 'WORKSPACE_VIABILITY_DELETED' }, ({ payload }) => {
        if (payload.senderId === currentUserIdRef.current) return;
        if (payload.targetUserId && payload.targetUserId !== currentUserIdRef.current) return;
        
        receivedViabilitiesRef.current.add(payload.viabilityId);

        setDb(prev => {
          const viabs = prev.viabilities || [];
          const exists = viabs.some(v => v.id === payload.viabilityId);
          if (!exists) {
            receivedViabilitiesRef.current.delete(payload.viabilityId);
            return prev;
          }
          return {
            ...prev,
            viabilities: viabs.filter(v => v.id !== payload.viabilityId)
          };
        });
      })
      .on('broadcast', { event: 'WORKSPACE_LODS_UPDATED' }, ({ payload }) => {
        if (payload.senderId === currentUserIdRef.current) return;
        if (payload.targetUserId && payload.targetUserId !== currentUserIdRef.current) return;
        
        receivedLodsRef.current = true;

        setDb(prev => {
          return { ...prev, lods: payload.lods };
        });
      })
      .on('broadcast', { event: 'REQUEST_DB_SYNC' }, async ({ payload }) => {
        if (payload.senderId === currentUserIdRef.current) return;
        
        // Find the oldest active real user online
        const realUsers = onlineUsersRef.current.filter(u => !u.isVirtual && u.userId !== payload.senderId);
        const oldestUser = realUsers[0];
        
        // If I am not the oldest user (and oldestUser exists), do not respond to prevent duplicate broadcasting
        if (oldestUser && oldestUser.userId !== currentUserIdRef.current) {
          return;
        }

        const currentDb = dbRef.current;
        const senderId = payload.senderId;

        // Send companies chunked
        for (const comp of currentDb.companies) {
          globalChannelRef.current?.send({
            type: 'broadcast',
            event: 'WORKSPACE_COMPANY_UPDATED',
            payload: {
              senderId: currentUserIdRef.current,
              company: comp,
              isBootstrap: true,
              targetUserId: senderId
            }
          });
          await new Promise(resolve => setTimeout(resolve, 30));
        }

        // Send projects chunked
        for (const proj of currentDb.projects) {
          globalChannelRef.current?.send({
            type: 'broadcast',
            event: 'WORKSPACE_PROJECT_UPDATED',
            payload: {
              senderId: currentUserIdRef.current,
              senderName: currentName,
              senderAvatar: currentAvatar,
              project: proj,
              isBootstrap: true,
              targetUserId: senderId
            }
          });
          await new Promise(resolve => setTimeout(resolve, 30));
        }

        // Send viabilities chunked
        for (const viab of (currentDb.viabilities || [])) {
          globalChannelRef.current?.send({
            type: 'broadcast',
            event: 'WORKSPACE_VIABILITY_UPDATED',
            payload: {
              senderId: currentUserIdRef.current,
              viability: viab,
              isBootstrap: true,
              targetUserId: senderId
            }
          });
          await new Promise(resolve => setTimeout(resolve, 30));
        }

        // Send disciplines
        globalChannelRef.current?.send({
          type: 'broadcast',
          event: 'WORKSPACE_DISCIPLINES_UPDATED',
          payload: {
            senderId: currentUserIdRef.current,
            disciplines: currentDb.disciplines,
            isBootstrap: true,
            targetUserId: senderId
          }
        });
        await new Promise(resolve => setTimeout(resolve, 30));

        // Send team
        globalChannelRef.current?.send({
          type: 'broadcast',
          event: 'WORKSPACE_TEAM_UPDATED',
          payload: {
            senderId: currentUserIdRef.current,
            team: currentDb.team,
            isBootstrap: true,
            targetUserId: senderId
          }
        });
        await new Promise(resolve => setTimeout(resolve, 30));

        // Send lods
        globalChannelRef.current?.send({
          type: 'broadcast',
          event: 'WORKSPACE_LODS_UPDATED',
          payload: {
            senderId: currentUserIdRef.current,
            lods: currentDb.lods,
            isBootstrap: true,
            targetUserId: senderId
          }
        });
        await new Promise(resolve => setTimeout(resolve, 30));

        // Broadcast completion event to the joining client
        globalChannelRef.current?.send({
          type: 'broadcast',
          event: 'WORKSPACE_SYNC_COMPLETED',
          payload: {
            senderId: currentUserIdRef.current,
            targetUserId: senderId
          }
        });
      })
      .on('broadcast', { event: 'WORKSPACE_SYNC_COMPLETED' }, ({ payload }) => {
        if (payload.senderId === currentUserIdRef.current) return;
        if (payload.targetUserId && payload.targetUserId !== currentUserIdRef.current) return;
        
        showToast("Base de dados sincronizada com a equipe!", "Sistema", "https://ui-avatars.com/api/?name=Enigami&background=FF5722&color=fff");
      })
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

          // Request initial database synchronization
          channel.send({
            type: 'broadcast',
            event: 'REQUEST_DB_SYNC',
            payload: { senderId: currentUserId }
          });
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
  }, [currentUserId, currentName, currentAvatar, projectId, projectName, activeTab, getCurrentActivityText, handlePresenceSync, setDb, showToast]);

  // Observe all local DB changes and broadcast them
  useEffect(() => {
    if (!isConnected || !globalChannelRef.current || !currentUserId) return;

    // Detect Project changes
    if (db.projects !== prevProjectsRef.current) {
      const prev = prevProjectsRef.current;
      const curr = db.projects;

      // 1. Check for deletions
      const deleted = prev.filter(p => !curr.some(c => c.id === p.id));
      deleted.forEach(p => {
        if (receivedProjectsRef.current.has(p.id)) {
          receivedProjectsRef.current.delete(p.id);
          return; // Skip broadcasting deletion
        }
        globalChannelRef.current?.send({
          type: 'broadcast',
          event: 'WORKSPACE_PROJECT_DELETED',
          payload: { senderId: currentUserId, projectId: p.id }
        });
      });

      // 2. Check for updates / creations
      curr.forEach(p => {
        if (receivedProjectsRef.current.has(p.id)) {
          receivedProjectsRef.current.delete(p.id);
          return; // Skip broadcasting updates received from the network
        }

        const prevProj = prev.find(pr => pr.id === p.id);
        if (!prevProj || new Date(p.updatedAt || 0).getTime() > new Date(prevProj.updatedAt || 0).getTime()) {
          globalChannelRef.current?.send({
            type: 'broadcast',
            event: 'WORKSPACE_PROJECT_UPDATED',
            payload: {
              senderId: currentUserId,
              senderName: currentName,
              senderAvatar: currentAvatar,
              project: p
            }
          });
          setLastSyncFromSelf(Date.now());
        }
      });

      prevProjectsRef.current = curr;
    }

    // Detect Company changes
    if (db.companies !== prevCompaniesRef.current) {
      const prev = prevCompaniesRef.current;
      const curr = db.companies;

      // Deletions
      const deleted = prev.filter(c => !curr.some(cc => cc.id === c.id));
      deleted.forEach(c => {
        if (receivedCompaniesRef.current.has(c.id)) {
          receivedCompaniesRef.current.delete(c.id);
          return;
        }
        globalChannelRef.current?.send({
          type: 'broadcast',
          event: 'WORKSPACE_COMPANY_DELETED',
          payload: { senderId: currentUserId, companyId: c.id }
        });
      });

      // Updates / creations
      curr.forEach(c => {
        if (receivedCompaniesRef.current.has(c.id)) {
          receivedCompaniesRef.current.delete(c.id);
          return;
        }

        const prevComp = prev.find(cc => cc.id === c.id);
        if (!prevComp || JSON.stringify(c) !== JSON.stringify(prevComp)) {
          globalChannelRef.current?.send({
            type: 'broadcast',
            event: 'WORKSPACE_COMPANY_UPDATED',
            payload: { senderId: currentUserId, company: c }
          });
        }
      });

      prevCompaniesRef.current = curr;
    }

    // Detect Disciplines changes
    if (db.disciplines !== prevDisciplinesRef.current) {
      const curr = db.disciplines;
      if (receivedDisciplinesRef.current) {
        receivedDisciplinesRef.current = false;
      } else {
        if (JSON.stringify(curr) !== JSON.stringify(prevDisciplinesRef.current)) {
          globalChannelRef.current?.send({
            type: 'broadcast',
            event: 'WORKSPACE_DISCIPLINES_UPDATED',
            payload: { senderId: currentUserId, disciplines: curr }
          });
        }
      }
      prevDisciplinesRef.current = curr;
    }

    // Detect Team changes
    if (db.team !== prevTeamRef.current) {
      const curr = db.team;
      if (receivedTeamRef.current) {
        receivedTeamRef.current = false;
      } else {
        if (JSON.stringify(curr) !== JSON.stringify(prevTeamRef.current)) {
          globalChannelRef.current?.send({
            type: 'broadcast',
            event: 'WORKSPACE_TEAM_UPDATED',
            payload: { senderId: currentUserId, team: curr }
          });
        }
      }
      prevTeamRef.current = curr;
    }

    // Detect Viabilities changes
    const currViab = db.viabilities || [];
    if (currViab !== prevViabilitiesRef.current) {
      const prev = prevViabilitiesRef.current;
      
      // Deletions
      const deleted = prev.filter(v => !currViab.some(vv => vv.id === v.id));
      deleted.forEach(v => {
        if (receivedViabilitiesRef.current.has(v.id)) {
          receivedViabilitiesRef.current.delete(v.id);
          return;
        }
        globalChannelRef.current?.send({
          type: 'broadcast',
          event: 'WORKSPACE_VIABILITY_DELETED',
          payload: { senderId: currentUserId, viabilityId: v.id }
        });
      });

      // Updates / creations
      currViab.forEach(v => {
        if (receivedViabilitiesRef.current.has(v.id)) {
          receivedViabilitiesRef.current.delete(v.id);
          return;
        }

        const prevV = prev.find(vv => vv.id === v.id);
        if (!prevV || JSON.stringify(v) !== JSON.stringify(prevV)) {
          globalChannelRef.current?.send({
            type: 'broadcast',
            event: 'WORKSPACE_VIABILITY_UPDATED',
            payload: { senderId: currentUserId, viability: v }
          });
        }
      });

      prevViabilitiesRef.current = currViab;
    }

    // Detect Lods changes
    if (db.lods !== prevLodsRef.current) {
      const curr = db.lods;
      if (receivedLodsRef.current) {
        receivedLodsRef.current = false;
      } else {
        if (JSON.stringify(curr) !== JSON.stringify(prevLodsRef.current)) {
          globalChannelRef.current?.send({
            type: 'broadcast',
            event: 'WORKSPACE_LODS_UPDATED',
            payload: { senderId: currentUserId, lods: curr }
          });
        }
      }
      prevLodsRef.current = curr;
    }

  }, [db, isConnected, currentUserId, currentName, currentAvatar]);

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
