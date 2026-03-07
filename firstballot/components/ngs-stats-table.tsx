'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { ArrowUpDown, TrendingUp, TrendingDown } from 'lucide-react'

// Module-level component — avoids creating a new instance every render
function SortButton({
  column,
  onSort,
  children,
}: {
  column: string
  onSort: (column: string) => void
  children: React.ReactNode
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => onSort(column)}
      className="hover:bg-slate-700 -ml-3"
    >
      {children}
      <ArrowUpDown className="ml-2 h-4 w-4" />
    </Button>
  )
}

interface NGSPlayer {
  player_gsis_id: string
  player_display_name: string
  player_position: string
  team_abbr: string
  fantasy_points: number
  fantasy_ppg: number
  // Passing
  pass_yards?: number
  pass_touchdowns?: number
  interceptions?: number
  passer_rating?: number
  completion_percentage?: number
  completion_percentage_above_expectation?: number
  // Rushing
  rush_yards?: number
  rush_touchdowns?: number
  rush_attempts?: number
  efficiency?: number
  // Receiving
  targets?: number
  receptions?: number
  yards?: number
  rec_touchdowns?: number
  avg_separation?: number
  avg_cushion?: number
  avg_yac?: number
}

interface NGSStatsTableProps {
  data: NGSPlayer[]
  statType: 'passing' | 'rushing' | 'receiving'
  season?: string
}

