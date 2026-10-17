"use client";

import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import moment from "moment-timezone";
import { ChevronDown, Drum, Piano, LocateFixed, Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import JamCard from "@/components/JamCard";
import type { EventMarker } from "@/components/EventMap";
import type { JamSession, Profile as ProfileRow } from "@/types";
import { haversineDistanceKm, type LatLng } from "@/lib/geo";
import { useJamParticipation } from "@/hooks/useJamParticipation";
import { useJamInterest } from "@/hooks/useJamInterest";
import { useStageNamePrompt } from "@/hooks/useStageNamePrompt";
import StageNamePromptModal from "@/components/StageNamePromptModal";
import { isOwner } from "@/lib/permissions";
import { canJoinJam } from "@/lib/jamJoinWindow";
import { useShrinkOnScroll } from "@/hooks/useShrinkOnScroll";

const EventMap = dynamic(() => import("@/components/EventMap"), {
  ssr: false,
  // ✅ Loading avec ton thème
  loading: () => <div className="h-52 bg-zik-card animate-pulse rounded-xl" />,
});

type Profile = Pick<ProfileRow, "id" | "username" | "avatar_url">;
interface ParticipantWithProfile { user_id: string; profile: Profile | null; }

function getLatLng(location: string | null): LatLng | null {
  if (!location) return null;
  try { const p = JSON.parse(location); return p?.lat && p?.lng ? { lat: p.lat, lng: p.lng } : null; }
  catch { return null; }
}

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

const VISIBLE_DAYS = 2;

function DayFilter({ selectedDate, onChange, availableDates, trailing }: {
  selectedDate: Date | null; onChange: (d: Date | null) => void; availableDates: Date[]; trailing?: React.ReactNode;
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
    <div className="flex items-center gap-1.5 w-full flex-wrap">
      {/* Boutons des jours visibles */}
      {visibleDays.map((day) => {
        const hasEvent = availableDates.some((d) => isSameDay(d, day));
        const isSelected = selectedDate !== null && isSameDay(selectedDate, day);
        return (
          <button
            key={day.toISOString()}
            onClick={() => onChange(isSelected ? null : day)}
            className={`flex-1 min-w-16 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors relative text-center ${
              isSelected
                ? "bg-white/10 border-zik-grad-to/70 text-white shadow-[0_0_10px_-2px_rgba(168,85,247,0.6)]"
                : hasEvent
                ? "bg-white/6 border-zik-grad-to/25 text-zik-grad-to hover:bg-white/10"
                : "bg-white/6 border-transparent text-gray-400 hover:bg-white/10"
            }`}
          >
            <span className="truncate block">{formatDayLabel(day)}</span>
            {hasEvent && !isSelected && (
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-zik-grad-to rounded-full border border-zik-bg" />
            )}
          </button>
        );
      })}

      {/* Bouton dropdown */}
      <div className="relative shrink-0" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen((v) => !v)}
          className={`flex items-center gap-0.5 px-2.5 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            selectedIsInMore
              ? "bg-white/10 border-zik-grad-to/70 text-white shadow-[0_0_10px_-2px_rgba(168,85,247,0.6)]"
              : "bg-white/6 border-transparent text-gray-400 hover:bg-white/10"
          }`}
        >
          {selectedIsInMore ? formatDayLabel(selectedDate!) : "···"}
          <ChevronDown className={`h-3 w-3 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
        </button>

        {dropdownOpen && (
          <div className="absolute right-0 top-full mt-1 z-50 bg-zik-card/90 backdrop-blur-md rounded-xl shadow-lg border border-white/8 py-1 min-w-40 max-h-64 overflow-y-auto">
            {moreDays.map((day) => {
              const hasEvent = availableDates.some((d) => isSameDay(d, day));
              const isSelected = selectedDate !== null && isSameDay(selectedDate, day);
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => { onChange(isSelected ? null : day); setDropdownOpen(false); }}
                  className={`w-full text-left px-4 py-2 text-xs flex items-center justify-between gap-2 hover:bg-white/6 transition-colors ${
                    isSelected ? "text-zik-grad-to font-semibold bg-white/6" : "text-gray-400"
                  }`}
                >
                  <span>{formatDayLabelLong(day)}</span>
                  {hasEvent && <span className="h-2 w-2 rounded-full bg-zik-grad-to shrink-0" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {trailing}
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
              className="h-7 w-7 rounded-full border-2 border-zik-bg bg-linear-to-br from-zik-grad-from to-zik-grad-to flex items-center justify-center text-white text-[10px] font-semibold"
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

interface JamListProps {
  initialJams?: JamSession[];
  initialParticipantsMap?: Record<string, ParticipantWithProfile[]>;
}

export default function JamList({ initialJams, initialParticipantsMap }: JamListProps = {}) {
  const supabase = createClient();
  const router = useRouter();
  const [jams, setJams] = useState<JamSession[]>(initialJams ?? []);
  const [participantsMap, setParticipantsMap] = useState<Record<string, ParticipantWithProfile[]>>(initialParticipantsMap ?? {});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { joinJam, leaveJam, pendingJamId: joiningJamId } = useJamParticipation();
  const { markInterested, unmarkInterested, pendingJamId: interestPendingId } = useJamInterest();
  const { ensureStageName, ...stageNamePrompt } = useStageNamePrompt();
  const [myJamInterests, setMyJamInterests] = useState<Set<string>>(new Set());
  const [jamInterestCounts, setJamInterestCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(!initialJams);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(startOfDay(new Date()));
  const [drumsOnly, setDrumsOnly] = useState(false);
  const [keyboardOnly, setKeyboardOnly] = useState(false);
  const [nearMe, setNearMe] = useState(false);
  const [userPosition, setUserPosition] = useState<LatLng | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [radiusKm, setRadiusKm] = useState<number | null>(null);
  const [selectedJamId, setSelectedJamId] = useState<string | null>(null);
  const [reorderJamId, setReorderJamId] = useState<string | null>(null);
  // Chaque card se déplie/replie indépendamment des autres.
  const [expandedJamIds, setExpandedJamIds] = useState<Set<string>>(new Set());
  // Déclencheur du scroll-vers-la-card ci-dessous : un objet neuf à chaque
  // dépli (même si c'est la même card qu'avant) pour que l'effet se
  // redéclenche à chaque fois, pas seulement au premier dépli.
  const [scrollTrigger, setScrollTrigger] = useState<{ id: string; token: number } | null>(null);
  // Carte sticky qui se réduit progressivement au scroll.
  const MAP_HEIGHT_FULL = 208;
  const MAP_HEIGHT_SHRUNK = 132;
  const MAP_SHRINK_THRESHOLD = 180;
  const mapHeight = useShrinkOnScroll(MAP_HEIGHT_FULL, MAP_HEIGHT_SHRUNK, MAP_SHRINK_THRESHOLD);
  const jamCardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  // Lu au moment du scroll sans faire dépendre l'effet de mapHeight, sinon
  // tout changement de hauteur de la carte pendant le scroll (après coup)
  // re-déclencherait le scroll et "collerait" la page à cette position.
  const mapHeightRef = useRef(mapHeight);
  useEffect(() => { mapHeightRef.current = mapHeight; }, [mapHeight]);

  // Quand une card se déplie, on scroll UNE SEULE FOIS (au clic) pour que
  // son haut arrive juste sous la carte sticky. Si la destination traverse
  // le seuil de rétrécissement de la carte, on se repositionne d'abord
  // instantanément de l'autre côté du seuil (la carte prend donc sa taille
  // finale AVANT toute animation visible), puis on fait le seul scroll
  // fluide, visible, vers la position déjà exacte — plutôt que d'animer
  // vers une cible provisoire puis de "corriger" après coup.
  useEffect(() => {
    if (!scrollTrigger) return;
    const el = jamCardRefs.current[scrollTrigger.id];
    if (!el) return;

    const computeTarget = () => {
      const rect = el.getBoundingClientRect();
      const offset = 56 + mapHeightRef.current;
      return window.scrollY + rect.top - offset;
    };

    const frame = requestAnimationFrame(() => {
      const naiveTarget = computeTarget();
      const crossesThreshold = (naiveTarget > MAP_SHRINK_THRESHOLD) !== (window.scrollY > MAP_SHRINK_THRESHOLD);

      if (!crossesThreshold) {
        window.scrollTo({ top: naiveTarget, behavior: "smooth" });
        return;
      }

      const nudge = naiveTarget > MAP_SHRINK_THRESHOLD ? MAP_SHRINK_THRESHOLD + 1 : MAP_SHRINK_THRESHOLD - 1;
      window.scrollTo({ top: nudge, behavior: "auto" });
      // Deux frames pour laisser le temps à l'évènement scroll de se
      // déclencher et à React de re-rendre avec la nouvelle hauteur.
      requestAnimationFrame(() => requestAnimationFrame(() => {
        window.scrollTo({ top: computeTarget(), behavior: "smooth" });
      }));
    });

    return () => cancelAnimationFrame(frame);
  }, [scrollTrigger]);

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

      const now = moment.tz("Europe/Paris");
      const startOfToday = now.clone().startOf("day").toISOString();

      const { data: jamsData, error: jamsError } = await supabase
        .from("jam_sessions")
        .select("*")
        .or(`end_at.gte.${now.toISOString()},start_time.gte.${startOfToday}`)
        .order("start_time", { ascending: true });
      if (jamsError) { setError("Impossible de charger les jams"); setIsLoading(false); return; }
      setJams(jamsData ?? []);
      const jamIds = (jamsData ?? []).map((j) => j.id);
      if (jamIds.length > 0) {
        await fetchParticipants(jamIds);
        const { data: jamIntData } = await supabase
          .from("jam_interested").select("jam_id, user_id")
          .in("jam_id", jamIds);
        const countMap: Record<string, number> = {};
        for (const row of jamIntData ?? []) {
          countMap[row.jam_id] = (countMap[row.jam_id] ?? 0) + 1;
        }
        setJamInterestCounts(countMap);
        if (user) {
          setMyJamInterests(new Set((jamIntData ?? []).filter((r) => r.user_id === user.id).map((r) => r.jam_id)));
        }
      }
      setIsLoading(false);
    };
    fetchAll();
  }, [fetchParticipants]);

  const handleJoin = useCallback(async (jamId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!currentUserId) { router.push(`/login?next=${encodeURIComponent(`/events/jams/${jamId}`)}`); return; }
    const name = await ensureStageName(currentUserId);
    if (!name) return;
    // Les jams sur approbation doivent passer par un statut "pending" — la
    // colonne status a "confirmed" comme valeur par défaut en base, donc
    // l'omettre inscrivait tout le monde d'office, même sur une jam fermée.
    const jam = jams.find((j) => j.id === jamId);
    const status = jam?.is_open === false ? "pending" : "confirmed";
    await joinJam(jamId, currentUserId, status);
    await fetchParticipants(jams.map((j) => j.id));
  }, [currentUserId, jams, fetchParticipants, joinJam, router, ensureStageName]);

  const handleLeave = useCallback(async (jamId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!currentUserId) return;
    await leaveJam(jamId, currentUserId);
    setParticipantsMap((prev) => ({ ...prev, [jamId]: (prev[jamId] ?? []).filter((p) => p.user_id !== currentUserId) }));
  }, [currentUserId, leaveJam]);

  const handleToggleInterest = useCallback(async (jamId: string, e?: React.MouseEvent) => {
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

  const handleMarkerClick = useCallback((marker: EventMarker) => {
    setSelectedJamId(marker.id);
    setReorderJamId(marker.id);
    // La jam sélectionnée remonte en tête de liste — si on est scrollé plus
    // bas, elle resterait invisible sans ce retour en haut de page.
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Chaque card se déplie/replie indépendamment — cliquer sur une autre ne
  // referme pas celle déjà ouverte.
  const handleToggleExpand = useCallback((jamId: string) => {
    setSelectedJamId(jamId);
    const willExpand = !expandedJamIds.has(jamId);
    setExpandedJamIds((prev) => {
      const next = new Set(prev);
      if (next.has(jamId)) next.delete(jamId);
      else next.add(jamId);
      return next;
    });
    if (willExpand) setScrollTrigger({ id: jamId, token: Date.now() });
  }, [expandedJamIds]);

  const handleToggleNearMe = useCallback((checked: boolean) => {
    setNearMe(checked);
    setGeoError(null);
    setRadiusKm(null);
    if (!checked) return;
    if (!navigator.geolocation) {
      setGeoError("La géolocalisation n'est pas disponible sur cet appareil.");
      setNearMe(false);
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoLoading(false);
      },
      () => {
        setGeoError("Localisation refusée ou indisponible.");
        setGeoLoading(false);
        setNearMe(false);
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  }, []);

  const availableDates = useMemo(() => jams.map((j) => new Date(j.start_time)), [jams]);
  const filteredJams = useMemo(() => {
    const filtered = jams.filter((j) => {
      if (selectedDate && !isSameDay(new Date(j.start_time), selectedDate)) return false;
      if (drumsOnly && !j.has_drums) return false;
      if (keyboardOnly && !j.has_keyboard) return false;
      return true;
    });
    if (!nearMe || !userPosition) return filtered;
    const withDistance = filtered
      .map((j) => {
        const pos = getLatLng(j.location);
        return { jam: j, distance: pos ? haversineDistanceKm(userPosition, pos) : null };
      })
      .filter((w) => radiusKm === null || (w.distance !== null && w.distance <= radiusKm));
    withDistance.sort((a, b) => {
      if (a.distance === null) return 1;
      if (b.distance === null) return -1;
      return a.distance - b.distance;
    });
    return withDistance.map((w) => w.jam);
  }, [jams, selectedDate, drumsOnly, keyboardOnly, nearMe, userPosition, radiusKm]);

  // La jam cliquée sur la carte (uniquement via le pin, pas via la card)
  // remonte en tête de liste, sans changer l'ordre des autres.
  const displayJams = useMemo(() => {
    if (!reorderJamId) return filteredJams;
    const idx = filteredJams.findIndex((j) => j.id === reorderJamId);
    if (idx <= 0) return filteredJams;
    const copy = [...filteredJams];
    const [selected] = copy.splice(idx, 1);
    copy.unshift(selected);
    return copy;
  }, [filteredJams, reorderJamId]);

  const distanceById = useMemo(() => {
    if (!nearMe || !userPosition) return {} as Record<string, number>;
    const map: Record<string, number> = {};
    for (const j of jams) {
      const pos = getLatLng(j.location);
      if (pos) map[j.id] = haversineDistanceKm(userPosition, pos);
    }
    return map;
  }, [jams, nearMe, userPosition]);

  const jamMarkers = useMemo<EventMarker[]>(() =>
    filteredJams.flatMap((jam) => {
      if (!jam.location) return [];
      try {
        const loc = JSON.parse(jam.location);
        if (!loc?.lat || !loc?.lng) return [];
        const participants = participantsMap[jam.id] ?? [];
        return [{
          id: jam.id, title: jam.title, start_time: jam.start_time,
          lat: loc.lat, lng: loc.lng, type: "jam" as const,
          is_open: jam.is_open,
          isParticipant: participants.some((p) => p.user_id === currentUserId),
          isCreator: isOwner(jam, currentUserId),
        }];
      } catch { return []; }
    }), [filteredJams, participantsMap, currentUserId]);

  const emptyMessage = useMemo(() => {
    if (nearMe && radiusKm !== null) return `Aucune jam à moins de ${radiusKm} km 🎸 — essaie un rayon plus large`;
    if (drumsOnly) return "Aucune jam avec batterie ne correspond 🥁 — essaie de désactiver ce filtre";
    if (keyboardOnly) return "Aucune jam avec clavier ne correspond 🎹 — essaie de désactiver ce filtre";
    if (!selectedDate) return "Aucune jam à venir 🎸";
    const diff = Math.round((startOfDay(selectedDate).getTime() - startOfDay(new Date()).getTime()) / 86400000);
    if (diff === 0) return "Pas de jam aujourd'hui 🎸 — clique sur un autre jour ou crée la tienne !";
    if (diff === 1) return "Pas de jam demain 🎸";
    return "Aucune jam ce jour-là 🎸";
  }, [selectedDate, nearMe, radiusKm, drumsOnly, keyboardOnly]);

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
      <div className="sticky top-[calc(56px+env(safe-area-inset-top))] z-20 w-full bg-zik-bg">
        {/* Hauteur fixée en px (et non une classe Tailwind) pour pouvoir la
            faire varier au scroll via useShrinkOnScroll. */}
        <div className="relative transition-[height] duration-300 ease-out" style={{ height: mapHeight }}>
        <EventMap
          markers={jamMarkers}
          onJoinJam={(jamId) => handleJoin(jamId)}
          onMarkerClick={handleMarkerClick}
          currentUserId={currentUserId}
          emptyMessage="Aucune jam à venir 🎸"
          focusMarkerId={selectedJamId}
          height="h-full"
        />

        {/* Près de moi — flottant au-dessus de la carte */}
        <div className="absolute top-3 right-3 z-20">
          <Popover>
            <PopoverTrigger asChild>
              <button
                onClick={() => { if (!nearMe) handleToggleNearMe(true); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border backdrop-blur-md shadow-lg transition-colors ${
                  nearMe
                    ? "bg-white/15 border-zik-grad-to/70 text-white shadow-[0_0_10px_-2px_rgba(168,85,247,0.6)]"
                    : "bg-black/40 border-white/15 text-white hover:bg-black/55"
                }`}
              >
                <LocateFixed className="h-3.5 w-3.5 shrink-0" />
                {geoLoading
                  ? "Localisation..."
                  : nearMe && userPosition
                  ? `${radiusKm === null ? "Tout" : radiusKm + " km"}`
                  : "Près de moi"}
                {nearMe && <ChevronDown className="h-3 w-3 shrink-0" />}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-40 bg-zik-card/90 backdrop-blur-md border-white/8 p-2" align="end">
              {geoError && <p className="text-xs text-zik-red px-2 py-1">{geoError}</p>}
              {nearMe && userPosition && (
                <div>
                  <p className="text-xs text-gray-400 px-2 pt-1 pb-1.5">Rayon</p>
                  <div className="flex flex-col gap-0.5">
                    {([
                      { key: null, label: "Tout" },
                      { key: 1, label: "1 km" },
                      { key: 5, label: "5 km" },
                      { key: 10, label: "10 km" },
                      { key: 25, label: "25 km" },
                    ] as const).map(({ key, label }) => {
                      const isActive = radiusKm === key;
                      return (
                        <button
                          key={label}
                          onClick={() => setRadiusKm(key)}
                          className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            isActive
                              ? "bg-white/10 text-white"
                              : "text-gray-400 hover:bg-white/6"
                          }`}
                        >
                          {label}
                          {isActive && <Check className="h-3.5 w-3.5 text-zik-grad-to shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-1 pt-1 border-t border-white/8">
                    <button
                      onClick={() => handleToggleNearMe(false)}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs text-gray-400 hover:bg-white/6 hover:text-zik-red transition-colors"
                    >
                      Désactiver la localisation
                    </button>
                  </div>
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>
        </div>

        {/* Fondu (dégradé d'opacité) sous la carte : positionné en absolu
            (hors flux) pour rester garanti collé juste sous la carte et se
            superposer au haut du contenu qui défile dessous, sans jamais
            affecter le rendu de la carte elle-même. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-full h-6 bg-linear-to-b from-zik-bg to-transparent" />
      </div>

      <DayFilter
        selectedDate={selectedDate}
        onChange={setSelectedDate}
        availableDates={availableDates}
        trailing={
          <>
            <button
              onClick={() => setDrumsOnly((v) => !v)}
              title="Avec batterie"
              className={`shrink-0 h-8 w-8 flex items-center justify-center rounded-full border transition-colors ${
                drumsOnly
                  ? "bg-white/10 border-zik-grad-to/70 text-white shadow-[0_0_10px_-2px_rgba(168,85,247,0.6)]"
                  : "bg-white/6 border-transparent text-gray-400 hover:bg-white/10"
              }`}
            >
              <Drum className="h-3.5 w-3.5" />
            </button>

            <button
              onClick={() => setKeyboardOnly((v) => !v)}
              title="Avec clavier"
              className={`shrink-0 h-8 w-8 flex items-center justify-center rounded-full border transition-colors ${
                keyboardOnly
                  ? "bg-white/10 border-zik-grad-to/70 text-white shadow-[0_0_10px_-2px_rgba(168,85,247,0.6)]"
                  : "bg-white/6 border-transparent text-gray-400 hover:bg-white/10"
              }`}
            >
              <Piano className="h-3.5 w-3.5" />
            </button>
          </>
        }
      />

      {filteredJams.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-6">{emptyMessage}</p>
      ) : (
        <div className="space-y-3">
          {displayJams.map((jam) => {
            const participants = participantsMap[jam.id] ?? [];
            const isParticipant = participants.some((p) => p.user_id === currentUserId);
            const isCreator = isOwner(jam, currentUserId);

            return (
              <JamCard
                key={jam.id}
                jam={jam}
                isCreator={isCreator}
                isParticipant={isParticipant}
                isJoining={joiningJamId === jam.id}
                isInterested={myJamInterests.has(jam.id)}
                isInterestPending={interestPendingId === jam.id}
                joinOpen={canJoinJam(jam.start_time)}
                distanceKm={distanceById[jam.id]}
                participantCount={participants.length}
                interestedCount={jamInterestCounts[jam.id] ?? 0}
                expanded={expandedJamIds.has(jam.id)}
                onToggleExpand={handleToggleExpand}
                isSelected={jam.id === selectedJamId}
                cardRef={(el) => { jamCardRefs.current[jam.id] = el; }}
                onToggleInterest={handleToggleInterest}
                onJoin={handleJoin}
                onLeave={handleLeave}
              />
            );
          })}
        </div>
      )}

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