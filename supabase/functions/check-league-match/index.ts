import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // All paths require authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use getUser instead of getClaims for better compatibility
    const token = authHeader.replace("Bearer ", "");
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userError } = await authClient.auth.getUser(token);
    if (userError || !userData?.user) {
      console.error("[check-league-match] Auth failed:", userError?.message || "no user");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { action, autodarts_match_id, player1_name, player2_name, player1_autodarts_id, player2_autodarts_id } = body;

    // Use service key for player lookups (players table has RLS restricting reads)
    const supabase = createClient(supabaseUrl, serviceKey);

    // Handle live match end action
    if (action === "end_live_match" && autodarts_match_id) {
      await supabase.from("live_matches").delete().eq("autodarts_match_id", autodarts_match_id);
      console.log(`[check-league-match] Deleted live match: ${autodarts_match_id}`);
      return new Response(
        JSON.stringify({ ok: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!player1_name && !player1_autodarts_id) {
      return new Response(
        JSON.stringify({ is_league_match: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find players using service client (bypasses RLS on players table)
    let p1Id: string | null = null;
    let p2Id: string | null = null;

    if (player1_autodarts_id) {
      const { data } = await supabase
        .from("players")
        .select("id")
        .eq("autodarts_user_id", player1_autodarts_id)
        .limit(1)
        .maybeSingle();
      if (data) p1Id = data.id;
    }
    if (!p1Id && player1_name) {
      const { data } = await supabase
        .from("players")
        .select("id")
        .ilike("name", player1_name)
        .limit(1);
      if (data && data.length > 0) p1Id = data[0].id;
    }

    if (player2_autodarts_id) {
      const { data } = await supabase
        .from("players")
        .select("id")
        .eq("autodarts_user_id", player2_autodarts_id)
        .limit(1)
        .maybeSingle();
      if (data) p2Id = data.id;
    }
    if (!p2Id && player2_name) {
      const { data } = await supabase
        .from("players")
        .select("id")
        .ilike("name", player2_name)
        .limit(1);
      if (data && data.length > 0) p2Id = data[0].id;
    }

    console.log(`[check-league-match] Player lookup: p1=${p1Id} (name=${player1_name}, adId=${player1_autodarts_id}), p2=${p2Id} (name=${player2_name}, adId=${player2_autodarts_id})`);

    if (!p1Id || !p2Id) {
      return new Response(
        JSON.stringify({ is_league_match: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for upcoming match between these two players (either order)
    const { data: matches } = await supabase
      .from("matches")
      .select("id, league_id, round, date, leagues!inner(name)")
      .eq("status", "upcoming")
      .or(
        `and(player1_id.eq.${p1Id},player2_id.eq.${p2Id}),and(player1_id.eq.${p2Id},player2_id.eq.${p1Id})`
      )
      .limit(1);

    if (!matches || matches.length === 0) {
      console.log(`[check-league-match] No upcoming match found between ${p1Id} and ${p2Id}`);
      return new Response(
        JSON.stringify({ is_league_match: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const match = matches[0];
    const leagueName = (match as any).leagues?.name || "Liga";

    console.log(`[check-league-match] Found league match: ${match.id}, league: ${leagueName}`);

    return new Response(
      JSON.stringify({
        is_league_match: true,
        match_id: match.id,
        league_id: match.league_id,
        league_name: leagueName,
        round: match.round,
        player1_id: p1Id,
        player2_id: p2Id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("check-league-match error:", err);
    return new Response(
      JSON.stringify({ is_league_match: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
