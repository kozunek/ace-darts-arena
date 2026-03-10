// Background service worker
const EDART_URL = "https://ace-darts-arena.lovable.app";
const SUPABASE_URL = "https://uiolhzctnbskdjteufkj.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpb2xoemN0bmJza2RqdGV1ZmtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MTc4NjEsImV4cCI6MjA4ODQ5Mzg2MX0.SEGOONfttWCS7jbacT5NxlbiOGSxmrVRp4DFqQRDYkk";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_AUTODARTS_TOKEN') {
    chrome.storage.local.get(['autodarts_token', 'token_timestamp'], (result) => {
      sendResponse({
        token: result.autodarts_token || null,
        timestamp: result.token_timestamp || null,
        fresh: result.token_timestamp ? (Date.now() - result.token_timestamp < 300000) : false
      });
    });
    return true;
  }

  if (message.type === 'CLEAR_TOKEN') {
    chrome.storage.local.remove(['autodarts_token', 'token_timestamp']);
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
        // Show error notification with manual submission fallback
        showManualFallbackNotification(message.payload, String(err));
      });
    return true;
  }

  // ─── Check if live match is a league match (notification) ───
  if (message.type === 'CHECK_LEAGUE_MATCH_LIVE') {
    checkLeagueMatchLive(message.payload)
      .then((result) => {
        sendResponse(result);
      })
      .catch((err) => {
        console.error("[eDART] League match check failed:", err);
        sendResponse({ is_league_match: false });
      });
    return true;
  }

  // ─── Live match updates ───
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

  // ─── Autodarts User ID auto-fill ───
  if (message.type === 'AUTODARTS_USER_ID_DETECTED') {
    saveAutodartsUserId(message.userId)
      .then(() => sendResponse({ ok: true }))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }
});

// ─── Check if a live match is a league match and notify ───
async function checkLeagueMatchLive(payload) {
  try {
    const checkRes = await fetch(`${SUPABASE_URL}/functions/v1/check-league-match`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
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

      chrome.notifications.create(`league-live-${payload.autodarts_match_id}`, {
        type: "basic",
        iconUrl: "icon128.png",
        title: "🎯 Mecz ligowy rozpoczęty!",
        message: `${p1} vs ${p2}\n${checkData.league_name || "Liga"}\nWynik zostanie wysłany automatycznie po zakończeniu meczu.`,
        priority: 2,
        requireInteraction: false,
      });

      console.log("[eDART] League match detected live:", checkData.league_name);
    }

    return checkData;
  } catch (err) {
    console.error("[eDART] Check league match error:", err);
    return { is_league_match: false };
  }
}

// ─── Show manual fallback notification on error ───
function showManualFallbackNotification(matchPayload, errorMsg) {
  const p1 = matchPayload?.player1_name || "Gracz 1";
  const p2 = matchPayload?.player2_name || "Gracz 2";
  const matchId = matchPayload?.match_id || "";

  // Store the autodarts link for when user clicks notification
  chrome.storage.local.set({
    edart_manual_fallback: {
      autodarts_link: `https://play.autodarts.io/history/matches/${matchId}`,
      player1_name: p1,
      player2_name: p2,
    }
  });

  chrome.notifications.create(`league-error-${Date.now()}`, {
    type: "basic",
    iconUrl: "icon128.png",
    title: "⚠️ Błąd wysyłania wyniku",
    message: `${p1} vs ${p2}\nNie udało się automatycznie wysłać wyniku.\nKliknij aby wprowadzić wynik ręcznie.`,
    priority: 2,
    requireInteraction: true,
  });
}

