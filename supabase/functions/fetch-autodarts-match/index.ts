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

interface PlayerStats {
  totalScore: number;
  totalDarts: number;
  first9Score: number;
  first9Darts: number;
  oneEighties: number;
  highCheckout: number;
  ton60: number;
  ton80: number;
  tonPlus: number;
  checkoutAttempts: number;
  checkoutHits: number;
  legsWon: number;
}

function emptyStats(): PlayerStats {
  return {
    totalScore: 0, totalDarts: 0,
    first9Score: 0, first9Darts: 0,
    oneEighties: 0, highCheckout: 0,
    ton60: 0, ton80: 0, tonPlus: 0,
    checkoutAttempts: 0, checkoutHits: 0,
    legsWon: 0,
  };
}

async function fetchJson(url: string, token: string) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`API ${res.status}: ${txt}`);
  }
  return res.json();
}

function unwrapGamePayload(payload: any) {
  if (!payload) return null;
  if (Array.isArray(payload)) return payload[0] ?? null;
  if (payload.game && typeof payload.game === "object") return payload.game;
  if (payload.data && typeof payload.data === "object") return payload.data;
  return payload;
}

async function fetchGameDetail(matchId: string, gameId: string, token: string) {
  const urls = [
    `${API_BASE}/as/v0/matches/${matchId}/games/${gameId}`,
    `${API_BASE}/gs/v0/matches/${matchId}/games/${gameId}`,
    `${API_BASE}/as/v0/games/${gameId}`,
    `${API_BASE}/gs/v0/games/${gameId}`,
  ];

  for (const url of urls) {
    try {
      const payload = await fetchJson(url, token);
      const game = unwrapGamePayload(payload);
      if (game && typeof game === "object") {
        console.log("Fetched game details from:", url);
        return game;
      }
    } catch (err) {
      console.log("Failed endpoint", url, String(err));
    }
  }

  console.log("No game detail endpoint worked for game", gameId);
  return null;
}

