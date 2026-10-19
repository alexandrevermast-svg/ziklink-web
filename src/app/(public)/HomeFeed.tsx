"use client";

import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import moment from "moment-timezone";
import { ChevronRight, ChevronDown, Music2, Megaphone, UserPlus, Play, Clock } from "lucide-react";
import { GroupAvatar } from "@/app/(protected)/groups/GroupAvatar";
import { genreColor } from "@/lib/musicGenres";
import type { EventMarker } from "@/components/EventMap";
import type { JamSession, Concert, ParticipantWithProfile, RecruitingAd, MusicianAd, LatestMusician } from "./page";
import { useJamParticipation } from "@/hooks/useJamParticipation";
import { useStageNamePrompt } from "@/hooks/useStageNamePrompt";
import StageNamePromptModal from "@/components/StageNamePromptModal";
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

type DayFilter = "today" | "tomorrow";

function dayBounds() {
  const today = moment.tz("Europe/Paris").startOf("day");
  const tomorrow = today.clone().add(1, "day");
  const dayAfterTomorrow = tomorrow.clone().add(1, "day");
  return { today: today.toDate(), tomorrow: tomorrow.toDate(), dayAfterTomorrow: dayAfterTomorrow.toDate() };
}

// Ligne compacte jam/concert — heure, titre, styles, chevron. La couleur de
// l'heure suit le code couleur des pins de la carte (ambre = jam, rouge =
// concert) plutôt que d'avoir sa propre card bordée. Les styles reprennent
// le même badge coloré que sur les cards.
// Pour les jams (onSelect fourni), le clic sur la ligne centre la carte sur
// le pin ET déplie la ligne, qui donne alors accès à "Plus d'infos" (page
// events) et "Rejoindre" (page détail, tableau des passages) — plutôt que de
// naviguer direct au clic.
function EventRow({ href, moreInfoHref, time, timeColorClass, title, genres, onSelect, onToggleExpand, selected, expanded, rowRef, isCreator, isParticipant, isPending, isJoining, onJoin }: {
  href: string; moreInfoHref?: string; time: string; timeColorClass: string; title: string; genres?: string[] | null;
  onSelect?: () => void; onToggleExpand?: () => void; selected?: boolean; expanded?: boolean; rowRef?: (el: HTMLDivElement | null) => void;
  isCreator?: boolean; isParticipant?: boolean; isPending?: boolean; isJoining?: boolean; onJoin?: () => void;
}) {
  const content = (
    <>
      <span className={`shrink-0 w-14 text-sm font-bold ${timeColorClass}`}>{time}</span>
      <span className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate">{title}</p>
        {genres && genres.length > 0 && (
          <span className="flex flex-wrap gap-1 mt-1">
            {genres.map((g) => (
              <span key={g}
                className="shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full"
                style={{ backgroundColor: `${genreColor(g)}1A`, color: genreColor(g) }}
              >
                {g}
              </span>
            ))}
          </span>
        )}
      </span>
    </>
  );

  if (onSelect) {
    return (
      <div
        ref={rowRef}
        onClick={onSelect}
        className={`py-3 px-2 -mx-2 rounded-xl border-b border-white/7 last:border-b-0 cursor-pointer transition-colors ${
          selected ? "bg-white/6" : ""
        }`}
      >
        <div className="flex items-center gap-3">
          {content}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggleExpand?.(); }}
            title={expanded ? "Replier" : "Déplier"}
            className="shrink-0 -m-1.5 p-1.5 rounded-full hover:bg-white/8 transition-colors"
          >
            <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform ${expanded ? "rotate-180" : ""}`} />
          </button>
        </div>
        {expanded && (
          <div className="flex items-center gap-2 mt-2.5 pl-17">
            <Link
              href={moreInfoHref ?? "/events"}
              onClick={(e) => e.stopPropagation()}
              className="text-xs font-medium px-3 py-1.5 rounded-full border border-white/10 text-gray-300 hover:border-white/20 hover:text-white transition-colors"
            >
              Plus d'infos
            </Link>
            {/* CTA jam, reflète le statut d'inscription — même logique que
                les cards de la page Events (S'inscrire / En attente / Jouer).
                Pas de CTA pour l'organisateur : "Plus d'infos" suffit. */}
            {onJoin && !isCreator && (
              isParticipant ? (
                <Link
                  href={href}
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full bg-linear-to-br from-zik-grad-from to-zik-grad-to text-white hover:brightness-110 transition-all"
                >
                  <Play className="h-3 w-3 fill-current" /> Jouer
                </Link>
              ) : isPending ? (
                <span className="flex items-center gap-1 text-xs font-medium text-amber-400 bg-amber-400/10 px-3 py-1.5 rounded-full">
                  <Clock className="h-3 w-3" /> En attente
                </span>
              ) : (
                <button
                  onClick={(e) => { e.stopPropagation(); onJoin(); }}
                  disabled={isJoining}
                  className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full bg-linear-to-br from-zik-grad-from to-zik-grad-to text-white hover:brightness-110 transition-all disabled:opacity-50"
                >
                  <UserPlus className="h-3 w-3" /> {isJoining ? "..." : "S'inscrire"}
                </button>
              )
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link href={href} className="flex items-center gap-3 py-3 border-b border-white/7 last:border-b-0">
      {content}
      <ChevronRight className="h-3.5 w-3.5 text-gray-400 shrink-0" />
    </Link>
  );
}

interface HomeFeedProps {
  currentUserId: string | null;
  initialJams: JamSession[];
  initialConcerts: Concert[];
  initialParticipantsMap: Record<string, ParticipantWithProfile[]>;
  initialMyInterests: string[];
  initialRecruitingAds: RecruitingAd[];
  initialMusicianAds: MusicianAd[];
  initialLatestMusician: LatestMusician | null;
}

export default function HomeFeed({
  currentUserId: initialUserId,
  initialJams,
  initialConcerts,
  initialParticipantsMap,
  initialMyInterests,
  initialRecruitingAds,
  initialMusicianAds,
  initialLatestMusician,
}: HomeFeedProps) {
  const supabase = createClient();
  const router = useRouter();

  const [currentUserId, setCurrentUserId] = useState(initialUserId);
  const [jams, setJams] = useState<JamSession[]>(initialJams);
  const [concerts, setConcerts] = useState<Concert[]>(initialConcerts);
  const [participantsMap, setParticipantsMap] = useState(initialParticipantsMap);
  const [myInterests, setMyInterests] = useState<Set<string>>(new Set(initialMyInterests));
  const [dayFilter, setDayFilter] = useState<DayFilter>("today");
  const { joinJam, pendingJamId: joiningJamId } = useJamParticipation();
  const { ensureStageName, ...stageNamePrompt } = useStageNamePrompt();
  const [selectedJamId, setSelectedJamId] = useState<string | null>(null);
  const [expandedJamIds, setExpandedJamIds] = useState<Set<string>>(new Set());
  const jamRowRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const handleToggleExpandJamRow = useCallback((jamId: string) => {
    setExpandedJamIds((prev) => {
      const next = new Set(prev);
      if (next.has(jamId)) next.delete(jamId);
      else next.add(jamId);
      return next;
    });
  }, []);

  const { today, tomorrow, dayAfterTomorrow } = useMemo(() => dayBounds(), []);

  const selectedDay = dayFilter === "today" ? today : tomorrow;
  const selectedDayEnd = new Date(selectedDay.getTime() + 86400000);

  const refetchParticipants = useCallback(async (jamIds: string[]) => {
    if (jamIds.length === 0) return;
    const { data: partData } = await supabase
      .from("jam_participants")
      .select("jam_id, user_id, status, profile:profiles(id, username, avatar_url)")
      .in("jam_id", jamIds);
    const map: Record<string, ParticipantWithProfile[]> = {};
    for (const p of (partData ?? []) as any[]) {
      if (!map[p.jam_id]) map[p.jam_id] = [];
      map[p.jam_id].push({ user_id: p.user_id, profile: p.profile ?? null, status: p.status });
    }
    setParticipantsMap(map);
  }, []);

  // Re-fetch après une action (rejoindre une jam depuis la carte) — le rendu
  // initial vient du serveur.
  const refetch = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id ?? null);

    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();

    const { data: jamsData } = await supabase
      .from("jam_sessions")
      .select("id, title, description, start_time, end_at, location, is_open, created_by, has_drums, has_keyboard, genres, poster_url")
      .or(`end_at.gte.${now.toISOString()},start_time.gte.${today.toISOString()}`)
      .lt("start_time", dayAfterTomorrow.toISOString())
      .order("start_time", { ascending: true });
    setJams(jamsData ?? []);

    if (jamsData && jamsData.length > 0) {
      await refetchParticipants(jamsData.map((j) => j.id));
    }

    const { data: concertsData } = await supabase
      .from("concerts")
      .select("id, title, artist, start_time, end_at, location, genres, is_free, price, poster_url")
      .gte("start_time", twoHoursAgo)
      .lt("start_time", dayAfterTomorrow.toISOString())
      .order("start_time", { ascending: true });
    setConcerts(concertsData ?? []);

    if (concertsData && concertsData.length > 0) {
      const ids = concertsData.map((c) => c.id);
      const { data: intData } = await supabase
        .from("concert_interested").select("concert_id, user_id")
        .in("concert_id", ids);
      const mySet = new Set<string>();
      for (const row of intData ?? []) {
        if (user && row.user_id === user.id) mySet.add(row.concert_id);
      }
      setMyInterests(mySet);
    }
  }, [dayAfterTomorrow, refetchParticipants]);

  // Statut d'inscription (S'inscrire / En attente / Jouer) en temps réel.
  // Filtré sur user_id plutôt que sur la liste des jams affichées : un
  // filtre jam_id=in.(...) avec toutes les jams en cours (une centaine en
  // prod, ~3800 caractères) dépasse une limite de longueur côté Realtime et
  // ne délivre alors plus aucun évènement, sans erreur visible — alors que
  // ce qui nous intéresse ici (ma propre inscription) se filtre très bien
  // sur un seul user_id, quel que soit le nombre de jams.
  const jamIdsKey = useMemo(() => jams.map((j) => j.id).join(","), [jams]);
  useEffect(() => {
    if (!currentUserId) return;
    const jamIds = jamIdsKey ? jamIdsKey.split(",") : [];
    if (jamIds.length === 0) return;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const refetchSoon = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => refetchParticipants(jamIds), 250);
    };
    const channel = supabase.channel(`home-jams-my-participation-${currentUserId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "jam_participants", filter: `user_id=eq.${currentUserId}` }, refetchSoon)
      .subscribe();
    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [currentUserId, jamIdsKey, refetchParticipants]);

  const handleJoinJam = useCallback(async (jamId: string) => {
    if (!currentUserId) { router.push(`/login?next=${encodeURIComponent(`/events/jams/${jamId}`)}`); return; }
    const name = await ensureStageName(currentUserId);
    if (!name) return;
    // Les jams sur approbation doivent passer par un statut "pending".
    const jam = jams.find((j) => j.id === jamId);
    const status = jam?.is_open === false ? "pending" : "confirmed";
    await joinJam(jamId, currentUserId, status);
    await refetch();
  }, [currentUserId, jams, joinJam, refetch, router, ensureStageName]);

  const handleMarkerClick = useCallback((marker: EventMarker) => {
    if (marker.type !== "jam") return;
    setSelectedJamId(marker.id);
    // La liste n'est pas réordonnée : si la jam sélectionnée est plus bas
    // dans la liste (hors écran), on l'amène en vue au lieu de la laisser
    // invisible.
    jamRowRefs.current[marker.id]?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

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
      {!currentUserId && (
        <div className="flex items-center justify-end">
          <button onClick={() => router.push("/login")}
            className="text-xs font-medium text-zik-grad-to border border-zik-grad-to/30 px-3 py-1.5 rounded-full hover:bg-zik-grad-to/10 transition-colors">
            Se connecter
          </button>
        </div>
      )}

      {/* Carte + filtre + liste jams/concerts — la carte reste visible tout
          le long de cette section (sticky), et redevient normale dès qu'on
          atteint les sections Groupes / Annonces plus bas. */}
      <div className="flex flex-col gap-4">
      {/* Carte */}
      <div className="sticky top-[calc(56px+env(safe-area-inset-top))] z-20 w-full bg-zik-bg">
        <EventMap
          markers={markers}
          onJoinJam={(jamId) => handleJoinJam(jamId)}
          onMarkerClick={handleMarkerClick}
          currentUserId={currentUserId}
          emptyMessage="Aucun événement 📍"
          height="h-52"
          focusMarkerId={selectedJamId}
        />
        {/* Fondu (dégradé d'opacité) sous la carte, positionné en absolu
            (hors flux) pour rester garanti collé juste sous la carte */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-full h-6 bg-linear-to-b from-zik-bg to-transparent" />
      </div>

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
                background: isActive ? 'rgba(168,85,247,0.15)' : 'rgba(255,255,255,0.04)',
                border: '1px solid',
                borderColor: isActive ? 'rgba(168,85,247,0.6)' : 'rgba(255,255,255,0.07)',
                color: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.67)',
                boxShadow: isActive ? '0 0 12px -2px rgba(168,85,247,0.5)' : 'none',
              }}
            >
              {filter === "today" ? "Aujourd'hui" : "Demain"}
              {count > 0 && (
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{
                    background: isActive ? 'rgba(168,85,247,0.25)' : 'rgba(255,255,255,0.08)',
                    color: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.64)',
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
            color: 'rgba(255,255,255,0.67)',
            whiteSpace: 'nowrap',
          }}
        >
          Voir plus →
        </button>
      </div>

      {/* Liste compacte jams + concerts du jour sélectionné */}
      {totalFiltered === 0 ? (
        <p className="text-zik-muted text-sm text-center py-8">
          {dayFilter === "today"
            ? "Pas d'événement aujourd'hui 🎸 — créez le vôtre !"
            : "Pas d'événement demain 🎸"}
        </p>
      ) : (
        <div className="flex flex-col">
          {filteredJams.length > 0 && (
            <p className="mb-0.5 text-[11px] font-bold tracking-wide text-amber-400 uppercase">Jams</p>
          )}
          {filteredJams.map((jam) => {
            const myParticipation = (participantsMap[jam.id] ?? []).find((p) => p.user_id === currentUserId);
            return (
              <EventRow
                key={jam.id}
                href={`/events/jams/${jam.id}`}
                moreInfoHref={`/events?jam=${jam.id}`}
                time={formatTime(jam.start_time)}
                timeColorClass="text-amber-400"
                title={jam.title}
                genres={jam.genres}
                onSelect={() => setSelectedJamId(jam.id)}
                onToggleExpand={() => handleToggleExpandJamRow(jam.id)}
                selected={jam.id === selectedJamId}
                expanded={expandedJamIds.has(jam.id)}
                rowRef={(el) => { jamRowRefs.current[jam.id] = el; }}
                isCreator={isOwner(jam, currentUserId)}
                isParticipant={myParticipation?.status === "confirmed"}
                isPending={myParticipation?.status === "pending"}
                isJoining={joiningJamId === jam.id}
                onJoin={() => handleJoinJam(jam.id)}
              />
            );
          })}

          {filteredConcerts.length > 0 && (
            <>
              <p className="mt-2 mb-0.5 text-[11px] font-bold tracking-wide text-zik-red uppercase">Concerts</p>
              {filteredConcerts.map((concert) => (
                <EventRow
                  key={concert.id}
                  href={`/events/concerts/${concert.id}`}
                  time={formatTime(concert.start_time)}
                  timeColorClass="text-zik-red"
                  title={concert.title}
                  genres={concert.genres}
                />
              ))}
            </>
          )}
        </div>
      )}
      </div>

      {/* Groupes */}
      {initialRecruitingAds.length > 0 && (
        <div className="flex flex-col gap-2.5">
          <div className="flex items-baseline justify-between">
            <h2 className="text-[15px] font-bold text-white">👥 Groupes</h2>
            <Link href="/groups" className="text-xs font-semibold text-zik-grad-to">Tout voir</Link>
          </div>
          <div className="flex flex-col gap-2.5">
            {initialRecruitingAds.filter((ad) => ad.groups).map((ad) => (
              <Link
                key={ad.id}
                href={`/groups/${ad.groups!.id}`}
                className="w-full rounded-2xl bg-white/4 backdrop-blur-md border border-white/8 p-3.5 flex flex-col gap-2"
              >
                <div className="flex items-center gap-2.5">
                  <GroupAvatar group={ad.groups!} size="sm" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{ad.groups!.name}</p>
                    {ad.groups!.city && <p className="text-xs text-gray-300">{ad.groups!.city}</p>}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  {ad.groups!.genre ? (
                    <span
                      className="shrink-0 text-[10px] font-semibold px-2.5 py-0.5 rounded-full"
                      style={{ backgroundColor: `${genreColor(ad.groups!.genre)}1A`, color: genreColor(ad.groups!.genre) }}
                    >
                      {ad.groups!.genre}
                    </span>
                  ) : <span />}
                  <span className="shrink-0 text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-zik-emerald/10 text-zik-emerald">
                    {ad.instrument ? `Cherche ${ad.instrument}` : "Recrute"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Dernier musicien inscrit */}
      {initialLatestMusician && (
        <div className="flex flex-col gap-2.5">
          <h2 className="text-[15px] font-bold text-white">🎵 Dernier musicien inscrit</h2>
          <Link
            href={`/profile/${initialLatestMusician.id}`}
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/4 backdrop-blur-md border border-white/8"
          >
            {initialLatestMusician.avatar_url ? (
              <img src={initialLatestMusician.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover shrink-0" />
            ) : (
              <div className="h-12 w-12 rounded-full shrink-0 flex items-center justify-center text-sm font-bold text-white bg-linear-to-br from-zik-grad-from to-zik-grad-to">
                {(initialLatestMusician.username ?? initialLatestMusician.display_name ?? "?").slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {initialLatestMusician.username ?? initialLatestMusician.display_name ?? "Nouveau musicien"}
              </p>
              <p className="text-xs text-gray-300 truncate">
                {[initialLatestMusician.city, initialLatestMusician.instruments?.join(", ")].filter(Boolean).join(" · ") || "Vient de s'inscrire"}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-300 shrink-0" />
          </Link>
        </div>
      )}

      {/* Annonces */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[15px] font-bold text-white">📣 Annonces</h2>
          <Link href="/groups" className="text-xs font-semibold text-zik-grad-to">Tout voir</Link>
        </div>
        {initialMusicianAds.length > 0 ? (
          <div className="flex flex-col gap-2.5">
            {initialMusicianAds.map((ad) => (
              <Link
                key={ad.id}
                href={`/ads/${ad.id}`}
                className="w-full rounded-2xl bg-white/4 backdrop-blur-md border border-white/8 p-3.5 flex flex-col gap-2"
              >
                <div className="flex items-center gap-2 text-zik-grad-to">
                  <Music2 className="h-4 w-4 shrink-0" />
                  <span className="text-[11px] font-semibold uppercase tracking-wide">{ad.instrument ?? "Musicien"}</span>
                </div>
                <p className="text-sm font-semibold text-white truncate">{ad.title}</p>
                {ad.city && <p className="text-xs text-gray-300 truncate">{ad.city}</p>}
              </Link>
            ))}
          </div>
        ) : (
          <Link href="/groups" className="flex flex-col items-center gap-2 text-center py-5 px-4 rounded-2xl bg-white/3 border border-dashed border-white/14">
            <Megaphone className="h-5 w-5 text-gray-300" />
            <span className="text-[13px] text-gray-300">Aucune annonce pour l'instant</span>
            <span className="text-xs font-semibold text-zik-grad-to">Publier une annonce</span>
          </Link>
        )}
      </div>

      <StageNamePromptModal
        open={stageNamePrompt.isOpen}
        value={stageNamePrompt.value}
        onChange={stageNamePrompt.setValue}
        onSubmit={stageNamePrompt.handleSubmit}
        onCancel={stageNamePrompt.handleCancel}
        isSaving={stageNamePrompt.isSaving}
      />
    </div>
  );
}
