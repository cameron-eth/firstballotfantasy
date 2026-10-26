'use client'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { CheckoutConfirmation } from './CheckoutConfirmation'
export function CheckoutReturn() {
  const params = useSearchParams()
  const { user } = useAuth()
  return <CheckoutConfirmation session={params.get('session_id')} accountId={user?.id ?? null} />
}
