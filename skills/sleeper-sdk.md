# Sleeper Dynasty SDK: Supercharged Forensic Edition

## Purpose

This SDK spec is designed for **deep dynasty league forensics** on Sleeper.

It is optimized for questions like:

- What exact assets moved in each trade?
- Who currently owns each future pick, and who originally owned it?
- Which draft selection was used to take a player?
- Was a player self-drafted, traded-for, waivered, or FA-added?
- What is the full chain of custody for a pick or player?

The emphasis is lineage and reconstruction, not just endpoint summaries.

---

## Core Principle

Never answer granular dynasty questions from one endpoint.

Always reconstruct from joined layers:

1. User
2. League
3. Rosters
4. League users
5. Drafts
6. Draft picks
7. Weekly transactions
8. Traded picks
9. Player metadata map

If `user_id`, `roster_id`, and `league_id` are not joined correctly, answers will be wrong.

---

## Non-Negotiable Data Rules

- `user_id` is a manager identity.
- `roster_id` is a team slot identity.
- They are **not interchangeable**.
- In traded pick records:
  - `roster_id` = original owner
  - `previous_owner_id` = prior holder
  - `owner_id` = current holder
- If a pick does not appear in `traded_picks`, assume original owner still owns it.

---

## Canonical Endpoint Plan

### Identity and league discovery

- `GET /v1/user/<username_or_user_id>`
- `GET /v1/user/<user_id>/leagues/nfl/<season>`
- `GET /v1/state/nfl`

### League context

- `GET /v1/league/<league_id>`
- `GET /v1/league/<league_id>/users`
- `GET /v1/league/<league_id>/rosters`

### Draft context

- `GET /v1/league/<league_id>/drafts`
- `GET /v1/draft/<draft_id>`
- `GET /v1/draft/<draft_id>/picks`
- `GET /v1/draft/<draft_id>/traded_picks`

### Trade and capital context

- `GET /v1/league/<league_id>/transactions/<week>`
- `GET /v1/league/<league_id>/traded_picks`

### Player resolution

- `GET /v1/players/nfl` (cache aggressively)

---

## SDK Architecture

### Layer 1: transport client

- Handles endpoint calls, errors, retries, and request-level telemetry.
- No business logic.

### Layer 2: domain SDK

- Cross-season league chains
- Trade normalization
- Pick ownership state
- Player draft history
- Acquisition lineage

### Layer 3: forensic analytics

- Pick chain of custody
- Team build decomposition
- Trade counterparty graph
- Player acquisition history

---

## TypeScript SDK (reference implementation)

