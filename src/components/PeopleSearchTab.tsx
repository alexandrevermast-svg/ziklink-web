"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import Modal from "@/components/Modal";
import AdForm from "@/components/AdForm";
import ReportButton from "@/components/ReportButton";
import { Plus, User, Users, MapPin, MessageCircle, Pencil, Trash2, LocateFixed, ChevronDown } from "lucide-react";
import { haversineDistanceKm, formatDistanceKm, type LatLng } from "@/lib/geo";
import type { MusicianAd, Profile as ProfileRow } from "@/types";

type Profile = Pick<ProfileRow, "id" | "username" | "avatar_url">;
type AdWithProfile = MusicianAd & { profile: Profile | null };

const INSTRUMENTS = [
  { key: "chant", label: "Chant", emoji: "🎤" },
  { key: "guitare", label: "Guitare", emoji: "🎸" },
  { key: "basse", label: "Basse", emoji: "🎵" },
  { key: "batterie", label: "Batterie", emoji: "🥁" },
  { key: "clavier", label: "Clavier", emoji: "🎹" },
  { key: "autres", label: "Autres", emoji: "🎶" },
];

const GENRES = ["Rock", "Jazz", "Blues", "Metal", "Pop", "Électro", "Folk", "Classique", "Hip-Hop", "Reggae", "Autre"];

const STATUS_LABELS: Record<string, string> = { amateur: "Amateur", pro: "Pro", indifferent: "Indifférent" };

const MODE_CONFIG = {
  musicien: { label: "Musiciens", icon: User, className: "bg-zik-orange/10 text-zik-orange" },
  groupe: { label: "Groupes", icon: Users, className: "bg-zik-emerald/10 text-zik-emerald" },
} as const;

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

