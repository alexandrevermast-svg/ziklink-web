// ============================================================
// app/(protected)/groups/[id]/page.tsx
// ============================================================
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { createPortal } from 'react-dom';
import {
  ArrowLeft, MapPin, Music2, Users, MessageCircle, Crown,
  ShieldCheck, X, UserPlus, Pencil, ChevronRight,
  Camera, Loader2, Send, CalendarDays, Mail, Trash2, Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

const GENRES = ['Rock', 'Jazz', 'Blues', 'Metal', 'Pop', 'Électro', 'Folk', 'Classique', 'Hip-Hop', 'Reggae', 'Autre'];

interface Group {
  id: string; name: string; bio: string | null;
  city: string | null; genre: string | null;
  avatar_url: string | null; created_by: string;
}
interface Profile { id: string; username: string | null; avatar_url: string | null; }
interface GroupMember { user_id: string; role: string; status: string; instrument: string | null; profile: Profile | null; }
interface Message { id: string; user_id: string; content: string; created_at: string; profile: Profile | null; }

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function GroupAvatar({ group, size = 'md' }: { group: Pick<Group, 'name' | 'avatar_url'>; size?: 'sm' | 'md' | 'lg' }) {
  const cls = size === 'lg' ? 'h-24 w-24 text-3xl' : size === 'md' ? 'h-12 w-12 text-lg' : 'h-8 w-8 text-sm';
  const initials = group.name.slice(0, 2).toUpperCase();
  return group.avatar_url ? (
    <img src={group.avatar_url} alt={group.name} className={`${cls} rounded-2xl object-cover shrink-0`} />
  ) : (
    <div className={`${cls} rounded-2xl bg-linear-to-br from-purple-500 to-blue-600 flex items-center justify-center text-white font-bold shrink-0`}>
      {initials}
    </div>
  );
}

function MemberAvatar({ profile, size = 'md' }: { profile: Profile | null; size?: 'sm' | 'md' }) {
  const cls = size === 'sm' ? 'h-6 w-6 text-[9px]' : 'h-10 w-10 text-sm';
  const initials = profile?.username?.slice(0, 2).toUpperCase() ?? '?';
  return profile?.avatar_url ? (
    <img src={profile.avatar_url} alt={profile.username ?? ''} className={`${cls} rounded-full object-cover shrink-0`} />
  ) : (
    <div className={`${cls} rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold shrink-0`}>
      {initials}
    </div>
  );
}

function Modal({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} onClick={onClose} />
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)', background: 'white',
        borderRadius: '12px', padding: '24px', width: 'min(90vw, 560px)',
        maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-400"><X className="h-5 w-5" /></button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}

export default function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [events, setEvents] = useState<{ type: 'jam' | 'concert'; id: string; title: string; artist?: string | null; start_time: string }[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isContactingGroup, setIsContactingGroup] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editGenre, setEditGenre] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [inviteUsername, setInviteUsername] = useState('');
  const [inviteResult, setInviteResult] = useState<'idle' | 'loading' | 'success' | 'notfound' | 'already'>('idle');

  const myMembership = members.find((m) => m.user_id === currentUserId);
  const isMember = myMembership?.status === 'confirmed';
  const isPendingMember = myMembership?.status === 'pending';
  const isAdmin = myMembership?.role === 'admin' || group?.created_by === currentUserId;

  const pendingMembers = members.filter((m) => m.status === 'pending');
  const confirmedMembers = members.filter((m) => m.status !== 'pending');

  const fetchAll = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id ?? null);

    const { data: groupData } = await supabase.from('groups').select('*').eq('id', id).single();
    setGroup(groupData);
    if (groupData) {
      setEditName(groupData.name);
      setEditBio(groupData.bio ?? '');
      setEditCity(groupData.city ?? '');
      setEditGenre(groupData.genre ?? '');
    }

    const { data: membersData } = await supabase
      .from('group_members')
      .select('user_id, role, status, instrument, profile:profiles(id, username, avatar_url)')
      .eq('group_id', id);
    setMembers((membersData ?? []).map((m: any) => ({ ...m, status: m.status ?? 'confirmed', profile: m.profile ?? null })));

    const [{ data: jamsData }, { data: concertsData }] = await Promise.all([
      supabase.from('jam_sessions').select('id, title, start_time').eq('group_id', id).order('start_time', { ascending: false }).limit(10),
      supabase.from('concerts').select('id, title, artist, start_time').eq('group_id', id).order('start_time', { ascending: false }).limit(10),
    ]);
    const allEvents = [
      ...(jamsData ?? []).map((j) => ({ type: 'jam' as const, id: j.id, title: j.title, start_time: j.start_time })),
      ...(concertsData ?? []).map((c) => ({ type: 'concert' as const, id: c.id, title: c.title, artist: c.artist, start_time: c.start_time })),
    ].sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());
    setEvents(allEvents);

    const { data: convData } = await supabase
      .from('conversations').select('id')
      .eq('type', 'group').eq('entity_id', id).maybeSingle();
    if (convData) {
      setConversationId(convData.id);
      const { data: msgs } = await supabase
        .from('messages')
        .select('id, user_id, content, created_at, profile:profiles(id, username, avatar_url)')
        .eq('conversation_id', convData.id)
        .order('created_at', { ascending: true });
      setMessages((msgs ?? []).map((m: any) => ({ ...m, profile: m.profile ?? null })));
    }

    setIsLoading(false);
  }, [id]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase.channel(`group-chat-${conversationId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        async (payload) => {
          const msg = payload.new as any;
          const { data: profile } = await supabase.from('profiles').select('id, username, avatar_url').eq('id', msg.user_id).single();
          setMessages((prev) => [...prev, { ...msg, profile: profile ?? null }]);
        }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleContactGroup = async () => {
    if (!currentUserId) { router.push('/login'); return; }
    setIsContactingGroup(true);
    try {
      const { data: existing } = await supabase
        .from('conversations')
        .select('id, conversation_participants!inner(user_id)')
        .eq('type', 'direct_group')
        .eq('entity_id', id)
        .eq('conversation_participants.user_id', currentUserId)
        .maybeSingle();

      if (existing) { router.push(`/messages/${existing.id}`); return; }

      const memberIds = members.map(m => m.user_id);

      const { data: convId, error: convError } = await supabase.rpc(
        'create_direct_group_conversation',
        { p_title: group!.name, p_entity_id: id, p_member_ids: memberIds }
      );

      if (convError) {
        console.error(convError);
      } else if (convId) {
        for (const m of members) {
          if (m.user_id === currentUserId) continue;
          await supabase.from('notifications').insert({
            user_id: m.user_id,
            type: 'message',
            title: `Nouveau message pour ${group!.name}`,
            body: 'Quelqu\'un a contacté votre groupe',
            link: `/messages/${convId}`,
          });
        }
        router.push(`/messages/${convId}`);
      }
    } finally {
      setIsContactingGroup(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !currentUserId || !conversationId) return;
    setIsSending(true);
    await supabase.from('conversation_participants')
      .upsert({ conversation_id: conversationId, user_id: currentUserId }, { onConflict: 'conversation_id,user_id' });
    await supabase.from('messages').insert({ conversation_id: conversationId, user_id: currentUserId, content: messageInput.trim() });
    setMessageInput('');
    setIsSending(false);
  };

  // ✅ Rejoindre : toujours en attente d'approbation
  const handleJoin = async () => {
    if (!currentUserId) return;
    setIsJoining(true);
    await supabase.rpc('request_join_group', { p_group_id: id });
    await fetchAll();
    setIsJoining(false);
  };

  const handleLeave = async () => {
    if (!currentUserId) return;
    await supabase.from('group_members').delete().eq('group_id', id).eq('user_id', currentUserId);
    await fetchAll();
  };

  // ✅ Approuver une demande
  const handleApprove = async (userId: string) => {
    await supabase.rpc('approve_group_member', { p_group_id: id, p_user_id: userId });
    await fetchAll();
  };

  // ✅ Refuser une demande / retirer un membre
  const handleRemoveMember = async (userId: string) => {
    await supabase.from('group_members').delete().eq('group_id', id).eq('user_id', userId);
    await fetchAll();
  };

  const handleToggleAdmin = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'member' : 'admin';
    await supabase.from('group_members').update({ role: newRole }).eq('group_id', id).eq('user_id', userId);
    await fetchAll();
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;
    setIsSavingEdit(true);
    await supabase.from('groups').update({ name: editName.trim(), bio: editBio.trim() || null, city: editCity.trim() || null, genre: editGenre || null }).eq('id', id);
    setIsSavingEdit(false);
    setIsEditOpen(false);
    await fetchAll();
  };

  const handleDeleteGroup = async () => {
    if (!isAdmin) return;
    setIsDeleting(true);
    const { error } = await supabase.rpc('delete_group', { p_group_id: id });
    if (error) {
      alert(`Erreur lors de la suppression: ${error.message}`);
      setIsDeleting(false);
      return;
    }
    router.push('/groups');
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingAvatar(true);
    const ext = file.name.split('.').pop();
    const path = `groups/${id}/avatar.${ext}`;
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (!error) {
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      await supabase.from('groups').update({ avatar_url: `${urlData.publicUrl}?t=${Date.now()}` }).eq('id', id);
      await fetchAll();
    }
    setIsUploadingAvatar(false);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteUsername.trim()) return;
    setInviteResult('loading');
    const { data: profileData } = await supabase.from('profiles').select('id').eq('username', inviteUsername.trim()).single();
    if (!profileData) { setInviteResult('notfound'); return; }
    if (members.some((m) => m.user_id === profileData.id)) { setInviteResult('already'); return; }
    // Une invitation par un admin ajoute directement en confirmed
    await supabase.from('group_members').insert({ group_id: id, user_id: profileData.id, role: 'member', status: 'confirmed' });
    if (conversationId) {
      await supabase.from('conversation_participants')
        .upsert({ conversation_id: conversationId, user_id: profileData.id }, { onConflict: 'conversation_id,user_id' });
    }
    setInviteResult('success');
    setInviteUsername('');
    await fetchAll();
    setTimeout(() => setInviteResult('idle'), 2000);
  };

  const handleOpenDM = async (targetUserId: string) => {
    if (!currentUserId || targetUserId === currentUserId) return;
    const { data: convId } = await supabase.rpc('get_or_create_direct_conversation', { p_other_user_id: targetUserId, p_title: null });
    if (convId) router.push(`/messages/${convId}`);
  };

  if (isLoading) return (
    <div className="flex flex-col gap-4 p-4">
      <div className="h-8 w-24 bg-gray-100 animate-pulse rounded" />
      <div className="h-32 bg-gray-100 animate-pulse rounded-xl" />
      <div className="h-48 bg-gray-100 animate-pulse rounded-xl" />
    </div>
  );

  if (!group) return (
    <div className="p-4 text-center text-gray-500">
      <p>Groupe introuvable.</p>
      <Button variant="outline" className="mt-4" onClick={() => router.back()}>Retour</Button>
    </div>
  );

  return (
    <div className="flex flex-col pb-24">
      {/* Header */}
      <div className="px-4 pt-4 pb-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Retour
          </button>
          <div className="flex gap-2">
            {isAdmin && (
              <Button size="sm" variant="outline"
                className="text-xs flex items-center gap-1.5 border-gray-200 text-gray-600 hover:border-purple-300 hover:text-purple-600"
                onClick={() => setIsEditOpen(true)}>
                <Pencil className="h-3.5 w-3.5" /> Modifier
              </Button>
            )}
            {isAdmin && (
              <Button size="sm" variant="outline"
                className="text-xs flex items-center gap-1.5 border-red-200 text-red-500 hover:border-red-400 hover:text-red-600 hover:bg-red-50"
                onClick={() => setShowDeleteConfirm(true)}>
                <Trash2 className="h-3.5 w-3.5" /> Supprimer
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-start gap-4">
          <div className="relative shrink-0">
            <GroupAvatar group={group} size="lg" />
            {isAdmin && (
              <button onClick={() => fileInputRef.current?.click()} disabled={isUploadingAvatar}
                className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-white border border-gray-200 shadow flex items-center justify-center hover:bg-gray-50 transition-colors">
                {isUploadingAvatar ? <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" /> : <Camera className="h-3.5 w-3.5 text-gray-500" />}
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 truncate">{group.name}</h1>
            <div className="flex flex-wrap gap-2 mt-1">
              {group.genre && <span className="text-xs bg-purple-100 text-purple-700 font-medium px-2.5 py-0.5 rounded-full">{group.genre}</span>}
              {group.city && <span className="flex items-center gap-1 text-xs text-gray-500"><MapPin className="h-3 w-3" />{group.city}</span>}
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <Users className="h-3 w-3" />{confirmedMembers.length} membre{confirmedMembers.length > 1 ? 's' : ''}
              </span>
            </div>
            {group.bio && <p className="text-sm text-gray-600 mt-2 leading-relaxed">{group.bio}</p>}
          </div>
        </div>

        {/* Boutons d'action selon le statut */}
        <div className="flex gap-2 mt-4 flex-wrap">
          {!isMember && !isPendingMember && currentUserId && (
            <>
              <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-xs" onClick={handleJoin} disabled={isJoining}>
                {isJoining
                  ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Envoi...</>
                  : <><UserPlus className="h-3.5 w-3.5 mr-1.5" /> Demander à rejoindre</>
                }
              </Button>
              <Button size="sm" variant="outline"
                className="text-xs border-blue-200 text-blue-600 hover:bg-blue-50"
                onClick={handleContactGroup}
                disabled={isContactingGroup}>
                {isContactingGroup
                  ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Ouverture...</>
                  : <><Mail className="h-3.5 w-3.5 mr-1.5" /> Contacter le groupe</>
                }
              </Button>
            </>
          )}
          {isPendingMember && (
            <span className="text-xs text-orange-600 font-medium px-3 py-1.5 bg-orange-50 rounded-full">⏳ Demande en attente d'approbation</span>
          )}
          {!currentUserId && (
            <Button size="sm" variant="outline"
              className="text-xs border-blue-200 text-blue-600 hover:bg-blue-50"
              onClick={() => router.push('/login')}>
              <Mail className="h-3.5 w-3.5 mr-1.5" /> Contacter le groupe
            </Button>
          )}
          {isMember && !isAdmin && (
            <Button size="sm" variant="outline"
              className="text-xs border-gray-200 text-gray-500 hover:border-red-200 hover:text-red-500"
              onClick={handleLeave}>
              Quitter le groupe
            </Button>
          )}
          {isAdmin && (
            <Button size="sm" variant="outline"
              className="text-xs border-purple-200 text-purple-600 hover:bg-purple-50"
              onClick={() => setIsInviteOpen(true)}>
              <UserPlus className="h-3.5 w-3.5 mr-1.5" /> Inviter
            </Button>
          )}
        </div>
      </div>

      {/* Onglets */}
      <Tabs defaultValue="members" className="flex-1 flex flex-col">
        <TabsList className="grid grid-cols-3 mx-4 mt-3 shrink-0">
          <TabsTrigger value="members">
            Membres
            <span className="ml-1.5 bg-blue-100 text-blue-700 text-[10px] font-semibold px-1.5 py-0.5 rounded-full">{confirmedMembers.length}</span>
          </TabsTrigger>
          <TabsTrigger value="events">
            Événements
            {events.length > 0 && <span className="ml-1.5 bg-blue-100 text-blue-700 text-[10px] font-semibold px-1.5 py-0.5 rounded-full">{events.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="chat">
            Chat
            {messages.length > 0 && <span className="ml-1.5 bg-blue-100 text-blue-700 text-[10px] font-semibold px-1.5 py-0.5 rounded-full">{messages.length}</span>}
          </TabsTrigger>
        </TabsList>

        {/* MEMBRES */}
        <TabsContent value="members" className="px-4 py-3 space-y-2">
          {isAdmin && pendingMembers.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide mb-2">En attente · {pendingMembers.length}</p>
              <div className="space-y-2">
                {pendingMembers.map((m) => (
                  <div key={m.user_id} className="flex items-center justify-between gap-2 p-3 rounded-lg bg-orange-50 border border-orange-100">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <MemberAvatar profile={m.profile} />
                      <span className="text-sm font-medium text-gray-800 truncate">{m.profile?.username ?? 'Inconnu'}</span>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700 px-2" onClick={() => handleApprove(m.user_id)}>
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs border-red-200 text-red-600 hover:bg-red-50 px-2" onClick={() => handleRemoveMember(m.user_id)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {confirmedMembers.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Aucun membre pour l'instant</p>
          ) : confirmedMembers.map((m) => {
            const isCreator = m.user_id === group.created_by;
            const isAdminMember = m.role === 'admin';
            return (
              <div key={m.user_id} className={`flex items-center gap-3 p-3 rounded-xl border ${isAdminMember ? 'bg-purple-50 border-purple-100' : 'bg-gray-50 border-gray-100'}`}>
                <MemberAvatar profile={m.profile} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{m.profile?.username ?? 'Inconnu'}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {isCreator && <span className="flex items-center gap-0.5 text-xs text-blue-500"><Crown className="h-3 w-3" /> Créateur</span>}
                    {isAdminMember && !isCreator && <span className="flex items-center gap-0.5 text-xs text-purple-500"><ShieldCheck className="h-3 w-3" /> Admin</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {m.user_id !== currentUserId && (
                    <button onClick={() => handleOpenDM(m.user_id)}
                      className="h-7 w-7 flex items-center justify-center rounded-full text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors">
                      <MessageCircle className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {isAdmin && m.user_id !== currentUserId && !isCreator && (
                    <>
                      <button onClick={() => handleToggleAdmin(m.user_id, m.role)}
                        className={`h-7 w-7 flex items-center justify-center rounded-full transition-colors ${isAdminMember ? 'text-purple-500 hover:bg-purple-50' : 'text-gray-300 hover:text-purple-500 hover:bg-purple-50'}`}>
                        <ShieldCheck className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleRemoveMember(m.user_id)}
                        className="h-7 w-7 flex items-center justify-center rounded-full text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </TabsContent>

        {/* ÉVÉNEMENTS */}
        <TabsContent value="events" className="px-4 py-3">
          {events.length === 0 ? (
            <div className="text-center py-8">
              <CalendarDays className="h-10 w-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-400 mb-3">Aucun événement organisé par ce groupe</p>
              {isMember && (
                <div className="flex gap-2 justify-center flex-wrap">
                  <Button size="sm" variant="outline" className="text-xs" onClick={() => router.push('/events')}>🎸 Organiser une jam</Button>
                  <Button size="sm" variant="outline" className="text-xs" onClick={() => router.push('/events')}>🎤 Ajouter un concert</Button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {events.map((event) => (
                <button key={`${event.type}-${event.id}`}
                  onClick={() => router.push(`/events/${event.type === 'jam' ? 'jams' : 'concerts'}/${event.id}`)}
                  className={`w-full flex items-center justify-between gap-3 p-3 rounded-xl border bg-gray-50 transition-all text-left ${
                    event.type === 'jam' ? 'border-gray-100 hover:border-blue-200 hover:bg-blue-50/30' : 'border-gray-100 hover:border-red-200 hover:bg-red-50/30'
                  }`}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-base shrink-0">{event.type === 'jam' ? '🎸' : '🎤'}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{event.title}</p>
                      {event.type === 'concert' && event.artist && <p className="text-xs text-blue-600 font-medium truncate">{event.artist}</p>}
                      <p className="text-xs text-gray-400">{formatDate(event.start_time)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${event.type === 'jam' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {event.type === 'jam' ? 'Jam' : 'Concert'}
                    </span>
                    <ChevronRight className="h-4 w-4 text-gray-300" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </TabsContent>

        {/* CHAT INTERNE (membres uniquement) */}
        <TabsContent value="chat" className="flex-1 flex flex-col overflow-hidden px-0 py-0 min-h-100">
          {!conversationId ? (
            <div className="flex-1 flex items-center justify-center text-sm text-gray-400 p-4">Le chat sera disponible prochainement.</div>
          ) : !isMember && !isAdmin ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-sm text-gray-400 p-4 text-center">
              <p>Ce chat est réservé aux membres du groupe 💬</p>
              {currentUserId && !isPendingMember && (
                <Button size="sm" variant="outline"
                  className="text-xs border-blue-200 text-blue-600 hover:bg-blue-50"
                  onClick={handleContactGroup} disabled={isContactingGroup}>
                  {isContactingGroup
                    ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Ouverture...</>
                    : <><Mail className="h-3.5 w-3.5 mr-1.5" /> Contacter le groupe</>
                  }
                </Button>
              )}
              {isPendingMember && (
                <span className="text-xs text-orange-600 font-medium">⏳ Demande en attente d'approbation</span>
              )}
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                {messages.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">Pas encore de messages — lancez la discussion ! 🎸</p>
                ) : messages.map((msg) => {
                  const isMe = msg.user_id === currentUserId;
                  return (
                    <div key={msg.id} className={`flex gap-2.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                      {!isMe && <MemberAvatar profile={msg.profile} size="sm" />}
                      <div className={`max-w-[75%] flex flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}>
                        {!isMe && <span className="text-xs text-gray-500 ml-0.5">{msg.profile?.username ?? 'Inconnu'}</span>}
                        <div className={`px-3 py-2 rounded-2xl text-sm ${isMe ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-gray-100 text-gray-800 rounded-tl-sm'}`}>
                          {msg.content}
                        </div>
                        <span className="text-[10px] text-gray-400 mx-1">
                          {new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
              <form onSubmit={handleSendMessage} className="border-t border-gray-100 px-4 py-3 flex gap-2 items-center shrink-0">
                <Input value={messageInput} onChange={(e) => setMessageInput(e.target.value)}
                  placeholder="Envoyer un message..." className="flex-1 text-sm" disabled={isSending} />
                <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700 shrink-0" disabled={!messageInput.trim() || isSending}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Modale édition */}
      <Modal open={isEditOpen} onClose={() => setIsEditOpen(false)} title="Modifier le groupe">
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Nom <span className="text-red-400">*</span></label>
            <Input value={editName} onChange={(e) => setEditName(e.target.value)} required />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Description</label>
            <textarea value={editBio} onChange={(e) => setEditBio(e.target.value)} rows={3} maxLength={280}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none outline-none focus:ring-2 focus:ring-blue-300" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Ville</label>
              <Input value={editCity} onChange={(e) => setEditCity(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Genre</label>
              <select value={editGenre} onChange={(e) => setEditGenre(e.target.value)}
                className="w-full border border-gray-200 rounded-md text-sm px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
                <option value="">Aucun</option>
                {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} disabled={isSavingEdit}>Annuler</Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSavingEdit}>
              {isSavingEdit ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Enregistrement...</> : 'Enregistrer'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modale invitation */}
      <Modal open={isInviteOpen} onClose={() => { setIsInviteOpen(false); setInviteResult('idle'); setInviteUsername(''); }} title="Inviter un musicien">
        <form onSubmit={handleInvite} className="space-y-4">
          <p className="text-sm text-gray-500">Renseigne le nom d'utilisateur du musicien à inviter dans le groupe.</p>
          <div className="flex gap-2">
            <Input value={inviteUsername} onChange={(e) => { setInviteUsername(e.target.value); setInviteResult('idle'); }}
              placeholder="Nom d'utilisateur exact" className="flex-1" />
            <Button type="submit" className="bg-purple-600 hover:bg-purple-700 shrink-0" disabled={inviteResult === 'loading'}>
              {inviteResult === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Inviter'}
            </Button>
          </div>
          {inviteResult === 'success' && <p className="text-sm text-green-600 font-medium">✓ Musicien ajouté au groupe !</p>}
          {inviteResult === 'notfound' && <p className="text-sm text-red-500">Aucun utilisateur trouvé avec ce nom.</p>}
          {inviteResult === 'already' && <p className="text-sm text-orange-500">Ce musicien est déjà dans le groupe.</p>}
        </form>
      </Modal>

      {/* Modale suppression */}
      <Modal open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} title="Supprimer le groupe ?">
        <p className="text-sm text-gray-600 mb-4">
          Cette action est irréversible. Tous les participants, événements et messages seront définitivement supprimés.
        </p>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} disabled={isDeleting}>
            Annuler
          </Button>
          <Button className="bg-red-600 hover:bg-red-700" onClick={handleDeleteGroup} disabled={isDeleting}>
            {isDeleting ? "Suppression..." : "Supprimer définitivement"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}