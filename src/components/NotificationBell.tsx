'use client';

import { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Check } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useNotifications, type Notification } from '@/hooks/useNotifications';

const TYPE_ICON: Record<Notification['type'], string> = {
  message:     '💬',
  jam_accepted: '✅',
  jam_turn:    '🎸',
};

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'À l\'instant';
  if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)} h`;
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export default function NotificationBell({ userId }: { userId: string | null }) {
  const router = useRouter();
  const { notifications, unreadCount, markAllRead, markRead } = useNotifications(userId);
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Ferme le dropdown au clic extérieur
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleOpen = () => {
    setOpen((v) => !v);
  };

  const handleClickNotif = async (notif: Notification) => {
    await markRead(notif.id);
    setOpen(false);
    if (notif.link) router.push(notif.link);
  };

  const rect = buttonRef.current?.getBoundingClientRect();

  return (
    <>
      {/* ✅ Bouton de la cloche adapté */}
      <button
        ref={buttonRef}
        onClick={handleOpen}
        className="relative p-2 rounded-full hover:bg-zik-card-hover transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5 text-zik-muted" />
        {unreadCount > 0 && (
          
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 flex items-center justify-center rounded-full bg-zik-red text-white text-[9px] font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && rect && createPortal(     
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: rect.bottom + 6,
            right: window.innerWidth - rect.right,
            zIndex: 99999,
            width: 'min(90vw, 320px)',
          }}
          className="bg-zik-card rounded-2xl shadow-2xl border border-zik-border overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zik-border">
            <span className="text-sm font-semibold text-zik-text">
              Notifications {unreadCount > 0 && <span className="text-zik-purple">({unreadCount})</span>}
            </span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs text-zik-purple hover:text-zik-indigo font-medium transition-colors"
              >
                <Check className="h-3 w-3" /> Tout lire
              </button>
            )}
          </div>

          {/* Liste */}
          <div className="max-h-80 overflow-y-auto divide-y divide-zik-border/30">
            {notifications.length === 0 ? (
              <p className="text-center text-sm text-zik-muted py-8">Aucune notification 🔔</p>
            ) : notifications.map((notif) => (
              <button
                key={notif.id}
                onClick={() => handleClickNotif(notif)}
                className={`w-full text-left flex gap-3 px-4 py-3 hover:bg-zik-card-hover transition-colors ${
                  !notif.read ? 'bg-zik-purple/10' : ''
                }`}
              >
                <span className="text-xl shrink-0 mt-0.5">{TYPE_ICON[notif.type]}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm leading-snug ${
                    !notif.read ? 'font-semibold text-zik-text' : 'text-zik-muted'
                  }`}>
                    {notif.title}
                  </p>
                  {notif.body && (
                    <p className="text-xs text-zik-muted mt-0.5 truncate">{notif.body}</p>
                  )}
                  <p className="text-[10px] text-zik-muted mt-1">{timeAgo(notif.created_at)}</p>
                </div>
                {!notif.read && (
                  <span className="h-2 w-2 rounded-full bg-zik-purple shrink-0 mt-2" />
                )}
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}