// Baseline timings for the dashboard's metric functions on the golden fixtures
// (docs/data-architecture/PR_SEQUENCE.md, "Benchmark method"). Performance PRs paste the
// before/after output of this script.
//
//   node --import tsx --import ./tests/helpers/register.mjs scripts/bench/metrics.mjs
import { performance } from 'node:perf_hooks'
import { installReplay, installStorage, loadFixture } from '../../tests/helpers/replay-fetch.mjs'
import {
  fetchLeagueDataBundle,
  fetchKtcMaps,
  applyKtc,
  withTeamScores,
  ktcNamesFor,
  clearPlayersMemo,
} from '../../components/league-buddy/useLeagueData.ts'
import { fetchStandingsSettings } from '../../components/league-buddy/useStandingsOdds.ts'
import { calculatePlayoffOdds } from '../../components/league-buddy/utils/playoffOdds.ts'
import { calculateLeaguePlacements } from '../../components/league-buddy/competitiveState.ts'
import { calculateLeaguePositionRankings } from '../../components/league-buddy/utils.ts'
import { buildPowerRankings } from '../../lib/sleeper-sdk/values.ts'
import { teamScores } from '../../lib/team-score.ts'
import { suggestedTeamTrades } from '../../lib/sleeper-sdk/trade-opportunities.ts'

installStorage()

function time(fn, runs) {
  const samples = []
  for (let i = 0; i < runs; i++) {
    const t = performance.now()
    fn()
    samples.push(performance.now() - t)
  }
  samples.sort((a, b) => a - b)
  const pick = (q) => samples[Math.min(samples.length - 1, Math.floor(q * samples.length))]
  return { median: pick(0.5).toFixed(2), p95: pick(0.95).toFixed(2) }
}

const rows = []
for (const name of ['sf-dynasty', '1qb-dynasty', 'redraft-1qb']) {
  const fixture = loadFixture(name)
  installReplay(fixture)
  clearPlayersMemo()
  const bundle = await fetchLeagueDataBundle(fixture.leagueId, null, 0)
  const teams = withTeamScores(
    applyKtc(bundle.teams, await fetchKtcMaps(ktcNamesFor(bundle.teams), 0))
  )
  const settings = await fetchStandingsSettings(fixture.leagueId, teams)
  const viewer = teams[0]
  const cases = {
    'playoff odds (10k sims)': [
      () =>
        calculatePlayoffOdds(
          teams,
          settings.completed,
          settings.end,
          settings.spots,
          settings.schedule
        ),
      10,
    ],
    'power rankings': [
      () =>
        buildPowerRankings(
          teams.map((t) => ({ rosterId: t.rosterId, players: t.players })),
          bundle.rosterPositionsRaw
        ),
      50,
    ],
    placements: [() => calculateLeaguePlacements(teams, true), 50],
    'position rankings': [() => calculateLeaguePositionRankings(teams), 50],
    'team scores + grades': [() => withTeamScores(teams), 50],
    'team scores only': [() => teamScores(teams), 50],
    'suggested trades': [() => suggestedTeamTrades(viewer, teams, true, []), 20],
  }
  for (const [label, [fn, runs]] of Object.entries(cases))
    rows.push({ fixture: name, metric: label, runs, ...time(fn, runs) })
}

console.log(`Node ${process.version} · ${new Date().toISOString()}`)
console.log('| Fixture | Metric | Runs | Median ms | p95 ms |\n|---|---|---|---|---|')
for (const r of rows)
  console.log(`| ${r.fixture} | ${r.metric} | ${r.runs} | ${r.median} | ${r.p95} |`)
