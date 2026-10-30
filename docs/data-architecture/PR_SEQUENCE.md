# Phase 2 remediation: PR sequence and completion gates

This plan turns [REMEDIATION_PLAN.md](REMEDIATION_PLAN.md) into small PRs that can each be deployed on their own. **Planning is separate from implementation.** No implementation PR after PR-1 starts until **Gate G0** passes. Every PR must pass its own gate before the next PR that depends on it begins.

## Gates

| Gate | Passes when | Evidence required |
|---|---|---|
| **G0: Plan approved** | The owner approves this sequence and answers decisions D1–D4 | A comment or reply on the PR |
| **G-PR: every PR** | 1. `tsc`, React doctor and `npm test` all pass in CI. 2. The golden snapshot diff is empty, *or* every changed value is listed as an intended change in the PR body. 3. Performance PRs attach before/after benchmarks from the same harness. 4. Migration PRs include a dry run in a rolled-back transaction, a forward script and a rollback script. 5. After deploy, production is verified (endpoint checks or `/api/data-health`). | PR body checklist |
| **G1: Correctness phase done** (after PR-9) | Every metric in DATA_INVENTORY §2 marked D has one implementation, and golden fixtures are identical across Overview, Builder, My Team, Standings and Picks | The golden test asserts that each value appears once per fixture; the "D" column is updated |
| **G2: Reliability phase done** (after PR-13) | Every scheduled job alerts on failure and logs to `ingestion_runs`; every snapshot key is a constant and shown in data-health | A forced-failure run opens an issue; data-health lists every key |
| **G3: Performance phase done** (after PR-18) | Each optimized path shows a measured improvement on the benchmark harness, with no regression in the golden fixtures | Benchmark tables in the PR bodies |
| **G4: Consolidation done** (after PR-23) | INFRASTRUCTURE_AUDIT has no class-D rows left | Updated doc |

## Status

- **G0: passed 2026-10-28.** The owner approved this sequence and the recommended option for each of D1–D4 below.

## Decisions (approved 2026-10-28; each blocked the PRs named)

None of these will be chosen silently, because each one changes a scoring method.

| ID | Decision | Options | Recommendation | Blocks |
|---|---|---|---|---|
| **D1** | Canonical "dynasty value" for teams | (a) `teamValueScore`: quality-weighted and depth-decayed (current My Team definition); (b) lineup-slot power score; (c) linear KTC sum | (a). It was the most recent product decision. Power rankings would be relabelled "Lineup strength" and kept as a separate, clearly named metric | PR-6 |
| **D2** | Default basis for draft slots | Record / Max PF / projected Max PF, with a per-league override | Projected Max PF when every team has data, otherwise Record, labelled everywhere | PR-8 |
| **D5** | Roster-fit trade signal vs Market signal when they disagree | Hide one / rank one above the other / show both | Show both with their reasons and flag the disagreement (owner, 2026-10-28) | PR-9b |
| **D3** | Prospect tier source | (a) derive from the grade cutoffs; (b) keep stored labels and flag disagreements | (b) first: show disagreements in data-health, then fix the data. **Decided 2026-10-28: (a)**, through the approved prospect plan (`docs/product/PROSPECT_RANKING_PLAN.md`); data-health still flags disagreements until grade v2 ships | PR-20 |
| **D4** | Trade Market valuation | Today's values (current) vs value on the trade date from KTC history | Value on the trade date, with today's value as a second column | PR-16 |

## Test leagues

Fixtures are recorded from real HTTP responses and anonymized. They live in `firstballot/tests/fixtures/leagues/`:

| Fixture | Format | Purpose |
|---|---|---|
| `sf-dynasty` | 12-team superflex dynasty, in season | Primary: the owner's league |
| `1qb-dynasty` | 12-team 1QB dynasty, in season (public league) | Catches superflex hard-coding |
| `redraft-1qb` | 10-team redraft | Dynasty-only features must be absent |
| `2qb-synthetic` | `sf-dynasty` with SUPER_FLEX replaced by QB | Edge case for the competing superflex rules |
| `preseason` | `sf-dynasty` with records zeroed | Preseason odds bug (P0-2) |

