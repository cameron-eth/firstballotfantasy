# Prospect tiers: how they are derived (audit, 2026-10-28)

## Where the data lives
- Table `dynasty_prospects` (Supabase). Relevant columns: `overall_grade` (0-100), `grade_tier` (text label),
  five component scores (`college_production_score`, `physical_measurables_score`, `hs_recruiting_score`,
  `draft_projection_score`, `expert_consensus_score`), plus a separate legacy `tier` / `tier_numeric`.
- Read by `GET /api/prospects` and `GET /api/prospects/draftboard`; the board maps rows in
  `components/scouting/board-player.ts`.
- `scripts/refresh-college-prospects.py` refreshes college stats only. **No code in this repo computes or writes
  `overall_grade` or `grade_tier`**; they arrive from an external import.

## How the tier shown on screen is chosen
`normalizeScoutingGradeTier` in `lib/scouting-grade-tier.ts`:
1. If `grade_tier` is one of the display tiers (Generational, Elite, Blue Chip, Contributer, Depth, Walk-On), use it.
2. Otherwise map legacy labels: Starter / Rotational / Backup → Contributer, Longshot → Walk-On, "Elite prospect" → Generational.
3. If `grade_tier` is empty, derive from `overall_grade`: 95+ Generational, 90+ Elite, 85+ Blue Chip,
   78+ Contributer, 68+ Depth, else Walk-On.
4. (Fixed in this PR) If there is no grade at all, the board now shows **Ungraded**; it used to treat the missing
   grade as 0 and show Walk-On.

## Findings
| Finding | Evidence (production, classes 2027+) | Impact |
| --- | --- | --- |
| Stored labels use an older scale | Labels in use: Elite (95.1-99.0), Blue Chip, Starter, Rotational (70.1-77.9), Depth (60.9-69.9), Longshot | The label path and the threshold path disagree for **76 of 100** graded prospects. A 96 shows "Elite", not "Generational"; a 71 "Rotational" shows "Contributer" though the threshold says Depth; a 62 "Depth" shows Depth though the threshold says Walk-On. |
| Ungraded shown as Walk-On | 21 prospects (5 of 30 in 2028, all 16 in 2029) have no grade | Fixed here: shown as Ungraded. |
| Grade methodology is undocumented | Across all 981 graded rows, the grade fits about 0.51 draft projection + 0.24 production + 0.17 physical + 0.07 HS recruiting + 0.03 expert consensus (R² 0.96, worst row off by 19 points). For 2027+ the same fit gives different weights and R² 0.66 (worst off by 21). | The grade is not one reproducible formula; some rows were set or adjusted by hand, or by different formula versions. It cannot be recomputed or explained from the stored components. |
| Three tier fields | `tier`/`tier_numeric` (legacy), `grade_tier`, and the threshold rule | Different screens can disagree; `lib/players.ts` shows "Ungraded" while the board (before this fix) showed Walk-On. |
| Grades are not refreshed | `updated_at` for graded rows spans 2026-08-15 to 2026-10-26; no job writes grades | Grades do not move with new college stats. |

## Recommendations (not done here; need a product decision)
1. Pick one source of truth: derive the displayed tier from `overall_grade` thresholds only, and stop storing `grade_tier`
   (or regenerate it from the thresholds). This changes the visible tier for about 76 current prospects.
2. Put the grade formula in code (weights + version) and recompute it from the five components in the refresh job, so
   every grade is reproducible and moves with new stats. Keep manual overrides as an explicit, audited column.
3. Drop the legacy `tier`/`tier_numeric` columns once nothing reads them.
