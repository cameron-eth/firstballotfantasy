// Test-mode provisioning only. Live setup uses the same settings after launch gates pass.
import Stripe from 'stripe'
import { writeFile } from 'node:fs/promises'
const key = process.env.STRIPE_SECRET_KEY || process.env.NEXT_STRIPE_SECRET_KEY
if (!key?.startsWith('sk_test_')) throw new Error('Requires Stripe test key')
const stripe = new Stripe(key)
const products = await stripe.products.list({ limit: 100, active: true })
const product =
  products.data.find((p) => p.metadata.firstballot_plan === 'unlimited-v1') ||
  (await stripe.products.create({
    name: 'First Ballot Unlimited',
    description: 'Unlimited teams. College scouting, draft boards and desktop team planning.',
    metadata: { firstballot_plan: 'unlimited-v1' },
  }))
const prices = await stripe.prices.list({ product: product.id, active: true, limit: 100 })
const ids = {}
for (const [interval, amount, variable] of [
  ['month', 1200, 'STRIPE_TEAM_MONTHLY_PRICE_ID'],
  ['year', 7000, 'STRIPE_TEAM_YEARLY_PRICE_ID'],
]) {
  const price =
    prices.data.find(
      (p) =>
        p.unit_amount === amount &&
        p.currency === 'usd' &&
        p.recurring?.interval === interval &&
        p.metadata.plan === 'unlimited'
    ) ||
    (await stripe.prices.create({
      product: product.id,
      currency: 'usd',
      unit_amount: amount,
      recurring: { interval },
      metadata: { plan: 'unlimited' },
    }))
  ids[variable] = price.id
}
const couponId = 'firstballot-retention-599-3m-v1'
let coupon
try {
  coupon = await stripe.coupons.retrieve(couponId)
} catch (e) {
  if (e.code !== 'resource_missing') throw e
}
if (!coupon)
  coupon = await stripe.coupons.create({
    id: couponId,
    name: '$5.99/month for 3 months, then $12',
    amount_off: 601,
    currency: 'usd',
    duration: 'repeating',
    duration_in_months: 3,
    applies_to: { products: [product.id] },
  })
ids.STRIPE_RETENTION_COUPON_ID = coupon.id
const configs = await stripe.billingPortal.configurations.list({ limit: 100 })
const existing = configs.data.find((c) => c.metadata?.firstballot_plan === 'unlimited-v1')
const settings = {
  business_profile: { headline: 'Your dynasty. Your terms.' },
  metadata: { firstballot_plan: 'unlimited-v1' },
  features: {
    customer_update: { enabled: true, allowed_updates: ['email'] },
    invoice_history: { enabled: true },
    payment_method_update: { enabled: true },
    subscription_cancel: {
      enabled: true,
      mode: 'at_period_end',
      cancellation_reason: {
        enabled: true,
        options: [
          'too_expensive',
          'unused',
          'missing_features',
          'low_quality',
          'too_complex',
          'switched_service',
          'other',
        ],
      },
    },
    subscription_update: {
      enabled: true,
      default_allowed_updates: ['price'],
      proration_behavior: 'create_prorations',
      products: [
        {
          product: product.id,
          prices: [ids.STRIPE_TEAM_MONTHLY_PRICE_ID, ids.STRIPE_TEAM_YEARLY_PRICE_ID],
        },
      ],
    },
  },
}
const configuration = existing
  ? await stripe.billingPortal.configurations.update(existing.id, settings)
  : await stripe.billingPortal.configurations.create(settings)
ids.STRIPE_PORTAL_CONFIGURATION_ID = configuration.id
await writeFile(
  '.env.billing-test.local',
  Object.entries(ids)
    .map(([k, v]) => `${k}=${v}`)
    .join('\n') + '\n',
  { mode: 0o600 }
)
console.log(
  'Test Unlimited prices ($12/month, $70/year), retention coupon and cancellation-reason portal configured. Non-secret IDs saved to .env.billing-test.local.'
)
