# Target architecture

**Principle:** consolidate what exists. The platform layer (`lib/platform/*`: snapshots, http, auth, player-data) and the tier publish pipeline are already the right shape, so the target extends them rather than adding services.

Nothing here needs new infrastructure beyond what's already running: Supabase, Vercel functions and GitHub Actions.

## Shape

```
Providers (Sleeper, ESPN, KTC, nflverse)
  → lib/platform/providers/*        one adapter per provider: timeout, retry, schema check
  → lib/platform/identity            Sleeper id ↔ ESPN / KTC / GSIS, quarantine applied
  → data_snapshots + tables          versioned keys, ingestion_runs with start/end/status
  → lib/metrics/*                    one definition per metric, pure, versioned, tested
  → league_metrics snapshots         per league + format + week, materialized on the server
  → /api/league/{id}/metrics         one read, CDN-cacheable per league
  → UI                               display only (labels, formatting)
```

## Proposals

Each proposal says whether it's needed, what it fixes, who adopts it, and what it costs.

### 1. Canonical identity layer — **Yes**

- **Problem:** 4 resolution approaches, 3 name normalizers, name joins for KTC, and an unread quarantine file.
- **Solution:** `lib/platform/identity.ts` wraps `nfl-player-identities.json`, Sleeper `espn_id` and the quarantine list. KTC↔Sleeper ids are resolved once at tier publish and stored in the tier snapshot.
- **Adopters:** tiers, ktc-values, roster-stats, trade-market, rankings, scouting KTC.
- **Benefit:** removes name-collision errors (A-1, P2-2).
- **Complexity:** Medium. **Overhead:** none new.

### 2. Provider adapters — **Yes**

- **Problem:** 5 Sleeper clients and 4 ad-hoc ESPN calls, with inconsistent timeouts and retries.
- **Solution:** make `SleeperClient` canonical. Add `espnFantasy`, `espnCore` and `espnCollege` adapters with the same retry/timeout policy.
- **Adopters:** 21 files.
- **Benefit:** consistent failure behavior and fewer hangs.
- **Complexity:** Medium (mechanical).

### 3. Shared ingestion — **Partially**

- **Already in place:** `snapshot()` and the tier RPC.
- **Add:**
  - Route the 2 direct-upsert writers through it.
  - Give `ingestion_runs` `started_at`/`status` and log every job (KTC sync, college, history).
- **Not needed:** a separate pipeline service.
- **Complexity:** Low.

### 4. Versioned metric registry — **Yes, lightweight**

- **Problem:** 20 of 43 metrics duplicated.
- **Solution:** `lib/metrics/index.ts` exports each metric as `{ id, version, compute(ctx) }`, with `LeagueContext { superflex, slots, scoring, season, week }` resolved once.
- **Rule:** the UI imports metrics only from here.
- **Benefit:** one definition per metric (P1-1, P1-2, P1-3).
- **Complexity:** Medium to high (touches the dashboard). **Overhead:** none.
- **Not needed:** a database-backed registry. Code plus a version string is enough at this scale.

### 5. Server computation layer — **Yes, for league metrics**

- **Move server-side:** team value, grades, ranks, franchise state, playoff odds (seeded), Max PF/draft order and Trade Market analytics.
- **Keep on the client:** trade suggestions (personal state) and presentation.
- **Benefit:** removes PF-1, PF-4, PF-5 and PF-9 from the browser; makes values deterministic and identical across pages.
- **Complexity:** High.
- **Existing support:** Vercel functions plus snapshots.

### 6. Dependency-aware refresh — **Minimal**

- **Problem:** nothing tells downstream data when upstream changes.
- **Solution:**
  - Store `inputs: { ktcDate, tierHash, espnFetchedAt }` on each `league_metrics` snapshot.
  - Readers rebuild when any input is newer (lazy, keyed by input hashes). No orchestrator.
  - In the KTC workflow: sync → tiers → warm league metrics for active leagues.
- **Complexity:** Medium.

### 7. Materialized snapshots — **Yes**

- **What to materialize:**
  - `league_metrics:{league}:{format}:{week}`.
  - `league_odds:{league}:{week}` (seeded, rebuilt when a week completes).
  - `trade_market:{league}:{season}` (past seasons immutable).
  - `community_ratings` (updated incrementally per ballot).
- **Storage:** existing `data_snapshots` or a small table.
- **Complexity:** Medium.

### 8. Cache infrastructure — **Consolidate, don't add**

- **Keep:** snapshots, CDN headers and SWR.
- **Remove:** dead `cache-config` / `api-cache` modules and the unused Next tag helpers (or adopt them).
- **Add:** a stale-while-error option to `snapshot()`: serve the expired payload with `stale: true` when the provider fails.
- **Complexity:** Low.

### 9. Shared data-access services — **Small**

- **Add:** `latestKtc(budget)`, `tierSnapshot()` and `prospects(query)` in `lib/platform`.
- **Not needed:** a repository layer or ORM.
- **Complexity:** Low.

### 10. Freshness monitoring — **Extend existing**

- **Extend data-health with:**
  - Every snapshot key and job (from `ingestion_runs`).
  - A dataset → feature map.
  - "Stale since" and "last error" per dataset.
- **Workflows:** add an alert step to every workflow.
- **Not needed:** a metrics vendor. GitHub issues plus `/api/data-health` are enough now.
- **Complexity:** Low.

## Architectural decision records

| ADR | Decision | Rationale | Trade-off |
|---|---|---|---|
| ADR-1 | Snapshots stay the cache of record | Already validated, versioned by key, monitored | Rows are large JSONB; mitigate with per-instance memo and narrower `select` |
| ADR-2 | League metrics are computed server-side and materialized per league + week | Determinism and cross-page consistency; mobile CPU | Server cost per league; mitigated by input-hash reuse |
| ADR-3 | Identity is resolved at ingest, never by display name at read time | Removes the collision class of bugs | Requires a backfill of KTC↔Sleeper ids |
| ADR-4 | Stale-while-error for read-mostly snapshots, flagged in responses | Availability during provider outages | Users may see data up to one TTL old; must be labelled |
| ADR-5 | No new services (queues, Redis, orchestrators) | Current scale doesn't need them | Revisit if leagues × refresh frequency outgrows function time limits |
| ADR-6 | RLS on every public table; only service-role writers | Closes P0-1 | Writers must use the service key (they already do) |
