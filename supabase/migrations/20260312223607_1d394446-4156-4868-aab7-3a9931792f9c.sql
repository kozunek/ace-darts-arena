
CREATE TABLE public.chat_bans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  banned_by uuid NOT NULL,
  reason text NOT NULL DEFAULT '',
  banned_until timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_bans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage chat_bans" ON public.chat_bans
FOR ALL TO authenticated
USING (is_moderator_or_admin(auth.uid()))
WITH CHECK (is_moderator_or_admin(auth.uid()));

CREATE POLICY "Users can read own bans" ON public.chat_bans
FOR SELECT TO authenticated
USING (user_id = auth.uid());