async function fetchMatchData(matchId: string, token: string) {
  const match = await fetchJson(`${API_BASE}/as/v0/matches/${matchId}`, token);

  console.log("Top-level keys:", Object.keys(match));
  console.log("variant:", match.variant);
  console.log("winner:", match.winner);
  console.log("scores:", JSON.stringify(match.scores));

  const players = match.players || [];
  if (players.length < 2) throw new Error("Match does not have 2 players");

  const p1Name = players[0].name || players[0].username || "Player 1";
  const p2Name = players[1].name || players[1].username || "Player 2";

  // Extract scores from match.scores (nested objects)
  let legsWon1 = 0, legsWon2 = 0;
  if (Array.isArray(match.scores) && match.scores.length >= 2) {
    const s1 = match.scores[0];
    const s2 = match.scores[1];
    if (typeof s1 === "object" && s1 !== null) {
      legsWon1 = s1.legs ?? s1.sets ?? 0;
      legsWon2 = (s2?.legs ?? s2?.sets ?? 0);
    } else {
      legsWon1 = Number(s1) || 0;
      legsWon2 = Number(s2) || 0;
    }
  }

  // Try pre-calculated stats from players first
  const ps1 = players[0].stats || {};
  const ps2 = players[1].stats || {};
  const hasPreCalc = Object.keys(ps1).length > 2 || Object.keys(ps2).length > 2;

  let s1 = emptyStats(), s2 = emptyStats();
  s1.legsWon = legsWon1;
  s2.legsWon = legsWon2;

  if (hasPreCalc) {
    console.log("Using pre-calculated stats");
    s1 = {
      ...s1,
      totalScore: 0, totalDarts: ps1.dartsThrown ?? ps1.darts ?? 0,
      first9Score: 0, first9Darts: 0,
      oneEighties: ps1.oneEighties ?? ps1["180s"] ?? 0,
      highCheckout: ps1.highestCheckout ?? ps1.bestCheckout ?? 0,
      ton60: ps1.ton60 ?? ps1["60+"] ?? 0,
      ton80: ps1.ton80 ?? ps1["80+"] ?? 0,
      tonPlus: ps1.tonPlus ?? ps1["100+"] ?? 0,
      checkoutAttempts: ps1.checkoutAttempts ?? ps1.checkoutDarts ?? 0,
      checkoutHits: ps1.checkoutHits ?? ps1.checkouts ?? 0,
    };
    s2 = {
      ...s2,
      totalScore: 0, totalDarts: ps2.dartsThrown ?? ps2.darts ?? 0,
      first9Score: 0, first9Darts: 0,
      oneEighties: ps2.oneEighties ?? ps2["180s"] ?? 0,
      highCheckout: ps2.highestCheckout ?? ps2.bestCheckout ?? 0,
      ton60: ps2.ton60 ?? ps2["60+"] ?? 0,
      ton80: ps2.ton80 ?? ps2["80+"] ?? 0,
      tonPlus: ps2.tonPlus ?? ps2["100+"] ?? 0,
      checkoutAttempts: ps2.checkoutAttempts ?? ps2.checkoutDarts ?? 0,
      checkoutHits: ps2.checkoutHits ?? ps2.checkouts ?? 0,
    };
    const avg1 = ps1.average ?? ps1.avg ?? (ps1.ppd ? ps1.ppd * 3 : null);
    const avg2 = ps2.average ?? ps2.avg ?? (ps2.ppd ? ps2.ppd * 3 : null);
    const f9a1 = ps1.first9Average ?? ps1.firstNineAvg ?? ps1.first9Avg ?? null;
    const f9a2 = ps2.first9Average ?? ps2.firstNineAvg ?? ps2.first9Avg ?? null;

    return buildResult(s1, s2, avg1, avg2, f9a1, f9a2, p1Name, p2Name, matchId);
  }

  // No pre-calculated stats - parse from games array
  const gameIds: string[] = [];
  const embeddedGames: any[] = [];

  if (Array.isArray(match.games)) {
    console.log("Games count:", match.games.length);
    for (const g of match.games) {
      if (typeof g === "string") {
        gameIds.push(g);
      } else if (g && typeof g === "object") {
        embeddedGames.push(g);
        if (g.id) gameIds.push(g.id);
      }
    }

    if (embeddedGames.length > 0) {
      console.log("Embedded game sample keys:", Object.keys(embeddedGames[0] || {}));
    }
  }

  // Also check legs/sets arrays
  const legArrays = match.legs || match.sets?.[0]?.legs || [];
  
  if (gameIds.length > 0 || embeddedGames.length > 0) {
    console.log("Processing games...");
    const fetchedGames = gameIds.length > 0
      ? await Promise.all(gameIds.map((gid) => fetchGameDetail(matchId, gid, token)))
      : [];

    const games = [...embeddedGames, ...fetchedGames].filter(Boolean);

      
      // Determine leg winner
      if (typeof game.winner === "number") {
        if (game.winner === 0) s1.legsWon = Math.max(s1.legsWon, legsWon1);
        else if (game.winner === 1) s2.legsWon = Math.max(s2.legsWon, legsWon2);
      }

      // Parse turns/rounds/visits
      const turns = game.turns || game.visits || game.rounds || [];
      let turnIdx1 = 0, turnIdx2 = 0;

      for (const turn of turns) {
        const pIdx = turn.player ?? turn.playerIndex ?? turn.p ?? 0;
        
        // Calculate points from darts or use points directly
        let points = 0;
        if (typeof turn.points === "number") {
          points = turn.points;
        } else if (typeof turn.score === "number") {
          points = turn.score;
        } else if (Array.isArray(turn.darts)) {
          for (const d of turn.darts) {
            const segment = d.segment || d;
            const mul = segment.multiplier ?? d.multiplier ?? 1;
            const val = segment.number ?? segment.value ?? d.number ?? d.value ?? 0;
            points += val * mul;
          }
        }

        const dartsCount = Array.isArray(turn.darts) ? turn.darts.length : (turn.dartsThrown ?? turn.throws ?? 3);

        const st = pIdx === 0 ? s1 : s2;
        const tidx = pIdx === 0 ? turnIdx1++ : turnIdx2++;

        st.totalScore += points;
        st.totalDarts += dartsCount;

        // First 9 darts (first 3 turns)
        if (tidx < 3) {
          st.first9Score += points;
          st.first9Darts += dartsCount;
        }

        // 180s
        if (points === 180) st.oneEighties++;
        
        // Ton ranges
        if (points >= 100) st.tonPlus++;
        else if (points >= 80) st.ton80++;
        else if (points >= 60) st.ton60++;

        // Checkout detection
        const isCheckout = turn.isCheckout || turn.checkout || 
          (Array.isArray(turn.darts) && turn.darts.some((d: any) => d.segment?.bed === "D" || d.bed === "D" || d.segment?.multiplier === 2));
        
        if (isCheckout && points > 0) {
          st.checkoutHits++;
          if (points > st.highCheckout) st.highCheckout = points;
        }

        // Checkout attempts (doubles thrown)
        if (turn.checkoutAttempts != null) {
          st.checkoutAttempts += turn.checkoutAttempts;
        } else if (turn.doublesThrown != null) {
          st.checkoutAttempts += turn.doublesThrown;
        } else if (Array.isArray(turn.darts)) {
          for (const d of turn.darts) {
            const seg = d.segment || d;
            if (seg.bed === "D" || seg.multiplier === 2) {
              st.checkoutAttempts++;
            }
          }
        }
      }

      // Check game-level stats as fallback
      if (game.stats) {
        console.log("Game has stats:", JSON.stringify(game.stats));
      }
      
      // Check game players stats
      if (Array.isArray(game.players)) {
        for (let pi = 0; pi < game.players.length && pi < 2; pi++) {
          const gp = game.players[pi];
          if (gp?.stats && Object.keys(gp.stats).length > 0) {
            console.log(`Game player ${pi} stats:`, JSON.stringify(gp.stats));
            const st = pi === 0 ? s1 : s2;
            const gs = gp.stats;
            // Use game-level player stats if we got them
            if (gs.average != null && st.totalDarts === 0) {
              // Will be handled in avg calculation
            }
          }
        }
      }
      
      legIdx++;
    }
  } else if (legArrays.length > 0) {
    console.log("Parsing", legArrays.length, "legs from match data");
    for (const leg of legArrays) {
      const turns = leg.turns || leg.visits || leg.rounds || [];
      let turnIdx1 = 0, turnIdx2 = 0;
      for (const turn of turns) {
        const pIdx = turn.player ?? turn.playerIndex ?? 0;
        const points = turn.points ?? turn.score ?? 0;
        const darts = turn.darts?.length ?? turn.dartsThrown ?? 3;
        const st = pIdx === 0 ? s1 : s2;
        const tidx = pIdx === 0 ? turnIdx1++ : turnIdx2++;
        st.totalScore += points;
        st.totalDarts += darts;
        if (tidx < 3) { st.first9Score += points; st.first9Darts += darts; }
        if (points === 180) st.oneEighties++;
        if (points >= 100) st.tonPlus++;
        else if (points >= 80) st.ton80++;
        else if (points >= 60) st.ton60++;
      }
    }
  }

  // Calculate averages
  const avg1 = s1.totalDarts > 0 ? Math.round((s1.totalScore / s1.totalDarts) * 3 * 100) / 100 : null;
  const avg2 = s2.totalDarts > 0 ? Math.round((s2.totalScore / s2.totalDarts) * 3 * 100) / 100 : null;
  const f9a1 = s1.first9Darts > 0 ? Math.round((s1.first9Score / s1.first9Darts) * 3 * 100) / 100 : null;
  const f9a2 = s2.first9Darts > 0 ? Math.round((s2.first9Score / s2.first9Darts) * 3 * 100) / 100 : null;

  return buildResult(s1, s2, avg1, avg2, f9a1, f9a2, p1Name, p2Name, matchId);
}

