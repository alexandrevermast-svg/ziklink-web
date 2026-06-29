"use client";

import React, { useState, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Lock, Unlock, Repeat2, Users } from "lucide-react";

const LocationPickerMap = dynamic(() => import("@/components/LocationPickerMap"), {
  ssr: false,
  loading: () => <div className="h-64 w-full bg-gray-200 animate-pulse rounded-lg" />,
});

const DAYS_OF_WEEK = [
  { label: "L", value: 1, full: "Lundi" },
  { label: "M", value: 2, full: "Mardi" },
  { label: "M", value: 3, full: "Mercredi" },
  { label: "J", value: 4, full: "Jeudi" },
  { label: "V", value: 5, full: "Vendredi" },
  { label: "S", value: 6, full: "Samedi" },
  { label: "D", value: 0, full: "Dimanche" },
];

interface RecurrenceData {
  enabled: boolean; frequency: number; days: number[];
  endType: "date" | "count"; endDate: string; count: number;
}
interface JamFormData {
  title: string; description: string; date: string;
  start_hour: string; end_hour: string; is_open: boolean;
  location: { lat: number; lng: number; address: string };
}
interface UserGroup { id: string; name: string; avatar_url: string | null; }
interface JamCreationFormProps { onSuccess?: () => void; onClose?: () => void; }

function generateOccurrences(startDate: string, recurrence: RecurrenceData): Date[] {
  if (!recurrence.enabled || recurrence.days.length === 0) return [];
  const base = new Date(startDate);
  const results: Date[] = [];
  const maxCount = recurrence.endType === "count" ? recurrence.count : 365;
  const endDate = recurrence.endType === "date" && recurrence.endDate ? new Date(recurrence.endDate) : null;
  let cursor = new Date(base);
  cursor.setDate(cursor.getDate() - cursor.getDay() + (cursor.getDay() === 0 ? -6 : 1));
  let weekOffset = 0;
  while (results.length < maxCount) {
    for (const dayValue of recurrence.days) {
      const dayOffset = dayValue === 0 ? 6 : dayValue - 1;
      const d = new Date(cursor);
      d.setDate(cursor.getDate() + dayOffset + weekOffset * 7 * recurrence.frequency);
      if (d < base) continue;
      if (endDate && d > endDate) return results;
      if (results.length >= maxCount) return results;
      results.push(new Date(d));
    }
    weekOffset++;
    if (weekOffset > 200) break;
  }
  return results.sort((a, b) => a.getTime() - b.getTime());
}

function formatDateShort(d: Date) {
  return d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
}

