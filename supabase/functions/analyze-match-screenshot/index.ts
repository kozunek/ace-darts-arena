import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const OPENAI_GATEWAY = "https://api.openai.com/v1/chat/completions";
const GEMINI_GATEWAY = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const LOVABLE_AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

/**
 * Resolve AI config — priority:
 * 1. Custom key from app_config (user's own OpenAI/Gemini key)
 * 2. Lovable AI Gateway (free tier, uses LOVABLE_API_KEY secret)
 */
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

  // If custom key is set, use it (priority)
  if (customKey) {
    if (configMap["custom_ai_endpoint"]) {
      return {
        url: configMap["custom_ai_endpoint"],
        apiKey: customKey,
        model: configMap["custom_ai_model"] || "gpt-4o",
      };
    }
    if (customKey.startsWith("sk-")) {
      return { url: OPENAI_GATEWAY, apiKey: customKey, model: configMap["custom_ai_model"] || "gpt-4o" };
    }
    if (customKey.startsWith("AIza")) {
      return { url: GEMINI_GATEWAY, apiKey: customKey, model: configMap["custom_ai_model"] || "gemini-2.5-flash" };
    }
    return { url: OPENAI_GATEWAY, apiKey: customKey, model: configMap["custom_ai_model"] || "gpt-4o" };
  }

  // Fallback: Lovable AI Gateway (free tier)
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  if (lovableKey) {
    return {
      url: LOVABLE_AI_GATEWAY,
      apiKey: lovableKey,
      // Use flash for cost efficiency on free tier
      model: configMap["custom_ai_model"] || "google/gemini-2.5-flash",
    };
  }

  throw new Error("AI not configured. Set custom_ai_api_key in admin panel → Integrations, or enable Lovable AI.");
}

const buildSystemPrompt = (matchContext?: { player1_name: string; player2_name: string }) => {
  let prompt = `Jesteś ekspertem od darta. Analizujesz zrzuty ekranu z aplikacji do darta (DartCounter, DartsMind, Autodarts lub inne).
Twoim zadaniem jest wyodrębnić statystyki meczu ze zrzutów ekranu.

WAŻNE ZASADY:
- Wyodrębnij TYLKO dane, które wyraźnie widzisz na zrzucie ekranu
- Jeśli jakiejś statystyki nie widzisz, ustaw ją na null
- Jeśli nie jesteś pewny wartości (niewyraźny tekst), ustaw confidence na "low"
- Jeśli zrzut ekranu jest czytelny i dane jasne, ustaw confidence na "high"
- Jeśli zrzut nie wygląda na podsumowanie meczu darta, ustaw confidence na "none"
- Nazwy graczy: wyodrębnij dokładnie jak są napisane na screenie
- Wynik: to liczba wygranych legów (np. 3:2 oznacza score1=3, score2=2)
- Średnia (average): 3-dart average, zazwyczaj liczba z dwoma miejscami po przecinku
- 180s: liczba rzutów 180
- Checkout: najwyższe zamknięcie (highest checkout)
- Checkout %: procent skuteczności na dubla - jeśli widzisz format "X/Y" to hits=X, attempts=Y
- Ton ranges: 60+ (60-99), 100+ (100-139), 140+ (140-179), 180
- Darts thrown: łączna liczba rzuconych lotek
- First 9 average: średnia z pierwszych 9 lotek (3 wizyty)

Rozpoznaj platformę po wyglądzie interfejsu:
- DartCounter: zwykle ciemny motyw, zielone/niebieskie akcenty
- DartsMind: ciemny motyw ze złotymi/beżowymi akcentami. KRYTYCZNE ZASADY DLA DARTSMIND:
  1. Duże liczby u góry (np. 141, 0) to POZOSTAŁE PUNKTY w bieżącym legu — to NIE jest wynik meczu!
  2. WYNIK MECZU (score1/score2) = liczba kolorowych kropek na CZARNYM PASKU pomiędzy sekcją z nazwami graczy a statystykami.
  3. Jeśli widzisz tekst "Player X wins this match" — ten gracz wygrał cały mecz.
  4. "PPR" = Points Per Round = 3-dart average (avg). "FIRST 9 PPR" = first 9 darts average.
  5. KRYTYCZNE — MAPOWANIE STATYSTYK DO GRACZY: Statystyki są w DWÓCH KOLUMNACH — lewa do lewego gracza, prawa do prawego.
  6. NIE ZWRACAJ 0:0 domyślnie.
- Autodarts: specyficzny interfejs webowy`;

  if (matchContext) {
    prompt += `

KONTEKST MECZU LIGOWEGO:
- Gracz 1 (player1): "${matchContext.player1_name}"
- Gracz 2 (player2): "${matchContext.player2_name}"

KRYTYCZNE ZADANIE - MAPOWANIE GRACZY:
1. Odczytaj nicki/nazwy graczy widoczne na screenie
2. Dopasuj je do graczy z kontekstu meczu
3. Ustaw statystyki player1_* i player2_* TAK, aby odpowiadały graczom z kontekstu
4. Jeśli nie możesz jednoznacznie dopasować nicków, ustaw matched_to_context na false`;
  }

  return prompt;
};

