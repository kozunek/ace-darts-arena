import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const OPENAI_GATEWAY = "https://api.openai.com/v1/chat/completions";
const GEMINI_GATEWAY = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const LOVABLE_AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

async function resolveAiConfig(serviceClient: any): Promise<{ url: string; apiKey: string; model: string }> {
  const { data } = await serviceClient
    .from("app_config")
    .select("key, value")
    .in("key", ["custom_ai_api_key", "custom_ai_model", "custom_ai_endpoint"]);

  const configMap: Record<string, string> = {};
  for (const row of data || []) {
    if (row.value?.trim()) configMap[row.key] = row.value.trim();
  }

  const customKey = configMap["custom_ai_api_key"];

  if (customKey) {
    if (configMap["custom_ai_endpoint"]) {
      return { url: configMap["custom_ai_endpoint"], apiKey: customKey, model: configMap["custom_ai_model"] || "gpt-4o" };
    }
    if (customKey.startsWith("sk-")) {
      return { url: OPENAI_GATEWAY, apiKey: customKey, model: configMap["custom_ai_model"] || "gpt-4o" };
    }
    if (customKey.startsWith("AIza")) {
      return { url: GEMINI_GATEWAY, apiKey: customKey, model: configMap["custom_ai_model"] || "gemini-2.5-flash-lite" };
    }
    return { url: OPENAI_GATEWAY, apiKey: customKey, model: configMap["custom_ai_model"] || "gpt-4o" };
  }

  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  if (lovableKey) {
    return {
      url: LOVABLE_AI_GATEWAY,
      apiKey: lovableKey,
      model: configMap["custom_ai_model"] || "google/gemini-2.5-flash-lite",
    };
  }

  throw new Error("AI not configured.");
}

// Compact, focused system prompt — optimized for speed
const SYSTEM_PROMPT = `Ekspert OCR darta. Wyodrębnij statystyki ze screenshotów aplikacji dartowych.

ZASADY:
- Analizuj screenshoty w kolejności: 1) ekran końcowych statystyk, 2) ekran wyników legów, 3) ekran dodatkowych statystyk
- Jeśli pierwszy screen zawiera wszystkie dane, kolejne nie są wymagane
- Odczytaj TYLKO widoczne dane. Brak danych = null.
- score = wygrane legi (np. 3:2 → score1=3, score2=2)
- avg = 3-dart average
- first_9_avg = średnia z pierwszych 9 lotek
- checkout = najwyższy checkout; checkout_hits/attempts = skuteczność na dubla
- 180s = rzuty 180; ton60=60-99, ton80=100-139, ton_plus=140-179
- Mapuj tony: 80+→60+, 90+→60+, 120+→100+, 150+→140+
- confidence: "high" jeśli dane czytelne, "low" jeśli niewyraźne, "none" jeśli to nie mecz darta

PLATFORMY:
- DartCounter: ciemny motyw, zielone/niebieskie, wykryj 180, 140+, 100+, 9 dart finish, best leg, worst leg, average
- DartsMind: ciemny+złoty. WYNIK = kolorowe kropki na czarnym pasku (NIE duże liczby u góry!). PPR = avg. Lewa kolumna = lewy gracz. Wyniki legów w prostokątnych/kwadratowych polach pod nazwą gracza.
- Autodarts: interfejs webowy
- Detekcja aplikacji: na podstawie layoutu, ikon, charakterystycznych pól, tekstów. Obsługuj języki: angielski, polski, niemiecki itd.`;

const MATCH_CONTEXT_ADDON = (p1: string, p2: string) =>
  `\nMECZ LIGOWY: player1="${p1}", player2="${p2}". Dopasuj nicki ze screena do tych graczy. matched_to_context=true jeśli dopasowano.`;

const TOOL_SCHEMA = {
  type: "function",
  function: {
    name: "extract_match_stats",
    description: "Extract darts match stats from screenshot",
    parameters: {
      type: "object",
      properties: {
        confidence: { type: "string", enum: ["high", "low", "none"] },
        platform: { type: "string", enum: ["dartcounter", "dartsmind", "autodarts", "unknown"] },
        matched_to_context: { type: "boolean" },
        screenshot_player1_name: { type: "string" },
        screenshot_player2_name: { type: "string" },
        player1_name: { type: "string" },
        player2_name: { type: "string" },
        score1: { type: ["number", "null"] },
        score2: { type: ["number", "null"] },
        avg1: { type: "number" },
        avg2: { type: "number" },
        first_9_avg1: { type: "number" },
        first_9_avg2: { type: "number" },
        one_eighties1: { type: "number" },
        one_eighties2: { type: "number" },
        high_checkout1: { type: "number" },
        high_checkout2: { type: "number" },
        checkout_attempts1: { type: "number" },
        checkout_attempts2: { type: "number" },
        checkout_hits1: { type: "number" },
        checkout_hits2: { type: "number" },
        darts_thrown1: { type: "number" },
        darts_thrown2: { type: "number" },
        ton60_1: { type: "number" },
        ton60_2: { type: "number" },
        ton80_1: { type: "number" },
        ton80_2: { type: "number" },
        ton_plus1: { type: "number" },
        ton_plus2: { type: "number" },
        nine_darters1: { type: "number" },
        nine_darters2: { type: "number" },
      },
      required: ["confidence", "platform"],
      additionalProperties: false,
    },
  },
};

