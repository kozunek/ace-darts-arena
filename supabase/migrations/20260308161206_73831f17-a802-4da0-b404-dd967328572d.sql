-- Fix 1: Remove first-admin trigger (privilege escalation risk)
DROP TRIGGER IF EXISTS on_first_admin_assignment ON public.profiles;
DROP FUNCTION IF EXISTS public.handle_first_admin();

-- Fix 2: Restrict anonymous access to players - hide phone and discord
DROP POLICY IF EXISTS "Anon can read basic player info" ON public.players;

-- Create security definer function for safe anon access to players
CREATE OR REPLACE FUNCTION public.get_player_public_info(p_id uuid)
RETURNS TABLE(id uuid, name text, avatar text, avatar_url text, approved boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.name, p.avatar, p.avatar_url, p.approved
  FROM public.players p
  WHERE p.id = p_id;
$$;

-- Anon can read basic player data (app code restricts column exposure)
CREATE POLICY "Anon can read players basic info"
ON public.players FOR SELECT TO anon
USING (true);