import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const API_BASE = "https://api.autodarts.io";

// ─── Autodarts login (server-side credentials) ───
async function loginToAutodarts(): Promise<string | null> {
  const email = Deno.env.get("AUTODARTS_EMAIL");
  const password = Deno.env.get("AUTODARTS_PASSWORD");
  if (!email || !password) return null;

  const tokenUrl =
    "https://login.autodarts.io/realms/autodarts/protocol/openid-connect/token";
  for (const clientId of ["autodarts-desktop", "autodarts-app"]) {
    try {
      const res = await fetch(tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "password",
          client_id: clientId,
          username: email,
          password,
          scope: "openid",
        }).toString(),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.access_token) return data.access_token;
      } else {
        await res.text();
      }
    } catch {
      /* continue */
    }
  }
  return null;
}

async function fetchJson(url: string, token: string) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json();
}

// ─── Stat helpers ───
interface PlayerStats {
  totalScore: number; totalDarts: number;
  first9Score: number; first9Darts: number;
  oneEighties: number; highCheckout: number;
  ton60: number; ton100: number; ton140: number; ton170: number;
  checkoutAttempts: number; checkoutHits: number;
  legsWon: number;
  nineDarters: number;
}

function emptyStats(): PlayerStats {
  return {
    totalScore: 0, totalDarts: 0,
    first9Score: 0, first9Darts: 0,
    oneEighties: 0, highCheckout: 0,
    ton60: 0, ton100: 0, ton140: 0, ton170: 0,
    checkoutAttempts: 0, checkoutHits: 0,
    legsWon: 0,
    nineDarters: 0,
  };
}

// PDC/Autodarts "Darts at Double" — only counts when remaining IS a direct double finish
function isDoubleAttempt(remaining: number): boolean {
  if (remaining === 50) return true; // Bull
  if (remaining < 2 || remaining > 40) return false;
  return remaining % 2 === 0; // D1-D20 (2,4,6,...,40)
}

// Legacy: can the score be finished at all (used for other logic, NOT checkout attempts)
function isFinishable(remaining: number): boolean {
  if (remaining <= 0 || remaining > 170) return false;
  const impossible = new Set([169, 168, 166, 165, 163, 162, 159]);
  return !impossible.has(remaining);
}

function getDartPoints(dart: any): number {
  const seg = dart?.segment || dart || {};
  const bed = String(seg.bed ?? "").toLowerCase();
  const name = String(seg.name ?? "").toLowerCase();
  if (bed.includes("miss") || name.includes("miss")) return 0;
  const number = Number(seg.number ?? seg.value ?? 0);
  const multiplier = Number(seg.multiplier ?? 1);
  if (!Number.isFinite(number) || !Number.isFinite(multiplier)) return 0;
  return number * multiplier;
}

