
-- Bug reports table
CREATE TABLE public.bug_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can create bug reports
CREATE POLICY "Users can create bug reports"
  ON public.bug_reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can read own reports
CREATE POLICY "Users can read own bug reports"
  ON public.bug_reports FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR is_moderator_or_admin(auth.uid()));

-- Admins can manage all
CREATE POLICY "Admins manage bug reports"
  ON public.bug_reports FOR ALL TO authenticated
  USING (is_moderator_or_admin(auth.uid()))
  WITH CHECK (is_moderator_or_admin(auth.uid()));

-- Allow users to delete their own notifications
CREATE POLICY "Users can delete own notifications"
  ON public.notifications FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Allow admins to delete notifications too
CREATE POLICY "Admins can delete notifications"
  ON public.notifications FOR DELETE TO authenticated
  USING (is_moderator_or_admin(auth.uid()));
