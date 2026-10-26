import test from 'node:test'
import assert from 'node:assert/strict'
import { checkoutStatus } from '../lib/platform/checkout-status.ts'
const session = {
  customer: 'cus_mine',
  client_reference_id: 'account',
  subscription: 'sub_new',
  status: 'complete',
  url: null,
}
const billing = {
  stripe_customer_id: 'cus_mine',
  stripe_subscription_id: null,
  status: 'free',
  paid_slots: 0,
  period_end: null,
}
test('checkout redirect alone never unlocks access; persisted matching payment does', () => {
  assert.equal(checkoutStatus('account', session, billing).state, 'processing')
  const paid = {
    ...billing,
    stripe_subscription_id: 'sub_new',
    status: 'active',
    paid_slots: 2,
    period_end: '2099-01-01',
  }
  assert.equal(checkoutStatus('account', session, paid).state, 'active')
  assert.equal(checkoutStatus('account', session, paid).capacity, 3)
  assert.equal(
    checkoutStatus('account', session, { ...paid, status: 'past_due' }).state,
    'inactive'
  )
  assert.equal(checkoutStatus('account', session, { ...paid, status: 'canceled' }).capacity, 1)
  assert.equal(
    checkoutStatus('account', session, { ...paid, period_end: '2020-01-01' }).state,
    'inactive'
  )
})
test('checkout lookup rejects another customer or account', () => {
  assert.throws(() => checkoutStatus('other', session, billing), /Checkout not found/)
  assert.throws(
    () => checkoutStatus('account', { ...session, customer: 'cus_other' }, billing),
    /Checkout not found/
  )
})
