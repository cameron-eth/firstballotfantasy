'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Header } from '@/components/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Search, ArrowUpDown, Gem, Crown, Star, Award, Trophy, Medal, Shield, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PlayerRanking {
  rank: number
  player_name: string
  position: string
  team: string
  age: number
  total_score: number
  tier: string
  age_score?: number
  draft_capital_score?: number
  recent_form_score?: number
  volume_score?: number
  td_efficiency_score?: number
  versatility_score?: number
  epa_efficiency_score?: number
}

type SortField = 'rank' | 'total_score' | 'age' | 'player_name'
type SortDirection = 'asc' | 'desc'

export default function RankingsPage() {
  const [rankings, setRankings] = useState<PlayerRanking[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [positionFilter, setPositionFilter] = useState<string>('all')
  const [tierFilter, setTierFilter] = useState<string>('all')
  const [sortField, setSortField] = useState<SortField>('rank')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(50)

  useEffect(() => {
    const fetchRankings = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/rankings')
        if (response.ok) {
          const data = await response.json()
          setRankings(data.data || [])
        }
      } catch (error) {
        console.error('Error fetching rankings:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchRankings()
  }, [])

  const extractTierNumber = (tier: string): number => {
    const match = tier.match(/Tier (\d+)/)
    return match ? parseInt(match[1]) : 5
  }

  const filteredAndSortedRankings = useMemo(() => {
    let filtered = [...rankings]

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (player) =>
          player.player_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          player.team.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Apply position filter
    if (positionFilter !== 'all') {
      filtered = filtered.filter((player) => player.position === positionFilter)
    }

    // Apply tier filter
    if (tierFilter !== 'all') {
      filtered = filtered.filter((player) => {
        const tierNum = extractTierNumber(player.tier)
        return tierNum === parseInt(tierFilter)
      })
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any = a[sortField]
      let bValue: any = b[sortField]

      if (sortField === 'player_name') {
        aValue = aValue.toLowerCase()
        bValue = bValue.toLowerCase()
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return filtered
  }, [rankings, searchTerm, positionFilter, tierFilter, sortField, sortDirection])

  // Pagination calculations
  const totalPages = Math.ceil(filteredAndSortedRankings.length / itemsPerPage)
  const paginatedRankings = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredAndSortedRankings.slice(startIndex, endIndex)
  }, [filteredAndSortedRankings, currentPage, itemsPerPage])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, positionFilter, tierFilter, sortField, sortDirection])

  // Calculate top 3 players at each position (Diamond Tier for NFL rankings)
  const topThreeByPosition = useMemo(() => {
    const positionGroups: Record<string, PlayerRanking[]> = {}

    // Group players by position
    rankings.forEach((player) => {
      if (!positionGroups[player.position]) {
        positionGroups[player.position] = []
      }
      positionGroups[player.position].push(player)
    })

    // Sort each position group by rank and get top 3
    const topThree: Set<string> = new Set()
    Object.keys(positionGroups).forEach((position) => {
      const sorted = [...positionGroups[position]].sort((a, b) => a.rank - b.rank)
      sorted.slice(0, 3).forEach((player) => {
        topThree.add(`${player.position}-${player.rank}`)
      })
    })

    return topThree
  }, [rankings])

  const isDiamondTier = (player: PlayerRanking): boolean => {
    return topThreeByPosition.has(`${player.position}-${player.rank}`)
  }

  const getTierColor = (tier: string, isDiamond: boolean = false): string => {
    if (isDiamond) {
      return 'bg-cyan-500/30 text-cyan-100 border-cyan-400/50 font-bold shadow-lg shadow-cyan-400/30'
    }

    const tierNum = extractTierNumber(tier)
    const colors: Record<number, string> = {
      1: 'bg-yellow-600/30 text-yellow-200 border-yellow-500/50 shadow-lg shadow-yellow-400/40 font-bold', // Gold for Elite with glow
      2: 'bg-purple-500/20 text-purple-300 border-purple-500/30', // Purple for Tier 2
      3: 'bg-blue-500/20 text-blue-300 border-blue-500/30', // Blue for Tier 3
      4: 'bg-green-500/20 text-green-300 border-green-500/30', // Green for Tier 4
      5: 'bg-orange-500/20 text-orange-300 border-orange-500/30', // Orange for Tier 5
      6: 'bg-slate-500/20 text-slate-300 border-slate-500/30', // Slate for Tier 6
      7: 'bg-gray-500/20 text-gray-300 border-gray-500/30', // Gray for Tier 7
      8: 'bg-red-500/20 text-red-300 border-red-500/30', // Red for Tier 8
    }
    return colors[tierNum] || colors[5]
  }

  const getRowBgColor = (player: PlayerRanking): string => {
    if (isDiamondTier(player)) {
      return 'bg-gradient-to-r from-cyan-950/50 via-cyan-950/30 to-slate-800/50 border-l-4 border-l-cyan-400/80 shadow-[inset_0_0_30px_rgba(34,211,238,0.15)] ring-1 ring-cyan-400/20'
    }

    const tierNum = extractTierNumber(player.tier)
    const colors: Record<number, string> = {
      1: 'bg-gradient-to-r from-yellow-900/40 via-yellow-900/20 to-slate-800/50 border-l-4 border-l-yellow-500/80 shadow-[inset_0_0_25px_rgba(250,204,21,0.2)] ring-1 ring-yellow-500/20', // Gold background for Elite with glow
      2: 'bg-gradient-to-r from-purple-950/30 via-purple-950/15 to-slate-800/50 border-l-4 border-l-purple-500/60 shadow-[inset_0_0_15px_rgba(168,85,247,0.1)]', // Purple background for Tier 2
      3: 'bg-gradient-to-r from-blue-950/30 via-blue-950/15 to-slate-800/50 border-l-4 border-l-blue-500/60 shadow-[inset_0_0_15px_rgba(59,130,246,0.1)]', // Blue background for Tier 3
      4: 'bg-gradient-to-r from-green-950/30 via-green-950/15 to-slate-800/50 border-l-4 border-l-green-500/60 shadow-[inset_0_0_15px_rgba(34,197,94,0.1)]', // Green background for Tier 4
      5: 'bg-gradient-to-r from-orange-950/30 via-orange-950/15 to-slate-800/50 border-l-4 border-l-orange-500/60 shadow-[inset_0_0_15px_rgba(249,115,22,0.1)]', // Orange background for Tier 5
      6: 'bg-slate-800/10', // Slate background for Tier 6
      7: 'bg-gray-800/10', // Gray background for Tier 7
      8: 'bg-red-950/10', // Red background for Tier 8
    }
    return colors[tierNum] || ''
  }

  const getTierDisplayName = (tier: string, isDiamond: boolean): string => {
    if (isDiamond) {
      return 'Diamond Tier'
    }
    return tier
  }

  const getTierIcon = (tier: string, isDiamond: boolean): React.ReactNode => {
    if (isDiamond) {
      return <Gem className="h-3 w-3 inline-block mr-1" />
    }

    const tierNum = extractTierNumber(tier)
    const icons: Record<number, React.ReactNode> = {
      1: <Crown className="h-3 w-3 inline-block mr-1" />, // Crown for Elite
      2: <Star className="h-3 w-3 inline-block mr-1" />, // Star for Tier 2
      3: <Award className="h-3 w-3 inline-block mr-1" />, // Award for Tier 3
      4: <Trophy className="h-3 w-3 inline-block mr-1" />, // Trophy for Tier 4
      5: <Medal className="h-3 w-3 inline-block mr-1" />, // Medal for Tier 5
      6: <Shield className="h-3 w-3 inline-block mr-1" />, // Shield for Tier 6
    }
    return icons[tierNum] || null
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const uniqueTiers = useMemo(() => {
    const tiers = new Set<string>()
    rankings.forEach((player) => {
      const tierNum = extractTierNumber(player.tier)
      tiers.add(tierNum.toString())
    })
    return Array.from(tiers).sort((a, b) => parseInt(a) - parseInt(b))
  }, [rankings])

  return (
    <div className="min-h-screen bg-slate-900">
      <Header />

      <main className="w-full px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="inline-flex items-center space-x-2 text-xs font-mono text-yellow-400 uppercase tracking-wider mb-4 px-4 py-2 border border-yellow-400/40 rounded-full bg-yellow-400/10 shadow-[0_0_20px_rgba(250,204,21,0.3)]">
              <TrendingUp className="h-3 w-3" />
              <span>Player Rankings</span>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white font-mono mb-4">
              DYNASTY RANKINGS
            </h1>
            <p className="text-gray-300 font-mono text-lg">
              Complete player rankings based on ML-weighted scoring system
            </p>
          </div>

          <Card className="bg-gradient-to-br from-slate-800 via-slate-800 to-yellow-950/20 border border-yellow-500/30 rounded-xl ring-1 ring-yellow-500/10 shadow-lg shadow-yellow-500/10">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                <CardTitle className="text-white text-lg sm:text-xl font-mono">Player Rankings</CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400 hidden sm:inline">Per page:</span>
                  <Select
                    value={itemsPerPage.toString()}
                    onValueChange={(value) => {
                      setItemsPerPage(parseInt(value))
                      setCurrentPage(1)
                    }}
                  >
                    <SelectTrigger className="w-20 sm:w-24 bg-slate-700 border-slate-600 text-white h-10 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600 text-white">
                      <SelectItem value="25" className="text-white">
                        25
                      </SelectItem>
                      <SelectItem value="50" className="text-white">
                        50
                      </SelectItem>
                      <SelectItem value="100" className="text-white">
                        100
                      </SelectItem>
                      <SelectItem value="200" className="text-white">
                        200
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Filters - Mobile Optimized */}
              <div className="flex flex-col gap-3 mt-4">
                {/* Search Bar - Full Width on Mobile */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search players..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-slate-700 border-slate-600 text-white h-11"
                  />
                </div>
                {/* Filter Row - Stack on Mobile, Side-by-Side on Desktop */}
                <div className="grid grid-cols-2 sm:flex sm:flex-row gap-3">
                  <Select value={positionFilter} onValueChange={setPositionFilter}>
                    <SelectTrigger className="w-full bg-slate-700 border-slate-600 text-white h-11 text-sm">
                      <SelectValue placeholder="Position" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600 text-white">
                      <SelectItem value="all" className="text-white">
                        All Positions
                      </SelectItem>
                      <SelectItem value="QB" className="text-white">
                        QB
                      </SelectItem>
                      <SelectItem value="RB" className="text-white">
                        RB
                      </SelectItem>
                      <SelectItem value="WR" className="text-white">
                        WR
                      </SelectItem>
                      <SelectItem value="TE" className="text-white">
                        TE
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={tierFilter} onValueChange={setTierFilter}>
                    <SelectTrigger className="w-full bg-slate-700 border-slate-600 text-white h-11 text-sm">
                      <SelectValue placeholder="Tier" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600 text-white">
                      <SelectItem value="all" className="text-white">
                        All Tiers
                      </SelectItem>
                      {uniqueTiers.map((tier) => (
                        <SelectItem key={tier} value={tier} className="text-white">
                          Tier {tier}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {loading ? (
                <div className="text-center py-12">
                  <div className="w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-400">Loading rankings...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="text-left py-3 px-2 sm:px-4 text-gray-400 font-semibold text-sm">
                          <button
                            onClick={() => handleSort('rank')}
                            className="flex items-center gap-1 hover:text-white transition-colors"
                          >
                            Rank
                            <ArrowUpDown className="h-3 w-3" />
                          </button>
                        </th>
                        <th className="text-left py-3 px-2 sm:px-4 text-gray-400 font-semibold text-sm">
                          <button
                            onClick={() => handleSort('player_name')}
                            className="flex items-center gap-1 hover:text-white transition-colors"
                          >
                            Player
                            <ArrowUpDown className="h-3 w-3" />
                          </button>
                        </th>
                        <th className="text-left py-3 px-2 sm:px-4 text-gray-400 font-semibold text-sm">
                          Position
                        </th>
                        {/* Hidden on mobile */}
                        <th className="hidden md:table-cell text-left py-3 px-4 text-gray-400 font-semibold text-sm">Team</th>
                        <th className="hidden md:table-cell text-left py-3 px-4 text-gray-400 font-semibold text-sm">
                          <button
                            onClick={() => handleSort('age')}
                            className="flex items-center gap-1 hover:text-white transition-colors"
                          >
                            Age
                            <ArrowUpDown className="h-3 w-3" />
                          </button>
                        </th>
                        <th className="hidden md:table-cell text-left py-3 px-4 text-gray-400 font-semibold text-sm">
                          <button
                            onClick={() => handleSort('total_score')}
                            className="flex items-center gap-1 hover:text-white transition-colors"
                          >
                            Total Score
                            <ArrowUpDown className="h-3 w-3" />
                          </button>
                        </th>
                        <th className="hidden md:table-cell text-left py-3 px-4 text-gray-400 font-semibold text-sm">Tier</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedRankings.map((player) => {
                        const isDiamond = isDiamondTier(player)
                        const rowBg = getRowBgColor(player)
                        return (
                          <tr
                            key={player.rank}
                            className={`border-b border-slate-700/50 hover:bg-slate-700/40 transition-all ${rowBg} hover:shadow-lg`}
                          >
                            <td className="py-3 px-2 sm:px-4 text-white font-mono font-semibold text-sm">
                              #{player.rank}
                            </td>
                            <td className="py-3 px-2 sm:px-4 text-white font-semibold text-sm">
                              {player.player_name}
                            </td>
                            <td className="py-3 px-2 sm:px-4">
                              <Badge
                                variant="outline"
                                className="bg-slate-600/30 text-slate-300 border-slate-500/30 text-xs"
                              >
                                {player.position}
                              </Badge>
                            </td>
                            {/* Hidden on mobile */}
                            <td className="hidden md:table-cell py-3 px-4 text-gray-400 text-sm">{player.team}</td>
                            <td className="hidden md:table-cell py-3 px-4 text-gray-300 text-sm">{player.age}</td>
                            <td className="hidden md:table-cell py-3 px-4 text-white font-mono text-sm">
                              {player.total_score.toLocaleString(undefined, {
                                maximumFractionDigits: 0,
                              })}
                            </td>
                            <td className="hidden md:table-cell py-3 px-4">
                              <Badge
                                variant="outline"
                                className={getTierColor(player.tier, isDiamond)}
                              >
                                {getTierIcon(player.tier, isDiamond)}
                                {getTierDisplayName(player.tier, isDiamond)}
                              </Badge>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  {filteredAndSortedRankings.length === 0 && (
                    <div className="text-center py-12 text-gray-400">
                      No players found matching your filters.
                    </div>
                  )}

                  {/* Pagination Controls - Mobile Optimized */}
                  {filteredAndSortedRankings.length > 0 && (
                    <div className="mt-6 space-y-4">
                      {/* Results Count - Full Width on Mobile */}
                      <div className="text-sm text-slate-300 font-mono text-center sm:text-left">
                        Showing {(currentPage - 1) * itemsPerPage + 1} -{' '}
                        {Math.min(currentPage * itemsPerPage, filteredAndSortedRankings.length)} of{' '}
                        {filteredAndSortedRankings.length} players
                      </div>
                      
                      {/* Pagination Buttons - Stack on Mobile, Row on Desktop */}
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                        {/* Page Info - Centered on Mobile */}
                        <div className="text-sm text-white font-mono font-semibold sm:hidden">
                          Page {currentPage} of {totalPages}
                        </div>
                        
                        {/* Navigation Buttons */}
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(1)}
                            disabled={currentPage === 1}
                            className="flex-1 sm:flex-none border-slate-600 hover:bg-slate-700 hover:border-yellow-400/50 text-white disabled:text-slate-600 disabled:border-slate-700 disabled:bg-slate-800 h-10 font-semibold"
                          >
                            First
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="flex-1 sm:flex-none border-slate-600 hover:bg-slate-700 hover:border-yellow-400/50 text-white disabled:text-slate-600 disabled:border-slate-700 disabled:bg-slate-800 h-10 font-semibold"
                          >
                            Prev
                          </Button>
                          
                          {/* Page Info - Hidden on Mobile, Visible on Desktop */}
                          <span className="hidden sm:inline text-sm text-white font-mono font-semibold px-4">
                            Page {currentPage} of {totalPages}
                          </span>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className="flex-1 sm:flex-none border-slate-600 hover:bg-slate-700 hover:border-yellow-400/50 text-white disabled:text-slate-600 disabled:border-slate-700 disabled:bg-slate-800 h-10 font-semibold"
                          >
                            Next
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(totalPages)}
                            disabled={currentPage === totalPages}
                            className="flex-1 sm:flex-none border-slate-600 hover:bg-slate-700 hover:border-yellow-400/50 text-white disabled:text-slate-600 disabled:border-slate-700 disabled:bg-slate-800 h-10 font-semibold"
                          >
                            Last
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
