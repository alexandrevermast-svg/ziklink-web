'use client';

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft, Lock, Unlock, MapPin, Clock,
  UserPlus, Check, Crown, ShieldCheck, Pencil,
  Radio, Trash2, ChevronUp, ChevronDown, Heart
} from 'lucide-react';
import JamEditForm from "@/components/JamEditForm";
import Modal from "@/components/Modal";
import ShareButton from "@/components/ShareButton";
import type { JamSession } from "@/types";
import { useJamParticipation } from "@/hooks/useJamParticipation";
import { useJamInterest } from "@/hooks/useJamInterest";
import { isOwner } from "@/lib/permissions";
import { canJoinJam, joinOpensAt } from "@/lib/jamJoinWindow";
import type { Profile, Participant, Message, JamSlot } from "./types";
import { TRAILING_EMPTY_ROWS } from "./types";
import { formatDate, formatTime, getAddress } from "./utils";
import { ParticipantPicker } from "./components/ParticipantPicker";
import { ProfilePopup } from "./components/ProfilePopup";
import { JamPoster } from "./components/JamPoster";
import { ParticipantsTab } from "./components/ParticipantsTab";
import { SlotsTab } from "./components/SlotsTab";
import { ChatTab } from "./components/ChatTab";

interface JamDetailClientProps {
  jamId: string;
  initialJam: JamSession | null;
  initialParticipants: Participant[];
  initialSlots: JamSlot[];
}

