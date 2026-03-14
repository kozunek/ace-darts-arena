
ALTER TABLE public.leagues ADD COLUMN IF NOT EXISTS third_place_match boolean NOT NULL DEFAULT false;
ALTER TABLE public.leagues ADD COLUMN IF NOT EXISTS lucky_loser boolean NOT NULL DEFAULT false;
