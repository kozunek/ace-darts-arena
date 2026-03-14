import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    const body = await req.json();
    const { action } = body;

    // Internal actions (no user auth required)
    const internalHandlers: Record<string, () => Promise<Response>> = {
      send_match_result: () => handleSendMatchResult(supabaseUrl, serviceRoleKey, body.match_data),
      send_new_player: () => handleNewPlayer(supabaseUrl, serviceRoleKey, body),
      send_announcement: () => handleAnnouncement(supabaseUrl, serviceRoleKey, body),
      send_league_registration: () => handleLeagueRegistration(supabaseUrl, serviceRoleKey, body),
      send_league_unregistration: () => handleLeagueUnregistration(supabaseUrl, serviceRoleKey, body),
      send_match_proposal: () => handleMatchProposal(supabaseUrl, serviceRoleKey, body),
      send_match_proposal_accepted: () => handleMatchProposalAccepted(supabaseUrl, serviceRoleKey, body),
      send_match_pending: () => handleMatchPending(supabaseUrl, serviceRoleKey, body),
      send_league_started: () => handleLeagueStarted(supabaseUrl, serviceRoleKey, body),
      send_league_ended: () => handleLeagueEnded(supabaseUrl, serviceRoleKey, body),
      send_disqualification: () => handleDisqualification(supabaseUrl, serviceRoleKey, body),
      send_weekly_challenge: () => handleWeeklyChallenge(supabaseUrl, serviceRoleKey, body),
      send_high_score_alert: () => handleHighScoreAlert(supabaseUrl, serviceRoleKey, body),
    };

    if (internalHandlers[action]) return await internalHandlers[action]();

    // All other actions require admin auth
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return json({ error: "Invalid token" }, 401);

    const { data: isAdmin } = await supabase.rpc("is_moderator_or_admin", { _user_id: user.id });
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    const adminSupabase = createClient(supabaseUrl, serviceRoleKey);

    if (action === "save_webhook") {
      const { id, league_id, webhook_url, enabled, label, event_types } = body;
      if (webhook_url && !webhook_url.startsWith("https://discord.com/api/webhooks/")) {
        return json({ error: "Invalid Discord webhook URL" }, 400);
      }
      const payload: Record<string, any> = {
        webhook_url, enabled, label,
        league_id: league_id || null,
        event_types: event_types || ["match_result"],
        updated_at: new Date().toISOString(),
      };
      if (id) {
        const { error } = await adminSupabase.from("discord_webhooks").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await adminSupabase.from("discord_webhooks").insert(payload);
        if (error) throw error;
      }
      return json({ success: true });
    }

    if (action === "delete_webhook") {
      const { error } = await adminSupabase.from("discord_webhooks").delete().eq("id", body.id);
      if (error) throw error;
      return json({ success: true });
    }

    if (action === "test") {
      const { webhook_url } = body;
      if (!webhook_url) return json({ error: "Podaj webhook URL" }, 400);
      const embed = {
        title: "🎯 eDART Polska — Test",
        description: "Połączenie z Discordem działa poprawnie! ✅",
        color: 0x5865F2,
        timestamp: new Date().toISOString(),
        footer: { text: "eDART Polska" },
      };
      const res = await fetch(webhook_url, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ embeds: [embed] }),
      });
      if (!res.ok) return json({ error: `Discord error: ${await res.text()}` }, 500);
      return json({ success: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    console.error("Discord webhook error:", err);
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});

// --- Helpers ---

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function getWebhooks(supabaseUrl: string, serviceRoleKey: string, eventType: string, leagueId?: string) {
  const db = createClient(supabaseUrl, serviceRoleKey);
  let query = db.from("discord_webhooks").select("*").eq("enabled", true).contains("event_types", [eventType]);
  if (leagueId) query = query.or(`league_id.eq.${leagueId},league_id.is.null`);
  const { data } = await query;
  return data || [];
}

