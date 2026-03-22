'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import type React from 'react'

// Framer Motion Reorder types are incompatible with React 19 JSX — cast to any
const ReorderAny = Reorder as unknown as {
  Group: React.ComponentType<Record<string, unknown>>
  Item: React.ComponentType<Record<string, unknown>>
}
import Image from 'next/image'
import useSWR from 'swr'
import { cn } from '@/lib/utils'
import {
  GripVertical,
  TrendingUp,
  TrendingDown,
  Minus,
  Zap,
  Scale,
  Target,
  Brain,
  RotateCcw,
  Download,
  ChevronDown,
  ChevronUp,
  ClipboardList,
} from 'lucide-react'
import { Header } from '@/components/header'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface Player {
  rank: number
  name: string
  school: string
  position: string
  grade: number
  tier: string
  height: string
  weight: number
  fortyTime: number | null
  production: number
  physical: number
  espnId: string
  isCollege: boolean
  headshotUrl?: string | null
}

interface DraftboardResponse {
  year: string
  totalProspects: number
  allProspects: Player[]
  byPosition: Record<string, Player[]>
  classAverages?: {
    grade: number
    physical: number
    production: number
  }
}

function getPlayerImageUrl(player: Player): string {
  if (player.headshotUrl) return player.headshotUrl
  if (!player.espnId) return ''
  const espnId = player.espnId.includes('.') ? player.espnId.split('.')[0] : player.espnId
  if (player.isCollege) {
    return `https://a.espncdn.com/i/headshots/college-football/players/full/${espnId}.png`
  }
  return `https://a.espncdn.com/i/headshots/nfl/players/full/${espnId}.png`
}

