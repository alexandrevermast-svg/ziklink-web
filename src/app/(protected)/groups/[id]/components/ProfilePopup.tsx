"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Users, MessageCircle } from "lucide-react";
import { MemberAvatar } from "./MemberAvatar";
import type { Profile } from "../types";

export function ProfilePopup({ profile, anchorRef, onClose, onMessage, onViewProfile }: {
  profile: Profile;
  anchorRef: React.RefObject<HTMLElement>;
  onClose: () => void;
  onMessage: (userId: string) => void;
  onViewProfile: (userId: string) => void;
}) {
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        popupRef.current && !popupRef.current.contains(e.target as Node) &&
        anchorRef.current && !anchorRef.current.contains(e.target as Node)
      ) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose, anchorRef]);

  const rect = anchorRef.current?.getBoundingClientRect();

  return createPortal(
    <div
      ref={popupRef}
      className="fixed z-99998 bg-zik-card rounded-xl shadow-xl border border-zik-border p-3 min-w-45 animate-in fade-in slide-in-from-top-2 duration-200"
      style={{
        top: (rect?.bottom ?? 0) + 6,
        left: Math.min(rect?.left ?? 0, window.innerWidth - 200),
        zIndex: 100000,
      }}
    >
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-zik-border">
        <MemberAvatar profile={profile} size="sm" />
        <span className="text-sm font-semibold text-zik-text truncate">{profile.username ?? "Inconnu"}</span>
      </div>
      <button
        onClick={() => { onViewProfile(profile.id); onClose(); }}
        className="w-full flex items-center gap-2 text-xs text-zik-text font-medium hover:bg-zik-card-hover rounded-lg px-2 py-1.5 transition-colors mb-1"
      >
        <Users className="h-3.5 w-3.5 text-zik-purple" /> Voir le profil
      </button>
      <button
        onClick={() => { onMessage(profile.id); onClose(); }}
        className="w-full flex items-center gap-2 text-xs text-zik-purple font-medium hover:bg-zik-purple/10 rounded-lg px-2 py-1.5 transition-colors"
      >
        <MessageCircle className="h-3.5 w-3.5" /> Envoyer un message
      </button>
    </div>,
    document.body
  );
}
