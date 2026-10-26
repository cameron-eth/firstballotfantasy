import test from 'node:test'
import assert from 'node:assert/strict'
import { reconcileBilling } from '../lib/platform/reconcile-billing.ts'
const fixture = () => ({
  id: 'sub_test',
  customer: 'cus_test',
  status: 'active',
  cancel_at_period_end: false,
  cancellation_details: null,
  discounts: [],
  items: {
    data: [
      {
        quantity: 1,
        current_period_end: 4102444800,
        price: { id: 'price_unlimited', metadata: { plan: 'unlimited' } },
      },
    ],
  },
})
function harness(sub, feedback) {
  const applied = []
  return {
    applied,
    stripe: { subscriptions: { retrieve: async () => sub } },
    store: {
      findCustomer: async () => ({ account_id: 'account', stripe_subscription_id: 'sub_test' }),
      feedback,
      apply: async (values) => applied.push(values),
    },
  }
}
const event = {
  id: 'evt_test',
  type: 'customer.subscription.updated',
  data: { object: { id: 'sub_test' } },
}
test('Unlimited price grants uncapped entitlement with one subscription unit', async () => {
  const sub = fixture(),
    h = harness(sub)
  await reconcileBilling(event, h.stripe, h.store, ['price_unlimited'])
  assert.equal(h.applied[0].p_slots, -1)
  sub.items.data[0].quantity = 2
  await assert.rejects(reconcileBilling(event, h.stripe, h.store, ['price_unlimited']), /quantity/i)
})
test('Cancellation reasons and redeemed retention are persisted before event acknowledgement', async () => {
  const previous = process.env.STRIPE_RETENTION_COUPON_ID
  process.env.STRIPE_RETENTION_COUPON_ID = 'coupon_test'
  try {
    const sub = fixture(),
      feedback = []
    sub.cancellation_details = {
      feedback: 'too_expensive',
      comment: 'Testing',
      reason: 'cancellation_requested',
    }
    sub.discounts = [{ coupon: { id: 'coupon_test' } }]
    const h = harness(sub, async (row) => feedback.push(row))
    await reconcileBilling(event, h.stripe, h.store, ['price_unlimited'])
    assert.equal(feedback[0].feedback, 'too_expensive')
    assert.equal(feedback[0].retention_redeemed, true)
    assert.equal(feedback[0].account_id, 'account')
    const failed = harness(sub, async () => {
      throw new Error('Database unavailable')
    })
    await assert.rejects(
      reconcileBilling(event, failed.stripe, failed.store, ['price_unlimited']),
      /Database unavailable/
    )
    assert.equal(failed.applied.length, 0)
  } finally {
    if (previous === undefined) delete process.env.STRIPE_RETENTION_COUPON_ID
    else process.env.STRIPE_RETENTION_COUPON_ID = previous
  }
})

import { retentionEligible } from '../lib/platform/retention.ts'
test('retention excludes annual, repeated, already-discounted and delinquent memberships', () => {
  const sub = fixture()
  Object.assign(sub.items.data[0].price, {
    unit_amount: 1200,
    currency: 'usd',
    recurring: { interval: 'month' },
  })
  assert.equal(retentionEligible(sub, 'price_unlimited', false), true)
  assert.equal(retentionEligible(sub, 'price_unlimited', true), false)
  sub.items.data[0].price.recurring.interval = 'year'
  assert.equal(retentionEligible(sub, 'price_unlimited', false), false)
  sub.items.data[0].price.recurring.interval = 'month'
  sub.discounts = ['di_existing']
  assert.equal(retentionEligible(sub, 'price_unlimited', false), false)
  sub.discounts = []
  sub.status = 'past_due'
  assert.equal(retentionEligible(sub, 'price_unlimited', false), false)
})
