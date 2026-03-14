// ─── Background service worker (MV3) ───
// Token management, league checks, auto-submit, alarms for refresh

importScripts("config.js", "cache.js", "playerConfig.js", "notifications.js", "api.js");

(function () {
  "use strict";

  const bAPI = typeof browser !== "undefined" ? browser : chrome;

  // ─── Storage helpers ───
  function storageGetLocal(keys) {
    return new Promise((resolve) => {
      bAPI.storage.local.get(keys, (r) => resolve(r || {}));
    });
  }

  function storageSetLocal(data) {
    return new Promise((resolve) => {
      bAPI.storage.local.set(data, resolve);
    });
  }

  function storageRemoveLocal(keys) {
    return new Promise((resolve) => {
      bAPI.storage.local.remove(keys, resolve);
    });
  }

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function isUuid(value) {
    return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }

  // ─── Token refresh: ask Autodarts tabs to re-scan ───
  async function requestTokenRefreshFromTabs(reason = "manual") {
    if (!bAPI.tabs?.query) return false;

    const tabs = await new Promise((resolve) => {
      bAPI.tabs.query({ url: ["https://play.autodarts.io/*"] }, (results) => {
        if (bAPI.runtime.lastError) resolve([]);
        else resolve(results || []);
      });
    });

    if (!tabs.length) {
      log("No Autodarts tabs found for token refresh");
      return false;
    }

    for (const tab of tabs) {
      if (!tab?.id) continue;
      bAPI.tabs.sendMessage(tab.id, { type: "EDART_REFRESH_TOKEN", reason }, () => {
        if (bAPI.runtime.lastError) log("Refresh ping failed for tab", tab.id);
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
        await wait(1700);
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

  async function fetchLeagues() {
    const cached = Cache.get("leagues");
    if (cached) return cached;

    const stored = await storageGetLocal(["edart_session_token"]);
    const res = await callSupabase("check-league-match", {
      action: "list_leagues",
    }, stored.edart_session_token);

    // Fallback: directly query backend table
    if (!res?.leagues) {
      const directRes = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/leagues?is_active=eq.true&select=id,name,season,league_type,is_active&order=name.asc`, {
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

  async function fetchLeagueMatches(leagueId) {
    if (!isUuid(leagueId)) return [];

    const cacheKey = `league-matches:${leagueId}`;
    const cached = Cache.get(cacheKey);
    if (cached) return cached;

    const directRes = await fetch(
      `${CONFIG.SUPABASE_URL}/rest/v1/matches?league_id=eq.${leagueId}&select=id,player1_id,player2_id,score1,score2,status,date,avg1,avg2&order=date.desc&limit=80`,
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

  async function warmBootstrapData() {
    try {
      const leagues = await fetchLeagues();
      const stored = await storageGetLocal(["selected_league_id"]);
      const selectedLeagueId = isUuid(stored.selected_league_id)
        ? stored.selected_league_id
        : leagues?.[0]?.id || null;

      const matches = selectedLeagueId ? await fetchLeagueMatches(selectedLeagueId) : [];

      await storageSetLocal({
        extension_bootstrap: {
          leagues,
          selectedLeagueId,
          matches,
          timestamp: Date.now(),
        },
      });
    } catch (err) {
      logError("Warm bootstrap failed:", err);
    }
  }

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
      // Przed akcją wymagającą auth próbujemy mieć świeży token Autodarts
      const tokenState = await getAutodartsTokenState(false);
      if (!tokenState.token || !tokenState.fresh) {
        await getAutodartsTokenState(true);
      }

      const checkData = await checkLeagueMatch(
        matchPayload.player1_autodarts_id,
        matchPayload.player2_autodarts_id,
        matchPayload.player1_name,
        matchPayload.player2_name
      );

      if (!checkData.is_league_match) {
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
          retries += 1;
          logError(`Submit attempt ${retries} failed:`, err);

          // Przy 401/403 spróbuj wymusić odświeżenie tokenu i ponowić
          const errText = String(err || "");
          if (/401|403/.test(errText)) {
            await getAutodartsTokenState(true);
          }

          if (retries < 3) await wait(2000 * retries);
          else throw err;
        }
      }

      handleSubmitResult(result, matchPayload, checkData);
      saveToMatchHistory(matchPayload, result);
      return result;
    } catch (err) {
      Notifications.submissionError(p1, p2, String(err));
      storeManualFallback(matchPayload, p1, p2);
      throw err;
    } finally {
      SubmissionLock.unlock(matchId);
    }
  }

  function handleSubmitResult(result, matchPayload, checkData) {
    const p1 = matchPayload.player1_name || "Gracz 1";
    const p2 = matchPayload.player2_name || "Gracz 2";

    if (result?.already_submitted) {
      Notifications.matchAlreadySubmitted(p1, p2, result.score, result.league_name || checkData?.league_name);
      storeLeagueMatch(matchPayload, result, true);
      return;
    }

    if (result?.is_league_match && result?.submitted) {
      Notifications.matchSubmitted(p1, p2, result.score, result.league_name, result.status);
      storeLeagueMatch(matchPayload, result, true);
      PlayerConfig.getSetting("openEdartAfterSubmit").then((open) => {
        if (open && result.match_id) {
          bAPI.tabs.create({
            url: `${CONFIG.EDART_URL}/submit-match?match_id=${result.match_id}`,
            active: false,
          });
        }
      });
    } else if (result?.is_league_match && !result?.submitted) {
      Notifications.manualSubmissionRequired(p1, p2, result.league_name, result.reason || "Nie wysłano automatycznie.");
      storeLeagueMatch(matchPayload, result, false);
      storeManualFallback(matchPayload, p1, p2, result.match_id);
    }
  }

  // ─── Storage helpers ───
  function storeLeagueMatch(payload, result, auto) {
    bAPI.storage.local.set({
      autodarts_league_match: {
        ...payload,
        edart_match_id: result.match_id,
        league_name: result.league_name,
        auto_submitted: auto,
        status: result.status,
      },
      autodarts_league_match_timestamp: Date.now(),
    });
  }

  function storeManualFallback(payload, p1, p2, edartMatchId) {
    bAPI.storage.local.set({
      edart_manual_fallback: {
        autodarts_link: `https://play.autodarts.io/history/matches/${payload.match_id}`,
        match_id: edartMatchId || null,
        player1_name: p1,
        player2_name: p2,
      },
    });
  }

  function saveToMatchHistory(payload, result) {
    bAPI.storage.local.get(["match_history"], (stored) => {
      const history = stored.match_history || [];
      history.unshift({
        matchId: payload.match_id,
        player1: payload.player1_name,
        player2: payload.player2_name,
        score: result?.score || `${payload.score1}:${payload.score2}`,
        league: result?.league_name || null,
        submitted: result?.submitted || false,
        alreadySubmitted: result?.already_submitted || false,
        status: result?.submitted
          ? "submitted"
          : result?.already_submitted
            ? "already_submitted"
            : "failed",
        timestamp: Date.now(),
      });
      bAPI.storage.local.set({ match_history: history.slice(0, 30) });
    });
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
      } catch {
        sendResponse({ ok: false });
      }
    },

    GET_MATCH_HISTORY(_message, sendResponse) {
      bAPI.storage.local.get(["match_history"], (result) => {
        sendResponse({ history: result.match_history || [] });
      });
    },

    async GET_LEAGUES(_message, sendResponse) {
      try {
        const leagues = await fetchLeagues();
        await warmBootstrapData();
        sendResponse({ leagues });
      } catch (err) {
        const bootstrap = await storageGetLocal(["extension_bootstrap"]);
        sendResponse({
          leagues: bootstrap.extension_bootstrap?.leagues || [],
          error: String(err),
        });
      }
    },

    async GET_LEAGUE_MATCHES(message, sendResponse) {
      try {
        if (!isUuid(message.leagueId)) {
          sendResponse({ matches: [], error: "Nieprawidłowy identyfikator ligi" });
          return;
        }

        const matches = await fetchLeagueMatches(message.leagueId);
        await storageSetLocal({ selected_league_id: message.leagueId });
        sendResponse({ matches });
      } catch (err) {
        logError("Fetch matches failed:", err);
        sendResponse({ matches: [], error: String(err) });
      }
    },

    async GET_EXTENSION_BOOTSTRAP(_message, sendResponse) {
      try {
        const token = await getAutodartsTokenState(false);
        const stored = await storageGetLocal(["extension_bootstrap"]);
        const bootstrap = stored.extension_bootstrap;

        const isStale = !bootstrap?.timestamp || Date.now() - bootstrap.timestamp > 2 * 60 * 1000;
        if (isStale) {
          await warmBootstrapData();
        }

        const refreshed = await storageGetLocal(["extension_bootstrap"]);
        sendResponse({ token, bootstrap: refreshed.extension_bootstrap || null });
      } catch (err) {
        sendResponse({ token: null, bootstrap: null, error: String(err) });
      }
    },
  };

  bAPI.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    const handler = messageHandlers[message?.type];
    if (!handler) return false;

    handler(message, sendResponse);
    return true;
  });

  // ─── Notification click handlers ───
  bAPI.notifications.onClicked.addListener((id) => {
    if (id.startsWith("league-submitted-") || id.startsWith("league-already-")) {
      bAPI.storage.local.get(["autodarts_league_match"], (r) => {
        const d = r.autodarts_league_match;
        const url = d?.edart_match_id
          ? `${CONFIG.EDART_URL}/submit-match?match_id=${d.edart_match_id}`
          : `${CONFIG.EDART_URL}/matches`;
        bAPI.tabs.create({ url, active: true });
      });
      bAPI.notifications.clear(id);
    } else if (id.startsWith("league-error-") || id.startsWith("league-detected-")) {
      bAPI.storage.local.get(["edart_manual_fallback"], (r) => {
        const fb = r.edart_manual_fallback;
        const url = fb?.autodarts_link
          ? `${CONFIG.EDART_URL}/submit-match?autodarts_link=${encodeURIComponent(fb.autodarts_link)}`
          : `${CONFIG.EDART_URL}/submit-match`;
        bAPI.tabs.create({ url, active: true });
      });
      bAPI.notifications.clear(id);
    }
  });

  // ─── Token capture via webRequest ───
  try {
    bAPI.webRequest?.onBeforeSendHeaders?.addListener(
      (details) => {
        const auth = details.requestHeaders?.find((h) => h.name.toLowerCase() === "authorization");
        if (auth?.value?.startsWith("Bearer ")) {
          const token = auth.value.substring(7);
          if (token.length >= 30) {
            bAPI.storage.local.set({
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
    // Fallback without extraHeaders (Firefox compatibility path)
    try {
      bAPI.webRequest?.onBeforeSendHeaders?.addListener(
        (details) => {
          const auth = details.requestHeaders?.find((h) => h.name.toLowerCase() === "authorization");
          if (auth?.value?.startsWith("Bearer ")) {
            const token = auth.value.substring(7);
            if (token.length >= 30) {
              bAPI.storage.local.set({
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
  bAPI.alarms?.create?.("edart-token-refresh", {
    periodInMinutes: CONFIG.TOKEN_REFRESH_ALARM_MIN,
  });

  bAPI.alarms?.onAlarm?.addListener?.((alarm) => {
    if (alarm.name === "edart-token-refresh") {
      log("Alarm: token refresh");
      requestTokenRefreshFromTabs("alarm");
      warmBootstrapData();
    }
  });

  // ─── Lifecycle events ───
  bAPI.runtime.onInstalled?.addListener(() => {
    logAlways("Extension installed/updated");
    requestTokenRefreshFromTabs("installed");
    warmBootstrapData();
  });

  bAPI.runtime.onStartup?.addListener(() => {
    logAlways("Browser startup");
    requestTokenRefreshFromTabs("startup");
    warmBootstrapData();
  });

  bAPI.tabs?.onUpdated?.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status !== "complete" || !tab?.url?.startsWith("https://play.autodarts.io/")) return;
    bAPI.tabs.sendMessage(tabId, { type: "EDART_REFRESH_TOKEN", reason: "tab-loaded" }, () => {
      if (bAPI.runtime.lastError) log("Tab refresh failed:", bAPI.runtime.lastError.message);
    });
  });

  // Warm cache shortly after SW boot
  wait(1200).then(() => warmBootstrapData());

  logAlways(`Background loaded (v${CONFIG.VERSION})`);
})();
