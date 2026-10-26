'use client'
import { Suspense, useState } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { CheckoutReturn } from '@/components/billing/CheckoutReturn'
import { Header } from '@/components/header'
import { useAuth } from '@/lib/auth'
import { useSubscription } from '@/hooks/use-subscription'
import { useLeagueContext } from '@/lib/league-context'
import { Check, Loader2, Plus, Archive, ArrowUpRight } from 'lucide-react'
type Team = { id: string; name: string; league_id: string; season: number; active: boolean }
const button =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-slate-800 disabled:opacity-40'
async function loadTeams() {
  const r = await fetch('/api/account/teams')
  const b = await r.json()
  if (!r.ok) throw new Error(b.error)
  return b as { teams: Team[]; capacity: number }
}
export default function BillingPage() {
  const { user, loading: authLoading } = useAuth(),
    { leagues } = useLeagueContext()
  const billing = useSubscription(),
    { data, error, mutate } = useSWR(user ? ['teams', user.id] : null, loadTeams)
  const [quantity, setQuantity] = useState(1),
    [interval, setInterval] = useState('month'),
    [busy, setBusy] = useState(''),
    [notice, setNotice] = useState('')
  async function act(action: string, extra: object) {
    setBusy(action)
    setNotice('')
    try {
      const r = await fetch('/api/account/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      })
      const b = await r.json()
      if (!r.ok) throw new Error(b.error)
      setNotice(
        b.needsUpgrade
          ? 'Team connected. Add a slot or archive another team to activate it.'
          : 'Team updated. Your saved plans are preserved.'
      )
      await mutate()
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Could not update team.')
    } finally {
      setBusy('')
    }
  }
  async function checkout(portal = false) {
    setBusy('billing')
    setNotice('')
    try {
      window.location.assign(
        portal
          ? await billing.openCustomerPortal()
          : await billing.createCheckoutSession(interval, quantity)
      )
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Billing unavailable.')
      setBusy('')
    }
  }
  const hasLiveSubscription =
    !!billing.subscription?.stripe_subscription_id &&
    !['canceled', 'incomplete_expired', 'free'].includes(billing.subscription.status)
  const price = billing.prices.find((p: { interval: string }) => p.interval === interval)
  const amount = price
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: price.currency }).format(
        (price.unitAmount * quantity) / 100
      )
    : null
  return (
    <>
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-10 text-slate-100">
        <p className="text-xs uppercase tracking-widest text-blue-300">Your membership</p>
        <h1 className="mt-2 text-3xl font-semibold">One team free. Room to grow.</h1>
        <p className="mt-3 max-w-2xl text-slate-400">
          Scout, rank and plan with your first team. Add more active teams when you’re ready. Every
          membership gets the same data quality.
        </p>
        <Suspense fallback={null}>
          <CheckoutReturn />
        </Suspense>
        {!user ? (
          <p className="mt-8">
            {authLoading ? (
              'Loading account…'
            ) : (
              <Link className={button} href="/login">
                Sign in to connect your free team
              </Link>
            )}
          </p>
        ) : (
          <>
            <section className="mt-8 rounded-2xl border border-slate-700 bg-slate-900 p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold">Your teams</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    {data
                      ? `${data.teams.filter((t) => t.active).length} of ${data.capacity} slots active`
                      : 'Loading teams…'}{' '}
                    · First slot is always free
                  </p>
                </div>
                {billing.subscription?.stripe_customer_id && (
                  <button className={button} disabled={!!busy} onClick={() => checkout(true)}>
                    Manage billing <ArrowUpRight size={15} />
                  </button>
                )}
              </div>
              {(error || billing.error) && (
                <p role="alert" className="mt-4 text-amber-300">
                  {error?.message || billing.error}
                </p>
              )}
              <div className="mt-5 divide-y divide-slate-800">
                {data?.teams.map((team) => (
                  <div
                    key={team.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-4"
                  >
                    <div>
                      <p className="font-medium">{team.name}</p>
                      <p className="text-sm text-slate-400">
                        {team.season} · {team.active ? 'Active' : 'Archived · plans preserved'}
                      </p>
                    </div>
                    <button
                      className={button}
                      disabled={!!busy}
                      onClick={() => act(team.active ? 'archive' : 'activate', { teamId: team.id })}
                    >
                      {team.active ? <Archive size={15} /> : <Check size={15} />}
                      {busy === (team.active ? 'archive' : 'activate')
                        ? 'Updating…'
                        : team.active
                          ? 'Archive'
                          : 'Activate'}
                    </button>
                  </div>
                ))}
              </div>
              {leagues
                .filter((l) => !data?.teams.some((t) => t.league_id === l.league_id))
                .map((l) => (
                  <div
                    key={l.league_id}
                    className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 py-4"
                  >
                    <p>{l.name}</p>
                    <button
                      className={button}
                      disabled={!!busy || !data}
                      onClick={() => act('connect', { leagueId: l.league_id })}
                    >
                      <Plus size={15} /> Connect team
                    </button>
                  </div>
                ))}
              {!leagues.length && (
                <p className="mt-5 text-sm text-slate-400">
                  Add your Sleeper username in{' '}
                  <Link className="text-blue-300 underline" href="/league-buddy">
                    your dashboard
                  </Link>{' '}
                  to find your teams. No Sleeper token needed to explore.
                </p>
              )}
            </section>
            <section className="mt-5 rounded-2xl border border-slate-700 p-6">
              <h2 className="font-semibold">Add team slots</h2>
              <p className="mt-2 text-sm text-slate-400">
                One subscription covers your extra teams. Discovering leagues never adds a charge.
              </p>
              {billing.prices.length ? (
                <>
                  <div className="mt-5 flex flex-wrap items-end gap-4">
                    <label className="text-sm text-slate-400">
                      Additional slots
                      <input
                        aria-label="Additional team slots"
                        type="number"
                        min={1}
                        max={100}
                        value={quantity}
                        onChange={(e) =>
                          setQuantity(Math.max(1, Math.min(100, Number(e.target.value) || 1)))
                        }
                        className="mt-2 block w-24 rounded-lg border border-slate-700 bg-slate-900 p-2 text-white"
                      />
                    </label>
                    <div className="flex gap-2">
                      {billing.prices.map((p: { interval: string }) => (
                        <button
                          key={p.interval}
                          className={`${button} ${interval === p.interval ? 'border-blue-400 bg-blue-400/10' : ''}`}
                          onClick={() => setInterval(p.interval)}
                        >
                          {p.interval === 'month' ? 'Monthly' : 'Yearly'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="mt-4 text-xl font-semibold">
                    {amount} / {interval}{' '}
                    <span className="text-sm font-normal text-slate-400">
                      for {quantity + 1} total teams
                    </span>
                  </p>
                  <button
                    disabled={!!busy || !price || billing.loading || !!billing.error}
                    onClick={() => checkout(hasLiveSubscription)}
                    className={`${button} mt-4 border-blue-400 bg-blue-500/20`}
                  >
                    {busy === 'billing' && <Loader2 className="animate-spin" size={16} />}Review{' '}
                    {hasLiveSubscription ? 'subscription' : 'checkout'}
                  </button>
                  <p className="mt-3 text-xs text-slate-500">
                    Review the full total before paying. On downgrade, keep your chosen teams active
                    by archiving the others first.
                  </p>
                </>
              ) : (
                <p className="mt-4 text-sm text-blue-200">
                  Paid slots are not open yet. Your first team is free.
                </p>
              )}
            </section>
            <Link href="/settings" className={`${button} mt-5`}>
              Settings & API access <ArrowUpRight size={15} />
            </Link>
          </>
        )}
        {notice && (
          <p
            role="status"
            className="mt-5 rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 text-sm"
          >
            {notice}
          </p>
        )}
      </main>
    </>
  )
}