```ts
export type Sport = 'nfl'

type Fetcher = typeof fetch

export interface SleeperUser {
  user_id: string
  username: string
  display_name?: string
  avatar?: string
}

export interface SleeperLeague {
  league_id: string
  name: string
  season: string
  status: string
  sport: Sport
  previous_league_id?: string
  draft_id?: string
  total_rosters: number
  settings?: Record<string, unknown>
}

export interface SleeperRoster {
  roster_id: number
  owner_id?: string
  league_id: string
  players?: string[]
}

export interface SleeperLeagueUser {
  user_id: string
  username?: string
  display_name?: string
  avatar?: string
  metadata?: { team_name?: string; [key: string]: unknown }
}

export interface SleeperDraft {
  draft_id: string
  league_id?: string
  season: string
  status: string
  type: string
  created?: number
  settings?: Record<string, unknown>
  slot_to_roster_id?: Record<string, number>
}

export interface SleeperDraftPick {
  player_id: string
  picked_by?: string
  roster_id?: string
  round: number
  draft_slot: number
  pick_no: number
  draft_id: string
  metadata?: {
    first_name?: string
    last_name?: string
    team?: string
    position?: string
  }
}

export interface SleeperTradedPick {
  season: string
  round: number
  roster_id: number
  previous_owner_id: number
  owner_id: number
}

export interface SleeperTransaction {
  transaction_id: string
  type: 'trade' | 'free_agent' | 'waiver' | string
  status: string
  roster_ids: number[]
  creator?: string
  created?: number
  leg?: number
  draft_picks?: SleeperTradedPick[]
  waiver_budget?: { sender: number; receiver: number; amount: number }[]
  adds?: Record<string, number> | null
  drops?: Record<string, number> | null
}

export class SleeperClient {
  constructor(
    private readonly baseUrl = 'https://api.sleeper.app/v1',
    private readonly fetcher: Fetcher = fetch
  ) {}

  private async get<T>(path: string): Promise<T> {
    const res = await this.fetcher(`${this.baseUrl}${path}`)
    if (!res.ok) throw new Error(`Sleeper API error ${res.status} for ${path}`)
    return (await res.json()) as T
  }

  getUser = (usernameOrUserId: string) => this.get<SleeperUser>(`/user/${usernameOrUserId}`)
  getState = () => this.get<{ week: number; season: string; display_week: number }>(`/state/nfl`)

  getUserLeagues = (userId: string, season: number | string) =>
    this.get<SleeperLeague[]>(`/user/${userId}/leagues/nfl/${season}`)

  getLeague = (leagueId: string) => this.get<SleeperLeague>(`/league/${leagueId}`)
  getLeagueUsers = (leagueId: string) => this.get<SleeperLeagueUser[]>(`/league/${leagueId}/users`)
  getLeagueRosters = (leagueId: string) => this.get<SleeperRoster[]>(`/league/${leagueId}/rosters`)
  getLeagueDrafts = (leagueId: string) => this.get<SleeperDraft[]>(`/league/${leagueId}/drafts`)

  getDraft = (draftId: string) => this.get<SleeperDraft>(`/draft/${draftId}`)
  getDraftPicks = (draftId: string) => this.get<SleeperDraftPick[]>(`/draft/${draftId}/picks`)

  getTransactions = (leagueId: string, week: number) =>
    this.get<SleeperTransaction[]>(`/league/${leagueId}/transactions/${week}`)

  getLeagueTradedPicks = (leagueId: string) =>
    this.get<SleeperTradedPick[]>(`/league/${leagueId}/traded_picks`)
}

export class SleeperDynastySDK {
  constructor(private readonly client: SleeperClient) {}

  async getLeaguesAcrossSeasons(userId: string, startSeason: number, endSeason: number) {
    const seasons = Array.from({ length: endSeason - startSeason + 1 }, (_, i) => startSeason + i)
    const rows = await Promise.all(seasons.map((season) => this.client.getUserLeagues(userId, season)))
    return rows.flat()
  }

  async getCrossSeasonLeagueChain(
    userId: string,
    startSeason: number,
    endSeason: number,
    leagueName?: string
  ) {
    const leagues = await this.getLeaguesAcrossSeasons(userId, startSeason, endSeason)
    const filtered = leagueName
      ? leagues.filter((l) => l.name.toLowerCase() === leagueName.toLowerCase())
      : leagues

    return filtered
      .map((l) => ({
        league_id: l.league_id,
        season: l.season,
        name: l.name,
        previous_league_id: l.previous_league_id,
      }))
      .sort((a, b) => Number(a.season) - Number(b.season))
  }

  async getAllTradesForLeague(leagueId: string, maxWeek = 20) {
    const league = await this.client.getLeague(leagueId)
    const weekRange = Array.from({ length: maxWeek + 1 }, (_, i) => i) // include week 0
    const weekly = await Promise.all(weekRange.map((week) => this.client.getTransactions(leagueId, week)))

    return weekly
      .flat()
      .filter((tx) => tx.type === 'trade' && tx.status === 'complete')
      .map((tx) => ({
        league_id: leagueId,
        season: league.season,
        week: tx.leg ?? -1,
        transaction_id: tx.transaction_id,
        created: tx.created,
        creator: tx.creator,
        roster_ids: tx.roster_ids ?? [],
        draft_picks: tx.draft_picks ?? [],
        waiver_budget: tx.waiver_budget ?? [],
        adds: tx.adds ?? {},
        drops: tx.drops ?? {},
      }))
      .sort((a, b) => (a.created ?? 0) - (b.created ?? 0))
  }

  async getDraftCapitalState(leagueId: string) {
    const [league, tradedPicks] = await Promise.all([
      this.client.getLeague(leagueId),
      this.client.getLeagueTradedPicks(leagueId),
    ])

    return tradedPicks.map((pick) => ({
      league_id: leagueId,
      season: pick.season || league.season,
      round: pick.round,
      original_roster_id: pick.roster_id,
      previous_owner_id: pick.previous_owner_id,
      current_owner_id: pick.owner_id,
    }))
  }

  async getDraftSelectionsForLeague(leagueId: string) {
    const drafts = await this.client.getLeagueDrafts(leagueId)
    const selectionSets = await Promise.all(
      drafts.map(async (draft) => {
        const picks = await this.client.getDraftPicks(draft.draft_id)
        return picks.map((pick) => ({
          player_id: pick.player_id,
          season: draft.season,
          league_id: draft.league_id,
          draft_id: draft.draft_id,
          roster_id: pick.roster_id ? Number(pick.roster_id) : undefined,
          picked_by: pick.picked_by,
          round: pick.round,
          pick_no: pick.pick_no,
          draft_slot: pick.draft_slot,
          first_name: pick.metadata?.first_name,
          last_name: pick.metadata?.last_name,
          position: pick.metadata?.position,
          team: pick.metadata?.team,
        }))
      })
    )

    return selectionSets.flat()
  }
}
```

