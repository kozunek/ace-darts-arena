
-- Add league_type to support different competition formats
ALTER TABLE public.leagues
  ADD COLUMN IF NOT EXISTS league_type text NOT NULL DEFAULT 'league'
  CHECK (league_type IN ('league', 'bracket', 'group_bracket'));

-- Add bracket_round to matches for tournament bracket tracking
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS bracket_round text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS bracket_position integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS group_name text DEFAULT NULL;
