# Sleeper API Skill: Granular Dynasty League Trade, Draft Pick, and Player Acquisition Analysis

## Purpose

This skill is for deeply analyzing Sleeper leagues at the league, roster, player, and pick level. It is optimized for dynasty workflows where a user wants to answer questions such as:

* What trades happened in this league, and what exactly changed hands?
* Which roster currently owns each future pick?
* Which manager originally drafted a player?
* What draft slot and pick number were used to draft that player?
* Was the player acquired via startup draft, rookie draft, trade, waiver, or free agency?
* Which picks did a roster send away or receive over time?
* What is the chain of custody for a specific future pick?
* What did a current roster pay to acquire a specific player?
* How has a team’s draft capital changed from original ownership to current ownership?

This skill should prioritize lineage, transaction reconstruction, and exact provenance over surface-level league summaries.

---

## Core Operating Principle

Never answer from a single endpoint when the user is asking a granular ownership or acquisition question.

Instead, reconstruct state from multiple Sleeper objects:

1. **League metadata**
2. **League users**
3. **League rosters**
4. **League drafts**
5. **Draft details**
6. **Draft picks**
7. **League transactions by week**
8. **League traded picks**
9. **Player metadata map**

Granular Sleeper answers come from joining these resources correctly.

---

## What This Skill Must Be Excellent At

### 1. League-level trade reconstruction

Given a league, reconstruct:

* every completed trade
* rosters involved
* users involved
* players added/dropped in the deal
* draft picks moved
* FAAB moved
* transaction timing
* directionality of assets

### 2. Draft pick ownership modeling

For any league and season:

* identify original owner of each pick
* identify current owner of each pick
* identify previous owner in latest transfer
* show where a pick moved via trades
* distinguish between league-level future picks and actual draft selections once a draft occurs

### 3. Player acquisition lineage

For any player on any roster:

* determine whether the player was drafted, traded for, added off waivers, or added as free agent
* identify the original draft used to acquire him if applicable
* identify round, pick number, draft slot, roster_id, and picked_by user_id
* identify subsequent transactions involving that player

### 4. “When was this player drafted and by whom?”

Given a player and league:

* search all relevant league drafts
* find matching pick record(s)
* map pick to roster and user
* return round, pick_no, overall selection, draft_id, and season
* explain if the player was drafted in startup, rookie, dispersal, or a later draft if inferable

### 5. “Which pick was used to get this player?”

This must support two meanings:

* **draft acquisition**: the literal draft pick used to select the player
* **trade acquisition**: the package or pick(s) later exchanged to acquire the player

The skill should clarify this distinction in its own reasoning and output, even if the user does not phrase it precisely.

### 6. Roster asset archaeology

For a roster, reconstruct:

* current players
* future draft picks owned
* traded-away original picks
* incoming picks from other rosters
* key historical trades
* which core players were self-drafted vs acquired externally

---

## Sleeper Data Model the Skill Must Understand

### Entity hierarchy

* **User**: person account on Sleeper
* **League**: competition container
* **Roster**: team slot inside a league
* **Draft**: one draft event tied to a league
* **Pick**: individual selection in a draft
* **Transaction**: trade, waiver, or free-agent move
* **Traded pick record**: ownership state for future picks

### Critical mappings

The skill must constantly map across these IDs:

* `user_id` → Sleeper account / manager
* `roster_id` → team slot in a league
* `league_id` → league container
* `draft_id` → specific draft event
* `player_id` → player identity

### Important conceptual distinction

`user_id` and `roster_id` are not interchangeable.

A draft pick can identify:

* `picked_by` = user_id
* `roster_id` = roster receiving that pick

A trade usually references:

* `roster_ids`
* `draft_picks[].owner_id`
* `draft_picks[].previous_owner_id`
* `draft_picks[].roster_id` (original owner)

If you confuse user IDs with roster IDs, your answers will be wrong.

---

## Canonical Endpoint Usage Strategy

### A. Resolve identity first

Use:

* `GET /v1/user/<username or user_id>`

Use this to normalize the user to `user_id` because usernames can change.

### B. Enumerate leagues for a user-season when needed

