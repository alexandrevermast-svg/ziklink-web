// ============================================================
// app/(protected)/groups/[id]/page.tsx
// ============================================================
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  ArrowLeft, MapPin, Users, Crown, UserPlus, Pencil,
  Camera, Loader2, Mail, Trash2, Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Group } from "@/types";
import { isOwner } from "@/lib/permissions";
import { GroupAvatar } from "../GroupAvatar";
import type { Profile, GroupMember, Message } from "./types";
import { ProfilePopup } from "./components/ProfilePopup";
import { MembersTab } from "./components/MembersTab";
import { GroupEventsTab } from "./components/GroupEventsTab";
import { ChatTab } from "./components/ChatTab";
import { EditGroupModal } from "./components/EditGroupModal";
import { InviteModal } from "./components/InviteModal";
import { DeleteGroupModal } from "./components/DeleteGroupModal";
import { SearchMusicianModal } from "./components/SearchMusicianModal";

export default function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
  const [deleteError, setDeleteError] = useState<string | null>(null);
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
  const isAdmin = myMembership?.role === 'admin' || isOwner(group, currentUserId);

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
    setDeleteError(null);
    const { error } = await supabase.rpc('delete_group', { p_group_id: id });
    if (error) {
      setDeleteError(`Erreur lors de la suppression : ${error.message}`);
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
            <Button
              size="sm"
              variant="outline"
              className="text-xs border-zik-purple/30 text-zik-purple hover:bg-zik-purple/10"
              onClick={() => setIsInviteOpen(true)}
            >
              <UserPlus className="h-3.5 w-3.5 mr-1.5" /> Inviter
            </Button>
          )}
          {isAdmin && (
            <Button
              size="sm"
              variant="outline"
              className="text-xs border-zik-purple/30 text-zik-purple hover:bg-zik-purple/10 flex items-center gap-1.5"
              onClick={() => {
                setIsSearchOpen(true);
                fetchMusicians();
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

        <MembersTab
          isAdmin={isAdmin}
          currentUserId={currentUserId}
          groupCreatedBy={group.created_by}
          pendingMembers={pendingMembers}
          confirmedMembers={confirmedMembers}
          onAvatarClick={handleAvatarClick}
          onApprove={handleApprove}
          onRemoveMember={handleRemoveMember}
          onToggleAdmin={handleToggleAdmin}
          onOpenDM={handleOpenDM}
        />

        <GroupEventsTab events={events} isMember={isMember} />

        <ChatTab
          conversationId={conversationId}
          isMember={isMember}
          isAdmin={isAdmin}
          isPendingMember={isPendingMember}
          currentUserId={currentUserId}
          messages={messages}
          messageInput={messageInput}
          onMessageInputChange={setMessageInput}
          isSending={isSending}
          onSendMessage={handleSendMessage}
          onAvatarClick={handleAvatarClick}
          onContactGroup={handleContactGroup}
          isContactingGroup={isContactingGroup}
          messagesEndRef={messagesEndRef}
        />
      </Tabs>

      <EditGroupModal
        open={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        editName={editName}
        onNameChange={setEditName}
        editBio={editBio}
        onBioChange={setEditBio}
        editCity={editCity}
        onCityChange={setEditCity}
        editGenre={editGenre}
        onGenreChange={setEditGenre}
        isSaving={isSavingEdit}
        onSave={handleSaveEdit}
      />

      <InviteModal
        open={isInviteOpen}
        onClose={() => { setIsInviteOpen(false); setInviteResult('idle'); setInviteUsername(''); }}
        inviteUsername={inviteUsername}
        onUsernameChange={(v) => { setInviteUsername(v); setInviteResult('idle'); }}
        inviteResult={inviteResult}
        onInvite={handleInvite}
      />

      <DeleteGroupModal
        open={showDeleteConfirm}
        onClose={() => { setShowDeleteConfirm(false); setDeleteError(null); }}
        isDeleting={isDeleting}
        deleteError={deleteError}
        onConfirm={handleDeleteGroup}
      />

      <SearchMusicianModal
        open={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
        selectedInstruments={selectedInstruments}
        onToggleInstrument={toggleInstrument}
        distance={distance}
        onDistanceChange={setDistance}
        groupCity={group.city}
        onlyLookingForGroup={onlyLookingForGroup}
        onToggleOnlyLookingForGroup={() => setOnlyLookingForGroup(!onlyLookingForGroup)}
        onSearch={fetchMusicians}
        isSearchLoading={isSearchLoading}
        searchResults={searchResults}
        onAvatarClick={handleAvatarClick}
        onInvite={handleInviteById}
      />
    </div>
  );
}
