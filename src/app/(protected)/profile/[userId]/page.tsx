// ============================================================
// app/(protected)/profile/[userId]/page.tsx  — Profil public
// ============================================================
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, MapPin, Music2, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ReportButton from '@/components/ReportButton';

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

export default function PublicProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDMLoading, setIsDMLoading] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id ?? null);

      // Redirige vers /profile si c'est son propre profil
      if (user?.id === userId) { router.replace('/profile'); return; }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, username, bio, city, instruments, avatar_url')
        .eq('id', userId)
        .single();
      setProfile(profileData);
      setIsLoading(false);
    };
    fetchAll();
  }, [userId]);

  const handleOpenDM = useCallback(async () => {
    if (!currentUserId) { router.push('/login'); return; }
    setIsDMLoading(true);
    const { data: existing } = await supabase
      .from('conversations')
      .select('id, conversation_participants!inner(user_id)')
      .eq('type', 'direct')
      .eq('conversation_participants.user_id', currentUserId);
    const dm = (existing ?? []).find((conv: any) =>
      conv.conversation_participants.some((p: any) => p.user_id === userId)
    );
    if (dm) { router.push(`/messages/${dm.id}`); return; }
    const { data: newConv } = await supabase
      .from('conversations').insert({ type: 'direct', title: null }).select('id').single();
    if (newConv) {
      await supabase.from('conversation_participants').insert([
        { conversation_id: newConv.id, user_id: currentUserId },
        { conversation_id: newConv.id, user_id: userId },
      ]);
      router.push(`/messages/${newConv.id}`);
    }
    setIsDMLoading(false);
  }, [currentUserId, userId, router]);

  if (isLoading) return (
    <div className="flex flex-col gap-4 p-4">
      <div className="h-8 w-24 bg-gray-100 animate-pulse rounded" />
      <div className="h-24 w-24 rounded-full bg-gray-100 animate-pulse mx-auto" />
      <div className="h-6 w-40 bg-gray-100 animate-pulse rounded mx-auto" />
      <div className="h-32 bg-gray-100 animate-pulse rounded-xl" />
    </div>
  );

  if (!profile) return (
    <div className="p-4 text-center text-gray-500">
      <p>Profil introuvable.</p>
      <Button variant="outline" className="mt-4" onClick={() => router.back()}>Retour</Button>
    </div>
  );

  const initials = profile.username ? profile.username.slice(0, 2).toUpperCase() : '?';
  const userInstruments = (profile.instruments ?? [])
    .map((key) => INSTRUMENTS.find((i) => i.key === key))
    .filter(Boolean) as typeof INSTRUMENTS;

  return (
    <div className="flex flex-col gap-5 p-4 max-w-lg mx-auto pb-24">
      {/* Retour */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors self-start"
      >
        <ArrowLeft className="h-4 w-4" /> Retour
      </button>

      {/* Avatar + infos */}
      <div className="flex flex-col items-center gap-3">
        {profile.avatar_url ? (
          <img src={profile.avatar_url} alt={profile.username ?? ''} className="h-24 w-24 rounded-full object-cover border-4 border-white shadow-md" />
        ) : (
          <div className="h-24 w-24 rounded-full bg-blue-500 flex items-center justify-center text-white text-2xl font-bold border-4 border-white shadow-md">
            {initials}
          </div>
        )}
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900">{profile.username ?? 'Musicien'}</h1>
          {profile.city && (
            <p className="text-sm text-gray-500 flex items-center justify-center gap-1 mt-0.5">
              <MapPin className="h-3.5 w-3.5" /> {profile.city}
            </p>
          )}
        </div>
      </div>

      {/* Bouton message */}
      {currentUserId && (
        <Button
          onClick={handleOpenDM}
          disabled={isDMLoading}
          className="bg-blue-600 hover:bg-blue-700 w-full"
        >
          <MessageCircle className="h-4 w-4 mr-2" />
          {isDMLoading ? 'Ouverture...' : 'Envoyer un message'}
        </Button>
      )}
<ReportButton targetType="user" targetId={userId} variant="text" />
      {/* Bio */}
      {profile.bio && (
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
          <p className="text-sm text-gray-700 leading-relaxed">{profile.bio}</p>
        </div>
      )}

      {/* Instruments */}
      {userInstruments.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
            <Music2 className="h-4 w-4 text-gray-400" /> Instruments
          </h2>
          <div className="flex flex-wrap gap-2">
            {userInstruments.map((inst) => (
              <span key={inst!.key}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-blue-50 text-blue-700 border border-blue-100">
                <span>{inst!.emoji}</span> {inst!.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}