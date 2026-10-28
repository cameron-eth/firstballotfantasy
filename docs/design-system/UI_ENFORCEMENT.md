# UI enforcement

Static checks can enforce **consistency**: tokens, shared components, banned patterns. They can't enforce **quality**: hierarchy, density, composition. This doc separates the two.

## 1. Automated (deterministic)

### 1.1 `scripts/design-guard.mjs` (new; same shape as `scripts/react-doctor.mjs`)
The guard runs in CI next to React doctor and Frontend guards.

**It starts in ratchet mode.** `scripts/design-guard-baseline.json` stores today's count per rule per file. CI fails when a count **goes up**, and prints the files where counts went down so the baseline can be lowered in the same PR. After Phase 5, every rule except the allowlists switches to **strict** (count must be 0).

| Rule | Detects | Allowlist |
|---|---|---|
| `no-mono` | `font-mono` | `settings/ApiAccess*`, `app/oauth/**` |
| `no-tiny-text` | `text-[Npx]` with N < 10; `text-[10px]` outside badge components | `players/ui/Badge.tsx` |
| `no-eyebrow` | `uppercase` and `tracking-*` on the same element | none |
| `no-raw-color` | Hex or `rgb(a)(` in `className` / `style`, and `bg-[#…]` | `lib/design/tones.ts`, `lib/player-card-palette.ts`, `app/globals.css` |
| `no-gray` | `(text|bg|border)-gray-*` | none |
| `no-adhoc-cta` | `bg-yellow-400` and `bg-blue-600` on buttons | `ui/button.tsx` |
| `semantic-palette` | Raw `green-*` / `red-*` (use `positive` / `negative`) | `tones.ts` |
| `radius-scale` | `rounded-[…]`, `rounded-sm`, `rounded-2xl`, `rounded-3xl`, bare `rounded` | `tones.ts` |
| `no-adhoc-shadow` | `shadow-[…]` | `tones.ts` |
| `one-headshot` | ESPN, Sleeper or NFL headshot URL patterns outside the resolver | `lib/player-image.ts`, `app/api/player-image/**` |
| `shared-primitives` | Raw `<button` (ratchet only); local `function (SectionHeader|StatTile|EmptyState|Spinner)`; imports of the old `ui/player-headshot` / shadcn `ui/badge` after C1/C4 | — |
| `no-dead-ui` | Files under `components/ui` with zero importers | — |

**Implementation notes**
- It scans `.tsx` under `app/` and `components/`.
- It matches whole `className` string literals and `cn(…)` arguments, using the same parsing React doctor already does.
- Each violation prints `file:line rule hint`, and the hint names the token or component to use.
- It runs in about 1s and needs no dependencies.

### 1.2 Tailwind config
Once tokens land, `theme.extend.colors` exposes only the semantic names, plus `slate` for the neutral ramp. Raw hues remain available (Tailwind can't remove them), so the guard is what catches them.

### 1.3 Accessibility contrast
- **Static check:** `scripts/contrast-check.mjs` reads the token pairs from `globals.css` and `tones.ts` (text token on surface token) and asserts WCAG AA, i.e. 4.5:1 for text under 18px and 3:1 for large text and UI. The known risk is `slate-500` meta text on `surface`, at about 4.0:1, which needs checking. If it fails, meta moves to `slate-400`.
- **Runtime check:** `@axe-core/playwright` runs in the visual suite (section 2) with `color-contrast` and `region` rules on every route.

### 1.4 Existing checks to keep
`node scripts/react-doctor.mjs` (no index keys, no nested components), `tsc`, `npm test`, Frontend guards.

## 2. Visual regression

**Tool:** Playwright `toHaveScreenshot`, added as a dev dependency, at `firstballot/e2e/visual/*.spec.ts`.

**Deterministic data:**
- The test server runs with `NEXT_PUBLIC_FIXTURE_MODE=1`, so `/api/*` serves frozen JSON from `e2e/fixtures/`. That covers the league, rosters, published tiers, prospects and trade market, all captured from the same snapshot as `docs/screenshots/ui-audit/before/`.
- Remote images are routed to local copies with `page.route`, and animations are disabled (`reducedMotion: 'reduce'`).
- The Next dev overlay is hidden.

**Matrix:**

| Route | States |
|---|---|
| `/` | hero, landing demo (static under reduced motion) |
| `/league-buddy?tab=builder` | default, pick panel open (desktop only) |
| `/league-buddy?tab=overview` | default, Draft Order open |
| `/league-buddy?tab=roster` | default |
| `/league-buddy?tab=league` | Record sort, Playoff odds sort |
| `/scouting-portal` | Prospects, Draft board, Hits & misses |
| `/rankings` | default |
| `/trade-market` | Overview, Trends |

Viewports: **375×812, 768×1024, 1400×900**.

**Thresholds:** `maxDiffPixelRatio: 0.002` per screenshot. A design PR updates its baselines intentionally, with `--update-snapshots` committed alongside the code. The reviewer sees the image diffs in the PR's Playwright report artifact.

**CI:** a `visual` job in `ci.yml` builds and starts the server in fixture mode, runs the specs, and uploads `playwright-report/` on failure. It is advisory (non-blocking) for the first two weeks, then required.

## 3. Design review (human, required)

Every PR that changes UI must include **before and after screenshots at identical viewports** (1400×900 and 375×812) in its body, following AGENTS.md. Reviewers answer the following questions in the PR:

1. **Three-second test:** what is the most important information on this surface, and is it the most prominent element?
2. **One headline:** is there exactly one `metric-hero`, and does everything else step down?
3. **Meaning:** does every accent color map to a DESIGN_SYSTEM.md §1 meaning? Is any color used for two things?
4. **Density:** is whitespace grouping related items rather than filling space? Does any container scroll inside another scroll?
5. **Consistency:** does it look like the Team Builder map, with the same card, badge, header and button recipes, rather than a new look-alike?
6. **Responsive:** at 375px, does anything wrap awkwardly, clip, or need sideways scrolling without a hint?
7. **New patterns:** if something new was introduced, is it documented in DESIGN_SYSTEM.md with its purpose?

## 4. What can't be automated

The guard can't judge information hierarchy, composition, whether density feels right, how well player images are used, or whether a surface "feels like the map". Those stay with section 3 review and before/after screenshots. Pixel diffs only show that something changed, not that it's better.

## 5. AGENTS.md additions (proposed)

Add to the frontend rules:
- Use tokens from `lib/design/tones.ts` and the Tailwind semantic colors. No raw hex, `gray-*`, or new hues without a DESIGN_SYSTEM.md entry.
- No `font-mono`, no `uppercase` + `tracking` eyebrows, no text under 10px (badges only at 10px).
- Use the shared `SectionHeader`, `StatTile`, `Badge`, `PlayerFace`, `PlayerRow`, `PickChip`, `Button` and `Table` before writing markup by hand.
- Every UI PR includes before and after screenshots at 1400×900 and 375×812.