---

## Required Internal Indices

Build these every run:

- `roster_map`: `roster_id -> manager/team labels`
- `user_map`: `user_id -> manager labels`
- `player_map`: `player_id -> normalized player object`
- `drafted_player_index`: `player_id -> list of draft selection records`
- `future_pick_ownership`: `(season, round, original_roster_id) -> ownership state`
- `transaction_ledger`: normalized directional asset movement

---

## Workflow Playbooks

### 1) All trades in a league

1. Fetch users, rosters, transactions by week (`0..20`).
2. Keep completed trades.
3. Normalize directional assets:
   - players sent/received
   - picks sent/received
   - FAAB sent/received
4. Return human-readable summaries, not raw transaction JSON.

### 2) Future pick ownership matrix

1. Build baseline ownership from roster originals.
2. Apply `traded_picks` overrides.
3. Output original owner, current owner, previous owner, moved flag.

### 3) Player draft origin

1. Iterate all league drafts.
2. Scan all draft picks for matching `player_id`.
3. Return season, draft, round, `pick_no`, slot, `roster_id`, `picked_by`.
4. Map `picked_by` and `roster_id` to manager/team labels.

### 4) “What pick got this player?” disambiguation

Always split answer into:

- **Draft-origin pick** (literal draft selection)
- **Trade acquisition cost** (later asset package paid)

### 5) Team construction archaeology

For each current roster player:

1. Check if drafted by current roster in league drafts.
2. Else scan transactions to find inbound event.
3. Label as startup/rookie drafted, trade, waiver, or free agent.

---

## Output Contracts

### Player acquisition card

```text
Player: Rome Odunze
Current Roster: Team Alpha (roster 4)
Draft Origin: 2024 rookie draft
Selected: Round 1, Pick 3 (1.03)
Drafted By: Team Alpha
Picked By User: Cameron
Current Status: Still on original drafting roster
```

### Future pick ownership card

```text
Pick: 2027 Round 2
Original Owner: Team Beta (roster 6)
Current Owner: Team Alpha (roster 4)
Previous Owner: Team Beta
Status: Traded
```

### Trade summary card

```text
Week 5 Trade
Teams: Team Alpha and Team Beta
Team Alpha Sent:
- Tank Dell
- 2027 2nd (originally Team Alpha)

Team Alpha Received:
- Jordan Addison
- 2026 3rd (originally Team Beta)

Completed: 2025-10-03 8:14 PM ET
```

---

## Anti-Patterns to Avoid

- Do not use current rosters to answer “who drafted him”.
- Do not treat `user_id` and `roster_id` as interchangeable.
- Do not assume only the latest draft matters.
- Do not rely on `traded_picks` alone for event history.
- Do not iterate only current NFL week for transactions when doing dynasty history.
- Do not re-fetch `/players/nfl` repeatedly per request.

