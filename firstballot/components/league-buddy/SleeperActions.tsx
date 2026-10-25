'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { SuggestedTrades } from './trades/SuggestedTrades'
import { useAuth } from '@/lib/auth'
import { optimalLineup, parseScoringSlots } from './draft-order/maxPointsFor'
import type { TeamData } from './types'
import type { RosterProjections } from './RosterSection'

export interface SleeperConnection {
  rosterId: number
  heat: Record<string, number>
  historyCount: number
  limited: boolean
}
export function SleeperActions({
  leagueId,
  team,
  teams,
  projections,
  onConnect,
  onActionComplete,
}: {
  leagueId: string
  team: TeamData
  teams: TeamData[]
  projections?: RosterProjections
  onActionComplete?: () => Promise<void>
  onConnect: (data: SleeperConnection | null) => void
}) {
  const { user, loading: authLoading } = useAuth()
  const [connected, setConnected] = useState<SleeperConnection | null>(null)
  const [restoring, setRestoring] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [mode, setMode] = useState<'lineup' | null>(null)
  const [review, setReview] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const slots = parseScoringSlots(projections?.rosterPositions)
  const byeSet = new Set(projections?.byes ?? [])
  const missing = team.players.some(
    (p) => projections?.week[p.playerId] == null && !byeSet.has(p.playerId)
  )
  const healthy = team.players.filter(
    (p) => !byeSet.has(p.playerId) && !['Out', 'IR', 'Suspended'].includes(p.injury_status ?? '')
  )
  const best = optimalLineup(
    Object.fromEntries(
      healthy
        .filter((p) => projections?.week[p.playerId] != null)
        .map((p) => [p.playerId, projections!.week[p.playerId]])
    ),
    slots,
    (id) => healthy.find((p) => p.playerId === id)?.position
  )
  const starters = [...best.seated].sort((a, b) => a.slotIndex - b.slotIndex).map((p) => p.playerId)
  const canOptimize =
    !!projections &&
    !projections.loading &&
    !projections.error &&
    starters.length === slots.length &&
    slots.length > 0
  const ownTeam = connected?.rosterId === team.rosterId
  const button =
    'rounded-lg border border-slate-600 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700 disabled:opacity-40'
  async function request(action: string, extra: object = {}) {
    const response = await fetch('/api/sleeper/actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        leagueId,
        ...extra,
      }),
    })
    const result = await response.json()
    if (!response.ok) throw new Error(result.error || 'Sleeper request failed.')
    return result
  }
  useEffect(() => {
    if (authLoading) return
    setConnected(null)
    setMessage('')
    onConnect(null)
    setMode(null)
    if (!user) {
      setRestoring(false)
      return
    }
    setRestoring(true)
    let active = true
    request('status')
      .then((status) => {
        if (!status.saved) return { connected: false }
        if (status.expired) throw new Error('Sleeper connection expired. Replace it in Settings.')
        return request('restore')
      })
      .then((result) => {
        if (!active || !result.connected) return
        setConnected(result)
        onConnect(result)
      })
      .catch((e) => {
        if (active) setMessage(e.message)
      })
      .finally(() => {
        if (active) setRestoring(false)
      })
    return () => {
      active = false
    }
    // The parent remounts this view when the team or league changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leagueId, user?.id, authLoading])
  async function submit() {
    setBusy(true)
    setMessage('')
    setSubmitted(true)
    try {
      await request('lineup', {
        confirmed: true,
        rosterId: team.rosterId,
        week: projections?.currentWeek,
        starters,
        expectedStarters: team.starters,
      })
      setMessage('Lineup confirmed by Sleeper.')
      setMode(null)
      setReview(false)
      await onActionComplete?.().catch(() =>
        setMessage(
          'Sleeper confirmed the action, but the team refresh failed. Reload to see the latest roster.'
        )
      )
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'No confirmation. Check Sleeper before retrying.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <section aria-label="Sleeper actions" className="space-y-4 text-sm">
      <SuggestedTrades leagueId={leagueId} team={team} teams={teams} />
      <div className="flex flex-wrap items-center gap-3 border-t border-slate-800 pt-3">
        {connected ? (
          <button
            disabled={!ownTeam || busy || !canOptimize}
            title={
              !canOptimize
                ? 'Enough projected, eligible players to fill every starting slot are required.'
                : undefined
            }
            className={button}
            onClick={() => {
              setMode('lineup')
              setReview(false)
              setSubmitted(false)
            }}
          >
            Review optimized lineup
          </button>
        ) : (
          <span className="text-xs text-slate-400">
            {restoring
              ? 'Checking Sleeper connection…'
              : 'Connect Sleeper in Settings to send offers and manage lineups.'}
          </span>
        )}
        <Link className="text-xs text-slate-400 hover:text-white" href="/settings">
          Connection settings
        </Link>
      </div>
      {connected && !ownTeam && (
        <p className="text-xs text-amber-300">
          Select the team managed by this Sleeper account to take action.
        </p>
      )}
      {mode && (
        <div className="space-y-4 border-t border-white/10 pt-4">
          <h3 className="font-semibold text-white">Review lineup changes</h3>
          <p className="text-xs text-slate-400">
            Week {projections?.currentWeek} · {best.total.toFixed(1)} projected points. Sleeper
            checks game locks and slot eligibility when submitted.{' '}
            {missing &&
              'Players without forecasts are excluded; this is a partial-data comparison.'}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {starters.map((id, i) => (
              <div key={id} className="rounded bg-slate-900 p-2 text-xs text-slate-300">
                {projections?.rosterPositions.filter((s) => !['BN', 'IR', 'TAXI'].includes(s))[i]}:{' '}
                {team.players.find((p) => p.playerId === team.starters[i])?.playerName ?? 'Empty'} →{' '}
                <strong className="text-white">
                  {team.players.find((p) => p.playerId === id)?.playerName}
                </strong>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {!review ? (
              <button
                disabled={busy || !canOptimize}
                className={button}
                onClick={() => setReview(true)}
              >
                Review before submitting
              </button>
            ) : (
              <button
                disabled={busy || submitted}
                className="rounded-lg bg-blue-400 px-4 py-2 text-xs font-semibold text-slate-950 disabled:opacity-40"
                onClick={submit}
              >
                {busy ? 'Submitting…' : 'Confirm and update lineup'}
              </button>
            )}
            <button
              disabled={busy}
              className={button}
              onClick={() => {
                setMode(null)
                setReview(false)
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {message && (
        <p role="status" className="text-xs leading-relaxed text-blue-200">
          {message}
        </p>
      )}
    </section>
  )
}
