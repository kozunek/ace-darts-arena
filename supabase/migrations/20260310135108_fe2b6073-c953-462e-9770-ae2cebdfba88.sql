DROP POLICY IF EXISTS "System can insert audit log" ON public.match_audit_log;
CREATE POLICY "Service role can insert audit log"
ON public.match_audit_log
FOR INSERT
TO public
WITH CHECK (auth.role() = 'service_role');