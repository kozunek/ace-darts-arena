import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const KEYCLOAK_URL = "https://login.autodarts.io/realms/autodarts/protocol/openid-connect/token";
const API_BASE = "https://api.autodarts.io";

async function getAutodartsToken(): Promise<string> {
  const email = Deno.env.get("AUTODARTS_EMAIL");
  const password = Deno.env.get("AUTODARTS_PASSWORD");
  const configuredClientId = Deno.env.get("AUTODARTS_CLIENT_ID")?.trim();
  const clientSecret = Deno.env.get("AUTODARTS_CLIENT_SECRET")?.trim();

  if (!email || !password) throw new Error("AUTODARTS credentials not configured");

  const candidateClientIds = configuredClientId
    ? [configuredClientId]
    : ["autodarts-desktop", "autodarts-app"];

  let lastAuthError = "";

  for (const clientId of candidateClientIds) {
    const body = new URLSearchParams({
      grant_type: "password",
      client_id: clientId,
      username: email,
      password,
      scope: "openid",
    });

    if (clientSecret) body.set("client_secret", clientSecret);

    const res = await fetch(KEYCLOAK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (res.ok) {
      const data = await res.json();
      return data.access_token;
    }

    lastAuthError = await res.text();
    const invalidClient =
      res.status === 401 &&
      /(invalid_client|unauthorized_client)/i.test(lastAuthError);

    if (!invalidClient || configuredClientId) {
      throw new Error(`Keycloak auth failed (${res.status}): ${lastAuthError}`);
    }
  }

  throw new Error(
    `Keycloak auth failed for all configured clients (${candidateClientIds.join(", ")}): ${lastAuthError}`,
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // ─── JWT Authentication + Role Check ───
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerUserId = claimsData.claims.sub as string;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: isModAdmin } = await supabase.rpc("is_moderator_or_admin", { _user_id: callerUserId });
    if (!isModAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all players with autodarts_user_id
    const { data: players } = await supabase
      .from("players")
      .select("id, name, autodarts_user_id")
      .not("autodarts_user_id", "is", null);

    if (!players || players.length === 0) {
      return new Response(JSON.stringify({ message: "No players with Autodarts linked" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adToken = await getAutodartsToken();
    let synced = 0;

    // Get upcoming matches in our system
    const { data: upcomingMatches } = await supabase
      .from("matches")
      .select("id, player1_id, player2_id, status")
      .eq("status", "upcoming");

    if (!upcomingMatches || upcomingMatches.length === 0) {
      return new Response(JSON.stringify({ message: "No upcoming matches to sync" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For each player with autodarts_user_id, check their recent matches
    for (const player of players) {
      try {
        const res = await fetch(
          `${API_BASE}/as/v0/users/${player.autodarts_user_id}/matches?limit=5&finished=true`,
          { headers: { Authorization: `Bearer ${adToken}` } }
        );

        if (!res.ok) continue;
        const recentMatches = await res.json();
        const matchList = recentMatches.matches || recentMatches.data || recentMatches || [];

        for (const adMatch of matchList) {
          // Check if this Autodarts match involves two of our players
          const adPlayers = adMatch.players || [];
          if (adPlayers.length < 2) continue;

          const adPlayerIds = adPlayers.map((p: any) => p.userId || p.user_id || p.id);

          // Find our match where both players are involved
          const ourMatch = upcomingMatches.find((m) => {
            const p1 = players.find((p) => p.id === m.player1_id);
            const p2 = players.find((p) => p.id === m.player2_id);
            if (!p1?.autodarts_user_id || !p2?.autodarts_user_id) return false;
            return adPlayerIds.includes(p1.autodarts_user_id) && adPlayerIds.includes(p2.autodarts_user_id);
          });

          if (!ourMatch) continue;

          // Match found! Fetch full details and update
          const matchDetailRes = await fetch(
            `${API_BASE}/as/v0/matches/${adMatch.id}`,
            { headers: { Authorization: `Bearer ${adToken}` } }
          );

          if (!matchDetailRes.ok) continue;
          const matchDetail = await matchDetailRes.json();

          // Determine which autodarts player maps to which of our players
          const ourP1 = players.find((p) => p.id === ourMatch.player1_id);
          const ourP2 = players.find((p) => p.id === ourMatch.player2_id);
          const adP1Idx = adPlayerIds.indexOf(ourP1?.autodarts_user_id);

          // Extract scores
          const scores = matchDetail.scores || [0, 0];
          const score1 = adP1Idx === 0 ? scores[0] : scores[1];
          const score2 = adP1Idx === 0 ? scores[1] : scores[0];

          const { error: updateError } = await supabase
            .from("matches")
            .update({
              score1,
              score2,
              legs_won1: score1,
              legs_won2: score2,
              status: "pending_approval",
              autodarts_link: `https://autodarts.io/matches/${adMatch.id}`,
            })
            .eq("id", ourMatch.id);

          if (!updateError) synced++;
        }
      } catch (e) {
        console.error(`Error syncing player ${player.name}:`, e);
      }
    }

    return new Response(
      JSON.stringify({ success: true, synced }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Sync error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
