'use client'

import useSWR from 'swr'
import { useAuth } from '@/lib/auth'
import { SubscriptionData } from '@/lib/subscription-service'

export function useSubscription() {
  const { user } = useAuth()
  const {
    data: subscription = null,
    error,
    isLoading,
    mutate,
  } = useSWR<SubscriptionData | null>(
    user ? `/api/billing/subscription?authId=${user.id}` : null,
    async (url: string) => {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error('Failed to fetch subscription')
      }
      return response.json()
    }
  )

  const createCheckoutSession = async (priceId: string) => {
    if (!user) throw new Error('User not authenticated')

    try {
      const response = await fetch('/api/billing/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authId: user.id, priceId }),
      })

      if (!response.ok) {
        throw new Error('Failed to create checkout session')
      }

      const { url } = await response.json()
      return url
    } catch (err) {
      console.error('Error creating checkout session:', err)
      throw err
    }
  }

  const openCustomerPortal = async () => {
    if (!user) throw new Error('User not authenticated')

    try {
      const response = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authId: user.id }),
      })

      if (!response.ok) {
        throw new Error('Failed to create portal session')
      }

      const { url } = await response.json()
      return url
    } catch (err) {
      console.error('Error creating portal session:', err)
      throw err
    }
  }

  const isSubscribed = subscription?.status === 'active' || subscription?.status === 'trialing'
  const isPro = isSubscribed

  return {
    subscription,
    loading: !!user && isLoading,
    error: error instanceof Error ? error.message : null,
    isSubscribed,
    isPro,
    refetch: mutate,
    createCheckoutSession,
    openCustomerPortal,
  }
}
