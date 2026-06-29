"use client";

import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createPortal } from "react-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft, Lock, Unlock, MapPin, Clock, Send,
  UserPlus, Check, X, Crown, ShieldCheck, Pencil,
  MessageCircle, Music, Play, Radio, User,Trash2
} from "lucide-react";
import JamEditForm from "@/components/JamEditForm";

interface JamSession {
  id: string; title: string; description: string; start_time: string;
  end_at: string | null; location: string; is_open: boolean; created_by: string;
  current_slot_index: number | null;
}
interface Profile { id: string; username: string | null; avatar_url: string | null; }
interface Participant { user_id: string; status: string; is_organizer: boolean; profile: Profile | null; }
interface Message { id: string; user_id: string; content: string; created_at: string; profile: Profile | null; }
interface JamSlot {
  id: string; jam_id: string; user_id: string | null;
  instrument: string; slot_index: number; song?: string | null; profile?: Profile | null;
}

const INSTRUMENTS = [
  { key: "chant",    label: "Chant",    emoji: "🎤" },
  { key: "guitare",  label: "Guitare",  emoji: "🎸" },
  { key: "basse",    label: "Basse",    emoji: "🎵" },
  { key: "batterie", label: "Batterie", emoji: "🥁" },
  { key: "clavier",  label: "Clavier",  emoji: "🎹" },
  { key: "autres",   label: "Autres",   emoji: "🎶" },
] as const;

const TRAILING_EMPTY_ROWS = 3;

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
function formatTime(d: string) {
  return new Date(d).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}
function getAddress(s: string) { try { return JSON.parse(s)?.address ?? null; } catch { return null; } }

function Avatar({ profile, size = "md", onClick }: {
  profile: Profile | null; size?: "sm" | "md";
  onClick?: (e: React.MouseEvent) => void;
}) {
  const cls = size === "sm" ? "h-6 w-6 text-[9px]" : "h-9 w-9 text-xs";
  const initials = profile?.username ? profile.username.slice(0, 2).toUpperCase() : "?";
  const interactClass = onClick ? "cursor-pointer hover:ring-2 hover:ring-blue-400 hover:ring-offset-1 transition-all" : "";
  return profile?.avatar_url ? (
    <img src={profile.avatar_url} alt={profile.username ?? ""} onClick={onClick}
      className={`${cls} ${interactClass} rounded-full object-cover shrink-0`} />
  ) : (
    <div onClick={onClick}
      className={`${cls} ${interactClass} rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold shrink-0`}>
      {initials}
    </div>
  );
}

// ─── Picker de participant (orga uniquement) ──────────────────────────────
interface ParticipantPickerProps {
  instrument: string;
  slot_index: number;
  participants: Participant[];
  slots: JamSlot[];
  anchorEl: HTMLElement;
  onPick: (userId: string, instrument: string, slot_index: number) => void;
  onClose: () => void;
}

