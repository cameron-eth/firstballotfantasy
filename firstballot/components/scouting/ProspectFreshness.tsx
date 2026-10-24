import { useMemo } from 'react'
import type { Prospect } from './types'

export function ProspectFreshness({ prospects }: { prospects: Prospect[] }) {
  const latest = useMemo(
    () => prospects.reduce<string | null>((current, prospect) =>
      prospect.updated_at && (!current || prospect.updated_at > current) ? prospect.updated_at : current, null),
    [prospects]
  )
  if (!latest) return null
  const ageDays = Math.floor((Date.now() - new Date(latest).getTime()) / 86400000)

  return (
    <p className="mb-3 text-xs text-muted-foreground font-mono">
      Scouting database last updated {new Date(latest).toLocaleDateString()}
      {ageDays > 14 && <span className="ml-2 text-amber-400">· Data may be stale</span>}
    </p>
  )
}
