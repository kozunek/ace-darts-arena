// ─── Background service worker (MV3) ───
// Token management, league checks, auto-submit, alarms for refresh

importScripts("config.js", "cache.js", "playerConfig.js", "notifications.js", "api.js");

const browserAPI = typeof browser !== "undefined" ? browser : chrome;

// ─── Storage helpers ───
function storageGetLocal(keys) {
  return new Promise((resolve) => {
    browserAPI.storage.local.get(keys, (r) => resolve(r || {}));
  });
}
function storageSetLocal(data) {
  return new Promise((resolve) => {
    browserAPI.storage.local.set(data, resolve);
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

// ─── Token refresh: ask Autodarts tabs to re-scan ───
async function requestTokenRefreshFromTabs(reason = "manual") {
  if (!browserAPI.tabs?.query) return false;

  const tabs = await new Promise((resolve) => {
    browserAPI.tabs.query({ url: ["https://play.autodarts.io/*"] }, (results) => {
      if (browserAPI.runtime.lastError) resolve([]);
      else resolve(results || []);
    });
  });

  if (!tabs.length) {
    log("No Autodarts tabs found for token refresh");
    return false;
  }

  for (const tab of tabs) {
    if (!tab?.id) continue;
    browserAPI.tabs.sendMessage(tab.id, { type: "EDART_REFRESH_TOKEN", reason }, () => {
      if (browserAPI.runtime.lastError) log("Refresh ping failed for tab", tab.id);
    });
  }

  return true;
}

// ─── Get current token state ───
async function getAutodartsTokenState(forceRefresh = false) {
  let result = await storageGetLocal(["autodarts_token", "token_timestamp", "autodarts_token_source"]);

  const age = Date.now() - (result.token_timestamp || 0);
  const isFresh = !!result.autodarts_token && age < CONFIG.TOKEN_FRESH_MS;
  const isExpired = !result.autodarts_token || age > CONFIG.TOKEN_MAX_AGE_MS;

  if (forceRefresh || isExpired) {
    const sent = await requestTokenRefreshFromTabs(forceRefresh ? "forced" : "expired");
    if (sent) {
      await wait(1500);
      result = await storageGetLocal(["autodarts_token", "token_timestamp", "autodarts_token_source"]);
    }
  }

  const updatedAge = Date.now() - (result.token_timestamp || 0);
  return {
    token: result.autodarts_token || null,
    timestamp: result.token_timestamp || null,
    source: result.autodarts_token_source || null,
    fresh: !!result.autodarts_token && updatedAge < CONFIG.TOKEN_FRESH_MS,
    age: updatedAge,
  };
}

// ─── Message handlers ───
const messageHandlers = {
  async GET_AUTODARTS_TOKEN(message, sendResponse) {
    const state = await getAutodartsTokenState(message?.forceRefresh === true);
    sendResponse(state);
  },

  async CLEAR_TOKEN(_message, sendResponse) {
    await storageRemoveLocal(["autodarts_token", "token_timestamp", "autodarts_token_source"]);
    logAlways("Token cleared");
    sendResponse({ success: true });
  },

  async AUTO_SUBMIT_LEAGUE_MATCH(message, sendResponse) {
    try {
      const result = await handleAutoSubmit(message.payload);
      sendResponse(result);
    } catch (err) {
      logError("Auto-submit failed:", err);
      sendResponse({ is_league_match: false, submitted: false, error: String(err) });
    }
  },

  async CHECK_LEAGUE_MATCH_LIVE(message, sendResponse) {
    try {
      const result = await handleLeagueCheck(message.payload);
      sendResponse(result);
    } catch (err) {
      logError("League check failed:", err);
      sendResponse({ is_league_match: false });
    }
  },

  async AUTODARTS_USER_ID_DETECTED(message, sendResponse) {
    try {
      await saveAutodartsUserId(message.userId);
      sendResponse({ ok: true });
    } catch { sendResponse({ ok: false }); }
  },

  GET_MATCH_HISTORY(_message, sendResponse) {
    browserAPI.storage.local.get(["match_history"], (result) => {
      sendResponse({ history: result.match_history || [] });
    });
  },

  async GET_LEAGUES(_message, sendResponse) {
    try {
      const leagues = await fetchLeagues();
      sendResponse({ leagues });
    } catch (err) {
      logError("Fetch leagues failed:", err);
      sendResponse({ leagues: [], error: String(err) });
    }
  },

  async GET_LEAGUE_MATCHES(message, sendResponse) {
    try {
      const matches = await fetchLeagueMatches(message.leagueId);
      sendResponse({ matches });
    } catch (err) {
      logError("Fetch matches failed:", err);
      sendResponse({ matches: [], error: String(err) });
    }
  },
};

browserAPI.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const handler = messageHandlers[message.type];
  if (handler) {
    handler(message, sendResponse);
    return true;
  }
  return false;
});

// ─── Fetch leagues from eDART API ───
async function fetchLeagues() {
  const cached = Cache.get("leagues");
  if (cached) return cached;

  const stored = await storageGetLocal(["edart_session_token"]);
  const res = await callSupabase("check-league-match", {
    action: "list_leagues",
  }, stored.edart_session_token);

  // Fallback: directly query supabase
  if (!res?.leagues) {
    const directRes = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/leagues?is_active=eq.true&select=id,name,season,league_type,is_active`, {
      headers: {
        "apikey": CONFIG.SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
      },
    });
    if (directRes.ok) {
      const leagues = await directRes.json();
      Cache.set("leagues", leagues, 300000);
      return leagues;
    }
  }

  const leagues = res?.leagues || [];
  Cache.set("leagues", leagues, 300000);
  return leagues;
}

// ─── Fetch matches for a league ───
async function fetchLeagueMatches(leagueId) {
  if (!leagueId) return [];

  const cacheKey = `league-matches:${leagueId}`;
  const cached = Cache.get(cacheKey);
  if (cached) return cached;

  const directRes = await fetch(
    `${CONFIG.SUPABASE_URL}/rest/v1/matches?league_id=eq.${leagueId}&select=id,player1_id,player2_id,score1,score2,status,date,avg1,avg2&order=date.desc&limit=50`,
    {
      headers: {
        "apikey": CONFIG.SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
      },
    }
  );

  if (!directRes.ok) throw new Error(`HTTP ${directRes.status}`);
  const matches = await directRes.json();
  Cache.set(cacheKey, matches, 120000);
  return matches;
}

// ─── League check ───
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

  const config = await PlayerConfig.get();
  if (!config.autoSubmitLeagueMatches) {
    log("Auto-submit disabled by config");
    return { is_league_match: false, submitted: false };
  }

  if (SubmissionLock.isLocked(matchId)) {
    log("Submission locked:", matchId);
    return { is_league_match: true, submitted: false, reason: "Zgłoszenie w trakcie." };
  }
  SubmissionLock.lock(matchId);

  try {
    const checkData = await checkLeagueMatch(
      matchPayload.player1_autodarts_id,
      matchPayload.player2_autodarts_id,
      matchPayload.player1_name,
      matchPayload.player2_name
    );

    if (!checkData.is_league_match) {
      SubmissionLock.unlock(matchId);
      return { is_league_match: false, submitted: false };
    }

    logAlways("✅ League match confirmed:", checkData.league_name);

    // Submit with retry
    let result;
    let retries = 0;
    while (retries < 3) {
      try {
        result = await autoSubmitMatch(matchPayload);
        break;
      } catch (err) {
        retries++;
        logError(`Submit attempt ${retries} failed:`, err);
        if (retries < 3) await wait(2000 * retries);
        else throw err;
      }
    }

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

function handleSubmitResult(result, matchPayload, checkData) {
  const p1 = matchPayload.player1_name || "Gracz 1";
  const p2 = matchPayload.player2_name || "Gracz 2";

  if (result.already_submitted) {
    Notifications.matchAlreadySubmitted(p1, p2, result.score, result.league_name || checkData?.league_name);
    storeLeagueMatch(matchPayload, result, true);
    return;
  }

  if (result.is_league_match && result.submitted) {
    Notifications.matchSubmitted(p1, p2, result.score, result.league_name, result.status);
    storeLeagueMatch(matchPayload, result, true);
    PlayerConfig.getSetting("openEdartAfterSubmit").then((open) => {
      if (open && result.match_id) {
        browserAPI.tabs.create({
          url: `${CONFIG.EDART_URL}/submit-match?match_id=${result.match_id}`,
          active: false,
        });
      }
    });
  } else if (result.is_league_match && !result.submitted) {
    Notifications.manualSubmissionRequired(p1, p2, result.league_name, result.reason || "Nie wysłano automatycznie.");
    storeLeagueMatch(matchPayload, result, false);
    storeManualFallback(matchPayload, p1, p2, result.match_id);
  }
}

// ─── Storage helpers ───
function storeLeagueMatch(payload, result, auto) {
  browserAPI.storage.local.set({
    autodarts_league_match: { ...payload, edart_match_id: result.match_id, league_name: result.league_name, auto_submitted: auto, status: result.status },
    autodarts_league_match_timestamp: Date.now(),
  });
}

function storeManualFallback(payload, p1, p2, edartMatchId) {
  browserAPI.storage.local.set({
    edart_manual_fallback: {
      autodarts_link: `https://play.autodarts.io/history/matches/${payload.match_id}`,
      match_id: edartMatchId || null,
      player1_name: p1, player2_name: p2,
    },
  });
}

