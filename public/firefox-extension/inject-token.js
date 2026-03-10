// Content script that runs on eDART pages
// Provides token + latest finished match data + league match data to the app
// Reads session from localStorage directly instead of receiving via postMessage

(function () {
  const browserAPI = typeof browser !== "undefined" ? browser : chrome;

  const STORAGE_KEY_PREFIX = "sb-";
  const STORAGE_KEY_SUFFIX = "-auth-token";

  // Read eDART/Supabase session from localStorage
  const getSessionFromLocalStorage = () => {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_KEY_PREFIX) && key.endsWith(STORAGE_KEY_SUFFIX)) {
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            return parsed?.access_token || null;
          }
        }
      }
    } catch (e) {
      // Ignore parse errors
    }
    return null;
  };

  // Sync session token to extension storage whenever it changes
  const syncSessionToExtension = () => {
    const token = getSessionFromLocalStorage();
    if (token) {
      chrome.storage.local.set({
        edart_session_token: token,
        edart_session_timestamp: Date.now(),
      });
    }
  };

  const postToken = () => {
    chrome.storage.local.get(["autodarts_token", "token_timestamp"], (result) => {
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
    chrome.storage.local.get(["autodarts_last_match", "autodarts_last_match_timestamp"], (result) => {
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
    chrome.storage.local.get(["autodarts_league_match", "autodarts_league_match_timestamp"], (result) => {
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
    if (event.data?.type === "EDART_REQUEST_TOKEN") postToken();
    if (event.data?.type === "EDART_REQUEST_LAST_MATCH") postLastMatch();
    if (event.data?.type === "EDART_REQUEST_LEAGUE_MATCH") postLeagueMatch();
    // When app signals auth state changed, re-read token from localStorage
    if (event.data?.type === "EDART_AUTH_STATE_CHANGED") syncSessionToExtension();
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
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

  window.postMessage({ type: "EDART_EXTENSION_INSTALLED", version: "1.5.0" }, "*");
  postToken();
  postLastMatch();
  postLeagueMatch();

  // Initial session sync from localStorage
  syncSessionToExtension();

  // Store eDART user ID for auto-fill functionality
  window.addEventListener("message", (event) => {
    if (event.data?.type === "EDART_STORE_USER_ID" && event.data?.userId) {
      chrome.storage.local.set({ edart_user_id: event.data.userId });
    }
  });
})();
