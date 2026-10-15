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

// Affichage condensé pour les cards : nom du lieu (s'il existe), puis numéro +
// rue, puis code postal + ville — à la place de la ligne Nominatim brute (qui
// contient arrondissement, région, pays...). Les lieux enregistrés avant cet
// ajout n'ont pas ces champs structurés : on retombe alors sur l'adresse complète.
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

// Même source que getDisplayAddress, mais le nom du lieu séparé du reste
// (rue + code postal/ville) pour pouvoir lui donner une mise en forme
// différente — ex. nom en avant, reste en plus petit en dessous.
export interface AddressParts { name: string | null; detail: string | null }

export function getAddressParts(s: string | null): AddressParts | null {
  const loc = parseLocation(s);
  if (!loc) return null;
  const { name, street, postcode, city, address } = loc;
  if (name || street || city) {
    const cityLine = [postcode, city].filter(Boolean).join(" ");
    const detail = [street, cityLine].filter(Boolean).join(", ");
    return { name: name ?? null, detail: detail || null };
  }
  return { name: null, detail: address ?? null };
}
