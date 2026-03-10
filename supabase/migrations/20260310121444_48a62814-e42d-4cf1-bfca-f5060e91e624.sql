
-- 1. Create a public view that excludes sensitive columns
CREATE VIEW public.players_public
WITH (security_invoker = on) AS
  SELECT id, name, avatar, avatar_url, approved, created_at, user_id
  FROM public.players;

-- 2. Drop the current overly permissive authenticated SELECT policy
DROP POLICY IF EXISTS "Authenticated users can read players" ON public.players;

-- 3. Create a restricted SELECT policy: own row OR admin/moderator
CREATE POLICY "Users can read own player row"
ON public.players FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_moderator_or_admin(auth.uid()));

-- 4. Grant SELECT on the view to authenticated and anon (for public player lists)
GRANT SELECT ON public.players_public TO authenticated;
GRANT SELECT ON public.players_public TO anon;
