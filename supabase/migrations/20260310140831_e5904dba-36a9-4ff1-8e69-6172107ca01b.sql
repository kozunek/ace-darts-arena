-- Restrict extension_settings SELECT to authenticated users only
DROP POLICY IF EXISTS "Anyone can read extension_settings" ON public.extension_settings;
CREATE POLICY "Authenticated can read extension_settings"
ON public.extension_settings
FOR SELECT
TO authenticated
USING (true);