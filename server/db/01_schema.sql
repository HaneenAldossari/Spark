-- =====================================================================
-- Spark — schema (PRD v3 §4.1)
-- Run order: 01_schema.sql → 02_rls.sql → 03_seed.sql (optional)
-- Idempotent: safe to re-run.
-- =====================================================================

-- ---------- enums ----------
do $$ begin
  create type spark_lang          as enum ('ar','en');
exception when duplicate_object then null; end $$;

do $$ begin
  create type spark_session_status as enum ('in_progress','complete','incomplete');
exception when duplicate_object then null; end $$;

do $$ begin
  create type spark_game_type     as enum (
    -- Phase 2 five (April 2026 rotation)
    'schulte','nback','dotconnect','speedmath','stroop',
    -- retired-but-kept-for-historical-reads
    'ruleswitch','dualtask','memory','pattern','word_sprint'
  );
exception when duplicate_object then null; end $$;

-- If the enum already existed from an earlier install, add any values
-- missing from it. IF NOT EXISTS makes these statements idempotent.
--
-- IMPORTANT: do not put a SELECT that references these new values in the
-- same transaction as the ALTER TYPE. Postgres rejects it with 55P04
-- "unsafe use of new value" because new enum values must be committed
-- before they can be referenced. The migrate.mjs script sends each
-- statement separately via the Supabase query API so this file is safe
-- there — but if you paste this into the dashboard SQL editor, run any
-- verification SELECT as a SEPARATE query.
alter type spark_game_type add value if not exists 'schulte';
alter type spark_game_type add value if not exists 'nback';
alter type spark_game_type add value if not exists 'dotconnect';
alter type spark_game_type add value if not exists 'speedmath';
alter type spark_game_type add value if not exists 'ruleswitch';
alter type spark_game_type add value if not exists 'dualtask';

do $$ begin
  create type spark_battle_category as enum ('logic','language','math','pattern','general');
exception when duplicate_object then null; end $$;

do $$ begin
  create type spark_battle_outcome  as enum ('win','loss','draw','ghost_win','ghost_loss');
exception when duplicate_object then null; end $$;

do $$ begin
  create type spark_task_category   as enum ('studying','coding','writing','presenting','reading','designing','other');
exception when duplicate_object then null; end $$;

-- April 2026: add 'design' and 'math' as new categories. 'designing' is
-- retained as a legacy alias so existing session rows stay readable.
alter type spark_task_category add value if not exists 'design';
alter type spark_task_category add value if not exists 'math';

-- ---------- TB1 users ----------
create table if not exists public.users (
  id              uuid primary key references auth.users(id) on delete cascade,
  email           text not null unique,
  name            text not null,
  language        spark_lang not null default 'ar',
  streak          integer not null default 0,
  last_session_at timestamptz,
  created_at      timestamptz not null default now()
);

-- ---------- TB2 ratings ----------
create table if not exists public.ratings (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users(id) on delete cascade,
  category      spark_battle_category not null,
  rating        integer not null default 1200,
  total_battles integer not null default 0,
  updated_at    timestamptz not null default now(),
  unique (user_id, category)
);
create index if not exists ratings_user_idx on public.ratings(user_id);

-- ---------- TB3 sessions ----------
create table if not exists public.sessions (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.users(id) on delete cascade,
  declared_task      text not null,
  task_category      spark_task_category not null,
  language           spark_lang not null,
  status             spark_session_status not null default 'in_progress',
  brain_score        integer,
  game_score         integer,
  battle_score       integer,
  verdict_score      integer,
  consistency_score  integer,
  game_type          spark_game_type,
  verdict_fallback   boolean not null default false,
  phase2_duration_ms integer,
  battle_outcome     spark_battle_outcome,
  created_at         timestamptz not null default now(),
  completed_at       timestamptz
);
create index if not exists sessions_user_created_idx on public.sessions(user_id, created_at desc);
create index if not exists sessions_status_idx on public.sessions(status);

-- ---------- TB4 battles ----------
create table if not exists public.battles (
  id                   uuid primary key default gen_random_uuid(),
  session_id           uuid not null references public.sessions(id) on delete cascade,
  user_id              uuid not null references public.users(id) on delete cascade,
  opponent_id          uuid references public.users(id) on delete set null,
  is_ghost             boolean not null default false,
  category             spark_battle_category not null,
  question_id          text not null,
  user_answer          text,
  user_response_ms     integer,
  opponent_response_ms integer,
  outcome              spark_battle_outcome,
  rating_before        integer not null,
  rating_after         integer not null,
  created_at           timestamptz not null default now()
);
-- ghost-opponent lookup is the hot path: filter by category + is_ghost,
-- then range over rating_before. This composite index supports both.
create index if not exists battles_ghost_lookup_idx
  on public.battles(category, is_ghost, rating_before);
create index if not exists battles_user_idx on public.battles(user_id);

-- ---------- TB5 leaderboard_weekly ----------
create table if not exists public.leaderboard_weekly (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.users(id) on delete cascade,
  week_start      date not null,
  avg_brain_score integer not null,
  session_count   integer not null,
  institution     text,
  unique (user_id, week_start)
);
create index if not exists leaderboard_week_score_idx
  on public.leaderboard_weekly(week_start, avg_brain_score desc);
create index if not exists leaderboard_institution_idx
  on public.leaderboard_weekly(institution, week_start);

-- =====================================================================
-- Auth signup trigger
-- When a new auth.users row is created (Google OAuth or email signup),
-- automatically create the matching public.users row. This means the
-- backend never has to "first-time check" — the row always exists by
-- the time the JWT lands on the API.
-- =====================================================================
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, name, language)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(
      new.raw_user_meta_data ->> 'name',
      split_part(coalesce(new.email, 'user'), '@', 1)
    ),
    coalesce(new.raw_user_meta_data ->> 'language', 'ar')::spark_lang
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();
