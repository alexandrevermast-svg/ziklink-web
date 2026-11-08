export const DAYS_OF_WEEK = [
  { label: "L", value: 1, full: "Lundi" },
  { label: "M", value: 2, full: "Mardi" },
  { label: "M", value: 3, full: "Mercredi" },
  { label: "J", value: 4, full: "Jeudi" },
  { label: "V", value: 5, full: "Vendredi" },
  { label: "S", value: 6, full: "Samedi" },
  { label: "D", value: 0, full: "Dimanche" },
];

export interface RecurrenceData {
  enabled: boolean; frequency: number; days: number[];
  endType: "date" | "count"; endDate: string; count: number;
}

export function defaultRecurrence(): RecurrenceData {
  return { enabled: false, frequency: 1, days: [], endType: "count", endDate: "", count: 8 };
}

export function generateOccurrences(startDate: string, recurrence: RecurrenceData): Date[] {
  if (!recurrence.enabled || recurrence.days.length === 0) return [];
  const base = new Date(startDate);
  const results: Date[] = [];
  const maxCount = recurrence.endType === "count" ? recurrence.count : 365;
  const endDate = recurrence.endType === "date" && recurrence.endDate ? new Date(recurrence.endDate) : null;
  let cursor = new Date(base);
  cursor.setDate(cursor.getDate() - cursor.getDay() + (cursor.getDay() === 0 ? -6 : 1));
  let weekOffset = 0;
  while (results.length < maxCount) {
    for (const dayValue of recurrence.days) {
      const dayOffset = dayValue === 0 ? 6 : dayValue - 1;
      const d = new Date(cursor);
      d.setDate(cursor.getDate() + dayOffset + weekOffset * 7 * recurrence.frequency);
      if (d < base) continue;
      if (endDate && d > endDate) return results;
      if (results.length >= maxCount) return results;
      results.push(new Date(d));
    }
    weekOffset++;
    if (weekOffset > 200) break;
  }
  return results.sort((a, b) => a.getTime() - b.getTime());
}

export function formatDateShort(d: Date) {
  return d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
}
