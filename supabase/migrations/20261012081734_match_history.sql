-- Finished matches, one row per match, owned by the (anonymous) player who played it.
create table public.matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  home_team text not null check (char_length(home_team) between 2 and 8),
  away_team text not null check (char_length(away_team) between 2 and 8),
  home_score smallint not null check (home_score between 0 and 99),
  away_score smallint not null check (away_score between 0 and 99),
  duration_min numeric(4, 1) not null check (duration_min > 0 and duration_min <= 60),
  difficulty text not null check (difficulty in ('easy', 'normal', 'hard')),
  goals jsonb not null default '[]'::jsonb,
  stats jsonb not null default '{}'::jsonb,
  played_at timestamptz not null default now()
);

comment on table public.matches is 'Football Heroes 2026: finished quick matches, private to each player.';

create index matches_user_played_idx on public.matches (user_id, played_at desc);

alter table public.matches enable row level security;

-- Players (including anonymous sign-ins, which use the authenticated role) see and add only their own matches.
create policy "Players read their own matches"
  on public.matches for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Players record their own matches"
  on public.matches for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Players delete their own matches"
  on public.matches for delete
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.matches from anon;
grant select, insert, delete on public.matches to authenticated;
