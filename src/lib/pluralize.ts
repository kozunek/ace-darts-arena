/**
 * Polish pluralization helper.
 * Polish has 3 forms: singular (1), paucal (2-4, 22-24...), plural (5-21, 25-31...).
 *
 * @example
 * pluralize(1, "mecz", "mecze", "meczów") // "1 mecz"
 * pluralize(2, "mecz", "mecze", "meczów") // "2 mecze"
 * pluralize(5, "mecz", "mecze", "meczów") // "5 meczów"
 * pluralize(22, "mecz", "mecze", "meczów") // "22 mecze"
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

/**
 * Returns the correct Polish adjective/numeral form based on count (without the count itself).
 * Follows the same 3-form rule as {@link pluralize}.
 *
 * @example
 * pluralizeAdj(1, "nowy", "nowe", "nowych") // "nowy"
 * pluralizeAdj(2, "nowy", "nowe", "nowych") // "nowe"
 * pluralizeAdj(5, "nowy", "nowe", "nowych") // "nowych"
 * pluralizeAdj(12, "nowy", "nowe", "nowych") // "nowych"
 */
export function pluralizeAdj(
  count: number,
  singular: string,
  paucal: string,
  plural: string
): string {
  const abs = Math.abs(count);
  if (abs === 1) return singular;
  const lastTwo = abs % 100;
  const lastOne = abs % 10;
  if (lastTwo >= 12 && lastTwo <= 14) return plural;
  if (lastOne >= 2 && lastOne <= 4) return paucal;
  return plural;
}

/**
 * Common Polish noun forms used in the app.
 * Each function takes a count and returns the formatted string with count and noun.
 *
 * @example
 * pl.match(1)  // "1 mecz"
 * pl.match(3)  // "3 mecze"
 * pl.match(7)  // "7 meczów"
 * pl.player(2) // "2 gracze"
 * pl.point(5)  // "5 punktów"
 */
export const pl = {
  match: (n: number) => pluralize(n, "mecz", "mecze", "meczów"),
  player: (n: number) => pluralize(n, "gracz", "gracze", "graczy"),
  point: (n: number) => pluralize(n, "punkt", "punkty", "punktów"),
  win: (n: number) => pluralize(n, "wygrana", "wygrane", "wygranych"),
  loss: (n: number) => pluralize(n, "przegrana", "przegrane", "przegranych"),
  leg: (n: number) => pluralize(n, "leg", "legi", "legów"),
  participant: (n: number) => pluralize(n, "uczestnik", "uczestnicy", "uczestników"),
  league: (n: number) => pluralize(n, "liga", "ligi", "lig"),
  day: (n: number) => pluralize(n, "dzień", "dni", "dni"),
  throw: (n: number) => pluralize(n, "rzut", "rzuty", "rzutów"),
  achievement: (n: number) => pluralize(n, "osiągnięcie", "osiągnięcia", "osiągnięć"),
  tournament: (n: number) => pluralize(n, "turniej", "turnieje", "turniejów"),
  round: (n: number) => pluralize(n, "runda", "rundy", "rund"),
  screenshot: (n: number) => pluralize(n, "screenshot", "screenshoty", "screenshotów"),
  account: (n: number) => pluralize(n, "konto", "konta", "kont"),
  error: (n: number) => pluralize(n, "błąd", "błędy", "błędów"),
  success: (n: number) => pluralize(n, "sukces", "sukcesy", "sukcesów"),
  message: (n: number) => pluralize(n, "wiadomość", "wiadomości", "wiadomości"),
  competitor: (n: number) => pluralize(n, "zawodnik", "zawodnicy", "zawodników"),
  result: (n: number) => pluralize(n, "wynik", "wyniki", "wyników"),
  statistic: (n: number) => pluralize(n, "statystyka", "statystyki", "statystyk"),
  position: (n: number) => pluralize(n, "pozycja", "pozycje", "pozycji"),
  ranking: (n: number) => pluralize(n, "ranking", "rankingi", "rankingów"),
};

/**
 * Common Polish adjective forms.
 * Each function takes a count and returns the correct adjective form (without the count).
 *
 * @example
 * adj.new(1) // "nowy"  (1 nowy mecz)
 * adj.new(2) // "nowe"  (2 nowe mecze)
 * adj.new(5) // "nowych" (5 nowych meczów)
 */
export const adj = {
  new: (n: number) => pluralizeAdj(n, "nowy", "nowe", "nowych"),
};