async function sendEmbeds(webhooks: any[], embed: any) {
  if (!webhooks.length) return { success: false, reason: "No active webhooks" };
  const results = await Promise.allSettled(webhooks.map(async (wh) => {
    const res = await fetch(wh.webhook_url, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] }),
    });
    if (!res.ok) console.error(`Webhook ${wh.id} error:`, await res.text());
    return { id: wh.id, success: res.ok };
  }));
  return { success: true, results };
}

function coPct(hits: number, attempts: number): string {
  if (attempts <= 0) return "0.00% (0/0)";
  return `${((hits / attempts) * 100).toFixed(2)}% (${hits}/${attempts})`;
}

function playerName(info: any[] | null, fallback: string) {
  return info?.[0]?.name || fallback;
}

// --- Event Handlers ---

async function handleSendMatchResult(url: string, key: string, matchData: any) {
  const db = createClient(url, key);
  const { match_id } = matchData || {};
  if (!match_id) return json({ error: "match_id required" }, 400);

  const { data: m } = await db.from("matches").select("*").eq("id", match_id).single();
  if (!m) return json({ error: "Match not found" }, 404);

  const eventType = m.is_walkover ? "walkover" : "match_result";
  let webhooks = await getWebhooks(url, key, eventType, m.league_id);
  if (m.is_walkover) {
    const extra = await getWebhooks(url, key, "match_result", m.league_id);
    const ids = new Set(webhooks.map((w: any) => w.id));
    for (const w of extra) if (!ids.has(w.id)) webhooks.push(w);
  }
  if (!webhooks.length) return json({ success: false, reason: "No active webhooks" });

  const { data: p1 } = await db.rpc("get_player_public_info", { p_id: m.player1_id });
  const { data: p2 } = await db.rpc("get_player_public_info", { p_id: m.player2_id });
  const { data: league } = await db.from("leagues").select("name, season, format").eq("id", m.league_id).single();

  const n1 = playerName(p1, "Gracz 1"), n2 = playerName(p2, "Gracz 2");
  const ln = league ? `${league.name} — ${league.season}` : "Liga";
  const winner = (m.score1 ?? 0) > (m.score2 ?? 0) ? n1 : n2;

  const stats: string[] = [];
  if (m.avg1 != null || m.avg2 != null)
    stats.push(`📊 Średnia: ${Number(m.avg1 ?? 0).toFixed(2)} / ${Number(m.avg2 ?? 0).toFixed(2)}`);
  if (m.first_9_avg1 != null || m.first_9_avg2 != null)
    stats.push(`📊 First 9: ${Number(m.first_9_avg1 ?? 0).toFixed(2)} / ${Number(m.first_9_avg2 ?? 0).toFixed(2)}`);
  if ((m.one_eighties1 ?? 0) > 0 || (m.one_eighties2 ?? 0) > 0)
    stats.push(`🎯 180s: ${m.one_eighties1 ?? 0} / ${m.one_eighties2 ?? 0}`);
  if ((m.nine_darters1 ?? 0) > 0 || (m.nine_darters2 ?? 0) > 0)
    stats.push(`⭐ 9-darters: ${m.nine_darters1 ?? 0} / ${m.nine_darters2 ?? 0}`);
  if ((m.high_checkout1 ?? 0) > 0 || (m.high_checkout2 ?? 0) > 0)
    stats.push(`✅ High CO: ${m.high_checkout1 ?? 0} / ${m.high_checkout2 ?? 0}`);

  const tonLines: string[] = [];
  if ((m.ton60_1 ?? 0) + (m.ton60_2 ?? 0) > 0) tonLines.push(`60+: ${m.ton60_1 ?? 0}/${m.ton60_2 ?? 0}`);
  if ((m.ton80_1 ?? 0) + (m.ton80_2 ?? 0) > 0) tonLines.push(`100+: ${m.ton80_1 ?? 0}/${m.ton80_2 ?? 0}`);
  if ((m.ton_plus1 ?? 0) + (m.ton_plus2 ?? 0) > 0) tonLines.push(`140+: ${m.ton_plus1 ?? 0}/${m.ton_plus2 ?? 0}`);
  if ((m.ton40_1 ?? 0) + (m.ton40_2 ?? 0) > 0) tonLines.push(`170+: ${m.ton40_1 ?? 0}/${m.ton40_2 ?? 0}`);
  if (tonLines.length) stats.push(`🎲 ${tonLines.join(" · ")}`);

  if ((m.darts_thrown1 ?? 0) > 0 || (m.darts_thrown2 ?? 0) > 0)
    stats.push(`🎯 Lotki: ${m.darts_thrown1 ?? 0} / ${m.darts_thrown2 ?? 0}`);

  if ((m.checkout_attempts1 ?? 0) > 0 || (m.checkout_attempts2 ?? 0) > 0)
    stats.push(`✅ CO%: ${coPct(m.checkout_hits1, m.checkout_attempts1)} / ${coPct(m.checkout_hits2, m.checkout_attempts2)}`);

  const fields = stats.length > 0 ? [{ name: "📈 Statystyki", value: stats.join("\n"), inline: false }] : [];

  const embed = {
    title: m.is_walkover ? `⚠️ Walkower — ${ln}` : `🏆 Wynik meczu — ${ln}`,
    description: m.is_walkover
      ? `**${n1}** ${m.score1 ?? 0} : ${m.score2 ?? 0} **${n2}**\n\n⚠️ **Walkower** — wygrywa ${winner}`
      : `**${n1}** ${m.score1 ?? 0} : ${m.score2 ?? 0} **${n2}**\n\n🏅 Wygrywa: **${winner}**`,
    color: m.is_walkover ? 0xED4245 : 0x57F287,
    fields,
    timestamp: new Date().toISOString(),
    footer: { text: `eDART Polska${league?.format ? ` • ${league.format}` : ""}` },
  };

  // Also send high score alert if applicable
  const has180 = (m.one_eighties1 ?? 0) > 0 || (m.one_eighties2 ?? 0) > 0;
  const has9d = (m.nine_darters1 ?? 0) > 0 || (m.nine_darters2 ?? 0) > 0;
  const hasHighCO = (m.high_checkout1 ?? 0) >= 150 || (m.high_checkout2 ?? 0) >= 150;
  if (has180 || has9d || hasHighCO) {
    const alertWebhooks = await getWebhooks(url, key, "high_score_alert", m.league_id);
    if (alertWebhooks.length) {
      const highlights: string[] = [];
      if ((m.nine_darters1 ?? 0) > 0) highlights.push(`⭐ **${n1}** — ${m.nine_darters1}x 9-darter!`);
      if ((m.nine_darters2 ?? 0) > 0) highlights.push(`⭐ **${n2}** — ${m.nine_darters2}x 9-darter!`);
      if ((m.one_eighties1 ?? 0) > 0) highlights.push(`🎯 **${n1}** — ${m.one_eighties1}x 180`);
      if ((m.one_eighties2 ?? 0) > 0) highlights.push(`🎯 **${n2}** — ${m.one_eighties2}x 180`);
      if ((m.high_checkout1 ?? 0) >= 150) highlights.push(`✅ **${n1}** — checkout ${m.high_checkout1}`);
      if ((m.high_checkout2 ?? 0) >= 150) highlights.push(`✅ **${n2}** — checkout ${m.high_checkout2}`);
      const alertEmbed = {
        title: `🔥 Wybitny wynik! — ${ln}`,
        description: highlights.join("\n"),
        color: 0xFFA500,
        timestamp: new Date().toISOString(),
        footer: { text: "eDART Polska" },
      };
      await sendEmbeds(alertWebhooks, alertEmbed);
    }
  }

  return json(await sendEmbeds(webhooks, embed));
}

