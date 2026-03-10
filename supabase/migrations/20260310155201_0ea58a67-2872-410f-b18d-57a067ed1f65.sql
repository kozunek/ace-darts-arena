
-- Drop ALL existing policies on live_matches
DROP POLICY IF EXISTS "Anyone can read live_matches" ON public.live_matches;
DROP POLICY IF EXISTS "Match participants can manage live_matches" ON public.live_matches;
DROP POLICY IF EXISTS "Service role manages live_matches" ON public.live_matches;

-- Recreate as PERMISSIVE (default behavior when not specifying AS RESTRICTIVE)
-- Public read access
CREATE POLICY "live_matches_select"
ON public.live_matches FOR SELECT TO public USING (true);

-- Authenticated users who are match participants OR admins can manage
CREATE POLICY "live_matches_insert"
ON public.live_matches FOR INSERT TO authenticated
WITH CHECK (
  (match_id IS NULL) OR
  (match_id IN (
    SELECT matches.id FROM matches
    WHERE matches.player1_id IN (SELECT players.id FROM players WHERE players.user_id = auth.uid())
       OR matches.player2_id IN (SELECT players.id FROM players WHERE players.user_id = auth.uid())
  )) OR is_moderator_or_admin(auth.uid())
);

CREATE POLICY "live_matches_update"
ON public.live_matches FOR UPDATE TO authenticated
USING (
  (match_id IS NULL) OR
  (match_id IN (
    SELECT matches.id FROM matches
    WHERE matches.player1_id IN (SELECT players.id FROM players WHERE players.user_id = auth.uid())
       OR matches.player2_id IN (SELECT players.id FROM players WHERE players.user_id = auth.uid())
  )) OR is_moderator_or_admin(auth.uid())
);

CREATE POLICY "live_matches_delete"
ON public.live_matches FOR DELETE TO authenticated
USING (
  is_moderator_or_admin(auth.uid()) OR
  (match_id IN (
    SELECT matches.id FROM matches
    WHERE matches.player1_id IN (SELECT players.id FROM players WHERE players.user_id = auth.uid())
       OR matches.player2_id IN (SELECT players.id FROM players WHERE players.user_id = auth.uid())
  ))
);
