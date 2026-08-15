'use client'

import type React from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, Reorder } from 'framer-motion'
import Image from 'next/image'
import useSWR from 'swr'
import { cn } from '@/lib/utils'
import {
  normalizeScoutingGradeTier,
  SCOUTING_DISPLAY_TIER_ORDER,
  SCOUTING_TIER_STYLES,
  type ScoutingDisplayTier,
} from '@/lib/scouting-grade-tier'
import {
  ChevronDown,
  ChevronUp,
  ClipboardList,
  GripVertical,
  Minus,
  Plus,
  Scale,
  Target,
  TrendingDown,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react'
import { DraftBoardControls } from './DraftBoardControls'
import { KtcSparkline } from './KtcSparkline'
import type { Prospect } from './types'
import { PlayerHeadshot } from '@/components/ui/player-headshot'
import { useBreakdownPanelOpen } from '@/hooks/use-breakdown-panel-open'

interface DraftBoardTabProps {
  loading: boolean
  searchTerm: string
  setSearchTerm: (term: string) => void
  positionFilter: string
  setPositionFilter: (filter: string) => void
  allProspects?: Prospect[]
  draftBoard: Prospect[]
  onAddToDraftBoard: (prospect: Prospect) => void
  onRemoveFromDraftBoard: (prospectId: number) => void
  onShowComps?: (prospect: Prospect) => void
  onReorderDraftBoard: (nextBoard: Prospect[]) => void
  onBoardDragStart: (e: React.DragEvent, prospect: Prospect, index: number) => void
  onBoardDragOver: (e: React.DragEvent, index: number) => void
  onBoardDrop: (e: React.DragEvent, index: number) => void
  onClearDraftBoard: () => void
  hasSavedBoard?: boolean
  savingBoard?: boolean
  hasUnsavedChanges?: boolean
  onSaveBoard?: () => Promise<void>
  isLoggedIn?: boolean
}

interface BoardPlayer {
  id: number
  rank: number
  name: string
  school: string
  position: string
  draftYear: number | null
  grade: number
  tier: string
  height: number | null
  weight: number
  fortyTime: number | null
  production: number
  physical: number
  espnId: string
  isCollege: boolean
  headshotUrl: string | null
}

interface CompAvatarMeta {
  headshotUrl?: string | null
  espnId?: number | string | null
}

const positionTabs = ['ALL', 'QB', 'RB', 'WR', 'TE'] as const
const BOARD_POSITIONS = ['QB', 'RB', 'WR', 'TE']
/** Earliest class the draft board will show — classes before this are history. */
const DRAFT_BOARD_MIN_YEAR = 2027
/** Rows rendered in the "not on board" list before the user has to search. */
const OFF_BOARD_VISIBLE_LIMIT = 40
const ReorderAny = Reorder as unknown as {
  Group: React.ComponentType<Record<string, unknown>>
  Item: React.ComponentType<Record<string, unknown>>
}

function getTierLabel(gradeTier: string | null, grade: number): string {
  return normalizeScoutingGradeTier(gradeTier, grade)
}

function tierStyleFor(
  tier: string
): (typeof SCOUTING_TIER_STYLES)[ScoutingDisplayTier] {
  return SCOUTING_TIER_STYLES[tier as ScoutingDisplayTier] ?? SCOUTING_TIER_STYLES.Depth
}

function parseForty(stats?: Record<string, number> | null): number | null {
  if (!stats) return null
  const raw = (stats as Record<string, number | string>).forty_time
  if (raw === undefined || raw === null || raw === '') return null
  const val = Number(raw)
  return Number.isFinite(val) ? val : null
}

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function splitComparisons(raw: string): string[] {
  if (raw.includes('), ')) {
    const parts = raw.split('), ')
    return parts.map((part, idx) => (idx < parts.length - 1 ? `${part})` : part))
  }
  return raw.split(', ')
}

function parseComparisonName(comp: string): string {
  const match = comp.match(/^(.+?)\s*\(/)
  if (match) return match[1].trim()
  return comp.trim()
}

function getComparisonNames(comparisons: string | null | undefined, max = 6): string[] {
  if (!comparisons) return []
  const names = splitComparisons(comparisons).map(parseComparisonName).filter(Boolean)
  return Array.from(new Set(names)).slice(0, max)
}

/** Board rows are ordered and labelled by class-overall rank, not position rank. */
function overallRankOf(p: Prospect): number {
  return Number(p.overall_rank || p.rank || 9999)
}

function toBoardPlayer(p: Prospect): BoardPlayer {
  return {
    id: p.id,
    rank: overallRankOf(p),
    name: p.name,
    school: p.school || 'TBD',
    position: p.position,
    draftYear: p.draft_year ?? null,
    grade: Number(p.overall_grade || 0),
    tier: getTierLabel(p.grade_tier, Number(p.overall_grade || 0)),
    height: p.height ? Number(p.height) : null,
    weight: Number(p.weight || 0),
    fortyTime: parseForty(p.college_stats || null),
    production: Math.round(Number(p.college_production_score || 0)),
    physical: Math.round(Number(p.physical_measurables_score || 0)),
    espnId: p.espn_id ? String(p.espn_id) : '',
    isCollege: (p.draft_year || 0) >= 2025,
    headshotUrl: p.headshot_url || null,
  }
}

function getPlayerImageUrl(player: BoardPlayer): string {
  if (player.headshotUrl) return player.headshotUrl
  if (!player.espnId) return ''
  const espnId = player.espnId.includes('.') ? player.espnId.split('.')[0] : player.espnId
  if (player.isCollege) {
    return `https://a.espncdn.com/i/headshots/college-football/players/full/${espnId}.png`
  }
  return `https://a.espncdn.com/i/headshots/nfl/players/full/${espnId}.png`
}


function calculateContrarianScore(userRanks: BoardPlayer[], consensusRanks: BoardPlayer[]): number {
  if (userRanks.length === 0) return 0
  let totalDiff = 0
  const consensusMap = new Map(consensusRanks.map((p, i) => [p.name, i + 1]))
  userRanks.forEach((player, userRank) => {
    const consensusRank = consensusMap.get(player.name) || userRank + 1
    totalDiff += Math.abs(userRank + 1 - consensusRank)
  })
  const maxPossibleDiff = (userRanks.length * userRanks.length) / 2
  return Math.min(100, Math.round((totalDiff / maxPossibleDiff) * 100))
}

function getContrarianLabel(score: number): { label: string; color: string } {
  if (score < 15) return { label: 'Consensus Builder', color: 'text-slate-400' }
  if (score < 30) return { label: 'Mild Contrarian', color: 'text-blue-400' }
  if (score < 50) return { label: 'Independent Thinker', color: 'text-emerald-400' }
  if (score < 70) return { label: 'Bold Ranker', color: 'text-amber-400' }
  return { label: 'Against the Grain', color: 'text-rose-400' }
}

function formatHeight(inches: number | null): string {
  if (!inches || inches <= 0) return '—'
  const ft = Math.floor(inches / 12)
  const inch = inches % 12
  return `${ft}'${inch}"`
}

/** Returns percentile 0–1 for value within a list. 1 = best. */
function rankPercentile(value: number, values: number[], lowerIsBetter = false): number {
  if (values.length < 2) return 0.5
  const better = values.filter((v) => (lowerIsBetter ? v > value : v < value)).length
  return better / (values.length - 1)
}

/** Maps a 0–1 percentile to background + text color for heat cells. */
function heatCell(pct: number): { bg: string; color: string } {
  if (pct >= 0.75) return { bg: 'rgba(16,185,129,0.18)', color: 'rgb(52,211,153)' }
  if (pct >= 0.50) return { bg: 'rgba(59,130,246,0.16)', color: 'rgb(96,165,250)' }
  if (pct >= 0.25) return { bg: 'rgba(245,158,11,0.16)', color: 'rgb(251,191,36)' }
  return { bg: 'rgba(239,68,68,0.16)', color: 'rgb(248,113,113)' }
}

export function DraftBoardTab({
  loading,
  searchTerm: _searchTerm,
  setSearchTerm: _setSearchTerm,
  positionFilter: _positionFilter,
  setPositionFilter: _setPositionFilter,
  allProspects = [],
  draftBoard,
  onAddToDraftBoard,
  onRemoveFromDraftBoard,
  onShowComps,
  onReorderDraftBoard,
  onBoardDragStart: _onBoardDragStart,
  onBoardDragOver: _onBoardDragOver,
  onBoardDrop: _onBoardDrop,
  onClearDraftBoard,
  hasSavedBoard = false,
  savingBoard = false,
  hasUnsavedChanges = false,
  onSaveBoard,
  isLoggedIn = false,
}: DraftBoardTabProps) {
  const [position, setPosition] = useState<(typeof positionTabs)[number]>('ALL')
  const { open: showBreakdown, toggle: toggleBreakdown } = useBreakdownPanelOpen()
  const [offBoardSearch, setOffBoardSearch] = useState('')
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set())
  const [draggingProspectId, setDraggingProspectId] = useState<number | null>(null)
  const seededYearRef = useRef<number | null>(null)

  // Bulk-fetch KTC history via SWR (automatic retry on error, revalidation)
  const ktcNamesKey = useMemo(() => {
    const names = draftBoard.map((p) => p.name).filter(Boolean)
    if (names.length === 0) return null
    return names.map(encodeURIComponent).join(',')
  }, [draftBoard])

  const { data: ktcBulkData } = useSWR<{
    historyMap?: Record<string, { scraped_date: string; value_sf: number; value_1qb: number }[]>
  }>(
    ktcNamesKey ? `/api/ktc-values?names=${ktcNamesKey}` : null,
    (url: string) =>
      fetch(url).then((r) => {
        if (!r.ok) throw new Error(`KTC fetch failed: ${r.status}`)
        return r.json()
      }),
    { revalidateOnFocus: false, errorRetryCount: 3 }
  )
  const ktcHistoryMap = ktcBulkData?.historyMap ?? {}

  const sortByRankThenGrade = (a: Prospect, b: Prospect) => {
    const rankA = overallRankOf(a)
    const rankB = overallRankOf(b)
    if (rankA !== rankB) return rankA - rankB
    return Number(b.overall_grade || 0) - Number(a.overall_grade || 0)
  }

  // The board is a forward-looking tool: only classes that have not been
  // drafted yet belong on it. Everything downstream (consensus, heat map,
  // class averages, the off-board pool) is scoped to this set.
  const allEligibleProspects = useMemo(() => {
    return allProspects
      .filter((p) => (p.draft_year ?? 0) >= DRAFT_BOARD_MIN_YEAR)
      .filter((p) => BOARD_POSITIONS.includes(p.position))
      .sort(sortByRankThenGrade)
  }, [allProspects])

  // Seed with the nearest upcoming class; later classes stay available to add.
  const currentDraftYear = useMemo(() => {
    const years = allEligibleProspects
      .map((p) => p.draft_year)
      .filter((y): y is number => typeof y === 'number' && Number.isFinite(y))
    return years.length ? Math.min(...years) : DRAFT_BOARD_MIN_YEAR
  }, [allEligibleProspects])

  const currentYearProspects = useMemo(
    () => allEligibleProspects.filter((p) => p.draft_year === currentDraftYear),
    [allEligibleProspects, currentDraftYear]
  )

  const consensusBoard = useMemo(() => {
    const pool =
      position === 'ALL'
        ? allEligibleProspects
        : allEligibleProspects.filter((p) => p.position === position)
    return pool.map(toBoardPlayer)
  }, [allEligibleProspects, position])

  const boardProspects = useMemo(() => {
    // Drop anything a saved board carries over from an already-drafted class.
    const scoped = draftBoard.filter(
      (p) => BOARD_POSITIONS.includes(p.position) && (p.draft_year ?? 0) >= DRAFT_BOARD_MIN_YEAR
    )
    return position === 'ALL' ? scoped : scoped.filter((p) => p.position === position)
  }, [draftBoard, position])

  const boardSections = useMemo(() => {
    const grouped = new Map<number, Prospect[]>()
    for (const p of boardProspects) {
      const year = p.draft_year ?? 0
      if (!grouped.has(year)) grouped.set(year, [])
      grouped.get(year)!.push(p)
    }
    return Array.from(grouped.entries())
      // Nearest class first — 2027 drafts before 2028, so it leads the board.
      .sort((a, b) => a[0] - b[0])
      .map(([year, prospects]) => ({
        year,
        // Keep user-defined drag order within each class section.
        prospects,
      }))
  }, [boardProspects])

  const boardPlayerMap = useMemo(() => {
    const map = new Map<number, BoardPlayer>()
    for (const p of boardProspects) {
      map.set(p.id, toBoardPlayer(p))
    }
    return map
  }, [boardProspects])

  const comparisonNamesMap = useMemo(() => {
    const map = new Map<number, string[]>()
    for (const p of boardProspects) {
      map.set(p.id, getComparisonNames(p.nfl_comparisons))
    }
    return map
  }, [boardProspects])

  // If the board holds nothing from an upcoming class, seed it once with the
  // nearest one. A saved board full of already-drafted players gets replaced.
  useEffect(() => {
    const eligibleOnBoard = draftBoard.filter(
      (p) => (p.draft_year ?? 0) >= DRAFT_BOARD_MIN_YEAR
    ).length
    if (seededYearRef.current === currentDraftYear) return
    if (eligibleOnBoard > 0) {
      seededYearRef.current = currentDraftYear
      return
    }
    if (currentYearProspects.length === 0) return

    onClearDraftBoard()
    currentYearProspects.forEach((p) => onAddToDraftBoard(p))
    seededYearRef.current = currentDraftYear
  }, [draftBoard, currentDraftYear, currentYearProspects, onAddToDraftBoard, onClearDraftBoard])
  const userBoard = useMemo(() => boardProspects.map(toBoardPlayer), [boardProspects])

  /** Per-position stat arrays for heat-map percentile coloring across upcoming classes. */
  const positionalHeatStats = useMemo(() => {
    type StatSet = { grade: number[]; rank: number[]; height: number[]; weight: number[]; forty: number[]; physical: number[] }
    const map = new Map<string, StatSet>()
    for (const p of allEligibleProspects) {
      const key = p.position
      if (!map.has(key)) map.set(key, { grade: [], rank: [], height: [], weight: [], forty: [], physical: [] })
      const set = map.get(key)!
      const grade = Number(p.overall_grade || 0)
      const rank = overallRankOf(p)
      const height = p.height ? Number(p.height) : 0
      const weight = Number(p.weight || 0)
      const forty = parseForty(p.college_stats || null)
      const physical = Math.round(Number(p.physical_measurables_score || 0))
      if (grade > 0) set.grade.push(grade)
      if (rank > 0 && rank < 9999) set.rank.push(rank)
      if (height > 0) set.height.push(height)
      if (weight > 0) set.weight.push(weight)
      if (forty !== null) set.forty.push(forty)
      if (physical > 0) set.physical.push(physical)
    }
    return map
  }, [allEligibleProspects])

  // Per-class consensus ranks — so "vs consensus" compares within the same draft class
  const consensusRankByClassId = useMemo(() => {
    const byYear = new Map<number, Map<number, number>>()
    const pool =
      position === 'ALL'
        ? allEligibleProspects
        : allEligibleProspects.filter((p) => p.position === position)

    // Group by year, then rank within each year
    const grouped = new Map<number, Prospect[]>()
    for (const p of pool) {
      const year = p.draft_year ?? 0
      if (!grouped.has(year)) grouped.set(year, [])
      grouped.get(year)!.push(p)
    }
    for (const [year, prospects] of grouped.entries()) {
      const rankMap = new Map<number, number>()
      prospects.forEach((p, idx) => rankMap.set(p.id, idx + 1))
      byYear.set(year, rankMap)
    }
    return byYear
  }, [allEligibleProspects, position])

  const consensusRankByClassName = useMemo(() => {
    const byYear = new Map<number, Map<string, number>>()
    const pool =
      position === 'ALL'
        ? allEligibleProspects
        : allEligibleProspects.filter((p) => p.position === position)

    const grouped = new Map<number, Prospect[]>()
    for (const p of pool) {
      const year = p.draft_year ?? 0
      if (!grouped.has(year)) grouped.set(year, [])
      grouped.get(year)!.push(p)
    }
    for (const [year, prospects] of grouped.entries()) {
      const rankMap = new Map<string, number>()
      prospects.forEach((p, idx) => rankMap.set(p.name, idx + 1))
      byYear.set(year, rankMap)
    }
    return byYear
  }, [allEligibleProspects, position])

  // Contrarian score scoped to the primary class on board
  const contrarianScore = useMemo(() => {
    // Find the primary year on the board (most players)
    const yearCounts = new Map<number, number>()
    for (const p of userBoard) {
      const year = p.draftYear ?? 0
      yearCounts.set(year, (yearCounts.get(year) || 0) + 1)
    }
    let primaryYear = 0
    let maxCount = 0
    for (const [year, count] of yearCounts) {
      if (count > maxCount) { primaryYear = year; maxCount = count }
    }
    const classUsers = userBoard.filter((p) => (p.draftYear ?? 0) === primaryYear)
    const classConsensus = consensusBoard.filter((p) => (p.draftYear ?? 0) === primaryYear)
    return calculateContrarianScore(classUsers, classConsensus)
  }, [userBoard, consensusBoard])
  const contrarianLabel = useMemo(() => getContrarianLabel(contrarianScore), [contrarianScore])

  const boardStats = useMemo(
    () => ({
      avgGrade:
        userBoard.length > 0
          ? userBoard.reduce((sum, p) => sum + p.grade, 0) / userBoard.length
          : 0,
      avgPhysical:
        userBoard.length > 0
          ? userBoard.reduce((sum, p) => sum + p.physical, 0) / userBoard.length
          : 0,
      avgProduction:
        userBoard.length > 0
          ? userBoard.reduce((sum, p) => sum + p.production, 0) / userBoard.length
          : 0,
      speedsters: userBoard.filter((p) => p.fortyTime && p.fortyTime < 4.45).length,
      bigBoys: userBoard.filter((p) => p.weight > 220).length,
      generational: userBoard.filter((p) => p.tier === 'Generational').length,
      blueChips: userBoard.filter((p) => p.tier === 'Blue Chip').length,
    }),
    [userBoard]
  )

  const classAverages = useMemo(() => {
    if (userBoard.length === 0) {
      return { grade: 0, physical: 0, production: 0 }
    }

    const scoped =
      position === 'ALL'
        ? allEligibleProspects
        : allEligibleProspects.filter((p) => p.position === position)

    const cohortAveragesByYear = new Map<number | null, { grade: number; physical: number; production: number }>()
    const grouped = new Map<number | null, BoardPlayer[]>()
    for (const prospect of scoped) {
      const year = prospect.draft_year ?? null
      if (!grouped.has(year)) grouped.set(year, [])
      grouped.get(year)!.push(toBoardPlayer(prospect))
    }
    for (const [year, cohort] of grouped.entries()) {
      if (cohort.length === 0) continue
      cohortAveragesByYear.set(year, {
        grade: cohort.reduce((sum, p) => sum + p.grade, 0) / cohort.length,
        physical: cohort.reduce((sum, p) => sum + p.physical, 0) / cohort.length,
        production: cohort.reduce((sum, p) => sum + p.production, 0) / cohort.length,
      })
    }

    const perPlayerClassBaseline = userBoard
      .map((player) => cohortAveragesByYear.get(player.draftYear))
      .filter((x): x is { grade: number; physical: number; production: number } => x !== undefined)

    if (perPlayerClassBaseline.length === 0) {
      return {
        grade:
          consensusBoard.length > 0
            ? consensusBoard.reduce((sum, p) => sum + p.grade, 0) / consensusBoard.length
            : 0,
        physical:
          consensusBoard.length > 0
            ? consensusBoard.reduce((sum, p) => sum + p.physical, 0) / consensusBoard.length
            : 0,
        production:
          consensusBoard.length > 0
            ? consensusBoard.reduce((sum, p) => sum + p.production, 0) / consensusBoard.length
            : 0,
      }
    }

    return {
      grade:
        perPlayerClassBaseline.reduce((sum, x) => sum + x.grade, 0) / perPlayerClassBaseline.length,
      physical:
        perPlayerClassBaseline.reduce((sum, x) => sum + x.physical, 0) /
        perPlayerClassBaseline.length,
      production:
        perPlayerClassBaseline.reduce((sum, x) => sum + x.production, 0) /
        perPlayerClassBaseline.length,
    }
  }, [consensusBoard, allEligibleProspects, position, userBoard])

  const boardConsensusDiffs = useMemo(() => {
    // Group user board by year to compute within-class index
    const byYear = new Map<number, BoardPlayer[]>()
    for (const p of userBoard) {
      const year = p.draftYear ?? 0
      if (!byYear.has(year)) byYear.set(year, [])
      byYear.get(year)!.push(p)
    }
    const results: { player: BoardPlayer; diff: number }[] = []
    for (const [year, players] of byYear) {
      const classNameMap = consensusRankByClassName.get(year)
      players.forEach((p, idx) => {
        const consensusRank = classNameMap?.get(p.name) ?? idx + 1
        results.push({ player: p, diff: consensusRank - (idx + 1) })
      })
    }
    return results
  }, [userBoard, consensusRankByClassName])

  const addTopAvailable = () => {
    const onBoardIds = new Set(draftBoard.map((p) => p.id))
    const firstMissing = availableProspects.find((p) => !onBoardIds.has(p.id))
    if (firstMissing) onAddToDraftBoard(firstMissing)
  }

  // ── Deferred drag reorder ──────────────────────────────────────────
  // During an active drag, stash the latest section order in a ref
  // instead of pushing to parent state. This avoids the full re-render
  // cascade (parent + all memos) on every drag frame. Commit once on drop.
  const pendingReorderRef = useRef<{ year: number; prospects: Prospect[] } | null>(null)

  const commitSectionReorder = (year: number, reorderedSection: Prospect[]) => {
    const targetIds = new Set(reorderedSection.map((p) => p.id))
    if (targetIds.size === 0) return

    const currentSectionIds = draftBoard.filter((entry) => targetIds.has(entry.id)).map((p) => p.id)
    const nextSectionIds = reorderedSection.map((p) => p.id)
    if (
      currentSectionIds.length === nextSectionIds.length &&
      currentSectionIds.every((id, idx) => id === nextSectionIds[idx])
    ) {
      return
    }

    let cursor = 0
    const nextBoard = draftBoard.map((entry) => {
      if (!targetIds.has(entry.id)) return entry
      const replacement = reorderedSection[cursor]
      cursor += 1
      return replacement || entry
    })
    onReorderDraftBoard(nextBoard)
  }

  const handleSectionReorder = (year: number, reorderedSection: Prospect[]) => {
    // During active drag: stash in ref, skip parent state update entirely.
    // Framer Motion keeps visual order internally — zero React re-renders.
    if (draggingProspectId !== null) {
      pendingReorderRef.current = { year, prospects: reorderedSection }
      return
    }
    commitSectionReorder(year, reorderedSection)
  }

  /** Every upcoming-class prospect for the active position tab. */
  const availableProspects = useMemo(
    () =>
      position === 'ALL'
        ? allEligibleProspects
        : allEligibleProspects.filter((p) => p.position === position),
    [allEligibleProspects, position]
  )

  const offBoardProspects = useMemo(() => {
    const onBoardIds = new Set(draftBoard.map((p) => p.id))
    return availableProspects.filter((p) => !onBoardIds.has(p.id))
  }, [draftBoard, availableProspects])

  const filteredOffBoardProspects = useMemo(() => {
    const q = offBoardSearch.trim().toLowerCase()
    if (!q) return offBoardProspects
    return offBoardProspects.filter((p) =>
      `${p.name} ${p.school} ${p.position}`.toLowerCase().includes(q)
    )
  }, [offBoardProspects, offBoardSearch])

  const compHeadshotMap = useMemo(() => {
    const map = new Map<string, CompAvatarMeta>()
    for (const prospect of allProspects) {
      if (!prospect?.name) continue
      const key = normalizeName(prospect.name)
      const nextMeta: CompAvatarMeta = {
        headshotUrl: prospect.headshot_url ?? null,
        espnId: prospect.espn_id ?? null,
      }
      const existing = map.get(key)
      if (!existing) {
        map.set(key, nextMeta)
        continue
      }
      // Prefer entries with actual image data.
      if (!existing.headshotUrl && nextMeta.headshotUrl) {
        map.set(key, nextMeta)
      } else if (!existing.espnId && nextMeta.espnId) {
        map.set(key, { ...existing, espnId: nextMeta.espnId })
      }
    }
    return map
  }, [allProspects])

  if (loading) {
    return (
      <div className="min-h-[60vh] bg-background flex items-center justify-center rounded-lg border border-border">
        <div className="text-center">
          <ClipboardList className="w-8 h-8 text-primary animate-pulse mx-auto mb-4" />
          <div className="font-mono text-sm text-muted-foreground">Loading draft class...</div>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-[70vh] bg-background">
      {/* Compact toolbar — position tabs + actions */}
      <div className="w-full px-2 sm:px-3 pt-1 pb-2 flex items-center justify-between gap-2 sm:gap-3 flex-wrap shrink-0">
        <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
          {positionTabs.map((pos) => (
            <button
              key={pos}
              type="button"
              onClick={() => setPosition(pos)}
              className={cn(
                'min-h-10 min-w-[2.5rem] px-3 sm:min-h-7 sm:min-w-0 text-xs font-semibold rounded-md transition-colors active:scale-[0.98]',
                position === pos
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary/80 text-muted-foreground hover:text-foreground hover:bg-secondary'
              )}
            >
              {pos}
            </button>
          ))}
          <span className="hidden sm:block w-px h-5 bg-border mx-1" />
          <button
            type="button"
            onClick={addTopAvailable}
            className="min-h-10 px-3.5 sm:min-h-7 text-xs font-semibold rounded-md bg-secondary/80 text-secondary-foreground hover:bg-secondary transition-colors active:scale-[0.98]"
          >
            Add Next
          </button>
        </div>

        {isLoggedIn && onSaveBoard && draftBoard.length > 0 && (
          <DraftBoardControls
            hasSavedBoard={hasSavedBoard}
            saving={savingBoard}
            hasChanges={hasUnsavedChanges}
            onSave={onSaveBoard}
          />
        )}
      </div>

      <div className="w-full px-1 sm:px-2 pb-24 lg:pb-3">
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.9fr)_minmax(360px,1fr)] gap-5">
          <div>
            <div className="rounded-lg overflow-hidden border border-slate-700/80 bg-slate-900 xl:max-h-[calc(100vh-220px)] xl:flex xl:flex-col">
              {/* Column header — slate navy to match app chrome */}
              <div
                className="hidden lg:grid items-center border-b border-slate-700/70 bg-slate-800/85 px-2 py-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-400 select-none"
                style={{ gridTemplateColumns: '20px 1fr 40px 52px 60px 52px 50px 46px 52px 48px 120px 24px' }}
              >
                <span />
                <span className="pl-1.5">Player</span>
                <span className="text-center">Pos</span>
                <span className="text-center">Rank</span>
                <span className="text-center">Grade</span>
                <span className="text-center">My #</span>
                <span className="text-center">40</span>
                <span className="text-center">Ht</span>
                <span className="text-center">Wt</span>
                <span className="text-center">Phy</span>
                <span className="text-center text-emerald-500/80">KTC</span>
                <span />
              </div>

              <div className="xl:flex-1 xl:min-h-0 xl:overflow-y-auto">
                {boardSections.map((section) => (
                  <div key={`year-${section.year}`} className="border-b border-border/60 last:border-0">
                    <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-400 bg-slate-800/55 border-b border-slate-700/55">
                      {section.year || 'Unknown'} Class
                    </div>
                    <ReorderAny.Group
                      axis="y"
                      values={section.prospects}
                      onReorder={(next: Prospect[]) => handleSectionReorder(section.year, next)}
                      layoutScroll
                      className="relative"
                    >
                      {section.prospects.map((prospect, index) => {
                        const player = boardPlayerMap.get(prospect.id) || toBoardPlayer(prospect)
                        const classRankMap = consensusRankByClassId.get(section.year)
                        const consensusRank = classRankMap?.get(player.id) ?? index + 1
                        const rankDiff = consensusRank - (index + 1)
                        const tierColor = tierStyleFor(player.tier)
                        const comparisonNames = comparisonNamesMap.get(prospect.id) || []
                        const isEven = index % 2 === 1

                        return (
                          <ReorderAny.Item
                            key={`${section.year}-${prospect.id}`}
                            value={prospect}
                            layout="position"
                            transition={{ type: 'spring', stiffness: 400, damping: 25, mass: 0.8 }}
                            drag="y"
                            dragDirectionLock
                            dragMomentum={false}
                            dragElastic={0.08}
                            onDragStart={() => setDraggingProspectId(prospect.id)}
                            onDragEnd={() => {
                              const pending = pendingReorderRef.current
                              if (pending) {
                                commitSectionReorder(pending.year, pending.prospects)
                                pendingReorderRef.current = null
                              }
                              setDraggingProspectId(null)
                            }}
                            whileDrag={{ scale: 1.01, zIndex: 40, boxShadow: '0 8px 24px rgba(0,0,0,0.4)', cursor: 'grabbing' }}
                            className={cn(
                              'relative border-b border-slate-700/45 last:border-0 cursor-grab active:cursor-grabbing focus:outline-none',
                              isEven
                                ? 'bg-slate-800/35 hover:bg-slate-800/55'
                                : 'bg-slate-900 hover:bg-slate-800/45',
                              draggingProspectId === prospect.id && 'ring-1 ring-inset ring-primary/40 bg-primary/5',
                            )}
                          >
                            <div className="w-full">
                            {(() => {
                              const myRank = index + 1
                              const heatKey = player.position
                              const stats = positionalHeatStats.get(heatKey)
                              const gradePct = stats ? rankPercentile(player.grade, stats.grade) : 0.5
                              const rankPct = stats ? rankPercentile(player.rank, stats.rank, true) : 0.5
                              const classSize = section.prospects.length
                              const myRankPct = classSize > 1
                                ? Math.max(0, Math.min(1, 0.5 + (consensusRank - myRank) / (classSize * 2)))
                                : 0.5
                              const fortyPct = (stats && player.fortyTime) ? rankPercentile(player.fortyTime, stats.forty, true) : 0.5
                              const heightPct = (stats && player.height) ? rankPercentile(player.height, stats.height) : 0.5
                              const weightPct = (stats && player.weight) ? rankPercentile(player.weight, stats.weight) : 0.5
                              const physicalPct = (stats && player.physical > 0) ? rankPercentile(player.physical, stats.physical) : 0.5

                              const gradeHeat = heatCell(gradePct)
                              const rankHeat = heatCell(rankPct)
                              const myRankHeat = heatCell(myRankPct)
                              const fortyHeat = heatCell(fortyPct)
                              const heightHeat = heatCell(heightPct)
                              const weightHeat = heatCell(weightPct)
                              const physicalHeat = heatCell(physicalPct)

                              return (
                                <>
                                <div className="lg:hidden px-2 py-1.5 touch-manipulation">
                                  <div className="flex gap-1.5 items-stretch">
                                    <div
                                      className="flex items-center justify-center w-11 shrink-0 rounded-lg bg-slate-800/50 active:bg-slate-700/55"
                                      aria-hidden
                                    >
                                      <GripVertical className="w-5 h-5 text-muted-foreground/70" />
                                    </div>
                                    <div className="relative w-11 h-[3.25rem] shrink-0 rounded-md overflow-hidden bg-slate-800/40">
                                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/65 via-transparent to-transparent z-[1]" />
                                      {!imageErrors.has(player.name) && getPlayerImageUrl(player) ? (
                                        <Image
                                          src={getPlayerImageUrl(player)}
                                          alt={player.name}
                                          width={88}
                                          height={88}
                                          className="w-full h-full object-contain object-bottom scale-110"
                                          onError={() => setImageErrors((prev) => new Set(prev).add(player.name))}
                                        />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center text-[9px] font-bold text-muted-foreground/40">
                                          {player.name
                                            .split(' ')
                                            .map((n) => n[0])
                                            .join('')}
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                                      <div className="flex items-start gap-1">
                                        <div className="min-w-0 flex-1">
                                          <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0">
                                            <span className="text-[13px] font-bold text-foreground leading-snug">
                                              {player.name}
                                            </span>
                                            <span
                                              className={cn(
                                                'text-[8px] font-bold uppercase px-1 py-px rounded border shrink-0 leading-none',
                                                tierColor.bg,
                                                tierColor.text,
                                                tierColor.border
                                              )}
                                            >
                                              {player.tier}
                                            </span>
                                          </div>
                                          <p className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5">
                                            <span className="font-mono font-semibold text-primary">
                                              {player.position}
                                            </span>
                                            <span className="opacity-50"> · </span>
                                            {player.school}
                                          </p>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => onRemoveFromDraftBoard(prospect.id)}
                                          data-no-row-click="true"
                                          className="min-h-11 min-w-11 shrink-0 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/80 active:bg-secondary"
                                          aria-label={`Remove ${player.name}`}
                                        >
                                          <X className="h-5 w-5" strokeWidth={2.25} />
                                        </button>
                                      </div>
                                      <div className="flex gap-1 overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden touch-pan-x pb-0.5">
                                        <div
                                          className="shrink-0 rounded-md px-2 py-0.5 text-left min-w-[3.25rem]"
                                          style={{ backgroundColor: rankHeat.bg }}
                                        >
                                          <div className="text-[7px] text-muted-foreground/90 uppercase leading-none">
                                            Rnk
                                          </div>
                                          <div
                                            className="text-[11px] font-mono font-bold tabular-nums leading-tight"
                                            style={{ color: rankHeat.color }}
                                          >
                                            #{player.rank < 9999 ? player.rank : '—'}
                                          </div>
                                        </div>
                                        <div
                                          className="shrink-0 rounded-md px-2 py-0.5 min-w-[2.75rem]"
                                          style={{ backgroundColor: gradeHeat.bg }}
                                        >
                                          <div className="text-[7px] text-muted-foreground/90 uppercase leading-none">
                                            Grd
                                          </div>
                                          <div
                                            className="text-[11px] font-mono font-bold tabular-nums leading-tight"
                                            style={{ color: gradeHeat.color }}
                                          >
                                            {player.grade.toFixed(1)}
                                          </div>
                                        </div>
                                        <div
                                          className="shrink-0 rounded-md px-2 py-0.5 min-w-[2.75rem]"
                                          style={{ backgroundColor: myRankHeat.bg }}
                                        >
                                          <div className="text-[7px] text-muted-foreground/90 uppercase leading-none">
                                            Mine
                                          </div>
                                          <div
                                            className="text-[11px] font-mono font-bold tabular-nums leading-tight"
                                            style={{ color: myRankHeat.color }}
                                          >
                                            #{myRank}
                                          </div>
                                        </div>
                                        <div
                                          className="shrink-0 rounded-md px-2 py-0.5 min-w-[2.5rem] text-[11px] font-mono font-bold tabular-nums leading-tight"
                                          style={
                                            player.fortyTime
                                              ? { backgroundColor: fortyHeat.bg, color: fortyHeat.color }
                                              : { color: 'rgb(100,100,110)' }
                                          }
                                        >
                                          <div className="text-[7px] text-muted-foreground/90 uppercase leading-none font-sans font-normal">
                                            40
                                          </div>
                                          {player.fortyTime ? player.fortyTime.toFixed(2) : '—'}
                                        </div>
                                        <div
                                          className="shrink-0 rounded-md px-2 py-0.5 min-w-[2.5rem] text-[11px] font-mono font-bold tabular-nums leading-tight"
                                          style={
                                            player.height
                                              ? { backgroundColor: heightHeat.bg, color: heightHeat.color }
                                              : { color: 'rgb(100,100,110)' }
                                          }
                                        >
                                          <div className="text-[7px] text-muted-foreground/90 uppercase leading-none font-sans font-normal">
                                            Ht
                                          </div>
                                          {formatHeight(player.height)}
                                        </div>
                                        <div
                                          className="shrink-0 rounded-md px-2 py-0.5 min-w-[2.5rem] text-[11px] font-mono font-bold tabular-nums leading-tight"
                                          style={
                                            player.weight > 0
                                              ? { backgroundColor: weightHeat.bg, color: weightHeat.color }
                                              : { color: 'rgb(100,100,110)' }
                                          }
                                        >
                                          <div className="text-[7px] text-muted-foreground/90 uppercase leading-none font-sans font-normal">
                                            Wt
                                          </div>
                                          {player.weight > 0 ? player.weight : '—'}
                                        </div>
                                        <div
                                          className="shrink-0 rounded-md px-2 py-0.5 min-w-[2.5rem] text-[11px] font-mono font-bold tabular-nums leading-tight"
                                          style={
                                            player.physical > 0
                                              ? { backgroundColor: physicalHeat.bg, color: physicalHeat.color }
                                              : { color: 'rgb(100,100,110)' }
                                          }
                                        >
                                          <div className="text-[7px] text-muted-foreground/90 uppercase leading-none font-sans font-normal">
                                            Phys
                                          </div>
                                          {player.physical > 0 ? player.physical : '—'}
                                        </div>
                                      </div>
                                      <KtcSparkline
                                        playerName={player.name}
                                        history={ktcHistoryMap[player.name]}
                                        useSf={true}
                                        layout="bar"
                                      />
                                    </div>
                                  </div>
                                </div>
                                <div
                                  className="hidden lg:grid items-stretch h-24 pl-2 pr-2"
                                  style={{ gridTemplateColumns: '20px 1fr 40px 52px 60px 52px 50px 46px 52px 48px 120px 24px' }}
                                >
                                  {/* Drag handle */}
                                  <div className="flex items-center">
                                    <GripVertical className="w-3.5 h-3.5 text-muted-foreground/50 flex-shrink-0" />
                                  </div>

                                  {/* Player: headshot + name + school */}
                                  {/* Player: full-height cutout image + name */}
                                  <div className="flex items-center gap-3 min-w-0">
                                    {/* Cutout image — no circle, like ProspectCard */}
                                    <div className="relative w-28 h-full flex-shrink-0 bg-slate-800/40 overflow-hidden rounded-sm">
                                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/65 via-transparent to-transparent z-[1]" />
                                      {!imageErrors.has(player.name) && getPlayerImageUrl(player) ? (
                                        <Image
                                          src={getPlayerImageUrl(player)}
                                          alt={player.name}
                                          width={160}
                                          height={160}
                                          className="w-full h-full object-contain object-bottom scale-110"
                                          onError={() => setImageErrors((prev) => new Set(prev).add(player.name))}
                                        />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center text-xs font-bold text-muted-foreground/40">
                                          {player.name.split(' ').map((n) => n[0]).join('')}
                                        </div>
                                      )}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="text-base font-bold text-foreground truncate leading-tight">
                                        {player.name}
                                      </div>
                                      <div className="text-xs text-muted-foreground truncate leading-tight mt-0.5">
                                        {player.school}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Position */}
                                  <div className="flex items-center justify-center">
                                    <span className="text-xs font-mono font-bold text-primary">{player.position}</span>
                                  </div>

                                  {/* Consensus Rank — heat cell */}
                                  <div className="flex items-center justify-center py-3.5 px-0.5">
                                    <div
                                      className="w-full h-full flex items-center justify-center rounded text-sm font-mono font-bold tabular-nums"
                                      style={{ backgroundColor: rankHeat.bg, color: rankHeat.color }}
                                    >
                                      #{player.rank < 9999 ? player.rank : '—'}
                                    </div>
                                  </div>

                                  {/* Grade — heat cell */}
                                  <div className="flex items-center justify-center py-3.5 px-0.5">
                                    <div
                                      className="w-full h-full flex items-center justify-center rounded text-base font-mono font-bold tabular-nums"
                                      style={{ backgroundColor: gradeHeat.bg, color: gradeHeat.color }}
                                    >
                                      {player.grade.toFixed(1)}
                                    </div>
                                  </div>

                                  {/* My Rank — heat cell (green = bullish vs consensus) */}
                                  <div className="flex items-center justify-center py-3.5 px-0.5">
                                    <div
                                      className="w-full h-full flex items-center justify-center rounded text-sm font-mono font-bold tabular-nums"
                                      style={{ backgroundColor: myRankHeat.bg, color: myRankHeat.color }}
                                    >
                                      #{myRank}
                                    </div>
                                  </div>

                                  {/* 40 time — heat cell */}
                                  <div className="flex items-center justify-center py-3.5 px-0.5">
                                    <div
                                      className="w-full h-full flex items-center justify-center rounded text-sm font-mono tabular-nums"
                                      style={player.fortyTime ? { backgroundColor: fortyHeat.bg, color: fortyHeat.color } : { color: 'rgb(100,100,110)' }}
                                    >
                                      {player.fortyTime ? player.fortyTime.toFixed(2) : '—'}
                                    </div>
                                  </div>

                                  {/* Height — heat cell */}
                                  <div className="flex items-center justify-center py-3.5 px-0.5">
                                    <div
                                      className="w-full h-full flex items-center justify-center rounded text-sm font-mono tabular-nums"
                                      style={player.height ? { backgroundColor: heightHeat.bg, color: heightHeat.color } : { color: 'rgb(100,100,110)' }}
                                    >
                                      {formatHeight(player.height)}
                                    </div>
                                  </div>

                                  {/* Weight — heat cell */}
                                  <div className="flex items-center justify-center py-3.5 px-0.5">
                                    <div
                                      className="w-full h-full flex items-center justify-center rounded text-sm font-mono tabular-nums"
                                      style={player.weight > 0 ? { backgroundColor: weightHeat.bg, color: weightHeat.color } : { color: 'rgb(100,100,110)' }}
                                    >
                                      {player.weight > 0 ? `${player.weight}` : '—'}
                                    </div>
                                  </div>

                                  {/* Physical score — heat cell */}
                                  <div className="flex items-center justify-center py-3.5 px-0.5">
                                    <div
                                      className="w-full h-full flex items-center justify-center rounded text-sm font-mono tabular-nums"
                                      style={player.physical > 0 ? { backgroundColor: physicalHeat.bg, color: physicalHeat.color } : { color: 'rgb(100,100,110)' }}
                                    >
                                      {player.physical > 0 ? player.physical : '—'}
                                    </div>
                                  </div>

                                  {/* KTC Sparkline */}
                                  <div className="flex items-center justify-center py-2 px-1">
                                    <KtcSparkline
                                      playerName={player.name}
                                      history={ktcHistoryMap[player.name]}
                                      useSf={true}
                                      width={88}
                                      height={44}
                                    />
                                  </div>

                                  {/* Remove */}
                                  <div className="flex items-center justify-center">
                                    <button
                                      onClick={() => onRemoveFromDraftBoard(prospect.id)}
                                      data-no-row-click="true"
                                      className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground/40 hover:text-foreground hover:bg-secondary text-sm"
                                      aria-label={`Remove ${player.name}`}
                                    >
                                      ×
                                    </button>
                                  </div>
                                </div>
                                </>
                              )
                            })()}
                            </div>
                          </ReorderAny.Item>
                        )
                      })}
                    </ReorderAny.Group>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3 xl:sticky xl:top-24 self-start xl:max-h-[calc(100vh-220px)] xl:overflow-y-auto">
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h3 className="font-mono font-bold text-foreground">Prospects Not On Board</h3>
                <span className="text-xs text-muted-foreground">
                  {filteredOffBoardProspects.length}
                </span>
              </div>

              <div className="p-3 border-b border-border">
                <input
                  value={offBoardSearch}
                  onChange={(e) => setOffBoardSearch(e.target.value)}
                  placeholder="Search available prospects..."
                  className="w-full h-9 rounded bg-background border border-border px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40"
                />
              </div>

              <div className="max-h-[340px] overflow-y-auto">
                {filteredOffBoardProspects.length === 0 ? (
                  <div className="p-4 text-xs text-muted-foreground">
                    {offBoardSearch
                      ? 'No matching available prospects.'
                      : 'All available prospects are on your board.'}
                  </div>
                ) : (
                  filteredOffBoardProspects.slice(0, OFF_BOARD_VISIBLE_LIMIT).map((prospect) => {
                    const p = toBoardPlayer(prospect)
                    return (
                      <button
                        key={`offboard-${p.id}`}
                        type="button"
                        onClick={() => onAddToDraftBoard(prospect)}
                        className="w-full px-3 py-2.5 border-b border-border/60 last:border-0 flex items-center gap-2 text-left hover:bg-secondary/50 active:bg-secondary/70 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-secondary flex-shrink-0 pointer-events-none">
                          {!imageErrors.has(p.name) && getPlayerImageUrl(p) ? (
                            <Image
                              src={getPlayerImageUrl(p)}
                              alt={p.name}
                              width={32}
                              height={32}
                              className="w-full h-full object-cover"
                              onError={() => setImageErrors((prev) => new Set(prev).add(p.name))}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                              {p.name
                                .split(' ')
                                .map((n) => n[0])
                                .join('')}
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0 pointer-events-none">
                          <div className="text-sm font-medium text-foreground truncate">
                            {p.name}
                          </div>
                          <div className="text-[10px] text-muted-foreground truncate">
                            {p.draftYear ? `${p.draftYear} • ` : ''}
                            {p.position} • {p.school} • {p.grade.toFixed(1)}
                          </div>
                        </div>

                        <Plus
                          className="w-4 h-4 text-muted-foreground shrink-0 pointer-events-none"
                          aria-hidden
                        />
                      </button>
                      )
                    })
                  )}
                {filteredOffBoardProspects.length > OFF_BOARD_VISIBLE_LIMIT && (
                  <div className="px-3 py-2 text-[10px] text-muted-foreground">
                    Showing first {OFF_BOARD_VISIBLE_LIMIT} of{' '}
                    {filteredOffBoardProspects.length} — search to narrow.
                  </div>
                )}
                </div>
            </div>

            <div className="bg-card border border-border rounded-lg p-4">
              <h3 className="font-mono font-bold text-foreground mb-3">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={addTopAvailable}
                  className="px-3 py-2 text-xs rounded bg-secondary text-secondary-foreground hover:bg-secondary/80"
                >
                  Add Next
                </button>
                <button
                  onClick={onClearDraftBoard}
                  className="px-3 py-2 text-xs rounded bg-secondary text-secondary-foreground hover:bg-secondary/80"
                >
                  Clear Board
                </button>
              </div>
            </div>
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={toggleBreakdown}
                className="w-full p-3 lg:p-4 hover:bg-secondary/50 transition-colors text-left flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between lg:gap-0"
              >
                <div className="flex items-center justify-between gap-2 w-full lg:w-auto lg:flex-1 lg:min-w-0">
                  <h3 className="font-mono font-bold text-foreground">Board Breakdown</h3>
                  {showBreakdown ? (
                    <ChevronUp className="w-4 h-4 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 shrink-0" />
                  )}
                </div>
                {userBoard.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 w-full lg:hidden pointer-events-none">
                    <span className="inline-flex items-baseline gap-1 rounded-md border border-primary/35 bg-primary/10 px-2 py-1">
                      <span className="text-[9px] font-mono font-black uppercase tracking-wide text-primary/80">
                        GRD
                      </span>
                      <span className="text-xs font-mono font-bold text-primary tabular-nums">
                        {boardStats.avgGrade.toFixed(1)}
                      </span>
                    </span>
                    <span className="inline-flex items-baseline gap-1 rounded-md border border-border bg-secondary/70 px-2 py-1">
                      <span className="text-[9px] font-mono font-black uppercase tracking-wide text-muted-foreground">
                        PHYS
                      </span>
                      <span className="text-xs font-mono font-bold text-foreground tabular-nums">
                        {boardStats.avgPhysical.toFixed(0)}
                      </span>
                    </span>
                    <span className="inline-flex items-baseline gap-1 rounded-md border border-border bg-secondary/70 px-2 py-1">
                      <span className="text-[9px] font-mono font-black uppercase tracking-wide text-muted-foreground">
                        PROD
                      </span>
                      <span className="text-xs font-mono font-bold text-foreground tabular-nums">
                        {boardStats.avgProduction.toFixed(0)}
                      </span>
                    </span>
                  </div>
                )}
              </button>

              <AnimatePresence>
                {showBreakdown && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 pt-0 space-y-4">
                      <div className="hidden lg:grid grid-cols-3 gap-3">
                        <div className="text-center p-3 bg-secondary/50 rounded">
                          <div className="text-xl font-mono font-bold text-primary">
                            {boardStats.avgGrade.toFixed(1)}
                          </div>
                          <div className="text-[10px] text-muted-foreground">AVG GRADE</div>
                        </div>
                        <div className="text-center p-3 bg-secondary/50 rounded">
                          <div className="text-xl font-mono font-bold text-foreground">
                            {boardStats.avgPhysical.toFixed(0)}
                          </div>
                          <div className="text-[10px] text-muted-foreground">AVG PHYS</div>
                        </div>
                        <div className="text-center p-3 bg-secondary/50 rounded">
                          <div className="text-xl font-mono font-bold text-foreground">
                            {boardStats.avgProduction.toFixed(0)}
                          </div>
                          <div className="text-[10px] text-muted-foreground">AVG PROD</div>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-xs font-medium text-muted-foreground mb-2">
                          TIER DISTRIBUTION
                        </h4>
                        <div className="space-y-2">
                          {SCOUTING_DISPLAY_TIER_ORDER.map((tier) => {
                            const colors = SCOUTING_TIER_STYLES[tier]
                            const count = userBoard.filter((p) => p.tier === tier).length
                            const pct = userBoard.length > 0 ? (count / userBoard.length) * 100 : 0
                            return (
                              <div key={tier} className="flex items-center gap-2">
                                <span className={cn('text-xs w-24 shrink-0 truncate', colors.text)}>
                                  {tier}
                                </span>
                                <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${pct}%` }}
                                    className={cn(
                                      'h-full rounded-full',
                                      colors.bg.replace('/20', '/60')
                                    )}
                                  />
                                </div>
                                <span className="text-xs font-mono text-muted-foreground w-6">
                                  {count}
                                </span>
                              </div>
                            )
                          })}
              </div>
            </div>

                      <div>
                        <h4 className="text-xs font-medium text-muted-foreground mb-2">
                          PLAYER TYPES
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex items-center gap-2 p-2 bg-secondary/50 rounded">
                            <Zap className="w-4 h-4 text-cyan-400" />
                            <div>
                              <div className="text-sm font-mono font-bold">
                                {boardStats.speedsters}
                              </div>
                              <div className="text-[9px] text-muted-foreground">Speedsters</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 p-2 bg-secondary/50 rounded">
                            <Scale className="w-4 h-4 text-purple-400" />
                            <div>
                              <div className="text-sm font-mono font-bold">
                                {boardStats.bigBoys}
                              </div>
                              <div className="text-[9px] text-muted-foreground">
                                {'Big Boys (>220)'}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 p-2 bg-secondary/50 rounded">
                            <Target className="w-4 h-4 text-amber-400" />
                            <div>
                              <div className="text-sm font-mono font-bold">
                                {boardStats.generational}
                              </div>
                              <div className="text-[9px] text-muted-foreground">Generational</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 p-2 bg-secondary/50 rounded">
                            <TrendingUp className="w-4 h-4 text-blue-400" />
                            <div>
                              <div className="text-sm font-mono font-bold">
                                {boardStats.blueChips}
                              </div>
                              <div className="text-[9px] text-muted-foreground">Blue Chips</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
                </div>

            <div className="bg-card border border-border rounded-lg p-4">
              <h3 className="font-mono font-bold text-foreground mb-3">Your Biggest Takes</h3>
              <div className="mb-4">
                <h4 className="text-xs text-emerald-400 font-medium mb-2 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> HIGHER THAN CONSENSUS
                </h4>
                <div className="space-y-1">
                  {boardConsensusDiffs
                    .filter((x) => x.diff > 0)
                    .sort((a, b) => b.diff - a.diff)
                    .slice(0, 3)
                    .map(({ player, diff }) => (
                      <div key={player.id} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground truncate">{player.name}</span>
                        <span className="text-emerald-400 font-mono">+{diff}</span>
                      </div>
                      ))}
                    </div>
                  </div>

                  <div>
                <h4 className="text-xs text-rose-400 font-medium mb-2 flex items-center gap-1">
                  <TrendingDown className="w-3 h-3" /> LOWER THAN CONSENSUS
                </h4>
                <div className="space-y-1">
                  {boardConsensusDiffs
                    .filter((x) => x.diff < 0)
                    .sort((a, b) => a.diff - b.diff)
                    .slice(0, 3)
                    .map(({ player, diff }) => (
                      <div key={player.id} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground truncate">{player.name}</span>
                        <span className="text-rose-400 font-mono">{diff}</span>
                      </div>
                      ))}
                    </div>
                  </div>
                </div>

            <div className="bg-card border border-border rounded-lg p-4">
              <h3 className="font-mono font-bold text-foreground mb-3">vs Class Average</h3>
              <div className="space-y-3">
                {[
                  { label: 'Grade', yours: boardStats.avgGrade, klass: classAverages.grade },
                  {
                    label: 'Physical',
                    yours: boardStats.avgPhysical,
                    klass: classAverages.physical,
                  },
                  {
                    label: 'Production',
                    yours: boardStats.avgProduction,
                    klass: classAverages.production,
                  },
                ].map((stat) => {
                  const diff = stat.yours - stat.klass
                  return (
                    <div key={stat.label} className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{stat.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-foreground">{stat.yours.toFixed(1)}</span>
                        <span
                          className={cn(
                            'text-xs font-mono',
                            diff > 0
                              ? 'text-emerald-400'
                              : diff < 0
                                ? 'text-rose-400'
                                : 'text-muted-foreground'
                          )}
                        >
                          ({diff > 0 ? '+' : ''}
                          {diff.toFixed(1)})
                        </span>
                  </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
    </div>
    </main>
  )
}
