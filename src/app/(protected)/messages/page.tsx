import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { MessageCircle } from 'lucide-react';

interface ConversationListItem {
  id: string;
  type: string;
  title: string | null;
  entity_id: string | null;
  other_user_id: string | null;
  other_username: string | null;
  other_avatar_url: string | null;
  last_message_content: string | null;
  last_message_created_at: string | null;
  last_message_username: string | null;
  unread_count: number;
  last_activity_at: string;
}

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "À l'instant";
  if (diff < 3600) return `${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} j`;
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function ConvAvatar({ title, avatarUrl, type }: {
  title: string; avatarUrl: string | null; type: string
}) {
  const initials = title ? title.slice(0, 2).toUpperCase() : '?';
  const configs: Record<string, { from: string; to: string }> = {
    direct:       { from: '#818CF8', to: '#6366F1' },
    jam:          { from: '#34D399', to: '#10B981' },
    group:        { from: '#C084FC', to: '#818CF8' },
    concert:      { from: '#FB923C', to: '#F97316' },
    direct_group: { from: '#C084FC', to: '#818CF8' },
  };
  const c = configs[type] ?? configs.direct;

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={title}
        className="h-12 w-12 rounded-full object-cover shrink-0"
        style={{ border: '2px solid rgba(255,255,255,0.06)' }}
      />
    );
  }
  return (
    <div
      className="h-12 w-12 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
      style={{
        background: `linear-gradient(135deg, ${c.from}, ${c.to})`,
        boxShadow: `0 0 0 2px rgba(255,255,255,0.05)`,
      }}
    >
      {initials}
    </div>
  );
}

function TypeBadge({ type }: { type: string }) {
  const config: Record<string, { label: string; bg: string; color: string }> = {
    direct:       { label: 'DM',         bg: 'rgba(129,140,248,0.12)', color: '#818CF8' },
    jam:          { label: 'Jam 🎸',     bg: 'rgba(52,211,153,0.12)',  color: '#34D399' },
    concert:      { label: 'Concert 🎤', bg: 'rgba(251,146,60,0.12)',  color: '#FB923C' },
    group:        { label: 'Groupe',     bg: 'rgba(192,132,252,0.12)', color: '#C084FC' },
    direct_group: { label: 'Contact',    bg: 'rgba(192,132,252,0.12)', color: '#C084FC' },
  };
  const c = config[type] ?? config.direct;
  return (
    <span
      className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
      style={{ background: c.bg, color: c.color }}
    >
      {c.label}
    </span>
  );
}

export default async function MessagesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: conversations, error } = await supabase.rpc('get_conversations_list') as {
    data: ConversationListItem[] | null;
    error: any;
  };

  if (error) {
    return (
      <div className="p-4">
        <p className="text-sm font-medium mb-2" style={{ color: '#F87171' }}>
          Erreur de chargement
        </p>
        <pre
          className="p-4 rounded-xl text-xs overflow-auto"
          style={{ background: 'rgba(248,113,113,0.08)', color: '#F87171', border: '1px solid rgba(248,113,113,0.15)' }}
        >
          {JSON.stringify(error, null, 2)}
        </pre>
      </div>
    );
  }

  if (!conversations || conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 gap-4 min-h-[60vh] text-center">
        <div
          className="h-16 w-16 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(192,132,252,0.12)', border: '1px solid rgba(192,132,252,0.20)' }}
        >
          <MessageCircle className="h-8 w-8" style={{ color: '#C084FC' }} />
        </div>
        <div>
          <h1 className="text-lg font-semibold" style={{ color: '#F1F0F6' }}>
            Aucune conversation
          </h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.40)' }}>
            Rejoins une jam ou envoie un message à un musicien !
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col pb-24">
      {/* Header */}
      <div
        className="px-4 pt-4 pb-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <h1 className="text-xl font-semibold" style={{ color: '#F1F0F6', letterSpacing: '-0.02em' }}>
          Messages
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
          {conversations.length} conversation{conversations.length > 1 ? 's' : ''}
        </p>
      </div>

      {/* Liste */}
      <div className="flex flex-col">
        {conversations.map((conv, i) => {
          const title = conv.type === 'direct'
            ? (conv.other_username ?? 'Utilisateur')
            : (conv.title ?? 'Sans nom');
          const avatarUrl = conv.type === 'direct' ? conv.other_avatar_url : null;
          const unread = conv.unread_count ?? 0;
          const hasUnread = unread > 0;

          return (
            <Link
  key={conv.id}
  href={`/messages/${conv.id}`}
  className="conv-row flex items-center gap-3 px-4 py-3.5 relative"
  style={{
    background: hasUnread ? 'rgba(192,132,252,0.05)' : 'transparent',
    borderBottom: i < conversations.length - 1
      ? '1px solid rgba(255,255,255,0.04)'
      : 'none',
  }}
>
              {/* Indicateur non lu */}
              {hasUnread && (
                <span
                  className="absolute left-0 top-1/2 -translate-y-1/2 rounded-r-full"
                  style={{
                    width: 3,
                    height: 28,
                    background: 'linear-gradient(180deg, #C084FC, #818CF8)',
                  }}
                />
              )}

              <ConvAvatar title={title} avatarUrl={avatarUrl} type={conv.type} />

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="text-sm truncate"
                      style={{
                        color: hasUnread ? '#F1F0F6' : 'rgba(255,255,255,0.75)',
                        fontWeight: hasUnread ? 600 : 500,
                      }}
                    >
                      {title}
                    </span>
                    <TypeBadge type={conv.type} />
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {conv.last_message_created_at && (
                      <span
                        className="text-[11px]"
                        style={{ color: 'rgba(255,255,255,0.30)' }}
                      >
                        {timeAgo(conv.last_message_created_at)}
                      </span>
                    )}
                    {hasUnread && (
                      <span
                        className="h-5 min-w-5 px-1 flex items-center justify-center rounded-full text-white text-[10px] font-bold"
                        style={{
                          background: 'linear-gradient(135deg, #C084FC, #818CF8)',
                          minWidth: 20,
                        }}
                      >
                        {unread > 9 ? '9+' : unread}
                      </span>
                    )}
                  </div>
                </div>

                {conv.last_message_content ? (
                  <p
                    className="text-xs truncate"
                    style={{
                      color: hasUnread
                        ? 'rgba(255,255,255,0.60)'
                        : 'rgba(255,255,255,0.30)',
                      fontWeight: hasUnread ? 500 : 400,
                    }}
                  >
                    {conv.last_message_username && conv.last_message_username !== title
                      ? `${conv.last_message_username} : ${conv.last_message_content}`
                      : conv.last_message_content}
                  </p>
                ) : (
                  <p className="text-xs italic" style={{ color: 'rgba(255,255,255,0.20)' }}>
                    Aucun message
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}