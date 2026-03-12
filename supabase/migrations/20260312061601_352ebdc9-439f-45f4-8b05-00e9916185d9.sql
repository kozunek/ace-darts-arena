
-- Custom roles table
CREATE TABLE public.custom_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  stats_scope text NOT NULL DEFAULT 'own_leagues', -- 'all_leagues' or 'own_leagues'
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.custom_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage custom_roles" ON public.custom_roles
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can read custom_roles" ON public.custom_roles
  FOR SELECT TO authenticated
  USING (true);

-- Permissions for each custom role
CREATE TABLE public.custom_role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES public.custom_roles(id) ON DELETE CASCADE,
  permission_type text NOT NULL, -- 'page' or 'action'
  permission_key text NOT NULL,  -- e.g. '/admin', 'manage_matches'
  UNIQUE (role_id, permission_type, permission_key)
);

ALTER TABLE public.custom_role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage custom_role_permissions" ON public.custom_role_permissions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can read custom_role_permissions" ON public.custom_role_permissions
  FOR SELECT TO authenticated
  USING (true);

-- Assign custom roles to users
CREATE TABLE public.user_custom_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES public.custom_roles(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, role_id)
);

ALTER TABLE public.user_custom_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage user_custom_roles" ON public.user_custom_roles
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can read own custom roles" ON public.user_custom_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Seed the 3 default custom roles matching existing enum roles
INSERT INTO public.custom_roles (name, description, stats_scope) VALUES
  ('Admin', 'Pełna kontrola: zarządzanie ligami, graczami, meczami, rolami', 'all_leagues'),
  ('Moderator', 'Może zatwierdzać/odrzucać wyniki meczów zgłoszone przez graczy', 'all_leagues'),
  ('Gracz', 'Może zgłaszać wyniki swoich meczów i przeglądać statystyki', 'own_leagues');
