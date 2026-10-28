# UI updates

Screenshots of shipped UI changes. Add new entries at the top. See `AGENTS.md`: PRs that change
what a user sees include images.

All captured on production, signed in, desktop width (1440x900), The Meat Market league, 2027 view.

## My Team redesign (hero, starting lineup rail, headshot rows)
One badge system (position hue, tier gold/green/rose, 🔥/❄️ at +/-500 KTC), a hero band with the roster's
highest-value faces, the starting lineup as the same cards used on the map, and slim headshot-first rows.
Captured on localhost against production data, The Meat Market league, 1280x900.

![My Team hero and starting lineup](screenshots/my-team-hero-lineup.jpg)

![My Team roster rows](screenshots/my-team-roster-rows.jpg)

## Activate team screen
A glass call-to-action over a blurred preview of the real Team Builder, with three reasons to activate.

![Activate team, desktop](screenshots/activate-team-desktop.jpg)

![Activate team, mobile](screenshots/activate-team-mobile.jpg)

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
