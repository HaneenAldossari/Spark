# Spark — Database setup

These SQL files match PRD v3 §4. Run them once against your Supabase project. They are **idempotent** — re-running them will not error.

## How to run

1. Open your Supabase dashboard → **SQL Editor** → **+ New query**.
2. Paste `01_schema.sql` → click **Run**. Wait for green ✓.
3. Paste `02_rls.sql` → **Run**. Green ✓.
4. (Optional) Paste `03_seed.sql` → **Run**. Currently a no-op until you have at least one real user.

## What gets created

| File | Creates |
|---|---|
| `01_schema.sql` | 6 enums (`spark_lang`, `spark_session_status`, `spark_game_type`, `spark_battle_category`, `spark_battle_outcome`, `spark_task_category`), 5 tables (`users`, `ratings`, `sessions`, `battles`, `leaderboard_weekly`), 7 indexes, 1 auth signup trigger that auto-creates a `public.users` row whenever a new `auth.users` row is inserted. |
| `02_rls.sql` | RLS enabled on all 5 tables + read policies per §4.2 (users see only their own rows; leaderboard is public read; all writes go through the service-role key). |
| `03_seed.sql` | No-op for now. |

## Verification

After running `01_schema.sql`, you should see in **Table Editor**:

- `users`, `ratings`, `sessions`, `battles`, `leaderboard_weekly` — all empty.

After running `02_rls.sql`, each table's **RLS** indicator should show **Enabled** (green shield).

## Auth setup

This schema assumes Supabase Auth is enabled (it is by default). To allow Google sign-in:

1. Dashboard → **Authentication** → **Providers** → **Google** → toggle on.
2. Add your OAuth client ID + secret from Google Cloud Console.
3. Set the redirect URL Supabase shows you in your Google Cloud OAuth consent screen.

For email/password sign-up, no additional config is needed.

## Re-running

Every statement uses `if not exists` / `or replace` / `drop policy if exists`. You can paste the whole file again any time without losing data.

## Resetting (destructive — only when you mean it)

```sql
drop table if exists public.leaderboard_weekly cascade;
drop table if exists public.battles cascade;
drop table if exists public.sessions cascade;
drop table if exists public.ratings cascade;
drop table if exists public.users cascade;
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_auth_user;
drop type if exists spark_lang, spark_session_status, spark_game_type,
                    spark_battle_category, spark_battle_outcome,
                    spark_task_category cascade;
```
