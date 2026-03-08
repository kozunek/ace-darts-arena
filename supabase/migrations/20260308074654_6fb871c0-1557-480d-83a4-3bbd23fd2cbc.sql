
-- Fix all RLS policies: change from RESTRICTIVE to PERMISSIVE

-- LEAGUES
DROP POLICY IF EXISTS "Admins manage leagues" ON public.leagues;
DROP POLICY IF EXISTS "Anyone can read leagues" ON public.leagues;
CREATE POLICY "Anyone can read leagues" ON public.leagues FOR SELECT USING (true);
CREATE POLICY "Admins manage leagues" ON public.leagues FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- PLAYERS
DROP POLICY IF EXISTS "Admins manage players" ON public.players;
DROP POLICY IF EXISTS "Anyone can read players" ON public.players;
CREATE POLICY "Anyone can read players" ON public.players FOR SELECT USING (true);
CREATE POLICY "Admins manage players" ON public.players FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- PLAYER_LEAGUES
DROP POLICY IF EXISTS "Admins manage player_leagues" ON public.player_leagues;
DROP POLICY IF EXISTS "Anyone can read player_leagues" ON public.player_leagues;
CREATE POLICY "Anyone can read player_leagues" ON public.player_leagues FOR SELECT USING (true);
CREATE POLICY "Admins manage player_leagues" ON public.player_leagues FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- MATCHES
DROP POLICY IF EXISTS "Admins manage matches" ON public.matches;
DROP POLICY IF EXISTS "Anyone can read matches" ON public.matches;
DROP POLICY IF EXISTS "Authenticated can update match results" ON public.matches;
CREATE POLICY "Anyone can read matches" ON public.matches FOR SELECT USING (true);
CREATE POLICY "Admins manage matches" ON public.matches FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Auth users can update matches" ON public.matches FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- PROFILES
DROP POLICY IF EXISTS "Anyone can read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Anyone can read profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- USER_ROLES
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;
CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Update has_role function to support moderator
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create helper function to check moderator or admin
CREATE OR REPLACE FUNCTION public.is_moderator_or_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'moderator')
  )
$$;
