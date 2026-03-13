ALTER TABLE public.app_config ADD CONSTRAINT app_config_key_unique UNIQUE (key);

INSERT INTO public.app_config (key, value) VALUES
  ('email_site_name', 'eDART Polska'),
  ('email_sender_domain', 'notify.edartpolska.pl'),
  ('email_from_domain', 'edartpolska.pl'),
  ('email_root_domain', 'edartpolska.pl')
ON CONFLICT (key) DO NOTHING;