Use:

* `GET /v1/user/<user_id>/leagues/nfl/<season>`

Use this when the user asks questions like:

* my leagues in 2025
* all dynasty leagues I’m in
* find the league where I drafted X

### C. Pull league context

Use:

* `GET /v1/league/<league_id>`
* `GET /v1/league/<league_id>/users`
* `GET /v1/league/<league_id>/rosters`

These three form the base join layer.

### D. Pull draft context

Use:

* `GET /v1/league/<league_id>/drafts`
* `GET /v1/draft/<draft_id>`
* `GET /v1/draft/<draft_id>/picks`
* `GET /v1/draft/<draft_id>/traded_picks`

### E. Pull transaction context

Use:

* `GET /v1/league/<league_id>/transactions/<week>`
* `GET /v1/league/<league_id>/traded_picks`

### F. Player name resolution

Use sparingly and cache:

* `GET /v1/players/nfl`

This should normally be loaded once and stored locally because it is large.

---

## Preferred Query Workflows

## Workflow 1: “Who owns what picks in this league?”

### Required endpoints

* league
* rosters
* users
* league traded picks

### Method

1. Pull league users and rosters.
2. Build `roster_id -> manager/team` mapping.
3. Pull `traded_picks`.
4. Generate baseline pick inventory for every roster for each future season/round you care about.
5. Apply traded pick ownership overrides.
6. Return both:

   * current owner
   * original owner

### Output shape

For each pick:

* season
* round
* original roster
* current roster
* previous owner
* whether the pick has moved

### Important nuance

If a pick does not appear in `traded_picks`, assume original owner still owns it.

---

## Workflow 2: “When was this player drafted in this league?”

### Required endpoints

* league drafts
* each draft’s picks
* draft details
* users/rosters
* cached players map if needed

### Method

1. Pull all drafts for the league.
2. Search all pick records for the target `player_id`.
3. If multiple matches exist, sort by draft season/date and explain context.
4. Map `roster_id` and `picked_by` to manager/team.
5. Return:

   * draft season
   * draft_id
   * round
   * pick_no
   * overall if inferable from ordering
   * roster/team
   * user/manager
   * startup vs later league draft if inferable from draft ordering and dates

### Important nuance

Dynasty leagues may have multiple drafts. The first league draft is often startup, later drafts are often rookie drafts. Do not assume. Infer carefully from season, created date, and draft ordering.

---

## Workflow 3: “What pick was used to get this player?”

### Interpretation logic

The skill must determine whether the user means:

#### A. Draft-origin question

“What selection was used to draft him?”
Use draft picks endpoint.

#### B. Trade-cost question

“What assets were paid to acquire him?”
Use transactions endpoint and reconstruct incoming trade where player changed rosters.

### Response format

Always separate these concepts explicitly:

* **Drafted with:** Round X, Pick Y
* **Later acquired for:** Player A + 2027 2nd + FAAB, etc.

---

## Workflow 4: “Show me all trades in this league”

### Required endpoints

* rosters
* users
* transactions for each relevant week

### Method

1. Iterate through all relevant weeks/legs.
2. Pull `/transactions/<week>` for each.
3. Keep only completed trades.
4. Normalize asset movement into directional packages:

   * roster A sent
   * roster A received
   * roster B sent
   * roster B received
5. Expand player IDs to names where possible.
6. Expand draft pick payloads into human-readable pick labels.
7. Include timestamp and creator when useful.

### Key rule

Do not just dump raw transaction JSON. Reconstruct the trade into a manager-readable summary.

---

## Workflow 5: “Who originally owned this future pick?”

### Required endpoints

* rosters
* users
* traded_picks or draft traded picks

### Method

Use the pick record:

* `roster_id` = original owner
* `previous_owner_id` = owner before latest movement
* `owner_id` = current owner

### Output must include

* original owner
* current owner
* last transfer source
* season/round

### Important nuance

The word “roster_id” inside traded pick records refers to original ownership, not necessarily current ownership.

---

## Workflow 6: “How did this roster build its team?”

### Required endpoints

* rosters
* users
* league drafts + picks
* transactions by week
* players map

