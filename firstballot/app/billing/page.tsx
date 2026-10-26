'use client'
import { Suspense, useState } from 'react'
import useSWR, { useSWRConfig } from 'swr'
import { useRouter } from 'next/navigation'
import { useDesktopBuilder } from '@/hooks/use-desktop-builder'
import { accountTeamCache, teamWorkspaceUrl } from '@/lib/team-navigation'
import Link from 'next/link'
import { MembershipHero } from '@/components/billing/MembershipHero'
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
  return b as { teams: Team[]; capacity: number | null }
}
export default function BillingPage() {
  const { user, loading: authLoading } = useAuth(),
    { leagues, selectLeague } = useLeagueContext()
  const router = useRouter()
  const desktop = useDesktopBuilder()
  const { mutate: refreshCache } = useSWRConfig()
  const billing = useSubscription(),
    { data, error, mutate } = useSWR(user ? ['teams', user.id] : null, loadTeams)
  const [interval, setInterval] = useState('month'),
    [busy, setBusy] = useState(''),
    [notice, setNotice] = useState('')
  async function act(action: string, extra: { teamId?: string; leagueId?: string }) {
    const destinationLeague =
      extra.leagueId ?? data?.teams.find((t) => t.id === extra.teamId)?.league_id
    setBusy(action)
    setNotice('')
    try {
      const r = await fetch('/api/account/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      })
      const b = await r.json()
      if ((b.needsUpgrade || r.status === 409) && destinationLeague)
        router.replace(`/billing?leagueId=${encodeURIComponent(destinationLeague)}#membership`)
      if (!r.ok) throw new Error(b.error)
      setNotice(
        b.needsUpgrade
          ? 'Team connected. Upgrade to Unlimited or archive another team to activate it.'
          : 'Team updated. Your saved plans are preserved.'
      )
      await mutate()
      if (user) await refreshCache((key) => accountTeamCache(key, user.id))
      const leagueId =
        b.team?.league_id ??
        extra.leagueId ??
        data?.teams.find((t) => t.id === extra.teamId)?.league_id
      if (action !== 'archive' && !b.needsUpgrade && leagueId) {
        selectLeague(leagueId)
        router.push(teamWorkspaceUrl(leagueId, desktop))
      }
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Could not update team.')
    } finally {
      setBusy('')
    }
  }
  async function checkout(portal = false, cancel = false) {
    setBusy('billing')
    setNotice('')
    try {
      window.location.assign(
        portal
          ? await billing.openCustomerPortal(cancel)
          : await billing.createCheckoutSession(interval, 1)
      )
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Billing unavailable.')
      setBusy('')
    }
  }
  const billingResolved = !!user && !billing.loading && !billing.error
  const hasUnlimitedAccess = billingResolved && billing.capacity !== 1
  const hasManageableStripeSubscription =
    hasUnlimitedAccess &&
    !!billing.subscription?.stripe_subscription_id &&
    ['active', 'trialing'].includes(billing.subscription.status)
  const activeTeams = data?.teams.filter((t) => t.active).length ?? 0
  const price = billing.prices.find((p: { interval: string }) => p.interval === interval)
  return (
    <>
      <Header />
      <main className="mx-auto max-w-7xl px-5 pb-16 text-slate-100 sm:px-8">
        <MembershipHero />
        <section
          id="membership"
          aria-label="Membership plans"
          className="grid scroll-mt-24 gap-5 md:grid-cols-[0.85fr_1.15fr]"
        >
          <div className="rounded-3xl border border-slate-700 bg-slate-900/50 p-7 sm:p-9">
            <p className="text-sm font-semibold text-blue-300">THE FIRST TEAM</p>
            <h2 className="mt-3 text-4xl font-semibold">
              Free
              <span className="ml-2 text-base font-normal text-slate-400">to get in the game</span>
            </h2>
            <p className="mt-4 text-slate-300">One active team. A whole new way to see it.</p>
            <ul className="mt-6 space-y-3 text-sm text-slate-300">
              {[
                'Your roster, standings and player trends',
                'College scouting and your own draft board',
                'Visual team planning on desktop',
                'Community rankings: make your voice count',
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <Check size={17} className="shrink-0 text-blue-300" />
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href={
                user
                  ? data?.teams.find((t) => t.active)
                    ? teamWorkspaceUrl(data.teams.find((t) => t.active)!.league_id, desktop)
                    : '#teams'
                  : '/login'
              }
              className={`${button} mt-7 w-full`}
            >
              {user ? 'Open my team' : 'Start free'}
            </Link>
          </div>
          <div className="relative overflow-hidden rounded-3xl border border-amber-300/50 bg-[#171b24] p-7 sm:p-9">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold text-amber-300">FIRST BALLOT UNLIMITED</p>
              <span className="rounded-full bg-amber-300/10 px-3 py-1 text-xs text-amber-200">
                Every league. One membership.
              </span>
            </div>
            {(!user || (billingResolved && !hasUnlimitedAccess)) && (
              <>
                <div
                  className="mt-5 inline-flex rounded-xl bg-slate-950 p-1"
                  aria-label="Billing interval"
                >
                  {['month', 'year'].map((value) => (
                    <button
                      key={value}
                      aria-pressed={interval === value}
                      onClick={() => setInterval(value)}
                      className={`rounded-lg px-4 py-2 text-sm font-medium ${interval === value ? 'bg-amber-300 text-slate-950' : 'text-slate-300 hover:text-white'}`}
                    >
                      {value === 'month' ? 'Monthly' : 'Annual · save $74'}
                    </button>
                  ))}
                </div>
                <p className="mt-5 text-5xl font-semibold tracking-tight">
                  {interval === 'month' ? '$12' : '$70'}
                  <span className="text-base font-normal tracking-normal text-slate-400">
                    {' '}
                    / {interval === 'month' ? 'month' : 'year'}
                  </span>
                </p>
                <p className="mt-2 text-sm text-slate-400">
                  {interval === 'year'
                    ? '$5.83/month equivalent, billed $70 annually.'
                    : 'Billed monthly. Cancel before your next renewal.'}
                </p>
              </>
            )}
            <ul className="mt-6 space-y-3 text-sm text-slate-200">
              {[
                'Unlimited active teams under one account',
                'Every Free feature, across all your leagues',
                'Keep separate boards and plans for each team',
                '1,000 API requests/day · scoped access controls',
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <Check size={17} className="shrink-0 text-amber-300" />
                  {item}
                </li>
              ))}
            </ul>
            {!user ? (
              <Link
                href="/login?redirect=/billing"
                className={`${button} mt-7 w-full border-amber-300 bg-amber-300 !text-slate-950`}
              >
                Sign in to upgrade <ArrowUpRight size={16} />
              </Link>
            ) : billing.loading ? (
              <p role="status" className="mt-7 rounded-xl border border-slate-700 bg-slate-950/60 p-4 text-sm text-slate-300">
                <Loader2 className="mr-2 inline animate-spin" size={15} /> Checking your membership…
              </p>
            ) : billing.error ? (
              <p role="alert" className="mt-7 rounded-xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm text-amber-100">
                We couldn’t verify your membership. Reload this page before making a billing change.
              </p>
            ) : hasUnlimitedAccess ? (
              <div role="status" className="mt-7 rounded-xl border border-emerald-300/30 bg-emerald-300/10 p-4">
                <p className="font-semibold text-emerald-200">Unlimited membership is active</p>
                <p className="mt-1 text-sm text-slate-300">All your connected teams and Team Builder are included.</p>
                {hasManageableStripeSubscription && (
                  <button className={`${button} mt-4 w-full border-emerald-300/50`} onClick={() => checkout(true)} disabled={!!busy}>
                    Manage my membership <ArrowUpRight size={16} />
                  </button>
                )}
              </div>
            ) : (
              <button
                disabled={
                  !!busy || (!price)
                }
                onClick={() => checkout(false)}
                className={`${button} mt-7 w-full border-amber-300 bg-amber-300 !text-slate-950`}
              >
                {busy === 'billing' ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <ArrowUpRight size={16} />
                )}
                {price ? 'Go Unlimited' : 'Paid membership opens soon'}
              </button>
            )}
            {(!user || (billingResolved && !hasUnlimitedAccess)) && (
              <p className="mt-3 text-xs text-slate-400">
                Secure checkout with Stripe. Review your total before paying. No charge for
                discovering teams.
              </p>
            )}
          </div>
        </section>
        <div className="my-8 grid gap-6 border-y border-slate-800 py-6 text-sm sm:grid-cols-3">
          {[
            [
              'Scout ahead',
              'Follow college prospects before they become everyone else’s draft target.',
            ],
            ['Plan the next move', 'Explore roster fits and trade ideas on your desktop team map.'],
            [
              'Keep your work',
              'Canceling keeps your boards and plans. Your first team stays free.',
            ],
          ].map(([title, text]) => (
            <div key={title}>
              <h3 className="font-semibold text-white">{title}</h3>
              <p className="mt-2 leading-relaxed text-slate-400">{text}</p>
            </div>
          ))}
        </div>
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
            <section
              id="teams"
              className="scroll-mt-24 mt-8 rounded-2xl border border-slate-700 bg-slate-900 p-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold">Your teams</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    {data
                      ? `${activeTeams} active team${activeTeams === 1 ? '' : 's'}${data.capacity === null ? ' · Unlimited' : ` · ${Math.max(0, data.capacity - activeTeams)} slots available`}`
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
                    <div className="flex items-center gap-2">
                      {team.active && (
                        <Link
                          className={`${button} border-blue-400 text-blue-200`}
                          href={teamWorkspaceUrl(team.league_id, desktop)}
                          onClick={() => selectLeague(team.league_id)}
                        >
                          {desktop ? 'Open Team Builder' : 'Open team'} <ArrowUpRight size={15} />
                        </Link>
                      )}
                      <button
                        className={button}
                        disabled={!!busy}
                        onClick={() =>
                          act(team.active ? 'archive' : 'activate', { teamId: team.id })
                        }
                      >
                        {team.active ? <Archive size={15} /> : <Check size={15} />}
                        {busy === (team.active ? 'archive' : 'activate')
                          ? 'Updating…'
                          : team.active
                            ? 'Archive'
                            : 'Activate & open'}
                      </button>
                    </div>
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
                      <Plus size={15} /> Connect & open
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
            {hasManageableStripeSubscription && (
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-400">
                <p>Update payment details, change billing interval or cancel your membership.</p>
                <button
                  disabled={!!busy}
                  onClick={() => checkout(true, true)}
                  className="underline underline-offset-4 hover:text-white disabled:opacity-40"
                >
                  Cancel membership
                </button>
              </div>
            )}
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
