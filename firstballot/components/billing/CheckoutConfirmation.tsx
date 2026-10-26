'use client'
import { useEffect, useState } from 'react'
import useSWR, { useSWRConfig } from 'swr'
import { CheckCircle2, Loader2 } from 'lucide-react'
export function CheckoutConfirmation({
  session,
  accountId,
  onOpenTeam,
  openingTeam = false,
  activationError,
}: {
  session: string | null
  accountId: string | null
  onOpenTeam?: () => void
  openingTeam?: boolean
  activationError?: string
}) {
  const { mutate } = useSWRConfig()
  const [startedAt] = useState(Date.now)
  const {
    data,
    error,
    mutate: retry,
  } = useSWR(
    session && accountId ? ['checkout-status', accountId, session] : null,
    async () => {
      const response = await fetch(
        `/api/billing/checkout-status?session_id=${encodeURIComponent(session!)}`
      )
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Unable to confirm payment.')
      return result
    },
    {
      refreshInterval: (current) =>
        current?.state === 'processing' && Date.now() - startedAt < 90000 ? 2000 : 0,
      shouldRetryOnError: false,
    }
  )
  useEffect(() => {
    if (data?.state !== 'active' || !accountId) return
    void mutate(
      (key) =>
        Array.isArray(key) &&
        ['billing', 'teams', 'active-teams', 'api-teams', 'api-usage'].includes(key[0]) &&
        key[1] === accountId
    )
  }, [data?.state, accountId, mutate])
  if (!session) return null
  if (!accountId)
    return (
      <p role="status" className="mt-6 text-blue-200">
        Sign in to confirm your membership. Your payment is linked to the account used at checkout.
      </p>
    )
  const active = data?.state === 'active'
  return (
    <section
      role="status"
      aria-live="polite"
      className="mt-6 rounded-xl border border-blue-400/30 bg-blue-400/10 p-5"
    >
      <div className="flex items-center gap-2 font-semibold">
        {active ? (
          <CheckCircle2 className="text-emerald-300" size={20} />
        ) : !error && !data ? (
          <Loader2 className="animate-spin" size={20} />
        ) : null}
        {active
          ? 'Your membership is ready'
          : error
            ? 'Payment confirmation unavailable'
            : data?.state === 'inactive'
              ? 'Your paid membership is not active'
              : data?.state === 'expired'
                ? 'Checkout expired'
                : data?.state === 'open'
                  ? 'Checkout was not completed'
                  : 'Confirming your membership…'}
      </div>
      <p className="mt-2 text-sm text-slate-300">
        {active
          ? data.capacity === null
            ? 'Unlimited teams are unlocked. Open the team you selected, or choose a team below.'
            : `You now have ${data.capacity} team slots. Choose a team below to activate and open it.`
          : error
            ? error.message
            : data?.state === 'inactive'
              ? 'Check Manage billing below for payment or subscription changes. Your free team remains available.'
              : data?.state === 'processing'
                ? 'Your checkout is complete. We’re waiting for payment confirmation. You do not need to pay again. If this takes longer, use Check again.'
                : 'Your existing teams and saved plans are safe.'}
      </p>
      {activationError && (
        <p role="alert" className="mt-3 text-sm text-amber-200">
          {activationError}
        </p>
      )}
      <div className="mt-3 flex gap-4 text-sm text-blue-200">
        {active ? (
          onOpenTeam ? (
            <button
              disabled={openingTeam}
              onClick={onOpenTeam}
              className="rounded-lg bg-blue-300 px-4 py-2 font-semibold text-slate-950 disabled:opacity-50"
            >
              {openingTeam ? 'Opening your team…' : 'Activate & open my team'}
            </button>
          ) : (
            <a href="#teams" className="underline">
              Choose a team
            </a>
          )
        ) : (
          <button onClick={() => void retry()} className="underline">
            Check again
          </button>
        )}
        {data?.checkoutUrl && (
          <a href={data.checkoutUrl} className="underline">
            Resume secure checkout
          </a>
        )}
      </div>
    </section>
  )
}
