import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const CHALLENGE_POOL = [
  // Średnia i precyzja (8 challenge'ów)
  { type: "highest_avg", title: "Najwyższa średnia", desc: "Gracz z najwyższą średnią z meczów tego tygodnia", icon: "📊", field: "avg", agg: "max" },
  { type: "avg_above_30", title: "Ponad 30 ppd", desc: "Gracz z najmiaższą średnią powyżej 30 punktów na rzutkę", icon: "📈", field: "avg", agg: "max" },
  { type: "avg_above_25", title: "Ponad 25 ppd", desc: "Gracz z najwyższą średnią powyżej 25 punktów na rzutkę", icon: "📉", field: "avg", agg: "max" },
  { type: "most_consistent", title: "Najspójniejszy", desc: "Gracz z najmniejszą wariancją średniej z meczów", icon: "🎯", field: "avg", agg: "consistent" },
  { type: "high_avg_minimum", title: "Stały gracz 25+", desc: "Gracz ze wszystkimi meczami powyżej 25 ppd", icon: "💪", field: "avg", agg: "consistent" },
  { type: "lowest_avg_loss", title: "Najgorzej i upadek", desc: "Gracz z największą stratą średniej w przegranych", icon: "📉", field: "avg", agg: "min" },
  { type: "most_matches_played", title: "Pracoholik", desc: "Gracz, który rozegrał więcej meczów niż inni", icon: "⚡", field: "matchCount", agg: "max" },
  { type: "best_100_plus", title: "Profesjonalista", desc: "Najwyższa średnia wśród graczy z meczami 100+", icon: "🏆", field: "avg", agg: "max", filter: "avg100+" },

  // 180-ki (8 challenge'ów)
  { type: "most_180s", title: "Król 180-tek", desc: "Najwięcej rzutów 180 w tym tygodniu", icon: "💯", field: "one_eighties", agg: "sum" },
  { type: "most_180s_per_match", title: "180 per mecz", desc: "Przeciętnie najczęściej 180 na mecz", icon: "🎪", field: "one_eighties_avg", agg: "max" },
  { type: "first_180", title: "180 na otwarcie", desc: "Każdy mecz zawarł conajmniej jedno 180", icon: "🎯", field: "one_eighties", agg: "sum", filter: "all_matches" },
  { type: "most_180_single", title: "Rekordowy szereg 180", desc: "Największa liczba 180 w jednym pojedynczym meczu", icon: "🔥", field: "one_eighties_single", agg: "max" },
  { type: "180_combo", title: "Dziesiątka 180", desc: "Co najmniej 10 rzutów 180 w tygodniu", icon: "💯💯", field: "one_eighties", agg: "sum", filter: "min_10" },
  { type: "no_180_winner", title: "Precyzjoner", desc: "Wygrał bez pojedynczego 180 w tygodniu", icon: "🎯", field: "one_eighties", agg: "sum", filter: "zero" },
  { type: "most_180_vs_best", title: "180 kontra średnia", desc: "Gracz z najlepszym stosunkiem 180 do średniej", icon: "⚖️", field: "avg", agg: "max", filter: "ratio_180_avg" },
  { type: "180_progression", title: "Progresja 180", desc: "Każdy tydzień więcej 180 niż ostatnio", icon: "📈💯", field: "one_eighties", agg: "sum", filter: "progression" },

  // Checkouty (8 challenge'ów)
  { type: "best_checkout", title: "Najwyższy checkout", desc: "Najwyższy checkout tygodnia", icon: "🎯", field: "high_checkout", agg: "max" },
  { type: "most_cleanups", title: "Zawojownik", desc: "Gracz który zakończył najwięcej meczów na wysokim checkoucie", icon: "✨", field: "checkouts", agg: "sum" },
  { type: "checkout_140_plus", title: "100+ czysty", desc: "Najwyższy checkout - co najmniej 140", icon: "🏅", field: "high_checkout", agg: "max", filter: "min_140" },
  { type: "checkout_180", title: "Idealna końcówka", desc: "Gracz, który skończył na 180", icon: "💯", field: "high_checkout", agg: "match", filter: "equals_180" },
  { type: "most_50_plus", title: "Finiszer", desc: "Najwięcej meczów z checkoutem 50+", icon: "🎯", field: "checkouts_50", agg: "sum" },
  { type: "inconsistent_checkout", title: "Loteria", desc: "Gracz z największą różnicą między checkoutami", icon: "🎲", field: "high_checkout", agg: "variance" },
  { type: "early_checkout", title: "Szybki finish", desc: "Średnio najniższy ostateczny checkout wśród zwycięzców", icon: "⚡", field: "high_checkout", agg: "min", filter: "winners" },
  { type: "double_checkout_lover", title: "Miłośnik podwójnych", desc: "Zawsze na 2, nigdy na 1 lub 3 w finiszu", icon: "2️⃣", field: "checkouts_double", agg: "sum", filter: "all_matches" },

  // Duże podejścia (8 challenge'ów)
  { type: "most_tons", title: "Maszyna wysokich podejść", desc: "Najwięcej wysokich podejść (60-99, 100-139, 140-169, 170-180) w tygodniu", icon: "🎪", field: "tons", agg: "sum" },
  { type: "most_160_plus", title: "High roller", desc: "Najwięcej serii 160-180 w tygodniu", icon: "💥", field: "ton_plus", agg: "sum" },
  { type: "most_140_159", title: "Solidny gracz", desc: "Najwięcej serii 140-159 w tygodniu", icon: "💪", field: "ton_100", agg: "sum" },
  { type: "most_100_139", title: "Stabilny", desc: "Najwięcej serii 100-139 w tygodniu", icon: "✅", field: "ton_80", agg: "sum" },
  { type: "most_60_99", title: "Beginner pro", desc: "Najwięcej serii 60-99 w tygodniu", icon: "👶", field: "ton_60", agg: "sum" },
  { type: "tons_per_match", title: "Rytm wysokich", desc: "Średnio największa liczba wysokich podejść na mecz", icon: "🎯", field: "tons_avg", agg: "max" },
  { type: "max_tons_single", title: "Rekord wybuchu", desc: "Największa liczba wysokich podejść w jednym meczu", icon: "🌟", field: "tons_single", agg: "max" },
  { type: "tons_consistency", title: "Niezawodny", desc: "Gracz co mecz co najmniej 5 wysokich podejść", icon: "🔄", field: "tons", agg: "sum", filter: "min_5_every" },

  // Wygrane i porażki (8 challenge'ów)
  { type: "most_wins", title: "Seria zwycięstw", desc: "Najwięcej wygranych meczów w tygodniu", icon: "🔥", field: "wins", agg: "sum" },
  { type: "best_win_ratio", title: "Najlepszy stosunek W/L", desc: "Gracz z najwyższym procentem zwycięstw", icon: "📊", field: "win_ratio", agg: "max" },
  { type: "perfect_week", title: "Idealne 5/0", desc: "Ktoś wygrał wszystkie swoje mecze bez porażki", icon: "⭐", field: "wins", agg: "max", filter: "perfect" },
  { type: "comeback_king", title: "Mistrz znowelacji", desc: "Gracz z największą liczbą wygranych z deficytu", icon: "🆙", field: "comebacks", agg: "sum" },
  { type: "most_losses", title: "Pech samotnie", desc: "Gracz z najmniej wygranych - ale nie poddał się!", icon: "💔", field: "losses", agg: "max" },
  { type: "only_winner", title: "Solo wygrana", desc: "Wygrał jedyną grę w tygodniu", icon: "🏆", field: "wins", agg: "sum", filter: "single_winner" },
  { type: "balanced_record", title: "W równowadze", desc: "Gracz z najbliższą proporcją 50/50 zwycięstw/porażek", icon: "⚖️", field: "balance", agg: "max" },
  { type: "underdog", title: "Underdog", desc: "Wygrał mimo bycia faworytem na porażkę w rankingu", icon: "🐕", field: "upset_wins", agg: "sum" },

  // Specjalne i różne (10 challenge'ów)
  { type: "combo_master", title: "Profesor 180+Checkout", desc: "Najwyższa 180 + najlepszy checkout razem", icon: "🎊", field: "combo_score", agg: "max" },
  { type: "big_day", title: "Gorący dzień", desc: "Najlepszy dzień w jednym meczu (średnia+180+checkout)", icon: "🔥", field: "big_day_score", agg: "max" },
  { type: "consistency_week", title: "Pan regularności", desc: "Gracz z najmniejszą wariancją wyniku między meczami", icon: "📊", field: "score_variance", agg: "min" },
  { type: "thriller_master", title: "Mistrz dramaturgii", desc: "Wygrał mecze rozstrzygnięte na najmniejszą różnicę", icon: "⚔️", field: "close_wins", agg: "sum" },
  { type: "dominant_week", title: "Dominacja", desc: "Średnia minimum 30, minimum 3 wygrane, min 5x180", icon: "👑", field: "dominance_score", agg: "max", filter: "all_conditions" },
  { type: "surprise_surge", title: "Eksplozja formy", desc: "Najszybszy wzrost średniej między pierwszym a ostatnim meczem", icon: "📈", field: "avg_growth", agg: "max" },
  { type: "tight_matches", title: "Tworzył emocje", desc: "Grał w meczach z największymi różnicami średnich", icon: "⚡", field: "tight_match_count", agg: "max" },
  { type: "long_grind", title: "Długa битва", desc: "Gracz w meczach z największą liczą rzutów (najdłuższe msze)", icon: "⏱️", field: "total_darts_thrown", agg: "sum" },
  { type: "turnip_up", title: "Refleksja", desc: "Gracz, którego 1. mecz był najgorszym, a ostatni najlepszy", icon: "📱", field: "improvement", agg: "max" },
  { type: "jack_of_all", title: "Uniwersalista", desc: "Najwyższy wynik w 4+ różnych kategorii", icon: "🌈", field: "versatility", agg: "max" },
];