## Sequence

Legend: **M** = has a DB migration. **F** = behind a flag or compatibility layer. ⏸ = waiting on a decision.

### Phase A: safety net and urgent fixes

| PR | Scope | Files / systems | Acceptance criteria | Tests | Benchmark | Migration | Rollback |
|---|---|---|---|---|---|---|---|
| ✅ **#81** | R0-1: RLS on, client roles read-only | `supabase/migrations/20261028_lock_down_public_data.sql` | Applied and verified 2026-10-28 | Catalog checks | — | **M** (applied) | Re-grant via the reverse script in the PR body |
| **PR-1** | Golden fixtures and metric harness | `scripts/capture-league-fixture.mjs`, `tests/fixtures/leagues/*.json`, `tests/helpers/replay-fetch.mjs`, `tests/metrics-golden.test.mjs`, `tests/golden/*.json`; export the existing builders from `useLeagueData.ts` (no behavior change) | Replays the recorded responses through the **unmodified** production code; snapshots every lineage metric for all 5 fixtures; deterministic across runs | Itself | `scripts/bench/metrics.mjs` gives the baseline for later PRs | — | Revert (tests only) |
| **PR-2** | R0-2: preseason playoff odds; seeded simulation | `components/league-buddy/utils/playoffOdds.ts`, `useStandingsOdds.ts` | The preseason fixture no longer shows 100%/0%. The same inputs give identical odds. Overview and Standings show the same odds | Seeded tests; preseason fixture | Simulation time before/after | — | Revert |
| **PR-3** | R2-1: alert and run logging for every job | `.github/actions/notify-failure/action.yml` (new composite), all 4 workflows, `concurrency:` groups, `scripts/*` write `ingestion_runs`; migration adds `started_at`/`status`/`rows`/`error` | A forced failure opens an issue per workflow; each run logs start and end | Workflow dry run | — | **M** (additive columns) | Drop the added columns |
| **PR-4** | R0-3: college refresh works past 2026 | `scripts/refresh-college-prospects.py`, `college-prospects.yml`, new `lib/draft-years.ts` replacing `Math.max(2027, …)` ×5, `data-health.yml:120` | Classes derive from the Sleeper season; a dry run with season=2027 picks 2028–2030 | `tests/draft-years.test.mjs`; Python unit test | — | — | Revert |
| **PR-22** | R0-4: remove legacy self-service membership writes | Migration: drop the self-update policies on billing columns, revoke `subscriptions` client writes, revoke `execute` on `check_membership_status` | An authenticated PATCH of `membership_status` is denied; profile edits still work | Catalog and REST checks | — | **M** | Re-create the policies from the reverse script |

### Phase B: one definition per metric (all diffs visible in golden snapshots)

