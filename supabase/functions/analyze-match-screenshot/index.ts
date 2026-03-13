import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOVABLE_AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const OPENAI_GATEWAY = "https://api.openai.com/v1/chat/completions";
const GEMINI_GATEWAY = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

/** Resolve which AI endpoint + key to use. Custom key from app_config takes priority. */
async function resolveAiConfig(serviceClient: any): Promise<{ url: string; apiKey: string }> {
  // Check if custom AI API key is configured in app_config
  const { data } = await serviceClient
    .from("app_config")
    .select("value")
    .eq("key", "custom_ai_api_key")
    .maybeSingle();

  const customKey = data?.value?.trim();

  if (customKey) {
    // Detect provider from key prefix
    if (customKey.startsWith("sk-")) {
      return { url: OPENAI_GATEWAY, apiKey: customKey };
    }
    if (customKey.startsWith("AIza")) {
      return { url: GEMINI_GATEWAY, apiKey: customKey };
    }
    // Fallback: treat as OpenAI-compatible
    return { url: OPENAI_GATEWAY, apiKey: customKey };
  }

  // Default: use Lovable AI gateway
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  if (!lovableKey) {
    throw new Error("AI not configured");
  }
  return { url: LOVABLE_AI_GATEWAY, apiKey: lovableKey };
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
  2. WYNIK MECZU (score1/score2) = liczba kolorowych kropek na CZARNYM PASKU pomiędzy sekcją z nazwami graczy a statystykami. Ten czarny pasek zawiera małe okrągłe kropki (pomarańczowe/żółte/złote). Każda kropka = 1 wygrany leg. Policz kropki osobno dla lewej i prawej strony.
  3. Przykład: jeśli na czarnym pasku są 2 kropki po prawej stronie i 0 po lewej → score dla prawego gracza = 2, lewego = 0.
  4. Jeśli widzisz tekst "Player X wins this match" — ten gracz wygrał cały mecz.
  5. Zakładka "LEG STATS" pokazuje statystyki z jednego lega. Zakładka "MATCH STATS" pokazuje statystyki z całego meczu — preferuj MATCH STATS jeśli jest widoczna.
  6. "PPR" = Points Per Round = 3-dart average (avg). "FIRST 9 PPR" = first 9 darts average. "CHECKOUT POINTS" = highest checkout. "CHECKOUT%" z formatem "X% (Y/Z)" → hits=Y, attempts=Z.
  7. KRYTYCZNE — MAPOWANIE STATYSTYK DO GRACZY: Statystyki w DartsMind są wyświetlane w DWÓCH KOLUMNACH — lewa kolumna należy do gracza po LEWEJ stronie ekranu, prawa kolumna do gracza po PRAWEJ stronie. MUSISZ przypisać statystyki (PPR, checkout, 180s itd.) do TEGO SAMEGO gracza co wynik (kropki). Jeśli gracz po lewej ma więcej kropek i wygrał, to statystyki z LEWEJ kolumny należą do niego. NIE odwracaj statystyk względem wyniku — wynik i statystyki muszą być spójne dla tego samego gracza.
  8. BARDZO WAŻNE: NIE ZWRACAJ 0:0 domyślnie. Zwróć score1=0 i score2=0 TYLKO jeśli WYRAŹNIE widzisz zero kropek po obu stronach. Jeśli kropki są niewyraźne lub zasłonięte, ustaw score1/score2 na null (nie zgaduj).
- Autodarts: specyficzny interfejs webowy`;

  if (matchContext) {
    prompt += `

KONTEKST MECZU LIGOWEGO:
W systemie ligowym ten mecz jest zapisany jako:
- Gracz 1 (player1): "${matchContext.player1_name}"
- Gracz 2 (player2): "${matchContext.player2_name}"

KRYTYCZNE ZADANIE - MAPOWANIE GRACZY:
1. Odczytaj nicki/nazwy graczy widoczne na screenie (lewy/prawy lub góra/dół)
2. Dopasuj je do graczy z kontekstu meczu (player1 i player2) — porównaj nicki, mogą się nieznacznie różnić (np. skróty, wielkie/małe litery, brak polskich znaków)
3. Ustaw statystyki player1_* i player2_* TAK, aby odpowiadały graczom z kontekstu meczu, NIE pozycji na screenie
4. Przykład: jeśli na screenie "Jan" jest po lewej a "Anna" po prawej, ale w kontekście player1="Anna" a player2="Jan", to statystyki "Anna" (prawa strona screena) powinny trafić do player1_*, a "Jan" (lewa) do player2_*
5. Jeśli nie możesz jednoznacznie dopasować nicków, ustaw matched_to_context na false`;
  }

  return prompt;
};

const extractDartsMindScoreFallback = async (
  aiConfig: { url: string; apiKey: string },
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
        model: "google/gemini-2.5-pro",
        temperature: 0,
        messages: [
          {
            role: "system",
            content:
              "Analizujesz WYŁĄCZNIE wynik meczu w aplikacji DartsMind. Wynik to liczba kolorowych kropek na czarnym pasku pod nazwami graczy (każda kropka = 1 leg). Duże liczby u góry to punkty pozostałe i należy je zignorować. NIE zwracaj 0:0, jeśli widzisz choć jedną kropkę. Jeśli nie da się odczytać, zwróć null.",
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
                  confidence: {
                    type: "string",
                    enum: ["high", "low", "none"],
                  },
                  matched_to_context: {
                    type: "boolean",
                    description: "True if score1/score2 could be mapped to match context players",
                  },
                  score1: {
                    type: ["number", "null"],
                    description: "Legs won by player1 from match context (or left side if no context)",
                  },
                  score2: {
                    type: ["number", "null"],
                    description: "Legs won by player2 from match context (or right side if no context)",
                  },
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
    if (!toolCall?.function?.arguments) {
      return null;
    }

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
    // Create service client for config lookup
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const serviceClient = createClient(supabaseUrl, serviceKey);

    let aiConfig: { url: string; apiKey: string };
    try {
      aiConfig = await resolveAiConfig(serviceClient);
    } catch (e) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
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

    // Build image content for Gemini
    const imageContents = screenshot_urls.map((url: string) => ({
      type: "image_url" as const,
      image_url: { url },
    }));

    const systemPrompt = buildSystemPrompt(match_context);

    const userText = match_context
      ? `Przeanalizuj ${screenshot_urls.length > 1 ? "te zrzuty ekranu" : "ten zrzut ekranu"} z meczu darta. Mecz ligowy: "${match_context.player1_name}" vs "${match_context.player2_name}". Dopasuj graczy ze screena do tych z kontekstu i zwróć statystyki w odpowiedniej kolejności (player1_* = ${match_context.player1_name}, player2_* = ${match_context.player2_name}).`
      : `Przeanalizuj ${screenshot_urls.length > 1 ? "te zrzuty ekranu" : "ten zrzut ekranu"} z meczu darta i wyodrębnij statystyki.`;

    const response = await fetch(AI_GATEWAY, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
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
                  confidence: {
                    type: "string",
                    enum: ["high", "low", "none"],
                    description: "How confident you are in the extracted data. 'none' if this is not a darts match screenshot.",
                  },
                  platform: {
                    type: "string",
                    enum: ["dartcounter", "dartsmind", "autodarts", "unknown"],
                    description: "Detected platform/app",
                  },
                  matched_to_context: {
                    type: "boolean",
                    description: "True if player names from screenshot were successfully matched to the match context players. False if names couldn't be matched.",
                  },
                  screenshot_player1_name: { type: "string", description: "Raw name of player shown on left/top of screenshot (before mapping)" },
                  screenshot_player2_name: { type: "string", description: "Raw name of player shown on right/bottom of screenshot (before mapping)" },
                  player1_name: { type: "string", description: "Name mapped to match context player1 (or left/top if no context)" },
                  player2_name: { type: "string", description: "Name mapped to match context player2 (or right/bottom if no context)" },
                  score1: { type: ["number", "null"], description: "Legs won by player 1 (mapped to context). Use null if dots/score are unreadable." },
                  score2: { type: ["number", "null"], description: "Legs won by player 2 (mapped to context). Use null if dots/score are unreadable." },
                  avg1: { type: "number", description: "3-dart average player 1" },
                  avg2: { type: "number", description: "3-dart average player 2" },
                  first_9_avg1: { type: "number", description: "First 9 darts average player 1" },
                  first_9_avg2: { type: "number", description: "First 9 darts average player 2" },
                  one_eighties1: { type: "number", description: "180s count player 1" },
                  one_eighties2: { type: "number", description: "180s count player 2" },
                  high_checkout1: { type: "number", description: "Highest checkout player 1" },
                  high_checkout2: { type: "number", description: "Highest checkout player 2" },
                  checkout_attempts1: { type: "number", description: "Checkout attempts player 1" },
                  checkout_attempts2: { type: "number", description: "Checkout attempts player 2" },
                  checkout_hits1: { type: "number", description: "Checkout hits player 1" },
                  checkout_hits2: { type: "number", description: "Checkout hits player 2" },
                  darts_thrown1: { type: "number", description: "Total darts thrown player 1" },
                  darts_thrown2: { type: "number", description: "Total darts thrown player 2" },
                  ton60_1: { type: "number", description: "60+ scores (60-99) player 1" },
                  ton60_2: { type: "number", description: "60+ scores (60-99) player 2" },
                  ton80_1: { type: "number", description: "100+ scores (100-139) player 1" },
                  ton80_2: { type: "number", description: "100+ scores (100-139) player 2" },
                  ton_plus1: { type: "number", description: "140+ scores (140-179) player 1" },
                  ton_plus2: { type: "number", description: "140+ scores (140-179) player 2" },
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
        return new Response(JSON.stringify({ error: "Zbyt wiele żądań, spróbuj za chwilę" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Brak kredytów AI" }), {
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

    const needsDartsMindScoreFallback =
      stats?.platform === "dartsmind" &&
      (
        stats?.score1 == null ||
        stats?.score2 == null ||
        (Number(stats?.score1) === 0 && Number(stats?.score2) === 0)
      );

    if (needsDartsMindScoreFallback) {
      const fallbackScore = await extractDartsMindScoreFallback(LOVABLE_API_KEY, screenshot_urls, match_context);
      if (
        fallbackScore &&
        fallbackScore.confidence !== "none" &&
        fallbackScore.score1 != null &&
        fallbackScore.score2 != null &&
        !(Number(fallbackScore.score1) === 0 && Number(fallbackScore.score2) === 0)
      ) {
        stats.score1 = fallbackScore.score1;
        stats.score2 = fallbackScore.score2;
        if (typeof fallbackScore.matched_to_context === "boolean") {
          stats.matched_to_context = fallbackScore.matched_to_context;
        }
        console.log("Applied DartsMind score fallback:", JSON.stringify({ score1: stats.score1, score2: stats.score2 }));
      }
    }

    const isReversedAgainstContext = !!(
      match_context &&
      typeof stats?.player1_name === "string" &&
      typeof stats?.player2_name === "string" &&
      stats.player1_name.toLowerCase() === match_context.player2_name.toLowerCase() &&
      stats.player2_name.toLowerCase() === match_context.player1_name.toLowerCase()
    );

    if (isReversedAgainstContext) {
      const swapPairs: Array<[string, string]> = [
        ["score1", "score2"],
        ["avg1", "avg2"],
        ["first_9_avg1", "first_9_avg2"],
        ["one_eighties1", "one_eighties2"],
        ["high_checkout1", "high_checkout2"],
        ["checkout_attempts1", "checkout_attempts2"],
        ["checkout_hits1", "checkout_hits2"],
        ["darts_thrown1", "darts_thrown2"],
        ["ton60_1", "ton60_2"],
        ["ton80_1", "ton80_2"],
        ["ton_plus1", "ton_plus2"],
      ];

      for (const [leftKey, rightKey] of swapPairs) {
        const tmp = stats[leftKey];
        stats[leftKey] = stats[rightKey];
        stats[rightKey] = tmp;
      }

      stats.player1_name = match_context.player1_name;
      stats.player2_name = match_context.player2_name;
      stats.matched_to_context = true;
      console.log("Reversed stats detected and swapped to match context order");
    }

    console.log("Extracted stats:", JSON.stringify(stats));

    return new Response(JSON.stringify({ success: true, data: stats }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: "Błąd analizy zrzutu ekranu" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
