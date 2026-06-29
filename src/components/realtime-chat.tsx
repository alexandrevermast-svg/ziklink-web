'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import type { MessageWithProfile } from '../app/(protected)/messages/type';

type Props = {
  messages: MessageWithProfile[];
  sendMessage: (content: string) => Promise<void>;
  isConnected: boolean;
  currentUserId: string;
  fallbackUsername: string;
};

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function Avatar({ username, size = 'md' }: { username: string; size?: 'sm' | 'md' }) {
  const initials = username ? username.slice(0, 2).toUpperCase() : '?';
  const cls = size === 'sm'
    ? 'h-6 w-6 text-[9px]'
    : 'h-8 w-8 text-xs';
  return (
    <div className={`${cls} rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold shrink-0`}>
      {initials}
    </div>
  );
}

export default function RealtimeChat({
  messages,
  sendMessage,
  isConnected,
  currentUserId,
  fallbackUsername,
}: Props) {
  const [newMessage, setNewMessage] = useState('');
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !isConnected) return;
    await sendMessage(newMessage);
    setNewMessage('');
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Groupement des messages consécutifs du même expéditeur
  const grouped: { userId: string; username: string; items: MessageWithProfile[] }[] = [];
  for (const msg of messages) {
    const username = msg.profiles?.username ?? fallbackUsername;
    const last = grouped[grouped.length - 1];
    if (last && last.userId === msg.user_id) {
      last.items.push(msg);
    } else {
      grouped.push({ userId: msg.user_id, username, items: [msg] });
    }
  }

  return (
    <div className="flex flex-col h-full w-full bg-white">
      {/* Zone messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50">
        {messages.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-8">
            Aucun message — commence la conversation ! 💬
          </p>
        )}

        {grouped.map((group, gi) => {
          const isMe = group.userId === currentUserId;
          return (
            <div key={gi} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
              {/* Avatar affiché une seule fois par groupe */}
              {!isMe && (
                <div className="shrink-0 mt-auto mb-1">
                  <Avatar username={group.username} size="sm" />
                </div>
              )}

              <div className={`flex flex-col gap-0.5 max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                {/* Nom affiché une seule fois, uniquement pour les autres */}
                {!isMe && (
                  <span className="text-xs text-gray-500 ml-1 mb-0.5 font-medium">
                    {group.username}
                  </span>
                )}

                {group.items.map((msg, mi) => {
                  const isFirst = mi === 0;
                  const isLast = mi === group.items.length - 1;

                  // Arrondis adaptés pour simuler des bulles groupées
                  const bubbleRadius = isMe
                    ? `rounded-2xl rounded-tr-${isFirst ? 'sm' : '2xl'} rounded-br-${isLast ? 'sm' : '2xl'}`
                    : `rounded-2xl rounded-tl-${isFirst ? 'sm' : '2xl'} rounded-bl-${isLast ? 'sm' : '2xl'}`;

                  return (
                    <div key={msg.id} className="flex flex-col gap-0.5">
                      <div
                        className={`px-3 py-2 text-sm leading-relaxed ${bubbleRadius} ${
                          isMe
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-800 border border-gray-200 shadow-sm'
                        }`}
                      >
                        {msg.content}
                      </div>
                      {/* Heure affichée uniquement sur le dernier message du groupe */}
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
        <div ref={bottomRef} />
      </div>

      {/* Barre de saisie */}
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 border-t border-gray-100 bg-white px-4 py-3"
      >
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder={isConnected ? 'Écris un message...' : 'Connexion en cours...'}
          disabled={!isConnected}
          className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-300 transition-all disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!isConnected || !newMessage.trim()}
          className="h-9 w-9 flex items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-40 shrink-0"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}