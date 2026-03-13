import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    const body = await req.json();
    const { action } = body;

    // Internal actions (no user auth required)
    if (action === "send_match_result") {
      return await handleSendMatchResult(supabaseUrl, serviceRoleKey, body.match_data);
    }
    if (action === "send_new_player") {
      return await handleNewPlayer(supabaseUrl, serviceRoleKey, body);
    }
    if (action === "send_announcement") {
      return await handleAnnouncement(supabaseUrl, serviceRoleKey, body);
    }
    if (action === "send_league_registration") {
      return await handleLeagueRegistration(supabaseUrl, serviceRoleKey, body);
    }
    if (action === "send_match_proposal") {
      return await handleMatchProposal(supabaseUrl, serviceRoleKey, body);
    }

    // All other actions require admin auth
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return jsonResponse({ error: "Invalid token" }, 401);

    const { data: isAdmin } = await supabase.rpc("is_moderator_or_admin", { _user_id: user.id });
    if (!isAdmin) return jsonResponse({ error: "Forbidden" }, 403);

    const adminSupabase = createClient(supabaseUrl, serviceRoleKey);

    if (action === "save_webhook") {
      const { id, league_id, webhook_url, enabled, label, event_types } = body;
      
      if (webhook_url && !webhook_url.startsWith("https://discord.com/api/webhooks/")) {
        return jsonResponse({ error: "Invalid Discord webhook URL" }, 400);
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

      return jsonResponse({ success: true });
    }

    if (action === "delete_webhook") {
      const { error } = await adminSupabase.from("discord_webhooks").delete().eq("id", body.id);
      if (error) throw error;
      return jsonResponse({ success: true });
    }

    if (action === "test") {
      const { webhook_url } = body;
      if (!webhook_url) return jsonResponse({ error: "Podaj webhook URL" }, 400);

      const embed = {
        title: "🎯 eDART Polska — Test",
        description: "Połączenie z Discordem działa poprawnie! ✅",
        color: 0x5865F2,
        timestamp: new Date().toISOString(),
        footer: { text: "eDART Polska" },
      };

      const discordRes = await fetch(webhook_url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ embeds: [embed] }),
      });

      if (!discordRes.ok) {
        const errText = await discordRes.text();
        return jsonResponse({ error: `Discord error: ${errText}` }, 500);
      }

      return jsonResponse({ success: true });
    }

    return jsonResponse({ error: "Unknown action" }, 400);
  } catch (err) {
    console.error("Discord webhook error:", err);
    return jsonResponse({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});

// --- Helpers ---

async function getWebhooksForEvent(supabaseUrl: string, serviceRoleKey: string, eventType: string, leagueId?: string) {
  const adminSupabase = createClient(supabaseUrl, serviceRoleKey);
  let query = adminSupabase
    .from("discord_webhooks")
    .select("*")
    .eq("enabled", true)
    .contains("event_types", [eventType]);

  if (leagueId) {
    query = query.or(`league_id.eq.${leagueId},league_id.is.null`);
  }

  const { data } = await query;
  return data || [];
}

async function sendToWebhooks(webhooks: any[], embed: any) {
  if (webhooks.length === 0) return { success: false, reason: "No active webhooks" };

  const results = await Promise.allSettled(
    webhooks.map(async (wh) => {
      const res = await fetch(wh.webhook_url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ embeds: [embed] }),
      });
      if (!res.ok) {
        const errText = await res.text();
        console.error(`Webhook ${wh.id} error:`, errText);
        return { id: wh.id, success: false, error: errText };
      }
      return { id: wh.id, success: true };
    })
  );

  return { success: true, results };
}

// --- Event Handlers ---

