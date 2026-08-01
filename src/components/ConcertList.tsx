"use client";

import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ChevronDown } from "lucide-react";
import ConcertCard from "@/components/ConcertCard";
import type { EventMarker } from "@/components/EventMap";
import type { Concert } from "@/types";

const EventMap = dynamic(() => import("@/components/EventMap"), {
  ssr: false,
  // ✅ Remplace bg-gray-100 par ta couleur de fond
  loading: () => <div className="h-52 bg-zik-card animate-pulse rounded-xl" />,
});

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
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-zik-red rounded-full border border-white" />
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
                  {hasEvent && <span className="h-2 w-2 rounded-full bg-zik-red shrink-0" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ConcertList() {
  const supabase = createClient();
  const router = useRouter();
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [interestedMap, setInterestedMap] = useState<Record<string, number>>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [myInterests, setMyInterests] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id ?? null);
    const now = new Date();
const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();

const { data: concertsData } = await supabase
  .from("concerts")
  .select("*")
  .or(`end_at.gte.${now.toISOString()},and(end_at.is.null,start_time.gte.${twoHoursAgo})`)
  .order("start_time", { ascending: true });
    setConcerts(concertsData ?? []);
    if (concertsData && concertsData.length > 0) {
      const ids = concertsData.map((c) => c.id);
      const { data: interestData } = await supabase
        .from("concert_interested").select("concert_id, user_id").in("concert_id", ids);
      const countMap: Record<string, number> = {};
      const mySet = new Set<string>();
      for (const row of interestData ?? []) {
        countMap[row.concert_id] = (countMap[row.concert_id] ?? 0) + 1;
        if (row.user_id === user?.id) mySet.add(row.concert_id);
      }
      setInterestedMap(countMap);
      setMyInterests(mySet);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleToggleInterest = async (concertId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (togglingId) return;
    if (!currentUserId) { router.push(`/login?next=${encodeURIComponent(`/events/concerts/${concertId}`)}`); return; }
    setTogglingId(concertId);
    const isInterested = myInterests.has(concertId);
    if (isInterested) {
      await supabase.from("concert_interested").delete().eq("concert_id", concertId).eq("user_id", currentUserId);
      setMyInterests((prev) => { const s = new Set(prev); s.delete(concertId); return s; });
      setInterestedMap((prev) => ({ ...prev, [concertId]: Math.max(0, (prev[concertId] ?? 1) - 1) }));
    } else {
      await supabase.from("concert_interested").insert({ concert_id: concertId, user_id: currentUserId });
      setMyInterests((prev) => new Set([...prev, concertId]));
      setInterestedMap((prev) => ({ ...prev, [concertId]: (prev[concertId] ?? 0) + 1 }));
    }
    setTogglingId(null);
  };

  const availableDates = useMemo(() => concerts.map((c) => new Date(c.start_time)), [concerts]);
  const filtered = useMemo(() => {
    if (!selectedDate) return concerts;
    return concerts.filter((c) => isSameDay(new Date(c.start_time), selectedDate));
  }, [concerts, selectedDate]);

  const concertMarkers = useMemo<EventMarker[]>(() =>
    filtered.flatMap((concert) => {
      if (!concert.location) return [];
      try {
        const loc = JSON.parse(concert.location);
        if (!loc?.lat || !loc?.lng) return [];
        return [{
          id: concert.id, title: concert.title, start_time: concert.start_time,
          lat: loc.lat, lng: loc.lng, type: "concert" as const,
          artist: concert.artist, isInterested: myInterests.has(concert.id),
        }];
      } catch { return []; }
    }), [filtered, myInterests]);

  // ✅ Loading skeleton avec ton thème
  if (isLoading) return (
    <div className="space-y-3">
      <div className="h-52 bg-zik-card animate-pulse rounded-xl" />
      {[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-zik-card animate-pulse rounded-lg" />)}
    </div>
  );

  return (
    <div className="space-y-4">
      <EventMap markers={concertMarkers} currentUserId={currentUserId} emptyMessage="Aucun concert à venir 🎤" />
      <DayFilter selectedDate={selectedDate} onChange={setSelectedDate} availableDates={availableDates} />
      {filtered.length === 0 ? (
        
        <p className="text-zik-muted text-sm text-center py-6">Aucun concert à venir 🎤</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((concert) => (
            <ConcertCard
              key={concert.id}
              concert={concert}
              isInterested={myInterests.has(concert.id)}
              interestedCount={interestedMap[concert.id] ?? 0}
              isToggling={togglingId === concert.id}
              onToggleInterest={handleToggleInterest}
            />
          ))}
        </div>
      )}
    </div>
  );
}