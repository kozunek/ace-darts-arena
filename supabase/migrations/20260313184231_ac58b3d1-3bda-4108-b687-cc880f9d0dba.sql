
-- Weekly challenges system
CREATE TABLE public.weekly_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_type text NOT NULL, -- 'highest_avg', 'most_180s', 'most_tons', 'best_checkout', 'most_wins'
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  icon text NOT NULL DEFAULT '🏆',
  week_start date NOT NULL,
  week_end date NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.weekly_challenge_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.weekly_challenges(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  score numeric NOT NULL DEFAULT 0,
  match_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(challenge_id, player_id)
);

CREATE TABLE public.weekly_challenge_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.weekly_challenges(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  rank integer NOT NULL,
  reward_type text NOT NULL DEFAULT 'badge', -- 'badge', 'title', 'points'
  reward_value text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_weekly_challenges_active ON public.weekly_challenges(is_active, week_start DESC);
CREATE INDEX idx_weekly_challenge_entries_challenge ON public.weekly_challenge_entries(challenge_id, score DESC);
CREATE INDEX idx_weekly_challenge_entries_player ON public.weekly_challenge_entries(player_id);
CREATE INDEX idx_weekly_challenge_rewards_player ON public.weekly_challenge_rewards(player_id);

-- RLS
ALTER TABLE public.weekly_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_challenge_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_challenge_rewards ENABLE ROW LEVEL SECURITY;

-- Everyone can read challenges
CREATE POLICY "Anyone can read weekly_challenges" ON public.weekly_challenges FOR SELECT TO public USING (true);
CREATE POLICY "Admins manage weekly_challenges" ON public.weekly_challenges FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can read challenge entries" ON public.weekly_challenge_entries FOR SELECT TO public USING (true);
CREATE POLICY "Service role manages entries" ON public.weekly_challenge_entries FOR ALL TO public USING (auth.role() = 'service_role'::text) WITH CHECK (auth.role() = 'service_role'::text);

CREATE POLICY "Anyone can read rewards" ON public.weekly_challenge_rewards FOR SELECT TO public USING (true);
CREATE POLICY "Service role manages rewards" ON public.weekly_challenge_rewards FOR ALL TO public USING (auth.role() = 'service_role'::text) WITH CHECK (auth.role() = 'service_role'::text);

-- Enable realtime for live leaderboard updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.weekly_challenge_entries;
