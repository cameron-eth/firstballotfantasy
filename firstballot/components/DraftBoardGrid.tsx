"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, Clock, Maximize2, Minimize2, Sparkles } from "lucide-react"
import { SleeperPick, SleeperDraft, SleeperPlayer } from "@/lib/sleeper-api"
import { supabase } from '@/lib/supabase';

interface DraftBoardGridProps {
  draft: SleeperDraft
  picks: SleeperPick[]
  players: Record<string, SleeperPlayer>
  onRefresh: () => void
  lastRefresh: Date
}

// Utility: map pick difference to color/opacity
function getPickValueStyle(diff: number) {
  if (diff >= 30) return { background: "rgba(22,163,74,0.85)" } // strong green
  if (diff >= 20) return { background: "rgba(22,163,74,0.65)" }
  if (diff >= 10) return { background: "rgba(22,163,74,0.45)" }
  if (diff >= 5)  return { background: "rgba(22,163,74,0.25)" }
  if (diff >= -4) return { background: "rgba(202,138,4,0.25)" } // yellow
  if (diff >= -9) return { background: "rgba(220,38,38,0.25)" } // light red
  if (diff >= -19) return { background: "rgba(220,38,38,0.45)" }
  if (diff >= -29) return { background: "rgba(220,38,38,0.65)" }
  return { background: "rgba(220,38,38,0.85)" } // strong red
}

