-- Allow admins to read all chat messages
CREATE POLICY "Admins can read all chat messages"
ON public.chat_messages
FOR SELECT
TO authenticated
USING (is_moderator_or_admin(auth.uid()));