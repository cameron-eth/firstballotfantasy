# Runtime evidence (collected 2026-10-28 ~17:20 UTC, read-only)

## GitHub Actions (history since 2026-10-26; main was rewritten that day so older history is gone)
- data-health.yml cron "17 * * * *": 33 runs (31 success, 2 skipped, 0 failure), 29 scheduled. Scheduled starts drift to :20–:46. Gaps on 10-26/27: 07:49 → 15:13 → 20:31 → 00:26 → 06:18 → 13:13 → 18:42 (4–7h gaps), hourly from 10-27 18:42 on.
- ktc-history.yml cron "30 10 * * *": 6 runs (5 success, 1 failure on 10-26 16:52 schedule). Scheduled starts: 10-26 16:52, 10-27 15:57, 10-28 16:45 → ~5.5–6.3 h after configured time.
- college-prospects.yml cron "45 11 * * 1,3,5": 1 run total (manual, 10-26 19:00). No scheduled run on Wed 10-28 as of 17:20 UTC.
- history-outcomes.yml cron "20 12 * * 3": 0 runs ever.
- No vercel.json crons.

## /api/data-health (prod)
- status "unverified"; season 2026 week 8.
- dynasty:tiers:v1 current (fetched 16:46, expires +30h, quality validated).
- espn:ppr:2018–2025 fetched 16:34, expire 11-27 (30d); espn:ppr:2026 TTL 15m; all "source-time-unknown"/quality unverified.
- sleeper:projections:2026:1 fetched today and 29 ingestion runs logged for week 1 although current week is 8 (something requests week 1). 2026:7 expired; 2026:8 and :season current.
- prospects:2027/2028/2029 record counts 75/30/16 (121) vs 1002 rows in dynasty_prospects.

## Database (public schema)
- 30 tables. Largest: ktc_player_values 106k rows/30MB, nfl_player_stats 17.6k, master_player_dataset 5.6k, dynasty_prospects 1002, dynasty_player_tiers 972.
- RLS disabled + anon role has SELECT/INSERT/UPDATE/DELETE/TRUNCATE on: dynasty_player_tiers, dynasty_prospects, historical_prospects, ktc_player_values, nfl_player_stats (anon key is public: lib/supabase-config.ts:22 NEXT_PUBLIC_SUPABASE_ANON_KEY). master_player_dataset has RLS on with same grants (policies govern).
- master_player_stats is a MATERIALIZED VIEW over nfl_player_stats (games_played = count(distinct week); team = max(team)). nfl_player_stats contains only season 2025 (17,577 rows). Refresh functions: refresh_master_player_stats (invoker), refresh_master_stats (security definer).
- ktc_player_values: 2026-03-22 → 2026-10-28, 212 distinct days of 221; missing 2026-03-23..27, 05-26, 09-08..10. Unique (ktc_player_id, scraped_date).
- ingestion_runs: 175 rows, only status=success rows exist (no failures recorded at all); KTC/prospect/history jobs don't write ingestion_runs (only snapshot()).
- dynasty_tier_publications: 5 rows, 5 archived (archived_at set), last fetched 16:46.
- dynasty_prospects: 1002 rows, 45 without espn_id, 11 names appear twice (same player in two draft classes, e.g. Arch Manning Texas 2026 + 2027, Lanorris Sellers 2026 + 2027, Malik Washington Virginia 2024 + Maryland 2028). Unique key is (name, draft_year, position).
- data_snapshots: 10 rows, 3.3 MB, PK only.
