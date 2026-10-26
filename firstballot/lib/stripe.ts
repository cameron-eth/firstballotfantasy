import 'server-only'
import Stripe from 'stripe'
import { PlatformError } from '@/lib/platform/http'
let client: Stripe | undefined
export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY || process.env.NEXT_STRIPE_SECRET_KEY
  if (!key)
    throw new PlatformError(
      503,
      'BILLING_NOT_CONFIGURED',
      'Billing is not available yet. Your free team remains available.'
    )
  return (client ??= new Stripe(key, { typescript: true }))
}
export function billingPrice(interval: 'month' | 'year') {
  const id =
    interval === 'month'
      ? process.env.STRIPE_TEAM_MONTHLY_PRICE_ID
      : process.env.STRIPE_TEAM_YEARLY_PRICE_ID
  if (!id?.startsWith('price_'))
    throw new PlatformError(
      503,
      'BILLING_NOT_CONFIGURED',
      'This billing option is not available yet.'
    )
  return id
}
export function siteUrl() {
  return process.env.NEXT_PUBLIC_BASE_URL || 'https://www.firstballotff.com'
}
