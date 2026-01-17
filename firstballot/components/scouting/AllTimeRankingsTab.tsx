'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Search, Trophy, Medal, Star, Filter, ArrowUpRight, School } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Prospect } from './types'

export function AllTimeRankingsTab() {
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [positionFilter, setPositionFilter] = useState('all')

  useEffect(() => {
    const fetchAllTime = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/prospects/all-time?limit=250')
        if (response.ok) {
          const data = await response.json()
          setProspects(data)
        }
      } catch (error) {
        console.error('Error fetching all-time prospects:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAllTime()
  }, [])

  const filteredProspects = useMemo(() => {
    return prospects.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.school.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesPosition = positionFilter === 'all' || p.position === positionFilter
      return matchesSearch && matchesPosition
    })
  }, [prospects, searchTerm, positionFilter])

  const getPositionStyles = (position: string) => {
    const styles: Record<string, string> = {
      QB: 'bg-red-500/20 text-red-400 border-red-500/30',
      RB: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      WR: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      TE: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    }
    return styles[position] || 'bg-slate-700/20 text-slate-400 border-slate-700/30'
  }

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="h-4 w-4 text-yellow-400" />
    if (index === 1) return <Medal className="h-4 w-4 text-slate-300" />
    if (index === 2) return <Medal className="h-4 w-4 text-amber-600" />
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
        <div>
          <h2 className="text-3xl font-black text-white font-mono tracking-tighter uppercase mb-2">
            All-Time <span className="text-yellow-400">Legends</span>
          </h2>
          <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">
            The highest graded prospects in the database (2019-2026).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-slate-600 group-focus-within:text-yellow-500 transition-colors" />
            <Input
              placeholder="Search legends..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10 bg-slate-950/60 border-white/5 text-white w-full sm:w-64 focus:border-yellow-500/30 focus:ring-0 font-mono text-xs rounded-xl transition-all"
            />
          </div>

          <Select value={positionFilter} onValueChange={setPositionFilter}>
            <SelectTrigger className="h-10 w-full sm:w-36 bg-slate-950/60 border-white/5 text-white focus:border-yellow-500/30 focus:ring-0 font-mono text-[10px] uppercase tracking-widest rounded-xl transition-all">
              <SelectValue placeholder="Position" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-white/10 text-white font-mono text-[10px]">
              <SelectItem value="all">ALL POSITIONS</SelectItem>
              <SelectItem value="QB">QUARTERBACKS</SelectItem>
              <SelectItem value="RB">RUNNING BACKS</SelectItem>
              <SelectItem value="WR">WIDE RECEIVERS</SelectItem>
              <SelectItem value="TE">TIGHT ENDS</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20">
          <div className="w-10 h-10 border-2 border-yellow-400/20 border-t-yellow-400 rounded-full animate-spin mx-auto mb-6"></div>
          <p className="text-[10px] font-black font-mono text-slate-500 uppercase tracking-widest">
            Compiling Historical Data...
          </p>
        </div>
      ) : (
        <Card className="bg-slate-900/40 border-white/5 overflow-hidden rounded-2xl backdrop-blur-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-slate-950/40">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 font-mono uppercase tracking-widest">
                    Rank
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 font-mono uppercase tracking-widest">
                    Athlete
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 font-mono uppercase tracking-widest">
                    Pos
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 font-mono uppercase tracking-widest text-center">
                    Class
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 font-mono uppercase tracking-widest text-right">
                    Grade
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-500 font-mono uppercase tracking-widest text-right">
                    Value
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {filteredProspects.map((prospect, index) => (
                  <tr
                    key={prospect.id}
                    className="group hover:bg-white/[0.02] transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black font-mono text-slate-500 w-6">
                          {index + 1}
                        </span>
                        {getRankIcon(index)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {prospect.headshot_url ? (
                          <div className="w-10 h-10 rounded-lg bg-slate-950 border border-white/10 overflow-hidden flex-shrink-0">
                            <img
                              src={prospect.headshot_url}
                              alt=""
                              className="w-full h-full object-cover object-top"
                            />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-950 border border-white/10 flex items-center justify-center text-[10px] font-black font-mono text-slate-600 flex-shrink-0">
                            {prospect.name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .slice(0, 2)}
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-black text-white font-mono uppercase tracking-tight group-hover:text-yellow-400 transition-colors">
                            {prospect.name}
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono">
                            <School className="h-2.5 w-2.5" />
                            {prospect.school}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        variant="outline"
                        className={`${getPositionStyles(prospect.position)} text-[10px] font-black px-2 py-0 border-none rounded`}
                      >
                        {prospect.position}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-xs font-black font-mono text-slate-400">
                        {prospect.draft_year}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex flex-col items-end">
                        <span className="text-sm font-black font-mono text-white">
                          {prospect.overall_grade?.toFixed(1)}
                        </span>
                        <div className="w-16 h-1 bg-slate-950 rounded-full overflow-hidden mt-1">
                          <div
                            className="h-full bg-yellow-400 opacity-80"
                            style={{ width: `${prospect.overall_grade}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-black font-mono text-blue-400">
                        {prospect.valuation?.toFixed(1) || '--'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredProspects.length === 0 && (
            <div className="py-20 text-center">
              <p className="text-sm font-black font-mono text-slate-500 uppercase tracking-widest">
                No legends found in this sector
              </p>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
