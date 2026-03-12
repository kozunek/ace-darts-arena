
-- Add is_guest_role flag to custom_roles
ALTER TABLE public.custom_roles ADD COLUMN is_guest_role boolean NOT NULL DEFAULT false;

-- Seed the Guest role with page-only permissions
INSERT INTO public.custom_roles (name, description, stats_scope, is_guest_role) VALUES
  ('Gość', 'Niezalogowany odwiedzający — kontrola widocznych stron', 'own_leagues', true);

-- Allow public (anon) to read custom_roles and permissions for guest enforcement
DROP POLICY IF EXISTS "Authenticated can read custom_roles" ON public.custom_roles;
CREATE POLICY "Anyone can read custom_roles" ON public.custom_roles
  FOR SELECT TO public
  USING (true);

DROP POLICY IF EXISTS "Authenticated can read custom_role_permissions" ON public.custom_role_permissions;
CREATE POLICY "Anyone can read custom_role_permissions" ON public.custom_role_permissions
  FOR SELECT TO public
  USING (true);

-- Set default guest pages (public pages)
INSERT INTO public.custom_role_permissions (role_id, permission_type, permission_key)
SELECT cr.id, 'page', p.path
FROM public.custom_roles cr,
  (VALUES ('/'), ('/matches'), ('/players'), ('/hall-of-fame'), ('/stats'), ('/login'), ('/calendar'), ('/announcements'), ('/downloads'), ('/how-to-play')) AS p(path)
WHERE cr.is_guest_role = true;
