# UI updates

Screenshots of shipped UI changes. Add new entries at the top. See `AGENTS.md`: PRs that change
what a user sees include images.

## Landing: Team Builder preview shows player photos
Each example card now loads a real headshot through `/api/player-image` (cached, resized) instead
of "Photo unavailable".

![Landing page Team Builder preview with player photos](screenshots/landing-team-builder-preview.jpg)

_Captured on production, logged out, desktop width (1440x900)._

## Pending captures (need a signed-in session with a connected league)
- Team Builder cards: tier border, "Elite WR1"-style tag opposite the position rank, 🔥/❄️ corner badge, "Consider trading" panel
- Team Builder map: pinned team strip and pick chips
- Pick chip tooltip, pick panel (assign a prospect, trade ideas), multi-select bar
- My Team: "Refresh data" button
