'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import { SubscriptionData } from '@/lib/subscription-service'

export function useSubscription() {
  const { user } = useAuth()
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      fetchSubscription()
    } else {
      setSubscription(null)
      setLoading(false)
    }
  }, [user])

  const fetchSubscription = async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/billing/subscription?authId=${user.id}`)

      if (!response.ok) {
        throw new Error('Failed to fetch subscription')
      }

      const data = await response.json()
      setSubscription(data)
    } catch (err) {
      console.error('Error fetching subscription:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch subscription')
    } finally {
      setLoading(false)
    }
  }

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
    loading,
    error,
    isSubscribed,
    isPro,
    refetch: fetchSubscription,
    createCheckoutSession,
    openCustomerPortal,
  }
}
