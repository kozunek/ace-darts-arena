import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const API_BASE = "https://api.autodarts.io";

function extractMatchId(input: string): string {
  // Handle full URLs like https://play.autodarts.io/history/matches/UUID
  const urlMatch = input.match(/matches\/([a-f0-9-]+)/i);
  if (urlMatch) return urlMatch[1];
  // Handle lobby URLs like https://play.autodarts.io/lobbies/UUID
  const lobbyMatch = input.match(/lobbies\/([a-f0-9-]+)/i);
  if (lobbyMatch) return lobbyMatch[1];
  // Handle raw UUID match IDs
  if (/^[a-f0-9-]{20,}$/i.test(input.trim())) return input.trim();
  // Reject JWT tokens and other invalid inputs
  if (input.startsWith("eyJ") || input.length > 200) {
    throw new Error("Podano token zamiast linku do meczu. Wklej link np. https://play.autodarts.io/history/matches/...");
  }
  throw new Error("Nieprawidłowy link lub ID meczu Autodarts");
}

interface PlayerStats {
  totalScore: number;
  totalDarts: number;
  first9Score: number;
  first9Darts: number;
  until170Score: number;
  until170Darts: number;
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
    until170Score: 0, until170Darts: 0,
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

async function loginToAutodarts(): Promise<string | null> {
  const email = Deno.env.get("AUTODARTS_EMAIL");
  const password = Deno.env.get("AUTODARTS_PASSWORD");

  if (!email || !password) {
    console.log("No AUTODARTS_EMAIL/PASSWORD configured");
    return null;
  }

  try {
    // Autodarts uses Keycloak OpenID Connect
    const tokenUrl = "https://login.autodarts.io/realms/autodarts/protocol/openid-connect/token";
    const params = new URLSearchParams({
      grant_type: "password",
      client_id: "autodarts-app",
      username: email,
      password: password,
    });

    const res = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.log("Autodarts login failed:", res.status, errText);
      return null;
    }

    const data = await res.json();
    if (data.access_token) {
      console.log("Server-side Autodarts login successful");
      return data.access_token;
    }

    console.log("No access_token in login response");
    return null;
  } catch (err) {
    console.error("Autodarts login error:", err);
    return null;
  }
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

  // Build playerId -> index map (Autodarts uses UUIDs in turns, not numeric indices)
  const playerIdMap: Record<string, number> = {};
  for (let i = 0; i < players.length; i++) {
    const pid = players[i].userId || players[i].id || players[i].playerId;
    if (pid) playerIdMap[pid] = i;
  }
  console.log("Player ID map:", JSON.stringify(playerIdMap));

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
    const a170_1 = ps1.avgUntil170 ?? ps1.averageUntil170 ?? ps1.avg_u170 ?? null;
    const a170_2 = ps2.avgUntil170 ?? ps2.averageUntil170 ?? ps2.avg_u170 ?? null;

    return buildResult(s1, s2, avg1, avg2, f9a1, f9a2, a170_1, a170_2, p1Name, p2Name, matchId);
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

