# UI remediation plan

This plan depends on [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) (the target) and [UI_AUDIT.md](UI_AUDIT.md) (the evidence). Each phase is one or more PRs. Every PR includes before and after screenshots at **1400×900 and 375×812** in its body, using the same routes as `docs/screenshots/ui-audit/before/`.

**Key**
- **Priority:** P0 blocks the rest, P1 is high user impact, P2 is polish.
- **Complexity:** S < ½ day, M ≈ 1 day, L = 2+ days.
- **Risk** is the visual regression risk.

---

## Quick wins (independent, can ship first)

Each is a small, low-risk PR that doesn't wait on tokens.

| # | Surface | Fix | File(s) | Cx | Risk |
|---|---|---|---|---|---|
| Q1 | Standings | Right-align numeric columns with `tabular-nums`; stronger selected row (left accent, semibold) | `LeagueStandingsSection.tsx:78-79,143` | S | Low |
| Q2 | Standings | Grade → `Badge tone={gradeTone()}` | `LeagueStandingsSection.tsx:175` | S | Low |
| Q3 | Overview | Fix wrapping identity line (stray `·`) on mobile | `OverviewHeader.tsx` identity row | S | Low |
| Q4 | Trade Intelligence | Buy/Sell section colors by action (Buy `action`, Sell `value`), keeping the price-move arrows | `TradeIntelligencePanel.tsx:221-245` | S | Low |
| Q5 | All | Format-aware value label (`KTC · SF` vs `1QB`) | `RosterSection.tsx:257,430`, `OverviewHeader.tsx:123`, `TradeIntelligencePanel.tsx:147` | S | Low |
| Q6 | Draft Order, Franchise Outlook | Shared column template so headers align with cells | `DraftOrderPanel.tsx:200,272`, `CompetitiveStateMap.tsx:127,160` | S | Low |
| Q7 | Repo | Delete dead `styles/globals.css`, unused CSS utilities, `TeamCard.tsx`, duplicate `use-toast.ts` | — | S | None |
| Q8 | `/scout`, `/prospects` | Fix invalid `h-[calc(100-64px)]` | `app/scout/page.tsx:20`, `app/prospects/page.tsx:20` | S | None |

---

## Phase 1: Tokens and foundations (P0)

| ID | Affected | Problem | Root cause | Correction | Shared implications | Pri | Cx | Risk |
|---|---|---|---|---|---|---|---|---|
| F1 | All | Amber has 6+ meanings; 4 position systems; 3 rank scales | No semantic tokens | Add the semantic CSS vars and Tailwind colors from DESIGN_SYSTEM.md §1; `lib/design/tones.ts` as the class-string map | Badge, charts and franchise states read from it | P0 | M | Low (additive) |
| F2 | All | Inter not applied (confirmed: computed font is system-ui); mono everywhere | `fontFamily` not extended | `fontFamily.sans = var(--font-inter)`; add `text-2xs` and `text-badge` | Global text shift; verify by screenshot | P0 | S | **Med** (every page reflows slightly) |
| F3 | All | 9 radius values, ad-hoc shadows | No scale | Radius tokens (md, lg, xl, card) and `shadow-card` / `shadow-overlay` | PlayerTradingCard tokenized with identical values | P0 | S | Low |
| F4 | All | slate, gray and `muted-foreground` mixed | shadcn tokens don't match the slate ramp | Remap shadcn vars to the slate ramp; add `surface`, `raised`, `overlay`, `line` | Scouting and trade market match with no rewrite | P0 | S | Med |
| F5 | Charts | Hand-copied axis and tooltip hex | No chart theme | `chartTheme` in `tones.ts` | 6 chart files | P1 | S | Low |
| F6 | Shell | Container widths 1280–1800; doubled padding | Per-page decisions | `max-w-app` token; gutter only in the shell | Scouting narrows 1800 → 1440 | P1 | S | Med |

