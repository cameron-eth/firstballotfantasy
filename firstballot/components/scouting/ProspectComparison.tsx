'use client'

import { useEffect, useMemo, useState, type ComponentType } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Prospect } from './types'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Cell,
  PieChart,
  Pie,
} from 'recharts'
import { cn } from '@/lib/utils'
import {
  X,
  Plus,
  Search,
  GitCompare,
  Ruler,
  Weight,
  Zap,
  Target,
  TrendingUp,
  ChevronDown,
} from 'lucide-react'

interface ProspectComparisonProps {
  prospects: Prospect[]
  onProspectSelect?: (prospect: Prospect) => void
  onSelectionChange?: (prospects: Prospect[]) => void
}

const COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444']
const POSITION_COLORS: Record<string, string> = {
  QB: '#3b82f6',
  RB: '#10b981',
  WR: '#f59e0b',
  TE: '#8b5cf6',
}

function getPlayerImageUrl(prospect: Prospect): string {
  if (prospect.headshot_url) return prospect.headshot_url
  if (!prospect.espn_id) return ''
  return `https://a.espncdn.com/i/headshots/college-football/players/full/${prospect.espn_id}.png`
}

function getTierColor(tier: string | null): string {
  const colors: Record<string, string> = {
    Elite: 'text-amber-400',
    'Blue Chip': 'text-blue-400',
    Starter: 'text-emerald-400',
    Rotational: 'text-purple-400',
    Depth: 'text-slate-400',
    Longshot: 'text-rose-400',
    'Tier 1': 'text-amber-400',
    'Tier 2': 'text-blue-400',
    'Tier 3': 'text-emerald-400',
    'Tier 4': 'text-purple-400',
    'Tier 5': 'text-slate-400',
  }
  return colors[tier || ''] || 'text-slate-400'
}

function parseHeight(height: number | null): number {
  if (!height) return 0
  return Number(height)
}

