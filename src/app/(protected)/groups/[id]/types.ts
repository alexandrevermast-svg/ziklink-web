export interface Profile {
  id: string;
  username: string | null;
  avatar_url: string | null;
  city: string | null;
  instruments: string[] | null;
  looking_for_group: boolean;
}
export interface GroupMember {
  user_id: string;
  role: string;
  status: string;
  instrument: string | null;
  profile: Profile | null;
}
export interface Message {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  profile: Profile | null;
}

export const GENRES = ['Rock', 'Jazz', 'Blues', 'Metal', 'Pop', 'Électro', 'Folk', 'Classique', 'Hip-Hop', 'Reggae', 'Autre'];

export const INSTRUMENTS = [
  { key: 'chant', label: 'Chant', emoji: '🎤' },
  { key: 'guitare', label: 'Guitare', emoji: '🎸' },
  { key: 'basse', label: 'Basse', emoji: '🎵' },
  { key: 'batterie', label: 'Batterie', emoji: '🥁' },
  { key: 'clavier', label: 'Clavier', emoji: '🎹' },
  { key: 'autres', label: 'Autres', emoji: '🎶' },
];
