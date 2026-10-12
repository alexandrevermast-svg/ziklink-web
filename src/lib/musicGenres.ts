export const MUSIC_GENRES = [
  "Rock", "Jazz", "Blues", "Metal", "Pop", "Électro",
  "Folk", "Classique", "Hip-Hop", "Reggae", "Autre",
] as const;

export type MusicGenre = typeof MUSIC_GENRES[number];

// Une teinte par style — toutes choisies dans la même famille pastel-vive
// que la palette de l'app (zik-purple/indigo/emerald/orange/red), en évitant
// ces couleurs déjà réservées à des usages précis (sélection, succès, erreur).
export const GENRE_COLORS: Record<string, string> = {
  "Rock": "#FB7185",
  "Jazz": "#38BDF8",
  "Blues": "#60A5FA",
  "Metal": "#94A3B8",
  "Pop": "#F472B6",
  "Électro": "#22D3EE",
  "Folk": "#FBBF24",
  "Classique": "#A78BFA",
  "Hip-Hop": "#E879F9",
  "Reggae": "#A3E635",
  "Autre": "#9CA3AF",
};

export function genreColor(genre: string | null | undefined): string {
  if (!genre) return GENRE_COLORS.Autre;
  return GENRE_COLORS[genre] ?? GENRE_COLORS.Autre;
}
