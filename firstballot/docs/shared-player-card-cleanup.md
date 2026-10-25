# Shared player cards and cleanup — 2026-10-25

## Navigation

The league dashboard defaults to Team Builder. An explicit `tab=overview` still opens Overview; standings/roster/audit deep links remain supported. Dashboard tabs and the global league menu put the map first. `/team-builder` redirects to the league dashboard and retains a supplied league ID.

## Card system

`components/players/PlayerTradingCard.tsx` owns the shared position palette, portrait containment, small team/college logo, typography, borders, selected/saving state and optional action/metric content. The builder's StrategyCard remains a compatibility export, so map and daily-ballot callers use the same implementation.

Adopted by scouting prospects, historical classes, prospect-board/rankings grids, market buy/sell cards, overview trade signals, and insights player cards. Scouting grades, physical/production measures, class, board membership, market values and KTC sparklines remain available. Dense lineup/standings tables remain compact tables. Landing cards retain their intentional motion/tilt treatment and share the existing position palette.

## Removed

Import-graph traversal from Next app entrypoints plus reference searches identified unused components: legacy DraftAnalysis, DraftBoardGrid, TeamValueGraph, app-shell, error-boundary, loading-spinner, ngs-stats-widget, page-header, lowercase player-card-hero, player-matchup-card, player-ngs-stats, spinner, team-logo, theme-provider, trade-charts, upgrade-prompt, landing ScoutingFeatured, LeagueOverviewSection, NGSMetricsOverview, RecordSection, StartSitPanel and ProspectFreshness.

Retired the duplicate team-builder archetype UI, its hook and `/api/team-archetypes`, plus the orphaned `/api/draft-analysis` endpoint. The current map, standings playoff calculation, Sleeper actions and draft board remain active. Removed unreferenced scouting drag simulation/modal flags, unused comparison maps, helper functions and imports. Removed guard-test entries for deleted files and added the shared card to the existing type-safety guard.

## Gates

TypeScript now enforces `noUnusedLocals` and `noUnusedParameters`. Both scans are clean. The repository's React Doctor, frontend guards and 100 tests pass; the production build passes. Browser verification uses public scouting data and a temporary guest dashboard route; that route is not shipped. No live trades, votes or lineup changes were submitted.
