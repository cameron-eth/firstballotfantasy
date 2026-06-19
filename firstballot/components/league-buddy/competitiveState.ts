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
import type { PlayerData, TeamData } from './types'

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
  accent: string // hex, used for SVG fills/strokes
  text: string // tailwind text color
  border: string // tailwind border color
  bg: string // tailwind background tint
}

export const COMPETITIVE_STATES: Record<CompetitiveStateKey, CompetitiveStateMeta> = {
  juggernaut: {
    key: 'juggernaut',
    label: 'Juggernaut',
    tagline: 'Best of both worlds',
    description: 'Elite roster, young enough to dominate now and keep the window open. Press your advantage.',
    accent: '#fbbf24',
    text: 'text-yellow-400',
    border: 'border-yellow-400/40',
    bg: 'bg-yellow-400/10',
  },
  contender: {
    key: 'contender',
    label: 'Contender',
    tagline: 'Win-now window open',
    description: 'Strong roster with an aging core. The window is open — push your chips in before it closes.',
    accent: '#60a5fa',
    text: 'text-blue-400',
    border: 'border-blue-400/40',
    bg: 'bg-blue-400/10',
  },
  'house-money': {
    key: 'house-money',
    label: 'House Money',
    tagline: 'Punching above your roster',
    description: 'Your record is outrunning your roster value. Everything from here is a bonus — sell high or ride it.',
    accent: '#c084fc',
    text: 'text-purple-400',
    border: 'border-purple-400/40',
    bg: 'bg-purple-400/10',
  },
  rebuild: {
    key: 'rebuild',
    label: 'Rebuild',
    tagline: 'Young and ascending',
    description: 'Light on win-now value but rich in youth. Stockpile picks, develop, and time the leap.',
    accent: '#22d3ee',
    text: 'text-cyan-400',
    border: 'border-cyan-400/40',
    bg: 'bg-cyan-400/10',
  },
  purgatory: {
    key: 'purgatory',
    label: 'Purgatory',
    tagline: 'Stuck in the middle',
    description: 'Not strong enough to contend, not young enough to rebuild. Pick a direction and commit.',
    accent: '#f87171',
    text: 'text-red-400',
    border: 'border-red-400/40',
    bg: 'bg-red-400/10',
  },
}

export interface TeamPlacement {
  rosterId: number
  nowScore: number // 0–100, relative to league
  futureScore: number // 0–100, relative to league
  valueTotal: number // raw KTC SF total of core
  avgAge: number // core avg age (0 if unknown)
  state: CompetitiveStateKey
}

export interface LeaguePlacements {
  placements: Record<number, TeamPlacement>
  nowMedian: number
  futureMedian: number
}

/** Top-N core assets by KTC SF value (rank as fallback when KTC is missing). */
function coreAssets(team: TeamData): PlayerData[] {
  return [...team.players]
    .filter((p) => CORE_POSITIONS.includes(p.position))
    .sort((a, b) => {
      const av = a.ktcValueSf ?? Math.max(0, 300 - (a.rank || 999))
      const bv = b.ktcValueSf ?? Math.max(0, 300 - (b.rank || 999))
      return bv - av
    })
    .slice(0, CORE_DEPTH)
}

function rosterValue(team: TeamData): number {
  return coreAssets(team).reduce(
    (sum, p) => sum + (p.ktcValueSf ?? Math.max(0, 300 - (p.rank || 999)) * 10),
    0
  )
}

function coreAvgAge(team: TeamData): number {
  const aged = coreAssets(team).filter((p) => (p.age ?? 0) > 0)
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

function winPct(team: TeamData): number {
  const games = team.wins + team.losses
  return games > 0 ? team.wins / games : 0
}

/**
 * Compute competitive-state placements for every team, relative to the league.
 * `inSeason` enables the House Money overlay (needs real games played).
 */
export function calculateLeaguePlacements(
  teams: TeamData[],
  inSeason: boolean
): LeaguePlacements {
  if (!teams || teams.length === 0) {
    return { placements: {}, nowMedian: 50, futureMedian: 50 }
  }

  const raw = teams.map((t) => ({
    rosterId: t.rosterId,
    value: rosterValue(t),
    // youth: younger core → higher future score, so we invert age
    youth: (() => {
      const age = coreAvgAge(t)
      return age > 0 ? -age : 0
    })(),
    avgAge: coreAvgAge(t),
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
