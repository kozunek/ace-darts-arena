
-- Allow users to delete chat messages they sent or received
CREATE POLICY "Users can delete own chat messages"
  ON public.chat_messages FOR DELETE TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
