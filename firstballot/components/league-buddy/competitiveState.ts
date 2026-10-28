// Competitive-state model for dynasty franchises.
//
// Every team is placed on a 2-axis grid:
//   • NOW   (x) — current roster strength, from KTC SF value, relative to the league.
//   • FUTURE(y) — trajectory, from roster youth (core avg age), relative to the league.
//
// The league median on each axis splits the grid into four quadrants, which map
// to four structural states. A fifth state — House Money — is an in-season overlay
// for teams whose record materially outruns their roster value.
//
//        FUTURE ↑ (younger / ascending)
//   REBUILD          │          JUGGERNAUT
//   weak + young     │          strong + young
//  ─────────────────┼────────────────────────→ NOW (stronger roster)
//   PURGATORY        │          CONTENDER
//   weak + old       │          strong + aging
//
import { playerValue, type LeagueContext } from '@/lib/sleeper-sdk'
import type { PlayerData, TeamData } from './types'
import { leagueTeamValues } from '@/lib/league-metrics/team-value'
import { winPct } from '@/lib/league-metrics/standings'

const CORE_POSITIONS = ['QB', 'RB', 'WR', 'TE']
const CORE_DEPTH = 12 // top N assets that define a roster's value & age profile

export type CompetitiveStateKey =
  | 'juggernaut'
  | 'contender'
  | 'house-money'
  | 'rebuild'
  | 'purgatory'

export interface CompetitiveStateMeta {
  key: CompetitiveStateKey
  label: string
  tagline: string
  description: string
  /** Hex of the state's semantic token (DESIGN_SYSTEM.md §1), for SVG fills and strokes. */
  accent: string
  text: string // tailwind text color
  border: string // tailwind border color
  bg: string // tailwind background tint
  plan: string[] // recommended actions for a team in this state
}

export const COMPETITIVE_STATES: Record<CompetitiveStateKey, CompetitiveStateMeta> = {
  juggernaut: {
    key: 'juggernaut',
    label: 'Juggernaut',
    tagline: 'Best of both worlds',
    description:
      'Elite roster, young enough to dominate now and keep the window open. Press your advantage.',
    accent: '#fcd34d',
    text: 'text-elite',
    border: 'border-elite/40',
    bg: 'bg-elite/10',
    plan: [
      "Press the advantage — target other contenders' aging vets while your window is wide open",
      "Avoid trading future picks away; you don't need to mortgage the future to win now",
      'Use your depth as trade capital to plug the one or two weakest starting spots',
      "Don't get complacent on the waiver wire — marginal upgrades compound over a long window",
    ],
  },
  contender: {
    key: 'contender',
    label: 'Contender',
    tagline: 'Win-now window open',
    description:
      'Strong roster with an aging core. The window is open — push your chips in before it closes.',
    accent: '#34d399',
    text: 'text-positive',
    border: 'border-positive/40',
    bg: 'bg-positive/10',
    plan: [
      'Sell future picks for proven win-now production — your aging core has a shrinking shelf life',
      "Target rebuilding teams' aging starters at a discount before their value cliff hits",
      'Prioritize depth at your thinnest starting position over speculative youth',
      "Don't hoard rookie picks you won't be competitive enough to use",
    ],
  },
  'house-money': {
    key: 'house-money',
    label: 'Pretender',
    tagline: 'Punching above your roster',
    description:
      'Your record is outrunning your roster value. Everything from here is a bonus — sell high or ride it.',
    accent: '#fb923c',
    text: 'text-warning',
    border: 'border-warning/40',
    bg: 'bg-warning/10',
    plan: [
      'Sell high on any player whose value has spiked past what their long-term outlook supports',
      'Be honest about roster construction — a good record can mask real depth problems',
      'Target future picks in trades rather than more short-term rentals',
      "Don't buy into your own hype — bolster the roster like a team that expects to regress",
    ],
  },
  rebuild: {
    key: 'rebuild',
    label: 'Rebuilder',
    tagline: 'Young and ascending',
    description:
      'Light on win-now value but rich in youth. Stockpile picks, develop, and time the leap.',
    accent: '#c4b5fd',
    text: 'text-pick',
    border: 'border-pick/40',
    bg: 'bg-pick/10',
    plan: [
      'Trade aging win-now vets to contenders while their value is still high',
      "Stockpile future draft picks — they're your cheapest path to more young assets",
      "Be patient with your young core; don't panic-trade after a slow start",
      "Avoid overpaying for short-term rentals that don't extend your competitive window",
    ],
  },
  purgatory: {
    key: 'purgatory',
    label: 'Fringe Team',
    tagline: 'Stuck in the middle',
    description:
      'Not strong enough to contend, not young enough to rebuild. Pick a direction and commit.',
    accent: '#fb7185',
    text: 'text-negative',
    border: 'border-negative/40',
    bg: 'bg-negative/10',
    plan: [
      'Pick a direction — half-measures keep you stuck here longest',
      "Audit your core's remaining window; if it's under 2 years, lean toward rebuilding",
      'Sell aging assets before they decline further, even at a discount',
      'Avoid speculative "sidegrade" trades that don\'t clearly push you toward contending or rebuilding',
    ],
  },
}

