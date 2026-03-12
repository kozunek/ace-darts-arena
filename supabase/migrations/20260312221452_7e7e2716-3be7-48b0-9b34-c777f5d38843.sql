
-- Group chat channels
CREATE TABLE public.group_channels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  channel_type TEXT NOT NULL DEFAULT 'custom',
  league_id UUID REFERENCES public.leagues(id) ON DELETE CASCADE,
  platform TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Group chat messages
CREATE TABLE public.group_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID NOT NULL REFERENCES public.group_channels(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Channel-role access mapping
CREATE TABLE public.group_channel_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID NOT NULL REFERENCES public.group_channels(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.custom_roles(id) ON DELETE CASCADE,
  UNIQUE(channel_id, role_id)
);

-- Admin/mod channels: system roles access
CREATE TABLE public.group_channel_system_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID NOT NULL REFERENCES public.group_channels(id) ON DELETE CASCADE,
  system_role TEXT NOT NULL,
  UNIQUE(channel_id, system_role)
);

-- Enable RLS
ALTER TABLE public.group_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_channel_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_channel_system_roles ENABLE ROW LEVEL SECURITY;

-- Channels: anyone authenticated can read (access filtered in app)
CREATE POLICY "Anyone can read group_channels" ON public.group_channels FOR SELECT TO public USING (true);
CREATE POLICY "Admins manage group_channels" ON public.group_channels FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Messages: authenticated can read/insert (access filtered in app by channel membership)
CREATE POLICY "Authenticated can read group_messages" ON public.group_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can send group_messages" ON public.group_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Admins manage group_messages" ON public.group_messages FOR ALL TO authenticated USING (is_moderator_or_admin(auth.uid())) WITH CHECK (is_moderator_or_admin(auth.uid()));

-- Channel roles: public read, admin manage
CREATE POLICY "Anyone can read group_channel_roles" ON public.group_channel_roles FOR SELECT TO public USING (true);
CREATE POLICY "Admins manage group_channel_roles" ON public.group_channel_roles FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can read group_channel_system_roles" ON public.group_channel_system_roles FOR SELECT TO public USING (true);
CREATE POLICY "Admins manage group_channel_system_roles" ON public.group_channel_system_roles FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for group messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_messages;
