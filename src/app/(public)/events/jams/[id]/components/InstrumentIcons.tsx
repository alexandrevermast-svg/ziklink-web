interface IconProps {
  className?: string;
}

// Tête de guitare — silhouette asymétrique, 6 mécaniques avec clé apparente.
export function GuitarHeadstockIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 34" fill="none" className={className}>
      <path
        d="M12 3 C18 2 21 5 20 9 C19 13 14 14.5 10.5 13.5 L9 31 L7 31 L8.3 13.2
           C4 13.5 1.5 10 2.3 6.5 C3.1 3 7 2.5 12 3 Z"
        fill="#818CF8"
      />
      {/* mécaniques côté gauche */}
      <circle cx="4.5" cy="6" r="1.15" fill="#818CF8" />
      <line x1="3.3" y1="6" x2="1.3" y2="6" stroke="#818CF8" strokeWidth="1.1" strokeLinecap="round" />
      <circle cx="3.6" cy="9.3" r="1.15" fill="#818CF8" />
      <line x1="2.4" y1="9.3" x2="0.4" y2="9.3" stroke="#818CF8" strokeWidth="1.1" strokeLinecap="round" />
      <circle cx="5.2" cy="12.3" r="1.15" fill="#818CF8" />
      <line x1="4" y1="12.3" x2="2" y2="12.3" stroke="#818CF8" strokeWidth="1.1" strokeLinecap="round" />
      {/* mécaniques côté haut */}
      <circle cx="9" cy="4.3" r="1" fill="#818CF8" />
      <line x1="9" y1="3.1" x2="9" y2="1.1" stroke="#818CF8" strokeWidth="1.1" strokeLinecap="round" />
      <circle cx="13" cy="3.6" r="1" fill="#818CF8" />
      <line x1="13" y1="2.4" x2="13" y2="0.4" stroke="#818CF8" strokeWidth="1.1" strokeLinecap="round" />
      <circle cx="16.8" cy="5" r="1" fill="#818CF8" />
      <line x1="17.6" y1="4.2" x2="19" y2="2.8" stroke="#818CF8" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

// Tête de basse — silhouette plus longue, 4 mécaniques alignées sur le bord gauche.
export function BassHeadstockIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 34" fill="none" className={className}>
      <path
        d="M11 2 C17 1.5 20 4.5 19.5 8.5 C19 14 15 17.5 11 16.5 L12 31 L9 31 L8.3 16.5
           C4.3 17 1.3 13.5 2 9 C2.7 4.5 6.5 1.5 11 2 Z"
        fill="#FB923C"
      />
      <circle cx="4.6" cy="4.8" r="1.25" fill="#FB923C" />
      <line x1="3.3" y1="4.8" x2="1.1" y2="4.8" stroke="#FB923C" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="3.4" cy="8.5" r="1.25" fill="#FB923C" />
      <line x1="2.1" y1="8.5" x2="0" y2="8.5" stroke="#FB923C" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="3.4" cy="12.5" r="1.25" fill="#FB923C" />
      <line x1="2.1" y1="12.5" x2="0" y2="12.5" stroke="#FB923C" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="5" cy="16" r="1.25" fill="#FB923C" />
      <line x1="3.7" y1="16" x2="1.6" y2="16" stroke="#FB923C" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
