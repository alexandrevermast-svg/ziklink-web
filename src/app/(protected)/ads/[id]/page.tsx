"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import Modal from "@/components/Modal";
import AdForm from "@/components/AdForm";
import ReportButton from "@/components/ReportButton";
import { GroupAvatar } from "@/app/(protected)/groups/GroupAvatar";
import {
  ArrowLeft, User, Users, MapPin, MessageCircle, Pencil, Trash2, Play,
} from "lucide-react";
import { getYouTubeVideoId, getYouTubeThumbnail, getYouTubeEmbedUrl } from "@/lib/youtube";
import type { MusicianAd, Profile as ProfileRow } from "@/types";

type Profile = Pick<ProfileRow, "id" | "username" | "avatar_url">;
type AdGroup = { id: string; name: string; avatar_url: string | null };
type AdWithRelations = MusicianAd & { profile: Profile | null; group: AdGroup | null };

const INSTRUMENTS = [
  { key: "chant", label: "Chant", emoji: "🎤" },
  { key: "guitare", label: "Guitare", emoji: "🎸" },
  { key: "basse", label: "Basse", emoji: "🎵" },
  { key: "batterie", label: "Batterie", emoji: "🥁" },
  { key: "clavier", label: "Clavier", emoji: "🎹" },
  { key: "vents", label: "Vents", emoji: "🎺" },
  { key: "autres", label: "Autres", emoji: "🎶" },
];

const STATUS_LABELS: Record<string, string> = { amateur: "Amateur", pro: "Pro" };

const MODE_CONFIG = {
  musicien: { label: "Musiciens", icon: User, className: "bg-zik-orange/10 text-zik-orange" },
  groupe: { label: "Groupes", icon: Users, className: "bg-zik-emerald/10 text-zik-emerald" },
} as const;

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