// Swap stats if players are mapped in reverse order
function swapIfNeeded(stats: any, matchContext?: { player1_name: string; player2_name: string }) {
  if (!matchContext || stats.matched_to_context !== false) return;
  if (!stats.screenshot_player1_name || !stats.screenshot_player2_name) return;

  const sp1 = (stats.screenshot_player1_name || "").toLowerCase();
  const sp2 = (stats.screenshot_player2_name || "").toLowerCase();
  const cp1 = matchContext.player1_name.toLowerCase();
  const cp2 = matchContext.player2_name.toLowerCase();

  const needsSwap = (sp1.includes(cp2) || cp2.includes(sp1)) && (sp2.includes(cp1) || cp1.includes(sp2));
  if (!needsSwap) return;

  const keys = ["score", "avg", "first_9_avg", "one_eighties", "high_checkout",
    "checkout_attempts", "checkout_hits", "darts_thrown", "ton60", "ton80", "ton_plus", "nine_darters"];
  for (const key of keys) {
    const k1 = `${key}1`, k2 = `${key}2`;
    [stats[k1], stats[k2]] = [stats[k2], stats[k1]];
  }
  [stats.player1_name, stats.player2_name] = [stats.player2_name, stats.player1_name];
  stats.matched_to_context = true;
  stats.was_swapped = true;
}

function calculateDartsThrown(stats: any) {
  if (!stats.avg1 || !stats.avg2 || !stats.score1 || !stats.score2) return;

  const totalLegs = stats.score1 + stats.score2;
  const startingPoints = 501; // assume 501

  // For DartCounter, use best/worst leg if available
  let dartsPerLeg1 = null, dartsPerLeg2 = null;
  if (stats.platform === 'dartcounter' && stats.best_leg1 && stats.worst_leg1) {
    dartsPerLeg1 = (stats.best_leg1 + stats.worst_leg1) / 2;
  } else {
    const roundsPerLeg1 = startingPoints / stats.avg1;
    dartsPerLeg1 = roundsPerLeg1 * 3;
  }
  if (stats.platform === 'dartcounter' && stats.best_leg2 && stats.worst_leg2) {
    dartsPerLeg2 = (stats.best_leg2 + stats.worst_leg2) / 2;
  } else {
    const roundsPerLeg2 = startingPoints / stats.avg2;
    dartsPerLeg2 = roundsPerLeg2 * 3;
  }

  const dartsPerLeg = (dartsPerLeg1 + dartsPerLeg2) / 2;
  const totalDarts = dartsPerLeg * totalLegs;

  stats.darts_thrown1 = Math.round(totalDarts * (stats.score1 / totalLegs));
  stats.darts_thrown2 = Math.round(totalDarts * (stats.score2 / totalLegs));
  stats.total_darts = Math.round(totalDarts);
  stats.darts_per_leg = Math.round(dartsPerLeg);
  stats.total_legs = totalLegs;
}

function mapTons(stats: any) {
  // Map ton categories to supported ones
  const tonMappings: Record<string, string> = {
    '80+': '60+',
    '90+': '60+',
    '120+': '100+',
    '150+': '140+',
  };

  // Assuming stats have ton categories like ton80_1, ton_plus1 etc.
  // If there are other categories, map them
  // For now, assume the schema has ton60, ton80, ton_plus for 60+, 100+, 140+
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const serviceClient = createClient(supabaseUrl, serviceKey);

    let aiConfig: { url: string; apiKey: string; model: string };
    try {
      aiConfig = await resolveAiConfig(serviceClient);
    } catch (e) {
      return new Response(JSON.stringify({ error: (e as Error).message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { screenshot_urls, match_context } = await req.json();

    if (!screenshot_urls || !Array.isArray(screenshot_urls) || screenshot_urls.length === 0) {
      return new Response(JSON.stringify({ error: "screenshot_urls array is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Limit to maximum 3 screenshots, in expected priority order
    const screenshotUrls = screenshot_urls.slice(0, 3);

    // Build compact prompt
    let systemPrompt = SYSTEM_PROMPT;
    if (match_context) {
      systemPrompt += MATCH_CONTEXT_ADDON(match_context.player1_name, match_context.player2_name);
    }

    const imageContents = screenshotUrls.map((url: string) => ({
      type: "image_url" as const,
      image_url: { url },
    }));

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    const response = await fetch(aiConfig.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${aiConfig.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: aiConfig.model,
        temperature: 0,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: "Wyodrębnij statystyki z tego screena." },
              ...imageContents,
            ],
          },
        ],
        tools: [TOOL_SCHEMA],
        tool_choice: { type: "function", function: { name: "extract_match_stats" } },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Zbyt wiele żądań AI — spróbuj za 30s" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Wyczerpano limit AI — doładuj kredyty lub ustaw własny klucz API" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      return new Response(JSON.stringify({ error: "Błąd analizy AI" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      console.error("No tool call:", JSON.stringify(aiData));
      return new Response(JSON.stringify({ error: "AI nie zwróciło danych" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stats = JSON.parse(toolCall.function.arguments);

    // Swap check
    swapIfNeeded(stats, match_context);

    // Calculate darts thrown
    calculateDartsThrown(stats);

    // Map tons
    mapTons(stats);

    return new Response(JSON.stringify({ success: true, data: stats }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Analysis error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
