# UI audit

Date: 2026-10-28. Branch: `docs/ui-design-system-audit` (from `main` at `3eafcf8`).

**Benchmark:** the Team Builder map (`components/league-buddy/builder/*`, cards from `components/players/PlayerTradingCard.tsx`).

**Method:**
- A read-only code sweep of `firstballot/app` and `firstballot/components`. Counts come from grep over 204 `.tsx` files.
- Screenshots of every live surface at 1400×900 and 375×812, using production data and the signed-in test league (The Liaison, 12-team superflex).

All paths are relative to `firstballot/`. Severity: **H** breaks hierarchy or meaning, **M** is visible drift, **L** is polish.

Baseline screenshots are in [`docs/screenshots/ui-audit/before/`](../screenshots/ui-audit/before/). The phone shots show the Next.js dev overlay, which is not part of the page.

---

## 0. Summary

The map looks finished because it obeys rules that exist only in its own files:
- one card recipe with a position-color wash and a tier border,
- one badge shape (`league-buddy/ui/Badge.tsx`),
- sans type with `tabular-nums` numbers,
- a tight slate neutral ramp,
- no monospace.

Everywhere else the app runs on three overlapping visual languages:

| Language | Where | Tell |
|---|---|---|
| **"Terminal"** (legacy) | Overview header, Franchise Outlook, Draft Order, Power Rankings card titles, Trade Market, Rankings, header nav, legacy `/insights` `/metrics` `/charts` | `font-mono` (427 uses), `uppercase` + `tracking-*` (100 lines), yellow-400, `text-[9px]` labels |
| **Map / Badge system** (target) | Team Builder, My Team, landing demo, Scouting cards | sans, `Badge.tsx`, `positionPalette`, `PlayerFace` |
| **shadcn tokens** | Scouting portal, parts of Trade Market | `bg-card`, `text-muted-foreground`, `border-border` |

The root causes are architectural, not cosmetic:
1. **No semantic layer in the theme.** `tailwind.config.ts` has only the stock shadcn tokens. There is no position, tier, value, production, positive or negative color, and no type scale. Every file picks raw palette classes instead.
2. **Shared pieces exist but aren't adopted.** For example:
   - `<Button>` appears in 29 places against 170 raw `<button>`.
   - `ui/card` is used in 21 files against about 165 hand-rolled containers.
   - Player headshot URLs are built in 14 places.
   - There are two headshot components.
   - `ui/tabs` is restyled by hand everywhere it is used.
3. **Yellow/amber is overloaded.** It means WR, elite tier, KTC value, the Bye status, the primary CTA, grade A, draft capital, "Hold" and a franchise state. When one color means everything it stops meaning anything.

---

## 1. Foundations

### 1.1 Tokens
- **H. No semantic tokens.** `tailwind.config.ts` defines only background, card, primary, muted, accent, destructive, border, ring and chart-1..5. It has no fontFamily, fontSize, shadow or domain colors.
- **M. Light and dark are identical.** `:root` and `.dark` in `app/globals.css` hold the same values. `--secondary`, `--muted` and `--accent` are all `222 28% 20%`.
- **M. `--primary` changes meaning.** It is amber globally and blue inside `.prospect-board` (`app/globals.css`).
- **L. `styles/globals.css` is dead.** It is the shadcn default with a light theme, Arial and `--radius .5rem`, and nothing imports it.
- **L. Dead utilities:** `.liquid-glass`, `.scrollbar-hide` and `.text-balance` have zero uses.
- **H. Inter isn't rendering (confirmed in the browser).** `app/layout.tsx` loads Inter as `--font-inter`, but Tailwind's `fontFamily.sans` isn't extended. The `font-sans` class on `<body>` overrides `globals.css:85`, so the computed font is `ui-sans-serif, system-ui…`. The app ships a web font it never uses.

### 1.2 Color
119 hex literals, 37 `rgba(`, 42 inline color styles, 33 Tailwind gradients and 22 CSS gradients.

