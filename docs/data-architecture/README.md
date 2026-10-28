# Data architecture audit — executive summary

**Scope:** read-only audit of `main` at `dda85f9`, done 2026-10-28.

**Method:**
- Traced code paths across 46 API routes, the dashboard client, 4 workflows and the ingestion scripts.
- Checked runtime evidence: GitHub Actions run history, production `/api/data-health`, and read-only Supabase catalog and data queries.

**What was not done:** no application code or schema was modified, nothing was profiled, and no query plans were captured.

**Limit on job history:** run history before 2026-10-26 was lost when `main` was rewritten.

**Evidence labels** used in every document:

| Label | Meaning |
|---|---|
| [V] Verified | Code read and execution observed |
| [C] Code-supported | Static reading only |
| [S] Suspected | Plausible, needs runtime confirmation |
| [U] Unknown | Not enough evidence |

**Documents:**

| Document | Contents |
|---|---|
| [DATA_INVENTORY.md](DATA_INVENTORY.md) | Sources, stores, snapshot keys, and the **metric lineage matrix** (43 metrics) |
| [COMPUTATION_AUDIT.md](COMPUTATION_AUDIT.md) | Where each metric is computed, duplicates, what to materialize |
| [REFRESH_LIFECYCLE.md](REFRESH_LIFECYCLE.md) | Jobs, observed vs configured frequency, dependency graph, invalidation |
| [INFRASTRUCTURE_AUDIT.md](INFRASTRUCTURE_AUDIT.md) | Shared vs duplicated systems, reuse matrix |
| [PERFORMANCE_ACCURACY.md](PERFORMANCE_ACCURACY.md) | Prioritized findings, cross-page consistency, observability |
| [TARGET_ARCHITECTURE.md](TARGET_ARCHITECTURE.md) | Proposed architecture and ADRs |
| [REMEDIATION_PLAN.md](REMEDIATION_PLAN.md) | Roadmap with severity, dependencies and validation |
| [PR_SEQUENCE.md](PR_SEQUENCE.md) | Phase 2: dependency-aware PR sequence, completion gates, decisions D1–D4 |
| [RUNTIME_EVIDENCE.md](RUNTIME_EVIDENCE.md) | Raw job history, data-health and catalog query results behind the [V] labels |

---

## Answers

### 1. How are metrics stored?

Denominator: the 43 user-visible metrics in the lineage matrix.

| How it's produced | Count | Share |
|---|---|---|
| Persisted as displayed | 4 | 9% |
| Cached precomputation or provider snapshot | 7 | 16% |
| Computed on demand on the server | 6 | 14% |
| Computed on demand in the client | 24 | 56% |
| External value shown live | 2 | 5% |

In total, **70% (30/43)** of metrics are computed on demand.

### 2. Server vs client computation

Of the 37 computed metrics, **13 (35%) are computed on the server and 24 (65%) in the browser**.

Every league-level number is computed client-side from raw Sleeper data: team value, grades, ranks, franchise state, playoff odds, draft order and the trade engines.

### 3. Shared vs duplicated infrastructure

Of 19 infrastructure systems classified:

| Class | Meaning | Count |
|---|---|---|
| A | Shared and adopted | 3 |
| B | Shared but bypassed | 3 |
| C | One-off | 6 |
| D | Duplicated | 7 |

The worst duplications:
- 5 Sleeper client implementations, plus raw fetch in 21 files.
- 4 identity-resolution approaches.
- 9 auth mechanisms.
- 7 cache layers.
- 28 of 46 routes use ad-hoc response handling.

### 4. Inconsistent definitions

**20 of 43 metrics (47%)** have a competing definition or a duplicate implementation. The most consequential:

- **Team dynasty value:** 6 definitions. Overview, My Team, Outlook and Power rankings can rank the same team differently.
- **Superflex:** 4 rules plus 3 hard-coded ones, so 1QB leagues get superflex values.
- **Standings order:** 5 orderings.
- **Draft slots:** 5 call sites using 3 bases.
- **Position-group rank:** 3 variants.
- **Prospect tiers:** 4 vocabularies.
- **Core age:** 2 definitions.
- **Sell signal:** 2 rules.

### 5. Most vulnerable to staleness

