DROP POLICY "System can insert notifications" ON public.notifications;

CREATE POLICY "Admins and moderators can insert notifications"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (is_moderator_or_admin(auth.uid()));