| Meaning | Competing implementations | Evidence |
|---|---|---|
| Positive | green-400 (67) vs emerald-400/300 (48) | `app/insights/page.tsx:171`; `KtcTrend.tsx:15` |
| Negative | red-400 (43) vs rose-400/300 (30) | `MarketOverviewTab.tsx:120` (emerald+red); `app/draft-board/page.tsx:391` (emerald+rose) |
| Position | `positionPalette` (hex) vs `POSITION_COLORS` (`league-buddy/types.ts:197`) vs `ScoutingPortal.tsx:358` (all slate) vs Rankings pill colored by *tier* (`RankingsTable.tsx:283`) | 4 systems for one meaning |
| Grade | A yellow, B green, **C blue**, D/F red (`types.ts:183-194`, `OverviewHeader.tsx:16-30`) vs `Badge.tsx:94` gradeTone (A gold, B green, D/F rose) | |
| Rank | thirds emerald/**blue**/rose (`power-rankings/rank-colors.ts:11`), quarters emerald/yellow/orange (`OverviewHeader.tsx:39`), 4-step strength scale (`OverviewHeader.tsx:32`) | 3 scales on one tab |
| Draft picks | violet (`DraftCapitalRail.tsx:84`), purple-200 (`PlayerTradeModal.tsx:277`, `TradeAssetList.tsx:58`), gold `#fbbf24` "draft-capital accent" (`DraftOrderPanel.tsx:17`) | 3 colors |
| Buy/Sell | Buy Low = emerald with a down arrow, Sell High = orange with an up arrow (`TradeIntelligencePanel.tsx:221-245`) | The arrows correctly show the price move, but emerald + falling conflicts with emerald = rising (`HeatBadge`) |
| Primary CTA | amber `--primary`, `bg-yellow-400` (10 files, hand-styled), `bg-blue-600` (`DraftBoardControls.tsx:56`, `oauth/consent`) | |
| Neutrals | slate (1,141) vs gray (111) vs `muted-foreground` (184) vs `white/*` | `header.tsx`, `app/insights` use gray |

The same color also carries different meanings:
- **Amber** has 6+ meanings.
- **Blue** means QB, Starter, "neutral rank", grade C and the builder's actions.
- **Violet** means TE, draft picks and selection.
- **Sky** means production and also "cold" (`HeatBadge`).

### 1.3 Typography
- **H. Too much monospace.** There are 427 `font-mono` uses in 59 files. The worst are `OverviewHeader.tsx` (43), `app/draft-board/page.tsx` (29), `DraftBoardTab.tsx` (24), `CompetitiveStateMap.tsx` (22) and `BoardBreakdownPanel.tsx` (21). Recharts axes are set to `fontFamily:'monospace'` (`PositionStrengthRadar.tsx:41`).
- **H. The "vibe-coded label" pattern.** 100 lines combine `uppercase` with `tracking-*`: 69 are mono and 60 use `text-[Npx]`. There are 11 letter-spacing values, including 9 arbitrary em values. 42 strings are hard-coded in ALL CAPS.
- **H. Text that is too small.** There are 225 arbitrary sizes: `text-[10px]` ×122, `[9px]` ×48, `[11px]` ×44, `[7px]` ×6, `[8px]` ×2. Core numbers sit under 9px labels (`OverviewHeader.tsx:252-333`, `RankingsTable.tsx:310`).
- **M. No heading scale.** h1 styles run from `text-xl mono green` (`auth-guard.tsx:35`) to `9xl mono uppercase` (`HeroSection.tsx:38`). h2 has 15+ distinct class strings.
- **Benchmark:** the builder has 0 mono, mostly text-xs and text-sm, and numbers at `text-base font-semibold tabular-nums`.

### 1.4 Spacing, radius, elevation
- **Spacing is mostly fine.** There are only 4 arbitrary paddings. The real problems are density and grouping (section 2), not arbitrary values.
- **M. Nine radius values.** `rounded-lg` ×174, `rounded` ×102, `md` ×101, `full` ×78, `xl` ×77, `2xl` ×37, `sm` ×23, plus `rounded-[20px]`, `[14px]` and `t-[10px]`. `--radius` is 10px, so `rounded-lg` is 10px and `rounded-xl` is 12px, which is close enough to look like a mistake.
- **M. Shadows have no scale.** There are 6 Tailwind shadow steps, 22 arbitrary shadows with hex/rgba, and 36 `backdrop-blur`.
- **M. Container widths differ by surface:**
  - most pages: `max-w-7xl` (1280)
  - dashboard: `max-w-[1440px]`
  - prospect board: `1600`
  - scouting: `1800`
  - stats: `container`
  - settings and consent: 3xl and xl

  The dashboard also doubles its side padding: `main px-2 sm:px-4 lg:px-6` (`LeagueBuddyView.tsx:100`) plus `px-4 sm:px-8` (`DashboardLayout.tsx:37`).

