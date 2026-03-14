import { supabase } from "@/integrations/supabase/client";
import { generateBracket } from "@/lib/tournamentUtils";

/**
 * After a bracket match is approved/completed, advance the winner to the next round.
 * 
 * Logic:
 * - Match at bracketPosition P in round R feeds into bracketPosition ceil(P/2) in round R+1
 * - If P is odd → winner becomes player1, if P is even → winner becomes player2
 * - If both player slots are filled in next match, it becomes "upcoming"
 */
export async function advanceBracketWinner(
  matchId: string,
  leagueId: string,
  winnerId: string,
  winnerName: string,
): Promise<{ advanced: boolean; nextMatchId?: string }> {
  // Get the completed match details
  const { data: completedMatch } = await supabase
    .from("matches")
    .select("bracket_round, bracket_position, league_id")
    .eq("id", matchId)
    .single();

  if (!completedMatch?.bracket_round || !completedMatch?.bracket_position) {
    return { advanced: false };
  }

  const currentRound = completedMatch.bracket_round;
  const currentPosition = completedMatch.bracket_position;

  // Finał — no next round
  if (currentRound === "Finał") {
    return { advanced: false };
  }

  // Get all bracket matches for this league
  const { data: allBracketMatches } = await supabase
    .from("matches")
    .select("id, bracket_round, bracket_position, player1_id, player2_id, status")
    .eq("league_id", leagueId)
    .not("bracket_round", "is", null)
    .order("bracket_position");

  if (!allBracketMatches) return { advanced: false };

  // Determine round order
  const roundOrder = ["Runda 1", "Runda 2", "Runda 3", "Runda 4", "Ćwierćfinał", "Półfinał", "Finał"];
  const currentRoundIdx = roundOrder.indexOf(currentRound);
  if (currentRoundIdx === -1) return { advanced: false };

  // Find the next round name
  const nextRoundName = roundOrder[currentRoundIdx + 1];
  if (!nextRoundName) return { advanced: false };

  // However, not all rounds may exist — find the actual next round
  const allRoundNames = [...new Set(allBracketMatches.map(m => m.bracket_round!))];
  const actualNextRound = allRoundNames.find(r => {
    const idx = roundOrder.indexOf(r);
    return idx > currentRoundIdx;
  });

  if (!actualNextRound) return { advanced: false };

  // Calculate target position in next round
  const nextPosition = Math.ceil(currentPosition / 2);
  const isPlayer1Slot = currentPosition % 2 !== 0; // odd = player1, even = player2

  // Find the next round match
  let nextMatch = allBracketMatches.find(
    m => m.bracket_round === actualNextRound && m.bracket_position === nextPosition
  );

  if (!nextMatch) {
    // Create the next round match if it doesn't exist (placeholder)
    const { data: created } = await supabase.from("matches").insert({
      league_id: leagueId,
      player1_id: isPlayer1Slot ? winnerId : "00000000-0000-0000-0000-000000000000",
      player2_id: isPlayer1Slot ? "00000000-0000-0000-0000-000000000000" : winnerId,
      date: new Date().toISOString().split("T")[0],
      status: "upcoming",
      bracket_round: actualNextRound,
      bracket_position: nextPosition,
    }).select().single();

    return { advanced: true, nextMatchId: created?.id };
  }

  // Update the existing next-round match with the winner
  const updateData: any = {};
  if (isPlayer1Slot) {
    updateData.player1_id = winnerId;
  } else {
    updateData.player2_id = winnerId;
  }

  // Check if both players are now set (neither is TBD/placeholder)
  const otherPlayerId = isPlayer1Slot ? nextMatch.player2_id : nextMatch.player1_id;
  const TBD_ID = "00000000-0000-0000-0000-000000000000";
  const otherIsSet = otherPlayerId && otherPlayerId !== TBD_ID;

  // If both players are now known, make it upcoming
  if (otherIsSet) {
    updateData.status = "upcoming";
  }

  await supabase
    .from("matches")
    .update(updateData)
    .eq("id", nextMatch.id);

  return { advanced: true, nextMatchId: nextMatch.id };
}

/**
 * Check if all group matches in a league are completed.
 */
export async function areAllGroupMatchesCompleted(leagueId: string): Promise<boolean> {
  const { data, count } = await supabase
    .from("matches")
    .select("id", { count: "exact" })
    .eq("league_id", leagueId)
    .not("group_name", "is", null)
    .is("bracket_round", null)
    .neq("status", "completed");

  return (count ?? 0) === 0;
}

/**
 * Get group standings for a league, sorted by points then leg difference.
 * Returns top N qualifiers per group.
 */