1. **History outcomes and the player identity map.** The weekly job has never run, and its output needs a manual PR merge [V].
2. **College prospect stats.** The job has not run on schedule, and the class years are hard-coded so it breaks at the 2027 rollover [V].
3. **KTC values.** The daily job starts about 6 hours late, has no failure alert, and 9 days are missing from the archive [V].
4. **The `master_*`, `nfl_*` and `dynasty_player_tiers` tables.** Nothing in the repo writes them; `nfl_player_stats` contains only 2025 [V].
5. **Dynasty tiers.** The production input lags ESPN by up to about 26 hours [C].

### 6. Five biggest performance costs

These are code-supported estimates; none was profiled.

1. **Trade Market:** about 200 Sleeper calls per page load, plus the full 17 MB player database in the response.
2. **Playoff odds:** a 10,000-run Monte Carlo on the main thread, re-run every time the tab mounts.
3. **Community rankings:** every request reads every ballot and refits the ratings.
4. **Dashboard request waterfall:** 3 dependent waves, with duplicate league and matchup fetches.
5. **Trade suggestions:** recomputed on every render.

### 7. Five biggest accuracy risks

1. **Anonymous write access** to KTC, prospect and tier tables [V]. This is a security issue and an integrity issue.
2. **Preseason playoff odds** come out 100% or 0% in roster order [C].
3. **Team value disagrees across pages,** and superflex values are applied to 1QB leagues [V].
4. **Missing values become extremes:** unknown ages score as youngest, missing Max PF sorts to the 1.01, missing KTC counts as 0 [V/C].
5. **Name-based identity joins** mis-assign values (the Malik Washington QB/WR case). There are also 11 cross-class duplicate prospects and 45 prospects with no ESPN id [V].

### 8. What to materialize

Materialize these, keyed by league and week, using input hashes to invalidate:
- League metrics: team value, rank, grade, franchise state and position ranks.
- Playoff odds, seeded.
- Max PF and draft order.
- Trade Market analytics; past seasons never change.
- Community ratings, updated incrementally as ballots arrive.

Leave these dynamic:
- Trade suggestions, because they depend on personal state.
- Tier labels and formatting.

### 9. What to make canonical

| Area | Canonical choice |
|---|---|
| Caching | `lib/platform/snapshots.ts` |
| Responses | `lib/platform/http.ts` |
| Auth | `lib/platform/auth.ts` |
| Sleeper client | `SleeperClient`, which already retries and times out |
| Player identity | `data/nfl-player-identities.json`, promoted to an identity module |
| Tier model | `lib/dynasty-tiers.ts` with the `publish_dynasty_tiers` RPC |
| Team value | `teamValueScore` |
| Standings order | `recordOrder` |
| Shared hooks | `usePickCapital` and `useSuggestedTrades` |

### 10. Ten highest-impact improvements, in priority order

1. **R0-1:** turn on row-level security and revoke anonymous write grants on the 5 core tables.
2. **R0-2:** fix preseason playoff odds and seed the simulation.
3. **R0-3:** unfreeze the college refresh and remove the hard-coded class years.
4. **R2-1:** add alerting and run logging to every ingestion job.
5. **R1-1:** a single `LeagueContext` and one superflex rule.
6. **R1-2:** one team-value definition used on every surface.
7. **R2-4:** load identity and history outcomes at runtime instead of through merged PRs.
8. **R3-2:** rebuild the Trade Market so its data is materialized, it stops sending 17 MB, and it values trades as of the trade date.
9. **R3-1:** a server-side league metrics snapshot.
10. **R1-3, R1-5:** one draft-slot policy and null-safe metric inputs.

---

## Confirmed problems vs potential risks

**Confirmed [V]:**
- anonymous write grants;
- jobs that have never run, or run about 6 hours late;
- 9 missing KTC days;
- duplicate prospect rows;
- 2025-only stats tables;
- the hard-coded tier key;
- the 6 team-value definitions and 4 superflex rules;
- Trade Market sending the full players payload;
- the history outcomes file containing `"NA"` and colliding ids.

**Code-supported, not observed:**
- preseason odds bug;
- partial-sync tiers;
- snapshot stampede;
- unbounded reads being truncated;
- CPU costs.

**Suspected:**
- the source of the week-1 projection requests;
- `dynasty_player_tiers` drifting from the published snapshot;
- NGS FPPG double counting.

**Unknown:**
- ingestion for the `master_*` and `nfl_ngs_*` tables;
- job history before 2026-10-26.
