import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // List all users
  const { data: { users }, error: listErr } = await supabase.auth.admin.listUsers({ page: 1, perPage: 100 });
  if (listErr) return new Response(JSON.stringify({ error: listErr.message }), { status: 500 });

  const adminEmail = "kozun999@gmail.com";
  const results: string[] = [];

  for (const user of users) {
    if (user.email === adminEmail) {
      // Update password for admin
      const { error: upErr } = await supabase.auth.admin.updateUserById(user.id, {
        password: "Chuj1239!",
      });
      results.push(`Admin ${user.email}: password ${upErr ? "FAILED: " + upErr.message : "updated"}`);
    } else {
      // Delete non-admin users
      const { error: delErr } = await supabase.auth.admin.deleteUser(user.id);
      results.push(`Deleted ${user.email}: ${delErr ? "FAILED: " + delErr.message : "OK"}`);
    }
  }

  return new Response(JSON.stringify({ results, total_users: users.length }), {
    headers: { "Content-Type": "application/json" },
  });
});