function StatComparison({
  label,
  values,
  unit = '',
  higherIsBetter = true,
  icon: Icon,
}: {
  label: string
  values: (number | null)[]
  unit?: string
  higherIsBetter?: boolean
  icon?: ComponentType<{ className?: string }>
}) {
  const validValues = values.filter((v) => v !== null && v !== undefined) as number[]
  const best =
    validValues.length > 0
      ? higherIsBetter
        ? Math.max(...validValues)
        : Math.min(...validValues)
      : null

  return (
    <div className="py-3 border-b border-border last:border-b-0">
      <div className="flex items-center gap-2 mb-2">
        {Icon && <Icon className="w-4 h-4 text-muted-foreground" />}
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
      </div>
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${values.length}, 1fr)` }}>
        {values.map((value, i) => {
          const isBest = best !== null && value === best && validValues.length > 1
          return (
            <div key={`stat-${label}-${i}`} className="text-center">
              <span
                className={cn(
                  'text-xl font-mono font-bold',
                  isBest ? 'text-primary' : 'text-foreground'
                )}
              >
                {value !== null && value !== undefined ? `${value}${unit}` : '—'}
              </span>
              {isBest && validValues.length > 1 && (
                <div className="text-[10px] text-primary mt-0.5">BEST</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function BarComparison({
  label,
  values,
  maxValue = 100,
  icon: Icon,
}: {
  label: string
  values: (number | null)[]
  maxValue?: number
  icon?: ComponentType<{ className?: string }>
}) {
  const colors = ['bg-primary', 'bg-blue-500', 'bg-emerald-500', 'bg-purple-500']

  return (
    <div className="py-3 border-b border-border last:border-b-0">
      <div className="flex items-center gap-2 mb-3">
        {Icon && <Icon className="w-4 h-4 text-muted-foreground" />}
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
      </div>
      <div className="space-y-2">
        {values.map((value, i) => (
          <div key={`bar-${label}-${i}`} className="flex items-center gap-3">
            <div className="flex-1 h-3 bg-secondary rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(((value || 0) as number) / maxValue) * 100}%` }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className={cn('h-full rounded-full', colors[i % colors.length])}
              />
            </div>
            <span className="text-sm font-mono font-bold text-foreground w-8 text-right">
              {value !== null && value !== undefined ? Math.round(value) : '—'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function PlayerSelector({
  players,
  onSelect,
  selectedIds,
  position,
}: {
  players: Prospect[]
  onSelect: (player: Prospect) => void
  selectedIds: number[]
  position: string
}) {
  const [search, setSearch] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  const filteredPlayers = useMemo(() => {
    return players
      .filter((p) => position === 'ALL' || p.position === position)
      .filter((p) => !selectedIds.includes(p.id))
      .filter(
        (p) =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.school.toLowerCase().includes(search.toLowerCase())
      )
      .slice(0, 20)
  }, [players, search, selectedIds, position])

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-32 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 hover:border-primary hover:bg-primary/5 transition-colors"
      >
        <Plus className="w-8 h-8 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Add Player</span>
        <ChevronDown className="w-3 h-3 text-muted-foreground" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-lg shadow-xl z-50 overflow-hidden"
          >
            <div className="p-2 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search players..."
                  className="w-full pl-9 pr-4 py-2 text-sm bg-secondary rounded-md border-0 focus:outline-none focus:ring-2 focus:ring-primary"
                  autoFocus
                />
              </div>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {filteredPlayers.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No players found
                </div>
              ) : (
                filteredPlayers.map((player) => (
                  <button
                    key={player.id}
                    onClick={() => {
                      onSelect(player)
                      setIsOpen(false)
                      setSearch('')
                    }}
                    className="w-full px-4 py-2 flex items-center gap-3 hover:bg-secondary transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded-full bg-secondary overflow-hidden flex-shrink-0">
                      {getPlayerImageUrl(player) ? (
                        <Image
                          src={getPlayerImageUrl(player)}
                          alt={player.name}
                          width={32}
                          height={32}
                          className="w-full h-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">
                        {player.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {player.school} • {player.position}
                      </div>
                    </div>
                    <div className="text-xs font-mono text-primary">
                      {(player.overall_grade || 0).toFixed(1)}
                    </div>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function SelectedPlayerCard({ prospect, onRemove }: { prospect: Prospect; onRemove: () => void }) {
  const [imageError, setImageError] = useState(false)
  const imageUrl = getPlayerImageUrl(prospect)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="relative bg-card border border-border rounded-lg overflow-hidden"
    >
      <button
        onClick={onRemove}
        className="absolute top-2 right-2 z-10 w-6 h-6 bg-secondary hover:bg-destructive rounded-full flex items-center justify-center transition-colors"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="h-24 bg-secondary/30 flex items-end justify-center overflow-hidden">
        {!imageError && imageUrl ? (
          <Image
            src={imageUrl}
            alt={prospect.name}
            width={80}
            height={80}
            className="object-contain object-bottom"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-2xl font-bold text-muted-foreground/20">
              {prospect.name
                .split(' ')
                .map((n) => n[0])
                .join('')}
            </span>
          </div>
        )}
      </div>

      <div className="p-3 text-center">
        <span
          className={cn(
            'inline-block px-2 py-0.5 text-[9px] font-bold uppercase rounded border mb-2 bg-secondary text-muted-foreground border-border',
            getTierColor(prospect.grade_tier || prospect.tier)
          )}
        >
          {prospect.grade_tier || prospect.tier || 'Depth'}
        </span>
        <h3 className="font-mono text-sm font-bold text-foreground truncate">{prospect.name}</h3>
        <p className="text-xs text-muted-foreground">{prospect.school}</p>
        <p className="text-xs text-muted-foreground">
          {prospect.position} • {prospect.draft_year}
        </p>
        <div className="mt-2">
          <span className="text-xl font-mono font-bold text-primary">
            {(prospect.overall_grade || 0).toFixed(1)}
          </span>
        </div>
      </div>
    </motion.div>
  )
}

export function ProspectComparison({
  prospects,
  onProspectSelect,
  onSelectionChange,
}: ProspectComparisonProps) {
  const [selectedProspects, setSelectedProspects] = useState<Prospect[]>([])
  const [positionFilter, setPositionFilter] = useState<string>('ALL')

  useEffect(() => {
    onSelectionChange?.(selectedProspects)
  }, [selectedProspects, onSelectionChange])

  const filteredProspects = useMemo(() => {
    return prospects
      .filter((p) => positionFilter === 'ALL' || p.position === positionFilter)
      .sort((a, b) => Number(b.overall_grade || 0) - Number(a.overall_grade || 0))
  }, [prospects, positionFilter])

  const addProspect = (prospect: Prospect) => {
    if (selectedProspects.length < 4 && !selectedProspects.find((p) => p.id === prospect.id)) {
      setSelectedProspects([...selectedProspects, prospect])
      onProspectSelect?.(prospect)
    }
  }

  const removeProspect = (idx: number) => {
    setSelectedProspects(selectedProspects.filter((_, i) => i !== idx))
  }

  const comparisonData = useMemo(() => {
    if (selectedProspects.length === 0) return null

    const getForty = (p: Prospect): number | null => {
      const stats = p.college_stats as Record<string, number | string> | null | undefined
      const v = stats?.forty_time ?? stats?.['40yd']
      if (v === undefined || v === null || v === '') return null
      const n = Number(v)
      return Number.isFinite(n) ? n : null
    }

    const fortyByName = Object.fromEntries(selectedProspects.map((p) => [p.name, getForty(p)]))

    // Absolute speed mapping (not relative-to-selection), so 4.30 and 4.40 stay close.
    // ~3 points per 0.10s difference:
    // 4.30 -> 97, 4.40 -> 94, 4.50 -> 91
    const speedIndex = (forty: number | null): number => {
      if (forty === null) return 0
      const score = 100 - Math.max(0, (forty - 4.2) * 30)
      return Math.max(0, Math.min(100, score))
    }

    const gradeData = selectedProspects.map((p) => ({
      name: p.name.split(' ')[1] || p.name,
      fullName: p.name,
      grade: p.overall_grade || 0,
      forty: fortyByName[p.name],
      speed: speedIndex(fortyByName[p.name]),
      position: p.position,
    }))

    const maxHeight = Math.max(...selectedProspects.map((p) => p.height || 0), 1)
    const maxWeight = Math.max(...selectedProspects.map((p) => p.weight || 0), 1)
    const maxGrade = Math.max(...selectedProspects.map((p) => p.overall_grade || 0), 1)
    const maxRank = Math.max(...selectedProspects.map((p) => p.rank || 0), 1)

    const radarData = [
      {
        metric: 'Grade',
        ...Object.fromEntries(
          selectedProspects.map((p) => [p.name, ((p.overall_grade || 0) / maxGrade) * 100])
        ),
      },
      {
        metric: 'Speed',
        ...Object.fromEntries(
          selectedProspects.map((p) => [p.name, speedIndex(fortyByName[p.name])])
        ),
      },
      {
        metric: 'Height',
        ...Object.fromEntries(
          selectedProspects.map((p) => [p.name, ((p.height || 0) / maxHeight) * 100])
        ),
      },
      {
        metric: 'Weight',
        ...Object.fromEntries(
          selectedProspects.map((p) => [p.name, ((p.weight || 0) / maxWeight) * 100])
        ),
      },
      {
        metric: 'Rank',
        ...Object.fromEntries(
          selectedProspects.map((p) => [
            p.name,
            ((maxRank - (p.rank || maxRank) + 1) / maxRank) * 100,
          ])
        ),
      },
    ]

    const positionCounts: Record<string, number> = {}
    selectedProspects.forEach((p) => {
      positionCounts[p.position] = (positionCounts[p.position] || 0) + 1
    })
    const positionPie = Object.entries(positionCounts).map(([position, count]) => ({
      name: position,
      value: count,
      color: POSITION_COLORS[position] || '#6b7280',
    }))

    return { gradeData, radarData, positionPie }
  }, [selectedProspects])

  const positions = ['ALL', 'QB', 'RB', 'WR', 'TE']

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-mono font-bold text-foreground">Compare Prospects</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Select up to 4 players to compare measurables, scouting scores, and profile data
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground mr-2">POSITION</span>
            {positions.map((pos) => (
              <button
                key={pos}
                onClick={() => setPositionFilter(pos)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded transition-colors',
                  positionFilter === pos
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground hover:text-foreground'
                )}
              >
                {pos}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <AnimatePresence mode="popLayout">
            {selectedProspects.map((player, index) => (
              <SelectedPlayerCard
                key={player.id}
                prospect={player}
                onRemove={() => removeProspect(index)}
              />
            ))}
          </AnimatePresence>

          {selectedProspects.length < 4 && (
            <PlayerSelector
              players={filteredProspects}
              onSelect={addProspect}
              selectedIds={selectedProspects.map((p) => p.id)}
              position={positionFilter}
            />
          )}
        </div>

        {selectedProspects.length >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div
              className="grid gap-4"
              style={{ gridTemplateColumns: `repeat(${selectedProspects.length}, 1fr)` }}
            >
              {selectedProspects.map((player) => (
                <div key={player.id} className="text-center">
                  <div className="text-sm font-bold text-foreground">{player.name}</div>
                  <div className="text-xs text-muted-foreground">{player.position}</div>
                </div>
              ))}
            </div>

            <div className="bg-card border border-border rounded-lg p-4">
              <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                <Ruler className="w-4 h-4 text-primary" />
                MEASURABLES
              </h3>
              <StatComparison
                label="Height"
                values={selectedProspects.map((p) => parseHeight(p.height))}
                unit='"'
                higherIsBetter
                icon={Ruler}
              />
              <StatComparison
                label="Weight"
                values={selectedProspects.map((p) => p.weight || null)}
                unit=" lbs"
                higherIsBetter
                icon={Weight}
              />
              <StatComparison
                label="40-Yard Dash"
                values={selectedProspects.map((p) => {
                  const stats = p.college_stats as
                    | Record<string, number | string>
                    | null
                    | undefined
                  const val = stats?.forty_time ?? stats?.['40yd']
                  return val !== undefined && val !== null ? Number(val) : null
                })}
                unit="s"
                higherIsBetter={false}
                icon={Zap}
              />
            </div>

            <div className="bg-card border border-border rounded-lg p-4">
              <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                SCOUTING SCORES
              </h3>
              <BarComparison
                label="Overall Grade"
                values={selectedProspects.map((p) => p.overall_grade || null)}
                icon={Target}
              />
              <BarComparison
                label="Production Score"
                values={selectedProspects.map((p) => p.college_production_score || null)}
                icon={TrendingUp}
              />
              <BarComparison
                label="Physical Score"
                values={selectedProspects.map((p) => p.physical_measurables_score || null)}
                icon={Zap}
              />
            </div>

            {/* Preserve existing advanced chart stack */}
            {comparisonData && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-slate-900/50 border-white/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-mono text-slate-400">
                      Overall Grade Comparison
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={comparisonData.gradeData} layout="vertical">
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#ffffff05"
                            horizontal={false}
                          />
                          <XAxis type="number" domain={[0, 100]} stroke="#94a3b8" fontSize={10} />
                          <YAxis
                            type="category"
                            dataKey="name"
                            stroke="#94a3b8"
                            fontSize={10}
                            width={80}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#0f172a',
                              border: '1px solid #1e293b',
                              borderRadius: '12px',
                            }}
                            formatter={(value: number, _name: string, props: any) => [
                              `${value.toFixed(1)}`,
                              `${props.payload?.fullName} (${props.payload?.position})`,
                            ]}
                          />
                          <Bar dataKey="grade" radius={[0, 4, 4, 0]}>
                            {comparisonData.gradeData.map((_entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-slate-900/50 border-white/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-mono text-slate-400">
                      Multi-Dimensional Profile
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={comparisonData.radarData}>
                          <PolarGrid stroke="#ffffff10" />
                          <PolarAngleAxis dataKey="metric" stroke="#94a3b8" fontSize={10} />
                          <PolarRadiusAxis stroke="#ffffff10" domain={[0, 100]} tick={false} />
                          {selectedProspects.map((prospect, idx) => (
                            <Radar
                              key={prospect.id}
                              name={prospect.name}
                              dataKey={prospect.name}
                              stroke={COLORS[idx]}
                              fill={COLORS[idx]}
                              fillOpacity={0.2}
                              strokeWidth={2}
                            />
                          ))}
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#0f172a',
                              border: '1px solid #1e293b',
                              borderRadius: '12px',
                              fontSize: '10px',
                            }}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-slate-900/50 border-white/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-mono text-slate-400">
                      Speed Comparison (40-Yard)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={comparisonData.gradeData}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#ffffff05"
                            vertical={false}
                          />
                          <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} />
                          <YAxis stroke="#94a3b8" fontSize={10} domain={[0, 100]} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#0f172a',
                              border: '1px solid #1e293b',
                              borderRadius: '12px',
                            }}
                            formatter={(value: number, _name: string, props: any) => [
                              `${value.toFixed(1)} speed index`,
                              props.payload?.forty
                                ? `${props.payload.forty.toFixed(2)}s 40`
                                : '40 N/A',
                            ]}
                          />
                          <Bar dataKey="speed" radius={[4, 4, 0, 0]}>
                            {comparisonData.gradeData.map((_entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-slate-900/50 border-white/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-mono text-slate-400">
                      Position Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px] flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={comparisonData.positionPie}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={5}
                            dataKey="value"
                            label={({ name, value }) => `${name}: ${value}`}
                          >
                            {comparisonData.positionPie.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#0f172a',
                              border: '1px solid #1e293b',
                              borderRadius: '12px',
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </motion.div>
        )}

        {selectedProspects.length < 2 && (
          <div className="text-center py-12 text-muted-foreground">
            <GitCompare className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>
              {selectedProspects.length === 0
                ? 'Select at least 2 players to start comparing'
                : 'Select one more player to start comparing'}
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
