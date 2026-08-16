'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import { Plus } from 'lucide-react'
import type { Prospect } from './types'
import { getPlayerImageUrl, toBoardPlayer } from './board-player'

/** Rows rendered in the "not on board" list before the user has to search. */
const OFF_BOARD_VISIBLE_LIMIT = 40

interface OffBoardPanelProps {
  /** Eligible prospects for the active position tab that are not on the board. */
  offBoardProspects: Prospect[]
  onAddToDraftBoard: (prospect: Prospect) => void
  onAddNext: () => void
  onClearBoard: () => void
}

/**
 * The "Prospects Not On Board" list plus Quick Actions. Owns its own search box
 * and image-error set — nothing above it needs either.
 */
export function OffBoardPanel({
  offBoardProspects,
  onAddToDraftBoard,
  onAddNext,
  onClearBoard,
}: OffBoardPanelProps) {
  const [search, setSearch] = useState('')
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set())

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return offBoardProspects
    return offBoardProspects.filter((p) =>
      `${p.name} ${p.school} ${p.position}`.toLowerCase().includes(q)
    )
  }, [offBoardProspects, search])

  return (
    <>
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="font-mono font-bold text-foreground">Prospects Not On Board</h3>
          <span className="text-xs text-muted-foreground">{filtered.length}</span>
        </div>

        <div className="p-3 border-b border-border">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search available prospects..."
            className="w-full h-9 rounded bg-background border border-border px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40"
          />
        </div>

        <div className="max-h-[340px] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-4 text-xs text-muted-foreground">
              {search
                ? 'No matching available prospects.'
                : 'All available prospects are on your board.'}
            </div>
          ) : (
            filtered.slice(0, OFF_BOARD_VISIBLE_LIMIT).map((prospect) => {
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
                    <div className="text-sm font-medium text-foreground truncate">{p.name}</div>
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
          {filtered.length > OFF_BOARD_VISIBLE_LIMIT && (
            <div className="px-3 py-2 text-[10px] text-muted-foreground">
              Showing first {OFF_BOARD_VISIBLE_LIMIT} of {filtered.length} — search to narrow.
            </div>
          )}
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="font-mono font-bold text-foreground mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onAddNext}
            className="px-3 py-2 text-xs rounded bg-secondary text-secondary-foreground hover:bg-secondary/80"
          >
            Add Next
          </button>
          <button
            onClick={onClearBoard}
            className="px-3 py-2 text-xs rounded bg-secondary text-secondary-foreground hover:bg-secondary/80"
          >
            Clear Board
          </button>
        </div>
      </div>
    </>
  )
}
