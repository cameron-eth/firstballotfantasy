'use client'
import useSWR from 'swr'
import { COMPETITIVE_STATES, type TeamPlacement } from '../competitiveState'
import { MetricTip } from '../MetricTip'
import type { TeamData } from '../types'
type Capital = {
  years: { year: number; total: number; byRound: { round: number; count: number }[] }[]
}
const fetchCapital = async (url: string): Promise<Capital> => {
  const r = await fetch(url)
  if (!r.ok) throw new Error('Draft picks unavailable')
  return r.json()
}
export function BuilderTeamSummary({
  team,
  placement,
  leagueId,
  isDynasty,
}: {
  team: TeamData
  placement?: TeamPlacement
  leagueId: string
  isDynasty: boolean
}) {
  const state = placement ? COMPETITIVE_STATES[placement.state] : null
  const { data, error, isLoading } = useSWR(
    isDynasty ? `/api/draft-capital?leagueId=${leagueId}&roster=${team.rosterId}` : null,
    fetchCapital,
    { refreshInterval: 300000 }
  )
  return (
    <div className="mx-auto mb-6 w-fit max-w-3xl rounded-xl border border-slate-600 bg-slate-900 px-5 py-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm font-semibold text-white">{team.teamName}</p>
        <span className="text-[10px] text-slate-500">Current team · live roster baseline</span>
      </div>
      <div className="flex flex-wrap gap-x-7 gap-y-3">
        {isDynasty && (
          <div>
            <p className="text-[10px] text-slate-400">
              <MetricTip label="Team state">
                {state?.description ?? 'Not enough roster data to determine state.'} Uses the same
                league-relative model as Overview and Audit; scenario targets do not change this
                baseline.
              </MetricTip>
            </p>
            <p className={`mt-1 text-lg font-semibold ${state?.text ?? 'text-slate-400'}`}>
              {state?.label ?? '—'}
            </p>
          </div>
        )}
        <div>
          <p className="text-[10px] text-slate-400">
            <MetricTip label="Core age">
              Average known age of the top 12 QB/RB/WR/TE assets by dynasty value, from the shared
              competitive-state model.
            </MetricTip>
          </p>
          <p className="mt-1 text-lg font-semibold text-white">
            {placement?.avgAge ? placement.avgAge.toFixed(1) : '—'}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-slate-400">Record</p>
          <p className="mt-1 text-lg font-semibold text-white">
            {team.wins}–{team.losses}
            {team.ties ? `–${team.ties}` : ''}
          </p>
        </div>
        {isDynasty && (
          <div>
            <p className="text-[10px] text-slate-400">
              <MetricTip label="Draft capital">
                Owned picks across the next three drafts, using league draft rounds and Sleeper
                traded-pick ownership. No projected pick slots or scenario trades are assumed.
              </MetricTip>
            </p>
            {error ? (
              <p className="mt-1 text-xs text-slate-400">Unavailable</p>
            ) : isLoading || !data ? (
              <p className="mt-1 text-slate-400">…</p>
            ) : (
              <div className="mt-1 flex gap-5">
                {data.years.map((y) => (
                  <div key={y.year}>
                    <p className="text-sm font-semibold text-white">
                      {y.year} · {y.total} picks
                    </p>
                    <p className="mt-1 text-[10px] text-slate-400">
                      {y.byRound.map((r) => `R${r.round}: ${r.count}`).join(' · ')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
