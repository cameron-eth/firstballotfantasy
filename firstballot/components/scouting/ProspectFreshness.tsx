import { useMemo } from 'react'
import type { Prospect } from './types'

export function ProspectFreshness({ prospects }: { prospects: Prospect[] }) {
  const { latest, staleClasses } = useMemo(() => {
    const byClass = new Map<number, string>()
    let latest: string | null = null
    for (const prospect of prospects) {
      if (!prospect.updated_at) continue
      if (!latest || prospect.updated_at > latest) latest = prospect.updated_at
      const year = prospect.draft_year
      if (year != null && (!byClass.has(year) || prospect.updated_at > byClass.get(year)!)) byClass.set(year, prospect.updated_at)
    }
    const staleClasses = [...byClass.entries()]
      .filter(([year, updated]) => year >= Math.max(2027, new Date().getFullYear() + 1) && Date.now() - new Date(updated).getTime() > 14 * 86400000)
      .map(([year]) => year).sort()
    return { latest, staleClasses }
  }, [prospects])
  if (!latest) return null

  return (
    <p className="mb-3 text-xs text-muted-foreground font-mono">
      Latest scouting record edited {new Date(latest).toLocaleDateString()}
      {staleClasses.length > 0 && <span className="ml-2 text-amber-400">· {staleClasses.join(', ')} class data may be stale</span>}
    </p>
  )
}
