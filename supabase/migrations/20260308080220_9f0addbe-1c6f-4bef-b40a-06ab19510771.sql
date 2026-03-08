-- Ensure authenticated users can call RBAC helper functions
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_moderator_or_admin(uuid) TO authenticated;

-- Add checkout attempt/hit stats per player in match
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS checkout_attempts1 integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS checkout_attempts2 integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS checkout_hits1 integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS checkout_hits2 integer NOT NULL DEFAULT 0;