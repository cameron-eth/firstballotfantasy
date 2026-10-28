# Performance, accuracy and reliability findings

**Severity:**

| Level | Meaning |
|---|---|
| **P0** | Security or correctness failure users can hit now |
| **P1** | High impact |
| **P2** | Medium |
| **P3** | Low |

**Evidence labels:** [V] verified, [C] code-supported, [S] suspected, [U] unknown.

No profiling, traces or query plans were captured. Every performance cost below is an estimate from code, and none is presented as a measured bottleneck.

## Confirmed problems

### P0-1. Anonymous write access to core data tables [V]

`anon` has INSERT/UPDATE/DELETE/TRUNCATE on five tables with RLS disabled:
- `ktc_player_values`
- `dynasty_prospects`
- `dynasty_player_tiers`
- `historical_prospects`
- `nfl_player_stats`

The key is public (`lib/supabase-config.ts:22`). Anyone can rewrite KTC values or prospect grades through PostgREST.

Evidence: `information_schema.role_table_grants` and `pg_class.relrowsecurity`, queried 2026-10-28. No write was attempted.

**Fix:** enable RLS, add read-only `select` policies for anon, and revoke write grants. All writers are service-role (`scripts/sync-ktc-values.mjs`, college script).

**Status (2026-10-28):** fixed in production by `firstballot/supabase/migrations/20261028_lock_down_public_data.sql`. It enabled RLS, added a read-only policy and revoked client write grants on the five tables, and revoked writes on the view `nfl_player_combined_stats`. That view ran with its owner's rights, so its anon write grants could have bypassed RLS.

Verified after applying:
- 0 client write grants remain, and no public table has RLS off.
- An anon PATCH returns `42501 permission denied`.
- Anon reads still return 200.
- Service-role writes still return 204.
- The app endpoints using the anon key still return 200: ktc-values, prospects, rankings, dynasty-tiers, data-health.

### P1-9. Legacy self-service membership policies [V]

- `user_profiles` has an UPDATE policy "Users can update own membership status" (`auth_id = auth.uid()`), so users can edit their own `membership_status` and `feature_access`.
- `subscriptions` lets users insert and update their own rows.
- The SECURITY DEFINER function `check_membership_status(email)` reports any email's membership.

**Current impact is low.** No app code reads these columns or that table for access decisions: entitlements come from `account_billing`, which has no client write policies (grep found no `membership_status`, `subscriptions` or `check_membership_status` usage). It becomes a privilege escalation the moment anything starts trusting those fields.

**Fix:** drop the self-update policies for billing columns (column-level grants or a trigger), remove client writes to `subscriptions`, and revoke `execute` on `check_membership_status` from anon and authenticated.

### P0-2. Preseason playoff odds are wrong [C]

With 0 completed games, the weekly average is NaN (`components/league-buddy/utils/playoffOdds.ts:94-95,164`). Every simulated game is then a loss, and the NaN sort comparator keeps roster order. The first N roster IDs show 100% and everyone else 0%. This hits every dynasty league after the season rolls over.

### P0-3. The college prospect refresh is not running and will expire [V]

- Only 1 manual run exists; no scheduled run happened on Wed 10-28.
- The classes are hard-coded to 2027–2029 (`scripts/refresh-college-prospects.py:22,230`; `college-prospects.yml:25-26`).
- The health check disables itself at season 2027 (`data-health.yml:120`).
- `Math.max(2027, …)` appears in 5 places (`app/api/prospects/route.ts:169`, `app/api/draftboard/route.ts:87,108`, `components/scouting/board-player.ts:39`, `app/api/prospects/draftboard/route.ts:8`).

### P1-1. Six definitions of team dynasty value [V]

The Overview "Dynasty rank", My Team "Team value" rank, the Outlook quadrant and power rank can disagree. See COMPUTATION_AUDIT §2.

### P1-2. Superflex is decided four ways; 1QB leagues get SF values in grades, placements, ranks, P/E and trends [V]

- 13 direct reads of `ktcValueSf` plus 3 hard-coded contexts.
- `isSuperflexLineup` misses 2QB leagues (`lib/sleeper-sdk/values.ts:118-120`).
- `trade-inventory` misses `QB/RB/WR/TE` (`lib/sleeper-sdk/trade-inventory.ts:59-61`).

### P1-3. Draft slots disagree across the app [V]

Capital cards use the projected order, the board defaults to record, and the Overview uses Max PF. The "record" fallback in `usePickCapital` can never trigger. An all-zero projection is still labelled "projected".

### P1-4. Unknown core ages are treated as the youngest [V]

A team with no known ages gets youth 0, the maximum, so its Future score is 100 (`components/league-buddy/competitiveState.ts:201-204`). This misclassifies franchise state.

### P1-5. Silent failures in three of four ingestion workflows [V]

