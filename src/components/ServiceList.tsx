"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { GraduationCap, Mic2, MapPin, Music2, MessageCircle, Pencil, Trash2, LocateFixed, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import Modal from "@/components/Modal";
import ShareButton from "@/components/ShareButton";
import ReportButton from "@/components/ReportButton";
import ServiceForm from "@/components/ServiceForm";
import { haversineDistanceKm, formatDistanceKm, type LatLng } from "@/lib/geo";
import type { Service, Profile as ProfileRow } from "@/types";

type Profile = Pick<ProfileRow, "id" | "username" | "avatar_url">;
type ServiceWithProfile = Service & { profile: Profile | null };

const TYPE_CONFIG = {
  cours: { label: "Cours", icon: GraduationCap },
  prestation: { label: "Prestation", icon: Mic2 },
} as const;

interface ServiceListProps {
  kind: "offre" | "demande";
}

export default function ServiceList({ kind }: ServiceListProps) {
  const supabase = createClient();
  const router = useRouter();
  const [services, setServices] = useState<ServiceWithProfile[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<"tous" | "cours" | "prestation">("tous");
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [contactingId, setContactingId] = useState<string | null>(null);

  const [nearMe, setNearMe] = useState(false);
  const [userPosition, setUserPosition] = useState<LatLng | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [radiusKm, setRadiusKm] = useState<number | null>(null);

  const fetchAll = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id ?? null);

    const { data } = await supabase
      .from("services")
      .select("*, profile:profiles(id, username, avatar_url)")
      .order("created_at", { ascending: false });
    setServices((data ?? []).map((s: any) => ({ ...s, profile: s.profile ?? null })));
    setIsLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleContact = async (targetUserId: string) => {
    if (!currentUserId) { router.push(`/login?next=${encodeURIComponent("/services")}`); return; }
    if (targetUserId === currentUserId) return;
    setContactingId(targetUserId);
    const { data: convId } = await supabase.rpc("get_or_create_direct_conversation", { p_other_user_id: targetUserId });
    setContactingId(null);
    if (convId) router.push(`/messages/${convId}`);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await supabase.from("services").delete().eq("id", id);
    await fetchAll();
    setDeletingId(null);
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

  const baseFiltered = services
    .filter((s) => s.kind === kind)
    .filter((s) => typeFilter === "tous" || s.type === typeFilter);

  const distanceById = useMemo(() => {
    if (!nearMe || !userPosition) return {} as Record<string, number>;
    const map: Record<string, number> = {};
    for (const s of baseFiltered) {
      if (s.lat != null && s.lng != null) {
        map[s.id] = haversineDistanceKm(userPosition, { lat: s.lat, lng: s.lng });
      }
    }
    return map;
  }, [baseFiltered, nearMe, userPosition]);

  const filtered = !nearMe || !userPosition
    ? baseFiltered
    : baseFiltered
        .filter((s) => radiusKm === null || (distanceById[s.id] !== undefined && distanceById[s.id] <= radiusKm))
        .sort((a, b) => {
          const da = distanceById[a.id], db = distanceById[b.id];
          if (da === undefined) return 1;
          if (db === undefined) return -1;
          return da - db;
        });

  if (isLoading) return (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-zik-card animate-pulse rounded-lg" />)}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {([
          { key: "tous", label: "Tous" },
          { key: "cours", label: "Cours" },
          { key: "prestation", label: "Prestations" },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTypeFilter(key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              typeFilter === key ? "bg-zik-purple text-white" : "bg-zik-card text-zik-muted hover:bg-zik-card-hover"
            }`}
          >
            {label}
          </button>
        ))}

        <Popover>
          <PopoverTrigger asChild>
            <button
              onClick={() => { if (!nearMe) handleToggleNearMe(true); }}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                nearMe ? "border-zik-purple/40 bg-zik-purple/10 text-zik-purple" : "border-transparent bg-zik-card text-zik-muted hover:bg-zik-card-hover"
              }`}
            >
              <LocateFixed className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">
                {geoLoading
                  ? "Localisation..."
                  : nearMe && userPosition
                  ? `Près de moi · ${radiusKm === null ? "Tout" : radiusKm + " km"}`
                  : "Près de moi"}
              </span>
              <ChevronDown className="h-3 w-3 shrink-0" />
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

      {filtered.length === 0 ? (
        <p className="text-zik-muted text-sm text-center py-6">Aucune annonce pour le moment 🎵</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((service) => {
            const config = TYPE_CONFIG[service.type as keyof typeof TYPE_CONFIG] ?? TYPE_CONFIG.cours;
            const Icon = config.icon;
            const isOwner = service.created_by === currentUserId;

            return (
              <div key={service.id} className="rounded-lg border border-zik-border overflow-hidden bg-zik-card">
                <div className="flex">
                  {service.photo_url ? (
                    <img src={service.photo_url} alt={service.title} className="w-24 shrink-0 object-cover self-stretch" />
                  ) : (
                    <div className="w-24 shrink-0 bg-linear-to-br from-zik-purple/20 to-zik-indigo/20 flex items-center justify-center">
                      <Music2 className="h-8 w-8 text-zik-purple" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="flex items-center gap-1 text-[10px] font-medium text-zik-purple mb-1">
                          <Icon className="h-3 w-3" /> {config.label}
                        </span>
                        <h3 className="font-semibold text-zik-text truncate">{service.title}</h3>
                        {service.profile?.username && (
                          <p className="text-xs text-zik-muted truncate">par {service.profile.username}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <ShareButton url={`/services`} title={service.title} text={service.description ?? undefined} />
                        {!isOwner && <ReportButton targetType="service" targetId={service.id} variant="icon" />}
                      </div>
                    </div>

                    {service.description && (
                      <p className="text-sm text-zik-muted mt-1.5 line-clamp-2">{service.description}</p>
                    )}

                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-zik-muted">
                      {service.instrument && <span>🎸 {service.instrument}</span>}
                      {service.city && (
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{service.city}</span>
                      )}
                      {distanceById[service.id] !== undefined && (
                        <span className="flex items-center gap-1 text-zik-purple font-medium">
                          <LocateFixed className="h-3 w-3" />{formatDistanceKm(distanceById[service.id])}
                        </span>
                      )}
                      {service.price_info && <span className="font-medium text-zik-text">{service.price_info}</span>}
                    </div>

                    <div className="flex items-center justify-end gap-2 mt-3">
                      {isOwner ? (
                        <>
                          <Button size="sm" variant="outline"
                            className="text-xs border-zik-border text-zik-text hover:border-zik-purple hover:text-zik-purple"
                            onClick={() => setEditingService(service)}>
                            <Pencil className="h-3.5 w-3.5 mr-1" /> Modifier
                          </Button>
                          <Button size="sm" variant="outline"
                            className="text-xs border-zik-red/30 text-zik-red hover:bg-zik-red/10"
                            onClick={() => handleDelete(service.id)} disabled={deletingId === service.id}>
                            <Trash2 className="h-3.5 w-3.5 mr-1" /> {deletingId === service.id ? "..." : "Supprimer"}
                          </Button>
                        </>
                      ) : (
                        <Button size="sm" className="text-xs bg-zik-purple hover:bg-zik-indigo"
                          onClick={() => handleContact(service.created_by)}
                          disabled={contactingId === service.created_by}>
                          <MessageCircle className="h-3.5 w-3.5 mr-1" />
                          {contactingId === service.created_by ? "..." : "Contacter"}
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

      <Modal open={!!editingService} onClose={() => setEditingService(null)} title="Modifier l'annonce">
        {editingService && (
          <ServiceForm
            service={editingService}
            onSuccess={() => { setEditingService(null); fetchAll(); }}
            onClose={() => setEditingService(null)}
          />
        )}
      </Modal>
    </div>
  );
}
