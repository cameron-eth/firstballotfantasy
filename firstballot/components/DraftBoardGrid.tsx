'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, Clock, Maximize2, Minimize2, Sparkles } from 'lucide-react'
import { SleeperPick, SleeperDraft, SleeperPlayer } from '@/lib/sleeper-api'
import { userApi } from '@/lib/user-api'
import { cacheUtils } from '@/lib/cache-utils'

interface DraftBoardGridProps {
  draft: SleeperDraft
  picks: SleeperPick[]
  players: Record<string, SleeperPlayer>
  onRefresh: () => void
  lastRefresh: Date
}

export function DraftBoardGrid({
  draft,
  picks,
  players,
  onRefresh,
  lastRefresh,
}: DraftBoardGridProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [rankings, setRankings] = useState<any[]>([])
  const [rankingsLoading, setRankingsLoading] = useState(true)
  const [highlightUser, setHighlightUser] = useState(false)
  const [highlightTeam, setHighlightTeam] = useState<number | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [userRosterId, setUserRosterId] = useState<number | null>(null)
  const [loggedInUserId, setLoggedInUserId] = useState<number | null>(null)

  // Memoized computed values
  const rounds = useMemo(() => draft.settings.rounds, [draft.settings.rounds])
  const teams = useMemo(() => draft.settings.teams || 12, [draft.settings.teams])

  // Memoized player rank map for efficient lookups
  const playerRankMap = useMemo(() => {
    if (!Array.isArray(rankings)) {
      return {}
    }
    return rankings.reduce((acc: Record<string, number>, player: any) => {
      const playerName = player['PLAYER NAME']
      if (playerName) {
        acc[playerName] = player.RK
      }
      return acc
    }, {})
  }, [rankings])

  // Memoized utility functions
  const findPlayerRank = useCallback(
    (playerName: string): number | null => {
      return playerRankMap[playerName] || null
    },
    [playerRankMap]
  )

  const getPickValueStyle = useCallback((diff: number) => {
    if (diff <= -10) return { background: '#10b981' } // green-500 - steal
    if (diff <= -5) return { background: '#34d399' } // green-400 - good value
    if (diff <= 0) return { background: '#6ee7b7' } // green-300 - slight value
    if (diff <= 5) return { background: '#fbbf24' } // amber-400 - slight reach
    if (diff <= 10) return { background: '#f59e0b' } // amber-500 - reach
    return { background: '#ef4444' } // red-500 - major reach
  }, [])

  const getPositionColor = useCallback((position: string) => {
    switch (position) {
      case 'QB':
        return 'bg-blue-500'
      case 'RB':
        return 'bg-green-500'
      case 'WR':
        return 'bg-purple-500'
      case 'TE':
        return 'bg-orange-500'
      case 'K':
        return 'bg-yellow-500'
      case 'DEF':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }, [])

  // On mount, get the current user and auto-select their team if available
  useEffect(() => {
    userApi
      .getUserProfile()
      .then((profile) => {
        const sleeperUser = cacheUtils.get(cacheUtils.keys.SLEEPER_USER)
        if (profile?.sleeper_username || sleeperUser.user_id) {
          setUserId(profile.sleeper_id)
          // Find the roster for this user
          const userPick = picks.find(
            (p) => p.picked_by === (profile.sleeper_id ?? sleeperUser.user_id)
          )
          if (userPick) {
            setUserRosterId(userPick.roster_id)
            setHighlightTeam(userPick.roster_id)
            setLoggedInUserId(userPick.roster_id)
          }
        }
      })
      .catch(() => {
        console.error('Error fetching user profile')
      })
  }, [picks])

  useEffect(() => {
    const fetchRankings = async () => {
      try {
        const response = await fetch('/api/rankings', {
          cache: 'force-cache',
          next: { revalidate: 3600 }, // 1 hour
        })
        if (response.ok) {
          const result = await response.json()
          // API returns { data: [...], rankingsMap: {...} }
          // Extract the data array if it exists, otherwise use the result directly if it's an array
          const rankingsData = Array.isArray(result?.data) ? result.data : Array.isArray(result) ? result : []
          setRankings(rankingsData)
        }
      } catch (e) {
        console.error('Error fetching rankings:', e)
        setRankings([])
      } finally {
        setRankingsLoading(false)
      }
    }
    fetchRankings()
  }, [])

  // Memoized event handlers
  const toggleExpand = useCallback(() => setIsExpanded(!isExpanded), [isExpanded])
  const toggleHighlight = useCallback(() => {
    setHighlightUser(!highlightUser)
    setHighlightTeam(highlightUser ? null : loggedInUserId)
  }, [highlightUser, loggedInUserId])

  // Memoized grid items
  const gridItems = useMemo(() => {
    return Array.from({ length: rounds * teams }, (_, i) => {
      const pickNo = i + 1
      const pick = picks.find((p) => p.pick_no === pickNo)
      if (!pick) {
        return (
          <div
            key={pickNo}
            className={`${isExpanded ? 'h-16' : 'h-16'} bg-slate-700 border border-slate-600 rounded-lg flex items-center justify-center`}
          >
            <span className="text-gray-400 text-xs font-mono">#{pickNo}</span>
          </div>
        )
      }
      const player = players[pick.player_id]
      if (!player) {
        return (
          <div
            key={pickNo}
            className={`${isExpanded ? 'h-16' : 'h-16'} bg-slate-700 border border-slate-600 rounded-lg flex items-center justify-center`}
          >
            <span className="text-gray-400 text-xs font-mono">Unknown</span>
          </div>
        )
      }
      const playerName = `${player.first_name} ${player.last_name}`
      const rank = findPlayerRank(playerName)
      const diff = rank ? pick.pick_no - rank : null
      const style = diff !== null ? getPickValueStyle(diff) : { background: '#334155' }
      const position = player.position || pick.metadata?.position || 'UNK'
      const pickRosterId = pick.roster_id
      const shouldHighlight =
        highlightUser &&
        ((userRosterId && pickRosterId === userRosterId && highlightTeam === userRosterId) ||
          (highlightTeam && highlightTeam === pickRosterId))
      return (
        <div
          key={pickNo}
          className={`${isExpanded ? 'h-16' : 'h-16'} border border-slate-600 rounded-lg p-1 relative overflow-hidden ${shouldHighlight ? 'ring-2 ring-yellow-400 animate-pulse' : ''}`}
          style={style}
        >
          <div className="flex items-center justify-between h-full">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-1 mb-0.5">
                <Badge
                  variant="secondary"
                  className={`text-xs px-1 py-0 ${getPositionColor(position)} text-white`}
                >
                  {position}
                </Badge>
                {diff !== null && (
                  <Badge variant="outline" className="text-xs px-1 py-0">
                    {diff > 0 ? `+${diff}` : diff}
                  </Badge>
                )}
              </div>
              <p className="text-white font-mono text-xs truncate">{playerName}</p>
              <p className="text-gray-300 text-xs truncate">
                {player.team} • #{pick.pick_no}
              </p>
            </div>
          </div>
        </div>
      )
    })
  }, [
    rounds,
    teams,
    picks,
    players,
    findPlayerRank,
    getPickValueStyle,
    getPositionColor,
    highlightUser,
    userRosterId,
    highlightTeam,
    isExpanded,
  ])

  return (
    <Card
      className={`${isExpanded ? 'fixed inset-0 z-50 m-0 rounded-none' : ''} bg-slate-800 border-slate-700`}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-yellow-400 font-mono">DRAFT BOARD</CardTitle>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm text-gray-400">
              <Clock className="h-4 w-4" />
              <span>Last updated: {lastRefresh.toLocaleTimeString()}</span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={toggleExpand}
                className="bg-slate-700 text-white px-3 py-1 rounded-lg font-mono text-sm hover:bg-slate-600 transition-colors flex items-center space-x-1"
                title={isExpanded ? 'Minimize' : 'Expand to full screen'}
              >
                {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                <span>{isExpanded ? 'MINIMIZE' : 'EXPAND'}</span>
              </button>
              <button
                onClick={onRefresh}
                className="bg-yellow-400 text-slate-900 px-3 py-1 rounded-lg font-mono text-sm hover:bg-yellow-300 transition-colors flex items-center space-x-1"
              >
                <RefreshCw className="h-4 w-4" />
                <span>REFRESH</span>
              </button>
              <button
                onClick={toggleHighlight}
                className={`px-3 py-1 rounded-lg font-mono text-sm flex items-center space-x-1 transition-colors border ${highlightUser ? 'bg-yellow-400/20 text-yellow-400 border-yellow-400 ring-2 ring-yellow-400' : 'bg-slate-700 text-white border-slate-600 hover:bg-slate-600'}`}
                title="Highlight My Picks"
              >
                <Sparkles className="h-4 w-4" />
                <span>HIGHLIGHT MY PICKS</span>
              </button>
              {highlightUser && (
                <select
                  value={highlightTeam || ''}
                  onChange={(e) => setHighlightTeam(parseInt(e.target.value || '0'))}
                  className="bg-slate-800 border border-yellow-400 text-yellow-400 rounded px-2 py-1 text-xs font-mono"
                >
                  {Array.from(new Set(picks.map((p) => p.roster_id))).map((rid) => (
                    <option key={rid} value={rid}>{`Team ${rid}`}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className={isExpanded ? 'h-[calc(100vh-64px)] overflow-auto' : ''}>
        <div
          className={
            isExpanded
              ? 'overflow-x-auto overflow-y-auto h-full scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800'
              : 'overflow-x-auto overflow-y-auto max-h-[70vh] scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800'
          }
        >
          <div
            className="grid gap-1"
            style={{
              gridTemplateColumns: `repeat(${teams}, minmax(180px, 1fr))`,
              gridTemplateRows: `repeat(${rounds}, 64px)`,
            }}
          >
            {gridItems}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
