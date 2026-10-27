# UI updates

Screenshots of shipped UI changes. Add new entries at the top. See `AGENTS.md`: PRs that change
what a user sees include images.

All captured on production, signed in, desktop width (1440x900), The Meat Market league, 2027 view.

## Team Builder: map-first layout, team strip, tier tags, hot markers
The page header now has **Refresh data**. A slim strip pinned to the top of the map shows team
state, core age, record, picks and 2027 pick chips. Cards carry a tier tag at the bottom-left
(opposite the position rank) and a 🔥 badge in the top-right with a green border for players up
500+ KTC in 30 days. Each card has an "Include in a trade" checkbox.

![Team Builder header, strip and cards](screenshots/team-builder-top.jpg)

![Team Builder cards after KTC values load](screenshots/team-builder-cards.png)

## Pick chips: tooltip
Hovering a pick chip shows the app-styled tooltip (slate panel, arrow) instead of the browser's
native one.

![Pick chip tooltip](screenshots/pick-tooltip.png)

## Pick panel: assign a prospect
Clicking a pick opens a panel to search that draft class and pair a prospect with the pick.

![Pick panel, Assign a prospect tab](screenshots/pick-panel-assign.jpg)

## Pick panel: trade ideas
Players near the pick's KTC benchmark, each with "Review & send".

![Pick panel, Trade ideas tab](screenshots/pick-panel-trade-ideas.jpg)

## Multi-select players for trade opportunities
Tick "Include in a trade" on several cards; a bar appears with "See trade opportunities".

![Selection bar with two players selected](screenshots/multi-select-bar.jpg)

The drawer shows ideas for the combined KTC value of the selected players.

![Trade 2 players together drawer](screenshots/multi-select-trade-drawer.jpg)

## Landing: Team Builder preview shows player photos
Each example card loads a real headshot through `/api/player-image` (cached, resized).

![Landing page Team Builder preview with player photos](screenshots/landing-team-builder-preview.jpg)

_Logged out._

## Not captured
- "Consider trading" panel: no player on this roster currently meets a trade-signal rule.
- My Team roster table.