function buildResult(
  s1: PlayerStats, s2: PlayerStats,
  avg1: number | null, avg2: number | null,
  f9a1: number | null, f9a2: number | null,
  p1Name: string, p2Name: string, matchId: string
) {
  const result = {
    score1: s1.legsWon,
    score2: s2.legsWon,
    avg1, avg2,
    first_9_avg1: f9a1, first_9_avg2: f9a2,
    one_eighties1: s1.oneEighties, one_eighties2: s2.oneEighties,
    high_checkout1: s1.highCheckout, high_checkout2: s2.highCheckout,
    ton60_1: s1.ton60, ton60_2: s2.ton60,
    ton80_1: s1.ton80, ton80_2: s2.ton80,
    ton_plus1: s1.tonPlus, ton_plus2: s2.tonPlus,
    darts_thrown1: s1.totalDarts, darts_thrown2: s2.totalDarts,
    checkout_attempts1: s1.checkoutAttempts, checkout_attempts2: s2.checkoutAttempts,
    checkout_hits1: s1.checkoutHits, checkout_hits2: s2.checkoutHits,
    player1_name: p1Name, player2_name: p2Name,
    autodarts_link: `https://play.autodarts.io/history/matches/${matchId}`,
  };
  console.log("Final result:", JSON.stringify(result));
  return result;
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
