// ─── Background service worker (MV3) ───
// Imports: config.js, cache.js, api.js, playerConfig.js, notifications.js
// All loaded via manifest importScripts

importScripts("config.js", "cache.js", "playerConfig.js", "notifications.js", "api.js");

const browserAPI = typeof browser !== "undefined" ? browser : chrome;

function storageGetLocal(keys) {
  return new Promise((resolve) => {
    browserAPI.storage.local.get(keys, (result) => resolve(result || {}));
  });
}

function storageRemoveLocal(keys) {
  return new Promise((resolve) => {
    browserAPI.storage.local.remove(keys, resolve);
  });
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestTokenRefreshFromAutodartsTabs(reason = "manual") {
  if (!browserAPI.tabs?.query) return false;

  const tabs = await new Promise((resolve) => {
    browserAPI.tabs.query({ url: ["https://play.autodarts.io/*"] }, (results) => {
      if (browserAPI.runtime.lastError) {
        resolve([]);
        return;
      }
      resolve(results || []);
    });
  });

  if (!tabs.length) return false;

  tabs.forEach((tab) => {
    if (!tab?.id) return;
    browserAPI.tabs.sendMessage(tab.id, { type: "EDART_REFRESH_TOKEN", reason }, () => {
      if (browserAPI.runtime.lastError && CONFIG.DEBUG_MODE) {
        log("Token refresh ping failed:", browserAPI.runtime.lastError.message);
      }
    });
  });

  return true;
}

async function getAutodartsTokenState(forceRefresh = false) {
  let result = await storageGetLocal(["autodarts_token", "token_timestamp", "autodarts_token_source"]);

  const age = Date.now() - (result.token_timestamp || 0);
  const fresh = !!result.autodarts_token && age < CONFIG.TOKEN_FRESH_MS;
  const shouldRefresh = forceRefresh || !fresh;

  if (shouldRefresh) {
    const refreshRequested = await requestTokenRefreshFromAutodartsTabs(
      forceRefresh ? "forced-by-popup" : "missing-or-stale"
    );

    if (refreshRequested) {
      await wait(1200);
      result = await storageGetLocal(["autodarts_token", "token_timestamp", "autodarts_token_source"]);
    }
  }

  const updatedAge = Date.now() - (result.token_timestamp || 0);
  return {
    token: result.autodarts_token || null,
    timestamp: result.token_timestamp || null,
    source: result.autodarts_token_source || null,
    fresh: !!result.autodarts_token && updatedAge < CONFIG.TOKEN_FRESH_MS,
  };
}

// ─── Message listeners ───
browserAPI.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const handler = messageHandlers[message.type];
  if (handler) {
    handler(message, sendResponse);
    return true; // async response
  }
  return false;
});

const messageHandlers = {
  GET_AUTODARTS_TOKEN(message, sendResponse) {
    browserAPI.storage.local.get(["autodarts_token", "token_timestamp"], (result) => {
      const age = Date.now() - (result.token_timestamp || 0);
      sendResponse({
        token: result.autodarts_token || null,
        timestamp: result.token_timestamp || null,
        fresh: age < CONFIG.TOKEN_FRESH_MS,
      });
    });
  },

  CLEAR_TOKEN(message, sendResponse) {
    browserAPI.storage.local.remove(["autodarts_token", "token_timestamp"]);
    sendResponse({ success: true });
  },

  async AUTO_SUBMIT_LEAGUE_MATCH(message, sendResponse) {
    try {
      const result = await handleAutoSubmit(message.payload);
      sendResponse(result);
    } catch (err) {
      logError("Auto-submit failed:", err);
      const p1 = message.payload?.player1_name || "Gracz 1";
      const p2 = message.payload?.player2_name || "Gracz 2";
      Notifications.submissionError(p1, p2, String(err));
      sendResponse({ is_league_match: false, submitted: false, error: String(err) });
    }
  },

  async CHECK_LEAGUE_MATCH_LIVE(message, sendResponse) {
    try {
      const result = await handleLeagueCheck(message.payload);
      sendResponse(result);
    } catch (err) {
      logError("League match check failed:", err);
      sendResponse({ is_league_match: false });
    }
  },

  async AUTODARTS_USER_ID_DETECTED(message, sendResponse) {
    try {
      await saveAutodartsUserId(message.userId);
      sendResponse({ ok: true });
    } catch {
      sendResponse({ ok: false });
    }
  },

  GET_MATCH_HISTORY(message, sendResponse) {
    browserAPI.storage.local.get(["match_history"], (result) => {
      sendResponse({ history: result.match_history || [] });
    });
  },
};

