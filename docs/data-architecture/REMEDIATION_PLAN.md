# Remediation plan

Ordered by priority and dependency. "Complexity": S < ½ day, M ≈ 1–2 days, L ≥ 3 days.

## Phase 0: urgent (security and broken behavior)

| ID | Item | Severity | Affected | Root cause | Solution | Impact | Cx | Depends | Regression risk | Validation |
|---|---|---|---|---|---|---|---|---|---|---|
| R0-1 | Lock down anon writes | P0 | All valuation and prospect data | RLS off + broad grants on 5 tables | Migration: enable RLS, `select` policy for anon/authenticated, revoke INSERT/UPDATE/DELETE/TRUNCATE from anon | Closes public write access | S | — | Low (writers use the service role) | Catalog query shows no anon write grants; KTC sync and college job still succeed; anon REST insert returns 401/403 |
| R0-2 | Fix preseason playoff odds | P0 | Standings, Overview | NaN average with 0 games | Use a prior (projection- or league-average-based) when `completed = 0`; guard NaN; seed the RNG | Correct odds at rollover | S | — | Low | Unit test with a 0-game league; seeded runs produce identical output |
| R0-3 | Unfreeze college refresh | P0 | Scouting | Hard-coded years; schedule not firing | Derive classes from the Sleeper season; replace `Math.max(2027, …)` with one helper; add a `workflow_dispatch` fallback and an alert step; remove the `season < 2027` guard | Stats keep updating past 2027 | S | — | Low | Dry run with season = 2027; health shows `lastCheckedAt` < 3 days |

## Phase 1: one definition per metric (dashboard correctness)

| ID | Item | Severity | Affected | Root cause | Solution | Impact | Cx | Depends | Regression risk | Validation |
|---|---|---|---|---|---|---|---|---|---|---|
| R1-1 | `LeagueContext` + single superflex rule | P1 | All league metrics | 4 rules + 3 hard-coded | One `resolveLeagueContext(league)` (SUPER_FLEX, `QB/RB/WR/TE`, or >1 QB); thread `ctx` everywhere; replace 13 direct `ktcValueSf` reads with `valueFor(player, ctx)` | 1QB leagues correct | M | — | Medium (values change for 1QB leagues) | Tests with 1QB, SF and 2QB fixtures; grep shows 0 direct `ktcValueSf` reads outside `values.ts` |
| R1-2 | One team-value definition | P1 | Overview, My Team, Outlook, Power | 6 definitions | Pick `teamValueScore` (quality-weighted, the latest product decision) as "dynasty value"; derive rank, quadrant and grade from it; label power rankings as "lineup strength" | Ranks agree across pages | M | R1-1 | Medium (ranks move) | Snapshot test: the same team has the same rank on every surface |
| R1-3 | One draft-slot policy | P1 | Overview, Picks, Standings, Builder | 5 call sites | `draftSlots(ctx, policy)` with an explicit, league-configurable basis (default: projected when complete, else record); fix the always-projected bug; one `pickLabel` | Consistent slots | S | — | Low | Header, capital cards and board show the same slot for the same basis |
| R1-4 | One standings order | P2 | Header, tables, odds, placements | 5 orderings | `recordOrder` everywhere (win%, ties = ½, then decimal PF); read `fpts_decimal` | Consistent ranks | S | — | Low | Tie-fixture tests |
| R1-5 | Null-safe inputs | P1 | Franchise state, draft order, dynasty rank | `?? 0` and age 0 | Unknown ages → median, not 0; missing Max PF → excluded with a "not enough data" state; missing KTC → `rankToValue` with a visible "estimated" flag | No silent misclassification | S | R1-2 | Low | Fixture tests |
| R1-6 | Memoization fixes | P2 | Overview CPU | Unstable deps; inline props | Stable `dismissed`; memoize `leaguePlayerPool`, RosterSection scores; unmount hidden Builder or pause its computations | Less render CPU | S | — | Low | React profiler before/after on the Overview |

## Phase 2: ingestion reliability

