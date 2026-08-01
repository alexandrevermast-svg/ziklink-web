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
import { GroupAvatar } from "@/app/(protected)/groups/GroupAvatar";
import type { MusicianAd, Profile as ProfileRow } from "@/types";

type Profile = Pick<ProfileRow, "id" | "username" | "avatar_url">;
type AdGroup = { id: string; name: string; avatar_url: string | null };
type AdWithProfile = MusicianAd & { profile: Profile | null; group: AdGroup | null };

const INSTRUMENTS = [
  { key: "chant", label: "Chant", emoji: "🎤" },
  { key: "guitare", label: "Guitare", emoji: "🎸" },
  { key: "basse", label: "Basse", emoji: "🎵" },
  { key: "batterie", label: "Batterie", emoji: "🥁" },
  { key: "clavier", label: "Clavier", emoji: "🎹" },
  { key: "vents", label: "Vents", emoji: "🎺" },
  { key: "autres", label: "Autres", emoji: "🎶" },
];

const GENRES = ["Rock", "Jazz", "Blues", "Metal", "Pop", "Électro", "Folk", "Classique", "Hip-Hop", "Reggae", "Autre"];

const STATUS_LABELS: Record<string, string> = { amateur: "Amateur", pro: "Pro" };

const MODE_CONFIG = {
  musicien: { label: "Musiciens", icon: User, className: "bg-zik-orange/10 text-zik-orange" },
  groupe: { label: "Groupes", icon: Users, className: "bg-zik-emerald/10 text-zik-emerald" },
} as const;

