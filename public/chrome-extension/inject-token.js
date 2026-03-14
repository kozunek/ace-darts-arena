// Content script that runs on eDART pages
// Provides token + latest finished match data + league match data to the app
// Reads session from browser storage and syncs it to extension storage

(function () {
  const browserAPI = typeof browser !== "undefined" ? browser : chrome;
  const STORAGE_KEY_PREFIX = "sb-";
  const STORAGE_KEY_SUFFIX = "-auth-token";

  function safeParse(value) {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  function normalizeToken(value) {
    if (typeof value !== "string") return null;
    const token = value.trim().replace(/^Bearer\s+/i, "");
    if (!token || token.length < 32) return null;
    return token;
  }

  function deepFindAccessToken(value, depth = 0) {
    if (value == null || depth > 6) return null;

    if (typeof value === "string") {
      const direct = normalizeToken(value);
      if (direct && direct.includes(".")) return direct;

      const parsed = safeParse(value);
      if (parsed) return deepFindAccessToken(parsed, depth + 1);

      const match = value.match(/"access_token"\s*:\s*"([^"]+)"/i);
      if (match?.[1]) return normalizeToken(match[1]);
      return null;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        const nested = deepFindAccessToken(item, depth + 1);
        if (nested) return nested;
      }
      return null;
    }

    if (typeof value === "object") {
      const preferredKeys = ["access_token", "accessToken", "token", "authToken", "jwt", "bearer"];
      for (const key of preferredKeys) {
        if (key in value) {
          const nested = deepFindAccessToken(value[key], depth + 1);
          if (nested) return nested;
        }
      }

      for (const nestedValue of Object.values(value)) {
        const nested = deepFindAccessToken(nestedValue, depth + 1);
        if (nested) return nested;
      }
    }

    return null;
  }

  function getSessionFromWebStorage() {
    const storages = [localStorage, sessionStorage];

    for (const storage of storages) {
      try {
        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i);
          if (!key) continue;

          const looksLikeSessionKey =
            (key.startsWith(STORAGE_KEY_PREFIX) && key.endsWith(STORAGE_KEY_SUFFIX)) ||
            key.includes("auth-token") ||
            key.includes("supabase.auth.token");

          if (!looksLikeSessionKey) continue;

          const raw = storage.getItem(key);
          if (!raw) continue;

          const parsed = safeParse(raw);
          const token = deepFindAccessToken(parsed ?? raw);
          if (token) return token;
        }
      } catch {
        // ignore storage errors
      }
    }

    return null;
  }

  let lastSyncedToken = null;

  const syncSessionToExtension = (reason = "manual") => {
    const token = getSessionFromWebStorage();

    if (token && token !== lastSyncedToken) {
      lastSyncedToken = token;
      browserAPI.storage.local.set({
        edart_session_token: token,
        edart_session_timestamp: Date.now(),
        edart_session_source: reason,
      });
      console.log(`[eDART inject] Session token synced (${reason})`);
      return;
    }

    if (!token && lastSyncedToken) {
      lastSyncedToken = null;
      browserAPI.storage.local.remove(["edart_session_token", "edart_session_timestamp", "edart_session_source"]);
      console.log("[eDART inject] Session token cleared (logout/session expired)");
    }
  };

  const postToken = () => {
    browserAPI.storage.local.get(["autodarts_token", "token_timestamp"], (result) => {
      window.postMessage(
        {
          type: "EDART_TOKEN_RESPONSE",
          token: result.autodarts_token || null,
          timestamp: result.token_timestamp || null,
          fresh: result.token_timestamp ? Date.now() - result.token_timestamp < 600000 : false,
        },
        "*"
      );
    });
  };

  const postLastMatch = () => {
    browserAPI.storage.local.get(["autodarts_last_match", "autodarts_last_match_timestamp"], (result) => {
      window.postMessage(
        {
          type: "EDART_LAST_MATCH_RESPONSE",
          payload: result.autodarts_last_match || null,
          timestamp: result.autodarts_last_match_timestamp || null,
        },
        "*"
      );
    });
  };

  const postLeagueMatch = () => {
    browserAPI.storage.local.get(["autodarts_league_match", "autodarts_league_match_timestamp"], (result) => {
      window.postMessage(
        {
          type: "EDART_LEAGUE_MATCH_RESPONSE",
          payload: result.autodarts_league_match || null,
          timestamp: result.autodarts_league_match_timestamp || null,
        },
        "*"
      );
    });
  };

  window.addEventListener("message", (event) => {
    if (event.source !== window) return;

    if (event.data?.type === "EDART_REQUEST_TOKEN") postToken();
    if (event.data?.type === "EDART_REQUEST_LAST_MATCH") postLastMatch();
    if (event.data?.type === "EDART_REQUEST_LEAGUE_MATCH") postLeagueMatch();

    // When app signals auth state changed, re-read token from storage
    if (event.data?.type === "EDART_AUTH_STATE_CHANGED") {
      syncSessionToExtension("auth-state-changed");
    }

    // Store eDART user ID for auto-fill functionality
    if (event.data?.type === "EDART_STORE_USER_ID" && event.data?.userId) {
      browserAPI.storage.local.set({ edart_user_id: event.data.userId });
    }
  });

  browserAPI.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") return;

    if (changes.autodarts_last_match) {
      window.postMessage(
        {
          type: "EDART_LAST_MATCH_PUSH",
          payload: changes.autodarts_last_match.newValue || null,
          timestamp: Date.now(),
        },
        "*"
      );
    }

    if (changes.autodarts_league_match) {
      window.postMessage(
        {
          type: "EDART_LEAGUE_MATCH_PUSH",
          payload: changes.autodarts_league_match.newValue || null,
          timestamp: Date.now(),
        },
        "*"
      );
    }

    if (changes.autodarts_token || changes.token_timestamp) {
      postToken();
    }
  });

  // Patch browser storages to catch auth updates immediately
  function patchStorage(storage, storageName) {
    try {
      const originalSetItem = storage.setItem;
      const originalRemoveItem = storage.removeItem;
      const originalClear = storage.clear;

      storage.setItem = function (key, value) {
        originalSetItem.apply(this, arguments);
        if (key && (key.includes("auth") || key.includes("token") || key.startsWith(STORAGE_KEY_PREFIX))) {
          setTimeout(() => syncSessionToExtension(`${storageName}.setItem`), 50);
        }
      };

      storage.removeItem = function (key) {
        originalRemoveItem.apply(this, arguments);
        if (key && (key.includes("auth") || key.includes("token") || key.startsWith(STORAGE_KEY_PREFIX))) {
          setTimeout(() => syncSessionToExtension(`${storageName}.removeItem`), 50);
        }
      };

      storage.clear = function () {
        originalClear.apply(this, arguments);
        setTimeout(() => syncSessionToExtension(`${storageName}.clear`), 50);
      };
    } catch {
      // ignore patch errors
    }
  }

  patchStorage(localStorage, "localStorage");
  patchStorage(sessionStorage, "sessionStorage");

  window.addEventListener("storage", () => {
    syncSessionToExtension("storage-event");
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      syncSessionToExtension("tab-visible");
    }
  });

  window.postMessage({ type: "EDART_EXTENSION_INSTALLED", version: "2.1.0" }, "*");
  postToken();
  postLastMatch();
  postLeagueMatch();

  // Initial session sync + periodic fallback
  syncSessionToExtension("startup");
  setInterval(() => syncSessionToExtension("interval"), 10000);
})();