export function DraftBoardGrid({ draft, picks, players, onRefresh, lastRefresh }: DraftBoardGridProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [rankings, setRankings] = useState<any[]>([])
  const [rankingsLoading, setRankingsLoading] = useState(true)
  const [highlightUser, setHighlightUser] = useState(false)
  const [highlightTeam, setHighlightTeam] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [userRosterId, setUserRosterId] = useState<string | null>(null)

  // On mount, get the current user and auto-select their team if available
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.id) {
        fetch('/api/user-profile', {
          headers: { 'x-user-id': user.id }
        })
          .then(res => res.json())
          .then(profile => {
            if (profile?.sleeper_username) {
              setUserId(profile.sleeper_username)
              // Find the roster for this user
              const userPick = picks.find(p => p.picked_by === profile.sleeper_username)
              if (userPick) {
                setUserRosterId(userPick.roster_id)
                setHighlightTeam(userPick.roster_id)
              }
            }
          })
      }
    })
  }, [picks])

  useEffect(() => {
    const fetchRankings = async () => {
      try {
        const res = await fetch("/api/rankings")
        if (res.ok) {
          const data = await res.json()
          setRankings(data)
        }
      } catch (e) {
        // fail silently
      } finally {
        setRankingsLoading(false)
      }
    }
    fetchRankings()
  }, [])

  const rounds = draft.settings.rounds
  const teams = draft.settings.total_rosters || 12

  // Find projected rank for a player by name (case-insensitive)
  function findPlayerRank(playerName: string): number | null {
    if (!rankings || rankings.length === 0) return null;
    // Try exact match
    let player = rankings.find(
      (p) => p["PLAYER NAME"]?.toLowerCase() === playerName.toLowerCase()
    );
    if (!player) {
      // Try contains (for suffixes, etc)
      player = rankings.find(
        (p) => p["PLAYER NAME"]?.toLowerCase().includes(playerName.toLowerCase())
      );
    }
    return player ? player["RK"] || null : null;
  }

  const getPositionColor = (position: string) => {
    switch (position) {
      case 'QB': return 'bg-blue-500'
      case 'RB': return 'bg-green-500'
      case 'WR': return 'bg-yellow-500'
      case 'TE': return 'bg-purple-500'
      default: return 'bg-gray-500'
    }
  }

  // Get all team names for dropdown
  const teamNames = Array.from(new Set(picks.map(pick => {
    const player = players[pick.player_id]
    return pick.metadata?.team || player?.team || `Team ${pick.roster_id}`
  })))

  // Helper to get the roster_id for a pick
  function getPickRosterId(pick: SleeperPick) {
    return pick.roster_id
  }

  const renderPickCell = (pickNo: number) => {
    const pick = picks.find(p => p.pick_no === pickNo)
    if (!pick) {
      return (
        <div className={`${isExpanded ? 'h-16' : 'h-16'} bg-slate-700 border border-slate-600 rounded-lg flex items-center justify-center`}>
          <span className="text-gray-400 text-xs font-mono">#{pickNo}</span>
        </div>
      )
    }
    const player = players[pick.player_id]
    if (!player) {
      return (
        <div className={`${isExpanded ? 'h-16' : 'h-16'} bg-slate-700 border border-slate-600 rounded-lg flex items-center justify-center`}>
          <span className="text-gray-400 text-xs font-mono">Unknown</span>
        </div>
      )
    }
    const playerName = `${player.first_name} ${player.last_name}`
    const rank = findPlayerRank(playerName)
    const diff = rank ? pick.pick_no - rank : null
    const style = diff !== null ? getPickValueStyle(diff) : { background: '#334155' }
    const position = player.position || pick.metadata?.position || 'UNK'
    const pickTeamName = getPickTeamName(pick)
    return (
      <div
        className={`${isExpanded ? 'h-16' : 'h-16'} border border-slate-600 rounded-lg p-1 relative overflow-hidden ${highlightUser && highlightTeam === pickTeamName ? 'ring-2 ring-yellow-400 animate-pulse' : ''}`}
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
            <p className="text-white font-mono text-xs truncate">
              {playerName}
            </p>
            <p className="text-gray-300 text-xs truncate">
              {player.team} • #{pick.pick_no}
            </p>
          </div>
        </div>
      </div>
    )
  }

  const toggleExpand = () => setIsExpanded(!isExpanded)

  return (
    <Card className={`${isExpanded ? 'fixed inset-0 z-50 m-0 rounded-none' : ''} bg-slate-800 border-slate-700`}>
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
                title={isExpanded ? "Minimize" : "Expand to full screen"}
              >
                {isExpanded ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
                <span>{isExpanded ? "MINIMIZE" : "EXPAND"}</span>
              </button>
              <button
                onClick={onRefresh}
                className="bg-yellow-400 text-slate-900 px-3 py-1 rounded-lg font-mono text-sm hover:bg-yellow-300 transition-colors flex items-center space-x-1"
              >
                <RefreshCw className="h-4 w-4" />
                <span>REFRESH</span>
              </button>
              <button
                onClick={() => setHighlightUser(v => !v)}
                className={`px-3 py-1 rounded-lg font-mono text-sm flex items-center space-x-1 transition-colors border ${highlightUser ? 'bg-yellow-400/20 text-yellow-400 border-yellow-400 ring-2 ring-yellow-400' : 'bg-slate-700 text-white border-slate-600 hover:bg-slate-600'}`}
                title="Highlight My Picks"
              >
                <Sparkles className="h-4 w-4" />
                <span>HIGHLIGHT MY PICKS</span>
              </button>
              {!userRosterId && highlightUser && (
                <select
                  value={highlightTeam || ''}
                  onChange={e => setHighlightTeam(e.target.value)}
                  className="bg-slate-800 border border-yellow-400 text-yellow-400 rounded px-2 py-1 text-xs font-mono"
                >
                  {Array.from(new Set(picks.map(p => p.roster_id))).map(rid => (
                    <option key={rid} value={rid}>{`Team ${rid}`}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className={
        isExpanded
          ? 'h-[calc(100vh-64px)] overflow-auto'
          : ''
      }>
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
              gridTemplateRows: `repeat(${rounds}, 64px)`
            }}
          >
            {Array.from({ length: rounds * teams }, (_, i) => {
              const pickNo = i + 1;
              const pick = picks.find(p => p.pick_no === pickNo)
              if (!pick) {
                return (
                  <div key={pickNo} className={`${isExpanded ? 'h-16' : 'h-16'} bg-slate-700 border border-slate-600 rounded-lg flex items-center justify-center`}>
                    <span className="text-gray-400 text-xs font-mono">#{pickNo}</span>
                  </div>
                )
              }
              const player = players[pick.player_id]
              if (!player) {
                return (
                  <div key={pickNo} className={`${isExpanded ? 'h-16' : 'h-16'} bg-slate-700 border border-slate-600 rounded-lg flex items-center justify-center`}>
                    <span className="text-gray-400 text-xs font-mono">Unknown</span>
                  </div>
                )
              }
              const playerName = `${player.first_name} ${player.last_name}`
              const rank = findPlayerRank(playerName)
              const diff = rank ? pick.pick_no - rank : null
              const style = diff !== null ? getPickValueStyle(diff) : { background: '#334155' }
              const position = player.position || pick.metadata?.position || 'UNK'
              const pickRosterId = getPickRosterId(pick)
              const shouldHighlight = highlightUser && ((userRosterId && pickRosterId === userRosterId) || (!userRosterId && highlightTeam === pickRosterId))
              return (
                <div key={pickNo}
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
                      <p className="text-white font-mono text-xs truncate">
                        {playerName}
                      </p>
                      <p className="text-gray-300 text-xs truncate">
                        {player.team} • #{pick.pick_no}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 