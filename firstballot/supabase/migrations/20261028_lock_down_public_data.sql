-- Public reference data is read-only for client roles (docs/data-architecture, R0-1).
--
-- These tables had RLS disabled and the anon/authenticated roles held full write grants,
-- so the public anon key (shipped to every browser) could insert, update or delete KTC
-- values, tiers and prospect data through PostgREST. Every legitimate writer uses the
-- service role, which bypasses RLS and keeps its own grants:
--   scripts/sync-ktc-values.mjs, scripts/refresh-college-prospects.py, app/api/* via supabaseAdmin.
-- Readers that use the anon key (app/api/ktc-values, prospects, prospects/draftboard,
-- trade-market) only select, so a read policy keeps them working.

do $$
declare
  t text;
begin
  foreach t in array array[
    'ktc_player_values',
    'dynasty_prospects',
    'dynasty_player_tiers',
    'historical_prospects',
    'nfl_player_stats'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_public_read', t);
    execute format(
      'create policy %I on public.%I for select to anon, authenticated using (true)',
      t || '_public_read',
      t
    );
    execute format(
      'revoke insert, update, delete, truncate, references, trigger on public.%I from anon, authenticated',
      t
    );
  end loop;
end $$;

-- A plain view runs with its owner's rights, so write grants on it would bypass RLS on
-- nfl_player_stats. Keep it readable, never writable, by client roles.
revoke insert, update, delete, truncate, references, trigger
  on public.nfl_player_combined_stats from anon, authenticated;
