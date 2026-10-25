'use client'
import { useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { useAuth } from '@/lib/auth'
import { tradeOpportunities } from '@/lib/sleeper-sdk/trade-opportunities'
import type { TradeInventory } from '@/lib/sleeper-sdk/trade-inventory'
import type { PlayerData, TeamData } from '../types'
import { TradeAssetList, emptySide, sideSummary, pickLabel, type OfferSide } from './TradeAssetList'
const button =
  'rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-40'
export function PlayerTradeModal({
  player,
  team,
  teams,
  leagueId,
  onClose,
  initialOffer,
}: {
  player: PlayerData
  team: TeamData
  teams: TeamData[]
  leagueId: string
  onClose: () => void
  initialOffer?: { partnerId: number; playerId: string }
}) {
  const { user } = useAuth()
  const [partner, setPartner] = useState<number | null>(initialOffer?.partnerId ?? null)
  const [give, setGive] = useState<OfferSide>({ ...emptySide(), players: [player.playerId] })
  const [receive, setReceive] = useState<OfferSide>(() => ({
    ...emptySide(),
    players: initialOffer ? [initialOffer.playerId] : [],
  }))
  const [query, setQuery] = useState('')
  const [assetType, setAssetType] = useState('players')
  const [review, setReview] = useState(Boolean(initialOffer))
  const [busy, setBusy] = useState(false)
  const [attempted, setAttempted] = useState(false)
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState(false)
  const {
    data: inventory,
    error,
    mutate,
    isLoading,
  } = useSWR<TradeInventory>(`/api/trade-inventory?leagueId=${leagueId}`, async (url: string) => {
    const r = await fetch(url)
    if (!r.ok) throw new Error('Could not load picks and FAAB.')
    return r.json()
  })
  const {
    data: connection,
    error: connectionError,
    isLoading: connecting,
  } = useSWR(
    user ? ['trade-connection', leagueId, user.id] : null,
    async () => {
      const r = await fetch('/api/sleeper/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restore', leagueId }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'Connection unavailable.')
      return data
    },
    { revalidateOnFocus: false }
  )
  const other = teams.find((t) => t.rosterId === partner)
  const candidates = inventory
    ? tradeOpportunities(player, team, teams, inventory.superflex).filter((c) =>
        `${c.target.playerName} ${c.team.teamName} ${c.target.position}`
          .toLowerCase()
          .includes(query.toLowerCase())
      )
    : []
  const validSide = (side: OfferSide, budget: number | null | undefined) =>
    side.players.length + side.picks.length + (side.faab > 0 ? 1 : 0) > 0 &&
    Number.isInteger(side.faab) &&
    side.faab >= 0 &&
    (!side.faab || (budget != null && side.faab <= budget))
  const pickCandidates = (inventory?.picks ?? []).filter(
    (p) =>
      p.owner_id !== team.rosterId &&
      teams.some((t) => t.rosterId === p.owner_id) &&
      `${pickLabel(p, teams)} ${teams.find((t) => t.rosterId === p.owner_id)?.teamName}`
        .toLowerCase()
        .includes(query.toLowerCase())
  )
  const canReview =
    inventory &&
    other &&
    validSide(give, inventory.faab[team.rosterId]) &&
    validSide(receive, inventory.faab[other.rosterId])
  const canSend = connection?.connected && connection.rosterId === team.rosterId
  async function submit() {
    if (!canReview || !canSend || attempted) return
    setBusy(true)
    setAttempted(true)
    setMessage('')
    try {
      const r = await fetch('/api/sleeper/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'trade',
          leagueId,
          rosterId: team.rosterId,
          partnerId: other.rosterId,
          give: give.players,
          receive: receive.players,
          givePicks: give.picks,
          receivePicks: receive.picks,
          giveFaab: give.faab,
          receiveFaab: receive.faab,
          confirmed: true,
        }),
      })
      const result = await r.json()
      if (!r.ok)
        throw new Error(result.error || 'No confirmation. Check Sleeper before trying again.')
      setSuccess(true)
      setMessage(
        `Offer sent to ${other.teamName}. Sleeper confirmation: ${result.trade.transaction_id}`
      )
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : 'No confirmation. Check Sleeper before trying again.'
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose()
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-5xl sm:max-w-5xl overflow-y-auto border-slate-700 bg-slate-950 text-slate-200">
        <DialogHeader>
          <DialogTitle>
            {review ? 'Confirm suggested trade' : `Trade opportunities · ${player.playerName}`}
          </DialogTitle>
          <DialogDescription>
            Explore players and owned picks, build an offer, then review before sending to Sleeper.
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <p>Loading league assets…</p>
        ) : error ? (
          <p role="alert">
            Picks and FAAB unavailable.{' '}
            <button className={button} onClick={() => mutate()}>
              Retry
            </button>
          </p>
        ) : (
          inventory && (
            <>
              {!partner ? (
                <>
                  <p className="text-xs text-slate-400">
                    Player matches use {inventory.superflex ? 'superflex' : '1QB'} KTC values and
                    league-relative positional depth. These are starting points, not acceptance
                    predictions. Pick slots and values are not assumed.
                  </p>
                  <div className="flex gap-2" role="group" aria-label="Trade target type">
                    <button
                      className={button}
                      aria-pressed={assetType === 'players'}
                      onClick={() => setAssetType('players')}
                    >
                      Players
                    </button>
                    {inventory.dynasty && (
                      <button
                        className={button}
                        aria-pressed={assetType === 'picks'}
                        onClick={() => setAssetType('picks')}
                      >
                        Draft picks
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <input
                      aria-label="Search trade opportunities"
                      placeholder="Search players, teams, positions or pick year"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-900 p-2"
                    />
                    <select
                      aria-label="Build a trade with team"
                      value=""
                      onChange={(e) => setPartner(Number(e.target.value))}
                      className="max-w-full rounded-lg bg-slate-900 p-2"
                    >
                      <option value="">Choose a team for players / picks</option>
                      {teams
                        .filter((t) => t.rosterId !== team.rosterId)
                        .map((t) => (
                          <option value={t.rosterId} key={t.rosterId}>
                            {t.teamName}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="max-h-[50vh] divide-y divide-slate-800 overflow-auto">
                    {assetType === 'players' &&
                      candidates.slice(0, 50).map(({ team: owner, target, value, reason }) => (
                        <button
                          key={target.playerId}
                          className="flex w-full items-center gap-3 p-3 text-left hover:bg-slate-900"
                          onClick={() => {
                            setPartner(owner.rosterId)
                            setReview(true)
                            setReceive({ ...emptySide(), players: [target.playerId] })
                          }}
                        >
                          <img
                            alt=""
                            className="h-14 w-14 rounded-lg bg-slate-800 object-contain"
                            src={
                              target.headshot_url ||
                              `https://sleepercdn.com/content/nfl/players/${target.playerId}.jpg`
                            }
                          />
                          <span className="min-w-0 flex-1">
                            <strong className="block">
                              {target.playerName}{' '}
                              <span className="text-xs text-slate-400">{target.position}</span>
                            </strong>
                            <span className="block text-xs text-slate-400">
                              {owner.teamName} · {reason}
                            </span>
                          </span>
                          <span className="shrink-0 text-xs text-slate-400">
                            KTC {value ? value.toLocaleString() : '—'}
                          </span>
                        </button>
                      ))}
                    {assetType === 'players' && !candidates.length && (
                      <p className="py-8 text-sm text-slate-400">
                        No matching players. Choose a team above to explore picks.
                      </p>
                    )}
                    {assetType === 'picks' &&
                      pickCandidates.map((p) => (
                        <button
                          key={p.id}
                          className="block w-full p-3 text-left hover:bg-slate-900"
                          onClick={() => {
                            setPartner(p.owner_id)
                            setReview(true)
                            setReceive({ ...emptySide(), picks: [p.id] })
                          }}
                        >
                          <strong className="block text-purple-200">{pickLabel(p, teams)}</strong>
                          <span className="text-xs text-slate-400">
                            Held by {teams.find((t) => t.rosterId === p.owner_id)?.teamName} · slot
                            undetermined
                          </span>
                        </button>
                      ))}
                    {assetType === 'picks' && !pickCandidates.length && (
                      <p className="py-8 text-sm text-slate-400">No matching picks.</p>
                    )}
                  </div>
                </>
              ) : (
                other && (
                  <>
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">Offer to {other.teamName}</h3>
                      <button
                        className={button}
                        disabled={busy || attempted}
                        onClick={() => {
                          setPartner(null)
                          setReceive(emptySide())
                          setReview(false)
                        }}
                      >
                        Other opportunities
                      </button>
                    </div>
                    {!review && (
                      <div className="grid gap-3 md:grid-cols-2">
                        <TradeAssetList
                          label="You send"
                          team={team}
                          teams={teams}
                          picks={inventory.picks}
                          budget={inventory.faab[team.rosterId] ?? null}
                          side={give}
                          onChange={setGive}
                          disabled={review || busy || attempted}
                        />
                        <TradeAssetList
                          label="You receive"
                          team={other}
                          teams={teams}
                          picks={inventory.picks}
                          budget={inventory.faab[other.rosterId] ?? null}
                          side={receive}
                          onChange={setReceive}
                          disabled={review || busy || attempted}
                        />
                      </div>
                    )}
                    {review && (
                      <div className="space-y-2 rounded-lg border border-blue-400/30 bg-blue-400/5 p-4 text-sm">
                        <p>
                          <strong>You send:</strong>{' '}
                          {sideSummary(give, team.players, inventory.picks, teams)}
                        </p>
                        <p>
                          <strong>You receive:</strong>{' '}
                          {sideSummary(receive, other.players, inventory.picks, teams)}
                        </p>
                        <p className="text-xs text-slate-400">
                          This sends a real offer to {other.teamName}. Sleeper checks league
                          restrictions; ownership and FAAB are rechecked before submission.
                        </p>
                      </div>
                    )}
                    {!canSend && (
                      <p className="text-sm text-slate-400">
                        {connecting
                          ? 'Checking Sleeper connection…'
                          : connectionError?.message ||
                            (connection?.connected
                              ? 'Select the roster managed by your connected Sleeper account.'
                              : 'Connect Sleeper to send this offer.')}{' '}
                        <Link href="/settings" className="text-blue-300 underline">
                          Settings
                        </Link>
                      </p>
                    )}
                    <div className="flex gap-2">
                      {!review ? (
                        <button
                          className={button}
                          disabled={!canReview}
                          onClick={() => setReview(true)}
                        >
                          Review offer
                        </button>
                      ) : (
                        <>
                          <button
                            className={button}
                            disabled={busy || attempted}
                            onClick={() => setReview(false)}
                          >
                            Customize offer
                          </button>
                          <button
                            className="rounded-lg bg-blue-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-40"
                            disabled={!canSend || !canReview || busy || attempted}
                            onClick={submit}
                          >
                            {busy ? 'Sending…' : success ? 'Offer sent' : 'Confirm and send trade'}
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )
              )}
            </>
          )
        )}
        {message && (
          <p role="status" className="text-sm text-blue-200">
            {message}
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}
