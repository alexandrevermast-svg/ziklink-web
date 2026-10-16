import React from "react";

const URL_RE = /(https?:\/\/[^\s<>"]+|www\.[^\s<>"]+)/gi;
const TRAILING_PUNCT_RE = /[.,;:!?)\]}'"]+$/;

// Rend un texte en détectant les URL et en les transformant en liens
// cliquables, sans jamais injecter de HTML brut (pas de dangerouslySetInnerHTML).
export function Linkify({ text, className }: { text: string; className?: string }) {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;

  for (const match of text.matchAll(URL_RE)) {
    const raw = match[0];
    const start = match.index ?? 0;
    const trailingMatch = raw.match(TRAILING_PUNCT_RE);
    const trailing = trailingMatch ? trailingMatch[0] : "";
    const url = trailing ? raw.slice(0, -trailing.length) : raw;
    if (!url) continue;

    if (start > lastIndex) nodes.push(text.slice(lastIndex, start));
    const href = url.startsWith("http") ? url : `https://${url}`;
    nodes.push(
      <a key={key++} href={href} target="_blank" rel="noopener noreferrer nofollow"
        className={className ?? "text-zik-grad-to hover:underline break-all"}>
        {url}
      </a>
    );
    if (trailing) nodes.push(trailing);
    lastIndex = start + raw.length;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));

  return <>{nodes}</>;
}
