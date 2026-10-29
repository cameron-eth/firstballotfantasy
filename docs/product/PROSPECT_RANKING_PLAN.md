# Prospect ranking and classification: plan (approved 2026-10-28)

**Owner's request:**
- Replace the normalized grades, which overfit.
- Jeremiah Smith and Malachi Toney should read as elite, because their production, strength of schedule, accolades and recruiting all point there.
- Players without a 40 (or other measurables) get the position average instead of a penalty.

**Status:** approved by the owner on 2026-10-28, with the recommended option for every decision in §5. D-P4 and D-P6 had no single recommendation, so they are settled at P0 and P5. This also absorbs **PR-20** (decision D3: one prospect tier vocabulary).

## 1. What we have today (audit)

**No code in this repo computes a grade.**
- `overall_grade`, `grade_tier` and the five component scores arrive from an outside import. Its ETL (`rerank_prospects.py`) is referenced but missing.
- `scripts/refresh-college-prospects.py` refreshes college stats only.
- Grades are never recomputed when new stats arrive. Details: `docs/prospect-tiers.md`, `docs/prospect-grade-refresh-audit.md`.

**Back-fit of the stored grade.** About 0.51 draft projection + 0.24 production + 0.17 physical + 0.07 recruiting + 0.03 expert consensus.
- R² is 0.96 across all 981 rows, but only 0.66 for the 2027+ classes.
- The top of the board was edited by hand: Smith is +13 above the fit, Kewan Lacy +19.

**Production, 2027+ classes (121 rows):**

| Field | Coverage | Note |
|---|---|---|
| 40 time (`college_stats.forty_time`) | **0 / 121** | Nobody has one, so "physical" is height and weight only |
| Height / weight | 120 / 121 | |
| Recruiting: stars / rank / rating | 100 / 97 / 93 | Good base for a recruiting signal |
| Strength of schedule | **no field** | Needs a source (CFBD SP+ / team SOS) |
| Accolades | **no field** | Only prose in `docs/prospect-research-2028-2029.md` |
| CFBD id / ESPN id | 99 / 120 | |

**The two named players:**

| | Grade | Stored tier | Production | Physical | Recruiting | Draft proj. | Expert |
|---|---|---|---|---|---|---|---|
| Jeremiah Smith (WR, 2027) | 99.0 (hand-raised) | Elite | 91.6 | 68.6 | 100 (5★) | 78.97 | 96.5 |
| Malachi Toney (WR, 2028) | **75.24** | **Rotational** | 89.4 | 62.1 | 61 (4★) | 78.97 | 96.5 |

What the table shows:
- **Physical drags both down.** With no 40 time, both score in the 60s. That is the "missing data treated as weak" problem the owner described.
- **Toney's grade is about 4 points below what his own components produce** (about 79.5 by the back-fit), and his production score lags his stats by about 82 percentile points (audit). He is a 2028 freshman-class receiver with elite output, and the formula has no way to see it: there are no SOS or accolade inputs, and recruiting is weighted 7%.
- **Draft projection (78.97) and expert (96.5) are identical for both.** They look like placeholder values, which needs checking in P0.

**Four tier systems disagree:**
- the stored `grade_tier` (old scale);
- `normalizeScoutingGradeTier` (Generational … Walk-On);
- grade cutoffs (95/90/85/78/68);
- a rank-based scheme in `ScoutingPortal`.

The label and the cutoffs disagree for 76 of 100 graded prospects. There are also 11 duplicated players and 45 rows with no ESPN id (PR-20 scope).

## 2. Design

### 2a. Score each signal on a fixed, historical scale (not by class)
"Normalize within the class" is what overfits. With about 30 players per class, a percentile mostly measures who else happened to be in the class. Instead, each signal is scored against **fixed historical benchmarks by position**, built once from past classes and versioned. A 2028 WR's production is compared with every drafted WR from 2014 on, not with 29 classmates.

