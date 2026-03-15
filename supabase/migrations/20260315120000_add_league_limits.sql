-- Add max_players and exclusive_platform columns to leagues
ALTER TABLE public.leagues ADD COLUMN IF NOT EXISTS max_players integer DEFAULT NULL;
ALTER TABLE public.leagues ADD COLUMN IF NOT EXISTS exclusive_platform boolean NOT NULL DEFAULT false;
