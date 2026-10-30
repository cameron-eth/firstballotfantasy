# League trade history: plan (approved 2026-10-28)

**Question from the owner:** "My trade target is Rome Odunze. What has his value been in this league full of jackasses (The OGs) versus a league of professionals?"

**Status:** approved by the owner on 2026-10-28, with the recommended option for every decision in §6. Work starts after PR-21.

## 1. What we have today (audit)

| Area | Today | Gap for this feature |
|---|---|---|
| Raw trades | `trade-market:{leagueId}` snapshot, one per league season, follows `previous_league_id` (up to 8 seasons). Raw Sleeper transactions: `adds`, `drops`, `draft_picks`, `waiver_budget`, `roster_ids`, `created` | No per-player view. Per-player counts are derived on the client only (`analytics.ts:85-90`) |
| Player value on the day | `tradeDateKtc` (PR-16b), from the newest complete KTC day on or before the trade | History starts **2026-04-17**, so every older trade is unpriced. It uses **SF values even in 1QB leagues** |
| Picks | `getDraftPickValue(round, season)`, a synthetic scale relative to today's year | Ignores the trade date and the slot; not KTC |
| FAAB | Stored in `waiver_budget` | Never valued or shown |
| 3-team trades | Value in and out per roster works | Counterparty pairs need exactly 2 rosters; one player's price inside a 3-way deal isn't attributed |
| Managers across seasons | Keyed by `rosterId` | A manager who changes roster slot, or a roster that changes hands, is mis-attributed. Needs `owner_id` |
| Access | Anonymous requests get a 401 (middleware) | Any signed-in user can read any league id. The underlying Sleeper data is public anyway |
| Cross-league | None | Each request covers one league lineage |

**Live check, Rome Odunze (Sleeper 11620), production today:**

| League | Trades (all) | Trades with Rome | Priced at trade date | Example costs |
|---|---|---|---|---|
| The OGs (3 seasons) | 186 | **10** (2 were 3-team) | 5 of 10 | Watson + Tre' Harris + '28 3rd + '29 2nd (Aug 13, KTC 5168); MHJ + Cyrus Allen (Aug 11, KTC 5262); Jameson Williams (Oct 18, KTC 4348) |
| Ball Knowers (2 seasons) | 81 | 2 | 2 of 2 | A.J. Brown + '27 3rd + '27 4th (Jun 16, KTC 5404); '27 2nd + '29 1st (Oct 21, KTC 4440) |

There is enough data to answer the question for active leagues. Half of the OGs history predates KTC price history, so the plan has to show unpriced trades honestly rather than drop them.

## 2. What we would show, at three levels

The core unit is one **price observation**: in trade T, on date D, roster A received player P and gave package X.

- **Price** = the value of X attributed to P. When A received several assets, X is split in proportion to each asset's value on that day.
- **Price ratio** = price / P's KTC that day, using the league's own format (SF or 1QB).
  - 1.20 means this league paid 20% over the market.
  - The ratio is what makes leagues comparable. Raw KTC drifts over time; the ratio doesn't.

| Level | Answers | Where it lives |
|---|---|---|
| **Player** (primary) | "What has Rome cost here?" Every trade, what went the other way, the price and ratio, and the trend | Player modal / trade target in Team Builder; a player search on Trade Market → Trends |
| **Manager** | "Who overpays, and for what?" Each manager's average ratio when buying and selling, by position and age band | League tab / team card, and as context in trade suggestions ("this manager has paid 1.3× for young WRs") |
| **League** | "Is this a sharp league?" League **market efficiency**: the median imbalance of trades vs KTC on the day, and the premium by position and age band | League overview; the comparison across leagues |

**Comparing leagues ("OGs vs professionals"):**
- **Phase 1:** compare only across leagues the signed-in user is connected to (`connected_teams`). For example: "Rome in The OGs: 1.18× (5 priced trades); in Ball Knowers: 0.94× (2)". This needs no new data sharing.
- **Phase 2 (owner decision D-T4):** a FirstBallot-wide anonymous baseline, the median ratio by player and format across all connected leagues. This needs a stored table, a minimum number of leagues before a figure is shown, and a privacy statement.

## 3. Rules (so the numbers can be trusted)

