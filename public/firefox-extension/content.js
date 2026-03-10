// Content script - runs on play.autodarts.io (Firefox)
// Captures auth token + finished match stats + live match tracking
// After a finished match, sends to background for auto-submission to eDART

(function () {
  const browserAPI = typeof browser !== "undefined" ? browser : chrome;

  function safeJsonParse(value) {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
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

  function buildPayloadFromMatch(match, fallbackMatchId) {
    const players = Array.isArray(match?.players) ? match.players : [];
    if (players.length < 2) return null;

    const p1 = players[0] || {};
    const p2 = players[1] || {};
    const s1 = p1.stats || {};
    const s2 = p2.stats || {};

    const score1 = normalizeScoreValue(match?.scores?.[0]);
    const score2 = normalizeScoreValue(match?.scores?.[1]);

    return {
      match_id: match?.id || fallbackMatchId,
      autodarts_link: `https://play.autodarts.io/history/matches/${match?.id || fallbackMatchId}`,
      player1_name: p1.name || p1.username || p1.displayName || "Player 1",
      player2_name: p2.name || p2.username || p2.displayName || "Player 2",
      player1_autodarts_id: p1.userId || p1.user_id || p1.id || null,
      player2_autodarts_id: p2.userId || p2.user_id || p2.id || null,
      score1,
      score2,
      avg1: readAvg(s1),
      avg2: readAvg(s2),
      first_9_avg1: s1.first9Average ?? s1.firstNineAvg ?? s1.first9Avg ?? null,
      first_9_avg2: s2.first9Average ?? s2.firstNineAvg ?? s2.first9Avg ?? null,
      one_eighties1: s1.oneEighties ?? s1["180s"] ?? 0,
      one_eighties2: s2.oneEighties ?? s2["180s"] ?? 0,
      high_checkout1: s1.highestCheckout ?? s1.bestCheckout ?? 0,
      high_checkout2: s2.highestCheckout ?? s2.bestCheckout ?? 0,
      ton60_1: s1.ton60 ?? s1["60+"] ?? 0,
      ton60_2: s2.ton60 ?? s2["60+"] ?? 0,
      ton80_1: s1.ton80 ?? s1["80+"] ?? 0,
      ton80_2: s2.ton80 ?? s2["80+"] ?? 0,
      ton_plus1: s1.tonPlus ?? s1["100+"] ?? 0,
      ton_plus2: s2.tonPlus ?? s2["100+"] ?? 0,
      darts_thrown1: s1.dartsThrown ?? s1.darts ?? 0,
      darts_thrown2: s2.dartsThrown ?? s2.darts ?? 0,
      checkout_attempts1: s1.checkoutAttempts ?? s1.checkoutDarts ?? 0,
      checkout_attempts2: s2.checkoutAttempts ?? s2.checkoutDarts ?? 0,
      checkout_hits1: s1.checkoutHits ?? s1.checkouts ?? 0,
      checkout_hits2: s2.checkoutHits ?? s2.checkouts ?? 0,
      captured_at: Date.now(),
    };
  }

  function isFinishedMatch(match) {
    const state = String(match?.state || "").toLowerCase();
    if (["finished", "complete", "completed", "done", "ended"].includes(state)) return true;
    if (typeof match?.winner === "number") return true;

    const hasScores = Array.isArray(match?.scores) && match.scores.length >= 2;
    if (!hasScores) return false;

    const a = normalizeScoreValue(match.scores[0]);
    const b = normalizeScoreValue(match.scores[1]);
    return a > 0 || b > 0;
  }

  function isLiveMatch(match) {
    const state = String(match?.state || "").toLowerCase();
    return ["playing", "started", "running", "in_progress", "active"].includes(state);
  }

  const processedMatches = new Set();
  const notifiedLeagueMatches = new Set();

  function captureFinishedMatch(match, sourceUrl) {
    if (!match || !isFinishedMatch(match)) return;

    const idFromUrl = sourceUrl?.match(/matches\/([a-f0-9-]+)/i)?.[1] || null;
    const payload = buildPayloadFromMatch(match, idFromUrl);
    if (!payload?.match_id) return;

    browserAPI.storage.local.set({
      autodarts_last_match: payload,
      autodarts_last_match_timestamp: Date.now(),
    }, () => {
      console.log("[eDART] Captured finished match:", payload.match_id, payload.player1_name, "vs", payload.player2_name);
    });

    if (!processedMatches.has(payload.match_id)) {
      processedMatches.add(payload.match_id);
      console.log("[eDART] Sending to server for league match check + auto-submit...");

      browserAPI.runtime.sendMessage(
        { type: "AUTO_SUBMIT_LEAGUE_MATCH", payload },
        (response) => {
          if (response?.is_league_match && response?.submitted) {
            console.log("[eDART] ✅ Mecz ligowy zgłoszony automatycznie!", response.league_name, response.score);
          } else if (response?.is_league_match) {
            console.log("[eDART] ⚠️ Mecz ligowy wykryty, ale nie zgłoszony:", response.reason);
          } else {
            console.log("[eDART] Mecz towarzyski (nie ligowy)");
          }
        }
      );
    }
  }

  function handleMatchData(match, sourceUrl) {
    if (!match) return;

    if (isFinishedMatch(match)) {
      captureFinishedMatch(match, sourceUrl);
      const matchId = match?.id || sourceUrl?.match(/matches\/([a-f0-9-]+)/i)?.[1];
      if (matchId) {
        browserAPI.runtime.sendMessage({ type: "LIVE_MATCH_ENDED", matchId });
      }
    } else if (isLiveMatch(match)) {
      const players = Array.isArray(match?.players) ? match.players : [];
      if (players.length < 2) return;
      const p1 = players[0] || {};
      const p2 = players[1] || {};
      const matchId = match?.id || sourceUrl?.match(/matches\/([a-f0-9-]+)/i)?.[1];

      if (matchId && !notifiedLeagueMatches.has(matchId)) {
        notifiedLeagueMatches.add(matchId);
        browserAPI.runtime.sendMessage({
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

      browserAPI.runtime.sendMessage({
        type: "LIVE_MATCH_UPDATE",
        payload: {
          autodarts_match_id: matchId,
          autodarts_link: `https://play.autodarts.io/matches/${matchId}`,
          player1_name: p1.name || p1.username || p1.displayName || "Player 1",
          player2_name: p2.name || p2.username || p2.displayName || "Player 2",
          player1_autodarts_id: p1.userId || p1.user_id || p1.id || null,
          player2_autodarts_id: p2.userId || p2.user_id || p2.id || null,
          player1_score: normalizeScoreValue(match?.scores?.[0]),
          player2_score: normalizeScoreValue(match?.scores?.[1]),
        },
      });
    }
  }

  let lastUrl = location.href;
  const historyMatchIds = new Set();

  function checkForHistoryPage() {
    const url = location.href;
    if (url === lastUrl) return;
    lastUrl = url;

    const historyMatch = url.match(/\/history\/matches\/([a-f0-9-]+)/i);
    if (historyMatch && !historyMatchIds.has(historyMatch[1])) {
      const matchId = historyMatch[1];
      historyMatchIds.add(matchId);
      console.log("[eDART] Detected history page for match:", matchId);
      setTimeout(() => fetchHistoryMatch(matchId), 2000);
    }
  }

  function isExtensionContextValid() {
    try {
      return !!(browserAPI.runtime?.id);
    } catch { return false; }
  }

  async function fetchHistoryMatch(matchId) {
    try {
      if (!isExtensionContextValid()) {
        console.log("[eDART] Extension context invalidated, skipping fetch");
        return;
      }
      const stored = await new Promise((resolve, reject) => {
        try {
          browserAPI.storage.local.get(["autodarts_token"], resolve);
        } catch (e) { reject(e); }
      });
      const token = stored.autodarts_token;
      if (!token) {
        console.log("[eDART] No token available to fetch history match");
        return;
      }

      const res = await fetch(`https://api.autodarts.io/as/v0/matches/${matchId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        console.log("[eDART] History match fetch failed:", res.status);
        return;
      }

      const matchData = await res.json();
      console.log("[eDART] History match data loaded, state:", matchData?.state);
      handleMatchData(matchData, `https://play.autodarts.io/history/matches/${matchId}`);
    } catch (err) {
      console.error("[eDART] Error fetching history match:", err);
    }
  }

  setInterval(checkForHistoryPage, 1000);

  const origPushState = history.pushState;
  history.pushState = function () {
    origPushState.apply(this, arguments);
    setTimeout(checkForHistoryPage, 500);
  };
  const origReplaceState = history.replaceState;
  history.replaceState = function () {
    origReplaceState.apply(this, arguments);
    setTimeout(checkForHistoryPage, 500);
  };
  window.addEventListener("popstate", () => setTimeout(checkForHistoryPage, 500));

  function detectAutodartsUserId() {
    const storages = [localStorage, sessionStorage];
    for (const storage of storages) {
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (!key) continue;
        const value = storage.getItem(key);
        if (!value) continue;
        const parsed = safeJsonParse(value);
        if (parsed?.profile?.sub) return parsed.profile.sub;
        if (key.startsWith("oidc.user:") && parsed?.profile?.sub) return parsed.profile.sub;
      }
    }
    return null;
  }

  function getAutodartsToken() {
    const storages = [localStorage, sessionStorage];
    for (const storage of storages) {
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (!key) continue;
        const value = storage.getItem(key);
        if (!value) continue;
        const parsed = safeJsonParse(value);
        if (parsed?.access_token) return parsed.access_token;
        if (key.startsWith("oidc.user:") || key.includes("autodarts")) {
          if (parsed?.access_token) return parsed.access_token;
        }
      }
    }
    return null;
  }

  const originalFetch = window.fetch;
  window.fetch = function (...args) {
    const request = args[0];
    const options = args[1] || {};
    const url = typeof request === "string" ? request : request?.url;

    if (url && url.includes("api.autodarts.io")) {
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
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.replace("Bearer ", "");
        browserAPI.storage.local.set({ autodarts_token: token, token_timestamp: Date.now() });
      }
    }

    const fetchPromise = originalFetch.apply(this, args);

    if (url && /api\.autodarts\.io\/as\/v0\/matches\//i.test(url)) {
      fetchPromise
        .then(async (res) => {
          if (!res.ok) return;
          const data = await res.clone().json().catch(() => null);
          if (data) handleMatchData(data, url);
        })
        .catch(() => {});
    }

    return fetchPromise;
  };

  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;

  XMLHttpRequest.prototype.open = function (method, url) {
    this._url = url;
    return originalOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.setRequestHeader = function (name, value) {
    if (this._url && this._url.includes("api.autodarts.io") && name.toLowerCase() === "authorization" && value.startsWith("Bearer ")) {
      const token = value.replace("Bearer ", "");
      browserAPI.storage.local.set({ autodarts_token: token, token_timestamp: Date.now() });
    }
    return originalSetRequestHeader.apply(this, arguments);
  };

  const token = getAutodartsToken();
  if (token) {
    browserAPI.storage.local.set({ autodarts_token: token, token_timestamp: Date.now() });
  }

  const userId = detectAutodartsUserId();
  if (userId) {
    browserAPI.storage.local.set({ autodarts_user_id: userId });
    browserAPI.runtime.sendMessage({ type: "AUTODARTS_USER_ID_DETECTED", userId });
    console.log("[eDART] Detected Autodarts User ID:", userId);
  }

  setInterval(() => {
    const t = getAutodartsToken();
    if (t) {
      browserAPI.storage.local.set({ autodarts_token: t, token_timestamp: Date.now() });
    }
    const uid = detectAutodartsUserId();
    if (uid) {
      browserAPI.storage.local.set({ autodarts_user_id: uid });
    }
  }, 10000);

  checkForHistoryPage();
})();
