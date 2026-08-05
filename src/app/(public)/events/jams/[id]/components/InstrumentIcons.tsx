interface IconProps {
  className?: string;
}

// Tête de guitare — fournie par l'utilisateur.
export function GuitarHeadstockIcon({ className }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label="Tête de guitare à six mécaniques"
      className={className}
    >
      <path d="M10.5 22V7.8C10.5 4.3 13 2 16 2c3 0 5 2.1 5 5 0 2.2-1 3.7-2.4 5.2-.9 1-1.1 2.3-.8 3.8l.7 3.1H17V22" />
      <path d="M13 22V9" />
      <path d="M15 22V7.5" />
      <path d="M10.7 5 7.6 4.2" />
      <path d="M10.5 7.8 7.1 7.1" />
      <path d="M10.5 10.7 6.8 10" />
      <path d="M10.5 13.6 6.8 13" />
      <path d="M10.5 16.5 7.1 16" />
      <path d="M10.5 19.2 7.6 18.8" />
      <circle cx="6.2" cy="3.8" r="1.4" />
      <circle cx="5.7" cy="6.8" r="1.4" />
      <circle cx="5.4" cy="9.8" r="1.4" />
      <circle cx="5.4" cy="12.8" r="1.4" />
      <circle cx="5.7" cy="15.8" r="1.4" />
      <circle cx="6.2" cy="18.8" r="1.4" />
      <circle cx="11.8" cy="5.2" r=".85" />
      <circle cx="11.8" cy="8.1" r=".85" />
      <circle cx="11.8" cy="11" r=".85" />
      <circle cx="11.8" cy="13.9" r=".85" />
      <circle cx="11.8" cy="16.8" r=".85" />
      <circle cx="11.8" cy="19.5" r=".85" />
      <path d="M9.6 20.5h8.8" />
    </svg>
  );
}

// Tête de basse — illustration fournie par l'utilisateur, recadrée sur le
// dessin (le fichier Inkscape d'origine est une page A4 avec l'illustration
// dans un coin).
export function BassHeadstockIcon({ className }: IconProps) {
  return (
    <img src="/icons/bass-headstock.svg" alt="Tête de basse à quatre mécaniques" className={className} />
  );
}
