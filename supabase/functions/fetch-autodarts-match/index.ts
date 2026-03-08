import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const KEYCLOAK_BASE = "https://login.autodarts.io/realms/autodarts/protocol/openid-connect";
const API_BASE = "https://api.autodarts.io";

/**
 * Authenticate with Autodarts Keycloak using browser-simulated login flow.
 * 1. Start an authorization_code flow to get the login page
 * 2. Parse the login form action URL
 * 3. POST credentials to that URL
 * 4. Capture the redirect with the authorization code
 * 5. Exchange the code for an access token
 */
async function getAutodartsToken(): Promise<string> {
  const email = Deno.env.get("AUTODARTS_EMAIL");
  const password = Deno.env.get("AUTODARTS_PASSWORD");

  if (!email || !password) {
    throw new Error("AUTODARTS_EMAIL or AUTODARTS_PASSWORD not configured");
  }

  // Step 1: First try direct password grant with various client IDs
  const candidateClientIds = ["autodarts-desktop", "autodarts-app", "autodarts"];
  
  for (const clientId of candidateClientIds) {
    try {
      const body = new URLSearchParams({
        grant_type: "password",
        client_id: clientId,
        username: email,
        password,
        scope: "openid",
      });

      const res = await fetch(`${KEYCLOAK_BASE}/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });

      if (res.ok) {
        const data = await res.json();
        console.log(`Password grant succeeded with client_id: ${clientId}`);
        return data.access_token;
      }
      
      const errText = await res.text();
      console.log(`Password grant failed for ${clientId} (${res.status}): ${errText.substring(0, 200)}`);
    } catch (e) {
      console.log(`Password grant error for ${clientId}: ${e}`);
    }
  }

  // Step 2: Fall back to browser-simulated authorization_code flow
  console.log("Trying browser-simulated authorization_code flow...");
  
  // Try multiple redirect URIs - one must match what's registered in Keycloak
  const clientCandidates = [
    { clientId: "autodarts-app", redirectUri: "https://play.autodarts.io/" },
    { clientId: "autodarts-app", redirectUri: "https://play.autodarts.io" },
    { clientId: "autodarts-app", redirectUri: "https://autodarts.io" },
    { clientId: "autodarts-app", redirectUri: "https://app.autodarts.io" },
    { clientId: "autodarts-desktop", redirectUri: "http://localhost" },
    { clientId: "autodarts-desktop", redirectUri: "http://localhost:9191" },
  ];

  let lastFlowError = "";
  for (const { clientId, redirectUri } of clientCandidates) {
    try {
      const result = await tryAuthCodeFlow(clientId, redirectUri, email, password);
      if (result) return result;
    } catch (e) {
      lastFlowError = String(e);
      console.log(`Auth code flow failed for ${clientId} + ${redirectUri}: ${lastFlowError.substring(0, 200)}`);
    }
  }

  throw new Error(`All authentication methods failed. Last error: ${lastFlowError}`);
}

async function tryAuthCodeFlow(clientId: string, redirectUri: string, email: string, password: string): Promise<string | null> {
  const state = crypto.randomUUID();
  const nonce = crypto.randomUUID();
  
  // Generate PKCE code verifier and challenge
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  
  const authUrl = `${KEYCLOAK_BASE}/auth?` + new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid",
    state,
    nonce,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  }).toString();

  // Fetch the login page (don't follow redirects)
  const loginPageRes = await fetch(authUrl, {
    redirect: "manual",
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml",
    },
  });

  // If redirected, follow manually to get cookies
  let loginPageHtml: string;
  let cookies: string[] = [];
  
  if (loginPageRes.status >= 300 && loginPageRes.status < 400) {
    const location = loginPageRes.headers.get("location");
    cookies = extractCookies(loginPageRes);
    
    if (!location) throw new Error("No redirect location from auth endpoint");
    
    const followRes = await fetch(location, {
      redirect: "manual",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html",
        "Cookie": cookies.join("; "),
      },
    });
    
    cookies = [...cookies, ...extractCookies(followRes)];
    loginPageHtml = await followRes.text();
  } else {
    cookies = extractCookies(loginPageRes);
    loginPageHtml = await loginPageRes.text();
  }

  // Parse the form action URL - try HTML form action first, then kcContext JS
  let formActionUrl: string | null = null;
  
  const actionMatch = loginPageHtml.match(/action="([^"]+)"/);
  if (actionMatch) {
    formActionUrl = actionMatch[1].replace(/&amp;/g, "&");
  }
  
  // If not found in HTML, try parsing from Keycloak's kcContext JavaScript
  if (!formActionUrl) {
    const loginUrlMatch = loginPageHtml.match(/"loginAction"\s*:\s*"([^"]+)"/);
    if (loginUrlMatch) {
      formActionUrl = loginUrlMatch[1].replace(/\\\//, "/").replace(/\\\//g, "/");
    }
  }
  
  if (!formActionUrl) {
    // Try the standard Keycloak login-actions URL pattern
    const kcUrlMatch = loginPageHtml.match(/login-actions\/authenticate[^"')\s]*/);
    if (kcUrlMatch) {
      formActionUrl = "https://login.autodarts.io/" + kcUrlMatch[0].replace(/\\\//g, "/");
    }
  }

  if (!formActionUrl) {
    // Check if the page shows an error (like invalid redirect_uri)
    if (loginPageHtml.includes("Invalid parameter: redirect_uri") || loginPageHtml.includes('"error": true')) {
      console.log(`redirect_uri ${redirectUri} is not valid for ${clientId}`);
      return null; // Try next candidate
    }
    console.error("Login page HTML (first 3000 chars):", loginPageHtml.substring(0, 3000));
    throw new Error("Could not find login form action URL in Keycloak page");
  }

  // Make sure it's absolute
  if (formActionUrl.startsWith("/")) {
    formActionUrl = "https://login.autodarts.io" + formActionUrl;
  }

  console.log("Found form action URL:", formActionUrl.substring(0, 100));

  const loginBody = new URLSearchParams({
    username: email,
    password: password,
  });

  const loginRes = await fetch(formAction, {
    method: "POST",
    redirect: "manual",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Accept": "text/html",
      "Cookie": cookies.join("; "),
    },
    body: loginBody.toString(),
  });

  // Step 4: Extract the authorization code from the redirect URL
  const redirectLocation = loginRes.headers.get("location");
  console.log("Login response status:", loginRes.status);
  console.log("Redirect location:", redirectLocation?.substring(0, 200));

  if (!redirectLocation) {
    const body = await loginRes.text();
    // Check if credentials are wrong
    if (body.includes("Invalid username or password") || body.includes("invalid_grant")) {
      throw new Error("Invalid Autodarts credentials (wrong email or password)");
    }
    console.error("Login response body (first 1000 chars):", body.substring(0, 1000));
    throw new Error(`Login did not redirect. Status: ${loginRes.status}`);
  }

  const codeMatch = redirectLocation.match(/[?&]code=([^&]+)/);
  if (!codeMatch) {
    // Maybe it redirected to an error page
    if (redirectLocation.includes("error=")) {
      const errorMatch = redirectLocation.match(/error_description=([^&]+)/);
      throw new Error(`Keycloak error: ${decodeURIComponent(errorMatch?.[1] || "unknown")}`);
    }
    throw new Error(`No authorization code in redirect: ${redirectLocation.substring(0, 200)}`);
  }

  const authCode = codeMatch[1];
  console.log("Got authorization code successfully");

  // Step 5: Exchange the authorization code for tokens
  const tokenBody = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    code: authCode,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  });

  const tokenRes = await fetch(`${KEYCLOAK_BASE}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: tokenBody.toString(),
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    throw new Error(`Token exchange failed (${tokenRes.status}): ${errText}`);
  }

  const tokenData = await tokenRes.json();
  console.log("Token exchange successful!");
  return tokenData.access_token;
}

function extractCookies(res: Response): string[] {
  const cookies: string[] = [];
  // getSetCookie() is available in Deno
  const setCookieHeaders = res.headers.getSetCookie?.() || [];
  for (const cookie of setCookieHeaders) {
    const nameValue = cookie.split(";")[0];
    if (nameValue) cookies.push(nameValue);
  }
  // Fallback: also try get("set-cookie")
  const raw = res.headers.get("set-cookie");
  if (raw && cookies.length === 0) {
    const parts = raw.split(",").map(s => s.trim());
    for (const part of parts) {
      const nv = part.split(";")[0];
      if (nv && nv.includes("=")) cookies.push(nv);
    }
  }
  return cookies;
}

function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return base64UrlEncode(new Uint8Array(hash));
}

function base64UrlEncode(buffer: Uint8Array): string {
  let binary = "";
  for (const byte of buffer) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function extractMatchId(input: string): string {
  const urlMatch = input.match(/matches\/([a-f0-9-]+)/i);
  if (urlMatch) return urlMatch[1];
  if (/^[a-f0-9-]{20,}$/i.test(input)) return input;
  throw new Error("Invalid Autodarts match ID or link");
}

interface AutodartsStats {
  score1: number;
  score2: number;
  avg1: number | null;
  avg2: number | null;
  first_9_avg1: number | null;
  first_9_avg2: number | null;
  one_eighties1: number;
  one_eighties2: number;
  high_checkout1: number;
  high_checkout2: number;
  ton60_1: number;
  ton60_2: number;
  ton80_1: number;
  ton80_2: number;
  ton_plus1: number;
  ton_plus2: number;
  darts_thrown1: number;
  darts_thrown2: number;
  checkout_attempts1: number;
  checkout_attempts2: number;
  checkout_hits1: number;
  checkout_hits2: number;
  player1_name: string;
  player2_name: string;
  autodarts_link: string;
}

async function fetchMatchData(matchId: string, token: string): Promise<AutodartsStats> {
  const matchRes = await fetch(`${API_BASE}/as/v0/matches/${matchId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!matchRes.ok) {
    const errText = await matchRes.text();
    throw new Error(`Failed to fetch match (${matchRes.status}): ${errText}`);
  }

  const match = await matchRes.json();

  const players = match.players || [];
  if (players.length < 2) {
    throw new Error("Match does not have 2 players");
  }

  const p1 = players[0];
  const p2 = players[1];

  const legs = match.legs || [];
  let legsWon1 = 0;
  let legsWon2 = 0;
  let totalDarts1 = 0;
  let totalDarts2 = 0;
  let totalScore1 = 0;
  let totalScore2 = 0;
  let totalThrows1 = 0;
  let totalThrows2 = 0;
  let oneEighties1 = 0;
  let oneEighties2 = 0;
  let highCheckout1 = 0;
  let highCheckout2 = 0;
  let ton60_1 = 0;
  let ton60_2 = 0;
  let ton80_1 = 0;
  let ton80_2 = 0;
  let tonPlus1 = 0;
  let tonPlus2 = 0;
  let checkoutAttempts1 = 0;
  let checkoutAttempts2 = 0;
  let checkoutHits1 = 0;
  let checkoutHits2 = 0;
  let first9Total1 = 0;
  let first9Total2 = 0;
  let first9Count1 = 0;
  let first9Count2 = 0;

  for (const leg of legs) {
    if (leg.winner === 0) legsWon1++;
    else if (leg.winner === 1) legsWon2++;

    const turns = leg.turns || leg.visits || [];
    let turnIndex1 = 0;
    let turnIndex2 = 0;

    for (const turn of turns) {
      const playerIdx = turn.player ?? turn.playerIndex ?? 0;
      const points = turn.points ?? turn.score ?? 0;
      const darts = turn.darts?.length ?? turn.dartsThrown ?? 3;

      if (playerIdx === 0) {
        totalScore1 += points;
        totalDarts1 += darts;
        totalThrows1 += darts;
        turnIndex1++;
        if (turnIndex1 <= 3) { first9Total1 += points; first9Count1++; }
        if (points === 180) oneEighties1++;
        if (points >= 100) tonPlus1++;
        else if (points >= 80) ton80_1++;
        else if (points >= 60) ton60_1++;
      } else {
        totalScore2 += points;
        totalDarts2 += darts;
        totalThrows2 += darts;
        turnIndex2++;
        if (turnIndex2 <= 3) { first9Total2 += points; first9Count2++; }
        if (points === 180) oneEighties2++;
        if (points >= 100) tonPlus2++;
        else if (points >= 80) ton80_2++;
        else if (points >= 60) ton60_2++;
      }

      if (turn.isCheckout || turn.checkout) {
        if (playerIdx === 0) {
          checkoutHits1++;
          if (points > highCheckout1) highCheckout1 = points;
        } else {
          checkoutHits2++;
          if (points > highCheckout2) highCheckout2 = points;
        }
      }

      if (turn.checkoutAttempts || turn.doublesThrown) {
        const attempts = turn.checkoutAttempts ?? turn.doublesThrown ?? 0;
        if (playerIdx === 0) checkoutAttempts1 += attempts;
        else checkoutAttempts2 += attempts;
      }
    }
  }

  const avg1 = totalThrows1 > 0 ? Math.round((totalScore1 / totalThrows1) * 3 * 100) / 100 : null;
  const avg2 = totalThrows2 > 0 ? Math.round((totalScore2 / totalThrows2) * 3 * 100) / 100 : null;
  const first9Avg1 = first9Count1 > 0 ? Math.round((first9Total1 / first9Count1) * 100) / 100 : null;
  const first9Avg2 = first9Count2 > 0 ? Math.round((first9Total2 / first9Count2) * 100) / 100 : null;

  if (match.scores) {
    legsWon1 = match.scores[0] ?? legsWon1;
    legsWon2 = match.scores[1] ?? legsWon2;
  }

  return {
    score1: legsWon1,
    score2: legsWon2,
    avg1,
    avg2,
    first_9_avg1: first9Avg1,
    first_9_avg2: first9Avg2,
    one_eighties1: oneEighties1,
    one_eighties2: oneEighties2,
    high_checkout1: highCheckout1,
    high_checkout2: highCheckout2,
    ton60_1,
    ton60_2,
    ton80_1,
    ton80_2,
    ton_plus1: tonPlus1,
    ton_plus2: tonPlus2,
    darts_thrown1: totalDarts1,
    darts_thrown2: totalDarts2,
    checkout_attempts1: checkoutAttempts1,
    checkout_attempts2: checkoutAttempts2,
    checkout_hits1: checkoutHits1,
    checkout_hits2: checkoutHits2,
    player1_name: p1.name || p1.username || p1.displayName || "Player 1",
    player2_name: p2.name || p2.username || p2.displayName || "Player 2",
    autodarts_link: `https://autodarts.io/matches/${matchId}`,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { autodarts_link, match_id: autodartsMatchInput } = body;

    const input = autodarts_link || autodartsMatchInput;
    if (!input) {
      return new Response(JSON.stringify({ error: "autodarts_link or match_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const matchId = extractMatchId(input);
    const token = await getAutodartsToken();
    const stats = await fetchMatchData(matchId, token);

    return new Response(JSON.stringify({ success: true, data: stats }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: "Failed to fetch Autodarts data", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
