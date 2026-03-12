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

// Check if a remaining score can be finished with exactly one double dart (PDC "darts at double")
// Valid doubles: D1-D20 (2,4,6,...,40) and Bull (50)
function isDartAtDouble(remaining: number): boolean {
  if (remaining === 50) return true; // Bull
  if (remaining >= 2 && remaining <= 40 && remaining % 2 === 0) return true;
  return false;
}

function getDartPoints(dart: any): number {
  const seg = dart?.segment || dart || {};
  const bed = String(seg.bed ?? "").toLowerCase();
  const name = String(seg.name ?? "").toLowerCase();

  // Autodarts can encode miss as "miss", "miss20", etc.
  if (bed.includes("miss") || name.includes("miss")) return 0;

  const number = Number(seg.number ?? seg.value ?? 0);
  const multiplier = Number(seg.multiplier ?? 1);
  if (!Number.isFinite(number) || !Number.isFinite(multiplier)) return 0;
  return number * multiplier;
}

async function loginToAutodarts(): Promise<string | null> {
  const email = Deno.env.get("AUTODARTS_EMAIL");
  const password = Deno.env.get("AUTODARTS_PASSWORD");
  const configuredClientId = Deno.env.get("AUTODARTS_CLIENT_ID")?.trim();
  const clientSecret = Deno.env.get("AUTODARTS_CLIENT_SECRET")?.trim();

  if (!email || !password) return null;

  const tokenUrl = "https://login.autodarts.io/realms/autodarts/protocol/openid-connect/token";
  const candidateClientIds = configuredClientId
    ? [configuredClientId]
    : ["autodarts-desktop", "autodarts-app"];

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
        if (data.access_token) return data.access_token;
      } else {
        await res.text();
      }
    } catch { /* continue */ }
  }
  return null;
}