export default function JamDetailClient({ jamId, initialJam, initialParticipants, initialSlots }: JamDetailClientProps) {
  const id = jamId;
  const router = useRouter();
  const supabase = createClient();

  const [jam, setJam] = useState<JamSession | null>(initialJam);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Participant[]>(initialParticipants);
  const [messages, setMessages] = useState<Message[]>([]);
  const [slots, setSlots] = useState<JamSlot[]>(initialSlots);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(!initialJam);
  const [messageInput, setMessageInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingSongSlotId, setEditingSongSlotId] = useState<string | null>(null);
  const [songInputValue, setSongInputValue] = useState("");
  const [editingScaleSlotId, setEditingScaleSlotId] = useState<string | null>(null);
  const [scaleInputValue, setScaleInputValue] = useState("");
  const [popupProfile, setPopupProfile] = useState<Profile | null>(null);
  const popupAnchorRef = useRef<HTMLElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [claimingCell, setClaimingCell] = useState<{ instrument: string; slot_index: number } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [pickerCell, setPickerCell] = useState<{ instrument: string; slot_index: number; anchorEl: HTMLElement } | null>(null);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Record<string, boolean>>({});

  // ── État upload poster ─────────────────────────────────────────────────
  const [isUploadingPoster, setIsUploadingPoster] = useState(false);

  const { joinJam, leaveJam } = useJamParticipation();
  const { markInterested, unmarkInterested, pendingJamId: interestPendingId } = useJamInterest();
  const [isInterested, setIsInterested] = useState(false);
  const isMainOrganizer = isOwner(jam, currentUserId);
  const isCoOrganizer = participants.some((p) => p.user_id === currentUserId && p.is_organizer && p.status === "confirmed");
  const isOrganizer = isMainOrganizer || isCoOrganizer;
  const isParticipant = participants.some((p) => p.user_id === currentUserId && p.status === "confirmed");
  const isPending = participants.some((p) => p.user_id === currentUserId && p.status === "pending");
  const canInteract = isParticipant || isOrganizer;
  const joinOpen = jam ? canJoinJam(jam.start_time) : false;

  const numRows = useMemo(() => {
    if (slots.length === 0) return TRAILING_EMPTY_ROWS;
    const maxIndex = Math.max(...slots.map((s) => s.slot_index));
    return maxIndex + 1 + TRAILING_EMPTY_ROWS;
  }, [slots]);

  const fetchAll = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id ?? null);

    const { data: jamData } = await supabase
      .from("jam_sessions")
      .select("*")
      .eq("id", id)
      .single();
    setJam(jamData);

    const { data: participantsData } = await supabase
      .from("jam_participants")
      .select("user_id, status, is_organizer, profile:profiles(id, username, avatar_url)")
      .eq("jam_id", id);
    setParticipants((participantsData ?? []).map((p: any) => ({
      user_id: p.user_id, status: p.status ?? "confirmed",
      is_organizer: p.is_organizer ?? false, profile: p.profile ?? null,
    })));

    if (user) {
      const { data: interestData } = await supabase
        .from("jam_interested").select("jam_id")
        .eq("jam_id", id).eq("user_id", user.id).maybeSingle();
      setIsInterested(!!interestData);

      const { data: convData } = await supabase
        .from("conversations").select("id").eq('entity_id', id).eq('type', 'jam').single();
      if (convData) {
        setConversationId(convData.id);
        const { data: messagesData } = await supabase
          .from("messages").select("id, user_id, content, created_at, profile:profiles(id, username, avatar_url)")
          .eq("conversation_id", convData.id).order("created_at", { ascending: true });
        setMessages((messagesData ?? []).map((m: any) => ({ ...m, profile: m.profile ?? null })));
      }
    }

    const { data: slotsData } = await supabase
      .from("jam_slots").select("*, profile:profiles(id, username, avatar_url)").eq("jam_id", id);
    setSlots((slotsData ?? []).map((s: any) => ({ ...s, profile: s.profile ?? null })));
    setIsLoading(false);
  }, [id]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const channel = supabase.channel(`jam-session-${id}`)
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "jam_sessions", filter: `id=eq.${id}`,
      }, (payload) => {
        setJam((prev) => prev ? {
          ...prev,
          current_slot_index: (payload.new as any).current_slot_index,
          poster_url: (payload.new as any).poster_url ?? prev.poster_url,
        } : prev);
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase.channel(`jam-chat-${conversationId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        async (payload) => {
          const msg = payload.new as any;
          const { data: profile } = await supabase.from("profiles").select("id, username, avatar_url").eq("id", msg.user_id).single();
          setMessages((prev) => [...prev, { ...msg, profile: profile ?? null }]);
        }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // ── Upload poster ──────────────────────────────────────────────────────
  const handlePosterUpload = async (file: File) => {
    if (!jam || !isOrganizer) return;
    setIsUploadingPoster(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `jams/${jam.id}/poster.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true });

      if (uploadError) {
        console.error('Erreur upload:', uploadError);
        return;
      }

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      const posterUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from('jam_sessions')
        .update({ poster_url: posterUrl })
        .eq('id', jam.id);

      if (!updateError) {
        setJam((prev) => prev ? { ...prev, poster_url: posterUrl } : prev);
      }
    } finally {
      setIsUploadingPoster(false);
    }
  };

  const handleSetCurrentSlot = useCallback(async (slotIndex: number) => {
    if (!isOrganizer || !jam) return;
    const isSameSlot = jam.current_slot_index === slotIndex;
    const newIndex = isSameSlot ? null : slotIndex;
    setJam((prev) => prev ? { ...prev, current_slot_index: newIndex } : prev);
    await supabase.from("jam_sessions").update({ current_slot_index: newIndex }).eq("id", id);
    if (newIndex !== null) {
      const nextSlotUsers = slots
        .filter((s) => s.slot_index === newIndex + 1 && !!s.user_id)
        .map((s) => s.user_id as string);
      for (const userId of nextSlotUsers) {
        if (userId === currentUserId) continue;
        await supabase.from("notifications").insert({
          user_id: userId, type: "jam_turn",
          title: "Tu passes bientôt ! 🎸",
          body: `Tu es le prochain sur "${jam.title}"`,
          link: `/events/jams/${id}`,
        });
      }
    }
  }, [isOrganizer, jam, slots, id, currentUserId]);

  const handleJoin = async () => {
    if (!currentUserId) { router.push(`/login?next=${encodeURIComponent(`/events/jams/${id}`)}`); return; }
    if (!jam) return;
    const status = jam.is_open ? "confirmed" : "pending";
    await joinJam(id, currentUserId, status);
    if (conversationId) await supabase.from("conversation_participants").insert({ conversation_id: conversationId, user_id: currentUserId });
    await fetchAll();
  };

  const handleLeave = async () => {
    if (!currentUserId) return;
    await leaveJam(id, currentUserId);
    await fetchAll();
  };

  const handleToggleInterest = async () => {
    if (!currentUserId) { router.push(`/login?next=${encodeURIComponent(`/events/jams/${id}`)}`); return; }
    if (isInterested) {
      await unmarkInterested(id, currentUserId);
      setIsInterested(false);
    } else {
      await markInterested(id, currentUserId);
      setIsInterested(true);
    }
  };

  const handleAccept = async (userId: string) => {
    await supabase.from("jam_participants").update({ status: "confirmed" }).eq("jam_id", id).eq("user_id", userId);
    if (conversationId) await supabase.from("conversation_participants").upsert({ conversation_id: conversationId, user_id: userId });
    await fetchAll();
  };

  const handleReject = async (userId: string) => {
    await supabase.from("jam_participants").delete().eq("jam_id", id).eq("user_id", userId);
    await fetchAll();
  };

  const handleToggleCoOrganizer = async (userId: string, currentIsOrganizer: boolean) => {
    await supabase.from("jam_participants").update({ is_organizer: !currentIsOrganizer }).eq("jam_id", id).eq("user_id", userId);
    await fetchAll();
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !currentUserId || !conversationId) return;
    setIsSending(true);
    await supabase.from("messages").insert({ conversation_id: conversationId, user_id: currentUserId, content: messageInput.trim() });
    setMessageInput("");
    setIsSending(false);
  };

  const handleOpenDM = useCallback(async (targetUserId: string) => {
    if (!currentUserId || targetUserId === currentUserId) return;
    const { data: convId } = await supabase.rpc('get_or_create_direct_conversation', { p_other_user_id: targetUserId });
    if (convId) router.push(`/messages/${convId}`);
  }, [currentUserId, router]);

  const handleViewProfile = useCallback((userId: string) => {
    router.push(`/profile/${userId}`);
  }, [router]);

  const getSlot = (instrument: string, slot_index: number) =>
    slots.find((s) => s.instrument === instrument && s.slot_index === slot_index) ?? null;

  const handleClaim = async (instrument: string, slot_index: number) => {
    if (!currentUserId || !canInteract) return;
    if (getSlot(instrument, slot_index)) return;
    const alreadyOnThisRow = slots.some(
      (s) => s.user_id === currentUserId && s.slot_index === slot_index
    );
    if (alreadyOnThisRow) return;
    setClaimingCell({ instrument, slot_index });
    await supabase.from("jam_slots").insert({ jam_id: id, user_id: currentUserId, instrument, slot_index });
    await fetchAll();
    setClaimingCell(null);
  };

  const handleAssign = async (userId: string, instrument: string, slot_index: number) => {
    if (!isOrganizer) return;
    const alreadyOnThisRow = slots.some(
      (s) => s.user_id === userId && s.slot_index === slot_index);
    if (alreadyOnThisRow) return;
    setClaimingCell({ instrument, slot_index });
    await supabase.from("jam_slots").insert({ jam_id: id, user_id: userId, instrument, slot_index });
    await fetchAll();
    setClaimingCell(null);
  };

  const handleAssignGuest = async (name: string, instrument: string, slot_index: number) => {
    if (!isOrganizer || !name.trim()) return;
    setClaimingCell({ instrument, slot_index });
    await supabase.from("jam_slots").insert({ jam_id: id, guest_name: name.trim(), instrument, slot_index });
    await fetchAll();
    setClaimingCell(null);
  };

  const handleEmptyCellClick = (instrument: string, slot_index: number, e: React.MouseEvent<HTMLButtonElement>) => {
    if (!canInteract) return;
    if (isOrganizer) {
      setPickerCell({ instrument, slot_index, anchorEl: e.currentTarget });
    } else {
      handleClaim(instrument, slot_index);
    }
  };

  const handleRelease = async (slotId: string) => {
    await supabase.from("jam_slots").delete().eq("id", slotId);
    await fetchAll();
  };

  const handleStartEditSong = (slot: JamSlot, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSongSlotId(slot.id);
    setSongInputValue(slot.song ?? "");
  };

  const handleSaveSong = async (slotId: string) => {
    await supabase.from("jam_slots").update({ song: songInputValue.trim() || null }).eq("id", slotId);
    setEditingSongSlotId(null);
    setSongInputValue("");
    await fetchAll();
  };

  const handleStartEditScale = (slot: JamSlot, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingScaleSlotId(slot.id);
    setScaleInputValue(slot.scale ?? "");
  };

  const handleSaveScale = async (slotId: string) => {
    await supabase.from("jam_slots").update({ scale: scaleInputValue.trim() || null }).eq("id", slotId);
    setEditingScaleSlotId(null);
    setScaleInputValue("");
    await fetchAll();
  };

  const handleAvatarClick = (profile: Profile, e: React.MouseEvent) => {
    if (profile.id === currentUserId) return;
    e.stopPropagation();
    (popupAnchorRef as React.MutableRefObject<HTMLElement>).current = e.currentTarget as HTMLElement;
    setPopupProfile(profile);
  };

  const handleDeleteJam = async () => {
    if (!isMainOrganizer) return;
    setIsDeleting(true);
    setDeleteError(null);
    const { error } = await supabase.rpc('delete_jam', { p_jam_id: id });
    if (error) {
      setDeleteError(`Erreur lors de la suppression : ${error.message}`);
      setIsDeleting(false);
      return;
    }
    router.push('/events');
  };

  const toggleDescription = (jamId: string) => {
    setExpandedDescriptions((prev) => ({ ...prev, [jamId]: !prev[jamId] }));
  };

  if (isLoading) return (
    <div className="flex flex-col gap-4 p-4">
      <div className="h-8 w-32 bg-zik-card animate-pulse rounded" />
      <div className="h-24 bg-zik-card animate-pulse rounded-xl" />
      <div className="h-64 bg-zik-card animate-pulse rounded-xl" />
    </div>
  );

  if (!jam) return (
    <div className="p-4 text-center text-zik-muted">
      <p>Jam introuvable.</p>
      <Button variant="outline" className="mt-4 border-zik-border text-zik-text hover:bg-zik-card-hover" onClick={() => router.back()}>
        Retour
      </Button>
    </div>
  );

  const address = getAddress(jam.location);
  const confirmedParticipants = participants.filter((p) => p.status === "confirmed");
  const pendingParticipants = participants.filter((p) => p.status === "pending");
  const totalSlotsTaken = slots.filter((s) => !!s.user_id).length;
  const currentSlotIndex = jam.current_slot_index;
  const myActiveSlot = currentSlotIndex !== null
    ? slots.find((s) => s.slot_index === currentSlotIndex && s.user_id === currentUserId)
    : null;

  return (
    <div className="flex flex-col h-full bg-zik-bg">
      {popupProfile && (
        <ProfilePopup profile={popupProfile} anchorRef={popupAnchorRef}
          onClose={() => setPopupProfile(null)} onMessage={handleOpenDM} onViewProfile={handleViewProfile} />
      )}

      {pickerCell && (
        <ParticipantPicker instrument={pickerCell.instrument} slot_index={pickerCell.slot_index}
          participants={participants} slots={slots} anchorEl={pickerCell.anchorEl}
          onPick={handleAssign} onPickGuest={handleAssignGuest} onClose={() => setPickerCell(null)} />
      )}

      {/* ── POSTER ──────────────────────────────────────────────────────── */}
      {(jam.poster_url || isOrganizer) && (
        <JamPoster
          posterUrl={jam.poster_url}
          isOrganizer={isOrganizer}
          onUpload={handlePosterUpload}
          isUploading={isUploadingPoster}
        />
      )}

      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div
        className="px-4 pt-4 pb-3"
        style={{
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          marginTop: jam.poster_url ? -48 : 0,
          position: jam.poster_url ? 'relative' : 'static',
          zIndex: 2,
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm transition-colors"
            style={{ color: jam.poster_url ? 'rgba(255,255,255,0.80)' : 'rgba(255,255,255,0.67)' }}>
            <ArrowLeft className="h-4 w-4" /> Retour
          </button>
          <div className="flex items-center gap-2">
            <ShareButton url={`/events/jams/${id}`} title={jam.title} text={jam.description ?? undefined} />
            {isOrganizer && (
              <>
                <Button size="sm" variant="outline"
                  className="text-xs flex items-center gap-1.5 border-zik-border text-zik-text hover:border-zik-purple hover:text-zik-purple"
                  onClick={() => setIsEditOpen(true)}>
                  <Pencil className="h-3.5 w-3.5" /> Modifier
                </Button>
                <Button size="sm" variant="outline"
                  className="text-xs flex items-center gap-1.5 border-zik-red/30 text-zik-red hover:border-zik-red hover:text-zik-red hover:bg-zik-red/10"
                  onClick={() => setShowDeleteConfirm(true)}>
                  <Trash2 className="h-3.5 w-3.5" /> Supprimer
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-zik-text truncate">{jam.title}</h1>
            {jam.description && (
              <div className="mt-1">
                <p className={`text-base text-zik-text/80 whitespace-pre-wrap transition-all duration-200 ${
                  expandedDescriptions[jam.id] ? '' : 'line-clamp-2'
                }`}>
                  {jam.description}
                </p>
                {jam.description.length > 100 && (
                  <button onClick={() => toggleDescription(jam.id)}
                    className="text-xs text-zik-purple mt-1 hover:bg-zik-purple/10 rounded-lg px-2 py-1 flex items-center gap-1 transition-colors">
                    {expandedDescriptions[jam.id]
                      ? <><ChevronUp className="h-3 w-3" /> Voir moins</>
                      : <><ChevronDown className="h-3 w-3" /> Voir plus</>
                    }
                  </button>
                )}
              </div>
            )}
          </div>
          <span className={`shrink-0 flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${
            jam.is_open ? "bg-zik-emerald/10 text-zik-emerald" : "bg-zik-orange/10 text-zik-orange"
          }`}>
            {jam.is_open ? <><Unlock className="h-3 w-3" />Ouverte</> : <><Lock className="h-3 w-3" />Inscription requise</>}
          </span>
        </div>

        <div className="mt-2 text-sm text-zik-text">
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 text-zik-muted" />
            {formatDate(jam.start_time)} · {formatTime(jam.start_time)}
            {jam.end_at && ` → ${formatTime(jam.end_at)}`}
          </div>
          {address && (
            <div className="flex items-center gap-1 mt-1">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-zik-muted" />
              <span className="whitespace-normal">{address}</span>
            </div>
          )}
        </div>

        {myActiveSlot && (
          <div className="mt-3 flex items-center gap-2 bg-zik-emerald/10 border border-zik-emerald/30 rounded-lg px-3 py-2">
            <Radio className="h-4 w-4 text-zik-emerald animate-pulse shrink-0" />
            <p className="text-sm font-semibold text-zik-emerald">C'est ton passage ! 🎸</p>
          </div>
        )}

        {!isOrganizer && (
          <div className="mt-3 flex items-center gap-2">
            <Button size="sm" variant="outline"
              className="text-xs border-zik-border text-zik-muted hover:bg-zik-red/10 hover:border-zik-red/30 hover:text-zik-red transition-colors"
              onClick={handleToggleInterest} disabled={interestPendingId === id}>
              <Heart className={`h-3.5 w-3.5 mr-1 ${isInterested ? "text-zik-red fill-zik-red" : ""}`} />
              {isInterested ? "Intéressé" : "M'intéresse"}
            </Button>
            {isParticipant ? (
              <Button size="sm" variant="outline"
                className="text-xs border-zik-emerald/30 text-zik-emerald hover:bg-zik-red/10 hover:border-zik-red/30 hover:text-zik-red transition-colors"
                onClick={handleLeave}>
                <Check className="h-3.5 w-3.5 mr-1" /> Inscrit · Quitter
              </Button>
            ) : isPending ? (
              <span className="text-xs text-zik-orange font-medium">⏳ En attente d'approbation</span>
            ) : !joinOpen ? (
              <span className="text-xs text-zik-muted italic">
                Inscriptions dès {formatTime(joinOpensAt(jam.start_time).toISOString())}
              </span>
            ) : (
              <Button size="sm" className="text-xs bg-zik-purple hover:bg-zik-indigo" onClick={handleJoin}>
                <UserPlus className="h-3.5 w-3.5 mr-1" />
                {currentUserId && !jam.is_open ? "Demander à rejoindre" : "Rejoindre"}
              </Button>
            )}
          </div>
        )}
        {isOrganizer && (
          <div className="mt-2 flex items-center gap-1.5 text-xs font-medium">
            {isMainOrganizer
              ? <><Crown className="h-3.5 w-3.5 text-zik-indigo" /><span className="text-zik-indigo">Organisateur</span></>
              : <><ShieldCheck className="h-3.5 w-3.5 text-zik-purple" /><span className="text-zik-purple">Co-organisateur</span></>
            }
          </div>
        )}
      </div>

      {/* ── ONGLETS ─────────────────────────────────────────────────────── */}
      <Tabs defaultValue="slots" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="grid grid-cols-3 mx-4 mt-3 shrink-0">
          <TabsTrigger value="slots" className="text-zik-text">
            Passages
            {totalSlotsTaken > 0 && (
              <span className="ml-1.5 bg-zik-purple/10 text-zik-purple text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                {totalSlotsTaken}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="participants" className="text-zik-text">
            Participants
            {confirmedParticipants.length > 0 && (
              <span className="ml-1.5 bg-zik-purple/10 text-zik-purple text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                {confirmedParticipants.length}
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

        <ParticipantsTab
          isOrganizer={isOrganizer}
          isMainOrganizer={isMainOrganizer}
          currentUserId={currentUserId}
          jamCreatedBy={jam.created_by}
          pendingParticipants={pendingParticipants}
          confirmedParticipants={confirmedParticipants}
          onAvatarClick={handleAvatarClick}
          onAccept={handleAccept}
          onReject={handleReject}
          onToggleCoOrganizer={handleToggleCoOrganizer}
        />

        <SlotsTab
          canInteract={canInteract}
          isOrganizer={isOrganizer}
          currentUserId={currentUserId}
          hasDrums={jam.has_drums}
          hasKeyboard={jam.has_keyboard}
          slots={slots}
          numRows={numRows}
          currentSlotIndex={currentSlotIndex}
          claimingCell={claimingCell}
          pickerCell={pickerCell}
          editingSongSlotId={editingSongSlotId}
          songInputValue={songInputValue}
          onSongInputChange={setSongInputValue}
          editingScaleSlotId={editingScaleSlotId}
          scaleInputValue={scaleInputValue}
          onScaleInputChange={setScaleInputValue}
          onSetCurrentSlot={handleSetCurrentSlot}
          onEmptyCellClick={handleEmptyCellClick}
          onRelease={handleRelease}
          onAvatarClick={handleAvatarClick}
          onStartEditSong={handleStartEditSong}
          onSaveSong={handleSaveSong}
          onCancelEditSong={() => { setEditingSongSlotId(null); setSongInputValue(""); }}
          onStartEditScale={handleStartEditScale}
          onSaveScale={handleSaveScale}
          onCancelEditScale={() => { setEditingScaleSlotId(null); setScaleInputValue(""); }}
        />

        <ChatTab
          conversationId={conversationId}
          canInteract={canInteract}
          messages={messages}
          currentUserId={currentUserId}
          messageInput={messageInput}
          onMessageInputChange={setMessageInput}
          isSending={isSending}
          onSendMessage={handleSendMessage}
          onAvatarClick={handleAvatarClick}
          messagesEndRef={messagesEndRef}
        />
      </Tabs>

      <Modal open={isEditOpen} onClose={() => setIsEditOpen(false)} title="Modifier la jam">
        <JamEditForm jam={jam} onSuccess={() => { setIsEditOpen(false); fetchAll(); }} onClose={() => setIsEditOpen(false)} />
      </Modal>

      <Modal open={showDeleteConfirm} onClose={() => { setShowDeleteConfirm(false); setDeleteError(null); }} title="Supprimer la jam ?">
        <p className="text-sm text-zik-muted mb-4">
          Cette action est irréversible. Tous les participants, passages et messages seront définitivement supprimés.
        </p>
        {deleteError && <p className="text-zik-red text-sm mb-4">{deleteError}</p>}
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => { setShowDeleteConfirm(false); setDeleteError(null); }} disabled={isDeleting}
            className="border-zik-border text-zik-text hover:bg-zik-card-hover">
            Annuler
          </Button>
          <Button className="bg-zik-red hover:bg-zik-red/80 disabled:opacity-50" onClick={handleDeleteJam} disabled={isDeleting}>
            {isDeleting ? "Suppression..." : "Supprimer définitivement"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
