# Infrastructure audit: shared vs one-off

Classes used throughout:

| Class | Meaning |
|---|---|
| **A** | Shared and consistently adopted |
| **B** | Shared implementation exists but is bypassed |
| **C** | One-off |
| **D** | Competing duplicate implementations |

> **Status at G4 (2026-10-29):** see GATE_G4.md for where each class-D row stands after Phase E. This document records the state on 2026-10-28 and is kept as written.

Counts come from grep over `firstballot/app`, `lib`, `components` and `hooks` on 2026-10-28. There are 46 API route files. Evidence labels: [V] verified, [C] code-supported, [S] suspected, [U] unknown.

## 1. Classification

| System | Class | Count / evidence |
|---|---|---|
| **Sleeper API client** | **D** | 5 implementations: `SleeperClient` (`lib/sleeper-sdk/client.ts:41`, retry + timeout, 1 route uses it), `SleeperAPI` (`lib/sleeper-api.ts:72`, type-only, dead at runtime), `sleeperApi.cachedFetch` (`lib/nextjs-cache.ts:114`, no retry, hard-codes 2025 at :176), `sleeperRead` (`lib/platform/teams.ts:42`), and raw `fetch`. `api.sleeper.app` appears in 21 files [V] |
| **ESPN clients** | **C** | 4 endpoints, each with its own raw fetch, timeout and validation (`player-data.ts`, `dynasty-tiers/route.ts:72`, college script, `useLeagueData.ts`) [V] |
| **KTC access** | **D** | 4 copies of the "latest scraped_date" query (`dynasty-tiers:21`, `ktc-values:37`, `trade-market:90`, `data-health:30`) and 2 freshness rules (48 h vs none) [V] |
| **Snapshot cache** (`lib/platform/snapshots.ts`) | **B** | Used by 7 key families. Bypassed by direct upserts for `nfl:draft-capital:v1` (`dynasty-tiers/route.ts:89`) and `prospects:*` (Python), which skip the ingestion log [V] |
| **Caching layers** | **D** | 7: Supabase snapshots, Next fetch cache (16 presets in `lib/nextjs-cache.ts`, plus ad-hoc `revalidate` in 9 files), per-instance memory, CDN `Cache-Control`, URL cache version, SWR, bundled JSON [V]. Dead: `lib/cache-config.ts`, `lib/api-cache.ts` (0 importers) [V] |
| **Cache-key generation** | **C** | Snapshot keys are string literals. `dynasty:tiers:v1` is hard-coded in 3 readers while the writer uses `DYNASTY_TIER_VERSION` [V] |
| **Refresh scheduling** | **C** | 4 GitHub workflows, each with its own curl/secret/alert pattern; only 1 alerts [V] |
| **Ingestion logging** | **B** | `ingestion_runs` is written by `snapshot()` and the tier route only; nothing reads it; KTC, college and history jobs don't log [V] |
| **Player identity resolution** | **D** | 4 approaches: Sleeper→ESPN via bundled file (`player-data.ts:111`); Sleeper `espn_id` first, then file (`dynasty-tiers:68,98,120`); name-based KTC joins (3 variants); GSIS ids with no Sleeper→GSIS map. Plus 3 name normalizers and an unread `identity-quarantine.json` [V] |
| **Auth** | **D** | 9 mechanisms. JWT is verified 2× on every `webAccount` route and 3× on Sleeper trade/lineup and team-scenarios PUT. `DATA_REFRESH_SECRET` check is copy-pasted (`dynasty-tiers:145`, `internal/refresh-data:6`) [V] |
| **Response formatting / errors** | **B** | 15 of 46 routes use `lib/platform/http.ts`, 3 mix, 28 are ad hoc. At least 8 error shapes. Raw error text is leaked at `user-profile:119,210` and `projections:149` [V] |
| **Retry logic** | **C** | Only `SleeperClient` and the college script retry; ESPN and most Sleeper calls don't [V] |
| **Data validation** | **C** | Ad-hoc coverage checks (ESPN 100 ≤ n < 3000, KTC ≥ 100 rows, tiers ≥ 250, college ≥ 95%); no schema validation of provider payloads [V] |
| **DB access** | **C** | Direct Supabase calls in routes; no data-access layer; 3 different clients (anon, service role, user RLS) [C] |
| **Metric calculations** | **D** | See COMPUTATION_AUDIT §2: 20 of 43 metrics duplicated [V] |
| **Ranking algorithms** | **D** | 5 standings orderings; 3 position-rank variants; 2 prospect rank derivations [V] |
| **Shared UI data hooks** | **A** (recent) | `usePickCapital` (3 consumers), `useSuggestedTrades` (2), `recordOrder` (2), from PRs #77–78 [V] |
| **Tier model** | **A** | `lib/dynasty-tiers.ts` + `publish_dynasty_tiers` RPC is the one producer of pro tiers [V] |
| **ESPN season snapshots** | **A** | `espnSeason()` in `player-data.ts` (since #79) [V] |

**Totals across these 19 systems:**

| Class | Systems | Count |
|---|---|---|
| A | Shared hooks, tier model, ESPN season snapshots | 3 |
| B | Snapshot cache, ingestion logging, response formatting | 3 |
| C | ESPN clients, cache keys, refresh scheduling, retry, validation, DB access | 6 |
| D | Sleeper client, KTC access, caching layers, identity, auth, metric calculations, ranking algorithms | 7 |

## 2. Reuse matrix

Rows are features; columns are the systems each one depends on. ✓ = uses the shared system. ✗ = bypasses it with a one-off. — = not applicable.

| Feature | Sleeper client | Snapshot cache | Identity map | Platform auth | `http.ts` responses | KTC read | Tier snapshot |
|---|---|---|---|---|---|---|---|
| League dashboard (client) | ✗ raw fetch ×8 endpoints | — | ✗ name join for KTC | — | — | ✓ `/api/ktc-values` | ✓ |
| Roster stats / FPPG | ✓ `sleeperRead` | ✓ | ✓ bundled file | — | partial | — | — |
| Dynasty tiers publish | ✗ raw | ✓ RPC (draft capital ✗) | ✗ espn_id-first variant | ✗ copy-pasted secret | ✗ | ✗ own query | writer |
| Projections | ✗ raw | ✓ | — | — | ✗ | — | — |
| Pick ownership (`trade-inventory`) | ✗ raw | ✗ none | — | — | ✗ | — | — |
| Draft capital route (unused) | ✓ `SleeperClient` | ✗ | — | — | ✗ | — | — |
| Trade Market | ✗ `cachedFetch` + raw | ✗ | ✗ display-name keys | none (public) | ✗ | ✗ own query, no budget | ✗ hard-coded v1 |
| Rankings | — | ✓ | ✗ name-keyed map | — | ✗ | — | ✗ hard-coded v1 |
| Prospects / scouting | — | ✗ | ✗ `espn_id` joins | mixed | ✗ | ✗ by name (`DraftBoardTab.tsx:173`) | — |
| Community | ✗ raw | ✗ Storage scan | ✗ db-id ballot keys | ✗ own JWT check | ✗ local `reply()` | — | ✗ separate table |
| Data health | ✗ raw | ✓ reads | — | — | ✓ | ✗ own query | ✗ hard-coded v1 |
| Public API / MCP | ✓ | ✓ | ✓ | ✓ | ✓ | — | — |
| Legacy pages | — | ✗ | ✗ GSIS | ✗ | ✗ | — | — |

**Most-shared systems:** the platform layer (`lib/platform/*`: snapshots, http, auth, player-data) is well built but adopted mainly by the public API, MCP and roster-stats. Most user-facing features bypass it [V].

## 3. Consolidation opportunities

Ordered by leverage. Each one reuses an existing system rather than adding a new one.

1. **One Sleeper client.** Make `SleeperClient` (it already has retry and timeout) canonical. Route server reads through it, add the snapshot cache for league/rosters/state, and delete `lib/sleeper-api.ts` and `sleeperApi.cachedFetch`. Touches 21 files.
2. **One identity service.** Promote `data/nfl-player-identities.json` behind a `resolvePlayer()` module, with Sleeper `espn_id` as the tiebreak. Apply the quarantine file. Replace the KTC name joins with KTC↔Sleeper id matching done once, at tier-publish time, and stored in the tier snapshot.
3. **One KTC reader.** A single `latestKtc(budget)` in `lib/platform` used by tiers, ktc-values, trade-market and data-health.
4. **Snapshot keys as constants.** Export `TIER_KEY` from `lib/dynasty-tiers.ts` and use it in the 3 hard-coded readers. Route the 2 bypassing writers through `snapshot()`.
5. **`lib/platform/http.ts` everywhere,** with one error shape. Wrap auth in `webAccount`/`apiAccount` so the JWT is verified once.
6. **Workflow template.** One reusable job step for "call endpoint, assert, alert". Add `concurrency:` and alerting to the 3 silent workflows.
7. **League metrics module.** Move the six team-value definitions, five orderings and superflex detection into `lib/league-metrics/*` with a single `LeagueContext { superflex, slots, scoring }`. Run it server-side and materialize it (TARGET_ARCHITECTURE).
