"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Lock, Unlock, CalendarDays, MapPin, Drum, Piano, Upload, X, Mic, Guitar, Repeat2, ArrowRight, Loader2 } from "lucide-react";
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
import { DAYS_OF_WEEK, RecurrenceData, defaultRecurrence, generateOccurrences, formatDateShort } from "@/lib/jamRecurrence";
import { DEFAULT_INSTRUMENTS } from "@/app/(public)/events/jams/[id]/types";
import Link from "next/link";

const LocationPickerMap = dynamic(() => import("@/components/LocationPickerMap"), {
  ssr: false,
  loading: () => <div className="h-64 w-full bg-zik-card animate-pulse rounded-lg" />,
});

interface JamEditFormProps {
  jam: {
    id: string; title: string; description: string; start_time: string;
    end_at: string | null; location: string | null; is_open: boolean; has_drums: boolean; has_keyboard: boolean;
    solo_mode?: boolean;
    genres?: string[] | null;
    poster_url?: string | null;
    recurrence_id?: string | null;
    created_by: string;
    group_id?: string | null;
  };
  onSuccess?: () => void;
  onClose?: () => void;
  onExtended?: () => void;
}

interface SimilarJam { id: string; title: string; start_time: string; }

export default function JamEditForm({ jam, onSuccess, onClose, onExtended }: JamEditFormProps) {
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
  const [isDatePopoverOpen, setIsDatePopoverOpen] = useState(false);
  const [startHour, setStartHour] = useState(startLocal.format('HH:mm'));
  const [endHour, setEndHour] = useState(endLocal ? endLocal.format('HH:mm') : "");
  const [isOpen, setIsOpen] = useState(jam.is_open);
  const [hasDrums, setHasDrums] = useState(jam.has_drums);
  const [hasKeyboard, setHasKeyboard] = useState(jam.has_keyboard);
  const [soloMode, setSoloMode] = useState(jam.solo_mode ?? false);
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

  const [similarJams, setSimilarJams] = useState<SimilarJam[]>([]);
  const [similarLoading, setSimilarLoading] = useState(true);

  const [extend, setExtend] = useState<RecurrenceData>(defaultRecurrence());
  const [isExtending, setIsExtending] = useState(false);
  const [extendError, setExtendError] = useState<string | null>(null);
  const [extendSuccess, setExtendSuccess] = useState<string | null>(null);

  const refetchSimilarJams = React.useCallback(() => {
    setSimilarLoading(true);
    supabase.from("jam_sessions")
      .select("id, title, start_time")
      .eq("created_by", jam.created_by)
      .neq("id", jam.id)
      .gt("start_time", new Date().toISOString())
      .order("start_time", { ascending: true })
      .limit(10)
      .then(({ data }) => {
        setSimilarJams(data ?? []);
        setSimilarLoading(false);
      });
  }, [jam.created_by, jam.id]);

  useEffect(() => {
    if (!jam.recurrence_id) { setSeriesCount(0); return; }
    supabase.from("jam_sessions").select("id", { count: "exact", head: true })
      .eq("recurrence_id", jam.recurrence_id)
      .then(({ count }) => setSeriesCount(count ?? 0));
  }, [jam.recurrence_id]);

  useEffect(() => { refetchSimilarJams(); }, [refetchSimilarJams]);

  const extendOccurrences = React.useMemo(() => {
    if (!extend.enabled || !date) return [];
    return generateOccurrences(date, extend).filter((d) => d.toISOString().split("T")[0] !== date);
  }, [extend, date]);

  const toggleExtendDay = (day: number) => {
    setExtend((prev) => ({
      ...prev,
      days: prev.days.includes(day) ? prev.days.filter((d) => d !== day) : [...prev.days, day],
    }));
  };

  const handleExtend = async () => {
    setExtendError(null);
    setExtendSuccess(null);
    if (extend.days.length === 0) { setExtendError("Sélectionnez au moins un jour"); return; }
    if (extendOccurrences.length === 0) { setExtendError("Aucune nouvelle date à créer avec ces paramètres"); return; }
    setIsExtending(true);
    try {
      const occurrencesPayload = extendOccurrences.map((occ) => {
        const dateStr = occ.toISOString().split("T")[0];
        return {
          start_time: toUtcDateTime(dateStr, startHour),
          end_at: endHour ? resolveEndDateTime(dateStr, startHour, endHour) : null,
        };
      });

      const { data: createdJams, error: rpcError } = await supabase.rpc('create_jam_sessions', {
        p_title: title,
        p_description: description,
        p_location: JSON.stringify(location),
        p_is_open: isOpen,
        p_group_id: jam.group_id ?? null,
        p_occurrences: occurrencesPayload,
        p_has_drums: hasDrums,
        p_has_keyboard: hasKeyboard,
      } as any);

      if (rpcError) { setExtendError(`Erreur : ${rpcError.message}`); setIsExtending(false); return; }

      const newIds: string[] = (createdJams ?? []).map((j: any) => j.jam_id);

      const instrumentDefaults = DEFAULT_INSTRUMENTS
        .filter((inst) => inst.key !== "clavier" || hasKeyboard)
        .map((inst, position) => inst.key === "batterie" && !hasDrums
          ? { key: inst.key, label: "Percussions", emoji: "🪘", position }
          : { key: inst.key, label: inst.label, emoji: inst.emoji, position }
        );
      const instrumentRows = newIds.flatMap((jamId) =>
        instrumentDefaults.map((inst) => ({ jam_id: jamId, ...inst }))
      );
      if (instrumentRows.length > 0) {
        await supabase.from("jam_instruments").insert(instrumentRows);
      }

      // Rattache les nouvelles occurrences à la série existante, ou en crée une
      // (incluant la jam actuelle) si elle n'en faisait pas encore partie.
      const recurrenceId = jam.recurrence_id ?? crypto.randomUUID();
      const idsToTag = jam.recurrence_id ? newIds : [...newIds, jam.id];
      await supabase.from("jam_sessions").update({ recurrence_id: recurrenceId }).in("id", idsToTag);

      if (genres.length > 0) await supabase.from("jam_sessions").update({ genres }).in("id", newIds);
      if (jam.poster_url) await supabase.from("jam_sessions").update({ poster_url: jam.poster_url }).in("id", newIds);
      if (soloMode) await supabase.from("jam_sessions").update({ solo_mode: true }).in("id", newIds);

      setExtendSuccess(`${newIds.length} jam${newIds.length > 1 ? "s" : ""} créée${newIds.length > 1 ? "s" : ""}`);
      setExtend(defaultRecurrence());
      refetchSimilarJams();
      onExtended?.();
    } catch {
      setExtendError("Une erreur s'est produite");
    } finally {
      setIsExtending(false);
    }
  };

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
          solo_mode: soloMode,
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
            solo_mode: soloMode,
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

      {/* Jams à venir du même organisateur */}
      {!similarLoading && similarJams.length > 0 && (
        <div className="rounded-lg border border-zik-border p-4 bg-zik-card/50 space-y-2">
          <p className="text-sm font-medium text-zik-text">
            Tes autres jams à venir ({similarJams.length})
          </p>
          <div className="space-y-1.5 max-h-36 overflow-y-auto">
            {similarJams.map((j) => (
              <Link
                key={j.id}
                href={`/events/jams/${j.id}`}
                target="_blank"
                className="flex items-center justify-between gap-2 text-sm text-zik-muted hover:text-zik-grad-to transition-colors"
              >
                <span className="truncate">{j.title}</span>
                <span className="shrink-0 flex items-center gap-1 text-xs">
                  {format(new Date(j.start_time), "d MMM, HH'h'mm", { locale: fr })}
                  <ArrowRight className="h-3 w-3" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

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
          <Popover open={isDatePopoverOpen} onOpenChange={setIsDatePopoverOpen}>
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
                    setIsDatePopoverOpen(false);
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

      {/* Format : jam classique ou open mic (mode solo) */}
      <div className="rounded-lg border border-zik-border p-4 bg-zik-card/50">
        <label className="text-sm font-medium text-zik-text mb-2 block">Format</label>
        <div className="grid grid-cols-2 gap-1 bg-zik-bg p-1 rounded-full border border-zik-border">
          <button
            type="button"
            onClick={() => setSoloMode(false)}
            className={cn(
              "flex items-center justify-center gap-1.5 py-2 rounded-full text-sm font-medium transition-all",
              !soloMode
                ? "bg-linear-to-br from-zik-grad-from to-zik-grad-to text-white shadow-[0_0_16px_-4px_rgba(168,85,247,0.6)]"
                : "text-zik-muted hover:text-zik-text"
            )}
          >
            <Guitar className="h-4 w-4" /> Jam
          </button>
          <button
            type="button"
            onClick={() => setSoloMode(true)}
            className={cn(
              "flex items-center justify-center gap-1.5 py-2 rounded-full text-sm font-medium transition-all",
              soloMode
                ? "bg-linear-to-br from-zik-grad-from to-zik-grad-to text-white shadow-[0_0_16px_-4px_rgba(168,85,247,0.6)]"
                : "text-zik-muted hover:text-zik-text"
            )}
          >
            <Mic className="h-4 w-4" /> Open mic
          </button>
        </div>
        <p className="text-xs text-zik-muted mt-2">
          {soloMode
            ? "Un·e seul·e musicien·ne à la fois, à tour de rôle"
            : "Plusieurs musiciens jouent en même temps, un par instrument"}
        </p>
      </div>

      {/* Affiche */}
      <div>
        <label className="text-sm font-medium text-zik-text mb-2 block">Affiche (optionnel)</label>
        {posterPreview ? (
          <div className="relative w-full">
            <img
              src={posterPreview}
              alt="Aperçu affiche"
              className="rounded-lg w-full object-contain max-h-80 border border-zik-border bg-zik-card"
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

      {/* Prolonger sur plusieurs dates */}
      <div className="rounded-lg border border-zik-border overflow-hidden bg-zik-card/50">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Repeat2 className={`h-5 w-5 ${extend.enabled ? "text-zik-grad-to" : "text-zik-muted"}`} />
            <div>
              <p className="text-sm font-medium text-zik-text">Prolonger cette jam</p>
              <p className="text-xs text-zik-muted">Créer de nouvelles dates à partir de celle-ci</p>
            </div>
          </div>
          <Switch
            checked={extend.enabled}
            onCheckedChange={(checked) => { setExtend((prev) => ({ ...prev, enabled: checked })); setExtendError(null); setExtendSuccess(null); }}
            className="data-[state=checked]:bg-zik-grad-to data-[state=unchecked]:bg-zik-card-hover"
          />
        </div>
        {extend.enabled && (
          <div className="border-t border-zik-border bg-zik-card/30 p-4 space-y-4">
            {/* Fréquence */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-zik-text">Toutes les</span>
              <select
                value={extend.frequency}
                onChange={(e) => setExtend((prev) => ({ ...prev, frequency: Number(e.target.value) }))}
                className="border-zik-border rounded-md text-sm px-2 py-1.5 bg-zik-card text-zik-text focus:outline-none focus:ring-2 focus:ring-zik-grad-to"
              >
                {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <span className="text-sm text-zik-text">semaine{extend.frequency > 1 ? "s" : ""}</span>
            </div>

            {/* Jours de répétition */}
            <div>
              <p className="text-xs text-zik-muted mb-2">Jours de répétition</p>
              <div className="flex gap-1.5">
                {DAYS_OF_WEEK.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    title={day.full}
                    onClick={() => toggleExtendDay(day.value)}
                    className={`h-8 w-8 rounded-full text-xs font-semibold transition-colors ${
                      extend.days.includes(day.value)
                        ? "bg-zik-grad-to text-white"
                        : "bg-zik-card border border-zik-border text-zik-muted hover:border-zik-grad-to hover:text-zik-grad-to"
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Fin de la récurrence */}
            <div className="space-y-2">
              <p className="text-xs text-zik-muted">Fin de la prolongation</p>
              <div className="flex gap-3">
                <label className="flex items-center gap-1.5 text-sm cursor-pointer text-zik-text">
                  <input
                    type="radio"
                    checked={extend.endType === "count"}
                    onChange={() => setExtend((prev) => ({ ...prev, endType: "count" }))}
                    className="accent-zik-grad-to"
                  />
                  Après
                </label>
                {extend.endType === "count" && (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={1}
                      max={52}
                      value={extend.count}
                      onChange={(e) => setExtend((prev) => ({ ...prev, count: Math.max(1, Number(e.target.value)) }))}
                      className="w-16 border-zik-border rounded-md text-sm px-2 py-1 bg-zik-card text-zik-text focus:outline-none focus:ring-2 focus:ring-zik-grad-to"
                    />
                    <span className="text-sm text-zik-text">occurrence{extend.count > 1 ? "s" : ""}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <label className="flex items-center gap-1.5 text-sm cursor-pointer text-zik-text">
                  <input
                    type="radio"
                    checked={extend.endType === "date"}
                    onChange={() => setExtend((prev) => ({ ...prev, endType: "date" }))}
                    className="accent-zik-grad-to"
                  />
                  Jusqu'au
                </label>
                {extend.endType === "date" && (
                  <Input
                    type="date"
                    value={extend.endDate}
                    onChange={(e) => setExtend((prev) => ({ ...prev, endDate: e.target.value }))}
                    className="w-auto text-sm bg-zik-card border-zik-border text-zik-text scheme-dark"
                    min={date}
                  />
                )}
              </div>
            </div>

            {/* Aperçu des occurrences */}
            {extendOccurrences.length > 0 && (
              <div className="bg-zik-grad-to/10 rounded-lg p-3">
                <p className="text-xs font-medium text-zik-grad-to mb-2">
                  {extendOccurrences.length} jam{extendOccurrences.length > 1 ? "s" : ""} seront créées :
                </p>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {extendOccurrences.map((d, i) => (
                    <span
                      key={i}
                      className="text-xs bg-zik-card border border-zik-grad-to/20 text-zik-grad-to px-2 py-0.5 rounded-full"
                    >
                      {formatDateShort(d)}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {extend.days.length === 0 && (
              <p className="text-xs text-zik-orange">⚠️ Sélectionnez au moins un jour</p>
            )}

            {extendError && (
              <p className="text-sm text-zik-red">{extendError}</p>
            )}
            {extendSuccess && (
              <p className="text-sm text-zik-emerald">{extendSuccess}</p>
            )}

            <Button
              type="button"
              onClick={handleExtend}
              disabled={isExtending || extend.days.length === 0}
              className="w-full bg-linear-to-br from-zik-grad-from to-zik-grad-to hover:brightness-110 border-0 text-white disabled:opacity-50 gap-2"
            >
              {isExtending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isExtending
                ? "Création..."
                : extendOccurrences.length > 0
                  ? `Créer ${extendOccurrences.length} jam${extendOccurrences.length > 1 ? "s" : ""} supplémentaire${extendOccurrences.length > 1 ? "s" : ""}`
                  : "Créer les occurrences"}
            </Button>
          </div>
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
          className="bg-linear-to-br from-zik-grad-from to-zik-grad-to hover:brightness-110 border-0 text-white disabled:opacity-50"
        >
          {isLoading ? "Enregistrement..." : "Enregistrer les modifications"}
        </Button>
      </div>

    </form>
  );
}