# History: outcomes on the player card

Status: proposed next workstream; not implemented in PR #32.

## Product direction

History becomes an outcome library, not another scouting queue. Keep the shared player cards and embed a small five-bar signal meter next to the historical grade. Remove the Athletes / Analytics switch and the standalone comparison charts. Replace the currently nonfunctional “Scout player” button with a compact “Career outcome” disclosure.

Default to **All historical classes**, highest original scouting grade first, null/ungraded grades last. Future prospects belong in Prospects; they must not appear in History. Use NFL entry status and class year together so a calendar change does not prematurely mark undrafted players as historical. An explicit saved year remains selectable. Keep search, position and year filters in one compact toolbar.

The original scouting grade stays immutable. Outcome bars describe the return on the market's draft cost, not a revision of the scouting grade or today's KTC value. This avoids treating a good prospect evaluation and a good fantasy investment as interchangeable.

## Confirmed current problems

- `HistoricalRankingsTab.tsx` hard-codes 2024 because of an old empty-class assumption.
- “All” requests `/api/prospects?draft_year=all`, including future prospects.
- The prospects query orders descending grade without explicit null placement. Add `nullsFirst: false` and deterministic secondary ordering; test both API and UI ordering.
- History uses `ProspectCard` with `onSelect={() => {}}`, so “Scout player” has no action.
- Current analytics compare class sizes, tiers and average grades; they do not measure realized NFL outcomes.
- No historical rookie-draft ADP ingestion/model was found in the application. Current projection ADP fields are not a substitute for historical rookie ADP.

## Outcome methodology to validate

### 1. Freeze the acquisition cost

Use the player's **average rookie-draft ADP entering the NFL**, within a consistent post-NFL-draft / pre-season window. Do not average their changing ADP across subsequent career seasons: that would let later production leak into the expectation being judged.

Keep superflex and 1QB, scoring format, league size and rookie-only versus startup drafts separate. Store source, observation date, eligible draft count, average pick, dispersion and selection rate. Missing ADP means “No benchmark,” not zero cost. NFL draft capital and KTC are separate contextual metrics, never silent ADP replacements.

### 2. Measure realized production fairly

Primary return: cumulative regular-season fantasy points above a versioned positional replacement baseline, using the same scoring format and an explicit as-of week. Normalize each season's replacement baseline to account for scoring environment and season length. Raw points, games, FPPG and useful-starter weeks remain in the disclosure.

Compare players at the **same elapsed career stage**, not a rookie's partial season against a veteran's completed career. Missed games contribute no realized production only where coverage confirms those weeks; missing data remains unknown. Show availability alongside the return so an injury-driven shortfall is understandable.

### 3. Estimate expected return from ADP peers

Fit a position- and format-specific expectation curve from prior cohorts using log rookie ADP and elapsed career seasons/weeks. Smooth nearby ADP ranges and shrink small samples toward broader position cohorts. For a player's evaluation, exclude that player and use only cohorts observable before the evaluated snapshot. Include busts, retired players and non-survivors to prevent survivor bias.

Compute an outcome residual: realized production minus expected production. Calibrate its percentile within matched historical cohorts. Prefer residual percentiles over raw ratios because expected production can be near zero for late selections.

### 4. Translate it to five bars

Proposed initial display, subject to backtesting:

- 1 red bar: materially below expectation.
- 2 orange bars: below expectation.
- 3 amber bars: around expectation.
- 4 light-green bars: above expectation.
- 5 green bars: substantially above expectation.

Use quantile bands initially (20/40/60/80), then validate whether they yield useful, stable distinctions. Do not label a player a definitive miss from a tiny sample. The first two seasons should show “Early signal”; sparse or uncertain cohorts show gray “Not enough evidence.” A gray empty meter must be visually distinct from a one-bar miss.

Tooltip / tap disclosure: “4/5 · Above ADP expectation,” rookie ADP and format, expected versus actual output through the same career point, comparison sample size, availability, confidence, source, update date and methodology version. Bars + text convey meaning without relying only on color.

## Data and storage

1. Audit player identity mapping across prospect ID, Sleeper, ESPN and a stable NFL stats ID. Review ambiguous matches; never join only by name.
2. Establish historical ADP coverage and permission to use the source before choosing the first supported classes/formats. Fantasy Football Calculator documents Dynasty and Rookie ADP, but this does not establish full historical superflex-rookie coverage. Sleeper draft/pick endpoints can support a separately labeled opt-in observed-draft sample; connected leagues are not automatically representative of the whole market.
3. Prefer the existing production feed if historical coverage is complete. Evaluate nflverse weekly player stats as a reproducible backfill source, applying our scoring rules consistently.
4. Persist normalized ADP observations, weekly production, versioned cohort models and computed outcome snapshots server-side. Idempotent imports with coverage checks; refresh after completed NFL weeks and correction runs. Reads use precomputed snapshots, not career scraping on every visit.
5. Preserve old snapshots/model versions so changes in the meter can be explained. Snapshot payload contains the score, confidence, as-of date and provenance. No unsupported score should be returned.

## Delivery order and acceptance

1. **History UX and correctness:** All historical classes default, grade-first/null-last ordering, filter future classes, replace dead scouting action; remove separate analytics UI. Do not fabricate bars while data is missing.
2. **Data inventory / backfill:** publish a coverage matrix by class and format; resolve IDs and persist inputs. Report gaps explicitly.
3. **Model prototype:** retrospective rolling-cohort validation, inspect early picks, late-round successes, injured players, retired players and thin samples. Compare to a simple position/ADP-band median baseline. Freeze thresholds only after checking stability and calibration.
4. **Card integration:** compact shared OutcomeMeter, accessible disclosure, neutral unavailable states, no extra card height beyond the existing metric row. Cache and refresh snapshots.
5. **Release verification:** tests for null sorting, historical-only filtering, career-stage equality, incomplete coverage, no data leakage, survivor inclusion, format separation and idempotent ingestion; screenshots at desktop and mobile widths.

## Primary references checked

- Sleeper draft and pick API: https://docs.sleeper.com/ — documents league drafts and individual draft selections; not a documented historical market-ADP service.
- Fantasy Football Calculator ADP coverage: https://help.fantasyfootballcalculator.com/article/34-average-draft-position-adp-data — lists Dynasty and Rookie categories and programmatic access. Historical format availability still requires an inventory.
- nflverse data distribution: https://github.com/nflverse/nflverse-data — versioned data releases; weekly stats loader documentation: https://nflreadpy.nflverse.com/api/load_functions/.
