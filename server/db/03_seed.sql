-- =====================================================================
-- Spark — optional seed
-- Run only if you want a populated leaderboard before any real users
-- have signed up. Safe to skip entirely.
--
-- This file does NOT seed users (auth users must come from real signups
-- via Supabase Auth — you can't fabricate them here without bypassing
-- the auth.users table constraints). Instead, it pre-populates the
-- leaderboard_weekly table with synthetic rows that the leaderboard
-- read endpoint will display, so the UI is not empty on day one.
--
-- After your first real signup, you can DELETE these rows.
-- =====================================================================

-- Synthetic leaderboard entries — UUIDs are random; they will not match
-- any real auth user. The leaderboard query joins on users(name) — for
-- these rows we'll insert a stub user too, since users.id requires the
-- FK to auth.users we cannot. So instead we use a separate display path:
-- leave this seed empty for now and let real signups populate.
--
-- TODO: replace with real seed once at least one real user exists.

-- (No-op seed.)
select 'spark seed: no-op (waiting for real signups)' as note;
