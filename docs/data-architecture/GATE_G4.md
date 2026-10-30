# Gate G4: consolidation phase (after PR-24)

**Criterion (PR_SEQUENCE.md):** INFRASTRUCTURE_AUDIT has no class-D rows left.

**Status, 2026-10-30: passed.** I re-checked `main` at `d93225d` with the audit's own greps, and no system in the audit's class D (competing duplicate implementations) still has one. The first check, on 2026-10-29, failed with seven leftovers. Since then:
- PR-25 (#139) fixed the five mechanical ones.
- PR-27 (#142, D6) and PR-28 (#143, D7) carried out the owner's two decisions.
- This PR keys the last name-keyed prospect consensus map by id.

Along the way, PR-26 (#141) stopped data-health reporting idle caches as stale.

## The seven class-D systems

| System | Was (2026-10-28) | Now | Evidence |
|---|---|---|---|
| Sleeper API client | 5 implementations, 21 files | **A: one client** | PR-21a–c. `api.sleeper.app` appears only in `lib/sleeper-sdk/client.ts`, guarded by a test. Every read takes its cache settings from `SLEEPER_CACHE` (PR-25, guarded). The Python job `scripts/import-history-outcomes.py` calls Sleeper on its own; it's outside the app. |
| KTC access | 4 "latest date" queries, 2 freshness rules | **A: one reader** | PR-25: `latestKtcDay()` / `completeKtcDays()` in `lib/platform/ktc-days.ts` (the complete-day markers) serve ktc-values, data-health, Trade Market and tier publication, with one budget (`KTC_MAX_AGE_MS`). Guarded by a test. The other `scraped_date` query left, in tier publication, finds the day **30 days back** for the 30-day change; that's a different question. |
| Caching layers | 7 layers, 16 presets plus ad hoc | **B → A** | The remaining layers each do a different job: snapshots, the Next fetch cache via `SLEEPER_CACHE`, the per-instance memo, CDN headers, SWR, bundled JSON. Dead layers were removed (PR-21, PR-23a), no ad hoc fetch TTL is left (guarded), and data-health tells an idle read-through snapshot apart from a stale one (PR-26). |
| Player identity | 4 approaches, name joins | **A: by id** | PR-19a–d: KTC↔Sleeper is matched once, at publish time (`lib/ktc-identity.ts`), and readers go by Sleeper or KTC id. PR-25 moved the landing Team Map demo to Sleeper ids. PR-28 keys the community pool by Sleeper id. The KTC pick lookups (Builder, Trade Market) go by KTC's own asset names such as "2027 Mid 1st", not by people's names. |
| Auth | 9 mechanisms; JWT verified 2–3× | **A** | PR-23b: the session JWT is verified only in `middleware.ts`. PR-25: the refresh secret is checked only in `refreshAuthorized()`. Both are guarded by tests. |
| Metric calculations | 20 of 43 metrics duplicated | **A** | G1 resolved 13. The seven it carried forward: <ul><li>**KTC scale:** PR-16, PR-19, and D6 (PR-27), which prices Trade Market picks from KTC's pick assets; the hard-coded scale is gone (guarded).</li><li>**KTC deltas:** PR-23a.</li><li>**Community tier pool:** D7 (PR-28) builds it from the published tiers; `dynasty_player_tiers` is no longer read (guarded).</li><li>**FPPG sources, pick ownership:** PR-23a.</li><li>**Prospect tiers:** PR-20.</li></ul> |
| Ranking algorithms | 5 standings orders, 3 position ranks, 2 prospect ranks | **A** | <ul><li>**Standings:** one `compareStandings` (PR-7).</li><li>**Position ranks:** one rule (PR-5, PR-9b).</li><li>**Prospect ranks:** one server derivation (`deriveRanks` in `/api/prospects`). The audit's second derivation, ScoutingPortal using a positional rank as overall, is gone: its remaining rank use concerns NFL players. This PR removes a duplicate client consensus map keyed by name; the board breakdown now uses the board's id-keyed map.</li></ul> |

**What G4 doesn't settle:** grade v2 (prospect plan P2–P6) changes how prospects are *graded*, not how many implementations there are. The legacy `/draft-board` page compares a user's board to consensus by name within one response, because its prospects carry no id. PR-20b ensured names are unique within a class.

## Dead code (PERFORMANCE_ACCURACY P3-1)

Everything on the P3-1 list is gone from `main`, removed in PR-21 and PR-23a (#133). That covers:
- `lib/sleeper-api.ts`, `lib/cache-config.ts` and `lib/api-cache.ts`
- `positionStrengths` and `calculateRawScore`
- `/api/draft-capital` and `TeamCard.tsx`
- the six unused routes

Found and removed during G4:
- **PR-25:** three unused `trade-utils` exports and `UserApi.getUserProfile`.
- **PR-27:** `getDraftPickValue`, `DraftPickValue` and `TradeAnalysis`.

## How it was checked

The audit's greps, re-run on `d93225d`:

| Check | Result |
|---|---|
| `api.sleeper.app` | only in `lib/sleeper-sdk/client.ts` |
| newest-KTC-date queries | none outside `ktc-days.ts` |
| ad hoc `next: { revalidate: N }` | none outside the Sleeper client |
| `auth.getUser(` | only in `middleware.ts` |
| `DATA_REFRESH_SECRET` | only in `lib/platform/auth.ts` |
| `getDraftPickValue`, `dynasty_player_tiers` in app code | none |
| standings comparators | only `compareStandings` |

Tests now guard each of these: `sleeper-client`, `session-auth`, `g4-consolidation`, `trade-market-pick-values` and `community-nfl-pool`.

**Production checks after each merge:**
- **KTC:** identical responses before and after PR-25.
- **Trade Market:** 81 trades, 35 priced. After D6, the today view shows the 68 unpriced picks the harness predicted.
- **Community ballot (2026-10-30):** today's pair includes `nfl:13349` (Eli Stowers, a 2026 rookie) with a headshot.
- **data-health:** "unverified"; nothing expired, nothing affected.

## History

The first check (2026-10-29, #138) found five mechanical leftovers (PR-25) and two owner decisions (D6 Trade Market pick values, D7 community pool). The owner chose (a) for both on 2026-10-30. D7 needed no ballot migration: all 15 stored ballots were prospect against prospect, so no GSIS `nfl:` key existed to remap.
