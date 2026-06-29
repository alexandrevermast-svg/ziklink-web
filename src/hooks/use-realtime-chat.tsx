'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { MessageWithProfile, ParticipantWithProfile } from '@/app/(protected)/messages/type';
import type { User } from '@supabase/supabase-js';

// ✅ Ajoute participants aux props
interface UseRealtimeChatProps {
  conversationId: string;
  initialMessages: MessageWithProfile[];
  currentUser: User;
  participants: ParticipantWithProfile[];
}

export function useRealtimeChat({
  conversationId,
  initialMessages,
  currentUser,
  participants, // ✅ Reçu en prop
}: UseRealtimeChatProps) {
  const supabase = createClient();
  const [messages, setMessages] = useState<MessageWithProfile[]>(initialMessages);
  const [isConnected, setIsConnected] = useState(false);

  // 1) Abonnement Realtime
  useEffect(() => {
    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          // ✅ Typage explicite
          const newRow = payload.new as {
            id: string;
            content: string;
            created_at: string;
            user_id: string;
          };

          // ✅ Récupère le profil depuis participants
          const senderParticipant = participants.find((p) => p.user_id === newRow.user_id);
          const profile = senderParticipant?.profiles || { username: "Inconnu" };

          const newMessage: MessageWithProfile = {
            id: newRow.id,
            content: newRow.content,
            created_at: newRow.created_at,
            user_id: newRow.user_id,
            profiles: profile, // ✅ Toujours un objet MinimalProfile
          };

          setMessages((current) => {
            if (current.some((m) => m.id === newMessage.id)) {
              return current;
            }
            return [...current, newMessage];
          });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, conversationId, participants]); // ✅ Ajoute participants aux dépendances

  // 2) Fonction d'envoi
  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed) return;

      const { error } = await supabase.from('messages').insert({
        content: trimmed,
        user_id: currentUser.id,
        conversation_id: conversationId,
      });

      if (error) {
        console.error('Erreur lors de l’envoi du message :', error);
      }
    },
    [supabase, currentUser.id, conversationId]
  );

  return { messages, sendMessage, isConnected };
}