export default function JamCreationForm({ onSuccess, onClose }: JamCreationFormProps) {
  const supabase = createClient();
  const [formData, setFormData] = useState<JamFormData>({
    title: "", description: "", date: "", start_hour: "", end_hour: "", is_open: true,
    location: { lat: 48.8566, lng: 2.3522, address: "" },
  });
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recurrence, setRecurrence] = useState<RecurrenceData>({
    enabled: false, frequency: 1, days: [], endType: "count", endDate: "", count: 8,
  });

  // ✅ Selector groupe
  const [userGroups, setUserGroups] = useState<UserGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");

  useEffect(() => {
    const fetchGroups = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("group_members")
        .select("group_id, groups(id, name, avatar_url)")
        .eq("user_id", user.id);
      const groups: UserGroup[] = (data ?? [])
        .map((row: any) => row.groups)
        .filter(Boolean);
      setUserGroups(groups);
    };
    fetchGroups();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  const toggleDay = (day: number) => {
    setRecurrence((prev) => ({
      ...prev,
      days: prev.days.includes(day) ? prev.days.filter((d) => d !== day) : [...prev.days, day],
    }));
  };

  const occurrences = useMemo(() => {
    if (!recurrence.enabled || !formData.date) return [];
    return generateOccurrences(formData.date, recurrence);
  }, [recurrence, formData.date]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError("Vous devez être connecté"); setIsLoading(false); return; }
      if (!formData.title || !formData.description || !formData.date || !formData.start_hour) {
        setError("Veuillez remplir tous les champs obligatoires"); setIsLoading(false); return;
      }
      const start_time = `${formData.date}T${formData.start_hour}:00`;
      const end_at = formData.end_hour ? `${formData.date}T${formData.end_hour}:00` : null;
      if (end_at && end_at <= start_time) { setError("L'heure de fin doit être après l'heure de début"); setIsLoading(false); return; }

      const groupId = selectedGroupId || null;

     const occurrencesPayload: { start_time: string; end_at: string | null }[] = [];

if (recurrence.enabled && occurrences.length > 0) {
  if (recurrence.days.length === 0) { setError("Sélectionnez au moins un jour"); setIsLoading(false); return; }
  for (const occ of occurrences) {
    const dateStr = occ.toISOString().split("T")[0];
    occurrencesPayload.push({
      start_time: `${dateStr}T${formData.start_hour}:00`,
      end_at: formData.end_hour ? `${dateStr}T${formData.end_hour}:00` : null,
    });
  }
} else {
  occurrencesPayload.push({ start_time, end_at });
}

const { data: createdJams, error: rpcError } = await supabase.rpc('create_jam_sessions', {
  p_title: formData.title,
  p_description: formData.description,
  p_location: JSON.stringify(formData.location),
  p_is_open: formData.is_open,
  p_group_id: groupId,
  p_occurrences: occurrencesPayload,
});

if (rpcError) {
  setError(`Erreur: ${rpcError.message}`);
  setIsLoading(false);
  return;
}

 

      setFormData({ title: "", description: "", date: "", start_hour: "", end_hour: "", is_open: true, location: { lat: 48.8566, lng: 2.3522, address: "" } });
      setSelectedLocation(null);
      setSelectedGroupId("");
      setRecurrence({ enabled: false, frequency: 1, days: [], endType: "count", endDate: "", count: 8 });
      if (onSuccess) onSuccess();
      if (onClose) onClose();
    } catch (err) {
      setError("Une erreur s'est produite");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium">Titre de la jam</label>
        <Input name="title" value={formData.title} onChange={handleInputChange} placeholder="Ex: Jam à La Boîte Noire" required />
      </div>
      <div>
        <label className="text-sm font-medium">Description</label>
        <Textarea name="description" value={formData.description} onChange={handleInputChange} placeholder="Décrivez votre jam..." required />
      </div>
      <div className="grid grid-cols-3 gap-4 items-end">
        <div className="col-span-1">
          <label className="text-sm font-medium">Date de début</label>
          <Input type="date" name="date" value={formData.date} onChange={handleInputChange} required />
        </div>
        <div>
          <label className="text-sm font-medium">Début</label>
          <Input type="time" name="start_hour" value={formData.start_hour} onChange={handleInputChange} required />
        </div>
        <div>
          <label className="text-sm font-medium">Fin <span className="text-gray-400 font-normal">(optionnel)</span></label>
          <Input type="time" name="end_hour" value={formData.end_hour} onChange={handleInputChange} />
        </div>
      </div>

      {/* ✅ Selector groupe */}
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
            <option value="">Aucun groupe — jam personnelle</option>
            {userGroups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Récurrence */}
      <div className="rounded-lg border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Repeat2 className={`h-5 w-5 ${recurrence.enabled ? "text-blue-500" : "text-gray-400"}`} />
            <div>
              <p className="text-sm font-medium">Jam récurrente</p>
              <p className="text-xs text-gray-500">Se répète selon un calendrier</p>
            </div>
          </div>
          <Switch checked={recurrence.enabled}
            onCheckedChange={(checked) => setRecurrence((prev) => ({ ...prev, enabled: checked }))} />
        </div>
        {recurrence.enabled && (
          <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">Toutes les</span>
              <select value={recurrence.frequency}
                onChange={(e) => setRecurrence((prev) => ({ ...prev, frequency: Number(e.target.value) }))}
                className="border border-gray-200 rounded-md text-sm px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <span className="text-sm text-gray-600">semaine{recurrence.frequency > 1 ? "s" : ""}</span>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-2">Jours de répétition</p>
              <div className="flex gap-1.5">
                {DAYS_OF_WEEK.map((day) => (
                  <button key={day.value} type="button" title={day.full} onClick={() => toggleDay(day.value)}
                    className={`h-8 w-8 rounded-full text-xs font-semibold transition-colors ${
                      recurrence.days.includes(day.value) ? "bg-blue-600 text-white" :
                      "bg-white border border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-600"}`}>
                    {day.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-gray-500">Fin de la récurrence</p>
              <div className="flex gap-3">
                <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input type="radio" value="count" checked={recurrence.endType === "count"}
                    onChange={() => setRecurrence((prev) => ({ ...prev, endType: "count" }))} className="accent-blue-600" />
                  Après
                </label>
                {recurrence.endType === "count" && (
                  <div className="flex items-center gap-1.5">
                    <input type="number" min={1} max={52} value={recurrence.count}
                      onChange={(e) => setRecurrence((prev) => ({ ...prev, count: Math.max(1, Number(e.target.value)) }))}
                      className="w-16 border border-gray-200 rounded-md text-sm px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <span className="text-sm text-gray-600">occurrence{recurrence.count > 1 ? "s" : ""}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input type="radio" value="date" checked={recurrence.endType === "date"}
                    onChange={() => setRecurrence((prev) => ({ ...prev, endType: "date" }))} className="accent-blue-600" />
                  Jusqu'au
                </label>
                {recurrence.endType === "date" && (
                  <Input type="date" value={recurrence.endDate}
                    onChange={(e) => setRecurrence((prev) => ({ ...prev, endDate: e.target.value }))}
                    className="w-auto text-sm" min={formData.date} />
                )}
              </div>
            </div>
            {occurrences.length > 0 && (
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-xs font-medium text-blue-700 mb-2">{occurrences.length} jam{occurrences.length > 1 ? "s" : ""} seront créées :</p>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {occurrences.map((d, i) => (
                    <span key={i} className="text-xs bg-white border border-blue-200 text-blue-700 px-2 py-0.5 rounded-full">
                      {formatDateShort(d)}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {recurrence.days.length === 0 && <p className="text-xs text-amber-600">⚠️ Sélectionnez au moins un jour</p>}
          </div>
        )}
      </div>

      {/* Ouverture */}
      <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-3">
          {formData.is_open ? <Unlock className="h-5 w-5 text-green-500" /> : <Lock className="h-5 w-5 text-orange-500" />}
          <div>
            <p className="text-sm font-medium">{formData.is_open ? "Jam ouverte" : "Sur approbation"}</p>
            <p className="text-xs text-gray-500">
              {formData.is_open ? "Tout le monde peut rejoindre librement" : "Tu devras accepter chaque participant"}
            </p>
          </div>
        </div>
        <Switch checked={formData.is_open}
          onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_open: checked }))} />
      </div>

      {/* Carte */}
      <div>
        <label className="text-sm font-medium mb-2 block">Sélectionnez le lieu (cliquez sur la carte)</label>
        <div className="h-64 rounded-lg border border-gray-300 overflow-hidden" style={{ position: "relative", zIndex: 0 }}>
          <LocationPickerMap center={formData.location} selectedLocation={selectedLocation}
            onLocationChange={({ lat, lng, address }) => {
              setSelectedLocation({ lat, lng });
              setFormData((prev) => ({ ...prev, location: { lat, lng, address } }));
            }} />
        </div>
        {formData.location.address && <p className="text-sm text-gray-600 mt-2">📍 {formData.location.address}</p>}
      </div>

      {error && <div className="text-red-600 text-sm">{error}</div>}
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>Annuler</Button>
        <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
          {isLoading ? "Création..." : recurrence.enabled && occurrences.length > 0
            ? `Créer ${occurrences.length} jam${occurrences.length > 1 ? "s" : ""}` : "Créer la jam"}
        </Button>
      </div>
    </form>
  );
}