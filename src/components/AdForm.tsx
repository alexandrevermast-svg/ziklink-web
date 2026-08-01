"use client";

import React, { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Search, UserCheck } from "lucide-react";
import type { MusicianAd } from "@/types";

const INSTRUMENTS = [
  { key: "chant", label: "Chant", emoji: "🎤" },
  { key: "guitare", label: "Guitare", emoji: "🎸" },
  { key: "basse", label: "Basse", emoji: "🎵" },
  { key: "batterie", label: "Batterie", emoji: "🥁" },
  { key: "clavier", label: "Clavier", emoji: "🎹" },
  { key: "autres", label: "Autres", emoji: "🎶" },
];

const GENRES = ["Rock", "Jazz", "Blues", "Metal", "Pop", "Électro", "Folk", "Classique", "Hip-Hop", "Reggae", "Autre"];

const STATUSES = [
  { key: "indifferent", label: "Indifférent" },
  { key: "amateur", label: "Amateur" },
  { key: "pro", label: "Pro" },
];

interface AdFormProps {
  ad?: MusicianAd;
  onSuccess?: () => void;
  onClose?: () => void;
}

export default function AdForm({ ad, onSuccess, onClose }: AdFormProps) {
  const supabase = createClient();
  const isEdit = !!ad;

  const [mode, setMode] = useState<"recherche" | "disponible">((ad?.mode as "recherche" | "disponible") ?? "recherche");
  const [title, setTitle] = useState(ad?.title ?? "");
  const [instrument, setInstrument] = useState(ad?.instrument ?? "");
  const [genres, setGenres] = useState<string[]>(ad?.genres ?? []);
  const [city, setCity] = useState(ad?.city ?? "");
  const [status, setStatus] = useState<string>(ad?.status ?? "indifferent");
  const [description, setDescription] = useState(ad?.description ?? "");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleGenre = (g: string) => {
    setGenres((prev) => prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError("Vous devez être connecté"); setIsLoading(false); return; }
      if (!title.trim()) { setError("Le titre est obligatoire"); setIsLoading(false); return; }

      const payload = {
        mode,
        title: title.trim(),
        instrument: instrument || null,
        genres,
        city: city.trim() || null,
        status,
        description: description.trim() || null,
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
            onClick={() => setMode("recherche")}
            className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
              mode === "recherche"
                ? "border-zik-purple/40 bg-zik-purple/10 text-zik-purple"
                : "border-zik-border text-zik-muted hover:border-zik-purple/30"
            }`}
          >
            <Search className="h-4 w-4" /> Je cherche
          </button>
          <button
            type="button"
            onClick={() => setMode("disponible")}
            className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
              mode === "disponible"
                ? "border-zik-purple/40 bg-zik-purple/10 text-zik-purple"
                : "border-zik-border text-zik-muted hover:border-zik-purple/30"
            }`}
          >
            <UserCheck className="h-4 w-4" /> Je suis dispo
          </button>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-zik-text">
          Titre <span className="text-zik-red">*</span>
        </label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={mode === "recherche" ? "Ex: Cherche batteur pour groupe rock" : "Ex: Guitariste dispo pour reprises"}
          required
          className="bg-zik-card border-zik-border text-zik-text placeholder:text-zik-muted focus:ring-zik-purple/50"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
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
          <label className="text-sm font-medium text-zik-text">Ville</label>
          <Input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Ex: Paris"
            className="bg-zik-card border-zik-border text-zik-text placeholder:text-zik-muted focus:ring-zik-purple/50 mt-0.5"
          />
        </div>
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
