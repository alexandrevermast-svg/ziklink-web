export interface ProfileLink {
  label: string;
  url: string;
}

export const MAX_PROFILE_LINKS = 3;

export function parseProfileLinks(raw: unknown): ProfileLink[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((l): l is { label?: unknown; url?: unknown } => !!l && typeof l === "object")
    .map((l) => ({
      label: typeof l.label === "string" ? l.label : "",
      url: typeof l.url === "string" ? l.url : "",
    }))
    .filter((l) => l.url.trim())
    .slice(0, MAX_PROFILE_LINKS);
}

export function normalizeLinkUrl(url: string) {
  const trimmed = url.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}
