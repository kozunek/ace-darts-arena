/**
 * Unified stat definitions used across all platforms (Autodarts, DartCounter, DartsMind).
 * This ensures consistent stat labels and ordering everywhere in the app.
 */

export interface StatRow {
  key1: string;
  key2: string;
  label: string;
  shortLabel: string;
  format?: "decimal" | "integer" | "checkout";
}

/**
 * Unified stats - displayed in the same order everywhere.
 * All 3 platforms: Autodarts, DartCounter, DartsMind provide these stats.
 */
export const UNIFIED_STATS: StatRow[] = [
  { key1: "avg1", key2: "avg2", label: "Średnia (3-dart)", shortLabel: "Średnia", format: "decimal" },
  { key1: "first9Avg1", key2: "first9Avg2", label: "Średnia z 9 lotek", shortLabel: "First 9", format: "decimal" },
  { key1: "oneEighties1", key2: "oneEighties2", label: "180-tki", shortLabel: "180s", format: "integer" },
  { key1: "highCheckout1", key2: "highCheckout2", label: "Najwyższy checkout", shortLabel: "High CO", format: "integer" },
  { key1: "ton60_1", key2: "ton60_2", label: "60+ (60-99)", shortLabel: "60+", format: "integer" },
  { key1: "ton80_1", key2: "ton80_2", label: "100+ (100-139)", shortLabel: "100+", format: "integer" },
  { key1: "tonPlus1", key2: "tonPlus2", label: "140+ (140-179)", shortLabel: "140+", format: "integer" },
  { key1: "dartsThrown1", key2: "dartsThrown2", label: "Rzucone lotki", shortLabel: "Lotki", format: "integer" },
];

/**
 * DB column name mapping for stats (snake_case -> camelCase)
 */
export const DB_TO_CAMEL: Record<string, string> = {
  avg1: "avg1", avg2: "avg2",
  first_9_avg1: "first9Avg1", first_9_avg2: "first9Avg2",
  avg_until_170_1: "avgUntil170_1", avg_until_170_2: "avgUntil170_2",
  one_eighties1: "oneEighties1", one_eighties2: "oneEighties2",
  high_checkout1: "highCheckout1", high_checkout2: "highCheckout2",
  ton60_1: "ton60_1", ton60_2: "ton60_2",
  ton80_1: "ton80_1", ton80_2: "ton80_2",
  ton_plus1: "tonPlus1", ton_plus2: "tonPlus2",
  ton40_1: "ton40_1", ton40_2: "ton40_2",
  darts_thrown1: "dartsThrown1", darts_thrown2: "dartsThrown2",
  checkout_attempts1: "checkoutAttempts1", checkout_attempts2: "checkoutAttempts2",
  checkout_hits1: "checkoutHits1", checkout_hits2: "checkoutHits2",
};

/**
 * Format a stat value for display
 */
export const formatStatValue = (value: number | undefined | null, format?: string): string => {
  if (value == null) return "—";
  if (format === "decimal") return value.toFixed(2);
  return String(value);
};

/**
 * Format checkout percentage
 */
export const formatCheckoutPct = (hits: number, attempts: number): string => {
  if (attempts <= 0) return "0.00% (0/0)";
  return `${((hits / attempts) * 100).toFixed(2)}% (${hits}/${attempts})`;
};

/**
 * Check if a match has any stats beyond just the score
 */
export const matchHasStats = (match: Record<string, any>): boolean => {
  return !!(match.avg1 || match.avg2 || match.dartsThrown1 || match.dartsThrown2 ||
            match.oneEighties1 || match.oneEighties2 || match.highCheckout1 || match.highCheckout2);
};
