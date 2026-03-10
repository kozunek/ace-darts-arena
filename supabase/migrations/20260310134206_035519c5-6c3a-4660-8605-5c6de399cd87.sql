DROP VIEW IF EXISTS public.players_public;
CREATE VIEW public.players_public
WITH (security_invoker = off)
AS
SELECT id, name, avatar, avatar_url, approved, created_at, user_id
FROM public.players;

GRANT SELECT ON public.players_public TO anon, authenticated;