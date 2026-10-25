# PR #32 workstream checklist

## Included

- Desktop-only Team Builder; smaller/touch viewports default to Overview and direct Builder links explain desktop availability.
- Map-first desktop dashboard, shared position-colored player cards, KTC value, one shared bench/prospect pool, league-setting starter slots and no duplicated starters.
- Planning horizons, draft-pick ownership, projected MaxPF slots and funding suggestions when a target exceeds available capital. Hypothetical acquisitions and pending targets remain distinct from live ownership.
- Floating trade suggestion cards, cycling and multi-asset review, final confirmation before any send. No real trade/lineup mutations used in verification.
- Unified standings table with record, PF, MaxPF, draft positions, playoff odds and grade; compact power ranking cards; obsolete Stat Management removed.
- History defaults to all past classes, grade descending and nulls last; no dead Scout buttons or standalone analytics charts. Five-bar career outcomes use archived rookie ADP and comparable elapsed-career production.
- Pinch zoom uses requestAnimationFrame + a single transform; no state updates on gesture frames. Stable scroll dimensions and center spacing; shared bench wraps within starter width. A temporary 30-card test processed 90 synthetic wheel/pinch events with one React render after settling. This measures render behavior, not hardware trackpad latency.
- Current-season ESPN actual PPR FPPG replaces unscoped database statistics. Positional ranks use the whole NFL pool, not just rostered players, with one-game minimum and shared tie ranks. Ranked badge appears at the player's shoulder.

## Evidence and boundaries

- TypeScript, React Doctor and 114 tests pass; production build passes.
- Public live league verified: Walker 27.6 FPPG / RB2 (5 GP); Olave 17.8 / WR7 (7 GP) in 2026 at verification. These values change with games/stat corrections.
- History: 881 historical player profiles; 377 matched ADP identities in the supporting dataset. Missing ADP/identity and sparse historical cohorts remain neutral. 2024/2026 ADP archive coverage is absent; no fabricated outcomes.
- Actual FPPG is explicitly standard PPR. Weekly projections retain league-specific scoring. Rank includes players with at least one game and is not a minimum-games qualified leaderboard.
- ESPN normalization is cached server-side for 15 minutes; current season comes from Sleeper state. ID mappings are persisted and versioned, because many current Sleeper records have null ESPN IDs.
- Read-only API/browser verification only. Temporary review and zoom stress pages are removed before commit.
- README/data architecture audit follows in a separate documentation PR based on this branch.
