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

function ConvAvatar({ title, avatarUrl, type }: { title: string; avatarUrl: string | null; type: string }) {
  const initials = title ? title.slice(0, 2).toUpperCase() : '?';
  const gradients: Record<string, string> = {
    direct: 'from-blue-400 to-blue-600',
    jam: 'from-green-400 to-emerald-600',
    group: 'from-purple-400 to-purple-600',
    concert: 'from-red-400 to-rose-600',
  };
  const gradient = gradients[type] ?? gradients.direct;
  if (avatarUrl) {
    return <img src={avatarUrl} alt={title} className="h-12 w-12 rounded-full object-cover shrink-0" />;
  }
  return (
    <div className={`h-12 w-12 rounded-full bg-linear-to-br ${gradient} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
      {initials}
    </div>
  );
}

function TypeBadge({ type }: { type: string }) {
  const config: Record<string, { label: string; className: string }> = {
    direct: { label: 'DM', className: 'bg-blue-100 text-blue-600' },
    jam: { label: 'Jam 🎸', className: 'bg-green-100 text-green-700' },
    concert: { label: 'Concert 🎤', className: 'bg-red-100 text-red-600' },
    group: { label: 'Groupe', className: 'bg-purple-100 text-purple-600' },
  };
  const c = config[type] ?? config.direct;
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${c.className}`}>
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
    console.error('Erreur complète:', error);
    return (
      <div className="p-4">
        <h1 className="text-xl font-bold mb-4">Erreur de chargement</h1>
        <pre className="bg-red-50 p-4 rounded text-sm overflow-auto">{JSON.stringify(error, null, 2)}</pre>
      </div>
    );
  }

  if (!conversations || conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 gap-4 min-h-[60vh] text-center">
        <div className="h-16 w-16 rounded-full bg-blue-50 flex items-center justify-center">
          <MessageCircle className="h-8 w-8 text-blue-400" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Aucune conversation</h1>
          <p className="text-sm text-gray-400 mt-1">Rejoins une jam ou envoie un message à un musicien !</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col pb-24">
      <div className="px-4 pt-4 pb-3 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-900">Messages</h1>
        <p className="text-sm text-gray-400 mt-0.5">{conversations.length} conversation{conversations.length > 1 ? 's' : ''}</p>
      </div>

      <div className="divide-y divide-gray-50">
        {conversations.map((conv) => {
          const title = conv.type === 'direct' ? (conv.other_username ?? 'Utilisateur') : (conv.title ?? 'Sans nom');
          const avatarUrl = conv.type === 'direct' ? conv.other_avatar_url : null;
          const unread = conv.unread_count ?? 0;
          const hasUnread = unread > 0;

          return (
            <Link
              key={conv.id}
              href={`/messages/${conv.id}`}
              className={`flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors active:bg-gray-100 ${hasUnread ? 'bg-blue-50/40' : ''}`}
            >
              <ConvAvatar title={title} avatarUrl={avatarUrl} type={conv.type} />

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`text-sm truncate ${hasUnread ? 'font-bold text-gray-900' : 'font-semibold text-gray-800'}`}>
                      {title}
                    </span>
                    <TypeBadge type={conv.type} />
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {conv.last_message_created_at && (
                      <span className="text-[11px] text-gray-400">{timeAgo(conv.last_message_created_at)}</span>
                    )}
                    {hasUnread && (
                      <span className="h-5 min-w-5 px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold">
                        {unread > 9 ? '9+' : unread}
                      </span>
                    )}
                  </div>
                </div>

                {conv.last_message_content ? (
                  <p className={`text-xs mt-0.5 truncate ${hasUnread ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>
                    {conv.last_message_username && conv.last_message_username !== title
                      ? `${conv.last_message_username} : ${conv.last_message_content}`
                      : conv.last_message_content}
                  </p>
                ) : (
                  <p className="text-xs text-gray-300 mt-0.5 italic">Aucun message</p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}