"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Check, Guitar, Lock } from "lucide-react";
import { GuitarHeadstockIcon, BassHeadstockIcon } from "./InstrumentIcons";
import type { JamInstrument } from "../types";

function RowInstrumentIcon({ instKey, emoji }: { instKey: string; emoji: string }) {
  if (instKey === "guitare") return <GuitarHeadstockIcon className="h-5 w-5 object-contain shrink-0" />;
  if (instKey === "basse") return <BassHeadstockIcon className="h-5 w-5 object-contain shrink-0" />;
  if (instKey === "guitare_acoustique") return <Guitar className="h-5 w-5 shrink-0" />;
  return <span className="text-lg leading-none shrink-0">{emoji}</span>;
}

interface RowInstrumentMenuProps {
  instruments: JamInstrument[];
  hiddenKeys: string[];
  lockedKeys: string[];
  anchorEl: HTMLElement;
  onToggle: (key: string) => void;
  onClose: () => void;
}

export function RowInstrumentMenu({ instruments, hiddenKeys, lockedKeys, anchorEl, onToggle, onClose }: RowInstrumentMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node) && !anchorEl.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose, anchorEl]);

  const rect = anchorEl.getBoundingClientRect();
  return createPortal(
    <div ref={ref}
      style={{ position: "fixed", top: rect.bottom + 4, left: Math.min(rect.left, window.innerWidth - 240), zIndex: 99999, width: "min(90vw, 240px)" }}
      className="bg-zik-card rounded-xl shadow-xl border border-zik-border overflow-hidden">
      <div className="px-3 py-2.5 border-b border-zik-border">
        <p className="text-sm font-semibold text-zik-text">Instruments de ce tour</p>
      </div>
      <div className="max-h-56 overflow-y-auto py-1">
        {instruments.map((inst) => {
          const isHidden = hiddenKeys.includes(inst.key);
          const isLocked = lockedKeys.includes(inst.key);
          return (
            <button key={inst.key}
              onClick={() => !isLocked && onToggle(inst.key)}
              disabled={isLocked && !isHidden}
              title={isLocked ? "Déjà occupé sur ce tour — libère-le d'abord" : undefined}
              className={`w-full flex items-center gap-2.5 px-3 py-2 transition-colors text-left ${
                isLocked && !isHidden ? "opacity-40 cursor-not-allowed" : "hover:bg-zik-card-hover cursor-pointer"
              }`}>
              <RowInstrumentIcon instKey={inst.key} emoji={inst.emoji} />
              <span className="flex-1 min-w-0 text-sm font-medium text-zik-text truncate">{inst.label}</span>
              {isLocked ? (
                <Lock className="h-3.5 w-3.5 text-zik-muted shrink-0" />
              ) : !isHidden ? (
                <Check className="h-4 w-4 text-zik-grad-to shrink-0" />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>,
    document.body
  );
}
