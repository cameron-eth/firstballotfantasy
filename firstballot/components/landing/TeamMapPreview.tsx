'use client'
import { useEffect, useRef, useState, type RefObject } from 'react'
import useSWR from 'swr'
import { describeTier, plainTierName } from '@/lib/player-signals'
import { AnimatePresence, animate, motion, useReducedMotion } from 'framer-motion'
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
  /** NFL players only: live values come from the tier snapshot by this id, never by name. */
  sleeperId?: string
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
    sleeperId: '11566',
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
    sleeperId: '8138',
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
    sleeperId: '6786',
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
    sleeperId: '8144',
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
    sleeperId: '12517',
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
  sfPlayers: TierPayload['players']['sf'] | undefined
): DemoPlayer {
  const live = player.sleeperId ? sfPlayers?.[player.sleeperId] : undefined
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
const SCENE_MS = 4800
/** One easing curve for everything: quick to start, long soft landing. */
const EASE = [0.22, 1, 0.36, 1] as const
const FLIP_SPRING = { type: 'spring', stiffness: 180, damping: 22, mass: 0.9 } as const
/** Stable ids for the five lineup slots (the card in a slot changes; the slot does not). */
const SLOT_IDS = ['qb', 'rb', 'wr1', 'wr2', 'te'] as const

/** Glides from whatever it last showed to the new value, so a change never resets to zero. */
function CountUp({ to, decimals, from }: { to: number; decimals: number; from?: number }) {
  const reduced = useReducedMotion()
  const shown = useRef(reduced ? to : (from ?? to))
  const [value, setValue] = useState(shown.current)
  useEffect(() => {
    if (reduced) {
      shown.current = to
      setValue(to)
      return
    }
    const controls = animate(shown.current, to, {
      duration: 0.9,
      ease: EASE,
      onUpdate: (v) => {
        shown.current = v
        setValue(v)
      },
    })
    return () => controls.stop()
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

function DemoCard({
  player,
  highlight,
  countFrom,
}: {
  player: DemoPlayer
  highlight: boolean
  countFrom?: number
}) {
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
      {highlight && (
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-30 rounded-[20px] ring-2 ring-blue-300/70"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 1.6, delay: 0.5, ease: EASE }}
        />
      )}
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
            <CountUp to={player.metric} decimals={prospect ? 1 : 0} from={countFrom} />
          </span>
        </div>
      </div>
    </div>
  )
}

/** True while at least 30% of the element is visible; true when the browser can't tell us. */
function useOnScreen(ref: RefObject<HTMLElement | null>) {
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    const node = ref.current
    if (!node || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      threshold: 0.3,
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [ref])
  return visible
}

/** Landing demo of the Team Builder: one surface, five lineup cards, a short story on a calm loop. */
export function TeamMapPreview() {
  const reduced = useReducedMotion()
  const root = useRef<HTMLDivElement>(null)
  const inView = useOnScreen(root)
  const [scene, setScene] = useState(0)
  const [hovered, setHovered] = useState(false)
  const [tabVisible, setTabVisible] = useState(true)
  const [entered, setEntered] = useState(false)
  const playing = !reduced && inView && !hovered && tabVisible

  useEffect(() => {
    const update = () => setTabVisible(document.visibilityState === 'visible')
    document.addEventListener('visibilitychange', update)
    return () => document.removeEventListener('visibilitychange', update)
  }, [])
  useEffect(() => {
    if (inView) setEntered(true)
  }, [inView])
  // A fresh timer per scene: pausing (hover, off screen, hidden tab) simply holds the current scene.
  useEffect(() => {
    if (!playing) return
    const timer = setTimeout(() => setScene((s) => (s + 1) % SCENES.length), SCENE_MS)
    return () => clearTimeout(timer)
  }, [playing, scene])

  const { data: tiers } = useSWR('/api/dynasty-tiers', fetchTiers, { revalidateOnFocus: false })
  const current = {
    ...SCENES[scene],
    roster: SCENES[scene].roster.map((p) => withLiveValues(p, tiers?.players?.sf)),
  }
  return (
    <div
      ref={root}
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <ol className="flex flex-wrap items-center gap-2 text-xs" aria-label="Demo steps">
          {SCENES.map((s, i) => (
            <li
              key={s.label}
              className={cn(
                'relative isolate overflow-hidden rounded-full border px-3 py-1 transition-colors duration-500',
                i === scene ? 'border-blue-300/40 text-white' : 'border-white/10 text-slate-500'
              )}
            >
              {i === scene && (
                <motion.span
                  layoutId="demo-step"
                  className="absolute inset-0 -z-10 bg-blue-400/15"
                  transition={{ duration: reduced ? 0 : 0.5, ease: EASE }}
                />
              )}
              {i === scene && playing && (
                <motion.span
                  key={`progress-${scene}`}
                  aria-hidden="true"
                  className="absolute bottom-0 left-0 h-px bg-blue-300/70"
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: SCENE_MS / 1000, ease: 'linear' }}
                />
              )}
              {s.label}
            </li>
          ))}
        </ol>
        <div
          className="flex gap-1 rounded-xl border border-white/10 bg-slate-900/60 p-1 text-xs"
          aria-hidden="true"
        >
          {['Now', '2027', '2028'].map((y) => (
            <span key={y} className="relative rounded-lg px-3 py-1.5">
              {current.year === y && (
                <motion.span
                  layoutId="demo-year"
                  className="absolute inset-0 rounded-lg bg-blue-400/20"
                  transition={{ duration: reduced ? 0 : 0.5, ease: EASE }}
                />
              )}
              <span
                className={cn(
                  'relative transition-colors duration-500',
                  current.year === y ? 'text-white' : 'text-slate-500'
                )}
              >
                {y}
              </span>
            </span>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {current.roster.map((player, slot) => (
          <motion.div
            key={SLOT_IDS[slot]}
            className={cn('relative', slot === 4 && 'hidden sm:block')}
            style={{ perspective: 1200 }}
            initial={reduced ? false : { opacity: 0, y: 18 }}
            animate={entered || reduced ? { opacity: 1, y: 0 } : undefined}
            transition={{ duration: 0.7, delay: slot * 0.08, ease: EASE }}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={player.id}
                style={{ transformStyle: 'preserve-3d', backfaceVisibility: 'hidden' }}
                initial={reduced ? false : { rotateY: -90, opacity: 0.4 }}
                animate={{ rotateY: 0, opacity: 1, transition: FLIP_SPRING }}
                exit={
                  reduced
                    ? undefined
                    : {
                        rotateY: 90,
                        opacity: 0.4,
                        transition: { duration: 0.28, ease: [0.55, 0, 1, 0.45] },
                      }
                }
              >
                <DemoCard
                  player={player}
                  highlight={scene !== 0 && SCENES[0].roster[slot].id !== player.id}
                  countFrom={entered ? undefined : 0}
                />
              </motion.div>
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
