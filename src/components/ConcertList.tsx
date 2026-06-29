"use client";

import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MapPin, Clock, Ticket, Music2, Heart, ChevronDown } from "lucide-react";
import type { EventMarker } from "@/components/EventMap";

const EventMap = dynamic(() => import("@/components/EventMap"), {
  ssr: false,
  loading: () => <div className="h-52 bg-gray-100 animate-pulse rounded-xl" />,
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
      <button
        onClick={() => onChange(null)}
        className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
          selectedDate === null ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
        }`}
      >
        Tout
      </button>

      {visibleDays.map((day) => {
        const hasEvent = availableDates.some((d) => isSameDay(d, day));
        const isSelected = selectedDate !== null && isSameDay(selectedDate, day);
        return (
          <button
            key={day.toISOString()}
            onClick={() => onChange(isSelected ? null : day)}
            className={`flex-1 min-w-0 py-1.5 rounded-full text-xs font-medium transition-colors relative text-center ${
              isSelected
                ? "bg-blue-600 text-white"
                : hasEvent
                ? "bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
                : "bg-gray-100 text-gray-400 hover:bg-gray-200"
            }`}
          >
            <span className="truncate block px-1">{formatDayLabel(day)}</span>
            {hasEvent && !isSelected && (
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-red-500 rounded-full border border-white" />
            )}
          </button>
        );
      })}

      <div className="relative shrink-0" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen((v) => !v)}
          className={`flex items-center gap-0.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
            selectedIsInMore
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
          }`}
        >
          {selectedIsInMore ? formatDayLabel(selectedDate!) : "···"}
          <ChevronDown className={`h-3 w-3 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
        </button>

        {dropdownOpen && (
          <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-xl shadow-lg border border-gray-100 py-1 min-w-40 max-h-64 overflow-y-auto">
            {moreDays.map((day) => {
              const hasEvent = availableDates.some((d) => isSameDay(d, day));
              const isSelected = selectedDate !== null && isSameDay(selectedDate, day);
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => { onChange(isSelected ? null : day); setDropdownOpen(false); }}
                  className={`w-full text-left px-4 py-2 text-xs flex items-center justify-between gap-2 hover:bg-gray-50 transition-colors ${
                    isSelected ? "text-blue-600 font-semibold bg-blue-50" : "text-gray-700"
                  }`}
                >
                  <span>{formatDayLabelLong(day)}</span>
                  {hasEvent && <span className="h-2 w-2 rounded-full bg-red-500 shrink-0" />}
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

  if (isLoading) return (
    <div className="space-y-3">
      <div className="h-52 bg-gray-100 animate-pulse rounded-xl" />
      {[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-gray-100 animate-pulse rounded-lg" />)}
    </div>
  );

  return (
    <div className="space-y-4">
      <EventMap markers={concertMarkers} currentUserId={currentUserId} emptyMessage="Aucun concert à venir 🎤" />
      <DayFilter selectedDate={selectedDate} onChange={setSelectedDate} availableDates={availableDates} />
      {filtered.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-6">Aucun concert à venir 🎤</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((concert) => {
            const address = getAddress(concert.location);
            const isInterested = myInterests.has(concert.id);
            const interestedCount = interestedMap[concert.id] ?? 0;
            return (
              <div key={concert.id}
                onClick={() => router.push(`/events/concerts/${concert.id}`)}
                className="rounded-lg border border-gray-200 overflow-hidden hover:border-red-200 hover:shadow-sm transition-all cursor-pointer active:scale-[0.99]">
                <div className="flex">
                  {concert.poster_url ? (
                    <img src={concert.poster_url} alt={concert.title} className="w-24 shrink-0 object-cover self-stretch" />
                  ) : (
                    <div className="w-24 shrink-0 bg-linear-to-br from-red-50 to-purple-100 flex items-center justify-center">
                      <Music2 className="h-8 w-8 text-red-300" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{concert.title}</h3>
                        {concert.artist && <p className="text-sm text-blue-600 font-medium truncate">{concert.artist}</p>}
                      </div>
                      {concert.genre && (
                        <span className="shrink-0 text-[10px] font-medium bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                          {concert.genre}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2 text-xs text-gray-500">
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
                        concert.is_free ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                        <Ticket className="h-3 w-3" />
                        {concert.is_free ? "Gratuit" : concert.price ? `${concert.price} €` : "Payant"}
                      </span>
                      {currentUserId && (
                        <button
                          onClick={(e) => handleToggleInterest(concert.id, e)}
                          disabled={togglingId === concert.id}
                          className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-colors ${
                            isInterested
                              ? "bg-red-50 border-red-200 text-red-500"
                              : "bg-gray-50 border-gray-200 text-gray-400 hover:border-red-200 hover:text-red-400"
                          }`}>
                          <Heart className={`h-3.5 w-3.5 ${isInterested ? "fill-red-500" : ""}`} />
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