- KTC failed on 10-26 with no alert.
- The history job has never run.
- The college job has never run on schedule.

Only `data-health.yml` opens issues. `ingestion_runs` contains success rows only and is read by nothing.

### P1-6. Partial KTC sync can publish tiers [C]

The 95k-row upsert isn't transactional and is ordered player-first (`scripts/sync-ktc-values.mjs:7-12`). The tier guard (≥250 rows, `app/api/dynasty-tiers/route.ts:32,61`) accepts a partial latest date.

### P1-7. Trade Market reads KTC with no freshness budget [C]

It also uses hindsight values, a synthetic pick scale, and owners merged across seasons by `rosterId` (`app/api/trade-market/route.ts:90-106`; `components/trade-market/analytics.ts:87-120,163`; `lib/trade-utils.ts:238-286`).

### P1-8. Identity mappings and history outcomes are frozen [V]

- The weekly job has never run.
- Output needs a PR merge.
- The bundled outcome file contains 56 `espnId:"NA"` rows and 2 known ID collisions that `data/identity-quarantine.json` lists but no runtime code reads.

### P2-1. Duplicate prospect rows across draft classes [V]

11 players appear twice, for example Arch Manning (Texas 2026 + 2027) and Malik Washington (Virginia 2024 + Maryland 2028). 45 prospects have no `espn_id`, so outcome joins key them as `"null:YEAR"`.

### P2-2. Name-based joins [V]

- KTC is joined to roster players by name (`components/league-buddy/useLeagueData.ts:606`).
- Prospects are joined to KTC by name (`components/scouting/DraftBoardTab.tsx:173`). Curated QB "Malik Washington" matches the Dolphins WR's KTC history.
- The rankings map is keyed by display name (`app/api/rankings/route.ts:47`).

### P2-3. Hard-coded tier key `v1` in three readers [V]

The writer uses `DYNASTY_TIER_VERSION`, so a version bump makes rankings return 503 and leaves Trade Market without tiers.

### P2-4. Stale or unused datasets still exposed [V]

- `nfl_player_stats` holds only 2025.
- `/api/player-stats` defaults to 2025.
- `master_*` and `nfl_ngs_*` tables have no writer.
- `/api/metrics` always reports R² = 0 (the column is never selected).
- `/api/overview` `uniquePlayers` is always 1.
- `/api/breakout-bust` is QB-only.

### P2-5. Points for is the integer `fpts` displayed as ".0" [V]

`fpts_decimal` is never read. Standings and odds tiebreaks use the integer, while draft order uses decimal matchup sums.

### P2-6. Week-1 projections refetched today [V]

`sleeper:projections:2026:1` was refetched 29 times today although the current week is 8. Some caller is requesting week 1 [S].

### P3-1. Dead code

`lib/sleeper-api.ts` runtime, `sleeperClient` singleton, `lib/cache-config.ts`, `lib/api-cache.ts`, `positionStrengths`, `calculateRawScore`, `/api/draft-capital`, `TeamCard.tsx`, unused routes (membership, overview, player-stats, player-momentum, conversion-examples, ngs player-fantasy-stats) [V].

## Performance findings

These are code-supported estimates and have not been profiled.

