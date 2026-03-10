
-- Fix extension_settings: change RESTRICTIVE policies to PERMISSIVE
DROP POLICY IF EXISTS "Admins manage extension_settings" ON public.extension_settings;
DROP POLICY IF EXISTS "Authenticated can read extension_settings" ON public.extension_settings;

-- Recreate as PERMISSIVE (default)
CREATE POLICY "Admins manage extension_settings"
ON public.extension_settings
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can read extension_settings"
ON public.extension_settings
FOR SELECT
TO authenticated
USING (true);
