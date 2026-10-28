-- Scheduled jobs log one row per run to ingestion_runs (docs/data-architecture PR-3).
-- Additive only: snapshot() keeps writing (dataset, status, completed_at, error_code) as before.
--   source   : who ran it, e.g. 'workflow:Refresh KTC history' or null for read-through snapshots
--   run_url  : link to the GitHub Actions run, so a failure is one click from its logs
--   details  : small JSON for job-specific facts (trigger event, row counts, commit)
--
-- Rollback:
--   alter table public.ingestion_runs drop column if exists details,
--     drop column if exists run_url, drop column if exists source;
--   drop index if exists public.ingestion_runs_source_time;

alter table public.ingestion_runs
  add column if not exists source text,
  add column if not exists run_url text,
  add column if not exists details jsonb;

create index if not exists ingestion_runs_source_time
  on public.ingestion_runs (source, started_at desc)
  where source is not null;
