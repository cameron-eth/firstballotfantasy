'use client'

import { Badge } from '@/components/ui/badge'

interface ComparisonBadgesProps {
  comparisons: string | null
  maxDisplay?: number
  size?: 'sm' | 'md'
}

interface ParsedComp {
  name: string
  year?: string
}

function parseComparison(comp: string): ParsedComp {
  // Parse format like "Marvin Harrison Jr. ('24, Rd1, Arizona)" or "Bijan Robinson ('23, Rd1, Atlanta)"
  // Extract just the name - everything before the opening parenthesis
  const match = comp.match(/^(.+?)\s*\(/)
  if (match) {
    return {
      name: match[1].trim(),
    }
  }
  // If no parentheses, just return the name as-is
  return { name: comp.trim() }
}

function splitComparisons(comparisons: string): string[] {
  // Split by "), " which separates each comparison entry
  // Format: "Name ('YY, RdX, Team), Name2 ('YY, RdX, Team2)"
  // After splitting, we might have a trailing entry without "), " so handle that
  if (comparisons.includes('), ')) {
    const parts = comparisons.split('), ')
    // Add back the closing paren to all but the last one
    return parts.map((part, idx) => {
      if (idx < parts.length - 1) {
        return part + ')'
      }
      return part
    })
  }
  // Fallback: if no "), " pattern, try regular comma split
  return comparisons.split(', ')
}

function getYearColor(year?: string): string {
  if (!year) return 'bg-slate-500/20 text-slate-300 border-slate-500/30'
  const yearNum = parseInt(year)
  const currentYear = new Date().getFullYear()
  const yearsAgo = currentYear - yearNum

  // Recent drafts (last 2 years) - amber/gold
  if (yearsAgo <= 2) {
    return 'bg-amber-500/20 text-amber-300 border-amber-500/40'
  }
  // 3-5 years ago - blue
  if (yearsAgo <= 5) {
    return 'bg-blue-500/20 text-blue-300 border-blue-500/40'
  }
  // Older - green
  return 'bg-green-500/20 text-green-300 border-green-500/40'
}

export function ComparisonBadges({ comparisons, maxDisplay, size = 'sm' }: ComparisonBadgesProps) {
  if (!comparisons) return null

  // Split comparisons properly (handles format with parentheses)
  const comps = splitComparisons(comparisons)
  // Apply maxDisplay limit if specified
  const limitedComps = maxDisplay ? comps.slice(0, maxDisplay) : comps
  const parsed = limitedComps.map(parseComparison)

  const sizeClasses = size === 'sm' ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] px-2 py-0.5'

  return (
    <div className="flex flex-wrap gap-1 overflow-hidden">
      {parsed.map((comp, idx) => (
        <Badge
          key={idx}
          variant="outline"
          className="bg-slate-600/30 text-slate-300 border-slate-500/40 hover:border-slate-400/60 hover:bg-slate-600/50 transition-all max-w-full"
        >
          <span className="font-medium truncate block">{comp.name}</span>
        </Badge>
      ))}
    </div>
  )
}

export function ComparisonList({ comparisons }: { comparisons: string | null }) {
  if (!comparisons) {
    return <span className="text-gray-500 text-sm">No comparisons available</span>
  }

  const comps = splitComparisons(comparisons)
  const parsed = comps.map(parseComparison)

  return (
    <div className="space-y-2">
      {parsed.map((comp, idx) => (
        <div
          key={idx}
          className="flex items-center justify-between p-2.5 rounded-lg border bg-slate-700/50 border-slate-600/50 hover:border-slate-500/70 transition-all"
        >
          <span className="text-white font-semibold">{comp.name}</span>
        </div>
      ))}
    </div>
  )
}
