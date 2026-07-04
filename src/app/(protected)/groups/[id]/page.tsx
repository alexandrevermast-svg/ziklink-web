// ============================================================
// app/(protected)/groups/[id]/page.tsx
// ============================================================
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { createPortal } from 'react-dom';
import {
  ArrowLeft, MapPin, Music2, Users, MessageCircle, Crown,
  ShieldCheck, X, UserPlus, Pencil, ChevronRight,
  Camera, Loader2, Send, CalendarDays, Mail, Trash2, Check, Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

const GENRES = ['Rock', 'Jazz', 'Blues', 'Metal', 'Pop', 'Électro', 'Folk', 'Classique', 'Hip-Hop', 'Reggae', 'Autre'];

const INSTRUMENTS = [
  { key: 'chant', label: 'Chant', emoji: '🎤' },
  { key: 'guitare', label: 'Guitare', emoji: '🎸' },
  { key: 'basse', label: 'Basse', emoji: '🎵' },
  { key: 'batterie', label: 'Batterie', emoji: '🥁' },
  { key: 'clavier', label: 'Clavier', emoji: '🎹' },
  { key: 'autres', label: 'Autres', emoji: '🎶' },
];

interface Group {
  id: string; name: string; bio: string | null;
  city: string | null; genre: string | null;
  avatar_url: string | null; created_by: string;
}
interface Profile {
  id: string;
  username: string | null;
  avatar_url: string | null;
  city: string | null;
  instruments: string[] | null;
  looking_for_group: boolean;
}
interface GroupMember {
  user_id: string;
  role: string;
  status: string;
  instrument: string | null;
  profile: Profile | null;
}
interface Message {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  profile: Profile | null;
}

interface SearchableProfile extends Profile {
  distance?: number;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function GroupAvatar({ group, size = 'md' }: { group: Pick<Group, 'name' | 'avatar_url'>; size?: 'sm' | 'md' | 'lg' }) {
  const cls = size === 'lg' ? 'h-24 w-24 text-3xl' : size === 'md' ? 'h-12 w-12 text-lg' : 'h-8 w-8 text-sm';
  const initials = group.name.slice(0, 2).toUpperCase();
  return group.avatar_url ? (
    <img src={group.avatar_url} alt={group.name} className={`${cls} rounded-2xl object-cover shrink-0`} />
  ) : (
    <div className={`${cls} rounded-2xl bg-linear-to-br from-zik-purple to-zik-indigo flex items-center justify-center text-white font-bold shrink-0`}>
      {initials}
    </div>
  );
}

function MemberAvatar({ profile, size = 'md', onClick }: {
  profile: Profile | null;
  size?: 'sm' | 'md';
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}) {
  const cls = size === 'sm' ? 'h-6 w-6 text-[9px]' : 'h-10 w-10 text-sm';
  const initials = profile?.username?.slice(0, 2).toUpperCase() ?? '?';
  const interactClass = onClick ? "cursor-pointer hover:ring-2 hover:ring-zik-purple/50 hover:ring-offset-1 transition-all" : "";

  return profile?.avatar_url ? (
    <img
      src={profile.avatar_url}
      alt={profile.username ?? ''}
      onClick={onClick}
      className={`${cls} ${interactClass} rounded-full object-cover shrink-0`}
    />
  ) : (
    <div
      onClick={onClick}
      className={`${cls} ${interactClass} rounded-full bg-zik-purple flex items-center justify-center text-white font-semibold shrink-0`}
    >
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
      <div
        style={{ position: 'absolute', inset: 0, background: 'rgba(14, 11, 22, 0.8)' }}
        onClick={onClose}
      />
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'var(--zik-card)',
        borderRadius: '12px',
        padding: '24px',
        width: 'min(90vw, 560px)',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        color: 'var(--zik-text)',
      }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-zik-text">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-zik-card-hover text-zik-muted hover:text-zik-text transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}

// ✅ Composant ProfilePopup intégré
function ProfilePopup({ profile, anchorRef, onClose, onMessage, onViewProfile }: {
  profile: Profile;
  anchorRef: React.RefObject<HTMLElement>;
  onClose: () => void;
  onMessage: (userId: string) => void;
  onViewProfile: (userId: string) => void;
}) {
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        popupRef.current && !popupRef.current.contains(e.target as Node) &&
        anchorRef.current && !anchorRef.current.contains(e.target as Node)
      ) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose, anchorRef]);

  const rect = anchorRef.current?.getBoundingClientRect();

  return createPortal(
    <div
      ref={popupRef}
      className="fixed z-99998 bg-zik-card rounded-xl shadow-xl border border-zik-border p-3 min-w-45 animate-in fade-in slide-in-from-top-2 duration-200"
      style={{
        top: (rect?.bottom ?? 0) + 6,
        left: Math.min(rect?.left ?? 0, window.innerWidth - 200),
        zIndex: 100000,
      }}
    >
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-zik-border">
        <MemberAvatar profile={profile} size="sm" />
        <span className="text-sm font-semibold text-zik-text truncate">{profile.username ?? "Inconnu"}</span>
      </div>
      <button
        onClick={() => { onViewProfile(profile.id); onClose(); }}
        className="w-full flex items-center gap-2 text-xs text-zik-text font-medium hover:bg-zik-card-hover rounded-lg px-2 py-1.5 transition-colors mb-1"
      >
        <Users className="h-3.5 w-3.5 text-zik-purple" /> Voir le profil
      </button>
      <button
        onClick={() => { onMessage(profile.id); onClose(); }}
        className="w-full flex items-center gap-2 text-xs text-zik-purple font-medium hover:bg-zik-purple/10 rounded-lg px-2 py-1.5 transition-colors"
      >
        <MessageCircle className="h-3.5 w-3.5" /> Envoyer un message
      </button>
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

  // États pour le popup de profil
  const [popupProfile, setPopupProfile] = useState<Profile | null>(null);
  const popupAnchorRef = useRef<HTMLElement | null>(null);

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

// États pour la modale de recherche de musiciens
const [isSearchOpen, setIsSearchOpen] = useState(false);
const [searchTerm, setSearchTerm] = useState("");
const [selectedInstruments, setSelectedInstruments] = useState<string[]>([]);
const [distance, setDistance] = useState<number>(50);
const [onlyLookingForGroup, setOnlyLookingForGroup] = useState(true);
const [searchResults, setSearchResults] = useState<Profile[]>([]);
const [isSearchLoading, setIsSearchLoading] = useState(false);

  // ✅ Fonction pour gérer le clic sur un avatar (corrigée)
  const handleAvatarClick = (profile: Profile, e: React.MouseEvent<HTMLDivElement>) => {
    if (profile.id === currentUserId) return;
    e.stopPropagation();
    popupAnchorRef.current = e.currentTarget;
    setPopupProfile(profile);
  };

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
      .select('user_id, role, status, instrument, profile:profiles(id, username, avatar_url, city, instruments)')
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

  const handleApprove = async (userId: string) => {
    await supabase.rpc('approve_group_member', { p_group_id: id, p_user_id: userId });
    await fetchAll();
  };

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
    const { data: convId } = await supabase.rpc('get_or_create_direct_conversation', { p_other_user_id: targetUserId });
    if (convId) router.push(`/messages/${convId}`);
  };

  const handleViewProfile = useCallback((userId: string) => {
    router.push(`/profile/${userId}`);
  }, [router]);

  const fetchMusicians = useCallback(async () => {
  if (!currentUserId) return;
  setIsSearchLoading(true);
  try {
    let query = supabase
      .from("profiles")
      .select("id, username, avatar_url, city, instruments, looking_for_group")
      .neq("id", currentUserId)
      .eq("looking_for_group", onlyLookingForGroup);

    if (selectedInstruments.length > 0) {
      query = query.contains("instruments", selectedInstruments);
    }

    if (searchTerm.trim()) {
      query = query.ilike("username", `%${searchTerm.trim()}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    let filteredProfiles = data || [];
    if (group?.city && distance > 0) {
      filteredProfiles = filteredProfiles.filter(
        (profile) => profile.city?.toLowerCase() === group.city?.toLowerCase()
      );
    }

    setSearchResults(filteredProfiles);
  } catch (err) {
    console.error(err);
  } finally {
    setIsSearchLoading(false);
  }
}, [searchTerm, selectedInstruments, distance, onlyLookingForGroup, group?.city, currentUserId]);


const toggleInstrument = (instrument: string) => {
  setSelectedInstruments((prev) =>
    prev.includes(instrument)
      ? prev.filter((i) => i !== instrument)
      : [...prev, instrument]
  );
};

const handleInviteById = async (userId: string) => {
  if (!isAdmin) return;

  try {
    if (members.some((m) => m.user_id === userId)) {
      setInviteResult('already');
      return;
    }

    await supabase.from('group_members').insert({
      group_id: id,
      user_id: userId,
      role: 'member',
      status: 'confirmed'
    });

    if (conversationId) {
      await supabase.from('conversation_participants').upsert({
        conversation_id: conversationId,
        user_id: userId
      });
    }

    setInviteResult('success');
    await fetchAll();
    setIsSearchOpen(false);
    setTimeout(() => setInviteResult('idle'), 2000);
  } catch (error) {
    console.error("Erreur lors de l'invitation:", error);
    setInviteResult('notfound');
  }
};

  // ✅ Loading skeleton adapté
  if (isLoading) return (
    <div className="flex flex-col gap-4 p-4">
      <div className="h-8 w-24 bg-zik-card animate-pulse rounded" />
      <div className="h-32 bg-zik-card animate-pulse rounded-xl" />
      <div className="h-48 bg-zik-card animate-pulse rounded-xl" />
    </div>
  );

  if (!group) return (
    <div className="p-4 text-center text-zik-muted">
      <p>Groupe introuvable.</p>
      <Button variant="outline" className="mt-4 border-zik-border text-zik-text hover:bg-zik-card-hover" onClick={() => router.back()}>
        Retour
      </Button>
    </div>
  );

  return (
    <div className="flex flex-col pb-24">
      {/* Popup de profil */}
      {popupProfile && (
        <ProfilePopup
          profile={popupProfile}
          anchorRef={popupAnchorRef}
          onClose={() => setPopupProfile(null)}
          onMessage={handleOpenDM}
          onViewProfile={handleViewProfile}
        />
      )}

      {/* Header */}
      <div className="px-4 pt-4 pb-4 border-b border-zik-border">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm text-zik-muted hover:text-zik-text transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Retour
          </button>
          <div className="flex gap-2">
            {isAdmin && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs flex items-center gap-1.5 border-zik-border text-zik-text hover:border-zik-purple hover:text-zik-purple"
                  onClick={() => setIsEditOpen(true)}
                >
                  <Pencil className="h-3.5 w-3.5" /> Modifier
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs flex items-center gap-1.5 border-zik-red/30 text-zik-red hover:border-zik-red hover:text-zik-red hover:bg-zik-red/10"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Supprimer
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="flex items-start gap-4">
          <div className="relative shrink-0">
            <GroupAvatar group={group} size="lg" />
            {isAdmin && (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAvatar}
                className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-zik-card border border-zik-border shadow flex items-center justify-center hover:bg-zik-card-hover transition-colors"
              >
                {isUploadingAvatar ?
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-zik-muted" /> :
                  <Camera className="h-3.5 w-3.5 text-zik-muted" />
                }
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-zik-text truncate">{group.name}</h1>
            <div className="flex flex-wrap gap-2 mt-1">
              {group.genre && (
                <span className="text-xs bg-zik-purple/10 text-zik-purple font-medium px-2.5 py-0.5 rounded-full">
                  {group.genre}
                </span>
              )}
              {group.city && (
                <span className="flex items-center gap-1 text-xs text-zik-muted">
                  <MapPin className="h-3 w-3" />{group.city}
                </span>
              )}
              <span className="flex items-center gap-1 text-xs text-zik-muted">
                <Users className="h-3 w-3" />
                {confirmedMembers.length} membre{confirmedMembers.length > 1 ? 's' : ''}
              </span>
            </div>
            {group.bio && (
              <p className="text-sm text-zik-muted mt-2 leading-relaxed">{group.bio}</p>
            )}
          </div>
        </div>

        {/* Boutons d'action */}
        <div className="flex gap-2 mt-4 flex-wrap">
          {!isMember && !isPendingMember && currentUserId && (
            <>
              <Button
                size="sm"
                className="bg-zik-purple hover:bg-zik-indigo text-xs"
                onClick={handleJoin}
                disabled={isJoining}
              >
                {isJoining ?
                  <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Envoi...</> :
                  <><UserPlus className="h-3.5 w-3.5 mr-1.5" /> Demander à rejoindre</>
                }
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs border-zik-border text-zik-text hover:bg-zik-card-hover"
                onClick={handleContactGroup}
                disabled={isContactingGroup}
              >
                {isContactingGroup ?
                  <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Ouverture...</> :
                  <><Mail className="h-3.5 w-3.5 mr-1.5" /> Contacter le groupe</>
                }
              </Button>
            </>
          )}
          {isPendingMember && (
            <span className="text-xs text-zik-orange font-medium px-3 py-1.5 bg-zik-orange/10 rounded-full">
              ⏳ Demande en attente d'approbation
            </span>
          )}
          {!currentUserId && (
            <Button
              size="sm"
              variant="outline"
              className="text-xs border-zik-border text-zik-text hover:bg-zik-card-hover"
              onClick={() => router.push('/login')}
            >
              <Mail className="h-3.5 w-3.5 mr-1.5" /> Contacter le groupe
            </Button>
          )}
          {isMember && !isAdmin && (
            <Button
              size="sm"
              variant="outline"
              className="text-xs border-zik-border text-zik-muted hover:border-zik-red hover:text-zik-red"
              onClick={handleLeave}
            >
              Quitter le groupe
            </Button>
          )}
          {isAdmin && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="text-xs border-zik-purple/30 text-zik-purple hover:bg-zik-purple/10"
                onClick={() => setIsInviteOpen(true)}
              >
                <UserPlus className="h-3.5 w-3.5 mr-1.5" /> Inviter
              </Button>
            </>
          )}
          {isAdmin && (
  <Button
    size="sm"
    variant="outline"
    className="text-xs border-zik-purple/30 text-zik-purple hover:bg-zik-purple/10 flex items-center gap-1.5"
    onClick={() => {
      setIsSearchOpen(true);
      fetchMusicians(); // Charge les musiciens dès l'ouverture
    }}
  >
    <Search className="h-3.5 w-3.5" />
    Chercher un musicien
  </Button>
)}
        </div>
      </div>

      {/* Onglets */}
      <Tabs defaultValue="members" className="flex-1 flex flex-col">
        <TabsList className="grid grid-cols-3 mx-4 mt-3 shrink-0">
          <TabsTrigger value="members" className="text-zik-text">
            Membres
            {confirmedMembers.length > 0 && (
              <span className="ml-1.5 bg-zik-purple/10 text-zik-purple text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                {confirmedMembers.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="events" className="text-zik-text">
            Événements
            {events.length > 0 && (
              <span className="ml-1.5 bg-zik-purple/10 text-zik-purple text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                {events.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="chat" className="text-zik-text">
            Chat
            {messages.length > 0 && (
              <span className="ml-1.5 bg-zik-purple/10 text-zik-purple text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                {messages.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* MEMBRES */}
        <TabsContent value="members" className="px-4 py-3 space-y-2">
          {isAdmin && pendingMembers.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-semibold text-zik-orange uppercase tracking-wide mb-2">
                En attente · {pendingMembers.length}
              </p>
              <div className="space-y-2">
                {pendingMembers.map((m) => (
                  <div
                    key={m.user_id}
                    className="flex items-center justify-between gap-2 p-3 rounded-lg bg-zik-orange/10 border border-zik-orange/20"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <MemberAvatar
                        profile={m.profile}
                        onClick={(e) => m.profile && handleAvatarClick(m.profile, e)}
                      />
                      <span className="text-sm font-medium text-zik-text truncate">
                        {m.profile?.username ?? 'Inconnu'}
                      </span>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        className="h-7 text-xs bg-zik-emerald hover:bg-zik-emerald/80 px-2"
                        onClick={() => handleApprove(m.user_id)}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs border-zik-red/30 text-zik-red hover:bg-zik-red/10 px-2"
                        onClick={() => handleRemoveMember(m.user_id)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {confirmedMembers.length === 0 ? (
            <p className="text-sm text-zik-muted text-center py-6">Aucun membre pour l'instant</p>
          ) : confirmedMembers.map((m) => {
            const isCreator = m.user_id === group.created_by;
            const isAdminMember = m.role === 'admin';
            return (
              <div
                key={m.user_id}
                className={`flex items-center gap-3 p-3 rounded-xl border ${
                  isAdminMember
                    ? 'bg-zik-purple/10 border-zik-purple/20'
                    : 'bg-zik-card/50 border-zik-border'
                }`}
              >
                <MemberAvatar
                  profile={m.profile}
                  onClick={(e) => m.profile && handleAvatarClick(m.profile, e)}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-zik-text truncate">
                    {m.profile?.username ?? 'Inconnu'}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {isCreator && (
                      <span className="flex items-center gap-0.5 text-xs text-zik-indigo">
                        <Crown className="h-3 w-3" /> Créateur
                      </span>
                    )}
                    {isAdminMember && !isCreator && (
                      <span className="flex items-center gap-0.5 text-xs text-zik-purple">
                        <ShieldCheck className="h-3 w-3" /> Admin
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {m.user_id !== currentUserId && (
                    <button
                      onClick={() => handleOpenDM(m.user_id)}
                      className="h-7 w-7 flex items-center justify-center rounded-full text-zik-muted hover:text-zik-purple hover:bg-zik-purple/10 transition-colors"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {isAdmin && m.user_id !== currentUserId && !isCreator && (
                    <>
                      <button
                        onClick={() => handleToggleAdmin(m.user_id, m.role)}
                        className={`h-7 w-7 flex items-center justify-center rounded-full transition-colors ${
                          isAdminMember
                            ? 'text-zik-purple hover:bg-zik-purple/10'
                            : 'text-zik-muted hover:text-zik-purple hover:bg-zik-purple/10'
                        }`}
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleRemoveMember(m.user_id)}
                        className="h-7 w-7 flex items-center justify-center rounded-full text-zik-muted hover:text-zik-red hover:bg-zik-red/10 transition-colors"
                      >
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
              <CalendarDays className="h-10 w-10 text-zik-muted mx-auto mb-3" />
              <p className="text-sm text-zik-muted mb-3">Aucun événement organisé par ce groupe</p>
              {isMember && (
                <div className="flex gap-2 justify-center flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs border-zik-border text-zik-text hover:bg-zik-card-hover"
                    onClick={() => router.push('/events')}
                  >
                    🎸 Organiser une jam
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs border-zik-border text-zik-text hover:bg-zik-card-hover"
                    onClick={() => router.push('/events')}
                  >
                    🎤 Ajouter un concert
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {events.map((event) => (
                <button
                  key={`${event.type}-${event.id}`}
                  onClick={() => router.push(`/events/${event.type === 'jam' ? 'jams' : 'concerts'}/${event.id}`)}
                  className={`w-full flex items-center justify-between gap-3 p-3 rounded-xl border transition-all text-left ${
                    event.type === 'jam'
                      ? 'bg-zik-card/50 border-zik-border hover:border-zik-purple/30 hover:bg-zik-purple/5'
                      : 'bg-zik-card/50 border-zik-border hover:border-zik-red/30 hover:bg-zik-red/5'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-base shrink-0">{event.type === 'jam' ? '🎸' : '🎤'}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-zik-text truncate">{event.title}</p>
                      {event.type === 'concert' && event.artist && (
                        <p className="text-xs text-zik-purple font-medium truncate">{event.artist}</p>
                      )}
                      <p className="text-xs text-zik-muted">{formatDate(event.start_time)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                      event.type === 'jam'
                        ? 'bg-zik-emerald/10 text-zik-emerald'
                        : 'bg-zik-red/10 text-zik-red'
                    }`}>
                      {event.type === 'jam' ? 'Jam' : 'Concert'}
                    </span>
                    <ChevronRight className="h-4 w-4 text-zik-muted" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </TabsContent>

        {/* CHAT */}
        <TabsContent value="chat" className="flex-1 flex flex-col overflow-hidden px-0 py-0 min-h-100">
          {!conversationId ? (
            <div className="flex-1 flex items-center justify-center text-sm text-zik-muted p-4">
              Le chat sera disponible prochainement.
            </div>
          ) : !isMember && !isAdmin ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-sm text-zik-muted p-4 text-center">
              <p>Ce chat est réservé aux membres du groupe 💬</p>
              {currentUserId && !isPendingMember && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs border-zik-border text-zik-text hover:bg-zik-card-hover"
                  onClick={handleContactGroup}
                  disabled={isContactingGroup}
                >
                  {isContactingGroup ?
                    <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Ouverture...</> :
                    <><Mail className="h-3.5 w-3.5 mr-1.5" /> Contacter le groupe</>
                  }
                </Button>
              )}
              {isPendingMember && (
                <span className="text-xs text-zik-orange font-medium">
                  ⏳ Demande en attente d'approbation
                </span>
              )}
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                {messages.length === 0 ? (
                  <p className="text-sm text-zik-muted text-center py-8">
                    Pas encore de messages — lancez la discussion ! 🎸
                  </p>
                ) : messages.map((msg) => {
                  const isMe = msg.user_id === currentUserId;
                  return (
                    <div key={msg.id} className={`flex gap-2.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                      {!isMe && <MemberAvatar profile={msg.profile} size="sm" onClick={(e) => msg.profile && handleAvatarClick(msg.profile, e)} />}
                      <div className={`max-w-[75%] flex flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}>
                        {!isMe && (
                          <span className="text-xs text-zik-muted ml-0.5">
                            {msg.profile?.username ?? 'Inconnu'}
                          </span>
                        )}
                        <div className={`px-3 py-2 rounded-2xl text-sm ${
                          isMe
                            ? 'bg-zik-purple text-white rounded-tr-sm'
                            : 'bg-zik-card/80 text-zik-text rounded-tl-sm border border-zik-border'
                        }`}>
                          {msg.content}
                        </div>
                        <span className="text-[10px] text-zik-muted mx-1">
                          {new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
              <form onSubmit={handleSendMessage} className="border-t border-zik-border px-4 py-3 flex gap-2 items-center shrink-0">
                <Input
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder="Envoyer un message..."
                  className="flex-1 text-sm bg-zik-card border-zik-border text-zik-text placeholder:text-zik-muted focus:ring-zik-purple/50"
                  disabled={isSending}
                />
                <Button
                  type="submit"
                  size="sm"
                  className="bg-zik-purple hover:bg-zik-indigo shrink-0 disabled:opacity-50"
                  disabled={!messageInput.trim() || isSending}
                >
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
            <label className="text-sm font-medium text-zik-text mb-1 block">
              Nom <span className="text-zik-red">*</span>
            </label>
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              required
              className="bg-zik-card border-zik-border text-zik-text placeholder:text-zik-muted focus:ring-zik-purple/50"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-zik-text mb-1 block">Description</label>
            <textarea
              value={editBio}
              onChange={(e) => setEditBio(e.target.value)}
              rows={3}
              maxLength={280}
              className="w-full border-zik-border rounded-lg px-3 py-2 text-sm resize-none outline-none bg-zik-card text-zik-text placeholder:text-zik-muted focus:ring-zik-purple/50"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-zik-text mb-1 block">Ville</label>
              <Input
                value={editCity}
                onChange={(e) => setEditCity(e.target.value)}
                className="bg-zik-card border-zik-border text-zik-text placeholder:text-zik-muted focus:ring-zik-purple/50"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-zik-text mb-1 block">Genre</label>
              <select
                value={editGenre}
                onChange={(e) => setEditGenre(e.target.value)}
                className="w-full border-zik-border rounded-md text-sm px-3 py-2 bg-zik-card text-zik-text focus:outline-none focus:ring-2 focus:ring-zik-purple"
              >
                <option value="">Aucun</option>
                {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditOpen(false)}
              disabled={isSavingEdit}
              className="border-zik-border text-zik-text hover:bg-zik-card-hover"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              className="bg-zik-purple hover:bg-zik-indigo disabled:opacity-50"
              disabled={isSavingEdit}
            >
              {isSavingEdit ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Enregistrement...</> : 'Enregistrer'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modale invitation */}
      <Modal open={isInviteOpen} onClose={() => { setIsInviteOpen(false); setInviteResult('idle'); setInviteUsername(''); }} title="Inviter un musicien">
        <form onSubmit={handleInvite} className="space-y-4">
          <p className="text-sm text-zik-muted">Renseigne le nom d'utilisateur du musicien à inviter dans le groupe.</p>
          <div className="flex gap-2">
            <Input
              value={inviteUsername}
              onChange={(e) => { setInviteUsername(e.target.value); setInviteResult('idle'); }}
              placeholder="Nom d'utilisateur exact"
              className="flex-1 bg-zik-card border-zik-border text-zik-text placeholder:text-zik-muted focus:ring-zik-purple/50"
            />
            <Button
              type="submit"
              className="bg-zik-purple hover:bg-zik-indigo shrink-0 disabled:opacity-50"
              disabled={inviteResult === 'loading'}
            >
              {inviteResult === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Inviter'}
            </Button>
          </div>
          {inviteResult === 'success' && (
            <p className="text-sm text-zik-emerald font-medium">✓ Musicien ajouté au groupe !</p>
          )}
          {inviteResult === 'notfound' && (
            <p className="text-sm text-zik-red">Aucun utilisateur trouvé avec ce nom.</p>
          )}
          {inviteResult === 'already' && (
            <p className="text-sm text-zik-orange">Ce musicien est déjà dans le groupe.</p>
          )}
        </form>
      </Modal>

      {/* Modale suppression */}
      <Modal open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} title="Supprimer le groupe ?">
        <p className="text-sm text-zik-muted mb-4">
          Cette action est irréversible. Tous les participants, événements et messages seront définitivement supprimés.
        </p>
        <div className="flex gap-2 justify-end">
          <Button
            variant="outline"
            onClick={() => setShowDeleteConfirm(false)}
            disabled={isDeleting}
            className="border-zik-border text-zik-text hover:bg-zik-card-hover"
          >
            Annuler
          </Button>
          <Button
            className="bg-zik-red hover:bg-zik-red/80 disabled:opacity-50"
            onClick={handleDeleteGroup}
            disabled={isDeleting}
          >
            {isDeleting ? "Suppression..." : "Supprimer définitivement"}
          </Button>
        </div>
      </Modal>
      {/* Modale de recherche de musiciens */}
<Modal open={isSearchOpen} onClose={() => setIsSearchOpen(false)} title="Chercher un musicien">
  <div className="space-y-4">
    {/* Filtres */}
    <div className="space-y-3">
      <div>
        <label className="text-sm font-medium text-zik-text mb-1 block">
          Rechercher par nom
        </label>
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Nom d'utilisateur..."
          className="bg-zik-card border-zik-border text-zik-text placeholder:text-zik-muted focus:ring-zik-purple/50"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-zik-text mb-1 block">
          Instruments
        </label>
        <div className="flex flex-wrap gap-2">
          {INSTRUMENTS.map((inst) => {
            const isSelected = selectedInstruments.includes(inst.key);
            return (
              <button
                key={inst.key}
                onClick={() => toggleInstrument(inst.key)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                  isSelected
                    ? "bg-zik-purple text-white border-zik-purple"
                    : "bg-zik-card text-zik-muted border-zik-border hover:border-zik-purple hover:text-zik-purple"
                }`}
              >
                <span>{inst.emoji}</span> {inst.label}
              </button>
            );
          })}
        </div>
      </div>

      {group?.city && (
        <div>
          <label className="text-sm font-medium text-zik-text mb-1 block">
            Distance (km) - {group.city}
          </label>
          <Input
            type="number"
            value={distance}
            onChange={(e) => setDistance(Number(e.target.value) || 0)}
            min="0"
            max="200"
            className="bg-zik-card border-zik-border text-zik-text placeholder:text-zik-muted focus:ring-zik-purple/50"
          />
        </div>
      )}

      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-zik-text cursor-pointer">
          Uniquement ceux qui cherchent un groupe
        </label>
        <Button
          variant={onlyLookingForGroup ? "default" : "outline"}
          size="sm"
          className={`h-7 w-7 p-0 ${
            onlyLookingForGroup
              ? "bg-zik-purple hover:bg-zik-indigo"
              : "border-zik-border text-zik-muted hover:bg-zik-card-hover"
          }`}
          onClick={() => setOnlyLookingForGroup(!onlyLookingForGroup)}
        >
          {onlyLookingForGroup ? "✓" : "✗"}
        </Button>
      </div>
    </div>

    {/* Bouton de recherche */}
    <Button
      onClick={fetchMusicians}
      disabled={isSearchLoading}
      className="w-full bg-zik-purple hover:bg-zik-indigo"
    >
      {isSearchLoading ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Recherche...
        </>
      ) : (
        <>
          <Search className="h-4 w-4 mr-2" />
          Rechercher
        </>
      )}
    </Button>

    {/* Résultats */}
    <div className="max-h-96 overflow-y-auto space-y-2">
      {searchResults.length === 0 ? (
        <p className="text-sm text-zik-muted text-center py-4">
          Aucun musicien trouvé avec ces critères.
        </p>
      ) : (
        searchResults.map((profile) => (
          <div
            key={profile.id}
            className="flex items-center justify-between gap-3 p-3 rounded-lg bg-zik-card/50 border border-zik-border"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <MemberAvatar
                profile={profile}
                onClick={(e) => {
                  e.stopPropagation();
                  popupAnchorRef.current = e.currentTarget;
                  setPopupProfile(profile);
                }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zik-text truncate">
                  {profile.username ?? "Inconnu"}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-0.5">
                  {profile.city && (
                    <span className="flex items-center gap-0.5 text-xs text-zik-muted">
                      <MapPin className="h-3 w-3" /> {profile.city}
                    </span>
                  )}
                  {profile.instruments?.map((inst) => {
                    const instrument = INSTRUMENTS.find((i) => i.key === inst);
                    return instrument ? (
                      <span
                        key={inst}
                        className="text-xs bg-zik-purple/10 text-zik-purple px-1.5 py-0.5 rounded-full"
                      >
                        {instrument.emoji} {instrument.label}
                      </span>
                    ) : null;
                  })}
                </div>
              </div>
            </div>
            <Button
              size="sm"
              className="bg-zik-purple/10 text-zik-purple hover:bg-zik-purple/20"
              onClick={() => handleInviteById(profile.id)}
            >
              <UserPlus className="h-3.5 w-3.5 mr-1" />
              Inviter
            </Button>
          </div>
        ))
      )}
    </div>
  </div>
</Modal>
    </div>
  );
}