# History: outcomes on the player card

Implemented in PR #32. History defaults to all past draft classes, sorted by original grade descending with ungraded records last. Future classes are excluded server-side; the current class enters history after April. Missing NFL identity remains unrated. The separate analytics page and dead Scout player actions are removed.

## Version 1: rookie-adp-ppr-v1

The five-bar card meter compares cumulative regular-season NFL PPR points against the **weighted mean production of earlier rookies at similar acquisition cost**. It does not change scouting grades.

- Acquisition cost: Fantasy Football Calculator's archived average rookie ADP in 12-team drafts, matched by normalized name, position and entry year to a unique GSIS ID. ESPN ID + entry year joins outcomes to app cards.
- Reject missing ADP, ambiguous identity, fewer than five draft observations, wrong archive years and windows ending after September 6. Archive windows differ by class and are exposed in the disclosure. This is not a superflex-specific baseline.
- Cohort: same position, strictly earlier classes, ADP between half and twice the subject's ADP, at least eight comparables. Weight is `exp(-(log(peerADP / subjectADP) / log(2))²)`.
- Production: full PPR, four-point passing touchdowns, regular season only, from nflverse. Compare the same number of completed career seasons plus the same fraction of the latest season, rounded to a week to accommodate 17/18-week schedules.
- Missing weeks and retired players remain zero within a verified league-wide stat archive. Retired players are not dropped. Injuries count against realized cumulative production; this is return on acquisition cost, not talent evaluation.
- Bars: below 50% of expectation = 1 (red); 50–79% = 2; 80–119% = 3; 120–149% = 4; at least 150% = 5 (green). These are transparent descriptive thresholds, not calibrated probabilities or predictions.
- First two seasons carry an Early signal label. No ADP, sparse comparables or unavailable identity produce gray bars with the reason, never a miss.
- Card disclosure includes observed/expected PPR, ADP, sample size, archive dates, production cutoff and source links. The meter adds no card section or extra analytics page.

## Data and refresh

`python3 scripts/import-history-outcomes.py` generates `data/history-outcomes.json`. A server API computes outcomes; raw weekly records are not shipped in the browser bundle. The snapshot is versioned in Git, so it survives deployments and is auditable. The weekly workflow proposes a dataset refresh PR rather than silently changing the model.

Initial snapshot: 2,695 NFL identities; 377 matched rookie ADP records; production through 2026 Week 6. Usable ADP cohorts: 2014, 2016–2023, 2025. The source has no rookie players for 2024 or 2026. The 2015 window is rejected as too late. Earlier classes and players without sufficient prior peers remain neutral. Coverage is reported in the snapshot.

## Limits and follow-up validation

This first version uses cumulative PPR, not points above replacement. The rookie format and observation windows are not uniform across years. Sparse QB/TE cohorts and older classes may be unrated. We should add licensed historical superflex ADP and evaluate threshold stability on held-out classes before presenting the bars as a predictive hit probability. No substituted KTC rank, NFL draft position or invented ADP is used.

## Verification

Tests cover null-last sorting, equal career stages, missing ADP, sparse peers, excluded same/future classes, position and ADP matching, high/low outcomes and retaining zero-production peers. Browser checks cover all-class default, graded order, compact cards and outcome disclosure. Existing PR work retains desktop-only Team Builder and unified league insights.
