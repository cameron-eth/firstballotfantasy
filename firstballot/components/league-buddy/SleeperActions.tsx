'use client'
import { useEffect, useState } from 'react'
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
  const [token, setToken] = useState('')
  const [connected, setConnected] = useState<SleeperConnection | null>(null)
  const [open, setOpen] = useState(false)
  const [restoring, setRestoring] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [mode, setMode] = useState<'trade' | 'lineup' | null>(null)
  const [partner, setPartner] = useState('')
  const [give, setGive] = useState<string[]>([])
  const [receive, setReceive] = useState<string[]>([])
  const [review, setReview] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const other = teams.find((t) => t.rosterId === Number(partner))
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
        ...(action === 'connect' ? { token } : {}),
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
    onConnect(null)
    setToken('')
    setMode(null)
    if (!user) {
      setRestoring(false)
      return
    }
    setRestoring(true)
    let active = true
    request('restore')
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
  async function disconnect() {
    setBusy(true)
    try {
      await request('disconnect')
      setToken('')
      setConnected(null)
      onConnect(null)
      setMode(null)
      setOpen(true)
      setMessage('Saved Sleeper connection deleted.')
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Disconnect failed.')
    } finally {
      setBusy(false)
    }
  }
  async function connect() {
    setBusy(true)
    setMessage('')
    try {
      const result = await request('connect')
      setConnected(result)
      onConnect(result)
      setOpen(false)
      setToken('')
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Connection failed.')
    } finally {
      setBusy(false)
    }
  }
  async function submit() {
    setBusy(true)
    setMessage('')
    setSubmitted(true)
    try {
      const result = await request(mode!, {
        confirmed: true,
        rosterId: team.rosterId,
        ...(mode === 'trade'
          ? { partnerId: Number(partner), give, receive }
          : { week: projections?.currentWeek, starters, expectedStarters: team.starters }),
      })
      setMessage(
        mode === 'trade'
          ? `Trade sent to Sleeper (${result.trade.transaction_id}).`
          : 'Lineup confirmed by Sleeper.'
      )
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
  if (restoring) return null
  return (
    <section
      aria-label="Sleeper actions"
      className="rounded-xl border border-white/10 bg-slate-800/30 p-4 text-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        {!connected && (
          <div>
            <h2 className="font-semibold text-white">Connect Sleeper</h2>
            <p className="mt-1 text-xs text-slate-400">
              Save your connection to manage trades and lineups.
            </p>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {connected ? (
            <>
              <button
                disabled={!ownTeam || busy}
                className={button}
                onClick={() => {
                  setMode('trade')
                  setReview(false)
                  setSubmitted(false)
                }}
              >
                Propose trade
              </button>
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
              <button
                disabled={busy}
                className={button}
                aria-expanded={open}
                onClick={() => {
                  setOpen(!open)
                  setToken('')
                  setMessage('')
                }}
              >
                Settings
              </button>
            </>
          ) : (
            <button className={button} onClick={() => setOpen(!open)}>
              Connect Sleeper token
            </button>
          )}
        </div>
      </div>
      {!connected && user && message && (
        <button disabled={busy} className={`${button} mt-3`} onClick={disconnect}>
          Delete saved connection
        </button>
      )}
      {open && (
        <section
          aria-label="Sleeper connection settings"
          className="mt-4 space-y-3 border-t border-white/10 pt-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-semibold text-white">Connection settings</h3>
            <button
              className={button}
              onClick={() => {
                setOpen(false)
                setToken('')
              }}
            >
              Close settings
            </button>
          </div>
          {connected && (
            <p className="text-xs text-emerald-300">
              Connection saved. Paste a new token below to replace it.
            </p>
          )}
          <p className="max-w-2xl text-xs leading-relaxed text-slate-400">
            In Sleeper web, open DevTools → Network, choose a GraphQL request, and copy its
            authorization header. Your token is encrypted and saved to your First Ballot account so
            it survives refresh. Disconnect deletes the saved token; it does not revoke it at
            Sleeper. Never post it in chat.
          </p>
          <label className="block text-xs text-slate-300">
            Sleeper authorization token
            <input
              type="password"
              autoComplete="off"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="mt-2 block w-full rounded-lg border border-slate-600 bg-slate-950 p-2"
            />
          </label>
          <button disabled={!token.trim() || busy} className={button} onClick={connect}>
            {busy ? 'Saving…' : connected ? 'Replace saved token' : 'Save connection'}
          </button>
          {connected && (
            <button disabled={busy} className={`${button} ml-2`} onClick={disconnect}>
              Disconnect
            </button>
          )}
        </section>
      )}
      {connected && !ownTeam && (
        <p className="mt-3 text-xs text-amber-300">
          Select the team managed by this Sleeper account to take action.
        </p>
      )}
      {connected && ownTeam && !canOptimize && (
        <p className="mt-3 text-xs text-slate-400">
          Lineup optimization needs enough projected, eligible players to fill every starting slot.
        </p>
      )}
      {mode && (
        <div className="mt-4 space-y-4 border-t border-white/10 pt-4">
          <h3 className="font-semibold text-white">
            {mode === 'trade' ? 'Build a player trade' : 'Review lineup changes'}
          </h3>
          {mode === 'trade' ? (
            <>
              <label className="block text-xs text-slate-300">
                Trade partner
                <select
                  aria-label="Trade partner"
                  value={partner}
                  disabled={busy || review}
                  onChange={(e) => {
                    setPartner(e.target.value)
                    setReceive([])
                  }}
                  className="ml-3 rounded border border-slate-600 bg-slate-900 p-2"
                >
                  <option value="">Choose a team</option>
                  {teams
                    .filter((t) => t.rosterId !== team.rosterId)
                    .map((t) => (
                      <option key={t.rosterId} value={t.rosterId}>
                        {t.teamName}
                      </option>
                    ))}
                </select>
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  { label: 'You send', players: team.players, chosen: give, set: setGive },
                  {
                    label: 'You receive',
                    players: other?.players ?? [],
                    chosen: receive,
                    set: setReceive,
                  },
                ].map((side) => (
                  <fieldset
                    key={side.label}
                    disabled={busy || review}
                    className="max-h-56 space-y-2 overflow-auto rounded-lg border border-slate-700 p-3"
                  >
                    <legend className="px-1 text-xs text-slate-400">{side.label}</legend>
                    {side.players.map((p) => (
                      <label
                        key={p.playerId}
                        className="flex items-center gap-2 text-xs text-slate-300"
                      >
                        <input
                          type="checkbox"
                          checked={side.chosen.includes(p.playerId)}
                          onChange={(e) =>
                            side.set(
                              e.target.checked
                                ? [...side.chosen, p.playerId]
                                : side.chosen.filter((id) => id !== p.playerId)
                            )
                          }
                        />
                        {p.playerName} · {p.position}
                      </label>
                    ))}
                  </fieldset>
                ))}
              </div>
              {review && (
                <p className="text-sm text-blue-200">
                  Send{' '}
                  {team.players
                    .filter((p) => give.includes(p.playerId))
                    .map((p) => p.playerName)
                    .join(', ')}{' '}
                  to {other?.teamName} for{' '}
                  {other?.players
                    .filter((p) => receive.includes(p.playerId))
                    .map((p) => p.playerName)
                    .join(', ')}
                  .
                </p>
              )}
            </>
          ) : (
            <>
              <p className="text-xs text-slate-400">
                Week {projections?.currentWeek} · {best.total.toFixed(1)} projected points. Sleeper
                checks game locks and slot eligibility when submitted.{' '}
                {missing &&
                  'Players without forecasts are excluded; this is a partial-data comparison.'}
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {starters.map((id, i) => (
                  <div key={id} className="rounded bg-slate-900 p-2 text-xs text-slate-300">
                    {
                      projections?.rosterPositions.filter((s) => !['BN', 'IR', 'TAXI'].includes(s))[
                        i
                      ]
                    }
                    :{' '}
                    {team.players.find((p) => p.playerId === team.starters[i])?.playerName ??
                      'Empty'}{' '}
                    →{' '}
                    <strong className="text-white">
                      {team.players.find((p) => p.playerId === id)?.playerName}
                    </strong>
                  </div>
                ))}
              </div>
            </>
          )}
          <div className="flex flex-wrap gap-2">
            {!review ? (
              <button
                disabled={
                  busy ||
                  (mode === 'trade' && (!give.length || !receive.length || !other)) ||
                  (mode === 'lineup' && !canOptimize)
                }
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
                {busy
                  ? 'Submitting…'
                  : mode === 'trade'
                    ? 'Confirm and send trade'
                    : 'Confirm and update lineup'}
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
        <p role="status" className="mt-3 text-xs leading-relaxed text-blue-200">
          {message}
        </p>
      )}
    </section>
  )
}
