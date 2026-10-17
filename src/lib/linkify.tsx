import React from "react";

const URL_PATTERN = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
const IS_URL = /^(https?:\/\/[^\s]+|www\.[^\s]+)$/i;

// Détecte les URLs dans un texte libre (description, etc.) et les rend
// cliquables. stopPropagation car ces textes sont souvent affichés dans des
// cards dont le clic sert déjà à plier/déplier.
export function linkifyText(text: string): React.ReactNode[] {
  return text.split(URL_PATTERN).filter(Boolean).map((part, i) => {
    if (!IS_URL.test(part)) return part;
    const href = part.startsWith("http") ? part : `https://${part}`;
    return (
      <a
        key={i}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="text-zik-grad-to underline hover:brightness-110 break-all"
      >
        {part}
      </a>
    );
  });
}
