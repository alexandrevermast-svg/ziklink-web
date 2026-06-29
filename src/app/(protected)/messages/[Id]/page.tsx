// app/(protected)/messages/[Id]/page.tsx
import { createClient } from '@/lib/supabase/server';
import MessageClient from './MessageClient';
import { MessageWithProfile, ConversationWithParticipants, Participant } from '../type';
import { redirect } from 'next/navigation';

type MessagesPageProps = {
  params: Promise<{ Id: string }>;
};

export default async function ConversationPage({ params }: MessagesPageProps) {
  const { Id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const conversationOrUserId = Id;

  // ✅ Sécurité : pas de conversation avec soi-même
  if (conversationOrUserId === user.id) {
    redirect('/messages');
  }

  // --- 1. Récupérer la conversation existante ---
  const { data: conversationData, error: conversationError } = await supabase
    .from('conversations')
    .select(`
      *,
      participants:conversation_participants!inner(
        user_id,
        profiles:profiles!conversation_participants_user_id_fkey1(username)
      )
    `)
    .eq('id', conversationOrUserId)
    .maybeSingle();

  if (conversationError) {
    console.error("Erreur récupération conversation:", conversationError);
    redirect('/messages?error=conversation_fetch_failed');
  }

  // --- 2. Si la conversation n'existe pas, en créer une ---
  if (!conversationData) {
    const targetUserId = conversationOrUserId;

    // ✅ Vérifier si l'utilisateur cible existe
    const { data: targetUserProfile, error: profileError } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', targetUserId)
      .single();

    if (profileError || !targetUserProfile) {
      console.error("Utilisateur introuvable:", profileError);
      redirect('/messages?error=user_not_found');
    }

  // ✅ Récupérer ou créer la conversation directe (atomique, sans souci RLS)
    const { data: convId, error: convRpcError } = await supabase.rpc('get_or_create_direct_conversation', {
      p_other_user_id: targetUserId,
      p_title: targetUserProfile.username,
    });

    if (convRpcError || !convId) {
      console.error("Erreur RPC:", convRpcError);
      redirect('/messages?error=rpc_failed');
    }

    redirect(`/messages/${convId}`);
  }

  // --- 3. Vérifier que l'utilisateur fait partie de la conversation ---
  const conversation: ConversationWithParticipants = conversationData;
  const isParticipant = conversation.participants.some((p: Participant) => p.user_id === user.id);

  if (!isParticipant) {
    redirect('/messages?error=not_participant');
  }

  // --- 4. Récupérer les messages ---
// Requête Supabase
const { data: messagesData, error: messagesError } = await supabase
  .from('messages')
  .select(`
    id,
    content,
    created_at,
    user_id,
    profiles:profiles!inner(username)
  `)
  .eq('conversation_id', conversation.id)
  .order('created_at', { ascending: true });

if (messagesError) {
  console.error("Erreur messages:", messagesError);
  return <div>Erreur de chargement des messages.</div>;
}

// Normalisation des données

const initialMessages: MessageWithProfile[] = (messagesData || []).map((msg) => {
  const profile = Array.isArray(msg.profiles)
    ? msg.profiles[0]
    : msg.profiles;

  return {
    id: msg.id,
    content: msg.content,
    created_at: msg.created_at,
    user_id: msg.user_id,
    profiles: profile || { username: "Inconnu" }, // ✅ Valeur par défaut
  };
});

  // ✅ Calcul du titre de la page
  let pageTitle = conversation.title || 'Groupe';
  if (conversation.type === 'direct') {
    const otherParticipant = conversation.participants.find(
      (p: Participant) => p.user_id !== user.id
    );
    pageTitle = otherParticipant?.profiles?.username ?? 'Conversation privée';
  }

  return (
    <MessageClient
      conversationId={conversation.id}
      user={user}
      initialMessages={initialMessages}
      conversationTitle={pageTitle}
      participants={conversation.participants}
    />
  );
}