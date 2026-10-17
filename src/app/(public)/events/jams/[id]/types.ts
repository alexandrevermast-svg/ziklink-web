export interface Profile { id: string; username: string | null; avatar_url: string | null; display_name?: string | null; }

// Préfère le nom affiché (prénom / nom de scène) au pseudo pour les humains
// qui se croisent en vrai pendant une jam.
export function getDisplayName(profile?: Profile | null, fallback = "Inconnu"): string {
  return profile?.display_name?.trim() || profile?.username || fallback;
}
export function getInitials(profile?: Profile | null): string {
  const name = profile?.display_name?.trim() || profile?.username;
  return name ? name.slice(0, 2).toUpperCase() : "?";
}
export interface Participant { user_id: string; status: string; is_organizer: boolean; profile: Profile | null; }
export interface Message { id: string; user_id: string; content: string; created_at: string; profile: Profile | null; }
export interface JamSlot {
  id: string; jam_id: string; user_id: string | null;
  instrument: string; slot_index: number; song?: string | null; scale?: string | null; profile?: Profile | null;
  guest_name?: string | null;
}

export interface JamInstrument {
  id: string; jam_id: string; key: string; label: string; emoji: string; position: number;
}

const DIACRITICS_RE = new RegExp("[̀-ͯ]", "g");

export function slugifyInstrumentKey(label: string, existingKeys: string[]) {
  const base = label
    .normalize("NFD").replace(DIACRITICS_RE, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "instrument";
  if (!existingKeys.includes(base)) return base;
  let i = 2;
  while (existingKeys.includes(`${base}_${i}`)) i++;
  return `${base}_${i}`;
}

// Instruments par défaut appliqués à la création d'une jam — au-delà de ça, la
// liste devient éditable par jam via la table jam_instruments.
export const DEFAULT_INSTRUMENTS = [
  { key: "chant",    label: "Chant",    emoji: "🎤" },
  { key: "guitare",  label: "Guitare",  emoji: "🎸" },
  { key: "basse",    label: "Basse",    emoji: "🎵" },
  { key: "batterie", label: "Batterie", emoji: "🥁" },
  { key: "clavier",  label: "Clavier",  emoji: "🎹" },
  { key: "autres",   label: "Autres",   emoji: "🎶" },
] as const;

export const TRAILING_EMPTY_ROWS = 3;