// ─── League check (with notification) ───
async function handleLeagueCheck(payload) {
  const config = await PlayerConfig.get();
  if (!config.showLeagueNotifications) return { is_league_match: false };

  const checkData = await checkLeagueMatch(
    payload.player1_autodarts_id,
    payload.player2_autodarts_id,
    payload.player1_name,
    payload.player2_name
  );

  if (checkData.is_league_match) {
    Notifications.leagueMatchDetected(
      payload.player1_name || "Gracz 1",
      payload.player2_name || "Gracz 2",
      checkData.league_name || "Liga",
      payload.autodarts_match_id
    );
    logAlways("League match detected:", checkData.league_name);
  }

  return checkData;
}

// ─── Auto-submit with dedup + lock ───
async function handleAutoSubmit(matchPayload) {
  const matchId = matchPayload.match_id;
  const p1 = matchPayload.player1_name || "Gracz 1";
  const p2 = matchPayload.player2_name || "Gracz 2";

  // Check player config
  const config = await PlayerConfig.get();
  if (!config.autoSubmitLeagueMatches) {
    log("Auto-submit disabled by player config");
    return { is_league_match: false, submitted: false };
  }

  // Submission lock — prevent duplicate
  if (SubmissionLock.isLocked(matchId)) {
    log("Submission locked for match:", matchId);
    return { is_league_match: true, submitted: false, reason: "Zgłoszenie w trakcie przetwarzania." };
  }
  SubmissionLock.lock(matchId);

  try {
    // Step 1: Check if league match
    const checkData = await checkLeagueMatch(
      matchPayload.player1_autodarts_id,
      matchPayload.player2_autodarts_id,
      matchPayload.player1_name,
      matchPayload.player2_name
    );

    if (!checkData.is_league_match) {
      log("Not a league match");
      SubmissionLock.unlock(matchId);
      return { is_league_match: false, submitted: false };
    }

    logAlways("✅ League match confirmed:", checkData.league_name, "match_id:", checkData.match_id);

    // Step 2: Submit
    const result = await autoSubmitMatch(matchPayload);
    handleSubmitResult(result, matchPayload, checkData);
    saveToMatchHistory(matchPayload, result);
    return result;
  } catch (err) {
    SubmissionLock.unlock(matchId);
    Notifications.submissionError(p1, p2, String(err));
    storeManualFallback(matchPayload, p1, p2);
    throw err;
  }
}

// ─── Handle submission result ───
function handleSubmitResult(result, matchPayload, checkData) {
  const p1 = matchPayload.player1_name || "Gracz 1";
  const p2 = matchPayload.player2_name || "Gracz 2";

  if (result.already_submitted) {
    Notifications.matchAlreadySubmitted(
      p1, p2, result.score,
      result.league_name || checkData?.league_name,
      result.status_text || "Przeciwnik wysłał już wynik meczu. Wynik został zapisany automatycznie."
    );
    storeLeagueMatch(matchPayload, result, true);
    return;
  }

  if (result.is_league_match && result.submitted) {
    Notifications.matchSubmitted(p1, p2, result.score, result.league_name, result.status);
    storeLeagueMatch(matchPayload, result, true);

    // Open eDART after submit if enabled
    PlayerConfig.getSetting("openEdartAfterSubmit").then((shouldOpen) => {
      if (shouldOpen && result.match_id) {
        browserAPI.tabs.create({
          url: `${CONFIG.EDART_URL}/submit-match?match_id=${result.match_id}`,
          active: false,
        });
      }
    });
  } else if (result.is_league_match && !result.submitted) {
    const reason = result.reason || "Wynik nie został wysłany automatycznie.";
    Notifications.manualSubmissionRequired(p1, p2, result.league_name, reason);
    storeLeagueMatch(matchPayload, result, false);
    storeManualFallback(matchPayload, p1, p2, result.match_id);
  }
}

