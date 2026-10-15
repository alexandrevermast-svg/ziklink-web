"use client";

export function JamPoster({ posterUrl }: { posterUrl: string }) {
  return (
    <div className="relative w-full h-48 overflow-hidden" style={{ borderRadius: '0 0 16px 16px' }}>
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
    </div>
  );
}