function buildPlayerIdMap(players: any[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (let i = 0; i < Math.min(players.length, 2); i++) {
    const p = players[i];
    for (const id of [p.userId, p.id, p.playerId, p.hostId, p?.user?.id]) {
      if (typeof id === "string" && id.length > 0) map[id] = i;
    }
  }
  return map;
}

function resolvePlayerIndex(turn: any, idMap: Record<string, number>): number | null {
  for (const cid of [turn.playerId, turn.player?.id, turn.player?.userId, turn.userId]) {
    if (typeof cid === "string" && cid in idMap) return idMap[cid];
  }
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

  const indices: number[] = [];
  let resolved = 0;
  for (const turn of turns) {
    const idx = resolvePlayerIndex(turn, idMap);
    indices.push(idx ?? -1);
    if (idx === 0 || idx === 1) resolved++;
  }

  if (resolved < turns.length / 2) {
    const startingPlayer = gameIndex % 2;
    for (let i = 0; i < indices.length; i++) {
      indices[i] = (i + startingPlayer) % 2;
    }
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
      for (const d of dartsArr) points += getDartPoints(d);
    }

    const recordedDartsCount = dartsArr ? dartsArr.length : 0;
    const declaredDartsCount =
      typeof turn.dartsThrown === "number" ? turn.dartsThrown
        : typeof turn.darts === "number" ? turn.darts
          : recordedDartsCount;
    let dartsCount = Math.max(recordedDartsCount, declaredDartsCount, 0);
    if (!dartsArr && dartsCount === 0) dartsCount = 3;

    let scoreBeforeTurn: number | null = null;
    if (typeof turn.score === "number") scoreBeforeTurn = turn.score + points;

    st.totalScore += points;
    st.totalDarts += dartsCount;

    if (tidx < 3) {
      st.first9Score += points;
      st.first9Darts += dartsCount;
    }

    if (points === 180) st.oneEighties++;
    else if (points >= 170) st.ton170++;
    else if (points >= 140) st.ton140++;
    else if (points >= 100) st.ton100++;
    else if (points >= 60) st.ton60++;

    // PDC "Darts at Double": only count when remaining is a direct double (even 2-40 or 50)
    if (dartsArr && scoreBeforeTurn != null) {
      let runningRemaining = scoreBeforeTurn;
      for (const d of dartsArr) {
        if (isDoubleAttempt(runningRemaining)) st.checkoutAttempts++;
        const dartPts = getDartPoints(d);
        runningRemaining -= dartPts;
        if (runningRemaining <= 0) break;
      }
      const missingDarts = Math.max(0, dartsCount - dartsArr.length);
      for (let md = 0; md < missingDarts; md++) {
        if (isDoubleAttempt(runningRemaining)) st.checkoutAttempts++;
      }
    } else if (!dartsArr && scoreBeforeTurn != null) {
      // No individual dart data — estimate: count 1 attempt if on a double
      if (isDoubleAttempt(scoreBeforeTurn)) st.checkoutAttempts++;
    }

    const remainingAfter = typeof turn.score === "number" ? turn.score : null;
    const isBusted = turn.busted === true;
    const isCheckout = !isBusted && (remainingAfter === 0 || turn.isCheckout === true);
    if (isCheckout && points > 0) {
      st.checkoutHits++;
      if (points > st.highCheckout) st.highCheckout = points;
      if (st.totalDarts > 0 && dartsCount <= 3) {
        if (turnCount[pIdx] <= 3 && scoreBeforeTurn != null && scoreBeforeTurn <= points && dartsCount <= 3) {
          let legTotalDarts = 0;
          let checkIdx = i;
          let counted = 0;
          while (checkIdx >= 0 && counted < turnCount[pIdx]) {
            const t = turns[checkIdx];
            const tIdx = indices[checkIdx] === 0 || indices[checkIdx] === 1 ? indices[checkIdx] : checkIdx % 2;
            if (tIdx === pIdx) {
              const tDarts = Array.isArray(t.throws) ? t.throws.length : Array.isArray(t.darts) ? t.darts.length : (typeof t.dartsThrown === "number" ? t.dartsThrown : 3);
              legTotalDarts += tDarts;
              counted++;
            }
            checkIdx--;
          }
          if (legTotalDarts === 9) {
            st.nineDarters++;
          }
        }
      }
    }
  }
}

