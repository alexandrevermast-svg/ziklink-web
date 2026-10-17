import { useEffect, useState } from "react";

// Bascule entre une hauteur pleine et une hauteur réduite une fois un seuil
// de scroll franchi, plutôt que d'interpoler en continu sur chaque pixel
// défilé (ce qui recalcule le layout à chaque frame et provoquait des
// artefacts visuels pendant le scroll). La transition reste progressive à
// l'écran grâce à la transition CSS posée sur l'élément.
//
// Un seul seuil provoque un effet de "vibration" : rétrécir la carte change
// la mise en page de la page (donc ce que window.scrollY représente), ce qui
// peut repasser sous le seuil et la faire regrandir aussitôt, en boucle. Deux
// seuils distincts (hystérésis) évitent ça — l'écart par défaut est calé sur
// la différence de hauteur elle-même, donc toujours assez large pour qu'un
// seul rétrécissement/agrandissement ne puisse pas, à lui seul, repasser
// l'autre seuil.
export function useShrinkOnScroll(maxHeight: number, minHeight: number, shrinkAt: number, growAt?: number) {
  const resolvedGrowAt = growAt ?? Math.max(0, shrinkAt - (maxHeight - minHeight) - 20);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled((prev) => {
        if (!prev && window.scrollY > shrinkAt) return true;
        if (prev && window.scrollY < resolvedGrowAt) return false;
        return prev;
      });
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [shrinkAt, resolvedGrowAt]);

  return scrolled ? minHeight : maxHeight;
}
