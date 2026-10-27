# Player standing and trade signals

## What the card shows
- **Border and label:** only clearly good or clearly bad players are marked. Tier 1 gets a gold glow ("Elite WR1"), tier 2 gold ("Star RB2"), tier 3 green ("Strong TE1"), tiers 7-8 red ("Fringe WR", "Waiver-level RB"). Tiers 4-6 show nothing. The slot number comes from position rank: top 12 = 1, next 12 = 2, then 3.
- **🔥:** KTC value is up 500 or more in 30 days (`HOT_DELTA` in `lib/player-signals.ts`).
- **Consider trading:** the card says why and who to call.

## Where each piece is computed
| Piece | Where | Why |
| --- | --- | --- |
| Tier, score, position rank, 30-day KTC change | Server, published atomically in the `dynasty:tiers` snapshot | Same for every user; needs the KTC history table and ESPN data; one daily write is cheaper than every browser pulling 23 KB of price history per player. The version history table also records what we said on any day. |
| Surplus, need, partner match, sell flags | Browser, `lib/trade-signals.ts` | Depends on live Sleeper rosters, lineup slots and standings that change by the minute and differ per league. Storing them would need per-league state and invalidation. The work is ~12 teams x 25 players. |
| Thresholds | `TRADE_RULES` (versioned) | One reviewed place; the module is pure, so the same code can move server-side for the API/MCP surface without a rewrite. |

Signals themselves are never stored: they are a deterministic function of rosters, standings and the published tiers, so a stored copy could only go stale.

## The rules
1. **Aging producer on a team that is not competing.** The team is `rebuild` or `purgatory` (competitive-state model), the player is at or past the position's age cutoff (QB 33, RB 27, WR 29, TE 30), and he is still tier 1-4. Buyers are contending teams with a weak starter at his position.
2. **Surplus with asymmetric need.** Fill each team's lineup with its strongest players (dedicated slots first, then flex). A bench player of tier 1-4 is surplus. A starting slot held by tier 6+ (or empty) is a need. Flag the surplus player only if the roster has a need and some team needs his position while holding a spare at a position this roster needs.
3. A 🔥 player gets an extra reason ("sell into the spike").

Every signal carries its reasons in the order the engine reached them; the card shows them under "Why".