// Build a map: playerId string -> player index (0 or 1)
function buildPlayerIdMap(players: any[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (let i = 0; i < Math.min(players.length, 2); i++) {
    const p = players[i];
    const ids = [p.userId, p.id, p.playerId, p.hostId, p?.user?.id];
    for (const id of ids) {
      if (typeof id === "string" && id.length > 0) map[id] = i;
    }
  }
  return map;
}

function resolvePlayerIndex(turn: any, idMap: Record<string, number>): number | null {
  // Try playerId field (UUID string)
  const candidates = [turn.playerId, turn.player?.id, turn.player?.userId, turn.userId];
  for (const cid of candidates) {
    if (typeof cid === "string" && cid in idMap) return idMap[cid];
  }
  // Try numeric turn field (Autodarts uses turn: 0 or 1)
  if (typeof turn.turn === "number" && (turn.turn === 0 || turn.turn === 1)) return turn.turn;
  return null;
}

function processGameTurns(
  game: any,
  matchIdMap: Record<string, number>,
  s: [PlayerStats, PlayerStats],
  gameIndex: number,
) {
  const turns = game.turns || game.visits || game.rounds || [];
  if (turns.length === 0) return;

  // Merge match + game-level player IDs
  const idMap: Record<string, number> = { ...matchIdMap };
  if (Array.isArray(game.players)) {
    for (const gp of game.players) {
      const idx = gp?.index ?? gp?.playerIndex;
      const norm = idx === 0 || idx === 1 ? idx : null;
      if (norm == null) continue;
      for (const id of [gp?.id, gp?.playerId, gp?.userId, gp?.hostId]) {
        if (typeof id === "string" && id) idMap[id] = norm;
      }
    }
  }

  // Resolve player indices
  const indices: number[] = [];
  let resolved = 0;
  for (const turn of turns) {
    const idx = resolvePlayerIndex(turn, idMap);
    indices.push(idx ?? -1);
    if (idx === 0 || idx === 1) resolved++;
  }

  // Fallback: alternating pattern if mapping failed
  if (resolved < turns.length / 2) {
    const startingPlayer = gameIndex % 2;
    for (let i = 0; i < indices.length; i++) {
      indices[i] = (i + startingPlayer) % 2;
    }
  }

  if (gameIndex === 0) {
    console.log(`[DEBUG] Game 0: ${turns.length} turns, resolved ${resolved}, indices[0..5]:`, indices.slice(0, 6));
  }

  const turnCount = [0, 0];

  for (let i = 0; i < turns.length; i++) {
    const turn = turns[i];
    const pIdx = indices[i] === 0 || indices[i] === 1 ? indices[i] : i % 2;
    const st = s[pIdx];
    const tidx = turnCount[pIdx]++;

    const dartsArr = Array.isArray(turn.throws) ? turn.throws : Array.isArray(turn.darts) ? turn.darts : null;

    let points = 0;
    if (typeof turn.points === "number") {
      points = turn.points;
    } else if (dartsArr) {
      for (const d of dartsArr) {
        points += getDartPoints(d);
      }
    }

    const recordedDartsCount = dartsArr ? dartsArr.length : 0;
    const declaredDartsCount =
      typeof turn.dartsThrown === "number"
        ? turn.dartsThrown
        : typeof turn.darts === "number"
          ? turn.darts
          : recordedDartsCount;

    let dartsCount = Math.max(recordedDartsCount, declaredDartsCount, 0);
    if (!dartsArr && dartsCount === 0) dartsCount = 3;

    // scoreBeforeTurn: remaining score BEFORE this visit
    // In Autodarts API, turn.score = remaining AFTER the visit
    let scoreBeforeTurn: number | null = null;
    if (typeof turn.score === "number") {
      scoreBeforeTurn = turn.score + points;
    }

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

    // Ton ranges
    if (points === 180) st.oneEighties++;
    else if (points >= 170) st.ton170++;
    else if (points >= 140) st.ton140++;
    else if (points >= 100) st.ton100++;
    else if (points >= 60) st.ton60++;

    // Checkout detection — PDC style: "darts at double"
    // A checkout attempt = a dart thrown when the remaining score BEFORE that dart
    // is a valid one-double finish (even 2-40, or bull 50).
    // This counts 1st, 2nd, AND 3rd darts in a visit if remaining at that moment is a double.
    // Busts also count — if player has 40 and throws 60 (bust), the dart AT 40 is still an attempt.
    if (dartsArr && scoreBeforeTurn != null) {
      let runningRemaining = scoreBeforeTurn;

      for (const d of dartsArr) {
        const dartValue = getDartPoints(d);

        // PDC rule: count as checkout attempt only when remaining is directly on a double
        if (isDartAtDouble(runningRemaining)) {
          st.checkoutAttempts++;
        }

        runningRemaining -= dartValue;
        // Bust (negative) or checkout (zero) — stop counting
        if (runningRemaining <= 0) break;
      }

      // Handle missing trailing darts (API declares more than provided)
      const missingDarts = Math.max(0, dartsCount - dartsArr.length);
      for (let md = 0; md < missingDarts; md++) {
        if (isDartAtDouble(runningRemaining)) {
          st.checkoutAttempts++;
        }
      }
    } else if (!dartsArr && scoreBeforeTurn != null) {
      // No per-dart detail: only count if starting score is directly on a double
      if (isDartAtDouble(scoreBeforeTurn)) {
        st.checkoutAttempts += dartsCount;
      }
    }

    // Checkout hit detection
    const remainingAfter = typeof turn.score === "number" ? turn.score : null;
    const isBusted = turn.busted === true;
    const isCheckout = !isBusted && (remainingAfter === 0 || turn.isCheckout === true);

    if (isCheckout && points > 0) {
      st.checkoutHits++;
      if (points > st.highCheckout) st.highCheckout = points;
    }
  }
}

async function fetchMatchData(matchId: string, token: string) {
  const match = await fetchJson(`${API_BASE}/as/v0/matches/${matchId}`, token);

  const players = match.players || [];
  if (players.length < 2) throw new Error("Match does not have 2 players");

  console.log("Players:", players.map((p: any) => ({ name: p.name, id: p.id, userId: p.userId })));

  const p1Name = players[0].name || "Player 1";
  const p2Name = players[1].name || "Player 2";
  const p1AutoId = players[0].userId || players[0].id || null;
  const p2AutoId = players[1].userId || players[1].id || null;

  const playerIdMap = buildPlayerIdMap(players);

  // Extract legs won from scores
  let legsWon1 = 0, legsWon2 = 0;
  console.log("match.scores:", JSON.stringify(match.scores));
  console.log("match.winner:", match.winner, "match.state:", match.state);
  if (Array.isArray(match.scores) && match.scores.length >= 2) {
    const s1 = match.scores[0], s2 = match.scores[1];
    if (typeof s1 === "object" && s1 !== null) {
      legsWon1 = s1.legs ?? s1.sets ?? s1.value ?? 0;
      legsWon2 = s2?.legs ?? s2?.sets ?? s2?.value ?? 0;
    } else {
      legsWon1 = Number(s1) || 0;
      legsWon2 = Number(s2) || 0;
    }
  }

  const st: [PlayerStats, PlayerStats] = [emptyStats(), emptyStats()];

  // Process embedded games (legs)
  const games = Array.isArray(match.games) ? match.games.filter((g: any) => g && typeof g === "object") : [];
  console.log("Games count:", games.length);

  for (let gi = 0; gi < games.length; gi++) {
    processGameTurns(games[gi], playerIdMap, st, gi);
  }

  // Fallback: count legs won from game winners if match.scores didn't provide them
  if (legsWon1 === 0 && legsWon2 === 0 && games.length > 0) {
    for (const game of games) {
      // Check game.winner (index 0 or 1)
      if (typeof game.winner === "number" && (game.winner === 0 || game.winner === 1)) {
        if (game.winner === 0) legsWon1++;
        else legsWon2++;
        continue;
      }
      // Fallback: check who had a checkout in this leg (remaining=0 in last turn)
      const turns = game.turns || game.visits || game.rounds || [];
      for (let t = turns.length - 1; t >= 0; t--) {
        const turn = turns[t];
        if (turn.score === 0 && !turn.busted) {
          const pIdx = resolvePlayerIndex(turn, playerIdMap);
          if (pIdx === 0) legsWon1++;
          else if (pIdx === 1) legsWon2++;
          else {
            // Fallback alternating
            if (t % 2 === 0) legsWon1++;
            else legsWon2++;
          }
          break;
        }
      }
    }
    console.log("Legs won from games fallback:", legsWon1, "-", legsWon2);
  }

  // Also try match.variant?.legs or similar
  if (legsWon1 === 0 && legsWon2 === 0) {
    // If single game/leg and someone checked out, use checkoutHits
    if (games.length === 1) {
      if (st[0].checkoutHits > 0 && st[1].checkoutHits === 0) { legsWon1 = 1; legsWon2 = 0; }
      else if (st[1].checkoutHits > 0 && st[0].checkoutHits === 0) { legsWon1 = 0; legsWon2 = 1; }
    }
  }

  st[0].legsWon = legsWon1;
  st[1].legsWon = legsWon2;
  console.log("Final scores:", legsWon1, "-", legsWon2);

  const numOrNull = (...values: any[]): number | null => {
    for (const v of values) {
      if (typeof v === "number" && Number.isFinite(v)) return v;
    }
    return null;
  };

  const p1ApiStats = players[0]?.stats || {};
  const p2ApiStats = players[1]?.stats || {};

  const checkoutAttempts1 = numOrNull(p1ApiStats.checkoutAttempts, p1ApiStats.checkoutDarts) ?? st[0].checkoutAttempts;
  const checkoutAttempts2 = numOrNull(p2ApiStats.checkoutAttempts, p2ApiStats.checkoutDarts) ?? st[1].checkoutAttempts;
  const checkoutHits1 = numOrNull(p1ApiStats.checkoutHits, p1ApiStats.checkouts) ?? st[0].checkoutHits;
  const checkoutHits2 = numOrNull(p2ApiStats.checkoutHits, p2ApiStats.checkouts) ?? st[1].checkoutHits;

  // Log stats for debugging
  for (let i = 0; i < 2; i++) {
    const api = i === 0 ? p1ApiStats : p2ApiStats;
    const effectiveAttempts = i === 0 ? checkoutAttempts1 : checkoutAttempts2;
    const effectiveHits = i === 0 ? checkoutHits1 : checkoutHits2;
    console.log(`P${i + 1} (${i === 0 ? p1Name : p2Name}): darts=${st[i].totalDarts}, score=${st[i].totalScore}, co=${effectiveHits}/${effectiveAttempts}, co_calc=${st[i].checkoutHits}/${st[i].checkoutAttempts}, co_api=${api?.checkoutHits ?? api?.checkouts ?? "-"}/${api?.checkoutAttempts ?? api?.checkoutDarts ?? "-"}, hc=${st[i].highCheckout}, 60+=${st[i].ton60}, 100+=${st[i].ton100}, 140+=${st[i].ton140}, 180=${st[i].oneEighties}`);
  }

  const avg = (s: PlayerStats) => s.totalDarts > 0 ? Math.round((s.totalScore / s.totalDarts) * 3 * 100) / 100 : null;
  const f9 = (s: PlayerStats) => s.first9Darts > 0 ? Math.round((s.first9Score / s.first9Darts) * 3 * 100) / 100 : null;
  const a170 = (s: PlayerStats) => s.until170Darts > 0 ? Math.round((s.until170Score / s.until170Darts) * 3 * 100) / 100 : null;

  return {
    score1: st[0].legsWon, score2: st[1].legsWon,
    avg1: avg(st[0]), avg2: avg(st[1]),
    first_9_avg1: f9(st[0]), first_9_avg2: f9(st[1]),
    avg_until_170_1: a170(st[0]), avg_until_170_2: a170(st[1]),
    one_eighties1: st[0].oneEighties, one_eighties2: st[1].oneEighties,
    high_checkout1: st[0].highCheckout, high_checkout2: st[1].highCheckout,
    ton60_1: st[0].ton60, ton60_2: st[1].ton60,
    ton80_1: st[0].ton100, ton80_2: st[1].ton100,
    ton_plus1: st[0].ton140, ton_plus2: st[1].ton140,
    ton40_1: st[0].ton170, ton40_2: st[1].ton170,
    darts_thrown1: st[0].totalDarts, darts_thrown2: st[1].totalDarts,
    checkout_attempts1: checkoutAttempts1, checkout_attempts2: checkoutAttempts2,
    checkout_hits1: checkoutHits1, checkout_hits2: checkoutHits2,
    player1_name: p1Name, player2_name: p2Name,
    player1_autodarts_id: p1AutoId, player2_autodarts_id: p2AutoId,
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

    const matchId = extractMatchId(input);

    let adToken = autodarts_token || null;

    if (adToken) {
      try {
        const testRes = await fetch(`${API_BASE}/as/v0/matches/${matchId}`, {
          headers: { Authorization: `Bearer ${adToken}` },
        });
        if (testRes.status === 401) adToken = null;
        else await testRes.text();
      } catch { adToken = null; }
    }

    if (!adToken) {
      adToken = await loginToAutodarts();
      if (!adToken) {
        return new Response(JSON.stringify({
          error: "Nie udało się zalogować do Autodarts",
          message: "Token wygasł. Odśwież play.autodarts.io i spróbuj ponownie.",
        }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const stats = await fetchMatchData(matchId, adToken);

    return new Response(JSON.stringify({ success: true, data: stats }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: "Failed to fetch Autodarts data" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
