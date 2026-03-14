// ─── Content script — runs on play.autodarts.io ───
// Captures Autodarts auth token from network requests and localStorage
// Detects finished matches and sends them for auto-submission

(function () {
  "use strict";

  // ─── Extension context safety ───
  let contextDead = false;
  const intervals = [];
  const timeouts = [];

  function isAlive() {
    if (contextDead) return false;
    try { return !!chrome.runtime?.id; } catch { contextDead = true; cleanup(); return false; }
  }

  function cleanup() {
    intervals.forEach(clearInterval);
    timeouts.forEach(clearTimeout);
    console.log("[eDART] Extension context invalidated — stopped");
  }

  function safeInterval(fn, ms) { const id = setInterval(() => { if (isAlive()) fn(); }, ms); intervals.push(id); return id; }
  function safeTimeout(fn, ms) { const id = setTimeout(() => { if (isAlive()) fn(); }, ms); timeouts.push(id); return id; }

  function storageGet(keys) {
    return new Promise((resolve) => {
      if (!isAlive()) return resolve({});
      try {
        chrome.storage.local.get(keys, (r) => {
          if (chrome.runtime.lastError) { contextDead = true; cleanup(); resolve({}); }
          else resolve(r || {});
        });
      } catch { contextDead = true; cleanup(); resolve({}); }
    });
  }

  function storageSet(data) {
    if (!isAlive()) return;
    try { chrome.storage.local.set(data); } catch { contextDead = true; cleanup(); }
  }

  function sendMsg(msg, cb) {
    if (!isAlive()) return;
    try {
      chrome.runtime.sendMessage(msg, (res) => {
        if (chrome.runtime.lastError) console.warn("[eDART] sendMessage error:", chrome.runtime.lastError.message);
        if (cb) cb(res);
      });
    } catch { contextDead = true; cleanup(); }
  }

  function safeJsonParse(v) { try { return JSON.parse(v); } catch { return null; } }

  // ───────────────────────────────────────────────
  // TOKEN CAPTURE — multiple layers for reliability
  // ───────────────────────────────────────────────

  let lastCapturedToken = null;
  let lastCapturedAt = 0;

  function saveToken(token, source) {
    if (!token || typeof token !== "string" || token.length < 30) return;
    // De-dup: don't write if same token captured <2s ago
    if (token === lastCapturedToken && Date.now() - lastCapturedAt < 2000) return;
    lastCapturedToken = token;
    lastCapturedAt = Date.now();

    storageSet({
      autodarts_token: token,
      token_timestamp: Date.now(),
      autodarts_token_source: source,
    });
    console.log(`[eDART] ✅ Token captured (${source}), len=${token.length}`);
  }

  function extractBearerToken(headerValue) {
    if (!headerValue || typeof headerValue !== "string") return null;
    const token = headerValue.replace(/^Bearer\s+/i, "").trim();
    return token.length >= 30 ? token : null;
  }

  // --- Layer 1: Intercept fetch() calls to api.autodarts.io ---
  const _origFetch = window.fetch;
  window.fetch = function (...args) {
    try {
      const [input, init] = args;
      const url = typeof input === "string" ? input : input?.url || "";

      if (url.includes("api.autodarts.io") && isAlive()) {
        let authVal = null;
        const headers = init?.headers;
        if (headers instanceof Headers) authVal = headers.get("Authorization");
        else if (headers && typeof headers === "object") authVal = headers["Authorization"] || headers["authorization"];
        if (!authVal && input instanceof Request) authVal = input.headers?.get("Authorization");

        const token = extractBearerToken(authVal);
        if (token) saveToken(token, "fetch-intercept");
      }

      const promise = _origFetch.apply(this, args);

      // Also capture match data from API responses
      if (url && /api\.autodarts\.io\/as\/v0\/matches\//i.test(url)) {
        promise.then(async (res) => {
          if (!res.ok || !isAlive()) return;
          const data = await res.clone().json().catch(() => null);
          if (data) handleMatchData(data, url);
        }).catch(() => {});
      }

      return promise;
    } catch (e) {
      return _origFetch.apply(this, args);
    }
  };

  // --- Layer 2: Intercept XHR ---
  const _origOpen = XMLHttpRequest.prototype.open;
  const _origSetHeader = XMLHttpRequest.prototype.setRequestHeader;

  XMLHttpRequest.prototype.open = function (method, url) {
    this.__edartUrl = url;
    return _origOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.setRequestHeader = function (name, value) {
    if (isAlive() && this.__edartUrl?.includes("api.autodarts.io") && name?.toLowerCase() === "authorization") {
      const token = extractBearerToken(value);
      if (token) saveToken(token, "xhr-intercept");
    }
    return _origSetHeader.apply(this, arguments);
  };

  // --- Layer 3: Scan localStorage/sessionStorage (fallback z v1.5 + deep scan) ---
  function findTokenDeep(value, depth = 0) {
    if (!value || depth > 6) return null;

    if (typeof value === "string") {
      const trimmed = value.trim();
      if (/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(trimmed) && trimmed.length > 50) {
        return trimmed;
      }

      const bearer = trimmed.match(/^Bearer\s+(.+)$/i);
      if (bearer?.[1] && bearer[1].length > 50) return bearer[1].trim();

      const parsed = safeJsonParse(trimmed);
      return parsed ? findTokenDeep(parsed, depth + 1) : null;
    }

    if (typeof value !== "object") return null;

    for (const key of ["access_token", "accessToken", "token", "id_token"]) {
      if (value[key]) {
        const found = findTokenDeep(value[key], depth + 1);
        if (found) return found;
      }
    }

    for (const nested of Object.values(value)) {
      const found = findTokenDeep(nested, depth + 1);
      if (found) return found;
    }

    return null;
  }

  function findUserIdDeep(value, depth = 0) {
    if (!value || depth > 6) return null;

    if (typeof value === "string") {
      const parsed = safeJsonParse(value);
      return parsed ? findUserIdDeep(parsed, depth + 1) : null;
    }

    if (typeof value !== "object") return null;

    for (const key of ["sub", "userId", "user_id", "id"]) {
      if (typeof value[key] === "string" && value[key].length > 6) {
        return value[key];
      }
    }

    for (const nested of Object.values(value)) {
      const found = findUserIdDeep(nested, depth + 1);
      if (found) return found;
    }

    return null;
  }

  function scanStorageForToken() {
    for (const storage of [localStorage, sessionStorage]) {
      try {
        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i);
          if (!key) continue;

          const raw = storage.getItem(key);
          if (!raw) continue;

          const token = findTokenDeep(raw, 0);
          if (token) {
            const parsed = safeJsonParse(raw);
            const userId = findUserIdDeep(parsed ?? raw, 0);
            return {
              token,
              userId: typeof userId === "string" ? userId : null,
              sourceKey: key,
            };
          }
        }
      } catch {
        // ignore storage access errors
      }
    }

    return null;
  }

  // --- Layer 4: Page-context bridge (injected script) ---
  function injectPageBridge() {
    try {
      const code = `(function() {
        if (window.__EDART_BRIDGE__) return;
        window.__EDART_BRIDGE__ = true;

        var post = function(data) { window.postMessage({ source: "EDART_BRIDGE", ...data }, "*"); };

        // Intercept fetch in page context
        var origFetch = window.fetch;
        window.fetch = function() {
          var url = typeof arguments[0] === "string" ? arguments[0] : (arguments[0] && arguments[0].url) || "";
          var init = arguments[1] || {};

          if (url.indexOf("api.autodarts.io") !== -1) {
            var auth = null;
            if (init.headers) {
              if (init.headers instanceof Headers) auth = init.headers.get("Authorization");
              else if (typeof init.headers === "object") auth = init.headers["Authorization"] || init.headers["authorization"];
            }
            if (!auth && arguments[0] instanceof Request) {
              try { auth = arguments[0].headers.get("Authorization"); } catch(e) {}
            }
            if (auth) {
              var t = auth.replace(/^Bearer\\s+/i, "").trim();
              if (t.length >= 30) post({ type: "TOKEN", token: t, reason: "page-fetch" });
            }
          }

          var p = origFetch.apply(this, arguments);

          if (url && /api\\.autodarts\\.io\\/as\\/v0\\/matches\\//i.test(url)) {
            p.then(function(res) {
              if (!res.ok) return;
              res.clone().json().then(function(data) {
                if (data) post({ type: "MATCH", match: data, url: url });
              }).catch(function() {});
            }).catch(function() {});
          }

          return p;
        };

        // Intercept XHR in page context
        var origOpen = XMLHttpRequest.prototype.open;
        var origSetH = XMLHttpRequest.prototype.setRequestHeader;
        XMLHttpRequest.prototype.open = function(m, u) { this.__eu = u; return origOpen.apply(this, arguments); };
        XMLHttpRequest.prototype.setRequestHeader = function(n, v) {
          if (this.__eu && this.__eu.indexOf("api.autodarts.io") !== -1 && n && n.toLowerCase() === "authorization") {
            var t = v.replace(/^Bearer\\s+/i, "").trim();
            if (t.length >= 30) post({ type: "TOKEN", token: t, reason: "page-xhr" });
          }
          return origSetH.apply(this, arguments);
        };

        // Scan storage on init
        function scanStorage() {
          try {
            for (var i = 0; i < localStorage.length; i++) {
              var key = localStorage.key(i);
              if (!key) continue;
              var raw = localStorage.getItem(key);
              if (!raw || raw.length < 50) continue;
              try {
                var parsed = JSON.parse(raw);
                if (parsed && parsed.access_token) {
                  post({ type: "TOKEN", token: parsed.access_token, reason: "page-storage:" + key });
                  if (parsed.profile && parsed.profile.sub) {
                    post({ type: "USER_ID", userId: parsed.profile.sub });
                  }
                  return;
                }
              } catch(e) {}
            }
          } catch(e) {}
        }

        scanStorage();
        setTimeout(scanStorage, 2000);
        setTimeout(scanStorage, 5000);
        setTimeout(scanStorage, 10000);
        setInterval(scanStorage, 30000);
      })();`;

      const script = document.createElement("script");
      script.textContent = code;
      (document.documentElement || document.head || document.body).appendChild(script);
      script.remove();
    } catch (e) {
      console.warn("[eDART] Bridge injection failed:", e);
    }
  }

  // Listen for messages from page bridge
  window.addEventListener("message", (event) => {
    if (event.source !== window || event.data?.source !== "EDART_BRIDGE") return;

    if (event.data.type === "TOKEN" && event.data.token) {
      saveToken(event.data.token, event.data.reason || "bridge");
    }

    if (event.data.type === "USER_ID" && event.data.userId) {
      storageSet({ autodarts_user_id: event.data.userId });
      sendMsg({ type: "AUTODARTS_USER_ID_DETECTED", userId: event.data.userId });
      console.log("[eDART] User ID from bridge:", event.data.userId);
    }

    if (event.data.type === "MATCH" && event.data.match) {
      handleMatchData(event.data.match, event.data.url || location.href);
    }
  });

  // ───────────────────────────────────────────────
  // MATCH PROCESSING
  // ───────────────────────────────────────────────

  function normalizeScore(s) {
    if (typeof s === "number") return s;
    if (s && typeof s === "object") return s.legs ?? s.sets ?? s.value ?? 0;
    return 0;
  }

  function isFinished(match) {
    const state = String(match?.state || "").toLowerCase();
    if (["finished", "complete", "completed", "done", "ended"].includes(state)) return true;
    if (typeof match?.winner === "number") return true;
    return false;
  }

  const processedMatches = new Set();
  const notifiedLeague = new Set();

  function handleMatchData(match, sourceUrl) {
    if (!match || !isAlive()) return;
    const matchId = match.id || sourceUrl?.match(/matches\/([a-f0-9-]+)/i)?.[1];
    if (!matchId) return;

    if (isFinished(match)) {
      if (processedMatches.has(matchId)) return;
      processedMatches.add(matchId);

      const payload = buildPayload(match, matchId);
      if (!payload) return;

      storageSet({ autodarts_last_match: payload, autodarts_last_match_timestamp: Date.now() });
      console.log("[eDART] Captured finished match:", matchId, payload.player1_name, "vs", payload.player2_name);

      sendMsg({ type: "AUTO_SUBMIT_LEAGUE_MATCH", payload }, (res) => {
        if (res?.is_league_match && res?.submitted) console.log("[eDART] ✅ Mecz ligowy zgłoszony!");
        else if (res?.already_submitted) console.log("[eDART] ℹ️ Mecz już zgłoszony");
        else if (res?.is_league_match) console.log("[eDART] ⚠️ Mecz ligowy, nie zgłoszony:", res.reason);
        else console.log("[eDART] Mecz towarzyski");
      });
    } else {
      // Live match - notify about league check
      const players = match.players || [];
      if (players.length < 2 || notifiedLeague.has(matchId)) return;
      notifiedLeague.add(matchId);
      const p1 = players[0] || {}, p2 = players[1] || {};
      sendMsg({
        type: "CHECK_LEAGUE_MATCH_LIVE",
        payload: {
          autodarts_match_id: matchId,
          player1_name: p1.name || p1.username || "Player 1",
          player2_name: p2.name || p2.username || "Player 2",
          player1_autodarts_id: p1.userId || p1.user_id || p1.id || null,
          player2_autodarts_id: p2.userId || p2.user_id || p2.id || null,
        },
      });
    }
  }

  function buildPayload(match, fallbackId) {
    const players = match.players || [];
    if (players.length < 2) return null;

    const p1 = players[0] || {}, p2 = players[1] || {};
    const s1 = p1.stats || {}, s2 = p2.stats || {};
    const sc1 = normalizeScore(match.scores?.[0]);
    const sc2 = normalizeScore(match.scores?.[1]);

    return {
      match_id: match.id || fallbackId,
      autodarts_link: `https://play.autodarts.io/history/matches/${match.id || fallbackId}`,
      player1_name: p1.name || p1.username || p1.displayName || "Player 1",
      player2_name: p2.name || p2.username || p2.displayName || "Player 2",
      player1_autodarts_id: p1.userId || p1.user_id || p1.id || null,
      player2_autodarts_id: p2.userId || p2.user_id || p2.id || null,
      score1: sc1, score2: sc2,
      avg1: s1.average ?? s1.avg ?? null,
      avg2: s2.average ?? s2.avg ?? null,
      first_9_avg1: s1.first9Average ?? s1.firstNineAvg ?? null,
      first_9_avg2: s2.first9Average ?? s2.firstNineAvg ?? null,
      one_eighties1: s1.oneEighties ?? s1["180s"] ?? 0,
      one_eighties2: s2.oneEighties ?? s2["180s"] ?? 0,
      high_checkout1: s1.highestCheckout ?? s1.bestCheckout ?? 0,
      high_checkout2: s2.highestCheckout ?? s2.bestCheckout ?? 0,
      ton60_1: s1.ton60 ?? 0, ton60_2: s2.ton60 ?? 0,
      ton80_1: s1.ton80 ?? 0, ton80_2: s2.ton80 ?? 0,
      ton_plus1: s1.tonPlus ?? 0, ton_plus2: s2.tonPlus ?? 0,
      darts_thrown1: s1.dartsThrown ?? 0, darts_thrown2: s2.dartsThrown ?? 0,
      checkout_attempts1: s1.checkoutAttempts ?? 0, checkout_attempts2: s2.checkoutAttempts ?? 0,
      checkout_hits1: s1.checkoutHits ?? 0, checkout_hits2: s2.checkoutHits ?? 0,
      captured_at: Date.now(),
    };
  }

  // ─── History page detection ───
  let lastUrl = location.href;
  const fetchedHistory = new Set();

  function checkHistoryPage() {
    if (!isAlive()) return;
    const url = location.href;
    if (url === lastUrl) return;
    lastUrl = url;
    const m = url.match(/\/history\/matches\/([a-f0-9-]+)/i);
    if (m && !fetchedHistory.has(m[1])) {
      fetchedHistory.add(m[1]);
      safeTimeout(() => fetchMatchFromAPI(m[1]), 1500);
    }
  }

  async function fetchMatchFromAPI(matchId) {
    if (!isAlive()) return;
    const { autodarts_token } = await storageGet(["autodarts_token"]);
    if (!autodarts_token) { console.warn("[eDART] No token for history fetch"); return; }
    try {
      const res = await fetch(`https://api.autodarts.io/as/v0/matches/${matchId}`, {
        headers: { Authorization: `Bearer ${autodarts_token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      handleMatchData(data, `https://play.autodarts.io/history/matches/${matchId}`);
    } catch (e) {
      console.error("[eDART] History fetch error:", e);
    }
  }

  // SPA navigation
  safeInterval(checkHistoryPage, 1000);
  const _pushState = history.pushState;
  history.pushState = function () { _pushState.apply(this, arguments); safeTimeout(checkHistoryPage, 300); };
  const _replaceState = history.replaceState;
  history.replaceState = function () { _replaceState.apply(this, arguments); safeTimeout(checkHistoryPage, 300); };
  window.addEventListener("popstate", () => safeTimeout(checkHistoryPage, 300));

  // ─── Runtime message listener (for background token refresh requests) ───
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type !== "EDART_REFRESH_TOKEN") return false;
    console.log("[eDART] Token refresh requested by background:", msg.reason);

    let responded = false;
    const finish = (payload) => {
      if (responded) return;
      responded = true;
      sendResponse(payload);
    };

    const attempt = (label) => {
      const result = scanStorageForToken();
      if (!result?.token) return false;

      saveToken(result.token, `${label}:${msg.reason || "manual"}`);
      if (result.userId) {
        storageSet({ autodarts_user_id: result.userId });
        sendMsg({ type: "AUTODARTS_USER_ID_DETECTED", userId: result.userId });
      }

      finish({ ok: true, hasToken: true, sourceKey: result.sourceKey || null });
      return true;
    };

    if (attempt("refresh-immediate")) return true;

    const retryDelays = [350, 1200, 2800];
    retryDelays.forEach((delay, index) => {
      safeTimeout(() => {
        if (responded) return;
        const ok = attempt(`refresh-retry-${index + 1}`);
        if (!ok && index === retryDelays.length - 1) {
          finish({ ok: true, hasToken: false });
        }
      }, delay);
    });

    return true;
  });

  // ─── Initial capture ───
  injectPageBridge();

  function doInitialCapture(reason) {
    const result = scanStorageForToken();
    if (result?.token) {
      saveToken(result.token, reason);
      if (result.userId) {
        storageSet({ autodarts_user_id: result.userId });
        sendMsg({ type: "AUTODARTS_USER_ID_DETECTED", userId: result.userId });
      }
    }
  }

  doInitialCapture("startup");
  safeTimeout(() => doInitialCapture("retry-1s"), 1000);
  safeTimeout(() => doInitialCapture("retry-3s"), 3000);
  safeTimeout(() => doInitialCapture("retry-8s"), 8000);
  safeTimeout(() => doInitialCapture("retry-15s"), 15000);

  // Periodic re-scan every 30 seconds
  safeInterval(() => doInitialCapture("interval"), 30000);

  // Listen for storage events (token refresh from another tab)
  window.addEventListener("storage", () => {
    if (!isAlive()) return;
    safeTimeout(() => doInitialCapture("storage-event"), 100);
  });

  checkHistoryPage();
  console.log("[eDART] Content script loaded (v2.2.0)");
})();
