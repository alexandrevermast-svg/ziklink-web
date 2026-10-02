"use client";

import { useState } from "react";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/button";
import { Trash2, Plus, Loader2, Guitar } from "lucide-react";
import { GuitarHeadstockIcon, BassHeadstockIcon } from "./InstrumentIcons";
import type { JamInstrument } from "../types";

const PRESET_INSTRUMENTS = [
  { label: "Chant", emoji: "🎤" },
  { label: "Guitare", emoji: "🎸" },
  { label: "Guitare acoustique", emoji: "🎸" },
  { label: "Basse", emoji: "🎵" },
  { label: "Batterie", emoji: "🥁" },
  { label: "Percussions", emoji: "🪘" },
  { label: "Clavier / Piano", emoji: "🎹" },
  { label: "Synthé", emoji: "🎛️" },
  { label: "Violon", emoji: "🎻" },
  { label: "Violoncelle", emoji: "🎻" },
  { label: "Saxophone", emoji: "🎷" },
  { label: "Trompette", emoji: "🎺" },
  { label: "Trombone", emoji: "🎺" },
  { label: "Flûte", emoji: "🪈" },
  { label: "Clarinette", emoji: "🪈" },
  { label: "Accordéon", emoji: "🪗" },
  { label: "Banjo", emoji: "🪕" },
  { label: "Ukulélé", emoji: "🪕" },
  { label: "Harmonica", emoji: "🎵" },
  { label: "DJ / Platines", emoji: "🎧" },
  { label: "Beatbox", emoji: "🗣️" },
] as const;

const OTHER_VALUE = "__other__";

interface InstrumentManagerModalProps {
  open: boolean;
  onClose: () => void;
  instruments: JamInstrument[];
  onAdd: (label: string, emoji: string) => Promise<void>;
  onUpdate: (id: string, updates: { label?: string; emoji?: string }) => Promise<void>;
  onRemove: (instrument: JamInstrument) => Promise<void>;
}

function InstrumentRow({ instrument, onUpdate, onRemove }: {
  instrument: JamInstrument;
  onUpdate: (id: string, updates: { label?: string; emoji?: string }) => Promise<void>;
  onRemove: (instrument: JamInstrument) => Promise<void>;
}) {
  const [label, setLabel] = useState(instrument.label);
  const [isRemoving, setIsRemoving] = useState(false);

  const saveLabel = () => {
    const trimmed = label.trim();
    if (trimmed && trimmed !== instrument.label) onUpdate(instrument.id, { label: trimmed });
    else setLabel(instrument.label);
  };

  const handleRemove = async () => {
    if (!confirm(`Supprimer l'instrument "${instrument.label}" ? Les musiciens déjà inscrits dessus seront retirés de leurs passages.`)) return;
    setIsRemoving(true);
    await onRemove(instrument);
  };

  const hasCustomIcon = instrument.key === "guitare" || instrument.key === "basse" || instrument.key === "guitare_acoustique";

  return (
    <div className="flex items-center gap-2 py-1.5">
      {hasCustomIcon ? (
        <div className="shrink-0 flex items-center justify-center" style={{ width: 44 }} title="Logo personnalisé">
          {instrument.key === "guitare"
            ? <GuitarHeadstockIcon className="h-6 w-6 object-contain" />
            : instrument.key === "basse"
              ? <BassHeadstockIcon className="h-6 w-6 object-contain" />
              : <Guitar className="h-6 w-6" />}
        </div>
      ) : (
        <div className="shrink-0 flex items-center justify-center text-lg" style={{ width: 44 }}>
          {instrument.emoji}
        </div>
      )}
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onBlur={saveLabel}
        onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
        className="flex-1 min-w-0 text-sm zik-input"
      />
      <button onClick={handleRemove} disabled={isRemoving}
        className="text-zik-muted hover:text-zik-red transition-colors shrink-0 p-1 disabled:opacity-50">
        {isRemoving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
      </button>
    </div>
  );
}

export function InstrumentManagerModal({ open, onClose, instruments, onAdd, onUpdate, onRemove }: InstrumentManagerModalProps) {
  const [selectedPreset, setSelectedPreset] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newEmoji, setNewEmoji] = useState("🎶");
  const [isAdding, setIsAdding] = useState(false);

  const isOther = selectedPreset === OTHER_VALUE;

  const handlePresetChange = (value: string) => {
    setSelectedPreset(value);
    if (value === OTHER_VALUE) {
      setNewLabel("");
      setNewEmoji("🎶");
    } else {
      const preset = PRESET_INSTRUMENTS.find((p) => p.label === value);
      if (preset) { setNewLabel(preset.label); setNewEmoji(preset.emoji); }
    }
  };

  const handleAdd = async () => {
    if (!newLabel.trim()) return;
    setIsAdding(true);
    await onAdd(newLabel.trim(), newEmoji.trim() || "🎶");
    setSelectedPreset("");
    setNewLabel("");
    setNewEmoji("🎶");
    setIsAdding(false);
  };

  return (
    <Modal open={open} onClose={onClose} title="Gérer les instruments" description="Ajoute, renomme ou retire un instrument des passages.">
      <div className="divide-y divide-zik-border/60">
        {instruments.map((inst) => (
          <InstrumentRow key={inst.id} instrument={inst} onUpdate={onUpdate} onRemove={onRemove} />
        ))}
      </div>

      <div className="mt-3 pt-3 border-t border-zik-border space-y-2">
        <select
          value={selectedPreset}
          onChange={(e) => handlePresetChange(e.target.value)}
          className="w-full text-sm zik-input"
        >
          <option value="" disabled>Choisir un instrument…</option>
          {PRESET_INSTRUMENTS.map((p) => (
            <option key={p.label} value={p.label}>{p.emoji} {p.label}</option>
          ))}
          <option value={OTHER_VALUE}>✏️ Autre…</option>
        </select>

        {isOther && (
          <div className="flex items-center gap-2">
            <input
              value={newEmoji}
              onChange={(e) => setNewEmoji(e.target.value)}
              className="shrink-0 text-center text-lg zik-input"
              style={{ width: 44 }}
              maxLength={4}
              placeholder="🎶"
            />
            <input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
              placeholder="Ex: Saxophone"
              className="flex-1 min-w-0 text-sm zik-input"
              autoFocus
            />
          </div>
        )}

        <Button size="sm" className="w-full bg-zik-purple hover:bg-zik-indigo"
          disabled={!newLabel.trim() || isAdding} onClick={handleAdd}>
          {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4 mr-1" /> Ajouter</>}
        </Button>
      </div>
    </Modal>
  );
}
