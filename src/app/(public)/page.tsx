"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { EventMarker } from "@/components/EventMap";

const EventMap = dynamic(() => import("@/components/EventMap"), {
  ssr: false,
  loading: () => <div className="h-52 bg-gray-100 animate-pulse rounded-xl" />,
});

interface JamSession {
  id: string; title: string; start_time: string; location: string;
  is_open: boolean; created_by: string;
}
interface Concert {
  id: string; title: string; artist: string | null; start_time: string; location: string;
}

function startOfDay(d: Date) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function getLatLng(location: string): { lat: number; lng: number } | null {
  try { const p = JSON.parse(location); return p?.lat && p?.lng ? { lat: p.lat, lng: p.lng } : null; }
  catch { return null; }
}

export default function HomePage() {
  const supabase = createClient();
  const router = useRouter();

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [jams, setJams] = useState<JamSession[]>([]);
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [participantsMap, setParticipantsMap] = useState<Record<string, string[]>>({});
  const [myInterests, setMyInterests] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const today = useMemo(() => startOfDay(new Date()), []);

  const fetchAll = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id ?? null);

    const todayEnd = new Date(today.getTime() + 86400000).toISOString();

    // Jams du jour — requête publique, pas besoin d'être connecté
    const { data: jamsData } = await supabase
      .from("jam_sessions").select("id, title, start_time, location, is_open, created_by")
      .gte("start_time", today.toISOString())
      .lt("start_time", todayEnd)
      .order("start_time", { ascending: true });
    setJams(jamsData ?? []);

    // Participants — uniquement si connecté et qu'il y a des jams
    if (user && jamsData && jamsData.length > 0) {
      const ids = jamsData.map((j) => j.id);
      const { data: partData } = await supabase
        .from("jam_participants").select("jam_id, user_id").in("jam_id", ids);
      const map: Record<string, string[]> = {};
      for (const p of partData ?? []) {
        if (!map[p.jam_id]) map[p.jam_id] = [];
        map[p.jam_id].push(p.user_id);
      }
      setParticipantsMap(map);
    }

    // Concerts du jour — requête publique
    const { data: concertsData } = await supabase
      .from("concerts").select("id, title, artist, start_time, location")
      .gte("start_time", today.toISOString())
      .lt("start_time", todayEnd)
      .order("start_time", { ascending: true });
    setConcerts(concertsData ?? []);

    // Intérêts — uniquement si connecté et qu'il y a des concerts
    if (user && concertsData && concertsData.length > 0) {
      const ids = concertsData.map((c) => c.id);
      const { data: intData } = await supabase
        .from("concert_interested").select("concert_id").eq("user_id", user.id).in("concert_id", ids);
      setMyInterests(new Set((intData ?? []).map((r) => r.concert_id)));
    }

    setIsLoading(false);
  }, [today]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleJoinJam = useCallback(async (jamId: string) => {
    if (!currentUserId) {
      router.push("/login");
      return;
    }
    await supabase.from("jam_participants").insert({ jam_id: jamId, user_id: currentUserId, status: "confirmed" });
    await fetchAll();
  }, [currentUserId, fetchAll]);

  const markers = useMemo<EventMarker[]>(() => {
    const jamMarkers: EventMarker[] = jams.flatMap((jam) => {
      const pos = getLatLng(jam.location);
      if (!pos) return [];
      return [{
        id: jam.id, title: jam.title, start_time: jam.start_time,
        lat: pos.lat, lng: pos.lng, type: "jam",
        is_open: jam.is_open,
        isParticipant: (participantsMap[jam.id] ?? []).includes(currentUserId ?? ""),
        isCreator: jam.created_by === currentUserId,
      }];
    });
    const concertMarkers: EventMarker[] = concerts.flatMap((concert) => {
      const pos = getLatLng(concert.location);
      if (!pos) return [];
      return [{
        id: concert.id, title: concert.title, start_time: concert.start_time,
        lat: pos.lat, lng: pos.lng, type: "concert",
        artist: concert.artist,
        isInterested: myInterests.has(concert.id),
      }];
    });
    return [...jamMarkers, ...concertMarkers];
  }, [jams, concerts, participantsMap, myInterests, currentUserId]);

  const totalToday = jams.length + concerts.length;

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Aujourd'hui</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isLoading ? "Chargement..." : totalToday === 0
              ? "Aucun événement prévu aujourd'hui"
              : `${jams.length} jam${jams.length > 1 ? "s" : ""} · ${concerts.length} concert${concerts.length > 1 ? "s" : ""}`
            }
          </p>
        </div>
        {/* Bouton connexion si non connecté */}
        {!isLoading && !currentUserId && (
          <button
            onClick={() => router.push("/login")}
            className="text-xs font-medium text-blue-600 border border-blue-200 px-3 py-1.5 rounded-full hover:bg-blue-50 transition-colors">
            Se connecter
          </button>
        )}
      </div>

      {/* Carte */}
      {isLoading ? (
        <div className="h-52 bg-gray-100 animate-pulse rounded-xl" />
      ) : (
        <EventMap
          markers={markers}
          onJoinJam={handleJoinJam}
          currentUserId={currentUserId}
          emptyMessage="Aucun événement aujourd'hui 📍"
          height="h-52"
        />
      )}

      {/* Liste rapide */}
      {!isLoading && totalToday > 0 && (
        <div className="space-y-2">
          {jams.map((jam) => (
            <div key={jam.id}
              onClick={() => router.push(`/events/jams/${jam.id}`)}
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-green-300 hover:bg-green-50/30 cursor-pointer transition-all active:scale-[0.99]">
              <span className="shrink-0 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-white shadow-sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{jam.title}</p>
                <p className="text-xs text-gray-500">
                  {new Date(jam.start_time).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <span className="text-xs text-green-600 font-medium shrink-0">Jam 🎸</span>
            </div>
          ))}
          {concerts.map((concert) => (
            <div key={concert.id}
              onClick={() => router.push(`/events/concerts/${concert.id}`)}
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-red-300 hover:bg-red-50/30 cursor-pointer transition-all active:scale-[0.99]">
              <span className="shrink-0 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-white shadow-sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{concert.title}</p>
                <p className="text-xs text-gray-500">
                  {concert.artist && <span className="text-blue-600 font-medium">{concert.artist} · </span>}
                  {new Date(concert.start_time).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <span className="text-xs text-red-500 font-medium shrink-0">Concert 🎤</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}