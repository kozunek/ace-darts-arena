// ─── Inject-token: runs on eDART pages ───
// Syncs Supabase session from web storage to extension storage
// Provides token + match data to the eDART app via window.postMessage

(function () {
  "use strict";
  const browserAPI = typeof browser !== "undefined" ? browser : chrome;
  const SB_PREFIX = "sb-";
  const SB_SUFFIX = "-auth-token";

  function safeParse(v) { try { return JSON.parse(v); } catch { return null; } }

  function findAccessToken(obj, depth) {
    if (!obj || depth > 5) return null;
    if (typeof obj === "string") {
      if (obj.includes(".") && obj.length > 50) return obj;
      const parsed = safeParse(obj);
      return parsed ? findAccessToken(parsed, depth + 1) : null;
    }
    if (typeof obj !== "object") return null;
    for (const key of ["access_token", "accessToken", "token"]) {
      if (obj[key]) {
        const found = findAccessToken(obj[key], depth + 1);
        if (found) return found;
      }
    }
    for (const val of Object.values(obj)) {
      const found = findAccessToken(val, depth + 1);
      if (found) return found;
    }
    return null;
  }

  function getSessionToken() {
    for (const storage of [localStorage, sessionStorage]) {
      try {
        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i);
          if (!key) continue;
          const isAuthKey = (key.startsWith(SB_PREFIX) && key.endsWith(SB_SUFFIX)) ||
            key.includes("auth-token") || key.includes("supabase.auth.token");
          if (!isAuthKey) continue;
          const raw = storage.getItem(key);
          if (!raw) continue;
          const parsed = safeParse(raw);
          const token = findAccessToken(parsed ?? raw, 0);
          if (token) return token;
        }
      } catch { /* ignore */ }
    }
    return null;
  }

  let lastToken = null;

  function syncSession(reason) {
    const token = getSessionToken();
    if (token && token !== lastToken) {
      lastToken = token;
      browserAPI.storage.local.set({
        edart_session_token: token,
        edart_session_timestamp: Date.now(),
        edart_session_source: reason,
      });
      console.log(`[eDART inject] Session synced (${reason})`);
    } else if (!token && lastToken) {
      lastToken = null;
      browserAPI.storage.local.remove(["edart_session_token", "edart_session_timestamp", "edart_session_source"]);
      console.log("[eDART inject] Session cleared");
    }
  }

  // Post token/match data to the page
  const postToken = () => {
    browserAPI.storage.local.get(["autodarts_token", "token_timestamp"], (r) => {
      window.postMessage({
        type: "EDART_TOKEN_RESPONSE",
        token: r.autodarts_token || null,
        timestamp: r.token_timestamp || null,
        fresh: r.token_timestamp ? Date.now() - r.token_timestamp < 600000 : false,
      }, "*");
    });
  };

  const postLastMatch = () => {
    browserAPI.storage.local.get(["autodarts_last_match", "autodarts_last_match_timestamp"], (r) => {
      window.postMessage({ type: "EDART_LAST_MATCH_RESPONSE", payload: r.autodarts_last_match || null, timestamp: r.autodarts_last_match_timestamp || null }, "*");
    });
  };

  const postLeagueMatch = () => {
    browserAPI.storage.local.get(["autodarts_league_match", "autodarts_league_match_timestamp"], (r) => {
      window.postMessage({ type: "EDART_LEAGUE_MATCH_RESPONSE", payload: r.autodarts_league_match || null, timestamp: r.autodarts_league_match_timestamp || null }, "*");
    });
  };

  // Listen for requests from the page
  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    if (event.data?.type === "EDART_REQUEST_TOKEN") postToken();
    if (event.data?.type === "EDART_REQUEST_LAST_MATCH") postLastMatch();
    if (event.data?.type === "EDART_REQUEST_LEAGUE_MATCH") postLeagueMatch();
    if (event.data?.type === "EDART_AUTH_STATE_CHANGED") syncSession("auth-state-changed");
    if (event.data?.type === "EDART_STORE_USER_ID" && event.data?.userId) {
      browserAPI.storage.local.set({ edart_user_id: event.data.userId });
    }
  });

  // Push updates when storage changes
  browserAPI.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (changes.autodarts_last_match) window.postMessage({ type: "EDART_LAST_MATCH_PUSH", payload: changes.autodarts_last_match.newValue, timestamp: Date.now() }, "*");
    if (changes.autodarts_league_match) window.postMessage({ type: "EDART_LEAGUE_MATCH_PUSH", payload: changes.autodarts_league_match.newValue, timestamp: Date.now() }, "*");
    if (changes.autodarts_token || changes.token_timestamp) postToken();
  });

  // Patch storage to catch auth changes immediately
  function patchStorage(storage, name) {
    try {
      const origSet = storage.setItem;
      const origRemove = storage.removeItem;
      const origClear = storage.clear;
      storage.setItem = function (k, v) { origSet.apply(this, arguments); if (k && (k.includes("auth") || k.includes("token") || k.startsWith(SB_PREFIX))) setTimeout(() => syncSession(`${name}.set`), 50); };
      storage.removeItem = function (k) { origRemove.apply(this, arguments); if (k && (k.includes("auth") || k.includes("token"))) setTimeout(() => syncSession(`${name}.remove`), 50); };
      storage.clear = function () { origClear.apply(this, arguments); setTimeout(() => syncSession(`${name}.clear`), 50); };
    } catch { /* ignore */ }
  }

  patchStorage(localStorage, "ls");
  patchStorage(sessionStorage, "ss");

  window.addEventListener("storage", () => syncSession("storage-event"));
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") syncSession("tab-visible"); });

  // Init
  window.postMessage({ type: "EDART_EXTENSION_INSTALLED", version: "2.2.0" }, "*");
  postToken();
  postLastMatch();
  postLeagueMatch();
  syncSession("startup");
  setInterval(() => syncSession("interval"), 10000);
})();
