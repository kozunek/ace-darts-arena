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
  const lobbyMatch = input.match(/lobbies\/([a-f0-9-]+)/i);
  if (lobbyMatch) return lobbyMatch[1];
  if (/^[a-f0-9-]{20,}$/i.test(input.trim())) return input.trim();
  if (input.startsWith("eyJ") || input.length > 200) {
    throw new Error("Podano token zamiast linku do meczu.");
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
  ton60: number;   // 60-99
  ton100: number;  // 100-139
  ton140: number;  // 140-169
  ton170: number;  // 170-179
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
    ton60: 0, ton100: 0, ton140: 0, ton170: 0,
    checkoutAttempts: 0, checkoutHits: 0,
    legsWon: 0,
  };
}

function readFirstNumber(...values: unknown[]): number | null {
  for (const value of values) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
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

async function tryFetchJson(url: string, token: string): Promise<any | null> {
  try {
    return await fetchJson(url, token);
  } catch {
    return null;
  }
}

async function loginToAutodarts(): Promise<string | null> {
  const email = Deno.env.get("AUTODARTS_EMAIL");
  const password = Deno.env.get("AUTODARTS_PASSWORD");
  const configuredClientId = Deno.env.get("AUTODARTS_CLIENT_ID")?.trim();
  const clientSecret = Deno.env.get("AUTODARTS_CLIENT_SECRET")?.trim();

  if (!email || !password) {
    console.log("No AUTODARTS_EMAIL/PASSWORD configured");
    return null;
  }

  const tokenUrl = "https://login.autodarts.io/realms/autodarts/protocol/openid-connect/token";
  const candidateClientIds = configuredClientId
    ? [configuredClientId]
    : ["autodarts-desktop", "autodarts-app"];

  let lastAuthError = "";

  for (const clientId of candidateClientIds) {
    try {
      const params = new URLSearchParams({
        grant_type: "password",
        client_id: clientId,
        username: email,
        password,
        scope: "openid",
      });
      if (clientSecret) params.set("client_secret", clientSecret);

      const res = await fetch(tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.access_token) {
          console.log("Server-side Autodarts login successful with client:", clientId);
          return data.access_token;
        }
        lastAuthError = "No access_token in login response";
        continue;
      }

      const errText = await res.text();
      lastAuthError = `${res.status} ${errText}`;
      console.log(`Autodarts login failed for client ${clientId}:`, lastAuthError);

      const invalidClient =
        res.status === 401 && /(invalid_client|unauthorized_client)/i.test(errText);
      if (!invalidClient || configuredClientId) break;
    } catch (err) {
      lastAuthError = String(err);
      console.error(`Autodarts login error for client ${clientId}:`, err);
    }
  }

  console.log(`Autodarts login failed for all clients: ${lastAuthError}`);
  return null;
}

