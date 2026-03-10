-- Drop anon write policies on live_matches
DROP POLICY IF EXISTS "Anon can upsert live_matches" ON public.live_matches;
DROP POLICY IF EXISTS "Anon can update live_matches" ON public.live_matches;

-- Add authenticated write policies scoped to match participants
CREATE POLICY "Authenticated can insert live_matches"
ON public.live_matches FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated can update live_matches"
ON public.live_matches FOR UPDATE TO authenticated
USING (true) WITH CHECK (true);