import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const results = { screenshots_deleted: 0, avatars_deleted: 0, errors: [] as string[] };

    // 1. Clean old screenshots (older than 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get all screenshot URLs currently referenced in matches
    const { data: matches } = await supabase
      .from("matches")
      .select("screenshot_urls")
      .not("screenshot_urls", "is", null);

    const usedScreenshotPaths = new Set<string>();
    for (const match of matches || []) {
      for (const url of (match.screenshot_urls || [])) {
        // Extract path from full URL
        const pathMatch = url.match(/match-screenshots\/(.+?)(\?|$)/);
        if (pathMatch) usedScreenshotPaths.add(pathMatch[1]);
      }
    }

    // List all files in match-screenshots bucket
    const { data: screenshotFolders } = await supabase.storage
      .from("match-screenshots")
      .list("", { limit: 1000 });

    for (const folder of screenshotFolders || []) {
      const { data: files } = await supabase.storage
        .from("match-screenshots")
        .list(folder.name, { limit: 1000 });

      for (const file of files || []) {
        const fullPath = `${folder.name}/${file.name}`;
        const isUsed = usedScreenshotPaths.has(fullPath);
        const isOld = file.created_at && new Date(file.created_at) < thirtyDaysAgo;

        if (!isUsed && isOld) {
          const { error } = await supabase.storage
            .from("match-screenshots")
            .remove([fullPath]);
          if (error) {
            results.errors.push(`screenshot ${fullPath}: ${error.message}`);
          } else {
            results.screenshots_deleted++;
          }
        }
      }
    }

    // 2. Clean orphaned avatars (user no longer exists or avatar_url doesn't match)
    const { data: players } = await supabase
      .from("players")
      .select("user_id, avatar_url");

    const usedAvatarPaths = new Set<string>();
    for (const player of players || []) {
      if (player.avatar_url) {
        const pathMatch = player.avatar_url.match(/avatars\/(.+?)(\?|$)/);
        if (pathMatch) usedAvatarPaths.add(pathMatch[1]);
      }
    }

    // List all avatar folders
    const { data: avatarFolders } = await supabase.storage
      .from("avatars")
      .list("", { limit: 1000 });

    for (const folder of avatarFolders || []) {
      if (folder.id === null) continue; // skip if it's a virtual folder marker
      
      const { data: files } = await supabase.storage
        .from("avatars")
        .list(folder.name, { limit: 1000 });

      for (const file of files || []) {
        const fullPath = `${folder.name}/${file.name}`;
        if (!usedAvatarPaths.has(fullPath)) {
          const { error } = await supabase.storage
            .from("avatars")
            .remove([fullPath]);
          if (error) {
            results.errors.push(`avatar ${fullPath}: ${error.message}`);
          } else {
            results.avatars_deleted++;
          }
        }
      }
    }

    console.log("Cleanup results:", JSON.stringify(results));

    return new Response(JSON.stringify({ success: true, ...results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Cleanup error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
