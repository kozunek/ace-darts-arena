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

  const players = match.players || [];
  if (players.length < 2) {
    throw new Error("Match does not have 2 players");
  }

  const p1 = players[0];
  const p2 = players[1];

  const legs = match.legs || [];
  let legsWon1 = 0, legsWon2 = 0;
  let totalScore1 = 0, totalScore2 = 0;
  let totalThrows1 = 0, totalThrows2 = 0;
  let oneEighties1 = 0, oneEighties2 = 0;
  let highCheckout1 = 0, highCheckout2 = 0;
  let ton60_1 = 0, ton60_2 = 0;
  let ton80_1 = 0, ton80_2 = 0;
  let tonPlus1 = 0, tonPlus2 = 0;
  let checkoutAttempts1 = 0, checkoutAttempts2 = 0;
  let checkoutHits1 = 0, checkoutHits2 = 0;
  let first9Total1 = 0, first9Total2 = 0;
  let first9Count1 = 0, first9Count2 = 0;
  let totalDarts1 = 0, totalDarts2 = 0;

  for (const leg of legs) {
    if (leg.winner === 0) legsWon1++;
    else if (leg.winner === 1) legsWon2++;

    const turns = leg.turns || leg.visits || [];
    let turnIndex1 = 0, turnIndex2 = 0;

    for (const turn of turns) {
      const playerIdx = turn.player ?? turn.playerIndex ?? 0;
      const points = turn.points ?? turn.score ?? 0;
      const darts = turn.darts?.length ?? turn.dartsThrown ?? 3;

      if (playerIdx === 0) {
        totalScore1 += points; totalDarts1 += darts; totalThrows1 += darts;
        turnIndex1++;
        if (turnIndex1 <= 3) { first9Total1 += points; first9Count1++; }
        if (points === 180) oneEighties1++;
        if (points >= 100) tonPlus1++;
        else if (points >= 80) ton80_1++;
        else if (points >= 60) ton60_1++;
      } else {
        totalScore2 += points; totalDarts2 += darts; totalThrows2 += darts;
        turnIndex2++;
        if (turnIndex2 <= 3) { first9Total2 += points; first9Count2++; }
        if (points === 180) oneEighties2++;
        if (points >= 100) tonPlus2++;
        else if (points >= 80) ton80_2++;
        else if (points >= 60) ton60_2++;
      }

      if (turn.isCheckout || turn.checkout) {
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

  const avg1 = totalThrows1 > 0 ? Math.round((totalScore1 / totalThrows1) * 3 * 100) / 100 : null;
  const avg2 = totalThrows2 > 0 ? Math.round((totalScore2 / totalThrows2) * 3 * 100) / 100 : null;
  const first9Avg1 = first9Count1 > 0 ? Math.round((first9Total1 / first9Count1) * 100) / 100 : null;
  const first9Avg2 = first9Count2 > 0 ? Math.round((first9Total2 / first9Count2) * 100) / 100 : null;

  if (match.scores) {
    legsWon1 = match.scores[0] ?? legsWon1;
    legsWon2 = match.scores[1] ?? legsWon2;
  }

  return {
    score1: legsWon1, score2: legsWon2,
    avg1, avg2,
    first_9_avg1: first9Avg1, first_9_avg2: first9Avg2,
    one_eighties1: oneEighties1, one_eighties2: oneEighties2,
    high_checkout1: highCheckout1, high_checkout2: highCheckout2,
    ton60_1, ton60_2, ton80_1, ton80_2,
    ton_plus1: tonPlus1, ton_plus2: tonPlus2,
    darts_thrown1: totalDarts1, darts_thrown2: totalDarts2,
    checkout_attempts1: checkoutAttempts1, checkout_attempts2: checkoutAttempts2,
    checkout_hits1: checkoutHits1, checkout_hits2: checkoutHits2,
    player1_name: p1.name || p1.username || p1.displayName || "Player 1",
    player2_name: p2.name || p2.username || p2.displayName || "Player 2",
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