### Method

For each current player on the roster:

1. Check if player was drafted in a league draft by this roster.
2. If not, search transactions to find when the player arrived.
3. Label acquisition method:

   * startup drafted
   * rookie drafted
   * acquired via trade
   * waiver add
   * free agent add
4. Capture supporting details.

### Output example categories

* Homegrown assets
* Trade acquisitions
* Waiver/free agent adds
* Orphan inheritance / existing roster carryover if lineage cannot be fully reconstructed from available Sleeper data

---

## Join Logic the Skill Must Follow

## Join 1: roster to manager

Join `rosters.owner_id` to `users.user_id`.
Also use `users.metadata.team_name` when available.

### Recommended resolved object

```json
{
  "roster_id": 3,
  "owner_id": "188815879448829952",
  "display_name": "Cameron",
  "username": "camfleety",
  "team_name": "First Ballot Dynasty"
}
```

## Join 2: draft slot to roster

From draft details:

* `slot_to_roster_id[draft_slot] -> roster_id`

This is critical when you want to connect draft board slots to actual teams.

## Join 3: pick to player

Use:

* `pick.player_id`
* `pick.metadata.first_name`
* `pick.metadata.last_name`
* cached `/players/nfl` fallback

## Join 4: transaction player movement

In transactions:

* `adds[player_id] = roster_id`
* `drops[player_id] = roster_id`

For trades, players may appear in `adds`/`drops` combinations depending on event representation. Always normalize by player and destination roster.

## Join 5: traded pick movement

For each traded pick item:

* `roster_id` = original owner
* `previous_owner_id` = prior holder entering this transaction state
* `owner_id` = current holder after this move

---

## Data Structures This Skill Should Build Internally

## 1. Roster map

```python
roster_map = {
  1: {
    "roster_id": 1,
    "owner_id": "1888...",
    "display_name": "Cameron",
    "username": "camfleety",
    "team_name": "Rantalytics"
  }
}
```

## 2. Player map

```python
player_map = {
  "4034": {"full_name": "CeeDee Lamb", "position": "WR", "team": "DAL"}
}
```

## 3. Draft pick index by player

```python
drafted_player_index = {
  "4034": [
    {
      "league_id": "...",
      "draft_id": "...",
      "season": "2023",
      "round": 1,
      "pick_no": 4,
      "draft_slot": 4,
      "roster_id": 7,
      "picked_by": "12345"
    }
  ]
}
```

## 4. Current future pick ownership map

```python
future_pick_ownership = {
  ("2027", 2, 5): {
    "season": "2027",
    "round": 2,
    "original_roster_id": 5,
    "current_owner_roster_id": 2,
    "previous_owner_roster_id": 5
  }
}
```

## 5. Transaction ledger

```python
transaction_ledger = [
  {
    "transaction_id": "434852362033561600",
    "type": "trade",
    "week": 4,
    "created": 1558039391576,
    "teams": [2, 1],
    "players_sent": {...},
    "draft_picks_sent": [...],
    "faab_sent": [...]
  }
]
```

---

## Exact Questions This Skill Should Handle

### Trade analysis

* Show me every trade in league `X`
* What did roster 4 send and receive this year?
* Who traded for `Player Name`?
* What was the biggest trade involving future 1sts?
* How many trades has Cameron made in this league?

### Pick ownership analysis

* Who owns my 2027 2nd?
* Which 2026 1sts does roster 3 own?
* Show all current future picks by manager
* Which picks has Cameron traded away?
* Where did this 2028 1st come from?

### Draft-origin analysis

* When was Malik Nabers drafted in this league?
* Who drafted Breece Hall in startup?
* What overall pick was used on Jayden Daniels?
* Which draft slot selected Rome Odunze?
* What round did roster 6 take Brock Bowers?

### Team construction analysis

* Which players on my roster are self-drafted?
* Which players were added off waivers?
* How did this roster acquire all its starters?
* Give me a full acquisition history for this team

### Cross-object questions

* Who owns the pick that originally belonged to Cameron and became Ladd McConkey?
* What did this manager trade away before using that rookie pick?
* Which rookie picks did this roster convert into current players?

