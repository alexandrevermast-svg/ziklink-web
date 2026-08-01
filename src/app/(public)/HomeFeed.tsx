"use client";

import React, { useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import moment from "moment-timezone";
import JamCard from "@/components/JamCard";
import ConcertCard from "@/components/ConcertCard";
import type { EventMarker } from "@/components/EventMap";
import type { JamSession, Concert, ParticipantWithProfile } from "./page";
import { useJamParticipation } from "@/hooks/useJamParticipation";
import { useJamInterest } from "@/hooks/useJamInterest";
import { isOwner } from "@/lib/permissions";
import { canJoinJam } from "@/lib/jamJoinWindow";

const EventMap = dynamic(() => import("@/components/EventMap"), {
  ssr: false,
  loading: () => <div className="h-52 bg-zik-card animate-pulse rounded-xl" />,
});

function getLatLng(location: string | null): { lat: number; lng: number } | null {
  if (!location) return null;
  try { const p = JSON.parse(location); return p?.lat && p?.lng ? { lat: p.lat, lng: p.lng } : null; }
  catch { return null; }
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
  initialMyJamInterests: string[];
  initialConcertInterestCounts: Record<string, number>;
}

export default function HomeFeed({
  currentUserId: initialUserId,
  initialJams,
  initialConcerts,
  initialParticipantsMap,
  initialMyInterests,
  initialMyJamInterests,
  initialConcertInterestCounts,
}: HomeFeedProps) {
  const supabase = createClient();
  const router = useRouter();

  const [currentUserId, setCurrentUserId] = useState(initialUserId);
  const [jams, setJams] = useState<JamSession[]>(initialJams);
  const [concerts, setConcerts] = useState<Concert[]>(initialConcerts);
  const [participantsMap, setParticipantsMap] = useState(initialParticipantsMap);
  const [myInterests, setMyInterests] = useState<Set<string>>(new Set(initialMyInterests));
  const [concertInterestCounts, setConcertInterestCounts] = useState<Record<string, number>>(initialConcertInterestCounts);
  const [myJamInterests, setMyJamInterests] = useState<Set<string>>(new Set(initialMyJamInterests));
  const [dayFilter, setDayFilter] = useState<DayFilter>("today");
  const { joinJam, leaveJam, pendingJamId: joiningId } = useJamParticipation();
  const { markInterested, unmarkInterested, pendingJamId: interestPendingId } = useJamInterest();
  const [togglingConcertId, setTogglingConcertId] = useState<string | null>(null);

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
      .select("id, title, description, start_time, end_at, location, is_open, created_by, has_drums, has_keyboard")
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

      if (user) {
        const { data: jamIntData } = await supabase
          .from("jam_interested").select("jam_id")
          .eq("user_id", user.id).in("jam_id", ids);
        setMyJamInterests(new Set((jamIntData ?? []).map((r) => r.jam_id)));
      }
    }

    const { data: concertsData } = await supabase
      .from("concerts")
      .select("id, title, artist, start_time, end_at, location, genre, is_free, price, poster_url")
      .gte("start_time", twoHoursAgo)
      .lt("start_time", dayAfterTomorrow.toISOString())
      .order("start_time", { ascending: true });
    setConcerts(concertsData ?? []);

    if (concertsData && concertsData.length > 0) {
      const ids = concertsData.map((c) => c.id);
      const { data: intData } = await supabase
        .from("concert_interested").select("concert_id, user_id")
        .in("concert_id", ids);
      const countMap: Record<string, number> = {};
      const mySet = new Set<string>();
      for (const row of intData ?? []) {
        countMap[row.concert_id] = (countMap[row.concert_id] ?? 0) + 1;
        if (user && row.user_id === user.id) mySet.add(row.concert_id);
      }
      setConcertInterestCounts(countMap);
      setMyInterests(mySet);
    }
  }, [dayAfterTomorrow]);

  const handleJoinJam = useCallback(async (jamId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!currentUserId) { router.push(`/login?next=${encodeURIComponent(`/events/jams/${jamId}`)}`); return; }
    await joinJam(jamId, currentUserId, "confirmed");
    await refetch();
  }, [currentUserId, joinJam, refetch]);

  const handleLeaveJam = useCallback(async (jamId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!currentUserId) return;
    await leaveJam(jamId, currentUserId);
    await refetch();
  }, [currentUserId, leaveJam, refetch]);

  const handleToggleJamInterest = useCallback(async (jamId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!currentUserId) { router.push(`/login?next=${encodeURIComponent(`/events/jams/${jamId}`)}`); return; }
    if (myJamInterests.has(jamId)) {
      await unmarkInterested(jamId, currentUserId);
      setMyJamInterests((prev) => { const s = new Set(prev); s.delete(jamId); return s; });
    } else {
      await markInterested(jamId, currentUserId);
      setMyJamInterests((prev) => new Set([...prev, jamId]));
    }
  }, [currentUserId, myJamInterests, markInterested, unmarkInterested, router]);

  const handleToggleConcertInterest = useCallback(async (concertId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUserId) { router.push(`/login?next=${encodeURIComponent(`/events/concerts/${concertId}`)}`); return; }
    if (togglingConcertId) return;
    setTogglingConcertId(concertId);
    if (myInterests.has(concertId)) {
      await supabase.from("concert_interested").delete().eq("concert_id", concertId).eq("user_id", currentUserId);
      setMyInterests((prev) => { const s = new Set(prev); s.delete(concertId); return s; });
      setConcertInterestCounts((prev) => ({ ...prev, [concertId]: Math.max(0, (prev[concertId] ?? 1) - 1) }));
    } else {
      await supabase.from("concert_interested").insert({ concert_id: concertId, user_id: currentUserId });
      setMyInterests((prev) => new Set([...prev, concertId]));
      setConcertInterestCounts((prev) => ({ ...prev, [concertId]: (prev[concertId] ?? 0) + 1 }));
    }
    setTogglingConcertId(null);
  }, [currentUserId, togglingConcertId, myInterests, supabase, router]);

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
    onClick={() => router.push('/events')}
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
            const participants = participantsMap[jam.id] ?? [];
            const isParticipant = participants.some((p) => p.user_id === currentUserId);
            const isCreator = isOwner(jam, currentUserId);

            return (
              <JamCard
                key={jam.id}
                jam={jam}
                isCreator={isCreator}
                isParticipant={isParticipant}
                isJoining={joiningId === jam.id}
                isInterested={myJamInterests.has(jam.id)}
                isInterestPending={interestPendingId === jam.id}
                joinOpen={canJoinJam(jam.start_time)}
                onToggleInterest={handleToggleJamInterest}
                onJoin={handleJoinJam}
                onLeave={handleLeaveJam}
              />
            );
          })}

          {/* Concerts */}
          {filteredConcerts.map((concert) => (
            <ConcertCard
              key={concert.id}
              concert={concert}
              isInterested={myInterests.has(concert.id)}
              interestedCount={concertInterestCounts[concert.id] ?? 0}
              isToggling={togglingConcertId === concert.id}
              onToggleInterest={handleToggleConcertInterest}
            />
          ))}
        </div>
      )}
    </div>
  );
}
