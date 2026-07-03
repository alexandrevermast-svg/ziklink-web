// ============================================================
// app/(protected)/profile/page.tsx  — Mon propre profil (éditable)
// ============================================================
'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Camera, MapPin, Music2, Save, Loader2, CalendarDays, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const INSTRUMENTS = [
  { key: 'chant',    label: 'Chant',    emoji: '🎤' },
  { key: 'guitare',  label: 'Guitare',  emoji: '🎸' },
  { key: 'basse',    label: 'Basse',    emoji: '🎵' },
  { key: 'batterie', label: 'Batterie', emoji: '🥁' },
  { key: 'clavier',  label: 'Clavier',  emoji: '🎹' },
  { key: 'autres',   label: 'Autres',   emoji: '🎶' },
];

interface Profile {
  id: string;
  username: string | null;
  bio: string | null;
  city: string | null;
  instruments: string[] | null;
  avatar_url: string | null;
}

interface JamSession {
  id: string;
  title: string;
  start_time: string;
  created_by: string;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function MyProfilePage() {
  const supabase = createClient();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [jams, setJams] = useState<JamSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [saved, setSaved] = useState(false);

  // Champs éditables
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [instruments, setInstruments] = useState<string[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchAll = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, username, bio, city, instruments, avatar_url')
        .eq('id', user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
        setUsername(profileData.username ?? '');
        setBio(profileData.bio ?? '');
        setCity(profileData.city ?? '');
        setInstruments(profileData.instruments ?? []);
        setAvatarUrl(profileData.avatar_url ?? null);
      }

      // Jams participées ou organisées
      const { data: participations } = await supabase
        .from('jam_participants')
        .select('jam_id, jam_sessions(id, title, start_time, created_by)')
        .eq('user_id', user.id)
        .eq('status', 'confirmed');

      const jamList: JamSession[] = (participations ?? [])
        .map((p: any) => p.jam_sessions)
        .filter(Boolean)
        .sort((a: JamSession, b: JamSession) =>
          new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
        );
      setJams(jamList);
      setIsLoading(false);
    };
    fetchAll();
  }, []);

  const toggleInstrument = (key: string) => {
    setInstruments((prev) =>
      prev.includes(key) ? prev.filter((i) => i !== key) : [...prev, key]
    );
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    setIsUploadingAvatar(true);
    const ext = file.name.split('.').pop();
    const path = `avatars/${profile.id}/avatar.${ext}`;
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (!error) {
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      const url = `${urlData.publicUrl}?t=${Date.now()}`;
      setAvatarUrl(url);
      await supabase.from('profiles').update({ avatar_url: url }).eq('id', profile.id);
    }
    setIsUploadingAvatar(false);
  };

  const handleSave = async () => {
    if (!profile) return;
    setIsSaving(true);
    await supabase.from('profiles').update({
      username: username.trim() || null,
      bio: bio.trim() || null,
      city: city.trim() || null,
      instruments,
    }).eq('id', profile.id);
    setIsSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // ✅ Loading skeleton avec ton thème
  if (isLoading) return (
    <div className="flex flex-col gap-4 p-4">
      <div className="h-24 w-24 rounded-full bg-zik-card animate-pulse mx-auto" />
      <div className="h-6 w-40 bg-zik-card animate-pulse rounded mx-auto" />
      <div className="h-32 bg-zik-card animate-pulse rounded-xl" />
    </div>
  );

  const initials = username ? username.slice(0, 2).toUpperCase() : '?';

  return (
    <div className="flex flex-col gap-5 p-4 max-w-lg mx-auto pb-24">
      {/* Avatar */}
      <div className="flex flex-col items-center gap-3 pt-4">
        <div className="relative">
          {avatarUrl ? (
            <img src={avatarUrl} alt={username}
              className="h-24 w-24 rounded-full object-cover border-4 border-zik-bg shadow-md" />
          ) : (
            <div className="h-24 w-24 rounded-full bg-linear-to-br from-zik-purple to-zik-indigo flex items-center justify-center text-white text-2xl font-bold border-4 border-zik-bg shadow-md">
              {initials}
            </div>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingAvatar}
            className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-zik-card border border-zik-border shadow flex items-center justify-center hover:bg-zik-card-hover transition-colors"
          >
            {isUploadingAvatar
              ? <Loader2 className="h-4 w-4 animate-spin text-zik-muted" />
              : <Camera className="h-4 w-4 text-zik-muted" />
            }
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
        </div>
        <p className="text-xs text-zik-muted">Appuie sur l'icône pour changer ta photo</p>
      </div>

      {/* Champs */}
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-zik-text mb-1 block">Nom d'utilisateur</label>
          <Input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Ton pseudo"
            className="bg-zik-card border-zik-border text-zik-text placeholder:text-zik-muted focus:ring-zik-purple/50"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-zik-text mb-1 block">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Parle de toi, de ta musique..."
            rows={3}
            maxLength={280}
            className="w-full border-zik-border rounded-lg px-3 py-2 text-sm resize-none outline-none bg-zik-card text-zik-text placeholder:text-zik-muted focus:ring-2 focus:ring-zik-purple/50 transition-all"
          />
          <p className="text-xs text-zik-muted text-right mt-0.5">{bio.length}/280</p>
        </div>

        <div>
          <label className="text-sm font-medium text-zik-text mb-1 flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-zik-purple" /> Ville
          </label>
          <Input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Ex: Paris, Lyon, Strasbourg..."
            className="bg-zik-card border-zik-border text-zik-text placeholder:text-zik-muted focus:ring-zik-purple/50"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-zik-text mb-2 flex items-center gap-1.5">
            <Music2 className="h-3.5 w-3.5 text-zik-purple" /> Instruments
          </label>
          <div className="flex flex-wrap gap-2">
            {INSTRUMENTS.map((inst) => {
              const active = instruments.includes(inst.key);
              return (
                <button
                  key={inst.key}
                  type="button"
                  onClick={() => toggleInstrument(inst.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                    active
                      ? 'bg-zik-purple text-white border-zik-purple'
                      : 'bg-zik-card text-zik-muted border-zik-border hover:border-zik-purple hover:text-zik-purple'
                  }`}
                >
                  <span>{inst.emoji}</span> {inst.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bouton sauvegarder */}
      <Button
        onClick={handleSave}
        disabled={isSaving}
        className={`w-full transition-all ${
          saved
            ? 'bg-zik-emerald hover:bg-zik-emerald/80'
            : 'bg-zik-purple hover:bg-zik-indigo'
        }`}
      >
        {isSaving
          ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enregistrement...</>
          : saved
          ? '✓ Enregistré !'
          : <><Save className="h-4 w-4 mr-2" /> Enregistrer</>
        }
      </Button>

      {/* Historique jams */}
      {jams.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-zik-text mb-2 flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4 text-zik-purple" /> Mes jams ({jams.length})
          </h2>
          <div className="space-y-2">
            {jams.slice(0, 5).map((jam) => (
              <button
                key={jam.id}
                onClick={() => router.push(`/events/jams/${jam.id}`)}
                className="w-full flex items-center justify-between gap-3 p-3 rounded-lg border border-zik-border bg-zik-card/50 hover:border-zik-purple/30 hover:bg-zik-purple/5 transition-all text-left"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-base shrink-0">🎸</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zik-text truncate">{jam.title}</p>
                    <p className="text-xs text-zik-muted">{formatDate(jam.start_time)}</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-zik-muted shrink-0" />
              </button>
            ))}
            {jams.length > 5 && (
              <p className="text-xs text-center text-zik-muted pt-1">+ {jams.length - 5} autres</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}