// ─── Main handler ───
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ─── Authentication: JWT preferred, but autodarts_user_id fallback ───
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    let callerUserId: string | null = null;

    // Try JWT auth first
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      // Skip if it's just the anon key
      if (token !== anonKey) {
        try {
          const authClient = createClient(supabaseUrl, anonKey, {
            global: { headers: { Authorization: `Bearer ${token}` } },
          });
          const { data: claimsData } = await authClient.auth.getClaims(token);
          if (claimsData?.claims?.sub) {
            callerUserId = claimsData.claims.sub as string;
            console.log(`[auto-submit] Authenticated user: ${callerUserId}`);
          }
        } catch (e) {
          console.log(`[auto-submit] JWT auth failed (will try autodarts_id fallback): ${e}`);
        }
      }
    }

    const {
      autodarts_match_id,
      autodarts_token,
      player1_name,
      player2_name,
      player1_autodarts_id,
      player2_autodarts_id,
      client_stats,
    } = await req.json();

    console.log(`[auto-submit] Request: match=${autodarts_match_id}, p1=${player1_name} (${player1_autodarts_id}), p2=${player2_name} (${player2_autodarts_id}), hasJwt=${!!callerUserId}`);

    if (!autodarts_match_id && !player1_name) {
      return new Response(
        JSON.stringify({ is_league_match: false, reason: "no data provided" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // ─── Step 1: Find eDART players ───
    async function findPlayer(autodartsId: string | null, name: string | null): Promise<string | null> {
      if (autodartsId) {
        const { data } = await supabase
          .from("players")
          .select("id")
          .eq("autodarts_user_id", autodartsId)
          .limit(1)
          .maybeSingle();
        if (data) return data.id;
      }
      if (name) {
        const { data } = await supabase
          .from("players")
          .select("id")
          .ilike("name", name)
          .limit(1);
        if (data && data.length > 0) return data[0].id;
      }
      return null;
    }

    const p1Id = await findPlayer(player1_autodarts_id, player1_name);
    const p2Id = await findPlayer(player2_autodarts_id, player2_name);

    console.log(`[auto-submit] Player lookup: p1=${p1Id}, p2=${p2Id}`);

    if (!p1Id || !p2Id) {
      return new Response(
        JSON.stringify({
          is_league_match: false,
          submitted: false,
          reason: "players not found in eDART",
          found_p1: !!p1Id,
          found_p2: !!p2Id,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── Check if caller has auto-submit enabled ───
    const callerAutodartsId = player1_autodarts_id || player2_autodarts_id;
    if (callerAutodartsId) {
      const { data: callerPl } = await supabase
        .from("players")
        .select("auto_submit_enabled")
        .eq("autodarts_user_id", callerAutodartsId)
        .maybeSingle();
      if (callerPl && callerPl.auto_submit_enabled === false) {
        console.log(`[auto-submit] Player has auto_submit disabled, skipping`);
        return new Response(
          JSON.stringify({
            is_league_match: true,
            submitted: false,
            reason: "auto-submit disabled by player",
            auto_submit_disabled: true,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ─── Verify caller is a participant (via JWT or autodarts_user_id) ───
    let callerVerified = false;

    if (callerUserId) {
      // JWT path: check user_id matches one of the players
      const { data: callerPlayer } = await supabase
        .from("players")
        .select("id")
        .eq("user_id", callerUserId)
        .maybeSingle();
      callerVerified = !!callerPlayer && (callerPlayer.id === p1Id || callerPlayer.id === p2Id);
      if (!callerVerified) {
        console.log(`[auto-submit] JWT user ${callerUserId} (player=${callerPlayer?.id}) is not participant`);
      }
    }

    if (!callerVerified) {
      // Fallback: verify via autodarts_user_id — at least one must map to a registered player
      const hasValidAutodartsId = (player1_autodarts_id && p1Id) || (player2_autodarts_id && p2Id);
      if (hasValidAutodartsId) {
        callerVerified = true;
        console.log(`[auto-submit] Verified caller via autodarts_user_id mapping`);
      }
    }

    if (!callerVerified) {
      console.log(`[auto-submit] Could not verify caller identity`);
      return new Response(
        JSON.stringify({ error: "Forbidden: could not verify caller identity" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: matches } = await supabase
      .from("matches")
      .select("id, league_id, round, date, confirmed_date, player1_id, player2_id, status, leagues!inner(name)")
      .eq("status", "upcoming")
      .or(
        `and(player1_id.eq.${p1Id},player2_id.eq.${p2Id}),and(player1_id.eq.${p2Id},player2_id.eq.${p1Id})`
      )
      .limit(1);

    if (!matches || matches.length === 0) {
      // Check if match was already submitted (duplicate prevention)
      const { data: existingMatch } = await supabase
        .from("matches")
        .select("id, status, score1, score2, league_id, leagues!inner(name)")
        .in("status", ["pending_approval", "completed"])
        .or(
          `and(player1_id.eq.${p1Id},player2_id.eq.${p2Id}),and(player1_id.eq.${p2Id},player2_id.eq.${p1Id})`
        )
        .order("created_at", { ascending: false })
        .limit(1);

      if (existingMatch && existingMatch.length > 0) {
        const em = existingMatch[0] as any;
        const emLeagueName = em.leagues?.name || "Liga";
        const emScore = `${em.score1 ?? "?"} : ${em.score2 ?? "?"}`;
        const emStatusText = em.status === "completed"
          ? "Wynik zatwierdzony automatycznie!"
          : "Wynik wysłany — oczekuje na zatwierdzenie admina.";
        console.log(`[auto-submit] Match already submitted (${em.status}), skipping duplicate`);
        return new Response(
          JSON.stringify({
            is_league_match: true,
            submitted: false,
            already_submitted: true,
            reason: "match already submitted by the other player",
            match_id: em.id,
            league_name: emLeagueName,
            score: emScore,
            status: em.status,
            status_text: emStatusText,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[auto-submit] No upcoming match found between ${p1Id} and ${p2Id}`);
      return new Response(
        JSON.stringify({
          is_league_match: false,
          submitted: false,
          reason: "no upcoming match between these players",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const edartMatch = matches[0];
    const leagueName = (edartMatch as any).leagues?.name || "Liga";
    console.log(`[auto-submit] Found match: ${edartMatch.id}, league: ${leagueName}`);

    // ─── Step 3: Check if match is scheduled around now ───
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let isScheduledNow = false;
    let scheduleInfo = "";

    if (edartMatch.confirmed_date) {
      const confirmed = new Date(edartMatch.confirmed_date);
      confirmed.setHours(0, 0, 0, 0);
      const diffDays = Math.abs((today.getTime() - confirmed.getTime()) / 86400000);
      isScheduledNow = diffDays <= 1;
      scheduleInfo = `confirmed_date=${edartMatch.confirmed_date}, diff=${diffDays.toFixed(0)}d`;
    } else {
      // No confirmed date — accept if deadline hasn't passed yet
      const deadline = new Date(edartMatch.date);
      deadline.setHours(23, 59, 59, 999);
      isScheduledNow = today.getTime() <= deadline.getTime();
      scheduleInfo = `no confirmed_date, deadline=${edartMatch.date}`;
    }

    console.log(`[auto-submit] Match ${edartMatch.id}: ${scheduleInfo}, isScheduledNow=${isScheduledNow}`);

    if (!isScheduledNow) {
      return new Response(
        JSON.stringify({
          is_league_match: true,
          submitted: false,
          reason: "match not scheduled for today",
          match_id: edartMatch.id,
          league_name: leagueName,
          schedule_info: scheduleInfo,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── Step 4: Fetch full stats from Autodarts API ───
    let statsData: any = null;

    if (autodarts_match_id) {
      let adToken: string | null = null;

      if (autodarts_token) {
        try {
          const testRes = await fetch(`${API_BASE}/as/v0/matches/${autodarts_match_id}`, {
            headers: { Authorization: `Bearer ${autodarts_token}` },
          });
          if (testRes.ok) {
            adToken = autodarts_token;
            console.log("[auto-submit] Using player's autodarts token");
          } else {
            const errText = await testRes.text();
            console.log(`[auto-submit] Player token failed (${testRes.status}): ${errText.substring(0, 100)}`);
          }
        } catch (e) {
          console.log(`[auto-submit] Player token error: ${e}`);
        }
      }

      if (!adToken) {
        adToken = await loginToAutodarts();
        if (adToken) console.log("[auto-submit] Using server autodarts credentials");
        else console.log("[auto-submit] Server autodarts login failed");
      }

      if (adToken) {
        try {
          const adMatch = await fetchJson(
            `${API_BASE}/as/v0/matches/${autodarts_match_id}`,
            adToken
          );

          const players = adMatch.players || [];
          console.log(`[auto-submit] Match state: ${adMatch.state}, players: ${players.length}, games: ${Array.isArray(adMatch.games) ? adMatch.games.length : 0}`);

          if (players.length >= 2) {
            const playerIdMap = buildPlayerIdMap(players);

            let legsWon1 = 0, legsWon2 = 0;
            if (Array.isArray(adMatch.scores) && adMatch.scores.length >= 2) {
              const s1 = adMatch.scores[0], s2 = adMatch.scores[1];
              if (typeof s1 === "object" && s1 !== null) {
                legsWon1 = s1.legs ?? s1.sets ?? 0;
                legsWon2 = s2?.legs ?? s2?.sets ?? 0;
              } else {
                legsWon1 = Number(s1) || 0;
                legsWon2 = Number(s2) || 0;
              }
            }

            const st: [PlayerStats, PlayerStats] = [emptyStats(), emptyStats()];
            st[0].legsWon = legsWon1;
            st[1].legsWon = legsWon2;

            const games = Array.isArray(adMatch.games) ? adMatch.games.filter((g: any) => g) : [];
            console.log(`[auto-submit] Processing ${games.length} games for turn-by-turn stats`);
            for (let gi = 0; gi < games.length; gi++) {
              processGameTurns(games[gi], playerIdMap, st, gi);
            }

            const numOrNull = (...values: any[]): number | null => {
              for (const v of values) {
                if (typeof v === "number" && Number.isFinite(v)) return v;
              }
              return null;
            };

            const p1ApiStats = players[0]?.stats || {};
            const p2ApiStats = players[1]?.stats || {};

            console.log(`[auto-submit] Turn-based: P1 darts=${st[0].totalDarts} score=${st[0].totalScore}, P2 darts=${st[1].totalDarts} score=${st[1].totalScore}`);

            const avgFromTurns = (s: PlayerStats) => s.totalDarts > 0 ? Math.round((s.totalScore / s.totalDarts) * 3 * 100) / 100 : null;
            const f9FromTurns = (s: PlayerStats) => s.first9Darts > 0 ? Math.round((s.first9Score / s.first9Darts) * 3 * 100) / 100 : null;

            const apiAvg = (apiSt: any): number | null => {
              if (typeof apiSt.average === "number") return Math.round(apiSt.average * 100) / 100;
              if (typeof apiSt.avg === "number") return Math.round(apiSt.avg * 100) / 100;
              if (typeof apiSt.ppd === "number") return Math.round(apiSt.ppd * 3 * 100) / 100;
              return null;
            };

            const apiFirst9 = (apiSt: any): number | null => {
              return numOrNull(apiSt.first9Average, apiSt.firstNineAvg, apiSt.first9Avg, apiSt.first9avg);
            };

            const adP1AutoId = players[0].userId || players[0].id || null;

            let swapped = false;
            const edartP1Id = edartMatch.player1_id;

            if (adP1AutoId) {
              const { data: adP1Db } = await supabase
                .from("players")
                .select("id")
                .eq("autodarts_user_id", adP1AutoId)
                .maybeSingle();
              if (adP1Db) {
                swapped = adP1Db.id !== edartP1Id;
              }
            } else {
              const { data: adP1Db } = await supabase
                .from("players")
                .select("id")
                .ilike("name", players[0].name || "___NONE___")
                .maybeSingle();
              if (adP1Db) {
                swapped = adP1Db.id !== edartP1Id;
              }
            }

            const i1 = swapped ? 1 : 0;
            const i2 = swapped ? 0 : 1;
            const api1 = swapped ? p2ApiStats : p1ApiStats;
            const api2 = swapped ? p1ApiStats : p2ApiStats;

            const hasTurnData = st[0].totalDarts > 0 || st[1].totalDarts > 0;
            console.log(`[auto-submit] hasTurnData=${hasTurnData}, swapped=${swapped}`);

            statsData = {
              score1: st[i1].legsWon,
              score2: st[i2].legsWon,
              avg1: avgFromTurns(st[i1]) ?? apiAvg(api1),
              avg2: avgFromTurns(st[i2]) ?? apiAvg(api2),
              first_9_avg1: f9FromTurns(st[i1]) ?? apiFirst9(api1),
              first_9_avg2: f9FromTurns(st[i2]) ?? apiFirst9(api2),
              avg_until_170_1: a170FromTurns(st[i1]),
              avg_until_170_2: a170FromTurns(st[i2]),
              one_eighties1: hasTurnData ? st[i1].oneEighties : (numOrNull(api1.oneEighties, api1["180s"]) ?? 0),
              one_eighties2: hasTurnData ? st[i2].oneEighties : (numOrNull(api2.oneEighties, api2["180s"]) ?? 0),
              high_checkout1: hasTurnData ? st[i1].highCheckout : (numOrNull(api1.highestCheckout, api1.bestCheckout) ?? 0),
              high_checkout2: hasTurnData ? st[i2].highCheckout : (numOrNull(api2.highestCheckout, api2.bestCheckout) ?? 0),
              ton60_1: hasTurnData ? st[i1].ton60 : (numOrNull(api1["60+"], api1.ton60) ?? 0),
              ton60_2: hasTurnData ? st[i2].ton60 : (numOrNull(api2["60+"], api2.ton60) ?? 0),
              ton80_1: hasTurnData ? st[i1].ton100 : (numOrNull(api1["100+"], api1.ton100) ?? 0),
              ton80_2: hasTurnData ? st[i2].ton100 : (numOrNull(api2["100+"], api2.ton100) ?? 0),
              ton_plus1: hasTurnData ? st[i1].ton140 : (numOrNull(api1["140+"], api1.ton140) ?? 0),
              ton_plus2: hasTurnData ? st[i2].ton140 : (numOrNull(api2["140+"], api2.ton140) ?? 0),
              ton40_1: hasTurnData ? st[i1].ton170 : (numOrNull(api1["170+"], api1.ton170) ?? 0),
              ton40_2: hasTurnData ? st[i2].ton170 : (numOrNull(api2["170+"], api2.ton170) ?? 0),
              darts_thrown1: hasTurnData ? st[i1].totalDarts : (numOrNull(api1.dartsThrown, api1.darts) ?? 0),
              darts_thrown2: hasTurnData ? st[i2].totalDarts : (numOrNull(api2.dartsThrown, api2.darts) ?? 0),
              checkout_attempts1: numOrNull(api1.checkoutAttempts, api1.checkoutDarts) ?? st[i1].checkoutAttempts,
              checkout_attempts2: numOrNull(api2.checkoutAttempts, api2.checkoutDarts) ?? st[i2].checkoutAttempts,
              checkout_hits1: numOrNull(api1.checkoutHits, api1.checkouts) ?? st[i1].checkoutHits,
              checkout_hits2: numOrNull(api2.checkoutHits, api2.checkouts) ?? st[i2].checkoutHits,
              autodarts_link: `https://play.autodarts.io/history/matches/${autodarts_match_id}`,
              nine_darters1: st[i1].nineDarters,
              nine_darters2: st[i2].nineDarters,
            };

            console.log(`[auto-submit] Stats computed. Score: ${statsData.score1}-${statsData.score2}, avg1=${statsData.avg1}, avg2=${statsData.avg2}`);
          }
        } catch (err) {
          console.error("[auto-submit] Autodarts fetch error:", err);
        }
      }
    }

    // Fallback to client-captured stats if API fetch failed
    if (!statsData && client_stats) {
      console.log("[auto-submit] Using client-captured stats as fallback");
      
      let cSwapped = false;
      if (player1_autodarts_id) {
        const { data: cp1 } = await supabase.from("players").select("id").eq("autodarts_user_id", player1_autodarts_id).maybeSingle();
        if (cp1) cSwapped = cp1.id !== edartMatch.player1_id;
      } else if (player1_name) {
        const { data: cp1 } = await supabase.from("players").select("id").ilike("name", player1_name).maybeSingle();
        if (cp1) cSwapped = cp1.id !== edartMatch.player1_id;
      }

      const cs = client_stats;
      if (cSwapped) {
        statsData = {
          score1: cs.score2 ?? 0, score2: cs.score1 ?? 0,
          avg1: cs.avg2, avg2: cs.avg1,
          first_9_avg1: cs.first_9_avg2, first_9_avg2: cs.first_9_avg1,
          one_eighties1: cs.one_eighties2 ?? 0, one_eighties2: cs.one_eighties1 ?? 0,
          high_checkout1: cs.high_checkout2 ?? 0, high_checkout2: cs.high_checkout1 ?? 0,
          ton60_1: cs.ton60_2 ?? 0, ton60_2: cs.ton60_1 ?? 0,
          ton80_1: cs.ton80_2 ?? 0, ton80_2: cs.ton80_1 ?? 0,
          ton_plus1: cs.ton_plus2 ?? 0, ton_plus2: cs.ton_plus1 ?? 0,
          ton40_1: 0, ton40_2: 0,
          darts_thrown1: cs.darts_thrown2 ?? 0, darts_thrown2: cs.darts_thrown1 ?? 0,
          checkout_attempts1: cs.checkout_attempts2 ?? 0, checkout_attempts2: cs.checkout_attempts1 ?? 0,
          checkout_hits1: cs.checkout_hits2 ?? 0, checkout_hits2: cs.checkout_hits1 ?? 0,
          autodarts_link: `https://play.autodarts.io/history/matches/${autodarts_match_id}`,
          nine_darters1: 0, nine_darters2: 0,
        };
      } else {
        statsData = {
          score1: cs.score1 ?? 0, score2: cs.score2 ?? 0,
          avg1: cs.avg1, avg2: cs.avg2,
          first_9_avg1: cs.first_9_avg1, first_9_avg2: cs.first_9_avg2,
          one_eighties1: cs.one_eighties1 ?? 0, one_eighties2: cs.one_eighties2 ?? 0,
          high_checkout1: cs.high_checkout1 ?? 0, high_checkout2: cs.high_checkout2 ?? 0,
          ton60_1: cs.ton60_1 ?? 0, ton60_2: cs.ton60_2 ?? 0,
          ton80_1: cs.ton80_1 ?? 0, ton80_2: cs.ton80_2 ?? 0,
          ton_plus1: cs.ton_plus1 ?? 0, ton_plus2: cs.ton_plus2 ?? 0,
          ton40_1: 0, ton40_2: 0,
          darts_thrown1: cs.darts_thrown1 ?? 0, darts_thrown2: cs.darts_thrown2 ?? 0,
          checkout_attempts1: cs.checkout_attempts1 ?? 0, checkout_attempts2: cs.checkout_attempts2 ?? 0,
          checkout_hits1: cs.checkout_hits1 ?? 0, checkout_hits2: cs.checkout_hits2 ?? 0,
          autodarts_link: `https://play.autodarts.io/history/matches/${autodarts_match_id}`,
          nine_darters1: 0, nine_darters2: 0,
        };
      }
      console.log(`[auto-submit] Client fallback stats: score=${statsData.score1}-${statsData.score2}, swapped=${cSwapped}`);
    }

    if (!statsData) {
      return new Response(
        JSON.stringify({
          is_league_match: true,
          submitted: false,
          reason: "could not fetch stats from Autodarts",
          match_id: edartMatch.id,
          league_name: leagueName,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── Step 5: Check auto_approve setting ───
    const { data: extSettings } = await supabase
      .from("extension_settings")
      .select("auto_approve")
      .eq("league_id", edartMatch.league_id)
      .maybeSingle();

    const autoApprove = extSettings?.auto_approve === true;
    const newStatus = autoApprove ? "completed" : "pending_approval";

    // ─── Step 6: Submit results to match ───
    const { error: updateError } = await supabase
      .from("matches")
      .update({
        score1: statsData.score1,
        score2: statsData.score2,
        legs_won1: statsData.score1,
        legs_won2: statsData.score2,
        status: newStatus,
        is_walkover: false,
        avg1: statsData.avg1,
        avg2: statsData.avg2,
        first_9_avg1: statsData.first_9_avg1,
        first_9_avg2: statsData.first_9_avg2,
        avg_until_170_1: statsData.avg_until_170_1,
        avg_until_170_2: statsData.avg_until_170_2,
        one_eighties1: statsData.one_eighties1,
        one_eighties2: statsData.one_eighties2,
        high_checkout1: statsData.high_checkout1,
        high_checkout2: statsData.high_checkout2,
        ton60_1: statsData.ton60_1,
        ton60_2: statsData.ton60_2,
        ton80_1: statsData.ton80_1,
        ton80_2: statsData.ton80_2,
        ton_plus1: statsData.ton_plus1,
        ton_plus2: statsData.ton_plus2,
        ton40_1: statsData.ton40_1,
        ton40_2: statsData.ton40_2,
        darts_thrown1: statsData.darts_thrown1,
        darts_thrown2: statsData.darts_thrown2,
        checkout_attempts1: statsData.checkout_attempts1,
        checkout_attempts2: statsData.checkout_attempts2,
        checkout_hits1: statsData.checkout_hits1,
        checkout_hits2: statsData.checkout_hits2,
        autodarts_link: statsData.autodarts_link,
        nine_darters1: statsData.nine_darters1,
        nine_darters2: statsData.nine_darters2,
      })
      .eq("id", edartMatch.id);

    if (updateError) {
      console.error("[auto-submit] DB update error:", updateError);
      return new Response(
        JSON.stringify({
          is_league_match: true,
          submitted: false,
          reason: "database update failed",
          error: updateError.message,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Clean up live match entry
    if (autodarts_match_id) {
      await supabase.from("live_matches").delete().eq("autodarts_match_id", autodarts_match_id);
    }

    console.log(`[auto-submit] ✅ Match ${edartMatch.id} submitted as ${newStatus}. Score: ${statsData.score1}-${statsData.score2}`);

    return new Response(
      JSON.stringify({
        is_league_match: true,
        submitted: true,
        match_id: edartMatch.id,
        league_name: leagueName,
        status: newStatus,
        score: `${statsData.score1} : ${statsData.score2}`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[auto-submit] Error:", err);
    return new Response(
      JSON.stringify({ is_league_match: false, submitted: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