function ChipFilterPopover({
  label, options, selected, onToggle,
}: {
  label: string;
  options: { key: string; label: string; emoji?: string }[];
  selected: string[];
  onToggle: (key: string) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
            selected.length > 0 ? "border-zik-purple/40 bg-zik-purple/10 text-zik-purple" : "border-zik-border bg-zik-card text-zik-muted hover:border-zik-purple/30"
          }`}
        >
          {label}
          {selected.length > 0 && (
            <span className="text-[10px] font-bold bg-zik-purple text-white rounded-full h-4 w-4 flex items-center justify-center">
              {selected.length}
            </span>
          )}
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 bg-zik-card border-zik-border p-3" align="start">
        <div className="flex flex-wrap gap-2">
          {options.map((opt) => {
            const isSelected = selected.includes(opt.key);
            return (
              <button
                key={opt.key}
                onClick={() => onToggle(opt.key)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  isSelected
                    ? "bg-zik-purple text-white border-zik-purple"
                    : "bg-zik-card-hover text-zik-muted border-zik-border hover:border-zik-purple hover:text-zik-purple"
                }`}
              >
                {opt.emoji && <span>{opt.emoji}</span>} {opt.label}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
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
  const [instrumentFilterMusicien, setInstrumentFilterMusicien] = useState<string[]>([]);
  const [instrumentFilterGroupe, setInstrumentFilterGroupe] = useState<string[]>([]);
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

    const { data, error } = await supabase
      .from("musician_ads")
      .select("*, profile:profiles(id, username, avatar_url), group:groups(id, name, avatar_url)")
      .order("created_at", { ascending: false });
    if (error) console.error(`musician_ads fetch failed: ${error.message} (code: ${error.code}, details: ${error.details}, hint: ${error.hint})`);
    setAds((data ?? []).map((a: any) => ({ ...a, profile: a.profile ?? null, group: a.group ?? null })));
    setIsLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const toggleGenreFilter = (g: string) => {
    setGenreFilters((prev) => prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]);
  };

  const toggleInstrumentFilter = (key: string, forMode: "musicien" | "groupe") => {
    const setter = forMode === "musicien" ? setInstrumentFilterMusicien : setInstrumentFilterGroupe;
    setter((prev) => prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]);
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
      if (ad.mode === "musicien" && instrumentFilterMusicien.length > 0 && !instrumentFilterMusicien.includes(ad.instrument ?? "")) return false;
      if (ad.mode === "groupe" && instrumentFilterGroupe.length > 0 && !instrumentFilterGroupe.includes(ad.instrument ?? "")) return false;
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
  }, [ads, modeFilter, instrumentFilterMusicien, instrumentFilterGroupe, statusFilter, genreFilters, nearMe, userPosition, radiusKm, distanceById]);

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

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full border-zik-border rounded-md text-sm px-3 py-2 bg-zik-card text-zik-text focus:outline-none focus:ring-2 focus:ring-zik-purple"
        >
          <option value="">Tout statut</option>
          {Object.entries(STATUS_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>

        <div className="flex flex-wrap gap-2">
          {(modeFilter === "tous" || modeFilter === "musicien") && (
            <ChipFilterPopover
              label="Instrument joué"
              options={INSTRUMENTS}
              selected={instrumentFilterMusicien}
              onToggle={(key) => toggleInstrumentFilter(key, "musicien")}
            />
          )}
          {(modeFilter === "tous" || modeFilter === "groupe") && (
            <ChipFilterPopover
              label="Instrument recherché"
              options={INSTRUMENTS}
              selected={instrumentFilterGroupe}
              onToggle={(key) => toggleInstrumentFilter(key, "groupe")}
            />
          )}
          <ChipFilterPopover
            label="Styles"
            options={GENRES.map((g) => ({ key: g, label: g }))}
            selected={genreFilters}
            onToggle={toggleGenreFilter}
          />

          <Popover>
            <PopoverTrigger asChild>
              <button
                onClick={() => { if (!nearMe) handleToggleNearMe(true); }}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  nearMe ? "border-zik-purple/40 bg-zik-purple/10 text-zik-purple" : "border-zik-border bg-zik-card text-zik-muted hover:border-zik-purple/30"
                }`}
              >
                <LocateFixed className="h-4 w-4 shrink-0" />
                <span className="truncate">
                  {geoLoading
                    ? "Localisation..."
                    : nearMe && userPosition
                    ? `Près de moi · ${radiusKm === null ? "Tout" : radiusKm + " km"}`
                    : "Près de moi"}
                </span>
                <ChevronDown className="h-3.5 w-3.5 shrink-0" />
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
              <div
                key={ad.id}
                onClick={() => router.push(`/ads/${ad.id}`)}
                className="rounded-lg border border-zik-border overflow-hidden bg-zik-card hover:border-zik-purple/30 hover:shadow-sm transition-all cursor-pointer active:scale-[0.99]"
              >
                <div className="flex">
                  {ad.photo_url && (
                    <img src={ad.photo_url} alt={ad.title} className="w-20 shrink-0 object-cover self-stretch" />
                  )}
                  <div className="flex-1 min-w-0 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full mb-1 ${config.className}`}>
                          <ModeIcon className="h-3 w-3" />
                          {config.label}
                        </span>
                        <h3 className="font-semibold text-zik-text truncate">{ad.title}</h3>
                        {ad.group ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); router.push(`/groups/${ad.group!.id}`); }}
                            className="flex items-center gap-1.5 mt-1 hover:opacity-80 transition-opacity"
                          >
                            <GroupAvatar group={ad.group} size="sm" />
                            <span className="text-xs text-zik-muted truncate">{ad.group.name}</span>
                          </button>
                        ) : ad.profile?.username && (
                          <p className="text-xs text-zik-muted truncate">par {ad.profile.username}</p>
                        )}
                      </div>
                      {!isOwner && <ReportButton targetType="musician_ad" targetId={ad.id} variant="icon" />}
                    </div>

                    <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-zik-muted">
                      {instrument && <span>{instrument.emoji} {instrument.label}</span>}
                      {ad.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{ad.city}</span>}
                      {distanceById[ad.id] !== undefined && (
                        <span className="flex items-center gap-1 text-zik-purple font-medium">
                          <LocateFixed className="h-3 w-3" />
                          {formatDistanceKm(distanceById[ad.id])}
                        </span>
                      )}
                      <span className="text-zik-purple">{STATUS_LABELS[ad.status] ?? ad.status}</span>
                    </div>

                    <div className="flex items-center justify-end gap-2 mt-2">
                      {isOwner ? (
                        <>
                          <Button size="sm" variant="outline"
                            className="text-xs border-zik-border text-zik-text hover:border-zik-purple hover:text-zik-purple"
                            onClick={(e) => { e.stopPropagation(); setEditingAd(ad); }}>
                            <Pencil className="h-3.5 w-3.5 mr-1" /> Modifier
                          </Button>
                          <Button size="sm" variant="outline"
                            className="text-xs border-zik-red/30 text-zik-red hover:bg-zik-red/10"
                            onClick={(e) => { e.stopPropagation(); handleDelete(ad.id); }} disabled={deletingId === ad.id}>
                            <Trash2 className="h-3.5 w-3.5 mr-1" /> {deletingId === ad.id ? "..." : "Supprimer"}
                          </Button>
                        </>
                      ) : (
                        <Button size="sm" className="text-xs bg-zik-purple hover:bg-zik-indigo"
                          onClick={(e) => { e.stopPropagation(); handleContact(ad.created_by); }}
                          disabled={contactingId === ad.created_by}>
                          <MessageCircle className="h-3.5 w-3.5 mr-1" />
                          {contactingId === ad.created_by ? "..." : "Contacter"}
                        </Button>
                      )}
                    </div>
                  </div>
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
