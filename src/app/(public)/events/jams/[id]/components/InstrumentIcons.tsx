interface IconProps {
  className?: string;
}

// Tête de guitare — illustration fournie par l'utilisateur, recadrée sur le
// dessin (les éléments d'origine sont dispersés sur un canevas 70x70 avec
// des rotations à 45°).
export function GuitarHeadstockIcon({ className }: IconProps) {
  return (
    <img src="/icons/guitar-headstock.svg" alt="Tête de guitare à six mécaniques" className={className} />
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