function ParticipantPicker({ instrument, slot_index, participants, slots, anchorEl, onPick, onClose }: ParticipantPickerProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Participants déjà engagés sur un AUTRE instrument (donc plus disponibles ici)
  const lockedToOtherInstrument = useMemo(
    () => new Set(
      slots
        .filter((s) => s.instrument !== instrument && !!s.user_id)
        .map((s) => s.user_id as string)
    ),
    [slots, instrument]
  );

  const available = participants.filter(
    (p) => p.status === "confirmed" && !lockedToOtherInstrument.has(p.user_id)
  );

  // ... reste du composant inchangé

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node) && !anchorEl.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose, anchorEl]);

  const rect = anchorEl.getBoundingClientRect();
  const top = rect.bottom + 4;
  const left = Math.min(rect.left, window.innerWidth - 200);

  return createPortal(
    <div
      ref={ref}
      style={{ position: "fixed", top, left, zIndex: 99999, width: "min(90vw, 200px)" }}
      className="bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden"
    >
      <div className="px-3 py-2 border-b border-gray-100">
        <p className="text-xs font-semibold text-gray-700">Assigner un participant</p>
        <p className="text-[10px] text-gray-400 mt-0.5">Ligne {slot_index + 1}</p>
      </div>
      {available.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-4 px-3">Tous les participants sont déjà dans cette colonne.</p>
      ) : (
        <div className="max-h-48 overflow-y-auto py-1">
          {available.map((p) => (
            <button
              key={p.user_id}
              onClick={() => { onPick(p.user_id, instrument, slot_index); onClose(); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-blue-50 transition-colors text-left"
            >
              {p.profile?.avatar_url ? (
                <img src={p.profile.avatar_url} alt="" className="h-6 w-6 rounded-full object-cover shrink-0" />
              ) : (
                <div className="h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-[9px] font-semibold shrink-0">
                  {p.profile?.username?.slice(0, 2).toUpperCase() ?? "?"}
                </div>
              )}
              <span className="text-xs font-medium text-gray-800 truncate">{p.profile?.username ?? "Inconnu"}</span>
              {p.is_organizer && <ShieldCheck className="h-3 w-3 text-purple-400 shrink-0 ml-auto" />}
            </button>
          ))}
        </div>
      )}
    </div>,
    document.body
  );
}
// ─────────────────────────────────────────────────────────────────────────

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
    <div ref={popupRef}
      className="fixed z-99998 bg-white rounded-xl shadow-xl border border-gray-100 p-3 min-w-45"
      style={{
        top: (rect?.bottom ?? 0) + 6,
        left: Math.min(rect?.left ?? 0, window.innerWidth - 200),
      }}>
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
        <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-semibold shrink-0">
          {profile.username?.slice(0, 2).toUpperCase() ?? "?"}
        </div>
        <span className="text-sm font-semibold text-gray-900 truncate">{profile.username ?? "Inconnu"}</span>
      </div>
      <button onClick={() => { onViewProfile(profile.id); onClose(); }}
        className="w-full flex items-center gap-2 text-xs text-gray-700 font-medium hover:bg-gray-50 rounded-lg px-2 py-1.5 transition-colors mb-1">
        <User className="h-3.5 w-3.5 text-gray-400" /> Voir le profil
      </button>
      <button onClick={() => { onMessage(profile.id); onClose(); }}
        className="w-full flex items-center gap-2 text-xs text-blue-600 font-medium hover:bg-blue-50 rounded-lg px-2 py-1.5 transition-colors">
        <MessageCircle className="h-3.5 w-3.5" /> Envoyer un message
      </button>
    </div>,
    document.body
  );
}

function Modal({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 99999 }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }} onClick={onClose} />
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)", background: "white",
        borderRadius: "12px", padding: "24px", width: "min(90vw, 640px)",
        maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
      }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
  
}