async function handleSendMatchResult(supabaseUrl: string, serviceRoleKey: string, matchData: any) {
  const adminSupabase = createClient(supabaseUrl, serviceRoleKey);
  const { match_id } = matchData || {};
  if (!match_id) return jsonResponse({ error: "match_id required" }, 400);

  const { data: match } = await adminSupabase.from("matches").select("*").eq("id", match_id).single();
  if (!match) return jsonResponse({ error: "Match not found" }, 404);

  const eventType = match.is_walkover ? "walkover" : "match_result";
  const webhooks = await getWebhooksForEvent(supabaseUrl, serviceRoleKey, eventType, match.league_id);
  
  // Also get walkover webhooks if it's a walkover (they might also want match_result)
  let allWebhooks = webhooks;
  if (match.is_walkover) {
    const matchResultWebhooks = await getWebhooksForEvent(supabaseUrl, serviceRoleKey, "match_result", match.league_id);
    const existingIds = new Set(allWebhooks.map((w: any) => w.id));
    for (const wh of matchResultWebhooks) {
      if (!existingIds.has(wh.id)) allWebhooks.push(wh);
    }
  }

  if (allWebhooks.length === 0) return jsonResponse({ success: false, reason: "No active webhooks" });

  const { data: p1 } = await adminSupabase.rpc("get_player_public_info", { p_id: match.player1_id });
  const { data: p2 } = await adminSupabase.rpc("get_player_public_info", { p_id: match.player2_id });
  const { data: league } = await adminSupabase.from("leagues").select("name, season, format").eq("id", match.league_id).single();

  const p1Name = p1?.[0]?.name || "Gracz 1";
  const p2Name = p2?.[0]?.name || "Gracz 2";
  const leagueName = league ? `${league.name} — ${league.season}` : "Liga";
  const winner = (match.score1 ?? 0) > (match.score2 ?? 0) ? p1Name : p2Name;

  const statsLines: string[] = [];
  if (match.avg1 != null || match.avg2 != null) statsLines.push(`📊 Średnia: ${Number(match.avg1 ?? 0).toFixed(1)} / ${Number(match.avg2 ?? 0).toFixed(1)}`);
  if ((match.one_eighties1 ?? 0) > 0 || (match.one_eighties2 ?? 0) > 0) statsLines.push(`🎯 180s: ${match.one_eighties1 ?? 0} / ${match.one_eighties2 ?? 0}`);
  if ((match.high_checkout1 ?? 0) > 0 || (match.high_checkout2 ?? 0) > 0) statsLines.push(`✅ High CO: ${match.high_checkout1 ?? 0} / ${match.high_checkout2 ?? 0}`);
  if (match.darts_thrown1 || match.darts_thrown2) statsLines.push(`🎯 Lotki: ${match.darts_thrown1 ?? 0} / ${match.darts_thrown2 ?? 0}`);

  const embed = {
    title: `🏆 Wynik meczu — ${leagueName}`,
    description: match.is_walkover
      ? `**${p1Name}** ${match.score1 ?? 0} : ${match.score2 ?? 0} **${p2Name}**\n\n⚠️ **Walkower** — wygrywa ${winner}`
      : `**${p1Name}** ${match.score1 ?? 0} : ${match.score2 ?? 0} **${p2Name}**`,
    color: match.is_walkover ? 0xED4245 : 0x57F287,
    fields: statsLines.length > 0 ? [{ name: "Statystyki", value: statsLines.join("\n"), inline: false }] : [],
    timestamp: new Date().toISOString(),
    footer: { text: `eDART Polska${league?.format ? ` • ${league.format}` : ""}` },
  };

  return jsonResponse(await sendToWebhooks(allWebhooks, embed));
}

async function handleNewPlayer(supabaseUrl: string, serviceRoleKey: string, body: any) {
  const { player_name } = body;
  if (!player_name) return jsonResponse({ error: "player_name required" }, 400);

  const webhooks = await getWebhooksForEvent(supabaseUrl, serviceRoleKey, "new_player");

  const embed = {
    title: "👤 Nowy gracz dołączył!",
    description: `Witamy **${player_name}** w eDART Polska! 🎯`,
    color: 0x5865F2,
    timestamp: new Date().toISOString(),
    footer: { text: "eDART Polska" },
  };

  return jsonResponse(await sendToWebhooks(webhooks, embed));
}

async function handleAnnouncement(supabaseUrl: string, serviceRoleKey: string, body: any) {
  const { title, content } = body;
  if (!title) return jsonResponse({ error: "title required" }, 400);

  const webhooks = await getWebhooksForEvent(supabaseUrl, serviceRoleKey, "announcement");

  const embed = {
    title: `📢 ${title}`,
    description: content ? (content.length > 500 ? content.slice(0, 500) + "..." : content) : "",
    color: 0xFEE75C,
    timestamp: new Date().toISOString(),
    footer: { text: "eDART Polska" },
  };

  return jsonResponse(await sendToWebhooks(webhooks, embed));
}

async function handleLeagueRegistration(supabaseUrl: string, serviceRoleKey: string, body: any) {
  const { player_name, league_name, league_id } = body;
  if (!player_name || !league_name) return jsonResponse({ error: "player_name and league_name required" }, 400);

  const webhooks = await getWebhooksForEvent(supabaseUrl, serviceRoleKey, "league_registration", league_id);

  const embed = {
    title: "📋 Nowy zapis do ligi",
    description: `**${player_name}** zapisał(a) się do ligi **${league_name}** 🎯`,
    color: 0x00b0f4,
    timestamp: new Date().toISOString(),
    footer: { text: "eDART Polska" },
  };

  return jsonResponse(await sendToWebhooks(webhooks, embed));
}

async function handleMatchProposal(supabaseUrl: string, serviceRoleKey: string, body: any) {
  const { proposer_name, opponent_name, proposed_date, proposed_time } = body;
  if (!proposer_name) return jsonResponse({ error: "proposer_name required" }, 400);

  const webhooks = await getWebhooksForEvent(supabaseUrl, serviceRoleKey, "match_proposal");

  const dateStr = proposed_date || "?";
  const timeStr = proposed_time ? ` o ${proposed_time}` : "";

  const embed = {
    title: "📅 Nowa propozycja terminu",
    description: `**${proposer_name}** proponuje termin meczu z **${opponent_name || "?"}**: **${dateStr}${timeStr}**`,
    color: 0xEB459E,
    timestamp: new Date().toISOString(),
    footer: { text: "eDART Polska" },
  };

  return jsonResponse(await sendToWebhooks(webhooks, embed));
}

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
