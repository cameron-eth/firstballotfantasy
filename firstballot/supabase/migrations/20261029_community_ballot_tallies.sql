-- Community ratings read per-pair tallies instead of every ballot file (PR-17, audit R3-3).
--
-- The ratings fit (lib/community/rating.ts) only uses, for each pair of players, how many
-- ballots compared them and how many the alphabetically first one won. Each ballot write
-- adds to its pair's tally for that day; a read fetches the tallies (one query) instead of
-- listing the bucket and downloading every ballot. Per-day rows keep the 7-day trend exact.
--
-- The ballot files stay the source of truth. community_tally_state() lets a reader check
-- that the tallies account for every ballot, and replace_community_tallies() rebuilds them
-- from the ballots in one transaction when they don't.
--
-- Rollback:
--   drop function if exists public.replace_community_tallies(jsonb);
--   drop function if exists public.community_tally_state();
--   drop function if exists public.record_community_ballot(text, date, text, text, boolean);
--   drop table if exists public.community_ballot_tallies;

create table if not exists public.community_ballot_tallies (
  pool text not null check (pool in ('dynasty', 'nfl')),
  day date not null,
  a text not null,
  b text not null,
  n integer not null default 0 check (n >= 0),
  wins_a integer not null default 0 check (wins_a >= 0 and wins_a <= n),
  primary key (pool, day, a, b),
  check (a < b)
);

-- Server only: no client role reads or writes tallies.
alter table public.community_ballot_tallies enable row level security;
revoke all on public.community_ballot_tallies from anon, authenticated;

create or replace function public.record_community_ballot(
  p_pool text, p_day date, p_a text, p_b text, p_a_won boolean
) returns void
language sql
as $$
  insert into public.community_ballot_tallies (pool, day, a, b, n, wins_a)
  values (p_pool, p_day, p_a, p_b, 1, case when p_a_won then 1 else 0 end)
  on conflict (pool, day, a, b) do update
    set n = community_ballot_tallies.n + 1,
        wins_a = community_ballot_tallies.wins_a + excluded.wins_a
$$;

create or replace function public.community_tally_state()
returns table (ballots bigint, tallied bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select count(*) from storage.objects
      where bucket_id = 'community-ballots' and name like '%.json'),
    (select coalesce(sum(n), 0) from public.community_ballot_tallies)
$$;

-- p_rows: [{ "pool", "day", "a", "b", "n", "wins_a" }], the full tally set from the ballots.
create or replace function public.replace_community_tallies(p_rows jsonb)
returns void
language plpgsql
as $$
begin
  delete from public.community_ballot_tallies where true;
  insert into public.community_ballot_tallies (pool, day, a, b, n, wins_a)
  select r.pool, r.day, r.a, r.b, r.n, r.wins_a
  from jsonb_to_recordset(p_rows) as r(pool text, day date, a text, b text, n integer, wins_a integer);
end
$$;

revoke execute on function public.record_community_ballot(text, date, text, text, boolean)
  from public, anon, authenticated;
revoke execute on function public.community_tally_state() from public, anon, authenticated;
revoke execute on function public.replace_community_tallies(jsonb) from public, anon, authenticated;
