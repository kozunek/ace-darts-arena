
-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name TEXT NOT NULL,
  avatar TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Leagues table
CREATE TABLE public.leagues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  season TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  format TEXT DEFAULT 'Best of 5',
  max_legs INT DEFAULT 5,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Players table (separate from auth users, admin-managed)
CREATE TABLE public.players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  avatar TEXT NOT NULL DEFAULT '',
  approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Player-league assignments
CREATE TABLE public.player_leagues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES public.players(id) ON DELETE CASCADE NOT NULL,
  league_id UUID REFERENCES public.leagues(id) ON DELETE CASCADE NOT NULL,
  UNIQUE (player_id, league_id)
);

-- Matches table
CREATE TABLE public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID REFERENCES public.leagues(id) ON DELETE CASCADE NOT NULL,
  player1_id UUID REFERENCES public.players(id) ON DELETE CASCADE NOT NULL,
  player2_id UUID REFERENCES public.players(id) ON DELETE CASCADE NOT NULL,
  score1 INT,
  score2 INT,
  legs_won1 INT,
  legs_won2 INT,
  status TEXT NOT NULL DEFAULT 'upcoming',
  date DATE NOT NULL,
  round INT,
  autodarts_link TEXT,
  avg1 NUMERIC(5,1),
  avg2 NUMERIC(5,1),
  one_eighties1 INT DEFAULT 0,
  one_eighties2 INT DEFAULT 0,
  high_checkout1 INT DEFAULT 0,
  high_checkout2 INT DEFAULT 0,
  ton40_1 INT DEFAULT 0,
  ton40_2 INT DEFAULT 0,
  ton60_1 INT DEFAULT 0,
  ton60_2 INT DEFAULT 0,
  ton80_1 INT DEFAULT 0,
  ton80_2 INT DEFAULT 0,
  ton_plus1 INT DEFAULT 0,
  ton_plus2 INT DEFAULT 0,
  darts_thrown1 INT DEFAULT 0,
  darts_thrown2 INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- has_role security definer function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS Policies

-- Profiles: anyone can read, users update own
CREATE POLICY "Anyone can read profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User roles: only readable via has_role function, admin can manage
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- Leagues: public read, admin write
CREATE POLICY "Anyone can read leagues" ON public.leagues FOR SELECT USING (true);
CREATE POLICY "Admins manage leagues" ON public.leagues FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Players: public read, admin write
CREATE POLICY "Anyone can read players" ON public.players FOR SELECT USING (true);
CREATE POLICY "Admins manage players" ON public.players FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Player leagues: public read, admin write
CREATE POLICY "Anyone can read player_leagues" ON public.player_leagues FOR SELECT USING (true);
CREATE POLICY "Admins manage player_leagues" ON public.player_leagues FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Matches: public read, admin write, authenticated can insert (submit results)
CREATE POLICY "Anyone can read matches" ON public.matches FOR SELECT USING (true);
CREATE POLICY "Admins manage matches" ON public.matches FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated can update match results" ON public.matches FOR UPDATE USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, avatar)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    UPPER(LEFT(COALESCE(NEW.raw_user_meta_data->>'name', NEW.email), 2))
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
