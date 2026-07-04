'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Camera, MapPin, Music2, Save, Loader2,
  CalendarDays, ChevronRight, Users, Search
} from 'lucide-react';
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
  looking_for_group: boolean;
}

interface JamSession {
  id: string;
  title: string;
  start_time: string;
  created_by: string;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric'
  });
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

  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [instruments, setInstruments] = useState<string[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [lookingForGroup, setLookingForGroup] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, username, bio, city, instruments, avatar_url, looking_for_group')
        .eq('id', user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
        setUsername(profileData.username ?? '');
        setBio(profileData.bio ?? '');
        setCity(profileData.city ?? '');
        setInstruments(profileData.instruments ?? []);
        setAvatarUrl(profileData.avatar_url ?? null);
        setLookingForGroup(profileData.looking_for_group ?? false);
      }

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
      looking_for_group: lookingForGroup,
    }).eq('id', profile.id);
    setIsSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

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
              className="h-24 w-24 rounded-full object-cover"
              style={{ border: '3px solid rgba(192,132,252,0.30)', boxShadow: '0 0 0 3px rgba(14,11,22,1)' }}
            />
          ) : (
            <div
              className="h-24 w-24 rounded-full flex items-center justify-center text-white text-2xl font-bold"
              style={{
                background: 'linear-gradient(135deg, #C084FC, #818CF8)',
                border: '3px solid rgba(192,132,252,0.30)',
                boxShadow: '0 0 0 3px rgba(14,11,22,1)',
              }}
            >
              {initials}
            </div>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingAvatar}
            className="absolute bottom-0 right-0 h-8 w-8 rounded-full flex items-center justify-center transition-colors"
            style={{ background: '#1A1628', border: '1px solid rgba(255,255,255,0.10)' }}
          >
            {isUploadingAvatar
              ? <Loader2 className="h-4 w-4 animate-spin" style={{ color: 'rgba(255,255,255,0.40)' }} />
              : <Camera className="h-4 w-4" style={{ color: 'rgba(255,255,255,0.50)' }} />
            }
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
        </div>
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.30)' }}>
          Appuie sur l'icône pour changer ta photo
        </p>
      </div>

      {/* Toggle "Je cherche un groupe" */}
      <button
        type="button"
        onClick={() => setLookingForGroup((prev) => !prev)}
        className="flex items-center justify-between p-4 rounded-xl transition-all duration-200"
        style={{
          background: lookingForGroup
            ? 'rgba(192,132,252,0.10)'
            : 'rgba(255,255,255,0.04)',
          border: '1px solid',
          borderColor: lookingForGroup
            ? 'rgba(192,132,252,0.30)'
            : 'rgba(255,255,255,0.07)',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="h-9 w-9 rounded-full flex items-center justify-center shrink-0"
            style={{
              background: lookingForGroup
                ? 'rgba(192,132,252,0.15)'
                : 'rgba(255,255,255,0.06)',
            }}
          >
            <Search
              size={16}
              style={{ color: lookingForGroup ? '#C084FC' : 'rgba(255,255,255,0.35)' }}
            />
          </div>
          <div className="text-left">
            <p
              className="text-sm font-medium"
              style={{ color: lookingForGroup ? '#F1F0F6' : 'rgba(255,255,255,0.55)' }}
            >
              Je cherche un groupe
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.30)' }}>
              {lookingForGroup
                ? 'Visible par les groupes qui cherchent des membres'
                : 'Activez pour être trouvé par des groupes'}
            </p>
          </div>
        </div>

        {/* Toggle pill */}
        <div
          className="relative shrink-0 transition-all duration-200"
          style={{
            width: 44,
            height: 24,
            borderRadius: 12,
            background: lookingForGroup
              ? 'linear-gradient(135deg, #C084FC, #818CF8)'
              : 'rgba(255,255,255,0.10)',
          }}
        >
          <div
            className="absolute top-1 transition-all duration-200 rounded-full bg-white"
            style={{
              width: 16,
              height: 16,
              left: lookingForGroup ? 24 : 4,
              boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
            }}
          />
        </div>
      </button>

      {/* Champs */}
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-1.5 block" style={{ color: 'rgba(255,255,255,0.70)' }}>
            Nom d'utilisateur
          </label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Ton pseudo"
            className="zik-input"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block" style={{ color: 'rgba(255,255,255,0.70)' }}>
            Bio
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Parle de toi, de ta musique..."
            rows={3}
            maxLength={280}
            className="zik-input resize-none"
            style={{ borderRadius: 10 }}
          />
          <p className="text-xs text-right mt-1" style={{ color: 'rgba(255,255,255,0.25)' }}>
            {bio.length}/280
          </p>
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 flex items-center gap-1.5" style={{ color: 'rgba(255,255,255,0.70)' }}>
            <MapPin size={14} style={{ color: '#C084FC' }} /> Ville
          </label>
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Ex: Paris, Lyon, Strasbourg..."
            className="zik-input"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 flex items-center gap-1.5" style={{ color: 'rgba(255,255,255,0.70)' }}>
            <Music2 size={14} style={{ color: '#C084FC' }} /> Instruments
          </label>
          <div className="flex flex-wrap gap-2">
            {INSTRUMENTS.map((inst) => {
              const active = instruments.includes(inst.key);
              return (
                <button
                  key={inst.key}
                  type="button"
                  onClick={() => toggleInstrument(inst.key)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-150"
                  style={{
                    background: active ? 'rgba(192,132,252,0.15)' : 'rgba(255,255,255,0.05)',
                    border: '1px solid',
                    borderColor: active ? 'rgba(192,132,252,0.40)' : 'rgba(255,255,255,0.08)',
                    color: active ? '#C084FC' : 'rgba(255,255,255,0.40)',
                  }}
                >
                  <span>{inst.emoji}</span> {inst.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bouton sauvegarder */}
      <button
        onClick={handleSave}
        disabled={isSaving}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-sm transition-all duration-150"
        style={{
          background: saved
            ? 'rgba(52,211,153,0.15)'
            : 'linear-gradient(135deg, #C084FC, #818CF8)',
          color: saved ? '#34D399' : '#fff',
          border: saved ? '1px solid rgba(52,211,153,0.30)' : 'none',
          opacity: isSaving ? 0.7 : 1,
        }}
      >
        {isSaving
          ? <><Loader2 size={16} className="animate-spin" /> Enregistrement...</>
          : saved
          ? '✓ Enregistré !'
          : <><Save size={16} /> Enregistrer</>
        }
      </button>

      {/* Historique jams */}
      {jams.length > 0 && (
        <div>
          <h2
            className="text-sm font-semibold mb-2 flex items-center gap-1.5"
            style={{ color: '#F1F0F6' }}
          >
            <CalendarDays size={15} style={{ color: '#C084FC' }} />
            Mes jams ({jams.length})
          </h2>
          <div className="space-y-2">
            {jams.slice(0, 5).map((jam) => (
              <button
                key={jam.id}
                onClick={() => router.push(`/events/jams/${jam.id}`)}
                className="w-full flex items-center justify-between gap-3 p-3 rounded-xl text-left transition-all duration-150"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(192,132,252,0.20)';
                  (e.currentTarget as HTMLElement).style.background = 'rgba(192,132,252,0.05)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)';
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)';
                }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-base shrink-0">🎸</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: '#F1F0F6' }}>
                      {jam.title}
                    </p>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      {formatDate(jam.start_time)}
                    </p>
                  </div>
                </div>
                <ChevronRight size={16} style={{ color: 'rgba(255,255,255,0.25)' }} className="shrink-0" />
              </button>
            ))}
            {jams.length > 5 && (
              <p className="text-xs text-center pt-1" style={{ color: 'rgba(255,255,255,0.25)' }}>
                + {jams.length - 5} autres
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}