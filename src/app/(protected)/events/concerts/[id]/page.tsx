// ============================================================
// app/(protected)/concerts/[id]/page.tsx
// ============================================================
'use client';

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createPortal } from "react-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft, MapPin, Clock, Ticket, Music2, Heart,
  ExternalLink, Send, Users, Pencil, X
} from "lucide-react";
import ConcertEditForm from "@/components/ConcertEditForm";
import ReportButton from '@/components/ReportButton';

interface Concert {
  id: string; title: string; description: string | null;
  artist: string | null; genre: string | null;
  start_time: string; end_at: string | null; location: string;
  is_free: boolean; price: number | null; ticket_url: string | null;
  poster_url: string | null; created_by: string;
}
interface Profile { id: string; username: string | null; avatar_url: string | null; }
interface Message { id: string; user_id: string; content: string; created_at: string; profile: Profile | null; }

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
function formatTime(d: string) {
  return new Date(d).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}
function getAddress(s: string) { try { return JSON.parse(s)?.address ?? null; } catch { return null; } }

function Avatar({ profile, size = "md" }: { profile: Profile | null; size?: "sm" | "md" }) {
  const cls = size === "sm" ? "h-6 w-6 text-[9px]" : "h-9 w-9 text-xs";
  const initials = profile?.username ? profile.username.slice(0, 2).toUpperCase() : "?";
  return profile?.avatar_url ? (
    <img src={profile.avatar_url} alt={profile.username ?? ""} className={`${cls} rounded-full object-cover shrink-0`} />
  ) : (
    <div className={`${cls} rounded-full bg-zik-purple flex items-center justify-center text-white font-semibold shrink-0`}>
      {initials}
    </div>
  );
}

function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 99999 }}>
      {/* ✅ Overlay adapté */}
      <div style={{ position: "absolute", inset: 0, background: "rgba(14, 11, 22, 0.8)" }} onClick={onClose} />
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        background: "var(--zik-card)",
        borderRadius: "12px",
        padding: "24px",
        width: "min(90vw, 640px)",
        maxHeight: "90vh",
        overflowY: "auto",
        boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        color: "var(--zik-text)",
      }}>
        <div className="flex items-center justify-between mb-4">
          {/* ✅ Titre adapté */}
          <h2 className="text-xl font-bold text-zik-text">{title}</h2>
          {/* ✅ Bouton de fermeture adapté */}
          <button onClick={onClose} className="p-1 rounded hover:bg-zik-card-hover text-zik-muted hover:text-zik-text transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}

