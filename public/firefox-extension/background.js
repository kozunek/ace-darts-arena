// Background script for Firefox (MV2)
const browserAPI = typeof browser !== "undefined" ? browser : chrome;
const EDART_URL = "https://ace-darts-arena.lovable.app";
const SUPABASE_URL = "https://uiolhzctnbskdjteufkj.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpb2xoemN0bmJza2RqdGV1ZmtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MTc4NjEsImV4cCI6MjA4ODQ5Mzg2MX0.SEGOONfttWCS7jbacT5NxlbiOGSxmrVRp4DFqQRDYkk";

browserAPI.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_AUTODARTS_TOKEN') {
    browserAPI.storage.local.get(['autodarts_token', 'token_timestamp']).then((result) => {
      sendResponse({
        token: result.autodarts_token || null,
        timestamp: result.token_timestamp || null,
        fresh: result.token_timestamp ? (Date.now() - result.token_timestamp < 300000) : false
      });
    });
    return true;
  }

  if (message.type === 'CLEAR_TOKEN') {
    browserAPI.storage.local.remove(['autodarts_token', 'token_timestamp']);
    sendResponse({ success: true });
    return true;
  }

  if (message.type === 'AUTO_SUBMIT_LEAGUE_MATCH') {
    autoSubmitLeagueMatch(message.payload)
      .then((result) => {
        sendResponse(result);
        handleAutoSubmitResult(result, message.payload);
      })
      .catch((err) => {
        console.error("[eDART] Auto-submit failed:", err);
        const errorResult = { is_league_match: false, submitted: false, error: String(err) };
        sendResponse(errorResult);
        showManualFallbackNotification(message.payload, String(err));
      });
    return true;
  }

  if (message.type === 'CHECK_LEAGUE_MATCH_LIVE') {
    checkLeagueMatchLive(message.payload)
      .then((result) => sendResponse(result))
      .catch(() => sendResponse({ is_league_match: false }));
    return true;
  }

  if (message.type === 'LIVE_MATCH_UPDATE') {
    handleLiveMatchUpdate(message.payload)
      .then(() => sendResponse({ ok: true }))
      .catch((err) => {
        console.error("[eDART] Live match update failed:", err);
        sendResponse({ ok: false });
      });
    return true;
  }

  if (message.type === 'LIVE_MATCH_ENDED') {
    handleLiveMatchEnded(message.matchId)
      .then(() => sendResponse({ ok: true }))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }

  if (message.type === 'AUTODARTS_USER_ID_DETECTED') {
    saveAutodartsUserId(message.userId)
      .then(() => sendResponse({ ok: true }))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }
});

async function checkLeagueMatchLive(payload) {
  try {
    const stored = await browserAPI.storage.local.get(["edart_session_token"]);
    const edartToken = stored.edart_session_token || null;
    const authToken = edartToken || SUPABASE_ANON_KEY;

    const checkRes = await fetch(`${SUPABASE_URL}/functions/v1/check-league-match`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        player1_autodarts_id: payload.player1_autodarts_id,
        player2_autodarts_id: payload.player2_autodarts_id,
        player1_name: payload.player1_name,
        player2_name: payload.player2_name,
      }),
    });

    if (!checkRes.ok) return { is_league_match: false };
    const checkData = await checkRes.json();

    if (checkData.is_league_match) {
      const p1 = payload.player1_name || "Gracz 1";
      const p2 = payload.player2_name || "Gracz 2";

      browserAPI.notifications.create(`league-live-${payload.autodarts_match_id}`, {
        type: "basic",
        iconUrl: "icon128.png",
        title: "🎯 Mecz ligowy rozpoczęty!",
        message: `${p1} vs ${p2}\n${checkData.league_name || "Liga"}\nWynik zostanie wysłany automatycznie po zakończeniu meczu.`,
      });
    }

    return checkData;
  } catch (err) {
    console.error("[eDART] Check league match error:", err);
    return { is_league_match: false };
  }
}

function showManualFallbackNotification(matchPayload, errorMsg) {
  const p1 = matchPayload?.player1_name || "Gracz 1";
  const p2 = matchPayload?.player2_name || "Gracz 2";
  const matchId = matchPayload?.match_id || "";

  browserAPI.storage.local.set({
    edart_manual_fallback: {
      autodarts_link: `https://play.autodarts.io/history/matches/${matchId}`,
      player1_name: p1,
      player2_name: p2,
    }
  });

  browserAPI.notifications.create(`league-error-${Date.now()}`, {
    type: "basic",
    iconUrl: "icon128.png",
    title: "⚠️ Błąd wysyłania wyniku",
    message: `${p1} vs ${p2}\nNie udało się automatycznie wysłać wyniku.\nKliknij aby wprowadzić wynik ręcznie.`,
  });
}

