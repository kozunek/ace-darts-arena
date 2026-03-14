// Content script - runs on play.autodarts.io
// Captures auth token + finished match stats
// After a finished match, sends to background for auto-submission to eDART

(function () {
  // ─── Extension context safety ───
  let contextDead = false;
  const intervals = [];
  const timeouts = [];

  function isAlive() {
    if (contextDead) return false;
    try {
      return !!chrome.runtime?.id;
    } catch {
      contextDead = true;
      cleanup();
      return false;
    }
  }

  function cleanup() {
    intervals.forEach(clearInterval);
    timeouts.forEach(clearTimeout);
    console.log("[eDART] Extension context invalidated — stopped all activity");
  }

  function safeInterval(fn, ms) {
    const id = setInterval(() => { if (isAlive()) fn(); }, ms);
    intervals.push(id);
    return id;
  }

  function safeTimeout(fn, ms) {
    const id = setTimeout(() => { if (isAlive()) fn(); }, ms);
    timeouts.push(id);
    return id;
  }

  function storageGet(keys) {
    return new Promise((resolve) => {
      if (!isAlive()) return resolve({});
      try {
        chrome.storage.local.get(keys, (result) => {
          if (chrome.runtime.lastError) {
            contextDead = true;
            cleanup();
            resolve({});
          } else {
            resolve(result || {});
          }
        });
      } catch {
        contextDead = true;
        cleanup();
        resolve({});
      }
    });
  }

  function storageSet(data) {
    if (!isAlive()) return;
    try {
      chrome.storage.local.set(data);
    } catch {
      contextDead = true;
      cleanup();
    }
  }

  function sendMsg(msg, callback) {
    if (!isAlive()) return;
    try {
      chrome.runtime.sendMessage(msg, (response) => {
        if (chrome.runtime.lastError) {
          console.warn("[eDART] sendMessage error:", chrome.runtime.lastError.message);
        }
        if (callback) callback(response);
      });
    } catch {
      contextDead = true;
      cleanup();
    }
  }

  // ─── Helpers ───
  function safeJsonParse(value) {
    try { return JSON.parse(value); } catch { return null; }
  }

  function normalizeScoreValue(scoreLike) {
    if (typeof scoreLike === "number") return scoreLike;
    if (scoreLike && typeof scoreLike === "object") {
      if (typeof scoreLike.legs === "number") return scoreLike.legs;
      if (typeof scoreLike.sets === "number") return scoreLike.sets;
      if (typeof scoreLike.value === "number") return scoreLike.value;
    }
    return 0;
  }

  function readAvg(stats) {
    if (!stats || typeof stats !== "object") return null;
    if (typeof stats.average === "number") return stats.average;
    if (typeof stats.avg === "number") return stats.avg;
    if (typeof stats.ppd === "number") return Math.round(stats.ppd * 3 * 100) / 100;
    return null;
  }

  // ─── Turn-by-turn stat computation ───
  function getDartPoints(dart) {
    const seg = dart?.segment || dart || {};
    const bed = String(seg.bed ?? "").toLowerCase();
    const name = String(seg.name ?? "").toLowerCase();
    if (bed.includes("miss") || name.includes("miss")) return 0;
    const number = Number(seg.number ?? seg.value ?? 0);
    const multiplier = Number(seg.multiplier ?? 1);
    if (!Number.isFinite(number) || !Number.isFinite(multiplier)) return 0;
    return number * multiplier;
  }

  function isDoubleAttempt(remaining) {
    if (remaining === 50) return true;
    if (remaining < 2 || remaining > 40) return false;
    return remaining % 2 === 0;
  }

  function buildPlayerIdMap(players) {
    const map = {};
    for (let i = 0; i < Math.min(players.length, 2); i++) {
      const p = players[i];
      for (const id of [p.userId, p.id, p.playerId, p.hostId, p?.user?.id]) {
        if (typeof id === "string" && id.length > 0) map[id] = i;
      }
    }
    return map;
  }

  function resolvePlayerIndex(turn, idMap) {
    for (const cid of [turn.playerId, turn.player?.id, turn.player?.userId, turn.userId]) {
      if (typeof cid === "string" && cid in idMap) return idMap[cid];
    }
    if (typeof turn.turn === "number" && (turn.turn === 0 || turn.turn === 1)) return turn.turn;
    return null;
  }

  function emptyStats() {
    return {
      totalScore: 0, totalDarts: 0,
      first9Score: 0, first9Darts: 0,
      oneEighties: 0, highCheckout: 0,
      ton60: 0, ton100: 0, ton140: 0, ton170: 0,
      checkoutAttempts: 0, checkoutHits: 0,
      legsWon: 0, nineDarters: 0,
    };
  }

  function processGameTurns(game, matchIdMap, s, gameIndex) {
    const turns = game.turns || game.visits || game.rounds || [];
    if (turns.length === 0) return;

    const idMap = { ...matchIdMap };
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

    const indices = [];
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

      let scoreBeforeTurn = null;
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

      if (dartsArr && scoreBeforeTurn != null) {
        let runningRemaining = scoreBeforeTurn;
        for (const d of dartsArr) {
          if (isDoubleAttempt(runningRemaining)) st.checkoutAttempts++;
          const dartPts = getDartPoints(d);
          runningRemaining -= dartPts;
          if (runningRemaining <= 0) break;
        }
      } else if (!dartsArr && scoreBeforeTurn != null) {
        if (isDoubleAttempt(scoreBeforeTurn)) st.checkoutAttempts++;
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

  function computeStatsFromGames(match) {
    const players = Array.isArray(match?.players) ? match.players : [];
    if (players.length < 2) return null;

    const games = Array.isArray(match?.games) ? match.games.filter(g => g) : [];
    if (games.length === 0) return null;

    const idMap = buildPlayerIdMap(players);
    const s = [emptyStats(), emptyStats()];

    if (Array.isArray(match?.scores) && match.scores.length >= 2) {
      const sc1 = match.scores[0], sc2 = match.scores[1];
      if (typeof sc1 === "object" && sc1 !== null) {
        s[0].legsWon = sc1.legs ?? sc1.sets ?? 0;
        s[1].legsWon = sc2?.legs ?? sc2?.sets ?? 0;
      } else {
        s[0].legsWon = Number(sc1) || 0;
        s[1].legsWon = Number(sc2) || 0;
      }
    }

    for (let gi = 0; gi < games.length; gi++) {
      processGameTurns(games[gi], idMap, s, gi);
    }

    const hasTurnData = s[0].totalDarts > 0 || s[1].totalDarts > 0;
    if (!hasTurnData) return null;

    const avgFromTurns = (st) => st.totalDarts > 0 ? Math.round((st.totalScore / st.totalDarts) * 3 * 100) / 100 : null;
    const f9FromTurns = (st) => st.first9Darts > 0 ? Math.round((st.first9Score / st.first9Darts) * 3 * 100) / 100 : null;

    return {
      computed: true,
      stats: [
        {
          avg: avgFromTurns(s[0]), first9Avg: f9FromTurns(s[0]),
          oneEighties: s[0].oneEighties, highCheckout: s[0].highCheckout,
          ton60: s[0].ton60, ton100: s[0].ton100, ton140: s[0].ton140, ton170: s[0].ton170,
          dartsThrown: s[0].totalDarts, checkoutAttempts: s[0].checkoutAttempts, checkoutHits: s[0].checkoutHits,
        },
        {
          avg: avgFromTurns(s[1]), first9Avg: f9FromTurns(s[1]),
          oneEighties: s[1].oneEighties, highCheckout: s[1].highCheckout,
          ton60: s[1].ton60, ton100: s[1].ton100, ton140: s[1].ton140, ton170: s[1].ton170,
          dartsThrown: s[1].totalDarts, checkoutAttempts: s[1].checkoutAttempts, checkoutHits: s[1].checkoutHits,
        },
      ],
    };
  }

  // ─── Build payload ───
  function buildPayloadFromMatch(match, fallbackMatchId) {
    const players = Array.isArray(match?.players) ? match.players : [];
    if (players.length < 2) return null;

    const p1 = players[0] || {};
    const p2 = players[1] || {};
    const s1 = p1.stats || {};
    const s2 = p2.stats || {};
    const score1 = normalizeScoreValue(match?.scores?.[0]);
    const score2 = normalizeScoreValue(match?.scores?.[1]);

    let avg1 = readAvg(s1), avg2 = readAvg(s2);
    let first9Avg1 = s1.first9Average ?? s1.firstNineAvg ?? s1.first9Avg ?? null;
    let first9Avg2 = s2.first9Average ?? s2.firstNineAvg ?? s2.first9Avg ?? null;
    let oneEighties1 = s1.oneEighties ?? s1["180s"] ?? 0;
    let oneEighties2 = s2.oneEighties ?? s2["180s"] ?? 0;
    let highCheckout1 = s1.highestCheckout ?? s1.bestCheckout ?? 0;
    let highCheckout2 = s2.highestCheckout ?? s2.bestCheckout ?? 0;
    let ton60_1 = s1.ton60 ?? s1["60+"] ?? 0, ton60_2 = s2.ton60 ?? s2["60+"] ?? 0;
    let ton80_1 = s1.ton80 ?? s1["80+"] ?? 0, ton80_2 = s2.ton80 ?? s2["80+"] ?? 0;
    let ton_plus1 = s1.tonPlus ?? s1["100+"] ?? 0, ton_plus2 = s2.tonPlus ?? s2["100+"] ?? 0;
    let darts_thrown1 = s1.dartsThrown ?? s1.darts ?? 0, darts_thrown2 = s2.dartsThrown ?? s2.darts ?? 0;
    let checkout_attempts1 = s1.checkoutAttempts ?? s1.checkoutDarts ?? 0;
    let checkout_attempts2 = s2.checkoutAttempts ?? s2.checkoutDarts ?? 0;
    let checkout_hits1 = s1.checkoutHits ?? s1.checkouts ?? 0;
    let checkout_hits2 = s2.checkoutHits ?? s2.checkouts ?? 0;

    const hasApiStats = !!(avg1 || avg2 || darts_thrown1 || darts_thrown2 || oneEighties1 || oneEighties2 || highCheckout1 || highCheckout2);

    if (!hasApiStats) {
      const computed = computeStatsFromGames(match);
      if (computed) {
        const cs1 = computed.stats[0], cs2 = computed.stats[1];
        avg1 = cs1.avg; avg2 = cs2.avg;
        first9Avg1 = cs1.first9Avg; first9Avg2 = cs2.first9Avg;
        oneEighties1 = cs1.oneEighties; oneEighties2 = cs2.oneEighties;
        highCheckout1 = cs1.highCheckout; highCheckout2 = cs2.highCheckout;
        ton60_1 = cs1.ton60; ton60_2 = cs2.ton60;
        ton80_1 = cs1.ton100; ton80_2 = cs2.ton100;
        ton_plus1 = cs1.ton140; ton_plus2 = cs2.ton140;
        darts_thrown1 = cs1.dartsThrown; darts_thrown2 = cs2.dartsThrown;
        checkout_attempts1 = cs1.checkoutAttempts; checkout_attempts2 = cs2.checkoutAttempts;
        checkout_hits1 = cs1.checkoutHits; checkout_hits2 = cs2.checkoutHits;
        console.log("[eDART] Stats computed from turns:", `avg1=${avg1}, avg2=${avg2}`);
      }
    }

    return {
      match_id: match?.id || fallbackMatchId,
      autodarts_link: `https://play.autodarts.io/history/matches/${match?.id || fallbackMatchId}`,
      player1_name: p1.name || p1.username || p1.displayName || "Player 1",
      player2_name: p2.name || p2.username || p2.displayName || "Player 2",
      player1_autodarts_id: p1.userId || p1.user_id || p1.id || null,
      player2_autodarts_id: p2.userId || p2.user_id || p2.id || null,
      score1, score2, avg1, avg2,
      first_9_avg1: first9Avg1, first_9_avg2: first9Avg2,
      one_eighties1: oneEighties1, one_eighties2: oneEighties2,
      high_checkout1: highCheckout1, high_checkout2: highCheckout2,
      ton60_1, ton60_2, ton80_1, ton80_2, ton_plus1, ton_plus2,
      darts_thrown1, darts_thrown2,
      checkout_attempts1, checkout_attempts2,
      checkout_hits1, checkout_hits2,
      captured_at: Date.now(),
    };
  }

  // ─── Match state detection ───
  function isFinishedMatch(match) {
    const state = String(match?.state || "").toLowerCase();
    if (["finished", "complete", "completed", "done", "ended"].includes(state)) return true;
    if (typeof match?.winner === "number") return true;
    const hasScores = Array.isArray(match?.scores) && match.scores.length >= 2;
    if (!hasScores) return false;
    return normalizeScoreValue(match.scores[0]) > 0 || normalizeScoreValue(match.scores[1]) > 0;
  }

  // ─── Track processed matches ───
  const processedMatches = new Set();
  const notifiedLeagueMatches = new Set();

  function captureFinishedMatch(match, sourceUrl) {
    if (!match || !isFinishedMatch(match)) return;
    const idFromUrl = sourceUrl?.match(/matches\/([a-f0-9-]+)/i)?.[1] || null;
    const payload = buildPayloadFromMatch(match, idFromUrl);
    if (!payload?.match_id) return;

    storageSet({
      autodarts_last_match: payload,
      autodarts_last_match_timestamp: Date.now(),
    });
    console.log("[eDART] Captured finished match:", payload.match_id, payload.player1_name, "vs", payload.player2_name);

    if (!processedMatches.has(payload.match_id)) {
      processedMatches.add(payload.match_id);
      sendMsg({ type: "AUTO_SUBMIT_LEAGUE_MATCH", payload }, (response) => {
        if (response?.is_league_match && response?.submitted) {
          console.log("[eDART] ✅ Mecz ligowy zgłoszony automatycznie!");
        } else if (response?.already_submitted) {
          console.log("[eDART] ℹ️ Mecz już zgłoszony przez przeciwnika");
        } else if (response?.is_league_match) {
          console.log("[eDART] ⚠️ Mecz ligowy, ale nie zgłoszony:", response.reason);
        } else {
          console.log("[eDART] Mecz towarzyski");
        }
      });
    }
  }

  // ─── Handle match data (finished only, no live tracking) ───
  function handleMatchData(match, sourceUrl) {
    if (!match || !isAlive()) return;

    if (isFinishedMatch(match)) {
      captureFinishedMatch(match, sourceUrl);
    } else {
      // Live match — only check if league match for notification
      const players = Array.isArray(match?.players) ? match.players : [];
      if (players.length < 2) return;
      const p1 = players[0] || {};
      const p2 = players[1] || {};
      const matchId = match?.id || sourceUrl?.match(/matches\/([a-f0-9-]+)/i)?.[1];

      if (matchId && !notifiedLeagueMatches.has(matchId)) {
        notifiedLeagueMatches.add(matchId);
        sendMsg({
          type: "CHECK_LEAGUE_MATCH_LIVE",
          payload: {
            autodarts_match_id: matchId,
            player1_name: p1.name || p1.username || p1.displayName || "Player 1",
            player2_name: p2.name || p2.username || p2.displayName || "Player 2",
            player1_autodarts_id: p1.userId || p1.user_id || p1.id || null,
            player2_autodarts_id: p2.userId || p2.user_id || p2.id || null,
          },
        });
      }
    }
  }

  // ─── History page detection ───
  let lastUrl = location.href;
  const historyMatchIds = new Set();

  function checkForHistoryPage() {
    if (!isAlive()) return;
    const url = location.href;
    if (url === lastUrl) return;
    lastUrl = url;

    const historyMatch = url.match(/\/history\/matches\/([a-f0-9-]+)/i);
    if (historyMatch && !historyMatchIds.has(historyMatch[1])) {
      const matchId = historyMatch[1];
      historyMatchIds.add(matchId);
      console.log("[eDART] Detected history page:", matchId);
      safeTimeout(() => fetchHistoryMatch(matchId), 2000);
    }
  }

  async function fetchHistoryMatch(matchId) {
    if (!isAlive()) return;
    try {
      const stored = await storageGet(["autodarts_token"]);
      if (!stored.autodarts_token) return;

      const res = await fetch(`https://api.autodarts.io/as/v0/matches/${matchId}`, {
        headers: { Authorization: `Bearer ${stored.autodarts_token}` },
      });
      if (!res.ok) return;

      const matchData = await res.json();
      handleMatchData(matchData, `https://play.autodarts.io/history/matches/${matchId}`);
    } catch (err) {
      if (String(err).includes("Extension context invalidated")) {
        contextDead = true;
        cleanup();
      } else {
        console.error("[eDART] Error fetching history match:", err);
      }
    }
  }

  // ─── SPA navigation monitoring ───
  safeInterval(checkForHistoryPage, 1000);

  const origPushState = history.pushState;
  history.pushState = function () {
    origPushState.apply(this, arguments);
    safeTimeout(checkForHistoryPage, 500);
  };
  const origReplaceState = history.replaceState;
  history.replaceState = function () {
    origReplaceState.apply(this, arguments);
    safeTimeout(checkForHistoryPage, 500);
  };
  window.addEventListener("popstate", () => safeTimeout(checkForHistoryPage, 500));

  // ─── Token & user capture helpers ───
  function normalizeToken(value) {
    if (typeof value !== "string") return null;
    const token = value.trim().replace(/^Bearer\s+/i, "");
    if (!token || token.length < 32) return null;
    return token;
  }

  function deepFindToken(value, depth = 0) {
    if (value == null || depth > 6) return null;

    if (typeof value === "string") {
      const direct = normalizeToken(value);
      if (direct && direct.includes(".")) return direct;

      const parsed = safeJsonParse(value);
      if (parsed) return deepFindToken(parsed, depth + 1);

      const regexMatch = value.match(/"access_token"\s*:\s*"([^"]+)"/i);
      if (regexMatch?.[1]) return normalizeToken(regexMatch[1]);
      return null;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        const nested = deepFindToken(item, depth + 1);
        if (nested) return nested;
      }
      return null;
    }

    if (typeof value === "object") {
      const preferredKeys = ["access_token", "accessToken", "token", "authToken", "jwt", "bearer"];
      for (const key of preferredKeys) {
        if (key in value) {
          const nested = deepFindToken(value[key], depth + 1);
          if (nested) return nested;
        }
      }

      for (const nestedValue of Object.values(value)) {
        const nested = deepFindToken(nestedValue, depth + 1);
        if (nested) return nested;
      }
    }

    return null;
  }

  function deepFindUserId(value, depth = 0) {
    if (value == null || depth > 6) return null;

    if (typeof value === "string") {
      if (value.length >= 8 && !value.includes(" ") && !value.includes(".")) return value;
      const parsed = safeJsonParse(value);
      return parsed ? deepFindUserId(parsed, depth + 1) : null;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        const nested = deepFindUserId(item, depth + 1);
        if (nested) return nested;
      }
      return null;
    }

    if (typeof value === "object") {
      const preferredKeys = ["sub", "userId", "user_id", "profileId", "id"];
      for (const key of preferredKeys) {
        if (key in value) {
          const nested = deepFindUserId(value[key], depth + 1);
          if (nested) return nested;
        }
      }
      for (const nestedValue of Object.values(value)) {
        const nested = deepFindUserId(nestedValue, depth + 1);
        if (nested) return nested;
      }
    }

    return null;
  }

  function captureAutodartsToken(token, source) {
    const normalized = normalizeToken(token);
    if (!normalized) return;

    storageSet({
      autodarts_token: normalized,
      token_timestamp: Date.now(),
      autodarts_token_source: source,
    });
    console.log(`[eDART] Token captured (${source})`);
  }

  function captureAutodartsUserId(userId, source) {
    if (!userId) return;
    storageSet({ autodarts_user_id: userId });
    sendMsg({ type: "AUTODARTS_USER_ID_DETECTED", userId });
    console.log(`[eDART] Detected Autodarts User ID (${source}):`, userId);
  }

  function detectAutodartsUserId() {
    for (const storage of [localStorage, sessionStorage]) {
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (!key) continue;
        const raw = storage.getItem(key);
        if (!raw) continue;

        const parsed = safeJsonParse(raw);
        const userId = deepFindUserId(parsed ?? raw);
        if (userId) return userId;
      }
    }
    return null;
  }

  function getAutodartsToken() {
    for (const storage of [localStorage, sessionStorage]) {
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (!key) continue;

        const raw = storage.getItem(key);
        if (!raw) continue;

        const parsed = safeJsonParse(raw);
        const tokenFromParsed = deepFindToken(parsed ?? raw);
        if (tokenFromParsed) return tokenFromParsed;

        if (/access|token|auth|oidc|keycloak|kc-/i.test(key)) {
          const maybeRawToken = normalizeToken(raw);
          if (maybeRawToken && maybeRawToken.includes(".")) return maybeRawToken;
        }
      }
    }

    try {
      const cookies = document.cookie.split(";");
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split("=");
        if (!name || !value) continue;
        if (/access|token|auth/i.test(name)) {
          const decoded = decodeURIComponent(value);
          const cookieToken = normalizeToken(decoded);
          if (cookieToken) return cookieToken;
        }
      }
    } catch {
      // ignore
    }

    return null;
  }

  function setupPageBridge() {
    try {
      const bridge = function () {
        if (window.__EDART_PAGE_BRIDGE_INSTALLED__) return;
        window.__EDART_PAGE_BRIDGE_INSTALLED__ = true;

        const SOURCE = "EDART_PAGE_BRIDGE";
        const post = (payload) => window.postMessage({ source: SOURCE, ...payload }, "*");

        const normalize = (value) => {
          if (typeof value !== "string") return null;
          const token = value.trim().replace(/^Bearer\s+/i, "");
          return token && token.length >= 32 ? token : null;
        };

        const parse = (value) => {
          try { return JSON.parse(value); } catch { return null; }
        };

        const findToken = (value, depth = 0) => {
          if (value == null || depth > 6) return null;

          if (typeof value === "string") {
            const token = normalize(value);
            if (token && token.includes(".")) return token;
            const parsed = parse(value);
            if (parsed) return findToken(parsed, depth + 1);
            return null;
          }

          if (Array.isArray(value)) {
            for (const item of value) {
              const nested = findToken(item, depth + 1);
              if (nested) return nested;
            }
            return null;
          }

          if (typeof value === "object") {
            const preferredKeys = ["access_token", "accessToken", "token", "authToken", "jwt", "bearer"];
            for (const key of preferredKeys) {
              if (key in value) {
                const nested = findToken(value[key], depth + 1);
                if (nested) return nested;
              }
            }

            for (const nestedValue of Object.values(value)) {
              const nested = findToken(nestedValue, depth + 1);
              if (nested) return nested;
            }
          }

          return null;
        };

        const findUserId = (value, depth = 0) => {
          if (value == null || depth > 6) return null;

          if (typeof value === "string") {
            if (value.length >= 8 && !value.includes(" ") && !value.includes(".")) return value;
            const parsed = parse(value);
            return parsed ? findUserId(parsed, depth + 1) : null;
          }

          if (Array.isArray(value)) {
            for (const item of value) {
              const nested = findUserId(item, depth + 1);
              if (nested) return nested;
            }
            return null;
          }

          if (typeof value === "object") {
            const preferredKeys = ["sub", "userId", "user_id", "profileId", "id"];
            for (const key of preferredKeys) {
              if (key in value) {
                const nested = findUserId(value[key], depth + 1);
                if (nested) return nested;
              }
            }
            for (const nestedValue of Object.values(value)) {
              const nested = findUserId(nestedValue, depth + 1);
              if (nested) return nested;
            }
          }

          return null;
        };

        const scanStorage = (reason) => {
          for (const storage of [window.localStorage, window.sessionStorage]) {
            for (let i = 0; i < storage.length; i++) {
              const key = storage.key(i);
              if (!key) continue;
              const raw = storage.getItem(key);
              if (!raw) continue;

              const parsed = parse(raw);
              const token = findToken(parsed ?? raw);
              if (token) {
                post({ type: "TOKEN_CAPTURED", token, reason: `${reason}:storage` });
                return;
              }
            }
          }
        };

        const scanUserId = (reason) => {
          for (const storage of [window.localStorage, window.sessionStorage]) {
            for (let i = 0; i < storage.length; i++) {
              const key = storage.key(i);
              if (!key) continue;
              const raw = storage.getItem(key);
              if (!raw) continue;

              const parsed = parse(raw);
              const userId = findUserId(parsed ?? raw);
              if (userId) {
                post({ type: "USER_ID_CAPTURED", userId, reason: `${reason}:storage` });
                return;
              }
            }
          }
        };

        const extractAuthHeader = (request, options = {}) => {
          let authHeader = null;
          if (options.headers) {
            if (options.headers instanceof Headers) {
              authHeader = options.headers.get("Authorization");
            } else if (typeof options.headers === "object") {
              authHeader = options.headers.Authorization || options.headers.authorization || null;
            }
          }

          if (!authHeader && request instanceof Request) {
            authHeader = request.headers?.get("Authorization") || null;
          }

          if (!authHeader) return null;
          return normalize(authHeader);
        };

        const originalFetch = window.fetch;
        window.fetch = function (...args) {
          const request = args[0];
          const options = args[1] || {};
          const url = typeof request === "string" ? request : request?.url;

          if (url && url.includes("api.autodarts.io")) {
            const token = extractAuthHeader(request, options);
            if (token) post({ type: "TOKEN_CAPTURED", token, reason: "bridge-fetch-header" });
          }

          const fetchPromise = originalFetch.apply(this, args);

          if (url && /api\.autodarts\.io\/as\/v0\/matches\//i.test(url)) {
            fetchPromise
              .then(async (res) => {
                if (!res.ok) return;
                const match = await res.clone().json().catch(() => null);
                if (match) post({ type: "MATCH_CAPTURED", match, url });
              })
              .catch(() => {});
          }

          return fetchPromise;
        };

        const originalOpen = XMLHttpRequest.prototype.open;
        const originalSetHeader = XMLHttpRequest.prototype.setRequestHeader;
        const originalSend = XMLHttpRequest.prototype.send;

        XMLHttpRequest.prototype.open = function (method, url) {
          this.__edartUrl = url;
          return originalOpen.apply(this, arguments);
        };

        XMLHttpRequest.prototype.setRequestHeader = function (name, value) {
          if (this.__edartUrl?.includes("api.autodarts.io") && name?.toLowerCase() === "authorization") {
            const token = normalize(value);
            if (token) post({ type: "TOKEN_CAPTURED", token, reason: "bridge-xhr-header" });
          }
          return originalSetHeader.apply(this, arguments);
        };

        XMLHttpRequest.prototype.send = function () {
          this.addEventListener("load", () => {
            if (!this.__edartUrl || !/api\.autodarts\.io\/as\/v0\/matches\//i.test(this.__edartUrl)) return;
            const match = parse(this.responseText);
            if (match) post({ type: "MATCH_CAPTURED", match, url: this.__edartUrl });
          });

          return originalSend.apply(this, arguments);
        };

        window.addEventListener("storage", (event) => {
          if (!event.newValue) return;
          const parsed = parse(event.newValue);
          const token = findToken(parsed ?? event.newValue);
          if (token) post({ type: "TOKEN_CAPTURED", token, reason: "bridge-storage-event" });
        });

        scanStorage("bridge-init");
        scanUserId("bridge-init");
        setTimeout(() => scanStorage("bridge-retry-2s"), 2000);
        setTimeout(() => scanStorage("bridge-retry-5s"), 5000);
        setInterval(() => {
          scanStorage("bridge-interval");
          scanUserId("bridge-interval");
        }, 10000);
      };

      const script = document.createElement("script");
      script.textContent = `;(${bridge.toString()})();`;
      (document.documentElement || document.head || document.body).appendChild(script);
      script.remove();
    } catch (err) {
      console.warn("[eDART] Page bridge injection failed:", err);
    }
  }

  window.addEventListener("message", (event) => {
    if (event.source !== window || !event.data || event.data.source !== "EDART_PAGE_BRIDGE") return;

    if (event.data.type === "TOKEN_CAPTURED" && event.data.token) {
      captureAutodartsToken(event.data.token, event.data.reason || "page-bridge");
    }

    if (event.data.type === "USER_ID_CAPTURED" && event.data.userId) {
      captureAutodartsUserId(event.data.userId, event.data.reason || "page-bridge");
    }

    if (event.data.type === "MATCH_CAPTURED" && event.data.match) {
      handleMatchData(event.data.match, event.data.url || location.href);
    }
  });

  // ─── Intercept fetch ───
  const originalFetch = window.fetch;
  window.fetch = function (...args) {
    const request = args[0];
    const options = args[1] || {};
    const url = typeof request === "string" ? request : request?.url;

    if (url && url.includes("api.autodarts.io") && isAlive()) {
      let authHeader = null;
      if (options.headers) {
        if (options.headers instanceof Headers) {
          authHeader = options.headers.get("Authorization");
        } else if (typeof options.headers === "object") {
          authHeader = options.headers.Authorization || options.headers.authorization;
        }
      }
      if (!authHeader && request instanceof Request) {
        authHeader = request.headers?.get("Authorization");
      }
      if (authHeader) {
        captureAutodartsToken(authHeader, "content-fetch-header");
      }
    }

    const fetchPromise = originalFetch.apply(this, args);

    if (url && /api\.autodarts\.io\/as\/v0\/matches\//i.test(url)) {
      fetchPromise
        .then(async (res) => {
          if (!res.ok || !isAlive()) return;
          const data = await res.clone().json().catch(() => null);
          if (data) handleMatchData(data, url);
        })
        .catch(() => {});
    }

    return fetchPromise;
  };

  // ─── Intercept XHR ───
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;

  XMLHttpRequest.prototype.open = function (method, url) {
    this._url = url;
    return originalOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.setRequestHeader = function (name, value) {
    if (isAlive() && this._url?.includes("api.autodarts.io") && name?.toLowerCase() === "authorization") {
      captureAutodartsToken(value, "content-xhr-header");
    }
    return originalSetRequestHeader.apply(this, arguments);
  };

  // ─── Initial capture (with retry for late-loading SPAs) ───
  function initialCapture(reason = "manual") {
    const token = getAutodartsToken();
    if (token) captureAutodartsToken(token, `${reason}:storage-scan`);

    const userId = detectAutodartsUserId();
    if (userId) captureAutodartsUserId(userId, `${reason}:storage-scan`);
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== "EDART_REFRESH_TOKEN") return false;

    initialCapture(message.reason || "runtime-refresh");
    sendResponse({ ok: true });
    return true;
  });

  setupPageBridge();

  // Run immediately + retry after short delays (SPA may load auth late)
  initialCapture("startup");
  safeTimeout(() => initialCapture("retry-2s"), 2000);
  safeTimeout(() => initialCapture("retry-5s"), 5000);

  // Periodic re-scan
  safeInterval(() => {
    const token = getAutodartsToken();
    if (token) captureAutodartsToken(token, "interval");

    const userId = detectAutodartsUserId();
    if (userId) storageSet({ autodarts_user_id: userId });
  }, 8000);

  // Also watch for storage events (token refresh from another tab)
  window.addEventListener("storage", (event) => {
    if (!isAlive() || !event.newValue) return;

    const parsed = safeJsonParse(event.newValue);
    const token = deepFindToken(parsed ?? event.newValue);
    if (token) captureAutodartsToken(token, "storage-event");

    const userId = deepFindUserId(parsed ?? event.newValue);
    if (userId) captureAutodartsUserId(userId, "storage-event");
  });

  checkForHistoryPage();
  console.log("[eDART] Content script loaded (v2.1.0)");
})();
