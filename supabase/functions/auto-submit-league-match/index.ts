import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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

// ─── Stat helpers (same as fetch-autodarts-match) ───
interface PlayerStats {
  totalScore: number; totalDarts: number;
  first9Score: number; first9Darts: number;
  until170Score: number; until170Darts: number;
  oneEighties: number; highCheckout: number;
  ton60: number; ton100: number; ton140: number; ton170: number;
  checkoutAttempts: number; checkoutHits: number;
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

function isFinishableWithOneDouble(remaining: number): boolean {
  if (remaining === 50) return true;
  return remaining >= 2 && remaining <= 40 && remaining % 2 === 0;
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

    if (scoreBeforeTurn != null && scoreBeforeTurn > 170) {
      st.until170Score += points;
      st.until170Darts += dartsCount;
    }

    if (tidx < 3) {
      st.first9Score += points;
      st.first9Darts += dartsCount;
    }

    if (points === 180) st.oneEighties++;
    else if (points >= 170) st.ton170++;
    else if (points >= 140) st.ton140++;
    else if (points >= 100) st.ton100++;
    else if (points >= 60) st.ton60++;

    if (dartsArr && scoreBeforeTurn != null) {
      let runningRemaining = scoreBeforeTurn;
      for (const d of dartsArr) {
        if (isFinishableWithOneDouble(runningRemaining)) st.checkoutAttempts++;
        runningRemaining -= getDartPoints(d);
        if (runningRemaining <= 0) break;
      }
      const missingDarts = Math.max(0, dartsCount - dartsArr.length);
      for (let md = 0; md < missingDarts; md++) {
        if (isFinishableWithOneDouble(runningRemaining)) st.checkoutAttempts++;
      }
    } else if (!dartsArr && scoreBeforeTurn != null) {
      if (isFinishableWithOneDouble(scoreBeforeTurn)) st.checkoutAttempts += dartsCount;
    }

    const remainingAfter = typeof turn.score === "number" ? turn.score : null;
    const isBusted = turn.busted === true;
    const isCheckout = !isBusted && (remainingAfter === 0 || turn.isCheckout === true);
    if (isCheckout && points > 0) {
      st.checkoutHits++;
      if (points > st.highCheckout) st.highCheckout = points;
    }
  }
}

