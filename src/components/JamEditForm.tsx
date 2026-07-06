"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Lock, Unlock, CalendarDays, MapPin } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { fr } from "date-fns/locale";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import TimePicker from "@/components/ui/TimePicker";
import AddressSearchInput from "@/components/AddressSearchInput";
import moment from 'moment-timezone';

const LocationPickerMap = dynamic(() => import("@/components/LocationPickerMap"), {
  ssr: false,
  loading: () => <div className="h-64 w-full bg-zik-card animate-pulse rounded-lg" />,
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

  const parsedLoc = (() => {
    try { return JSON.parse(jam.location); }
    catch { return { lat: 48.8566, lng: 2.3522, address: "" }; }
  })();

  // ── États séparés par champ (pattern de JamEditForm) ─────────────────
  const [title, setTitle] = useState(jam.title);
  const [description, setDescription] = useState(jam.description);
  const [date, setDate] = useState(jam.start_time.slice(0, 10));
  const [startHour, setStartHour] = useState(jam.start_time.slice(11, 16));
  const [endHour, setEndHour] = useState(jam.end_at ? jam.end_at.slice(11, 16) : "");
  const [isOpen, setIsOpen] = useState(jam.is_open);
  const [location, setLocation] = useState<{ lat: number; lng: number; address: string }>(parsedLoc);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(
    { lat: parsedLoc.lat, lng: parsedLoc.lng }
  );
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
        .update({
          title,
          description,
          start_time,
          end_at,
          location: JSON.stringify(location),
          is_open: isOpen,
        })
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

      {/* Titre */}
      <div>
        <label className="text-sm font-medium text-zik-text mb-1 block">Titre</label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="bg-zik-card border-zik-border text-zik-text placeholder:text-zik-muted focus:ring-zik-purple/50"
        />
      </div>

      {/* Description */}
      <div>
        <label className="text-sm font-medium text-zik-text mb-1 block">Description</label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          rows={3}
          className="bg-zik-card border-zik-border text-zik-text placeholder:text-zik-muted focus:ring-zik-purple/50 resize-none"
        />
      </div>

      {/* Date + Heures */}
      <div className="grid grid-cols-1 gap-3">
        {/* Date */}
        <div>
          <label className="text-sm font-medium text-zik-text mb-1 block">Date</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal bg-zik-card border-zik-border text-zik-text hover:bg-zik-card-hover gap-2",
                  !date && "text-zik-muted"
                )}
              >
                <CalendarDays className="h-4 w-4 text-zik-purple shrink-0" />
                {date
                  ? format(new Date(date), "PPP", { locale: fr })
                  : <span>Sélectionnez une date</span>
                }
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-[320px] p-0 bg-zik-card border-zik-border shadow-lg"
              align="start"
              sideOffset={8}
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

        {/* Heures — passage direct des setters, pas de setFormData */}
        <div className="grid grid-cols-2 gap-3">
          <TimePicker
            label="Début"
            required
            value={startHour}
            onChange={setStartHour}
          />
          <TimePicker
            label="Fin"
            optional
            value={endHour}
            onChange={setEndHour}
          />
        </div>
      </div>

      {/* Ouverture */}
      <div
        className="flex items-center justify-between p-4 rounded-xl"
        style={{
          background: isOpen ? 'rgba(52,211,153,0.06)' : 'rgba(251,146,60,0.06)',
          border: '1px solid',
          borderColor: isOpen ? 'rgba(52,211,153,0.20)' : 'rgba(251,146,60,0.20)',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="h-9 w-9 rounded-full flex items-center justify-center shrink-0"
            style={{
              background: isOpen ? 'rgba(52,211,153,0.12)' : 'rgba(251,146,60,0.12)',
              color: isOpen ? '#34D399' : '#FB923C',
            }}
          >
            {isOpen ? <Unlock className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
          </div>
          <div>
            <p className="text-sm font-medium text-zik-text">
              {isOpen ? "Jam ouverte" : "Sur approbation"}
            </p>
            <p className="text-xs text-zik-muted mt-0.5">
              {isOpen
                ? "Tout le monde peut rejoindre librement."
                : "Tu devras accepter chaque participant."}
            </p>
          </div>
        </div>
        <Switch
          checked={isOpen}
          onCheckedChange={setIsOpen}
          className="data-[state=checked]:bg-zik-purple data-[state=unchecked]:bg-zik-card-hover"
        />
      </div>

      {/* Lieu */}
      <div>
        <label className="text-sm font-medium text-zik-text mb-2 block">Lieu</label>
        <AddressSearchInput
          value={location.address}
          placeholder="Rechercher une adresse..."
          onChange={({ address, lat, lng }) => {
            setSelectedLocation({ lat, lng });
            setLocation({ lat, lng, address });
          }}
          onClear={() => {
            setLocation({ lat: parsedLoc.lat, lng: parsedLoc.lng, address: '' });
            setSelectedLocation({ lat: parsedLoc.lat, lng: parsedLoc.lng });
          }}
        />

        <div className="flex items-center gap-3 my-3">
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
            ou cliquez sur la carte
          </span>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
        </div>

        <div
          className="h-48 rounded-xl overflow-hidden"
          style={{ border: '1px solid rgba(255,255,255,0.08)', isolation: 'isolate' }}
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
          <p className="text-xs mt-2 px-1 flex items-center gap-1.5"
            style={{ color: 'rgba(255,255,255,0.40)' }}>
            <MapPin size={12} style={{ color: '#C084FC' }} />
            {location.address}
          </p>
        )}
      </div>

      {/* Erreur */}
      {error && (
        <div
          className="rounded-lg px-4 py-3 text-sm text-zik-red"
          style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.20)' }}
        >
          {error}
        </div>
      )}

      {/* Boutons */}
      <div className="flex justify-end gap-3 pt-2">
        <Button
          type="button"
          onClick={onClose}
          disabled={isLoading}
          className="border-zik-border text-zik-text hover:bg-zik-card-hover"
          variant="outline"
        >
          Annuler
        </Button>
        <Button
          type="submit"
          disabled={isLoading}
          className="bg-zik-purple hover:bg-zik-indigo text-white disabled:opacity-50"
        >
          {isLoading ? "Enregistrement..." : "Enregistrer les modifications"}
        </Button>
      </div>

    </form>
  );
}