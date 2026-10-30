# Gate G4: consolidation phase (after PR-24)

**Criterion (PR_SEQUENCE.md):** INFRASTRUCTURE_AUDIT has no class-D rows left.

**Status, 2026-10-29: not passed.** Phase E (PR-19 to PR-24) consolidated the bulk of every class-D system. A re-check of `main` at `e1b9f30` with the audit's own greps still finds duplicates in four of the seven D systems:

- **5 are mechanical:** they change no number a user sees. Proposed for one PR, PR-25.
- **2 change visible numbers,** so they need an owner decision first (D6, D7).

## The seven class-D systems

| System | Was | Now | Evidence |
|---|---|---|---|
| Sleeper API client | 5 implementations, 21 files | **Resolved (A)** | PR-21a–c. `api.sleeper.app` appears only in `lib/sleeper-sdk/client.ts`, enforced by a guard test. The Python job `scripts/import-history-outcomes.py` calls Sleeper on its own; scripts are outside the app and outside the audit's scope. |
| Player identity | 4 approaches, name joins | **Resolved, one leftover** | PR-19a–d. The KTC↔Sleeper match is done once, at publish time (`lib/ktc-identity.ts`), and readers go by Sleeper or KTC id. **Leftover:** the landing-page Team Map demo looks live tier values up by display name (`TeamMapPreview.tsx:131`). |
| Auth | 9 mechanisms; JWT verified 2–3× | **Resolved, one leftover** | PR-23b. The JWT is verified only in `middleware.ts`, enforced by a guard test. **Leftover:** the `DATA_REFRESH_SECRET` check is still copied in `dynasty-tiers/route.ts:151` and `internal/refresh-data/route.ts:6`. |
| Metric calculations | 20 of 43 metrics duplicated | **Resolved except one** | G1 resolved 13. PR-16, PR-19, PR-20 and PR-23 resolved the carried items: KTC deltas, FPPG sources, pick ownership, prospect tiers. **Open (owner, D6):** Trade Market prices picks on a hard-coded synthetic scale with a 2027 bonus (`lib/trade-utils.ts:236`, `getDraftPickValue`), not on KTC pick values. **Open (owner, D7, G1 metric 4):** the community ballot pool reads `dynasty_player_tiers`. That table has no writer and was last updated 2026-02-22 (972 rows, ranked on the old 0–13,125 score), so the pool is eight months behind the published tiers. |
| Ranking algorithms | 5 standings orders, 3 position ranks, 2 prospect ranks | **Resolved** for standings (PR-7) and position ranks (PR-5, PR-9b). **Assigned** for prospect ranks | Prospect rank derivation is step P2 of the approved prospect plan (`docs/product/PROSPECT_RANKING_PLAN.md`). |
| KTC access | 4 "latest date" queries, 2 freshness rules | **Still D** | Three readers still find "today's KTC" themselves, each with a different rule: `ktc-values` (2 queries, newest date, 48 h budget), `data-health` (newest date, 48 h), `trade-market:latestKtcById` (newest date, **no budget**). Tier publication uses a fourth rule: the newest **complete** day by its `ktc:day` marker. A raw newest-date read can pick a day whose scrape is still in progress. |
| Caching layers | 7 layers, 16 presets plus ad hoc | **Mostly resolved** | PR-21 deleted `nextjs-cache`, `cache-config` and `api-cache`; Sleeper reads use the `SLEEPER_CACHE` profiles. The remaining layers (snapshots, the Next fetch cache, the per-instance memo, CDN headers, SWR, bundled JSON) each do a different job; they are layers, not duplicates. **Leftover:** four Sleeper reads pass an ad hoc `{ next: { revalidate } }` instead of a profile: `community-rankings:22`, `leagues:24`, `projections:56`, `data-health:105`. |

## Dead code (PERFORMANCE_ACCURACY P3-1)

Everything on the P3-1 list is gone from `main`, removed in PR-21 and PR-23a (#133):
- `lib/sleeper-api.ts`, `lib/cache-config.ts` and `lib/api-cache.ts`
- `positionStrengths` and `calculateRawScore`
- `/api/draft-capital` and `TeamCard.tsx`
- the six unused routes

New dead code found during this check: in `lib/trade-utils.ts`, six exports have no importers. They are `getPlayerValue`, `getPlayerValueFromRank`, `get2027EnhancedValues`, `rankingFor`, `calculateTraderStats` and `getValuationSystemDescription`, and they make up the old 0–13,125 valuation path.

## To pass

**PR-25 (mechanical; no visible number changes; one PR):**
1. **One KTC day reader:** `latestKtcDay({ budget })` in `lib/platform`, using the complete-day marker rule tier publication already uses. ktc-values, data-health and Trade Market use it. Trade Market has no budget today; the PR keeps that and states it.
2. **One refresh-secret check:** `refreshAuthorized(request)` in `lib/platform/auth.ts`, used by both routes.
3. **Shared cache profiles:** the four ad hoc Sleeper reads use `SLEEPER_CACHE` profiles. Any TTL that changes is listed in the PR.
4. **Team Map demo by id:** the demo looks up live values by Sleeper id instead of by name.
5. **Dead code:** remove the six unused `trade-utils` exports.

**Owner decisions:**
- **D6, Trade Market pick values.** (a) Price picks from KTC pick assets, which the Builder already uses; Trade Market P&L and grades change. (b) Keep the synthetic scale, document it as Trade Market's own, and drop the 2027 bonus once that class is drafted.
- **D7, community ballot pool.** (a) Build the NFL half of the pool from the published tier snapshot (top 200 by KTC). This adds 2026 rookies and drops retired players. Today's ballot keys use the table's GSIS ids (`nfl:00-0039139`), so past NFL ballots need those keys mapped to Sleeper ids through the identity map, or they stop counting. (b) Keep `dynasty_player_tiers` and give it a writer.

Once PR-25 lands and D6 and D7 are decided and built, re-run this check. G4 passes when the "Now" column has no D.
