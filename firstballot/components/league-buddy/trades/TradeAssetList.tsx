'use client'
import { pickLabel } from '@/lib/picks-overview'
import type { PlayerData, TeamData } from '../types'
import type { OwnedPick } from '@/lib/sleeper-sdk/pick-inventory'
export interface OfferSide {
  players: string[]
  picks: string[]
  faab: number
}
export const emptySide = (): OfferSide => ({ players: [], picks: [], faab: 0 })
export function TradeAssetList({
  label,
  team,
  teams,
  picks,
  budget,
  side,
  onChange,
  disabled,
}: {
  label: string
  team: TeamData
  teams: TeamData[]
  picks: OwnedPick[]
  budget: number | null
  side: OfferSide
  onChange: (side: OfferSide) => void
  disabled: boolean
}) {
  const toggle = (key: 'players' | 'picks', id: string) =>
    onChange({
      ...side,
      [key]: side[key].includes(id) ? side[key].filter((v) => v !== id) : [...side[key], id],
    })
  return (
    <fieldset
      disabled={disabled}
      className="min-w-0 space-y-3 rounded-xl border border-slate-700 p-3"
    >
      <legend className="px-1 font-medium text-white">
        {label} · {team.teamName}
      </legend>
      <div className="max-h-56 space-y-2 overflow-y-auto">
        {team.players.map((p) => (
          <label key={p.playerId} className="flex gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={side.players.includes(p.playerId)}
              onChange={() => toggle('players', p.playerId)}
            />
            <span>
              {p.playerName} <span className="text-slate-500">{p.position}</span>
            </span>
          </label>
        ))}
        {picks
          .filter((p) => p.owner_id === team.rosterId)
          .map((p) => (
            <label key={p.id} className="flex gap-2 text-sm text-purple-200">
              <input
                type="checkbox"
                checked={side.picks.includes(p.id)}
                onChange={() => toggle('picks', p.id)}
              />
              <span>{pickAssetLabel(p, teams)}</span>
            </label>
          ))}
      </div>
      {budget !== null && (
        <label className="flex items-center gap-2 text-xs text-slate-400">
          FAAB ({budget} available)
          <input
            aria-label={`${label} FAAB`}
            className="w-20 rounded border border-slate-600 bg-slate-950 p-2 text-white"
            type="number"
            min={0}
            max={budget}
            step={1}
            value={side.faab}
            onChange={(e) => onChange({ ...side, faab: Number(e.target.value) })}
          />
        </label>
      )}
    </fieldset>
  )
}
/** A pick as a trade asset: the slot label (lib/picks-overview) plus its original team. */
export function pickAssetLabel(
  pick: OwnedPick,
  teams: TeamData[],
  slotByRoster: Record<number, number> = {}
) {
  return `${pickLabel(pick, slotByRoster)} · ${teams.find((t) => t.rosterId === pick.roster_id)?.teamName ?? `Roster ${pick.roster_id}`} original`
}
export function sideSummary(
  side: OfferSide,
  players: PlayerData[],
  picks: OwnedPick[],
  teams: TeamData[]
) {
  return (
    [
      ...side.players.map((id) => players.find((p) => p.playerId === id)?.playerName ?? id),
      ...side.picks.map((id) => {
        const p = picks.find((p) => p.id === id)
        return p ? pickAssetLabel(p, teams) : 'Unavailable pick'
      }),
      ...(side.faab ? [`${side.faab} FAAB`] : []),
    ].join(', ') || 'Nothing selected'
  )
}
