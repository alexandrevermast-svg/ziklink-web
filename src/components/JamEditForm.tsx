"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Lock, Unlock, CalendarDays, MapPin, Drum, Piano, Upload, X } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { fr } from "date-fns/locale";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import TimePicker from "@/components/ui/TimePicker";
import AddressSearchInput from "@/components/AddressSearchInput";
import moment from 'moment-timezone';
import { toUtcDateTime, resolveEndDateTime } from '@/lib/eventDateTime';
import { MUSIC_GENRES, genreColor } from "@/lib/musicGenres";

const LocationPickerMap = dynamic(() => import("@/components/LocationPickerMap"), {
  ssr: false,
  loading: () => <div className="h-64 w-full bg-zik-card animate-pulse rounded-lg" />,
});

interface JamEditFormProps {
  jam: {
    id: string; title: string; description: string; start_time: string;
    end_at: string | null; location: string | null; is_open: boolean; has_drums: boolean; has_keyboard: boolean;
    genres?: string[] | null;
    poster_url?: string | null;
    recurrence_id?: string | null;
  };
  onSuccess?: () => void;
  onClose?: () => void;
}

export default function JamEditForm({ jam, onSuccess, onClose }: JamEditFormProps) {
  const supabase = createClient();

  const parsedLoc = (() => {
    if (!jam.location) return { lat: 48.8566, lng: 2.3522, address: "" };
    try { return JSON.parse(jam.location); }
    catch { return { lat: 48.8566, lng: 2.3522, address: "" }; }
  })();

  const startLocal = moment.tz(jam.start_time, moment.tz.guess());
  const endLocal = jam.end_at ? moment.tz(jam.end_at, moment.tz.guess()) : null;

  // ── États séparés par champ (pattern de JamEditForm) ─────────────────
  const [title, setTitle] = useState(jam.title);
  const [description, setDescription] = useState(jam.description);
  const [date, setDate] = useState(startLocal.format('YYYY-MM-DD'));
  const [startHour, setStartHour] = useState(startLocal.format('HH:mm'));
  const [endHour, setEndHour] = useState(endLocal ? endLocal.format('HH:mm') : "");
  const [isOpen, setIsOpen] = useState(jam.is_open);
  const [hasDrums, setHasDrums] = useState(jam.has_drums);
  const [hasKeyboard, setHasKeyboard] = useState(jam.has_keyboard);
  const [genres, setGenres] = useState<string[]>(jam.genres ?? []);
  const [location, setLocation] = useState<{ lat: number; lng: number; address: string; name?: string; street?: string; postcode?: string; city?: string }>(parsedLoc);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(
    { lat: parsedLoc.lat, lng: parsedLoc.lng }
  );
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [posterPreview, setPosterPreview] = useState<string | null>(jam.poster_url ?? null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seriesCount, setSeriesCount] = useState(0);
  const [applyToSeries, setApplyToSeries] = useState(false);

  useEffect(() => {
    if (!jam.recurrence_id) { setSeriesCount(0); return; }
    supabase.from("jam_sessions").select("id", { count: "exact", head: true })
      .eq("recurrence_id", jam.recurrence_id)
      .then(({ count }) => setSeriesCount(count ?? 0));
  }, [jam.recurrence_id]);

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
      if (!title || !date || !startHour) {
        setError("Titre, date et heure de début sont obligatoires");
        setIsLoading(false);
        return;
      }
      const start_time = toUtcDateTime(date, startHour);
      const end_at = endHour ? resolveEndDateTime(date, startHour, endHour) : null;

      let posterUrl = jam.poster_url ?? null;
      if (posterFile) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const ext = posterFile.name.split(".").pop();
          const path = `jams/${user.id}/${Date.now()}.${ext}`;
          const { error: uploadError } = await supabase.storage.from("avatars").upload(path, posterFile, { upsert: true });
          if (!uploadError) {
            const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
            posterUrl = urlData.publicUrl;
          }
        }
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
          has_drums: hasDrums,
          has_keyboard: hasKeyboard,
          genres: genres.length > 0 ? genres : null,
          poster_url: posterUrl,
        })
        .eq("id", jam.id);

      if (updateError) { setError(`Erreur : ${updateError.message}`); setIsLoading(false); return; }

      // Propage uniquement les champs communs à toute la série — jamais la
      // date/heure, qui reste propre à chaque occurrence.
      if (applyToSeries && jam.recurrence_id) {
        const { error: seriesError } = await supabase
          .from("jam_sessions")
          .update({
            title,
            description,
            location: JSON.stringify(location),
            is_open: isOpen,
            has_drums: hasDrums,
            has_keyboard: hasKeyboard,
            genres: genres.length > 0 ? genres : null,
            poster_url: posterUrl,
          })
          .eq("recurrence_id", jam.recurrence_id)
          .neq("id", jam.id);

        if (seriesError) { setError(`Erreur sur la série : ${seriesError.message}`); setIsLoading(false); return; }
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
        <label className="text-sm font-medium text-zik-text mb-1 block">Titre</label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="bg-zik-card border-zik-border text-zik-text placeholder:text-zik-muted focus:ring-zik-grad-to/50"
        />
      </div>

      {/* Description */}
      <div>
        <label className="text-sm font-medium text-zik-text mb-1 block">Description (facultatif)</label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="bg-zik-card border-zik-border text-zik-text placeholder:text-zik-muted focus:ring-zik-grad-to/50 resize-none"
        />
      </div>

      {/* Styles de musique */}
      <div>
        <label className="text-sm font-medium text-zik-text mb-1 block">Styles de musique (facultatif)</label>
        <div className="flex flex-wrap gap-1.5">
          {MUSIC_GENRES.map((g) => {
            const isActive = genres.includes(g);
            const color = genreColor(g);
            return (
              <button
                key={g}
                type="button"
                onClick={() => setGenres((prev) => prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g])}
                className="px-3 py-1.5 rounded-full text-xs font-medium border transition-colors"
                style={isActive
                  ? { background: color, borderColor: color, color: "#0E0B16" }
                  : { background: `${color}1A`, borderColor: `${color}33`, color }}
              >
                {g}
              </button>
            );
          })}
        </div>
      </div>

      {/* Date + Heures */}
      <div className="grid grid-cols-1 gap-3">
        {/* Date */}
        <div>
          <label className="text-sm font-medium text-zik-text mb-1 block">Date</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal bg-zik-card border-zik-border text-zik-text hover:bg-zik-card-hover gap-2",
                  !date && "text-zik-muted"
                )}
              >
                <CalendarDays className="h-4 w-4 text-zik-grad-to shrink-0" />
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
                  months: "relative flex flex-col gap-4",
                  month: "flex w-full flex-col gap-4",
                  nav: "absolute inset-x-0 top-0 z-10 flex items-center justify-between px-2",
                  button_previous: "h-8 w-8 p-0 text-zik-grad-to hover:bg-zik-card-hover",
                  button_next: "h-8 w-8 p-0 text-zik-grad-to hover:bg-zik-card-hover",
                  month_caption: "flex h-8 w-full items-center justify-center px-4 text-zik-text font-medium",
                  weekday: "text-zik-muted text-[0.9rem] font-medium",
                  day: "h-8 w-8 text-[0.9rem] font-medium text-zik-text hover:bg-zik-card-hover rounded-md",
                  day_selected: "bg-zik-grad-to text-white hover:bg-zik-grad-to/90",
                  day_today: "bg-zik-grad-to/10 text-zik-text border border-zik-grad-to/30 rounded-md",
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
          className="data-[state=checked]:bg-zik-grad-to data-[state=unchecked]:bg-zik-card-hover"
        />
      </div>

      {/* Batterie */}
      <div className="flex items-center justify-between rounded-lg border border-zik-border p-4 bg-zik-card/50">
        <div className="flex items-center gap-3">
          <Drum className={`h-5 w-5 ${hasDrums ? "text-zik-grad-to" : "text-zik-muted"}`} />
          <div>
            <p className="text-sm font-medium text-zik-text">
              {hasDrums ? "Batterie disponible" : "Sans batterie"}
            </p>
            <p className="text-xs text-zik-muted">
              {hasDrums
                ? "Un kit de batterie sera sur place"
                : "Pas de batterie prévue sur place"}
            </p>
          </div>
        </div>
        <Switch
          checked={hasDrums}
          onCheckedChange={setHasDrums}
          className="data-[state=checked]:bg-zik-grad-to data-[state=unchecked]:bg-zik-card-hover"
        />
      </div>

      {/* Clavier */}
      <div className="flex items-center justify-between rounded-lg border border-zik-border p-4 bg-zik-card/50">
        <div className="flex items-center gap-3">
          <Piano className={`h-5 w-5 ${hasKeyboard ? "text-zik-grad-to" : "text-zik-muted"}`} />
          <div>
            <p className="text-sm font-medium text-zik-text">
              {hasKeyboard ? "Clavier disponible" : "Sans clavier"}
            </p>
            <p className="text-xs text-zik-muted">
              {hasKeyboard
                ? "Un clavier sera sur place"
                : "Pas de clavier prévu sur place"}
            </p>
          </div>
        </div>
        <Switch
          checked={hasKeyboard}
          onCheckedChange={setHasKeyboard}
          className="data-[state=checked]:bg-zik-grad-to data-[state=unchecked]:bg-zik-card-hover"
        />
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
          <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-zik-border rounded-lg p-6 cursor-pointer hover:border-zik-grad-to hover:bg-zik-grad-to/5 transition-colors">
            <Upload className="h-6 w-6 text-zik-muted" />
            <span className="text-sm text-zik-muted">Cliquez pour importer une image</span>
            <span className="text-xs text-zik-subtle">JPG, PNG — max 5 Mo</span>
            <input type="file" accept="image/*" className="hidden" onChange={handlePosterChange} />
          </label>
        )}
      </div>

      {/* Lieu */}
      <div>
        <label className="text-sm font-medium text-zik-text mb-2 block">Lieu</label>
        <AddressSearchInput
          value={location.address}
          placeholder="Rechercher une adresse..."
          onChange={({ address, lat, lng, name, street, postcode, city }) => {
            setSelectedLocation({ lat, lng });
            setLocation({ lat, lng, address, name, street, postcode, city });
          }}
          onClear={() => {
            setLocation({ lat: parsedLoc.lat, lng: parsedLoc.lng, address: '' });
            setSelectedLocation({ lat: parsedLoc.lat, lng: parsedLoc.lng });
          }}
        />

        <div className="flex items-center gap-3 my-3">
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.52)' }}>
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
            onLocationChange={({ lat, lng, address, name, street, postcode, city }) => {
              setSelectedLocation({ lat, lng });
              setLocation({ lat, lng, address, name, street, postcode, city });
            }}
          />
        </div>

        {location.address && (
          <p className="text-xs mt-2 px-1 flex items-center gap-1.5"
            style={{ color: 'rgba(255,255,255,0.64)' }}>
            <MapPin size={12} style={{ color: '#A855F7' }} />
            {location.address}
          </p>
        )}
      </div>

      {/* Série récurrente */}
      {seriesCount > 1 && (
        <div className="rounded-lg border border-zik-border p-4 bg-zik-card/50 space-y-2">
          <p className="text-sm font-medium text-zik-text">
            Cette jam fait partie d'une série de {seriesCount} occurrences
          </p>
          <label className="flex items-center gap-2 text-sm text-zik-text cursor-pointer">
            <input type="radio" name="edit-scope" checked={!applyToSeries}
              onChange={() => setApplyToSeries(false)}
              className="accent-zik-grad-to" />
            Cette jam uniquement
          </label>
          <label className="flex items-center gap-2 text-sm text-zik-text cursor-pointer">
            <input type="radio" name="edit-scope" checked={applyToSeries}
              onChange={() => setApplyToSeries(true)}
              className="accent-zik-grad-to" />
            Toutes les jams de cette série ({seriesCount})
          </label>
          {applyToSeries && (
            <p className="text-xs text-zik-muted">
              La date et l'heure restent propres à chaque occurrence ; seuls le titre, la description,
              le lieu, l'ouverture, les styles de musique et les options batterie/clavier seront appliqués à toute la série.
            </p>
          )}
        </div>
      )}

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
          className="bg-linear-to-br from-zik-grad-from to-zik-grad-to hover:brightness-110 border-0 text-white disabled:opacity-50"
        >
          {isLoading ? "Enregistrement..." : "Enregistrer les modifications"}
        </Button>
      </div>

    </form>
  );
}