import { useEffect, useState } from "react";

// Bascule entre une hauteur pleine et une hauteur réduite une fois un seuil
// de scroll franchi, plutôt que d'interpoler en continu sur chaque pixel
// défilé (ce qui recalcule le layout à chaque frame et provoquait des
// artefacts visuels pendant le scroll). La transition reste progressive à
// l'écran grâce à la transition CSS posée sur l'élément.
export function useShrinkOnScroll(maxHeight: number, minHeight: number, threshold: number) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > threshold);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [threshold]);

  return scrolled ? minHeight : maxHeight;
}