export async function getGroupQualifiers(
  leagueId: string,
  qualifiersPerGroup: number = 2
): Promise<{ groupName: string; playerId: string; rank: number }[]> {
  const { data: groupMatches } = await supabase
    .from("matches")
    .select("player1_id, player2_id, score1, score2, status, group_name")
    .eq("league_id", leagueId)
    .not("group_name", "is", null)
    .is("bracket_round", null)
    .eq("status", "completed");

  if (!groupMatches || groupMatches.length === 0) return [];

  // Get unique group names
  const groupNames = [...new Set(groupMatches.map(m => m.group_name!))].sort();

  const qualifiers: { groupName: string; playerId: string; rank: number }[] = [];

  groupNames.forEach(groupName => {
    const gMatches = groupMatches.filter(m => m.group_name === groupName);
    const playerIds = new Set<string>();
    gMatches.forEach(m => { playerIds.add(m.player1_id); playerIds.add(m.player2_id); });

    const standings = Array.from(playerIds).map(pid => {
      let wins = 0, legsWon = 0, legsLost = 0;
      gMatches.forEach(m => {
        const isP1 = m.player1_id === pid;
        const myScore = isP1 ? (m.score1 ?? 0) : (m.score2 ?? 0);
        const oppScore = isP1 ? (m.score2 ?? 0) : (m.score1 ?? 0);
        legsWon += myScore;
        legsLost += oppScore;
        if (myScore > oppScore) wins++;
      });
      return { playerId: pid, wins, points: wins * 3, legDiff: legsWon - legsLost, legsWon };
    });

    standings.sort((a, b) => b.points - a.points || b.legDiff - a.legDiff || b.legsWon - a.legsWon);

    standings.slice(0, qualifiersPerGroup).forEach((s, idx) => {
      qualifiers.push({ groupName, playerId: s.playerId, rank: idx + 1 });
    });
  });

  return qualifiers;
}

/**
 * Generate a playoff bracket from group qualifiers.
 * Seeds: Group winners alternate with runners-up for balanced bracket.
 * e.g. A1 vs B2, B1 vs A2, C1 vs D2, D1 vs C2 ...
 */
export async function generatePlayoffBracket(
  leagueId: string,
  qualifiersPerGroup: number = 2,
  startDate: string = new Date().toISOString().split("T")[0]
): Promise<{ success: boolean; matchCount: number; error?: string }> {
  // Check if bracket matches already exist
  const { data: existingBracket } = await supabase
    .from("matches")
    .select("id")
    .eq("league_id", leagueId)
    .not("bracket_round", "is", null)
    .limit(1);

  if (existingBracket && existingBracket.length > 0) {
    return { success: false, matchCount: 0, error: "Drabinka pucharowa już istnieje dla tej ligi." };
  }

  const qualifiers = await getGroupQualifiers(leagueId, qualifiersPerGroup);
  if (qualifiers.length < 2) {
    return { success: false, matchCount: 0, error: "Za mało zakwalifikowanych graczy." };
  }

  // Seed players: interleave group winners and runners-up for fair bracket
  // A1, B1, C1, D1 ... then A2, B2, C2, D2 ...
  const groupNames = [...new Set(qualifiers.map(q => q.groupName))].sort();
  const seeded: string[] = [];

  // Cross-seed: A1 vs last group's runner-up, etc.
  const winners = qualifiers.filter(q => q.rank === 1).map(q => q.playerId);
  const runnersUp = qualifiers.filter(q => q.rank === 2).map(q => q.playerId).reverse();

  // Interleave: winner, runner-up, winner, runner-up...
  for (let i = 0; i < Math.max(winners.length, runnersUp.length); i++) {
    if (i < winners.length) seeded.push(winners[i]);
    if (i < runnersUp.length) seeded.push(runnersUp[i]);
  }

  // Add remaining qualifiers (rank 3+)
  qualifiers.filter(q => q.rank > 2).forEach(q => seeded.push(q.playerId));

  // Generate bracket
  const bracket = generateBracket(seeded);
  let matchCount = 0;

  for (const m of bracket) {
    if (m.player1Id === "TBD" && (!m.player2Id || m.player2Id === "TBD")) continue;

    const TBD_ID = "00000000-0000-0000-0000-000000000000";

    await supabase.from("matches").insert({
      league_id: leagueId,
      player1_id: m.player1Id === "TBD" ? TBD_ID : m.player1Id,
      player2_id: !m.player2Id || m.player2Id === "TBD" ? TBD_ID : m.player2Id,
      date: startDate,
      status: m.player1Id !== "TBD" && m.player2Id && m.player2Id !== "TBD" ? "upcoming" : "upcoming",
      bracket_round: m.bracketRound,
      bracket_position: m.bracketPosition,
    });
    matchCount++;
  }

  // Handle byes: auto-advance players with byes
  // (matches where one player is TBD_ID — they get auto-advanced)

  return { success: true, matchCount };
}
