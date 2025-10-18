"use client"

import type React from "react"

import { useState, useEffect, Suspense, useCallback, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { Header } from "@/components/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Eye, Users, TrendingUp, Star, School, User, Crown, X, GripVertical, Wrench } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { PlayerNGSStats } from "@/components/player-ngs-stats"

interface Prospect {
  rank: number
  name: string
  position: string
  school: string
  espn_id: number | null
  grade?: string // QB1, QB2, etc.
  notes?: string
  projectedRound?: string // Added for draft pick display
}

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

interface ScoutingPortalContentProps {
  leagueId: string
}

function ScoutingPortalContent({ leagueId }: ScoutingPortalContentProps) {
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [roster, setRoster] = useState<RosterPlayer[]>([])
  const [originalRoster, setOriginalRoster] = useState<RosterPlayer[]>([])
  const [loading, setLoading] = useState(true)
  const [rosterLoading, setRosterLoading] = useState(true)
  const [rosterError, setRosterError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [positionFilter, setPositionFilter] = useState("all")
  const [schoolFilter, setSchoolFilter] = useState("all")
  const [activeTab, setActiveTab] = useState("roster")
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null)
  const [draggedProspect, setDraggedProspect] = useState<Prospect | null>(null)
  const [dragOverPosition, setDragOverPosition] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [showCompsModal, setShowCompsModal] = useState(false)
  const [selectedProspectForComps, setSelectedProspectForComps] = useState<Prospect | null>(null)
  const [draftBoard, setDraftBoard] = useState<Prospect[]>([])
  const [draggedBoardProspect, setDraggedBoardProspect] = useState<{ prospect: Prospect; index: number } | null>(null)


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
          prospect.school.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    if (positionFilter !== "all") {
      filtered = filtered.filter((prospect) => prospect.position === positionFilter)
    }

    if (schoolFilter !== "all") {
      filtered = filtered.filter((prospect) => prospect.school === schoolFilter)
    }

    return filtered
  }, [prospects, searchTerm, positionFilter, schoolFilter])


  // Memoized utility functions
  const getProspectGrade = useCallback((prospect: Prospect): string => {
    return prospect.grade || "C"
  }, [])

  const getGradeColor = useCallback((grade: string): string => {
    const gradeColors: Record<string, string> = {
      "A+": "text-green-400",
      A: "text-green-400",
      "A-": "text-green-400",
      "B+": "text-blue-400",
      B: "text-blue-400",
      "B-": "text-blue-400",
      "C+": "text-yellow-400",
      C: "text-yellow-400",
      "C-": "text-yellow-400",
      "D+": "text-orange-400",
      D: "text-orange-400",
      "D-": "text-orange-400",
      F: "text-red-400",
    }
    return gradeColors[grade] || "text-gray-400"
  }, [])

  const getPositionColor = useCallback((position: string): string => {
    const colors: Record<string, string> = {
      QB: "bg-slate-500",
      RB: "bg-slate-500",
      WR: "bg-slate-500",
      TE: "bg-slate-500",
      K: "bg-slate-500",
      DEF: "bg-slate-500",
    }
    return colors[position] || "bg-slate-500"
  }, [])

  // Prospect Valuation System - Hybrid Exponential-Tiered Value Curve
  const calculateProspectValue = useCallback((rank: number, position?: string): number => {
    if (!rank || rank <= 0 || rank > 1000) {
      return 1 // Unranked
    }

    // Hybrid Exponential-Tiered Value Curve for Prospects
    // Higher risk = sharper decay and lower floors
    // Value(rank) = BaseValue(tier) × e^(-k × (rank - TierStart)) + TierFloor

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

  const getProspectTier = useCallback((rank: number): string => {
    if (rank <= 12) return "Elite Prospect"
    if (rank <= 36) return "First Round"
    if (rank <= 72) return "Second Round"
    if (rank <= 120) return "Third Round"
    if (rank <= 200) return "Mid Round"
    if (rank <= 300) return "Late Round"
    return "Undrafted"
  }, [])

  const getTierColor = useCallback((tier: string): string => {
    const tierColors: Record<string, string> = {
      "Elite Prospect": "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 font-bold",
      "First Round": "bg-blue-500/20 text-blue-300 border border-blue-500/30 font-semibold",
      "Second Round": "bg-green-500/20 text-green-300 border border-green-500/30 font-semibold",
      "Third Round": "bg-purple-500/20 text-purple-300 border border-purple-500/30 font-medium",
      "Mid Round": "bg-orange-500/20 text-orange-300 border border-orange-500/30 font-medium",
      "Late Round": "bg-slate-500/20 text-slate-300 border border-slate-500/30 font-normal",
      Undrafted: "bg-gray-500/20 text-gray-300 border border-gray-500/30 font-normal",
    }
    return tierColors[tier] || "bg-slate-500/20 text-slate-300 border border-slate-500/30 font-normal"
  }, [])

  // Hit rate data based on position_prospect_tier_breakdown
  const hitRateData = useMemo(
    () =>
      ({
        QB: {
          "Elite Prospect": { elite: 17.4, tier1: 60.9, tier2: 17.4, startable: 0, streamer: 4.3 },
          "First Round": { elite: 0, tier1: 37.5, tier2: 50, startable: 12.5, streamer: 0 },
          "Second Round": { elite: 0, tier1: 0, tier2: 80, startable: 0, streamer: 20 },
          "Third Round": { elite: 0, tier1: 0, tier2: 16.7, startable: 41.7, streamer: 41.7 },
          "Mid Round": { elite: 0, tier1: 0, tier2: 4.2, startable: 20.8, streamer: 75 },
          "Late Round": { elite: 0, tier1: 0, tier2: 16.7, startable: 11.1, streamer: 72.2 },
          Undrafted: { elite: 0, tier1: 0, tier2: 59, startable: 9.6, streamer: 31.3 },
        },
        RB: {
          "Elite Prospect": { elite: 60, tier1: 40, tier2: 0, startable: 0, streamer: 0 },
          "First Round": { elite: 0, tier1: 62.5, tier2: 37.5, startable: 0, streamer: 0 },
          "Second Round": { elite: 0, tier1: 23.5, tier2: 58.8, startable: 17.6, streamer: 0 },
          "Third Round": { elite: 0, tier1: 3.7, tier2: 29.6, startable: 51.9, streamer: 14.8 },
          "Mid Round": { elite: 0, tier1: 0, tier2: 9.8, startable: 52.5, streamer: 37.7 },
          "Late Round": { elite: 0, tier1: 0, tier2: 2.6, startable: 12.8, streamer: 84.6 },
          Undrafted: { elite: 0, tier1: 0, tier2: 0.5, startable: 62.8, streamer: 36.6 },
        },
        WR: {
          "Elite Prospect": { elite: 10, tier1: 30, tier2: 60, startable: 0, streamer: 0 },
          "First Round": { elite: 0, tier1: 10.3, tier2: 69, startable: 13.8, streamer: 6.9 },
          "Second Round": { elite: 0, tier1: 2.3, tier2: 44.2, startable: 46.5, streamer: 7 },
          "Third Round": { elite: 0, tier1: 0, tier2: 11.4, startable: 51.4, streamer: 37.1 },
          "Mid Round": { elite: 0, tier1: 0, tier2: 1.5, startable: 35.3, streamer: 63.2 },
          "Late Round": { elite: 0, tier1: 0, tier2: 0, startable: 14.3, streamer: 85.7 },
          Undrafted: { elite: 0, tier1: 0, tier2: 0, startable: 58.3, streamer: 41.7 },
        },
        TE: {
          "Elite Prospect": { elite: 0, tier1: 50, tier2: 0, startable: 50, streamer: 0 },
          "First Round": { elite: 0, tier1: 12.5, tier2: 25, startable: 62.5, streamer: 0 },
          "Second Round": { elite: 0, tier1: 0, tier2: 12.5, startable: 62.5, streamer: 25 },
          "Third Round": { elite: 0, tier1: 0, tier2: 0, startable: 16.7, streamer: 83.3 },
          "Mid Round": { elite: 0, tier1: 0, tier2: 0, startable: 22.4, streamer: 77.6 },
          "Late Round": { elite: 0, tier1: 0, tier2: 0, startable: 3.3, streamer: 96.7 },
          Undrafted: { elite: 0, tier1: 0, tier2: 0, startable: 0, streamer: 100 },
        },
      }) as Record<
        string,
        Record<string, { elite: number; tier1: number; tier2: number; startable: number; streamer: number }>
      >,
    [],
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
    const round = prospect.projectedRound || "UDFA"
    if (round === "UDFA") return "UDFA"
    return `${round}`
  }, [])

  // Memoized event handlers
  const handleDragStart = useCallback((e: React.DragEvent, prospect: Prospect) => {
    setDraggedProspect(prospect)
    e.dataTransfer.effectAllowed = "move"
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      if (draggedProspect) {
        const newRosterPlayer: RosterPlayer = {
          id: `prospect-${draggedProspect.rank}`,
          name: draggedProspect.name,
          position: draggedProspect.position,
          team: "ROOKIE",
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
    [draggedProspect, calculateProspectValue],
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
    setDraftBoard((prev) => {
      // Check if already on board
      if (prev.some((p) => p.rank === prospect.rank)) return prev
      return [...prev, prospect]
    })
  }, [])

  const handleRemoveFromDraftBoard = useCallback((prospectRank: number) => {
    setDraftBoard((prev) => prev.filter((p) => p.rank !== prospectRank))
  }, [])

  const handleBoardDragStart = useCallback((e: React.DragEvent, prospect: Prospect, index: number) => {
    setDraggedBoardProspect({ prospect, index })
    e.dataTransfer.effectAllowed = "move"
  }, [])

  const handleBoardDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
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
          setRosterError("Please log in to view your roster")
          return
        }

        const response = await fetch(`/api/league-roster?leagueId=${leagueId}`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        })

        if (response.ok) {
          const data = await response.json()
          
          // Fetch stats for all roster players using Sleeper IDs (SAME PATTERN AS LEAGUE BUDDY)
          const allSleeperPlayerIds = data.roster.map((p: any) => p.player_id).filter(Boolean)
          const rosterStatsMap: Record<string, { fantasy_ppg: number, total_fantasy_points: number, games_played: number }> = {}
          
          if (allSleeperPlayerIds.length > 0) {
            try {
              const playerIdsParam = allSleeperPlayerIds.join(',')
              const statsResponse = await fetch(`/api/roster-stats?player_ids=${playerIdsParam}`, { 
                cache: 'no-store'
              })
              
              if (statsResponse.ok) {
                const result = await statsResponse.json()
                console.log('📊 Scouting Portal - Roster Stats Response:', result.count, 'players')
                
                // Map by Sleeper player ID
                result.data.forEach((playerStats: any) => {
                  rosterStatsMap[playerStats.sleeper_player_id] = {
                    fantasy_ppg: parseFloat(playerStats.fantasy_ppg) || 0,
                    total_fantasy_points: parseFloat(playerStats.total_fantasy_points) || 0,
                    games_played: playerStats.games_played || 0
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
          setRosterError(errorData.error || "Failed to fetch your roster")
        }
      } catch (error) {
        console.error("Error fetching roster:", error)
        setRosterError("Failed to load your roster. Please try again.")
      } finally {
        setRosterLoading(false)
      }
    }

    fetchRoster()
  }, [leagueId, calculatePlayerValue])

  // Fetch prospects data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const response = await fetch("/api/prospects")
        if (response.ok) {
          const data = await response.json()
          // Add mock grades
          const prospectsWithGrades = data.map((prospect: Prospect) => ({
            ...prospect,
            grade: getProspectGrade(prospect),
            notes: "",
          }))
          setProspects(prospectsWithGrades)
        }
      } catch (error) {
        console.error("Error fetching data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  return (
    <div className="min-h-screen bg-slate-900">
      <Header />

      <main className="w-full px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-white font-mono mb-2">SCOUTING PORTAL</h1>
                <p className="text-gray-400 font-mono">League ID: {leagueId} • Dynasty SF 2026 Rookie Rankings</p>
              </div>
              <div className="flex items-center space-x-3">
                <Badge className="bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  <Users className="h-3 w-3 mr-1" />
                  {roster.length} Players
                </Badge>
              </div>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-slate-800 border border-slate-700">
              <TabsTrigger
                value="roster"
                className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-300 data-[state=active]:border-blue-500/30"
              >
                <Users className="h-4 w-4 mr-2" />
                Roster & Overview
              </TabsTrigger>
              <TabsTrigger
                value="prospects"
                className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-300 data-[state=active]:border-blue-500/30"
              >
                <Eye className="h-4 w-4 mr-2" />
                Prospects
              </TabsTrigger>
              <TabsTrigger
                value="team-builder"
                className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-300 data-[state=active]:border-blue-500/30"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Team Builder
              </TabsTrigger>
              <TabsTrigger
                value="draftboard"
                className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-300 data-[state=active]:border-blue-500/30"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Draft Board
              </TabsTrigger>
            </TabsList>

            {/* Combined Roster & Overview Tab */}
            <TabsContent value="roster" className="mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Roster Overview */}
                <div className="relative">
                  <Card className="bg-slate-800 border border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center justify-between">
                        <span>Roster Overview</span>
                        <Badge className="bg-blue-500/20 text-blue-300 border border-blue-500/30">
                          {roster.length}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {["QB", "RB", "WR", "TE"].map((pos) => {
                          const count = roster.filter((p) => p.position === pos).length
                          const avgAge =
                            roster.filter((p) => p.position === pos).reduce((sum, p) => sum + p.age, 0) / count || 0
                          const avgValue =
                            roster.filter((p) => p.position === pos).reduce((sum, p) => sum + p.value, 0) / count || 0
                          return (
                            <div key={pos} className="bg-slate-700 rounded-lg p-3 text-center">
                              <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-500 text-white text-xs font-bold mb-2">
                                {pos}
                              </div>
                              <div className="text-white font-bold text-lg">{count}</div>
                              <div className="text-gray-400 text-xs">Avg Age: {avgAge.toFixed(1)}</div>
                              <div className="text-blue-400 text-xs font-semibold">
                                Avg Value: {avgValue.toFixed(0)}
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      {/* Positional Needs */}
                      <div className="mt-4 bg-slate-700 rounded-lg p-3">
                        <h3 className="text-white font-semibold text-sm mb-2">Positional Needs</h3>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(positionNeeds).map(([pos, need]) => (
                            <Badge
                              key={pos}
                              className={`${need > 0 ? "bg-red-500/20 text-red-300 border-red-500/30" : "bg-green-500/20 text-green-300 border-green-500/30"} text-xs`}
                            >
                              {pos}: {need}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Roster Strength Summary */}
                      <div className="mt-4 bg-slate-700 rounded-lg p-3">
                        <h3 className="text-white font-semibold text-sm mb-2">Roster Strength</h3>
                        <div className="space-y-2">
                          {["QB", "RB", "WR", "TE"].map((position) => {
                            const positionPlayers = rosterWithPositionalRanks.filter((p) => p.position === position)
                            if (positionPlayers.length === 0) return null

                            const totalValue = positionPlayers.reduce((sum, p) => sum + p.value, 0)
                            const avgRank =
                              positionPlayers.reduce((sum, p) => sum + p.positionalRank, 0) / positionPlayers.length
                            const topPlayer = positionPlayers.sort((a, b) => b.value - a.value)[0]

                            return (
                              <div key={position} className="flex items-center justify-between text-xs">
                                <div className="flex items-center space-x-2">
                                  <div className="w-3 h-3 rounded-full bg-slate-500"></div>
                                  <span className="text-gray-300">{position}</span>
                                </div>
                                <div className="flex items-center space-x-3">
                                  <span className="text-blue-400">Total: {totalValue.toFixed(0)}</span>
                                  <span className="text-slate-300">Avg Rank: {avgRank.toFixed(1)}</span>
                                  <span className="text-gray-400">Top: {topPlayer.name}</span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {/* Top Players by Position */}
                      <div className="mt-4">
                        <h3 className="text-white font-semibold text-sm mb-2">Top Players by Position</h3>
                        <div className="space-y-2">
                          {["QB", "RB", "WR", "TE"].map((position) => {
                            const topPlayer = rosterWithPositionalRanks
                              .filter((p) => p.position === position)
                              .sort((a, b) => b.value - a.value)[0]

                            if (!topPlayer) return null

                            return (
                              <div
                                key={position}
                                className="flex items-center justify-between p-2 bg-slate-700 rounded text-xs hover:bg-slate-600 transition-colors cursor-pointer"
                                onClick={() => topPlayer.isProspect && handleProspectSelect(topPlayer.prospectData!)}
                              >
                                <div className="flex items-center space-x-2 flex-1 min-w-0">
                                  <Badge className="bg-slate-500/30 text-slate-200 text-xs border border-slate-500/30">
                                    {position}
                                  </Badge>
                                  <Badge className="bg-slate-400/30 text-slate-200 text-xs border border-slate-400/30">
                                    #{topPlayer.positionalRank}
                                  </Badge>
                                  <div className="min-w-0 flex-1">
                                    <div className="text-white font-semibold flex items-center gap-1">
                                      <span className="truncate">{topPlayer.name}</span>
                                      {!topPlayer.isProspect && topPlayer.fantasy_ppg && (
                                        <Badge className="bg-green-500/20 text-green-300 text-[10px] border border-green-500/30 font-mono flex-shrink-0">
                                          {topPlayer.fantasy_ppg.toFixed(1)} PPG
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="text-gray-400">{topPlayer.team}</div>
                                  </div>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <div className="text-blue-400 font-mono font-semibold">{topPlayer.value}</div>
                                  <div className="text-gray-400 text-xs">Value</div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Main Roster Area */}
                <div className="relative lg:col-span-3">
                  <Card className="bg-slate-800 border border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center justify-between">
                        <span>Current Roster</span>
                        <div className="text-sm text-gray-400">
                          Drag prospects from the Prospects tab to add them to your roster
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {rosterLoading ? (
                        <div className="text-center py-8">
                          <div className="w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                          <p className="text-gray-400">Loading roster from Sleeper...</p>
                        </div>
                      ) : rosterError ? (
                        <div className="text-center py-8 text-red-400">
                          <p>{rosterError}</p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => (window.location.href = "/login")} // Redirect to login if not connected
                            className="border-red-400 text-red-400 hover:border-red-300 mt-4"
                          >
                            Connect to Sleeper
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {["QB", "RB", "WR", "TE"].map((position) => {
                            const positionPlayers = rosterWithPositionalRanks.filter((p) => p.position === position)
                            return (
                              <div key={position} className="bg-slate-700 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-4">
                                  <h3 className="text-white font-semibold flex items-center">
                                    <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-500 text-white text-xs font-bold mr-2">
                                      {position}
                                    </div>
                                    {position} ({positionPlayers.length})
                                  </h3>
                                  <div className="flex items-center space-x-2">
                                    <Badge variant="outline" className="text-gray-400 text-xs">
                                      Avg Age:{" "}
                                      {(
                                        positionPlayers.reduce((sum, p) => sum + p.age, 0) / positionPlayers.length || 0
                                      ).toFixed(1)}
                                    </Badge>
                                    <Badge variant="outline" className="text-blue-400 text-xs border-blue-400/40">
                                      Avg Value:{" "}
                                      {(
                                        positionPlayers.reduce((sum, p) => sum + p.value, 0) / positionPlayers.length ||
                                        0
                                      ).toFixed(0)}
                                    </Badge>
                                  </div>
                                </div>

                                {/* Drop Zone */}
                                <div
                                  className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 min-h-[80px] p-3 rounded-lg border-2 border-dashed transition-colors ${
                                    dragOverPosition === position
                                      ? "border-blue-400 bg-blue-400/5"
                                      : "border-slate-600 border-dashed"
                                  }`}
                                  onDragOver={handleDragOver}
                                  onDragLeave={handleDragLeave}
                                  onDrop={(e) => handleDrop(e)}
                                >
                                  {positionPlayers.map((player) => (
                                    <div
                                      key={player.id}
                                      className="p-3 bg-slate-600 rounded-lg hover:bg-slate-500 transition-colors"
                                      onDragOver={handleDragOver}
                                      onDrop={(e) => handleDrop(e)}
                                    >
                                      <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center space-x-3">
                                          <div className="w-8 h-8 bg-slate-500 rounded-full flex items-center justify-center">
                                            {player.isProspect ? (
                                              <Crown className="h-4 w-4 text-yellow-400" />
                                            ) : (
                                              <User className="h-4 w-4 text-gray-400" />
                                            )}
                                          </div>
                                          <div>
                                            <div className="text-white font-semibold text-sm flex items-center">
                                              {player.name}
                                              <Badge className="ml-2 bg-slate-400/30 text-slate-200 text-xs border border-slate-400/30">
                                                #{player.positionalRank}
                                              </Badge>
                                              {player.isProspect && (
                                                <Badge className="ml-2 bg-yellow-500/20 text-yellow-300 text-xs border border-yellow-500/30">
                                                  {getProspectGrade(player.prospectData!)}
                                                </Badge>
                                              )}
                                              {!player.isProspect && player.fantasy_ppg && (
                                                <Badge className="ml-2 bg-green-500/20 text-green-300 text-xs border border-green-500/30 font-mono">
                                                  {player.fantasy_ppg.toFixed(1)} PPG
                                                </Badge>
                                              )}
                                            </div>
                                            <div className="text-gray-400 text-xs">
                                              {player.team} • Age {player.age}
                                              {player.isProspect && ` • ${player.prospectData?.school}`}
                                              {player.search_rank && ` • Rank #${player.search_rank}`}
                                              {!player.isProspect && player.games_played && ` • ${player.games_played} GP`}
                                            </div>
                                          </div>
                                        </div>
                                        <div className="text-right">
                                          <div className="text-blue-400 text-sm font-bold">{player.value}</div>
                                          <div className="text-gray-400 text-xs">Value</div>
                                        </div>
                                      </div>
                                      {/* NGS Stats */}
                                      {!player.isProspect && (
                                        <div className="mt-2 pt-2 border-t border-slate-500">
                                          <PlayerNGSStats 
                                            playerName={player.name} 
                                            position={player.position}
                                            compact={true}
                                          />
                                        </div>
                                      )}
                                    </div>
                                  ))}

                                  {/* Empty drop zone indicator */}
                                  {positionPlayers.length === 0 && (
                                    <div className="flex items-center justify-center text-gray-500 text-sm">
                                      Drop {position} prospects here
                                    </div>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* Prospects Tab */}
            <TabsContent value="prospects" className="mt-6">
              <div className="relative">
                <Card className="bg-slate-800 border border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center justify-between">
                      <span>College Prospects</span>
                      <div className="flex items-center space-x-2">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            placeholder="Search prospects..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 bg-slate-700 border-slate-600 text-white"
                          />
                        </div>
                        <Select value={positionFilter} onValueChange={setPositionFilter}>
                          <SelectTrigger className="w-32 bg-slate-700 border-slate-600">
                            <SelectValue placeholder="Position" />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-700 border-slate-600">
                            <SelectItem value="all">All Positions</SelectItem>
                            <SelectItem value="QB">QB</SelectItem>
                            <SelectItem value="RB">RB</SelectItem>
                            <SelectItem value="WR">WR</SelectItem>
                            <SelectItem value="TE">TE</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select value={schoolFilter} onValueChange={setSchoolFilter}>
                          <SelectTrigger className="w-40 bg-slate-700 border-slate-600">
                            <SelectValue placeholder="School" />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-700 border-slate-600">
                            <SelectItem value="all">All Schools</SelectItem>
                            {schools.map((school) => (
                              <SelectItem key={school} value={school}>
                                {school}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="text-center py-8">
                        <div className="w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-gray-400">Loading prospects...</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredProspects.map((prospect) => (
                          <div key={prospect.rank} className="group relative">
                            <Card
                              className="bg-slate-700 border border-slate-600 hover:border-blue-400 transition-all duration-200 cursor-pointer"
                              draggable
                              onDragStart={(e) => handleDragStart(e, prospect)}
                              onClick={() => handleProspectSelect(prospect)}
                            >
                              <CardContent className="p-4">
                                {/* Header with badges and actions */}
                                <div className="flex items-start justify-between mb-4">
                                  <div className="flex items-center space-x-2">
                                    <Badge className="bg-blue-500/20 text-blue-300 text-xs font-semibold border border-blue-500/30">
                                      {getProspectGrade(prospect)}
                                    </Badge>
                                    <Badge
                                      variant="outline"
                                      className="bg-purple-500/20 text-purple-300 text-xs font-semibold border border-purple-500/30"
                                    >
                                      {getDraftPick(prospect)}
                                    </Badge>
                                    <Badge
                                      variant="outline"
                                      className="bg-green-500/20 text-green-300 text-xs font-semibold border border-green-500/30"
                                    >
                                      {getProspectTier(prospect.rank)}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <GripVertical className="h-4 w-4 text-gray-400" />
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 w-6 p-0 text-gray-400 hover:text-blue-400"
                                    >
                                      <Star className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>

                                {/* Player name and school */}
                                <div className="mb-4">
                                  <h3 className="text-white font-bold text-lg mb-1 leading-tight">{prospect.name}</h3>
                                  <div className="flex items-center text-gray-400 text-sm">
                                    <School className="h-3 w-3 mr-1" />
                                    <span>{prospect.school}</span>
                                  </div>
                                </div>

                                {/* Valuation section */}
                                <div className="bg-slate-600 rounded-lg p-3 mb-4">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <div className="text-blue-400 text-xl font-bold">
                                        {calculateProspectValue(prospect.rank, prospect.position)}
                                      </div>
                                      <div className="text-gray-400 text-xs">Dynasty Value</div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-slate-300 text-lg font-bold">#{prospect.rank}</div>
                                      <div className="text-gray-400 text-xs">Rank</div>
                                    </div>
                                  </div>
                                </div>

                                {/* Action buttons */}
                                <div className="flex space-x-2">
                                  <Button
                                    size="sm"
                                    className={`${getTierColor(getProspectTier(prospect.rank))} hover:opacity-80 transition-opacity flex-1`}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleProspectSelect(prospect)
                                    }}
                                  >
                                    {getProspectTier(prospect.rank)}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-slate-600 text-gray-300 bg-slate-600 hover:border-blue-400 font-semibold"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleShowComps(prospect)
                                    }}
                                  >
                                    Compare
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="team-builder" className="mt-6">
              <div className="relative">
                <Card className="bg-slate-800 border border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center justify-between">
                      <span>Team Builder - What If Scenarios</span>
                      <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30 font-mono">
                        {roster.length} Players
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Available Prospects to Add */}
                      <div className="lg:col-span-2">
                        <div className="mb-6">
                          <h3 className="text-white font-semibold mb-4 flex items-center">
                            <School className="h-5 w-5 mr-2 text-yellow-400" />
                            Available College Prospects
                          </h3>
                          <div className="mb-4 flex items-center space-x-2">
                            <div className="relative flex-1">
                              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                              <Input
                                placeholder="Search prospects..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 bg-slate-700 border-slate-600 text-white"
                              />
                            </div>
                            <Select value={positionFilter} onValueChange={setPositionFilter}>
                              <SelectTrigger className="w-28 bg-slate-700 border-slate-600">
                                <SelectValue placeholder="Position" />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-700 border-slate-600">
                                <SelectItem value="all">All</SelectItem>
                                <SelectItem value="QB">QB</SelectItem>
                                <SelectItem value="RB">RB</SelectItem>
                                <SelectItem value="WR">WR</SelectItem>
                                <SelectItem value="TE">TE</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          {loading ? (
                            <div className="text-center py-8">
                              <div className="w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                              <p className="text-gray-400">Loading prospects...</p>
                            </div>
                          ) : filteredProspects.length === 0 ? (
                            <div className="text-center py-8">
                              <School className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                              <p className="text-gray-400">No prospects found</p>
                              <p className="text-gray-500 text-sm">Try adjusting your filters</p>
                            </div>
                          ) : (
                            <>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[600px] overflow-y-auto">
                                {filteredProspects.slice(0, 20).map((prospect) => (
                                  <Card
                                    key={prospect.rank}
                                    className="bg-slate-700 border border-slate-600 hover:border-yellow-400 transition-all cursor-move"
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, prospect)}
                                  >
                                    <CardContent className="p-3">
                                      <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center space-x-2">
                                          <Badge className="bg-yellow-500/20 text-yellow-300 text-xs border-yellow-500/30">
                                            {getProspectGrade(prospect)}
                                          </Badge>
                                          <Badge className="bg-slate-500/30 text-slate-200 text-xs">
                                            {prospect.position}
                                          </Badge>
                                          <Badge className="bg-green-500/20 text-green-300 text-xs border-green-500/30">
                                            {getProspectTier(prospect.rank)}
                                          </Badge>
                                        </div>
                                        <GripVertical className="h-4 w-4 text-gray-400" />
                                      </div>
                                      <div className="mb-2">
                                        <div className="text-white font-semibold text-sm">{prospect.name}</div>
                                        <div className="text-gray-400 text-xs">{prospect.school} • #{prospect.rank}</div>
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <div className="text-blue-400 text-sm font-bold">
                                          {calculateProspectValue(prospect.rank, prospect.position)}
                                        </div>
                                        <div className="text-xs text-slate-400">Value</div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                ))}
                              </div>
                              {filteredProspects.length > 20 && (
                                <p className="text-center text-slate-400 text-sm mt-2">
                                  Showing top 20 results. Refine your search for more.
                                </p>
                              )}
                            </>
                          )}
                        </div>

                        <div className="mb-4">
                          <h3 className="text-white font-semibold mb-4 flex items-center">
                            <TrendingUp className="h-5 w-5 mr-2 text-green-400" />
                            Current Roster Composition
                          </h3>
                          <div className="grid grid-cols-2 gap-4 mb-6">
                            {["QB", "RB", "WR", "TE"].map((pos) => {
                              const posPlayers = roster.filter((p) => p.position === pos)
                              const avgAge = posPlayers.reduce((sum, p) => sum + p.age, 0) / posPlayers.length || 0
                              const avgValue = posPlayers.reduce((sum, p) => sum + p.value, 0) / posPlayers.length || 0
                              const prospectCount = posPlayers.filter((p) => p.isProspect).length

                              return (
                                <Card key={pos} className="bg-slate-700 border-slate-600">
                                  <CardContent className="p-4">
                                    <div className="flex items-center justify-between mb-2">
                                      <Badge className="bg-slate-500/30 text-slate-200 border border-slate-500/30">
                                        {pos}
                                      </Badge>
                                      <span className="text-white font-bold text-lg">{posPlayers.length}</span>
                                    </div>
                                    <div className="space-y-1 text-xs">
                                      <div className="flex items-center justify-between">
                                        <span className="text-slate-400">Avg Age:</span>
                                        <span className="text-slate-200">{avgAge.toFixed(1)}</span>
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <span className="text-slate-400">Avg Value:</span>
                                        <span className="text-blue-400 font-semibold">{avgValue.toFixed(0)}</span>
                                      </div>
                                      {prospectCount > 0 && (
                                        <div className="flex items-center justify-between">
                                          <span className="text-slate-400">Prospects:</span>
                                          <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30 text-xs">
                                            {prospectCount}
                                          </Badge>
                                        </div>
                                      )}
                                    </div>
                                  </CardContent>
                                </Card>
                              )
                            })}
                          </div>
                        </div>

                        {/* Full Roster Display */}
                        <div>
                          <h3 className="text-white font-semibold mb-4 flex items-center">
                            <Users className="h-5 w-5 mr-2 text-blue-400" />
                            Your Complete Roster
                          </h3>
                          <div className="space-y-3">
                            <p className="text-sm text-slate-400 mb-4">
                              Drag college prospects from above to add them to your what-if scenario.
                            </p>
                            
                            {/* Show full roster by position */}
                            <div 
                              className="space-y-4 min-h-[400px] border-2 border-dashed border-slate-600 rounded-lg p-4"
                              onDragOver={handleDragOver}
                              onDrop={handleDrop}
                            >
                              {["QB", "RB", "WR", "TE"].map((position) => {
                                const positionPlayers = roster.filter((p) => p.position === position)
                                if (positionPlayers.length === 0) return null

                                return (
                                  <div key={position}>
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center space-x-2">
                                        <Badge className="bg-slate-500/30 text-slate-200 border border-slate-500/30">
                                          {position}
                                        </Badge>
                                        <span className="text-slate-400 text-sm">({positionPlayers.length} players)</span>
                                      </div>
                                    </div>
                                    <div className="space-y-2">
                                      {positionPlayers.map((player) => (
                                        <Card 
                                          key={player.id} 
                                          className={player.isProspect 
                                            ? "bg-gradient-to-r from-yellow-500/10 to-transparent border-yellow-500/30"
                                            : "bg-slate-700 border-slate-600"
                                          }
                                        >
                                          <CardContent className="p-3">
                                            <div className="flex items-center justify-between">
                                              <div className="flex items-center space-x-3">
                                                <div className="w-8 h-8 bg-slate-500 rounded-full flex items-center justify-center">
                                                  {player.isProspect ? (
                                                    <Crown className="h-4 w-4 text-yellow-400" />
                                                  ) : (
                                                    <User className="h-4 w-4 text-gray-400" />
                                                  )}
                                                </div>
                                                <div>
                                                  <div className="text-white font-semibold text-sm flex items-center">
                                                    {player.name}
                                                    {player.isProspect && (
                                                      <Badge className="ml-2 bg-yellow-500/20 text-yellow-300 text-xs border-yellow-500/30">
                                                        {player.prospectData && getProspectGrade(player.prospectData)}
                                                      </Badge>
                                                    )}
                                                    {!player.isProspect && player.fantasy_ppg && (
                                                      <Badge className="ml-2 bg-green-500/20 text-green-300 text-xs border border-green-500/30 font-mono">
                                                        {player.fantasy_ppg.toFixed(1)} PPG
                                                      </Badge>
                                                    )}
                                                  </div>
                                                  <div className="text-gray-400 text-xs">
                                                    {player.isProspect ? (
                                                      <>
                                                        {player.prospectData?.school} • Rank #{player.prospectData?.rank} • 2026 Prospect
                                                      </>
                                                    ) : (
                                                      <>
                                                        {player.team} • Age {player.age}
                                                        {player.search_rank && ` • Rank #${player.search_rank}`}
                                                        {player.games_played && ` • ${player.games_played} GP`}
                                                      </>
                                                    )}
                                                  </div>
                                                </div>
                                              </div>
                                              <div className="text-right">
                                                <div className="text-blue-400 text-sm font-bold">{player.value}</div>
                                                <div className="text-gray-400 text-xs">Value</div>
                                              </div>
                                            </div>
                                          </CardContent>
                                        </Card>
                                      ))}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Team Stats Summary */}
                      <div>
                        <Card className="bg-gradient-to-br from-slate-700 to-slate-800 border-slate-600">
                          <CardHeader>
                            <CardTitle className="text-white text-sm flex items-center">
                              <Users className="h-4 w-4 mr-2" />
                              Team Summary
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {/* Total Value */}
                            <div className="bg-slate-600/50 p-4 rounded-lg">
                              <div className="text-slate-400 text-xs mb-1">Total Roster Value</div>
                              <div className="text-3xl font-bold text-blue-400 font-mono">
                                {roster.reduce((sum, p) => sum + p.value, 0).toFixed(0)}
                              </div>
                            </div>

                            {/* Age Stats */}
                            <div className="bg-slate-600/50 p-4 rounded-lg">
                              <div className="text-slate-400 text-xs mb-1">Average Age</div>
                              <div className="text-2xl font-bold text-white font-mono">
                                {(roster.reduce((sum, p) => sum + p.age, 0) / roster.length || 0).toFixed(1)}
                              </div>
                            </div>

                            {/* College Prospect Impact */}
                            <div className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-lg">
                              <div className="text-yellow-400 text-xs mb-2 flex items-center">
                                <Star className="h-3 w-3 mr-1" />
                                College Prospect Impact
                              </div>
                              <div className="text-xl font-bold text-yellow-300 font-mono">
                                {roster.filter((p) => p.isProspect).length} Prospects
                              </div>
                              <div className="text-xs text-yellow-400/70 mt-1">
                                {((roster.filter((p) => p.isProspect).length / roster.length) * 100).toFixed(0)}% of roster
                              </div>
                            </div>

                            {/* Position Breakdown */}
                            <div>
                              <div className="text-slate-400 text-xs mb-2">Position Distribution</div>
                              <div className="space-y-2">
                                {["QB", "RB", "WR", "TE"].map((pos) => {
                                  const count = roster.filter((p) => p.position === pos).length
                                  const percentage = (count / roster.length) * 100
                                  return (
                                    <div key={pos}>
                                      <div className="flex items-center justify-between text-xs mb-1">
                                        <span className="text-slate-300">{pos}</span>
                                        <span className="text-slate-400">{count} ({percentage.toFixed(0)}%)</span>
                                      </div>
                                      <div className="h-1.5 bg-slate-600 rounded-full overflow-hidden">
                                        <div 
                                          className="h-full bg-blue-500 rounded-full transition-all"
                                          style={{ width: `${percentage}%` }}
                                        />
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Draft Board Tab */}
            <TabsContent value="draftboard" className="mt-6">
              <div className="relative">
                <Card className="bg-slate-800 border border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center justify-between">
                      <span>Custom Draft Board</span>
                      <div className="flex items-center space-x-2">
                        <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 font-mono">
                          {draftBoard.length} Prospects
                        </Badge>
                        {draftBoard.length > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleClearDraftBoard}
                            className="border-red-400 text-red-400 hover:bg-red-400/10"
                          >
                            Clear Board
                          </Button>
                        )}
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Available Prospects */}
                      <div className="lg:col-span-1">
                        <h3 className="text-white font-semibold mb-4 flex items-center">
                          <School className="h-5 w-5 mr-2 text-yellow-400" />
                          Add Prospects
                        </h3>
                        <div className="mb-4 space-y-2">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                              placeholder="Search prospects..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="pl-10 bg-slate-700 border-slate-600 text-white"
                            />
                          </div>
                          <Select value={positionFilter} onValueChange={setPositionFilter}>
                            <SelectTrigger className="w-full bg-slate-700 border-slate-600">
                              <SelectValue placeholder="Position" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-700 border-slate-600">
                              <SelectItem value="all">All Positions</SelectItem>
                              <SelectItem value="QB">QB</SelectItem>
                              <SelectItem value="RB">RB</SelectItem>
                              <SelectItem value="WR">WR</SelectItem>
                              <SelectItem value="TE">TE</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2 max-h-[700px] overflow-y-auto">
                          {loading ? (
                            <div className="text-center py-8">
                              <div className="w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                              <p className="text-gray-400">Loading...</p>
                            </div>
                          ) : (
                            filteredProspects.slice(0, 50).map((prospect) => {
                              const isOnBoard = draftBoard.some((p) => p.rank === prospect.rank)
                              return (
                                <Card
                                  key={prospect.rank}
                                  className={`${
                                    isOnBoard
                                      ? "bg-slate-600 border-blue-400 opacity-50"
                                      : "bg-slate-700 border-slate-600 hover:border-yellow-400"
                                  } transition-all cursor-pointer`}
                                  onClick={() => !isOnBoard && handleAddToDraftBoard(prospect)}
                                >
                                  <CardContent className="p-3">
                                    <div className="flex items-center justify-between mb-1">
                                      <Badge className="bg-slate-500/30 text-slate-200 text-xs">
                                        {prospect.position}
                                      </Badge>
                                      <Badge className="bg-yellow-500/20 text-yellow-300 text-xs border-yellow-500/30">
                                        #{prospect.rank}
                                      </Badge>
                                    </div>
                                    <div className="text-white font-semibold text-sm">{prospect.name}</div>
                                    <div className="text-gray-400 text-xs">{prospect.school}</div>
                                    {isOnBoard && (
                                      <div className="text-blue-400 text-xs mt-1">✓ On Board</div>
                                    )}
                                  </CardContent>
                                </Card>
                              )
                            })
                          )}
                        </div>
                      </div>

                      {/* Draft Board */}
                      <div className="lg:col-span-2">
                        <h3 className="text-white font-semibold mb-4 flex items-center">
                          <TrendingUp className="h-5 w-5 mr-2 text-blue-400" />
                          Your Personal Rankings
                        </h3>
                        <p className="text-sm text-slate-400 mb-4">
                          Drag prospects to reorder your board. Click the X to remove.
                        </p>

                        {draftBoard.length === 0 ? (
                          <Card className="bg-slate-700 border-2 border-dashed border-slate-600">
                            <CardContent className="p-12 text-center">
                              <TrendingUp className="h-16 w-16 text-slate-500 mx-auto mb-4" />
                              <p className="text-slate-400 mb-2 text-lg">Your draft board is empty</p>
                              <p className="text-slate-500 text-sm">
                                Click on prospects from the left to add them to your custom board
                              </p>
                            </CardContent>
                          </Card>
                        ) : (
                          <div className="space-y-2">
                            {draftBoard.map((prospect, index) => (
                              <Card
                                key={prospect.rank}
                                className="bg-slate-700 border border-slate-600 hover:border-blue-400 transition-all cursor-move"
                                draggable
                                onDragStart={(e) => handleBoardDragStart(e, prospect, index)}
                                onDragOver={(e) => handleBoardDragOver(e, index)}
                                onDrop={(e) => handleBoardDrop(e, index)}
                              >
                                <CardContent className="p-4">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-4">
                                      <div className="flex items-center space-x-2">
                                        <GripVertical className="h-5 w-5 text-gray-400" />
                                        <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-lg font-bold w-12 justify-center">
                                          {index + 1}
                                        </Badge>
                                      </div>
                                      <div>
                                        <div className="flex items-center space-x-2 mb-1">
                                          <div className="text-white font-bold text-lg">{prospect.name}</div>
                                          <Badge className="bg-slate-500/30 text-slate-200">
                                            {prospect.position}
                                          </Badge>
                                          <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
                                            {getProspectGrade(prospect)}
                                          </Badge>
                                          <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                                            {getProspectTier(prospect.rank)}
                                          </Badge>
                                        </div>
                                        <div className="text-gray-400 text-sm">
                                          {prospect.school} • Consensus Rank #{prospect.rank} • Value:{" "}
                                          {calculateProspectValue(prospect.rank, prospect.position)}
                                        </div>
                                      </div>
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleRemoveFromDraftBoard(prospect.rank)}
                                      className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>

          {/* Prospect Detail Modal */}
          {selectedProspect && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <Card className="bg-slate-800 border-slate-700 w-full max-w-2xl mx-4">
                <CardHeader>
                  <CardTitle className="text-white flex items-center justify-between">
                    <span>{selectedProspect.name}</span>
                    <Button variant="ghost" onClick={handleCloseModal}>
                      <X className="h-4 w-4" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                      <Badge
                        className={`${getPositionColor(selectedProspect.position)}/30 text-slate-200 border border-slate-500/30`}
                      >
                        {getProspectGrade(selectedProspect)}
                      </Badge>
                      <Badge variant="outline" className="text-blue-400 border-blue-400/50">
                        {getDraftPick(selectedProspect)}
                      </Badge>
                      <Badge variant="outline" className="text-green-400 border-green-400/50">
                        {getProspectTier(selectedProspect.rank)}
                      </Badge>
                      <Badge variant="outline" className="text-gray-400">
                        {selectedProspect.school}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-700 rounded-lg p-4">
                        <h4 className="text-white font-semibold mb-2">Dynasty Valuation</h4>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400">Dynasty Value</span>
                            <span className="text-blue-400 font-bold">
                              {calculateProspectValue(selectedProspect.rank, selectedProspect.position)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400">Rank</span>
                            <span className="text-blue-400 font-bold">#{selectedProspect.rank}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400">Tier</span>
                            <span className="text-green-400">{getProspectTier(selectedProspect.rank)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-slate-700 rounded-lg p-4">
                        <h4 className="text-white font-semibold mb-2">Scouting Grade</h4>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400">Overall</span>
                            <span className="text-blue-400 font-bold">8.5</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400">Athleticism</span>
                            <span className="text-green-400">9.0</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400">Production</span>
                            <span className="text-blue-400">7.8</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-700 rounded-lg p-4">
                        <h4 className="text-white font-semibold mb-2">Roster Fit</h4>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400">Position Need</span>
                            <Badge
                              className={
                                positionNeeds[selectedProspect.position] > 0
                                  ? "bg-red-500/20 text-red-300 border border-red-500/30"
                                  : "bg-green-500/20 text-green-300 border border-green-500/30"
                              }
                            >
                              {positionNeeds[selectedProspect.position] > 0 ? "High" : "Low"}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400">Age Fit</span>
                            <span className="text-green-400">Excellent</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-slate-700 rounded-lg p-4">
                        <h4 className="text-white font-semibold mb-2">Draft Projection</h4>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400">Projected Round</span>
                            <span className="text-purple-400 font-bold">{getDraftPick(selectedProspect)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400">Position Rank</span>
                            <span className="text-blue-400">#{selectedProspect.rank}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <Button className="bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 border border-blue-500/30 flex-1">
                        Add to Draft Board
                      </Button>
                      <Button
                        variant="outline"
                        className="border-slate-600 text-gray-300 hover:border-blue-400 bg-transparent"
                      >
                        Compare to Roster
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {selectedProspectForComps && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <Card className="bg-slate-800 border-slate-700 w-full max-w-2xl mx-4">
                <CardHeader>
                  <CardTitle className="text-white flex items-center justify-between">
                    <span> {selectedProspectForComps.name}</span>
                    <Button
                      variant="ghost"
                      onClick={handleCloseCompsModal}
                      className="hover:bg-red-500 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Prospect Header */}
                    <div className="flex items-center space-x-4">
                      <Badge
                        className={`${getPositionColor(selectedProspectForComps.position)}/30 text-slate-200 border border-slate-500/30`}
                      >
                        {selectedProspectForComps.position}
                      </Badge>
                      <Badge className={`${getTierColor(getProspectTier(selectedProspectForComps.rank))}`}>
                        {getProspectTier(selectedProspectForComps.rank)}
                      </Badge>
                      <span className="text-gray-400">{selectedProspectForComps.school}</span>
                    </div>

                    {/* Hit Rate Analysis */}
                    {(() => {
                      const tier = getProspectTier(selectedProspectForComps.rank)
                      const position = selectedProspectForComps.position
                      const hitRate = hitRateData[position]?.[tier]

                      if (!hitRate) return null

                      return (
                        <div className="bg-slate-700 rounded-lg p-4">
                          <h4 className="text-white font-semibold mb-3">Hit Rate Analysis:</h4>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-gray-400">Elite:</span>
                                <span className="text-yellow-400 font-semibold">{hitRate.elite}%</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Tier 1:</span>
                                <span className="text-blue-400 font-semibold">{hitRate.tier1}%</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Tier 2:</span>
                                <span className="text-green-400 font-semibold">{hitRate.tier2}%</span>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-gray-400">Startable:</span>
                                <span className="text-orange-400 font-semibold">{hitRate.startable}%</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Streamer:</span>
                                <span className="text-slate-400 font-semibold">{hitRate.streamer}%</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Tier 1+:</span>
                                <span className="text-yellow-400 font-bold">{hitRate.elite + hitRate.tier1}%</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })()}

                    {/* NFL Comparisons */}
                    <div className="bg-slate-700 rounded-lg p-4">
                      <h4 className="text-white font-semibold mb-3">NFL Comparisons:</h4>
                      <div className="space-y-2">
                        {(() => {
                          const position = selectedProspectForComps.position
                          const tier = getProspectTier(selectedProspectForComps.rank)

                          // Mock NFL comps based on position and tier
                          const comps: Record<
                            string,
                            Record<string, Array<{ name: string; similarity: number; outcome: string }>>
                          > = {
                            QB: {
                              "Elite Prospect": [
                                { name: "Patrick Mahomes", similarity: 85, outcome: "hit" },
                                { name: "Josh Allen", similarity: 82, outcome: "hit" },
                                { name: "Justin Herbert", similarity: 78, outcome: "hit" },
                              ],
                              "First Round": [
                                { name: "Baker Mayfield", similarity: 72, outcome: "miss" },
                                { name: "Sam Darnold", similarity: 68, outcome: "bust" },
                              ],
                            },
                            RB: {
                              "Elite Prospect": [
                                { name: "Christian McCaffrey", similarity: 88, outcome: "hit" },
                                { name: "Saquon Barkley", similarity: 85, outcome: "hit" },
                              ],
                              "First Round": [
                                { name: "Clyde Edwards-Helaire", similarity: 75, outcome: "miss" },
                                { name: "Rashaad Penny", similarity: 70, outcome: "bust" },
                              ],
                            },
                            WR: {
                              "Elite Prospect": [
                                { name: "Justin Jefferson", similarity: 90, outcome: "hit" },
                                { name: "Ja'Marr Chase", similarity: 87, outcome: "hit" },
                              ],
                              "First Round": [
                                { name: "Henry Ruggs", similarity: 73, outcome: "bust" },
                                { name: "Jalen Reagor", similarity: 68, outcome: "bust" },
                              ],
                            },
                            TE: {
                              "Elite Prospect": [
                                { name: "Kyle Pitts", similarity: 82, outcome: "hit" },
                                { name: "T.J. Hockenson", similarity: 78, outcome: "hit" },
                              ],
                              "First Round": [
                                { name: "Noah Fant", similarity: 75, outcome: "miss" },
                                { name: "O.J. Howard", similarity: 70, outcome: "bust" },
                              ],
                            },
                          }

                          const positionComps = comps[position]?.[tier] || comps[position]?.["First Round"] || []

                          return positionComps.map(
                            (comp: { name: string; similarity: number; outcome: string }, index: number) => (
                              <div key={index} className="flex items-center justify-between p-2 bg-slate-600 rounded">
                                <span className="text-white font-medium">{comp.name}</span>
                                <div className="flex items-center space-x-2">
                                  <span className="text-gray-400 text-sm">{comp.similarity}% similar</span>
                                  <Badge
                                    className={
                                      comp.outcome === "hit"
                                        ? "bg-green-400/20 text-green-400"
                                        : comp.outcome === "miss"
                                          ? "bg-yellow-400/20 text-yellow-400"
                                          : "bg-red-400/20 text-red-400"
                                    }
                                  >
                                    {comp.outcome}
                                  </Badge>
                                </div>
                              </div>
                            ),
                          )
                        })()}
                      </div>
                    </div>

                    {/* Close Button */}
                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        className="border-slate-600 text-gray-300 hover:bg-red-500 hover:border-red-500 hover:text-white bg-transparent"
                        onClick={handleCloseCompsModal}
                      >
                        Close
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

function ScoutingPortalWrapper() {
  const searchParams = useSearchParams()
  const leagueId = searchParams.get("leagueId") || ""

  return <ScoutingPortalContent leagueId={leagueId} />
}

export default function ScoutingPortalPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-900">
          <Header />
          <main className="w-full px-4 py-8">
            <div className="max-w-4xl mx-auto text-center">
              <div className="w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-white">Loading scouting portal...</p>
            </div>
          </main>
        </div>
      }
    >
      <ScoutingPortalWrapper />
    </Suspense>
  )
}
