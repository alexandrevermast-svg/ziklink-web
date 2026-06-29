"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Lock, Unlock } from "lucide-react";

const LocationPickerMap = dynamic(() => import("@/components/LocationPickerMap"), {
  ssr: false,
  loading: () => <div className="h-64 w-full bg-gray-200 animate-pulse rounded-lg" />,
});

interface JamEditFormProps {
  jam: {
    id: string; title: string; description: string; start_time: string;
    end_at: string | null; location: string; is_open: boolean;
  };
  onSuccess?: () => void;
  onClose?: () => void;
}

export default function JamEditForm({ jam, onSuccess, onClose }: JamEditFormProps) {
  const supabase = createClient();

  // Parse existing location
  const parsedLoc = (() => { try { return JSON.parse(jam.location); } catch { return { lat: 48.8566, lng: 2.3522, address: "" }; } })();

  const [title, setTitle] = useState(jam.title);
  const [description, setDescription] = useState(jam.description);
  const [date, setDate] = useState(jam.start_time.slice(0, 10));
  const [startHour, setStartHour] = useState(jam.start_time.slice(11, 16));
  const [endHour, setEndHour] = useState(jam.end_at ? jam.end_at.slice(11, 16) : "");
  const [isOpen, setIsOpen] = useState(jam.is_open);
  const [location, setLocation] = useState<{ lat: number; lng: number; address: string }>(parsedLoc);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>({ lat: parsedLoc.lat, lng: parsedLoc.lng });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      if (!title || !date || !startHour) {
        setError("Titre, date et heure de début sont obligatoires");
        setIsLoading(false);
        return;
      }
      const start_time = `${date}T${startHour}:00`;
      const end_at = endHour ? `${date}T${endHour}:00` : null;
      if (end_at && end_at <= start_time) {
        setError("L'heure de fin doit être après l'heure de début");
        setIsLoading(false);
        return;
      }

      const { error: updateError } = await supabase
        .from("jam_sessions")
        .update({ title, description, start_time, end_at, location: JSON.stringify(location), is_open: isOpen })
        .eq("id", jam.id);

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
      <div>
        <label className="text-sm font-medium">Titre</label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>
      <div>
        <label className="text-sm font-medium">Description</label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} required />
      </div>
      <div className="grid grid-cols-3 gap-4 items-end">
        <div className="col-span-1">
          <label className="text-sm font-medium">Date</label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <div>
          <label className="text-sm font-medium">Début</label>
          <Input type="time" value={startHour} onChange={(e) => setStartHour(e.target.value)} required />
        </div>
        <div>
          <label className="text-sm font-medium">Fin <span className="text-gray-400 font-normal">(optionnel)</span></label>
          <Input type="time" value={endHour} onChange={(e) => setEndHour(e.target.value)} />
        </div>
      </div>

      {/* Ouverture */}
      <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-3">
          {isOpen ? <Unlock className="h-5 w-5 text-green-500" /> : <Lock className="h-5 w-5 text-orange-500" />}
          <div>
            <p className="text-sm font-medium">{isOpen ? "Jam ouverte" : "Sur approbation"}</p>
            <p className="text-xs text-gray-500">
              {isOpen ? "Tout le monde peut rejoindre librement" : "Tu devras accepter chaque participant"}
            </p>
          </div>
        </div>
        <Switch checked={isOpen} onCheckedChange={setIsOpen} />
      </div>

      {/* Carte */}
      <div>
        <label className="text-sm font-medium mb-2 block">Lieu (cliquez sur la carte pour modifier)</label>
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

      {error && <div className="text-red-600 text-sm">{error}</div>}
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>Annuler</Button>
        <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
          {isLoading ? "Enregistrement..." : "Enregistrer les modifications"}
        </Button>
      </div>
    </form>
  );
}