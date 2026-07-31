const JOIN_WINDOW_MS = 60 * 60 * 1000; // 1h avant le début

// L'inscription ferme (jam_participants) n'est possible qu'à partir d'1h avant le début —
// avant ça, seul "Intéressé" (jam_interested) est disponible.
export function canJoinJam(startTime: string): boolean {
  return Date.now() >= new Date(startTime).getTime() - JOIN_WINDOW_MS;
}

export function joinOpensAt(startTime: string): Date {
  return new Date(new Date(startTime).getTime() - JOIN_WINDOW_MS);
}