---

## Caching and performance guidance

- Cache `/players/nfl` daily (or versioned snapshot).
- Cache drafts/picks by `draft_id`.
- Cache league users/rosters short TTL.
- Cache traded picks per league short TTL with manual refresh hook.
- Fetch transactions in batches; include week 0 and full season window for forensics.

---

## Suggested package layout

```text
src/
  client.ts
  types.ts
  sdk/
    leagues.ts
    drafts.ts
    trades.ts
    capital.ts
    analytics.ts
  index.ts
```

`index.ts` exports:

```ts
export * from './client'
export * from './types'
export * from './sdk/leagues'
export * from './sdk/drafts'
export * from './sdk/trades'
export * from './sdk/capital'
export * from './sdk/analytics'
```

---

## Trade Dashboard Design Blueprint

This SDK should be the backend contract for the trade dashboard.

### Product goal

Build a dashboard that answers three classes of manager questions in one place:

- **Trade quality**: Who won each deal and by how much value?
- **Capital control**: Who owns each future pick now vs originally?
- **Acquisition lineage**: How did each core player get onto a roster?

### Dashboard modules and SDK mapping

1. **Trade Tape (timeline)**
   - Data source: `getAllTradesForLeague(leagueId, 20)`
   - UI: chronological cards with directional assets (sent/received per roster)
   - Must show players, picks, FAAB, timestamp, and counterparty

2. **Trade Grades and Market Table**
   - Data source: normalized trades + `analytics.ts` aggregations
   - UI: per-roster KPIs (total value gained, avg value/trade, win rate, market share)
   - Include filter chips: season, week range, roster, asset type

3. **Future Pick Ownership Matrix**
   - Data source: `getDraftCapitalState(leagueId)` plus baseline ownership map
   - UI: matrix by season x round, grouped by current owner
   - Each pick cell reveals original owner, previous owner, current owner, move status

4. **Pick Lineage Drilldown**
   - Data source: traded picks + transaction ledger chain
   - UI: event timeline for one selected pick (`2027 2nd originally roster 5`)
   - Shows each transfer edge until current owner

5. **Player Origin and Acquisition**
   - Data source: `getDraftSelectionsForLeague(leagueId)` + transaction scan
   - UI: player card with:
     - draft origin (round/pick/season, drafted by)
     - current holder
     - acquisition method (self-drafted, trade, waiver, FA)

6. **Counterparty Network**
   - Data source: `getRosterTradeCounterparties(leagueId, rosterId)`
   - UI: graph/table of frequent trade partners and net flow

### Backend route contract (recommended)

- `GET /api/trade-dashboard?leagueId=<id>`
  - returns:
    - `teams`
    - `normalizedTrades`
    - `traderStats`
    - `pickOwnership`
    - `playerOrigins` (optional lazy-loaded)
    - `lastUpdated`

Prefer one aggregated route for initial render and separate drilldown routes for heavy lineage calls.

### Refresh and caching strategy

- Refresh cadence:
  - transactions/trades: short TTL
  - traded picks: short TTL
  - users/rosters: medium TTL
  - players map: daily snapshot
- Always fetch **week 0 through full season window** for dynasty trade history.
- Add manual “refresh league data” trigger for commissioner workflows.

### Frontend interaction model

- Primary table: roster-level market performance
- Secondary panels: trade tape + pick matrix
- Drilldowns open drawer/modal for:
  - single trade details
  - single pick lineage
  - single player acquisition history

### Rollout order

1. Ship aggregated trade tape + roster grades
2. Add pick ownership matrix
3. Add pick lineage drilldown
4. Add player acquisition lineage
5. Add counterparty network and advanced filters

---

## Final standard

A complete SDK answer should be able to:

- resolve correct league context
- map manager identity to roster identity
- reconstruct trade asset directionality
- provide current and original pick ownership
- identify player draft origin exactly
- separate historical acquisition from current ownership
- clearly state uncertainty when data does not prove a claim

This is commissioner-grade, historian-grade, and data-engineering-grade Sleeper analysis.
