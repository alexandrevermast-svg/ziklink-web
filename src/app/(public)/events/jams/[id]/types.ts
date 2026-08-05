export interface Profile { id: string; username: string | null; avatar_url: string | null; }
export interface Participant { user_id: string; status: string; is_organizer: boolean; profile: Profile | null; }
export interface Message { id: string; user_id: string; content: string; created_at: string; profile: Profile | null; }
export interface JamSlot {
  id: string; jam_id: string; user_id: string | null;
  instrument: string; slot_index: number; song?: string | null; scale?: string | null; profile?: Profile | null;
  guest_name?: string | null;
}

export const INSTRUMENTS = [
  { key: "chant",    label: "Chant",    emoji: "🎤" },
  { key: "guitare",  label: "Guitare",  emoji: "🎸" },
  { key: "basse",    label: "Basse",    emoji: "🎵" },
  { key: "batterie", label: "Batterie", emoji: "🥁" },
  { key: "clavier",  label: "Clavier",  emoji: "🎹" },
  { key: "autres",   label: "Autres",   emoji: "🎶" },
] as const;

export const TRAILING_EMPTY_ROWS = 3;