export function NGSStatsTable({ data, statType, season = '2025' }: NGSStatsTableProps) {
  const [sortColumn, setSortColumn] = useState<string>('fantasy_points')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 16

  // Calculate tier and value based on season rank
  const getPlayerRankData = (player: NGSPlayer, playerRank: number, totalPlayers: number) => {
    const percentile = (1 - playerRank / totalPlayers) * 100 // Higher = better
    const pos = player.player_position

    let tier = ''
    let value = 0

    if (statType === 'passing') {
      if (percentile >= 90) {
        tier = 'Elite QB'
        value = 95
      } else if (percentile >= 75) {
        tier = 'QB1'
        value = 85
      } else if (percentile >= 60) {
        tier = 'High QB2'
        value = 75
      } else if (percentile >= 40) {
        tier = 'QB2'
        value = 65
      } else if (percentile >= 25) {
        tier = 'Streamer'
        value = 50
      } else {
        tier = 'Bench'
        value = 30
      }
    } else if (statType === 'rushing') {
      if (pos === 'RB') {
        if (percentile >= 95) {
          tier = 'Elite RB'
          value = 98
        } else if (percentile >= 85) {
          tier = 'RB1'
          value = 88
        } else if (percentile >= 70) {
          tier = 'High RB2'
          value = 78
        } else if (percentile >= 50) {
          tier = 'RB2'
          value = 68
        } else if (percentile >= 30) {
          tier = 'Flex'
          value = 55
        } else {
          tier = 'Bench'
          value = 35
        }
      } else if (pos === 'QB' || pos === 'WR') {
        if (percentile >= 80) {
          tier = `Top Rusher`
          value = 80
        } else {
          tier = 'Occasional'
          value = 50
        }
      }
    } else if (statType === 'receiving') {
      if (pos === 'WR') {
        if (percentile >= 95) {
          tier = 'Elite WR'
          value = 98
        } else if (percentile >= 85) {
          tier = 'WR1'
          value = 88
        } else if (percentile >= 70) {
          tier = 'High WR2'
          value = 78
        } else if (percentile >= 50) {
          tier = 'WR2'
          value = 68
        } else if (percentile >= 30) {
          tier = 'Flex'
          value = 55
        } else {
          tier = 'Bench'
          value = 35
        }
      } else if (pos === 'TE') {
        if (percentile >= 92) {
          tier = 'Elite TE'
          value = 95
        } else if (percentile >= 75) {
          tier = 'TE1'
          value = 85
        } else if (percentile >= 50) {
          tier = 'TE2'
          value = 70
        } else {
          tier = 'Bench'
          value = 40
        }
      } else if (pos === 'RB') {
        if (percentile >= 80) {
          tier = 'Pass Catcher'
          value = 75
        } else {
          tier = 'Occasional'
          value = 50
        }
      }
    }

    return { tier, value }
  }

  // Get tier styling
  const getTierStyle = (tier: string): string => {
    if (tier.includes('Elite'))
      return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30 font-bold'
    if (tier.includes('1'))
      return 'bg-green-500/20 text-green-300 border-green-500/30 font-semibold'
    if (tier.includes('2')) return 'bg-blue-500/20 text-blue-300 border-blue-500/30 font-medium'
    if (tier.includes('Flex') || tier.includes('Streamer'))
      return 'bg-orange-500/20 text-orange-300 border-orange-500/30'
    return 'bg-slate-500/20 text-slate-400 border-slate-500/30'
  }

  // Get value grade
  const getValueGrade = (value: number): { grade: string; color: string } => {
    if (value >= 90) return { grade: 'A+', color: 'text-yellow-400' }
    if (value >= 85) return { grade: 'A', color: 'text-yellow-400' }
    if (value >= 80) return { grade: 'A-', color: 'text-green-400' }
    if (value >= 75) return { grade: 'B+', color: 'text-green-400' }
    if (value >= 70) return { grade: 'B', color: 'text-green-400' }
    if (value >= 65) return { grade: 'B-', color: 'text-blue-400' }
    if (value >= 60) return { grade: 'C+', color: 'text-blue-400' }
    if (value >= 55) return { grade: 'C', color: 'text-blue-400' }
    if (value >= 50) return { grade: 'C-', color: 'text-orange-400' }
    if (value >= 40) return { grade: 'D', color: 'text-orange-400' }
    return { grade: 'F', color: 'text-red-400' }
  }

  // Sort data
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      const aVal = a[sortColumn as keyof NGSPlayer] || 0
      const bVal = b[sortColumn as keyof NGSPlayer] || 0
      return sortDirection === 'asc' ? (aVal > bVal ? 1 : -1) : aVal < bVal ? 1 : -1
    })
  }, [data, sortColumn, sortDirection])

  // Paginate data
  const totalPages = Math.ceil(sortedData.length / itemsPerPage)
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return sortedData.slice(startIndex, startIndex + itemsPerPage)
  }, [sortedData, currentPage, itemsPerPage])

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('desc')
    }
    setCurrentPage(1) // Reset to page 1 when sorting
  }

  const getTitle = () => {
    if (statType === 'passing') return 'Quarterback Fantasy Values'
    if (statType === 'rushing') return 'Rushing Fantasy Values'
    return 'Receiving Fantasy Values'
  }

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{getTitle()}</span>
          <Badge variant="outline">{season} Season</Badge>
        </CardTitle>
        <CardDescription>Fantasy production with advanced Next Gen Stats metrics</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border border-slate-700">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-900/50 font-mono text-slate-400">
                <TableHead className="w-12 text-slate-400">#</TableHead>
                <TableHead className="text-slate-400">
                  <SortButton onSort={handleSort} column="player_display_name">Player</SortButton>
                </TableHead>
                <TableHead className="w-20 text-slate-400">Pos</TableHead>
                <TableHead className="w-20 text-slate-400">Team</TableHead>
                <TableHead className="text-center text-slate-400">Tier</TableHead>
                <TableHead className="text-center text-slate-400">Value</TableHead>
                <TableHead className="text-center text-slate-400">Grade</TableHead>
                <TableHead className="text-right text-slate-400">
                  <SortButton onSort={handleSort} column="fantasy_points">Total Pts</SortButton>
                </TableHead>
                <TableHead className="text-right text-slate-400">
                  <SortButton onSort={handleSort} column="fantasy_ppg">PPG</SortButton>
                </TableHead>

                {statType === 'passing' && (
                  <>
                    <TableHead className="text-right text-slate-400">
                      <SortButton onSort={handleSort} column="pass_yards">Yards</SortButton>
                    </TableHead>
                    <TableHead className="text-right text-slate-400">
                      <SortButton onSort={handleSort} column="pass_touchdowns">TD</SortButton>
                    </TableHead>
                    <TableHead className="text-right text-slate-400">
                      <SortButton onSort={handleSort} column="interceptions">INT</SortButton>
                    </TableHead>
                    <TableHead className="text-right text-slate-400">
                      <SortButton onSort={handleSort} column="passer_rating">Rating</SortButton>
                    </TableHead>
                    <TableHead className="text-right text-slate-400">
                      <SortButton onSort={handleSort} column="completion_percentage_above_expectation">CPOE</SortButton>
                    </TableHead>
                  </>
                )}

                {statType === 'rushing' && (
                  <>
                    <TableHead className="text-right text-slate-400">
                      <SortButton onSort={handleSort} column="rush_yards">Yards</SortButton>
                    </TableHead>
                    <TableHead className="text-right text-slate-400">
                      <SortButton onSort={handleSort} column="rush_touchdowns">TD</SortButton>
                    </TableHead>
                    <TableHead className="text-right text-slate-400">
                      <SortButton onSort={handleSort} column="rush_attempts">Att</SortButton>
                    </TableHead>
                    <TableHead className="text-right text-slate-400">
                      <SortButton onSort={handleSort} column="efficiency">Efficiency</SortButton>
                    </TableHead>
                  </>
                )}

                {statType === 'receiving' && (
                  <>
                    <TableHead className="text-right text-slate-400">
                      <SortButton onSort={handleSort} column="targets">Targets</SortButton>
                    </TableHead>
                    <TableHead className="text-right text-slate-400">
                      <SortButton onSort={handleSort} column="receptions">Rec</SortButton>
                    </TableHead>
                    <TableHead className="text-right text-slate-400">
                      <SortButton onSort={handleSort} column="yards">Yards</SortButton>
                    </TableHead>
                    <TableHead className="text-right text-slate-400">
                      <SortButton onSort={handleSort} column="rec_touchdowns">TD</SortButton>
                    </TableHead>
                    <TableHead className="text-right text-slate-400">
                      <SortButton onSort={handleSort} column="avg_separation">Sep</SortButton>
                    </TableHead>
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((player, pageIndex) => {
                const globalIndex = (currentPage - 1) * itemsPerPage + pageIndex
                const actualRank = globalIndex + 1
                const { tier, value } = getPlayerRankData(player, actualRank, sortedData.length)
                const grade = getValueGrade(value)

                return (
                  <TableRow
                    key={player.player_gsis_id + pageIndex}
                    className="hover:bg-slate-700/50 font-mono"
                  >
                    <TableCell className="text-slate-400 font-medium">{actualRank}</TableCell>
                    <TableCell className="font-semibold text-slate-200">
                      {player.player_display_name}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          player.player_position === 'QB'
                            ? 'bg-purple-500'
                            : player.player_position === 'RB'
                              ? 'bg-green-500'
                              : player.player_position === 'WR'
                                ? 'bg-blue-500'
                                : 'bg-orange-500'
                        }
                      >
                        {player.player_position}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{player.team_abbr}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={`border ${getTierStyle(tier)}`}>{tier}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className="font-mono text-sm text-slate-200">{value.toFixed(0)}</span>
                        {value >= 75 && <TrendingUp className="h-3 w-3 text-green-400" />}
                        {value < 50 && <TrendingDown className="h-3 w-3 text-red-400" />}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`font-bold ${grade.color}`}>{grade.grade}</span>
                    </TableCell>
                    <TableCell className="text-right font-bold text-slate-200">
                      {player.fantasy_points?.toFixed(1)}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-green-400">
                      {player.fantasy_ppg?.toFixed(1)}
                    </TableCell>

                    {statType === 'passing' && (
                      <>
                        <TableCell className="text-right text-slate-300">
                          {player.pass_yards}
                        </TableCell>
                        <TableCell className="text-right text-slate-300">
                          {player.pass_touchdowns}
                        </TableCell>
                        <TableCell className="text-right text-red-400">
                          {player.interceptions}
                        </TableCell>
                        <TableCell className="text-right text-slate-300">
                          {player.passer_rating?.toFixed(1)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={
                              (player.completion_percentage_above_expectation || 0) > 0
                                ? 'text-green-400'
                                : 'text-red-400'
                            }
                          >
                            {player.completion_percentage_above_expectation?.toFixed(1)}%
                          </span>
                        </TableCell>
                      </>
                    )}

                    {statType === 'rushing' && (
                      <>
                        <TableCell className="text-right text-slate-300">
                          {player.rush_yards}
                        </TableCell>
                        <TableCell className="text-right text-slate-300">
                          {player.rush_touchdowns}
                        </TableCell>
                        <TableCell className="text-right text-slate-300">
                          {player.rush_attempts}
                        </TableCell>
                        <TableCell className="text-right text-slate-300">
                          {player.efficiency?.toFixed(2)}
                        </TableCell>
                      </>
                    )}

                    {statType === 'receiving' && (
                      <>
                        <TableCell className="text-right text-slate-300">
                          {player.targets}
                        </TableCell>
                        <TableCell className="text-right text-slate-300">
                          {player.receptions}
                        </TableCell>
                        <TableCell className="text-right text-slate-300">{player.yards}</TableCell>
                        <TableCell className="text-right text-slate-300">
                          {player.rec_touchdowns}
                        </TableCell>
                        <TableCell className="text-right text-slate-300">
                          {player.avg_separation?.toFixed(2)}
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Controls */}
        <div className="mt-4 flex items-center justify-between font-mono">
          <div className="text-sm text-slate-400">
            Showing {(currentPage - 1) * itemsPerPage + 1} -{' '}
            {Math.min(currentPage * itemsPerPage, sortedData.length)} of {sortedData.length} players
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="border-slate-600 hover:bg-slate-700"
            >
              First
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="border-slate-600 hover:bg-slate-700"
            >
              Previous
            </Button>
            <span className="text-sm text-slate-400 px-4">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="border-slate-600 hover:bg-slate-700"
            >
              Next
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="border-slate-600 hover:bg-slate-700"
            >
              Last
            </Button>
          </div>
        </div>

        {/* Value Legend */}
        <div className="mt-6 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Fantasy Value Grades</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
            {[
              { grade: 'A+/A', min: 85, color: 'yellow', desc: 'Elite' },
              { grade: 'A-/B+', min: 75, color: 'green', desc: 'Excellent' },
              { grade: 'B/B-', min: 65, color: 'blue', desc: 'Good' },
              { grade: 'C+/C', min: 55, color: 'blue', desc: 'Average' },
              { grade: 'C-', min: 50, color: 'orange', desc: 'Below Avg' },
              { grade: 'D', min: 40, color: 'orange', desc: 'Poor' },
              { grade: 'F', min: 0, color: 'red', desc: 'Bench' },
            ].map((item) => (
              <div
                key={item.grade}
                className={`p-2 rounded border text-center ${
                  item.color === 'yellow'
                    ? 'bg-yellow-400/10 border-yellow-400/30'
                    : item.color === 'green'
                      ? 'bg-green-400/10 border-green-400/30'
                      : item.color === 'blue'
                        ? 'bg-blue-400/10 border-blue-400/30'
                        : item.color === 'orange'
                          ? 'bg-orange-400/10 border-orange-400/30'
                          : 'bg-red-400/10 border-red-400/30'
                }`}
              >
                <div
                  className={`text-sm font-bold ${
                    item.color === 'yellow'
                      ? 'text-yellow-400'
                      : item.color === 'green'
                        ? 'text-green-400'
                        : item.color === 'blue'
                          ? 'text-blue-400'
                          : item.color === 'orange'
                            ? 'text-orange-400'
                            : 'text-red-400'
                  }`}
                >
                  {item.grade}
                </div>
                <div className="text-xs text-slate-400 mt-1">{item.desc}</div>
                <div className="text-xs text-slate-500">{item.min}+</div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