| ID | Item | Severity | Affected | Root cause | Solution | Impact | Cx | Depends | Regression risk | Validation |
|---|---|---|---|---|---|---|---|---|---|---|
| R2-1 | Alert + log every job | P1 | KTC, college, history | Only data-health alerts | Shared alert step; each job writes `ingestion_runs` (start/end/status/rows); `concurrency:` groups | Failures visible within one run | S | — | None | Forced failure opens an issue |
| R2-2 | Atomic KTC day | P1 | Tiers, values | Non-transactional 95k upsert | Upsert only new dates (incremental), ordered by date; tiers require ≥ the previous day's row count for the latest date | Faster job; no partial-day tiers | S | — | Low | Interrupted sync doesn't publish tiers |
| R2-3 | Pin the external scraper | P2 | KTC | Unpinned `sleeper-sdk` checkout | Pin to a commit SHA; bump via PR | Reproducible ingestion | S | — | Low | Workflow uses `ref:` |
| R2-4 | Auto-merge or runtime-load identity and outcomes | P1 | FPPG, tiers, History | PR-gated JSON; job never ran | Move to `data_snapshots` (`identities:v1`, `history-outcomes:{season}`) written by the job; keep the JSON as a fallback; apply quarantine | Fresh mappings without merges | M | R2-1 | Medium | Health shows identity and outcome freshness |
| R2-5 | Stale-while-error snapshots | P2 | Everything snapshot-backed | Strict expiry → 503 | Option to serve the expired payload flagged `stale` during provider failure | Availability | S | — | Low (labelled) | Simulated ESPN outage returns data with `stale: true` |
| R2-6 | Snapshot key constants | P2 | Rankings, Trade Market, health | Hard-coded `v1` | Export `TIER_KEY`; route the 2 bypassing writers through `snapshot()` | Safe version bumps | S | — | None | Bump the version in a test env; all readers work |

## Phase 3: performance

| ID | Item | Severity | Affected | Root cause | Solution | Impact | Cx | Depends | Regression risk | Validation |
|---|---|---|---|---|---|---|---|---|---|---|
| R3-1 | Server league metrics snapshot | P1 | Dashboard | All league metrics on the client | `/api/league/{id}/metrics` computes R1 metrics + seeded odds + draft order server-side; materialize per league + week with input hashes | One request; deterministic; mobile CPU relief | L | R1-* | Medium | Same numbers as client fixtures; Lighthouse before/after |
| R3-2 | Trade Market rebuild | P1 | Trade Market | 200 calls + 17 MB per load | Materialize per league season (past seasons immutable); stop sending `allPlayers` (send only the referenced ids); value at trade date from KTC history; require auth | Page loads in one cached read | M | R1-1 | Medium (numbers change) | Payload < 1 MB; KPI tests |
| R3-3 | Incremental community ratings | P2 | Community, Crowd rank | Full ballot scan per request | Store ratings + daily rank history; update on ballot write | Constant-time reads | M | — | Low | Ratings match the batch recompute on a fixture |
| R3-4 | Dashboard request consolidation | P2 | First load | Waterfalls, duplicate league/matchup fetches | Server bundle endpoint for state + league + rosters + users + matchups; dedupe via SWR keys; batch transactions | Fewer round trips | M | R3-1 | Medium | Network panel request count before/after |
| R3-5 | Snapshot read efficiency | P3 | roster-stats | 9 big JSONB rows per call | Per-instance memo of payloads within the TTL; select only needed ids (store per-season maps in a table if needed) | Less DB egress | S | — | Low | Timing before/after |

## Phase 4: clean-up and consistency

| ID | Item | Severity | Solution | Cx |
|---|---|---|---|---|
| R4-1 | Identity service + remove name joins | P2 | Per TARGET_ARCHITECTURE §1; fix the Malik Washington mismatch | M |
| R4-2 | Prospect tier single vocabulary + dedupe | P2 | Derive the tier from the grade (or flag disagreements); merge 11 cross-class duplicates; backfill 45 missing ESPN ids | M |
| R4-3 | One Sleeper client | P2 | Per INFRASTRUCTURE_AUDIT §3.1 | M |
| R4-4 | `http.ts` + single auth pass everywhere | P3 | 28 ad-hoc routes | M |
| R4-5 | Remove dead code and legacy routes | P3 | After reference checks (design decision 3) | S |
| R4-6 | Data-health: dataset → feature map, job rows, stale-since | P2 | Extends R2-1 | S |

## Sequencing

```
R0-1, R0-2, R0-3 (independent, first)
R2-1 → R2-2, R2-3, R2-4, R2-6
R1-1 → R1-2 → R1-5 ; R1-3, R1-4, R1-6 (parallel)
R1-* → R3-1 → R3-4 ; R1-1 → R3-2 ; R3-3, R3-5 independent
R4-* after the phase that touches the same code
```
