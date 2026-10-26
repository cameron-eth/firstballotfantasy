// Explicit opt-in integration test: real Stripe TEST API + CLI-delivered signed
// webhooks + production reconciliation function + actual migration in PGlite.
import Stripe from 'stripe'
import { PGlite } from '@electric-sql/pglite'
import { readFile, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import assert from 'node:assert/strict'
import { reconcileBilling } from '../../lib/platform/reconcile-billing.ts'
import { teamCapacity } from '../../lib/platform/policy.ts'
const key = process.env.STRIPE_SECRET_KEY || process.env.NEXT_STRIPE_SECRET_KEY
if (!key?.startsWith('sk_test_')) throw Error('Requires a Stripe test secret key')
const stripe = new Stripe(key),
  db = new PGlite(),
  account = '00000000-0000-4000-8000-000000000091'
const results = [],
  received = [],
  failures = []
let webhookSecret, cli, server, customer, clock, subscription, price, checkout
const report = (name) => {
  results.push(name)
  console.log('PASS ' + name)
}
const pause = (ms) => new Promise((r) => setTimeout(r, ms))
async function waitFor(fn, timeout = 60000) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    if (await fn()) return
    await pause(1000)
  }
  throw Error('Timed out waiting for integration state')
}
const store = {
  async findCustomer(id) {
    return (
      (
        await db.query(
          'select account_id,stripe_subscription_id from account_billing where stripe_customer_id=$1',
          [id]
        )
      ).rows[0] ?? null
    )
  },
  async apply(v) {
    await db.query('select apply_platform_billing($1,$2,$3,$4,$5,$6,$7,$8,$9)', [
      v.p_event,
      v.p_account,
      v.p_customer,
      v.p_subscription,
      v.p_status,
      v.p_slots,
      v.p_end,
      v.p_cancel,
      v.p_observed,
    ])
  },
}
async function billing() {
  return (await db.query('select * from account_billing where account_id=$1', [account])).rows[0]
}
async function capacity() {
  const b = await billing()
  return teamCapacity({ ...b, period_end: b.period_end?.toISOString?.() ?? b.period_end })
}
try {
  await db.exec(
    `create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql as $$select null::uuid$$;`
  )
  await db.exec(
    await readFile(
      new URL('../../supabase/migrations/20261026_platform_foundations.sql', import.meta.url),
      'utf8'
    )
  )
  await db.query('insert into auth.users values($1)', [account])
  server = createServer(async (req, res) => {
    let raw = ''
    for await (const chunk of req) raw += chunk
    try {
      const event = stripe.webhooks.constructEvent(
        raw,
        req.headers['stripe-signature'],
        webhookSecret
      )
      await reconcileBilling(event, stripe, store, [price?.id].filter(Boolean))
      received.push(event)
      res.writeHead(200)
      res.end('ok')
    } catch (e) {
      failures.push({ type: e.type ?? e.code ?? e.name })
      res.writeHead(e.type === 'StripeSignatureVerificationError' ? 400 : 503)
      res.end('rejected')
    }
  })
  await new Promise((r) => server.listen(3107, '127.0.0.1', r))
  cli = spawn(
    'stripe',
    [
      'listen',
      '--forward-to',
      'http://127.0.0.1:3107/webhook',
      '--events',
      'customer.subscription.created,customer.subscription.updated,customer.subscription.deleted,checkout.session.completed,invoice.paid,invoice.payment_failed',
    ],
    { env: { ...process.env, STRIPE_API_KEY: key }, stdio: ['ignore', 'pipe', 'pipe'] }
  )
  for (const stream of [cli.stdout, cli.stderr])
    stream.on('data', (chunk) => {
      const match = chunk.toString().match(/whsec_[A-Za-z0-9]+/)
      if (match) webhookSecret = match[0]
    })
  await waitFor(() => !!webhookSecret, 20000)
  report('Stripe CLI listener connected (secret kept in memory)')
  const bad = await fetch('http://127.0.0.1:3107/webhook', {
    method: 'POST',
    body: '{}',
    headers: { 'stripe-signature': 'invalid' },
  })
  assert.equal(bad.status, 400)
  report('Invalid signature rejected')
  clock = await stripe.testHelpers.testClocks.create({
    frozen_time: Math.floor(Date.now() / 1000),
    name: 'First Ballot lifecycle integration',
  })
  customer = await stripe.customers.create({
    name: 'First Ballot TEST lifecycle',
    test_clock: clock.id,
    metadata: { purpose: 'firstballot-platform-integration' },
  })
  await db.query('insert into account_billing(account_id,stripe_customer_id) values($1,$2)', [
    account,
    customer.id,
  ])
  price = await stripe.prices.create({
    currency: 'usd',
    unit_amount: 100,
    recurring: { interval: 'month' },
    product_data: { name: 'First Ballot TEST additional slot' },
    metadata: { purpose: 'automated-integration-only' },
  })
  assert.equal(price.livemode, false)
  const teams = []
  for (let i = 1; i <= 3; i++)
    teams.push(
      (
        await db.query(
          `insert into connected_teams(account_id,lineage_id,league_id,roster_id,sleeper_user_id,name,season) values($1,$2,$2,1,'test','Test team',2026) returning id`,
          [account, String(i)]
        )
      ).rows[0].id
    )
  await db.query('select activate_connected_team($1,$2,true)', [account, teams[0]])
  await assert.rejects(
    db.query('select activate_connected_team($1,$2,true)', [account, teams[1]]),
    /TEAM_LIMIT/
  )
  report('Free account cannot activate second team')
  if (process.env.STRIPE_TEST_API_ONLY === 'true') {
    const pm = await stripe.paymentMethods.attach('pm_card_visa', { customer: customer.id })
    await stripe.customers.update(customer.id, {
      invoice_settings: { default_payment_method: pm.id },
    })
    subscription = (
      await stripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: price.id, quantity: 2 }],
      })
    ).id
  } else {
    checkout = await stripe.checkout.sessions.create(
      {
        mode: 'subscription',
        customer: customer.id,
        client_reference_id: account,
        line_items: [{ price: price.id, quantity: 2 }],
        success_url: 'http://localhost:3102/billing?session_id={CHECKOUT_SESSION_ID}',
        cancel_url: 'http://localhost:3102/billing',
        subscription_data: { metadata: { purpose: 'firstballot-integration' } },
      },
      { idempotencyKey: `integration-${customer.id}` }
    )
    await writeFile(
      '/tmp/firstballot-stripe-checkout.json',
      JSON.stringify({ url: checkout.url, id: checkout.id })
    )
    console.log('CHECKOUT_READY /tmp/firstballot-stripe-checkout.json')
    await waitFor(async () => {
      checkout = await stripe.checkout.sessions.retrieve(checkout.id)
      return checkout.status === 'complete'
    }, 600000)
    subscription =
      typeof checkout.subscription === 'string' ? checkout.subscription : checkout.subscription.id
  }
  await waitFor(async () => (await capacity()) === 3)
  report(
    process.env.STRIPE_TEST_API_ONLY === 'true'
      ? 'Real test subscription -> signed CLI webhook -> entitlement (3 teams)'
      : 'Real Checkout payment -> signed CLI webhook -> database entitlement (3 teams)'
  )
  await db.query('select activate_connected_team($1,$2,true)', [account, teams[1]])
  await db.query('select activate_connected_team($1,$2,true)', [account, teams[2]])
  report('Purchased team slots unlock activation')
  const replayType =
    process.env.STRIPE_TEST_API_ONLY === 'true'
      ? 'customer.subscription.created'
      : 'checkout.session.completed'
  await waitFor(() => received.some((e) => e.type === replayType))
  const replay = received.find((e) => e.type === replayType)
  assert.ok(replay)
  await reconcileBilling(replay, stripe, store, [price.id])
  assert.equal(await capacity(), 3)
  report('Duplicate webhook does not duplicate entitlement')
  let sub = await stripe.subscriptions.retrieve(subscription)
  await stripe.testHelpers.testClocks.advance(clock.id, {
    frozen_time: sub.items.data[0].current_period_end + 60,
  })
  await waitFor(
    async () => (await stripe.testHelpers.testClocks.retrieve(clock.id)).status === 'ready'
  )
  await waitFor(async () => {
    const b = await billing()
    return new Date(b.period_end).getTime() > sub.items.data[0].current_period_end * 1000
  })
  report('Successful renewal advances entitlement period')
  sub = await stripe.subscriptions.retrieve(subscription)
  await stripe.subscriptions.update(subscription, {
    items: [{ id: sub.items.data[0].id, quantity: 1 }],
    proration_behavior: 'none',
  })
  await waitFor(async () => (await capacity()) === 2)
  assert.equal(
    (await db.query('select count(*)::int n from connected_teams where active')).rows[0].n,
    2
  )
  report('Quantity downgrade archives excess team and preserves records')
  await stripe.subscriptions.update(subscription, { cancel_at_period_end: true })
  await waitFor(async () => (await billing()).cancel_at_period_end === true)
  assert.equal(await capacity(), 2)
  report('Scheduled cancellation retains access until period end')
  await stripe.subscriptions.update(subscription, { cancel_at_period_end: false })
  const failPM = await stripe.paymentMethods.attach('pm_card_chargeCustomerFail', {
    customer: customer.id,
  })
  await stripe.subscriptions.update(subscription, { default_payment_method: failPM.id })
  sub = await stripe.subscriptions.retrieve(subscription)
  await stripe.testHelpers.testClocks.advance(clock.id, {
    frozen_time: sub.items.data[0].current_period_end + 60,
  })
  await waitFor(
    async () => (await stripe.testHelpers.testClocks.retrieve(clock.id)).status === 'ready'
  )
  await waitFor(async () => (await capacity()) === 1)
  assert.ok(received.some((e) => e.type === 'invoice.payment_failed'))
  report('Failed renewal removes paid access via signed webhook')
  if ((await stripe.subscriptions.retrieve(subscription)).status !== 'canceled')
    await stripe.subscriptions.cancel(subscription)
  await waitFor(async () => (await billing()).status === 'canceled')
  assert.equal(await capacity(), 1)
  assert.equal((await db.query('select count(*)::int n from connected_teams')).rows[0].n, 3)
  report('Cancellation preserves connections and leaves one free slot')
  await reconcileBilling(replay, stripe, store, [price.id])
  assert.equal(await capacity(), 1)
  report('Old checkout replay cannot restore canceled subscription')
  const good = await stripe.paymentMethods.attach('pm_card_visa', { customer: customer.id })
  subscription = (
    await stripe.subscriptions.create({
      customer: customer.id,
      default_payment_method: good.id,
      items: [{ price: price.id, quantity: 1 }],
    })
  ).id
  await waitFor(async () => (await capacity()) === 2)
  report('Resubscription restores paid team capacity')
  await stripe.subscriptions.cancel(subscription)
  await waitFor(async () => (await capacity()) === 1)
  report('Explicit cancellation of active subscription revokes paid slots')
  const abandoned = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customer.id,
    client_reference_id: account,
    line_items: [{ price: price.id, quantity: 1 }],
    success_url: 'http://localhost:3102/billing',
    cancel_url: 'http://localhost:3102/billing',
  })
  await stripe.checkout.sessions.expire(abandoned.id)
  assert.equal((await stripe.checkout.sessions.retrieve(abandoned.id)).status, 'expired')
  assert.equal(await capacity(), 1)
  report('Expired checkout never grants paid capacity')
} finally {
  if (checkout?.status === 'open')
    await stripe.checkout.sessions.expire(checkout.id).catch(() => {})
  if (subscription) await stripe.subscriptions.cancel(subscription).catch(() => {})
  if (price) {
    await stripe.products
      .update(price.product, { active: false, default_price: '' })
      .catch(() => {})
    await stripe.prices.update(price.id, { active: false }).catch(() => {})
  }
  if (clock) await stripe.testHelpers.testClocks.del(clock.id).catch(() => {})
  cli?.kill()
  await new Promise((r) => (server ? server.close(r) : r()))
  await db.close()
  await writeFile(
    '/tmp/firstballot-stripe-results.json',
    JSON.stringify(
      {
        results,
        eventCount: received.length,
        failedDeliveries: failures,
        mode: 'test',
        database: 'isolated PGlite; production migration',
      },
      null,
      2
    )
  )
}
