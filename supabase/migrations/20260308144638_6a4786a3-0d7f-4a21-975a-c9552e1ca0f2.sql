CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  is_read BOOLEAN NOT NULL DEFAULT false,
  link TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications"
ON public.notifications FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "System can insert notifications"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (true);

-- Function to auto-create notifications when matches are assigned
CREATE OR REPLACE FUNCTION public.notify_match_assigned()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p1_user_id UUID;
  p2_user_id UUID;
  p1_name TEXT;
  p2_name TEXT;
  league_name TEXT;
BEGIN
  SELECT user_id, name INTO p1_user_id, p1_name FROM public.players WHERE id = NEW.player1_id;
  SELECT user_id, name INTO p2_user_id, p2_name FROM public.players WHERE id = NEW.player2_id;
  SELECT name INTO league_name FROM public.leagues WHERE id = NEW.league_id;

  IF p1_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (p1_user_id, 'Nowy mecz', 'Masz nowy mecz przeciwko ' || p2_name || ' w lidze ' || league_name, 'match', '/my-matches');
  END IF;

  IF p2_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (p2_user_id, 'Nowy mecz', 'Masz nowy mecz przeciwko ' || p1_name || ' w lidze ' || league_name, 'match', '/my-matches');
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_match_created
AFTER INSERT ON public.matches
FOR EACH ROW
EXECUTE FUNCTION public.notify_match_assigned();