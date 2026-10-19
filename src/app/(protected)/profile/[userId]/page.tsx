'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  ArrowLeft, MapPin, Music2, MessageCircle,
  Users, ChevronDown, Check, Loader2, Link2, CalendarDays, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import ReportButton from '@/components/ReportButton';
import { Linkify } from '@/components/Linkify';
import { parseProfileLinks } from '@/lib/profileLinks';
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
  links: unknown;
}

interface MyGroup {
  id: string;
  name: string;
}

interface ProfileGroup {
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

type InviteStatus = 'idle' | 'loading' | 'success' | 'already_member' | 'error';

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric'
  });
}

export default function PublicProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [myAdminGroups, setMyAdminGroups] = useState<MyGroup[]>([]);
  const [profileGroups, setProfileGroups] = useState<ProfileGroup[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<EventItem[]>([]);
  const [pastEvents, setPastEvents] = useState<EventItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDMLoading, setIsDMLoading] = useState(false);

  // Invite dans un groupe
  const [showGroupPicker, setShowGroupPicker] = useState(false);
  const [inviteStatus, setInviteStatus] = useState<Record<string, InviteStatus>>({});

  useEffect(() => {
    const fetchAll = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id ?? null);

      if (user?.id === userId) { router.replace('/profile'); return; }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, username, bio, city, instruments, avatar_url, links')
        .eq('id', userId)
        .single();
      setProfile(profileData);

      const { data: groupMemberships } = await supabase
        .from('group_members')
        .select('groups(id, name, avatar_url)')
        .eq('user_id', userId)
        .eq('status', 'confirmed');
      setProfileGroups((groupMemberships ?? []).map((g: any) => g.groups).filter(Boolean));

      const { data: jamParts } = await supabase
        .from('jam_participants')
        .select('jam_sessions(id, title, start_time)')
        .eq('user_id', userId)
        .eq('status', 'confirmed');
      const jamEvents: EventItem[] = (jamParts ?? [])
        .map((p: any) => p.jam_sessions)
        .filter(Boolean)
        .map((j: any) => ({ id: j.id, type: 'jam' as const, title: j.title, start_time: j.start_time }));

      const { data: concertInts } = await supabase
        .from('concert_interested')
        .select('concerts(id, title, start_time)')
        .eq('user_id', userId);
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

      // Récupérer les groupes où l'utilisateur courant est admin
      if (user) {
        const { data: adminGroups } = await supabase
          .from('group_members')
          .select('group_id, groups(id, name)')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .eq('status', 'confirmed');

        const groups: MyGroup[] = (adminGroups ?? [])
          .map((row: any) => row.groups)
          .filter(Boolean);

        // Ajouter aussi les groupes créés par l'utilisateur
        const { data: createdGroups } = await supabase
          .from('groups')
          .select('id, name')
          .eq('created_by', user.id);

        const allGroups = [...groups];
        for (const g of createdGroups ?? []) {
          if (!allGroups.find((existing) => existing.id === g.id)) {
            allGroups.push(g);
          }
        }
        setMyAdminGroups(allGroups);
      }

      setIsLoading(false);
    };
    fetchAll();
  }, [userId]);

  const handleOpenDM = useCallback(async () => {
    if (!currentUserId) { router.push('/login'); return; }
    setIsDMLoading(true);
    const { data: convId } = await supabase.rpc('get_or_create_direct_conversation', {
      p_other_user_id: userId,
      p_title: profile?.username ?? null,
    });
    if (convId) router.push(`/messages/${convId}`);
    setIsDMLoading(false);
  }, [currentUserId, userId, profile, router]);

  const handleInviteToGroup = async (groupId: string) => {
    setInviteStatus((prev) => ({ ...prev, [groupId]: 'loading' }));
    const { data, error } = await supabase.rpc('invite_to_group', {
      p_target_user_id: userId,
      p_group_id: groupId,
    });
    if (error) {
      setInviteStatus((prev) => ({ ...prev, [groupId]: 'error' }));
    } else {
      setInviteStatus((prev) => ({
        ...prev,
        [groupId]: data === 'already_member' ? 'already_member' : 'success',
      }));
    }
    // Reset après 3s
    setTimeout(() => {
      setInviteStatus((prev) => ({ ...prev, [groupId]: 'idle' }));
    }, 3000);
  };

  if (isLoading) return (
    <div className="flex flex-col gap-4 p-4">
      <div className="h-8 w-24 rounded animate-pulse" style={{ background: '#1A1628' }} />
      <div className="h-24 w-24 rounded-full animate-pulse mx-auto" style={{ background: '#1A1628' }} />
      <div className="h-6 w-40 rounded animate-pulse mx-auto" style={{ background: '#1A1628' }} />
      <div className="h-32 rounded-xl animate-pulse" style={{ background: '#1A1628' }} />
    </div>
  );

  if (!profile) return (
    <div className="p-4 text-center" style={{ color: 'rgba(255,255,255,0.64)' }}>
      <p>Profil introuvable.</p>
      <button
        onClick={() => router.back()}
        className="mt-4 px-4 py-2 rounded-lg text-sm transition-colors"
        style={{ background: '#1A1628', color: '#F1F0F6', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        Retour
      </button>
    </div>
  );

  const initials = profile.username ? profile.username.slice(0, 2).toUpperCase() : '?';
  const profileLinks = parseProfileLinks(profile.links);
  const userInstruments = (profile.instruments ?? [])
    .map((key) => INSTRUMENTS.find((i) => i.key === key))
    .filter(Boolean) as typeof INSTRUMENTS;

  return (
    <div
      className="flex flex-col gap-5 p-4 max-w-lg mx-auto pb-24"
      style={{ background: 'var(--zik-bg)' }}
    >
      {/* Retour */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm self-start transition-colors"
        style={{ color: 'rgba(255,255,255,0.64)' }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#F1F0F6'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.64)'; }}
      >
        <ArrowLeft size={16} /> Retour
      </button>

      {/* Avatar + infos */}
      <div className="flex flex-col items-center gap-3">
        {profile.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={profile.username ?? ''}
            className="h-24 w-24 rounded-full object-cover"
            style={{
              border: '3px solid rgba(168,85,247,0.25)',
              boxShadow: '0 0 0 3px rgba(14,11,22,1), 0 8px 32px rgba(0,0,0,0.4)',
            }}
          />
        ) : (
          <div
            className="h-24 w-24 rounded-full flex items-center justify-center text-white text-2xl font-bold"
            style={{
              background: 'linear-gradient(135deg, #7C3AED, #A855F7)',
              border: '3px solid rgba(168,85,247,0.25)',
              boxShadow: '0 0 0 3px rgba(14,11,22,1)',
            }}
          >
            {initials}
          </div>
        )}

        <div className="text-center">
          <h1 className="text-xl font-bold" style={{ color: '#F1F0F6', letterSpacing: '-0.02em' }}>
            {profile.username ?? 'Musicien'}
          </h1>
          {profile.city && (
            <p className="text-sm flex items-center justify-center gap-1 mt-0.5"
              style={{ color: 'rgba(255,255,255,0.64)' }}>
              <MapPin size={13} style={{ color: '#A855F7' }} /> {profile.city}
            </p>
          )}
        </div>
      </div>

      {/* Boutons d'action */}
      <div className="flex gap-2">
        {currentUserId && (
          <button
            onClick={handleOpenDM}
            disabled={isDMLoading}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
            style={{
              background: 'linear-gradient(135deg, #7C3AED, #A855F7)',
              color: '#fff',
              opacity: isDMLoading ? 0.7 : 1,
            }}
          >
            <MessageCircle size={16} />
            {isDMLoading ? 'Ouverture...' : 'Envoyer un message'}
          </button>
        )}

        {/* Bouton Inviter dans un groupe — visible si on est admin d'au moins un groupe */}
        {currentUserId && myAdminGroups.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setShowGroupPicker((prev) => !prev)}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
              style={{
                background: showGroupPicker
                  ? 'rgba(168,85,247,0.15)'
                  : 'rgba(255,255,255,0.06)',
                border: '1px solid',
                borderColor: showGroupPicker
                  ? 'rgba(168,85,247,0.30)'
                  : 'rgba(255,255,255,0.08)',
                color: showGroupPicker ? '#A855F7' : 'rgba(255,255,255,0.60)',
              }}
            >
              <Users size={15} />
              <ChevronDown
                size={13}
                style={{
                  transform: showGroupPicker ? 'rotate(180deg)' : 'rotate(0)',
                  transition: 'transform 0.2s',
                }}
              />
            </button>

            {/* Dropdown groupes */}
            {showGroupPicker && (
              <div
                className="absolute right-0 top-full mt-1.5 rounded-xl overflow-hidden z-50"
                style={{
                  background: '#1A1628',
                  border: '1px solid rgba(255,255,255,0.08)',
                  boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
                  minWidth: 200,
                }}
              >
                <div
                  className="px-4 py-2.5"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <p className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.64)' }}>
                    Inviter dans un groupe
                  </p>
                </div>

                {myAdminGroups.map((group) => {
                  const status = inviteStatus[group.id] ?? 'idle';
                  return (
                    <button
                      key={group.id}
                      onClick={() => handleInviteToGroup(group.id)}
                      disabled={status === 'loading' || status === 'success'}
                      className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left transition-colors duration-100"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                      onMouseEnter={(e) => {
                        if (status === 'idle') {
                          (e.currentTarget as HTMLElement).style.background = 'rgba(168,85,247,0.08)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background = 'transparent';
                      }}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="h-7 w-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                          style={{ background: 'rgba(168,85,247,0.15)', color: '#A855F7' }}
                        >
                          {group.name.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-sm truncate" style={{ color: '#F1F0F6' }}>
                          {group.name}
                        </span>
                      </div>

                      {/* Statut */}
                      {status === 'loading' && (
                        <Loader2 size={14} className="animate-spin shrink-0" style={{ color: '#A855F7' }} />
                      )}
                      {status === 'success' && (
                        <Check size={14} className="shrink-0" style={{ color: '#34D399' }} />
                      )}
                      {status === 'already_member' && (
                        <span className="text-[10px] shrink-0" style={{ color: 'rgba(255,255,255,0.56)' }}>
                          Déjà membre
                        </span>
                      )}
                      {status === 'error' && (
                        <span className="text-[10px] shrink-0" style={{ color: '#F87171' }}>
                          Erreur
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <ReportButton targetType="user" targetId={userId} variant="icon" />
      </div>

      {/* Bio */}
      {profile.bio && (
        <div
          className="rounded-xl p-4"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <p className="selectable text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.70)' }}>
            <Linkify text={profile.bio} />
          </p>
        </div>
      )}

      {/* Liens */}
      {profileLinks.length > 0 && (
        <div className="flex flex-col gap-2">
          {profileLinks.map((link, i) => (
            <a key={i} href={link.url} target="_blank" rel="noopener noreferrer nofollow"
              className="flex items-center gap-2.5 rounded-xl p-3 transition-colors"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(168,85,247,0.20)';
                (e.currentTarget as HTMLElement).style.background = 'rgba(168,85,247,0.05)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)';
                (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)';
              }}>
              <Link2 size={15} style={{ color: '#A855F7' }} className="shrink-0" />
              <span className="text-sm font-medium truncate" style={{ color: '#F1F0F6' }}>
                {link.label || link.url}
              </span>
            </a>
          ))}
        </div>
      )}

      {/* Instruments */}
      {userInstruments.length > 0 && (
        <div>
          <h2
            className="text-sm font-semibold mb-2 flex items-center gap-1.5"
            style={{ color: '#F1F0F6' }}
          >
            <Music2 size={15} style={{ color: '#A855F7' }} /> Instruments
          </h2>
          <div className="flex flex-wrap gap-2">
            {userInstruments.map((inst) => (
              <span
                key={inst!.key}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium"
                style={{
                  background: 'rgba(168,85,247,0.10)',
                  color: '#A855F7',
                  border: '1px solid rgba(168,85,247,0.20)',
                }}
              >
                <span>{inst!.emoji}</span> {inst!.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Groupes */}
      {profileGroups.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-2 flex items-center gap-1.5" style={{ color: '#F1F0F6' }}>
            <Users size={15} style={{ color: '#A855F7' }} /> Groupes
          </h2>
          <div className="space-y-2">
            {profileGroups.map((group) => (
              <button
                key={group.id}
                onClick={() => router.push(`/groups/${group.id}`)}
                className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-150"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(168,85,247,0.20)';
                  (e.currentTarget as HTMLElement).style.background = 'rgba(168,85,247,0.05)';
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

      {/* Prochains événements */}
      {upcomingEvents.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-2 flex items-center gap-1.5" style={{ color: '#F1F0F6' }}>
            <CalendarDays size={15} style={{ color: '#A855F7' }} />
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
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(168,85,247,0.20)';
                  (e.currentTarget as HTMLElement).style.background = 'rgba(168,85,247,0.05)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)';
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)';
                }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-base shrink-0">{event.type === 'jam' ? '🎸' : '🎤'}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: '#F1F0F6' }}>{event.title}</p>
                    <p className="text-sm" style={{ color: '#F1F0F6' }}>{formatDate(event.start_time)}</p>
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
          <h2 className="text-sm font-semibold mb-2 flex items-center gap-1.5" style={{ color: '#F1F0F6' }}>
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
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(168,85,247,0.20)';
                  (e.currentTarget as HTMLElement).style.background = 'rgba(168,85,247,0.05)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)';
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)';
                }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-base shrink-0">{event.type === 'jam' ? '🎸' : '🎤'}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: '#F1F0F6' }}>{event.title}</p>
                    <p className="text-sm" style={{ color: '#F1F0F6' }}>{formatDate(event.start_time)}</p>
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