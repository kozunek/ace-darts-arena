import { Match, PlayerLeagueStats } from "@/data/mockData";

export interface RankedEntry {
  id: string;
  rank: number;
  stats: PlayerLeagueStats & { legDifference: number };
}

/**
 * Calculates league standings with proper tiebreaker logic:
 * 1. Points (desc)
 * 2. Leg difference (desc)
 * 3. Head-to-head (mini-table for >2 tied players)
 * 4. 3-Dart Average (desc)
 * 5. Highest Checkout (desc)
 */
export function calculateLeagueStandings<T extends { id: string; stats: PlayerLeagueStats }>(
  entries: T[],
  matches: Match[],
  leagueId: string,
): (T & { rank: number; stats: T["stats"] & { legDifference: number } })[] {
  // Enrich stats with legDifference
  const enriched = entries.map(e => ({
    ...e,
    stats: {
      ...e.stats,
      legDifference: e.stats.legsWon - e.stats.legsLost,
    },
  }));

  const sorted = sortWithTiebreakers(enriched, matches, leagueId, false);

  // Assign ranks (same rank for truly tied players)
  let rank = 1;
  return sorted.map((entry, i) => {
    if (i > 0 && !areEqual(sorted[i - 1], entry)) {
      rank = i + 1;
    }
    return { ...entry, rank };
  });
}

function areEqual<T extends { stats: PlayerLeagueStats & { legDifference: number } }>(a: T, b: T): boolean {
  return (
    a.stats.points === b.stats.points &&
    a.stats.legDifference === b.stats.legDifference &&
    a.stats.avg === b.stats.avg &&
    a.stats.highestCheckout === b.stats.highestCheckout
  );
}

function sortWithTiebreakers<T extends { id: string; stats: PlayerLeagueStats & { legDifference: number } }>(
  entries: T[],
  matches: Match[],
  leagueId: string,
  isH2H: boolean,
): T[] {
  if (entries.length <= 1) return entries;

  // Sort by points, then leg diff
  const sorted = [...entries].sort((a, b) => {
    const ptsDiff = b.stats.points - a.stats.points;
    if (ptsDiff !== 0) return ptsDiff;
    const ldDiff = b.stats.legDifference - a.stats.legDifference;
    if (ldDiff !== 0) return ldDiff;
    return 0;
  });

  // Group tied players (same points AND same leg diff)
  const result: T[] = [];
  let i = 0;
  while (i < sorted.length) {
    let j = i + 1;
    while (
      j < sorted.length &&
      sorted[j].stats.points === sorted[i].stats.points &&
      sorted[j].stats.legDifference === sorted[i].stats.legDifference
    ) {
      j++;
    }

    const tiedGroup = sorted.slice(i, j);
    if (tiedGroup.length === 1 || isH2H) {
      // If already in H2H round or single player, fall back to avg/checkout
      result.push(...tiedGroup.sort((a, b) => {
        const avgDiff = b.stats.avg - a.stats.avg;
        if (avgDiff !== 0) return avgDiff;
        return b.stats.highestCheckout - a.stats.highestCheckout;
      }));
    } else {
      // Apply head-to-head
      result.push(...resolveH2HTie(tiedGroup, matches, leagueId));
    }
    i = j;
  }

  return result;
}

function resolveH2HTie<T extends { id: string; stats: PlayerLeagueStats & { legDifference: number } }>(
  tiedPlayers: T[],
  matches: Match[],
  leagueId: string,
): T[] {
  if (tiedPlayers.length === 2) {
    return resolveTwoPlayerH2H(tiedPlayers[0], tiedPlayers[1], matches, leagueId);
  }

  // For >2 players: create mini-table from matches between them only
  const tiedIds = new Set(tiedPlayers.map(p => p.id));
  const h2hMatches = matches.filter(
    m =>
      m.leagueId === leagueId &&
      m.status === "completed" &&
      tiedIds.has(m.player1Id) &&
      tiedIds.has(m.player2Id)
  );

  // Calculate mini-standings
  const miniStats = new Map<string, { wins: number; legsWon: number; legsLost: number }>();
  for (const p of tiedPlayers) {
    miniStats.set(p.id, { wins: 0, legsWon: 0, legsLost: 0 });
  }

  for (const m of h2hMatches) {
    const s1 = miniStats.get(m.player1Id);
    const s2 = miniStats.get(m.player2Id);
    if (!s1 || !s2) continue;

    const score1 = m.score1 ?? 0;
    const score2 = m.score2 ?? 0;
    const legs1 = m.legsWon1 ?? m.score1 ?? 0;
    const legs2 = m.legsWon2 ?? m.score2 ?? 0;

    s1.legsWon += legs1;
    s1.legsLost += legs2;
    s2.legsWon += legs2;
    s2.legsLost += legs1;

    if (score1 > score2) s1.wins++;
    else if (score2 > score1) s2.wins++;
  }

  // Sort by h2h wins, then h2h leg diff, then fall back to avg/checkout
  return [...tiedPlayers].sort((a, b) => {
    const sa = miniStats.get(a.id)!;
    const sb = miniStats.get(b.id)!;
    const winDiff = sb.wins - sa.wins;
    if (winDiff !== 0) return winDiff;
    const ldA = sa.legsWon - sa.legsLost;
    const ldB = sb.legsWon - sb.legsLost;
    if (ldB - ldA !== 0) return ldB - ldA;
    const avgDiff = b.stats.avg - a.stats.avg;
    if (avgDiff !== 0) return avgDiff;
    return b.stats.highestCheckout - a.stats.highestCheckout;
  });
}

function resolveTwoPlayerH2H<T extends { id: string; stats: PlayerLeagueStats & { legDifference: number } }>(
  a: T,
  b: T,
  matches: Match[],
  leagueId: string,
): T[] {
  const h2hMatches = matches.filter(
    m =>
      m.leagueId === leagueId &&
      m.status === "completed" &&
      ((m.player1Id === a.id && m.player2Id === b.id) ||
        (m.player1Id === b.id && m.player2Id === a.id))
  );

  let aWins = 0, bWins = 0;
  let aLegs = 0, bLegs = 0;

  for (const m of h2hMatches) {
    const isAP1 = m.player1Id === a.id;
    const scoreA = isAP1 ? (m.score1 ?? 0) : (m.score2 ?? 0);
    const scoreB = isAP1 ? (m.score2 ?? 0) : (m.score1 ?? 0);
    const legsA = isAP1 ? (m.legsWon1 ?? m.score1 ?? 0) : (m.legsWon2 ?? m.score2 ?? 0);
    const legsB = isAP1 ? (m.legsWon2 ?? m.score2 ?? 0) : (m.legsWon1 ?? m.score1 ?? 0);

    aLegs += legsA;
    bLegs += legsB;
    if (scoreA > scoreB) aWins++;
    else if (scoreB > scoreA) bWins++;
  }

  if (aWins !== bWins) return aWins > bWins ? [a, b] : [b, a];
  if (aLegs - bLegs !== 0) return aLegs > bLegs ? [a, b] : [b, a];

  // Fall back to avg, then checkout
  const avgDiff = b.stats.avg - a.stats.avg;
  if (avgDiff !== 0) return avgDiff > 0 ? [b, a] : [a, b];
  return b.stats.highestCheckout >= a.stats.highestCheckout ? [b, a] : [a, b];
}
