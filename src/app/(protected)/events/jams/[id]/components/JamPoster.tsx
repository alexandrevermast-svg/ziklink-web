"use client";

import { useRef } from "react";
import { Camera, ImagePlus, Loader2 } from "lucide-react";

export function JamPoster({
  posterUrl, isOrganizer, onUpload, isUploading,
}: {
  posterUrl: string | null;
  isOrganizer: boolean;
  onUpload: (file: File) => void;
  isUploading: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!posterUrl && !isOrganizer) return null;

  return (
    <div className="relative w-full overflow-hidden" style={{ borderRadius: '0 0 16px 16px' }}>
      {posterUrl ? (
        <div className="relative h-48 w-full">
          <img
            src={posterUrl}
            alt="Affiche de la jam"
            className="w-full h-full object-cover"
          />
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(to bottom, rgba(14,11,22,0.7) 0%, transparent 40%, transparent 60%, rgba(14,11,22,0.9) 100%)',
            }}
          />
          {isOrganizer && (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
              style={{
                background: 'rgba(14,11,22,0.7)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.75)',
              }}
            >
              {isUploading
                ? <><Loader2 size={12} className="animate-spin" /> Envoi...</>
                : <><Camera size={12} /> Changer</>
              }
            </button>
          )}
        </div>
      ) : (
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="w-full flex flex-col items-center justify-center gap-2 py-6 transition-all"
          style={{
            background: 'rgba(192,132,252,0.04)',
            border: '1px dashed rgba(192,132,252,0.20)',
            borderRadius: 12,
            margin: '0 16px 8px',
            width: 'calc(100% - 32px)',
          }}
        >
          {isUploading ? (
            <><Loader2 size={20} className="animate-spin" style={{ color: '#C084FC' }} />
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.40)' }}>Envoi en cours...</span></>
          ) : (
            <><ImagePlus size={20} style={{ color: 'rgba(192,132,252,0.50)' }} />
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                Ajouter une affiche
              </span></>
          )}
        </button>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
        }}
      />
    </div>
  );
}