// ── Compute per-leg stats from turns ──────────────────────────────
function processGameTurns(
  game: any,
  playerIdMap: Record<string, number>,
  s1: PlayerStats,
  s2: PlayerStats,
) {
  const turns = game.turns || game.visits || game.rounds || [];
  let turnIdx1 = 0;
  let turnIdx2 = 0;
  let unknownTurnIdx = 0;

  for (const turn of turns) {
    const directTurnPlayerId =
      typeof turn.playerId === "string" ? turn.playerId :
      typeof turn.player?.id === "string" ? turn.player.id :
      typeof turn.player?.userId === "string" ? turn.player.userId :
      typeof turn.userId === "string" ? turn.userId :
      typeof turn.player === "string" ? turn.player :
      null;

    let pIdx: number | null = null;

    if (directTurnPlayerId && playerIdMap[directTurnPlayerId] !== undefined) {
      pIdx = playerIdMap[directTurnPlayerId];
    } else if (typeof turn.player === "number") {
      pIdx = turn.player;
    } else if (typeof turn.playerIndex === "number") {
      pIdx = turn.playerIndex;
    }

    if (pIdx == null) {
      pIdx = unknownTurnIdx % 2;
      unknownTurnIdx += 1;
    }

    pIdx = pIdx === 1 ? 1 : 0;

    const dartsArr = Array.isArray(turn.throws)
      ? turn.throws
      : Array.isArray(turn.darts)
        ? turn.darts
        : null;

    let points = 0;
    if (typeof turn.points === "number") {
      points = turn.points;
    } else if (dartsArr) {
      for (const d of dartsArr) {
        const seg = d.segment || d;
        points += (seg.number ?? seg.value ?? 0) * (seg.multiplier ?? 1);
      }
    }

    let dartsCount = 3;
    if (dartsArr) dartsCount = dartsArr.length;
    else if (typeof turn.dartsThrown === "number") dartsCount = turn.dartsThrown;

    const st = pIdx === 0 ? s1 : s2;
    const tidx = pIdx === 0 ? turnIdx1++ : turnIdx2++;

    const scoreBeforeTurn = readFirstNumber(
      turn.scoreBefore,
      turn.startScore,
      turn.startingScore,
      turn.pointsBefore,
      turn.remainingBefore,
      typeof turn.score === "number" ? turn.score + points : null,
      typeof turn.remaining === "number" ? turn.remaining + points : null,
    );

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

    // Ton ranges matching Autodarts: 60+, 100+, 140+, 170+, 180
    if (points === 180) st.oneEighties++;
    else if (points >= 170) st.ton170++;
    else if (points >= 140) st.ton140++;
    else if (points >= 100) st.ton100++;
    else if (points >= 60) st.ton60++;

    const remainingScore = readFirstNumber(
      turn.score,
      turn.remaining,
      turn.pointsLeftAfter,
      turn.scoreAfter,
    );
    const isBusted = turn.busted === true;
    const isCheckout = !isBusted && (remainingScore === 0 || turn.isCheckout === true || turn.checkout === true);

    if (isCheckout && points > 0) {
      st.checkoutHits++;
      if (points > st.highCheckout) st.highCheckout = points;
    }

    const canAttemptCheckout = scoreBeforeTurn != null && scoreBeforeTurn <= 170 && scoreBeforeTurn > 1;

    if (typeof turn.checkoutAttempts === "number") {
      st.checkoutAttempts += turn.checkoutAttempts;
    } else if (typeof turn.doublesThrown === "number") {
      st.checkoutAttempts += turn.doublesThrown;
    } else if (dartsArr && canAttemptCheckout) {
      for (const d of dartsArr) {
        const seg = d.segment || d;
        const bed = String(seg.bed || "").toUpperCase();
        const name = String(seg.name || "").toUpperCase();
        const number = Number(seg.number ?? seg.value);
        const isBull = name.includes("BULL") || (number === 25 && Number(seg.multiplier ?? 1) >= 1);
        const isDouble = bed === "D" || bed === "DOUBLE" || Number(seg.multiplier) === 2;
        if (isBull || isDouble) st.checkoutAttempts++;
      }
    }
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

  console.log("Player[0] full:", JSON.stringify(players[0]).substring(0, 800));
  console.log("Player[1] full:", JSON.stringify(players[1]).substring(0, 800));

  const p1Name = players[0].name || players[0].username || "Player 1";
  const p2Name = players[1].name || players[1].username || "Player 2";
  const p1AutoId = players[0].userId || players[0].id || players[0].playerId || null;
  const p2AutoId = players[1].userId || players[1].id || players[1].playerId || null;

  const playerIdMap: Record<string, number> = {};
  for (let i = 0; i < players.length; i++) {
    const pid = players[i].userId || players[i].id || players[i].playerId;
    if (pid) playerIdMap[pid] = i;
  }

  // Extract scores
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

  // ── Try Autodarts stats endpoint ──
  const statsEndpoints = [
    `${API_BASE}/as/v0/matches/${matchId}/stats`,
    `${API_BASE}/gs/v0/matches/${matchId}/stats`,
  ];
  for (const url of statsEndpoints) {
    const statsData = await tryFetchJson(url, token);
    if (statsData) {
      console.log("Got match stats from endpoint:", url);
      console.log("Stats data:", JSON.stringify(statsData).substring(0, 2000));
    }
  }

  // ── Check pre-calculated stats on players ──
  const ps1 = players[0].stats || players[0].matchStats || players[0].gameStats || {};
  const ps2 = players[1].stats || players[1].matchStats || players[1].gameStats || {};
  const hasPreCalc = Object.keys(ps1).length > 2 || Object.keys(ps2).length > 2;

  let st1 = emptyStats(), st2 = emptyStats();
  st1.legsWon = legsWon1;
  st2.legsWon = legsWon2;

  if (hasPreCalc) {
    console.log("Using pre-calculated player stats");
    console.log("ps1:", JSON.stringify(ps1));
    console.log("ps2:", JSON.stringify(ps2));
    st1 = {
      ...st1,
      totalScore: 0, totalDarts: ps1.dartsThrown ?? ps1.darts ?? 0,
      first9Score: 0, first9Darts: 0,
      oneEighties: ps1.oneEighties ?? ps1["180s"] ?? ps1["180"] ?? 0,
      highCheckout: ps1.highestCheckout ?? ps1.bestCheckout ?? 0,
      ton60: ps1["60+"] ?? ps1.ton60 ?? 0,
      ton100: ps1["100+"] ?? ps1.ton100 ?? ps1.tonPlus ?? 0,
      ton140: ps1["140+"] ?? ps1.ton140 ?? 0,
      ton170: ps1["170+"] ?? ps1.ton170 ?? 0,
      checkoutAttempts: ps1.checkoutAttempts ?? ps1.checkoutDarts ?? 0,
      checkoutHits: ps1.checkoutHits ?? ps1.checkouts ?? 0,
    };
    st2 = {
      ...st2,
      totalScore: 0, totalDarts: ps2.dartsThrown ?? ps2.darts ?? 0,
      first9Score: 0, first9Darts: 0,
      oneEighties: ps2.oneEighties ?? ps2["180s"] ?? ps2["180"] ?? 0,
      highCheckout: ps2.highestCheckout ?? ps2.bestCheckout ?? 0,
      ton60: ps2["60+"] ?? ps2.ton60 ?? 0,
      ton100: ps2["100+"] ?? ps2.ton100 ?? ps2.tonPlus ?? 0,
      ton140: ps2["140+"] ?? ps2.ton140 ?? 0,
      ton170: ps2["170+"] ?? ps2.ton170 ?? 0,
      checkoutAttempts: ps2.checkoutAttempts ?? ps2.checkoutDarts ?? 0,
      checkoutHits: ps2.checkoutHits ?? ps2.checkouts ?? 0,
    };
    const avg1 = ps1.average ?? ps1.avg ?? (ps1.ppd ? ps1.ppd * 3 : null);
    const avg2 = ps2.average ?? ps2.avg ?? (ps2.ppd ? ps2.ppd * 3 : null);
    const f9a1 = ps1.first9Average ?? ps1.firstNineAvg ?? ps1.first9Avg ?? null;
    const f9a2 = ps2.first9Average ?? ps2.firstNineAvg ?? ps2.first9Avg ?? null;
    const a170_1 = ps1.avgUntil170 ?? ps1.averageUntil170 ?? ps1.avg_u170 ?? null;
    const a170_2 = ps2.avgUntil170 ?? ps2.averageUntil170 ?? ps2.avg_u170 ?? null;

    return buildResult(st1, st2, avg1, avg2, f9a1, f9a2, a170_1, a170_2, p1Name, p2Name, p1AutoId, p2AutoId, matchId);
  }

  // ── Parse from embedded games ──
  const embeddedGames: any[] = [];
  if (Array.isArray(match.games)) {
    console.log("Games count:", match.games.length);
    for (const g of match.games) {
      if (g && typeof g === "object") {
        embeddedGames.push(g);
      }
    }
  }

  if (embeddedGames.length > 0) {
    console.log("Processing", embeddedGames.length, "embedded games...");
    for (const game of embeddedGames) {
      processGameTurns(game, playerIdMap, st1, st2);
    }
  }

  const avg1 = st1.totalDarts > 0 ? Math.round((st1.totalScore / st1.totalDarts) * 3 * 100) / 100 : null;
  const avg2 = st2.totalDarts > 0 ? Math.round((st2.totalScore / st2.totalDarts) * 3 * 100) / 100 : null;
  const f9a1 = st1.first9Darts > 0 ? Math.round((st1.first9Score / st1.first9Darts) * 3 * 100) / 100 : null;
  const f9a2 = st2.first9Darts > 0 ? Math.round((st2.first9Score / st2.first9Darts) * 3 * 100) / 100 : null;
  const a170_1 = st1.until170Darts > 0 ? Math.round((st1.until170Score / st1.until170Darts) * 3 * 100) / 100 : null;
  const a170_2 = st2.until170Darts > 0 ? Math.round((st2.until170Score / st2.until170Darts) * 3 * 100) / 100 : null;

  return buildResult(st1, st2, avg1, avg2, f9a1, f9a2, a170_1, a170_2, p1Name, p2Name, p1AutoId, p2AutoId, matchId);
}

function buildResult(
  s1: PlayerStats, s2: PlayerStats,
  avg1: number | null, avg2: number | null,
  f9a1: number | null, f9a2: number | null,
  a170_1: number | null, a170_2: number | null,
  p1Name: string, p2Name: string,
  p1AutoId: string | null, p2AutoId: string | null,
  matchId: string,
) {
  // Map to DB column names:
  // ton60 = 60+, ton80 = 100+, ton_plus = 140+, ton40 = 170+
  const result = {
    score1: s1.legsWon,
    score2: s2.legsWon,
    avg1, avg2,
    first_9_avg1: f9a1, first_9_avg2: f9a2,
    avg_until_170_1: a170_1, avg_until_170_2: a170_2,
    one_eighties1: s1.oneEighties, one_eighties2: s2.oneEighties,
    high_checkout1: s1.highCheckout, high_checkout2: s2.highCheckout,
    ton60_1: s1.ton60, ton60_2: s2.ton60,         // 60+
    ton80_1: s1.ton100, ton80_2: s2.ton100,        // 100+ (stored in ton80 column)
    ton_plus1: s1.ton140, ton_plus2: s2.ton140,    // 140+ (stored in ton_plus column)
    ton40_1: s1.ton170, ton40_2: s2.ton170,        // 170+ (stored in ton40 column)
    darts_thrown1: s1.totalDarts, darts_thrown2: s2.totalDarts,
    checkout_attempts1: s1.checkoutAttempts, checkout_attempts2: s2.checkoutAttempts,
    checkout_hits1: s1.checkoutHits, checkout_hits2: s2.checkoutHits,
    player1_name: p1Name, player2_name: p2Name,
    player1_autodarts_id: p1AutoId,
    player2_autodarts_id: p2AutoId,
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

    let adToken = autodarts_token || null;
    let tokenSource = "extension";

    if (adToken) {
      try {
        const testRes = await fetch(`${API_BASE}/as/v0/matches/${matchId}`, {
          headers: { Authorization: `Bearer ${adToken}` },
        });
        if (testRes.status === 401) {
          console.log("Extension token expired, falling back to server-side login");
          adToken = null;
        } else {
          await testRes.text();
        }
      } catch {
        adToken = null;
      }
    }

    if (!adToken) {
      adToken = await loginToAutodarts();
      tokenSource = "server";
      if (!adToken) {
        return new Response(JSON.stringify({
          error: "Nie udało się zalogować do Autodarts",
          message: "Token z rozszerzenia wygasł, a logowanie serwerowe nie powiodło się. Odśwież play.autodarts.io i spróbuj ponownie.",
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
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
