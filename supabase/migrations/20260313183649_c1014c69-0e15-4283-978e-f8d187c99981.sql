
-- Indexes for 1000+ players optimization
CREATE INDEX IF NOT EXISTS idx_matches_league_status ON public.matches (league_id, status);
CREATE INDEX IF NOT EXISTS idx_matches_status ON public.matches (status);
CREATE INDEX IF NOT EXISTS idx_matches_player1 ON public.matches (player1_id);
CREATE INDEX IF NOT EXISTS idx_matches_player2 ON public.matches (player2_id);
CREATE INDEX IF NOT EXISTS idx_matches_date_desc ON public.matches (date DESC);
CREATE INDEX IF NOT EXISTS idx_player_leagues_player ON public.player_leagues (player_id);
CREATE INDEX IF NOT EXISTS idx_player_leagues_league ON public.player_leagues (league_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications (user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_players_user_id ON public.players (user_id);
CREATE INDEX IF NOT EXISTS idx_players_approved ON public.players (approved);
CREATE INDEX IF NOT EXISTS idx_group_messages_channel ON public.group_messages (channel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_match_proposals_match ON public.match_proposals (match_id, status);
