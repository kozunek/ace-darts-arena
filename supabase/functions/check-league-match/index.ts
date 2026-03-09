import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, autodarts_match_id, player1_name, player2_name, player1_autodarts_id, player2_autodarts_id } = body;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Handle live match end action
    if (action === "end_live_match" && autodarts_match_id) {
      await supabase.from("live_matches").delete().eq("autodarts_match_id", autodarts_match_id);
      return new Response(
        JSON.stringify({ ok: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!player1_name && !player1_autodarts_id) {
      return new Response(
        JSON.stringify({ is_league_match: false, reason: "no player data" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find player 1 - by autodarts_user_id first, then by name
    let p1Id: string | null = null;
    let p2Id: string | null = null;

    // Try autodarts_user_id first for player 1
    if (player1_autodarts_id) {
      const { data } = await supabase
        .from("players")
        .select("id")
        .eq("autodarts_user_id", player1_autodarts_id)
        .maybeSingle();
      if (data) p1Id = data.id;
    }
    // Fallback to name
    if (!p1Id && player1_name) {
      const { data } = await supabase
        .from("players")
        .select("id")
        .ilike("name", player1_name)
        .maybeSingle();
      if (data) p1Id = data.id;
    }

    // Try autodarts_user_id first for player 2
    if (player2_autodarts_id) {
      const { data } = await supabase
        .from("players")
        .select("id")
        .eq("autodarts_user_id", player2_autodarts_id)
        .maybeSingle();
      if (data) p2Id = data.id;
    }
    // Fallback to name
    if (!p2Id && player2_name) {
      const { data } = await supabase
        .from("players")
        .select("id")
        .ilike("name", player2_name)
        .maybeSingle();
      if (data) p2Id = data.id;
    }

    if (!p1Id || !p2Id) {
      return new Response(
        JSON.stringify({
          is_league_match: false,
          reason: "players not found in eDART",
          found_p1: !!p1Id,
          found_p2: !!p2Id,
        }),
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
      return new Response(
        JSON.stringify({
          is_league_match: false,
          reason: "no upcoming match between these players",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const match = matches[0];
    const leagueName = (match as any).leagues?.name || "Liga";

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
