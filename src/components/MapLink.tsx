"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink } from "lucide-react";

interface MapLinkProps {
  address: string;
  mapsUrl: string | null;
  className?: string;
  children: React.ReactNode;
}

// Au clic, propose d'ouvrir Google Maps dans une petite popover plutôt que
// de rediriger directement — évite de faire quitter l'app sans confirmation.
export function MapLink({ address, mapsUrl, className, children }: MapLinkProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (!mapsUrl) return <span className={className}>{children}</span>;

  return (
    <div ref={ref} className="relative min-w-0 max-w-full" onClick={(e) => e.stopPropagation()}>
      <button type="button" onClick={() => setOpen((o) => !o)} title={address}
        className={`min-w-0 max-w-full bg-transparent border-0 p-0 m-0 text-inherit cursor-pointer ${className ?? ""}`}>
        {children}
      </button>

      {open && (
        <div className="absolute z-30 mt-1.5 left-0 min-w-55 bg-zik-card border border-zik-border rounded-xl shadow-xl p-1.5">
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-2 py-2 rounded-lg text-sm font-medium text-zik-grad-to hover:bg-zik-grad-to/10 transition-colors">
            <ExternalLink className="h-4 w-4 shrink-0" /> Ouvrir dans Google Maps
          </a>
        </div>
      )}
    </div>
  );
}
