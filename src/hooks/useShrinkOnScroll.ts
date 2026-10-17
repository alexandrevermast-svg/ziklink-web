import { useEffect, useState } from "react";

// Hauteur (px) qui diminue linéairement de maxHeight à minHeight sur les
// `distance` premiers pixels de scroll de la page, pour un effet de carte qui
// se réduit progressivement au lieu de rester figée à sa taille maximale.
export function useShrinkOnScroll(maxHeight: number, minHeight: number, distance: number) {
  const [height, setHeight] = useState(maxHeight);

  useEffect(() => {
    const handleScroll = () => {
      const ratio = Math.min(1, Math.max(0, window.scrollY / distance));
      setHeight(maxHeight - (maxHeight - minHeight) * ratio);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [maxHeight, minHeight, distance]);

  return height;
}
