'use client'

import type React from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Reorder } from 'framer-motion'
import Image from 'next/image'
import useSWR from 'swr'
import { cn } from '@/lib/utils'
import { ChevronDown, ClipboardList, GripVertical, X } from 'lucide-react'
import { DraftBoardControls } from './DraftBoardControls'
import { KtcSparkline } from './KtcSparkline'
import { BoardBreakdownPanel } from './BoardBreakdownPanel'
import { OffBoardPanel } from './OffBoardPanel'
import type { Prospect } from './types'
import {
  BOARD_POSITIONS,
  DRAFT_BOARD_MIN_YEAR,
  formatHeight,
  getComparisonNames,
  getPlayerImageUrl,
  heatCell,
  myGradeOf,
  normalizeName,
  overallRankOf,
  parseForty,
  rankPercentile,
  tierStyleFor,
  toBoardPlayer,
  userGradeOf,
  type BoardPlayer,
  type GradeField,
} from './board-player'
import { computeMyGrade, parseUserGrade } from '@/lib/user-grade'
import type { ProspectGradePatch } from '@/hooks/use-prospect-grades'
import type { UserProspectGrade } from '@/types/prospect-grades'

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
  /** The signed-in user's own film/talent grades, keyed by prospect id. */
  gradesByProspectId?: Map<number, UserProspectGrade>
  onSetGrade?: (prospectId: number, patch: ProspectGradePatch) => Promise<void>
  /** Set when a grade save failed and was rolled back on screen. */
  gradeSaveError?: string | null
  onDismissGradeError?: () => void
}

interface EditingCell {
  prospectId: number
  field: GradeField
}

interface CompAvatarMeta {
  headshotUrl?: string | null
  espnId?: number | string | null
}

const positionTabs = ['ALL', 'QB', 'RB', 'WR', 'TE'] as const
/**
 * Column widths for the desktop board. The header and every row share this, so
 * it lives in one place — two copies of the string drift the moment one changes.
 * Order: drag · player · pos · rank · grade · film · talent · my grade · my # ·
 *        40 · ht · wt · phy · ktc · remove
 */
const BOARD_GRID_TEMPLATE =
  '20px minmax(180px,1fr) 40px 50px 56px 46px 46px 54px 50px 48px 44px 48px 46px 96px 24px'
const ReorderAny = Reorder as unknown as {
  Group: React.ComponentType<Record<string, unknown>>
  Item: React.ComponentType<Record<string, unknown>>
}


interface GradeCellInputProps {
  value: string
  label: string
  className: string
  onChange: (value: string) => void
  onCommit: () => void
  onCancel: () => void
}

/**
 * The text field a film/talent cell turns into while being edited. Module scope
 * so the desktop grid and the mobile card share one copy and neither remounts
 * it mid-edit.
 */
