"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";

interface ShareButtonProps {
  url: string;
  title: string;
  text?: string;
  variant?: "icon" | "button";
  className?: string;
}

export default function ShareButton({ url, title, text, variant = "icon", className }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const absoluteUrl = new URL(url, window.location.origin).toString();

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url: absoluteUrl });
      } catch {
        // Partage annulé par l'utilisateur — rien à faire.
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(absoluteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Presse-papiers indisponible — rien à faire.
    }
  };

  if (variant === "button") {
    return (
      <button
        onClick={handleShare}
        className={className ?? "flex items-center gap-1.5 text-xs text-zik-muted hover:text-zik-purple transition-colors"}
      >
        {copied ? <><Check className="h-3.5 w-3.5" /> Lien copié</> : <><Share2 className="h-3.5 w-3.5" /> Partager</>}
      </button>
    );
  }

  return (
    <button
      onClick={handleShare}
      title={copied ? "Lien copié" : "Partager"}
      className={className ?? "h-7 w-7 flex items-center justify-center rounded-full text-zik-muted hover:text-zik-purple hover:bg-zik-purple/10 transition-colors"}
    >
      {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
    </button>
  );
}
