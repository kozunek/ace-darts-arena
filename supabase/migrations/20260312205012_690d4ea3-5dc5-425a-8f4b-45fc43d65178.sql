-- Insert default roles
INSERT INTO public.custom_roles (name, description, stats_scope)
VALUES 
  ('Zarejestrowany', 'Domyślna rola przypisywana po rejestracji', 'own_leagues'),
  ('Gracz Autodarts', 'Gracz na platformie Autodarts', 'platform'),
  ('Gracz DartCounter', 'Gracz na platformie DartCounter', 'platform'),
  ('Gracz DartsMind', 'Gracz na platformie DartsMind', 'platform')
ON CONFLICT DO NOTHING;

-- Add action permissions (extension_download) to platform player roles
INSERT INTO public.custom_role_permissions (role_id, permission_type, permission_key)
SELECT id, 'action', 'extension_download' FROM public.custom_roles WHERE name = 'Gracz Autodarts'
UNION ALL
SELECT id, 'action', 'extension_download' FROM public.custom_roles WHERE name = 'Gracz DartCounter'
UNION ALL
SELECT id, 'action', 'extension_download' FROM public.custom_roles WHERE name = 'Gracz DartsMind';

-- Add stats_platform permissions for each platform role
INSERT INTO public.custom_role_permissions (role_id, permission_type, permission_key)
SELECT id, 'stats_platform', 'autodarts' FROM public.custom_roles WHERE name = 'Gracz Autodarts'
UNION ALL
SELECT id, 'stats_platform', 'dartcounter' FROM public.custom_roles WHERE name = 'Gracz DartCounter'
UNION ALL
SELECT id, 'stats_platform', 'dartsmind' FROM public.custom_roles WHERE name = 'Gracz DartsMind';

-- Create function to auto-assign "Zarejestrowany" role on user creation
CREATE OR REPLACE FUNCTION public.auto_assign_registered_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  registered_role_id UUID;
BEGIN
  SELECT id INTO registered_role_id FROM public.custom_roles WHERE name = 'Zarejestrowany' LIMIT 1;
  
  IF registered_role_id IS NOT NULL THEN
    INSERT INTO public.user_custom_roles (user_id, role_id)
    VALUES (NEW.id, registered_role_id)
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users (fires after the handle_new_user trigger)
CREATE TRIGGER on_auth_user_created_assign_role
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_registered_role();