export default function ConcertDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [concert, setConcert] = useState<Concert | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isInterested, setIsInterested] = useState(false);
  const [interestedProfiles, setInterestedProfiles] = useState<Profile[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isOrganizer = concert?.created_by === currentUserId;

  const fetchAll = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id ?? null);

    const { data: concertData } = await supabase.from("concerts").select("*").eq("id", id).single();
    setConcert(concertData);

    const { data: intData } = await supabase
      .from("concert_interested")
      .select("user_id, profile:profiles(id, username, avatar_url)")
      .eq("concert_id", id);
    const profiles = (intData ?? []).map((r: any) => r.profile).filter(Boolean) as Profile[];
    setInterestedProfiles(profiles);
    setIsInterested((intData ?? []).some((r: any) => r.user_id === user?.id));

    const { data: convData } = await supabase.from("conversations").select("id").eq('entity_id', id).eq('type', 'concert').maybeSingle();
    if (convData) {
      setConversationId(convData.id);
      const { data: msgs } = await supabase
        .from("messages")
        .select("id, user_id, content, created_at, profile:profiles(id, username, avatar_url)")
        .eq("conversation_id", convData.id)
        .order("created_at", { ascending: true });
      setMessages((msgs ?? []).map((m: any) => ({ ...m, profile: m.profile ?? null })));
    }
    setIsLoading(false);
  }, [id]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase.channel(`concert-chat-${conversationId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        async (payload) => {
          const msg = payload.new as any;
          const { data: profile } = await supabase.from("profiles").select("id, username, avatar_url").eq("id", msg.user_id).single();
          setMessages((prev) => [...prev, { ...msg, profile: profile ?? null }]);
        }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleToggleInterest = async () => {
    if (!currentUserId || isToggling) return;
    setIsToggling(true);
    if (isInterested) {
      await supabase.from("concert_interested").delete().eq("concert_id", id).eq("user_id", currentUserId);
    } else {
      await supabase.from("concert_interested").upsert(
        { concert_id: id, user_id: currentUserId },
        { onConflict: 'concert_id,user_id', ignoreDuplicates: true }
      );
      // Rejoint (ou crée) la conversation
      const { data: newConvId, error } = await supabase.rpc('join_concert_conversation', {
        p_concert_id: id,
        p_concert_title: concert?.title ?? '',
      });
      if (!error && newConvId) setConversationId(newConvId);
    }
    await fetchAll();
    setIsToggling(false);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !currentUserId || !conversationId) return;
    setIsSending(true);
    await supabase.from("messages").insert({ conversation_id: conversationId, user_id: currentUserId, content: messageInput.trim() });
    setMessageInput("");
    setIsSending(false);
  };

  // ✅ Loading skeleton avec ton thème
  if (isLoading) return (
    <div className="flex flex-col gap-4 p-4">
      <div className="h-8 w-32 bg-zik-card animate-pulse rounded" />
      <div className="h-48 bg-zik-card animate-pulse rounded-xl" />
      <div className="h-32 bg-zik-card animate-pulse rounded-xl" />
    </div>
  );

  if (!concert) return (
    <div className="p-4 text-center text-zik-muted">
      <p>Concert introuvable.</p>
      <Button
        variant="outline"
        className="mt-4 border-zik-border text-zik-text hover:bg-zik-card-hover"
        onClick={() => router.back()}
      >
        Retour
      </Button>
    </div>
  );

  const address = getAddress(concert.location);

  return (
    <div className="flex flex-col h-full bg-zik-bg">
      {/* Header */}
      <div className="shrink-0">
        {concert.poster_url ? (
          <div className="relative h-44 w-full">
            <img src={concert.poster_url} alt={concert.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
              <button onClick={() => router.back()}
                className="flex items-center gap-1.5 text-sm text-white bg-black/30 hover:bg-black/50 px-3 py-1.5 rounded-full backdrop-blur-sm transition-colors">
                <ArrowLeft className="h-4 w-4" /> Retour
              </button>
              {/* Bouton Modifier pour l'organisateur */}
              {isOrganizer && (
                <button onClick={() => setIsEditOpen(true)}
                  className="flex items-center gap-1.5 text-sm text-white bg-black/30 hover:bg-black/50 px-3 py-1.5 rounded-full backdrop-blur-sm transition-colors">
                  <Pencil className="h-3.5 w-3.5" /> Modifier
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="px-4 pt-4 pb-2">
            <div className="flex items-center justify-between mb-3">
              <button onClick={() => router.back()}
                className="flex items-center gap-1.5 text-sm text-zik-muted hover:text-zik-text transition-colors">
                <ArrowLeft className="h-4 w-4" /> Retour
              </button>
              {/* Bouton Modifier pour l'organisateur */}
              {isOrganizer && (
                <Button size="sm" variant="outline"
                  className="text-xs flex items-center gap-1.5 border-zik-border text-zik-text hover:border-zik-purple hover:text-zik-purple"
                  onClick={() => setIsEditOpen(true)}>
                  <Pencil className="h-3.5 w-3.5" /> Modifier
                </Button>
              )}
              {!isOrganizer && currentUserId && (
                <ReportButton targetType="concert" targetId={id} variant="icon" />
              )}
            </div>
            {/* ✅ Fond adapté à ton thème */}
            <div className="h-28 rounded-xl bg-linear-to-br from-zik-purple/20 to-zik-indigo/20 flex items-center justify-center mb-3">
              <Music2 className="h-12 w-12 text-zik-purple/50" />
            </div>
          </div>
        )}

        <div className="px-4 pt-3 pb-3 border-b border-zik-border">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-zik-text">{concert.title}</h1>
              {concert.artist && <p className="text-base text-zik-purple font-medium mt-0.5">{concert.artist}</p>}
            </div>
            {concert.genre && (     
              <span className="shrink-0 text-xs font-medium bg-zik-purple/10 text-zik-purple px-2.5 py-1 rounded-full">
                {concert.genre}
              </span>
            )}
          </div>
          {concert.description && <p className="text-sm text-zik-muted mt-2 line-clamp-3">{concert.description}</p>}
          <div className="flex flex-wrap gap-3 mt-2 text-xs text-zik-muted">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-zik-purple" />
              {formatDate(concert.start_time)} · {formatTime(concert.start_time)}
              {concert.end_at && ` → ${formatTime(concert.end_at)}`}
            </span>
            {address && (
              <span className="flex items-center gap-1 truncate max-w-xs">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-zik-purple" />{address}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-3">
            {/* ✅ Badge de prix adapté */}
            <span className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${
              concert.is_free ? "bg-zik-emerald/10 text-zik-emerald" : "bg-zik-orange/10 text-zik-orange"
            }`}>
              <Ticket className="h-3 w-3" />
              {concert.is_free ? "Gratuit" : concert.price ? `${concert.price} €` : "Payant"}
            </span>
            {concert.ticket_url && (
              <a href={concert.ticket_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 text-xs text-zik-purple hover:underline font-medium">
                <ExternalLink className="h-3 w-3" /> Billetterie
              </a>
            )}
          </div>
          {currentUserId && !isOrganizer && (
            <div className="mt-3">
              {/* ✅ Bouton "Ça m'intéresse" adapté */}
              <Button
                size="sm"
                variant="outline"
                onClick={handleToggleInterest}
                disabled={isToggling}
                className={`text-xs transition-colors ${
                  isInterested
                    ? "border-zik-red/30 text-zik-red bg-zik-red/10 hover:bg-zik-card hover:text-zik-text"
                    : "border-zik-border text-zik-muted hover:border-zik-red/30 hover:text-zik-red hover:bg-zik-red/5"
                }`}
              >
                <Heart className={`h-3.5 w-3.5 mr-1.5 ${isInterested ? "fill-zik-red text-zik-red" : "text-zik-muted"}`} />
                {isInterested ? "Je n'y vais plus" : "Ça m'intéresse !"}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Onglets */}
      <Tabs defaultValue="interested" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="grid grid-cols-2 mx-4 mt-3 shrink-0">
          <TabsTrigger value="interested" className="text-zik-text">
            <Users className="h-3.5 w-3.5 mr-1.5" /> Intéressés
            {interestedProfiles.length > 0 && (
              <span className="ml-1.5 bg-zik-purple/10 text-zik-purple text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                {interestedProfiles.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="chat" className="text-zik-text">
            <Send className="h-3.5 w-3.5 mr-1.5" /> Chat
            {messages.length > 0 && (
              <span className="ml-1.5 bg-zik-purple/10 text-zik-purple text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                {messages.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="interested" className="flex-1 overflow-y-auto px-4 py-3">
          {interestedProfiles.length === 0 ? (
            <p className="text-sm text-zik-muted text-center py-8">
              Personne n'a encore marqué son intérêt 🎤<br /><span className="text-xs">Sois le premier !</span>
            </p>
          ) : (
            <div className="space-y-2">
              {interestedProfiles.map((profile) => (
                <div key={profile.id} className="flex items-center gap-2.5 p-3 rounded-lg bg-zik-card/50 border border-zik-border">
                  <Avatar profile={profile} />
                  <p className="text-sm font-medium text-zik-text">{profile.username ?? "Inconnu"}</p>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="chat" className="flex-1 flex flex-col overflow-hidden px-0 py-0">
          {!isInterested && !isOrganizer ? (
            <div className="flex-1 flex items-center justify-center text-sm text-zik-muted p-4 text-center">
              Marque ton intérêt pour accéder au chat 🎤
            </div>
          ) : !conversationId ? (
            <div className="flex-1 flex items-center justify-center text-sm text-zik-muted p-4">
              Le chat sera disponible prochainement.
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                {messages.length === 0 ? (
                  <p className="text-sm text-zik-muted text-center py-8">Pas encore de messages — soyez les premiers ! 🎵</p>
                ) : messages.map((msg) => {
                  const isMe = msg.user_id === currentUserId;
                  return (
                    <div key={msg.id} className={`flex gap-2.5 ${isMe ? "flex-row-reverse" : ""}`}>
                      {!isMe && <Avatar profile={msg.profile} size="sm" />}
                      <div className={`max-w-[75%] ${isMe ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
                        {!isMe && (
                          <span className="text-xs text-zik-muted ml-0.5">
                            {msg.profile?.username ?? "Inconnu"}
                          </span>
                        )}
                        {/* ✅ Messages adaptés */}
                        <div className={`px-3 py-2 rounded-2xl text-sm ${
                          isMe
                            ? "bg-zik-purple text-white rounded-tr-sm"
                            : "bg-zik-card/80 text-zik-text rounded-tl-sm border border-zik-border"
                        }`}>
                          {msg.content}
                        </div>
                        <span className="text-[10px] text-zik-muted mx-1">
                          {new Date(msg.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
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

      {/* Modale d'édition */}
      <Modal open={isEditOpen} onClose={() => setIsEditOpen(false)} title="Modifier le concert">
        <ConcertEditForm
          concert={concert}
          onSuccess={() => { setIsEditOpen(false); fetchAll(); }}
          onClose={() => setIsEditOpen(false)}
        />
      </Modal>
    </div>
  );
}