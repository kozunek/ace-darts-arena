import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date();

    // Get upcoming matches with confirmed dates
    const { data: matches, error: matchErr } = await supabase
      .from("matches")
      .select("id, player1_id, player2_id, confirmed_date, league_id")
      .eq("status", "upcoming")
      .not("confirmed_date", "is", null);

    if (matchErr) throw matchErr;
    if (!matches || matches.length === 0) {
      return new Response(JSON.stringify({ success: true, reminders_sent: 0 }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Filter matches in 24h or 1h window
    const needReminders: { match: typeof matches[0]; type: string }[] = [];
    for (const match of matches) {
      const matchDate = new Date(match.confirmed_date + "T00:00:00Z");
      const diffH = (matchDate.getTime() - now.getTime()) / 3_600_000;
      if (diffH > 23 && diffH <= 25) needReminders.push({ match, type: "24h" });
      else if (diffH > 0.5 && diffH <= 1.5) needReminders.push({ match, type: "1h" });
    }

    if (needReminders.length === 0) {
      return new Response(JSON.stringify({ success: true, reminders_sent: 0 }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Batch: fetch all players and leagues in 2 queries instead of N
    const playerIds = [...new Set(needReminders.flatMap(r => [r.match.player1_id, r.match.player2_id]))];
    const leagueIds = [...new Set(needReminders.map(r => r.match.league_id))];

    const [playersRes, leaguesRes] = await Promise.all([
      supabase.from("players").select("id, user_id, name").in("id", playerIds),
      supabase.from("leagues").select("id, name").in("id", leagueIds),
    ]);

    const playerMap = new Map((playersRes.data || []).map(p => [p.id, p]));
    const leagueMap = new Map((leaguesRes.data || []).map(l => [l.id, l.name]));

    // Batch: check existing reminders to avoid duplicates
    const userIds = (playersRes.data || []).filter(p => p.user_id).map(p => p.user_id);
    const { data: existingNotifs } = await supabase
      .from("notifications")
      .select("message")
      .eq("type", "reminder")
      .in("user_id", userIds);

    const existingKeys = new Set((existingNotifs || []).map(n => {
      const m = n.message.match(/\[([^\]]+)\]/);
      return m ? m[1] : "";
    }));

    // Build batch insert
    const toInsert: any[] = [];
    for (const { match, type } of needReminders) {
      const p1 = playerMap.get(match.player1_id);
      const p2 = playerMap.get(match.player2_id);
      if (!p1 || !p2) continue;

      const leagueName = leagueMap.get(match.league_id) || "?";
      const timeLabel = type === "24h" ? "za 24 godziny" : "za 1 godzinę";
      const dateStr = new Date(match.confirmed_date).toLocaleDateString("pl-PL", {
        day: "numeric", month: "long", year: "numeric",
      });

      for (const player of [p1, p2]) {
        if (!player.user_id) continue;
        const opponent = player.id === p1.id ? p2 : p1;
        const key = `reminder-${match.id}-${type}`;
        if (existingKeys.has(key)) continue;

        toInsert.push({
          user_id: player.user_id,
          title: `⏰ Mecz ${timeLabel}!`,
          message: `Twój mecz z ${opponent.name} w lidze ${leagueName} jest zaplanowany na ${dateStr}. [${key}]`,
          type: "reminder",
          link: "/my-matches",
        });
      }
    }

    const results = { reminders_sent: 0, errors: [] as string[] };

    if (toInsert.length > 0) {
      const { error } = await supabase.from("notifications").insert(toInsert);
      if (error) results.errors.push(error.message);
      else results.reminders_sent = toInsert.length;
    }

    console.log("Reminder results:", JSON.stringify(results));
    return new Response(JSON.stringify({ success: true, ...results }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Reminder error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