| PR | Scope | Files / systems | Acceptance criteria | Tests | Migration | Rollback |
|---|---|---|---|---|---|---|
| **PR-5** | R1-1: `LeagueContext` and a single superflex rule | New `lib/league-metrics/context.ts` (`resolveLeagueContext`, `valueFor`); replace the rules in `useLeagueData.ts:276`, `lib/sleeper-sdk/values.ts:118`, `trade-inventory.ts:59`, `LineupMap.tsx:33`; remove hard-coded `superflex:true` (`utils.ts:6`, `competitiveState.ts:23`, `team-score.ts:52`); 13 direct `ktcValueSf` reads | The `sf-dynasty` golden is **unchanged**. `1qb-dynasty` and `2qb-synthetic` change in the listed ways only. Grep finds 0 `ktcValueSf` reads outside `values.ts` | Golden + context unit tests | — | Revert |
| **PR-6** ⏸D1 | R1-2: one team-value definition | `lib/league-metrics/team-value.ts` used by `OverviewHeader`, `RosterSection`, `competitiveState`, grades; power rankings renamed "Lineup strength" | The same team shows the same dynasty rank on every surface (golden asserts it) | Golden | — | Revert |
| **PR-7** | R1-4: one standings order, decimal PF | `utils.ts` `recordOrder` used in `LeagueBuddy.tsx:86`, `playoffOdds.ts`, `competitiveState.ts:183`, `draftOrderBoard.ts`; read `fpts_decimal` | Tie fixture gives a consistent order everywhere; PF shows real decimals | Golden + tie unit tests | — | Revert |
| **PR-8** ⏸D2 | R1-3: one draft-slot policy | `lib/league-metrics/draft-slots.ts`; `OverviewHeader`, `usePickCapital`, `LeagueStandingsSection`, `TeamTimeline`, `DraftOrderPanel`; one `pickLabel` | The same basis gives the same slot on the header, Picks cards, board and Builder | Golden | — | Revert |
| **PR-9** | R1-5: null-safe inputs | `competitiveState.ts` (unknown ages), `draftOrderBoard.ts` (missing Max PF), Overview value rank (missing KTC) | An "insufficient data" state is shown instead of an extreme value; no defaults that mislead | Golden + missing-data fixtures | — | Revert |
| **PR-9b** | G1 follow-up: inventory #8, #9, #16, #17, #18, #29/30 | `projections/projectedPoints.ts`; `startSit`; `calculateLeaguePositionRankings`; `tradeSignals(…, inSeason)`; `coreAvgAge`; Market signals shows roster-fit signals (D5) | Each metric has one implementation (`tests/g1-consolidation.test.mjs`) | Unit tests; goldens unchanged | — | Revert |
| → **G1** | | | | | | | **Passed 2026-10-28** for the league dashboard (see GATE_G1.md); 7 D metrics carried to PR-16, PR-19, PR-20, PR-23 (metric 4 still unowned) |

### Phase C: reliability

| PR | Scope | Files / systems | Acceptance criteria | Migration | Rollback |
|---|---|---|---|---|---|
| **PR-10** | R2-6: snapshot key constants; route the bypassing writers through `snapshot()` | `lib/dynasty-tiers.ts` exports `TIER_KEY`; `app/api/rankings`, `trade-market`, `data-health`; draft-capital write; college snapshot write | A version bump in a test environment works for every reader | — | Revert |
| **PR-11** | R2-2 + R2-3: incremental, ordered KTC sync; pinned scraper | `scripts/sync-ktc-values.mjs`, `scripts/import-ktc-history.py`, `ktc-history.yml` (`ref:` SHA); tier build requires a complete latest date | An interrupted sync can't publish tiers; job time is measured | — | Revert the workflow |
| **PR-12** **F** | R2-5: stale-while-error snapshots | `lib/platform/snapshots.ts` (`allowStale` option, `stale: true` in responses); enabled first for `espn:ppr:*` and projections | A simulated provider outage serves labelled stale data instead of a 503 | — | Turn the flag off |
| **PR-13** **M** | R2-4: runtime identity map and history outcomes | Job writes `identities:v1` and `history-outcomes:{season}` snapshots; readers use the snapshot first, then the bundled JSON; quarantine applied | data-health shows identity and outcome freshness; no PR merge needed | Additive (snapshot rows) | Readers fall back to the JSON |
| **PR-13b** | G2 follow-up: snapshot key constants and data-health coverage | `lib/platform/snapshot-keys.ts`; projections, roster and prospect-stats keys; draft capital listed in data-health | No key written at a call site (guard test); data-health lists every shared key | Guard test; forced-failure runs | Revert |
| → **G2** **Passed 2026-10-28** (GATE_G2.md): all four scheduled jobs opened and closed a failure issue; every key is a constant | | | | |

### Phase D: performance (benchmarks required before and after)

