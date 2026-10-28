'use client'
import { useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { Header } from '@/components/header'
import { useAuth } from '@/lib/auth'
import { useLeagueContext } from '@/lib/league-context'
import { PlayerTradingCard } from '@/components/players/PlayerTradingCard'
import type { DailyBallot } from '@/components/landing/DailyRankingDialog'
import { MAX_DAILY_BALLOTS } from '@/lib/community/rounds'

export function CommunityBallotPanel({
  data,
  round,
  saving,
  selected,
  error,
  onVote,
  onNext,
  onPrevious,
}: {
  data: DailyBallot
  round: number
  saving: boolean
  selected: string | null
  error: string
  onVote: (key: string) => void
  onNext: () => void
  onPrevious: () => void
}) {
  const winner = data.voted ? data.winner : selected
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)]">
      <section aria-label="Rank players" className="min-w-0">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">
            {data.pool === 'dynasty'
              ? 'Who would you build around?'
              : 'Who would you roster this season?'}
          </h2>
          <span className="text-xs tabular-nums text-slate-400">
            Comparison {round + 1} / {MAX_DAILY_BALLOTS}
          </span>
        </div>
        <p className="mb-5 text-sm text-slate-400">
          {data.pool === 'dynasty'
            ? 'Long-term dynasty value · Superflex · PPR. Compare future prospects with fellow prospects and current pros.'
            : 'Current-season value · 1QB · PPR. NFL players only for your redraft league.'}
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {data.choices.map((p) => (
            <div
              key={p.key}
              className={`transition-opacity ${winner && winner !== p.key ? 'opacity-50' : ''}`}
            >
              <PlayerTradingCard
                name={p.name}
                position={p.position}
                team={p.team}
                image={p.image}
                label={p.kind === 'prospect' ? `${p.year} prospect` : 'Current NFL'}
                selected={winner === p.key}
                busy={saving && winner === p.key}
                disabled={saving || data.voted}
                action={
                  saving && winner === p.key
                    ? 'Saving…'
                    : data.voted
                      ? winner === p.key
                        ? 'Your pick ✓'
                        : 'Not selected'
                      : 'Pick this player'
                }
                onAction={() => onVote(p.key)}
                imageHeight="h-56 sm:h-64"
              />
            </div>
          ))}
        </div>
        <p role="status" aria-live="polite" className="mt-4 min-h-6 text-sm text-emerald-300">
          {saving
            ? 'Saving your pick…'
            : data.voted
              ? 'Pick saved. Your vote contributes to the community model.'
              : ''}
        </p>
        {error && (
          <p role="alert" className="mb-3 text-sm text-red-300">
            {error}
          </p>
        )}
        <div className="flex items-center justify-between border-t border-slate-800 pt-4">
          <button
            onClick={onPrevious}
            disabled={saving || round === 0}
            className="text-sm text-slate-400 hover:text-white disabled:opacity-30"
          >
            ← Previous
          </button>
          {round < MAX_DAILY_BALLOTS - 1 ? (
            <button
              onClick={onNext}
              disabled={saving}
              className="rounded-lg bg-blue-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
            >
              {data.voted ? 'Next comparison →' : 'Skip this pair →'}
            </button>
          ) : (
            <p className="text-sm text-slate-400">That’s today’s set. New pairs tomorrow.</p>
          )}
        </div>
      </section>
      <section
        aria-label="Community board"
        className="min-w-0 border-t border-slate-800 pt-6 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0"
      >
        <h2 className="text-lg font-semibold text-white">
          {data.pool === 'dynasty' ? 'Prospect community board' : 'NFL community board'}
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-slate-400">
          {data.totalVotes.toLocaleString()} votes · Five comparisons unlock a provisional rank.
          Early rankings are still taking shape.
        </p>
        <ol className="mt-5 max-h-[580px] divide-y divide-slate-800 overflow-y-auto">
          {data.rankings.map((p) => (
            <li key={p.key} className="flex items-center gap-3 py-3">
              <span className="w-7 shrink-0 text-sm tabular-nums text-slate-500">
                {p.rank ?? '—'}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white">{p.name}</p>
                <p className="text-xs text-slate-400">
                  {p.position} · {p.team}
                  {p.year ? ` · ${p.year}` : ''}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold tabular-nums text-blue-300">{p.score}</p>
                <p className="text-[10px] text-slate-500">{p.comparisons} comparisons</p>
              </div>
            </li>
          ))}
        </ol>
        {!data.rankings.length && (
          <p className="py-8 text-sm text-slate-400">
            Be among the first to shape this board. Rankings appear as real votes arrive.
          </p>
        )}
        <details className="mt-4 text-xs text-slate-400">
          <summary className="cursor-pointer text-blue-300">
            How your votes shape the rankings
          </summary>
          <p className="mt-3 leading-relaxed">
            A Bradley–Terry model weighs head-to-head preferences. Beating stronger opponents
            matters more. Scores start at a neutral 1,500; scouting grades and KTC stay separate.
            Small samples and disconnected groups remain uncertain. Each comparison can be saved
            once per account per day.
          </p>
        </details>
      </section>
    </div>
  )
}

