import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const API_BASE = "https://api.autodarts.io";

function extractMatchId(input: string): string {
  const urlMatch = input.match(/matches\/([a-f0-9-]+)/i);
  if (urlMatch) return urlMatch[1];
  if (/^[a-f0-9-]{20,}$/i.test(input)) return input;
  throw new Error("Invalid Autodarts match ID or link");
}

interface AutodartsStats {
  score1: number;
  score2: number;
  avg1: number | null;
  avg2: number | null;
  first_9_avg1: number | null;
  first_9_avg2: number | null;
  one_eighties1: number;
  one_eighties2: number;
  high_checkout1: number;
  high_checkout2: number;
  ton60_1: number;
  ton60_2: number;
  ton80_1: number;
  ton80_2: number;
  ton_plus1: number;
  ton_plus2: number;
  darts_thrown1: number;
  darts_thrown2: number;
  checkout_attempts1: number;
  checkout_attempts2: number;
  checkout_hits1: number;
  checkout_hits2: number;
  player1_name: string;
  player2_name: string;
  autodarts_link: string;
}

async function fetchMatchData(matchId: string, token: string): Promise<AutodartsStats> {
  const matchRes = await fetch(`${API_BASE}/as/v0/matches/${matchId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!matchRes.ok) {
    const errText = await matchRes.text();
    throw new Error(`Failed to fetch match (${matchRes.status}): ${errText}`);
  }

  const match = await matchRes.json();
  
  console.log("=== AUTODARTS MATCH STRUCTURE ===");
  console.log("Top-level keys:", Object.keys(match));
  console.log("variant:", match.variant);
  console.log("gameMode:", match.gameMode);
  console.log("state:", match.state);
  
  const players = match.players || [];
  console.log("Players count:", players.length);
  if (players.length > 0) {
    console.log("Player 0:", JSON.stringify({ name: players[0].name, userId: players[0].userId, boardId: players[0].boardId }));
    console.log("Player 0 stats keys:", players[0].stats ? Object.keys(players[0].stats) : "no stats");
  }
  if (players.length > 1) {
    console.log("Player 1:", JSON.stringify({ name: players[1].name, userId: players[1].userId, boardId: players[1].boardId }));
    console.log("Player 1 stats keys:", players[1].stats ? Object.keys(players[1].stats) : "no stats");
  }
  
  if (players.length < 2) {
    throw new Error("Match does not have 2 players");
  }

  const p1 = players[0];
  const p2 = players[1];

  // Extract player names
  const p1Name = p1.name || p1.username || p1.displayName || "Player 1";
  const p2Name = p2.name || p2.username || p2.displayName || "Player 2";

  // --- SCORES ---
  // Autodarts stores scores in different ways:
  // match.scores might be [{sets, legs}, {sets, legs}]
  // or match.winner + players[x].sets/legs
  let legsWon1 = 0, legsWon2 = 0;
  
  console.log("match.scores:", JSON.stringify(match.scores));
  console.log("match.winner:", match.winner);
  
  if (match.scores) {
    if (Array.isArray(match.scores)) {
      const s1 = match.scores[0];
      const s2 = match.scores[1];
      if (typeof s1 === 'object' && s1 !== null) {
        legsWon1 = s1.legs ?? s1.sets ?? 0;
        legsWon2 = s2?.legs ?? s2?.sets ?? 0;
      } else {
        legsWon1 = Number(s1) || 0;
        legsWon2 = Number(s2) || 0;
      }
    }
  }

  // --- PLAYER STATS (from players[x].stats) ---
  // Autodarts often provides pre-calculated stats on each player object
  const stats1 = p1.stats || {};
  const stats2 = p2.stats || {};
  
  console.log("Player 1 full stats:", JSON.stringify(stats1));
  console.log("Player 2 full stats:", JSON.stringify(stats2));

  // Try to get stats from player.stats first (pre-calculated by Autodarts)
  const avg1 = stats1.average ?? stats1.avg ?? stats1.ppd ? (stats1.ppd * 3) : null;
  const avg2 = stats2.average ?? stats2.avg ?? stats2.ppd ? (stats2.ppd * 3) : null;
  const first9Avg1 = stats1.first9Average ?? stats1.firstNineAvg ?? stats1.first9Avg ?? null;
  const first9Avg2 = stats2.first9Average ?? stats2.firstNineAvg ?? stats2.first9Avg ?? null;
  
  let oneEighties1 = stats1.oneEighties ?? stats1["180s"] ?? 0;
  let oneEighties2 = stats2.oneEighties ?? stats2["180s"] ?? 0;
  let highCheckout1 = stats1.highestCheckout ?? stats1.bestCheckout ?? 0;
  let highCheckout2 = stats2.highestCheckout ?? stats2.bestCheckout ?? 0;
  let totalDarts1 = stats1.dartsThrown ?? stats1.darts ?? 0;
  let totalDarts2 = stats2.dartsThrown ?? stats2.darts ?? 0;
  let checkoutHits1 = stats1.checkoutHits ?? stats1.checkouts ?? 0;
  let checkoutHits2 = stats2.checkoutHits ?? stats2.checkouts ?? 0;
  let checkoutAttempts1 = stats1.checkoutAttempts ?? stats1.checkoutDarts ?? 0;
  let checkoutAttempts2 = stats2.checkoutAttempts ?? stats2.checkoutDarts ?? 0;

  // Ton ranges
  let ton60_1 = stats1.ton60 ?? stats1["60+"] ?? 0;
  let ton60_2 = stats2.ton60 ?? stats2["60+"] ?? 0;
  let ton80_1 = stats1.ton80 ?? stats1["80+"] ?? 0;
  let ton80_2 = stats2.ton80 ?? stats2["80+"] ?? 0;
  let tonPlus1 = stats1.tonPlus ?? stats1["100+"] ?? 0;
  let tonPlus2 = stats2.tonPlus ?? stats2["100+"] ?? 0;

  // --- FALLBACK: Parse from legs/turns if stats are empty ---
  const legs = match.legs || match.sets?.[0]?.legs || [];
  console.log("Legs count:", legs.length);
  
  if (legs.length > 0 && totalDarts1 === 0 && totalDarts2 === 0) {
    console.log("Falling back to leg-by-leg parsing...");
    console.log("First leg keys:", Object.keys(legs[0]));
    if (legs[0].turns) console.log("First leg turns count:", legs[0].turns.length);
    if (legs[0].visits) console.log("First leg visits count:", legs[0].visits.length);
    if (legs[0].rounds) console.log("First leg rounds count:", legs[0].rounds.length);
    
    let totalScore1 = 0, totalScore2 = 0;
    let first9Total1 = 0, first9Total2 = 0;
    let first9Count1 = 0, first9Count2 = 0;
    
    // Also try to count legs from leg data if scores were objects
    if (legsWon1 === 0 && legsWon2 === 0) {
      for (const leg of legs) {
        if (leg.winner === 0) legsWon1++;
        else if (leg.winner === 1) legsWon2++;
      }
    }

    for (const leg of legs) {
      const turns = leg.turns || leg.visits || leg.rounds || [];
      let turnIndex1 = 0, turnIndex2 = 0;

      for (const turn of turns) {
        const playerIdx = turn.player ?? turn.playerIndex ?? turn.p ?? 0;
        const points = turn.points ?? turn.score ?? turn.value ?? 0;
        const darts = turn.darts?.length ?? turn.dartsThrown ?? turn.throws ?? 3;

        if (playerIdx === 0) {
          totalScore1 += points; totalDarts1 += darts;
          turnIndex1++;
          if (turnIndex1 <= 3) { first9Total1 += points; first9Count1++; }
          if (points === 180) oneEighties1++;
          if (points >= 100) tonPlus1++;
          if (points >= 80 && points < 100) ton80_1++;
          if (points >= 60 && points < 80) ton60_1++;
        } else {
          totalScore2 += points; totalDarts2 += darts;
          turnIndex2++;
          if (turnIndex2 <= 3) { first9Total2 += points; first9Count2++; }
          if (points === 180) oneEighties2++;
          if (points >= 100) tonPlus2++;
          if (points >= 80 && points < 100) ton80_2++;
          if (points >= 60 && points < 80) ton60_2++;
        }

        if (turn.isCheckout || turn.checkout || turn.bupiCheckout) {
          if (playerIdx === 0) { checkoutHits1++; if (points > highCheckout1) highCheckout1 = points; }
          else { checkoutHits2++; if (points > highCheckout2) highCheckout2 = points; }
        }

        if (turn.checkoutAttempts || turn.doublesThrown) {
          const attempts = turn.checkoutAttempts ?? turn.doublesThrown ?? 0;
          if (playerIdx === 0) checkoutAttempts1 += attempts;
          else checkoutAttempts2 += attempts;
        }
      }
    }

    // Calculate averages from raw data
    if (totalDarts1 > 0 && !avg1) {
      // avg1 is already in scope as const, need to handle differently
    }
  }

  // Also check match.sets structure
  const sets = match.sets || [];
  if (sets.length > 0) {
    console.log("Sets count:", sets.length);
    console.log("First set keys:", Object.keys(sets[0]));
    if (sets[0].legs) {
      console.log("First set legs count:", sets[0].legs.length);
      if (sets[0].legs[0]) {
        console.log("First set first leg keys:", Object.keys(sets[0].legs[0]));
      }
    }
  }

  // Calculate final averages
  const finalAvg1 = typeof avg1 === 'number' ? Math.round(avg1 * 100) / 100 : null;
  const finalAvg2 = typeof avg2 === 'number' ? Math.round(avg2 * 100) / 100 : null;
  const finalFirst9Avg1 = typeof first9Avg1 === 'number' ? Math.round(first9Avg1 * 100) / 100 : null;
  const finalFirst9Avg2 = typeof first9Avg2 === 'number' ? Math.round(first9Avg2 * 100) / 100 : null;

  return {
    score1: legsWon1,
    score2: legsWon2,
    avg1: finalAvg1,
    avg2: finalAvg2,
    first_9_avg1: finalFirst9Avg1,
    first_9_avg2: finalFirst9Avg2,
    one_eighties1: oneEighties1,
    one_eighties2: oneEighties2,
    high_checkout1: highCheckout1,
    high_checkout2: highCheckout2,
    ton60_1, ton60_2,
    ton80_1, ton80_2,
    ton_plus1: tonPlus1,
    ton_plus2: tonPlus2,
    darts_thrown1: totalDarts1,
    darts_thrown2: totalDarts2,
    checkout_attempts1: checkoutAttempts1,
    checkout_attempts2: checkoutAttempts2,
    checkout_hits1: checkoutHits1,
    checkout_hits2: checkoutHits2,
    player1_name: p1Name,
    player2_name: p2Name,
    autodarts_link: `https://play.autodarts.io/history/matches/${matchId}`,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { autodarts_link, match_id: autodartsMatchInput, autodarts_token } = body;

    const input = autodarts_link || autodartsMatchInput;
    if (!input) {
      return new Response(JSON.stringify({ error: "autodarts_link or match_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!autodarts_token) {
      return new Response(JSON.stringify({ 
        error: "autodarts_token is required",
        message: "Zainstaluj rozszerzenie Chrome eDART, które automatycznie pobiera token z Twojej sesji Autodarts."
      }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const matchId = extractMatchId(input);
    const stats = await fetchMatchData(matchId, autodarts_token);

    return new Response(JSON.stringify({ success: true, data: stats }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: "Failed to fetch Autodarts data", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
