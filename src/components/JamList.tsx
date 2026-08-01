"use client";

import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ChevronDown, Drum, Piano, LocateFixed } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import JamCard from "@/components/JamCard";
import type { EventMarker } from "@/components/EventMap";
import type { JamSession, Profile as ProfileRow } from "@/types";
import { haversineDistanceKm, type LatLng } from "@/lib/geo";
import { useJamParticipation } from "@/hooks/useJamParticipation";
import { useJamInterest } from "@/hooks/useJamInterest";
import { isOwner } from "@/lib/permissions";
import { canJoinJam } from "@/lib/jamJoinWindow";

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
  const { joinJam, leaveJam, pendingJamId: joiningJamId } = useJamParticipation();
  const { markInterested, unmarkInterested, pendingJamId: interestPendingId } = useJamInterest();
  const [myJamInterests, setMyJamInterests] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(startOfDay(new Date()));
  const [drumsOnly, setDrumsOnly] = useState(false);
  const [keyboardOnly, setKeyboardOnly] = useState(false);
  const [nearMe, setNearMe] = useState(false);
  const [userPosition, setUserPosition] = useState<LatLng | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [radiusKm, setRadiusKm] = useState<number | null>(null);

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

     const now = new Date();
const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();

const { data: jamsData, error: jamsError } = await supabase
  .from("jam_sessions")
  .select("*")
  .or(`end_at.gte.${now.toISOString()},and(end_at.is.null,start_time.gte.${twoHoursAgo})`)
  .order("start_time", { ascending: true });
      if (jamsError) { setError("Impossible de charger les jams"); setIsLoading(false); return; }
      setJams(jamsData ?? []);
      const jamIds = (jamsData ?? []).map((j) => j.id);
      if (jamIds.length > 0) {
        await fetchParticipants(jamIds);
        if (user) {
          const { data: jamIntData } = await supabase
            .from("jam_interested").select("jam_id")
            .eq("user_id", user.id).in("jam_id", jamIds);
          setMyJamInterests(new Set((jamIntData ?? []).map((r) => r.jam_id)));
        }
      }
      setIsLoading(false);
    };
    fetchAll();
  }, [fetchParticipants]);

  const handleJoin = useCallback(async (jamId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!currentUserId) { router.push(`/login?next=${encodeURIComponent(`/events/jams/${jamId}`)}`); return; }
    await joinJam(jamId, currentUserId);
    await fetchParticipants(jams.map((j) => j.id));
  }, [currentUserId, jams, fetchParticipants, joinJam, router]);

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
      <EventMap
        markers={jamMarkers}
        onJoinJam={(jamId) => handleJoin(jamId)}
        currentUserId={currentUserId}
        emptyMessage="Aucune jam à venir 🎸"
      />
      <DayFilter selectedDate={selectedDate} onChange={setSelectedDate} availableDates={availableDates} />

      {/* Filtres batterie + clavier + proximité */}
      <div className="flex flex-wrap gap-2">
        <div className="flex-1 min-w-35 flex items-center justify-between gap-2 rounded-lg border border-zik-border p-3 bg-zik-card/50">
          <span className="flex items-center gap-1.5 text-sm font-medium text-zik-text truncate">
            <Drum className="h-4 w-4 text-zik-muted shrink-0" />
            <span className="truncate">Avec batterie</span>
          </span>
          <Switch
            checked={drumsOnly}
            onCheckedChange={setDrumsOnly}
            className="shrink-0 data-[state=checked]:bg-zik-purple data-[state=unchecked]:bg-zik-card-hover"
          />
        </div>

        <div className="flex-1 min-w-35 flex items-center justify-between gap-2 rounded-lg border border-zik-border p-3 bg-zik-card/50">
          <span className="flex items-center gap-1.5 text-sm font-medium text-zik-text truncate">
            <Piano className="h-4 w-4 text-zik-muted shrink-0" />
            <span className="truncate">Avec clavier</span>
          </span>
          <Switch
            checked={keyboardOnly}
            onCheckedChange={setKeyboardOnly}
            className="shrink-0 data-[state=checked]:bg-zik-purple data-[state=unchecked]:bg-zik-card-hover"
          />
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <button
              onClick={() => { if (!nearMe) handleToggleNearMe(true); }}
              className={`flex-1 min-w-35 flex items-center justify-between gap-2 rounded-lg border p-3 text-left transition-colors ${
                nearMe ? "border-zik-purple/40 bg-zik-purple/10" : "border-zik-border bg-zik-card/50 hover:border-zik-purple/30"
              }`}
            >
              <span className="flex items-center gap-1.5 text-sm font-medium text-zik-text truncate">
                <LocateFixed className={`h-4 w-4 shrink-0 ${nearMe ? "text-zik-purple" : "text-zik-muted"}`} />
                <span className="truncate">
                  {geoLoading
                    ? "Localisation..."
                    : nearMe && userPosition
                    ? `Près de moi · ${radiusKm === null ? "Tout" : radiusKm + " km"}`
                    : "Près de moi"}
                </span>
              </span>
              {nearMe && <ChevronDown className="h-3.5 w-3.5 text-zik-muted shrink-0" />}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64 bg-zik-card border-zik-border p-4 space-y-3" align="end">
            {geoError && <p className="text-xs text-zik-red">{geoError}</p>}
            {nearMe && userPosition && (
              <div>
                <p className="text-xs text-zik-muted mb-1.5">Rayon</p>
                <div className="flex flex-wrap gap-1.5">
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
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                          isActive ? "bg-zik-purple text-white" : "bg-zik-card-hover text-zik-muted hover:bg-zik-border"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => handleToggleNearMe(false)}
                  className="mt-3 text-xs text-zik-muted hover:text-zik-red transition-colors"
                >
                  Désactiver la localisation
                </button>
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>

      {filteredJams.length === 0 ? (
        <p className="text-zik-muted text-sm text-center py-6">{emptyMessage}</p>
      ) : (
        <div className="space-y-3">
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
                isJoining={joiningJamId === jam.id}
                isInterested={myJamInterests.has(jam.id)}
                isInterestPending={interestPendingId === jam.id}
                joinOpen={canJoinJam(jam.start_time)}
                distanceKm={distanceById[jam.id]}
                onToggleInterest={handleToggleInterest}
                onJoin={handleJoin}
                onLeave={handleLeave}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}