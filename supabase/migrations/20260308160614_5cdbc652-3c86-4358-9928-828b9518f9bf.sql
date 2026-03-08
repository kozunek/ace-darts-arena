-- Drop function first, then view
DROP FUNCTION IF EXISTS public.get_public_players();
DROP VIEW IF EXISTS public.players_public CASCADE;

-- Add anon policy for basic player info read
CREATE POLICY "Anon can read basic player info"
ON public.players FOR SELECT TO anon
USING (true);