---

## 2. Surfaces

The dashboard has four tabs: Builder, Overview, My Team and Standings (`league-buddy/navigation.ts:13`). It has **no Draft Picks or Trades tab**:
- Draft order opens from one of five equal buttons on Overview (`OverviewHeader.tsx:429-456`).
- Pick chips live in the builder (`DraftCapitalRail.tsx`).
- Trade content is split between Overview (`TradeIntelligencePanel`) and My Team (`SuggestedTrades`).

### 2.1 Team Builder (benchmark): `before/team-builder-desktop.jpg`
What to keep:
- the card recipe (`PlayerTradingCard.tsx:80-96`),
- the tier border ladder,
- `PlayerFace`,
- the value label that follows the league format (`LineupMap.tsx:64-69`),
- the section pattern `border-t border-slate-700 pt-4` with an h3 at `text-sm font-medium` (`LineupMap.tsx:280`),
- tinted hairline buttons (`LineupMap.tsx:209,264`),
- `w-60` lanes.

Hidden inconsistencies to fix without changing the look:
- **M. Two hues do two jobs each.** Blue is both QB and the action color (`LineupMap.tsx:209`). Violet is both TE and picks/selection (`DraftCapitalRail.tsx:45`, `PlanningSuggestions.tsx:144`).
- **M. Card values aren't tokens.** `PlayerTradingCard` hard-codes `rounded-[20px]`, `[14px]`, `#10141e`, `#090e18`, `shadow-[…#000]` and `tracking-[0.12em]`.
- **L. Leftover uppercase micro-labels:** `LineupMap.tsx:178`, `PlanningSuggestions.tsx:144,167,234`.
- **L. The builder shell skips the tokens.** It hard-codes `bg-slate-900` (`DashboardLayout.tsx:37`).

### 2.2 Overview: `before/overview-desktop-top.jpg`, `overview-desktop-power-rankings.jpg`, `overview-desktop-draft-order.jpg`, `overview-mobile.jpg`
- **H. The team identity appears twice.** The shell shows the avatar, name and record (`DashboardLayout.tsx:41-69`). Then OverviewHeader repeats the avatar and the name in yellow mono (`OverviewHeader.tsx:178-194`).
- **H. No headline number.** Dynasty rank, Proj/Wk and Points For are all `text-base font-black font-mono` under 9px labels (`:252-333`). The largest thing on the page is the state label "FRINGE TEAM" (`text-2xl font-black` mono uppercase, `:226`). On a phone it takes half the row and truncates the team name to "The L…".
- **H. The mobile identity line breaks.** Record, PF, form and moves wrap one per line with stray `·` separators (`overview-mobile.jpg`).
- **H. Three rank color scales plus the grade conflict** (section 1.2), all on one tab.
- **M. Five equal 10px mono ghost buttons** (`:394-441`). "Draft Order" opens a full board but has the same weight as "Trade", and there's no primary action.
- **M. Position strength appears twice:** as header bars (`:341-379`) and as the Power Rankings radar (`PowerRankingsView.tsx:153`).
- **M. Three section-header styles on one tab:**
  - 10px mono uppercase (Franchise Outlook, `CompetitiveStateMap.tsx:98`),
  - white `text-lg` (Power Rankings, `PowerRankingsView.tsx:111`),
  - yellow mono h3 (Trade Intelligence, `LeagueBuddy.tsx:376`).
- **H. Franchise Outlook columns don't line up.** Each row is its own grid with `auto` columns (`CompetitiveStateMap.tsx:127,160`), and the SVG text is `fontSize={7}`.
- **M. Power Rankings** shows four `h-[270px]` cards that each scroll internally (`PowerRankingsView.tsx:128-170`). The card titles are mono uppercase. The bench fill uses the value amber (`PositionStrengthRadar.tsx:58`).
- **M. Trade Intelligence:**
  - Emerald is paired with a falling arrow (Buy Low), which conflicts with emerald = rising.
  - Each `w-60` card row scrolls sideways with no hint that more is off-screen (`:273`).
  - It always says "KTC SF", even in 1QB leagues (`:147`).
- **H. Draft Order columns drift:** `auto` header columns against `w-14`/`w-9` cells (`DraftOrderPanel.tsx:200` vs `:272`). The whole board is 9–11px mono. The pick color is gold, which contradicts the builder's violet chips.
- **L. The off-season mini-standings** highlights the selected team in yellow (`:520`). Standings uses blue.