const extractDartsMindScoreFallback = async (
  aiConfig: { url: string; apiKey: string; model: string },
  screenshotUrls: string[],
  matchContext?: { player1_name: string; player2_name: string },
) => {
  try {
    const imageContents = screenshotUrls.map((url: string) => ({
      type: "image_url" as const,
      image_url: { url },
    }));

    const contextText = matchContext
      ? `Kontekst meczu: player1=${matchContext.player1_name}, player2=${matchContext.player2_name}.`
      : "Brak kontekstu meczu.";

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
          {
            role: "system",
            content: "Analizujesz WYŁĄCZNIE wynik meczu w aplikacji DartsMind. Wynik to liczba kolorowych kropek na czarnym pasku pod nazwami graczy.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: `Odczytaj wynik legów z kropek na czarnym pasku. ${contextText}` },
              ...imageContents,
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_dartsmind_score",
              description: "Extract only final legs score from DartsMind black-dot score bar",
              parameters: {
                type: "object",
                properties: {
                  confidence: { type: "string", enum: ["high", "low", "none"] },
                  matched_to_context: { type: "boolean" },
                  score1: { type: ["number", "null"] },
                  score2: { type: ["number", "null"] },
                },
                required: ["confidence"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_dartsmind_score" } },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("DartsMind score fallback failed:", response.status, text);
      return null;
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) return null;
    return JSON.parse(toolCall.function.arguments);
  } catch (err) {
    console.error("DartsMind score fallback error:", err);
    return null;
  }
};

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

    const body = await req.json();
    const { screenshot_urls, match_context } = body;

    if (!screenshot_urls || !Array.isArray(screenshot_urls) || screenshot_urls.length === 0) {
      return new Response(JSON.stringify({ error: "screenshot_urls array is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const imageContents = screenshot_urls.map((url: string) => ({
      type: "image_url" as const,
      image_url: { url },
    }));

    const systemPrompt = buildSystemPrompt(match_context);
    const userText = match_context
      ? `Przeanalizuj ${screenshot_urls.length > 1 ? "te zrzuty ekranu" : "ten zrzut ekranu"} z meczu darta. Mecz ligowy: "${match_context.player1_name}" vs "${match_context.player2_name}".`
      : `Przeanalizuj ${screenshot_urls.length > 1 ? "te zrzuty ekranu" : "ten zrzut ekranu"} z meczu darta i wyodrębnij statystyki.`;

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
              { type: "text", text: userText },
              ...imageContents,
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_match_stats",
              description: "Extract match statistics from darts app screenshots",
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
                },
                required: ["confidence", "platform"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_match_stats" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Zbyt wiele żądań AI — spróbuj za chwilę" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Wyczerpano limit AI — doładuj kredyty lub ustaw własny klucz API w panelu Integracje" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Błąd analizy AI" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      console.error("No tool call in response:", JSON.stringify(aiData));
      return new Response(JSON.stringify({ error: "AI nie zwróciło danych" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stats = JSON.parse(toolCall.function.arguments);

    // DartsMind score fallback
    const needsDartsMindScoreFallback =
      stats?.platform === "dartsmind" &&
      (stats?.score1 == null || stats?.score2 == null || (Number(stats?.score1) === 0 && Number(stats?.score2) === 0));

    if (needsDartsMindScoreFallback) {
      const fallbackScore = await extractDartsMindScoreFallback(aiConfig, screenshot_urls, match_context);
      if (fallbackScore && fallbackScore.confidence !== "none" && fallbackScore.score1 != null && fallbackScore.score2 != null) {
        if (!(Number(fallbackScore.score1) === 0 && Number(fallbackScore.score2) === 0)) {
          stats.score1 = fallbackScore.score1;
          stats.score2 = fallbackScore.score2;
          if (fallbackScore.matched_to_context !== undefined) {
            stats.matched_to_context = fallbackScore.matched_to_context;
          }
        }
      }
    }

    // Swap check for context mapping
    if (match_context && stats.matched_to_context === false && stats.screenshot_player1_name && stats.screenshot_player2_name) {
      const sp1 = (stats.screenshot_player1_name || "").toLowerCase();
      const sp2 = (stats.screenshot_player2_name || "").toLowerCase();
      const cp1 = match_context.player1_name.toLowerCase();
      const cp2 = match_context.player2_name.toLowerCase();

      const needsSwap = (sp1.includes(cp2) || cp2.includes(sp1)) && (sp2.includes(cp1) || cp1.includes(sp2));

      if (needsSwap) {
        const swapKeys = [
          "score", "avg", "first_9_avg", "one_eighties", "high_checkout",
          "checkout_attempts", "checkout_hits", "darts_thrown", "ton60", "ton80", "ton_plus"
        ];
        for (const key of swapKeys) {
          const k1 = `${key}1`, k2 = `${key}2`;
          [stats[k1], stats[k2]] = [stats[k2], stats[k1]];
        }
        [stats.player1_name, stats.player2_name] = [stats.player2_name, stats.player1_name];
        stats.matched_to_context = true;
        stats.was_swapped = true;
      }
    }

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
