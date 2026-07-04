// components/MusicianSearchModal.tsx
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, X, MapPin, UserPlus, Loader2 } from "lucide-react";

const INSTRUMENTS = [
  { key: 'chant', label: 'Chant', emoji: '🎤' },
  { key: 'guitare', label: 'Guitare', emoji: '🎸' },
  { key: 'basse', label: 'Basse', emoji: '🎵' },
  { key: 'batterie', label: 'Batterie', emoji: '🥁' },
  { key: 'clavier', label: 'Clavier', emoji: '🎹' },
  { key: 'autres', label: 'Autres', emoji: '🎶' },
];

interface Profile {
  id: string;
  username: string | null;
  avatar_url: string | null;
  city: string | null;
  instruments: string[] | null;
  looking_for_group: boolean;
}

interface MusicianSearchModalProps {
  open: boolean;
  onClose: () => void;
  groupCity: string | null;
  onInvite: (userId: string) => void;
}

// ✅ Fonction Modal intégrée directement (plus de dépendance externe)
function Modal({ open, onClose, title, children }: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 99999 }}>
      <div
        style={{ position: "absolute", inset: 0, background: "rgba(14, 11, 22, 0.8)" }}
        onClick={onClose}
      />
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          background: "var(--zik-card)",
          borderRadius: "12px",
          padding: "24px",
          width: "min(90vw, 560px)",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          color: "var(--zik-text)",
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-zik-text">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-zik-card-hover text-zik-muted hover:text-zik-text transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}

// ✅ Composant MemberAvatar intégré directement
function MemberAvatar({ profile, size = "md" }: { profile: Profile | null; size?: "sm" | "md" }) {
  const cls = size === "sm" ? "h-6 w-6 text-[9px]" : "h-10 w-10 text-sm";
  const initials = profile?.username?.slice(0, 2).toUpperCase() ?? '?';
  return profile?.avatar_url ? (
    <img src={profile.avatar_url} alt={profile.username ?? ''} className={`${cls} rounded-full object-cover shrink-0`} />
  ) : (
    <div className={`${cls} rounded-full bg-zik-purple flex items-center justify-center text-white font-semibold shrink-0`}>
      {initials}
    </div>
  );
}