### 2.3 My Team: `before/my-team-desktop-top.jpg`, `my-team-desktop-roster.jpg`
This is the closest to the benchmark: `PlayerFace`, `ui/Badge`, and correct value and production colors.
- **M. No lead metric.** Five `text-3xl` stats compete, and the grid jumps from 2 to 3 to 5 columns (`TeamHero.tsx:39`).
- **M. Superflex is hard-coded.** Starter cards and roster rows show `ktcValueSf` (`RosterSection.tsx:257,430`), while the map switches by format.
- **L. Card width:** lineup cards are `w-48` against the map's `w-60`. Negative margins on the scroller can clip the card glow (`:229-231`).
- **L. `SuggestedTrades` uses a raw 40px `<img>`** instead of `PlayerFace`, and shows position as plain text (`trades/SuggestedTrades.tsx:14,127`).

### 2.4 Standings: `before/standings-desktop.jpg`, `standings-mobile.jpg`
- **H. Numbers are left-aligned.** Every cell is `text-left` (`LeagueStandingsSection.tsx:78-79`), so PF, MaxPF, gaps and percentages don't scan as numbers.
- **H. 11 equal-weight columns in dynasty leagues** (`:116-130`), all `text-sm slate-300`. There's no emphasis on the active sort column or on playoff odds. On a phone the table is cut off after "Record" with no scroll hint, and the team column isn't sticky.
- **H. The selected team is barely marked.** It gets `bg-blue-400/10` and a 10px "Selected" tag (`:143,155`), with no accent bar, avatar or weight change.
- **M. Grades and pick slots are plain text.** The grade (`:175`) isn't a `Badge tone={gradeTone()}`, and MaxPF and projected slot (`:164,171`) aren't pick chips.
- **L. Small details:** the sort segmented control has no hover state (`:94`), and the footnote is a 3-line 12px block.

### 2.5 Draft Picks (cross-surface)
Pick chips in `DraftCapitalRail.tsx` are the reference: violet base, dashed amber for a hypothetical trade, emerald for a pinned prospect, `flex-wrap`. Elsewhere:
- **M. Pick text has three colors:** purple-200 in the trade modal and asset list, gold mono in Draft Order, and plain text in Standings.
- **M. Horizontal overflow.** The `2027 picks` row in the builder summary bar wraps acceptably at 1400 but has no year grouping. Draft Order hides its gap column under `sm` (`DraftOrderPanel.tsx:261`).
- **L. Ownership isn't shown everywhere.** Only the builder reads `OwnedPick`, so Draft Order can't show traded picks.

### 2.6 Scouting portal: `before/scouting-desktop.jpg`
- **M. A different token family.** It uses shadcn `bg-card`, `text-muted-foreground` and `border-border` (`ScoutingSectionHeader.tsx:13`, `ProspectsTab.tsx:111`), and `max-w-[1800px]` (`ScoutingPortal.tsx:645`).
- **M. The draft board scrolls sideways at common widths.** Its grid has a fixed minimum of about 1,072px (`DraftBoardTab.tsx:81`) inside an xl 2.2fr/1fr split.
- **M. Board cells are all mono bold** in mixed sizes (`DraftBoardTab.tsx:740-1095`), and `BoardBreakdownPanel` uses 9px black labels.
- **What works:** `PositionBadge`, `PlayerTradingCard`-based prospect cards, and pill tabs that match the dashboard.
- **L. "Ungraded" placeholder.** Ungraded prospects show an em dash and the word "Ungraded" twice per card (in the meta line and the grade row).

### 2.7 Rankings: `before/rankings-desktop.jpg`
- **M. The position pill is colored by tier** (`RankingsTable.tsx:283`), which breaks "position = hue". The tier icons and the cyan "diamond" tier don't match `TierBadge`.
- **M. Everything is mono.** Stat labels go down to 8px. Images are raw `<img>` on slate-800 (`:73-83`).
- **L. Sparse layout:** `border-spacing-y-3` with an 800px inner scroller.

### 2.8 Trade Market: `before/trade-market-desktop.jpg`
- **M. Mono uppercase everywhere,** including the h1, the section h2s and the table body (`MarketHeaderBar.tsx:32`, `MarketOverviewTab.tsx:62,89`). The tabs use an underline style (`MarketTabs.tsx:23`) where everywhere else uses pills.
- **M. The user's own team isn't highlighted.** Losses use red-400 rather than rose, and grade chips are their own colored squares.
- **L. Small details:** the filters have no `sm:` step, and the leader cards use raw `<img>`.

