import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const KEYCLOAK_URL = "https://login.autodarts.io/realms/autodarts/protocol/openid-connect/token";
const API_BASE = "https://api.autodarts.io";

async function getAutodartsToken(): Promise<string> {
  const email = Deno.env.get("AUTODARTS_EMAIL");
  const password = Deno.env.get("AUTODARTS_PASSWORD");
  const configuredClientId = Deno.env.get("AUTODARTS_CLIENT_ID")?.trim();
  const clientSecret = Deno.env.get("AUTODARTS_CLIENT_SECRET")?.trim();

  if (!email || !password) {
    throw new Error("AUTODARTS_EMAIL or AUTODARTS_PASSWORD not configured");
  }

  const candidateClientIds = configuredClientId
    ? [configuredClientId]
    : ["autodarts-desktop", "autodarts-app"];

  let lastAuthError = "";

  for (const clientId of candidateClientIds) {
    const body = new URLSearchParams({
      grant_type: "password",
      client_id: clientId,
      username: email,
      password,
      scope: "openid",
    });

    if (clientSecret) body.set("client_secret", clientSecret);

    const res = await fetch(KEYCLOAK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (res.ok) {
      const data = await res.json();
      return data.access_token;
    }

    lastAuthError = await res.text();
    const invalidClient =
      res.status === 401 &&
      /(invalid_client|unauthorized_client)/i.test(lastAuthError);

    if (!invalidClient || configuredClientId) {
      throw new Error(`Keycloak auth failed (${res.status}): ${lastAuthError}`);
    }
  }

  throw new Error(
    `Keycloak auth failed for all configured clients (${candidateClientIds.join(", ")}): ${lastAuthError}`,
  );
}

function extractMatchId(input: string): string {
  // Handle full URLs like https://autodarts.io/matches/xxxx or just the ID
  const urlMatch = input.match(/matches\/([a-f0-9-]+)/i);
  if (urlMatch) return urlMatch[1];
  // If it looks like a UUID, use as-is
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
  // Fetch match details
  const matchRes = await fetch(`${API_BASE}/as/v0/matches/${matchId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!matchRes.ok) {
    const errText = await matchRes.text();
    throw new Error(`Failed to fetch match (${matchRes.status}): ${errText}`);
  }

  const match = await matchRes.json();

  // Extract player info
  const players = match.players || [];
  if (players.length < 2) {
    throw new Error("Match does not have 2 players");
  }

  const p1 = players[0];
  const p2 = players[1];

  // Extract legs won from match variant/result
  const legs = match.legs || [];
  let legsWon1 = 0;
  let legsWon2 = 0;
  let totalDarts1 = 0;
  let totalDarts2 = 0;
  let totalScore1 = 0;
  let totalScore2 = 0;
  let totalThrows1 = 0;
  let totalThrows2 = 0;
  let oneEighties1 = 0;
  let oneEighties2 = 0;
  let highCheckout1 = 0;
  let highCheckout2 = 0;
  let ton60_1 = 0;
  let ton60_2 = 0;
  let ton80_1 = 0;
  let ton80_2 = 0;
  let tonPlus1 = 0;
  let tonPlus2 = 0;
  let checkoutAttempts1 = 0;
  let checkoutAttempts2 = 0;
  let checkoutHits1 = 0;
  let checkoutHits2 = 0;
  let first9Total1 = 0;
  let first9Total2 = 0;
  let first9Count1 = 0;
  let first9Count2 = 0;

  for (const leg of legs) {
    if (leg.winner === 0) legsWon1++;
    else if (leg.winner === 1) legsWon2++;

    // Process turns/visits in each leg
    const turns = leg.turns || leg.visits || [];
    let legDarts1 = 0;
    let legDarts2 = 0;
    let legScore1 = 0;
    let legScore2 = 0;
    let turnIndex1 = 0;
    let turnIndex2 = 0;

    for (const turn of turns) {
      const playerIdx = turn.player ?? turn.playerIndex ?? 0;
      const points = turn.points ?? turn.score ?? 0;
      const darts = turn.darts?.length ?? turn.dartsThrown ?? 3;

      if (playerIdx === 0) {
        legScore1 += points;
        legDarts1 += darts;
        turnIndex1++;
        if (turnIndex1 <= 3) { first9Total1 += points; first9Count1++; }

        if (points === 180) oneEighties1++;
        if (points >= 100) tonPlus1++;
        else if (points >= 80) ton80_1++;
        else if (points >= 60) ton60_1++;
      } else {
        legScore2 += points;
        legDarts2 += darts;
        turnIndex2++;
        if (turnIndex2 <= 3) { first9Total2 += points; first9Count2++; }

        if (points === 180) oneEighties2++;
        if (points >= 100) tonPlus2++;
        else if (points >= 80) ton80_2++;
        else if (points >= 60) ton60_2++;
      }

      // Check for checkout (last turn of winning player)
      if (turn.isCheckout || turn.checkout) {
        if (playerIdx === 0) {
          checkoutHits1++;
          if (points > highCheckout1) highCheckout1 = points;
        } else {
          checkoutHits2++;
          if (points > highCheckout2) highCheckout2 = points;
        }
      }

      // Checkout attempts (doubles thrown)
      if (turn.checkoutAttempts || turn.doublesThrown) {
        const attempts = turn.checkoutAttempts ?? turn.doublesThrown ?? 0;
        if (playerIdx === 0) checkoutAttempts1 += attempts;
        else checkoutAttempts2 += attempts;
      }
    }

    totalDarts1 += legDarts1;
    totalDarts2 += legDarts2;
    totalScore1 += legScore1;
    totalScore2 += legScore2;
    totalThrows1 += legDarts1;
    totalThrows2 += legDarts2;
  }

  // Calculate averages (3-dart average)
  const avg1 = totalThrows1 > 0 ? Math.round((totalScore1 / totalThrows1) * 3 * 100) / 100 : null;
  const avg2 = totalThrows2 > 0 ? Math.round((totalScore2 / totalThrows2) * 3 * 100) / 100 : null;
  const first9Avg1 = first9Count1 > 0 ? Math.round((first9Total1 / first9Count1) * 100) / 100 : null;
  const first9Avg2 = first9Count2 > 0 ? Math.round((first9Total2 / first9Count2) * 100) / 100 : null;

  // Try to use match-level stats if available (more accurate)
  const stats = match.stats || match.statistics;
  if (stats) {
    // Override with official stats if present
    const p1Stats = Array.isArray(stats) ? stats[0] : stats.player1 || stats.players?.[0];
    const p2Stats = Array.isArray(stats) ? stats[1] : stats.player2 || stats.players?.[1];

    if (p1Stats) {
      if (p1Stats.average != null) Object.assign({}, { avg1: p1Stats.average });
      if (p1Stats.dartsThrown != null) totalDarts1 = p1Stats.dartsThrown;
    }
  }

  // Also check match-level winner/scores
  if (match.scores) {
    legsWon1 = match.scores[0] ?? legsWon1;
    legsWon2 = match.scores[1] ?? legsWon2;
  }
  if (match.winner !== undefined && match.sets) {
    // Handle sets-based matches if needed
  }

  return {
    score1: legsWon1,
    score2: legsWon2,
    avg1,
    avg2,
    first_9_avg1: first9Avg1,
    first_9_avg2: first9Avg2,
    one_eighties1: oneEighties1,
    one_eighties2: oneEighties2,
    high_checkout1: highCheckout1,
    high_checkout2: highCheckout2,
    ton60_1,
    ton60_2,
    ton80_1,
    ton80_2,
    ton_plus1: tonPlus1,
    ton_plus2: tonPlus2,
    darts_thrown1: totalDarts1,
    darts_thrown2: totalDarts2,
    checkout_attempts1: checkoutAttempts1,
    checkout_attempts2: checkoutAttempts2,
    checkout_hits1: checkoutHits1,
    checkout_hits2: checkoutHits2,
    player1_name: p1.name || p1.username || p1.displayName || "Player 1",
    player2_name: p2.name || p2.username || p2.displayName || "Player 2",
    autodarts_link: `https://autodarts.io/matches/${matchId}`,
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
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { autodarts_link, match_id: autodartsMatchInput } = body;

    const input = autodarts_link || autodartsMatchInput;
    if (!input) {
      return new Response(JSON.stringify({ error: "autodarts_link or match_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const matchId = extractMatchId(input);
    const token = await getAutodartsToken();
    const stats = await fetchMatchData(matchId, token);

    return new Response(JSON.stringify({ success: true, data: stats }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: "Failed to fetch Autodarts data", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
