"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Ticket, Link as LinkIcon, Music2, Upload, X, Users } from "lucide-react";

const LocationPickerMap = dynamic(() => import("@/components/LocationPickerMap"), {
  ssr: false,
  loading: () => <div className="h-64 w-full bg-gray-200 animate-pulse rounded-lg" />,
});

const GENRES = ["Rock", "Jazz", "Blues", "Metal", "Pop", "Électro", "Folk", "Classique", "Hip-Hop", "Reggae", "Autre"];

interface UserGroup { id: string; name: string; }
interface ConcertCreationFormProps {
  onSuccess?: () => void;
  onClose?: () => void;
}

export default function ConcertCreationForm({ onSuccess, onClose }: ConcertCreationFormProps) {
  const supabase = createClient();

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
      {/* Titre */}
      <div>
        <label className="text-sm font-medium">Titre <span className="text-red-400">*</span></label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Soirée Jazz au Sunset" required />
      </div>

      {/* Artiste + Genre */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium flex items-center gap-1.5">
            <Music2 className="h-3.5 w-3.5 text-gray-400" /> Artiste / Groupe
          </label>
          <Input value={artist} onChange={(e) => setArtist(e.target.value)} placeholder="Ex: The Rolling Stones" />
        </div>
        <div>
          <label className="text-sm font-medium">Genre musical</label>
          <select value={genre} onChange={(e) => setGenre(e.target.value)}
            className="w-full border border-gray-200 rounded-md text-sm px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 mt-0.5">
            <option value="">Sélectionner...</option>
            {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="text-sm font-medium">Description</label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)}
          placeholder="Décrivez le concert..." rows={3} />
      </div>

      {/* Date + Heures */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-sm font-medium">Date <span className="text-red-400">*</span></label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <div>
          <label className="text-sm font-medium">Début <span className="text-red-400">*</span></label>
          <Input type="time" value={startHour} onChange={(e) => setStartHour(e.target.value)} required />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-600">Fin <span className="text-gray-400 font-normal">(optionnel)</span></label>
          <Input type="time" value={endHour} onChange={(e) => setEndHour(e.target.value)} />
        </div>
      </div>

      {/* Selector groupe */}
      {userGroups.length > 0 && (
        <div>
          <label className="text-sm font-medium mb-1 flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-gray-400" /> Organiser au nom d'un groupe <span className="text-gray-400 font-normal">(optionnel)</span>
          </label>
          <select
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
            className="w-full border border-gray-200 rounded-md text-sm px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
          >
            <option value="">Aucun groupe — concert personnel</option>
            {userGroups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Billetterie */}
      <div className="rounded-lg border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Ticket className={`h-5 w-5 ${isFree ? "text-green-500" : "text-orange-500"}`} />
            <div>
              <p className="text-sm font-medium">{isFree ? "Entrée gratuite" : "Entrée payante"}</p>
              <p className="text-xs text-gray-500">{isFree ? "Accès libre" : "Précise le prix et le lien de billetterie"}</p>
            </div>
          </div>
          <Switch checked={!isFree} onCheckedChange={(checked) => setIsFree(!checked)} />
        </div>
        {!isFree && (
          <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-3">
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block">Prix (€)</label>
              <Input type="number" min="0" step="0.5" value={price}
                onChange={(e) => setPrice(e.target.value)} placeholder="Ex: 15" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                <LinkIcon className="h-3 w-3" /> Lien billetterie (optionnel)
              </label>
              <Input value={ticketUrl} onChange={(e) => setTicketUrl(e.target.value)}
                placeholder="https://..." type="url" />
            </div>
          </div>
        )}
      </div>

      {/* Affiche */}
      <div>
        <label className="text-sm font-medium mb-2 block">Affiche (optionnel)</label>
        {posterPreview ? (
          <div className="relative w-full max-w-xs">
            <img src={posterPreview} alt="Aperçu affiche" className="rounded-lg w-full object-cover max-h-48 border border-gray-200" />
            <button type="button"
              onClick={() => { setPosterFile(null); setPosterPreview(null); }}
              className="absolute top-2 right-2 bg-white rounded-full p-1 shadow text-gray-500 hover:text-red-500 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-lg p-6 cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-colors">
            <Upload className="h-6 w-6 text-gray-400" />
            <span className="text-sm text-gray-500">Cliquez pour importer une image</span>
            <span className="text-xs text-gray-400">JPG, PNG — max 5 Mo</span>
            <input type="file" accept="image/*" className="hidden" onChange={handlePosterChange} />
          </label>
        )}
      </div>

      {/* Carte */}
      <div>
        <label className="text-sm font-medium mb-2 block">Lieu (cliquez sur la carte)</label>
        <div className="h-64 rounded-lg border border-gray-300 overflow-hidden" style={{ position: "relative", zIndex: 0 }}>
          <LocationPickerMap
            center={location}
            selectedLocation={selectedLocation}
            onLocationChange={({ lat, lng, address }) => {
              setSelectedLocation({ lat, lng });
              setLocation({ lat, lng, address });
            }}
          />
        </div>
        {location.address && <p className="text-sm text-gray-600 mt-2">📍 {location.address}</p>}
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <div className="flex gap-2 justify-end pt-1">
        <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>Annuler</Button>
        <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
          {isLoading ? "Création..." : "Créer le concert"}
        </Button>
      </div>
    </form>
  );
}