async function handleNewPlayer(url: string, key: string, body: any) {
  const { player_name } = body;
  if (!player_name) return json({ error: "player_name required" }, 400);
  const webhooks = await getWebhooks(url, key, "new_player");
  const embed = {
    title: "👤 Nowy gracz dołączył!",
    description: `Witamy **${player_name}** w eDART Polska! 🎯`,
    color: 0x5865F2,
    timestamp: new Date().toISOString(),
    footer: { text: "eDART Polska" },
  };
  return json(await sendEmbeds(webhooks, embed));
}

async function handleAnnouncement(url: string, key: string, body: any) {
  const { title, content } = body;
  if (!title) return json({ error: "title required" }, 400);
  const webhooks = await getWebhooks(url, key, "announcement");
  const embed = {
    title: `📢 ${title}`,
    description: content ? (content.length > 500 ? content.slice(0, 500) + "..." : content) : "",
    color: 0xFEE75C,
    timestamp: new Date().toISOString(),
    footer: { text: "eDART Polska" },
  };
  return json(await sendEmbeds(webhooks, embed));
}

async function handleLeagueRegistration(url: string, key: string, body: any) {
  const { player_name, league_name, league_id } = body;
  if (!player_name || !league_name) return json({ error: "player_name and league_name required" }, 400);
  const webhooks = await getWebhooks(url, key, "league_registration", league_id);
  const embed = {
    title: "📋 Nowy zapis do ligi",
    description: `**${player_name}** zapisał(a) się do ligi **${league_name}** 🎯`,
    color: 0x00b0f4,
    timestamp: new Date().toISOString(),
    footer: { text: "eDART Polska" },
  };
  return json(await sendEmbeds(webhooks, embed));
}

