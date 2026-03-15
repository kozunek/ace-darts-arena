-- Allow admins to delete (reset) challenge entries
CREATE POLICY "Admins manage challenge entries"
  ON public.weekly_challenge_entries
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