export default function MusicianSearchModal({
  open,
  onClose,
  groupCity,
  onInvite,
}: MusicianSearchModalProps) {
  const supabase = createClient();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>([]);
  const [distance, setDistance] = useState<number>(50);
  const [onlyLookingForGroup, setOnlyLookingForGroup] = useState(true);

  // ✅ Récupère l'ID de l'utilisateur actuel pour l'exclure des résultats
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id ?? null);
    };
    fetchUser();
  }, []);

  const fetchProfiles = useCallback(async () => {
    if (!currentUserId) return;
    setIsLoading(true);
    try {
      let query = supabase
        .from("profiles")
        .select("id, username, avatar_url, city, instruments, looking_for_group")
        .neq("id", currentUserId)
        .eq("looking_for_group", onlyLookingForGroup);

      if (selectedInstruments.length > 0) {
        query = query.contains("instruments", selectedInstruments);
      }

      if (searchTerm.trim()) {
        query = query.ilike("username", `%${searchTerm.trim()}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      let filteredProfiles = data || [];
      if (groupCity && distance > 0) {
        filteredProfiles = filteredProfiles.filter(
          (profile) => profile.city?.toLowerCase() === groupCity.toLowerCase()
        );
      }

      setProfiles(filteredProfiles);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, selectedInstruments, distance, onlyLookingForGroup, groupCity, currentUserId]);

  useEffect(() => {
    if (open) fetchProfiles();
  }, [open, fetchProfiles]);

  const toggleInstrument = (instrument: string) => {
    setSelectedInstruments((prev) =>
      prev.includes(instrument)
        ? prev.filter((i) => i !== instrument)
        : [...prev, instrument]
    );
  };

  return (
    <Modal open={open} onClose={onClose} title="Chercher un musicien">
      <div className="space-y-4">
        {/* Filtres */}
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-zik-text mb-1 block">
              Rechercher par nom
            </label>
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Nom d'utilisateur..."
              className="bg-zik-card border-zik-border text-zik-text placeholder:text-zik-muted focus:ring-zik-purple/50"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-zik-text mb-1 block">
              Instruments
            </label>
            <div className="flex flex-wrap gap-2">
              {INSTRUMENTS.map((inst) => {
                const isSelected = selectedInstruments.includes(inst.key);
                return (
                  <button
                    key={inst.key}
                    onClick={() => toggleInstrument(inst.key)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                      isSelected
                        ? "bg-zik-purple text-white border-zik-purple"
                        : "bg-zik-card text-zik-muted border-zik-border hover:border-zik-purple hover:text-zik-purple"
                    }`}
                  >
                    <span>{inst.emoji}</span> {inst.label}
                  </button>
                );
              })}
            </div>
          </div>

          {groupCity && (
            <div>
              <label className="text-sm font-medium text-zik-text mb-1 block">
                Distance (km) - {groupCity}
              </label>
              <Input
                type="number"
                value={distance}
                onChange={(e) => setDistance(Number(e.target.value) || 0)}
                min="0"
                max="200"
                className="bg-zik-card border-zik-border text-zik-text placeholder:text-zik-muted focus:ring-zik-purple/50"
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-zik-text cursor-pointer">
              Uniquement ceux qui cherchent un groupe
            </label>
            <Button
              variant={onlyLookingForGroup ? "default" : "outline"}
              size="sm"
              className={`h-7 w-7 p-0 ${
                onlyLookingForGroup
                  ? "bg-zik-purple hover:bg-zik-indigo"
                  : "border-zik-border text-zik-muted hover:bg-zik-card-hover"
              }`}
              onClick={() => setOnlyLookingForGroup(!onlyLookingForGroup)}
            >
              {onlyLookingForGroup ? "✓" : "✗"}
            </Button>
          </div>
        </div>

        {/* Bouton de recherche */}
        <Button
          onClick={fetchProfiles}
          disabled={isLoading}
          className="w-full bg-zik-purple hover:bg-zik-indigo"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Recherche...
            </>
          ) : (
            <>
              <Search className="h-4 w-4 mr-2" />
              Rechercher
            </>
          )}
        </Button>

        {/* Résultats */}
        <div className="max-h-96 overflow-y-auto space-y-2">
          {profiles.length === 0 ? (
            <p className="text-sm text-zik-muted text-center py-4">
              Aucun musicien trouvé avec ces critères.
            </p>
          ) : (
            profiles.map((profile) => (
              <div
                key={profile.id}
                className="flex items-center justify-between gap-3 p-3 rounded-lg bg-zik-card/50 border border-zik-border"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <MemberAvatar profile={profile} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zik-text truncate">
                      {profile.username ?? "Inconnu"}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-0.5">
                      {profile.city && (
                        <span className="flex items-center gap-0.5 text-xs text-zik-muted">
                          <MapPin className="h-3 w-3" /> {profile.city}
                        </span>
                      )}
                      {profile.instruments?.map((inst) => {
                        const instrument = INSTRUMENTS.find((i) => i.key === inst);
                        return instrument ? (
                          <span
                            key={inst}
                            className="text-xs bg-zik-purple/10 text-zik-purple px-1.5 py-0.5 rounded-full"
                          >
                            {instrument.emoji} {instrument.label}
                          </span>
                        ) : null;
                      })}
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  className="bg-zik-purple/10 text-zik-purple hover:bg-zik-purple/20"
                  onClick={() => onInvite(profile.id)}
                >
                  <UserPlus className="h-3.5 w-3.5 mr-1" />
                  Inviter
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}