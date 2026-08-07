"use client";

import React, { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { GraduationCap, Mic2, Megaphone, Search, Upload, X } from "lucide-react";
import type { Service } from "@/types";

interface ServiceFormProps {
  service?: Service;
  defaultKind?: "offre" | "demande";
  onSuccess?: () => void;
  onClose?: () => void;
}

export default function ServiceForm({ service, defaultKind = "offre", onSuccess, onClose }: ServiceFormProps) {
  const supabase = createClient();
  const isEdit = !!service;

  const [type, setType] = useState<"cours" | "prestation">((service?.type as "cours" | "prestation") ?? "cours");
  const [kind, setKind] = useState<"offre" | "demande">((service?.kind as "offre" | "demande") ?? defaultKind);
  const [title, setTitle] = useState(service?.title ?? "");
  const [instrument, setInstrument] = useState(service?.instrument ?? "");
  const [city, setCity] = useState(service?.city ?? "");
  const [priceInfo, setPriceInfo] = useState(service?.price_info ?? "");
  const [description, setDescription] = useState(service?.description ?? "");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(service?.photo_url ?? null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError("Vous devez être connecté"); setIsLoading(false); return; }
      if (!title.trim()) { setError("Le titre est obligatoire"); setIsLoading(false); return; }

      let photoUrl = service?.photo_url ?? null;
      if (photoFile) {
        const ext = photoFile.name.split(".").pop();
        const path = `services/${user.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("avatars").upload(path, photoFile, { upsert: true });
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
          photoUrl = urlData.publicUrl;
        }
      }

      const payload = {
        type,
        kind,
        title: title.trim(),
        instrument: instrument.trim() || null,
        city: city.trim() || null,
        price_info: priceInfo.trim() || null,
        description: description.trim() || null,
        photo_url: photoUrl,
      };

      const { error: dbError } = isEdit
        ? await supabase.from("services").update(payload).eq("id", service.id)
        : await supabase.from("services").insert({ ...payload, created_by: user.id });

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
          Offre ou demande <span className="text-zik-red">*</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setKind("offre")}
            className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
              kind === "offre"
                ? "border-zik-purple/40 bg-zik-purple/10 text-zik-purple"
                : "border-zik-border text-zik-muted hover:border-zik-purple/30"
            }`}
          >
            <Megaphone className="h-4 w-4" /> J&apos;offre
          </button>
          <button
            type="button"
            onClick={() => setKind("demande")}
            className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
              kind === "demande"
                ? "border-zik-purple/40 bg-zik-purple/10 text-zik-purple"
                : "border-zik-border text-zik-muted hover:border-zik-purple/30"
            }`}
          >
            <Search className="h-4 w-4" /> Je cherche
          </button>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-zik-text mb-1.5 block">
          Type d&apos;annonce <span className="text-zik-red">*</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setType("cours")}
            className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
              type === "cours"
                ? "border-zik-purple/40 bg-zik-purple/10 text-zik-purple"
                : "border-zik-border text-zik-muted hover:border-zik-purple/30"
            }`}
          >
            <GraduationCap className="h-4 w-4" /> Cours
          </button>
          <button
            type="button"
            onClick={() => setType("prestation")}
            className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
              type === "prestation"
                ? "border-zik-purple/40 bg-zik-purple/10 text-zik-purple"
                : "border-zik-border text-zik-muted hover:border-zik-purple/30"
            }`}
          >
            <Mic2 className="h-4 w-4" /> Prestation
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
          placeholder={type === "cours" ? "Ex: Cours de guitare électrique tous niveaux" : "Ex: Groupe de reprises pour mariages et événements"}
          required
          className="bg-zik-card border-zik-border text-zik-text placeholder:text-zik-muted focus:ring-zik-purple/50"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium text-zik-text">Instrument</label>
          <Input
            value={instrument}
            onChange={(e) => setInstrument(e.target.value)}
            placeholder="Ex: Guitare"
            className="bg-zik-card border-zik-border text-zik-text placeholder:text-zik-muted focus:ring-zik-purple/50 mt-0.5"
          />
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
        <label className="text-sm font-medium text-zik-text">Tarif</label>
        <Input
          value={priceInfo}
          onChange={(e) => setPriceInfo(e.target.value)}
          placeholder="Ex: 30€/h, Sur devis..."
          className="bg-zik-card border-zik-border text-zik-text placeholder:text-zik-muted focus:ring-zik-purple/50 mt-0.5"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-zik-text">Description</label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Décrivez votre offre..."
          rows={4}
          className="bg-zik-card border-zik-border text-zik-text placeholder:text-zik-muted focus:ring-zik-purple/50"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-zik-text mb-2 block">Photo (optionnel)</label>
        {photoPreview ? (
          <div className="relative w-full max-w-xs">
            <img
              src={photoPreview}
              alt="Aperçu"
              className="rounded-lg w-full object-cover max-h-48 border border-zik-border"
            />
            <button
              type="button"
              onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
              className="absolute top-2 right-2 bg-zik-card rounded-full p-1 shadow text-zik-muted hover:text-zik-red transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-zik-border rounded-lg p-6 cursor-pointer hover:border-zik-purple hover:bg-zik-purple/5 transition-colors">
            <Upload className="h-6 w-6 text-zik-muted" />
            <span className="text-sm text-zik-muted">Cliquez pour importer une image</span>
            <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
          </label>
        )}
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
