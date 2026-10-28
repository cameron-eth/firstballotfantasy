# Gate G1: correctness phase (after PR-9)

**Criterion (PR_SEQUENCE.md):** every metric marked D in DATA_INVENTORY §2 has one implementation, and golden fixtures agree across Overview, Builder, My Team, Standings and Picks.

**Status, 2026-10-28: passed for the league dashboard** after PR-9b (option A, chosen by the owner).

- Phase B (PR-5 to PR-9) consolidated 6 of the 20 D metrics.
- PR-9b consolidated the 7 league-dashboard duplicates that no PR owned (8, 9, 16, 17, 18, 29, 30).
- 13 of 20 are resolved. The remaining 7 are carried to later PRs and listed below.

## The 20 D metrics

| # | Metric | Status | Where |
|---|---|---|---|
| 11 | Dynasty rank (Overview) | **Resolved** | PR-6: `leagueTeamValues` |
| 12 | Team value rank (My Team) | **Resolved** | PR-6 |
| 13 | Power score | **Resolved** (kept as its own metric, renamed "Lineup strength") | PR-6 |
| 14 | Team grade | **Resolved** (dead initial grade removed; built on 12) | PR-6 |
| 19 | Standings order | **Resolved** | PR-7: `compareStandings` (also fixed 20, decimal PF) |
| 24 | Draft slots, `pickLabel` | **Resolved** | PR-8: `draftSlots`, `slotLabel` |
| 8 | Projected PPG | **Resolved** (PR-9b) | `LeagueBuddy.tsx:144` re-derives what `useProjections().ppg` returns |
| 9 | Projected starters this week | **Resolved** (PR-9b) | `OverviewHeader` sums starters; `startSit.startersProjected` does the same separately |
| 16 | Position-group rank | **Resolved** (PR-5, PR-9b: ties share a rank; the second table is "Lineup by position"). Before: | Overview ranks top-N groups (ties by index). The Lineup-strength card, also titled "Positional ranks", ranks lineup slots with shared ranks. Two definitions under one name |
| 17 | Franchise state | **Resolved** (PR-9b: `tradeSignals` takes the dashboard rule). Before: | `tradeSignals` decides "in season" from games played; the dashboard uses `!isOffSeason()`. House Money can differ between the card signal and the header |
| 18 | Core age vs Average age | **Resolved** (PR-9b: My Team shows core age). Before: | Header "Core age" = top 12 by value; My Team "Average age" = all skill players |
| 29, 30 | Trade signal vs Market signals | **Resolved** (PR-9b, D5: both shown with reasons, disagreement flagged). Before: | "Consider trading" (tier and age cliff) and Market signals (P/E and daily move) can say sell and buy for the same player |
| 1 | KTC value scale | Assigned | PR-16 (Trade Market's blended 13k scale), PR-19 (name joins) |
| 2 | KTC deltas | Assigned | `ktcTrendDelta` is written but never read; remove in PR-23 |
| 4 | Tier pool for community | Unassigned | Community reads `dynasty_player_tiers`, which has no writer (Phase C/E) |
| 6 | Current-season FPPG | Assigned | PR-23 (legacy `master_player_stats` and NGS routes) |
| 25 | Pick ownership | Assigned | PR-23 (unused `/api/draft-capital`) |
| 33, 34 | Prospect tiers and ranks | Assigned | PR-20 (D3) |

## Cross-surface agreement asserted by the golden test

Every fixture, including the new `missing-data` one, asserts:

- Outlook rank equals the dynasty rank used by Overview and My Team (PR-6).
- The default draft slots equal the board's slots for that basis (PR-8).
- Standings, playoff odds and the draft record order agree on a league containing every tiebreak (`tests/standings-order.test.mjs`, PR-7).

## How it was passed

The owner chose option A. PR-9b consolidated 8, 9, 16, 17 and 18. For 29/30, D5 shows both signals with their reasons. `tests/g1-consolidation.test.mjs` pins each consolidation, and the golden values are unchanged.

Not in G1's scope, carried forward: 1, 2, 4, 6, 25, 33, 34. Metric 4 (the community tier pool) has no owner yet and belongs in Phase C or E.
