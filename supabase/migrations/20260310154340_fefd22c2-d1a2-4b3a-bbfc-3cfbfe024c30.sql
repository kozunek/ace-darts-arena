
-- Fix live_matches: ALL policies are RESTRICTIVE which means NO access at all
-- Need at least one PERMISSIVE policy per operation

-- Drop all existing policies
DROP POLICY IF EXISTS "Anyone can read live_matches" ON public.live_matches;
DROP POLICY IF EXISTS "Match participants can manage live_matches" ON public.live_matches;
DROP POLICY IF EXISTS "Service role manages live_matches" ON public.live_matches;

-- Recreate as PERMISSIVE (default)
CREATE POLICY "Anyone can read live_matches"
ON public.live_matches FOR SELECT TO public USING (true);

CREATE POLICY "Match participants can manage live_matches"
ON public.live_matches FOR ALL TO authenticated
USING (
  (match_id IN (
    SELECT matches.id FROM matches
    WHERE matches.player1_id IN (SELECT players.id FROM players WHERE players.user_id = auth.uid())
       OR matches.player2_id IN (SELECT players.id FROM players WHERE players.user_id = auth.uid())
  )) OR is_moderator_or_admin(auth.uid())
)
WITH CHECK (
  (match_id IN (
    SELECT matches.id FROM matches
    WHERE matches.player1_id IN (SELECT players.id FROM players WHERE players.user_id = auth.uid())
       OR matches.player2_id IN (SELECT players.id FROM players WHERE players.user_id = auth.uid())
  )) OR is_moderator_or_admin(auth.uid())
);

CREATE POLICY "Service role manages live_matches"
ON public.live_matches FOR ALL TO public
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Add UNIQUE constraint on autodarts_match_id for upsert to work
ALTER TABLE public.live_matches ADD CONSTRAINT live_matches_autodarts_match_id_key UNIQUE (autodarts_match_id);