| PR | Scope | Files / systems | Acceptance criteria | Benchmark | Migration | Rollback |
|---|---|---|---|---|---|---|
| **PR-14** | R1-6: memoization fixes | `useTradeDismissals.ts`, `useSuggestedTrades.ts`, `RosterSection.tsx`, `LeagueBuddy.tsx:445`; pause the hidden Builder | Fewer renders and less compute per interaction | React profiler commit counts/time on the Overview; `scripts/bench/metrics.mjs` | — | Revert |
| **PR-15** **F** | R3-1: server league metrics | New `/api/league/[id]/metrics` built on `lib/league-metrics/*` (same modules as the client); `league_metrics:{league}:{format}:{week}` snapshot with input hashes; flag `NEXT_PUBLIC_SERVER_LEAGUE_METRICS` | Golden parity: server and client produce identical values for all fixtures. With the flag on, the dashboard reads the server values | First-load time and main-thread time before/after | Snapshot rows only | Turn the flag off |
| **PR-16** ⏸D4 | R3-2: Trade Market rebuild | `app/api/trade-market/route.ts` (no `allPlayers`, ids only, auth), materialized per league season, value on trade date | Payload under 1 MB; KPIs match the fixture | Payload size and time, before/after | Snapshot rows | Revert the route (old contract kept behind `?v=1`) |
| **PR-17** **M** | R3-3: incremental community ratings | `lib/community/*`; `community_ratings` table updated on each ballot write | Reads take constant time; ratings equal a batch recompute on the fixture | Request time vs ballot count | **M** new table | Readers fall back to the batch path |
| **PR-18** | R3-4: dashboard request consolidation | `useLeagueData.ts`, `useDraftOrder.ts`, `useStandingsOdds.ts` (shared SWR keys for league, state and matchups) | Fewer requests on first load | Request count and time to interactive | — | Revert |
| → **G3** **Passed 2026-10-29** (GATE_G3.md): every Phase D path measured before/after; goldens unchanged; PR-12 and PR-15b flags still off | | | | | | |

### Phase E: consolidation

| PR | Scope | Acceptance criteria |
|---|---|---|
| **PR-19** | R4-1: identity service; remove name joins (fixes the Malik Washington mismatch) | No KTC joins by display name remain |
| **PR-20** (= prospect plan P1) | R4-2: one prospect tier vocabulary; merge 11 cross-class duplicates; backfill 45 ESPN ids (**M** data migration with a backup table) | One tier function; 0 duplicate names |
| **PR-21** | R4-3: one Sleeper client (`SleeperClient`) | `api.sleeper.app` appears only in the client module |
| **PR-23** | R4-4/R4-5: `http.ts` and single-pass auth everywhere; remove dead code and legacy routes after reference checks | One error shape; dead modules gone |
| **PR-24** | R4-6: data-health dataset → feature map, job rows, "stale since" | data-health answers "what is stale, why, and what does it affect" |
| **PR-25** | G4 follow-up: one KTC day reader, one refresh-secret check, Sleeper cache profiles, Team Map demo by id, dead `trade-utils` exports | No visible number changes (GATE_G4.md) |
| → **G4** **Not passed 2026-10-29** (GATE_G4.md): PR-19 to PR-24 merged; 5 mechanical leftovers (PR-25) and 2 owner decisions (D6 Trade Market pick values, D7 community pool) remain | | |

## Deployment order

1. **Merge order:** PR-1 → PR-2 → PR-3 → PR-4 → PR-22 → (G1 phase) PR-5 → PR-6 → PR-7 → PR-8 → PR-9 → (G2) PR-10 → PR-11 → PR-12 → PR-13 → (G3) PR-14 → PR-15 → PR-16 → PR-17 → PR-18 → (G4) PR-19 → PR-20 → PR-21 → PR-23 → PR-24.
2. **Each PR** goes through a Vercel preview, then merge, then the production check recorded in the PR.
3. **Migrations** are applied to production *before* merging the code that depends on them. All migrations are additive, except PR-20 (a data fix, with a backup table) and PR-22 (policy removal, with a reverse script).
4. **Flags** (PR-12, PR-15) default off and are turned on per environment once parity is proven.

## Benchmark method

- **Functions:** `scripts/bench/metrics.mjs` runs each metric function on every fixture 50 times and reports the median and p95 in ms (Node `performance.now`).
- **Endpoints:** 10 sequential requests against the Vercel preview, reporting median and p95, warm and cold.
- **Client:** React profiler commit count and duration on the Overview for a fixed interaction script.
- **Reporting:** results go in the PR body as a before/after table. Nothing is claimed without these numbers.
