"use client";

import React, { useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import moment from "moment-timezone";
import { Lock, Unlock, MapPin, Clock, UserPlus, Check, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { EventMarker } from "@/components/EventMap";
import type { JamSession, Concert, ParticipantWithProfile } from "./page";
import { useJamParticipation } from "@/hooks/useJamParticipation";
import { isOwner } from "@/lib/permissions";

const EventMap = dynamic(() => import("@/components/EventMap"), {
  ssr: false,
  loading: () => <div className="h-52 bg-zik-card animate-pulse rounded-xl" />,
});

function getLatLng(location: string | null): { lat: number; lng: number } | null {
  if (!location) return null;
  try { const p = JSON.parse(location); return p?.lat && p?.lng ? { lat: p.lat, lng: p.lng } : null; }
  catch { return null; }
}
function formatTime(d: string) {
  return new Date(d).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}
function getAddress(s: string | null) {
  if (!s) return null;
  try { return JSON.parse(s)?.address ?? null; } catch { return null; }
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
            <img key={p.user_id} src={p.profile.avatar_url} alt={p.profile.username ?? ""}
              className="h-6 w-6 rounded-full border-2 border-zik-bg object-cover"
              style={{ zIndex: MAX_VISIBLE - i }} />
          ) : (
            <div key={p.user_id}
              className="h-6 w-6 rounded-full border-2 border-zik-bg bg-zik-purple flex items-center justify-center text-white text-[9px] font-semibold"
              style={{ zIndex: MAX_VISIBLE - i }}>
              {initials}
            </div>
          );
        })}
        {extra > 0 && (
          <div className="h-6 w-6 rounded-full border-2 border-zik-bg bg-zik-card flex items-center justify-center text-zik-muted text-[9px] font-semibold"
            style={{ zIndex: 0 }}>
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

type DayFilter = "today" | "tomorrow";

function dayBounds() {
  const today = moment.tz("Europe/Paris").startOf("day");
  const tomorrow = today.clone().add(1, "day");
  const dayAfterTomorrow = tomorrow.clone().add(1, "day");
  return { today: today.toDate(), tomorrow: tomorrow.toDate(), dayAfterTomorrow: dayAfterTomorrow.toDate() };
}

interface HomeFeedProps {
  currentUserId: string | null;
  initialJams: JamSession[];
  initialConcerts: Concert[];
  initialParticipantsMap: Record<string, ParticipantWithProfile[]>;
  initialMyInterests: string[];
}

export default function HomeFeed({
  currentUserId: initialUserId,
  initialJams,
  initialConcerts,
  initialParticipantsMap,
  initialMyInterests,
}: HomeFeedProps) {
  const supabase = createClient();
  const router = useRouter();

  const [currentUserId, setCurrentUserId] = useState(initialUserId);
  const [jams, setJams] = useState<JamSession[]>(initialJams);
  const [concerts, setConcerts] = useState<Concert[]>(initialConcerts);
  const [participantsMap, setParticipantsMap] = useState(initialParticipantsMap);
  const [myInterests, setMyInterests] = useState<Set<string>>(new Set(initialMyInterests));
  const [dayFilter, setDayFilter] = useState<DayFilter>("today");
  const { joinJam, leaveJam, pendingJamId: joiningId } = useJamParticipation();

  const { today, tomorrow, dayAfterTomorrow } = useMemo(() => dayBounds(), []);

  const selectedDay = dayFilter === "today" ? today : tomorrow;
  const selectedDayEnd = new Date(selectedDay.getTime() + 86400000);

  // Re-fetch après une action (rejoindre/quitter une jam) — le rendu initial vient du serveur.
  const refetch = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id ?? null);

    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();

    const { data: jamsData } = await supabase
      .from("jam_sessions")
      .select("id, title, description, start_time, end_at, location, is_open, created_by")
      .or(`end_at.gte.${now.toISOString()},and(end_at.is.null,start_time.gte.${twoHoursAgo})`)
      .lt("start_time", dayAfterTomorrow.toISOString())
      .order("start_time", { ascending: true });
    setJams(jamsData ?? []);

    if (jamsData && jamsData.length > 0) {
      const ids = jamsData.map((j) => j.id);
      const { data: partData } = await supabase
        .from("jam_participants")
        .select("jam_id, user_id, profile:profiles(id, username, avatar_url)")
        .in("jam_id", ids);
      const map: Record<string, ParticipantWithProfile[]> = {};
      for (const p of (partData ?? []) as any[]) {
        if (!map[p.jam_id]) map[p.jam_id] = [];
        map[p.jam_id].push({ user_id: p.user_id, profile: p.profile ?? null });
      }
      setParticipantsMap(map);
    }

    const { data: concertsData } = await supabase
      .from("concerts")
      .select("id, title, artist, start_time, end_at, location, genre, is_free, price")
      .gte("start_time", twoHoursAgo)
      .lt("start_time", dayAfterTomorrow.toISOString())
      .order("start_time", { ascending: true });
    setConcerts(concertsData ?? []);

    if (user && concertsData && concertsData.length > 0) {
      const ids = concertsData.map((c) => c.id);
      const { data: intData } = await supabase
        .from("concert_interested").select("concert_id")
        .eq("user_id", user.id).in("concert_id", ids);
      setMyInterests(new Set((intData ?? []).map((r) => r.concert_id)));
    }
  }, [dayAfterTomorrow]);

  const handleJoinJam = useCallback(async (jamId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!currentUserId) { router.push("/login"); return; }
    await joinJam(jamId, currentUserId, "confirmed");
    await refetch();
  }, [currentUserId, joinJam, refetch]);

  const handleLeaveJam = useCallback(async (jamId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!currentUserId) return;
    await leaveJam(jamId, currentUserId);
    await refetch();
  }, [currentUserId, leaveJam, refetch]);

  const filteredJams = useMemo(() =>
    jams.filter((j) => {
      const d = new Date(j.start_time);
      return d >= selectedDay && d < selectedDayEnd;
    }), [jams, selectedDay, selectedDayEnd]);

  const filteredConcerts = useMemo(() =>
    concerts.filter((c) => {
      const d = new Date(c.start_time);
      return d >= selectedDay && d < selectedDayEnd;
    }), [concerts, selectedDay, selectedDayEnd]);

  const todayJams = useMemo(() => jams.filter((j) => {
    const d = new Date(j.start_time); return d >= today && d < tomorrow;
  }), [jams, today, tomorrow]);
  const todayConcerts = useMemo(() => concerts.filter((c) => {
    const d = new Date(c.start_time); return d >= today && d < tomorrow;
  }), [concerts, today, tomorrow]);
  const tomorrowJams = useMemo(() => jams.filter((j) => {
    const d = new Date(j.start_time); return d >= tomorrow && d < dayAfterTomorrow;
  }), [jams, tomorrow, dayAfterTomorrow]);
  const tomorrowConcerts = useMemo(() => concerts.filter((c) => {
    const d = new Date(c.start_time); return d >= tomorrow && d < dayAfterTomorrow;
  }), [concerts, tomorrow, dayAfterTomorrow]);

  const markers = useMemo<EventMarker[]>(() => [
    ...filteredJams.flatMap((jam) => {
      const pos = getLatLng(jam.location);
      if (!pos) return [];
      return [{
        id: jam.id, title: jam.title, start_time: jam.start_time,
        lat: pos.lat, lng: pos.lng, type: "jam" as const,
        is_open: jam.is_open,
        isParticipant: (participantsMap[jam.id] ?? []).some((p) => p.user_id === currentUserId),
        isCreator: isOwner(jam, currentUserId),
      }];
    }),
    ...filteredConcerts.flatMap((concert) => {
      const pos = getLatLng(concert.location);
      if (!pos) return [];
      return [{
        id: concert.id, title: concert.title, start_time: concert.start_time,
        lat: pos.lat, lng: pos.lng, type: "concert" as const,
        artist: concert.artist, isInterested: myInterests.has(concert.id),
      }];
    }),
  ], [filteredJams, filteredConcerts, participantsMap, myInterests, currentUserId]);

  const totalFiltered = filteredJams.length + filteredConcerts.length;

  return (
    <div className="flex flex-col gap-4 p-4 pb-24">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zik-text">
            {dayFilter === "today" ? "Aujourd'hui" : "Demain"}
          </h1>
          <p className="text-sm text-zik-muted mt-0.5">
            {totalFiltered === 0
              ? "Aucun événement ce jour"
              : `${filteredJams.length} jam${filteredJams.length > 1 ? "s" : ""} · ${filteredConcerts.length} concert${filteredConcerts.length > 1 ? "s" : ""}`
            }
          </p>
        </div>
        {!currentUserId && (
          <button onClick={() => router.push("/login")}
            className="text-xs font-medium text-zik-purple border border-zik-purple/30 px-3 py-1.5 rounded-full hover:bg-zik-purple/10 transition-colors">
            Se connecter
          </button>
        )}
      </div>

      {/* Carte */}
      <EventMap
        markers={markers}
        onJoinJam={(jamId) => handleJoinJam(jamId)}
        currentUserId={currentUserId}
        emptyMessage="Aucun événement 📍"
        height="h-52"
      />

{/* Filtre Aujourd'hui / Demain / Voir plus — SOUS la carte */}
<div className="flex gap-2">
  {(["today", "tomorrow"] as DayFilter[]).map((filter) => {
    const isActive = dayFilter === filter;
    const count = filter === "today"
      ? todayJams.length + todayConcerts.length
      : tomorrowJams.length + tomorrowConcerts.length;
    return (
      <button
        key={filter}
        onClick={() => setDayFilter(filter)}
        className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-all duration-150"
        style={{
          background: isActive ? 'rgba(192,132,252,0.15)' : 'rgba(255,255,255,0.04)',
          border: '1px solid',
          borderColor: isActive ? 'rgba(192,132,252,0.35)' : 'rgba(255,255,255,0.07)',
          color: isActive ? '#C084FC' : 'rgba(255,255,255,0.45)',
        }}
      >
        {filter === "today" ? "Aujourd'hui" : "Demain"}
        {count > 0 && (
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
            style={{
              background: isActive ? 'rgba(192,132,252,0.25)' : 'rgba(255,255,255,0.08)',
              color: isActive ? '#C084FC' : 'rgba(255,255,255,0.40)',
            }}
          >
            {count}
          </span>
        )}
      </button>
    );
  })}

  {/* Bouton "Voir plus" */}
  <button
    onClick={() => router.push(currentUserId ? '/events' : '/login')}
    className="flex items-center justify-center px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150"
    style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.07)',
      color: 'rgba(255,255,255,0.45)',
      whiteSpace: 'nowrap',
    }}
  >
    Voir plus →
  </button>
