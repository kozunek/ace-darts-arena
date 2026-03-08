import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Create admin user
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: 'kozun999@gmail.com',
    password: 'Chuj1239!',
    email_confirm: true,
    user_metadata: { name: 'Admin' }
  });

  if (authError && !authError.message.includes('already')) {
    return new Response(JSON.stringify({ error: authError.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  // Get user id
  let userId = authData?.user?.id;
  if (!userId) {
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    const admin = users?.users?.find(u => u.email === 'kozun999@gmail.com');
    userId = admin?.id;
  }

  if (userId) {
    // Assign admin role
    await supabaseAdmin.from('user_roles').upsert({ user_id: userId, role: 'admin' }, { onConflict: 'user_id,role' });
  }

  return new Response(JSON.stringify({ success: true, userId }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