| Signal | Inputs | Source | Missing data |
|---|---|---|---|
| **Production** | Per-game and market-share numbers (share of team receiving yards and TDs; yards per carry and rush share; passing efficiency), breakout age, adjusted for age/class year | `college_stats` (have), team totals from CFBD | Too few games → wider uncertainty, not a lower score |
| **Strength of schedule** | Opponent defensive SP+ (or team SOS), conference tier | CFBD (new: `college_sos` per player season) | Conference average |
| **Accolades** | All-American (1st/2nd/3rd), all-conference, award finalist/winner, freshman honours | New curated table `prospect_accolades` with a source URL per row | No accolades = neutral, not negative, until the player has a full season |
| **Recruiting** | 247 composite rating, stars, national rank | Have (93–100 / 121) | Position average |
| **Measurables** | 40, height, weight, size-adjusted speed, and later the combine | Have height/weight; 40 to come | **Position average (owner's rule)**, flagged "estimated", so a missing 40 never moves the grade |
| **Market** (kept separate) | Draft projection, expert consensus, KTC | Import / KTC | Not part of the grade. Shown next to it (D5: show both signals) |

### 2b. Combine: a weighted grade plus "converging evidence"
- **Grade (0–100):** a weighted sum of the signals with versioned weights (`GRADE_VERSION`) that live in code, e.g. `lib/prospects/grade.ts`. The weights are fitted on history (§4), not guessed, and capped so that no single signal is over 40%.
- **Tier** comes from the grade cutoffs only (D3 option a), with one tier vocabulary everywhere.
- **Elite guard:** "Elite" or above also needs at least 3 of 4 signals (production, SOS-adjusted production, accolades, recruiting) to be at the elite band. This is what the owner described for Smith and Toney ("they all point to elite"). It also stops a single extreme signal from making someone elite. The reasons appear as chips: "Production ★ · Schedule ★ · Accolades ★ · Recruiting ✓".
- **Uncertainty:** each grade carries a confidence (High/Medium/Low) from data completeness and games played. Imputed signals lower the confidence, never the grade.
- **Manual overrides become explicit:** a `grade_override` column with a reason, an author and a date, shown in the UI as "Adjusted". They replace today's silent hand edits.

### 2c. One vocabulary (PR-20)
- One function, `prospectTier(grade)`, is used by every screen.
- The four systems are removed, and the legacy `tier`/`tier_numeric` columns go once nothing reads them.
- The duplicates are merged and the ESPN ids backfilled, as a data migration with a backup table.
- Label question for the owner (D-P4): "Contributer" is misspelled in the current vocabulary.

## 3. PR sequence

All of it runs in **shadow mode** first: v2 is computed next to the current grade and shown only in an internal diff report, until the owner signs off on the diff. This keeps the rule "don't silently change scoring".

| PR | Scope | Done when |
|---|---|---|
| **P0** audit | Read-only script: per-prospect coverage of every input, a check of the identical draft/expert values, the list of hand-edited grades, the duplicate list. Golden fixture of all 2027+ prospects as they are today | Report committed. The owner picks the **anchor list** (about 15 prospects with expected tiers, including Smith → Generational/Elite and Toney → Elite) |
| **P1** = PR-20 | One tier function and vocabulary, merge the 11 duplicates, backfill the 45 ESPN ids, data-health flag for label/cutoff disagreement | Zero duplicate names; one tier function; migration doc with rollback |
| **P2** inputs | `college_sos` from CFBD, the `prospect_accolades` table (with a curation script and sources), recruiting fields joined. Migrations are additive, dry-run, with rollback | Coverage report ≥ 90% for 2027–2028 on SOS and recruiting; accolades curated for the current top 50 |
| **P3** benchmarks | Historical benchmark tables by position from past classes (2014+) with outcomes from `history-outcomes.json` | Benchmarks versioned and committed; each signal's hit rate is monotonic by band |
| **P4** grade v2 (shadow) | `lib/prospects/grade.ts` (pure, versioned): signals, imputation, elite guard, confidence. Written to new columns `grade_v2`, `grade_v2_version`, `grade_v2_reasons`. The refresh job recomputes it when stats change | Unit tests for each signal and for imputation (a missing 40 doesn't change the grade). Anchor tests pass. Back-test: v2 hit rate by tier ≥ v1 on 2014–2023 |
| **P5** owner review | Diff report: every 2027+ prospect old → new, with reasons | **Owner sign-off** |
| **P6** switch | The UI reads v2 behind `PROSPECT_GRADE_V2`; reason chips and confidence on the board and cards; overrides go through `grade_override` | Screenshots; flag on after sign-off; v1 columns kept for one season as the rollback |

**Order:**
- P1 is PR-20 and stays inside Phase E (gate G4).
- P0 and P1 can go right after PR-21.
- P2–P6 come after G4. I'd suggest after the trade-history T1–T3, but that's the owner's call (D-P5).

## 4. Calibration and audit
- **Back-test.** Fit and check the weights on the 2014–2021 classes and hold out 2022–2023. Report each tier's hit rate (the `lib/hits-misses.ts` bands) for v1 vs v2, and also the anchor list. Exclude the known bad rows (56 `espnId:"NA"`, 2 id collisions).
- **No overfitting.** There are few weights, they are fitted on history and capped, and the holdout must not be worse than the training set by more than a set margin.
- **Every grade is reproducible.** Inputs, version and weights are stored, and a test recomputes a sample.
- **Data-health:** coverage per input, how many imputed signals there are, and v1/v2 disagreement until the switch.

## 5. Decisions for the owner
- **D-P1, the elite guard.** Recommended: 3 of 4 signals. The alternative is the grade alone.
- **D-P2, the source for strength of schedule.** Recommended: CFBD opponent defensive SP+. The alternative is conference tier only, which is simpler and coarser.
- **D-P3, who curates accolades.** Recommended: a scripted import from public award lists plus owner review. The alternative is manual entry only.
- **D-P4, tier labels.** Keep Generational / Elite / Blue Chip / Contributor (spelling fixed) / Depth / Walk-On?
- **D-P5, order.** Recommended: trade history T1–T3 before P2–P6, or the other way round?
- **D-P6, the existing hand edits** (Smith +13, Lacy +19). Keep them as explicit overrides until v2 is reviewed, or drop them?

## 6. Risks
- **Few past classes have SOS or accolade data.** If the history is thin, those weights are set conservatively and flagged, not fitted. P3 reports this.
- **Imputing the position average flatters unknown players slightly.** The confidence label shows that.
- **Visible tiers will change for many prospects** (76 already disagree). P5 sign-off and the flag cover that.