function saveToMatchHistory(payload, result) {
  browserAPI.storage.local.get(["match_history"], (stored) => {
    const history = stored.match_history || [];
    history.unshift({
      matchId: payload.match_id,
      player1: payload.player1_name,
      player2: payload.player2_name,
      score: result.score || `${payload.score1}:${payload.score2}`,
      league: result.league_name || null,
      submitted: result.submitted || false,
      alreadySubmitted: result.already_submitted || false,
      status: result.submitted ? "submitted" : result.already_submitted ? "already_submitted" : "failed",
      timestamp: Date.now(),
    });
    browserAPI.storage.local.set({ match_history: history.slice(0, 20) });
  });
}

// ─── Notification click handlers ───
browserAPI.notifications.onClicked.addListener((id) => {
  if (id.startsWith("league-submitted-") || id.startsWith("league-already-")) {
    browserAPI.storage.local.get(["autodarts_league_match"], (r) => {
      const d = r.autodarts_league_match;
      const url = d?.edart_match_id ? `${CONFIG.EDART_URL}/submit-match?match_id=${d.edart_match_id}` : `${CONFIG.EDART_URL}/matches`;
      browserAPI.tabs.create({ url, active: true });
    });
    browserAPI.notifications.clear(id);
  } else if (id.startsWith("league-error-") || id.startsWith("league-detected-")) {
    browserAPI.storage.local.get(["edart_manual_fallback"], (r) => {
      const fb = r.edart_manual_fallback;
      const url = fb?.autodarts_link
        ? `${CONFIG.EDART_URL}/submit-match?autodarts_link=${encodeURIComponent(fb.autodarts_link)}`
        : `${CONFIG.EDART_URL}/submit-match`;
      browserAPI.tabs.create({ url, active: true });
    });
    browserAPI.notifications.clear(id);
  }
});

