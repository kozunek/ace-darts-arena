
CREATE TABLE public.extension_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid REFERENCES public.leagues(id) ON DELETE CASCADE,
  auto_approve boolean NOT NULL DEFAULT false,
  require_avg boolean NOT NULL DEFAULT true,
  require_180s boolean NOT NULL DEFAULT true,
  require_high_checkout boolean NOT NULL DEFAULT true,
  require_checkout_stats boolean NOT NULL DEFAULT false,
  require_darts_thrown boolean NOT NULL DEFAULT false,
  require_ton_ranges boolean NOT NULL DEFAULT false,
  require_nine_darters boolean NOT NULL DEFAULT false,
  require_autodarts_link boolean NOT NULL DEFAULT false,
  webhook_enabled boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(league_id)
);

-- Global settings row (league_id = NULL)
INSERT INTO public.extension_settings (league_id) VALUES (NULL);

ALTER TABLE public.extension_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage extension_settings"
  ON public.extension_settings FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can read extension_settings"
  ON public.extension_settings FOR SELECT
  USING (true);
