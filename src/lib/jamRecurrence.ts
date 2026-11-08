export const DAYS_OF_WEEK = [
  { label: "L", value: 1, full: "Lundi" },
  { label: "M", value: 2, full: "Mardi" },
  { label: "M", value: 3, full: "Mercredi" },
  { label: "J", value: 4, full: "Jeudi" },
  { label: "V", value: 5, full: "Vendredi" },
  { label: "S", value: 6, full: "Samedi" },
  { label: "D", value: 0, full: "Dimanche" },
];

export const MONTHLY_ORDINALS = [
  { value: 1, label: "1er" },
  { value: 2, label: "2ème" },
  { value: 3, label: "3ème" },
  { value: 4, label: "4ème" },
  { value: -1, label: "Dernier" },
];

export interface RecurrenceData {
  enabled: boolean;
  type: "weekly" | "monthly";
  frequency: number; days: number[];
  monthlyOrdinal: number; monthlyWeekday: number;
  endType: "date" | "count"; endDate: string; count: number;
}

export function defaultRecurrence(): RecurrenceData {
  return {
    enabled: false, type: "weekly", frequency: 1, days: [],
    monthlyOrdinal: 2, monthlyWeekday: 5,
    endType: "count", endDate: "", count: 8,
  };
}

// Renvoie la date du N-ième (ou dernier, si ordinal = -1) jour de semaine
// donné dans le mois indiqué.
function nthWeekdayOfMonth(year: number, month: number, weekday: number, ordinal: number): Date {
  if (ordinal === -1) {
    const last = new Date(year, month + 1, 0);
    const offset = (last.getDay() - weekday + 7) % 7;
    last.setDate(last.getDate() - offset);
    return last;
  }
  const first = new Date(year, month, 1);
  const offset = (weekday - first.getDay() + 7) % 7;
  first.setDate(1 + offset + (ordinal - 1) * 7);
  return first;
}

function generateWeeklyOccurrences(base: Date, recurrence: RecurrenceData, maxCount: number, endDate: Date | null): Date[] {
  const results: Date[] = [];
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
  return results;
}

function generateMonthlyOccurrences(base: Date, recurrence: RecurrenceData, maxCount: number, endDate: Date | null): Date[] {
  const results: Date[] = [];
  let year = base.getFullYear();
  let month = base.getMonth();
  let monthOffset = 0;
  while (results.length < maxCount) {
    const d = nthWeekdayOfMonth(year, month + monthOffset * recurrence.frequency, recurrence.monthlyWeekday, recurrence.monthlyOrdinal);
    if (d >= base) {
      if (endDate && d > endDate) return results;
      results.push(d);
    }
    monthOffset++;
    if (monthOffset > 240) break;
  }
  return results;
}

export function generateOccurrences(startDate: string, recurrence: RecurrenceData): Date[] {
  if (!recurrence.enabled) return [];
  if (recurrence.type === "weekly" && recurrence.days.length === 0) return [];
  const base = new Date(startDate);
  const maxCount = recurrence.endType === "count" ? recurrence.count : 365;
  const endDate = recurrence.endType === "date" && recurrence.endDate ? new Date(recurrence.endDate) : null;
  const results = recurrence.type === "monthly"
    ? generateMonthlyOccurrences(base, recurrence, maxCount, endDate)
    : generateWeeklyOccurrences(base, recurrence, maxCount, endDate);
  return results.sort((a, b) => a.getTime() - b.getTime());
}

export function formatDateShort(d: Date) {
  return d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
}
