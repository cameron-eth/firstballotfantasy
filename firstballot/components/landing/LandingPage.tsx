'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { memo, useEffect, useMemo, useState } from 'react'
import {
  LayoutGrid,
  BarChart3,
  Activity,
  Briefcase,
  ClipboardList,
  GitCompare,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Terminal,
  ChevronRight,
  Crown,
} from 'lucide-react'
import useSWR from 'swr'
import { cn } from '@/lib/utils'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface ProspectLite {
  id?: number
  name?: string
  school?: string
  position?: string
  espn_id?: number | string | null
  draft_year?: number | null
  overall_grade?: number | null
  grade_tier?: string | null
  over_under_pct?: number | null
}

interface HeroPlayer {
  name: string
  school: string
  position: string
  espnId: string
  year: number
  grade: number
  tier: string
  overUnderPct: number | null
  isCollege: boolean
}

function getPlayerImageUrl(espnId: string, isCollege: boolean): string {
  if (!espnId) return ''
  const cleanId = espnId.toString().split('.')[0]
  if (isCollege) {
    return `https://a.espncdn.com/i/headshots/college-football/players/full/${cleanId}.png`
  }
  return `https://a.espncdn.com/i/headshots/nfl/players/full/${cleanId}.png`
}

function toTierLabel(gradeTier: string | null | undefined, grade: number): string {
  if (gradeTier === 'Elite') return 'Elite'
  if (gradeTier === 'POS1') return 'Blue Chip'
  if (gradeTier === 'POS2') return 'Starter'
  if (grade >= 93) return 'Elite'
  if (grade >= 88) return 'Blue Chip'
  return 'Starter'
}

function useTypewriter(text: string, speed = 50, delay = 0) {
  const [displayed, setDisplayed] = useState('')
  const [started, setStarted] = useState(false)

  useEffect(() => {
    const startTimeout = setTimeout(() => setStarted(true), delay)
    return () => clearTimeout(startTimeout)
  }, [delay])

  useEffect(() => {
    if (!started) return
    if (displayed.length < text.length) {
      const timeout = setTimeout(() => {
        setDisplayed(text.slice(0, displayed.length + 1))
      }, speed)
      return () => clearTimeout(timeout)
    }
  }, [displayed, text, speed, started])

  return displayed
}