// ─── Main handler ───
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ─── JWT Authentication ───
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const callerUserId = claimsData.claims.sub as string;

    const {
      autodarts_match_id,
      autodarts_token,
      player1_name,
      player2_name,
      player1_autodarts_id,
      player2_autodarts_id,
    } = await req.json();

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
          .maybeSingle();
        if (data) return data.id;
      }
      if (name) {
        const { data } = await supabase
          .from("players")
          .select("id")
          .ilike("name", name)
          .maybeSingle();
        if (data) return data.id;
      }
      return null;
    }

    const p1Id = await findPlayer(player1_autodarts_id, player1_name);
    const p2Id = await findPlayer(player2_autodarts_id, player2_name);

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

    // ─── Verify caller is one of the match participants ───
    const { data: callerPlayer } = await supabase
      .from("players")
      .select("id")
      .eq("user_id", callerUserId)
      .maybeSingle();

    if (!callerPlayer || (callerPlayer.id !== p1Id && callerPlayer.id !== p2Id)) {
      return new Response(
        JSON.stringify({ error: "Forbidden: you are not a participant of this match" }),
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

    // ─── Step 3: Check if match is scheduled around now ───
    // Accept if: confirmed_date is today/yesterday/tomorrow, OR if no confirmed_date but deadline hasn't passed
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().slice(0, 10);

    let isScheduledNow = false;
    let scheduleInfo = "";

    if (edartMatch.confirmed_date) {
      const confirmed = new Date(edartMatch.confirmed_date);
      confirmed.setHours(0, 0, 0, 0);
      const diffDays = Math.abs((today.getTime() - confirmed.getTime()) / 86400000);
      // Accept within 1 day of confirmed date
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
    // Try player's token first, then server credentials as fallback
    let statsData: any = null;

    if (autodarts_match_id) {
      let adToken: string | null = null;

      // Try player's autodarts token first
      if (autodarts_token) {
        try {
          const testRes = await fetch(`${API_BASE}/as/v0/matches/${autodarts_match_id}`, {
            headers: { Authorization: `Bearer ${autodarts_token}` },
          });
          if (testRes.ok) {
            adToken = autodarts_token;
            console.log("[auto-submit] Using player's autodarts token");
          } else {
            await testRes.text();
          }
        } catch { /* fallback */ }
      }

      // Fallback to server credentials
      if (!adToken) {
        adToken = await loginToAutodarts();
        if (adToken) console.log("[auto-submit] Using server autodarts credentials");
      }

      if (adToken) {
        try {
          const adMatch = await fetchJson(
            `${API_BASE}/as/v0/matches/${autodarts_match_id}`,
            adToken
          );

          const players = adMatch.players || [];
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

            const avg = (s: PlayerStats) => s.totalDarts > 0 ? Math.round((s.totalScore / s.totalDarts) * 3 * 100) / 100 : null;
            const f9 = (s: PlayerStats) => s.first9Darts > 0 ? Math.round((s.first9Score / s.first9Darts) * 3 * 100) / 100 : null;
            const a170 = (s: PlayerStats) => s.until170Darts > 0 ? Math.round((s.until170Score / s.until170Darts) * 3 * 100) / 100 : null;

            // Determine which Autodarts player maps to which eDART player
            // eDART match has player1_id and player2_id
            // Autodarts players[0] and players[1] — we need to map them correctly
            const adP1AutoId = players[0].userId || players[0].id || null;
            const adP2AutoId = players[1].userId || players[1].id || null;
            const adP1Name = (players[0].name || "").toLowerCase();
            const adP2Name = (players[1].name || "").toLowerCase();

            // Check if Autodarts player order matches eDART player order
            let swapped = false;

            // edartMatch.player1_id = p1Id or p2Id depending on match query
            // We already know p1Id and p2Id from our player search
            // edartMatch.player1_id and player2_id are the eDART match's player order
            // We need to figure out: does Autodarts player[0] = eDART player1 or player2?

            const edartP1Id = edartMatch.player1_id;
            // const edartP2Id = edartMatch.player2_id;

            // Autodarts player[0] corresponds to p1Id or p2Id?
            // Check by autodarts_user_id first
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
              // Fallback: by name
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

            statsData = {
              score1: st[i1].legsWon,
              score2: st[i2].legsWon,
              avg1: avg(st[i1]),
              avg2: avg(st[i2]),
              first_9_avg1: f9(st[i1]),
              first_9_avg2: f9(st[i2]),
              avg_until_170_1: a170(st[i1]),
              avg_until_170_2: a170(st[i2]),
              one_eighties1: st[i1].oneEighties,
              one_eighties2: st[i2].oneEighties,
              high_checkout1: st[i1].highCheckout,
              high_checkout2: st[i2].highCheckout,
              ton60_1: st[i1].ton60,
              ton60_2: st[i2].ton60,
              ton80_1: st[i1].ton100,
              ton80_2: st[i2].ton100,
              ton_plus1: st[i1].ton140,
              ton_plus2: st[i2].ton140,
              ton40_1: st[i1].ton170,
              ton40_2: st[i2].ton170,
              darts_thrown1: st[i1].totalDarts,
              darts_thrown2: st[i2].totalDarts,
              checkout_attempts1: numOrNull((swapped ? p2ApiStats : p1ApiStats).checkoutAttempts, (swapped ? p2ApiStats : p1ApiStats).checkoutDarts) ?? st[i1].checkoutAttempts,
              checkout_attempts2: numOrNull((swapped ? p1ApiStats : p2ApiStats).checkoutAttempts, (swapped ? p1ApiStats : p2ApiStats).checkoutDarts) ?? st[i2].checkoutAttempts,
              checkout_hits1: numOrNull((swapped ? p2ApiStats : p1ApiStats).checkoutHits, (swapped ? p2ApiStats : p1ApiStats).checkouts) ?? st[i1].checkoutHits,
              checkout_hits2: numOrNull((swapped ? p1ApiStats : p2ApiStats).checkoutHits, (swapped ? p1ApiStats : p2ApiStats).checkouts) ?? st[i2].checkoutHits,
              autodarts_link: `https://play.autodarts.io/history/matches/${autodarts_match_id}`,
            };

            console.log(`[auto-submit] Stats computed. Swapped=${swapped}. Score: ${statsData.score1}-${statsData.score2}`);
          }
        } catch (err) {
          console.error("[auto-submit] Autodarts fetch error:", err);
        }
      } else {
        console.error("[auto-submit] Failed to login to Autodarts");
      }
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
      JSON.stringify({ is_league_match: false, submitted: false, error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
