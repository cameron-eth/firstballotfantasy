'use client'
import { useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'
import { describeTier, plainTierName } from '@/lib/player-signals'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { COLLEGE_LOGOS } from '@/lib/college-logos'
import { positionPalette, neutralPalette } from '@/lib/player-card-palette'

type DemoPlayer = {
  id: string
  name: string
  position: string
  team: string
  image: string
  /** KTC value for pros, scouting grade for prospects. */
  metric: number
  metricLabel: string
  tag: string
  tagTone: 'elite' | 'good' | 'neutral' | 'bad'
  note?: string
}

const nfl = (id: string) =>
  `https://static.www.nfl.com/image/upload/f_auto,q_auto,w_480/league/${id}`
const college = (id: number) =>
  `https://a.espncdn.com/i/headshots/college-football/players/full/${id}.png`
const nflLogo = (team: string) =>
  `https://a.espncdn.com/i/teamlogos/nfl/500/${team.toLowerCase()}.png`

const ROSTER: DemoPlayer[] = [
  {
    id: 'daniels',
    name: 'Jayden Daniels',
    position: 'QB',
    team: 'WAS',
    image: nfl('vrdweg39v1ay4zoc0lgp'),
    metric: 7412,
    metricLabel: 'KTC',
    tag: 'Elite QB1',
    tagTone: 'elite',
  },
  {
    id: 'cook',
    name: 'James Cook III',
    position: 'RB',
    team: 'BUF',
    image: nfl('anjbznqb9i21wzcgrtbs'),
    metric: 5986,
    metricLabel: 'KTC',
    tag: 'Star RB1',
    tagTone: 'good',
  },
  {
    id: 'lamb',
    name: 'CeeDee Lamb',
    position: 'WR',
    team: 'DAL',
    image: nfl('ijxzvtumjhqu3zva1bwc'),
    metric: 8701,
    metricLabel: 'KTC',
    tag: 'Elite WR1',
    tagTone: 'elite',
  },
  {
    id: 'olave',
    name: 'Chris Olave',
    position: 'WR',
    team: 'NO',
    image: nfl('vrrmyvpvujynckag9jop'),
    metric: 5804,
    metricLabel: 'KTC',
    tag: 'Strong WR2',
    tagTone: 'good',
  },
  {
    id: 'loveland',
    name: 'Colston Loveland',
    position: 'TE',
    team: 'CHI',
    image: nfl('tyjb6vfug7gaunvcune3'),
    metric: 4102,
    metricLabel: 'KTC',
    tag: 'Strong TE1',
    tagTone: 'good',
  },
]
const ROOKIE: DemoPlayer = {
  id: 'smith',
  name: 'Jeremiah Smith',
  position: 'WR',
  team: 'Ohio State',
  image: college(5079720),
  metric: 99,
  metricLabel: 'Grade',
  tag: 'Rookie target',
  tagTone: 'elite',
  note: '2027 class',
}
const TRADE: DemoPlayer = {
  id: 'moore',
  name: 'Dakorien Moore',
  position: 'WR',
  team: 'Oregon',
  image: college(5141586),
  metric: 77.9,
  metricLabel: 'Grade',
  tag: 'Trade idea',
  tagTone: 'good',
  note: 'For Lamb + 2028 1st',
}

type TierPayload = {
  identity: Record<string, { name: string }>
  players: {
    sf: Record<string, { value: number; number: number; name: string; positionRank?: number }>
  }
}

const fetchTiers = async (url: string): Promise<TierPayload> => {
  const r = await fetch(url)
  if (!r.ok) throw new Error('Tiers unavailable')
  return r.json()
}

/** Live KTC value and tier tag for the NFL players in the demo; prospects keep their grade. */
function withLiveValues(
  player: DemoPlayer,
  byName: Map<string, TierPayload['players']['sf'][string]>
): DemoPlayer {
  const live = player.metricLabel === 'KTC' ? byName.get(player.name) : undefined
  if (!live) return player
  const standing = describeTier({
    tierNumber: live.number,
    position: player.position,
    positionRank: live.positionRank,
  })
  return {
    ...player,
    metric: live.value,
    tag: standing.label ?? plainTierName(live.name),
    tagTone: standing.tone,
  }
}

/** The story the board tells on a loop: grade the roster, plan a rookie class, test a trade. */
const SCENES = [
  { label: 'Grading the roster', year: 'Now', roster: ROSTER },
  {
    label: 'Planning 2027',
    year: '2027',
    roster: ROSTER.map((p) => (p.id === 'olave' ? ROOKIE : p)),
  },
  {
    label: 'Testing a trade',
    year: '2028',
    roster: ROSTER.map((p) => (p.id === 'olave' ? ROOKIE : p.id === 'lamb' ? TRADE : p)),
  },
]
const SCENE_MS = 3200
/** Stable ids for the five lineup slots (the card in a slot changes; the slot does not). */
const SLOT_IDS = ['qb', 'rb', 'wr1', 'wr2', 'te'] as const

function CountUp({ to, decimals }: { to: number; decimals: number }) {
  const reduced = useReducedMotion()
  const [value, setValue] = useState(reduced ? to : 0)
  useEffect(() => {
    if (reduced) return setValue(to)
    let frame = 0
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 900)
      setValue(to * (1 - (1 - t) ** 3))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [to, reduced])
  return (
    <>
      {value.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
    </>
  )
}

function DemoCard({ player }: { player: DemoPlayer }) {
  const [failed, setFailed] = useState(false)
  const color = positionPalette[player.position] ?? neutralPalette
  const logo =
    COLLEGE_LOGOS[player.team] ?? (/^[A-Z]{2,3}$/.test(player.team) ? nflLogo(player.team) : null)
  const prospect = player.metricLabel === 'Grade'
  return (
    <div
      className="relative isolate flex aspect-[3/4] w-full flex-col overflow-hidden rounded-[20px] border border-white/15 shadow-[0_24px_60px_-24px_#000]"
      style={{ background: `linear-gradient(155deg, ${color.wash}, #10141e 70%)` }}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-70"
        style={{
          background: `radial-gradient(ellipse at 60% 35%, ${color.glow}99, transparent 65%)`,
        }}
      />
      {logo && (
        <img
          src={logo}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute right-[8%] top-[9%] z-0 w-[26%] opacity-30"
        />
      )}
      <span
        className="relative z-20 m-4 w-fit rounded-md border px-1.5 py-0.5 text-[10px] font-semibold"
        style={{
          color: color.ink,
          borderColor: `${color.ink}55`,
          backgroundColor: `${color.ink}15`,
        }}
      >
        {player.position}
      </span>
      {!failed && (
        <img
          src={player.image}
          alt=""
          onError={() => setFailed(true)}
          className="pointer-events-none absolute inset-x-0 top-[10%] z-10 mx-auto h-[62%] w-full object-contain object-top drop-shadow-[0_12px_20px_rgba(0,0,0,0.45)]"
        />
      )}
      <div className="relative z-20 mt-auto bg-gradient-to-t from-[#090e18] via-[#090e18]/95 to-transparent px-4 pb-4 pt-12">
        <span
          className={cn(
            'inline-block rounded-md border px-1.5 py-0.5 text-[10px] font-semibold',
            player.tagTone === 'elite'
              ? 'border-amber-300/60 bg-amber-300/10 text-amber-200'
              : 'border-emerald-400/50 bg-emerald-400/10 text-emerald-200'
          )}
        >
          {player.tag}
        </span>
        <p className="mt-2 truncate text-base font-semibold leading-tight text-white">
          {player.name}
        </p>
        <p className="truncate text-xs text-slate-400">{player.note ?? player.team}</p>
        <div className="mt-3 flex items-baseline justify-between border-t border-white/15 pt-2">
          <span className="text-xs text-slate-400">{player.metricLabel}</span>
          <span
            className="text-xl font-semibold tabular-nums"
            style={{ color: prospect ? color.ink : '#fcd34d' }}
          >
            <CountUp to={player.metric} decimals={prospect ? 1 : 0} />
          </span>
        </div>
      </div>
    </div>
  )
}

/** Landing demo of the Team Builder: one surface, five lineup cards, a short animated story. */
export function TeamMapPreview() {
  const reduced = useReducedMotion()
  const [scene, setScene] = useState(0)
  useEffect(() => {
    if (reduced) return
    const timer = setInterval(() => setScene((s) => (s + 1) % SCENES.length), SCENE_MS)
    return () => clearInterval(timer)
  }, [reduced])
  const { data: tiers } = useSWR('/api/dynasty-tiers', fetchTiers, { revalidateOnFocus: false })
  const byName = useMemo(
    () =>
      new Map(
        Object.entries(tiers?.identity ?? {}).flatMap(([id, who]) =>
          tiers?.players.sf[id] ? [[who.name, tiers.players.sf[id]] as const] : []
        )
      ),
    [tiers]
  )
  const current = {
    ...SCENES[scene],
    roster: SCENES[scene].roster.map((p) => withLiveValues(p, byName)),
  }
  return (
    <div className="relative">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <ol className="flex flex-wrap items-center gap-2 text-xs" aria-label="Demo steps">
          {SCENES.map((s, i) => (
            <li
              key={s.label}
              className={cn(
                'flex items-center gap-2 rounded-full border px-3 py-1 transition-colors',
                i === scene
                  ? 'border-blue-300/50 bg-blue-400/15 text-white'
                  : 'border-white/10 text-slate-500'
              )}
            >
              <span
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  i === scene ? 'bg-blue-300' : 'bg-slate-600'
                )}
              />
              {s.label}
            </li>
          ))}
        </ol>
        <div
          className="flex gap-1 rounded-xl border border-white/10 bg-slate-900/60 p-1 text-xs"
          aria-hidden="true"
        >
          {['Now', '2027', '2028'].map((y) => (
            <span
              key={y}
              className={cn(
                'rounded-lg px-3 py-1.5 transition-colors',
                current.year === y ? 'bg-blue-400/20 text-white' : 'text-slate-500'
              )}
            >
              {y}
            </span>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {current.roster.map((player, slot) => (
          <div key={SLOT_IDS[slot]} className={cn('relative', slot === 4 && 'hidden sm:block')}>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={player.id}
                initial={reduced ? false : { opacity: 0, y: 24, rotateY: -12 }}
                animate={{ opacity: 1, y: 0, rotateY: 0 }}
                exit={reduced ? undefined : { opacity: 0, transition: { duration: 0.12 } }}
                transition={{ duration: 0.4, delay: 0.1 }}
              >
                <DemoCard player={player} />
              </motion.div>
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  )
}
