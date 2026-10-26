import Stripe from 'stripe'
import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
const key = process.env.STRIPE_SECRET_KEY || process.env.NEXT_STRIPE_SECRET_KEY
if (!key?.startsWith('sk_test_')) throw new Error('Test mode only')
const stripe = new Stripe(key)
const path = '/tmp/firstballot-retention-test.json'
async function ready(id) {
  for (let i = 0; i < 45; i++) {
    if ((await stripe.testHelpers.testClocks.retrieve(id)).status === 'ready') return
    await new Promise((r) => setTimeout(r, 1000))
  }
  throw new Error('Clock did not become ready')
}
if (process.argv[2] === 'setup') {
  const clock = await stripe.testHelpers.testClocks.create({
    frozen_time: Math.floor(Date.now() / 1000),
    name: 'First Ballot retention test',
  })
  const customer = await stripe.customers.create({
    test_clock: clock.id,
    name: 'First Ballot test manager',
    email: 'billing-test@example.com',
  })
  const pm = await stripe.paymentMethods.attach('pm_card_visa', { customer: customer.id })
  const sub = await stripe.subscriptions.create({
    customer: customer.id,
    default_payment_method: pm.id,
    items: [{ price: process.env.STRIPE_TEAM_MONTHLY_PRICE_ID, quantity: 1 }],
  })
  await stripe.testHelpers.testClocks.advance(clock.id, {
    frozen_time: clock.frozen_time + 15 * 86400,
  })
  await ready(clock.id)
  const portal = await stripe.billingPortal.sessions.create({
    customer: customer.id,
    configuration: process.env.STRIPE_PORTAL_CONFIGURATION_ID,
    return_url: 'http://localhost:3102/billing',
    flow_data: {
      type: 'subscription_cancel',
      subscription_cancel: {
        subscription: sub.id,
        retention: {
          type: 'coupon_offer',
          coupon_offer: { coupon: process.env.STRIPE_RETENTION_COUPON_ID },
        },
      },
    },
  })
  await writeFile(
    path,
    JSON.stringify({
      clock: clock.id,
      customer: customer.id,
      subscription: sub.id,
      url: portal.url,
    }),
    { mode: 0o600 }
  )
  console.log('Test cancellation portal ready; URL saved privately to fixture file.')
} else {
  const fixture = JSON.parse(await readFile(path, 'utf8'))
  if (process.argv[2] === 'verify-renewals') {
    let sub = await stripe.subscriptions.retrieve(fixture.subscription, { expand: ['discounts'] })
    assert.equal(sub.discounts[0]?.coupon?.id, process.env.STRIPE_RETENTION_COUPON_ID)
    assert.equal(sub.cancel_at_period_end, false)
    const amounts = []
    for (let n = 0; n < 4; n++) {
      sub = await stripe.subscriptions.retrieve(fixture.subscription)
      await stripe.testHelpers.testClocks.advance(fixture.clock, {
        frozen_time: sub.items.data[0].current_period_end + 3600,
      })
      await ready(fixture.clock)
      // Advancing an hour allows automatic invoice finalization.
      const clock = await stripe.testHelpers.testClocks.retrieve(fixture.clock)
      await stripe.testHelpers.testClocks.advance(fixture.clock, {
        frozen_time: clock.frozen_time + 7200,
      })
      await ready(fixture.clock)
      const invoices = await stripe.invoices.list({ subscription: sub.id, limit: 1 })
      amounts.push(invoices.data[0].total)
    }
    assert.deepEqual(amounts, [599, 599, 599, 1200])
    const portal = await stripe.billingPortal.sessions.create({
      customer: fixture.customer,
      configuration: process.env.STRIPE_PORTAL_CONFIGURATION_ID,
      return_url: 'http://localhost:3102/billing',
      flow_data: {
        type: 'subscription_cancel',
        subscription_cancel: { subscription: fixture.subscription },
      },
    })
    await writeFile(
      path,
      JSON.stringify({ ...fixture, url: portal.url, renewalAmounts: amounts }),
      { mode: 0o600 }
    )
    console.log(
      'PASS: browser accepted offer; three $5.99 renewals, then $12. Cancellation feedback portal ready.'
    )
  } else if (process.argv[2] === 'verify-cancel') {
    const sub = await stripe.subscriptions.retrieve(fixture.subscription)
    assert.equal(sub.cancel_at_period_end, true)
    assert.equal(sub.cancellation_details.feedback, 'too_expensive')
    await writeFile(
      '../docs/testing/stripe-retention-results.json',
      JSON.stringify(
        {
          testedAt: new Date().toISOString(),
          mode: 'Stripe test + hosted portal browser',
          monthlyCents: 1200,
          annualCents: 7000,
          renewalAmounts: fixture.renewalAmounts,
          feedback: sub.cancellation_details.feedback,
          cancelAtPeriodEnd: sub.cancel_at_period_end,
        },
        null,
        2
      ) + '\n'
    )
    await stripe.testHelpers.testClocks.del(fixture.clock)
    console.log(
      'PASS: hosted portal collected too_expensive; cancellation scheduled at period end; disposable customer and clock cleaned.'
    )
  }
}