// ─── Storage helpers ───
function storeLeagueMatch(matchPayload, result, autoSubmitted) {
  browserAPI.storage.local.set({
    autodarts_league_match: {
      ...matchPayload,
      edart_match_id: result.match_id,
      league_name: result.league_name,
      auto_submitted: autoSubmitted,
      status: result.status,
      submit_error: autoSubmitted ? null : result.reason,
    },
    autodarts_league_match_timestamp: Date.now(),
  });
}

function storeManualFallback(matchPayload, p1, p2, edartMatchId) {
  browserAPI.storage.local.set({
    edart_manual_fallback: {
      autodarts_link: `https://play.autodarts.io/history/matches/${matchPayload.match_id}`,
      match_id: edartMatchId || null,
      player1_name: p1,
      player2_name: p2,
    },
  });
}

function saveToMatchHistory(matchPayload, result) {
  browserAPI.storage.local.get(["match_history"], (stored) => {
    const history = stored.match_history || [];
    history.unshift({
      matchId: matchPayload.match_id,
      player1: matchPayload.player1_name,
      player2: matchPayload.player2_name,
      score: result.score || `${matchPayload.score1}:${matchPayload.score2}`,
      league: result.league_name || null,
      submitted: result.submitted || false,
      alreadySubmitted: result.already_submitted || false,
      status: result.submitted ? "submitted" : result.already_submitted ? "already_submitted" : "failed",
      timestamp: Date.now(),
    });
    // Keep last 20 matches
    browserAPI.storage.local.set({ match_history: history.slice(0, 20) });
  });
}

// ─── Notification click handlers ───
browserAPI.notifications.onClicked.addListener((notificationId) => {
  if (notificationId.startsWith("league-submitted-") || notificationId.startsWith("league-already-")) {
    browserAPI.storage.local.get(["autodarts_league_match"], (result) => {
      const data = result.autodarts_league_match;
      const url = data?.edart_match_id
        ? `${CONFIG.EDART_URL}/submit-match?match_id=${data.edart_match_id}`
        : `${CONFIG.EDART_URL}/matches`;
      browserAPI.tabs.create({ url, active: true });
    });
    browserAPI.notifications.clear(notificationId);
  } else if (notificationId.startsWith("league-error-") || notificationId.startsWith("league-detected-")) {
    browserAPI.storage.local.get(["edart_manual_fallback"], (result) => {
      const fallback = result.edart_manual_fallback;
      const url = fallback?.autodarts_link
        ? `${CONFIG.EDART_URL}/submit-match?autodarts_link=${encodeURIComponent(fallback.autodarts_link)}`
        : `${CONFIG.EDART_URL}/submit-match`;
      browserAPI.tabs.create({ url, active: true });
    });
    browserAPI.notifications.clear(notificationId);
  }
});

// ─── Token capture from web requests ───
// MV3 requires "extraHeaders" to read Authorization headers
const webRequestOptions = ["requestHeaders"];
try {
  // Chrome MV3 needs extraHeaders for Authorization header access
  browserAPI.webRequest?.onBeforeSendHeaders?.addListener(
    (details) => {
      const authHeader = details.requestHeaders?.find(
        (h) => h.name.toLowerCase() === "authorization"
      );
      if (authHeader?.value?.startsWith("Bearer ")) {
        const token = authHeader.value.replace("Bearer ", "");
        browserAPI.storage.local.set({ autodarts_token: token, token_timestamp: Date.now() });
        log("Token captured via webRequest");
      }
    },
    { urls: ["https://api.autodarts.io/*"] },
    ["requestHeaders", "extraHeaders"]
  );
} catch (e) {
  // Fallback without extraHeaders (Firefox or older Chrome)
  browserAPI.webRequest?.onBeforeSendHeaders?.addListener(
    (details) => {
      const authHeader = details.requestHeaders?.find(
        (h) => h.name.toLowerCase() === "authorization"
      );
      if (authHeader?.value?.startsWith("Bearer ")) {
        const token = authHeader.value.replace("Bearer ", "");
        browserAPI.storage.local.set({ autodarts_token: token, token_timestamp: Date.now() });
        log("Token captured via webRequest (fallback)");
      }
    },
    { urls: ["https://api.autodarts.io/*"] },
    ["requestHeaders"]
  );
}

logAlways(`Background loaded (v${CONFIG.VERSION})`);