export interface TeamPlacement {
  rosterId: number
  nowScore: number // 0–100, relative to league
  futureScore: number // 0–100, relative to league
  valueTotal: number // team dynasty value (lib/league-metrics/team-value)
  avgAge: number // core avg age (0 if unknown)
  state: CompetitiveStateKey
}

export interface LeaguePlacements {
  placements: Record<number, TeamPlacement>
  nowMedian: number
  futureMedian: number
}

/** Top-N core assets by dynasty value (SDK handles the KTC-or-rank fallback). */
function coreAssets(team: TeamData, ctx: LeagueContext): PlayerData[] {
  return [...team.players]
    .filter((p) => CORE_POSITIONS.includes(p.position))
    .sort((a, b) => playerValue(b, ctx) - playerValue(a, ctx))
    .slice(0, CORE_DEPTH)
}

function coreAvgAge(team: TeamData, ctx: LeagueContext): number {
  const aged = coreAssets(team, ctx).filter((p) => (p.age ?? 0) > 0)
  if (aged.length === 0) return 0
  return aged.reduce((sum, p) => sum + p.age, 0) / aged.length
}

/** Min-max normalize to 0–100. Returns 50 for everyone when there's no spread. */
function normalize(value: number, min: number, max: number): number {
  if (max - min < 1e-9) return 50
  return Math.round(((value - min) / (max - min)) * 100)
}

function median(values: number[]): number {
  if (values.length === 0) return 50
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

/**
 * Compute competitive-state placements for every team, relative to the league.
 * `inSeason` enables the House Money overlay (needs real games played).
 */
export function calculateLeaguePlacements(
  teams: TeamData[],
  inSeason: boolean,
  ctx: LeagueContext
): LeaguePlacements {
  if (!teams || teams.length === 0) {
    return { placements: {}, nowMedian: 50, futureMedian: 50 }
  }

  // Win-now is the league's dynasty value (quality-weighted), so it orders teams exactly
  // like the Overview and My Team dynasty ranks.
  const teamValues = leagueTeamValues(teams, ctx)
  const raw = teams.map((t) => ({
    rosterId: t.rosterId,
    value: teamValues.get(t.rosterId)?.value ?? 0,
    // youth: younger core → higher future score, so we invert age
    youth: (() => {
      const age = coreAvgAge(t, ctx)
      return age > 0 ? -age : 0
    })(),
    avgAge: coreAvgAge(t, ctx),
  }))

  const values = raw.map((r) => r.value)
  const youths = raw.map((r) => r.youth)
  const minV = Math.min(...values)
  const maxV = Math.max(...values)
  const minY = Math.min(...youths)
  const maxY = Math.max(...youths)

  const scored = raw.map((r) => ({
    rosterId: r.rosterId,
    nowScore: normalize(r.value, minV, maxV),
    futureScore: normalize(r.youth, minY, maxY),
    valueTotal: r.value,
    avgAge: r.avgAge,
  }))

  const nowMedian = median(scored.map((s) => s.nowScore))
  const futureMedian = median(scored.map((s) => s.futureScore))

  // Record context for the House Money overlay.
  const games = teams.map((t) => t.wins + t.losses)
  const anyGames = games.some((g) => g > 0)

  const placements: Record<number, TeamPlacement> = {}
  for (const s of scored) {
    const team = teams.find((t) => t.rosterId === s.rosterId)!
    const nowHigh = s.nowScore >= nowMedian
    const futHigh = s.futureScore >= futureMedian

    let state: CompetitiveStateKey
    if (nowHigh && futHigh) state = 'juggernaut'
    else if (nowHigh && !futHigh) state = 'contender'
    else if (!nowHigh && futHigh) state = 'rebuild'
    else state = 'purgatory'

    // House Money overlay: a winning record built on a below-median roster.
    if (inSeason && anyGames && !nowHigh && winPct(team) >= 0.6) {
      state = 'house-money'
    }

    placements[s.rosterId] = {
      rosterId: s.rosterId,
      nowScore: s.nowScore,
      futureScore: s.futureScore,
      valueTotal: s.valueTotal,
      avgAge: s.avgAge,
      state,
    }
  }

  return { placements, nowMedian, futureMedian }
}
