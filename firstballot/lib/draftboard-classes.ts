import type { Prospect } from '@/components/scouting/types'
import type { Draftboard } from '@/types/draftboard'

export function boardsToProspects(boards: Draftboard[], prospects: Prospect[]): Prospect[] {
  const byId = new Map(prospects.map((prospect) => [prospect.id, prospect]))
  const seen = new Set<number>()
  return boards.flatMap((board) => board.prospect_ids.flatMap((id) => {
    const prospect = byId.get(Number(id))
    if (!prospect || seen.has(prospect.id)) return []
    seen.add(prospect.id)
    return [prospect]
  }))
}

export function yearsToSave(boards: Draftboard[], prospects: Prospect[], years: number[], selectedYear: number): number[] {
  const byId = new Map(prospects.map((prospect) => [prospect.id, prospect.draft_year]))
  const legacyYear = boards.find((board) => board.prospect_ids.some((id) => byId.has(Number(id)) && byId.get(Number(id)) !== board.draft_year))?.draft_year
  return legacyYear === undefined ? [selectedYear] : [...years.filter((year) => year !== legacyYear), legacyYear]
}
