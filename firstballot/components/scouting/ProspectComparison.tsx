'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TeamLogo } from '@/components/team-logo'
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

interface ProspectComparisonProps {
  prospects: Prospect[]
  onProspectSelect?: (prospect: Prospect) => void
}

const COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444']
const POSITION_COLORS: Record<string, string> = {
  QB: '#3b82f6',
  RB: '#10b981',
  WR: '#f59e0b',
  TE: '#8b5cf6',
}

function getHeadshotUrl(prospect: Prospect): string {
  if (prospect.headshot_url) return prospect.headshot_url
  if (prospect.espn_id) {
    return `https://a.espncdn.com/combiner/i?img=/i/headshots/college-football/players/full/${prospect.espn_id}.png&w=350&h=254`
  }
  return '/placeholder-player.png'
}

function getTierColor(tier: string | null): string {
  const colors: Record<string, string> = {
    'Tier 1': '#fbbf24',
    'Tier 2': '#a78bfa',
    'Tier 3': '#60a5fa',
    'Tier 4': '#34d399',
    'Tier 5': '#f97316',
    Elite: '#fbbf24',
    'Blue Chip': '#a78bfa',
    Starter: '#60a5fa',
    Rotational: '#34d399',
    Backup: '#f97316',
  }
  return colors[tier || ''] || '#6b7280'
}