// ─── Live match: upsert to live_matches table ───
async function handleLiveMatchUpdate(payload) {
  try {
    const stored = await new Promise((resolve) => {
      chrome.storage.local.get(["edart_session_token"], resolve);
    });
    const edartToken = stored.edart_session_token || null;
    const authToken = edartToken || SUPABASE_ANON_KEY;

    // First check if this is a league match
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

    // It's a league match - send live update (requires authenticated user)
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
    await fetch(`${SUPABASE_URL}/functions/v1/check-league-match`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
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

// ─── Save Autodarts User ID to player profile ───
async function saveAutodartsUserId(autodartsUserId) {
  try {
    const stored = await new Promise((resolve) => {
      chrome.storage.local.get(["edart_user_id", "autodarts_id_saved"], resolve);
    });

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

    chrome.storage.local.set({ autodarts_id_saved: autodartsUserId });
    console.log("[eDART] ✅ Autodarts User ID saved to eDART:", autodartsUserId);

    chrome.notifications.create(`autodarts-id-${Date.now()}`, {
      type: "basic",
      iconUrl: "icon128.png",
      title: "🎯 Autodarts ID zapisane!",
      message: `Twój Autodarts User ID został automatycznie powiązany z kontem eDART.`,
      priority: 1,
    });
  } catch (err) {
    console.error("[eDART] Save autodarts ID error:", err);
  }
}

async function autoSubmitLeagueMatch(matchPayload) {
  try {
    const stored = await new Promise((resolve) => {
      chrome.storage.local.get(["autodarts_token", "edart_session_token"], resolve);
    });
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
    chrome.notifications.create(`league-already-${Date.now()}`, {
      type: "basic",
      iconUrl: "icon128.png",
      title: "🎯 Mecz ligowy zgłoszony!",
      message: `${p1} vs ${p2} (${result.score || "?"})\n${result.league_name || "Liga"}\n${statusText}`,
      priority: 2,
      requireInteraction: true,
    });
    return;
  }

  if (result.is_league_match && result.submitted) {
    const statusText = result.status === "completed"
      ? "Wynik zatwierdzony automatycznie!"
      : "Wynik wysłany — oczekuje na zatwierdzenie admina.";

    chrome.notifications.create(`league-submitted-${Date.now()}`, {
      type: "basic",
      iconUrl: "icon128.png",
      title: "🎯 Mecz ligowy zgłoszony!",
      message: `${p1} vs ${p2} (${result.score})\n${result.league_name}\n${statusText}`,
      priority: 2,
      requireInteraction: true,
    });

    chrome.storage.local.set({
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
    // League match detected but not submitted — show manual fallback
    const reason = result.reason || "Wynik nie został wysłany automatycznie.";

    chrome.notifications.create(`league-detected-${Date.now()}`, {
      type: "basic",
      iconUrl: "icon128.png",
      title: "⚠️ Mecz ligowy — wymagane ręczne zgłoszenie",
      message: `${p1} vs ${p2}\n${result.league_name || "Liga"}\n${reason}\nKliknij aby wprowadzić wynik ręcznie.`,
      priority: 2,
      requireInteraction: true,
    });

    // Store fallback data
    chrome.storage.local.set({
      edart_manual_fallback: {
        autodarts_link: `https://play.autodarts.io/history/matches/${matchPayload.match_id}`,
        match_id: result.match_id,
        player1_name: p1,
        player2_name: p2,
      }
    });
  } else if (!result.is_league_match) {
    // Not a league match - no notification needed
    console.log("[eDART] Match is not a league match, skipping notification");
  }
}

// Handle notification click — open eDART
chrome.notifications.onClicked.addListener((notificationId) => {
  if (notificationId.startsWith("league-submitted-") || notificationId.startsWith("league-already-")) {
    chrome.storage.local.get(["autodarts_league_match"], (result) => {
      const data = result.autodarts_league_match;
      if (data?.edart_match_id) {
        chrome.tabs.create({
          url: `${EDART_URL}/submit-match?match_id=${data.edart_match_id}`,
          active: true,
        });
      } else {
        chrome.tabs.create({ url: `${EDART_URL}/matches`, active: true });
      }
    });
    chrome.notifications.clear(notificationId);
  } else if (notificationId.startsWith("league-error-") || notificationId.startsWith("league-detected-")) {
    // Error or unsubmitted — open manual submission page with autodarts link pre-filled
    chrome.storage.local.get(["edart_manual_fallback"], (result) => {
      const fallback = result.edart_manual_fallback;
      if (fallback?.autodarts_link) {
        const encoded = encodeURIComponent(fallback.autodarts_link);
        chrome.tabs.create({
          url: `${EDART_URL}/submit-match?autodarts_link=${encoded}`,
          active: true,
        });
      } else {
        chrome.tabs.create({ url: `${EDART_URL}/submit-match`, active: true });
      }
    });
    chrome.notifications.clear(notificationId);
  } else if (notificationId.startsWith("league-live-")) {
    chrome.tabs.create({ url: `${EDART_URL}/live`, active: true });
    chrome.notifications.clear(notificationId);
  }
});

// Listen for web requests to autodarts API to capture tokens
chrome.webRequest?.onBeforeSendHeaders?.addListener(
  (details) => {
    const authHeader = details.requestHeaders?.find(h => h.name.toLowerCase() === 'authorization');
    if (authHeader && authHeader.value?.startsWith('Bearer ')) {
      const token = authHeader.value.replace('Bearer ', '');
      chrome.storage.local.set({ autodarts_token: token, token_timestamp: Date.now() });
    }
  },
  { urls: ["https://api.autodarts.io/*"] },
  ["requestHeaders"]
);
