import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface PresenceUser {
  userId:    string;
  name:      string;
  avatarUrl: string;
  joinedAt:  number;
}

interface UsePresenceOptions {
  projectId:      string | null;
  currentUserId:  string | null;
  currentName:    string;
  currentAvatar:  string;
}

export function usePresence({
  projectId,
  currentUserId,
  currentName,
  currentAvatar,
}: UsePresenceOptions) {
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const syncPresence = useCallback((state: Record<string, unknown[]>) => {
    const users: PresenceUser[] = [];
    for (const presences of Object.values(state)) {
      for (const p of presences as PresenceUser[]) {
        if (p.userId) users.push(p);
      }
    }
    users.sort((a, b) => a.joinedAt - b.joinedAt);
    setOnlineUsers(users);
  }, []);

  useEffect(() => {
    if (!projectId || !currentUserId) {
      setOnlineUsers([]);
      setIsConnected(false);
      return;
    }

    const channel = supabase.channel(`presence:project:${projectId}`, {
      config: { presence: { key: currentUserId } },
    });

    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => syncPresence(channel.presenceState()))
      .on('presence', { event: 'join' }, () => syncPresence(channel.presenceState()))
      .on('presence', { event: 'leave' }, () => syncPresence(channel.presenceState()))
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          await channel.track({
            userId:    currentUserId,
            name:      currentName,
            avatarUrl: currentAvatar,
            joinedAt:  Date.now(),
          } as PresenceUser);
        } else {
          setIsConnected(false);
        }
      });

    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
      channelRef.current = null;
      setIsConnected(false);
      setOnlineUsers([]);
    };
  }, [projectId, currentUserId, currentName, currentAvatar, syncPresence]);

  return { onlineUsers, isConnected };
}