const REWARDS = [
  { rank: 1, type: "badge", value: "🥇 Mistrz Tygodnia" },
  { rank: 2, type: "badge", value: "🥈 Wicemistrz Tygodnia" },
  { rank: 3, type: "badge", value: "🥉 III Miejsce Tygodnia" },
];

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Auth: allow only service_role (cron) or admin users
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "") || "";
    const isServiceRole = token === serviceKey;

    if (!isServiceRole) {
      // Check if caller is an admin
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      let isAdmin = false;
      if (authHeader?.startsWith("Bearer ") && token !== anonKey) {
        try {
          const authClient = createClient(supabaseUrl, anonKey, {
            global: { headers: { Authorization: `Bearer ${token}` } },
          });
          const { data: claimsData } = await authClient.auth.getClaims(token);
          if (claimsData?.claims?.sub) {
            const adminClient = createClient(supabaseUrl, serviceKey);
            const { data: roleCheck } = await adminClient.rpc("has_role", {
              _user_id: claimsData.claims.sub,
              _role: "admin",
            });
            isAdmin = roleCheck === true;
          }
        } catch { /* not admin */ }
      }
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

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
      // Pick 8 random challenges for this week (rotates through ~50 challenges)
      const shuffled = [...CHALLENGE_POOL].sort(() => Math.random() - 0.5);
      const picks = shuffled.slice(0, 8);

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
