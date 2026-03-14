
-- Fix audit log: allow admins/mods to insert
CREATE POLICY "Admins and mods can insert audit log"
ON public.match_audit_log
FOR INSERT
TO authenticated
WITH CHECK (is_moderator_or_admin(auth.uid()));

-- Create player_achievements table for tracking globally earned achievements
CREATE TABLE public.player_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL,
  achievement_id text NOT NULL,
  earned_at timestamp with time zone NOT NULL DEFAULT now(),
  notified boolean NOT NULL DEFAULT false,
  UNIQUE(player_id, achievement_id)
);

ALTER TABLE public.player_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read player_achievements"
ON public.player_achievements
FOR SELECT
TO public
USING (true);

CREATE POLICY "Admins and mods can manage player_achievements"
ON public.player_achievements
FOR ALL
TO authenticated
USING (is_moderator_or_admin(auth.uid()))
WITH CHECK (is_moderator_or_admin(auth.uid()));

-- Enable realtime for player_achievements
ALTER PUBLICATION supabase_realtime ADD TABLE public.player_achievements;
