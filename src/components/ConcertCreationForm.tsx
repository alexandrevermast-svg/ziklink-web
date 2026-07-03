"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Ticket, Link as LinkIcon, Music2, Upload, X, Users } from "lucide-react";
import { Calendar } from "@/components/ui/calendar"; // ✅ Importe le Calendar personnalisé
import { fr } from "date-fns/locale"; // ✅ Pour la localisation en français
import { format } from "date-fns"; // ✅ Pour formater la date
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"; // ✅ Ton Popover
import { cn } from "@/lib/utils";

const LocationPickerMap = dynamic(() => import("@/components/LocationPickerMap"), {
  ssr: false,
  // ✅ Loading avec ton thème
  loading: () => <div className="h-64 w-full bg-zik-card animate-pulse rounded-lg" />,
});

const GENRES = ["Rock", "Jazz", "Blues", "Metal", "Pop", "Électro", "Folk", "Classique", "Hip-Hop", "Reggae", "Autre"];

interface UserGroup { id: string; name: string; }

interface ConcertCreationFormProps {
  onSuccess?: () => void;
  onClose?: () => void;
}

export default function ConcertCreationForm({ onSuccess, onClose }: ConcertCreationFormProps) {
  const supabase = createClient();

  // États du formulaire
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [artist, setArtist] = useState("");
  const [genre, setGenre] = useState("");
  const [date, setDate] = useState("");
  const [startHour, setStartHour] = useState("");
  const [endHour, setEndHour] = useState("");
  const [isFree, setIsFree] = useState(true);
  const [price, setPrice] = useState("");
  const [ticketUrl, setTicketUrl] = useState("");
  const [location, setLocation] = useState({ lat: 48.8566, lng: 2.3522, address: "" });
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [posterPreview, setPosterPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [userGroups, setUserGroups] = useState<UserGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");

  // Récupération des groupes de l'utilisateur
  useEffect(() => {
    const fetchGroups = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("group_members")
        .select("group_id, groups(id, name)")
        .eq("user_id", user.id);
      const groups: UserGroup[] = (data ?? []).map((row: any) => row.groups).filter(Boolean);
      setUserGroups(groups);
    };
    fetchGroups();
  }, []);

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

      let posterUrl: string | null = null;
      if (posterFile) {
        const ext = posterFile.name.split(".").pop();
        const path = `concerts/${user.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(path, posterFile, { upsert: true });
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
          posterUrl = urlData.publicUrl;
        }
      }

      const { data: result, error: rpcError } = await supabase.rpc('create_concert', {
        p_title: title,
        p_description: description || null,
        p_artist: artist || null,
        p_genre: genre || null,
        p_start_time: `${date}T${startHour}:00`,
        p_end_at: endHour ? `${date}T${endHour}:00` : null,
        p_location: JSON.stringify(location),
        p_is_free: isFree,
        p_price: !isFree && price ? parseFloat(price) : null,
        p_ticket_url: ticketUrl || null,
        p_poster_url: posterUrl,
        p_group_id: selectedGroupId || null,
      });

      if (rpcError || !result || result.length === 0) {
        setError(`Erreur: ${rpcError?.message ?? 'inconnue'}`);
        setIsLoading(false);
        return;
      }
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
      {/* ✅ Titre */}
      <div>
        <label className="text-sm font-medium text-zik-text">
          Titre <span className="text-zik-red">*</span>
        </label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex: Soirée Jazz au Sunset"
          required
          className="bg-zik-card border-zik-border text-zik-text placeholder:text-zik-muted focus:ring-zik-purple/50"
        />
      </div>

      {/* Artiste + Genre */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium text-zik-text flex items-center gap-1.5">
            <Music2 className="h-3.5 w-3.5 text-zik-purple" /> Artiste / Groupe
          </label>
          <Input
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            placeholder="Ex: The Rolling Stones"
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

      {/* Description */}
      <div>
        <label className="text-sm font-medium text-zik-text">Description</label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Décrivez le concert..."
          rows={3}
          className="bg-zik-card border-zik-border text-zik-text placeholder:text-zik-muted focus:ring-zik-purple/50"
        />
      </div>

      {/* Date + Heures */}
     <div className="grid grid-cols-1 gap-3">
  {/* Date */}
<div>
  <label className="text-sm font-medium text-zik-text">
    Date <span className="text-zik-red">*</span>
  </label>
  <Popover>
    <PopoverTrigger asChild>
      <Button
        variant="outline"
        className={cn(
          "w-full justify-start text-left font-normal bg-zik-card border-zik-border text-zik-text hover:bg-zik-card-hover",
          !date && "text-zik-muted"
        )}
      >
        {date ? format(new Date(date), "PPP", { locale: fr }) : <span>Sélectionnez une date</span>}
      </Button>
    </PopoverTrigger>
    {/* ✅ PopoverContent avec une largeur minimale de 320px */}
    <PopoverContent
      className="w-[320px] p-0 bg-zik-card border-zik-border shadow-lg"
      align="start"
      sideOffset={8} // ✅ Espacement entre le bouton et le Popover
    >
      <Calendar
        mode="single"
        selected={date ? new Date(date) : undefined}
        onSelect={(selectedDate) => {
          if (selectedDate) {
            const year = selectedDate.getFullYear();
            const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
            const day = String(selectedDate.getDate()).padStart(2, '0');
            setDate(`${year}-${month}-${day}`);
          }
        }}
        locale={fr}
        initialFocus
        // ✅ Personnalisation supplémentaire pour le Calendar
        classNames={{
          root: "w-full",
          months: "flex flex-col gap-4",
          month: "flex w-full flex-col gap-4",
          nav: "flex items-center justify-between gap-2 px-2",
          button_previous: "h-8 w-8 p-0 text-zik-purple hover:bg-zik-card-hover",
          button_next: "h-8 w-8 p-0 text-zik-purple hover:bg-zik-card-hover",
          month_caption: "flex h-8 w-full items-center justify-center px-4 text-zik-text font-medium",
          weekday: "text-zik-muted text-[0.9rem] font-medium",
          day: "h-8 w-8 text-[0.9rem] font-medium text-zik-text hover:bg-zik-card-hover rounded-md",
          day_selected: "bg-zik-purple text-white hover:bg-zik-purple/90",
          day_today: "bg-zik-purple/10 text-zik-text border border-zik-purple/30 rounded-md",
        }}
      />
    </PopoverContent>
  </Popover>
</div>
  <div className="grid grid-cols-2 gap-3">
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
</div>

      {/* Selector groupe */}
      {userGroups.length > 0 && (
        <div>
          <label className="text-sm font-medium text-zik-text mb-1 flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-zik-purple" /> Organiser au nom d'un groupe <span className="text-zik-muted font-normal">(optionnel)</span>
          </label>
          <select
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
            className="w-full border-zik-border rounded-md text-sm px-3 py-2 bg-zik-card text-zik-text focus:outline-none focus:ring-2 focus:ring-zik-purple"
          >
            <option value="">Aucun groupe — concert personnel</option>
            {userGroups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Billetterie */}
      <div className="rounded-lg border border-zik-border overflow-hidden bg-zik-card/50">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Ticket className={`h-5 w-5 ${isFree ? "text-zik-emerald" : "text-zik-orange"}`} />
            <div>
              <p className="text-sm font-medium text-zik-text">{isFree ? "Entrée gratuite" : "Entrée payante"}</p>
              <p className="text-xs text-zik-muted">{isFree ? "Accès libre" : "Précise le prix et le lien de billetterie"}</p>
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
            <div className="flex-1">
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
        <label className="text-sm font-medium text-zik-text mb-2 block">Affiche (optionnel)</label>
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
            <span className="text-xs text-zik-subtle">JPG, PNG — max 5 Mo</span>
            <input type="file" accept="image/*" className="hidden" onChange={handlePosterChange} />
          </label>
        )}
      </div>

      {/* Carte */}
      <div>
        <label className="text-sm font-medium text-zik-text mb-2 block">Lieu (cliquez sur la carte)</label>
        <div className="h-64 rounded-lg border border-zik-border overflow-hidden bg-zik-card">
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
      {error && (
        <p className="text-zik-red text-sm">
          {error}
        </p>
      )}

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
          {isLoading ? "Création..." : "Créer le concert"}
        </Button>
      </div>
    </form>
  );
}