async function handleLiveMatchUpdate(payload) {
  try {
    const stored = await browserAPI.storage.local.get(["edart_session_token"]);
    const edartToken = stored.edart_session_token || null;
    const authToken = edartToken || SUPABASE_ANON_KEY;

    const checkRes = await fetch(`${SUPABASE_URL}/functions/v1/check-league-match`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        player1_autodarts_id: payload.player1_autodarts_id,
        player2_autodarts_id: payload.player2_autodarts_id,
        player1_name: payload.player1_name,
        player2_name: payload.player2_name,
      }),
    });

    if (!checkRes.ok) return;
    const checkData = await checkRes.json();
    if (!checkData.is_league_match) return;

    if (!edartToken) {
      console.warn("[eDART] No session token for live match update — user must be logged in");
      return;
    }

    await fetch(`${SUPABASE_URL}/rest/v1/live_matches`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${edartToken}`,
        "Prefer": "resolution=merge-duplicates",
      },
      body: JSON.stringify({
        autodarts_match_id: payload.autodarts_match_id,
        autodarts_link: payload.autodarts_link,
        match_id: checkData.match_id || null,
        player1_score: payload.player1_score || 0,
        player2_score: payload.player2_score || 0,
        updated_at: new Date().toISOString(),
      }),
    });

    console.log("[eDART] Live match updated:", payload.autodarts_match_id);
  } catch (err) {
    console.error("[eDART] Live match update error:", err);
  }
}

async function handleLiveMatchEnded(autodartsMatchId) {
  try {
    const stored = await browser.storage.local.get(["edart_session_token"]);
    const edartToken = stored.edart_session_token || null;
    const authToken = edartToken || SUPABASE_ANON_KEY;

    await fetch(`${SUPABASE_URL}/functions/v1/check-league-match`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        action: "end_live_match",
        autodarts_match_id: autodartsMatchId,
      }),
    });
    console.log("[eDART] Live match ended:", autodartsMatchId);
  } catch (err) {
    console.error("[eDART] Live match end error:", err);
  }
}

async function saveAutodartsUserId(autodartsUserId) {
  try {
    const stored = await browserAPI.storage.local.get(["edart_user_id", "autodarts_id_saved"]);

    if (stored.autodarts_id_saved === autodartsUserId) return;

    const edartUserId = stored.edart_user_id;
    if (!edartUserId) {
      console.log("[eDART] No eDART user ID stored, skipping autodarts ID save");
      return;
    }

    await fetch(`${SUPABASE_URL}/rest/v1/players?user_id=eq.${edartUserId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        "Prefer": "return=minimal",
      },
      body: JSON.stringify({ autodarts_user_id: autodartsUserId }),
    });

    await browserAPI.storage.local.set({ autodarts_id_saved: autodartsUserId });
    console.log("[eDART] ✅ Autodarts User ID saved to eDART:", autodartsUserId);

    browserAPI.notifications.create(`autodarts-id-${Date.now()}`, {
      type: "basic",
      iconUrl: "icon128.png",
      title: "🎯 Autodarts ID zapisane!",
      message: `Twój Autodarts User ID został automatycznie powiązany z kontem eDART.`,
    });
  } catch (err) {
    console.error("[eDART] Save autodarts ID error:", err);
  }
}

