# Interface and dead-code audit — 2026-10-25

## Removed in this change

Reference search across application and component TS/TSX confirmed no consumers for MatchupView, PositionRankings, BoardFitControls, or the rendered TeamTimeline. Removed those obsolete views while preserving shared timeline calculation, draft-capital notes, and board data hooks. The old position-only RosterCardStack is replaced by league-slot LineupMap.

## Shared design adopted

- Builder uses a compact timeline and Plans popover, with shared Radix CompactSelect controls.
- Daily ballot highlights the selection immediately, displays pending state, and confirms only after persistence. Failed writes retain the selection for retry and reconcile server state first.
- Builder gets raw league roster slots from the existing LeagueBuddy data source. It uses the existing MaxPF/start-sit assignment engine, scored with the same actual FPPG used in My Team. No additional league-settings fetch or fabricated default lineup.
- Manual lineup choices are scoped to scenario and year and use existing private scenario storage. NFL FPPG is a current production baseline, not a future-year forecast; prospects have no fabricated NFL points.

## Follow-up priorities

1. **Scouting cards and detail modals:** ProspectCard still has oversized monospaced rank/grade treatments and its own image/card hierarchy. Consolidate portrait, school identity, typography and metrics with StrategyCard without losing scouting-specific grades and reports.
2. **Standings/playoff odds:** PlayoffOddsSection retains monospaced scorecards and a separate summary-card language. Move its summary into the standings table/header; keep the simulation and league-rule inputs.
3. **Overview trade intelligence:** It still renders the legacy buy/hold/sell presentation alongside the newer suggested-trade workflow. Replace with the shared compact suggestions once overview entry points are unified; do not silently remove live trade data.
4. **Save consistency:** Builder now has immediate Saving/unsaved/saved feedback; draft board and scouting-note save controls should adopt a shared persistence-status component with retry and retained edits. Do not show a saved state before acknowledgement.

## Unused-code scan

Ran TypeScript with `--noUnusedLocals --noUnusedParameters` as an audit, without changing project compiler gates. The scan reported 115 existing diagnostics. Findings include unused imports in billing, header, landing HeroSection/ScoutingFeatured, scouting portal and auth guard; old helper functions/parameters remain in playoff and analysis views. These need a focused follow-up cleanup rather than deleting active features based on an unused local. Next route entrypoints, scripts, SQL migrations and reusable UI exports are not classified as dead simply because imports are absent.

## Verification

Typecheck, React component checks, and 100 automated tests pass, including unique starters, shared eligible backups, manual prospect placement, overlapping flex eligibility, and persisted per-year assignment validation. UI screenshots use local review routes; those routes are removed from the shipped change. No live trade or lineup actions were sent.
