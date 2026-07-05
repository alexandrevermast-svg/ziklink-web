"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Lock, Unlock } from "lucide-react";
import moment from 'moment-timezone';


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
      const start_timeLocal = `${date}T${startHour}:00`;
            const start_time = moment.tz(start_timeLocal, moment.tz.guess()).utc().format();
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
  <form onSubmit={handleSubmit} className="space-y-6">

    {/* Informations */}
    <div className="zik-card p-5 space-y-5">
      <div>
        <label className="block text-sm font-medium text-zik-text mb-2">
          Titre
        </label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="zik-input"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-zik-text mb-2">
          Description
        </label>

        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          className="zik-input min-h-28 resize-none"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        <div>
          <label className="block text-sm font-medium text-zik-text mb-2">
            Date
          </label>

          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="zik-input"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zik-text mb-2">
            Début
          </label>

          <Input
            type="time"
            value={startHour}
            onChange={(e) => setStartHour(e.target.value)}
            required
            className="zik-input"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zik-text mb-2">
            Fin
            <span className="ml-2 text-zik-muted font-normal">
              (optionnel)
            </span>
          </label>

          <Input
            type="time"
            value={endHour}
            onChange={(e) => setEndHour(e.target.value)}
            className="zik-input"
          />
        </div>

      </div>
    </div>

    {/* Ouverture */}
    <div className="zik-card zik-card-accent p-5 flex items-center justify-between">

      <div className="flex items-center gap-4">

        <div
          className={`h-10 w-10 rounded-full flex items-center justify-center ${
            isOpen
              ? "bg-zik-emerald/15 text-zik-emerald"
              : "bg-zik-orange/15 text-zik-orange"
          }`}
        >
          {isOpen ? (
            <Unlock className="h-5 w-5" />
          ) : (
            <Lock className="h-5 w-5" />
          )}
        </div>

        <div>
          <p className="font-medium text-zik-text">
            {isOpen ? "Jam ouverte" : "Sur approbation"}
          </p>

          <p className="text-sm text-zik-muted mt-1">
            {isOpen
              ? "Tout le monde peut rejoindre librement."
              : "Tu devras accepter chaque participant."}
          </p>
        </div>

      </div>

      <Switch
        checked={isOpen}
        onCheckedChange={setIsOpen}
      />

    </div>

    {/* Carte */}
    <div className="zik-card p-5">

      <label className="block text-sm font-medium text-zik-text mb-3">
        Lieu
      </label>

      <p className="text-sm text-zik-muted mb-4">
        Clique sur la carte pour modifier l'emplacement de la jam.
      </p>

      <div
        className="h-64 rounded-xl overflow-hidden border border-zik-border"
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
        <div className="mt-4 flex items-center gap-2 text-sm text-zik-muted">
          <span className="text-zik-purple">📍</span>
          {location.address}
        </div>
      )}

    </div>

    {error && (
      <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-zik-red">
        {error}
      </div>
    )}

    <div className="flex justify-end gap-3 pt-2">

      <Button
        type="button"
        onClick={onClose}
        disabled={isLoading}
        className="zik-btn-secondary"
      >
        Annuler
      </Button>

      <Button
        type="submit"
        disabled={isLoading}
        className="zik-btn-primary"
      >
        {isLoading
          ? "Enregistrement..."
          : "Enregistrer les modifications"}
      </Button>

    </div>

  </form>
);
}