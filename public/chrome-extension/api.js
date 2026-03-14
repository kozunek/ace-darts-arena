// ─── Central backend API wrapper ───
// All server communication goes through backend functions only (no direct REST)

const browserAPI = typeof browser !== "undefined" ? browser : chrome;

async function getStoredTokens() {
  return new Promise((resolve) => {
    browserAPI.storage.local.get(
      ["edart_session_token", "autodarts_token", "token_timestamp"],
      (result) => resolve(result || {})
    );
  });
}

async function clearStaleSessionToken() {
  return new Promise((resolve) => {
    browserAPI.storage.local.remove(["edart_session_token", "edart_session_timestamp", "edart_session_source"], resolve);
  });
}

/**
 * Call a backend function.
 * @param {string} functionName - e.g. "check-league-match"
 * @param {object} payload - JSON body
 * @param {string|null} authToken - JWT token (falls back to anon key)
 * @param {boolean} canRetryWithAnon - retry once with anon key when user token is stale
 * @returns {Promise<object>} parsed JSON response
 */
async function callSupabase(functionName, payload, authToken, canRetryWithAnon = true) {
  await RateLimiter.waitIfNeeded();

  const token = authToken || CONFIG.SUPABASE_ANON_KEY;
  const url = `${CONFIG.SUPABASE_URL}/functions/v1/${functionName}`;

  log(`API call: ${functionName}`, payload ? Object.keys(payload) : "no body");

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": CONFIG.SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");

    const shouldRetryWithAnon =
      canRetryWithAnon &&
      authToken &&
      authToken !== CONFIG.SUPABASE_ANON_KEY &&
      (res.status === 401 || res.status === 403);

    if (shouldRetryWithAnon) {
      logError(`API ${functionName} returned ${res.status}, retrying with anon token`);
      await clearStaleSessionToken();
      return callSupabase(functionName, payload, CONFIG.SUPABASE_ANON_KEY, false);
    }

    logError(`API error ${functionName}: HTTP ${res.status}`, errText);
    throw new Error(`HTTP ${res.status}: ${errText}`);
  }

  return res.json();
}

/**
 * Check if a match is a league match.
 * Uses cache to reduce API calls.
 */
async function checkLeagueMatch(player1AutodartsId, player2AutodartsId, player1Name, player2Name) {
  const cacheKey = `league-check:${player1AutodartsId || player1Name}:${player2AutodartsId || player2Name}`;
  const cached = Cache.get(cacheKey);
  if (cached) {
    log("League check from cache:", cacheKey);
    return cached;
  }

  const stored = await getStoredTokens();
  const result = await callSupabase("check-league-match", {
    player1_autodarts_id: player1AutodartsId,
    player2_autodarts_id: player2AutodartsId,
    player1_name: player1Name,
    player2_name: player2Name,
  }, stored.edart_session_token);

  Cache.set(cacheKey, result);
  return result;
}

/**
 * Auto-submit a league match result.
 */
async function autoSubmitMatch(matchPayload) {
  const stored = await getStoredTokens();
  const authToken = stored.edart_session_token || CONFIG.SUPABASE_ANON_KEY;

  return callSupabase("auto-submit-league-match", {
    autodarts_match_id: matchPayload.match_id,
    autodarts_token: stored.autodarts_token || null,
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
  }, authToken);
}

/**
 * Save Autodarts User ID to player profile via backend function.
 */
async function saveAutodartsUserId(autodartsUserId) {
  const stored = await new Promise(r =>
    browserAPI.storage.local.get(["edart_user_id", "autodarts_id_saved"], r)
  );

  if (stored.autodarts_id_saved === autodartsUserId) return;
  if (!stored.edart_user_id) {
    log("No eDART user ID stored, skipping autodarts ID save");
    return;
  }

  await callSupabase("auto-submit-league-match", {
    action: "save_autodarts_id",
    edart_user_id: stored.edart_user_id,
    autodarts_user_id: autodartsUserId,
  });

  browserAPI.storage.local.set({ autodarts_id_saved: autodartsUserId });
  logAlways("✅ Autodarts User ID saved:", autodartsUserId);

  Notifications.autodartsIdSaved();
}
