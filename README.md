# First Ballot Fantasy

A fantasy football workspace for college scouting, dynasty roster planning and in-season league decisions. The application lives in [`firstballot/`](firstballot/).

## Product

- **College scouting:** prospect cards, grades, class-specific draft boards and personal notes.
- **Team Builder:** a desktop-browser planning canvas with league-specific starting slots, a shared bench, future rookie targets, owned draft capital and hypothetical acquisition paths. The desktop map is the default league view. Mobile and touch layouts use Overview instead.
- **In-season management:** current-season actual FPPG, weekly league-scored projections, KTC history, player momentum and suggested trades. Connected users review and confirm supported Sleeper actions.
- **Standings:** records, PF, MaxPF draft race and playoff estimates in one sortable table.
- **Community rankings:** daily pairwise ballots and a dedicated voting section, with separate dynasty and current-NFL pools.
- **History:** original scouting grades and compact career-outcome bars against historical rookie ADP expectations.

College scouting and future draft planning are dynasty features. Redraft experience focuses on the current season.

## Start here

- [Application setup and architecture](firstballot/README.md)
- [Public data sources, caches and refresh jobs](firstballot/data/README.md)
- [History outcome methodology](firstballot/docs/history-outcomes-plan.md)
- [Sleeper connection storage and Heat](firstballot/docs/sleeper-connections.md)
- [Trade discovery and execution](firstballot/docs/trade-opportunities.md)
- [Community ballot storage/model](firstballot/docs/community-rankings.md)
- [Planning timeline assumptions](firstballot/docs/team-planning-timeline.md)

## Important distinctions

Actual FPPG is **current-season standard PPR from ESPN**. Weekly projections use **the selected Sleeper league's scoring rules**. A projected pick slot is a MaxPF-based planning assumption, not a guaranteed draft result. KTC is a market-value reference, not an acceptance probability. Scenario changes do not modify a live roster or pick owner.

The Next.js app hosts its own server API. There is no separate FastAPI service. Selected Sleeper SDK pick/trade logic is ported to TypeScript; the KTC refresh workflow uses the Python SDK scraper.
