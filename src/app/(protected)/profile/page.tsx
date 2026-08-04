'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Camera, MapPin, Music2, Save, Loader2,
  CalendarDays, ChevronRight, Users, Megaphone
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GroupAvatar } from '@/app/(protected)/groups/GroupAvatar';

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

interface MyGroup {
  id: string;
  name: string;
  avatar_url: string | null;
}

interface EventItem {
  id: string;
  type: 'jam' | 'concert';
  title: string;
  start_time: string;
}

interface MyAd {
  id: string;
  mode: string;
  title: string;
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
  const [groups, setGroups] = useState<MyGroup[]>([]);
  const [pastEvents, setPastEvents] = useState<EventItem[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<EventItem[]>([]);
  const [myAds, setMyAds] = useState<MyAd[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [saved, setSaved] = useState(false);

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

      const { data: groupMemberships } = await supabase
        .from('group_members')
        .select('groups(id, name, avatar_url)')
        .eq('user_id', user.id)
        .eq('status', 'confirmed');
      setGroups((groupMemberships ?? []).map((g: any) => g.groups).filter(Boolean));

      const { data: adsData } = await supabase
        .from('musician_ads')
        .select('id, mode, title')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });
      setMyAds(adsData ?? []);

      const { data: jamParts } = await supabase
        .from('jam_participants')
        .select('jam_sessions(id, title, start_time)')
        .eq('user_id', user.id)
        .eq('status', 'confirmed');
      const jamEvents: EventItem[] = (jamParts ?? [])
        .map((p: any) => p.jam_sessions)
        .filter(Boolean)
        .map((j: any) => ({ id: j.id, type: 'jam' as const, title: j.title, start_time: j.start_time }));

      const { data: concertInts } = await supabase
        .from('concert_interested')
        .select('concerts(id, title, start_time)')
        .eq('user_id', user.id);
      const concertEvents: EventItem[] = (concertInts ?? [])
        .map((c: any) => c.concerts)
        .filter(Boolean)
        .map((c: any) => ({ id: c.id, type: 'concert' as const, title: c.title, start_time: c.start_time }));

      const allEvents = [...jamEvents, ...concertEvents];
      const now = Date.now();
      setPastEvents(
        allEvents
          .filter((e) => new Date(e.start_time).getTime() < now)
          .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
          .slice(0, 2)
      );
      setUpcomingEvents(
        allEvents
          .filter((e) => new Date(e.start_time).getTime() >= now)
          .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
          .slice(0, 2)
      );
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
              ? <Loader2 className="h-4 w-4 animate-spin" style={{ color: 'rgba(255,255,255,0.64)' }} />
              : <Camera className="h-4 w-4" style={{ color: 'rgba(255,255,255,0.50)' }} />
            }
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
        </div>
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.56)' }}>
          Appuie sur l'icône pour changer ta photo
        </p>
      </div>

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
          <p className="text-xs text-right mt-1" style={{ color: 'rgba(255,255,255,0.52)' }}>
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
                    color: active ? '#C084FC' : 'rgba(255,255,255,0.64)',
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

      {/* Mes groupes */}
      {groups.length > 0 && (
        <div>
          <h2
            className="text-sm font-semibold mb-2 flex items-center gap-1.5"
            style={{ color: '#F1F0F6' }}
          >
            <Users size={15} style={{ color: '#C084FC' }} />
            Mes groupes ({groups.length})
          </h2>
          <div className="space-y-2">
            {groups.map((group) => (
              <button
                key={group.id}
                onClick={() => router.push(`/groups/${group.id}`)}
                className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-150"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(192,132,252,0.20)';
                  (e.currentTarget as HTMLElement).style.background = 'rgba(192,132,252,0.05)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)';
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)';
                }}
              >
                <GroupAvatar group={group} size="sm" />
                <p className="text-sm font-medium truncate flex-1 min-w-0" style={{ color: '#F1F0F6' }}>
                  {group.name}
                </p>
                <ChevronRight size={16} style={{ color: 'rgba(255,255,255,0.52)' }} className="shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Mes annonces */}
      {myAds.length > 0 && (
        <div>
          <h2
            className="text-sm font-semibold mb-2 flex items-center gap-1.5"
            style={{ color: '#F1F0F6' }}
          >
            <Megaphone size={15} style={{ color: '#C084FC' }} />
            Mes annonces ({myAds.length})
          </h2>
          <div className="space-y-2">
            {myAds.map((ad) => (
              <button
                key={ad.id}
                onClick={() => router.push(`/ads/${ad.id}`)}
                className="w-full flex items-center justify-between gap-3 p-3 rounded-xl text-left transition-all duration-150"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(192,132,252,0.20)';
                  (e.currentTarget as HTMLElement).style.background = 'rgba(192,132,252,0.05)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)';
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)';
                }}
              >
                <p className="text-sm font-medium truncate flex-1 min-w-0" style={{ color: '#F1F0F6' }}>
                  {ad.title}
                </p>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                  style={{
                    background: ad.mode === 'groupe' ? 'rgba(52,211,153,0.10)' : 'rgba(251,146,60,0.10)',
                    color: ad.mode === 'groupe' ? '#34D399' : '#FB923C',
                  }}>
                  {ad.mode === 'groupe' ? 'Groupes' : 'Musiciens'}
                </span>
                <ChevronRight size={16} style={{ color: 'rgba(255,255,255,0.52)' }} className="shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Prochains événements */}
      {upcomingEvents.length > 0 && (
        <div>
          <h2
            className="text-sm font-semibold mb-2 flex items-center gap-1.5"
            style={{ color: '#F1F0F6' }}
          >
            <CalendarDays size={15} style={{ color: '#C084FC' }} />
            Prochains événements
          </h2>
          <div className="space-y-2">
            {upcomingEvents.map((event) => (
              <button
                key={`${event.type}-${event.id}`}
                onClick={() => router.push(event.type === 'jam' ? `/events/jams/${event.id}` : `/events/concerts/${event.id}`)}
                className="w-full flex items-center justify-between gap-3 p-3 rounded-xl text-left transition-all duration-150"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
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
                  <span className="text-base shrink-0">{event.type === 'jam' ? '🎸' : '🎤'}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: '#F1F0F6' }}>
                      {event.title}
                    </p>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.60)' }}>
                      {formatDate(event.start_time)}
                    </p>
                  </div>
                </div>
                <ChevronRight size={16} style={{ color: 'rgba(255,255,255,0.52)' }} className="shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Événements passés */}
      {pastEvents.length > 0 && (
        <div>
          <h2
            className="text-sm font-semibold mb-2 flex items-center gap-1.5"
            style={{ color: '#F1F0F6' }}
          >
            <CalendarDays size={15} style={{ color: 'rgba(255,255,255,0.60)' }} />
            Événements passés
          </h2>
          <div className="space-y-2">
            {pastEvents.map((event) => (
              <button
                key={`${event.type}-${event.id}`}
                onClick={() => router.push(event.type === 'jam' ? `/events/jams/${event.id}` : `/events/concerts/${event.id}`)}
                className="w-full flex items-center justify-between gap-3 p-3 rounded-xl text-left transition-all duration-150"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
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
                  <span className="text-base shrink-0">{event.type === 'jam' ? '🎸' : '🎤'}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: '#F1F0F6' }}>
                      {event.title}
                    </p>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.60)' }}>
                      {formatDate(event.start_time)}
                    </p>
                  </div>
                </div>
                <ChevronRight size={16} style={{ color: 'rgba(255,255,255,0.52)' }} className="shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}