async function autoSubmitLeagueMatch(matchPayload) {
  try {
    const stored = await browserAPI.storage.local.get(["autodarts_token", "edart_session_token"]);
    const playerToken = stored.autodarts_token || null;
    const edartToken = stored.edart_session_token || null;

    if (!edartToken) {
      console.error("[eDART] No eDART session token — user must be logged in");
      return { is_league_match: false, submitted: false, error: "Not logged in to eDART" };
    }

    const response = await fetch(`${SUPABASE_URL}/functions/v1/auto-submit-league-match`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${edartToken}`,
      },
      body: JSON.stringify({
        autodarts_match_id: matchPayload.match_id,
        autodarts_token: playerToken,
        player1_name: matchPayload.player1_name,
        player2_name: matchPayload.player2_name,
        player1_autodarts_id: matchPayload.player1_autodarts_id || null,
        player2_autodarts_id: matchPayload.player2_autodarts_id || null,
        client_stats: {
          score1: matchPayload.score1,
          score2: matchPayload.score2,
          avg1: matchPayload.avg1,
          avg2: matchPayload.avg2,
          first_9_avg1: matchPayload.first_9_avg1,
          first_9_avg2: matchPayload.first_9_avg2,
          one_eighties1: matchPayload.one_eighties1,
          one_eighties2: matchPayload.one_eighties2,
          high_checkout1: matchPayload.high_checkout1,
          high_checkout2: matchPayload.high_checkout2,
          ton60_1: matchPayload.ton60_1,
          ton60_2: matchPayload.ton60_2,
          ton80_1: matchPayload.ton80_1,
          ton80_2: matchPayload.ton80_2,
          ton_plus1: matchPayload.ton_plus1,
          ton_plus2: matchPayload.ton_plus2,
          darts_thrown1: matchPayload.darts_thrown1,
          darts_thrown2: matchPayload.darts_thrown2,
          checkout_attempts1: matchPayload.checkout_attempts1,
          checkout_attempts2: matchPayload.checkout_attempts2,
          checkout_hits1: matchPayload.checkout_hits1,
          checkout_hits2: matchPayload.checkout_hits2,
        },
      }),
    });

    if (!response.ok) {
      console.error("[eDART] auto-submit HTTP error:", response.status);
      return { is_league_match: false, submitted: false, error: `HTTP ${response.status}` };
    }

    return await response.json();
  } catch (err) {
    console.error("[eDART] auto-submit fetch error:", err);
    return { is_league_match: false, submitted: false, error: String(err) };
  }
}

function handleAutoSubmitResult(result, matchPayload) {
  const p1 = matchPayload.player1_name || "Gracz 1";
  const p2 = matchPayload.player2_name || "Gracz 2";

  if (result.already_submitted) {
    const statusText = result.status_text || "Wynik wysłany — oczekuje na zatwierdzenie admina.";
    browserAPI.notifications.create(`league-already-${Date.now()}`, {
      type: "basic",
      iconUrl: "icon128.png",
      title: "🎯 Mecz ligowy zgłoszony!",
      message: `${p1} vs ${p2} (${result.score || "?"})\n${result.league_name || "Liga"}\n${statusText}`,
    });
    return;
  }

  if (result.is_league_match && result.submitted) {
    const statusText = result.status === "completed"
      ? "Wynik zatwierdzony automatycznie!"
      : "Wynik wysłany — oczekuje na zatwierdzenie admina.";

    browserAPI.notifications.create(`league-submitted-${Date.now()}`, {
      type: "basic",
      iconUrl: "icon128.png",
      title: "🎯 Mecz ligowy zgłoszony!",
      message: `${p1} vs ${p2} (${result.score})\n${result.league_name}\n${statusText}`,
    });

    browserAPI.storage.local.set({
      autodarts_league_match: {
        ...matchPayload,
        edart_match_id: result.match_id,
        league_name: result.league_name,
        auto_submitted: true,
        status: result.status,
      },
      autodarts_league_match_timestamp: Date.now(),
    });

  } else if (result.is_league_match && !result.submitted) {
    browserAPI.notifications.create(`league-detected-${Date.now()}`, {
      type: "basic",
      iconUrl: "icon128.png",
      title: "⚠️ Mecz ligowy — wymagane ręczne zgłoszenie",
      message: `${p1} vs ${p2}\n${result.league_name || "Liga"}\n${result.reason || "Wynik nie został wysłany automatycznie."}\nKliknij aby wprowadzić wynik ręcznie.`,
    });

    browserAPI.storage.local.set({
      edart_manual_fallback: {
        autodarts_link: `https://play.autodarts.io/history/matches/${matchPayload.match_id}`,
        match_id: result.match_id,
        player1_name: p1,
        player2_name: p2,
      }
    });
  }
}

browserAPI.notifications.onClicked.addListener((notificationId) => {
  if (notificationId.startsWith("league-submitted-") || notificationId.startsWith("league-already-")) {
    browserAPI.storage.local.get(["autodarts_league_match"]).then((result) => {
      const data = result.autodarts_league_match;
      if (data?.edart_match_id) {
        browserAPI.tabs.create({
          url: `${EDART_URL}/submit-match?match_id=${data.edart_match_id}`,
          active: true,
        });
      } else {
        browserAPI.tabs.create({ url: `${EDART_URL}/matches`, active: true });
      }
    });
    browserAPI.notifications.clear(notificationId);
  } else if (notificationId.startsWith("league-error-") || notificationId.startsWith("league-detected-")) {
    browserAPI.storage.local.get(["edart_manual_fallback"]).then((result) => {
      const fallback = result.edart_manual_fallback;
      if (fallback?.autodarts_link) {
        const encoded = encodeURIComponent(fallback.autodarts_link);
        browserAPI.tabs.create({
          url: `${EDART_URL}/submit-match?autodarts_link=${encoded}`,
          active: true,
        });
      } else {
        browserAPI.tabs.create({ url: `${EDART_URL}/submit-match`, active: true });
      }
    });
    browserAPI.notifications.clear(notificationId);
  } else if (notificationId.startsWith("league-live-")) {
    browserAPI.tabs.create({ url: `${EDART_URL}/live`, active: true });
    browserAPI.notifications.clear(notificationId);
  }
});

browserAPI.webRequest.onBeforeSendHeaders.addListener(
  (details) => {
    const authHeader = details.requestHeaders?.find(h => h.name.toLowerCase() === 'authorization');
    if (authHeader && authHeader.value?.startsWith('Bearer ')) {
      const token = authHeader.value.replace('Bearer ', '');
      browserAPI.storage.local.set({ autodarts_token: token, token_timestamp: Date.now() });
    }
  },
  { urls: ["https://api.autodarts.io/*"] },
  ["requestHeaders"]
);
