import { createClient } from "@/lib/supabase/server";
import moment from "moment-timezone";
import HomeFeed from "./HomeFeed";
import type { JamSession as JamSessionRow, Concert as ConcertRow, Profile, Group } from "@/types";

export type JamSession = Pick<JamSessionRow, "id" | "title" | "description" | "start_time" | "end_at" | "location" | "is_open" | "created_by" | "has_drums" | "has_keyboard" | "genres" | "poster_url">;
export type Concert = Pick<ConcertRow, "id" | "title" | "artist" | "start_time" | "end_at" | "location" | "genres" | "is_free" | "price" | "poster_url">;
export interface ParticipantWithProfile {
  user_id: string;
  profile: Pick<Profile, "id" | "username" | "avatar_url"> | null;
  status: string;
  is_organizer: boolean;
}
export interface RecruitingAd {
  id: string;
  title: string;
  instrument: string | null;
  groups: Pick<Group, "id" | "name" | "avatar_url" | "city" | "genre"> | null;
}
export type MusicianAd = { id: string; title: string; instrument: string | null; city: string | null; genres: string[] };
export type LatestMusician = Pick<Profile, "id" | "username" | "display_name" | "avatar_url" | "city" | "instruments">;

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
    .select("id, title, description, start_time, end_at, location, is_open, created_by, has_drums, has_keyboard, genres, poster_url")
    .or(`end_at.gte.${now.toISOString()},start_time.gte.${today.toISOString()}`)
    .lt("start_time", dayAfterTomorrow.toISOString())
    .order("start_time", { ascending: true });
  const jams: JamSession[] = jamsData ?? [];

  const participantsMap: Record<string, ParticipantWithProfile[]> = {};
  if (jams.length > 0) {
    const ids = jams.map((j) => j.id);
    const { data: partData } = await supabase
      .from("jam_participants")
      .select("jam_id, user_id, status, is_organizer, profile:profiles(id, username, avatar_url)")
      .in("jam_id", ids);
    for (const p of (partData ?? []) as any[]) {
      if (!participantsMap[p.jam_id]) participantsMap[p.jam_id] = [];
      participantsMap[p.jam_id].push({ user_id: p.user_id, profile: p.profile ?? null, status: p.status, is_organizer: !!p.is_organizer });
    }
  }

  const { data: concertsData } = await supabase
    .from("concerts")
    .select("id, title, artist, start_time, end_at, location, genres, is_free, price, poster_url")
    .gte("start_time", twoHoursAgo)
    .lt("start_time", dayAfterTomorrow.toISOString())
    .order("start_time", { ascending: true });
  const concerts: Concert[] = concertsData ?? [];

  let myInterests: string[] = [];
  if (concerts.length > 0) {
    const ids = concerts.map((c) => c.id);
    const { data: intData } = await supabase
      .from("concert_interested").select("concert_id, user_id")
      .in("concert_id", ids);
    for (const row of intData ?? []) {
      if (user && row.user_id === user.id) myInterests.push(row.concert_id);
    }
  }

  // Groupes qui recrutent — annonces "mode: groupe" du babillard musicien_ads.
  const { data: recruitingAdsData } = await supabase
    .from("musician_ads")
    .select("id, title, instrument, groups(id, name, avatar_url, city, genre)")
    .eq("mode", "groupe")
    .order("created_at", { ascending: false })
    .limit(6);
  const recruitingAds: RecruitingAd[] = (recruitingAdsData ?? []) as any;

  // Annonces de musiciens — même babillard, "mode: musicien".
  const { data: musicianAdsData } = await supabase
    .from("musician_ads")
    .select("id, title, instrument, city, genres")
    .eq("mode", "musicien")
    .order("created_at", { ascending: false })
    .limit(6);
  const musicianAds: MusicianAd[] = musicianAdsData ?? [];

  // Dernier musicien inscrit (profil complété) — nécessite la colonne
  // profiles.created_at (voir migration fournie séparément).
  let latestMusician: LatestMusician | null = null;
  const { data: latestMusicianData } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, city, instruments")
    .eq("onboarding_completed", true)
    .order("created_at", { ascending: false })
    .limit(1);
  if (latestMusicianData && latestMusicianData.length > 0) {
    latestMusician = latestMusicianData[0];
  }

  return (
    <HomeFeed
      currentUserId={user?.id ?? null}
      initialJams={jams}
      initialConcerts={concerts}
      initialParticipantsMap={participantsMap}
      initialMyInterests={myInterests}
      initialRecruitingAds={recruitingAds}
      initialMusicianAds={musicianAds}
      initialLatestMusician={latestMusician}
    />
  );
}
