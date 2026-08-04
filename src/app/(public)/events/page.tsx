import { createClient } from "@/lib/supabase/server";
import moment from "moment-timezone";
import EventsTab from "@/components/EventsTab";
import type { JamSession, Concert, Profile } from "@/types";

export interface ParticipantWithProfile {
  user_id: string;
  profile: Pick<Profile, "id" | "username" | "avatar_url"> | null;
}

export default async function EventsPage() {
  const supabase = await createClient();

  // Bornes calées sur Europe/Paris, cohérent avec la page d'accueil.
  const now = moment.tz("Europe/Paris");
  const startOfToday = now.clone().startOf("day").toISOString();

  const { data: jamsData } = await supabase
    .from("jam_sessions")
    .select("*")
    .or(`end_at.gte.${now.toISOString()},start_time.gte.${startOfToday}`)
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
    .select("*")
    .or(`end_at.gte.${now.toISOString()},start_time.gte.${startOfToday}`)
    .order("start_time", { ascending: true });
  const concerts: Concert[] = concertsData ?? [];

  return (
    <div>
      <EventsTab
        initialJams={jams}
        initialParticipantsMap={participantsMap}
        initialConcerts={concerts}
      />
    </div>
  );
}
