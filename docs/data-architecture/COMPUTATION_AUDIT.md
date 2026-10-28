# Computation audit

Evidence labels: [V] verified, [C] code-supported, [S] suspected, [U] unknown. They are defined in [DATA_INVENTORY.md](DATA_INVENTORY.md).

## 1. Where computation runs

Counts use the 43-metric lineage matrix in DATA_INVENTORY §2. Persisted (4) and external (2) values are excluded, which leaves **37 computed metrics**.

| Class | Count | Share of computed | Examples |
|---|---|---|---|
| Database-derived (SQL / materialized view) | 0 shown in the live UI | 0% | `master_player_stats` exists but has no UI consumer |
| Cached precomputation (scheduled or read-through snapshot) | 7 | 19% | Dynasty tiers, ESPN FPPG, projections |
| Server on demand | 6 | 16% | Prospect ranks, pick ownership, community ratings, history outcomes |
| **Client on demand** | **24** | **65%** | Every team-level metric, standings, odds, draft order, trade engines |
| Background job | Feeds the cached rows above | — | Tier publish, KTC sync, college stats |

**Server vs client:** 13 of the 37 computed metrics (35%) are computed server-side and 24 (65%) in the browser. Every league-level metric — team value, grades, ranks, franchise state, odds, draft order, trade ideas — is computed client-side from raw Sleeper data plus four APIs [V].

## 2. Critical question: is there one authoritative computation per metric?

**No.** 20 of 43 visible metrics (47%) have a competing definition or duplicate implementation [V]. The violations:

| Concept | Competing implementations | Evidence | Visible effect |
|---|---|---|---|
| **Team dynasty value** | 6 implementations: (A) linear Σ raw KTC, missing = 0; (B) `teamValueScore`, convex and depth-decayed, always SF; (C) placement `nowScore`, B min–max scaled; (D) power score, optimal lineup + ¼ bench; (E) grade, 0.7 value + 0.3 production percentile; (F) `calculateRawScore` (dead) | A `OverviewHeader.tsx:112-119`; B `lib/team-score.ts:29-56`; C `competitiveState.ts:160,199,217`; D `lib/sleeper-sdk/values.ts:163-328`; E `team-score.ts:71-96`; F `utils.ts:34-38` | Overview "Dynasty rank", My Team "Team value" rank, Outlook quadrant and power rank can all disagree for the same team [C] |
| **Superflex detection** | 4 rules plus 3 hard-coded `true` | `useLeagueData.ts:276-281`; `values.ts:118-120` (misses 2QB); `lib/sleeper-sdk/trade-inventory.ts:59-61` (misses `QB/RB/WR/TE`); `LineupMap.tsx:33-35`; hard-coded in `utils.ts:6`, `competitiveState.ts:23`, `team-score.ts:52` | 1QB leagues get SF values in grades, placements, position ranks, P/E and trends. 13 direct `ktcValueSf` reads ignore the format [V] |
| **Standings order** | 5 orderings | `LeagueBuddy.tsx:86-92` (wins then PF, no ties); `utils.ts:377` `recordOrder`; `utils/playoffOdds.ts:70,117,253` (wins only); `competitiveState.ts:183` (ties ignored); `draftOrderBoard.ts` (win%, then PF, then Max PF) | Header rank, odds rank and draft "record" order can differ when there are ties [C] |
| **Draft slot** | 5 call sites, 3 metrics, 3 readiness gates | `OverviewHeader.tsx:128` (maxpf); `usePickCapital.ts:39-46` (projected; the "record" fallback can never trigger because projections always fill every team, `projectedMaxPointsFor.ts:107`); `LeagueStandingsSection` / `TeamTimeline` (require all > 0); `DraftOrderPanel.tsx:106` (defaults to record) | The Picks tab shows 1.01 (projected) in the capital cards and 1.03 (record) on the board [V] |
| **Position-group rank** | 3 | `utils.ts:142-204` (fixed depths, index ties, SF); `values.ts:268-353` (league slots, shared ranks); `positionStrengths` 2/4/4/2 (dead) | Roster overview vs Power rankings categories [C] |
| **Core / average age** | 2 | `competitiveState.ts:164` vs `RosterSection.tsx:198` | Header "Core age" ≠ My Team "Average age" [V] |
| **Franchise state** | 2 (in-season rule differs) | `LeagueBuddy.tsx:105-114` (`isOffSeason()` date check) vs `trade-signals.ts:89` (any games played) | Jan–Jul: the header can hide "Pretender" while trade signals use it [C] |
| **Sell signal** | 2 | `TradeIntelligencePanel.tsx` (P/E, daily move) vs `trade-signals.ts` (age, tier) | Market signals can say Buy while the card says "Consider trading" [C] |
| **KTC trend** | 3 | `delta30` (tier build), `ktcTrendDelta` (history first→last), daily delta | Different "up/down" on different cards [C] |
| **FPPG** | 3 sources | ESPN snapshot (live); `master_player_stats` (2025 only); NGS sum (may double count) | Only ESPN reaches the live UI; the others are latent traps [V] |
| **Pro tiers** | Snapshot vs `dynasty_player_tiers` table (no writer) vs regex re-parse defaulting to tier 5 | `lib/community/store.ts:75`; `hooks/use-rankings.ts:62-65`; `lib/trade-utils.ts:234` (invented `Tier ceil(rank/30)`) | Community pool can drift from published tiers [S] |
| **Prospect tiers** | 4 vocabularies | `lib/scouting-grade-tier.ts:39-59`; `lib/players.ts:65-96`; `ScoutingPortal.tsx:424-435` (positional rank used as overall); legacy draftboard | Same prospect shows different tiers on different views; the earlier audit found 76/100 stored labels disagree with the grade [V] |
| **Pick ownership** | 2 server implementations | `app/api/draft-capital/route.ts:13-37` and `trade-inventory.ts:19-37` | No visible effect; `/api/draft-capital` is unused since PR #78 [V] |
| **KTC scale** | KTC, KTC/100, legacy 13,125 scale, synthetic pick scale | `lib/trade-utils.ts:111-286` | Trade Market numbers aren't comparable with card values [V] |
| **Projections helpers** | 2 | `LeagueBuddy.tsx:149` vs `useProjections.ts:82`; `OverviewHeader.tsx:122` vs `startSit.ts:105` | Same numbers today; easy to drift [C] |

