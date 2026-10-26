'use client'
import { useMemo, useState } from 'react'
import type { TeamData } from './types'
import { buildDraftOrder, formatRecord } from './draft-order/draftOrderBoard'
import type { MaxPointsForEntry } from './draft-order/maxPointsFor'
import { useStandingsOdds } from './useStandingsOdds'
export function LeagueStandingsSection({
  teams,
  selectedTeam,
  onTeamSelect,
  leagueId,
  isDynasty,
  draftOrder,
}: {
  teams: TeamData[]
  selectedTeam: TeamData
  onTeamSelect: (team: TeamData) => void
  leagueId: string
  isDynasty: boolean
  draftOrder: {
    maxPointsFor: Record<number, MaxPointsForEntry>
    projectedMaxPointsFor: Record<number, number>
    loading: boolean
    weeksCounted: number
    season: string
  }
}) {
  const [sort, setSort] = useState<'record' | 'maxpf' | 'projected' | 'odds'>('record')
  const { data, error, retry, odds } = useStandingsOdds(leagueId, teams)
  const complete =
    !draftOrder.loading &&
    draftOrder.weeksCounted > 0 &&
    teams.every((t) => draftOrder.maxPointsFor[t.rosterId])
  const projectedComplete =
    complete &&
    teams.every(
      (t) =>
        Number.isFinite(draftOrder.projectedMaxPointsFor[t.rosterId]) &&
        draftOrder.projectedMaxPointsFor[t.rosterId] > 0
    )
  const draft = useMemo(
    () =>
      complete
        ? buildDraftOrder(teams, draftOrder.maxPointsFor, draftOrder.projectedMaxPointsFor, 'maxpf')
        : [],
    [teams, draftOrder, complete]
  )
  const projected = useMemo(
    () =>
      projectedComplete
        ? buildDraftOrder(
            teams,
            draftOrder.maxPointsFor,
            draftOrder.projectedMaxPointsFor,
            'projected'
          )
        : [],
    [teams, draftOrder, projectedComplete]
  )
  const record = [...teams].sort(
    (a, b) =>
      (b.wins + (b.ties ?? 0) / 2) / Math.max(1, b.wins + b.losses + (b.ties ?? 0)) -
        (a.wins + (a.ties ?? 0) / 2) / Math.max(1, a.wins + a.losses + (a.ties ?? 0)) ||
      b.pointsFor - a.pointsFor
  )
  const probability = (id: number) => odds.find((o) => o.rosterId === id)?.playoffProbability
  const rows = [...record].sort((a, b) =>
    sort === 'odds'
      ? (probability(b.rosterId) ?? -1) - (probability(a.rosterId) ?? -1)
      : sort === 'maxpf'
        ? (draft.find((r) => r.rosterId === a.rosterId)?.pick ?? 99) -
          (draft.find((r) => r.rosterId === b.rosterId)?.pick ?? 99)
        : sort === 'projected'
          ? (projected.find((r) => r.rosterId === a.rosterId)?.pick ?? 99) -
            (projected.find((r) => r.rosterId === b.rosterId)?.pick ?? 99)
          : 0
  )
  const th = 'whitespace-nowrap px-3 py-3 text-left text-xs font-medium text-slate-400'
  const td = 'whitespace-nowrap px-3 py-3 text-sm tabular-nums text-slate-300'
  return (
    <section aria-label="League standings and draft race" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white">Standings</h2>
        <div
          className="flex gap-1 rounded-lg bg-slate-800/50 p-1"
          role="group"
          aria-label="Standings sort"
        >
          {(['record', ...(isDynasty ? ['maxpf', 'projected'] : []), 'odds'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSort(s as typeof sort)}
              aria-pressed={sort === s}
              className={`rounded-md px-3 py-1.5 text-xs ${sort === s ? 'bg-blue-400/15 text-blue-200' : 'text-slate-400'}`}
            >
              {s === 'record'
                ? 'Record'
                : s === 'maxpf'
                  ? 'Race to 1.01'
                  : s === 'projected'
                    ? 'Projected draft'
                    : 'Playoff odds'}
            </button>
          ))}
        </div>
      </div>
      <div
        role="region"
        aria-label="Unified standings table"
        tabIndex={0}
        className="max-h-[70dvh] overflow-auto rounded-xl border border-slate-700/60"
      >
        <table className="w-full text-left">
          <thead className="sticky top-0 z-10 bg-slate-900">
            <tr>
              <th className={th}>Rank</th>
              <th className={th}>Team</th>
              <th className={th}>Record</th>
              <th className={th}>PF</th>
              {isDynasty && (
                <>
                  <th className={th}>MaxPF</th>
                  <th className={th}>MaxPF slot</th>
                  <th className={th}>Gap to 1.01</th>
                  <th className={th}>Projected MaxPF</th>
                  <th className={th}>Projected slot</th>
                </>
              )}
              <th className={th}>Playoffs</th>
              <th className={th}>Grade</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {rows.map((t) => {
              const d = draft.find((r) => r.rosterId === t.rosterId),
                p = projected.find((r) => r.rosterId === t.rosterId),
                prob = probability(t.rosterId)
              return (
                <tr
                  key={t.rosterId}
                  className={
                    selectedTeam.rosterId === t.rosterId
                      ? 'bg-blue-400/10'
                      : 'hover:bg-slate-800/40'
                  }
                >
                  <td className={td}>#{record.findIndex((x) => x.rosterId === t.rosterId) + 1}</td>
                  <th scope="row" className="min-w-48 max-w-72 px-3 py-3">
                    <button
                      className="text-left text-sm font-semibold text-white hover:text-blue-300"
                      onClick={() => onTeamSelect(t)}
                    >
                      {t.teamName}
                      {selectedTeam.rosterId === t.rosterId && (
                        <span className="ml-2 text-[10px] text-blue-300">Selected</span>
                      )}
                    </button>
                  </th>
                  <td className={td}>{formatRecord(t.wins, t.losses, t.ties ?? 0)}</td>
                  <td className={td}>{t.pointsFor.toFixed(1)}</td>
                  {isDynasty && (
                    <>
                      <td className={td}>{d?.maxPointsFor.toFixed(1) ?? '—'}</td>
                      <td className={td}>{d?.label ?? '—'}</td>
                      <td className={td}>
                        {d && draft[0]
                          ? `+${(d.maxPointsFor - draft[0].maxPointsFor).toFixed(1)}`
                          : '—'}
                      </td>
                      <td className={td}>{p?.projectedMaxPointsFor.toFixed(1) ?? '—'}</td>
                      <td className={td}>{p?.label ?? '—'}</td>
                    </>
                  )}
                  <td className={td}>{prob == null ? '—' : `${prob.toFixed(1)}%`}</td>
                  <td className={td}>{t.grade}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {error && (
        <button onClick={() => retry()} className="text-xs text-amber-300">
          Playoff odds unavailable · Retry
        </button>
      )}
      <p className="text-xs leading-relaxed text-slate-500">
        {isDynasty
          ? `MaxPF through ${draftOrder.weeksCounted} weeks of ${draftOrder.season}. Slots follow original rosters, not traded-pick ownership. Projected MaxPF is the shared planning baseline; league playoff/draft rules can change final order. `
          : ''}
        {data
          ? `${data.spots} playoff spots · ${data.completed}/${data.end} completed weeks · 10,000 simulations. Division seeding and custom tiebreakers can change odds.`
          : 'Loading playoff settings…'}
      </p>
    </section>
  )
}
