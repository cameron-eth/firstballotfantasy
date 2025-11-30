'use client'

import type React from 'react'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Header } from '@/components/header'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Eye, Users, TrendingUp, RefreshCw, BarChart3 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import {
  ProspectsTab,
  DraftBoardTab,
  ProspectDetailModal,
  ComparisonsModal,
  HistoricalRankingsTab,
} from '@/components/scouting'
import type { Prospect } from '@/components/scouting/types'

interface RosterPlayer {
  id: string
  name: string
  position: string
  team: string
  age: number
  experience: number
  value: number
  isProspect?: boolean
  prospectData?: Prospect
  sleeper_id?: string
  search_rank?: number
  fantasy_pos_rank?: number
  injury_status?: string
  fantasy_ppg?: number
  games_played?: number
}

interface ScoutingPortalProps {
  leagueId: string
}

export function ScoutingPortal({ leagueId }: ScoutingPortalProps) {
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [roster, setRoster] = useState<RosterPlayer[]>([])
  const [originalRoster, setOriginalRoster] = useState<RosterPlayer[]>([])
  const [loading, setLoading] = useState(true)
  const [rosterLoading, setRosterLoading] = useState(true)
  const [rosterError, setRosterError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [positionFilter, setPositionFilter] = useState('all')
  const [schoolFilter, setSchoolFilter] = useState('all')
  const [activeTab, setActiveTab] = useState('prospects')
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null)
  const [draggedProspect, setDraggedProspect] = useState<Prospect | null>(null)
  const [dragOverPosition, setDragOverPosition] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [showCompsModal, setShowCompsModal] = useState(false)
  const [selectedProspectForComps, setSelectedProspectForComps] = useState<Prospect | null>(null)
  const [draftBoard, setDraftBoard] = useState<Prospect[]>([])
  const [draggedBoardProspect, setDraggedBoardProspect] = useState<{
    prospect: Prospect
    index: number
  } | null>(null)

  // Memoized expensive computations
  const positionNeeds = useMemo(() => {
    if (!roster) return {}

    const needs: Record<string, number> = {}
    const current: Record<string, number> = {}

    // Count current players by position
    roster.forEach((player) => {
      const pos = player.position
      current[pos] = (current[pos] || 0) + 1
    })

    // Calculate needs based on typical roster construction
    const targetCounts: Record<string, number> = {
      QB: 3,
      RB: 6,
      WR: 8,
      TE: 3,
      K: 1,
      DEF: 1,
    }

    Object.keys(targetCounts).forEach((pos) => {
      needs[pos] = Math.max(0, targetCounts[pos] - (current[pos] || 0))
    })

    return needs
  }, [roster])

  // Calculate positional rankings for roster players
  const rosterWithPositionalRanks = useMemo(() => {
    if (!roster) return []

    // Group players by position
    const playersByPosition: Record<string, RosterPlayer[]> = {}
    roster.forEach((player) => {
      if (!playersByPosition[player.position]) {
        playersByPosition[player.position] = []
      }
      playersByPosition[player.position].push(player)
    })

    // Sort each position group by value (descending) and add positional rank
    const rankedRoster: (RosterPlayer & { positionalRank: number })[] = []

    Object.entries(playersByPosition).forEach(([position, players]) => {
      const sortedPlayers = players.sort((a, b) => b.value - a.value)
      sortedPlayers.forEach((player, index) => {
        rankedRoster.push({
          ...player,
          positionalRank: index + 1,
        })
      })
    })

    return rankedRoster
  }, [roster])

  const schools = useMemo(() => {
    const schoolSet = new Set<string>()
    prospects.forEach((prospect) => {
      if (prospect.school) schoolSet.add(prospect.school)
    })
    return Array.from(schoolSet).sort()
  }, [prospects])

  const filteredProspects = useMemo(() => {
    let filtered = prospects

    if (searchTerm) {
      filtered = filtered.filter(
        (prospect) =>
          prospect.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          prospect.school.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (positionFilter !== 'all') {
      filtered = filtered.filter((prospect) => prospect.position === positionFilter)
    }

    if (schoolFilter !== 'all') {
      filtered = filtered.filter((prospect) => prospect.school === schoolFilter)
    }

    return filtered
  }, [prospects, searchTerm, positionFilter, schoolFilter])

  // Calculate #1 player at each position (Diamond Tier for prospects)
  const topOneProspectByPosition = useMemo(() => {
    const positionGroups: Record<string, Prospect[]> = {}

    // Group prospects by position
    prospects.forEach((prospect) => {
      if (!positionGroups[prospect.position]) {
        positionGroups[prospect.position] = []
      }
      positionGroups[prospect.position].push(prospect)
    })

    // Sort each position group by rank and get #1 only
    const topOne: Set<number> = new Set()
    Object.keys(positionGroups).forEach((position) => {
      const sorted = [...positionGroups[position]].sort((a, b) => a.rank - b.rank)
      if (sorted.length > 0) {
        topOne.add(sorted[0].id)
      }
    })

    return topOne
  }, [prospects])

  const isProspectDiamondTier = useCallback(
    (prospect: Prospect): boolean => {
      return topOneProspectByPosition.has(prospect.id)
    },
    [topOneProspectByPosition]
  )

  // Memoized utility functions
  const getProspectGrade = useCallback((prospect: Prospect): string => {
    // Use the new grade_tier from database, fallback to calculating from overall_grade
    if (prospect.grade_tier) return prospect.grade_tier
    if (prospect.overall_grade) {
      if (prospect.overall_grade >= 90) return 'Elite'
      if (prospect.overall_grade >= 85) return 'Blue Chip'
      if (prospect.overall_grade >= 80) return 'Starter'
      if (prospect.overall_grade >= 70) return 'Rotational'
      if (prospect.overall_grade >= 60) return 'Backup'
      return 'Depth'
    }
    return 'Ungraded'
  }, [])

  const getGradeColor = useCallback((grade: string): string => {
    // Support both new grade_tier names and old letter grades
    const gradeColors: Record<string, string> = {
      // New grade tiers
      Elite: 'text-amber-400',
      'Blue Chip': 'text-green-400',
      Starter: 'text-blue-400',
      Rotational: 'text-cyan-400',
      Backup: 'text-yellow-400',
      Depth: 'text-orange-400',
      Ungraded: 'text-gray-400',
      // Legacy letter grades
      'A+': 'text-green-400',
      A: 'text-green-400',
      'A-': 'text-green-400',
      'B+': 'text-blue-400',
      B: 'text-blue-400',
      'B-': 'text-blue-400',
      'C+': 'text-yellow-400',
      C: 'text-yellow-400',
      'C-': 'text-yellow-400',
      'D+': 'text-orange-400',
      D: 'text-orange-400',
      'D-': 'text-orange-400',
      F: 'text-red-400',
    }
    return gradeColors[grade] || 'text-gray-400'
  }, [])

  const getPositionColor = useCallback((position: string): string => {
    const colors: Record<string, string> = {
      QB: 'bg-slate-500',
      RB: 'bg-slate-500',
      WR: 'bg-slate-500',
      TE: 'bg-slate-500',
      K: 'bg-slate-500',
      DEF: 'bg-slate-500',
    }
    return colors[position] || 'bg-slate-500'
  }, [])

  // Prospect Valuation System - Hybrid Exponential-Tiered Value Curve
  const calculateProspectValue = useCallback((rank: number, position?: string): number => {
    if (!rank || rank <= 0 || rank > 1000) {
      return 1 // Unranked
    }

    let baseValue: number
    let tierFloor: number
    let k: number
    let tierStart: number

    // Define prospect tiers with more conservative parameters
    if (rank <= 12) {
      // Tier 1 Prospects (1-12) - High upside, moderate risk
      baseValue = 70
      tierFloor = 26
      k = 0.1
      tierStart = 1
    } else if (rank <= 36) {
      // Tier 2 Prospects (13-36) - Good upside, higher risk
      baseValue = 52
      tierFloor = 15
      k = 0.07
      tierStart = 13
    } else if (rank <= 72) {
      // Tier 3 Prospects (37-72) - Moderate upside, high risk
      baseValue = 35
      tierFloor = 8
      k = 0.05
      tierStart = 37
    } else {
      // Tier 4+ Prospects (73+) - Low upside, very high risk
      baseValue = 15
      tierFloor = 3
      k = 0.02
      tierStart = 73
    }

    // Calculate value using exponential decay within tier
    let value = baseValue * Math.exp(-k * (rank - tierStart)) + tierFloor

    // Position multipliers for prospects
    if (position) {
      const positionMultipliers: Record<string, number> = {
        QB: 1.4, // QB premium due to scarcity
        RB: 0.8, // RB discount due to short shelf life and injury risk
        WR: 1.0, // Baseline
        TE: 1.2, // TE premium due to scarcity
      }
      value *= positionMultipliers[position] || 1.0
    }

    return Math.round(value * 100) / 100
  }, [])

  // Get tier from database or calculate fallback
  const getProspectTier = useCallback((rank: number, dbTier?: string | null): string => {
    // Use database tier if available
    if (dbTier) return dbTier
    // Fallback calculation
    if (rank <= 12) return 'Elite Prospect'
    if (rank <= 36) return 'First Round'
    if (rank <= 72) return 'Second Round'
    if (rank <= 120) return 'Third Round'
    if (rank <= 200) return 'Mid Round'
    if (rank <= 300) return 'Late Round'
    return 'Undrafted'
  }, [])

  // Get valuation from database or calculate fallback
  const getProspectValue = useCallback(
    (prospect: Prospect): number => {
      // Use database valuation if available
      if (prospect.valuation) return Math.round(prospect.valuation * 100) / 100
      // Fallback to client-side calculation
      return calculateProspectValue(prospect.rank, prospect.position)
    },
    [calculateProspectValue]
  )

  // Format height from inches to feet-inches
  const formatHeight = useCallback((heightInches: number | null): string => {
    if (!heightInches) return '-'
    const feet = Math.floor(heightInches / 12)
    const inches = Math.round(heightInches % 12)
    return `${feet}'${inches}"`
  }, [])

  const getTierColor = useCallback((tier: string): string => {
    const tierColors: Record<string, string> = {
      'Elite Prospect': 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 font-bold',
      'First Round': 'bg-blue-500/20 text-blue-300 border border-blue-500/30 font-semibold',
      'Second Round': 'bg-green-500/20 text-green-300 border border-green-500/30 font-semibold',
      'Third Round': 'bg-purple-500/20 text-purple-300 border border-purple-500/30 font-medium',
      'Mid Round': 'bg-orange-500/20 text-orange-300 border border-orange-500/30 font-medium',
      'Late Round': 'bg-slate-500/20 text-slate-300 border border-slate-500/30 font-normal',
      Undrafted: 'bg-gray-500/20 text-gray-300 border border-gray-500/30 font-normal',
    }
    return (
      tierColors[tier] || 'bg-slate-500/20 text-slate-300 border border-slate-500/30 font-normal'
    )
  }, [])

  // Hit rate data based on position_prospect_tier_breakdown
  const hitRateData = useMemo(
    () =>
      ({
        QB: {
          'Elite Prospect': { elite: 17.4, tier1: 60.9, tier2: 17.4, startable: 0, streamer: 4.3 },
          'First Round': { elite: 0, tier1: 37.5, tier2: 50, startable: 12.5, streamer: 0 },
          'Second Round': { elite: 0, tier1: 0, tier2: 80, startable: 0, streamer: 20 },
          'Third Round': { elite: 0, tier1: 0, tier2: 16.7, startable: 41.7, streamer: 41.7 },
          'Mid Round': { elite: 0, tier1: 0, tier2: 4.2, startable: 20.8, streamer: 75 },
          'Late Round': { elite: 0, tier1: 0, tier2: 16.7, startable: 11.1, streamer: 72.2 },
          Undrafted: { elite: 0, tier1: 0, tier2: 59, startable: 9.6, streamer: 31.3 },
        },
        RB: {
          'Elite Prospect': { elite: 60, tier1: 40, tier2: 0, startable: 0, streamer: 0 },
          'First Round': { elite: 0, tier1: 62.5, tier2: 37.5, startable: 0, streamer: 0 },
          'Second Round': { elite: 0, tier1: 23.5, tier2: 58.8, startable: 17.6, streamer: 0 },
          'Third Round': { elite: 0, tier1: 3.7, tier2: 29.6, startable: 51.9, streamer: 14.8 },
          'Mid Round': { elite: 0, tier1: 0, tier2: 9.8, startable: 52.5, streamer: 37.7 },
          'Late Round': { elite: 0, tier1: 0, tier2: 2.6, startable: 12.8, streamer: 84.6 },
          Undrafted: { elite: 0, tier1: 0, tier2: 0.5, startable: 62.8, streamer: 36.6 },
        },
        WR: {
          'Elite Prospect': { elite: 10, tier1: 30, tier2: 60, startable: 0, streamer: 0 },
          'First Round': { elite: 0, tier1: 10.3, tier2: 69, startable: 13.8, streamer: 6.9 },
          'Second Round': { elite: 0, tier1: 2.3, tier2: 44.2, startable: 46.5, streamer: 7 },
          'Third Round': { elite: 0, tier1: 0, tier2: 11.4, startable: 51.4, streamer: 37.1 },
          'Mid Round': { elite: 0, tier1: 0, tier2: 1.5, startable: 35.3, streamer: 63.2 },
          'Late Round': { elite: 0, tier1: 0, tier2: 0, startable: 14.3, streamer: 85.7 },
          Undrafted: { elite: 0, tier1: 0, tier2: 0, startable: 58.3, streamer: 41.7 },
        },
        TE: {
          'Elite Prospect': { elite: 0, tier1: 50, tier2: 0, startable: 50, streamer: 0 },
          'First Round': { elite: 0, tier1: 12.5, tier2: 25, startable: 62.5, streamer: 0 },
          'Second Round': { elite: 0, tier1: 0, tier2: 12.5, startable: 62.5, streamer: 25 },
          'Third Round': { elite: 0, tier1: 0, tier2: 0, startable: 16.7, streamer: 83.3 },
          'Mid Round': { elite: 0, tier1: 0, tier2: 0, startable: 22.4, streamer: 77.6 },
          'Late Round': { elite: 0, tier1: 0, tier2: 0, startable: 3.3, streamer: 96.7 },
          Undrafted: { elite: 0, tier1: 0, tier2: 0, startable: 0, streamer: 100 },
        },
      }) as Record<
        string,
        Record<
          string,
          { elite: number; tier1: number; tier2: number; startable: number; streamer: number }
        >
      >,
    []
  )

  // Player Valuation System (for roster players) - Hybrid Exponential-Tiered Value Curve
  const calculatePlayerValue = useCallback((rank: number, position?: string): number => {
    if (!rank || rank <= 0 || rank > 1000) {
      return 1 // Unranked
    }

    // Hybrid Exponential-Tiered Value Curve
    // Value(rank) = BaseValue(tier) × e^(-k × (rank - TierStart)) + TierFloor

    let baseValue: number
    let tierFloor: number
    let k: number
    let tierStart: number

    // Define tiers with their parameters
    if (rank <= 10) {
      // Elite Tier (1-10)
      baseValue = 120
      tierFloor = 88
      k = 0.08
      tierStart = 1
    } else if (rank <= 30) {
      // Tier 2 (11-30)
      baseValue = 88
      tierFloor = 60
      k = 0.05
      tierStart = 11
    } else if (rank <= 80) {
      // Tier 3 (31-80)
      baseValue = 60
      tierFloor = 21
      k = 0.03
      tierStart = 31
    } else if (rank <= 200) {
      // Tier 4 (81-200)
      baseValue = 21
      tierFloor = 15
      k = 0.01
      tierStart = 81
    } else {
      // Depth Tier (201+)
      return 15 // Fixed value for depth players
    }

    // Calculate value using exponential decay within tier
    let value = baseValue * Math.exp(-k * (rank - tierStart)) + tierFloor

    // Position multipliers for established players
    if (position) {
      const positionMultipliers: Record<string, number> = {
        QB: 1.3, // QB premium but less than prospects
        RB: 0.9, // RB discount but less than prospects
        WR: 1.0, // Baseline
        TE: 1.1, // TE premium but less than prospects
      }
      value *= positionMultipliers[position] || 1.0
    }

    return Math.round(value * 100) / 100
  }, [])

  const getDraftPick = useCallback((prospect: Prospect): string => {
    const round = prospect.projectedRound || 'UDFA'
    if (round === 'UDFA') return 'UDFA'
    return `${round}`
  }, [])

  // Memoized event handlers
  const handleDragStart = useCallback((e: React.DragEvent, prospect: Prospect) => {
    setDraggedProspect(prospect)
    e.dataTransfer.effectAllowed = 'move'
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      if (draggedProspect) {
        const newRosterPlayer: RosterPlayer = {
          id: `prospect-${draggedProspect.id}`,
          name: draggedProspect.name,
          position: draggedProspect.position,
          team: 'ROOKIE',
          age: 21,
          experience: 0,
          value: calculateProspectValue(draggedProspect.rank, draggedProspect.position), // Use calculated value
          isProspect: true,
          prospectData: draggedProspect,
        }
        setRoster((prev) => [...prev, newRosterPlayer])
        setDraggedProspect(null)
      }
    },
    [draggedProspect, calculateProspectValue]
  )

  const resetRoster = useCallback(() => {
    setRoster([])
  }, [])

  const handleProspectSelect = useCallback((prospect: Prospect) => {
    setSelectedProspect(prospect)
    setShowModal(true)
  }, [])

  const handleShowComps = useCallback((prospect: Prospect) => {
    setSelectedProspectForComps(prospect)
    setShowCompsModal(true)
  }, [])

  const handleCloseModal = useCallback(() => {
    setShowModal(false)
    setSelectedProspect(null)
  }, [])

  const handleCloseCompsModal = useCallback(() => {
    setShowCompsModal(false)
    setSelectedProspectForComps(null)
  }, [])

  // Draft Board handlers
  const handleAddToDraftBoard = useCallback((prospect: Prospect) => {
    if (!prospect?.id) {
      return
    }
    setDraftBoard((prev) => {
      // Check if already on board - use strict comparison
      const existingIndex = prev.findIndex((p) => p.id === prospect.id)
      if (existingIndex !== -1) {
        // Already on board, return unchanged
        return prev
      }
      // Add the prospect - create a new array to ensure React detects the change
      return [...prev, { ...prospect }]
    })
  }, [])

  const handleRemoveFromDraftBoard = useCallback((prospectId: number) => {
    setDraftBoard((prev) => prev.filter((p) => p.id !== prospectId))
  }, [])

  const handleBoardDragStart = useCallback(
    (e: React.DragEvent, prospect: Prospect, index: number) => {
      setDraggedBoardProspect({ prospect, index })
      e.dataTransfer.effectAllowed = 'move'
    },
    []
  )

  const handleBoardDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const handleBoardDrop = useCallback(
    (e: React.DragEvent, dropIndex: number) => {
      e.preventDefault()

      if (draggedBoardProspect) {
        const { prospect, index: dragIndex } = draggedBoardProspect

        setDraftBoard((prev) => {
          const newBoard = [...prev]
          newBoard.splice(dragIndex, 1)
          newBoard.splice(dropIndex, 0, prospect)
          return newBoard
        })

        setDraggedBoardProspect(null)
      }
    },
    [draggedBoardProspect]
  )

  const handleClearDraftBoard = useCallback(() => {
    setDraftBoard([])
  }, [])

  // Fetch roster from Sleeper API
  useEffect(() => {
    const fetchRoster = async () => {
      if (!leagueId) return

      try {
        setRosterLoading(true)
        setRosterError(null)

        // Get authentication token
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (!session?.access_token) {
          setRosterError('Please log in to view your roster')
          return
        }

        const response = await fetch(`/api/league-roster?leagueId=${leagueId}`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        })

        if (response.ok) {
          const data = await response.json()

          // Fetch stats for all roster players using Sleeper IDs (SAME PATTERN AS LEAGUE BUDDY)
          const allSleeperPlayerIds = data.roster.map((p: any) => p.player_id).filter(Boolean)
          const rosterStatsMap: Record<
            string,
            { fantasy_ppg: number; total_fantasy_points: number; games_played: number }
          > = {}

          if (allSleeperPlayerIds.length > 0) {
            try {
              const playerIdsParam = allSleeperPlayerIds.join(',')
              const statsResponse = await fetch(`/api/roster-stats?player_ids=${playerIdsParam}`, {
                cache: 'no-store',
              })

              if (statsResponse.ok) {
                const result = await statsResponse.json()
                console.log('📊 Scouting Portal - Roster Stats Response:', result.count, 'players')

                // Map by Sleeper player ID
                result.data.forEach((playerStats: any) => {
                  rosterStatsMap[playerStats.sleeper_player_id] = {
                    fantasy_ppg: parseFloat(playerStats.fantasy_ppg) || 0,
                    total_fantasy_points: parseFloat(playerStats.total_fantasy_points) || 0,
                    games_played: playerStats.games_played || 0,
                  }
                })

                console.log('✅ Loaded stats for', Object.keys(rosterStatsMap).length, 'players')
              } else {
                console.error('❌ Failed to fetch stats:', statsResponse.statusText)
              }
            } catch (err) {
              console.error('❌ Failed to fetch stats:', err)
            }
          }

          const rosterPlayers: RosterPlayer[] = data.roster.map((player: any) => {
            const playerName = `${player.first_name} ${player.last_name}`
            const stats = rosterStatsMap[player.player_id] || {}

            return {
              id: player.player_id,
              name: playerName,
              position: player.position,
              team: player.team,
              age: player.age || 25,
              experience: player.years_exp || 3,
              value: calculatePlayerValue(player.search_rank || 100, player.position),
              sleeper_id: player.player_id,
              search_rank: player.search_rank,
              fantasy_pos_rank: player.fantasy_pos_rank,
              injury_status: player.injury_status,
              fantasy_ppg: stats.fantasy_ppg,
              games_played: stats.games_played,
            }
          })
          setRoster(rosterPlayers)
          setOriginalRoster(rosterPlayers)
        } else {
          const errorData = await response.json()
          setRosterError(errorData.error || 'Failed to fetch your roster')
        }
      } catch (error) {
        console.error('Error fetching roster:', error)
        setRosterError('Failed to load your roster. Please try again.')
      } finally {
        setRosterLoading(false)
      }
    }

    fetchRoster()
  }, [leagueId, calculatePlayerValue])

  // Fetch prospects data from Supabase
  const fetchProspects = useCallback(async () => {
    try {
      setLoading(true)
      // Add timestamp to prevent caching
      const timestamp = Date.now()
      const response = await fetch(`/api/prospects?t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      })
      if (response.ok) {
        const data = await response.json()
        // Add mock grades
        const prospectsWithGrades = data.map((prospect: Prospect) => ({
          ...prospect,
          grade: getProspectGrade(prospect),
          notes: '',
        }))
        setProspects(prospectsWithGrades)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch on mount and when tab becomes visible
  useEffect(() => {
    fetchProspects()

    // Refresh when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchProspects()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [fetchProspects])

  return (
    <div className="min-h-screen bg-slate-900 overflow-x-hidden">
      <Header />

      <main className="w-full px-4 py-8 overflow-x-hidden">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 space-y-3 sm:space-y-0">
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold text-white font-mono mb-2 truncate">
                  SCOUTING PORTAL
                </h1>
                <p className="text-gray-400 font-mono text-sm sm:text-base break-words">
                  League ID: {leagueId} • Dynasty SF 2026 Rookie Rankings
                </p>
              </div>
              <div className="flex items-center space-x-3 flex-shrink-0">
                <button
                  onClick={fetchProspects}
                  disabled={loading}
                  className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 hover:border-slate-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Refresh prospects"
                >
                  <RefreshCw className={`h-4 w-4 text-gray-300 ${loading ? 'animate-spin' : ''}`} />
                </button>
                <Badge className="bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  <Users className="h-3 w-3 mr-1" />
                  {roster.length} Players
                </Badge>
              </div>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="overflow-x-auto">
              <TabsList className="grid w-full grid-cols-3 bg-slate-800 border border-slate-700 min-w-max">
                <TabsTrigger
                  value="prospects"
                  className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-300 data-[state=active]:border-blue-500/30 whitespace-nowrap"
                >
                  <Eye className="h-4 w-4 mr-1 sm:mr-2" />
                  Prospects
                </TabsTrigger>
                <TabsTrigger
                  value="draftboard"
                  className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-300 data-[state=active]:border-blue-500/30 whitespace-nowrap"
                >
                  <TrendingUp className="h-4 w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Draft Board</span>
                  <span className="sm:hidden">Draft</span>
                </TabsTrigger>
                <TabsTrigger
                  value="historical"
                  className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-300 data-[state=active]:border-blue-500/30 whitespace-nowrap"
                >
                  <BarChart3 className="h-4 w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Historical</span>
                  <span className="sm:hidden">History</span>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Prospects Tab */}
            <TabsContent
              value="prospects"
              className="mt-6 !bg-transparent [&>*]:bg-transparent"
              style={{ background: 'transparent' }}
            >
              <ProspectsTab
                loading={loading}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                positionFilter={positionFilter}
                setPositionFilter={setPositionFilter}
                schoolFilter={schoolFilter}
                setSchoolFilter={setSchoolFilter}
                schools={schools}
                filteredProspects={filteredProspects}
                allProspects={prospects}
                draftBoard={draftBoard}
                onProspectSelect={handleProspectSelect}
                onShowComps={handleShowComps}
                isDiamondTier={isProspectDiamondTier}
              />
            </TabsContent>

            <TabsContent value="draftboard" className="mt-6">
              <DraftBoardTab
                loading={loading}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                positionFilter={positionFilter}
                setPositionFilter={setPositionFilter}
                filteredProspects={filteredProspects}
                draftBoard={draftBoard}
                onAddToDraftBoard={handleAddToDraftBoard}
                onRemoveFromDraftBoard={handleRemoveFromDraftBoard}
                onBoardDragStart={handleBoardDragStart}
                onBoardDragOver={handleBoardDragOver}
                onBoardDrop={handleBoardDrop}
                onClearDraftBoard={handleClearDraftBoard}
              />
            </TabsContent>

            <TabsContent value="historical" className="mt-6">
              <HistoricalRankingsTab currentProspects={prospects} />
            </TabsContent>
          </Tabs>

          <ProspectDetailModal
            prospect={selectedProspect}
            positionNeeds={positionNeeds}
            onClose={handleCloseModal}
            onAddToDraftBoard={() => {
              if (selectedProspect) {
                handleAddToDraftBoard(selectedProspect)
                handleCloseModal()
              }
            }}
            getProspectGrade={getProspectGrade}
            getDraftPick={getDraftPick}
            getProspectTier={getProspectTier}
            calculateProspectValue={calculateProspectValue}
            getPositionColor={getPositionColor}
          />

          <ComparisonsModal
            prospect={selectedProspectForComps}
            onClose={handleCloseCompsModal}
            getProspectTier={getProspectTier}
            getTierColor={getTierColor}
            getPositionColor={getPositionColor}
            hitRateData={hitRateData}
          />
        </div>
      </main>
    </div>
  )
}
