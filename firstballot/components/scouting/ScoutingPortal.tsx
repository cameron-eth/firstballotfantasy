'use client'

import type React from 'react'
import { useState, useEffect, useCallback, useMemo } from 'react'
import useSWR from 'swr'
import { Header } from '@/components/header'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Eye, TrendingUp, BarChart3, ChartScatter } from 'lucide-react'
import { HitsMissesTab } from './HitsMissesTab'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ProspectsTab,
  DraftBoardTab,
  ProspectDetailModal,
  ComparisonsModal,
  HistoricalRankingsTab,
} from '@/components/scouting'
import type { Prospect } from '@/components/scouting/types'
import { useDraftboard } from '@/hooks/use-draftboard'
import { boardsToProspects, yearsToSave } from '@/lib/draftboard-classes'
import { useProspectGrades } from '@/hooks/use-prospect-grades'
import { useAuth } from '@/lib/auth'
import { normalizeScoutingGradeTier } from '@/lib/scouting-grade-tier'
import { sortProspectsForBrowse } from './sortProspectsForBrowse'
import { DRAFT_BOARD_MIN_YEAR } from './board-player'

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
  initialTab?: string
}
const PORTAL_TABS = ['prospects', 'draftboard', 'historical', 'hits'] as const
type PortalTab = (typeof PORTAL_TABS)[number]

/** Guards against stale deep links (e.g. the retired `?tab=alltime`). */
function resolveTab(tab: string | null | undefined): PortalTab {
  return PORTAL_TABS.includes(tab as PortalTab) ? (tab as PortalTab) : 'prospects'
}
// Module-level pure function — no component state needed
function calculatePlayerValue(rank: number, position?: string): number {
  if (!rank || rank <= 0 || rank > 1000) return 1

  let baseValue: number
  let tierFloor: number
  let k: number
  let tierStart: number

  if (rank <= 10) {
    baseValue = 120; tierFloor = 88; k = 0.08; tierStart = 1
  } else if (rank <= 30) {
    baseValue = 88; tierFloor = 60; k = 0.05; tierStart = 11
  } else if (rank <= 80) {
    baseValue = 60; tierFloor = 21; k = 0.03; tierStart = 31
  } else if (rank <= 200) {
    baseValue = 21; tierFloor = 15; k = 0.01; tierStart = 81
  } else {
    return 15
  }
  let value = baseValue * Math.exp(-k * (rank - tierStart)) + tierFloor

  if (position) {
    const positionMultipliers: Record<string, number> = { QB: 1.3, RB: 0.9, WR: 1.0, TE: 1.1 }
    value *= positionMultipliers[position] || 1.0
  }
  return Math.round(value * 100) / 100
}
function getProspectGradeValue(prospect: Prospect): string {
  const grade = prospect.overall_grade ?? 0
  return !prospect.grade_tier && grade <= 0
    ? 'Ungraded'
    : normalizeScoutingGradeTier(prospect.grade_tier, grade)
}

async function fetchRosterWithStats(leagueId: string): Promise<RosterPlayer[]> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Please log in to view your roster')

  const response = await fetch(`/api/league-roster?leagueId=${leagueId}`, {
    headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || 'Failed to fetch your roster')
  }

  const data = await response.json()
  const allSleeperPlayerIds = data.roster.map((p: any) => p.player_id).filter(Boolean)
  const rosterStatsMap: Record<string, { fantasy_ppg: number; total_fantasy_points: number; games_played: number }> = {}

  if (allSleeperPlayerIds.length > 0) {
    try {
      const statsResponse = await fetch(`/api/roster-stats?player_ids=${allSleeperPlayerIds.join(',')}`, { cache: 'no-store' })
      if (statsResponse.ok) {
        const result = await statsResponse.json()
        result.data.forEach((playerStats: any) => {
          rosterStatsMap[playerStats.sleeper_player_id] = {
            fantasy_ppg: parseFloat(playerStats.fantasy_ppg) || 0,
            total_fantasy_points: parseFloat(playerStats.total_fantasy_points) || 0,
            games_played: playerStats.games_played || 0,
          }
        })
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err)
    }
  }

  return data.roster.map((player: any) => {
    const stats = rosterStatsMap[player.player_id] || {}
    return {
      id: player.player_id,
      name: `${player.first_name} ${player.last_name}`,
      position: player.position,
      team: player.team,
      age: player.age || 25,
      experience: player.years_exp || 3,
      value: calculatePlayerValue(player.search_rank || 100, player.position),
      sleeper_id: player.player_id,
      search_rank: player.search_rank,
      fantasy_pos_rank: player.fantasy_pos_rank,
      injury_status: player.injury_status,
      fantasy_ppg: (stats as any).fantasy_ppg,
      games_played: (stats as any).games_played,
    }
  })
}