export default function PeopleSearchTab() {
  const supabase = createClient();
  const router = useRouter();

  const [ads, setAds] = useState<AdWithProfile[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<MusicianAd | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [contactingId, setContactingId] = useState<string | null>(null);

  const [modeFilter, setModeFilter] = useState<"tous" | "musicien" | "groupe">("tous");
  const [instrumentFilter, setInstrumentFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [genreFilters, setGenreFilters] = useState<string[]>([]);

  const [nearMe, setNearMe] = useState(false);
  const [userPosition, setUserPosition] = useState<LatLng | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [radiusKm, setRadiusKm] = useState<number | null>(null);

  const fetchAll = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id ?? null);

    const { data } = await supabase
      .from("musician_ads")
      .select("*, profile:profiles(id, username, avatar_url)")
      .order("created_at", { ascending: false });
    setAds((data ?? []).map((a: any) => ({ ...a, profile: a.profile ?? null })));
    setIsLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const toggleGenreFilter = (g: string) => {
    setGenreFilters((prev) => prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]);
  };

  const handleToggleNearMe = useCallback((checked: boolean) => {
    setNearMe(checked);
    setGeoError(null);
    setRadiusKm(null);
    if (!checked) return;
    if (!navigator.geolocation) {
      setGeoError("La géolocalisation n'est pas disponible sur cet appareil.");
      setNearMe(false);
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoLoading(false);
      },
      () => {
        setGeoError("Localisation refusée ou indisponible.");
        setGeoLoading(false);
        setNearMe(false);
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  }, []);

  const distanceById = useMemo(() => {
    if (!nearMe || !userPosition) return {} as Record<string, number>;
    const map: Record<string, number> = {};
    for (const ad of ads) {
      if (ad.lat != null && ad.lng != null) {
        map[ad.id] = haversineDistanceKm(userPosition, { lat: ad.lat, lng: ad.lng });
      }
    }
    return map;
  }, [ads, nearMe, userPosition]);

  const filtered = useMemo(() => {
    const base = ads.filter((ad) => {
      if (modeFilter !== "tous" && ad.mode !== modeFilter) return false;
      if (instrumentFilter && ad.instrument !== instrumentFilter) return false;
      if (statusFilter && ad.status !== statusFilter) return false;
      if (genreFilters.length > 0 && !genreFilters.some((g) => ad.genres.includes(g))) return false;
      return true;
    });
    if (!nearMe || !userPosition) return base;
    return base
      .filter((ad) => radiusKm === null || (distanceById[ad.id] !== undefined && distanceById[ad.id] <= radiusKm))
      .sort((a, b) => {
        const da = distanceById[a.id], db = distanceById[b.id];
        if (da === undefined) return 1;
        if (db === undefined) return -1;
        return da - db;
      });
  }, [ads, modeFilter, instrumentFilter, statusFilter, genreFilters, nearMe, userPosition, radiusKm, distanceById]);

  const handleAddClick = () => {
    if (!currentUserId) { router.push(`/login?next=${encodeURIComponent("/groups")}`); return; }
    setIsModalOpen(true);
  };

  const handleContact = async (targetUserId: string) => {
    if (!currentUserId) { router.push(`/login?next=${encodeURIComponent("/groups")}`); return; }
    if (targetUserId === currentUserId) return;
    setContactingId(targetUserId);
    const { data: convId } = await supabase.rpc("get_or_create_direct_conversation", { p_other_user_id: targetUserId });
    setContactingId(null);
    if (convId) router.push(`/messages/${convId}`);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await supabase.from("musician_ads").delete().eq("id", id);
    await fetchAll();
    setDeletingId(null);
  };

  return (
    <div className="flex flex-col gap-4 pt-4 px-4 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-zik-text">Petites annonces</h1>
          <p className="text-xs text-zik-muted mt-0.5">Musiciens qui cherchent un groupe, groupes qui cherchent un musicien</p>
        </div>
        <Button size="sm" className="bg-zik-purple hover:bg-zik-indigo text-white" onClick={handleAddClick}>
          <Plus className="mr-1.5 h-4 w-4" /> Publier
        </Button>
      </div>

      <div className="space-y-3">
        <div className="flex gap-2">
          {([
            { key: "tous", label: "Toutes" },
            { key: "musicien", label: "Musiciens" },
            { key: "groupe", label: "Groupes" },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setModeFilter(key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                modeFilter === key ? "bg-zik-purple text-white" : "bg-zik-card text-zik-muted hover:bg-zik-card-hover"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <select
            value={instrumentFilter}
            onChange={(e) => setInstrumentFilter(e.target.value)}
            className="w-full border-zik-border rounded-md text-sm px-3 py-2 bg-zik-card text-zik-text focus:outline-none focus:ring-2 focus:ring-zik-purple"
          >
            <option value="">Tous instruments</option>
            {INSTRUMENTS.map((i) => <option key={i.key} value={i.key}>{i.emoji} {i.label}</option>)}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full border-zik-border rounded-md text-sm px-3 py-2 bg-zik-card text-zik-text focus:outline-none focus:ring-2 focus:ring-zik-purple"
          >
            <option value="">Tout statut</option>
            {Object.entries(STATUS_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <button
              onClick={() => { if (!nearMe) handleToggleNearMe(true); }}
              className={`w-full flex items-center justify-between gap-2 rounded-lg border p-2.5 text-left transition-colors ${
                nearMe ? "border-zik-purple/40 bg-zik-purple/10" : "border-zik-border bg-zik-card hover:border-zik-purple/30"
              }`}
            >
              <span className="flex items-center gap-1.5 text-sm font-medium text-zik-text truncate">
                <LocateFixed className={`h-4 w-4 shrink-0 ${nearMe ? "text-zik-purple" : "text-zik-muted"}`} />
                <span className="truncate">
                  {geoLoading
                    ? "Localisation..."
                    : nearMe && userPosition
                    ? `Près de moi · ${radiusKm === null ? "Tout" : radiusKm + " km"}`
                    : "Près de moi"}
                </span>
              </span>
              {nearMe && <ChevronDown className="h-3.5 w-3.5 text-zik-muted shrink-0" />}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64 bg-zik-card border-zik-border p-4 space-y-3" align="start">
            {geoError && <p className="text-xs text-zik-red">{geoError}</p>}
            {nearMe && userPosition && (
              <div>
                <p className="text-xs text-zik-muted mb-1.5">Rayon</p>
                <div className="flex flex-wrap gap-1.5">
                  {([
                    { key: null, label: "Tout" },
                    { key: 1, label: "1 km" },
                    { key: 5, label: "5 km" },
                    { key: 10, label: "10 km" },
                    { key: 25, label: "25 km" },
                  ] as const).map(({ key, label }) => {
                    const isActive = radiusKm === key;
                    return (
                      <button
                        key={label}
                        onClick={() => setRadiusKm(key)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                          isActive ? "bg-zik-purple text-white" : "bg-zik-card-hover text-zik-muted hover:bg-zik-border"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => handleToggleNearMe(false)}
                  className="mt-3 text-xs text-zik-muted hover:text-zik-red transition-colors"
                >
                  Désactiver la localisation
                </button>
              </div>
            )}
          </PopoverContent>
        </Popover>

        <div className="flex flex-wrap gap-2">
          {GENRES.map((g) => {
            const isSelected = genreFilters.includes(g);
            return (
              <button
                key={g}
                onClick={() => toggleGenreFilter(g)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  isSelected
                    ? "bg-zik-purple text-white border-zik-purple"
                    : "bg-zik-card text-zik-muted border-zik-border hover:border-zik-purple hover:text-zik-purple"
                }`}
              >
                {g}
              </button>
            );
          })}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-zik-card animate-pulse rounded-lg" />)}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-zik-muted text-center py-8">Aucune annonce ne correspond à ces critères.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((ad) => {
            const isOwner = ad.created_by === currentUserId;
            const instrument = INSTRUMENTS.find((i) => i.key === ad.instrument);
            const config = MODE_CONFIG[ad.mode as keyof typeof MODE_CONFIG] ?? MODE_CONFIG.musicien;
            const ModeIcon = config.icon;
            return (
              <div key={ad.id} className="rounded-lg border border-zik-border p-4 bg-zik-card">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full mb-1.5 ${config.className}`}>
                      <ModeIcon className="h-3 w-3" />
                      {config.label}
                    </span>
                    <h3 className="font-semibold text-zik-text truncate">{ad.title}</h3>
                    {ad.profile?.username && (
                      <p className="text-xs text-zik-muted truncate">par {ad.profile.username}</p>
                    )}
                  </div>
                  {!isOwner && <ReportButton targetType="musician_ad" targetId={ad.id} variant="icon" />}
                </div>

                {ad.description && <p className="text-sm text-zik-muted mt-2 line-clamp-2">{ad.description}</p>}

                <div className="flex flex-wrap gap-3 mt-2 text-xs text-zik-muted">
                  {instrument && <span>{instrument.emoji} {instrument.label}</span>}
                  {ad.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{ad.city}</span>}
                  {distanceById[ad.id] !== undefined && (
                    <span className="flex items-center gap-1 text-zik-purple font-medium">
                      <LocateFixed className="h-3 w-3" />
                      {formatDistanceKm(distanceById[ad.id])}
                    </span>
                  )}
                  <span className="text-zik-purple">{STATUS_LABELS[ad.status] ?? ad.status}</span>
                  <span>{formatDate(ad.created_at)}</span>
                </div>

                {ad.genres.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {ad.genres.map((g) => (
                      <span key={g} className="text-[10px] bg-zik-purple/10 text-zik-purple px-2 py-0.5 rounded-full">{g}</span>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 mt-3">
                  {isOwner ? (
                    <>
                      <Button size="sm" variant="outline"
                        className="text-xs border-zik-border text-zik-text hover:border-zik-purple hover:text-zik-purple"
                        onClick={() => setEditingAd(ad)}>
                        <Pencil className="h-3.5 w-3.5 mr-1" /> Modifier
                      </Button>
                      <Button size="sm" variant="outline"
                        className="text-xs border-zik-red/30 text-zik-red hover:bg-zik-red/10"
                        onClick={() => handleDelete(ad.id)} disabled={deletingId === ad.id}>
                        <Trash2 className="h-3.5 w-3.5 mr-1" /> {deletingId === ad.id ? "..." : "Supprimer"}
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" className="text-xs bg-zik-purple hover:bg-zik-indigo"
                      onClick={() => handleContact(ad.created_by)}
                      disabled={contactingId === ad.created_by}>
                      <MessageCircle className="h-3.5 w-3.5 mr-1" />
                      {contactingId === ad.created_by ? "..." : "Contacter"}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} title="Publier une annonce">
        <AdForm onSuccess={() => { setIsModalOpen(false); fetchAll(); }} onClose={() => setIsModalOpen(false)} />
      </Modal>

      <Modal open={!!editingAd} onClose={() => setEditingAd(null)} title="Modifier l'annonce">
        {editingAd && (
          <AdForm ad={editingAd} onSuccess={() => { setEditingAd(null); fetchAll(); }} onClose={() => setEditingAd(null)} />
        )}
      </Modal>
    </div>
  );
}
