
-- 1. Fix security: Drop overly permissive anon policy
DROP POLICY IF EXISTS "Anon can read players basic info" ON public.players;
DROP POLICY IF EXISTS "Anon can read basic player info" ON public.players;

-- Anon can only use the SECURITY DEFINER function, no direct table access
-- Keep authenticated users' read access
DROP POLICY IF EXISTS "Authenticated users can read players" ON public.players;
CREATE POLICY "Authenticated users can read players"
ON public.players FOR SELECT TO authenticated
USING (true);

-- 2. Create chat_messages table
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Users can read messages where they are sender or receiver
CREATE POLICY "Users can read own messages"
ON public.chat_messages FOR SELECT TO authenticated
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Users can insert messages as sender
CREATE POLICY "Users can send messages"
ON public.chat_messages FOR INSERT TO authenticated
WITH CHECK (auth.uid() = sender_id);

-- Users can mark messages as read (receiver only)
CREATE POLICY "Users can mark messages read"
ON public.chat_messages FOR UPDATE TO authenticated
USING (auth.uid() = receiver_id)
WITH CHECK (auth.uid() = receiver_id);

-- Enable realtime for chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- 3. Create announcements table
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read announcements
CREATE POLICY "Authenticated can read announcements"
ON public.announcements FOR SELECT TO authenticated
USING (true);

-- Only admins/moderators can create announcements
CREATE POLICY "Admins can create announcements"
ON public.announcements FOR INSERT TO authenticated
WITH CHECK (public.is_moderator_or_admin(auth.uid()));

-- Only admins/moderators can update announcements
CREATE POLICY "Admins can update announcements"
ON public.announcements FOR UPDATE TO authenticated
USING (public.is_moderator_or_admin(auth.uid()));

-- Only admins/moderators can delete announcements
CREATE POLICY "Admins can delete announcements"
ON public.announcements FOR DELETE TO authenticated
USING (public.is_moderator_or_admin(auth.uid()));

-- 4. Create function to get opponent contact info (only for scheduled matches)
CREATE OR REPLACE FUNCTION public.get_opponent_contact(opponent_player_id uuid)
RETURNS TABLE(phone text, discord text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.phone, p.discord
  FROM public.players p
  WHERE p.id = opponent_player_id
    AND EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.status = 'upcoming'
        AND (
          (m.player1_id = opponent_player_id AND m.player2_id IN (SELECT id FROM players WHERE user_id = auth.uid()))
          OR
          (m.player2_id = opponent_player_id AND m.player1_id IN (SELECT id FROM players WHERE user_id = auth.uid()))
        )
    );
$$;
