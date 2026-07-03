"use client";

import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MapPin, Clock, Ticket, Music2, Heart, ChevronDown } from "lucide-react";
import type { EventMarker } from "@/components/EventMap";

const EventMap = dynamic(() => import("@/components/EventMap"), {
  ssr: false,
  // ✅ Remplace bg-gray-100 par ta couleur de fond
  loading: () => <div className="h-52 bg-zik-card animate-pulse rounded-xl" />,
});

interface Concert {
  id: string; title: string; description: string | null;
  artist: string | null; genre: string | null;
  start_time: string; end_at: string | null; location: string;
  is_free: boolean; price: number | null; ticket_url: string | null;
  poster_url: string | null; created_by: string;
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
function formatDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
function formatTime(d: string) {
  return new Date(d).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}
function getAddress(s: string) { try { return JSON.parse(s)?.address ?? null; } catch { return null; } }

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
    const { data: concertsData } = await supabase
      .from("concerts").select("*").order("start_time", { ascending: true });
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
    if (!currentUserId || togglingId) return;
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
          {filtered.map((concert) => {
            const address = getAddress(concert.location);
            const isInterested = myInterests.has(concert.id);
            const interestedCount = interestedMap[concert.id] ?? 0;
            return (
              <div key={concert.id}
                onClick={() => router.push(`/events/concerts/${concert.id}`)}
                // ✅ Bordure avec ton thème
                className="rounded-lg border border-zik-border overflow-hidden hover:border-zik-purple/30 hover:shadow-sm transition-all cursor-pointer active:scale-[0.99]">
                <div className="flex">
                  {concert.poster_url ? (
                    <img src={concert.poster_url} alt={concert.title} className="w-24 shrink-0 object-cover self-stretch" />
                  ) : (
                    
                    <div className="w-24 shrink-0 bg-linear-to-br from-zik-purple/20 to-zik-indigo/20 flex items-center justify-center">
                      <Music2 className="h-8 w-8 text-zik-purple" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        {/* ✅ Titre et artiste avec ton thème */}
                        <h3 className="font-semibold text-zik-text truncate">{concert.title}</h3>
                        {concert.artist && <p className="text-sm text-zik-purple font-medium truncate">{concert.artist}</p>}
                      </div>
                      {concert.genre && (
                        <span className="shrink-0 text-[10px] font-medium bg-zik-purple/10 text-zik-purple px-2 py-0.5 rounded-full">
                          {concert.genre}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2 text-xs text-zik-muted">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(concert.start_time)} · {formatTime(concert.start_time)}
                        {concert.end_at && ` → ${formatTime(concert.end_at)}`}
                      </span>
                      {address && (
                        <span className="flex items-center gap-1 truncate max-w-45">
                          <MapPin className="h-3 w-3 shrink-0" />{address}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                        concert.is_free
                          ? "bg-zik-emerald/10 text-zik-emerald"
                          : "bg-zik-orange/10 text-zik-orange"
                      }`}>
                        <Ticket className="h-3 w-3" />
                        {concert.is_free ? "Gratuit" : concert.price ? `${concert.price} €` : "Payant"}
                      </span>
                      {currentUserId && (
                        <button
                          onClick={(e) => handleToggleInterest(concert.id, e)}
                          disabled={togglingId === concert.id}
                          className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-colors ${
                            isInterested
                              ? "bg-zik-red/10 border-zik-red/20 text-zik-red"
                              : "bg-zik-card border-zik-border text-zik-muted hover:border-zik-red/20 hover:text-zik-red"
                          }`}>
                          <Heart className={`h-3.5 w-3.5 ${isInterested ? "fill-zik-red" : ""}`} />
                          {interestedCount > 0 && <span>{interestedCount}</span>}
                          {isInterested ? "Intéressé" : "M'intéresse"}
                        </button>
                      )}
                    </div>
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