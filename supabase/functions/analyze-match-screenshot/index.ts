import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

const SYSTEM_PROMPT = `Jesteś ekspertem od darta. Analizujesz zrzuty ekranu z aplikacji do darta (DartCounter, DartsMind, Autodarts lub inne).
Twoim zadaniem jest wyodrębnić statystyki meczu ze zrzutów ekranu.

WAŻNE ZASADY:
- Wyodrębnij TYLKO dane, które wyraźnie widzisz na zrzucie ekranu
- Jeśli jakiejś statystyki nie widzisz, ustaw ją na null
- Jeśli nie jesteś pewny wartości (niewyraźny tekst), ustaw confidence na "low"
- Jeśli zrzut ekranu jest czytelny i dane jasne, ustaw confidence na "high"
- Jeśli zrzut nie wygląda na podsumowanie meczu darta, ustaw confidence na "none"
- Nazwy graczy: wyodrębnij dokładnie jak są napisane
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
- DartsMind: jasny lub ciemny motyw, minimalistyczny design
- Autodarts: specyficzny interfejs webowy`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
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
    const { screenshot_urls } = body;

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

    const response = await fetch(AI_GATEWAY, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Przeanalizuj ${screenshot_urls.length > 1 ? "te zrzuty ekranu" : "ten zrzut ekranu"} z meczu darta i wyodrębnij statystyki.`,
              },
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
                  player1_name: { type: "string", description: "Name of player 1 (left/top)" },
                  player2_name: { type: "string", description: "Name of player 2 (right/bottom)" },
                  score1: { type: "number", description: "Legs won by player 1" },
                  score2: { type: "number", description: "Legs won by player 2" },
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