async function handleLeagueUnregistration(url: string, key: string, body: any) {
  const { player_name, league_name, league_id } = body;
  if (!player_name || !league_name) return json({ error: "player_name and league_name required" }, 400);
  const webhooks = await getWebhooks(url, key, "league_unregistration", league_id);
  const embed = {
    title: "📤 Gracz opuścił ligę",
    description: `**${player_name}** wypisał(a) się z ligi **${league_name}**`,
    color: 0x95a5a6,
    timestamp: new Date().toISOString(),
    footer: { text: "eDART Polska" },
  };
  return json(await sendEmbeds(webhooks, embed));
}

async function handleMatchProposal(url: string, key: string, body: any) {
  const { proposer_name, opponent_name, proposed_date, proposed_time } = body;
  if (!proposer_name) return json({ error: "proposer_name required" }, 400);
  const webhooks = await getWebhooks(url, key, "match_proposal");
  const dateStr = proposed_date || "?";
  const timeStr = proposed_time ? ` o ${proposed_time}` : "";
  const embed = {
    title: "📅 Nowa propozycja terminu",
    description: `**${proposer_name}** proponuje termin meczu z **${opponent_name || "?"}**: **${dateStr}${timeStr}**`,
    color: 0xEB459E,
    timestamp: new Date().toISOString(),
    footer: { text: "eDART Polska" },
  };
  return json(await sendEmbeds(webhooks, embed));
}

async function handleMatchProposalAccepted(url: string, key: string, body: any) {
  const { accepter_name, proposer_name, proposed_date, proposed_time } = body;
  if (!accepter_name) return json({ error: "accepter_name required" }, 400);
  const webhooks = await getWebhooks(url, key, "match_proposal_accepted");
  const dateStr = proposed_date || "?";
  const timeStr = proposed_time ? ` o ${proposed_time}` : "";
  const embed = {
    title: "✅ Termin zaakceptowany!",
    description: `**${accepter_name}** zaakceptował termin meczu z **${proposer_name || "?"}**: **${dateStr}${timeStr}**`,
    color: 0x2ECC71,
    timestamp: new Date().toISOString(),
    footer: { text: "eDART Polska" },
  };
  return json(await sendEmbeds(webhooks, embed));
}

