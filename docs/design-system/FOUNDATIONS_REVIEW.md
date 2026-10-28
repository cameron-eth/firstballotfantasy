# Foundations + Standings: review against the Map

This is the rollout gate in [UI_REMEDIATION_PLAN.md](UI_REMEDIATION_PLAN.md): foundations plus one representative page (Standings), compared with the Team Builder map before anything else is migrated.

Screenshots were taken at 1400×900 and 375×812 with the same league and session.
- Before: `docs/screenshots/ui-audit/before/`
- After: `docs/screenshots/ui-audit/after/`

## What landed

**Foundations**
- **Semantic color tokens** in `firstballot/app/globals.css`, exposed in `firstballot/tailwind.config.ts`: `action`, `value`, `elite`, `production`, `positive`, `negative`, `warning`, `cold`, `pick`, `surface`, `raised`, `overlay`, `line`.
- **Primary is blue.** `--primary` and `--ring` are now the action blue (decision 1), and `--muted-foreground` is moved onto the slate ramp.
- **The font is fixed.** `fontFamily.sans` now uses Inter. Before, the computed body font was `system-ui` even though Inter was loaded. After, it is `Inter`.
- **Type and size tokens:** the text tokens `text-2xs` (11px floor) and `text-badge` (10px), radius `card` / `card-inner`, shadows `card` / `overlay`, and `max-w-app`.
- **`firstballot/lib/design/tones.ts`** is the single home for class recipes: tier tones, value and production, hot and cold, pick states, selected row, the grade, rank and probability scales, and `chartTheme`. `Badge.tsx` now reads its tones from here.
- **Tailwind now scans `lib/`.** This fixes a latent bug: class strings defined in `lib/` (`players.ts`, `scouting-grade-tier.ts`, `trade-utils.ts`) were never generated unless a component happened to repeat them.

**Shared pieces** (first users are on Standings)
- `components/ui/section-header.tsx`: `SectionHeader`, in sentence case with no eyebrow label.
- `components/ui/segmented-control.tsx`: `SegmentedControl`, with the action-tint active state, hover and focus.
- `components/ui/table.tsx`: `numeric` and `sticky` cell options, plus `region` and `containerClassName` on `Table`.
- `components/league-buddy/ui/PickChip.tsx`: a violet chip with a ticket glyph (decision 2).
- `components/league-buddy/ui/TeamIdentity.tsx`: avatar, team name, owner and tag.
- `GradeBadge` in `league-buddy/ui/Badge.tsx`.

**Standings** (`components/league-buddy/LeagueStandingsSection.tsx`). The data logic is unchanged.
- **Grouped columns:** Season, Race to 1.01, Projection and Outlook.
- **Numbers** are right-aligned and tabular.
- **Sorting:** the active sort column is highlighted in white semibold. Secondary columns (MaxPF, Gap, projected MaxPF) step down to slate-400.
- **Team column:** a sticky avatar, name and owner column with an edge line, so on a phone the team stays put while the numbers scroll.
- **Selected team:** an action-tint row, a 3px accent and a "Viewing" tag. It used to be a faint blue wash and 10px text.
- **Slots** are `PickChip`s, grades are `GradeBadge`s, and playoff odds use the probability scale: 50% and up positive, under 10% negative.

## Compared with the Map

| Map trait | Standings now | Gap |
|---|---|---|
| Sans, `tabular-nums` numbers, no mono | Yes | — |
| Badge recipe: tinted fill + hairline, 10px semibold | Grade, pick chip and "Viewing" tag all use it | — |
| One meaning per color | Grade gold/green/rose, picks violet, selection blue, odds positive/negative | Amber still appears on A grades and on value, both "meaningful tier/value" per decision 1 |
| Images carry identity | Owner avatars | The map's player faces have no team-level equivalent; avatars are the closest |
| Tight slate ramp, quiet secondary text | White / slate-200 / slate-400 / slate-500 | — |
| Density | 12 rows fit at 1400×900 with owner names | Extra width spreads between Slot and Gap; fixed column widths would tighten it |

**Team Builder after the font change:** the layout, cards, truncation and badges are unchanged; only the glyphs differ (Inter vs SF). Compare `after/team-builder-desktop.jpg` with `before/team-builder-desktop.jpg`.

**Side effects of the global token change to check before migrating further:**
- **Scouting draft board:** `Save changes` and the rank cells (`text-primary` / `bg-primary`) are now blue instead of amber (`after/scouting-draft-board-desktop.jpg`). That's intended by decision 1, but the rank cells are decoration rather than actions, so they should move to a neutral tone when the draft board is migrated.
- **Other `*-primary` uses:** 70 in total, mostly in scouting and the old `/draft-board` and `/prospect-board` pages. They turn blue as well.
- **`lib/` classes now generate,** so any colors defined there start rendering where they were silently missing.

## Before migrating the next surface

1. Decide whether the Map's builder summary bar (`2027 picks` row) should switch to `PickChip` now, or wait for the Picks tab.
2. Fixed column widths for Standings, if the extra space bothers you at wide screens.
3. Next surface by impact: **Overview** (P1/P2), then the new **Picks tab** (P4).