// ===================== PAGE =====================
export default function JamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [jam, setJam] = useState<JamSession | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [slots, setSlots] = useState<JamSlot[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [messageInput, setMessageInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [draggedSlot, setDraggedSlot] = useState<{ id: string; instrument: string; slot_index: number } | null>(null);
  const [dragOverCell, setDragOverCell] = useState<{ instrument: string; slot_index: number } | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingSongSlotId, setEditingSongSlotId] = useState<string | null>(null);
  const [songInputValue, setSongInputValue] = useState("");
  const [popupProfile, setPopupProfile] = useState<Profile | null>(null);
  const popupAnchorRef = useRef<HTMLElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [claimingCell, setClaimingCell] = useState<{ instrument: string; slot_index: number } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);


  // ✅ État du picker d'assignation (orga)
  const [pickerCell, setPickerCell] = useState<{ instrument: string; slot_index: number; anchorEl: HTMLElement } | null>(null);

  const isMainOrganizer = jam?.created_by === currentUserId;
  const isCoOrganizer = participants.some((p) => p.user_id === currentUserId && p.is_organizer && p.status === "confirmed");
  const isOrganizer = isMainOrganizer || isCoOrganizer;
  const isParticipant = participants.some((p) => p.user_id === currentUserId && p.status === "confirmed");
  const isPending = participants.some((p) => p.user_id === currentUserId && p.status === "pending");
  const canInteract = isParticipant || isOrganizer;

  const numRows = useMemo(() => {
    if (slots.length === 0) return TRAILING_EMPTY_ROWS;
    const maxIndex = Math.max(...slots.map((s) => s.slot_index));
    return maxIndex + 1 + TRAILING_EMPTY_ROWS;
  }, [slots]);

  const fetchAll = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id ?? null);

    const { data: jamData } = await supabase.from("jam_sessions").select("*").eq("id", id).single();
    setJam(jamData);

    const { data: participantsData } = await supabase
      .from("jam_participants")
      .select("user_id, status, is_organizer, profile:profiles(id, username, avatar_url)")
      .eq("jam_id", id);
    setParticipants((participantsData ?? []).map((p: any) => ({
      user_id: p.user_id, status: p.status ?? "confirmed",
      is_organizer: p.is_organizer ?? false, profile: p.profile ?? null,
    })));

    const { data: convData } = await supabase.from("conversations").select("id").eq('entity_id', id).eq('type', 'jam').single();
    if (convData) {
      setConversationId(convData.id);
      const { data: messagesData } = await supabase
        .from("messages").select("id, user_id, content, created_at, profile:profiles(id, username, avatar_url)")
        .eq("conversation_id", convData.id).order("created_at", { ascending: true });
      setMessages((messagesData ?? []).map((m: any) => ({ ...m, profile: m.profile ?? null })));
    }

    const { data: slotsData } = await supabase
      .from("jam_slots").select("*, profile:profiles(id, username, avatar_url)").eq("jam_id", id);
    setSlots((slotsData ?? []).map((s: any) => ({ ...s, profile: s.profile ?? null })));
    setIsLoading(false);
  }, [id]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const channel = supabase
      .channel(`jam-session-${id}`)
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "jam_sessions", filter: `id=eq.${id}`,
      }, (payload) => {
        setJam((prev) => prev ? { ...prev, current_slot_index: (payload.new as any).current_slot_index } : prev);
      })
      .subscribe();
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
    if (!currentUserId || !jam) return;
    const status = jam.is_open ? "confirmed" : "pending";
    await supabase.from("jam_participants").insert({ jam_id: id, user_id: currentUserId, status });
    if (conversationId) await supabase.from("conversation_participants").insert({ conversation_id: conversationId, user_id: currentUserId });
    await fetchAll();
  };
  const handleLeave = async () => {
    if (!currentUserId) return;
    await supabase.from("jam_participants").delete().eq("jam_id", id).eq("user_id", currentUserId);
    await fetchAll();
  };
  const handleAccept = async (userId: string) => {
    await supabase.from("jam_participants").update({ status: "confirmed" }).eq("jam_id", id).eq("user_id", userId);
    if (conversationId) await supabase.from("conversation_participants").upsert({ conversation_id: conversationId, user_id: userId });
    await supabase.from("notifications").insert({
      user_id: userId, type: "jam_accepted",
      title: "Demande acceptée ! 🎸",
      body: `Tu as été accepté dans "${jam?.title}"`,
      link: `/events/jams/${id}`,
    });
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
  if (getSlot(instrument, slot_index)) return; // cellule déjà prise

  const userSlots = slots.filter((s) => s.user_id === currentUserId);
  const isLockedToOtherInstrument = userSlots.some((s) => s.instrument !== instrument);
  if (isLockedToOtherInstrument) return; // déjà engagé sur une autre colonne

  setClaimingCell({ instrument, slot_index });
  await supabase.from("jam_slots").insert({ jam_id: id, user_id: currentUserId, instrument, slot_index });
  await fetchAll();
  setClaimingCell(null);
};