const tierColors: Record<string, { bg: string; text: string; border: string }> = {
  Elite: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/50' },
  'Blue Chip': { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/50' },
  Starter: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/50' },
  Rotational: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/50' },
  Depth: { bg: 'bg-slate-500/20', text: 'text-slate-400', border: 'border-slate-500/50' },
  Longshot: { bg: 'bg-rose-500/20', text: 'text-rose-400', border: 'border-rose-500/50' },
}

const positionTabs = ['ALL', 'QB', 'RB', 'WR', 'TE']

function getArchetype(player: Player): { name: string; icon: typeof Zap; color: string } {
  const { physical, production, fortyTime, weight } = player
  if (physical >= 90 && fortyTime && fortyTime < 4.45) {
    return { name: 'Freak Athlete', icon: Zap, color: 'text-amber-400' }
  }
  if (production >= 90 && physical >= 85) {
    return { name: 'Complete Player', icon: Target, color: 'text-emerald-400' }
  }
  if (production >= 90) {
    return { name: 'Producer', icon: TrendingUp, color: 'text-blue-400' }
  }
  if (physical >= 90) {
    return { name: 'Physical Specimen', icon: Scale, color: 'text-purple-400' }
  }
  if (weight > 230 && player.position === 'RB') {
    return { name: 'Power Back', icon: Scale, color: 'text-red-400' }
  }
  if (fortyTime && fortyTime < 4.4) {
    return { name: 'Speedster', icon: Zap, color: 'text-cyan-400' }
  }
  return { name: 'Balanced', icon: Brain, color: 'text-slate-400' }
}

function calculateContrarianScore(userRanks: Player[], consensusRanks: Player[]): number {
  if (userRanks.length === 0) return 0
  let totalDiff = 0
  const consensusMap = new Map(consensusRanks.map((p, i) => [p.name, i + 1]))
  userRanks.forEach((player, userRank) => {
    const consensusRank = consensusMap.get(player.name) || userRank + 1
    totalDiff += Math.abs(userRank + 1 - consensusRank)
  })
  const maxPossibleDiff = (userRanks.length * userRanks.length) / 2
  return Math.min(100, Math.round((totalDiff / maxPossibleDiff) * 100))
}

function getContrarianLabel(score: number): { label: string; color: string } {
  if (score < 15) return { label: 'Consensus Builder', color: 'text-slate-400' }
  if (score < 30) return { label: 'Mild Contrarian', color: 'text-blue-400' }
  if (score < 50) return { label: 'Independent Thinker', color: 'text-emerald-400' }
  if (score < 70) return { label: 'Bold Ranker', color: 'text-amber-400' }
  return { label: 'Against the Grain', color: 'text-rose-400' }
}

export default function DraftBoardPage() {
  const { data, isLoading } = useSWR<DraftboardResponse>('/api/prospects/draftboard', fetcher)
  const [position, setPosition] = useState('ALL')
  const [userBoard, setUserBoard] = useState<Player[]>([])
  const [consensusBoard, setConsensusBoard] = useState<Player[]>([])
  const [showBreakdown, setShowBreakdown] = useState(true)
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!data?.allProspects) return
    const filtered =
      position === 'ALL'
        ? data.allProspects
        : data.allProspects.filter((p: Player) => p.position === position)
    setConsensusBoard(filtered)

    if (typeof window === 'undefined') {
      setUserBoard(filtered)
      return
    }

    const savedKey = `draftboard-${position}`
    const saved = localStorage.getItem(savedKey)
    if (saved) {
      try {
        const savedNames: string[] = JSON.parse(saved)
        const reordered = savedNames
          .map((name) => filtered.find((p: Player) => p.name === name))
          .filter(Boolean) as Player[]
        const savedSet = new Set(savedNames)
        const newPlayers = filtered.filter((p: Player) => !savedSet.has(p.name))
        setUserBoard([...reordered, ...newPlayers])
      } catch {
        setUserBoard(filtered)
      }
    } else {
      setUserBoard(filtered)
    }
  }, [data, position])

  useEffect(() => {
    if (typeof window === 'undefined' || userBoard.length === 0) return
    const savedKey = `draftboard-${position}`
    localStorage.setItem(savedKey, JSON.stringify(userBoard.map((p) => p.name)))
  }, [userBoard, position])

  const resetBoard = () => {
    setUserBoard([...consensusBoard])
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`draftboard-${position}`)
    }
  }

  const exportBoard = () => {
    const csv = userBoard
      .map((p, i) => `${i + 1},${p.name},${p.position},${p.school},${p.grade}`)
      .join('\n')
    const blob = new Blob([`Rank,Name,Position,School,Grade\n${csv}`], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `draftboard-${position}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const contrarianScore = calculateContrarianScore(userBoard, consensusBoard)
  const contrarianLabel = getContrarianLabel(contrarianScore)

  const boardStats = {
    avgGrade:
      userBoard.length > 0 ? userBoard.reduce((sum, p) => sum + p.grade, 0) / userBoard.length : 0,
    avgPhysical:
      userBoard.length > 0
        ? userBoard.reduce((sum, p) => sum + p.physical, 0) / userBoard.length
        : 0,
    avgProduction:
      userBoard.length > 0
        ? userBoard.reduce((sum, p) => sum + p.production, 0) / userBoard.length
        : 0,
    speedsters: userBoard.filter((p) => p.fortyTime && p.fortyTime < 4.45).length,
    bigBoys: userBoard.filter((p) => p.weight > 220).length,
    elites: userBoard.filter((p) => p.tier === 'Elite').length,
    blueChips: userBoard.filter((p) => p.tier === 'Blue Chip').length,
  }

  if (isLoading) {
    return (
      <div className="min-h-screen fb-app-surface">
        <Header />
        <div className="min-h-[calc(100vh-64px)] bg-background flex items-center justify-center">
          <div className="text-center">
            <ClipboardList className="w-8 h-8 text-primary animate-pulse mx-auto mb-4" />
            <div className="font-mono text-sm text-muted-foreground">Loading draft class...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen fb-app-surface bg-background lg:h-screen lg:overflow-hidden lg:flex lg:flex-col">
          <Header />
      <div className="border-b border-border bg-card/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-mono font-bold text-foreground">
                {data?.year} Draft Board
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Drag to reorder. {data?.totalProspects} prospects in class.
              </p>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-3xl font-mono font-bold text-primary">{contrarianScore}</div>
                <div className={cn('text-xs font-medium', contrarianLabel.color)}>
                  {contrarianLabel.label}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={resetBoard}
                  className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset
                </button>
                <button
                  onClick={exportBoard}
                  className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <Download className="w-3 h-3" />
                  Export
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-2 mt-4 flex-wrap">
            {positionTabs.map((pos) => (
              <button
                key={pos}
                onClick={() => setPosition(pos)}
                className={cn(
                  'px-4 py-2 text-sm font-medium rounded transition-colors',
                  position === pos
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground hover:text-foreground'
                )}
              >
                {pos}
                {data?.byPosition?.[pos] && pos !== 'ALL' && (
                  <span className="ml-1 text-xs opacity-70">({data.byPosition[pos].length})</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 min-h-0 lg:overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:h-full lg:min-h-0">
          <div className="lg:col-span-2 lg:min-h-0">
            <div className="bg-card border border-border rounded-lg overflow-hidden lg:h-full lg:flex lg:flex-col">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h2 className="font-mono font-bold text-foreground">Your Rankings</h2>
                <span className="text-xs text-muted-foreground">{userBoard.length} players</span>
              </div>

              <div className="lg:flex-1 lg:min-h-0 lg:overflow-y-auto">
                <ReorderAny.Group
                  axis="y"
                  values={userBoard}
                  onReorder={setUserBoard}
                  layoutScroll
                  className="divide-y divide-border"
                >
                  <AnimatePresence>
                    {userBoard.map((player, index) => {
                      const consensusRank =
                        consensusBoard.findIndex((p) => p.name === player.name) + 1
                      const rankDiff = consensusRank - (index + 1)
                      const tierColor = tierColors[player.tier] || tierColors.Depth
                      const archetype = getArchetype(player)
                      const ArchetypeIcon = archetype.icon

                      return (
                        <ReorderAny.Item
                          key={player.name}
                          value={player}
                          className="bg-card hover:bg-secondary/50 transition-colors cursor-grab active:cursor-grabbing"
                        >
                          <div className="flex items-center gap-3 p-3">
                            <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            <div className="w-8 text-center">
                              <span className="text-lg font-mono font-bold text-primary">
                                {index + 1}
                              </span>
                            </div>

                            <div className="w-10 h-10 rounded-full overflow-hidden bg-secondary flex-shrink-0">
                              {!imageErrors.has(player.name) && getPlayerImageUrl(player) ? (
                                <Image
                                  src={getPlayerImageUrl(player)}
                                  alt={player.name}
                                  width={40}
                                  height={40}
                                  className="w-full h-full object-cover"
                                  onError={() =>
                                    setImageErrors((prev) => new Set(prev).add(player.name))
                                  }
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs font-bold text-muted-foreground">
                                  {player.name
                                    .split(' ')
                                    .map((n) => n[0])
                                    .join('')}
                                </div>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-foreground truncate">
                                  {player.name}
                                </span>
                                <span
                                  className={cn(
                                    'px-1.5 py-0.5 text-[9px] font-bold uppercase rounded border',
                                    tierColor.bg,
                                    tierColor.text,
                                    tierColor.border
                                  )}
                                >
                                  {player.tier}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span className="font-mono text-primary">{player.position}</span>
                                <span>{player.school}</span>
                                <span className={cn('flex items-center gap-0.5', archetype.color)}>
                                  <ArchetypeIcon className="w-3 h-3" />
                                  {archetype.name}
                                </span>
                              </div>
                            </div>

                            <div className="text-right">
                              <div className="text-lg font-mono font-bold text-foreground">
                                {player.grade.toFixed(1)}
                              </div>
                              <div className="text-[10px] text-muted-foreground">GRADE</div>
                            </div>

                            <div className="w-16 text-right">
                              {rankDiff !== 0 && (
                                <div
                                  className={cn(
                                    'flex items-center justify-end gap-1 text-sm font-mono',
                                    rankDiff > 0 ? 'text-emerald-400' : 'text-rose-400'
                                  )}
                                >
                                  {rankDiff > 0 ? (
                                    <TrendingUp className="w-3 h-3" />
                                  ) : (
                                    <TrendingDown className="w-3 h-3" />
                                  )}
                                  {Math.abs(rankDiff)}
                                </div>
                              )}
                              {rankDiff === 0 && (
                                <Minus className="w-4 h-4 text-muted-foreground ml-auto" />
                              )}
                              <div className="text-[9px] text-muted-foreground">vs consensus</div>
                            </div>
                          </div>
                        </ReorderAny.Item>
                      )
                    })}
                  </AnimatePresence>
                </ReorderAny.Group>
              </div>
            </div>
          </div>

          <div className="space-y-4 lg:max-h-full lg:overflow-y-auto">
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => setShowBreakdown(!showBreakdown)}
                className="w-full p-4 flex items-center justify-between hover:bg-secondary/50 transition-colors"
              >
                <h3 className="font-mono font-bold text-foreground">Board Breakdown</h3>
                {showBreakdown ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              <AnimatePresence>
                {showBreakdown && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 pt-0 space-y-4">
                      <div className="grid grid-cols-3 gap-3">
                        <div className="text-center p-3 bg-secondary/50 rounded">
                          <div className="text-xl font-mono font-bold text-primary">
                            {boardStats.avgGrade.toFixed(1)}
                          </div>
                          <div className="text-[10px] text-muted-foreground">AVG GRADE</div>
                        </div>
                        <div className="text-center p-3 bg-secondary/50 rounded">
                          <div className="text-xl font-mono font-bold text-foreground">
                            {boardStats.avgPhysical.toFixed(0)}
                          </div>
                          <div className="text-[10px] text-muted-foreground">AVG PHYS</div>
                        </div>
                        <div className="text-center p-3 bg-secondary/50 rounded">
                          <div className="text-xl font-mono font-bold text-foreground">
                            {boardStats.avgProduction.toFixed(0)}
                          </div>
                          <div className="text-[10px] text-muted-foreground">AVG PROD</div>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-xs font-medium text-muted-foreground mb-2">
                          TIER DISTRIBUTION
                        </h4>
                        <div className="space-y-2">
                          {Object.entries(tierColors).map(([tier, colors]) => {
                            const count = userBoard.filter((p) => p.tier === tier).length
                            const pct = userBoard.length > 0 ? (count / userBoard.length) * 100 : 0
                            return (
                              <div key={tier} className="flex items-center gap-2">
                                <span className={cn('text-xs w-20', colors.text)}>{tier}</span>
                                <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${pct}%` }}
                                    className={cn(
                                      'h-full rounded-full',
                                      colors.bg.replace('/20', '/60')
                                    )}
                                  />
                                </div>
                                <span className="text-xs font-mono text-muted-foreground w-6">
                                  {count}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-xs font-medium text-muted-foreground mb-2">
                          PLAYER TYPES
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex items-center gap-2 p-2 bg-secondary/50 rounded">
                            <Zap className="w-4 h-4 text-cyan-400" />
                            <div>
                              <div className="text-sm font-mono font-bold">
                                {boardStats.speedsters}
                              </div>
                              <div className="text-[9px] text-muted-foreground">Speedsters</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 p-2 bg-secondary/50 rounded">
                            <Scale className="w-4 h-4 text-purple-400" />
                            <div>
                              <div className="text-sm font-mono font-bold">
                                {boardStats.bigBoys}
                              </div>
                              <div className="text-[9px] text-muted-foreground">
                                {'Big Boys (>220)'}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 p-2 bg-secondary/50 rounded">
                            <Target className="w-4 h-4 text-amber-400" />
                            <div>
                              <div className="text-sm font-mono font-bold">{boardStats.elites}</div>
                              <div className="text-[9px] text-muted-foreground">Elite Tier</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 p-2 bg-secondary/50 rounded">
                            <TrendingUp className="w-4 h-4 text-blue-400" />
                            <div>
                              <div className="text-sm font-mono font-bold">
                                {boardStats.blueChips}
                              </div>
                              <div className="text-[9px] text-muted-foreground">Blue Chips</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="bg-card border border-border rounded-lg p-4">
              <h3 className="font-mono font-bold text-foreground mb-3">Your Biggest Takes</h3>

              <div className="mb-4">
                <h4 className="text-xs text-emerald-400 font-medium mb-2 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> HIGHER THAN CONSENSUS
                </h4>
                <div className="space-y-1">
                  {userBoard
                    .map((p, i) => ({
                      player: p,
                      diff: consensusBoard.findIndex((c) => c.name === p.name) + 1 - (i + 1),
                    }))
                    .filter((x) => x.diff > 0)
                    .sort((a, b) => b.diff - a.diff)
                    .slice(0, 3)
                    .map(({ player, diff }) => (
                      <div key={player.name} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground truncate">{player.name}</span>
                        <span className="text-emerald-400 font-mono">+{diff}</span>
                      </div>
                    ))}
                  {userBoard.filter(
                    (p, i) => consensusBoard.findIndex((c) => c.name === p.name) + 1 - (i + 1) > 0
                  ).length === 0 && (
                    <div className="text-xs text-muted-foreground">No risers yet</div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-xs text-rose-400 font-medium mb-2 flex items-center gap-1">
                  <TrendingDown className="w-3 h-3" /> LOWER THAN CONSENSUS
                </h4>
                <div className="space-y-1">
                  {userBoard
                    .map((p, i) => ({
                      player: p,
                      diff: consensusBoard.findIndex((c) => c.name === p.name) + 1 - (i + 1),
                    }))
                    .filter((x) => x.diff < 0)
                    .sort((a, b) => a.diff - b.diff)
                    .slice(0, 3)
                    .map(({ player, diff }) => (
                      <div key={player.name} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground truncate">{player.name}</span>
                        <span className="text-rose-400 font-mono">{diff}</span>
                      </div>
                    ))}
                  {userBoard.filter(
                    (p, i) => consensusBoard.findIndex((c) => c.name === p.name) + 1 - (i + 1) < 0
                  ).length === 0 && (
                    <div className="text-xs text-muted-foreground">No fallers yet</div>
                  )}
                </div>
              </div>
            </div>

            {data?.classAverages && (
              <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="font-mono font-bold text-foreground mb-3">vs Class Average</h3>
                <div className="space-y-3">
                  {[
                    { label: 'Grade', yours: boardStats.avgGrade, class: data.classAverages.grade },
                    {
                      label: 'Physical',
                      yours: boardStats.avgPhysical,
                      class: data.classAverages.physical,
                    },
                    {
                      label: 'Production',
                      yours: boardStats.avgProduction,
                      class: data.classAverages.production,
                    },
                  ].map((stat) => {
                    const diff = stat.yours - stat.class
                    return (
                      <div key={stat.label} className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{stat.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-foreground">{stat.yours.toFixed(1)}</span>
                          <span
                            className={cn(
                              'text-xs font-mono',
                              diff > 0
                                ? 'text-emerald-400'
                                : diff < 0
                                  ? 'text-rose-400'
                                  : 'text-muted-foreground'
                            )}
                          >
                            ({diff > 0 ? '+' : ''}
                            {diff.toFixed(1)})
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
