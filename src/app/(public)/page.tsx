import { createClient } from "@/lib/supabase/server";
import moment from "moment-timezone";
import HomeFeed from "./HomeFeed";
import type { JamSession as JamSessionRow, Concert as ConcertRow, Profile } from "@/types";

export type JamSession = Pick<JamSessionRow, "id" | "title" | "description" | "start_time" | "end_at" | "location" | "is_open" | "created_by" | "has_drums" | "has_keyboard">;
export type Concert = Pick<ConcertRow, "id" | "title" | "artist" | "start_time" | "end_at" | "location" | "genre" | "is_free" | "price" | "poster_url">;
export interface ParticipantWithProfile {
  user_id: string;
  profile: Pick<Profile, "id" | "username" | "avatar_url"> | null;
}

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Bornes de jours calées sur Europe/Paris (pas le fuseau du serveur ni celui du navigateur).
  const today = moment.tz("Europe/Paris").startOf("day");
  const dayAfterTomorrow = today.clone().add(2, "day");
  const now = moment.tz("Europe/Paris");
  const twoHoursAgo = now.clone().subtract(2, "hours").toISOString();

  const { data: jamsData } = await supabase
    .from("jam_sessions")
    .select("id, title, description, start_time, end_at, location, is_open, created_by, has_drums, has_keyboard")
    .or(`end_at.gte.${now.toISOString()},and(end_at.is.null,start_time.gte.${twoHoursAgo})`)
    .lt("start_time", dayAfterTomorrow.toISOString())
    .order("start_time", { ascending: true });
  const jams: JamSession[] = jamsData ?? [];

  const participantsMap: Record<string, ParticipantWithProfile[]> = {};
  if (jams.length > 0) {
    const ids = jams.map((j) => j.id);
    const { data: partData } = await supabase
      .from("jam_participants")
      .select("jam_id, user_id, profile:profiles(id, username, avatar_url)")
      .in("jam_id", ids);
    for (const p of (partData ?? []) as any[]) {
      if (!participantsMap[p.jam_id]) participantsMap[p.jam_id] = [];
      participantsMap[p.jam_id].push({ user_id: p.user_id, profile: p.profile ?? null });
    }
  }

  const { data: concertsData } = await supabase
    .from("concerts")
    .select("id, title, artist, start_time, end_at, location, genre, is_free, price, poster_url")
    .gte("start_time", twoHoursAgo)
    .lt("start_time", dayAfterTomorrow.toISOString())
    .order("start_time", { ascending: true });
  const concerts: Concert[] = concertsData ?? [];

  let myInterests: string[] = [];
  const concertInterestCounts: Record<string, number> = {};
  if (concerts.length > 0) {
    const ids = concerts.map((c) => c.id);
    const { data: intData } = await supabase
      .from("concert_interested").select("concert_id, user_id")
      .in("concert_id", ids);
    for (const row of intData ?? []) {
      concertInterestCounts[row.concert_id] = (concertInterestCounts[row.concert_id] ?? 0) + 1;
      if (user && row.user_id === user.id) myInterests.push(row.concert_id);
    }
  }

  let myJamInterests: string[] = [];
  if (user && jams.length > 0) {
    const ids = jams.map((j) => j.id);
    const { data: jamIntData } = await supabase
      .from("jam_interested").select("jam_id")
      .eq("user_id", user.id).in("jam_id", ids);
    myJamInterests = (jamIntData ?? []).map((r) => r.jam_id);
  }

  return (
    <HomeFeed
      currentUserId={user?.id ?? null}
      initialJams={jams}
      initialConcerts={concerts}
      initialParticipantsMap={participantsMap}
      initialMyInterests={myInterests}
      initialMyJamInterests={myJamInterests}
      initialConcertInterestCounts={concertInterestCounts}
    />
  );
}
