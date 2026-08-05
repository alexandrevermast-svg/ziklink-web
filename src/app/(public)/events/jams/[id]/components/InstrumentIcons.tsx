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

// Tête de basse — fournie par l'utilisateur.
export function BassHeadstockIcon({ className }: IconProps) {
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
      aria-label="Tête de basse à quatre mécaniques"
      className={className}
    >
      <path d="M10 22V8.5c0-3.7 2.5-6.5 6-6.5 2.8 0 4.5 1.8 4.5 4.2 0 2-1 3.2-2.5 4.3V22" />
      <path d="M13 22V10" />
      <path d="M15.5 22V8.5" />
      <path d="M10.2 6.1 6.7 5" />
      <path d="M10 9.8 6.2 8.8" />
      <path d="M10 13.5 5.8 12.6" />
      <path d="M10 17.2 6.5 16.4" />
      <path d="M6.7 5 5 3.8 3.1 4.5 2.5 6.3 3.8 7.5 5.7 6.8Z" />
      <path d="M6.2 8.8 4.4 7.8 2.8 8.8 2.5 10.7 4 11.7 5.8 10.8Z" />
      <path d="M5.8 12.6 4 11.8 2.5 13 2.5 14.9 4.1 15.7 5.9 14.6Z" />
      <path d="M6.5 16.4 4.8 15.7 3.3 17 3.5 18.9 5.2 19.5 6.8 18.3Z" />
      <circle cx="11.8" cy="6.4" r="1.2" />
      <circle cx="11.8" cy="10.2" r="1.2" />
      <circle cx="11.8" cy="14" r="1.2" />
      <circle cx="11.8" cy="17.8" r="1.2" />
      <path d="M9.5 20h8.8" />
    </svg>
  );
}
