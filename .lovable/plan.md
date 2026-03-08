

## Plan: Real Authentication, Stats Page, and Full Database Migration

This is a large upgrade that moves the app from mock data to a real database with proper authentication.

### What Changes

**1. Database Schema (Migration)**
Create tables for all data currently stored in mock/context:
- `profiles` (id, user_id, name, avatar, approved, created_at)
- `user_roles` (id, user_id, role enum: admin/user)
- `leagues` (id, name, season, description, format, max_legs, is_active)
- `players` (id, name, avatar, approved) — separate from auth users, managed by admin
- `player_leagues` (player_id, league_id)
- `matches` (id, league_id, player1_id, player2_id, score1, score2, legs_won1, legs_won2, status, date, round, autodarts_link, all stat fields)

Seed initial data: the 8 players, 3 leagues, existing matches. Create admin account with kozun999@gmail.com.

**2. Real Authentication (Supabase Auth)**
- Replace `AuthContext` with real Supabase auth using `supabase.auth.signUp`, `signInWithPassword`, `signOut`
- Registration form: email field, name field, password + confirm password, check if email already exists
- Login: email + password only, no demo credentials shown
- Forgot password: `resetPasswordForEmail` with redirect to `/reset-password`
- `/reset-password` page: form to set new password via `updateUser`
- Change password: available in user profile/settings
- Admin role checked via `user_roles` table with `has_role` security definer function
- Auto-confirm emails enabled (since this is a small league app and user asked for direct access)

**3. Rename "Wtryski" to "Statystyki"**
- Rename nav item from "Wtryski" to "Statystyki"
- Route stays `/ton-stats` or changes to `/stats`
- Expand the page: add more stat categories (averages leaderboard, checkout leaderboard, win rate, etc.)
- Keep ton breakdown but add tabs for different stat views

**4. Admin Panel**
- Protected by `has_role(auth.uid(), 'admin')` check
- Full league CRUD, player management, match scheduling
- Admin seeded as kozun999@gmail.com with role 'admin'

**5. RLS Policies**
- `profiles`: users can read all, update own
- `user_roles`: read via `has_role` function only
- `players`, `leagues`, `matches`: public read, admin-only write
- `player_leagues`: public read, admin-only write

### Technical Details

**Database migration SQL** will:
1. Create `app_role` enum and `user_roles` table
2. Create `has_role` security definer function
3. Create all data tables with RLS
4. Create trigger to auto-create profile on signup

**Auth flow:**
- `onAuthStateChange` listener in AuthContext
- Query `user_roles` to check admin status
- Registration validates: email uniqueness (Supabase handles), password confirmation (client-side), minimum password length

**Stats page expansion** adds tabs:
- Ton scores (existing)
- Averages ranking
- Checkout ranking  
- Win rate / form ranking
- Achievements overview

### Implementation Order
1. Database migration (create all tables, RLS, seed data)
2. Enable auto-confirm for email signups
3. Rewrite AuthContext with Supabase auth
4. Update LoginPage (registration with confirm password, no demo creds, forgot password link)
5. Create ResetPasswordPage
6. Rewrite LeagueContext to fetch from database
7. Rename and expand Stats page
8. Update Navbar (route rename)
9. Update all pages to work with new data layer