// ─── Token capture via webRequest ───
try {
  browserAPI.webRequest?.onBeforeSendHeaders?.addListener(
    (details) => {
      const auth = details.requestHeaders?.find((h) => h.name.toLowerCase() === "authorization");
      if (auth?.value?.startsWith("Bearer ")) {
        const token = auth.value.substring(7);
        if (token.length >= 30) {
          browserAPI.storage.local.set({
            autodarts_token: token,
            token_timestamp: Date.now(),
            autodarts_token_source: "webRequest",
          });
          log("Token captured via webRequest");
        }
      }
    },
    { urls: ["https://api.autodarts.io/*"] },
    ["requestHeaders", "extraHeaders"]
  );
} catch {
  // Fallback without extraHeaders (Firefox)
  try {
    browserAPI.webRequest?.onBeforeSendHeaders?.addListener(
      (details) => {
        const auth = details.requestHeaders?.find((h) => h.name.toLowerCase() === "authorization");
        if (auth?.value?.startsWith("Bearer ")) {
          const token = auth.value.substring(7);
          if (token.length >= 30) {
            browserAPI.storage.local.set({
              autodarts_token: token,
              token_timestamp: Date.now(),
              autodarts_token_source: "webRequest-fallback",
            });
          }
        }
      },
      { urls: ["https://api.autodarts.io/*"] },
      ["requestHeaders"]
    );
  } catch (e) {
    logError("webRequest listener failed:", e);
  }
}

// ─── Alarms: periodic token refresh ───
browserAPI.alarms?.create?.("edart-token-refresh", {
  periodInMinutes: CONFIG.TOKEN_REFRESH_ALARM_MIN,
});

browserAPI.alarms?.onAlarm?.addListener?.((alarm) => {
  if (alarm.name === "edart-token-refresh") {
    log("Alarm: token refresh");
    requestTokenRefreshFromTabs("alarm");
  }
});

// ─── Lifecycle events ───
browserAPI.runtime.onInstalled?.addListener(() => {
  logAlways("Extension installed/updated");
  requestTokenRefreshFromTabs("installed");
});

browserAPI.runtime.onStartup?.addListener(() => {
  logAlways("Browser startup");
  requestTokenRefreshFromTabs("startup");
});

browserAPI.tabs?.onUpdated?.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete" || !tab?.url?.startsWith("https://play.autodarts.io/")) return;
  browserAPI.tabs.sendMessage(tabId, { type: "EDART_REFRESH_TOKEN", reason: "tab-loaded" }, () => {
    if (browserAPI.runtime.lastError) log("Tab refresh failed:", browserAPI.runtime.lastError.message);
  });
});

logAlways(`Background loaded (v${CONFIG.VERSION})`);
