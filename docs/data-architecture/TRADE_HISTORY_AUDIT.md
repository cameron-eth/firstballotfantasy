# Trade history audit (T0)

Step T0 of `docs/product/LEAGUE_TRADE_HISTORY_PLAN.md`. This is the read-only baseline: each later step (T1–T5) re-runs it, and coverage may only go up.

**Recorded:** 2026-10-30, `main` at `cb957dd`, by `scripts/audit/trade-history.mjs`.
- **Source:** the `/api/trade-market` handler itself, so these are exactly the trades Trade Market reads.
- **League details:** formats from Sleeper's league settings.
- **KTC:** read from `ktc_player_values` and the complete-day markers.
- **Decisions:** the owner approved the recommended option for D-T1 to D-T5 on 2026-10-28: proportional attribution, FAAB listed unvalued, pre-history trades shown unpriced, no FirstBallot-wide baseline yet, any signed-in user can read.

## Connected leagues

Five leagues are connected (5 teams, 2 accounts). Each row covers the whole lineage, following `previous_league_id`.

| League | Format | Seasons | Trades | Priced at trade date | Fully priced | 3+ teams | With picks | Pick-only | With FAAB | Rome Odunze (priced) |
|---|---|---|---|---|---|---|---|---|---|---|
| The OGs | SF dynasty, 12 | 2024–26 | 186 | 77 (41%) | 70 | 3 | 150 | 6 | 4 ($843) | 10 (5) |
| The Meat Market | SF dynasty, 12 | 2024–26 | 223 | 51 (23%) | 51 | 4 | 203 | 33 | 2 ($41) | 5 (2) |
| Ball Knowers | SF dynasty, 12 | 2025–26 | 81 | 35 (43%) | 33 | 0 | 66 | 18 | 1 ($100) | 2 (2) |
| 1QB dynasty (another account) | 1QB dynasty, 6 | 2024–26 | 76 | 29 (38%) | 27 | 1 | 49 | 1 | 0 | 0 |
| GUTS | 1QB redraft, 10 | 2026 | 2 | 2 (100%) | 2 | 0 | 0 | 0 | 0 | 0 |
| **Total** | | | **568** | **194 (34%)** | **183** | **8** | **468** | **58** | **7** | **17 (9)** |

- **"Priced at trade date"** means the trade falls on or after the first complete KTC day (2026-04-17). Every trade from then on is priced; everything before is not, because KTC history in the database starts 2026-03-22 and the first day marked complete is 04-17.
- **"Fully priced"** means every player and every pick in the trade has a KTC value that day. The 11 priced trades that aren't fully priced contain a player KTC doesn't list or the tier match doesn't cover, or a pick past the 4th round. T1 must handle an unpriced asset inside a priced trade: it lists the asset with no value rather than counting it as zero.
- **Trade status:** all 568 are `complete`. Sleeper returns no vetoed or failed trades in these lineages, but T1 still filters on `status`.
- **Picks are common:** 468 trades (82%) include a pick, and 58 are picks only. Of 941 traded picks, 68 are past the 4th round, which KTC doesn't price.
- **FAAB is rare:** 7 trades, $984 in total. Listing it unvalued (D-T2) costs little.
- **3-team trades are rare:** 8 (1.4%). Proportional attribution (D-T1) applies to them, and the plan flags them.

## Managers across seasons

No lineage has a roster that changed owner between seasons, a manager who moved roster slot, or an ownerless roster. Keying by roster id would be correct today for all five. T1 still keys by `owner_id` (plan rule 7), because a future sale or swap would otherwise be misattributed silently.

## KTC data for trade history

| Question | Answer |
|---|---|
| Player history depth | Rows from 2026-03-22; complete days from 2026-04-17 to today (193 days) |
| Both formats stored? | Yes: `value_sf` and `value_1qb` on every row, players and picks. T1 can price 1QB leagues correctly; today Trade Market uses SF for every league (`tradeDateKtc`), so the 1QB dynasty league's 29 priced trades are on the wrong scale until T1 |
| Pick assets | KTC lists `{season} {Early\|Mid\|Late} {1st..4th}`. 2026 picks: 2026-03-22 to 09-21; 2027 and 2028: from 03-22; 2029: from 2026-09-22; no 2025 or 2030 class |
| Slot-specific picks | `{season} Pick 1.01` and so on exist only between the draft order being set and the draft (2026: 09-06 to 09-21). Too short to use for history; T1 keeps the Mid asset (D6) |
| 2025 picks | Never priced: KTC history starts after the 2025 draft. They stay "no KTC price", as Trade Market shows since D6 |

Since D6 (PR-27), Trade Market prices picks from these KTC assets, which settles plan rule 5. T1 only needs the format-correct value.

## Fixtures for T1

`tests/fixtures/trade-history/*.json.gz`, recorded by the same script with `--fixtures`. Each file contains:
- **Trades:** trade id, season, created, status, rosters, adds/drops, draft picks and FAAB, sorted by date.
- **Owners:** each season's roster → manager map.
- **Identity:** a Sleeper → KTC id map for the players involved.
- **Prices:** for every priced trade, its KTC day and the **SF and 1QB** value of each asset.

People and leagues are anonymized: managers are `m1…`, leagues `<label>:<season>`, trades `t1…`. A test checks that no Sleeper user or league id remains.

| Fixture | League | Trades | Priced | Asset values |
|---|---|---|---|---|
| `sf-dynasty-a` | The OGs | 186 | 77 | 281 |
| `sf-dynasty-b` | Ball Knowers | 81 | 35 | 149 |
| `1qb-dynasty` | 1QB dynasty (another account) | 76 | 29 | 118 |
| `redraft-1qb` | GUTS | 2 | 2 | 8 |

## What this means for T1

1. Format-correct values: 1QB leagues use `value_1qb`. This is the visible fix the plan names; it changes the 1QB dynasty league's trade-date numbers.
2. Unpriced assets inside priced trades are listed without a value, not counted as zero.
3. Attribution: proportional (D-T1), with 3-team trades flagged.
4. Managers keyed by `owner_id`, even though no lineage needs it today.
5. FAAB listed, unvalued (D-T2).
6. Before 2026-04-17: trades are listed unpriced (D-T3). That's 66% of all trades today, falling as new trades come in.

## Re-running

```bash
/path/to/node22 --conditions=react-server --import tsx --import ./tests/helpers/register.mjs scripts/audit/trade-history.mjs /tmp/trade-history.json
```

It needs Node 22, because supabase-js needs a native WebSocket, and the Supabase env from `.env.local`. It only reads.
