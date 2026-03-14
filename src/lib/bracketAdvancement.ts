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
  loserId?: string,
): Promise<{ advanced: boolean; nextMatchId?: string }> {
  // Get the completed match details
  const { data: completedMatch } = await supabase
    .from("matches")
    .select("bracket_round, bracket_position, league_id, player1_id, player2_id, score1, score2")
    .eq("id", matchId)
    .single();

  if (!completedMatch?.bracket_round || !completedMatch?.bracket_position) {
    return { advanced: false };
  }

  const currentRound = completedMatch.bracket_round;
  const currentPosition = completedMatch.bracket_position;

  // Skip special rounds
  if (currentRound === "Finał" || currentRound === "Mecz o 3. miejsce" || currentRound.startsWith("Lucky Loser")) {
    return { advanced: false };
  }

  // Get league config for third_place_match and lucky_loser
  const { data: leagueData } = await supabase
    .from("leagues")
    .select("third_place_match, lucky_loser")
    .eq("id", leagueId)
    .single();

  const thirdPlaceEnabled = (leagueData as any)?.third_place_match ?? false;
  const luckyLoserEnabled = (leagueData as any)?.lucky_loser ?? false;

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

  // Find actual next round
  const allRoundNames = [...new Set(allBracketMatches.map(m => m.bracket_round!))]
    .filter(r => roundOrder.includes(r))
    .sort((a, b) => roundOrder.indexOf(a) - roundOrder.indexOf(b));
  const actualNextRound = allRoundNames.find(r => {
    const idx = roundOrder.indexOf(r);
    return idx > currentRoundIdx;
  });

  if (!actualNextRound) return { advanced: false };

  // Calculate target position in next round
  const nextPosition = Math.ceil(currentPosition / 2);
  const isPlayer1Slot = currentPosition % 2 !== 0;

  // Find the next round match
  let nextMatch = allBracketMatches.find(
    m => m.bracket_round === actualNextRound && m.bracket_position === nextPosition
  );

  const TBD_ID = "00000000-0000-0000-0000-000000000000";

  if (!nextMatch) {
    const { data: created } = await supabase.from("matches").insert({
      league_id: leagueId,
      player1_id: isPlayer1Slot ? winnerId : TBD_ID,
      player2_id: isPlayer1Slot ? TBD_ID : winnerId,
      date: new Date().toISOString().split("T")[0],
      status: "upcoming",
      bracket_round: actualNextRound,
      bracket_position: nextPosition,
    }).select().single();

    await handleSemifinalLoser(currentRound, leagueId, loserId, allBracketMatches, thirdPlaceEnabled, luckyLoserEnabled);
    return { advanced: true, nextMatchId: created?.id };
  }

  // Update the existing next-round match with the winner
  const updateData: any = {};
  if (isPlayer1Slot) {
    updateData.player1_id = winnerId;
  } else {
    updateData.player2_id = winnerId;
  }

  const otherPlayerId = isPlayer1Slot ? nextMatch.player2_id : nextMatch.player1_id;
  const otherIsSet = otherPlayerId && otherPlayerId !== TBD_ID;
  if (otherIsSet) {
    updateData.status = "upcoming";
  }

  await supabase.from("matches").update(updateData).eq("id", nextMatch.id);

  // Handle semifinal loser for third-place match / lucky loser
  await handleSemifinalLoser(currentRound, leagueId, loserId, allBracketMatches, thirdPlaceEnabled, luckyLoserEnabled);

  return { advanced: true, nextMatchId: nextMatch.id };
}

/**
 * When a semifinal match completes, create/update the third-place match
 * and/or lucky loser bracket with the losers.
 */
async function handleSemifinalLoser(
  currentRound: string,
  leagueId: string,
  loserId: string | undefined,
  allBracketMatches: any[],
  thirdPlaceEnabled: boolean,
  luckyLoserEnabled: boolean,
) {
  if (currentRound !== "Półfinał" || !loserId) return;

  const TBD_ID = "00000000-0000-0000-0000-000000000000";

  // Third-place match: add loser to "Mecz o 3. miejsce"
  if (thirdPlaceEnabled) {
    const existing3rd = allBracketMatches.find(m => m.bracket_round === "Mecz o 3. miejsce");
    if (existing3rd) {
      // Fill empty slot
      if (existing3rd.player1_id === TBD_ID) {
        const update: any = { player1_id: loserId };
        if (existing3rd.player2_id !== TBD_ID) update.status = "upcoming";
        await supabase.from("matches").update(update).eq("id", existing3rd.id);
      } else if (existing3rd.player2_id === TBD_ID) {
        await supabase.from("matches").update({ player2_id: loserId, status: "upcoming" }).eq("id", existing3rd.id);
      }
    } else {
      // Create the third-place match
      await supabase.from("matches").insert({
        league_id: leagueId,
        player1_id: loserId,
        player2_id: TBD_ID,
        date: new Date().toISOString().split("T")[0],
        status: "upcoming",
        bracket_round: "Mecz o 3. miejsce",
        bracket_position: 1,
      });
    }
  }

  // Lucky Loser: collect all non-semifinal losers for a mini bracket
  if (luckyLoserEnabled) {
    const existingLL = allBracketMatches.find(m => m.bracket_round?.startsWith("Lucky Loser"));
    if (!existingLL) {
      // Collect losers from completed matches (excluding semifinal — that goes to 3rd place)
      const completedMainMatches = allBracketMatches.filter(
        m => m.status === "completed" && m.bracket_round !== "Półfinał" && m.bracket_round !== "Finał"
          && !m.bracket_round?.startsWith("Lucky Loser") && m.bracket_round !== "Mecz o 3. miejsce"
      );

      // Get losers
      const losers: string[] = [];
      for (const m of completedMainMatches) {
        // We need scores to determine loser, but we only have player IDs here
        // Fetch full match data
        const { data: fullMatch } = await supabase.from("matches")
          .select("player1_id, player2_id, score1, score2")
          .eq("id", m.id).single();
        if (fullMatch) {
          const loser = (fullMatch.score1 ?? 0) > (fullMatch.score2 ?? 0) ? fullMatch.player2_id : fullMatch.player1_id;
          if (loser !== TBD_ID) losers.push(loser);
        }
      }

      // Add the current semifinal loser too
      losers.push(loserId);

      if (losers.length >= 2) {
        // Create mini bracket for lucky losers
        const { generateBracket: genBracket } = await import("@/lib/tournamentUtils");
        const bracket = genBracket(losers);
        for (const m of bracket) {
          const p1 = m.player1Id === "TBD" ? TBD_ID : m.player1Id;
          const p2 = !m.player2Id || m.player2Id === "TBD" ? TBD_ID : m.player2Id;
          const hasBoth = p1 !== TBD_ID && p2 !== TBD_ID;
          const roundName = m.bracketRound === "Finał" ? "Lucky Loser Finał" : `Lucky Loser ${m.bracketRound}`;
          await supabase.from("matches").insert({
            league_id: leagueId,
            player1_id: p1,
            player2_id: p2,
            date: new Date().toISOString().split("T")[0],
            status: hasBoth ? "upcoming" : "upcoming",
            bracket_round: roundName,
            bracket_position: m.bracketPosition,
          });
        }
      }
    }
  }
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
