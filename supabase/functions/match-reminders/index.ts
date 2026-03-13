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
    const in1h = new Date(now.getTime() + 60 * 60 * 1000);
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Get matches with confirmed_date that are upcoming
    const { data: matches, error: matchErr } = await supabase
      .from("matches")
      .select("id, player1_id, player2_id, confirmed_date, round, league_id")
      .eq("status", "upcoming")
      .not("confirmed_date", "is", null);

    if (matchErr) throw matchErr;

    const results = { reminders_sent: 0, errors: [] as string[] };

    for (const match of matches || []) {
      const matchDate = new Date(match.confirmed_date + "T00:00:00Z");
      
      // Check if match is ~24h or ~1h away
      const diffMs = matchDate.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      let reminderType: string | null = null;
      if (diffHours > 23 && diffHours <= 25) {
        reminderType = "24h";
      } else if (diffHours > 0.5 && diffHours <= 1.5) {
        reminderType = "1h";
      }

      if (!reminderType) continue;

      // Get player user_ids
      const playerIds = [match.player1_id, match.player2_id];
      const { data: playerRows } = await supabase
        .from("players")
        .select("id, user_id, name")
        .in("id", playerIds);

      if (!playerRows) continue;

      // Get league name
      const { data: league } = await supabase
        .from("leagues")
        .select("name")
        .eq("id", match.league_id)
        .single();

      for (const player of playerRows) {
        if (!player.user_id) continue;

        const opponent = playerRows.find(p => p.id !== player.id);
        const opponentName = opponent?.name || "przeciwnik";

        // Check if reminder already sent (avoid duplicates)
        const notifKey = `reminder-${match.id}-${reminderType}`;
        const { data: existing } = await supabase
          .from("notifications")
          .select("id")
          .eq("user_id", player.user_id)
          .eq("type", "reminder")
          .like("message", `%${notifKey}%`)
          .limit(1);

        if (existing && existing.length > 0) continue;

        const timeLabel = reminderType === "24h" ? "za 24 godziny" : "za 1 godzinę";
        const dateStr = new Date(match.confirmed_date).toLocaleDateString("pl-PL", {
          day: "numeric", month: "long", year: "numeric"
        });

        const { error: insertErr } = await supabase
          .from("notifications")
          .insert({
            user_id: player.user_id,
            title: `⏰ Mecz ${timeLabel}!`,
            message: `Twój mecz z ${opponentName} w lidze ${league?.name || "?"} jest zaplanowany na ${dateStr}. [${notifKey}]`,
            type: "reminder",
            link: "/my-matches",
          });

        if (insertErr) {
          results.errors.push(`${player.name}: ${insertErr.message}`);
        } else {
          results.reminders_sent++;
        }
      }
    }

    console.log("Reminder results:", JSON.stringify(results));

    return new Response(JSON.stringify({ success: true, ...results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Reminder error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
