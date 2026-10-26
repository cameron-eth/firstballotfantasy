# Dynasty player tiers

The old `dynasty_player_tiers` rows were last updated on 2026-02-22. Their generator is not in this repository, and its component weights and refresh schedule cannot be verified. Do not serve those rows as current rankings. The Team Builder, rankings page, and trade-market labels now read `data_snapshots['dynasty:tiers:v1']` instead. The legacy table remains only as a candidate source for existing community ballot identities; removing it needs a ballot-key migration.

## Population and inputs

- Current KTC QB/RB/WR/TE values in `ktc_player_values`, joined to the Sleeper NFL catalog by normalized name **and** position. Ambiguous matches are excluded. Snapshot validation requires at least 200 matches and 90% coverage of KTC NFL player rows. Draft-pick assets are excluded.
- ESPN current-season actual PPR fantasy points per game, with at least three games, converted from positional FPPG rank to a 0–1 factor. Rank cutoffs are QB 40, RB 60, WR 90, TE 50. This is current production, not a career forecast.
- ESPN current-season fantasy average draft position. This is **redraft ADP**, a small market signal, not dynasty ADP and not NFL draft position.
- Sleeper age, assessed against position-specific peak windows: QB 25–32, RB 22–26, WR 23–29, TE 24–30.
- Real NFL overall draft selection and draft year from ESPN's NFL athlete record. These are immutable facts cached in `data_snapshots['nfl:draft-capital:v1']`; an unavailable or undrafted selection is omitted rather than inferred from round or fantasy ADP.

The score is a weighted mean on a 0–100 scale: KTC market 65%, current PPR production 18%, fantasy ADP 8%, age 6%, NFL draft capital 3%. Missing factors are removed and remaining weights renormalized. Superflex and one-QB snapshots use their respective KTC market values; all other factors are shared. The exact functions and thresholds live in `lib/dynasty-tiers.ts`. This is a transparent heuristic, not a trained outcome predictor.

| Tier | Score | Card treatment |
| --- | ---: | --- |
| 1 Elite | 82–100 | Strong amber |
| 2 Star | 72–<82 | Strong amber |
| 3 High-end starter | 62–<72 | Subtle green |
| 4 Solid starter | 51–<62 | Neutral |
| 5 Flex / upside | 40–<51 | Neutral |
| 6 Depth / dart | 30–<40 | Neutral |
| 7 Roster fringe | 20–<30 | Subtle red |
| 8 Waiver range | <20 | Subtle red |

The numeric rank is global within a scoring format. Roster slots continue to be selected by current FPPG and league lineup rules; tiers color the card and do not override the lineup.

## Refresh and freshness

The KTC GitHub Actions workflow starts daily at 10:30 UTC. After it imports that day's values, it calls the authenticated `POST /api/dynasty-tiers` endpoint. The endpoint validates KTC age (48-hour maximum), refreshes the shared ESPN current-season snapshot if its 15-minute cache has expired, fills missing NFL draft facts, and publishes one atomic server snapshot for both formats. It records coverage and source dates. The tier snapshot expires after 30 hours; readers return 503 after expiry and the map stops showing tier colors. The hourly data-health monitor checks this dataset. Failures are recorded in `ingestion_runs` and do not extend the old snapshot.

College prospect scouting grades use a separate model because future players have no NFL draft selection or pro FPPG. They do not receive an NFL dynasty tier until they appear in the KTC NFL population and resolve to a Sleeper player.
