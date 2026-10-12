interface LocationData {
  address?: string | null;
  lat?: number;
  lng?: number;
  name?: string | null;
  street?: string | null;
  postcode?: string | null;
  city?: string | null;
}

function parseLocation(s: string | null): LocationData | null {
  if (!s) return null;
  try { return JSON.parse(s); } catch { return null; }
}

export function getAddress(s: string | null) {
  return parseLocation(s)?.address ?? null;
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

// Affichage condensé : nom du lieu (s'il existe), puis numéro + rue, puis
// code postal + ville — à la place de la ligne Nominatim brute (qui contient
// arrondissement, région, pays...). Les lieux déjà enregistrés avant cet ajout
// n'ont pas ces champs structurés : on retombe alors sur l'adresse complète.
export function getDisplayAddress(s: string | null): string | null {
  const loc = parseLocation(s);
  if (!loc) return null;
  const { name, street, postcode, city, address } = loc;
  if (name || street || city) {
    const cityLine = [postcode, city].filter(Boolean).join(" ");
    return [name, street, cityLine].filter(Boolean).join(" · ");
  }
  return address ?? null;
}
