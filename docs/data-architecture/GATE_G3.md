# Gate G3: performance phase (after PR-18)

**Criterion (PR_SEQUENCE.md):** each optimized path shows a measured improvement on the benchmark harness, with no regression in the golden fixtures. Evidence: benchmark tables in the PR bodies.

**Status, 2026-10-29: passed.** Every Phase D PR measured its path before and after. No golden value changed in PR-14 to PR-18, apart from the documented additions to the snapshots and the D4 valuation basis, which is a deliberate change behind a selector. Two improvements ship behind flags that are still off; they are listed below.

## Measurements

| PR | Path | Harness | Before → after |
|---|---|---|---|
| PR-14 (#110) | Dashboard re-renders | `scripts/bench/render.mjs`, sf-dynasty, Profiler render ms (median of 3) | Switch to Standings 623 → 40; back to Overview 888 → 153 (6 → 2 commits); window focus 90 → 0 (1 → 0 commits); initial load 1090 → 968 |
| PR-15a/b (#111, #112) | Playoff odds off the main thread | `render.mjs` with `BENCH_SERVER_METRICS=1` | Initial load 979 → 422 ms render **with the flag on**. Production route: 7–11 s cold, 4–6 ms warm; parity on GUTS for all 10 teams |
| PR-16a (#113) | Trade Market payload and fan-out | Production, your dynasty leagues | 14.3–14.4 MB → **265–498 KB**; 2.6–3.0 s → 0.9–1.1 s warm (2.7–3.1 s cold); KPIs identical on real payloads |
| PR-16b (#114) | Trade-date valuation (D4) | Real payloads | Not a speed change; numbers change by design. Coverage 35/81 and 77/186 trades |
| PR-17 (#115, fix #116) | Community ratings read | Production DB, 13 ballots | Read path 556 → 414 ms; trends endpoint 842 → 570–717 ms. The old path grows by one download round per 20 ballots; the new one is 2 queries |
| PR-18 (#117) | Duplicate first-load requests | `render.mjs` request count; production resource timing | Harness 48 → 43 (no duplicates). Production 57 → 49; the last duplicate league read (`useLeagueFormat`) is fixed in the G3 PR |

**Pure functions** (`scripts/bench/metrics.mjs`) are unchanged. Playoff odds still cost about 568 ms per fresh simulation in sf-dynasty: PR-14 caches the result and PR-15 can move it to the server, but neither makes the simulation itself faster.

## Goldens

All six goldens pass on `main` with unchanged values. The server-metrics parity test (PR-15a) requires the server path to reproduce them exactly on three recorded leagues.

## Not enabled (owner decision)

| Flag | PR | Effect when on | Trade-off |
|---|---|---|---|
| `SNAPSHOT_STALE_WHILE_ERROR=1` | PR-12 | Serves labelled stale ESPN and Sleeper data during an outage instead of a 503 | None found; the monitor still alerts |
| `NEXT_PUBLIC_SERVER_LEAGUE_METRICS=1` | PR-15b | Playoff odds come from the server; initial render about 0.56 s lighter | A cold league waits 7–11 s for odds (vs about 1 s) until its 15-minute snapshot is warm |

## Carried forward

- Cold server metrics are dominated by loading every input, including Sleeper's ~18 MB players file. That cost belongs with PR-19 (identity service) and PR-21 (one Sleeper client).
- A data-health signal for a lasting community-tally mismatch would have caught the PR-17 collation bug sooner; it fits PR-24.
- The Trade Market page uses the selected league in preference to `?leagueId=`. This predates Phase 2 and is a product question, not a gate item.
