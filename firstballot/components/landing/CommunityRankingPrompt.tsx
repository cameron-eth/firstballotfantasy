'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { ArrowRight, X } from 'lucide-react'
import { useAuth } from '@/lib/auth'

type Choice = { key: string; name: string; detail: string; image: string | null }
type Matchup = { pool: 'nfl' | 'prospect'; pairKey: string; choices: [Choice, Choice]; counts: Record<string, number> }

async function loadMatchups(url: string): Promise<{ matchups: Matchup[]; enabled: boolean }> {
  const response = await fetch(url)
  if (!response.ok) throw new Error('Rankings unavailable')
  return response.json()
}

const dismissKey = 'firstballot:community-ranking-dismissed-until'

export function CommunityRankingPrompt() {
  const { user } = useAuth()
  const [dismissed, setDismissed] = useState(true)
  const [pool, setPool] = useState<'prospect' | 'nfl'>('prospect')
  const [selected, setSelected] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [seed, setSeed] = useState(0)
  const { data, error, mutate } = useSWR(`/api/community-rankings?seed=${seed}`, loadMatchups)

  useEffect(() => {
    try {
      setDismissed(Number(localStorage.getItem(dismissKey) || 0) > Date.now())
      const nextSeed = (Number(sessionStorage.getItem('firstballot:ranking-seed') || 0) + 1) % 1000000000
      sessionStorage.setItem('firstballot:ranking-seed', String(nextSeed))
      setSeed(nextSeed)
    }
    catch { setDismissed(false) }
  }, [])
  const matchup = data?.matchups.find((item) => item.pool === pool) || data?.matchups[0]
  if (dismissed || !matchup || error || !data?.enabled) return null

  function dismiss() {
    try { localStorage.setItem(dismissKey, String(Date.now() + 7 * 86400000)) } catch {}
    setDismissed(true)
  }

  async function vote(winnerKey: string) {
    if (!user) { setMessage('Sign in, then return to make your pick.'); return }
    setSaving(true); setMessage('')
    try {
      const response = await fetch('/api/community-rankings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pool: matchup!.pool, pairKey: matchup!.pairKey, winnerKey, seed }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not save vote')
      setSelected(winnerKey)
      await mutate()
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : 'Could not save vote') }
    finally { setSaving(false) }
  }

  const total = Object.values(matchup.counts).reduce((sum, count) => sum + count, 0)
  return <section className="mx-auto max-w-7xl px-5 py-5 sm:px-8" aria-labelledby="community-ranking-heading">
    <div className="rounded-xl border border-blue-400/25 bg-slate-900 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div><p className="text-[11px] font-bold uppercase tracking-wider text-blue-300">Community scouting</p>
          <h2 id="community-ranking-heading" className="mt-1 text-lg font-semibold text-white">Who would you rank higher?</h2>
          <p className="mt-1 text-sm text-slate-400">One pick helps shape the community view. You can change it later.</p></div>
        <button type="button" onClick={dismiss} className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-slate-400 hover:bg-white/10 hover:text-white" aria-label="Dismiss ranking request for seven days"><X className="h-4 w-4" /> Not now</button>
      </div>
      <div className="mt-4 flex gap-2" role="group" aria-label="Ranking pool">
        {(['prospect', 'nfl'] as const).map((option) => <button key={option} type="button" onClick={() => { setPool(option); setSelected(null); setMessage('') }} className={`rounded-md px-3 py-1.5 text-xs font-semibold ${matchup.pool === option ? 'bg-blue-400 text-slate-950' : 'border border-slate-700 text-slate-300 hover:border-blue-400'}`}>{option === 'prospect' ? 'College prospects' : 'Current NFL'}</button>)}
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {matchup.choices.map((choice) => <button key={choice.key} type="button" onClick={() => void vote(choice.key)} disabled={saving} className={`flex min-h-20 items-center gap-3 rounded-lg border p-3 text-left transition hover:border-blue-400 ${selected === choice.key ? 'border-blue-400 bg-blue-400/10' : 'border-slate-700 bg-slate-950/50'}`}>
          {choice.image ? <img src={choice.image} alt="" className="h-14 w-14 shrink-0 rounded-md bg-slate-800 object-contain object-bottom" /> : <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-slate-800 font-bold text-blue-300">{choice.name.slice(0, 1)}</span>}
          <span className="min-w-0 flex-1"><strong className="block truncate text-sm text-white">{choice.name}</strong><span className="block truncate text-xs text-slate-400">{choice.detail}</span>{total > 0 && <span className="mt-1 block text-xs text-blue-300">{Math.round(100 * (matchup.counts[choice.key] || 0) / total)}% of {total} picks</span>}</span>
        </button>)}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
        <span role="status">{message || (selected ? 'Your pick is saved. Thanks for scouting.' : total < 10 ? 'Early community signal · more votes needed' : `${total} community picks`)}</span>
        <div className="flex items-center gap-3">{selected && <button type="button" onClick={() => { setSeed((value) => value + 1); setSelected(null); setMessage('') }} className="text-blue-300 hover:text-blue-200">Another matchup</button>}<Link href={user ? '/scouting-portal' : '/login'} className="inline-flex items-center gap-1 text-blue-300 hover:text-blue-200">{user ? 'Explore scouting' : 'Sign in to save a pick'} <ArrowRight className="h-3 w-3" /></Link></div>
      </div>
    </div>
  </section>
}
