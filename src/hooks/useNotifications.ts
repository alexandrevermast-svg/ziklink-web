'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface Notification {
  id: string;
  type: 'message' | 'jam_accepted' | 'jam_turn';
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
}

export function useNotifications(userId: string | null) {
  const supabase = createClient();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30);
    const notifs = (data ?? []) as Notification[];
    setNotifications(notifs);
    setUnreadCount(notifs.filter((n) => !n.read).length);
  }, [userId]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Realtime : écoute les nouvelles notifications
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        const notif = payload.new as Notification;
        setNotifications((prev) => [notif, ...prev]);
        setUnreadCount((prev) => prev + 1);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const markAllRead = useCallback(async () => {
    if (!userId) return;
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }, [userId]);

  const markRead = useCallback(async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  return { notifications, unreadCount, markAllRead, markRead, refetch: fetchNotifications };
}