---

## Answer Design Rules

## Rule 1: Be explicit about uncertainty

If Sleeper data cannot fully prove a claim, say so.

Examples:

* “I can confirm he was drafted in the 2024 league draft at 1.07 by roster 3.”
* “I can confirm he is currently on roster 5, but I cannot fully prove the intermediate transfer chain because only current pick ownership and logged transactions available for the queried weeks were provided.”

## Rule 2: Distinguish current state from historical state

Always label:

* current owner
* original owner
* prior owner
* drafter
* current roster holder

These are often different.

## Rule 3: Never collapse user and roster identity

Use manager/team labels for readability, but keep roster-level truth internally.

## Rule 4: Prefer reconstructed summaries over raw JSON

The user wants analysis, not payload dumps.

## Rule 5: Preserve asset directionality

Bad summary:

* “Trade between Cameron and Alex involving picks.”

Good summary:

* “Cameron sent: 2027 2nd originally belonging to roster 4, plus Tank Dell. Alex sent: 2026 1st originally belonging to roster 2.”

## Rule 6: For player acquisition, provide both raw and translated forms

Example:

* Raw: `player_id=8155, roster_id=4, round=2, pick_no=3`
* Human: “Rome Odunze was selected by Team X at 2.03.”

---

## Recommended Human-Readable Output Formats

## Format A: Player acquisition card

```text
Player: Rome Odunze
Current Roster: Team Alpha (roster 4)
Draft Origin: 2024 rookie draft
Selected: Round 1, Pick 3 (1.03)
Drafted By: Team Alpha
Picked By User: Cameron
Current Status: Still on original drafting roster
```

## Format B: Future pick ownership card

```text
Pick: 2027 Round 2
Original Owner: Team Beta (roster 6)
Current Owner: Team Alpha (roster 4)
Previous Owner: Team Beta
Status: Traded
```

## Format C: Trade summary

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

## Format D: Roster build breakdown

```text
Team Alpha roster construction
Homegrown:
- Breece Hall (startup 2.04)
- Rome Odunze (rookie 1.03)

Trade Acquisitions:
- Chris Olave (acquired in Week 7 trade from Team Delta)

Waiver / Free Agent Adds:
- Isaiah Likely (free-agent add in Week 2)
```

---

## Deep Reasoning Heuristics

### Heuristic 1: If the user asks about “my picks,” resolve roster first

A user can be in multiple leagues and can have different roster IDs by league.

### Heuristic 2: If the user asks about “the pick used to get him,” answer both draft and trade paths when possible

This is one of the most common ambiguities.

### Heuristic 3: Search all league drafts, not just the most recent one

Dynasty leagues often have multiple drafts.

### Heuristic 4: Use `traded_picks` for current future ownership, not draft picks

Draft picks endpoint is about executed draft selections.

### Heuristic 5: Use transactions for movement of players, not roster snapshots

Rosters show current state only.

### Heuristic 6: Treat absent traded-pick records as “still with original owner”

Do not invent a trade where none exists.

---

## Limits and Caveats the Skill Must Know

1. Sleeper is read-only through this API.
2. Usernames can change; use `user_id` as durable identity.
3. `players/nfl` is large and should be cached.
4. A league can have multiple drafts.
5. Not every draft slot necessarily has a user.
6. Some historical lineage may be incomplete if the analysis window does not include all relevant transaction weeks.
7. Transactions are week-based (`round`/`leg`) and require iterating across the correct time range.
8. Traded pick records show ownership state, but may not alone provide the full sequence of every intermediate transfer unless paired with transactions.
9. Metadata fields can be sparse or inconsistent.
10. Team names often live in user metadata, not roster objects.

---

## Implementation Guidance for an Agent or Analyst

## Minimum viable fetch order for league archaeology

1. Get league
2. Get users
3. Get rosters
4. Get league drafts
5. For each draft:

   * get draft detail
   * get draft picks
6. Get league traded picks
7. Iterate transactions across relevant weeks
8. Resolve player IDs with cached player map

## Caching guidance

Cache aggressively:

* players map: daily
* league users/rosters: per request or short TTL
* draft picks: per draft
* traded picks: per league and refresh on demand

---

## Pseudocode Patterns

## Find when a player was drafted in a league

```python
def find_player_draft_origin(league_id, player_id):
    drafts = get_league_drafts(league_id)
    results = []

    for draft in drafts:
        picks = get_draft_picks(draft["draft_id"])
        for pick in picks:
            if pick.get("player_id") == player_id:
                results.append({
                    "draft_id": draft["draft_id"],
                    "season": draft.get("season"),
                    "round": pick.get("round"),
                    "pick_no": pick.get("pick_no"),
                    "draft_slot": pick.get("draft_slot"),
                    "roster_id": pick.get("roster_id"),
                    "picked_by": pick.get("picked_by")
                })

    return sorted(results, key=lambda x: (x["season"], x["round"], x["pick_no"]))
```

## Build current future-pick ownership

```python
def build_future_pick_ownership(roster_ids, seasons, rounds, traded_picks):
    ownership = {}

    for season in seasons:
        for rnd in rounds:
            for roster_id in roster_ids:
                ownership[(season, rnd, roster_id)] = {
                    "season": season,
                    "round": rnd,
                    "original_roster_id": roster_id,
                    "current_owner_roster_id": roster_id,
                    "previous_owner_roster_id": roster_id,
                    "moved": False
                }

    for tp in traded_picks:
        key = (tp["season"], tp["round"], tp["roster_id"])
        ownership[key] = {
            "season": tp["season"],
            "round": tp["round"],
            "original_roster_id": tp["roster_id"],
            "current_owner_roster_id": tp["owner_id"],
            "previous_owner_roster_id": tp["previous_owner_id"],
            "moved": True
        }

    return ownership
```

## Normalize a trade transaction

```python
def normalize_trade(txn, roster_map, player_map):
    result = {
        "transaction_id": txn["transaction_id"],
        "week": txn.get("leg"),
        "teams": [roster_map[rid] for rid in txn.get("roster_ids", [])],
        "draft_picks": [],
        "faab": txn.get("waiver_budget", []),
        "players_added": []
    }

    for dp in txn.get("draft_picks", []):
        result["draft_picks"].append({
            "season": dp["season"],
            "round": dp["round"],
            "original_roster_id": dp["roster_id"],
            "previous_owner_id": dp["previous_owner_id"],
            "new_owner_id": dp["owner_id"]
        })

    for player_id, dest_roster_id in (txn.get("adds") or {}).items():
        result["players_added"].append({
            "player_id": player_id,
            "player_name": player_map.get(player_id, {}).get("full_name", player_id),
            "destination_roster_id": dest_roster_id
        })

    return result
```

---

## Anti-Patterns This Skill Should Avoid

* Do not assume the most recent draft is the only relevant draft.
* Do not assume roster IDs are stable across leagues.
* Do not assume a player on a roster was drafted by that roster.
* Do not assume `traded_picks` alone gives full trade packages.
* Do not answer “who drafted him” using current roster data.
* Do not call `/players/nfl` repeatedly per request.
* Do not confuse `pick_no` with league-wide overall pick unless you have computed context correctly.
* Do not ignore `slot_to_roster_id` when reconstructing draft board ownership.

---

## Ideal Skill Output Tone

The tone should be analytical, exact, and dynasty-native.

It should sound like someone doing real league forensics, not generic API narration.

Good phrasing examples:

* “That future 2nd is originally Cameron’s pick, but it currently sits with roster 6.”
* “Rome Odunze was selected at 1.03 in the 2024 league draft by Team Alpha.”
* “He is no longer on his original drafting roster, so there’s a draft-origin story and a later acquisition story.”
* “This roster built most of its core through trade, not the startup.”

---

## Final Skill Standard

A strong Sleeper API answer should be able to do all of the following in one response when needed:

* identify the correct league context
* map managers to rosters
* map picks to original and current owners
* map players to draft origin
* reconstruct trades in human terms
* explain ambiguity clearly
* separate current ownership from historical acquisition

If the user asks a granular dynasty question, this skill should think like a commissioner, league historian, and data engineer at the same time.