export default function AdDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [ad, setAd] = useState<AdWithRelations | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isContacting, setIsContacting] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const fetchAd = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id ?? null);

    const { data } = await supabase
      .from("musician_ads")
      .select("*, profile:profiles(id, username, avatar_url), group:groups(id, name, avatar_url)")
      .eq("id", id)
      .single();
    setAd(data ? { ...data, profile: (data as any).profile ?? null, group: (data as any).group ?? null } : null);
    setIsLoading(false);
  }, [id]);

  useEffect(() => { fetchAd(); }, [fetchAd]);

  const handleContact = async () => {
    if (!ad) return;
    if (!currentUserId) { router.push(`/login?next=${encodeURIComponent(`/ads/${id}`)}`); return; }
    if (ad.created_by === currentUserId) return;
    setIsContacting(true);
    const { data: convId } = await supabase.rpc("get_or_create_direct_conversation", { p_other_user_id: ad.created_by });
    setIsContacting(false);
    if (convId) router.push(`/messages/${convId}`);
  };

  const handleDelete = async () => {
    if (!ad || !confirm("Supprimer cette annonce ?")) return;
    setIsDeleting(true);
    await supabase.from("musician_ads").delete().eq("id", ad.id);
    router.push("/groups");
  };

  if (isLoading) return (
    <div className="flex flex-col gap-4 p-4">
      <div className="h-8 w-24 bg-zik-card animate-pulse rounded" />
      <div className="h-48 bg-zik-card animate-pulse rounded-xl" />
    </div>
  );

  if (!ad) return (
    <div className="p-4 text-center text-zik-muted">
      <p>Annonce introuvable.</p>
      <Button variant="outline" className="mt-4 border-zik-border text-zik-text hover:bg-zik-card-hover" onClick={() => router.back()}>
        Retour
      </Button>
    </div>
  );

  const isOwner = ad.created_by === currentUserId;
  const instrument = INSTRUMENTS.find((i) => i.key === ad.instrument);
  const config = MODE_CONFIG[ad.mode as keyof typeof MODE_CONFIG] ?? MODE_CONFIG.musicien;
  const ModeIcon = config.icon;
  const videoId = ad.video_url ? getYouTubeVideoId(ad.video_url) : null;

  return (
    <div className="flex flex-col gap-4 p-4 max-w-lg mx-auto pb-24">
      <div className="flex items-center justify-between">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-zik-muted hover:text-zik-text transition-colors">
          <ArrowLeft className="h-4 w-4" /> Retour
        </button>
        {!isOwner && <ReportButton targetType="musician_ad" targetId={ad.id} variant="icon" />}
      </div>

      {ad.photo_url && (
        <img src={ad.photo_url} alt={ad.title} className="w-full max-h-64 object-cover rounded-xl border border-zik-border" />
      )}

      <div>
        <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full mb-2 ${config.className}`}>
          <ModeIcon className="h-3 w-3" />
          {config.label}
        </span>
        <h1 className="text-xl font-bold text-zik-text">{ad.title}</h1>

        {ad.group ? (
          <button onClick={() => router.push(`/groups/${ad.group!.id}`)} className="flex items-center gap-2 mt-2 hover:opacity-80 transition-opacity">
            <GroupAvatar group={ad.group} size="sm" />
            <span className="text-sm text-zik-muted">{ad.group.name}</span>
          </button>
        ) : ad.profile?.username && (
          <button onClick={() => router.push(`/profile/${ad.profile!.id}`)} className="flex items-center gap-2 mt-2 hover:opacity-80 transition-opacity">
            {ad.profile.avatar_url ? (
              <img src={ad.profile.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover" />
            ) : (
              <div className="h-7 w-7 rounded-full bg-zik-purple flex items-center justify-center text-white text-xs font-semibold">
                {ad.profile.username.slice(0, 2).toUpperCase()}
              </div>
            )}
            <span className="text-sm text-zik-muted">{ad.profile.username}</span>
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-3 text-sm text-zik-muted">
        {instrument && <span>{instrument.emoji} {instrument.label}</span>}
        {ad.city && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{ad.city}</span>}
        <span className="text-zik-purple font-medium">{STATUS_LABELS[ad.status] ?? ad.status}</span>
        <span>Publiée le {formatDate(ad.created_at)}</span>
      </div>

      {ad.genres.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {ad.genres.map((g) => (
            <span key={g} className="text-xs bg-zik-purple/10 text-zik-purple px-2.5 py-1 rounded-full">{g}</span>
          ))}
        </div>
      )}

      {ad.description && (
        <p className="text-sm text-zik-text whitespace-pre-wrap leading-relaxed">{ad.description}</p>
      )}

      {videoId && (
        <div className="rounded-xl overflow-hidden bg-black aspect-video">
          {isPlaying ? (
            <iframe
              src={getYouTubeEmbedUrl(videoId)}
              title={ad.title}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <button type="button" onClick={() => setIsPlaying(true)} className="relative w-full h-full group">
              <img src={getYouTubeThumbnail(videoId)} alt="" className="w-full h-full object-cover" />
              <span className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
                <span className="h-14 w-14 rounded-full bg-white/90 flex items-center justify-center">
                  <Play className="h-6 w-6 text-black ml-0.5" fill="black" />
                </span>
              </span>
            </button>
          )}
        </div>
      )}

      <div className="flex gap-2 justify-end pt-2">
        {isOwner ? (
          <>
            <Button variant="outline" className="border-zik-border text-zik-text hover:border-zik-purple hover:text-zik-purple" onClick={() => setIsEditOpen(true)}>
              <Pencil className="h-4 w-4 mr-1.5" /> Modifier
            </Button>
            <Button variant="outline" className="border-zik-red/30 text-zik-red hover:bg-zik-red/10" onClick={handleDelete} disabled={isDeleting}>
              <Trash2 className="h-4 w-4 mr-1.5" /> {isDeleting ? "..." : "Supprimer"}
            </Button>
          </>
        ) : (
          <Button className="bg-zik-purple hover:bg-zik-indigo" onClick={handleContact} disabled={isContacting}>
            <MessageCircle className="h-4 w-4 mr-1.5" />
            {isContacting ? "..." : "Contacter"}
          </Button>
        )}
      </div>

      <Modal open={isEditOpen} onClose={() => setIsEditOpen(false)} title="Modifier l'annonce">
        <AdForm ad={ad} onSuccess={() => { setIsEditOpen(false); fetchAd(); }} onClose={() => setIsEditOpen(false)} />
      </Modal>
    </div>
  );
}