async function handleMatchPending(url: string, key: string, body: any) {
  const { player1_name, player2_name, score1, score2, league_name } = body;
  const webhooks = await getWebhooks(url, key, "match_pending");
  const embed = {
    title: "⏳ Wynik do zatwierdzenia",
    description: `**${player1_name || "?"}** ${score1 ?? 0} : ${score2 ?? 0} **${player2_name || "?"}**\n\nLiga: **${league_name || "?"}**\nCzeka na akceptację admina.`,
    color: 0xF1C40F,
    timestamp: new Date().toISOString(),
    footer: { text: "eDART Polska" },
  };
  return json(await sendEmbeds(webhooks, embed));
}

async function handleLeagueStarted(url: string, key: string, body: any) {
  const { league_name, league_id, player_count } = body;
  if (!league_name) return json({ error: "league_name required" }, 400);
  const webhooks = await getWebhooks(url, key, "league_started", league_id);
  const embed = {
    title: "🚀 Liga wystartowała!",
    description: `**${league_name}** oficjalnie wystartowała!${player_count ? `\n\n👥 Liczba graczy: **${player_count}**` : ""}`,
    color: 0x2ECC71,
    timestamp: new Date().toISOString(),
    footer: { text: "eDART Polska" },
  };
  return json(await sendEmbeds(webhooks, embed));
}

async function handleLeagueEnded(url: string, key: string, body: any) {
  const { league_name, league_id, winner_name } = body;
  if (!league_name) return json({ error: "league_name required" }, 400);
  const webhooks = await getWebhooks(url, key, "league_ended", league_id);
  const embed = {
    title: "🏁 Liga zakończona!",
    description: `**${league_name}** dobiegła końca!${winner_name ? `\n\n🏆 Zwycięzca: **${winner_name}**` : ""}`,
    color: 0x9B59B6,
    timestamp: new Date().toISOString(),
    footer: { text: "eDART Polska" },
  };
  return json(await sendEmbeds(webhooks, embed));
}

async function handleDisqualification(url: string, key: string, body: any) {
  const { player_name, league_name, league_id, reason } = body;
  if (!player_name) return json({ error: "player_name required" }, 400);
  const webhooks = await getWebhooks(url, key, "disqualification", league_id);
  const embed = {
    title: "🚫 Dyskwalifikacja",
    description: `**${player_name}** został zdyskwalifikowany z ligi **${league_name || "?"}**${reason ? `\n\n📝 Powód: ${reason}` : ""}`,
    color: 0xE74C3C,
    timestamp: new Date().toISOString(),
    footer: { text: "eDART Polska" },
  };
  return json(await sendEmbeds(webhooks, embed));
}

async function handleWeeklyChallenge(url: string, key: string, body: any) {
  const { title, description, icon } = body;
  if (!title) return json({ error: "title required" }, 400);
  const webhooks = await getWebhooks(url, key, "weekly_challenge");
  const embed = {
    title: `${icon || "🎖️"} Nowe wyzwanie: ${title}`,
    description: description || "",
    color: 0xE67E22,
    timestamp: new Date().toISOString(),
    footer: { text: "eDART Polska" },
  };
  return json(await sendEmbeds(webhooks, embed));
}

async function handleHighScoreAlert(url: string, key: string, body: any) {
  const { player_name, achievement, league_name, league_id } = body;
  if (!player_name) return json({ error: "player_name required" }, 400);
  const webhooks = await getWebhooks(url, key, "high_score_alert", league_id);
  const embed = {
    title: "🔥 Wybitny wynik!",
    description: `**${player_name}** — ${achievement || "niesamowity wynik!"}${league_name ? `\n\nLiga: **${league_name}**` : ""}`,
    color: 0xFFA500,
    timestamp: new Date().toISOString(),
    footer: { text: "eDART Polska" },
  };
  return json(await sendEmbeds(webhooks, embed));
}
