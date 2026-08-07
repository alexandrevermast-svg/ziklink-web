import { createClient } from "@/lib/supabase/server";
import JamDetailClient from "./JamDetailClient";
import type { Participant, JamSlot, JamInstrument } from "./types";

export default async function JamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: jamData } = await supabase
    .from("jam_sessions")
    .select("*")
    .eq("id", id)
    .single();

  const { data: participantsData } = await supabase
    .from("jam_participants")
    .select("user_id, status, is_organizer, profile:profiles(id, username, avatar_url)")
    .eq("jam_id", id);
  const participants: Participant[] = (participantsData ?? []).map((p: any) => ({
    user_id: p.user_id, status: p.status ?? "confirmed",
    is_organizer: p.is_organizer ?? false, profile: p.profile ?? null,
  }));

  const { data: slotsData } = await supabase
    .from("jam_slots")
    .select("*, profile:profiles(id, username, avatar_url)")
    .eq("jam_id", id);
  const slots: JamSlot[] = (slotsData ?? []).map((s: any) => ({ ...s, profile: s.profile ?? null }));

  const { data: instrumentsData } = await supabase
    .from("jam_instruments")
    .select("*")
    .eq("jam_id", id)
    .order("position", { ascending: true });
  const instruments: JamInstrument[] = instrumentsData ?? [];

  return (
    <JamDetailClient
      jamId={id}
      initialJam={jamData}
      initialParticipants={participants}
      initialSlots={slots}
      initialInstruments={instruments}
    />
  );
}
