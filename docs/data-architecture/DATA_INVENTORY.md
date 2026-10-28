# Data inventory and metric lineage

This is a read-only audit of `main` at `dda85f9` (2026-10-28). Paths are relative to `firstballot/` unless they start with `.github/`, `docs/` or `scripts/`. Runtime facts were collected the same day from production `/api/data-health`, GitHub Actions run history and read-only catalog queries against Supabase project `aanoqbjauukcczrlnxka`.

Each claim carries one of these evidence labels:

| Label | Meaning |
|---|---|
| **[V] Verified** | Code path read and execution observed: run history, live data, or a DB catalog query |
| **[C] Code-supported** | Static reading only |
| **[S] Suspected** | Plausible; needs runtime confirmation |
| **[U] Unknown** | Not enough evidence |

---

## 1. Sources and stores

### External providers

| Provider | What we take | Client(s) | Evidence |
|---|---|---|---|
| **Sleeper** (`api.sleeper.app`) | NFL state, leagues, rosters, users, matchups, transactions, traded picks, drafts, players DB (~17 MB), projections | 5 implementations plus raw `fetch` in 21 files (see INFRASTRUCTURE_AUDIT) | `lib/sleeper-sdk/client.ts:41`, `lib/sleeper-api.ts:72`, `lib/nextjs-cache.ts:114`, `lib/platform/teams.ts:42`, `components/league-buddy/useLeagueData.ts:181-218` [V] |
| **ESPN fantasy** (`lm-api-reads`) | PPR season totals: 2018 to the current season | Raw fetch, 20 s timeout, no retry | `lib/platform/player-data.ts:24-61` [V] |
| **ESPN core** (`sports.core.api`) | NFL draft records (draft capital) | Raw fetch, errors swallowed | `app/api/dynasty-tiers/route.ts:72-85` [C] |
| **ESPN site** (`site.web.api`, `site.api`) | College athlete stats and search; NFL scoreboard | Python urllib with retry; browser fetch | `scripts/refresh-college-prospects.py:43-55`; `useLeagueData.ts:115` [C] |
| **KeepTradeCut** | Daily SF/1QB values | Scraped by the external, unpinned repo `cameron-eth/sleeper-sdk` | `.github/workflows/ktc-history.yml:14-23` [V] |
| **nflverse, FantasyFootballCalculator, dynastyprocess** | Weekly stats, rookie ADP, player ID crosswalk | `scripts/import-history-outcomes.py` | `:25-87` [C] |
| **Stripe** | Billing | SDK | `app/api/webhooks/stripe` [C] |

### Supabase tables in the data path

Row counts and catalog facts are [V] from catalog queries run 2026-10-28.

| Table / object | Rows | Written by | Read by | RLS | Notes |
|---|---|---|---|---|---|
| `ktc_player_values` | 106,012 | `scripts/sync-ktc-values.mjs` (daily, full-archive upsert) | `/api/ktc-values`, `/api/dynasty-tiers` POST, `/api/trade-market`, `/api/data-health` | **off** | 2026-03-22 → 10-28, 212 of 221 days present. Missing: 03-23..27, 05-26, 09-08..10 |
| `data_snapshots` | 10 keys (3.3 MB) | `lib/platform/snapshots.ts:46`, tier RPC, direct upserts (`dynasty-tiers/route.ts:89`, `refresh-college-prospects.py:220`) | Every snapshot reader | on | One row per key, no history |
| `dynasty_tier_publications` | 5 (all archived) | `publish_dynasty_tiers` RPC | none at runtime | on | Archive of tier snapshots |
| `ingestion_runs` | 175 | `snapshots.ts:48-59`, tier route | **nothing** | on | Success rows only; no start or running state |
| `dynasty_prospects` | 1,002 | Manual SQL (`sql/add_*`), college job PATCHes | `/api/prospects`, `/api/prospects/draftboard`, community store, data-health | **off** | 45 rows with no `espn_id`; 11 players listed in two draft classes; unique on (name, draft_year, position) |
| `historical_prospects` | 466 | Unknown | `/api/prospects?scope=history` [C] | **off** | |
| `dynasty_player_tiers` | 972 | **No writer in repo** [V grep] | Community candidate pool (`lib/community/store.ts:75`) | **off** | Separate from the tier snapshot; freshness [U] |
| `nfl_player_stats` | 17,577 | **No writer in repo** | `master_player_stats` matview | **off** | **Only season 2025** |
| `master_player_stats` (materialized view) | — | `refresh_master_player_stats()`; caller [U] | `/api/player-stats` (no UI consumer) | — | `games_played = count(distinct week)`, `team = max(team)` |
| `master_player_dataset`, `master_*`, `nfl_ngs_*` | 5.6k / 60 / ~8k | **No writer in repo** | Legacy routes (`/insights`, `/metrics`, `/charts`, `/stats-dashboard`) | on | Ingestion [U] |
| User tables (`user_profiles`, `user_draftboards`, `user_prospect_grades`, `user_prospect_notes`, `connected_teams`, `account_billing`, …) | small | Routes, with the user's RLS client | Same | on | |
| Storage bucket `community-ballots` | 1 object per ballot | `/api/community-rankings` POST | Both community routes read **every** object | — | `lib/community/store.ts:39-70` |
| Storage bucket `team-scenarios` | 1 per user plan | `/api/team-scenarios` PUT | Same route | — | |

