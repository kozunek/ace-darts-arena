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
        sendResponse({ is_league_match: false, submitted: false, error: String(err) });
      });
    return true;
  }
});

async function autoSubmitLeagueMatch(matchPayload) {
  try {
    // Get the player's autodarts token from storage
    const stored = await new Promise((resolve) => {
      chrome.storage.local.get(["autodarts_token"], resolve);
    });
    const playerToken = stored.autodarts_token || null;

    const response = await fetch(`${SUPABASE_URL}/functions/v1/auto-submit-league-match`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
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
      return { is_league_match: false, submitted: false };
    }

    return await response.json();
  } catch (err) {
    console.error("[eDART] auto-submit fetch error:", err);
    return { is_league_match: false, submitted: false };
  }
}

function handleAutoSubmitResult(result, matchPayload) {
  const p1 = matchPayload.player1_name || "Gracz 1";
  const p2 = matchPayload.player2_name || "Gracz 2";

  if (result.already_submitted) {
    // Other player already submitted — no notification needed
    console.log("[eDART] Match already submitted by the other player, skipping.");
    return;
  }
  const p1 = matchPayload.player1_name || "Gracz 1";
  const p2 = matchPayload.player2_name || "Gracz 2";

  if (result.is_league_match && result.submitted) {
    // ✅ Successfully auto-submitted
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

    // Store info for eDART page
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
    // Liga wykryta ale nie wysłano (np. nie na dziś, brak statystyk)
    chrome.notifications.create(`league-detected-${Date.now()}`, {
      type: "basic",
      iconUrl: "icon128.png",
      title: "🎯 Mecz ligowy wykryty",
      message: `${p1} vs ${p2}\n${result.league_name || "Liga"}\n${result.reason || "Wynik nie został wysłany automatycznie."}`,
      priority: 1,
    });
  }
  // If not a league match — no notification
}

// Handle notification click — open eDART
chrome.notifications.onClicked.addListener((notificationId) => {
  if (notificationId.startsWith("league-")) {
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