function GradeCellInput({
  value,
  label,
  className,
  onChange,
  onCommit,
  onCancel,
}: GradeCellInputProps) {
  return (
    <input
      autoFocus
      type="text"
      inputMode="decimal"
      value={value}
      aria-label={label}
      // Board rows are drag targets. Without this the pointer-down starts a
      // drag instead of focusing the field — and it has to be the capture
      // phase, because framer-motion listens natively on the row itself and
      // would otherwise fire before a bubble-phase handler could stop it.
      onPointerDownCapture={(e) => e.stopPropagation()}
      onChange={(e) => onChange(e.target.value)}
      onFocus={(e) => e.target.select()}
      onBlur={onCommit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onCommit()
        else if (e.key === 'Escape') onCancel()
      }}
      className={className}
    />
  )
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
  gradesByProspectId,
  onSetGrade,
  gradeSaveError = null,
  onDismissGradeError,
}: DraftBoardTabProps) {
  const [position, setPosition] = useState<(typeof positionTabs)[number]>('ALL')
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set())
  const [draggingProspectId, setDraggingProspectId] = useState<number | null>(null)
  // One cell is editable at a time, so this is board-level state rather than
  // per-row state, which would force the row into its own component.
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null)
  const [editDraft, setEditDraft] = useState('')
  const [sortByMyGrade, setSortByMyGrade] = useState(false)
  const seededYearRef = useRef<number | null>(null)

  const canGrade = isLoggedIn && Boolean(onSetGrade)

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
      .map(([year, prospects]) => {
        // "My #" always means position in the saved drag order, even while the
        // view is sorted by My Grade — otherwise it degrades into a row counter.
        const manualRankById = new Map<number, number>()
        prospects.forEach((p, idx) => manualRankById.set(p.id, idx + 1))

        // Keep user-defined drag order within each class section.
        if (!sortByMyGrade) return { year, prospects, manualRankById }

        // Graded players first, best My Grade on top; ungraded players fall to
        // the bottom holding their manual order.
        const sorted = [...prospects].sort((a, b) => {
          const aGrade = myGradeOf(gradesByProspectId, a.id)
          const bGrade = myGradeOf(gradesByProspectId, b.id)
          if (aGrade !== null && bGrade !== null && aGrade !== bGrade) {
            return bGrade - aGrade
          }
          if (aGrade === null && bGrade !== null) return 1
          if (bGrade === null && aGrade !== null) return -1
          return (manualRankById.get(a.id) ?? 0) - (manualRankById.get(b.id) ?? 0)
        })
        return { year, prospects: sorted, manualRankById }
      })
  }, [boardProspects, sortByMyGrade, gradesByProspectId])

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


  const addTopAvailable = () => {
    const onBoardIds = new Set(draftBoard.map((p) => p.id))
    const firstMissing = availableProspects.find((p) => !onBoardIds.has(p.id))
    if (firstMissing) onAddToDraftBoard(firstMissing)
  }

  // ── Inline film / talent grading ───────────────────────────────────
  // Click a cell to edit, Enter or blur to commit, Escape to abandon. Tab
  // commits too, because leaving the field blurs it.
  const beginEdit = (prospectId: number, field: GradeField) => {
    if (!canGrade) return
    const current = userGradeOf(gradesByProspectId?.get(prospectId), field)
    setEditingCell({ prospectId, field })
    setEditDraft(current === null ? '' : String(current))
  }

  const cancelEdit = () => {
    setEditingCell(null)
    setEditDraft('')
  }

  const commitEdit = () => {
    if (!editingCell || !onSetGrade) {
      cancelEdit()
      return
    }
    const { prospectId, field } = editingCell
    const parsed = parseUserGrade(editDraft)
    cancelEdit()

    // undefined means the text was not a usable number — leave the grade as is
    // rather than guessing at what was meant.
    if (parsed === undefined) return
    if (parsed === userGradeOf(gradesByProspectId?.get(prospectId), field)) return

    void onSetGrade(
      prospectId,
      field === 'film' ? { film_grade: parsed } : { talent_grade: parsed }
    )
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
          {sortByMyGrade && (
            <button
              type="button"
              onClick={() => setSortByMyGrade(false)}
              className="min-h-10 px-3 sm:min-h-7 text-xs font-semibold rounded-md bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25 transition-colors active:scale-[0.98]"
            >
              Sorted by My Grade · Clear
            </button>
          )}
          {gradeSaveError && (
            <button
              type="button"
              onClick={onDismissGradeError}
              className="min-h-10 px-3 sm:min-h-7 text-xs font-semibold rounded-md bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25 transition-colors"
              title={gradeSaveError}
            >
              Grade didn&apos;t save · Dismiss
            </button>
          )}
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
        {/* The board carries three more columns than it used to, so it takes a
            larger share of the row and the sidebar gives up its minimum. */}
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,2.2fr)_minmax(320px,1fr)] gap-5">
          <div>
            {/* overflow-x-auto so a narrow viewport scrolls the columns rather
                than crushing the player name into nothing. */}
            <div className="rounded-lg overflow-hidden lg:overflow-x-auto border border-slate-700/80 bg-slate-900 xl:max-h-[calc(100vh-220px)] xl:flex xl:flex-col">
              {/* Column header — slate navy to match app chrome */}
              <div
                className="hidden lg:grid items-center border-b border-slate-700/70 bg-slate-800/85 px-2 py-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-400 select-none"
                style={{ gridTemplateColumns: BOARD_GRID_TEMPLATE }}
              >
                <span />
                <span className="pl-1.5">Player</span>
                <span className="text-center">Pos</span>
                <span className="text-center">Rank</span>
                <span className="text-center">Grade</span>
                <span className="text-center text-sky-400/80">Film</span>
                <span className="text-center text-sky-400/80">Talent</span>
                <button
                  type="button"
                  onClick={() => setSortByMyGrade((prev) => !prev)}
                  aria-pressed={sortByMyGrade}
                  title={
                    sortByMyGrade
                      ? 'Back to your drag order'
                      : 'Sort the board by your grade'
                  }
                  className={cn(
                    'flex items-center justify-center gap-0.5 font-mono uppercase tracking-wider transition-colors hover:text-sky-300',
                    sortByMyGrade ? 'text-sky-300' : 'text-sky-400/80'
                  )}
                >
                  My Grd
                  {sortByMyGrade && <ChevronDown className="w-3 h-3" />}
                </button>
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
                            // Sorting by My Grade and dragging are mutually
                            // exclusive: a sorted view has no manual order to
                            // rearrange. Reorder.Item spreads props after its
                            // own `drag={axis}`, so false wins here.
                            drag={sortByMyGrade ? false : 'y'}
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
                              'relative border-b border-slate-700/45 last:border-0 focus:outline-none',
                              sortByMyGrade ? 'cursor-default' : 'cursor-grab active:cursor-grabbing',
                              isEven
                                ? 'bg-slate-800/35 hover:bg-slate-800/55'
                                : 'bg-slate-900 hover:bg-slate-800/45',
                              draggingProspectId === prospect.id && 'ring-1 ring-inset ring-primary/40 bg-primary/5',
                            )}
                          >
                            <div className="w-full">
                            {(() => {
                              // Position in the saved drag order, which stays
                              // meaningful even while the view is sorted.
                              const myRank = section.manualRankById.get(prospect.id) ?? index + 1
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

                              const userGrade = gradesByProspectId?.get(prospect.id)
                              const filmGrade = userGradeOf(userGrade, 'film')
                              const talentGrade = userGradeOf(userGrade, 'talent')
                              const myGrade = computeMyGrade(filmGrade, talentGrade)
                              const editingFilm =
                                editingCell?.prospectId === prospect.id &&
                                editingCell.field === 'film'
                              const editingTalent =
                                editingCell?.prospectId === prospect.id &&
                                editingCell.field === 'talent'

                              // Colour the user's grades against the same
                              // per-position model-grade spread the GRADE column
                              // uses, so an 88 you gave reads like an 88.
                              const filmPct =
                                stats && filmGrade !== null ? rankPercentile(filmGrade, stats.grade) : 0.5
                              const talentPct =
                                stats && talentGrade !== null ? rankPercentile(talentGrade, stats.grade) : 0.5
                              const myGradePct =
                                stats && myGrade !== null ? rankPercentile(myGrade, stats.grade) : 0.5

                              const gradeHeat = heatCell(gradePct)
                              const rankHeat = heatCell(rankPct)
                              const myRankHeat = heatCell(myRankPct)
                              const filmHeat = heatCell(filmPct)
                              const talentHeat = heatCell(talentPct)
                              const myGradeHeat = heatCell(myGradePct)
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
                                          className="shrink-0 rounded-md px-2 py-0.5 min-w-[3rem]"
                                          style={
                                            filmGrade !== null && !editingFilm
                                              ? { backgroundColor: filmHeat.bg }
                                              : undefined
                                          }
                                        >
                                          <div className="text-[7px] text-muted-foreground/90 uppercase leading-none">
                                            Film
                                          </div>
                                          {editingFilm ? (
                                            <GradeCellInput
                                              value={editDraft}
                                              label={`Film grade for ${player.name}`}
                                              onChange={setEditDraft}
                                              onCommit={commitEdit}
                                              onCancel={cancelEdit}
                                              className="w-10 bg-transparent text-[11px] font-mono font-bold tabular-nums leading-tight text-sky-200 outline-none"
                                            />
                                          ) : (
                                            <button
                                              type="button"
                                              disabled={!canGrade}
                                              onPointerDownCapture={(e) => e.stopPropagation()}
                                              onClick={() => beginEdit(prospect.id, 'film')}
                                              aria-label={`Film grade for ${player.name}`}
                                              className="text-[11px] font-mono font-bold tabular-nums leading-tight disabled:cursor-default"
                                              style={{
                                                color:
                                                  filmGrade !== null
                                                    ? filmHeat.color
                                                    : 'rgb(100,100,110)',
                                              }}
                                            >
                                              {filmGrade !== null ? filmGrade.toFixed(1) : '—'}
                                            </button>
                                          )}
                                        </div>
                                        <div
                                          className="shrink-0 rounded-md px-2 py-0.5 min-w-[3rem]"
                                          style={
                                            talentGrade !== null && !editingTalent
                                              ? { backgroundColor: talentHeat.bg }
                                              : undefined
                                          }
                                        >
                                          <div className="text-[7px] text-muted-foreground/90 uppercase leading-none">
                                            Talent
                                          </div>
                                          {editingTalent ? (
                                            <GradeCellInput
                                              value={editDraft}
                                              label={`Talent grade for ${player.name}`}
                                              onChange={setEditDraft}
                                              onCommit={commitEdit}
                                              onCancel={cancelEdit}
                                              className="w-10 bg-transparent text-[11px] font-mono font-bold tabular-nums leading-tight text-sky-200 outline-none"
                                            />
                                          ) : (
                                            <button
                                              type="button"
                                              disabled={!canGrade}
                                              onPointerDownCapture={(e) => e.stopPropagation()}
                                              onClick={() => beginEdit(prospect.id, 'talent')}
                                              aria-label={`Talent grade for ${player.name}`}
                                              className="text-[11px] font-mono font-bold tabular-nums leading-tight disabled:cursor-default"
                                              style={{
                                                color:
                                                  talentGrade !== null
                                                    ? talentHeat.color
                                                    : 'rgb(100,100,110)',
                                              }}
                                            >
                                              {talentGrade !== null ? talentGrade.toFixed(1) : '—'}
                                            </button>
                                          )}
                                        </div>
                                        <div
                                          className="shrink-0 rounded-md px-2 py-0.5 min-w-[2.75rem]"
                                          style={
                                            myGrade !== null
                                              ? { backgroundColor: myGradeHeat.bg }
                                              : undefined
                                          }
                                        >
                                          <div className="text-[7px] text-muted-foreground/90 uppercase leading-none">
                                            My Grd
                                          </div>
                                          <div
                                            className="text-[11px] font-mono font-bold tabular-nums leading-tight"
                                            style={{
                                              color:
                                                myGrade !== null
                                                  ? myGradeHeat.color
                                                  : 'rgb(100,100,110)',
                                            }}
                                          >
                                            {myGrade !== null ? myGrade.toFixed(1) : '—'}
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
                                  style={{ gridTemplateColumns: BOARD_GRID_TEMPLATE }}
                                >
                                  {/* Drag handle */}
                                  <div className="flex items-center">
                                    <GripVertical className="w-3.5 h-3.5 text-muted-foreground/50 flex-shrink-0" />
                                  </div>

                                  {/* Player: headshot + name + school */}
                                  {/* Player: full-height cutout image + name */}
                                  <div className="flex items-center gap-3 min-w-0">
                                    {/* Cutout image — no circle, like ProspectCard */}
                                    <div className="relative w-20 h-full flex-shrink-0 bg-slate-800/40 overflow-hidden rounded-sm">
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

                                  {/* Film — the user's own grade, click to edit */}
                                  <div className="flex items-center justify-center py-3.5 px-0.5">
                                    {editingFilm ? (
                                      <GradeCellInput
                                        value={editDraft}
                                        label={`Film grade for ${player.name}`}
                                        onChange={setEditDraft}
                                        onCommit={commitEdit}
                                        onCancel={cancelEdit}
                                        className="w-full h-full min-w-0 rounded bg-sky-500/15 text-center text-sm font-mono font-bold tabular-nums text-sky-200 outline-none ring-1 ring-sky-400/60"
                                      />
                                    ) : (
                                      <button
                                        type="button"
                                        disabled={!canGrade}
                                        onPointerDownCapture={(e) => e.stopPropagation()}
                                        onClick={() => beginEdit(prospect.id, 'film')}
                                        aria-label={`Film grade for ${player.name}`}
                                        title={canGrade ? 'Your film grade' : 'Sign in to grade'}
                                        className="w-full h-full flex items-center justify-center rounded text-sm font-mono font-bold tabular-nums enabled:hover:ring-1 enabled:hover:ring-sky-400/40 disabled:cursor-default"
                                        style={
                                          filmGrade !== null
                                            ? { backgroundColor: filmHeat.bg, color: filmHeat.color }
                                            : { color: 'rgb(100,100,110)' }
                                        }
                                      >
                                        {filmGrade !== null ? filmGrade.toFixed(1) : '—'}
                                      </button>
                                    )}
                                  </div>

                                  {/* Talent — the user's own grade, click to edit */}
                                  <div className="flex items-center justify-center py-3.5 px-0.5">
                                    {editingTalent ? (
                                      <GradeCellInput
                                        value={editDraft}
                                        label={`Talent grade for ${player.name}`}
                                        onChange={setEditDraft}
                                        onCommit={commitEdit}
                                        onCancel={cancelEdit}
                                        className="w-full h-full min-w-0 rounded bg-sky-500/15 text-center text-sm font-mono font-bold tabular-nums text-sky-200 outline-none ring-1 ring-sky-400/60"
                                      />
                                    ) : (
                                      <button
                                        type="button"
                                        disabled={!canGrade}
                                        onPointerDownCapture={(e) => e.stopPropagation()}
                                        onClick={() => beginEdit(prospect.id, 'talent')}
                                        aria-label={`Talent grade for ${player.name}`}
                                        title={canGrade ? 'Your talent grade' : 'Sign in to grade'}
                                        className="w-full h-full flex items-center justify-center rounded text-sm font-mono font-bold tabular-nums enabled:hover:ring-1 enabled:hover:ring-sky-400/40 disabled:cursor-default"
                                        style={
                                          talentGrade !== null
                                            ? { backgroundColor: talentHeat.bg, color: talentHeat.color }
                                            : { color: 'rgb(100,100,110)' }
                                        }
                                      >
                                        {talentGrade !== null ? talentGrade.toFixed(1) : '—'}
                                      </button>
                                    )}
                                  </div>

                                  {/* My Grade — film and talent, 50/50 */}
                                  <div className="flex items-center justify-center py-3.5 px-0.5">
                                    <div
                                      className="w-full h-full flex items-center justify-center rounded text-base font-mono font-bold tabular-nums"
                                      style={
                                        myGrade !== null
                                          ? { backgroundColor: myGradeHeat.bg, color: myGradeHeat.color }
                                          : { color: 'rgb(100,100,110)' }
                                      }
                                    >
                                      {myGrade !== null ? myGrade.toFixed(1) : '—'}
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
                                      width={72}
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
            <OffBoardPanel
              offBoardProspects={offBoardProspects}
              onAddToDraftBoard={onAddToDraftBoard}
              onAddNext={addTopAvailable}
              onClearBoard={onClearDraftBoard}
            />
            <BoardBreakdownPanel
              userBoard={userBoard}
              consensusBoard={consensusBoard}
              allEligibleProspects={allEligibleProspects}
              position={position}
              consensusRankByClassName={consensusRankByClassName}
            />
          </div>
        </div>
    </div>
    </main>
  )
}
