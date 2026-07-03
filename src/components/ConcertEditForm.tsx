"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Ticket, Link as LinkIcon, Music2, Upload, X } from "lucide-react";

const LocationPickerMap = dynamic(() => import("@/components/LocationPickerMap"), {
  ssr: false,
  loading: () => <div className="h-64 w-full bg-gray-200 animate-pulse rounded-lg" />,
});

const GENRES = ["Rock", "Jazz", "Blues", "Metal", "Pop", "Électro", "Folk", "Classique", "Hip-Hop", "Reggae", "Autre"];

interface ConcertEditFormProps {
  concert: {
    id: string; title: string; description: string | null;
    artist: string | null; genre: string | null;
    start_time: string; end_at: string | null; location: string;
    is_free: boolean; price: number | null; ticket_url: string | null;
    poster_url: string | null;
  };
  onSuccess?: () => void;
  onClose?: () => void;
}

export default function ConcertEditForm({ concert, onSuccess, onClose }: ConcertEditFormProps) {
  const supabase = createClient();

  const parsedLoc = (() => { try { return JSON.parse(concert.location); } catch { return { lat: 48.8566, lng: 2.3522, address: "" }; } })();

  const [title, setTitle] = useState(concert.title);
  const [description, setDescription] = useState(concert.description ?? "");
  const [artist, setArtist] = useState(concert.artist ?? "");
  const [genre, setGenre] = useState(concert.genre ?? "");
  const [date, setDate] = useState(concert.start_time.slice(0, 10));
  const [startHour, setStartHour] = useState(concert.start_time.slice(11, 16));
  const [endHour, setEndHour] = useState(concert.end_at ? concert.end_at.slice(11, 16) : "");
  const [isFree, setIsFree] = useState(concert.is_free);
  const [price, setPrice] = useState(concert.price ? String(concert.price) : "");
  const [ticketUrl, setTicketUrl] = useState(concert.ticket_url ?? "");
  const [location, setLocation] = useState<{ lat: number; lng: number; address: string }>(parsedLoc);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>({ lat: parsedLoc.lat, lng: parsedLoc.lng });
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [posterPreview, setPosterPreview] = useState<string | null>(concert.poster_url);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePosterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPosterFile(file);
    setPosterPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError("Vous devez être connecté"); setIsLoading(false); return; }
      if (!title || !date || !startHour) {
        setError("Titre, date et heure de début sont obligatoires");
        setIsLoading(false);
        return;
      }

      let posterUrl = concert.poster_url;
      if (posterFile) {
        const ext = posterFile.name.split(".").pop();
        const path = `concerts/${user.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("avatars").upload(path, posterFile, { upsert: true });
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
          posterUrl = urlData.publicUrl;
        }
      }

      const { error: updateError } = await supabase
        .from("concerts")
        .update({
          title,
          description: description || null,
          artist: artist || null,
          genre: genre || null,
          start_time: `${date}T${startHour}:00`,
          end_at: endHour ? `${date}T${endHour}:00` : null,
          location: JSON.stringify(location),
          is_free: isFree,
          price: !isFree && price ? parseFloat(price) : null,
          ticket_url: ticketUrl || null,
          poster_url: posterUrl,
        })
        .eq("id", concert.id);

      if (updateError) { setError(`Erreur : ${updateError.message}`); setIsLoading(false); return; }
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
    {/* Titre */}
    <div>
      <label className="text-sm font-medium text-zik-text">
        Titre <span className="text-zik-red">*</span>
      </label>
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
        className="bg-zik-card border-zik-border text-zik-text placeholder:text-zik-muted focus:ring-zik-purple/50"
      />
    </div>

    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="text-sm font-medium text-zik-text flex items-center gap-1.5">
          <Music2 className="h-3.5 w-3.5 text-zik-purple" /> Artiste / Groupe
        </label>
        <Input
          value={artist}
          onChange={(e) => setArtist(e.target.value)}
          className="bg-zik-card border-zik-border text-zik-text placeholder:text-zik-muted focus:ring-zik-purple/50 mt-0.5"
        />
      </div>
      <div>
        <label className="text-sm font-medium text-zik-text">Genre musical</label>
        <select
          value={genre}
          onChange={(e) => setGenre(e.target.value)}
          className="w-full border-zik-border rounded-md text-sm px-3 py-2 bg-zik-card text-zik-text focus:outline-none focus:ring-2 focus:ring-zik-purple mt-0.5"
        >
          <option value="">Sélectionner...</option>
          {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>
    </div>

    <div>
      <label className="text-sm font-medium text-zik-text">Description</label>
      <Textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
        className="bg-zik-card border-zik-border text-zik-text placeholder:text-zik-muted focus:ring-zik-purple/50"
      />
    </div>

    <div className="grid grid-cols-3 gap-3">
      <div>
        <label className="text-sm font-medium text-zik-text">
          Date <span className="text-zik-red">*</span>
        </label>
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          className="bg-zik-card border-zik-border text-zik-text scheme-dark focus:ring-zik-purple/50"
        />
      </div>
      <div>
        <label className="text-sm font-medium text-zik-text">
          Début <span className="text-zik-red">*</span>
        </label>
        <Input
          type="time"
          value={startHour}
          onChange={(e) => setStartHour(e.target.value)}
          required
          className="bg-zik-card border-zik-border text-zik-text scheme-dark focus:ring-zik-purple/50"
        />
      </div>
      <div>
        <label className="text-sm font-medium text-zik-muted">
          Fin <span className="text-zik-muted font-normal">(optionnel)</span>
        </label>
        <Input
          type="time"
          value={endHour}
          onChange={(e) => setEndHour(e.target.value)}
          className="bg-zik-card border-zik-border text-zik-text scheme-dark focus:ring-zik-purple/50"
        />
      </div>
    </div>

    {/* Billetterie */}
    <div className="rounded-lg border border-zik-border overflow-hidden bg-zik-card/50">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <Ticket className={`h-5 w-5 ${isFree ? "text-zik-emerald" : "text-zik-orange"}`} />
          <div>
            <p className="text-sm font-medium text-zik-text">
              {isFree ? "Entrée gratuite" : "Entrée payante"}
            </p>
            <p className="text-xs text-zik-muted">
              {isFree ? "Accès libre" : "Précise le prix et le lien de billetterie"}
            </p>
          </div>
        </div>
        <Switch
          checked={!isFree}
          onCheckedChange={(checked) => setIsFree(!checked)}
          className="data-[state=checked]:bg-zik-purple data-[state=unchecked]:bg-zik-card-hover"
        />
      </div>
      {!isFree && (
        <div className="border-t border-zik-border bg-zik-card/30 p-4 space-y-3">
          <div>
            <label className="text-xs text-zik-muted mb-1 block">Prix (€)</label>
            <Input
              type="number"
              min="0"
              step="0.5"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Ex: 15"
              className="bg-zik-card border-zik-border text-zik-text placeholder:text-zik-muted focus:ring-zik-purple/50"
            />
          </div>
          <div>
            <label className="text-xs text-zik-muted mb-1 flex items-center gap-1">
              <LinkIcon className="h-3 w-3" /> Lien billetterie (optionnel)
            </label>
            <Input
              value={ticketUrl}
              onChange={(e) => setTicketUrl(e.target.value)}
              placeholder="https://..."
              type="url"
              className="bg-zik-card border-zik-border text-zik-text placeholder:text-zik-muted focus:ring-zik-purple/50"
            />
          </div>
        </div>
      )}
    </div>

    {/* Affiche */}
    <div>
      <label className="text-sm font-medium text-zik-text mb-2 block">Affiche</label>
      {posterPreview ? (
        <div className="relative w-full max-w-xs">
          <img
            src={posterPreview}
            alt="Aperçu affiche"
            className="rounded-lg w-full object-cover max-h-48 border border-zik-border"
          />
          <button
            type="button"
            onClick={() => { setPosterFile(null); setPosterPreview(null); }}
            className="absolute top-2 right-2 bg-zik-card rounded-full p-1 shadow text-zik-muted hover:text-zik-red transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-zik-border rounded-lg p-6 cursor-pointer hover:border-zik-purple hover:bg-zik-purple/5 transition-colors">
          <Upload className="h-6 w-6 text-zik-muted" />
          <span className="text-sm text-zik-muted">Cliquez pour importer une image</span>
          <input type="file" accept="image/*" className="hidden" onChange={handlePosterChange} />
        </label>
      )}
    </div>

    {/* Carte */}
    <div>
      <label className="text-sm font-medium text-zik-text mb-2 block">
        Lieu (cliquez sur la carte pour modifier)
      </label>
      <div
        className="h-64 rounded-lg border border-zik-border overflow-hidden bg-zik-card"
        style={{ position: "relative", zIndex: 0 }}
      >
        <LocationPickerMap
          center={location}
          selectedLocation={selectedLocation}
          onLocationChange={({ lat, lng, address }) => {
            setSelectedLocation({ lat, lng });
            setLocation({ lat, lng, address });
          }}
        />
      </div>
      {location.address && (
        <p className="text-sm text-zik-muted mt-2">📍 {location.address}</p>
      )}
    </div>

    {/* Erreur */}
    {error && <p className="text-zik-red text-sm">{error}</p>}

    {/* Boutons */}
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
        {isLoading ? "Enregistrement..." : "Enregistrer les modifications"}
      </Button>
    </div>
  </form>
);
}