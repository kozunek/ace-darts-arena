import type { Player } from "@/data/mockData";

/** Fisher-Yates shuffle */
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Generate round-robin schedule (each pair plays once).
 *  Returns array of { player1Id, player2Id, round } */
export function generateRoundRobin(playerIds: string[]): { player1Id: string; player2Id: string; round: number }[] {
  const ids = [...playerIds];
  // If odd number of players, add a "bye" placeholder
  const hasBye = ids.length % 2 !== 0;
  if (hasBye) ids.push("BYE");

  const n = ids.length;
  const rounds: { player1Id: string; player2Id: string; round: number }[] = [];

  for (let round = 0; round < n - 1; round++) {
    for (let i = 0; i < n / 2; i++) {
      const home = ids[i];
      const away = ids[n - 1 - i];
      if (home !== "BYE" && away !== "BYE") {
        rounds.push({ player1Id: home, player2Id: away, round: round + 1 });
      }
    }
    // Rotate: keep first element fixed, rotate the rest
    const last = ids.pop()!;
    ids.splice(1, 0, last);
  }

  return rounds;
}

/** Generate single-elimination bracket matches.
 *  Returns array of { player1Id, player2Id | null, bracketRound, bracketPosition }.
 *  For non-power-of-2, some first-round matches get byes. */
export function generateBracket(playerIds: string[]): {
  player1Id: string;
  player2Id: string | null;
  bracketRound: string;
  bracketPosition: number;
}[] {
  const n = playerIds.length;
  if (n < 2) return [];

  // Find next power of 2
  const size = Math.pow(2, Math.ceil(Math.log2(n)));
  const byes = size - n;

  const matches: {
    player1Id: string;
    player2Id: string | null;
    bracketRound: string;
    bracketPosition: number;
  }[] = [];

  const totalRounds = Math.log2(size);
  const roundNames = getRoundNames(totalRounds);

  // Seed players - top seeds get byes
  const seeded = [...playerIds];
  
  // Create first round matches
  let position = 1;
  let idx = 0;

  // Players with byes advance automatically (no match needed for them in R1)
  // Players without byes play in R1
  const firstRoundPlayers = seeded.slice(byes);
  
  for (let i = 0; i < firstRoundPlayers.length; i += 2) {
    matches.push({
      player1Id: firstRoundPlayers[i],
      player2Id: firstRoundPlayers[i + 1] || null,
      bracketRound: roundNames[0],
      bracketPosition: position++,
    });
  }

  // Create placeholder matches for subsequent rounds
  for (let round = 1; round < totalRounds; round++) {
    const matchesInRound = size / Math.pow(2, round + 1);
    for (let i = 0; i < matchesInRound; i++) {
      matches.push({
        player1Id: "TBD",
        player2Id: "TBD",
        bracketRound: roundNames[round],
        bracketPosition: i + 1,
      });
    }
  }

  return matches;
}

/** Generate group stage: divide players into groups, round-robin within each group.
 *  Returns { groups: Map<groupName, playerIds[]>, matches } */
export function generateGroupStage(playerIds: string[], numGroups: number): {
  groups: { name: string; playerIds: string[] }[];
  matches: { player1Id: string; player2Id: string; round: number; groupName: string }[];
} {
  const groups: { name: string; playerIds: string[] }[] = [];
  const shuffled = shuffle(playerIds);

  // Distribute players across groups (snake draft style)
  for (let g = 0; g < numGroups; g++) {
    groups.push({ name: `Grupa ${String.fromCharCode(65 + g)}`, playerIds: [] });
  }
  
  shuffled.forEach((id, idx) => {
    groups[idx % numGroups].playerIds.push(id);
  });

  // Generate round-robin within each group
  const allMatches: { player1Id: string; player2Id: string; round: number; groupName: string }[] = [];
  
  groups.forEach((group) => {
    const rrMatches = generateRoundRobin(group.playerIds);
    rrMatches.forEach((m) => {
      allMatches.push({ ...m, groupName: group.name });
    });
  });

  return { groups, matches: allMatches };
}

export function getRoundNames(totalRounds: number): string[] {
  const names: string[] = [];
  for (let i = 0; i < totalRounds; i++) {
    const remaining = totalRounds - i;
    if (remaining === 1) names.push("Finał");
    else if (remaining === 2) names.push("Półfinał");
    else if (remaining === 3) names.push("Ćwierćfinał");
    else names.push(`Runda ${i + 1}`);
  }
  return names;
}

export function getRecommendedGroups(playerCount: number): number {
  if (playerCount <= 4) return 1;
  if (playerCount <= 8) return 2;
  if (playerCount <= 12) return 3;
  if (playerCount <= 16) return 4;
  return Math.min(8, Math.ceil(playerCount / 4));
}
