/**
 * Polish pluralization helper.
 * Polish has 3 forms: singular (1), paucal (2-4, 22-24...), plural (5-21, 25-31...).
 */
export function pluralize(
  count: number,
  singular: string,
  paucal: string,
  plural: string
): string {
  const abs = Math.abs(count);
  if (abs === 1) return `${count} ${singular}`;
  const lastTwo = abs % 100;
  const lastOne = abs % 10;
  if (lastTwo >= 12 && lastTwo <= 14) return `${count} ${plural}`;
  if (lastOne >= 2 && lastOne <= 4) return `${count} ${paucal}`;
  return `${count} ${plural}`;
}

// Common Polish plurals used in the app
export const pl = {
  match: (n: number) => pluralize(n, "mecz", "mecze", "meczów"),
  point: (n: number) => pluralize(n, "punkt", "punkty", "punktów"),
  win: (n: number) => pluralize(n, "wygrana", "wygrane", "wygranych"),
  loss: (n: number) => pluralize(n, "przegrana", "przegrane", "przegranych"),
  leg: (n: number) => pluralize(n, "leg", "legi", "legów"),
  player: (n: number) => pluralize(n, "gracz", "graczy", "graczy"),
  participant: (n: number) => pluralize(n, "uczestnik", "uczestników", "uczestników"),
  league: (n: number) => pluralize(n, "liga", "ligi", "lig"),
  day: (n: number) => pluralize(n, "dzień", "dni", "dni"),
  throw: (n: number) => pluralize(n, "rzut", "rzuty", "rzutów"),
  achievement: (n: number) => pluralize(n, "osiągnięcie", "osiągnięcia", "osiągnięć"),
};
