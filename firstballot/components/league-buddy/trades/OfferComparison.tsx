import { ktcValue } from '@/lib/sleeper-sdk'
import { PlayerTradingCard } from '@/components/players/PlayerTradingCard'
import type { OwnedPick } from '@/lib/sleeper-sdk/pick-inventory'
import type { PlayerData, TeamData } from '../types'
import { pickLabel, type OfferSide } from './TradeAssetList'

const portrait = (p: PlayerData) =>
  p.headshot_url || `https://sleepercdn.com/content/nfl/players/${p.playerId}.jpg`

const tierOf = (p: PlayerData) =>
  p.tierNumber && p.tierEmphasis
    ? {
        number: p.tierNumber,
        name: p.tier,
        emphasis: p.tierEmphasis,
        score: p.tierScore ?? undefined,
        rank: p.tierRank ?? undefined,
        positionRank: p.tierPositionRank,
        delta30: p.ktcDelta30,
      }
    : undefined

/** Combined KTC value of a side's players (picks and FAAB are not priced here). */
export function sideValue(side: OfferSide, players: PlayerData[], superflex: boolean) {
  return side.players.reduce((sum, id) => {
    const p = players.find((x) => x.playerId === id)
    return sum + ((p ? ktcValue(p, { superflex }) : undefined) ?? 0)
  }, 0)
}

function Side({
  label,
  tone,
  teamName,
  side,
  players,
  picks,
  teams,
  superflex,
  large,
}: {
  large: boolean
  label: string
  tone: string
  teamName: string
  side: OfferSide
  players: PlayerData[]
  picks: OwnedPick[]
  teams: TeamData[]
  superflex: boolean
}) {
  const sent = side.players
    .map((id) => players.find((p) => p.playerId === id))
    .filter((p): p is PlayerData => !!p)
  const sidePicks = side.picks
    .map((id) => picks.find((p) => p.id === id))
    .filter((p): p is OwnedPick => !!p)
  const total = sideValue(side, players, superflex)
  return (
    <section className="min-w-0 space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className={`text-[11px] font-semibold uppercase tracking-wide ${tone}`}>{label}</h3>
        <p className="truncate text-xs text-slate-400">{teamName}</p>
      </div>
      <div className={large ? 'grid grid-cols-1 gap-3' : 'grid grid-cols-2 gap-3 sm:grid-cols-3'}>
        {sent.map((player) => (
          <PlayerTradingCard
            key={player.playerId}
            compact={!large}
            imageHeight={large ? 'h-56 sm:h-64' : 'h-28'}
            name={player.playerName}
            position={player.position}
            team={player.team || 'FA'}
            image={portrait(player)}
            tier={tierOf(player)}
            label={`KTC ${ktcValue(player, { superflex })?.toLocaleString() ?? '—'}`}
          />
        ))}
        {sidePicks.map((pick) => (
          <div
            key={pick.id}
            className={`flex ${large ? 'min-h-[350px]' : 'min-h-[170px]'} flex-col justify-end rounded-[20px] border border-violet-400/40 bg-gradient-to-br from-violet-500/20 to-slate-950 p-4`}
          >
            <p className="text-[10px] uppercase tracking-wider text-violet-300">
              Draft pick · {pick.season}
            </p>
            <p className="mt-1 text-lg font-bold text-white">{pickLabel(pick, teams)}</p>
          </div>
        ))}
        {side.faab > 0 && (
          <div
            className={`flex ${large ? 'min-h-[350px]' : 'min-h-[170px]'} flex-col justify-end rounded-[20px] border border-emerald-400/40 bg-gradient-to-br from-emerald-500/15 to-slate-950 p-4`}
          >
            <p className="text-[10px] uppercase tracking-wider text-emerald-300">FAAB</p>
            <p className="mt-1 text-lg font-bold text-white">${side.faab}</p>
          </div>
        )}
        {!sent.length && !sidePicks.length && !side.faab && (
          <p className="col-span-full rounded-xl border border-dashed border-white/15 p-6 text-center text-sm text-slate-400">
            Nothing selected
          </p>
        )}
      </div>
      {total > 0 && (
        <p className="text-xs tabular-nums text-slate-400">KTC {total.toLocaleString()}</p>
      )}
    </section>
  )
}

/** The review step: both sides as cards, with the value gap between them. */
export function OfferComparison({
  give,
  receive,
  team,
  other,
  picks,
  teams,
  superflex,
}: {
  give: OfferSide
  receive: OfferSide
  team: TeamData
  other: TeamData
  picks: OwnedPick[]
  teams: TeamData[]
  superflex: boolean
}) {
  const gap =
    sideValue(receive, other.players, superflex) - sideValue(give, team.players, superflex)
  const count = (side: OfferSide) =>
    side.players.length + side.picks.length + (side.faab > 0 ? 1 : 0)
  // One-for-one reads like the head-to-head ballot: two full-size cards.
  const large = count(give) === 1 && count(receive) === 1
  return (
    <div className="space-y-4">
      <div className="grid gap-6 md:grid-cols-2">
        <Side
          label="You send"
          tone="text-orange-300"
          teamName={team.teamName}
          side={give}
          players={team.players}
          picks={picks}
          teams={teams}
          superflex={superflex}
          large={large}
        />
        <Side
          label="You receive"
          tone="text-emerald-300"
          teamName={other.teamName}
          side={receive}
          players={other.players}
          picks={picks}
          teams={teams}
          superflex={superflex}
          large={large}
        />
      </div>
      {gap !== 0 && (
        <p className="text-center text-xs text-slate-400">
          {gap > 0 ? 'You gain' : 'You give up'}{' '}
          <span
            className={gap > 0 ? 'font-semibold text-emerald-300' : 'font-semibold text-orange-300'}
          >
            {Math.abs(gap).toLocaleString()} KTC
          </span>{' '}
          in player value
        </p>
      )}
    </div>
  )
}