## 3. Expensive computations on page load or render

Costs are estimated from code [C]. None have been profiled.

| Computation | Cost | Re-runs on | Evidence |
|---|---|---|---|
| Playoff odds Monte Carlo | 10,000 runs × remaining weeks × teams, synchronous on the main thread | Every mount of Overview or Standings (each holds its own memo); every new `teams` identity (at least once when KTC merges, then each 15-min bundle refresh) | `useStandingsOdds.ts:47-53`; `playoffOdds.ts:147-212` |
| `suggestedTeamTrades` | ~25 × ~300 candidates × median recompute | **Every render**: `dismissed` is a new array each render, and a 30 s timer forces renders | `useTradeDismissals.ts:31,42`; `useSuggestedTrades.ts:29-32` |
| Hidden Team Builder | `tradeSignals` (second full placements pass), `useTeamTimeline`, `draftFundingIdeas` (O(assets²) per pick), none memoized | Stays mounted on every tab on desktop | `LeagueBuddy.tsx:408-420`; `LineupMap.tsx:83-89`; `draft-funding.ts:125-148` |
| `teamValueScore` for all teams in RosterSection | O(teams × players log players) | Every keystroke in roster search | `RosterSection.tsx:98-126` |
| Power rankings, position ranks, grades | Moderate | Twice on load: before and after KTC merges (only placements wait for values) | `LeagueBuddy.tsx:107`; `useLeagueData.ts:661` |
| Community ratings and trends (server) | Downloads **every ballot** + 150 iterations (×7 for trends) | Every request (60 s per-instance memo, cleared on vote) | `lib/community/store.ts:39-70` |
| Trade Market (server + client) | ~25 Sleeper calls per league season × up to 8 seasons, plus a 17 MB players payload | Every page load, `no-store` | `app/api/trade-market/route.ts:43-314` |

## 4. Materialize or keep dynamic

| Computation | Recommendation | Why |
|---|---|---|
| Team value / dynasty rank (one definition) | **Materialize per league** on the server: a `league_metrics` snapshot keyed by league + format, rebuilt when KTC publishes or rosters change | Six definitions today; computed in every browser; needs one authoritative value |
| Franchise state, core age, position ranks, power ranks | Materialize with team value (same inputs, same trigger) | Same |
| Playoff odds | Server, **seeded**, cached per league + completed week | Nondeterministic and the most CPU-heavy work; only changes when a week completes |
| Max PF / projected Max PF / draft order | Server per league + week (matchups are immutable once a week ends) | Today the client refetches every week's matchups on each load |
| Trade Market analytics | Server, persisted per league + season; past seasons immutable | ~200 Sleeper calls per load, 17 MB payload |
| Community ratings | Incrementally update a stored rating table on each ballot | Cost currently grows linearly with ballots per request |
| Dynasty tiers | Keep as is (precomputed snapshot) | Already the right shape |
| Trade suggestions | **Keep dynamic** (depends on dismissals and the user's plan); memoize correctly | Personal and cheap once memoized |
| Tier labels, formatting, hot/cold | Keep client side | Pure presentation |
| Start/sit, projections re-scoring | Keep on demand (league scoring varies) | Already cached at the source |

## 5. Rounding and normalization

- **Points for:** an integer (`fpts`) shown with one decimal (`.0`); `fpts_decimal` is never read (`lib/sleeper-sdk/types.ts:47`) [V].
- **Rounding before ranking** creates artificial ties: `team-score.ts:50,86`, `competitiveState.ts:173`, `values.ts:326`. Ties then go "≥ median" in placements but are broken by index in position ranks [C].
- **Display precision:**
  - Projected Max PF uses `toFixed(0)`; realized Max PF uses `toFixed(1)` (`DraftOrderPanel.tsx:70,80`).
  - Odds use one decimal; the grade percentile is a whole number [C].
- **Name normalization:** three normalizers decide joins — suffix-stripping, space-keeping, no-space (`app/api/ktc-values/route.ts:5`, `lib/trade-utils.ts:117`, `components/scouting/board-player.ts:61`) [V].
