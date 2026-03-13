CREATE TABLE public.league_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  league_id uuid REFERENCES public.leagues(id) ON DELETE SET NULL,
  is_global boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.league_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read league_rules"
  ON public.league_rules FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admins manage league_rules"
  ON public.league_rules FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));