| # | Finding | Evidence | Impact estimate |
|---|---|---|---|
| PF-1 | Playoff odds: 10,000-run Monte Carlo on the main thread, re-run per tab mount and per `teams` identity | `useStandingsOdds.ts:47-53` | **Measured (PR-1 bench, Node desktop): 529 ms median in sf-dynasty (median-game league), 70–85 ms in the others.** The largest client CPU cost [V] |
| PF-2 | Trade Market: up to ~200 Sleeper calls per load (8 seasons × ~25), `no-store`, plus the full **~17 MB** players DB in the response | `app/api/trade-market/route.ts:43-314` | Slowest page; large egress. Public with no auth, so anyone can trigger the fan-out |
| PF-3 | Community: every request downloads every ballot object, then fits Bradley–Terry (×7 for trends) | `lib/community/store.ts:39-70`; `trends.ts:34-46` | Grows linearly with ballots, without bound |
| PF-4 | `suggestedTeamTrades` re-runs on every render (unstable `dismissed` array plus a 30 s timer) | `useTradeDismissals.ts:31,42` | **Measured: 56–67 ms per run in dynasty fixtures**, repeated on each re-render [V] |
| PF-12 | `/api/ktc-values` returns full KTC history, about 1.3 MB per 50 names (≈26 KB per player); the dashboard only uses the first and last points | `app/api/ktc-values/route.ts`; `useLeagueData.ts` `applyKtc` | ≈7–8 MB downloaded per dashboard load in a 12-team league [V, fixture capture] |
| PF-13 | Power rankings, placements, position ranks and team scores are **cheap**: under 1 ms each (PR-1 bench) | — | Moving them server-side is for consistency, not performance [V] |
| PF-5 | Dashboard request waterfall: 3 dependent waves, then 2 chained hooks. Transactions for weeks 1..N are fetched separately with `no-store` every 15 min. The league record is fetched 3× and the week's matchups up to 3× | `useLeagueData.ts:181-218, 640-659`; `useDraftOrder.ts`; `useStandingsOdds.ts` | Slow first load; many duplicate requests |
| PF-6 | `playerData` reads ~9 large JSONB snapshot rows (`select('*')`) per roster-stats call | `lib/platform/snapshots.ts:24`; `player-data.ts:63-101` | DB egress per call (MBs); no in-process memo |
| PF-7 | `/api/league-roster` downloads `players/nfl` (~18 MB) per call | `app/api/league-roster/route.ts:57-64` | Slow scouting load |
| PF-8 | Daily KTC sync re-upserts the whole 95k-row archive, so cost grows daily | `scripts/sync-ktc-values.mjs:7-12` | Job time and DB writes grow linearly |
| PF-9 | Hidden Team Builder keeps unmemoized trade and draft-funding computations running on other tabs | `LeagueBuddy.tsx:408-420` | Background CPU on desktop |
| PF-10 | Snapshot stampede: no lock on miss | `snapshots.ts:22-46` | Duplicate ESPN/Sleeper calls at expiry |
| PF-11 | Unbounded `select('*')` reads truncated at the 1,000-row default | overview, prospects/draftboard, draftboard, metrics, scouting-grades | Silent truncation as data grows [C] |

## Accuracy risks

| # | Risk | Evidence |
|---|---|---|
| A-1 | Missing KTC treated as 0 in the Overview dynasty rank, while other models invent values from Sleeper `search_rank` | `OverviewHeader.tsx:116`; `values.ts:42-52` |
| A-2 | Missing Max PF sorts a team to the 1.01 | `draftOrderBoard.ts:116-117` |
| A-3 | Nondeterministic playoff odds (unseeded `Math.random`; `log(0)` → Infinity) | `playoffOdds.ts:147-196` |
| A-4 | Four prospect tier vocabularies; positional rank passed as overall in the comparisons modal | `lib/scouting-grade-tier.ts:39-59`; `ScoutingPortal.tsx:424-435`; `ComparisonsModal.tsx:43` |
| A-5 | Date-based off-season check vs game-count rule | `lib/season-utils.ts:19-21`; `trade-signals.ts:89` |
| A-6 | Trade Market win % counts ties as losses; grade scales with trade volume; season filter uses the calendar year | `analytics.ts:163,279`; `filters.ts:57` |
| A-7 | Matview `master_player_stats` takes `max(team)` for traded players and counts games as distinct weeks | Matview definition [V] |
| A-8 | Players with no games this season lose career FPPG | `useLeagueData.ts:252` [V] |

## Cross-page consistency

| Metric | Places | Consistent? |
|---|---|---|
| Player tier (Team Builder vs My Team) | Both read `tierNumber` from the same snapshot via `useLeagueData` | **Yes** [C] |
| Dynasty rank (Overview vs Standings / Outlook) | Overview = definition A; Outlook default sort = power (D); quadrant = B | **No** [C] |
| Draft capital (header vs Picks) | Both use `usePickCapital` | **Yes** [V] |
| Pick slots (Picks capital cards vs Picks board) | Projected vs record default | **No** (labelled) [V] |
| Team strength (Overview roster ranks vs Power rankings categories) | `utils.ts` fixed depths vs `values.ts` league slots | **No** [C] |
| Player value (Trade Market vs cards) | KTC/100 blended vs raw KTC | **No** [V] |
| Core age (header vs My Team) | Top-12 vs all skill players | **No**, and the labels differ [V] |
| Playoff odds (Overview vs Standings) | Separate unseeded simulations | **No**, they can differ by run [C] |

## Reliability and observability

The system **cannot** answer "what is stale, why, and what is affected?" The gaps:

- **Tracked:** data-health covers snapshots, KTC date and prospect counts.
- **Not tracked:**
  - per-job status (KTC, college and history jobs aren't logged)
  - job durations (`ingestion_runs` has no start/running state)
  - provider error rates
  - cache hit rates
  - query latency
  - feature mapping (no dataset → feature registry)
- **Health check edge cases:**
  - It falls back to the bundled KTC date when the DB query errors, which can hide a DB outage (`app/api/data-health/route.ts:56-57`).
  - All ESPN and Sleeper snapshots report `source-time-unknown`, so the overall status is permanently "unverified".
- **Stale-while-error:** none. An expired snapshot plus a provider outage gives a hard 503.
- **Dead-letter / retry queues:** none.