1. **No hidden numbers.** Every ratio links to the trades behind it.
2. **Sample size is always shown.** Below 3 priced observations we show the trades but no average, labelled "Not enough trades".
3. **Unpriced trades stay visible.** A trade before 2026-04-17 lists what was paid with no number, labelled "Before price history".
4. **Format-correct.** 1QB leagues use KTC 1QB values. This also fixes the PR-16b SF-only shortcut, which is a visible change and is listed in that PR's golden diff.
5. **Picks on the trade date.** Use KTC's own pick values (round and Early/Mid/Late). T0 confirmed `ktc_player_values` has them, and D6 (PR-27) already prices Trade Market's picks from them.
6. **FAAB** is listed. It gets a value only if the owner picks a conversion (D-T2); until then it is shown as "+$12 FAAB, unvalued".
7. **Managers by `owner_id`**, not roster id.
8. **No new cache** without documented invalidation. Phase 1 is a pure function over the existing per-season snapshots, so it inherits their expiry (15 minutes current season, 30 days past seasons).

## 4. PR sequence

Each PR is small, uses golden tests, and ships default off where it changes visible numbers.

| PR | Scope | Done when |
|---|---|---|
| **T0** audit — **done 2026-10-30** (`docs/data-architecture/TRADE_HISTORY_AUDIT.md`) | Read-only script `scripts/audit/trade-history.mjs`. For each connected league: trade count, priced %, 3-team %, picks/FAAB share, owner changes. Confirms whether KTC stores pick values and their history depth. Records fixtures for The OGs (SF dynasty), Ball Knowers, one 1QB dynasty and one redraft league | Report committed under `docs/data-architecture/`. Owner answers D-T1 to D-T4 |
| **T1** observations | `lib/trade-market/price-observations.ts` (pure): turns trades + trade-date values into observations, with proportional attribution, 3-team support, picks, FAAB, `owner_id`. Format-aware KTC (1QB) in `tradeDateKtc` | Golden tests: the 10 Rome trades in The OGs checked by hand, a 3-team trade, a pick-only trade, a FAAB trade, a 1QB league. Existing goldens unchanged except the listed 1QB fix |
| **T2** API | `GET /api/league/[id]/trade-history?player=&manager=`, built from the snapshots. Response states the coverage (priced / total) | Parity test against T1; production check on The OGs and Ball Knowers |
| **T3** player UI | Player price history in the trade modal / Team Builder target and on Trade Market → Trends | Screenshots; UI review on 1QB and SF |
| **T4** manager UI | Manager tendencies (buy/sell ratio by position and age) | As T3 |
| **T5** league UI | Market efficiency and comparison across your own leagues | As T3; numbers checked against the T0 report |
| **T6** (only if D-T4 is approved) | `trade_price_observations` table (migration with dry run and rollback), nightly job, FirstBallot-wide baseline with a minimum sample | Migration doc, data-health signal, privacy note |

**Order:** after PR-21 (one Sleeper client). The trade-market route still calls `api.sleeper.app` directly, and T2 would otherwise add a second direct caller.

## 5. Audit and verification
- The T0 report is the baseline. Each later PR re-runs it, and coverage may only go up.
- Hand-checked goldens: the 10 Rome trades (both leagues) recorded with expected price and ratio.
- Data-health (PR-24): a signal when a league's priced share drops (for example a KTC day missing).
- Edge cases with tests: reversed or vetoed trades (`status !== 'complete'`), the same player traded twice in one day, a roster changing owner mid-season, picks that later converted to players.

## 6. Decisions for the owner
- **D-T1, attribution in multi-asset trades.** Recommended: proportional by value on the day. The alternative is to count only 1-for-N trades as clean observations, which leaves fewer observations but no modelling.
- **D-T2, FAAB.** Recommended: list it unvalued for now. The alternative is a fixed conversion (for example $1 = N KTC points).
- **D-T3, pre-history trades.** Recommended: show them unpriced. The alternative is to price them with the nearest later KTC day, labelled; this is less accurate.
- **D-T4, a FirstBallot-wide baseline across other users' leagues.** Recommended: not in phase 1; decide after T5, with a minimum league count and a privacy note.
- **D-T5, who can read a league's trade history.** Today it is any signed-in user. Recommended: keep that, since Sleeper data is public. The alternative is to limit it to connected members.

## 7. Risks
- Small samples look authoritative. This is mitigated by rule 2, always showing n.
- KTC is one market. A ratio says "versus KTC", not "versus truth", and the UI wording will say so.
- 3-way attribution is a model. Its observations are flagged, and owners can filter them out.
