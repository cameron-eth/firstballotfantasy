# Trade opportunities

## Runtime choice

Keep this flow in Next.js. The app already owns authenticated Sleeper actions and encrypted token storage. A second Python/FastAPI deployment would add service authentication, latency and credential forwarding for small, deterministic functions. Use a separate Python worker only if the full SDK's portfolio-wide optimization or costly simulations become necessary; it should return suggestions and never hold the authority to send offers.

## SDK logic reused

- `sleeper-sdk/python/src/sleeper/analytics/pick_ownership.py`: start with every roster's original picks, then apply traded-pick ownership overrides. Original roster determines pick identity; current owner determines who can trade it. Port lives in `lib/sleeper-sdk/pick-inventory.ts`, shared by draft-capital summaries and trade inventory.
- `analytics/trade_suggestions.py`: positional depth relative to league median and format-specific KTC comparisons. Selected-player matching is implemented in `trade-opportunities.ts`; it is a discovery heuristic, not the full SDK optimizer or an acceptance probability. Missing KTC values are never zero-valued bargains.
- `auth/client.py::propose_trade`: picks encode `original_roster,season,round,sender,receiver`; FAAB encodes `sender-receiver-amount`.

## Request flow

1. Team Builder opens a player-specific modal. Discovery uses the parent's existing league/team/player state.
2. `GET /api/trade-inventory?leagueId=...` reads public Sleeper league, rosters, drafts and traded picks without caching. Dynasty picks cover the next three drafts. FAAB availability comes from league budget minus roster spending; unsupported/missing values are unavailable.
3. Users choose a player or pick, customize both sides, then review an explicit named offer.
4. `POST /api/sleeper/actions` authenticates the app user, restores the stored token, verifies Sleeper identity and roster ownership, and re-reads pick/FAAB ownership before the fixed mutation. No arbitrary GraphQL is accepted from the client.
5. A transaction ID is required for success. The UI locks the send button after an attempt and never retries a mutation automatically. Ambiguous responses direct the user to check Sleeper.

Saved scenarios remain hypothetical. Sending an offer does not mark it accepted or change the scenario roster. The current UI supports two-team offers; it does not execute multi-team trades.

## Verification

Automated tests cover pick identity/transfers, stale and duplicate picks, budget limits, FAAB-only payloads, format-aware player matches, and existing player authorization. No real player or pick trade was sent during testing. Browser send requires a valid signed-in connection and ownership of the selected team.
