interface IconProps {
  className?: string;
}

// Tête de guitare — 6 mécaniques (une par corde).
export function GuitarHeadstockIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="3" y="3" width="18" height="7" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9.5 10 L14.5 10 L12.7 21 L11.3 21 Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="5" cy="6.5" r="1" fill="currentColor" />
      <circle cx="7.8" cy="6.5" r="1" fill="currentColor" />
      <circle cx="10.6" cy="6.5" r="1" fill="currentColor" />
      <circle cx="13.4" cy="6.5" r="1" fill="currentColor" />
      <circle cx="16.2" cy="6.5" r="1" fill="currentColor" />
      <circle cx="19" cy="6.5" r="1" fill="currentColor" />
    </svg>
  );
}

// Tête de basse — 4 mécaniques (une par corde), manche plus large.
export function BassHeadstockIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="3" y="3" width="18" height="7" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9 10 L15 10 L13 21 L11 21 Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="6" cy="6.5" r="1.1" fill="currentColor" />
      <circle cx="10.3" cy="6.5" r="1.1" fill="currentColor" />
      <circle cx="14.7" cy="6.5" r="1.1" fill="currentColor" />
      <circle cx="19" cy="6.5" r="1.1" fill="currentColor" />
    </svg>
  );
}
