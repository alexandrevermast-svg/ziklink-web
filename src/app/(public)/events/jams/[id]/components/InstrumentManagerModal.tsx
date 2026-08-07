"use client";

import { useState } from "react";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/button";
import { Trash2, Plus, Loader2 } from "lucide-react";
import type { JamInstrument } from "../types";

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
  const [emoji, setEmoji] = useState(instrument.emoji);
  const [isRemoving, setIsRemoving] = useState(false);

  const saveLabel = () => {
    const trimmed = label.trim();
    if (trimmed && trimmed !== instrument.label) onUpdate(instrument.id, { label: trimmed });
    else setLabel(instrument.label);
  };

  const saveEmoji = () => {
    const trimmed = emoji.trim();
    if (trimmed && trimmed !== instrument.emoji) onUpdate(instrument.id, { emoji: trimmed });
    else setEmoji(instrument.emoji);
  };

  const handleRemove = async () => {
    if (!confirm(`Supprimer l'instrument "${instrument.label}" ? Les musiciens déjà inscrits dessus seront retirés de leurs passages.`)) return;
    setIsRemoving(true);
    await onRemove(instrument);
  };

  return (
    <div className="flex items-center gap-2 py-1.5">
      <input
        value={emoji}
        onChange={(e) => setEmoji(e.target.value)}
        onBlur={saveEmoji}
        onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
        className="shrink-0 text-center text-lg zik-input"
        style={{ width: 44 }}
        maxLength={4}
      />
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
  const [newLabel, setNewLabel] = useState("");
  const [newEmoji, setNewEmoji] = useState("🎶");
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = async () => {
    if (!newLabel.trim()) return;
    setIsAdding(true);
    await onAdd(newLabel.trim(), newEmoji.trim() || "🎶");
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

      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-zik-border">
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
        />
        <Button size="sm" className="bg-zik-purple hover:bg-zik-indigo shrink-0"
          disabled={!newLabel.trim() || isAdding} onClick={handleAdd}>
          {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        </Button>
      </div>
    </Modal>
  );
}
