"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { User, Users, Upload, X, Youtube } from "lucide-react";
import AddressSearchInput from "@/components/AddressSearchInput";
import { getYouTubeVideoId } from "@/lib/youtube";
import type { MusicianAd } from "@/types";

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

const STATUSES = [
  { key: "amateur", label: "Amateur" },
  { key: "pro", label: "Pro" },
];

interface MyGroup { id: string; name: string; }

interface AdFormProps {
  ad?: MusicianAd;
  onSuccess?: () => void;
  onClose?: () => void;
}

export default function AdForm({ ad, onSuccess, onClose }: AdFormProps) {
  const supabase = createClient();
  const isEdit = !!ad;

  const [mode, setMode] = useState<"musicien" | "groupe">((ad?.mode as "musicien" | "groupe") ?? "musicien");
  const [title, setTitle] = useState(ad?.title ?? "");
  const [instrument, setInstrument] = useState(ad?.instrument ?? "");
  const [genres, setGenres] = useState<string[]>(ad?.genres ?? []);
  const [city, setCity] = useState(ad?.city ?? "");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    ad?.lat != null && ad?.lng != null ? { lat: ad.lat, lng: ad.lng } : null
  );
  const [status, setStatus] = useState<string>(ad?.status && ad.status !== "indifferent" ? ad.status : "amateur");
  const [description, setDescription] = useState(ad?.description ?? "");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(ad?.photo_url ?? null);
  const [videoUrl, setVideoUrl] = useState(ad?.video_url ?? "");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [myGroups, setMyGroups] = useState<MyGroup[]>([]);
  const [groupId, setGroupId] = useState<string>(ad?.group_id ?? "");

  useEffect(() => {
    const fetchGroups = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("group_members")
        .select("group_id, groups(id, name)")
        .eq("user_id", user.id);
      const groups: MyGroup[] = (data ?? []).map((row: any) => row.groups).filter(Boolean);
      setMyGroups(groups);
    };
    fetchGroups();
  }, []);

  const toggleGenre = (g: string) => {
    setGenres((prev) => prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError("Vous devez être connecté"); setIsLoading(false); return; }
      if (!title.trim()) { setError("Le titre est obligatoire"); setIsLoading(false); return; }
      if (videoUrl.trim() && !getYouTubeVideoId(videoUrl.trim())) {
        setError("Le lien vidéo doit être un lien YouTube valide.");
        setIsLoading(false);
        return;
      }

      let photoUrl = ad?.photo_url ?? null;
      if (photoFile) {
        const ext = photoFile.name.split(".").pop();
        const path = `musician-ads/${user.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("avatars").upload(path, photoFile, { upsert: true });
        if (uploadError) {
          setError(`Échec de l'envoi de la photo : ${uploadError.message}`);
          setIsLoading(false);
          return;
        }
        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
        photoUrl = urlData.publicUrl;
      }

      const payload = {
        mode,
        title: title.trim(),
        instrument: instrument || null,
        genres,
        city: city.trim() || null,
        lat: location?.lat ?? null,
        lng: location?.lng ?? null,
        status,
        description: description.trim() || null,
        group_id: mode === "groupe" && groupId ? groupId : null,
        photo_url: photoUrl,
        video_url: videoUrl.trim() || null,
      };

      const { error: dbError } = isEdit
        ? await supabase.from("musician_ads").update(payload).eq("id", ad.id)
        : await supabase.from("musician_ads").insert({ ...payload, created_by: user.id });

      if (dbError) { setError(`Erreur : ${dbError.message}`); setIsLoading(false); return; }
      onSuccess?.();
      onClose?.();
    } catch {
      setError("Une erreur s'est produite");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium text-zik-text mb-1.5 block">
          Type d&apos;annonce <span className="text-zik-red">*</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setMode("musicien")}
            className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
              mode === "musicien"
                ? "border-zik-purple/40 bg-zik-purple/10 text-zik-purple"
                : "border-zik-border text-zik-muted hover:border-zik-purple/30"
            }`}
          >
            <User className="h-4 w-4" /> Musiciens
          </button>
          <button
            type="button"
            onClick={() => setMode("groupe")}
            className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
              mode === "groupe"
                ? "border-zik-purple/40 bg-zik-purple/10 text-zik-purple"
                : "border-zik-border text-zik-muted hover:border-zik-purple/30"
            }`}
          >
            <Users className="h-4 w-4" /> Groupes
          </button>
        </div>
      </div>

      {mode === "groupe" && myGroups.length > 0 && (
        <div>
          <label className="text-sm font-medium text-zik-text mb-1 flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-zik-purple" /> Publier au nom d&apos;un groupe <span className="text-zik-muted font-normal">(optionnel)</span>
          </label>
          <select
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            className="w-full border-zik-border rounded-md text-sm px-3 py-2 bg-zik-card text-zik-text focus:outline-none focus:ring-2 focus:ring-zik-purple"
          >
            <option value="">Aucun — en mon nom</option>
            {myGroups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="text-sm font-medium text-zik-text">
          Titre <span className="text-zik-red">*</span>
        </label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={mode === "musicien" ? "Ex: Cherche un groupe, guitariste dispo pour reprises..." : "Ex: Cherche batteur pour groupe rock"}
          required
          className="bg-zik-card border-zik-border text-zik-text placeholder:text-zik-muted focus:ring-zik-purple/50"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-zik-text">Instrument</label>
        <select
          value={instrument}
          onChange={(e) => setInstrument(e.target.value)}
          className="w-full border-zik-border rounded-md text-sm px-3 py-2 bg-zik-card text-zik-text focus:outline-none focus:ring-2 focus:ring-zik-purple mt-0.5"
        >
          <option value="">Sélectionner...</option>
          {INSTRUMENTS.map((i) => <option key={i.key} value={i.key}>{i.emoji} {i.label}</option>)}
        </select>
      </div>

      <div>
        <label className="text-sm font-medium text-zik-text mb-1 block">Ville</label>
        <AddressSearchInput
          value={city}
          placeholder="Ex: Paris"
          onChange={({ address, lat, lng }) => { setCity(address); setLocation({ lat, lng }); }}
          onClear={() => { setCity(""); setLocation(null); }}
        />
      </div>

      <div>
        <label className="text-sm font-medium text-zik-text mb-1.5 block">Statut</label>
        <div className="flex gap-2">
          {STATUSES.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setStatus(s.key)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                status === s.key
                  ? "bg-zik-purple text-white border-zik-purple"
                  : "bg-zik-card text-zik-muted border-zik-border hover:border-zik-purple hover:text-zik-purple"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-zik-text mb-1.5 block">Styles</label>
        <div className="flex flex-wrap gap-2">
          {GENRES.map((g) => {
            const isSelected = genres.includes(g);
            return (
              <button
                key={g}
                type="button"
                onClick={() => toggleGenre(g)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
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

      <div>
        <label className="text-sm font-medium text-zik-text mb-2 block">Photo (optionnel)</label>
        {photoPreview ? (
          <div className="relative w-full max-w-xs">
            <img
              src={photoPreview}
              alt="Aperçu"
              className="rounded-lg w-full object-cover max-h-48 border border-zik-border"
            />
            <button
              type="button"
              onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
              className="absolute top-2 right-2 bg-zik-card rounded-full p-1 shadow text-zik-muted hover:text-zik-red transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-zik-border rounded-lg p-6 cursor-pointer hover:border-zik-purple hover:bg-zik-purple/5 transition-colors">
            <Upload className="h-6 w-6 text-zik-muted" />
            <span className="text-sm text-zik-muted">Cliquez pour importer une image</span>
            <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
          </label>
        )}
      </div>

      <div>
        <label className="text-sm font-medium text-zik-text flex items-center gap-1.5">
          <Youtube className="h-3.5 w-3.5 text-zik-red" /> Vidéo YouTube <span className="text-zik-muted font-normal">(optionnel)</span>
        </label>
        <Input
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
          type="url"
          className="bg-zik-card border-zik-border text-zik-text placeholder:text-zik-muted focus:ring-zik-purple/50 mt-0.5"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-zik-text">Description</label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Décrivez votre recherche ou votre profil..."
          rows={4}
          className="bg-zik-card border-zik-border text-zik-text placeholder:text-zik-muted focus:ring-zik-purple/50"
        />
      </div>

      {error && <p className="text-zik-red text-sm">{error}</p>}

      <div className="flex gap-2 justify-end pt-1">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isLoading}
          className="border-zik-border text-zik-text hover:bg-zik-card-hover hover:text-zik-text"
        >
          Annuler
        </Button>
        <Button
          type="submit"
          className="bg-zik-purple hover:bg-zik-indigo text-white disabled:opacity-50"
          disabled={isLoading}
        >
          {isLoading ? "Enregistrement..." : isEdit ? "Enregistrer les modifications" : "Publier l'annonce"}
        </Button>
      </div>
    </form>
  );
}
