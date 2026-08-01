"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ShieldCheck, UserPlus } from "lucide-react";
import type { Participant, JamSlot } from "../types";

interface ParticipantPickerProps {
  instrument: string; slot_index: number; participants: Participant[];
  slots: JamSlot[]; anchorEl: HTMLElement;
  onPick: (userId: string, instrument: string, slot_index: number) => void;
  onPickGuest: (name: string, instrument: string, slot_index: number) => void;
  onClose: () => void;
}

export function ParticipantPicker({ instrument, slot_index, participants, slots, anchorEl, onPick, onPickGuest, onClose }: ParticipantPickerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [guestName, setGuestName] = useState("");
  const alreadyOnThisRow = useMemo(
    () => new Set(slots.filter((s) => s.slot_index === slot_index && !!s.user_id).map((s) => s.user_id as string)),
    [slots, slot_index]
  );
  const available = participants.filter((p) => p.status === "confirmed" && !alreadyOnThisRow.has(p.user_id));

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node) && !anchorEl.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose, anchorEl]);

  const handleAddGuest = () => {
    if (!guestName.trim()) return;
    onPickGuest(guestName.trim(), instrument, slot_index);
    onClose();
  };

  const rect = anchorEl.getBoundingClientRect();
  return createPortal(
    <div ref={ref}
      style={{ position: "fixed", top: rect.bottom + 4, left: Math.min(rect.left, window.innerWidth - 220), zIndex: 99999, width: "min(90vw, 220px)" }}
      className="bg-zik-card rounded-xl shadow-xl border border-zik-border overflow-hidden">
      <div className="px-3 py-2 border-b border-zik-border">
        <p className="text-xs font-semibold text-zik-text">Assigner un participant</p>
        <p className="text-[10px] text-zik-muted mt-0.5">Ligne {slot_index + 1}</p>
      </div>
      {available.length === 0 ? (
        <p className="text-xs text-zik-muted text-center py-4 px-3">Tous les participants sont déjà sur cette ligne.</p>
      ) : (
        <div className="max-h-40 overflow-y-auto py-1">
          {available.map((p) => (
            <button key={p.user_id} onClick={() => { onPick(p.user_id, instrument, slot_index); onClose(); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-zik-card-hover transition-colors text-left">
              {p.profile?.avatar_url ? (
                <img src={p.profile.avatar_url} alt="" className="h-6 w-6 rounded-full object-cover shrink-0" />
              ) : (
                <div className="h-6 w-6 rounded-full bg-zik-purple flex items-center justify-center text-white text-[9px] font-semibold shrink-0">
                  {p.profile?.username?.slice(0, 2).toUpperCase() ?? "?"}
                </div>
              )}
              <span className="text-xs font-medium text-zik-text truncate">{p.profile?.username ?? "Inconnu"}</span>
              {p.is_organizer && <ShieldCheck className="h-3 w-3 text-zik-indigo shrink-0 ml-auto" />}
            </button>
          ))}
        </div>
      )}
      <div className="border-t border-zik-border p-2 space-y-1.5" onClick={(e) => e.stopPropagation()}>
        <p className="text-[10px] text-zik-muted px-1">Sans compte (juste un pseudo)</p>
        <div className="flex gap-1.5">
          <input
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddGuest(); } }}
            placeholder="Pseudo..."
            className="flex-1 min-w-0 text-xs bg-zik-bg border border-zik-border rounded-md px-2 py-1.5 text-zik-text placeholder:text-zik-muted outline-none focus:ring-1 focus:ring-zik-purple"
          />
          <button
            onClick={handleAddGuest}
            disabled={!guestName.trim()}
            className="shrink-0 flex items-center justify-center h-7 w-7 rounded-md bg-zik-purple/10 text-zik-purple hover:bg-zik-purple/20 disabled:opacity-40 transition-colors"
          >
            <UserPlus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
