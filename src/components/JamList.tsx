"use client";

import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Lock, Unlock, MapPin, Clock, UserPlus, Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { EventMarker } from "@/components/EventMap";

const EventMap = dynamic(() => import("@/components/EventMap"), {
  ssr: false,
  // ✅ Loading avec ton thème
  loading: () => <div className="h-52 bg-zik-card animate-pulse rounded-xl" />,
});

interface Profile { id: string; username: string | null; avatar_url: string | null; }
interface JamSession {
  id: string; title: string; description: string; start_time: string;
  end_at: string | null; location: string; is_open: boolean; created_by: string; created_at: string;
}
interface ParticipantWithProfile { user_id: string; profile: Profile | null; }

function startOfDay(d: Date) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function isSameDay(a: Date, b: Date) { return startOfDay(a).getTime() === startOfDay(b).getTime(); }
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function formatDayLabel(d: Date) {
  const today = startOfDay(new Date());
  const diff = Math.round((startOfDay(d).getTime() - today.getTime()) / 86400000);
  if (diff === 0) return "Aujourd'hui";
  if (diff === 1) return "Demain";
  return d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
}
function formatDayLabelLong(d: Date) {
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

const VISIBLE_DAYS = 4;

function DayFilter({ selectedDate, onChange, availableDates }: {
  selectedDate: Date | null; onChange: (d: Date | null) => void; availableDates: Date[];
}) {
  const today = startOfDay(new Date());
  const allDays = Array.from({ length: 30 }, (_, i) => addDays(today, i));
  const visibleDays = allDays.slice(0, VISIBLE_DAYS);
  const moreDays = allDays.slice(VISIBLE_DAYS);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [dropdownOpen]);

  const selectedIsInMore = selectedDate !== null && moreDays.some((d) => isSameDay(d, selectedDate));

  return (
    <div className="flex items-center gap-1.5 w-full">
      {/* ✅ Bouton "Tout" */}
      <button
        onClick={() => onChange(null)}
        className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
          selectedDate === null ? "bg-zik-purple text-white" : "bg-zik-card text-zik-muted hover:bg-zik-card-hover"
        }`}
      >
        Tout
      </button>

      {/* ✅ Boutons des jours visibles */}
      {visibleDays.map((day) => {
        const hasEvent = availableDates.some((d) => isSameDay(d, day));
        const isSelected = selectedDate !== null && isSameDay(selectedDate, day);
        return (
          <button
            key={day.toISOString()}
            onClick={() => onChange(isSelected ? null : day)}
            className={`flex-1 min-w-0 py-1.5 rounded-full text-xs font-medium transition-colors relative text-center ${
              isSelected
                ? "bg-zik-purple text-white"
                : hasEvent
                ? "bg-zik-indigo/10 text-zik-purple border border-zik-purple/20 hover:bg-zik-indigo/20"
                : "bg-zik-card text-zik-muted hover:bg-zik-card-hover"
            }`}
          >
            <span className="truncate block px-1">{formatDayLabel(day)}</span>
            {hasEvent && !isSelected && (
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-zik-purple rounded-full border border-zik-bg" />
            )}
          </button>
        );
      })}

      {/* ✅ Bouton dropdown */}
      <div className="relative shrink-0" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen((v) => !v)}
          className={`flex items-center gap-0.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
            selectedIsInMore
              ? "bg-zik-purple text-white"
              : "bg-zik-card text-zik-muted hover:bg-zik-card-hover"
          }`}
        >
          {selectedIsInMore ? formatDayLabel(selectedDate!) : "···"}
          <ChevronDown className={`h-3 w-3 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
        </button>

        {dropdownOpen && (
          <div className="absolute right-0 top-full mt-1 z-50 bg-zik-card rounded-xl shadow-lg border border-zik-border py-1 min-w-40 max-h-64 overflow-y-auto">
            {moreDays.map((day) => {
              const hasEvent = availableDates.some((d) => isSameDay(d, day));
              const isSelected = selectedDate !== null && isSameDay(selectedDate, day);
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => { onChange(isSelected ? null : day); setDropdownOpen(false); }}
                  className={`w-full text-left px-4 py-2 text-xs flex items-center justify-between gap-2 hover:bg-zik-card-hover transition-colors ${
                    isSelected ? "text-zik-purple font-semibold bg-zik-indigo/10" : "text-zik-muted"
                  }`}
                >
                  <span>{formatDayLabelLong(day)}</span>
                  {hasEvent && <span className="h-2 w-2 rounded-full bg-zik-purple shrink-0" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ParticipantAvatars({ participants }: { participants: ParticipantWithProfile[] }) {
  const MAX_VISIBLE = 4;
  const visible = participants.slice(0, MAX_VISIBLE);
  const extra = participants.length - MAX_VISIBLE;
  if (participants.length === 0) return null;

  return (
    <div className="flex items-center">
      <div className="flex -space-x-2">
        {visible.map((p, i) => {
          const initials = p.profile?.username ? p.profile.username.slice(0, 2).toUpperCase() : "?";
          return p.profile?.avatar_url ? (
            <img
              key={p.user_id}
              src={p.profile.avatar_url}
              alt={p.profile.username ?? ""}
              title={p.profile.username ?? ""}
              className="h-7 w-7 rounded-full border-2 border-zik-bg object-cover"
              style={{ zIndex: MAX_VISIBLE - i }}
            />
          ) : (
            <div
              key={p.user_id}
              title={p.profile?.username ?? ""}
              className="h-7 w-7 rounded-full border-2 border-zik-bg bg-zik-purple flex items-center justify-center text-white text-[10px] font-semibold"
              style={{ zIndex: MAX_VISIBLE - i }}
            >
              {initials}
            </div>
          );
        })}
        {extra > 0 && (
          <div
            className="h-7 w-7 rounded-full border-2 border-zik-bg bg-zik-card flex items-center justify-center text-zik-muted text-[10px] font-semibold"
            style={{ zIndex: 0 }}
          >
            +{extra}
          </div>
        )}
      </div>
      <span className="ml-2 text-xs text-zik-muted">
        {participants.length} participant{participants.length > 1 ? "s" : ""}
      </span>
    </div>
  );
}

export default function JamList() {
  const supabase = createClient();
  const router = useRouter();
  const [jams, setJams] = useState<JamSession[]>([]);
  const [participantsMap, setParticipantsMap] = useState<Record<string, ParticipantWithProfile[]>>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [joiningJamId, setJoiningJamId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(startOfDay(new Date()));

  const fetchParticipants = useCallback(async (jamIds: string[]) => {
    const { data } = await supabase.from("jam_participants")
      .select("jam_id, user_id, profile:profiles(id, username, avatar_url)").in("jam_id", jamIds);
    if (data) {
      const map: Record<string, ParticipantWithProfile[]> = {};
      for (const p of data as any[]) {
        if (!map[p.jam_id]) map[p.jam_id] = [];
        map[p.jam_id].push({ user_id: p.user_id, profile: p.profile ?? null });
      }
      setParticipantsMap(map);
    }
  }, []);

  useEffect(() => {
    const fetchAll = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id ?? null);
      const { data: jamsData, error: jamsError } = await supabase
        .from("jam_sessions").select("*").order("start_time", { ascending: true });
      if (jamsError) { setError("Impossible de charger les jams"); setIsLoading(false); return; }
      setJams(jamsData ?? []);
      const jamIds = (jamsData ?? []).map((j) => j.id);
      if (jamIds.length > 0) await fetchParticipants(jamIds);
      setIsLoading(false);
    };
    fetchAll();
  }, [fetchParticipants]);

  const handleJoin = useCallback(async (jamId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!currentUserId) return;
    setJoiningJamId(jamId);
    await supabase.from("jam_participants").insert({ jam_id: jamId, user_id: currentUserId });
    await fetchParticipants(jams.map((j) => j.id));
    setJoiningJamId(null);
  }, [currentUserId, jams, fetchParticipants]);

  const handleLeave = useCallback(async (jamId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!currentUserId) return;
    setJoiningJamId(jamId);
    await supabase.from("jam_participants").delete().eq("jam_id", jamId).eq("user_id", currentUserId);
    setParticipantsMap((prev) => ({ ...prev, [jamId]: (prev[jamId] ?? []).filter((p) => p.user_id !== currentUserId) }));
    setJoiningJamId(null);
  }, [currentUserId]);

  const availableDates = useMemo(() => jams.map((j) => new Date(j.start_time)), [jams]);
  const filteredJams = useMemo(() => {
    if (!selectedDate) return jams;
    return jams.filter((j) => isSameDay(new Date(j.start_time), selectedDate));
  }, [jams, selectedDate]);

  const jamMarkers = useMemo<EventMarker[]>(() =>
    filteredJams.flatMap((jam) => {
      try {
        const loc = JSON.parse(jam.location);
        if (!loc?.lat || !loc?.lng) return [];
        const participants = participantsMap[jam.id] ?? [];
        return [{
          id: jam.id, title: jam.title, start_time: jam.start_time,
          lat: loc.lat, lng: loc.lng, type: "jam" as const,
          is_open: jam.is_open,
          isParticipant: participants.some((p) => p.user_id === currentUserId),
          isCreator: jam.created_by === currentUserId,
        }];
      } catch { return []; }
    }), [filteredJams, participantsMap, currentUserId]);

  const formatDate = (d: string) => new Date(d).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const formatTime  = (d: string) => new Date(d).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  const getAddress = (s: string) => { try { return JSON.parse(s)?.address ?? null; } catch { return null; } };

  const emptyMessage = useMemo(() => {
    if (!selectedDate) return "Aucune jam à venir 🎸";
    const diff = Math.round((startOfDay(selectedDate).getTime() - startOfDay(new Date()).getTime()) / 86400000);
    if (diff === 0) return "Pas de jam aujourd'hui 🎸 — clique sur un autre jour ou crée la tienne !";
    if (diff === 1) return "Pas de jam demain 🎸";
    return "Aucune jam ce jour-là 🎸";
  }, [selectedDate]);

  // ✅ Loading skeleton avec ton thème
  if (isLoading) return (
    <div className="space-y-3">
      <div className="h-52 bg-zik-card animate-pulse rounded-xl" />
      {[...Array(3)].map((_, i) => <div key={i} className="h-28 bg-zik-card animate-pulse rounded-lg" />)}
    </div>
  );

  if (error) return <p className="text-zik-red text-sm">{error}</p>;

  return (
    <div className="space-y-4">
      <EventMap
        markers={jamMarkers}
        onJoinJam={(jamId) => handleJoin(jamId)}
        currentUserId={currentUserId}
        emptyMessage="Aucune jam à venir 🎸"
      />
      <DayFilter selectedDate={selectedDate} onChange={setSelectedDate} availableDates={availableDates} />
      {filteredJams.length === 0 ? (
        <p className="text-zik-muted text-sm text-center py-6">{emptyMessage}</p>
      ) : (
        <div className="space-y-3">
          {filteredJams.map((jam) => {
            const address = getAddress(jam.location);
            const participants = participantsMap[jam.id] ?? [];
            const isParticipant = participants.some((p) => p.user_id === currentUserId);
            const isCreator = jam.created_by === currentUserId;
            const isJoining = joiningJamId === jam.id;

            return (
              <div key={jam.id}
                onClick={() => router.push(`/events/jams/${jam.id}`)}
                // ✅ Bordure et survol adaptés
                className="rounded-lg border border-zik-border p-4 hover:border-zik-purple/30 hover:shadow-sm transition-all cursor-pointer active:scale-[0.99] bg-zik-card"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {/* ✅ Titre adapté */}
                    <h3 className="font-semibold text-zik-text truncate">{jam.title}</h3>
                    {/* ✅ Description adaptée */}
                    <p className="text-sm text-zik-muted mt-1 line-clamp-2">{jam.description}</p>
                  </div>
                  {/* ✅ Badge de statut adapté */}
                  <span className={`shrink-0 flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
                    jam.is_open
                      ? "bg-zik-emerald/10 text-zik-emerald"
                      : "bg-zik-orange/10 text-zik-orange"
                  }`}>
                    {jam.is_open ? <><Unlock className="h-3 w-3" /> Ouverte</> : <><Lock className="h-3 w-3" /> Inscription requise</>}
                  </span>
                </div>

                {/* ✅ Infos date/lieu adaptées */}
                <div className="flex flex-wrap gap-3 mt-3 text-xs text-zik-muted">
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

                {/* ✅ Participants et boutons adaptés */}
                <div className="flex items-center justify-between mt-3">
                  <ParticipantAvatars participants={participants} />
                  {!isCreator && currentUserId && (
                    isParticipant ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs border-zik-emerald/30 text-zik-emerald hover:bg-zik-red/10 hover:border-zik-red/30 hover:text-zik-red transition-colors"
                        onClick={(e) => handleLeave(jam.id, e)}
                        disabled={isJoining}
                      >
                        <Check className="h-3.5 w-3.5 mr-1" />
                        {isJoining ? "..." : "Inscrit"}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="text-xs bg-zik-purple hover:bg-zik-indigo"
                        onClick={(e) => handleJoin(jam.id, e)}
                        disabled={isJoining}
                      >
                        <UserPlus className="h-3.5 w-3.5 mr-1" />
                        {isJoining ? "..." : "Rejoindre"}
                      </Button>
                    )
                  )}
                  {isCreator && <span className="text-xs text-zik-muted italic">Organisateur</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}