export function ProspectComparison({ prospects, onProspectSelect }: ProspectComparisonProps) {
  const [selectedProspects, setSelectedProspects] = useState<Prospect[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [positionFilter, setPositionFilter] = useState<string>('ALL')

  // Filter prospects for selection
  const filteredProspects = useMemo(() => {
    return prospects.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.school.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesPosition = positionFilter === 'ALL' || p.position === positionFilter
      return matchesSearch && matchesPosition
    })
  }, [prospects, searchQuery, positionFilter])

  // Add prospect to comparison
  const addProspect = (prospect: Prospect) => {
    if (selectedProspects.length < 5 && !selectedProspects.find((p) => p.id === prospect.id)) {
      setSelectedProspects([...selectedProspects, prospect])
    }
  }

  // Remove prospect from comparison
  const removeProspect = (prospectId: number) => {
    setSelectedProspects(selectedProspects.filter((p) => p.id !== prospectId))
  }

  // Comparison data for charts
  const comparisonData = useMemo(() => {
    if (selectedProspects.length === 0) return null

    // Bar chart data - overall grades
    const gradeData = selectedProspects.map((p) => ({
      name: p.name.split(' ')[1] || p.name, // Last name
      fullName: p.name,
      grade: p.overall_grade || 0,
      valuation: p.valuation || 0,
      position: p.position,
    }))

    // Radar chart data - multi-dimensional comparison
    const maxHeight = Math.max(...selectedProspects.map((p) => p.height || 0), 1)
    const maxWeight = Math.max(...selectedProspects.map((p) => p.weight || 0), 1)
    const maxGrade = Math.max(...selectedProspects.map((p) => p.overall_grade || 0), 1)
    const maxVal = Math.max(...selectedProspects.map((p) => p.valuation || 0), 1)
    const maxRank = Math.max(...selectedProspects.map((p) => p.rank || 0), 1)

    const radarData = [
      {
        metric: 'Grade',
        ...Object.fromEntries(
          selectedProspects.map((p) => [p.name, ((p.overall_grade || 0) / maxGrade) * 100])
        ),
      },
      {
        metric: 'Value',
        ...Object.fromEntries(
          selectedProspects.map((p) => [p.name, ((p.valuation || 0) / maxVal) * 100])
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
          selectedProspects.map((p) => [p.name, ((maxRank - (p.rank || maxRank) + 1) / maxRank) * 100])
        ),
      },
    ]

    // Position distribution pie
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

  return (
    <div className="space-y-6">
      {/* Header with title */}
      <div className="flex items-center gap-2 mb-4">
        <div className="h-px flex-1 bg-white/5" />
        <h2 className="text-xs font-black font-mono text-amber-400 uppercase tracking-[0.3em]">
          Prospect Head-to-Head
        </h2>
        <div className="h-px flex-1 bg-white/5" />
      </div>

      {/* Prospect Selector */}
      <Card className="bg-slate-900/50 border-white/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-mono text-slate-400 flex items-center justify-between">
            <span>Select Prospects to Compare (max 5)</span>
            <span className="text-amber-400">{selectedProspects.length}/5</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            {/* Search Input */}
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by name or school..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500/50"
              />
            </div>
            {/* Position Filter */}
            <div className="flex gap-1">
              {['ALL', 'QB', 'RB', 'WR', 'TE'].map((pos) => (
                <button
                  key={pos}
                  onClick={() => setPositionFilter(pos)}
                  className={`px-3 py-2 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider transition-all ${
                    positionFilter === pos
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-slate-800 text-slate-500 border border-slate-700 hover:border-slate-600'
                  }`}
                >
                  {pos}
                </button>
              ))}
            </div>
          </div>

          {/* Prospect Pills */}
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
            {filteredProspects.slice(0, 30).map((prospect) => {
              const isSelected = selectedProspects.find((p) => p.id === prospect.id)
              return (
                <button
                  key={prospect.id}
                  onClick={() => (isSelected ? removeProspect(prospect.id) : addProspect(prospect))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all flex items-center gap-2 ${
                    isSelected
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      POSITION_COLORS[prospect.position]
                        ? `bg-[${POSITION_COLORS[prospect.position]}]`
                        : 'bg-slate-500'
                    }`}
                    style={{ backgroundColor: POSITION_COLORS[prospect.position] }}
                  />
                  <span className="font-bold">{prospect.name}</span>
                  <span className="text-slate-600">{prospect.position}</span>
                  {isSelected && <span className="text-amber-400">✓</span>}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selected Prospects Cards */}
      {selectedProspects.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {selectedProspects.map((prospect, idx) => (
            <Card
              key={prospect.id}
              className="bg-slate-900/50 border-white/5 relative overflow-hidden group"
              style={{ borderTopColor: COLORS[idx], borderTopWidth: '3px' }}
            >
              {/* Remove button */}
              <button
                onClick={() => removeProspect(prospect.id)}
                className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity z-10"
              >
                ✕
              </button>

              <CardContent className="pt-4">
                <div className="flex flex-col items-center text-center">
                  {/* Headshot */}
                  <div className="relative mb-3">
                    <div
                      className="w-16 h-16 rounded-full overflow-hidden border-2"
                      style={{ borderColor: COLORS[idx] }}
                    >
                      <img
                        src={getHeadshotUrl(prospect)}
                        alt={prospect.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          ;(e.target as HTMLImageElement).src = '/placeholder-player.png'
                        }}
                      />
                    </div>
                    {/* Position badge */}
                    <div
                      className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[8px] font-bold font-mono"
                      style={{ backgroundColor: POSITION_COLORS[prospect.position] || '#6b7280' }}
                    >
                      {prospect.position}
                    </div>
                  </div>

                  {/* Name & School */}
                  <h3 className="font-bold text-white text-sm mb-0.5">{prospect.name}</h3>
                  <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider mb-3">
                    {prospect.school}
                  </p>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-2 w-full">
                    <div className="bg-slate-800/50 rounded-lg p-2">
                      <p className="text-[8px] text-slate-500 uppercase font-mono">Grade</p>
                      <p className="text-lg font-black text-white">
                        {prospect.overall_grade?.toFixed(1) || '-'}
                      </p>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-2">
                      <p className="text-[8px] text-slate-500 uppercase font-mono">Value</p>
                      <p className="text-lg font-black text-amber-400">
                        {prospect.valuation?.toFixed(0) || '-'}
                      </p>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-2">
                      <p className="text-[8px] text-slate-500 uppercase font-mono">Rank</p>
                      <p className="text-sm font-bold text-slate-300">#{prospect.rank}</p>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-2">
                      <p className="text-[8px] text-slate-500 uppercase font-mono">Tier</p>
                      <p
                        className="text-sm font-bold"
                        style={{ color: getTierColor(prospect.tier) }}
                      >
                        {prospect.tier?.replace('Tier ', 'T') || '-'}
                      </p>
                    </div>
                  </div>

                  {/* Physical Metrics */}
                  <div className="flex justify-center gap-4 mt-3 text-[10px] text-slate-500">
                    {prospect.height && <span>{prospect.height}&quot;</span>}
                    {prospect.weight && <span>{prospect.weight} lbs</span>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Comparison Charts */}
      {comparisonData && selectedProspects.length >= 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Grade Comparison Bar Chart */}
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
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" horizontal={false} />
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
                      formatter={(value: number, name: string, props: { payload: { fullName: string; position: string } }) => [
                        `${value.toFixed(1)}`,
                        `${props.payload.fullName} (${props.payload.position})`,
                      ]}
                    />
                    <Bar dataKey="grade" radius={[0, 4, 4, 0]}>
                      {comparisonData.gradeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Radar Chart - Multi-dimensional Comparison */}
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

          {/* Valuation Comparison */}
          <Card className="bg-slate-900/50 border-white/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-mono text-slate-400">
                Dynasty Value Comparison
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparisonData.gradeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} />
                    <YAxis stroke="#94a3b8" fontSize={10} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        border: '1px solid #1e293b',
                        borderRadius: '12px',
                      }}
                    />
                    <Bar dataKey="valuation" radius={[4, 4, 0, 0]}>
                      {comparisonData.gradeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Position Distribution */}
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

      {/* Empty State */}
      {selectedProspects.length === 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">⚔️</div>
          <h3 className="text-lg font-bold text-white mb-2">Select Prospects to Compare</h3>
          <p className="text-sm text-slate-500">
            Choose 2-5 prospects from the list above to see head-to-head comparison charts
          </p>
        </div>
      )}

      {selectedProspects.length === 1 && (
        <div className="text-center py-8">
          <p className="text-sm text-slate-500">
            Select at least one more prospect to see comparison charts
          </p>
        </div>
      )}
    </div>
  )
}