> **Security finding [V]:** The `anon` role has SELECT/INSERT/UPDATE/DELETE/TRUNCATE on `ktc_player_values`, `dynasty_prospects`, `dynasty_player_tiers`, `historical_prospects` and `nfl_player_stats`, and RLS is disabled on all five. The anon key is public: `lib/supabase-config.ts:22` reads `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Anyone holding that key can rewrite or delete core valuation and prospect data through PostgREST. No write was attempted. See PERFORMANCE_ACCURACY P0-1.

### Repo-bundled datasets

These change only when a PR merges.

| File | Size | Produced by | Read by |
|---|---|---|---|
| `data/ktc-history.json` | 3.1 MB, 632 players × 190 dates | `scripts/import-ktc-history.py` (bot PR) | `/api/ktc-values` (fallback), `/api/data-health` (`.dates` only) |
| `data/history-outcomes.json` | 1.06 MB, 2,695 players, 2026 week 6 | `import-history-outcomes.py` (weekly bot PR, never run — see REFRESH_LIFECYCLE) | `/api/history-outcomes` |
| `data/nfl-player-identities.json` | 415 KB, 6,258 Sleeper→ESPN entries | Same | `lib/platform/player-data.ts:2`, `app/api/dynasty-tiers/route.ts:4` |
| `data/identity-quarantine.json` | — | Same | **nothing at runtime** |
| `lib/curated-prospects.ts` | 2028/2029 fallbacks | Hand-edited | `/api/prospects` |

### Snapshot keys

Every key in `data_snapshots`, with live state [V] at 2026-10-28 17:20 UTC.

| Key | TTL | Writer | State |
|---|---|---|---|
| `espn:ppr:{season}` | 900 s | `player-data.ts:101` | Current, refreshed hourly |
| `espn:ppr:2018…2025` | 30 d | `player-data.ts:57-67` | Expire 2026-11-27 |
| `sleeper:projections:{season}:{week\|season}` | 900 s / 6 h | `app/api/projections/route.ts:68-71` | `:8` and `:season` current; `:7` expired; **`:1` refetched 29 times today though the week is 8** [V], so something requests week 1 [S] |
| `sleeper:rosters:{league}` | 120 s | `lib/platform/api-service.ts:17` | Per API consumer |
| `dynasty:tiers:v1` | 30 h | Tier RPC (`dynasty-tiers/route.ts:129-137`) | Current, fetched 16:46 |
| `nfl:draft-capital:v1` | 5 y | Direct upsert (`dynasty-tiers/route.ts:89`), bypasses `snapshot()` | Not monitored |
| `prospects:{year}:espn` | 7 d | Direct REST upsert (`refresh-college-prospects.py:215`) | 2027/28/29 checked 00:46 |

---

## 2. Metric lineage matrix

**43** user-visible metrics, traced from UI → computation → storage → source.

The **Class** column uses this denominator for every percentage in the executive summary:

| Code | Meaning |
|---|---|
| P | Displayed value is persisted as-is |
| K | Cached precomputation or provider snapshot |
| S | Computed on demand, server side |
| C | Computed on demand, client side |
| X | External value shown live |

| # | Metric (where shown) | Source | Computation (where) | Storage | Refresh trigger | Class | Downstream / duplicates |
|---|---|---|---|---|---|---|---|
| 1 | Player KTC value (cards, roster, trades) | KTC | Joined **by name**, chunks of 50 (`useLeagueData.ts:574-618`); falls back to `rankToValue(search_rank)` (`lib/sleeper-sdk/values.ts:42-52`) | `ktc_player_values` | Daily job + 5 min CDN | P | Feeds 11–17, 28–30. **D:** trade market uses KTC/100 blended with a legacy 13k scale (`lib/trade-utils.ts:166-170`); 3 readers with different staleness rules |
| 2 | KTC 30-day delta, hot/cold badge | KTC | Tier build (`lib/dynasty-tiers.ts:131`); ±500 rule (`lib/player-signals.ts:37-41`) | Tier snapshot | Tier publish | K | **D:** `ktcTrendDelta` (history first→last, `useLeagueData.ts:613`), daily delta (`TradeIntelligencePanel.tsx:50-54`) |
| 3 | KTC history sparkline | KTC | — (`/api/ktc-values`) | `ktc_player_values` / bundled JSON | Daily | P | |
| 4 | Dynasty tier, score, rank, position rank | KTC + ESPN PPR + Sleeper + ESPN draft | Weighted mean of available inputs: market .65, production .18, ADP .08, age .06, draft .03 (`lib/dynasty-tiers.ts:62-101`) | `dynasty:tiers:v1` | KTC job + hourly repair | K | **D:** community pool reads `dynasty_player_tiers` (no writer) |
| 5 | Tier label ("Elite WR1", "Fringe RB") | from 4 | `describeTier` (`lib/player-signals.ts:22-35`) | — | Render | C | |
| 6 | Current-season FPPG and position rank | ESPN | `points/games`; rank among all players with ≥1 game (`lib/current-season-stats.ts:28-74`) | `espn:ppr:{season}` | Hourly + read-through (15 min) | K | **D:** `master_player_stats` (2025 only), NGS sum (`app/api/ngs-stats/player-fantasy-stats/route.ts:48-77`) |
| 7 | Career FPPG ("Career", "Since 2018") | ESPN | Σ points / Σ games over 2018…now (`player-data.ts:73-92`) | `espn:ppr:*` | Hourly + 30 d past seasons | K | Players with no current-season games are dropped before the join (`useLeagueData.ts:252`) |
| 8 | Weekly and season projections | Sleeper | Re-scored with league scoring (`lib/projections/scoring.ts:32-44`) | `sleeper:projections:*` | Hourly + read-through | K | **D:** `projectedPpg` (`LeagueBuddy.tsx:149`) vs `useProjections().ppg` |
| 9 | Projected this week (Overview) and its league rank | from 8 | Σ starters `?? 0` (`OverviewHeader.tsx:122-126`) | — | Render | C | **D:** `startSit.startersProjected` (`projections/startSit.ts:105`) |
| 10 | Lineup projection (My Team) | from 8 | Optimal start/sit (`startSit.ts`) | — | Render | C | |
| 11 | Dynasty rank (Overview) | from 1 | Linear Σ raw KTC over QB/RB/WR/TE, missing = 0 (`OverviewHeader.tsx:112-119`) | — | Render | C | **D: 6 definitions of team value** (11–14, placements, `calculateRawScore`) |
| 12 | Team value rank (My Team) | from 1 | Convex, depth-decayed, always SF (`lib/team-score.ts:29-56`) | — | Render, unmemoized | C | Same as 11 |
| 13 | Power score and category ranks | from 1 | Optimal lineup + 0.25 × bench (`values.ts:163-353`) | — | useMemo | C | Same as 11 |
| 14 | Team grade (A–D) | from 1 + 6 | 0.7 value + 0.3 production, then percentile (`team-score.ts:71-96`, `utils.ts:40-64`) | — | useMemo | C | Dead initial grade (`useLeagueData.ts:457`, overwritten at :662) |
| 15 | Production rank | Sleeper | Sort by integer `settings.fpts` (`RosterSection.tsx:123`) | — | Render | C | Draft order uses decimal matchup sums |
| 16 | Position-group rank (Roster overview) | from 1 | Top QB1/RB2/WR2/TE2, always SF, ties broken by index (`utils.ts:142-204`) | — | useMemo | C | **D:** power `categoryRanks` use real slots and shared ranks |
| 17 | Franchise state (header badge, Outlook) | from 1 + ages | Now = team value min–max; Future = −core age; split at medians (`competitiveState.ts:192-258`) | — | useMemo, gated on values | C | **D:** recomputed in `tradeSignals` with a different in-season rule (`trade-signals.ts:89`) |
| 18 | Core age (header) | Sleeper ages | Mean age of top 12 by value (`competitiveState.ts:164`) | — | useMemo | C | **D:** "Average age" on My Team = all skill players (`RosterSection.tsx:198`) |
| 19 | Record and standings order (header "#10 of 12", tables) | Sleeper | `recordOrder` (`utils.ts:377`) | — | Render | C | **D: 5 orderings** (`sortedTeams`, playoff-odds wins-only, placements, draft record) |
| 20 | Points for/against and vs average | Sleeper | Integer `fpts` shown `.toFixed(1)` | — | Render | C | `fpts_decimal` never read |
| 21 | Playoff odds | Sleeper + sim | 10,000-run Monte Carlo, unseeded (`utils/playoffOdds.ts:28-272`) | — | useMemo per mount | C | Preseason NaN bug (P0-3) |
| 22 | Max PF | Sleeper matchups | Exact optimal lineup per week (`draft-order/maxPointsFor.ts:116-245`) | — | On load | C | |
| 23 | Projected Max PF | 22 + 8 | Realized + remaining × calibrated per-week (`projectedMaxPointsFor.ts:65-113`) | — | useMemo | C | |
| 24 | Draft order and pick slots (1.03, slot by Max PF) | 19, 22, 23 | `buildDraftOrder` (`draftOrderBoard.ts:83-163`) | — | Render | C | **D: 5 call sites with different metrics and gates**; two functions named `pickLabel` |
| 25 | Pick ownership | Sleeper | `pickInventory` (`lib/sleeper-sdk/pick-inventory.ts`) via `/api/trade-inventory` (no-store) | — | Per request | S | **D:** `/api/draft-capital` computes the same thing; no consumer since PR #78 |
| 26 | Draft capital by year (header, Picks) | 25 | `picksByYear` (`lib/picks-overview.ts`) via shared `usePickCapital` | — | Render | C | Single implementation |
| 27 | League pick ownership table | 25 | `leagueCapital` | — | Render | C | |
| 28 | Trade suggestions | 1 + rosters | `suggestedTeamTrades` (`trade-opportunities.ts:55-109`) | — | Every render (P1) | C | Shared hook (My Team + Overview) |
| 29 | "Consider trading" signal on cards | 4 + 17 | `tradeSignals` (`trade-signals.ts:88-172`) | — | useMemo | C | **D:** sell rule conflicts with 30 |
| 30 | Market signals (sell / hold / buy) | 1 (SF) + 6 | P/E vs positional medians + daily move (`TradeIntelligencePanel.tsx:19-126`) | — | Render | C | Same as 29 |
| 31 | Live matchup score | Sleeper | — | — | 15 min poll | X | |
| 32 | League activity feed | Sleeper transactions | Formatting only | — | 15 min poll | X | |
| 33 | Prospect grade and tier label | Manual / ETL | Stored label returned as-is; grade cutoffs used only when the label is blank (`lib/scouting-grade-tier.ts:39-59`) | `dynasty_prospects` | Manual | P | **D: 4 prospect tier systems** (see PERFORMANCE_ACCURACY A-4) |
| 34 | Prospect positional and overall rank | 33 | `deriveRanks` (`app/api/prospects/route.ts:129-163`) | — | Per request | S | **D:** legacy draftboard ranks by grade across all classes |
| 35 | Prospect college stats | ESPN college | Season totals (`refresh-college-prospects.py:135-139`) | `dynasty_prospects.college_stats` | Mon/Wed/Fri job | P | |
| 36 | Crowd rank / community top 30 | Ballots | Bradley–Terry, 150 iterations over **all** ballots (`lib/community/rating.ts:26-66`) | — | Per request | S | Cost grows linearly with ballots |
| 37 | Community 7-day trend | Ballots | Replays ballots ×7 (`lib/community/trends.ts:34-46`) | — | Per request (max-age 300) | S | |
| 38 | Career outcome bars (History) | nflverse + FFC | `careerOutcome` over bundled JSON (`lib/history-outcomes.ts:55-97`) | Repo file | Merged PR only | S | 56 `espnId:"NA"` rows collide; 2 known ID conflicts not excluded |
| 39 | Hits/misses rates | 33 + 38 | `lib/hits-misses.ts` | — | Render | C | Join on `${espn_id}:${draft_year}` (null id → `"null:2020"`) |
| 40 | Trade Market KPIs (gained, lost, win %, grade) | Sleeper + KTC + tiers | `computeTradeAnalytics` (`components/trade-market/analytics.ts:16-330`) | — | Every page load | C | Today's values applied to past trades; synthetic pick scale |
| 41 | Rankings page tiers and score | 4 | Reshape (`app/api/rankings/route.ts`) | `dynasty:tiers:v1` (key hard-coded) | Tier publish | K | |
| 42 | Landing demo values | 4 | Lookup by `full_name`; hard-coded fallback values (`TeamMapPreview.tsx:39-54, 329`) | Tier snapshot | SWR | K | |
| 43 | Data health status | Snapshots + KTC + prospects | `/api/data-health` | — | Per request | S | Falls back to the bundled KTC date if the DB errors |

**Counts by class (denominator 43):**

| Class | Metrics | Share |
|---|---|---|
| P, persisted | 1, 3, 33, 35 | 4 (9%) |
| K, cached precomputation | 2, 4, 6, 7, 8, 41, 42 | 7 (16%) |
| S, server on demand | 25, 34, 36, 37, 38, 43 | 6 (14%) |
| C, client on demand | 5, 9–24, 26–30, 39, 40 | 24 (56%) |
| X, external live | 31, 32 | 2 (5%) |

**Metrics with a competing definition or duplicate implementation (marked D):** 1, 2, 4, 6, 8, 9, 11, 12, 13, 14, 16, 17, 18, 19, 24, 25, 29, 30, 33, 34. That is **20 of 43 (47%)**. Four of them (11–14) are one concept, team value, with six definitions.
