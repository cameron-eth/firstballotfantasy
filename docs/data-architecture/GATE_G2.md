# Gate G2: reliability phase (after PR-13)

**Criterion (PR_SEQUENCE.md):** every scheduled job alerts on failure and logs to `ingestion_runs`; every snapshot key is a constant and shown in data-health. Checked by a forced-failure run that opens an issue, and data-health listing every key.

**Status, 2026-10-28: passed** with the PR-13b follow-up (snapshot key constants for projections, prospect stats and rosters; draft capital listed in data-health).

## Scheduled jobs: forced failure, then recovery

Every job ran once with `simulate_failure`, then once normally, on `main`.

| Job | Failure issue | Recovery | `ingestion_runs` |
|---|---|---|---|
| College prospect production (`college-prospects.yml`) | #85 opened (PR-3) | closed by the next run | `job:college-prospects` failed and success rows |
| KTC history (`ktc-history.yml`) | #106 opened | closed, "Recovered" | `job:ktc-history` |
| Historical career outcomes (`history-outcomes.yml`) | #104 opened | closed, "Recovered" | `job:history-outcomes` |
| Data freshness (`data-health.yml`, its own issue path) | #105 "Data freshness incident" opened | closed by the passing check | `job:data-health` |

The recovery runs opened the jobs' usual refresh PRs (#107, #108); they were closed as duplicates.

## Snapshot keys

All keys are built in `lib/platform/snapshot-keys.ts`. `tests/snapshot-keys.test.mjs` fails on a key written at a call site.

| Family | Builder | Writer | In data-health |
|---|---|---|---|
| `espn:ppr:{season}` | `espnSeasonKey` | `snapshot()` (player data) | listed and monitored (current and career seasons) |
| `sleeper:projections:{season}:{week\|season}` | `projectionsKey` | `snapshot()` (projections) | listed and monitored (season and current week) |
| `dynasty:tiers:v{n}` | `TIER_KEY` | `publish_dynasty_tiers` RPC | listed and monitored |
| `nfl:draft-capital:v1` | `DRAFT_CAPITAL_KEY` | `writeSnapshot()` | **listed** (5-year cache of fixed facts, not monitored) |
| `identities:v1` | `IDENTITIES_KEY` | history job | listed and monitored |
| `history-outcomes:{season}` | `historyOutcomesKey` | history job | newest listed and monitored |
| `prospects:{year}:espn` | `prospectStatsKey` | college job | listed per class; next class monitored |
| `sleeper:rosters:{league}` | `sleeperRostersKey` | `snapshot()` (API roster read) | **excluded on purpose**: private per league |

Python jobs build their keys from the same patterns; the guard test checks the college script's write and log.
