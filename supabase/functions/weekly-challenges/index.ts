import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const CHALLENGE_POOL = [
  { type: "highest_avg", title: "Najwyższa średnia", desc: "Gracz z najwyższą średnią z meczów tego tygodnia", icon: "📊", field: "avg", agg: "max" },
  { type: "most_180s", title: "Król 180-tek", desc: "Najwięcej rzutów 180 w tym tygodniu", icon: "💯", field: "one_eighties", agg: "sum" },
  { type: "most_tons", title: "Maszyna wysokich podejść", desc: "Najwięcej wysokich podejść (60-99, 100-139, 140-169, 170-180) w tygodniu", icon: "🎪", field: "tons", agg: "sum" },
  { type: "best_checkout", title: "Najwyższy checkout", desc: "Najwyższy checkout tygodnia", icon: "🎯", field: "high_checkout", agg: "max" },
  { type: "most_wins", title: "Seria zwycięstw", desc: "Najwięcej wygranych meczów w tygodniu", icon: "🔥", field: "wins", agg: "sum" },
];

const REWARDS = [
  { rank: 1, type: "badge", value: "🥇 Mistrz Tygodnia" },
  { rank: 2, type: "badge", value: "🥈 Wicemistrz Tygodnia" },
  { rank: 3, type: "badge", value: "🥉 III Miejsce Tygodnia" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const now = new Date();
    const dayOfWeek = now.getUTCDay(); // 0=Sun
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    
    const thisMonday = new Date(now);
    thisMonday.setUTCDate(now.getUTCDate() + mondayOffset);
    thisMonday.setUTCHours(0, 0, 0, 0);
    
    const thisSunday = new Date(thisMonday);
    thisSunday.setUTCDate(thisMonday.getUTCDate() + 6);

    const weekStart = thisMonday.toISOString().split("T")[0];
    const weekEnd = thisSunday.toISOString().split("T")[0];

    // 1. Close expired challenges & award rewards
    const { data: expiredChallenges } = await supabase
      .from("weekly_challenges")
      .select("id, challenge_type, title")
      .eq("is_active", true)
      .lt("week_end", weekStart);

    for (const ch of expiredChallenges || []) {
      // Get top 3
      const { data: topEntries } = await supabase
        .from("weekly_challenge_entries")
        .select("player_id, score")
        .eq("challenge_id", ch.id)
        .gt("score", 0)
        .order("score", { ascending: false })
        .limit(3);

      const rewardsToInsert = (topEntries || []).map((e, i) => ({
        challenge_id: ch.id,
        player_id: e.player_id,
        rank: i + 1,
        reward_type: REWARDS[i]?.type || "badge",
        reward_value: REWARDS[i]?.value || `#${i + 1}`,
      }));

      if (rewardsToInsert.length > 0) {
        await supabase.from("weekly_challenge_rewards").insert(rewardsToInsert);

        // Notify winners
        const playerIds = rewardsToInsert.map(r => r.player_id);
        const { data: players } = await supabase
          .from("players")
          .select("id, user_id, name")
          .in("id", playerIds);

        const notifs = (players || [])
          .filter(p => p.user_id)
          .map(p => {
            const reward = rewardsToInsert.find(r => r.player_id === p.id);
            return {
              user_id: p.user_id,
              title: `${reward?.reward_value || "🏆"} Wyzwanie ukończone!`,
              message: `Zająłeś ${reward?.rank}. miejsce w wyzwaniu "${ch.title}"!`,
              type: "achievement",
              link: "/challenges",
            };
          });

        if (notifs.length > 0) {
          await supabase.from("notifications").insert(notifs);
        }
      }

      await supabase.from("weekly_challenges").update({ is_active: false }).eq("id", ch.id);
    }

    // 2. Create new challenge if none exists for this week
    const { data: existing } = await supabase
      .from("weekly_challenges")
      .select("id")
      .eq("week_start", weekStart)
      .limit(1);

    if (!existing || existing.length === 0) {
      // Pick 2 random challenges for this week
      const shuffled = [...CHALLENGE_POOL].sort(() => Math.random() - 0.5);
      const picks = shuffled.slice(0, 2);

      await supabase.from("weekly_challenges").insert(
        picks.map(p => ({
          challenge_type: p.type,
          title: p.title,
          description: p.desc,
          icon: p.icon,
          week_start: weekStart,
          week_end: weekEnd,
          is_active: true,
        }))
      );
    }

    // 3. Score active challenges based on this week's completed matches
    const { data: activeChallenges } = await supabase
      .from("weekly_challenges")
      .select("id, challenge_type, week_start, week_end")
      .eq("is_active", true);

    if (!activeChallenges || activeChallenges.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No active challenges" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get this week's completed matches
    const { data: weekMatches } = await supabase
      .from("matches")
      .select("player1_id, player2_id, score1, score2, avg1, avg2, one_eighties1, one_eighties2, high_checkout1, high_checkout2, ton60_1, ton60_2, ton80_1, ton80_2, ton_plus1, ton_plus2, ton40_1, ton40_2")
      .eq("status", "completed")
      .gte("date", weekStart)
      .lte("date", weekEnd);

    if (!weekMatches || weekMatches.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No matches this week" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Aggregate player stats for the week
    const playerStats = new Map<string, { avg: number[], one_eighties: number, tons: number, high_checkout: number, wins: number, matchCount: number }>();

    const ensure = (id: string) => {
      if (!playerStats.has(id)) playerStats.set(id, { avg: [], one_eighties: 0, tons: 0, high_checkout: 0, wins: 0, matchCount: 0 });
      return playerStats.get(id)!;
    };

    for (const m of weekMatches) {
      const s1 = ensure(m.player1_id);
      const s2 = ensure(m.player2_id);
      s1.matchCount++; s2.matchCount++;

      if (m.avg1) s1.avg.push(Number(m.avg1));
      if (m.avg2) s2.avg.push(Number(m.avg2));

      s1.one_eighties += m.one_eighties1 || 0;
      s2.one_eighties += m.one_eighties2 || 0;

      const t1 = (m.ton60_1||0) + (m.ton80_1||0) + (m.ton_plus1||0) + (m.ton40_1||0) + (m.one_eighties1||0);
      const t2 = (m.ton60_2||0) + (m.ton80_2||0) + (m.ton_plus2||0) + (m.ton40_2||0) + (m.one_eighties2||0);
      s1.tons += t1; s2.tons += t2;

      if ((m.high_checkout1||0) > s1.high_checkout) s1.high_checkout = m.high_checkout1||0;
      if ((m.high_checkout2||0) > s2.high_checkout) s2.high_checkout = m.high_checkout2||0;

      if ((m.score1||0) > (m.score2||0)) s1.wins++;
      else if ((m.score2||0) > (m.score1||0)) s2.wins++;
    }

    // Update entries for each active challenge
    for (const ch of activeChallenges) {
      const pool = CHALLENGE_POOL.find(p => p.type === ch.challenge_type);
      if (!pool) continue;

      const entries: { challenge_id: string; player_id: string; score: number; match_count: number; updated_at: string }[] = [];

      for (const [playerId, stats] of playerStats) {
        let score = 0;
        if (pool.field === "avg") score = stats.avg.length > 0 ? Math.round((stats.avg.reduce((a,b)=>a+b,0) / stats.avg.length) * 10) / 10 : 0;
        else if (pool.field === "one_eighties") score = stats.one_eighties;
        else if (pool.field === "tons") score = stats.tons;
        else if (pool.field === "high_checkout") score = stats.high_checkout;
        else if (pool.field === "wins") score = stats.wins;

        if (score > 0) {
          entries.push({
            challenge_id: ch.id,
            player_id: playerId,
            score,
            match_count: stats.matchCount,
            updated_at: new Date().toISOString(),
          });
        }
      }

      if (entries.length > 0) {
        await supabase.from("weekly_challenge_entries").upsert(entries, {
          onConflict: "challenge_id,player_id",
        });
      }
    }

    return new Response(JSON.stringify({ success: true, challenges_scored: activeChallenges.length, players_scored: playerStats.size }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Weekly challenges error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
