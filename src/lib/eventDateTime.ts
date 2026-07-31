import moment from "moment-timezone";

// Combine une date (YYYY-MM-DD) + une heure locale (HH:mm) en UTC.
export function toUtcDateTime(date: string, hour: string): string {
  return moment.tz(`${date}T${hour}:00`, moment.tz.guess()).utc().format();
}

// Résout l'heure de fin en tenant compte du passage de minuit : si l'heure de
// fin est <= l'heure de début (ex: début 20h, fin 00h ou 2h), elle tombe le
// lendemain de la date de début plutôt que d'être invalide.
export function resolveEndDateTime(date: string, startHour: string, endHour: string): string {
  const endDate = endHour <= startHour
    ? moment.tz(date, moment.tz.guess()).add(1, "day").format("YYYY-MM-DD")
    : date;
  return toUtcDateTime(endDate, endHour);
}
