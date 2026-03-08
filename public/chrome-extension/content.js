// Content script - runs on play.autodarts.io
// Captures auth token + finished match stats and stores them for eDART page

(function () {
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

    const payload = {
      match_id: match?.id || fallbackMatchId,
      autodarts_link: `https://play.autodarts.io/history/matches/${match?.id || fallbackMatchId}`,
      player1_name: p1.name || p1.username || p1.displayName || "Player 1",
      player2_name: p2.name || p2.username || p2.displayName || "Player 2",
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

    return payload;
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

  function captureFinishedMatch(match, sourceUrl) {
    if (!match || !isFinishedMatch(match)) return;

    const idFromUrl = sourceUrl?.match(/matches\/([a-f0-9-]+)/i)?.[1] || null;
    const payload = buildPayloadFromMatch(match, idFromUrl);
    if (!payload?.match_id) return;

    chrome.storage.local.set(
      {
        autodarts_last_match: payload,
        autodarts_last_match_timestamp: Date.now(),
      },
      () => {
        console.log("[eDART] Captured finished match:", payload.match_id, payload.player1_name, "vs", payload.player2_name);
      }
    );
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
        chrome.storage.local.set({ autodarts_token: token, token_timestamp: Date.now() });
      }
    }

    const fetchPromise = originalFetch.apply(this, args);

    if (url && /api\.autodarts\.io\/as\/v0\/matches\//i.test(url)) {
      fetchPromise
        .then(async (res) => {
          if (!res.ok) return;
          const data = await res.clone().json().catch(() => null);
          if (data) captureFinishedMatch(data, url);
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
      chrome.storage.local.set({ autodarts_token: token, token_timestamp: Date.now() });
    }
    return originalSetRequestHeader.apply(this, arguments);
  };

  const token = getAutodartsToken();
  if (token) {
    chrome.storage.local.set({ autodarts_token: token, token_timestamp: Date.now() });
  }

  setInterval(() => {
    const t = getAutodartsToken();
    if (t) {
      chrome.storage.local.set({ autodarts_token: t, token_timestamp: Date.now() });
    }
  }, 10000);
})();
