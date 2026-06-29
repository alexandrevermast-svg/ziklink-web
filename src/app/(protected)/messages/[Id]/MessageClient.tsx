// MessageClient.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import { Send, ArrowLeft } from 'lucide-react';
import { MessageWithProfile, ParticipantWithProfile } from '../type';
import ReportButton from '@/components/ReportButton';

interface MessageClientProps {
  conversationId: string;
  user: User;
  initialMessages: MessageWithProfile[];
  conversationTitle: string;
  participants: ParticipantWithProfile[];
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function Avatar({ username }: { username: string }) {
  const initials = username ? username.slice(0, 2).toUpperCase() : '?';
  return (
    <div className="h-7 w-7 rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px] font-semibold shrink-0">
      {initials}
    </div>
  );
}

const MessageClient: React.FC<MessageClientProps> = ({
  conversationId,
  user,
  initialMessages,
  conversationTitle,
  participants,
}) => {
  const supabase = createClient();
  const router = useRouter();
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<MessageWithProfile[]>(initialMessages);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ── Realtime ──────────────────────────────────────────────────────────
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
          const newMsg = payload.new as Omit<MessageWithProfile, 'profiles'>;
          const senderParticipant = participants.find((p) => p.user_id === newMsg.user_id);
          const profile = senderParticipant?.profiles || { username: "Inconnu" }; // ✅ Valeur par défaut

          const messageWithProfile: MessageWithProfile = {
            ...newMsg,
            profiles: profile, // ✅ Toujours un objet MinimalProfile
          };

          setMessages((currentMessages) => {
            if (currentMessages.some((msg) => msg.id === messageWithProfile.id)) {
              return currentMessages;
            }
            return [...currentMessages, messageWithProfile];
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId, participants]);

  // ── Scroll auto ───────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Envoi ─────────────────────────────────────────────────────────────
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = newMessage.trim();
    if (!content || isSending) return;
    setIsSending(true);
    const { error } = await supabase.from('messages').insert({
      content,
      conversation_id: conversationId,
      user_id: user.id,
    });
    if (error) {
      console.error('Erreur lors de l\'envoi du message :', error.message);
      alert('Impossible d\'envoyer le message.');
    } else {
      setNewMessage('');
    }
    setIsSending(false);
  };

  // ── Groupement des messages consécutifs du même expéditeur ────────────
  const grouped: { userId: string; username: string; items: MessageWithProfile[] }[] = [];
  for (const msg of messages) {
    const username = msg.profiles?.username ?? 'Utilisateur'; // ✅ Valeur par défaut
    const last = grouped[grouped.length - 1];
    if (last && last.userId === msg.user_id) {
      last.items.push(msg);
    } else {
      grouped.push({ userId: msg.user_id, username, items: [msg] });
    }
  }

  // ── Rendu ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-dvh">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b bg-white shadow-sm shrink-0">
        <button
          onClick={() => router.back()}
          className="p-1.5 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors shrink-0"
          aria-label="Retour"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <h1 className="text-base font-semibold text-gray-900 truncate">{conversationTitle}</h1>
        </div>
      </header>

      {/* Zone messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50">
        {messages.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-8">
            Aucun message — commence la conversation ! 💬
          </p>
        )}

        {grouped.map((group, gi) => {
          const isMe = group.userId === user.id;
          return (
            <div key={gi} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
              {!isMe && (
                <div className="shrink-0 mt-auto mb-1">
                  <Avatar username={group.username} />
                </div>
              )}

              <div className={`flex flex-col gap-0.5 max-w-[75%] group ${isMe ? 'items-end' : 'items-start'}`}>
                {!isMe && (
                  <span className="text-xs text-gray-500 ml-1 mb-0.5 font-medium">
                    {group.username}
                  </span>
                )}

                {group.items.map((msg, mi) => {
                  const isLast = mi === group.items.length - 1;
                  return (
                    <div key={msg.id} className="flex flex-col gap-0.5">
                      <div className={`flex items-end gap-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                        <div
                          className={`px-3 py-2 text-sm leading-relaxed rounded-2xl ${
                            isMe
                              ? 'bg-blue-600 text-white rounded-tr-sm'
                              : 'bg-white text-gray-800 border border-gray-200 shadow-sm rounded-tl-sm'
                          }`}
                        >
                          {msg.content}
                        </div>
                        {!isMe && (
                          <ReportButton
                            targetType="message"
                            targetId={msg.id}
                            variant="icon"
                            className="opacity-0 group-hover:opacity-100 shrink-0 mb-1 transition-opacity"
                          />
                        )}
                      </div>
                      {isLast && (
                        <span className={`text-[10px] text-gray-400 mx-1 ${isMe ? 'text-right' : 'text-left'}`}>
                          {formatTime(msg.created_at)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Barre de saisie */}
      <form
        onSubmit={handleSendMessage}
        className="flex items-center gap-2 border-t border-gray-100 bg-white px-4 py-3 shrink-0"
      >
        <input
          type="text"
          placeholder="Écrire un message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          disabled={isSending}
          className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-300 transition-all disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isSending}
          className="h-9 w-9 flex items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-40 shrink-0"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
};

export default MessageClient;