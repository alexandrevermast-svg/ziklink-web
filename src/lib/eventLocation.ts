export function getAddress(s: string | null) {
  if (!s) return null;
  try { return JSON.parse(s)?.address ?? null; } catch { return null; }
}

export function getMapsUrl(s: string | null) {
  if (!s) return null;
  try {
    const loc = JSON.parse(s);
    if (typeof loc?.lat === "number" && typeof loc?.lng === "number") {
      return `https://www.google.com/maps/search/?api=1&query=${loc.lat},${loc.lng}`;
    }
    if (loc?.address) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc.address)}`;
    }
  } catch { /* adresse invalide */ }
  return null;
}