export function ScoutingPortal({ leagueId, initialTab }: ScoutingPortalProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlTab = searchParams.get('tab')

  const [roster, setRoster] = useState<RosterPlayer[]>([])
  const [noteSaveError, setNoteSaveError] = useState<string | null>(null)
  const [noteSaveStatus, setNoteSaveStatus] = useState<string | null>(null)
  const { user } = useAuth()
  const { data: savedNotes, error: notesFetchError, mutate: refreshNotes } = useSWR<{ notes: { prospect_id: number; notes: string }[]; available?: boolean }>(
    user ? `/api/scouting-notes?account=${encodeURIComponent(user.id)}` : null,
    async (url: string) => {
      const response = await fetch(url)
      if (!response.ok) throw new Error('Could not load scouting notes')
      return response.json()
    }
  )

  // Fetch roster via useSWR — avoids fetch-in-effect pattern
  const {
    data: fetchedRoster,
    error: rosterFetchError,
  } = useSWR<RosterPlayer[]>(
    leagueId ? `roster:${leagueId}` : null,
    (key: string) => fetchRosterWithStats(key.split(':')[1])
  )
  const rosterError: string | null = rosterFetchError?.message ?? null

  const [syncedRosterKey, setSyncedRosterKey] = useState<string | null>(null)
  useEffect(() => {
    if (!fetchedRoster || syncedRosterKey === leagueId) return
    setSyncedRosterKey(leagueId)
    setRoster(fetchedRoster)
  }, [fetchedRoster, leagueId, syncedRosterKey])

  const {
    data: rawProspects = [],
    isLoading: prospectsLoading,
    error: prospectsFetchError,
  } = useSWR<Prospect[]>(
    '/api/prospects?draft_year=all',
    async (url: string) => {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error('Failed to fetch prospects')
      }
      return response.json()
    }
  )
  // The public prospect catalog must remain usable while a linked league is
  // loading or unavailable. Roster data only enriches team needs.
  const loading = prospectsLoading
  const prospectsError: string | null = prospectsFetchError?.message ?? null
  const [searchTerm, setSearchTerm] = useState('')
  const [positionFilter, setPositionFilter] = useState(() => ['QB', 'RB', 'WR', 'TE'].includes(searchParams.get('position') || '') ? searchParams.get('position')! : 'all')
  const [draftYear, setDraftYear] = useState(() => /^20\d{2}$/.test(searchParams.get('year') || '') ? searchParams.get('year')! : 'all')
  const [activeTab, setActiveTab] = useState(() =>
    resolveTab(urlTab || initialTab)
  )
  const changeTab = useCallback((nextTab: PortalTab) => {
    setActiveTab(nextTab)
    const params = new URLSearchParams(searchParams.toString())
    if (nextTab === 'prospects') params.delete('tab')
    else params.set('tab', nextTab)
    router.replace(`/scouting-portal${params.size ? `?${params.toString()}` : ''}`, { scroll: false })
  }, [router, searchParams])
  const savedNotesByProspectId = useMemo(
    () => new Map((savedNotes?.notes ?? []).map((note) => [note.prospect_id, note.notes])),
    [savedNotes]
  )
  const prospects = useMemo<Prospect[]>(
    () =>
      rawProspects.map((prospect) => ({
        ...prospect,
        grade: getProspectGradeValue(prospect),
        notes: savedNotesByProspectId.get(prospect.id) ?? prospect.notes ?? '',
      })),
    [rawProspects, savedNotesByProspectId]
  )

  useEffect(() => {
    if (!urlTab) return
    const next = resolveTab(urlTab)
    setActiveTab((current) => (current === next ? current : next))
  }, [urlTab])
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null)
  const [selectedProspectForComps, setSelectedProspectForComps] = useState<Prospect | null>(null)
  const [draftBoard, setDraftBoard] = useState<Prospect[]>([])
  const [draggedBoardProspect, setDraggedBoardProspect] = useState<{
    prospect: Prospect
    index: number
  } | null>(null)

  // Draftboard persistence
  const { savedBoards, loading: boardsLoading, saving: savingBoard, error: boardError, saveBoard } = useDraftboard()
  const boardYears = useMemo(() => [...new Set(prospects.filter((p) => (p.draft_year ?? 0) >= DRAFT_BOARD_MIN_YEAR).map((p) => p.draft_year as number))].sort(), [prospects])
  const [selectedBoardYear, setSelectedBoardYear] = useState<number | null>(null)
  const activeBoardYear = selectedBoardYear && boardYears.includes(selectedBoardYear) ? selectedBoardYear : boardYears[0] ?? DRAFT_BOARD_MIN_YEAR
  const savedBoard = savedBoards.find((board) => board.draft_year === activeBoardYear)
  const [initialBoardLoaded, setInitialBoardLoaded] = useState(false)
  useEffect(() => { setInitialBoardLoaded(false); setDraftBoard([]) }, [user?.id])

  // The user's own film/talent grades. Saved per cell as they are entered,
  // separate from the board's explicit Save button.
  const {
    gradesByProspectId,
    saveError: gradeSaveError,
    dismissSaveError: dismissGradeError,
    setGrade,
  } = useProspectGrades()

  // Derived — no useEffect needed; recomputes whenever draftBoard or savedBoard changes
  const hasUnsavedChanges = useMemo(() => {
    if (!initialBoardLoaded) return false
    const currentIds = draftBoard.filter((p) => p.draft_year === activeBoardYear).map((p) => p.id)
    const savedIds = savedBoard?.prospect_ids ?? []
    return (
      currentIds.length !== savedIds.length ||
      currentIds.some((id, idx) => id !== savedIds[idx])
    )
  }, [draftBoard, savedBoard, initialBoardLoaded, activeBoardYear])

  // Memoized expensive computations
  const positionNeeds = useMemo(() => {
    if (!leagueId || !fetchedRoster?.length || rosterError) return {}

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
  }, [roster, leagueId, fetchedRoster, rosterError])

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

    if (draftYear !== 'all') {
      const year = Number(draftYear)
      filtered = filtered.filter((prospect) => prospect.draft_year === year)
    }

    return sortProspectsForBrowse(filtered)
  }, [prospects, searchTerm, positionFilter, draftYear])

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
    return getProspectGradeValue(prospect)
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

  const getDraftPick = useCallback((prospect: Prospect): string => {
    const round = prospect.projectedRound || 'UDFA'
    if (round === 'UDFA') return 'UDFA'
    return `${round}`
  }, [])



  const handleProspectSelect = useCallback((prospect: Prospect) => {
    setNoteSaveStatus(null)
    setNoteSaveError(null)
    setSelectedProspect(prospect)
  }, [])

  const handleShowComps = useCallback((prospect: Prospect) => {
    setSelectedProspectForComps(prospect)
  }, [])

  const handleCloseModal = useCallback(() => {
    setSelectedProspect(null)
  }, [])

  const handleCloseCompsModal = useCallback(() => {
    setSelectedProspectForComps(null)
  }, [])

  const handleSaveNotes = useCallback(async (id: number, notes: string) => {
    setNoteSaveError(null)
    setNoteSaveStatus('Saving…')
    try {
      const response = await fetch('/api/scouting-notes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospect_id: id, notes }),
      })
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || 'Could not save note. Please try again.')
      setSelectedProspect((prev) => (prev?.id === id ? { ...prev, notes } : prev))
      await refreshNotes()
      setNoteSaveStatus('Saved to your account')
    } catch (error) {
      setNoteSaveStatus(null)
      setNoteSaveError(error instanceof Error ? error.message : 'Could not save note')
    }
  }, [refreshNotes])
  // Draft Board handlers
  const handleAddToDraftBoard = useCallback((prospect: Prospect) => {
    if (!prospect?.id) {
      return
    }
    if (prospect.draft_year && prospect.draft_year >= DRAFT_BOARD_MIN_YEAR) setSelectedBoardYear(prospect.draft_year)
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

  const handleReorderDraftBoard = useCallback((nextBoard: Prospect[]) => {
    setDraftBoard(nextBoard)
  }, [])

  const handleBoardDragStart = useCallback(
    (e: React.DragEvent, prospect: Prospect, index: number) => {
      setDraggedBoardProspect({ prospect, index })
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData('text/plain', String(prospect.id))
    },
    []
  )

  const handleBoardDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const handleBoardDrop = useCallback(
    (e: React.DragEvent, dropIndex: number) => {
      e.preventDefault()

      if (draggedBoardProspect) {
        setDraftBoard((prev) => {
          const dragIndex = prev.findIndex((p) => p.id === draggedBoardProspect.prospect.id)
          if (
            dragIndex < 0 ||
            dropIndex < 0 ||
            dropIndex >= prev.length ||
            dragIndex === dropIndex
          ) {
            return prev
          }

          // True drag-swap behavior: exchange two rows instead of insert/shift.
          const newBoard = [...prev]
          const temp = newBoard[dragIndex]
          newBoard[dragIndex] = newBoard[dropIndex]
          newBoard[dropIndex] = temp
          return newBoard
        })

        setDraggedBoardProspect(null)
      }
    },
    [draggedBoardProspect]
  )

  // Save draft board to database
  const handleSaveBoard = useCallback(async () => {
    // Save later classes before replacing a legacy mixed-class board.
    const classes = yearsToSave(savedBoards, prospects, boardYears, activeBoardYear)
    for (const year of classes) {
      const ids = draftBoard.filter((p) => p.draft_year === year).map((p) => p.id)
      if (ids.length > 0 || savedBoards.some((board) => board.draft_year === year)) {
        const result = await saveBoard(year, ids)
        if (!result) return false
      }
    }
    return true
  }, [draftBoard, saveBoard, activeBoardYear, savedBoards, prospects, boardYears])

  useEffect(() => {
    if (boardsLoading || prospects.length === 0 || initialBoardLoaded) return
    const loadedProspects = boardsToProspects(savedBoards, prospects)
    if (loadedProspects.length > 0) setDraftBoard(loadedProspects)
    setInitialBoardLoaded(true)
  }, [savedBoards, prospects, initialBoardLoaded, boardsLoading])

  // `overflow-x-clip` rather than `-hidden` below: hidden turns these wrappers
  // into scroll containers, which makes the app header and the in-page filter
  // bars stick to the wrapper instead of the viewport — i.e. not stick at all.
  return (
    <div className="min-h-screen fb-app-surface text-foreground overflow-x-clip">
      <Header />

      <main className="w-full px-3 py-3 md:px-4 md:py-4 overflow-x-clip max-md:pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]">
        <div className="max-w-[1800px] mx-auto">
          {prospectsError && (
            <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {prospectsError}
            </div>
          )}
          {rosterError && <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">Team needs could not load. Prospect scouting is still available.</div>}
          {boardError && <div role="alert" className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">Draft board: {boardError}</div>}
          {noteSaveError && <div role="alert" className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{noteSaveError}</div>}
          {notesFetchError && <div role="alert" className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">Saved scouting notes could not be loaded.</div>}
          {savedNotes?.available === false && <div role="status" className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">Personal scouting notes are temporarily unavailable. Your draft boards and grades still work.</div>}
          <Tabs
            value={activeTab}
            onValueChange={(value) => changeTab(resolveTab(value))}
            className="w-full"
          >
            <div className="mb-3 md:mb-4 shrink-0">
              <TabsList className="flex h-auto w-full justify-start gap-1 overflow-x-auto rounded-xl border border-white/10 bg-slate-900/60 p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:inline-flex md:w-auto">
                <TabsTrigger
                  value="prospects"
                  className="shrink-0 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 sm:px-4 transition-colors hover:text-white data-[state=active]:bg-blue-400/20 data-[state=active]:text-white data-[state=active]:shadow-sm"
                >
                  <div className="flex items-center justify-center gap-2">
                    <Eye className="h-4 w-4" aria-hidden="true" />
                    <span className="truncate">Prospects</span>
                  </div>
                </TabsTrigger>
                <TabsTrigger
                  value="draftboard"
                  className="shrink-0 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 sm:px-4 transition-colors hover:text-white data-[state=active]:bg-blue-400/20 data-[state=active]:text-white data-[state=active]:shadow-sm"
                >
                  <div className="flex items-center justify-center gap-2">
                    <TrendingUp className="h-4 w-4" aria-hidden="true" />
                    <span className="truncate">Draft board</span>
                  </div>
                </TabsTrigger>
                <TabsTrigger
                  value="historical"
                  className="shrink-0 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 sm:px-4 transition-colors hover:text-white data-[state=active]:bg-blue-400/20 data-[state=active]:text-white data-[state=active]:shadow-sm"
                >
                  <div className="flex items-center justify-center gap-2">
                    <BarChart3 className="h-4 w-4" aria-hidden="true" />
                    <span className="truncate">History</span>
                  </div>
                </TabsTrigger>
                <TabsTrigger
                  value="hits"
                  className="shrink-0 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 sm:px-4 transition-colors hover:text-white data-[state=active]:bg-blue-400/20 data-[state=active]:text-white data-[state=active]:shadow-sm"
                >
                  <div className="flex items-center justify-center gap-2">
                    <ChartScatter className="h-4 w-4" aria-hidden="true" />
                    <span className="truncate">Hits & misses</span>
                  </div>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Prospects Tab */}
            <TabsContent
              value="prospects"
              className="mt-3 !bg-transparent [&>*]:bg-transparent"
              style={{ background: 'transparent' }}
            >
              <ProspectsTab
                loading={loading}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                positionFilter={positionFilter}
                setPositionFilter={setPositionFilter}
                draftYear={draftYear}
                setDraftYear={setDraftYear}
                filteredProspects={filteredProspects}
                allProspects={prospects}
                draftBoard={draftBoard}
                onProspectSelect={handleProspectSelect}
                onShowComps={handleShowComps}
                isDiamondTier={isProspectDiamondTier}
                positionNeeds={positionNeeds}
              />
            </TabsContent>

            <TabsContent value="draftboard" className="mt-3">
              <DraftBoardTab
                loading={loading}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                positionFilter={positionFilter}
                setPositionFilter={setPositionFilter}
                allProspects={prospects}
                draftBoard={draftBoard}
                selectedYear={activeBoardYear}
                onSelectYear={setSelectedBoardYear}
                onAddToDraftBoard={handleAddToDraftBoard}
                onRemoveFromDraftBoard={handleRemoveFromDraftBoard}
                onShowComps={handleShowComps}
                onReorderDraftBoard={handleReorderDraftBoard}
                onBoardDragStart={handleBoardDragStart}
                onBoardDragOver={handleBoardDragOver}
                onBoardDrop={handleBoardDrop}
                // Persistence props
                hasSavedBoard={!!savedBoard}
                savingBoard={savingBoard}
                hasUnsavedChanges={hasUnsavedChanges}
                onSaveBoard={handleSaveBoard}
                isLoggedIn={!!user}
                // Per-user film/talent grades
                gradesByProspectId={gradesByProspectId}
                onSetGrade={setGrade}
                gradeSaveError={gradeSaveError}
                onDismissGradeError={dismissGradeError}
              />
            </TabsContent>

            <TabsContent value="historical" className="mt-3">
              <HistoricalRankingsTab />
            </TabsContent>
            <TabsContent value="hits" className="mt-3">
              <HitsMissesTab />
            </TabsContent>
          </Tabs>

          <ProspectDetailModal
            prospect={selectedProspect}
            hasTeamContext={Boolean(leagueId && fetchedRoster?.length && !rosterError)}
            isLoggedIn={Boolean(user)}
            noteSaveStatus={noteSaveStatus}
            noteSaveError={noteSaveError}
            notesAvailable={savedNotes?.available !== false}
            positionNeeds={positionNeeds}
            onClose={handleCloseModal}
            onAddToDraftBoard={() => {
              if (selectedProspect) {
                handleAddToDraftBoard(selectedProspect)
                handleCloseModal()
              }
            }}
            onSaveNotes={handleSaveNotes}
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
