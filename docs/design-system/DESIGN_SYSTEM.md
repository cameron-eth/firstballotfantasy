# Design system (proposal)

Status: **proposal for review**. No application code has changed yet. Evidence for every rule is in [UI_AUDIT.md](UI_AUDIT.md).

**Source of truth:** this proposal extends what the app already has rather than adding a second system.
- **Values:** CSS variables in `firstballot/app/globals.css`, exposed through `firstballot/tailwind.config.ts`.
- **Class recipes:** one TypeScript map, `firstballot/lib/design/tones.ts` (new), used by the components that need class strings, such as Badge.
- **Existing pieces:** shadcn primitives, `lib/player-card-palette.ts` and `league-buddy/ui/Badge.tsx` stay. They are promoted and tokenized, not replaced.

The benchmark is the Team Builder map. Each rule below is either taken from the map or fixes an inconsistency inside it.

---

## 1. Semantic color

Each color family gets **one job**. Position hues are identity colors. They appear only as card washes, position chips and inset bars, never as status or emphasis.

| Token (CSS var → Tailwind) | Value (today's class) | Meaning | Never use for |
|---|---|---|---|
| `--pos-qb` / `pos-qb` | `#93c5fd` ink, `#2563eb` wash | QB identity | actions, ranks |
| `--pos-rb` / `pos-rb` | `#7de4bd` / emerald wash | RB identity | positive deltas |
| `--pos-wr` / `pos-wr` | `#fcd477` / gold wash | WR identity | value, CTAs |
| `--pos-te` / `pos-te` | `#b7a0ff` / violet wash | TE identity | picks, selection |
| `--value` / `value` | amber-300 | KTC / market value numbers | production, CTAs, statuses |
| `--production` / `production` | sky-300 | Fantasy points, PPG, projections | value, "cold" |
| `--positive` / `positive` | emerald-400 | Up, gain, good tier, hot | RB identity |
| `--negative` / `negative` | rose-400 | Down, loss, bad tier, F/D grade | errors (see `destructive`) |
| `--warning` / `warning` | orange-400 | Injury, risk, expiring | Sell High (see below) |
| `--elite` / `elite` | amber-300 + glow | Tier 1–2, grade A, 1.01 | Hold, Bye, value |
| `--cold` / `cold` | cyan-200 | Cold (−500 KTC/30d) border and glyph | production |
| `--action` / `action` | blue-400 | Links, primary buttons, focus ring, selected row/tab | QB, "neutral" rank |
| `--pick` / `pick` | violet-300 | Draft picks and prospects (chip only, with a pick glyph) | selection |
| `--destructive` | existing | Errors, destructive actions | negative performance |
| neutrals | slate ramp (section 5) | everything else | — (`gray-*` banned) |

These rules resolve the conflicts found in the audit:
- **Primary CTA moves from yellow to blue** (`--primary` = `--action`). The landing page, Team Builder and the tabs already use blue, and yellow currently has six meanings. *Decision needed:* yellow is today's brand wordmark color. Keep it for the wordmark only.
- **Ranks use one scale:** top third positive, middle third slate-300 (**not blue**), bottom third negative. This replaces `rank-colors.ts` and the two scales in `OverviewHeader.tsx`.
- **Grades use one scale:** A elite, B positive, C slate, D/F negative, i.e. `gradeTone` in `Badge.tsx:94`. `GRADE_COLORS` in `types.ts` is removed.
- **Buy and Sell:** the arrows keep showing the price move (↘ for Buy Low, ↗ for Sell High). The section color shows the action, not the move: Buy is `action`, Sell is `value` amber ("cash out"), Hold is slate. That means no orange, and no emerald beside a falling arrow.
- **Franchise states** (`competitiveState.ts`) map onto existing tones: Juggernaut elite, Contender positive, Fringe warning, Rebuilder pick. No new hex values.
- **Picks:** blue was doing two jobs in the builder (action and QB), and violet was doing two jobs (TE and picks). Selection moves to `action`. Picks keep violet, but always as a chip with a pick glyph, so they can't be confused with a TE chip. *Decision needed:* the alternative is to move picks to a distinct hue (lime).
- **Charts** read the same CSS vars through a `chartTheme` object in `lib/design/tones.ts`, covering axis `slate-400`, grid `slate-700` and tooltip. Hand-copied `#94a3b8` and `#334155` go away.
- **Gradients** are allowed only as the card position wash (`PlayerTradingCard`) and the landing hero background. Every other gradient is decorative and is removed.

## 2. Typography

There is one family, Inter. It's already loaded and becomes `fontFamily.sans` via `var(--font-inter)`. Space Grotesk is limited to the landing display line.

**`font-mono` is banned** except for code, API keys and IDs (allowlist: `settings/ApiAccess`, `oauth/*`). Numbers use `tabular-nums`, not mono.

| Variant | Classes | Use |
|---|---|---|
| `display` | `text-4xl sm:text-6xl font-semibold tracking-tight` | Landing hero only |
| `page-title` | `text-2xl font-semibold text-white` | One per route (h1) |
| `section-title` | `text-base font-semibold text-white` + optional `text-sm text-slate-400` subtitle | Every section (h2), via `SectionHeader` |
| `card-title` | `text-sm font-semibold text-white` | Card and panel titles (h3) |
| `metric-hero` | `text-3xl font-semibold tabular-nums` + tone | The **one** headline number per surface |
| `metric` | `text-base font-semibold tabular-nums` + tone | Card and table key numbers (map: `LineupMap.tsx:181`) |
| `body` | `text-sm text-slate-200` | Default text |
| `label` | `text-xs text-slate-400` (sentence case) | Metric labels, column headers |
| `meta` | `text-[11px]` → token `text-2xs` (11/14) `text-slate-500` | Secondary details; **minimum size** |
| `badge` | `text-[10px] font-semibold` → token `text-badge` | Badges only |

Rules:
- **No size below 10px.** 10px is for badges only, and 11px is the floor everywhere else. `text-[7–9px]` is removed.
- **Use sentence case.** `uppercase` is allowed only on position codes and grade letters. The `uppercase` + `tracking-*` eyebrow pattern is removed, and `SectionHeader` replaces it.
- **One headline number per surface,** set in `metric-hero`. Everything else steps down. This is the three-second rule.

## 3. Spacing and layout

The scale is Tailwind's default 4px grid. No arbitrary spacing; the code already complies.

| Purpose | Value |
|---|---|
| Page gutter (set once, in the app shell) | `px-4 sm:px-6 lg:px-8` |
| Between sections | `space-y-6` (`space-y-8` on landing) |
| Section header → content | `mb-3` |
| Inside a card | `p-3` (dense: tables, chips) / `p-4` (panels) |
| Between related items | `gap-2`; between cards `gap-3` (rails) / `gap-4` (map lanes) |
| Container widths | `max-w-7xl` for reading pages (rankings, trade market, settings, billing); `max-w-[1440px]` → token `max-w-app` for dashboards and scouting; builder full-bleed |

The scouting portal's `1800` and the prospect board's `1600` widths are removed. The duplicated dashboard padding (`LeagueBuddyView.tsx:100` + `DashboardLayout.tsx:37`) collapses to the shell gutter.

## 4. Radius

| Token | Value | Use |
|---|---|---|
| `rounded-md` | 6px | Badges, chips, pills |
| `rounded-lg` | 10px (`--radius`) | Controls, buttons, inputs, inset cards, table shells |
| `rounded-xl` | 14px | Panels and section cards |
| `rounded-card` | 20px | Player trading cards only (replaces `rounded-[20px]`; inner frame `rounded-card-inner` 14px) |
| `rounded-full` | — | Avatars, round icon buttons, progress dots |

`rounded` (4px), `rounded-sm`, `rounded-2xl` and `rounded-3xl` are retired. `rounded-2xl` overlays become `rounded-xl`.

## 5. Surfaces and elevation

| Level | Token | Today | Use |
|---|---|---|---|
| 0 page | `bg-background` | `222 47% 11%` (≈ slate-900/950) | Body |
| 1 surface | `bg-surface` + `border-line` | `bg-slate-900/60 border-slate-800` | Section cards, tables |
| 2 raised | `bg-raised` + `border-line-strong` | `bg-slate-800/60 border-slate-700` | Inset tiles, active controls, slot headers |
| 3 overlay | `bg-overlay backdrop-blur` + `shadow-overlay` | `bg-slate-950/95` (`PickPanel.tsx:96`) | Drawers, popovers, modals |
| card | `shadow-card` | `shadow-[0_16px_40px_-20px_#000]` | Trading cards |

The neutral text ramp is `text-white` (primary), `slate-300` (strong secondary), `slate-400` (labels), `slate-500` (meta) and `slate-600` (disabled). `gray-*`, `white/NN` for text, and mixing in `muted-foreground` are all retired. The shadcn tokens get remapped to this ramp so the scouting pages match without rewrites.

The light theme is out of scope. `:root` and `.dark` stay identical, and the dead `styles/globals.css` is deleted.

## 6. Iconography

- **Lucide only,** at `size-3.5` (14px) inline with `text-xs`/`text-sm` and `size-4` (16px) in buttons. Default stroke.
- **Icons inherit the text color.** They are never colored independently, except for a semantic tone.
- **Emoji is used only for 🔥 heat** (requested). The ice state uses a lucide `Snowflake` in `cold`.
- **Rankings tier icons** (Gem, Crown, Star) are replaced by `TierBadge`.

## 7. Components

**Shared primitives** (`components/ui`, tokens only, no domain knowledge):

| Primitive | Action |
|---|---|
| `Button` | Variants `primary` (action), `secondary` (raised hairline), `ghost`, `tint` (map recipe `LineupMap.tsx:209`: `border-{tone}/30 bg-{tone}/10 text-{tone}`), `icon`. Replaces 170 raw `<button>` over time and the 10 hand-styled yellow CTAs |
| `Card` | Variants `surface` / `raised` / `overlay`. Replaces ~165 ad-hoc containers |
| `Badge` | Rebuilt on the `Badge.tsx` shape with a `tone` prop. Removes the shadcn/league-buddy name collision |
| `Tabs` | Variant `pill` only (dashboard/scouting style). Trade market's underline tabs move to `pill` |
| `SegmentedControl` | New, wraps `toggle-group`. Replaces 12 hand-rolled toggles |
| `Table` | `ui/table` + `numeric` cell prop (right-aligned, tabular), `sticky` first column, selected-row style |
| `SectionHeader` | Promote `scouting/ScoutingSectionHeader` → `ui/section-header` (title, subtitle, actions slot). Replaces 88 eyebrow labels |
| `StatTile` | New: label, value (`metric`/`metric-hero`), delta (positive/negative), `InfoTip` slot. Replaces 9 implementations |
| `InfoTip` / `Tooltip` | Restyle `ui/tooltip` to the `AppTooltip` look; `AppTooltip` and `MetricTip` become wrappers; `ChartTooltip` for recharts. Native `title=` kept only on icons with `aria-label` |
| `EmptyState` | New: icon, title, hint, action. Replaces 19 implementations |
| `Spinner` / `Skeleton` | Fix and adopt `ui/spinner`; `Skeleton` everywhere; delete 9 copy-pasted spinners |
| `Dialog` / `Sheet` | Scouting's two hand-rolled modals move to `Dialog`; one z-index scale (`z-overlay` 50, `z-modal` 60, `z-toast` 70) |

**Domain components.** These live in a new `components/players/ui/` folder. `league-buddy/ui` re-exports them during migration.

| Component | Action |
|---|---|
| `PositionBadge`, `TierBadge`, `HeatBadge`, `StatusBadge`, `RankBadge`, `GradeBadge` | Moved from `league-buddy/ui/Badge.tsx`; tones from `lib/design/tones.ts` |
| `PlayerFace` | **The** headshot. Merge `ui/player-headshot` into it (`shape="round" | "square"`, `wash`). Delete the 14 local URL builders in favor of `lib/player-image.ts` |
| `PlayerTradingCard` | Unchanged look; tokenized radius, shadow and surfaces. Fold `landing/ProspectTradingCard` and `PlayerCardHero` in as variants |
| `PlayerRow` | New: face + name + PositionBadge + team + key `metric`. Replaces 4 row implementations (TradeIntelligence, OfferComparison, SuggestedTrades, Rankings) |
| `PickChip` | Extract from `DraftCapitalRail.tsx:84`: violet base, `hypothetical` (dashed value), `pinned` (positive), owner label. Used by Draft Order, Standings, trade modal |
| `TeamIdentity` | Avatar + name + record. One per surface; used by `DashboardLayout`, Standings rows, Trade Market |
| `ValueLabel` | Resolves the league format to `KTC · SF` / `KTC · 1QB` and the right field. Fixes the hard-coded superflex value |

**Page-specific** (no abstraction): `LineupMap`, `CompetitiveStateMap` plot, `HitsMissesTab` chart, landing sections.

**Delete:** the 34 unused `components/ui` files (they can be regenerated from shadcn), `league-buddy/TeamCard.tsx`, `components/ui/use-toast.ts`, `styles/globals.css`, and `.liquid-glass`, `.scrollbar-hide` and `.text-balance`.

## 8. Responsive conventions

- **Breakpoints** are Tailwind defaults. Every layout must work at 375, 768, 1024 and 1400.
- **Wide tables** use a sticky first column, right-aligned numbers, `overflow-x-auto` with an edge fade, and hide secondary columns under `md`. Below `sm` they can switch to a row-card layout, which the draft board already does (`DraftBoardTab.tsx:669`).
- **Card rails** use `overflow-x-auto snap-x` with an edge fade on the overflow side, and no negative margins that clip the glow.
- **Identity lines** use `flex-wrap gap-x-2 gap-y-1`, with separators as `before:` content so wrapped items never leave stray `·` marks.
- **Mobile navigation** is `BottomNav`. The desktop header, mega menu and bottom nav all read one `lib/nav-config.ts`.

## 9. Interaction and state

| State | Treatment |
|---|---|
| Hover | `bg-white/5` on rows and ghost controls; tint +10% on tint buttons |
| Focus | `focus-visible:ring-2 ring-action/60 ring-offset-0` everywhere (no amber ring) |
| Selected (row, tab, card) | `action` tint background + 2px left/inset accent + `font-semibold`. **Never** gold or yellow |
| Your team | Selected style plus `TeamIdentity` avatar; same in Standings, Draft Order, Franchise Outlook, Trade Market |
| Disabled | `opacity-50 pointer-events-none` |
| Loading | `Skeleton` in the final layout's shape; `keepPreviousData` on toggles (no full-page reloads) |
| Empty | `EmptyState` |
| Motion | `framer-motion`, ease `[0.22,1,0.36,1]`, springs without overshoot (landing demo), all disabled under `prefers-reduced-motion` |

## Open decisions (need product owner)

1. **CTA color:** blue (recommended) or keep amber/yellow as `--primary`.
2. **Pick hue:** violet chip with a glyph (recommended, least change) or a new hue (lime).
3. **Legacy routes** (`/insights`, `/metrics`, `/charts`, `/stats-dashboard`, `/draft-board`, `/prospect-board`, `/scout`, `/prospects`): redirect or delete (recommended) rather than restyle.
4. **Dashboard IA:** keep Draft Order inside Overview (as a section, not a hidden toggle), or add a Picks tab.
