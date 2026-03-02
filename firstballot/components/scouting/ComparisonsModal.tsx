'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Target, Calendar, Ruler, Weight, Activity } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PlayerHeadshot } from '@/components/ui/player-headshot'
import { createPortal } from 'react-dom'
import type { Prospect } from './types'

interface ComparisonsModalProps {
  prospect: Prospect | null
  onClose: () => void
  getProspectTier: (rank: number, tier?: string | null) => string
  getTierColor: (tier: string) => string
  getPositionColor: (position: string) => string
  hitRateData: Record<
    string,
    Record<
      string,
      { elite: number; tier1: number; tier2: number; startable: number; streamer: number }
    >
  >
}

export function ComparisonsModal({
  prospect,
  onClose,
  getProspectTier,
  getTierColor,
  getPositionColor,
  hitRateData,
}: ComparisonsModalProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  if (!mounted) return null
  if (!prospect) return null

  const tier = getProspectTier(prospect.rank, prospect.tier)
  const position = prospect.position
  const hitRate = hitRateData[position]?.[tier]
  const isCollege = Number(prospect.draft_year || 0) >= 2025

  const rawComps = prospect.nfl_comparisons || ''
  const pieces = rawComps
    ? rawComps.includes('), ')
      ? rawComps.split('), ').map((part, idx, arr) => (idx < arr.length - 1 ? `${part})` : part))
      : rawComps.split(',')
    : []
  const compNames = Array.from(
    new Set(
      pieces
        .map((part) => {
          const match = part.trim().match(/^(.+?)\s*\(/)
          return (match ? match[1] : part).trim()
        })
        .filter(Boolean)
    )
  )

  const highEndComps = compNames.slice(0, 1)
  const midRangeComps = compNames.slice(1, 2)
  const lowEndComps = compNames.slice(2)

  const formatHeight = (inches: number | null | undefined): string | null => {
    if (!inches || !Number.isFinite(inches)) return null
    const feet = Math.floor(inches / 12)
    const rem = Math.round(inches % 12)
    return `${feet}'${rem}"`
  }

  const forty =
    prospect.college_stats && typeof prospect.college_stats === 'object'
      ? Number(
          (prospect.college_stats as Record<string, number | string>).forty_time ??
            (prospect.college_stats as Record<string, number | string>)['40yd']
        )
      : null
  const fortyTime = Number.isFinite(forty) ? forty : null

  return createPortal(
    <AnimatePresence>
      {prospect && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
          />

          <div className="fixed inset-0 z-[60] p-3 md:p-6 flex items-center justify-center pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="pointer-events-auto w-full max-w-3xl max-h-[90vh] bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="relative p-4 border-b bg-secondary/30 border-border">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-secondary transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>

              <div className="flex items-start gap-4 mt-4">
                <div className="w-24 h-24 rounded-lg bg-secondary overflow-hidden flex-shrink-0 border border-border">
                  <PlayerHeadshot
                    playerName={prospect.name}
                    headshotUrl={prospect.headshot_url}
                    espnId={prospect.espn_id}
                    size={96}
                    className="w-full h-full rounded-none border-0 shadow-none"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={cn(
                        'px-2 py-0.5 text-[10px] font-bold uppercase rounded border',
                        getTierColor(tier)
                      )}
                    >
                      {tier}
                    </span>
                    <span
                      className={cn(
                        'px-2 py-0.5 text-[10px] font-bold uppercase rounded border',
                        `${getPositionColor(position)}/30 text-slate-200 border-slate-500/30`
                      )}
                    >
                      {position}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-foreground mb-1">{prospect.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    {prospect.school} | {prospect.draft_year || 'Unknown'} Class
                  </p>
                </div>

                <div className="text-right">
                  <div className="text-3xl font-mono font-bold text-primary">
                    {Number(prospect.overall_grade || 0).toFixed(1)}
                  </div>
                  <div className="text-[10px] text-muted-foreground uppercase">Grade</div>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {formatHeight(prospect.height) && (
                  <div className="bg-secondary/30 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Ruler className="w-3 h-3 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground uppercase">Height</span>
                    </div>
                    <div className="text-lg font-mono font-bold text-foreground">
                      {formatHeight(prospect.height)}
                    </div>
                  </div>
                )}
                {prospect.weight && prospect.weight > 0 && (
                  <div className="bg-secondary/30 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Weight className="w-3 h-3 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground uppercase">Weight</span>
                    </div>
                    <div className="text-lg font-mono font-bold text-foreground">{prospect.weight} lbs</div>
                  </div>
                )}
                {fortyTime && (
                  <div className="bg-secondary/30 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Activity className="w-3 h-3 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground uppercase">40-Yard</span>
                    </div>
                    <div className="text-lg font-mono font-bold text-foreground">{fortyTime.toFixed(2)}s</div>
                  </div>
                )}
                <div className="bg-secondary/30 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="w-3 h-3 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground uppercase">Class</span>
                  </div>
                  <div className="text-lg font-mono font-bold text-foreground">
                    {prospect.draft_year || '-'}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-bold text-foreground">Historical Comps</h3>
                {compNames.length === 0 ? (
                  <div className="rounded-lg border border-border/70 bg-secondary/20 p-3 text-sm text-muted-foreground">
                    No comparisons available yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    <CompBucket title="High-End Comp" names={highEndComps} tone="emerald" />
                    <CompBucket title="Mid-Range Comp" names={midRangeComps} tone="cyan" />
                    <CompBucket title="Low-End Comps" names={lowEndComps} tone="rose" />
                  </div>
                )}
              </div>

              {hitRate && (
                <div className="rounded-lg border border-border/70 bg-secondary/20 p-4">
                  <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                    <Target className="w-4 h-4 text-primary" />
                    Hit Rate Lens
                  </h3>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Elite</span>
                      <span className="text-amber-400 font-semibold">{hitRate.elite}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tier 1</span>
                      <span className="text-blue-400 font-semibold">{hitRate.tier1}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tier 2</span>
                      <span className="text-emerald-400 font-semibold">{hitRate.tier2}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Startable</span>
                      <span className="text-purple-400 font-semibold">{hitRate.startable}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Streamer</span>
                      <span className="text-orange-400 font-semibold">{hitRate.streamer}%</span>
                    </div>
                  </div>
                </div>
              )}

              {isCollege && (
                <div className="bg-primary/10 border border-primary/30 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <span className="text-sm text-foreground">
                      Upcoming {prospect.draft_year} prospect. NFL outcomes are projection-based.
                    </span>
                  </div>
                </div>
              )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
    ,
    document.body
  )
}

function CompBucket({
  title,
  names,
  tone,
}: {
  title: string
  names: string[]
  tone: 'emerald' | 'cyan' | 'rose'
}) {
  const toneClasses: Record<typeof tone, string> = {
    emerald: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    cyan: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300',
    rose: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
  }
  return (
    <div className="rounded-lg border border-border/70 bg-secondary/20 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">{title}</span>
        <span className={cn('text-[10px] px-2 py-0.5 border rounded-full', toneClasses[tone])}>
          {names.length}
        </span>
      </div>
      {names.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {names.map((name) => (
            <div key={`${title}-${name}`} className="inline-flex items-center gap-2">
              <PlayerHeadshot
                playerName={name}
                size={38}
                className="border-2 border-border/70 bg-secondary shadow-sm"
              />
              <span className="text-sm text-foreground">{name}</span>
            </div>
          ))}
        </div>
      ) : (
        <span className="text-xs text-muted-foreground">No comps in this range</span>
      )}
    </div>
  )
}