**Decisions needed before F1:** CTA color and pick hue (DESIGN_SYSTEM.md, open decisions 1–2).

## Phase 2: Shared component consolidation (P0/P1)

Order follows dependencies: primitives first, then the domain pieces built on them.

| ID | Component | Replaces | Depends | Pri | Cx | Risk |
|---|---|---|---|---|---|---|
| C1 | `Badge` (tone primitive) + move domain badges to `components/players/ui` | shadcn `ui/badge` collision, 9 hand-rolled badges, 4 color helpers | F1 | P0 | M | Low |
| C2 | `SectionHeader` (promote `ScoutingSectionHeader`) | 88 eyebrow labels, 3 header styles on Overview | F2 | P0 | S | Low |
| C3 | `StatTile` | 9 stat-tile implementations (OverviewHeader, TeamHero, MarketHeaderBar…) | F1, F2 | P0 | M | Med |
| C4 | `PlayerFace` as the only headshot + `lib/player-image.ts` resolver | `ui/player-headshot`, 14 local URL builders, raw `<img>` rows | — | P1 | M | Med (image fallbacks) |
| C5 | `PlayerRow` | 4 row implementations | C1, C4 | P1 | S | Low |
| C6 | `PickChip` (extracted from `DraftCapitalRail`) | purple, gold and plain-text pick labels | F1 | P1 | S | Low |
| C7 | `Button` variants + `SegmentedControl` | 170 raw buttons (migrated per page), 12 toggles, yellow CTAs | F1 | P1 | M | Med |
| C8 | `Table` (numeric, sticky, selected) | 3 raw tables; Standings, Trade Market and Rankings | F1, F2 | P1 | M | Med |
| C9 | `Tooltip` unification + `ChartTooltip` | `ui/tooltip` vs `AppTooltip` style split, chart tooltips | F1 | P2 | S | Low |
| C10 | `EmptyState`, `Spinner`, `Skeleton` adoption | 19 empty states, 9 spinners | F2 | P2 | S | Low |
| C11 | `TeamIdentity`, `ValueLabel` | 4 identity blocks; hard-coded SF | C4 | P1 | S | Low |
| C12 | Delete 34 unused `components/ui` files | — | — | P2 | S | None |

## Phase 3: Typography and spacing corrections (P1)

These are mechanical once C2 and C3 exist. Use the guard (UI_ENFORCEMENT.md) to find every case.

| ID | Scope | Correction | Cx | Risk |
|---|---|---|---|---|
| T1 | 59 files | Remove `font-mono` (keep the allowlist); numbers get `tabular-nums` | M | Med |
| T2 | 100 lines | Remove `uppercase` + `tracking-*` eyebrows (→ `SectionHeader` / `label`); de-capitalize the 42 ALL-CAPS strings | M | Low |
| T3 | 225 uses | `text-[7–9px]` → `text-2xs`; `text-[10px]` only on badges | M | Med (density) |
| T4 | Overview, My Team, Trade Market | One `metric-hero` per surface | S | Low |
| T5 | Header, connect flow | Sans nav labels, blue active state (per decision 1) | S | Med (global chrome) |

## Phase 4: Page compositions (P1)