### 2.9 Global chrome
- **M. Header** (`header.tsx`): the wordmark and nav items are mono uppercase ("MY LEAGUE", "RANKINGS"), the active item is yellow, and it mixes gray and slate. Nav items are defined twice with different labels, in `BottomNav.tsx:25` and `MegaMenu.tsx:17`.
- **M. The connect and league-picker screens** use the terminal style ("CONNECT TO SLEEPER" in green mono, a yellow button, "SYNCING LEAGUES...", `LeagueBuddyView.tsx:106-196`).
- **L. Unused labels:** `shortLabel` exists in `LEAGUE_SECTIONS` but is never used.

### 2.10 Legacy routes
`/insights`, `/metrics`, `/charts`, `/stats-dashboard`, `/draft-board`, `/prospect-board`, `/scout` and `/prospects` have no inbound links, except as aliases.
- They hold a large share of the drift: gray, mono, the `gradient-border` hex utility (26 uses) and copy-pasted spinners.
- `/scout` and `/prospects` use invalid CSS, `h-[calc(100-64px)]`.

**Recommendation:** redirect or delete these routes. Don't restyle them.

---

## 3. Component duplication (summary; details in DESIGN_SYSTEM.md section 7)

| Pattern | Shared impl (adoption) | Drift |
|---|---|---|
| Button | `ui/button` (29) | 170 raw `<button>`; yellow CTA hand-styled in 10 files |
| Card / surface | `ui/card` (21 files) | ~165 hand-rolled containers, 9 radius values |
| Badge | `league-buddy/ui/Badge` (5 files) + shadcn `ui/badge` (6) | Name collision; 9+ hand-rolled badges with the same shape; 4 local color helpers |
| Headshot | `ui/player-headshot` (3) **and** `league-buddy/ui/PlayerFace` (2) | 14 local URL builders; raw `<img>` in 5 player rows |
| Tabs / segmented | `ui/tabs` (4, restyled each time); `ui/toggle-group` (0) | 12 hand-rolled segmented controls; position filter built 5 times |
| Table | `ui/table` (1) | 3 raw tables, 5 grid pseudo-tables |
| Stat tile | none | 9 implementations |
| Section header | `scouting/ScoutingSectionHeader` (4, scouting only) | 88 hand-written eyebrow labels |
| Tooltip | `ui/app-tooltip` (3) + `ui/tooltip` (1), which look different | 39 native `title=` |
| Empty state | none | 19 implementations, 3 text colors |
| Loading | `ui/spinner` (0), `ui/skeleton` (3) | 9 copy-pasted spinners, 7 `animate-pulse` blocks |
| Modal | `ui/dialog` (3) | 2 hand-rolled scouting modals with their own z-index |

There is also dead code:
- 34 of 55 `components/ui` files have no app importers.
- `components/league-buddy/TeamCard.tsx` has no importers.
- `components/ui/use-toast.ts` duplicates `hooks/use-toast.ts`.

---

## 4. Ranked top issues

1. **H. Overview mixes three visual styles** (sections 0 and 2.2).
2. **H. No semantic color tokens; amber has 6+ meanings** (section 1.2).
3. **H. Monospace, uppercase and tracking on 100+ labels, with text under 10px on core numbers** (section 1.3).
4. **H. Standings: left-aligned numbers, a faint selected row, 11 equal columns, broken on mobile** (section 2.4).
5. **H. Duplicate identity block and no headline metric on Overview** (section 2.2).
6. **H. Pseudo-tables with drifting columns:** Draft Order and Franchise Outlook (section 2.2).
7. **M. Three rank scales, two grade scales, three pick colors** (section 1.2).
8. **M. Shared primitives exist but aren't adopted:** Button, Card, Badge, Tabs, headshot (section 3).
9. **M. Trade Intelligence colors Buy Low emerald next to a falling arrow** (section 2.2).
10. **M. Superflex is hard-coded on My Team, Overview and Trade Intelligence** (section 2.3).
11. **M. Scouting and Trade Market use shadcn tokens; container widths run from 1280 to 1800** (sections 1.4 and 2.6).
12. **M. Header, connect flow and Trade Market still use the terminal style** (sections 2.8 and 2.9).
