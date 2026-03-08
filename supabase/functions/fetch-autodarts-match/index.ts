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
  ton60: number;
  ton100: number;
  ton140: number;
  ton170: number;
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

// ── Resolve player index from a turn ──
function resolvePlayerIndex(
  turn: any,
  playerIdMap: Record<string, number>,
): number | null {
  // Strategy 1: Direct playerId field (string UUID)
  const candidateIds: (string | undefined)[] = [
    turn.playerId,
    turn.player?.id,
    turn.player?.userId,
    turn.player?.hostId,
    turn.userId,
    turn.player?.user?.id,
  ];
  
  for (const cid of candidateIds) {
    if (typeof cid === "string" && cid.length > 0 && playerIdMap[cid] !== undefined) {
      return playerIdMap[cid];
    }
  }

  // Strategy 2: Numeric player field (0 or 1)
  const numericSources: unknown[] = [
    turn.playerIndex,
    turn.player,
    turn.player?.index,
    turn.player?.playerIndex,
  ];

  for (const src of numericSources) {
    const n = typeof src === "number" ? src : (typeof src === "string" ? Number(src) : null);
    if (n === 0 || n === 1) return n;
    if (n === 2) return 1; // Some APIs use 1-based indexing
  }

  return null;
}

// ── Process turns for a single game (leg) ──
function processGameTurns(
  game: any,
  matchPlayerIdMap: Record<string, number>,
  s1: PlayerStats,
  s2: PlayerStats,
  gameIndex: number,
  debugFirstGame: boolean,
) {
  const turns = game.turns || game.visits || game.rounds || [];
  if (turns.length === 0) return;

  // Build comprehensive player ID map including match + game-level IDs
  const combinedIdMap: Record<string, number> = { ...matchPlayerIdMap };
  
  // Add game-level player IDs if game has players array
  if (Array.isArray(game.players)) {
    for (const gp of game.players) {
      const idx = gp?.index ?? gp?.playerIndex ?? gp?.position;
      const normalizedIdx = (idx === 0 || idx === 1) ? idx : (idx === 2 ? 1 : null);
      if (normalizedIdx == null) continue;
      
      const ids = [gp?.id, gp?.playerId, gp?.userId, gp?.hostId, gp?.user?.id];
      for (const id of ids) {
        if (typeof id === "string" && id) combinedIdMap[id] = normalizedIdx;
      }
    }
  }

  // Debug: log first turn structure
  if (debugFirstGame) {
    const firstTurn = turns[0];
    console.log(`[DEBUG] Game ${gameIndex} has ${turns.length} turns`);
    console.log(`[DEBUG] First turn keys:`, Object.keys(firstTurn));
    console.log(`[DEBUG] First turn (500 chars):`, JSON.stringify(firstTurn).substring(0, 500));
    
    if (turns.length > 1) {
      console.log(`[DEBUG] Second turn keys:`, Object.keys(turns[1]));
      console.log(`[DEBUG] Second turn (500 chars):`, JSON.stringify(turns[1]).substring(0, 500));
    }
    
    // Log the combinedIdMap for debugging
    console.log(`[DEBUG] combinedIdMap:`, JSON.stringify(combinedIdMap));
  }

  // First pass: try to resolve all turns' player indices
  const resolvedIndices: (number | null)[] = [];
  let resolvedCount = 0;
  
  for (const turn of turns) {
    const idx = resolvePlayerIndex(turn, combinedIdMap);
    resolvedIndices.push(idx);
    if (idx === 0 || idx === 1) resolvedCount++;
  }

  if (debugFirstGame) {
    console.log(`[DEBUG] Resolved ${resolvedCount}/${turns.length} turns with player mapping`);
    console.log(`[DEBUG] First 10 resolved indices:`, resolvedIndices.slice(0, 10));
  }

  // If we couldn't resolve ANY turns, use alternating pattern
  // In X01, turns alternate. Starting player alternates per leg.
  const useAlternating = resolvedCount === 0;
  // If we resolved ALL to same player, that's clearly wrong → use alternating
  const allSamePlayer = resolvedCount > 0 && resolvedIndices.filter(i => i === 0).length === resolvedCount;
  const allSamePlayer1 = resolvedCount > 0 && resolvedIndices.filter(i => i === 1).length === resolvedCount;
  
  if (useAlternating || allSamePlayer || allSamePlayer1) {
    if (debugFirstGame) {
      console.log(`[DEBUG] Using alternating pattern (useAlternating=${useAlternating}, allSame0=${allSamePlayer}, allSame1=${allSamePlayer1})`);
    }
    // Determine starting player: even legs → player 0 starts, odd legs → player 1 starts
    const startingPlayer = gameIndex % 2;
    for (let i = 0; i < resolvedIndices.length; i++) {
      resolvedIndices[i] = (i + startingPlayer) % 2;
    }
  }

  // Now process each turn with the resolved player index
  let turnIdx1 = 0;
  let turnIdx2 = 0;

  for (let i = 0; i < turns.length; i++) {
    const turn = turns[i];
    let pIdx = resolvedIndices[i];
    if (pIdx !== 0 && pIdx !== 1) pIdx = i % 2; // Final fallback

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
    else if (typeof turn.darts === "number") dartsCount = turn.darts;

    const st = pIdx === 0 ? s1 : s2;
    const tidx = pIdx === 0 ? turnIdx1++ : turnIdx2++;

    // Determine score before this turn (for avg-until-170 and checkout detection)
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

    // Ton ranges: 60+, 100+, 140+, 170+, 180
    if (points === 180) st.oneEighties++;
    else if (points >= 170) st.ton170++;
    else if (points >= 140) st.ton140++;
    else if (points >= 100) st.ton100++;
    else if (points >= 60) st.ton60++;

    // Checkout detection
    const remainingScore = readFirstNumber(
      turn.score,
      turn.remaining,
      turn.pointsLeftAfter,
      turn.scoreAfter,
    );
    const isBusted = turn.busted === true;
    const isCheckout = !isBusted && (
      remainingScore === 0 || 
      turn.isCheckout === true || 
      turn.checkout === true
    );

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

  console.log("Player[0]:", JSON.stringify({ id: players[0].id, userId: players[0].userId, name: players[0].name, hostId: players[0].hostId, index: players[0].index }));
  console.log("Player[1]:", JSON.stringify({ id: players[1].id, userId: players[1].userId, name: players[1].name, hostId: players[1].hostId, index: players[1].index }));

  const p1Name = players[0].name || players[0].username || "Player 1";
  const p2Name = players[1].name || players[1].username || "Player 2";
  const p1AutoId = players[0].userId || players[0].id || players[0].playerId || null;
  const p2AutoId = players[1].userId || players[1].id || players[1].playerId || null;

  // Build comprehensive player ID map (maps various IDs to player index 0 or 1)
  const playerIdMap: Record<string, number> = {};
  for (let i = 0; i < players.length; i++) {
    const ids = [
      players[i].userId,
      players[i].id,
      players[i].playerId,
      players[i].hostId,
      players[i]?.user?.id,
    ];
    for (const id of ids) {
      if (typeof id === "string" && id.length > 0) {
        playerIdMap[id] = i;
      }
    }
  }
  
  console.log("playerIdMap keys:", Object.keys(playerIdMap).length, "entries");

  // Extract scores (legs won)
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

  let st1 = emptyStats(), st2 = emptyStats();
  st1.legsWon = legsWon1;
  st2.legsWon = legsWon2;

  // ── Parse from embedded games ──
  const embeddedGames: any[] = [];
  if (Array.isArray(match.games)) {
    for (const g of match.games) {
      if (g && typeof g === "object") {
        embeddedGames.push(g);
      }
    }
  }

  console.log("Games count:", embeddedGames.length);

  if (embeddedGames.length > 0) {
    for (let gi = 0; gi < embeddedGames.length; gi++) {
      const game = embeddedGames[gi];
      console.log(`Game ${gi}: winner=${game.winner}, winnerPlayerId=${game.winnerPlayerId}, scores=${JSON.stringify(game.scores)}`);
      processGameTurns(game, playerIdMap, st1, st2, gi, gi === 0); // debug first game
    }
  }

  // Sanity check: if one player has 0 darts but match has multiple legs, log warning
  if (st1.totalDarts === 0 && st2.totalDarts > 0) {
    console.warn("WARNING: Player 1 has 0 darts thrown! Stats may be incorrectly mapped.");
  }
  if (st2.totalDarts === 0 && st1.totalDarts > 0) {
    console.warn("WARNING: Player 2 has 0 darts thrown! Stats may be incorrectly mapped.");
  }

  console.log(`Stats P1: darts=${st1.totalDarts}, score=${st1.totalScore}, 60+=${st1.ton60}, 100+=${st1.ton100}, 140+=${st1.ton140}, 170+=${st1.ton170}, 180=${st1.oneEighties}`);
  console.log(`Stats P2: darts=${st2.totalDarts}, score=${st2.totalScore}, 60+=${st2.ton60}, 100+=${st2.ton100}, 140+=${st2.ton140}, 170+=${st2.ton170}, 180=${st2.oneEighties}`);

  const avg1 = st1.totalDarts > 0 ? Math.round((st1.totalScore / st1.totalDarts) * 3 * 100) / 100 : null;
  const avg2 = st2.totalDarts > 0 ? Math.round((st2.totalScore / st2.totalDarts) * 3 * 100) / 100 : null;
  const f9a1 = st1.first9Darts > 0 ? Math.round((st1.first9Score / st1.first9Darts) * 3 * 100) / 100 : null;
  const f9a2 = st2.first9Darts > 0 ? Math.round((st2.first9Score / st2.first9Darts) * 3 * 100) / 100 : null;
  const a170_1 = st1.until170Darts > 0 ? Math.round((st1.until170Score / st1.until170Darts) * 3 * 100) / 100 : null;
  const a170_2 = st2.until170Darts > 0 ? Math.round((st2.until170Score / st2.until170Darts) * 3 * 100) / 100 : null;

  // Map to DB column names
  const result = {
    score1: st1.legsWon,
    score2: st2.legsWon,
    avg1, avg2,
    first_9_avg1: f9a1, first_9_avg2: f9a2,
    avg_until_170_1: a170_1, avg_until_170_2: a170_2,
    one_eighties1: st1.oneEighties, one_eighties2: st2.oneEighties,
    high_checkout1: st1.highCheckout, high_checkout2: st2.highCheckout,
    ton60_1: st1.ton60, ton60_2: st2.ton60,
    ton80_1: st1.ton100, ton80_2: st2.ton100,    // 100+ → ton80 column
    ton_plus1: st1.ton140, ton_plus2: st2.ton140, // 140+ → ton_plus column
    ton40_1: st1.ton170, ton40_2: st2.ton170,     // 170+ → ton40 column
    darts_thrown1: st1.totalDarts, darts_thrown2: st2.totalDarts,
    checkout_attempts1: st1.checkoutAttempts, checkout_attempts2: st2.checkoutAttempts,
    checkout_hits1: st1.checkoutHits, checkout_hits2: st2.checkoutHits,
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