// ── Pure CSS matrix rain — zero JS per frame ────────────────────────
const MatrixRain = memo(function MatrixRain() {
  return (
    <div className="absolute inset-0 overflow-hidden opacity-[0.03] pointer-events-none">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes matrix-fall {
              from { transform: translateY(-100px); }
              to   { transform: translateY(100vh); }
            }
            .matrix-col {
              position: absolute;
              top: 0;
              font-family: monospace;
              font-size: 12px;
              color: hsl(var(--primary));
              animation: matrix-fall var(--dur) linear infinite;
              animation-delay: var(--delay);
            }
          `,
        }}
      />
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={`rain-col-${i}`}
          className="matrix-col"
          style={
            {
              left: `${i * 8.3}%`,
              '--dur': `${10 + (i % 5) * 2}s`,
              '--delay': `${(i % 4) * 0.8}s`,
            } as React.CSSProperties
          }
        >
          {Array.from({ length: 20 }).map((__, j) => (
            <div key={`rain-char-${i}-${j}`} className="opacity-50">
              {String.fromCharCode(65 + ((i * 7 + j * 11) % 26))}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
})

const Scanlines = memo(function Scanlines() {
  return (
    <div
      className="absolute inset-0 pointer-events-none opacity-[0.02]"
      style={{
        background:
          'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)',
      }}
    />
  )
})

// ── Isolated clock — only this 8px label re-renders every second ────
function ClockDisplay() {
  const [time, setTime] = useState<Date | null>(null)

  useEffect(() => {
    setTime(new Date())
    const interval = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <span className="font-mono text-[10px] text-muted-foreground">
      {time ? time.toLocaleTimeString('en-US', { hour12: false }) : '--:--:--'} UTC
    </span>
  )
}

// ── LiveTicker — memoized, only re-renders when player data changes ──
const LiveTicker = memo(function LiveTicker({ players }: { players: HeroPlayer[] }) {
  // Pre-duplicate once
  const doubled = useMemo(() => [...players, ...players], [players])

  return (
    <div className="relative overflow-hidden border-y border-primary/20 bg-black/50 backdrop-blur">
      <div className="flex items-center">
        <div className="flex-shrink-0 px-4 py-2 bg-primary/20 border-r border-primary/30">
          <span className="font-mono text-xs text-primary font-bold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            LIVE
          </span>
        </div>
        <div className="ticker-track flex gap-8 py-2 px-4">
          <style
            dangerouslySetInnerHTML={{
              __html: `
                @keyframes ticker-scroll {
                  from { transform: translateX(0); }
                  to   { transform: translateX(-50%); }
                }
                .ticker-track {
                  animation: ticker-scroll 45s linear infinite;
                }
              `,
            }}
          />
          {doubled.map((player, i) => {
            const hasOverUnder = Number.isFinite(player.overUnderPct)
            const change = hasOverUnder ? Number(player.overUnderPct) : null
            const displayValue = hasOverUnder
              ? `${change! >= 0 ? '+' : ''}${change!.toFixed(1)}%`
              : `${player.grade.toFixed(1)} GRD`
            const isPositive = hasOverUnder ? change! >= 0 : player.grade >= 82
            return (
              <div key={`ticker-${player.name}-${i}`} className="flex items-center gap-3 flex-shrink-0">
                <span className="font-mono text-sm text-foreground font-semibold max-w-[150px] truncate">
                  {player.name}
                </span>
                <span className="font-mono text-xs text-muted-foreground">{player.position}</span>
                <span
                  className={cn(
                    'font-mono text-sm font-bold',
                    isPositive ? 'text-emerald-400' : 'text-red-400'
                  )}
                >
                  {displayValue}
                </span>
                {isPositive ? (
                  <TrendingUp className="w-3 h-3 text-emerald-400" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-red-400" />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
})

function GlitchText({ text, className }: { text: string; className?: string }) {
  return (
    <div className={cn('relative', className)}>
      <span className="relative z-10">{text}</span>
      <span className="absolute top-0 left-0.5 text-cyan-500/30 z-0" aria-hidden>
        {text}
      </span>
      <span className="absolute top-0 -left-0.5 text-red-500/30 z-0" aria-hidden>
        {text}
      </span>
    </div>
  )
}

const AllTimePlayerCard = memo(function AllTimePlayerCard({
  player,
  rank,
  delay,
}: {
  player: HeroPlayer
  rank: number
  delay: number
}) {
  const [imageError, setImageError] = useState(false)
  const tierColors: Record<string, { bg: string; border: string; text: string }> = {
    Elite: { bg: 'bg-amber-500/20', border: 'border-amber-500/50', text: 'text-amber-400' },
    'Blue Chip': { bg: 'bg-blue-500/20', border: 'border-blue-500/50', text: 'text-blue-400' },
    Starter: { bg: 'bg-emerald-500/20', border: 'border-emerald-500/50', text: 'text-emerald-400' },
  }
  const tierColor = tierColors[player.tier] || tierColors.Starter

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="relative group"
    >
      <div
        className={cn(
          'relative bg-black/60 border rounded-lg overflow-hidden backdrop-blur transition-all duration-300',
          'hover:border-primary/50 hover:scale-[1.02]',
          tierColor.border
        )}
      >
        <div className="absolute top-2 left-2 z-10 flex items-center gap-1">
          {rank <= 3 && <Crown className="w-3 h-3 text-amber-400" />}
          <span className="text-xl font-mono font-bold text-primary">{rank}</span>
        </div>

        <div className="absolute top-2 right-2 z-10">
          <span
            className={cn(
              'px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider rounded border',
              tierColor.bg,
              tierColor.text,
              tierColor.border
            )}
          >
            {player.tier}
          </span>
        </div>

        <div className="relative h-20 bg-gradient-to-b from-secondary/30 to-transparent flex items-end justify-center overflow-hidden">
          {!imageError && player.espnId ? (
            <Image
              src={getPlayerImageUrl(player.espnId, player.isCollege)}
              alt={player.name}
              width={80}
              height={80}
              className="object-contain object-bottom scale-125 group-hover:scale-130 transition-transform duration-300"
              onError={() => setImageError(true)}
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-2xl font-bold text-muted-foreground/20">
                {player.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')}
              </span>
            </div>
          )}
          <div className="absolute bottom-1 left-2">
            <span className="px-1.5 py-0.5 text-[7px] font-mono rounded bg-black/70 text-muted-foreground border border-border/50">
              {player.year}
            </span>
          </div>
        </div>

        <div className="p-2">
          <h3 className="font-mono text-xs font-bold text-foreground truncate">{player.name}</h3>
          <p className="text-[9px] text-muted-foreground truncate mb-1">
            {player.school} - {player.position}
          </p>
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-mono font-bold text-primary">{player.grade.toFixed(1)}</span>
              <span className="text-[8px] text-muted-foreground">GRD</span>
            </div>
            {player.overUnderPct !== null && (
              <div
                className={cn(
                  'text-xs font-mono font-bold flex items-center gap-0.5',
                  player.overUnderPct >= 0 ? 'text-emerald-400' : 'text-red-400'
                )}
              >
                {player.overUnderPct >= 0 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {player.overUnderPct >= 0 ? '+' : ''}
                {player.overUnderPct.toFixed(0)}%
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
})

const features = [
  { icon: LayoutGrid, title: 'Rankings', href: '/prospect-board', cmd: 'prospect --list' },
  { icon: BarChart3, title: 'Analytics', href: '/analysis', cmd: 'stats --hitrate' },
  { icon: Activity, title: 'Market', href: '/trade-market', cmd: 'market --live' },
  { icon: Briefcase, title: 'Portfolio', href: '/league-buddy', cmd: 'portfolio --sync' },
  {
    icon: ClipboardList,
    title: 'Draft Board',
    href: '/scouting-portal?tab=draftboard',
    cmd: 'draft --rank',
  },
  { icon: GitCompare, title: 'Compare', href: '/analysis', cmd: 'compare --players' },
]

// ── Isolated feature rotator — only its tile highlights re-render ────
function FeatureGrid() {
  const [activeFeature, setActiveFeature] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % features.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
      {features.map((feature, i) => (
        <motion.div
          key={feature.title}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.1 }}
          onMouseEnter={() => setActiveFeature(i)}
        >
          <Link href={feature.href}>
            <div
              className={cn(
                'p-3 border rounded-lg transition-all duration-300 group cursor-pointer',
                activeFeature === i
                  ? 'bg-primary/10 border-primary/50'
                  : 'bg-black/30 border-border/50 hover:border-primary/30'
              )}
            >
              <div className="flex items-center gap-3 mb-2">
                <div
                  className={cn(
                    'w-8 h-8 rounded flex items-center justify-center transition-colors',
                    activeFeature === i ? 'bg-primary/20' : 'bg-secondary'
                  )}
                >
                  <feature.icon
                    className={cn(
                      'w-4 h-4 transition-colors',
                      activeFeature === i ? 'text-primary' : 'text-muted-foreground'
                    )}
                  />
                </div>
                <div>
                  <div className="font-mono text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                    {feature.title}
                  </div>
                  <div className="font-mono text-[10px] text-muted-foreground">
                    <span className="text-primary/60">$</span> {feature.cmd}
                  </div>
                </div>
              </div>
              <div
                className={cn(
                  'h-0.5 bg-secondary rounded-full overflow-hidden',
                  activeFeature === i && 'animate-pulse'
                )}
              >
                <motion.div
                  className="h-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: activeFeature === i ? '100%' : '0%' }}
                  transition={{ duration: 3 }}
                />
              </div>
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  )
}

export function LandingPage() {
  const { data } = useSWR('/api/prospects?draft_year=all', fetcher)

  const headline = useTypewriter('FIRST', 80, 500)
  const headline2 = useTypewriter('BALLOT_', 80, 1200)

  const prospects: ProspectLite[] = useMemo(() => {
    if (Array.isArray(data)) return data
    if (Array.isArray(data?.prospects)) return data.prospects
    return []
  }, [data])

  const allPlayers: HeroPlayer[] = useMemo(() => {
    return prospects.map((p) => {
      const grade = Number(p.overall_grade || 0)
      const year = Number(p.draft_year || 2026)
      return {
        name: p.name || 'Unknown',
        school: p.school || 'Unknown',
        position: p.position || '-',
        espnId: p.espn_id ? String(p.espn_id) : '',
        year,
        grade,
        tier: toTierLabel(p.grade_tier, grade),
        overUnderPct: p.over_under_pct ?? null,
        isCollege: year >= 2025,
      }
    })
  }, [prospects])

  const topAllTime = useMemo(() => {
    // Top 3 per class, then sorted by grade
    const byYear = new Map<number, HeroPlayer[]>()
    for (const p of [...allPlayers].sort((a, b) => b.grade - a.grade)) {
      const arr = byYear.get(p.year) || []
      if (arr.length < 3) {
        arr.push(p)
        byYear.set(p.year, arr)
      }
    }
    return [...byYear.values()].flat().sort((a, b) => b.grade - a.grade)
  }, [allPlayers])

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <MatrixRain />
      <Scanlines />

      <div className="border-b border-border/50 bg-black/50 backdrop-blur sticky z-40 -mt-px">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-8">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-mono text-[10px] text-emerald-500">SYSTEM ONLINE</span>
            </div>
            <span className="font-mono text-[10px] text-muted-foreground">
              {allPlayers.length || 0} ASSETS TRACKED
            </span>
          </div>
          <ClockDisplay />
        </div>
      </div>

      {allPlayers.length > 0 && <LiveTicker players={allPlayers} />}

      <section className="relative pt-8 pb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8 items-start">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="mb-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="inline-flex items-center gap-2 px-3 py-1 rounded bg-primary/10 border border-primary/30 mb-4"
                >
                  <Terminal className="w-4 h-4 text-primary" />
                  <span className="font-mono text-xs text-primary">
                    v2.0.26 // FIRSTBALLOT DRAFT ENGINE LOADED
                  </span>
                </motion.div>
              </div>

              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold font-mono tracking-tighter mb-4">
                <GlitchText text={headline} className="text-primary" />
                <br />
                <span className="text-foreground">{headline2}</span>
                <motion.span
                  animate={{ opacity: [1, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                  className="text-primary"
                >
                  |
                </motion.span>
              </h1>

              <p className="text-sm text-muted-foreground font-mono mb-6 max-w-md">
                {'>'} Dynasty fantasy intelligence platform.
                <br />
                {'>'} Real-time prospect analytics.
                <br />
                {'>'} Portfolio tracking. Market views.
              </p>

              <div className="flex flex-wrap gap-3 mb-8">
                <Link href="/prospect-board">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-5 py-2.5 bg-primary text-primary-foreground font-mono text-sm font-bold rounded flex items-center gap-2"
                  >
                    <span>$</span> prospect --explore
                    <ArrowRight className="w-4 h-4" />
                  </motion.button>
                </Link>
                <Link href="/trade-market">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-5 py-2.5 bg-transparent text-foreground font-mono text-sm font-bold rounded border border-border hover:border-primary/50 transition-colors"
                  >
                    <span className="text-muted-foreground">$</span> market --view
                  </motion.button>
                </Link>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div className="p-2 bg-black/50 border border-primary/20 rounded text-center">
                  <div className="text-xl font-mono font-bold text-primary">{allPlayers.length || 0}</div>
                  <div className="text-[9px] font-mono text-muted-foreground">PROSPECTS</div>
                </div>
                <div className="p-2 bg-black/50 border border-emerald-500/20 rounded text-center">
                  <div className="text-xl font-mono font-bold text-emerald-400">73%</div>
                  <div className="text-[9px] font-mono text-muted-foreground">HIT RATE</div>
                </div>
                <div className="p-2 bg-black/50 border border-blue-500/20 rounded text-center">
                  <div className="text-xl font-mono font-bold text-blue-400">12</div>
                  <div className="text-[9px] font-mono text-muted-foreground">CLASSES</div>
                </div>
                <div className="p-2 bg-black/50 border border-purple-500/20 rounded text-center">
                  <div className="text-xl font-mono font-bold text-purple-400">4</div>
                  <div className="text-[9px] font-mono text-muted-foreground">POSITIONS</div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="bg-black/60 border border-primary/30 rounded-lg overflow-hidden backdrop-blur">
                <div className="flex items-center justify-between px-4 py-2 border-b border-primary/20 bg-primary/5">
                  <div className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-amber-400" />
                    <span className="font-mono text-sm font-bold text-foreground">TOP PROSPECTS</span>
                  </div>
                  <Link
                    href="/prospect-board"
                    className="font-mono text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    View All <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>

                <div className="p-3">
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {topAllTime.map((player, i) => (
                      <AllTimePlayerCard
                        key={`${player.name}-${player.year}-${i}`}
                        player={player}
                        rank={i + 1}
                        delay={0.3 + i * 0.05}
                      />
                    ))}
                  </div>
                </div>

                <div className="px-4 py-2 border-t border-primary/20 bg-primary/5">
                  <div className="font-mono text-[10px] text-muted-foreground flex items-center gap-2">
                    <span className="text-emerald-400">$</span> sorted by grade desc // top 3 per class // all positions
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="pt-5 pb-8 border-y border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-8"
          >
            <h2 className="font-mono text-xl font-bold text-foreground mb-2">
              <span className="text-primary">$</span> available_commands
            </h2>
            <p className="font-mono text-sm text-muted-foreground">{'>'} select module to initialize</p>
          </motion.div>

          <FeatureGrid />
        </div>
      </section>

      <footer className="py-8 border-t border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="font-mono text-lg font-bold text-foreground">
                FIRST<span className="text-primary">BALLOT</span>
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                // Dynasty Intelligence Platform
              </span>
            </div>
            <div className="font-mono text-xs text-muted-foreground">
              Player images via ESPN. Data for educational purposes.
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