export function CommunityRankingSection() {
  const { user, loading } = useAuth()
  const { selectedLeagueId, isLoading: leagueLoading } = useLeagueContext()
  const [round, setRound] = useState(0)
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const endpoint = `/api/community-rankings?round=${round}${selectedLeagueId ? `&leagueId=${selectedLeagueId}` : ''}`
  const { data, error, isLoading, isValidating, mutate } = useSWR<DailyBallot>(
    user && !leagueLoading ? [endpoint, user.id] : null,
    async ([url]: [string, string]) => {
      const response = await fetch(url)
      if (!response.ok) throw new Error('Community rankings are unavailable. Please try again.')
      return response.json()
    },
    { revalidateOnFocus: true, shouldRetryOnError: false, keepPreviousData: true }
  )
  async function vote(winner: string) {
    if (!data || saving || data.voted) return
    setSelected(winner)
    setSaving(true)
    setMessage('')
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ day: data.day, pair: data.choices.map((p) => p.key), winner }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not save your pick.')
      await mutate(result, false)
    } catch {
      try {
        if ((await mutate())?.voted) return
      } catch {
        /* Preserve the choice for retry. */
      }
      setMessage('Could not confirm your pick. Try again; your vote will not be counted twice.')
    } finally {
      setSaving(false)
    }
  }
  function move(next: number) {
    setSelected(null)
    setMessage('')
    setRound(next)
  }
  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-8 pb-24 sm:px-6">
        <div className="mb-8 border-b border-slate-800 pb-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-blue-300">
            The community ballot
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-white">Community Rankings</h1>
          <p className="mt-2 text-sm text-slate-400">
            Your football instincts. A board built together.
          </p>
        </div>
        {loading || leagueLoading || (isLoading && !data) ? (
          <p role="status" className="text-slate-400">
            Loading comparisons…
          </p>
        ) : !user ? (
          <div className="rounded-xl border border-slate-700 p-8 text-center">
            <h2 className="text-xl font-semibold text-white">Help rank the next generation.</h2>
            <p className="my-4 text-sm text-slate-400">
              Choose between two players, then keep going. Your picks help shape the community
              rankings.
            </p>
            <Link
              href="/login"
              className="inline-block rounded-lg bg-blue-400 px-5 py-3 font-semibold text-slate-950"
            >
              Sign in to rank players
            </Link>
          </div>
        ) : error ? (
          <div role="alert" className="text-slate-400">
            <p>Could not load the community board.</p>
            <button onClick={() => mutate()} className="mt-3 text-blue-300">
              Try again
            </button>
          </div>
        ) : data ? (
          <div
            aria-busy={isValidating}
            className={`transition-opacity ${isValidating ? 'pointer-events-none opacity-60' : ''}`}
          >
            <CommunityBallotPanel
              key={`${selectedLeagueId}:${data.day}`}
              data={data}
              round={round}
              saving={saving}
              selected={selected}
              error={message}
              onVote={vote}
              onNext={() => move(round + 1)}
              onPrevious={() => move(round - 1)}
            />
          </div>
        ) : null}
      </main>
    </>
  )
}
