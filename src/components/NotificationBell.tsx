'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bell } from 'lucide-react';
import { useNotifications, Notification, NotificationType } from '@/hooks/useNotifications';
import { createPortal } from 'react-dom';

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "À l'instant";
  if (diff < 3600) return `${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h`;
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

const TYPE_CONFIG: Record<NotificationType, { icon: string; color: string }> = {
  message:       { icon: '💬', color: '#818CF8' },
  jam_accepted:  { icon: '🎸', color: '#34D399' },
  jam_turn:      { icon: '🎤', color: '#34D399' },
  jam_request:    { icon: '🥁', color: '#FB923C' },
  group_request: { icon: '👥', color: '#C084FC' },
  group_accepted:{ icon: '✅', color: '#C084FC' },
};

function NotifItem({
  notif,
  onRead,
}: {
  notif: Notification;
  onRead: (id: string, link: string | null) => void;
}) {
  const config = TYPE_CONFIG[notif.type] ?? { icon: '🔔', color: '#818CF8' };

  return (
    <button
      onClick={() => onRead(notif.id, notif.link)}
      className="w-full flex items-start gap-3 px-4 py-3 text-left transition-all duration-150"
      style={{
        background: notif.read ? 'transparent' : 'rgba(192,132,252,0.05)',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background =
          notif.read ? 'transparent' : 'rgba(192,132,252,0.05)';
      }}
    >
      {/* Icône type */}
      <div
        className="flex items-center justify-center rounded-full shrink-0 mt-0.5"
        style={{
          width: 34,
          height: 34,
          background: `${config.color}18`,
          fontSize: 15,
        }}
      >
        {config.icon}
      </div>

      {/* Contenu */}
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-medium truncate"
          style={{ color: notif.read ? 'rgba(255,255,255,0.60)' : '#F1F0F6' }}
        >
          {notif.title}
        </p>
        {notif.body && (
          <p
            className="text-xs mt-0.5 line-clamp-2"
            style={{ color: 'rgba(255,255,255,0.35)' }}
          >
            {notif.body}
          </p>
        )}
        <p
          className="text-[10px] mt-1"
          style={{ color: 'rgba(255,255,255,0.25)' }}
        >
          {timeAgo(notif.created_at)}
        </p>
      </div>

      {/* Point non lu */}
      {!notif.read && (
        <div
          className="rounded-full shrink-0 mt-2"
          style={{
            width: 7,
            height: 7,
            background: 'linear-gradient(135deg, #C084FC, #818CF8)',
          }}
        />
      )}
    </button>
  );
}

export default function NotificationBell({ userId }: { userId: string | null }) {
  const router = useRouter();
  const { notifications, unreadCount, markAllRead, markRead } = useNotifications(userId);
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Fermer au clic dehors
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleOpen = () => {
    setIsOpen((prev) => !prev);
  };

  const handleRead = async (id: string, link: string | null) => {
    await markRead(id);
    setIsOpen(false);
    if (link) router.push(link);
  };

  return (
    <div className="relative">
      {/* Bouton cloche */}
      <button
        ref={buttonRef}
        onClick={handleOpen}
        className="relative flex items-center justify-center rounded-full transition-all duration-150"
        style={{
          width: 36,
          height: 36,
          background: isOpen
            ? 'rgba(192,132,252,0.15)'
            : 'rgba(255,255,255,0.06)',
          border: '1px solid',
          borderColor: isOpen
            ? 'rgba(192,132,252,0.30)'
            : 'rgba(255,255,255,0.10)',
          color: isOpen ? '#C084FC' : 'rgba(255,255,255,0.55)',
        }}
        aria-label="Notifications"
      >
        <Bell size={16} strokeWidth={1.75} />
        {unreadCount > 0 && (
          <span
            className="absolute flex items-center justify-center text-white font-bold"
            style={{
              top: -4,
              right: -4,
              minWidth: 17,
              height: 17,
              padding: '0 4px',
              fontSize: 10,
              background: 'linear-gradient(135deg, #C084FC, #818CF8)',
              borderRadius: 10,
              border: '2px solid #0E0B16',
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Panel */}
      {isOpen && typeof window !== 'undefined' && createPortal(
        <div
          ref={panelRef}
          className="fixed z-50 rounded-2xl overflow-hidden"
          style={{
            top: 60,
            right: 12,
            width: 'min(340px, calc(100vw - 24px))',
            background: '#1A1628',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
            maxHeight: 'calc(100vh - 80px)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header panel */}
          <div
            className="flex items-center justify-between px-4 py-3 shrink-0"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div>
              <h2
                className="text-sm font-semibold"
                style={{ color: '#F1F0F6' }}
              >
                Notifications
              </h2>
              {unreadCount > 0 && (
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
                </p>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs font-medium transition-colors duration-150"
                style={{ color: '#C084FC' }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.color = '#818CF8';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.color = '#C084FC';
                }}
              >
                Tout marquer lu
              </button>
            )}
          </div>

          {/* Liste */}
          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center py-10 gap-2"
              >
                <span style={{ fontSize: 28 }}>🔔</span>
                <p
                  className="text-sm"
                  style={{ color: 'rgba(255,255,255,0.30)' }}
                >
                  Aucune notification
                </p>
              </div>
            ) : (
              notifications.map((notif) => (
                <NotifItem
                  key={notif.id}
                  notif={notif}
                  onRead={handleRead}
                />
              ))
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}