const handleAssign = async (userId: string, instrument: string, slot_index: number) => {
  if (!isOrganizer) return;
  const userSlots = slots.filter((s) => s.user_id === userId);
  const isLockedToOtherInstrument = userSlots.some((s) => s.instrument !== instrument);
  if (isLockedToOtherInstrument) return; // sécurité, normalement déjà filtré par le picker

  setClaimingCell({ instrument, slot_index });
  await supabase.from("jam_slots").insert({ jam_id: id, user_id: userId, instrument, slot_index });
  await fetchAll();
  setClaimingCell(null);
};

  // ✅ Clic sur cellule vide : orga → picker, participant → se claim
  const handleEmptyCellClick = (instrument: string, slot_index: number, e: React.MouseEvent<HTMLTableCellElement>) => {
    if (!canInteract) return;
    if (isOrganizer) {
      // Ouvre le picker ancré sur la cellule cliquée
      setPickerCell({ instrument, slot_index, anchorEl: e.currentTarget });
    } else {
      handleClaim(instrument, slot_index);
    }
  };

  const handleRelease = async (slotId: string) => {
    await supabase.from("jam_slots").delete().eq("id", slotId);
    await fetchAll();
  };
  const handleDragStart = (slot: JamSlot) => {
    if (slot.user_id !== currentUserId && !isOrganizer) return;
    setDraggedSlot({ id: slot.id, instrument: slot.instrument, slot_index: slot.slot_index });
  };
  const handleDragOver = (e: React.DragEvent, instrument: string, slot_index: number) => {
    e.preventDefault(); setDragOverCell({ instrument, slot_index });
  };
  const handleDrop = async (instrument: string, slot_index: number) => {
    setDragOverCell(null);
    if (!draggedSlot) return;
    const target = getSlot(instrument, slot_index);
    if (target) {
      await Promise.all([
        supabase.from("jam_slots").update({ instrument, slot_index }).eq("id", draggedSlot.id),
        supabase.from("jam_slots").update({ instrument: draggedSlot.instrument, slot_index: draggedSlot.slot_index }).eq("id", target.id),
      ]);
    } else {
      await supabase.from("jam_slots").update({ instrument, slot_index }).eq("id", draggedSlot.id);
    }
    setDraggedSlot(null);
    await fetchAll();
  };
  const handleDragEnd = () => { setDraggedSlot(null); setDragOverCell(null); };

  const handleStartEditSong = (slot: JamSlot, e: React.MouseEvent) => {
    e.stopPropagation();
    if (slot.user_id !== currentUserId && !isOrganizer) return;
    setEditingSongSlotId(slot.id);
    setSongInputValue(slot.song ?? "");
  };
  const handleSaveSong = async (slotId: string) => {
    await supabase.from("jam_slots").update({ song: songInputValue.trim() || null }).eq("id", slotId);
    setEditingSongSlotId(null);
    setSongInputValue("");
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
  const { error } = await supabase.rpc('delete_jam', { p_jam_id: id });
  if (error) {
    alert(`Erreur lors de la suppression: ${error.message}`);
    setIsDeleting(false);
    return;
  }
  router.push('/events');
};

  if (isLoading) return (
    <div className="flex flex-col gap-4 p-4">
      <div className="h-8 w-32 bg-gray-100 animate-pulse rounded" />
      <div className="h-24 bg-gray-100 animate-pulse rounded-xl" />
      <div className="h-64 bg-gray-100 animate-pulse rounded-xl" />
    </div>
  );

  if (!jam) return (
    <div className="p-4 text-center text-gray-500">
      <p>Jam introuvable.</p>
      <Button variant="outline" className="mt-4" onClick={() => router.back()}>Retour</Button>
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
    <div className="flex flex-col h-full bg-white">
      {popupProfile && (
        <ProfilePopup
          profile={popupProfile}
          anchorRef={popupAnchorRef}
          onClose={() => setPopupProfile(null)}
          onMessage={handleOpenDM}
          onViewProfile={handleViewProfile}
        />
      )}

      {/* ✅ Picker d'assignation pour l'orga */}
      {pickerCell && (
        <ParticipantPicker
          instrument={pickerCell.instrument}
          slot_index={pickerCell.slot_index}
          participants={participants}
          slots={slots}
          anchorEl={pickerCell.anchorEl}
          onPick={handleAssign}
          onClose={() => setPickerCell(null)}
        />
      )}

      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Retour
          </button>
         {isOrganizer && (
  <Button size="sm" variant="outline"
    className="text-xs flex items-center gap-1.5 border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600"
    onClick={() => setIsEditOpen(true)}>
    <Pencil className="h-3.5 w-3.5" /> Modifier
  </Button>
)}
{isOrganizer && (
  <Button size="sm" variant="outline"
    className="text-xs flex items-center gap-1.5 border-red-200 text-red-500 hover:border-red-400 hover:text-red-600 hover:bg-red-50"
    onClick={() => setShowDeleteConfirm(true)}>
    <Trash2 className="h-3.5 w-3.5" /> Supprimer
  </Button>
)}
        </div>

        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900 truncate">{jam.title}</h1>
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{jam.description}</p>
          </div>
          <span className={`shrink-0 flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${
            jam.is_open ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
            {jam.is_open ? <><Unlock className="h-3 w-3" />Ouverte</> : <><Lock className="h-3 w-3" />Sur approbation</>}
          </span>
        </div>

        <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {formatDate(jam.start_time)} · {formatTime(jam.start_time)}
            {jam.end_at && ` → ${formatTime(jam.end_at)}`}
          </span>
          {address && (
            <span className="flex items-center gap-1 truncate max-w-xs">
              <MapPin className="h-3.5 w-3.5 shrink-0" />{address}
            </span>
          )}
        </div>

        {myActiveSlot && (
          <div className="mt-3 flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            <Radio className="h-4 w-4 text-green-600 animate-pulse shrink-0" />
            <p className="text-sm font-semibold text-green-700">C'est ton passage ! 🎸</p>
          </div>
        )}

        {!isOrganizer && currentUserId && (
          <div className="mt-3">
            {isParticipant ? (
              <Button size="sm" variant="outline"
                className="text-xs border-green-300 text-green-700 hover:bg-red-50 hover:border-red-300 hover:text-red-600"
                onClick={handleLeave}>
                <Check className="h-3.5 w-3.5 mr-1" /> Inscrit · Quitter
              </Button>
            ) : isPending ? (
              <span className="text-xs text-orange-600 font-medium">⏳ En attente d'approbation</span>
            ) : (
              <Button size="sm" className="text-xs bg-blue-600 hover:bg-blue-700" onClick={handleJoin}>
                <UserPlus className="h-3.5 w-3.5 mr-1" />
                {jam.is_open ? "Rejoindre" : "Demander à rejoindre"}
              </Button>
            )}
          </div>
        )}
        {isOrganizer && (
          <div className="mt-2 flex items-center gap-1.5 text-xs font-medium">
            {isMainOrganizer
              ? <><Crown className="h-3.5 w-3.5 text-blue-600" /><span className="text-blue-600">Organisateur</span></>
              : <><ShieldCheck className="h-3.5 w-3.5 text-purple-500" /><span className="text-purple-500">Co-organisateur</span></>
            }
          </div>
        )}
      </div>

      {/* Onglets */}
      <Tabs defaultValue="participants" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="grid grid-cols-3 mx-4 mt-3 shrink-0">
          <TabsTrigger value="participants">
            Participants
            {confirmedParticipants.length > 0 && (
              <span className="ml-1.5 bg-blue-100 text-blue-700 text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                {confirmedParticipants.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="slots">
            Passages
            {totalSlotsTaken > 0 && (
              <span className="ml-1.5 bg-blue-100 text-blue-700 text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                {totalSlotsTaken}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="chat">
            Chat
            {messages.length > 0 && (
              <span className="ml-1.5 bg-blue-100 text-blue-700 text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                {messages.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* PARTICIPANTS */}
        <TabsContent value="participants" className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {isOrganizer && pendingParticipants.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide mb-2">En attente · {pendingParticipants.length}</p>
              <div className="space-y-2">
                {pendingParticipants.map((p) => (
                  <div key={p.user_id} className="flex items-center justify-between gap-2 p-3 rounded-lg bg-orange-50 border border-orange-100">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar profile={p.profile} onClick={p.profile && p.user_id !== currentUserId ? (e) => handleAvatarClick(p.profile!, e) : undefined} />
                      <span className="text-sm font-medium text-gray-800 truncate">{p.profile?.username ?? "Inconnu"}</span>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700 px-2" onClick={() => handleAccept(p.user_id)}>
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs border-red-200 text-red-600 hover:bg-red-50 px-2" onClick={() => handleReject(p.user_id)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Confirmés · {confirmedParticipants.length}</p>
            {confirmedParticipants.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Aucun participant pour l'instant</p>
            ) : (
              <div className="space-y-2">
                {confirmedParticipants.map((p) => {
                  const isMainOrga = p.user_id === jam.created_by;
                  const isCoOrga = p.is_organizer && !isMainOrga;
                  return (
                    <div key={p.user_id} className={`flex items-center gap-2.5 p-3 rounded-lg border ${isCoOrga ? "bg-purple-50 border-purple-100" : "bg-gray-50 border-gray-100"}`}>
                      <Avatar profile={p.profile} onClick={p.profile && p.user_id !== currentUserId ? (e) => handleAvatarClick(p.profile!, e) : undefined} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{p.profile?.username ?? "Inconnu"}</p>
                        {isMainOrga && <p className="text-xs text-blue-500 flex items-center gap-1"><Crown className="h-3 w-3" /> Organisateur</p>}
                        {isCoOrga && <p className="text-xs text-purple-500 flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Co-organisateur</p>}
                      </div>
                      {isMainOrganizer && p.user_id !== currentUserId && (
                        <div className="flex gap-1.5 shrink-0">
                          <Button size="sm" variant="outline"
                            title={isCoOrga ? "Révoquer" : "Nommer co-organisateur"}
                            className={`h-7 w-7 p-0 shrink-0 transition-colors ${isCoOrga ? "border-purple-300 text-purple-500 hover:bg-purple-50" : "border-gray-200 text-gray-400 hover:border-purple-300 hover:text-purple-500 hover:bg-purple-50"}`}
                            onClick={() => handleToggleCoOrganizer(p.user_id, p.is_organizer)}>
                            <ShieldCheck className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost"
                            className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50 shrink-0"
                            onClick={() => handleReject(p.user_id)}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {/* TABLEAU PASSAGES */}
        <TabsContent value="slots" className="flex-1 overflow-auto px-2 py-3">
          {!canInteract && <p className="text-xs text-gray-400 text-center mb-3">Rejoins la jam pour t'inscrire dans un créneau 🎸</p>}
          {isOrganizer && (
            <p className="text-xs text-gray-400 text-center mb-3">
              ▶️ pour marquer un passage · <span className="text-blue-400">clic sur + pour assigner un participant</span>
            </p>
          )}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs" style={{ minWidth: 600 }}>
              <thead>
                <tr>
                  {isOrganizer && <th className="w-8 py-2 border-b border-gray-100" />}
                  <th className="w-8 py-2 text-gray-400 font-normal text-center border-b border-gray-100">#</th>
                  {INSTRUMENTS.map((inst) => (
                    <th key={inst.key} className="py-2 px-1 text-center font-semibold text-gray-600 border-b border-gray-100">
                      <span className="block text-base leading-none mb-0.5">{inst.emoji}</span>
                      {inst.label}
                    </th>
                  ))}
                  <th className="py-2 px-2 text-center font-semibold text-gray-600 border-b border-gray-100 min-w-25">
                    <span className="block text-base leading-none mb-0.5">🎵</span>
                    Morceau
                  </th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: numRows }, (_, rowIdx) => {
                  const maxOccupiedIndex = slots.length > 0 ? Math.max(...slots.map((s) => s.slot_index)) : -1;
                  const isTrailing = rowIdx > maxOccupiedIndex;
                  const isCurrentSlot = currentSlotIndex === rowIdx;
                  const rowSlots = slots.filter((s) => s.slot_index === rowIdx && !!s.user_id);
                  const songSlot = rowSlots.find((s) => s.user_id === currentUserId) ?? rowSlots[0] ?? null;

                  return (
                    <tr key={rowIdx} className={`transition-colors duration-150 ${
                      isCurrentSlot
                        ? "bg-green-50 border-l-4 border-l-green-400"
                        : rowIdx % 2 === 0 ? "bg-white" : "bg-gray-50/60"
                    }`}>
                      {isOrganizer && (
                        <td className="px-1 py-1 text-center">
                          <button
                            onClick={() => handleSetCurrentSlot(rowIdx)}
                            title={isCurrentSlot ? "Désactiver ce passage" : "Marquer comme en cours"}
                            className={`h-6 w-6 flex items-center justify-center rounded-full transition-all duration-150 mx-auto ${
                              isCurrentSlot
                                ? "bg-green-500 text-white shadow-md shadow-green-200 hover:bg-red-400"
                                : "text-gray-300 hover:text-green-500 hover:bg-green-50"
                            }`}>
                            {isCurrentSlot
                              ? <Radio className="h-3.5 w-3.5 animate-pulse" />
                              : <Play className="h-3.5 w-3.5" />
                            }
                          </button>
                        </td>
                      )}
                      <td className={`text-center font-medium py-1.5 border-r border-gray-100 ${
                        isCurrentSlot ? "text-green-600 font-bold" : isTrailing ? "text-gray-200" : "text-gray-300"
                      }`}>
                        {isCurrentSlot && <span className="mr-0.5">▶</span>}{rowIdx + 1}
                      </td>
                      {INSTRUMENTS.map((inst) => {
                        const slot = getSlot(inst.key, rowIdx);
                        const isMe = slot?.user_id === currentUserId;
                        const isEmpty = !slot;
                        const isDragOver = dragOverCell?.instrument === inst.key && dragOverCell?.slot_index === rowIdx;
                        const isDragging = draggedSlot?.instrument === inst.key && draggedSlot?.slot_index === rowIdx;
                        const isClaiming = claimingCell?.instrument === inst.key && claimingCell?.slot_index === rowIdx;
                        const isPickerOpen = pickerCell?.instrument === inst.key && pickerCell?.slot_index === rowIdx;

                        return (
                          <td key={inst.key}
                            className={`px-1 py-1 border border-gray-100 transition-all
                              ${isDragOver && !isDragging ? "bg-blue-50 border-blue-300" : ""}
                              ${isEmpty && canInteract ? "cursor-pointer hover:bg-blue-50/50" : ""}
                              ${isDragging ? "opacity-40" : ""}
                              ${isPickerOpen ? "bg-blue-50 border-blue-300" : ""}
                            `}
                            onClick={(e) => isEmpty && canInteract ? handleEmptyCellClick(inst.key, rowIdx, e) : undefined}
                            onDragOver={(e) => handleDragOver(e, inst.key, rowIdx)}
                            onDrop={() => handleDrop(inst.key, rowIdx)}
                            onDragLeave={() => setDragOverCell(null)}
                          >
                            {slot ? (
                              <div draggable={isMe || isOrganizer}
                                onDragStart={() => handleDragStart(slot)} onDragEnd={handleDragEnd}
                                className={`flex items-center gap-1 px-1.5 py-1 rounded-md text-[11px] font-medium
                                  ${isMe && isCurrentSlot
                                    ? "bg-green-100 text-green-800 border border-green-300 cursor-grab active:cursor-grabbing"
                                    : isMe
                                    ? "bg-blue-100 text-blue-800 border border-blue-200 cursor-grab active:cursor-grabbing"
                                    : "bg-gray-100 text-gray-700 border border-gray-200"}
                                  ${isOrganizer && !isMe ? "cursor-grab active:cursor-grabbing" : ""}
                                `}>
                                <Avatar profile={slot.profile ?? null} size="sm"
                                  onClick={slot.profile && slot.user_id !== currentUserId
                                    ? (e) => handleAvatarClick(slot.profile!, e) : undefined} />
                                <span className="truncate flex-1 max-w-15">{slot.profile?.username ?? "?"}</span>
                                {(isMe || isOrganizer) && (
                                  <button onClick={(e) => { e.stopPropagation(); handleRelease(slot.id); }}
                                    className="text-gray-400 hover:text-red-500 transition-colors shrink-0 ml-0.5">
                                    <X className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            ) : (
                              <div className={`h-7 rounded-md border border-dashed text-center flex items-center justify-center transition-all ${
                                isClaiming || isPickerOpen
                                  ? "border-blue-400 bg-blue-50"
                                  : canInteract
                                    ? isTrailing
                                      ? "border-gray-100 text-gray-200 hover:border-blue-200 hover:text-blue-300"
                                      : "border-gray-200 text-gray-300 hover:border-blue-300 hover:text-blue-400"
                                    : "border-gray-100 text-gray-200"
                              }`}>
                                {isClaiming
                                  ? <span className="text-[10px] text-blue-400 animate-pulse font-medium">...</span>
                                  : canInteract
                                    ? isOrganizer
                                      ? <UserPlus className={`h-3.5 w-3.5 ${isPickerOpen ? "text-blue-500" : "text-gray-300 group-hover:text-blue-400"}`} />
                                      : <span className="text-lg leading-none">+</span>
                                    : null
                                }
                              </div>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-1 py-1 border border-gray-100">
                        {songSlot ? (
                          editingSongSlotId === songSlot.id ? (
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <input autoFocus value={songInputValue}
                                onChange={(e) => setSongInputValue(e.target.value)}
                                onBlur={() => handleSaveSong(songSlot.id)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleSaveSong(songSlot.id);
                                  if (e.key === "Escape") { setEditingSongSlotId(null); setSongInputValue(""); }
                                }}
                                placeholder="Ex: Wonderwall"
                                className="flex-1 text-[11px] border border-blue-300 rounded px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-blue-400 min-w-0" />
                            </div>
                          ) : (
                            <div onClick={(e) => (songSlot.user_id === currentUserId || isOrganizer) ? handleStartEditSong(songSlot, e) : undefined}
                              className={`flex items-center gap-1 px-1.5 py-1 rounded text-[11px] min-h-7 group
                                ${(songSlot.user_id === currentUserId || isOrganizer) ? "cursor-pointer hover:bg-gray-100" : ""}`}>
                              {songSlot.song ? (
                                <><Music className="h-3 w-3 text-blue-400 shrink-0" /><span className="truncate text-gray-700 max-w-22.5">{songSlot.song}</span></>
                              ) : (
                                (songSlot.user_id === currentUserId || isOrganizer) &&
                                <span className="text-gray-300 group-hover:text-blue-400 transition-colors">+ Morceau</span>
                              )}
                            </div>
                          )
                        ) : <div className="h-7" />}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* CHAT */}
        <TabsContent value="chat" className="flex-1 flex flex-col overflow-hidden px-0 py-0">
          {!conversationId ? (
            <div className="flex-1 flex items-center justify-center text-sm text-gray-400 p-4">Le chat sera disponible une fois la conversation créée.</div>
          ) : !canInteract ? (
            <div className="flex-1 flex items-center justify-center text-sm text-gray-400 p-4 text-center">Rejoins la jam pour accéder au chat 🎸</div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                {messages.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">Pas encore de messages — soyez les premiers ! 🎵</p>
                ) : messages.map((msg) => {
                  const isMe = msg.user_id === currentUserId;
                  return (
                    <div key={msg.id} className={`flex gap-2.5 ${isMe ? "flex-row-reverse" : ""}`}>
                      {!isMe && <Avatar profile={msg.profile} size="sm" onClick={msg.profile ? (e) => handleAvatarClick(msg.profile!, e) : undefined} />}
                      <div className={`max-w-[75%] ${isMe ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
                        {!isMe && <span className="text-xs text-gray-500 ml-0.5">{msg.profile?.username ?? "Inconnu"}</span>}
                        <div className={`px-3 py-2 rounded-2xl text-sm ${isMe ? "bg-blue-600 text-white rounded-tr-sm" : "bg-gray-100 text-gray-800 rounded-tl-sm"}`}>
                          {msg.content}
                        </div>
                        <span className="text-[10px] text-gray-400 mx-1">
                          {new Date(msg.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
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

      <Modal open={isEditOpen} onClose={() => setIsEditOpen(false)} title="Modifier la jam">
        <JamEditForm jam={jam} onSuccess={() => { setIsEditOpen(false); fetchAll(); }} onClose={() => setIsEditOpen(false)} />
      </Modal>
      <Modal open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} title="Supprimer la jam ?">
  <p className="text-sm text-gray-600 mb-4">
    Cette action est irréversible. Tous les participants, passages et messages seront définitivement supprimés.
  </p>
  <div className="flex gap-2 justify-end">
    <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} disabled={isDeleting}>
      Annuler
    </Button>
    <Button className="bg-red-600 hover:bg-red-700" onClick={handleDeleteJam} disabled={isDeleting}>
      {isDeleting ? "Suppression..." : "Supprimer définitivement"}
    </Button>
  </div>
</Modal>
    </div>
  );
}