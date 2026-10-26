'use client'
import useSWR from 'swr'
import { useAuth } from '@/lib/auth'
export function useSubscription() {
  const { user } = useAuth()
  const { data, error, isLoading, mutate } = useSWR(
    user ? ['billing', user.id] : null,
    async () => {
      const r = await fetch('/api/billing/subscription')
      const b = await r.json()
      if (!r.ok) throw new Error(b.error)
      return b
    }
  )
  async function post(path: string, body: object = {}) {
    const r = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const b = await r.json()
    if (!r.ok) throw new Error(b.error)
    return b.url as string
  }
  return {
    subscription: data?.subscription,
    prices: data?.prices ?? [],
    capacity: data?.capacity ?? 1,
    dailyApiLimit: data?.dailyApiLimit ?? 100,
    loading: !!user && isLoading,
    error: error?.message,
    isSubscribed: (data?.capacity ?? 1) > 1,
    isPro: (data?.capacity ?? 1) > 1,
    refetch: mutate,
    createCheckoutSession: (interval: string, quantity: number) =>
      post('/api/billing/create-checkout-session', { interval, quantity }),
    openCustomerPortal: () => post('/api/billing/portal'),
  }
}
