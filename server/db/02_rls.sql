-- =====================================================================
-- Spark — Row Level Security (PRD v3 §4.2)
-- All write paths use the service-role key (which bypasses RLS), so
-- these policies are read-side guards from the client. Idempotent.
-- =====================================================================

alter table public.users               enable row level security;
alter table public.ratings             enable row level security;
alter table public.sessions            enable row level security;
alter table public.battles             enable row level security;
alter table public.leaderboard_weekly  enable row level security;

-- ---------- users ----------
drop policy if exists "users select own"  on public.users;
drop policy if exists "users update own"  on public.users;

create policy "users select own"
  on public.users for select
  using (auth.uid() = id);

create policy "users update own"
  on public.users for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ---------- ratings ----------
drop policy if exists "ratings select own" on public.ratings;
create policy "ratings select own"
  on public.ratings for select
  using (auth.uid() = user_id);

-- ---------- sessions ----------
drop policy if exists "sessions select own" on public.sessions;
create policy "sessions select own"
  on public.sessions for select
  using (auth.uid() = user_id);

-- ---------- battles ----------
drop policy if exists "battles select own" on public.battles;
create policy "battles select own"
  on public.battles for select
  using (auth.uid() = user_id);

-- ---------- leaderboard_weekly ----------
-- Public read — everyone can see the leaderboard.
drop policy if exists "leaderboard public read" on public.leaderboard_weekly;
create policy "leaderboard public read"
  on public.leaderboard_weekly for select
  using (true);

-- =====================================================================
-- Note: there are deliberately NO insert/update policies for ratings,
-- sessions, battles, or leaderboard_weekly. The only writer is the
-- Express server using the service_role key, which bypasses RLS.
-- =====================================================================
