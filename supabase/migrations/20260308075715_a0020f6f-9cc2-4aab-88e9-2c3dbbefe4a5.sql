
-- Drop all existing RESTRICTIVE policies and recreate as PERMISSIVE

-- LEAGUES
DROP POLICY IF EXISTS "Admins manage leagues" ON public.leagues;
DROP POLICY IF EXISTS "Anyone can read leagues" ON public.leagues;

CREATE POLICY "Anyone can read leagues" ON public.leagues FOR SELECT USING (true);
CREATE POLICY "Admins manage leagues" ON public.leagues FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- MATCHES
DROP POLICY IF EXISTS "Admins manage matches" ON public.matches;
DROP POLICY IF EXISTS "Anyone can read matches" ON public.matches;
DROP POLICY IF EXISTS "Auth users can update matches" ON public.matches;

CREATE POLICY "Anyone can read matches" ON public.matches FOR SELECT USING (true);
CREATE POLICY "Admins manage matches" ON public.matches FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Moderators manage matches" ON public.matches FOR ALL TO authenticated USING (public.is_moderator_or_admin(auth.uid())) WITH CHECK (public.is_moderator_or_admin(auth.uid()));
CREATE POLICY "Auth users can update matches" ON public.matches FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- PLAYERS
DROP POLICY IF EXISTS "Admins manage players" ON public.players;
DROP POLICY IF EXISTS "Anyone can read players" ON public.players;

CREATE POLICY "Anyone can read players" ON public.players FOR SELECT USING (true);
CREATE POLICY "Admins manage players" ON public.players FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- PLAYER_LEAGUES
DROP POLICY IF EXISTS "Admins manage player_leagues" ON public.player_leagues;
DROP POLICY IF EXISTS "Anyone can read player_leagues" ON public.player_leagues;

CREATE POLICY "Anyone can read player_leagues" ON public.player_leagues FOR SELECT USING (true);
CREATE POLICY "Admins manage player_leagues" ON public.player_leagues FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- PROFILES
DROP POLICY IF EXISTS "Anyone can read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Anyone can read profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- USER_ROLES
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;

CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Recreate the trigger for auto-creating profiles on signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
