export function formatDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
export function formatTime(d: string) {
  return new Date(d).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}
export function getAddress(s: string | null) {
  if (!s) return null;
  try { return JSON.parse(s)?.address ?? null; } catch { return null; }
}