| ID | Surface | Current problem | Correction | Uses | Cx | Risk |
|---|---|---|---|---|---|---|
| P1 | **Overview** | Duplicate identity; no headline metric; five equal mono buttons; position strength shown twice; Power Rankings in four `h-[270px]` scrolling cards | Remove the OverviewHeader identity (the shell owns it). Lead with one `metric-hero` (dynasty rank or projection, pick one) plus 3 `StatTile`s. Draft Order becomes a section (or tab, decision 4); the other actions become `Button tint`. Keep the radar, drop the duplicate bars. Power Rankings cards size to content, with a 2-column grid on desktop | C2, C3, C6, C11 | L | **High** |
| P2 | **Franchise Outlook** | Mono header; drifting columns; 7px SVG text; yellow selected row | `SectionHeader`; `Table`-style aligned list; SVG labels ≥ 11px; selected uses `action` | C2, C8 | M | Med |
| P3 | **Standings** | 11 equal columns; faint selection; broken on mobile | `Table` with sticky team column (`TeamIdentity`), primary columns (Record, PF, Playoffs%) in `metric` and secondary columns in slate-400 with `md:` hiding; active sort column highlighted; pick slots → `PickChip`; footnote → `InfoTip` | C1, C6, C8, C11 | M | Med |
| P4 | **Draft Order / picks** | Gold mono board; gap column hidden on mobile; no ownership | `PickChip` with owner; group by year with `SectionHeader`; chips `flex-wrap`; show traded ownership from `OwnedPick` | C6, C8 | M | Med |
| P5 | **Trade Intelligence** | Sideways rails with no overflow hint; yellow mono header | `SectionHeader`; rails with edge fade and snap; `PlayerTradingCard` unchanged | C2 | S | Low |
| P6 | **My Team** | Five competing `text-3xl` stats; `w-48` cards | `metric-hero` + `StatTile`s; lineup cards `w-60` to match the map; SuggestedTrades → `PlayerRow` | C3, C5 | S | Low |
| P7 | **Team Builder** | Blue = action and QB; violet = TE and picks; card magic numbers | Selection/action via `action` token, picks via `PickChip`; tokenized card. **The screenshot must be pixel-identical apart from these two hues** | F1, F3, C6 | S | Med |
| P8 | **Scouting** | 1800 width; board needs ~1,072px; mono cells; duplicate "Ungraded" | `max-w-app`; board columns collapse under `2xl` (drop secondary stats into the row detail); sans cells; one "Ungraded" | F6, T1 | M | Med |
| P9 | **Rankings** | Position pill colored by tier; tier icons; mono; raw images | `PositionBadge` + `TierBadge`; `PlayerRow`; `Table` | C1, C5, C8 | M | Med |
| P10 | **Trade Market** | All mono uppercase; underline tabs; your team not highlighted | Sans; pill `Tabs`; `Table` with your-team row; `StatTile` velocity row | C3, C8 | M | Med |
| P11 | **Legacy routes** | Main source of drift | Redirect to their live equivalents, or delete (decision 3) | — | S | Low |

## Phase 5: Responsive refinements (P2)

- Run every surface at 375, 768, 1024 and 1400, and fix anything that wraps, clips or overflows. Known cases:
  - Standings mobile
  - Overview identity line
  - Draft Order gap column
  - Charts tabs `grid-cols-4`
  - Trade Market filters (no `sm:` step)
  - off-season panel under 360px
- Card rails: no negative margins that clip the glow (`RosterSection.tsx:229`).

## Phase 6: Visual regression validation

The Playwright baseline from UI_ENFORCEMENT.md §2 is set up **before Phase 1**, so every later PR is compared against it. A PR whose diff touches a route it didn't intend to change is blocked until the change is explained.

---

## Sequencing and PR plan

```
Q1–Q8 (parallel, any time)
   │
F1 ─ F2 ─ F3 ─ F4  (one "tokens" PR; screenshots of every route)
   │
C1, C2, C4 (parallel) ─ C3, C5, C6, C11 ─ C7, C8 ─ C9, C10, C12
   │
T1–T5 (per area, alongside the matching page PR)
   │
P7 Builder (prove the tokens don't regress the benchmark)
P1+P2 Overview ─ P3 Standings ─ P4 Picks ─ P6 My Team ─ P5
P8 Scouting ─ P9 Rankings ─ P10 Trade Market ─ P11 Legacy
   │
Phase 5 responsive sweep ─ guard switched from ratchet to strict
```

Highest-risk items: F2 (global font), F4 (token remap) and P1 (Overview recomposition). Ship each alone, with full-route before and after screenshots.
