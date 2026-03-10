
-- Add screenshot support and source platform to matches
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS screenshot_urls text[] DEFAULT '{}';
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS source_platform text DEFAULT 'autodarts';

-- Add auto_approve_screenshot to extension_settings
ALTER TABLE public.extension_settings ADD COLUMN IF NOT EXISTS auto_approve_screenshot boolean NOT NULL DEFAULT false;

-- Create storage bucket for match screenshots
INSERT INTO storage.buckets (id, name, public) VALUES ('match-screenshots', 'match-screenshots', true) ON CONFLICT (id) DO NOTHING;

-- RLS policies for match-screenshots bucket
CREATE POLICY "Authenticated users can upload match screenshots"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'match-screenshots');

CREATE POLICY "Anyone can view match screenshots"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'match-screenshots');

CREATE POLICY "Admins can delete match screenshots"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'match-screenshots' AND (SELECT public.is_moderator_or_admin(auth.uid())));
