
CREATE TABLE public.discord_webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid REFERENCES public.leagues(id) ON DELETE CASCADE,
  webhook_url text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  label text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.discord_webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage discord_webhooks"
  ON public.discord_webhooks
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can read discord_webhooks"
  ON public.discord_webhooks
  FOR SELECT
  TO authenticated
  USING (true);