</div>

      {/* Liste */}
      {totalFiltered === 0 ? (
        <p className="text-zik-muted text-sm text-center py-8">
          {dayFilter === "today"
            ? "Pas d'événement aujourd'hui 🎸 — créez le vôtre !"
            : "Pas d'événement demain 🎸"}
        </p>
      ) : (
        <div className="space-y-3">
          {/* Jams */}
          {filteredJams.map((jam) => {
            const address = getAddress(jam.location);
            const participants = participantsMap[jam.id] ?? [];
            const isParticipant = participants.some((p) => p.user_id === currentUserId);
            const isCreator = isOwner(jam, currentUserId);
            const isJoining = joiningId === jam.id;

            return (
              <div key={jam.id}
                onClick={() => router.push(`/events/jams/${jam.id}`)}
                className="rounded-xl border cursor-pointer transition-all active:scale-[0.99]"
                style={{
                  background: '#1A1628',
                  borderColor: 'rgba(255,255,255,0.06)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(52,211,153,0.25)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)'; }}
              >
                {/* Bande latérale verte */}
                <div className="absolute left-0 top-0 bottom-0 w-0.75"
                  style={{ background: 'linear-gradient(180deg, #34D399, #10B981)' }} />

                <div className="p-4 pl-5">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-zik-text truncate">{jam.title}</h3>
                      {jam.description && (
                        <p className="text-xs text-zik-muted mt-0.5 line-clamp-1">{jam.description}</p>
                      )}
                    </div>
                    <span className={`shrink-0 flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${
                      jam.is_open ? "bg-zik-emerald/10 text-zik-emerald" : "bg-zik-orange/10 text-zik-orange"
                    }`}>
                      {jam.is_open
                        ? <><Unlock className="h-3 w-3" /> Ouverte</>
                        : <><Lock className="h-3 w-3" /> Sur approbation</>
                      }
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs text-zik-muted mb-3">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTime(jam.start_time)}
                      {jam.end_at && ` → ${formatTime(jam.end_at)}`}
                    </span>
                    {address && (
                      <span className="flex items-center gap-1 truncate max-w-50">
                        <MapPin className="h-3 w-3 shrink-0" />{address}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <ParticipantAvatars participants={participants} />
                    {currentUserId && !isCreator ? (
                      isParticipant ? (
                        <Button size="sm" variant="outline"
                          className="text-xs border-zik-emerald/30 text-zik-emerald hover:bg-zik-red/10 hover:border-zik-red/30 hover:text-zik-red"
                          onClick={(e) => handleLeaveJam(jam.id, e)} disabled={isJoining}>
                          <Check className="h-3.5 w-3.5 mr-1" />
                          {isJoining ? "..." : "Inscrit"}
                        </Button>
                      ) : (
                        <Button size="sm" className="text-xs bg-zik-emerald/80 hover:bg-zik-emerald text-white"
                          onClick={(e) => handleJoinJam(jam.id, e)} disabled={isJoining}>
                          <UserPlus className="h-3.5 w-3.5 mr-1" />
                          {isJoining ? "..." : jam.is_open ? "Rejoindre" : "Demander"}
                        </Button>
                      )
                    ) : isCreator ? (
                      <span className="text-xs text-zik-muted italic">Organisateur</span>
                    ) : (
                      <Button size="sm" className="text-xs bg-zik-emerald/80 hover:bg-zik-emerald text-white"
                        onClick={(e) => { e.stopPropagation(); router.push('/login'); }}>
                        <UserPlus className="h-3.5 w-3.5 mr-1" /> Rejoindre
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Concerts */}
          {filteredConcerts.map((concert) => {
            const address = getAddress(concert.location);
            const isInterested = myInterests.has(concert.id);

            return (
              <div key={concert.id}
                onClick={() => router.push(`/events/concerts/${concert.id}`)}
                className="rounded-xl border cursor-pointer transition-all active:scale-[0.99]"
                style={{
                  background: '#1A1628',
                  borderColor: 'rgba(255,255,255,0.06)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(251,146,60,0.25)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)'; }}
              >
                {/* Bande latérale orange */}
                <div className="absolute left-0 top-0 bottom-0 w-0.75"
                  style={{ background: 'linear-gradient(180deg, #FB923C, #F97316)' }} />

                <div className="p-4 pl-5">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-zik-text truncate">{concert.title}</h3>
                      {concert.artist && (
                        <p className="text-xs font-medium mt-0.5" style={{ color: '#C084FC' }}>
                          {concert.artist}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {concert.genre && (
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                          style={{ background: 'rgba(192,132,252,0.12)', color: '#C084FC' }}>
                          {concert.genre}
                        </span>
                      )}
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                        concert.is_free
                          ? "bg-zik-emerald/10 text-zik-emerald"
                          : "bg-zik-orange/10 text-zik-orange"
                      }`}>
                        {concert.is_free ? "Gratuit" : concert.price ? `${concert.price} €` : "Payant"}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs text-zik-muted mb-3">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTime(concert.start_time)}
                      {concert.end_at && ` → ${formatTime(concert.end_at)}`}
                    </span>
                    {address && (
                      <span className="flex items-center gap-1 truncate max-w-50">
                        <MapPin className="h-3 w-3 shrink-0" />{address}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-xs text-zik-muted">
                      <Heart className={`h-3.5 w-3.5 ${isInterested ? 'text-zik-red fill-zik-red' : ''}`} />
                      {isInterested && <span style={{ color: '#F87171' }}>Tu es intéressé</span>}
                    </div>
                    <Button size="sm" variant="outline"
                      className="text-xs border-zik-orange/30 text-zik-orange hover:bg-zik-orange/10"
                      onClick={(e) => { e.stopPropagation(); router.push(`/events/concerts/${concert.id}`); }}>
                      Voir le concert
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
