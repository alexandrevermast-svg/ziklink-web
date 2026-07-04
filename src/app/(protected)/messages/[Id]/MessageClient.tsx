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
    <div
      className="h-7 w-7 rounded-full flex items-center justify-center text-white text-[10px] font-semibold shrink-0"
      style={{ background: 'linear-gradient(135deg, #C084FC, #818CF8)' }}
    >
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
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        const newMsg = payload.new as Omit<MessageWithProfile, 'profiles'>;
        const senderParticipant = participants.find((p) => p.user_id === newMsg.user_id);
        const profile = senderParticipant?.profiles || { username: 'Inconnu' };
        const messageWithProfile: MessageWithProfile = { ...newMsg, profiles: profile };
        setMessages((prev) => {
          if (prev.some((m) => m.id === messageWithProfile.id)) return prev;
          return [...prev, messageWithProfile];
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId, participants]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
      console.error('Erreur envoi:', error.message);
    } else {
      setNewMessage('');
    }
    setIsSending(false);
  };

  // ── Groupement des messages consécutifs ───────────────────────────────
  const grouped: { userId: string; username: string; items: MessageWithProfile[] }[] = [];
  for (const msg of messages) {
    const username = msg.profiles?.username ?? 'Utilisateur';
    const last = grouped[grouped.length - 1];
    if (last && last.userId === msg.user_id) {
      last.items.push(msg);
    } else {
      grouped.push({ userId: msg.user_id, username, items: [msg] });
    }
  }

  return (
    <div
      className="flex flex-col h-dvh"
      style={{ background: 'var(--zik-bg)' }}
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header
        className="flex items-center gap-3 px-4 shrink-0"
        style={{
          height: 56,
          background: 'rgba(14,11,22,0.92)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <button
          onClick={() => router.back()}
          className="flex items-center justify-center rounded-full transition-all duration-150 shrink-0"
          style={{
            width: 32,
            height: 32,
            background: 'rgba(255,255,255,0.06)',
            color: 'rgba(255,255,255,0.55)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
          aria-label="Retour"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <div className="flex-1 min-w-0">
          <h1
            className="text-base font-semibold truncate"
            style={{ color: '#F1F0F6', letterSpacing: '-0.02em' }}
          >
            {conversationTitle}
          </h1>
        </div>
      </header>

      {/* ── Zone messages ──────────────────────────────────────────────── */}
      <div
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
        style={{ background: 'var(--zik-bg)' }}
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.25)' }}>
              Aucun message — commence la conversation ! 💬
            </p>
          </div>
        )}

        {grouped.map((group, gi) => {
          const isMe = group.userId === user.id;
          return (
            <div key={gi} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
              {/* Avatar (autres uniquement) */}
              {!isMe && (
                <div className="shrink-0 mt-auto mb-4">
                  <Avatar username={group.username} />
                </div>
              )}

              <div className={`flex flex-col gap-1 max-w-[75%] group ${isMe ? 'items-end' : 'items-start'}`}>
                {/* Nom expéditeur */}
                {!isMe && (
                  <span
                    className="text-[11px] ml-1 mb-0.5 font-medium"
                    style={{ color: '#C084FC' }}
                  >
                    {group.username}
                  </span>
                )}

                {group.items.map((msg, mi) => {
                  const isLast = mi === group.items.length - 1;
                  const isFirst = mi === 0;
                  return (
                    <div key={msg.id} className="flex flex-col gap-0.5">
                      <div className={`flex items-end gap-1.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                        {/* Bulle */}
                        <div
                          className="px-3.5 py-2 text-sm leading-relaxed"
                          style={{
                            ...(isMe ? {
                              background: 'linear-gradient(135deg, #C084FC, #818CF8)',
                              color: '#fff',
                              borderRadius: isFirst
                                ? '18px 4px 18px 18px'
                                : isLast
                                ? '4px 18px 18px 18px'
                                : '4px 4px 4px 4px',
                            } : {
                              background: '#1A1628',
                              color: '#F1F0F6',
                              border: '1px solid rgba(255,255,255,0.06)',
                              borderRadius: isFirst
                                ? '4px 18px 18px 18px'
                                : isLast
                                ? '18px 18px 18px 4px'
                                : '4px 4px 4px 4px',
                            }),
                          }}
                        >
                          {msg.content}
                        </div>

                        {/* Bouton signaler */}
                        {!isMe && (
                          <ReportButton
                            targetType="message"
                            targetId={msg.id}
                            variant="icon"
                            className="opacity-0 group-hover:opacity-100 shrink-0 mb-1 transition-opacity"
                          />
                        )}
                      </div>

                      {/* Heure (dernier message du groupe uniquement) */}
                      {isLast && (
                        <span
                          className={`text-[10px] mx-1 ${isMe ? 'text-right' : 'text-left'}`}
                          style={{ color: 'rgba(255,255,255,0.25)' }}
                        >
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

      {/* ── Barre de saisie ────────────────────────────────────────────── */}
      <form
        onSubmit={handleSendMessage}
        className="flex items-center gap-2 px-4 py-3 shrink-0"
        style={{
          background: 'rgba(14,11,22,0.92)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          paddingBottom: 'calc(12px + env(safe-area-inset-bottom))',
        }}
      >
        <input
          type="text"
          placeholder="Écrire un message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          disabled={isSending}
          className="flex-1 text-sm outline-none transition-all disabled:opacity-50"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 24,
            padding: '10px 16px',
            color: '#F1F0F6',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'rgba(192,132,252,0.40)';
            e.currentTarget.style.background = 'rgba(192,132,252,0.06)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
            e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
          }}
        />
        <button
          type="submit"
          disabled={!newMessage.trim() || isSending}
          className="flex items-center justify-center rounded-full transition-all duration-150 shrink-0"
          style={{
            width: 40,
            height: 40,
            background: newMessage.trim() && !isSending
              ? 'linear-gradient(135deg, #C084FC, #818CF8)'
              : 'rgba(255,255,255,0.08)',
            color: newMessage.trim() && !isSending
              ? '#fff'
              : 'rgba(255,255,255,0.25)',
            border: 'none',
          }}
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
};

export default MessageClient;