    for (const game of games) {
      console.log("Game keys:", Object.keys(game));

      if (typeof game.winner === "number") {
        if (game.winner === 0) s1.legsWon = Math.max(s1.legsWon, legsWon1);
        else if (game.winner === 1) s2.legsWon = Math.max(s2.legsWon, legsWon2);
      }

      const turns = game.turns || game.visits || game.rounds || [];
      let turnIdx1 = 0, turnIdx2 = 0;

      // Log first turn structure for debugging
      if (turns.length > 0) {
        console.log("Sample turn keys:", Object.keys(turns[0]));
        console.log("Sample turn:", JSON.stringify(turns[0]).substring(0, 500));
      }

      for (const turn of turns) {
        // Resolve player index: use playerId UUID mapped to match.players order
        let pIdx = 0;
        if (turn.playerId && playerIdMap[turn.playerId] !== undefined) {
          pIdx = playerIdMap[turn.playerId];
        } else if (typeof turn.player === "number") {
          pIdx = turn.player;
        } else if (typeof turn.playerIndex === "number") {
          pIdx = turn.playerIndex;
        } else if (typeof turn.turn === "number") {
          // In some Autodarts formats, turn.turn alternates 0/1 within a round
          pIdx = turn.turn % 2;
        }
        // Clamp to 0 or 1
        pIdx = pIdx === 1 ? 1 : 0;

        // Extract darts array - Autodarts uses "throws" not "darts"
        const dartsArr = Array.isArray(turn.throws) ? turn.throws :
                         Array.isArray(turn.darts) ? turn.darts : null;

        // Calculate points from turn
        let points = 0;
        if (typeof turn.points === "number") {
          points = turn.points;
        } else if (dartsArr) {
          for (const d of dartsArr) {
            const segment = d.segment || d;
            const mul = segment.multiplier ?? d.multiplier ?? 1;
            const val = segment.number ?? segment.value ?? d.number ?? d.value ?? 0;
            points += val * mul;
          }
        }

        // Count darts - ensure it's always a number
        let dartsCount = 3;
        if (dartsArr) {
          dartsCount = dartsArr.length;
        } else if (typeof turn.dartsThrown === "number") {
          dartsCount = turn.dartsThrown;
        }

        const st = pIdx === 0 ? s1 : s2;
        const tidx = pIdx === 0 ? turnIdx1++ : turnIdx2++;

        // Avg until 170: count turns where score before throw is > 170
        // In Autodarts, turn.score is remaining score AFTER the throw
        const scoreBeforeTurn = typeof turn.score === "number" ? turn.score + points : null;

        st.totalScore += points;
        st.totalDarts += dartsCount;

        if (scoreBeforeTurn != null && scoreBeforeTurn > 170) {
          st.until170Score += points;
          st.until170Darts += dartsCount;
        }

        if (tidx < 3) {
          st.first9Score += points;
          st.first9Darts += dartsCount;
        }

        if (points === 180) st.oneEighties++;
        if (points >= 100) st.tonPlus++;
        else if (points >= 80) st.ton80++;
        else if (points >= 60) st.ton60++;

        // Checkout detection - score field = remaining score, so score === 0 means checkout
        const remainingScore = typeof turn.score === "number" ? turn.score : -1;
        const isCheckout = remainingScore === 0 || turn.isCheckout || turn.checkout ||
          (dartsArr && dartsArr.length > 0 && !turn.busted && (() => {
            const lastDart = dartsArr[dartsArr.length - 1];
            const seg = lastDart.segment || lastDart;
            return seg.bed === "D" || seg.bed === "Double" || seg.multiplier === 2 || seg.name === "BULL";
          })() && points > 0);

        if (isCheckout && points > 0) {
          st.checkoutHits++;
          if (points > st.highCheckout) st.highCheckout = points;
        }

        // Checkout attempts - count doubles thrown when remaining score <= 170
        if (typeof turn.checkoutAttempts === "number") {
          st.checkoutAttempts += turn.checkoutAttempts;
        } else if (typeof turn.doublesThrown === "number") {
          st.checkoutAttempts += turn.doublesThrown;
        } else if (dartsArr) {
          // In Autodarts, remaining score before throw is (score + points)
          // Check if any dart targeted a double/bull for checkout
          for (const d of dartsArr) {
            const seg = d.segment || d;
            if (seg.bed === "D" || seg.bed === "Double" || seg.multiplier === 2 || seg.name === "BULL") {
              st.checkoutAttempts++;
            }
          }
        }
      }

      if (game.stats) {
        console.log("Game has stats:", JSON.stringify(game.stats));
      }
      if (Array.isArray(game.players)) {
        for (let pi = 0; pi < game.players.length && pi < 2; pi++) {
          const gp = game.players[pi];
          if (gp?.stats && Object.keys(gp.stats).length > 0) {
            console.log(`Game player ${pi} stats:`, JSON.stringify(gp.stats));
          }
        }
      }
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

    const matchId = extractMatchId(input);

    // Try user-provided token first, then fallback to server-side login
    let adToken = autodarts_token || null;
    let tokenSource = "extension";

    if (adToken) {
      // Test if token is still valid
      try {
        const testRes = await fetch(`${API_BASE}/as/v0/matches/${matchId}`, {
          headers: { Authorization: `Bearer ${adToken}` },
        });
        if (testRes.status === 401) {
          console.log("Extension token expired, falling back to server-side login");
          adToken = null;
        } else {
          // consume the body so we don't leak
          await testRes.text();
        }
      } catch {
        adToken = null;
      }
    }

    if (!adToken) {
      // Server-side login to Autodarts using stored credentials
      adToken = await loginToAutodarts();
      tokenSource = "server";
      if (!adToken) {
        return new Response(JSON.stringify({ 
          error: "Nie udało się zalogować do Autodarts",
          message: "Token z rozszerzenia wygasł, a logowanie serwerowe nie powiodło się. Odśwież play.autodarts.io i spróbuj ponownie."
        }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    console.log("Using token from:", tokenSource);
    const stats = await fetchMatchData(matchId, adToken);

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
