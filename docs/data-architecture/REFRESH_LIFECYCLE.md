# Refresh lifecycle

Evidence labels: [V] verified, [C] code-supported, [S] suspected, [U] unknown.

Run history is from the GitHub Actions API on 2026-10-28. `main` was force-rewritten on 2026-10-26, so **history before then is unavailable [U]**.

## 1. Every refresh mechanism

There are **no Vercel crons and no pg_cron** (no `vercel.json`, no `pg_cron` in migrations) [V]. All scheduled work runs in GitHub Actions.

| Data | Mechanism | Configured | **Observed execution** | Failure handling | Staleness risk |
|---|---|---|---|---|---|
| ESPN current-season PPR (`espn:ppr:2026`) | `data-health.yml` → `POST /api/internal/refresh-data`, plus read-through | `17 * * * *` | 33 runs since 10-26 (31 success, 2 skipped). Starts drift to :20–:46. 4–7 h gaps on 10-26/27; hourly since 10-27 18:42 [V] | Workflow fails and opens/closes a "Data freshness incident" issue | Low |
| ESPN past seasons 2018–2025 | Same call (since PR #79) | 30-day TTL | Fetched 10-28 16:34, expire 11-27 [V] | Career badges hide; workflow fails on `careerSeasons` null | Low |
| Sleeper projections (season, current week) | Same workflow, GET `/api/projections`, plus read-through | Hourly; TTL 15 min / 6 h | Current [V] | Issue | Low |
| Dynasty tiers (`dynasty:tiers:v1`) | `ktc-history.yml` POST, plus hourly repair in `data-health.yml` when older than 26 h or behind KTC | Daily 10:30 | Last publish 10-28 16:46; 7 successful publish runs logged [V] | `--retry 3`, then issue (health workflow only) | Low |
| KTC values (`ktc_player_values`) | `ktc-history.yml`: external scrape → import → **full-archive upsert** (95k rows) | `30 10 * * *` | **Scheduled runs start 5.5–6.3 h late** (16:52, 15:57, 16:45). 1 failure on 10-26 [V]. 9 missing days in the archive [V] | **No alert**; data-health catches it after 48 h | Medium |
| College prospect stats | `college-prospects.yml` | `45 11 * * 1,3,5` | **Only 1 run ever (manual, 10-26). No scheduled run on Wed 10-28 as of 17:20 UTC** [V] | **No alert** | High (hard-coded years too) |
| History outcomes and player identities (`data/*.json`) | `history-outcomes.yml` opens a PR | `20 12 * * 3` | **Never run** [V]. Bundled file is from 2026 week 6 [V] | **No alert**; output needs a human merge | High |
| NFL draft capital (`nfl:draft-capital:v1`) | Side effect of the tier POST | 5-year TTL | Not monitored [V] | Errors swallowed | Low |
| Sleeper players DB | Per-instance memory, 6 h | On request | — | — | Medium (instance-dependent) [C] |
| League data on the dashboard | Client SWR | 15 min poll + focus | — | Mostly swallowed into `[]` | Low |
| Trade Market | On request, `no-store` | Every load | — | 500 | n/a (always live, always slow) |
| Community ratings | On request; 60 s memo | Every request | — | 503 if any ballot is malformed | n/a |
| `master_player_stats`, `master_*`, `nfl_ngs_*` | **Unknown**: no writer or scheduler in repo | — | `nfl_player_stats` holds only 2025 [V] | — | High (legacy only) |

**Configured vs verified frequency:**
- GitHub's scheduler delays and drops runs. The observed hourly cadence only became regular on 10-27, and the daily KTC job runs about 6 h after its configured time [V].
- Two of the four scheduled workflows have **never executed on schedule** in the visible history [V].

## 2. Answers

1. **What refreshes automatically?**
   - ESPN PPR (current and past), Sleeper projections and the dynasty tiers repair (hourly).
   - KTC values and the tier publish (daily, late).
   - College stats are configured for Mon/Wed/Fri but have not run on schedule.
2. **What refreshes only on visit?**
   - Every league-level metric (computed in the browser).
   - Trade Market, community ratings, prospect ranks, pick ownership and rosters.
   - Any snapshot that expires between workflow runs (`lib/platform/snapshots.ts:28-30`).
3. **What needs manual intervention?**
   - Merging the history-outcomes and identities PRs, and the KTC bundled-archive PR.
   - Prospect grades and tiers (SQL scripts).
   - Rolling the hard-coded prospect class years (`scripts/refresh-college-prospects.py:22`, `.github/workflows/college-prospects.yml:25-26`, `Math.max(2027, …)` in 5 places).
4. **What updates after a provider change?**
   - Nothing is event-driven. Everything waits for a TTL or a cron. No webhooks exist for Sleeper, KTC or ESPN [V].
5. **What happens when a job fails?**
   - Only `data-health.yml` alerts. KTC, college and history jobs fail silently [V].
   - Snapshots use strict expiry, so an expired dataset whose refresh fails returns **503**; stale data is never served (`snapshots.ts:14,53-64`) [C].
6. **Can overlapping jobs corrupt data?**
   - The tier publish uses an advisory lock and a newer-wins guard (`supabase/migrations/20261026_tier_publication.sql:38-44`) [C], and the KTC upsert is idempotent on `(ktc_player_id, scraped_date)` [V].
   - `snapshot()` has **no lock**. Concurrent misses all call the provider, and the last write wins (stampede, not corruption) [C].
   - The workflows have no `concurrency:` blocks [V].
7. **Are retries safe?**
   - Yes for the KTC upsert and the tier publish.
   - The college PATCHes are per-row overwrites, so they are safe but not atomic [C].
8. **Can users see partially updated data?** Yes:
   - **KTC sync:** 500-row batches, ordered player-first, not transactional (`scripts/sync-ktc-values.mjs:7-12`). A mid-run failure leaves the latest date partly filled, and the tier build's checks (≥250 rows) can pass on that partial date [C].
   - **College job:** writes ESPN IDs before its coverage gate, and the snapshot last [C].
9. **Are dependent computations refreshed in order?**
   - Partly. KTC → tiers is ordered inside `ktc-history.yml`.
   - Tiers → client team values are not: the client recomputes on its next 15-min poll with no version signal.
   - ESPN PPR → tiers (production input) only reaches tiers on the next tier publish (up to ~26 h) [C].

## 3. Dependency graph and breaks

```
KTC (external sleeper-sdk scrape, unpinned)
  → ktc_player_values (daily, ~6h late, 9 missing days)
      ├→ dynasty:tiers:v1 ← espn:ppr:{season} ← ESPN  (tier publish: daily + hourly repair)
      │    ├→ /api/rankings, landing demo, trade-market tiers
      │    └→ client: tier labels, hot/cold, trade signals
      ├→ /api/ktc-values → client KTC join (BY NAME)
      │    → team value ×6 definitions → grade, power, placements, franchise state, core age
      │         → trade suggestions, trade signals, market signals
      └→ /api/trade-market (no freshness check) → client trade KPIs
ESPN PPR → espn:ppr:* → roster-stats (FPPG, career FPPG) → team grade (production 30%)
Sleeper → rosters / matchups / transactions → standings, Max PF, draft order, playoff odds (all client)
Sleeper → traded_picks → /api/trade-inventory → pick ownership → draft capital, pick slots
dynastyprocess → data/nfl-player-identities.json  (PR merge)  → ESPN mapping for FPPG and tiers
nflverse + FFC → data/history-outcomes.json        (PR merge)  → History, Hits & misses
ESPN college → dynasty_prospects.college_stats (job not running on schedule) → Scouting
dynasty_player_tiers (no writer) → community candidate pool
```

**Where the chain breaks:**

| # | Break | Evidence |
|---|---|---|
| B1 | The identity map and history outcomes need a human PR merge; the job that produces them has never run | `.github/workflows/history-outcomes.yml`; run history [V] |
| B2 | No signal tells clients a new tier or KTC version exists, so team metrics update only on the next poll or a reload | `useLeagueData.ts:637` [C] |
| B3 | Tier production inputs can lag ESPN by up to ~26 h | `data-health.yml:83-87` [C] |
| B4 | The community pool reads a table with no writer | `lib/community/store.ts:75` [V] |
| B5 | Trade Market reads KTC with no freshness budget, while other readers enforce 48 h | `app/api/trade-market/route.ts:90-106` vs `app/api/ktc-values/route.ts:67` [C] |
| B6 | If a past ESPN season fails, career FPPG hides until the next hourly run (by design) | `lib/platform/player-data.ts` [V] |

## 4. Invalidation rules today

| Store | Invalidation |
|---|---|
| `data_snapshots` | TTL only; the version lives in the key name |
| `ktc_player_values` | Append by date; never invalidated |
| Next fetch cache | Per-call `revalidate`; tags exist (`lib/nextjs-cache.ts:209-255`) but `revalidateCache` is never called |
| CDN | `s-maxage` 300 s on most public reads |
| Browser | SWR `dedupingInterval`, plus the manual Refresh button, which bumps a URL version (`lib/cache-version.ts`) |
| Per-instance memory | Players DB 6 h; community ballots 60 s |
| Repo JSON | Merge only |
| Tier key version | `DYNASTY_TIER_VERSION` is used by the writer, but `rankings`, `trade-market` and `data-health` hard-code `v1`, so a version bump breaks them [V] |

## 5. Freshness guarantees

| Dataset | Guarantee today | Monitored |
|---|---|---|
| ESPN PPR current | ≤ 15 min after a successful hourly run, else 503 | Yes |
| ESPN past seasons | ≤ 30 d | Yes (since #79) |
| Projections | ≤ 15 min / 6 h | Yes |
| Tiers | ≤ 30 h (repair at 26 h) | Yes |
| KTC | Enforced ≤ 48 h by `/api/ktc-values` and tiers; not by Trade Market | Yes (48 h) |
| College stats | None | Counts only, and the check switches off when season ≥ 2027 (`data-health.yml:120`) |
| History outcomes / identities | None | No |
| Draft capital, rosters, `master_*` | None | No |
