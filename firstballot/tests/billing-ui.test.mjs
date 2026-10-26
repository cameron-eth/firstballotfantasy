import test from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const dom = new JSDOM('<div id="app"></div>', { url: 'http://localhost/billing' })
globalThis.self = dom.window
globalThis.window = dom.window
globalThis.document = dom.window.document
globalThis.navigator = dom.window.navigator
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const React = await import('react'),
  { createRoot } = await import('react-dom/client'),
  { SWRConfig } = require('swr'),
  { CheckoutConfirmation } = await import('../components/billing/CheckoutConfirmation.tsx')
const { act } = React
const user = { id: 'account-test' }
async function render(response) {
  globalThis.billingTestUser = user
  let calls = 0
  globalThis.fetch = async () => {
    calls++
    return { ok: true, json: async () => response() }
  }
  const root = createRoot(document.getElementById('app'))
  await act(async () => {
    root.render(
      React.createElement(
        SWRConfig,
        { value: { provider: () => new Map(), dedupingInterval: 0 } },
        React.createElement(CheckoutConfirmation, {
          session: 'cs_test_fixture',
          accountId: globalThis.billingTestUser?.id ?? null,
        })
      )
    )
    await new Promise((r) => setTimeout(r, 30))
  })
  return {
    root,
    get calls() {
      return calls
    },
  }
}
async function close(root) {
  await act(async () => root.unmount())
}
test('checkout return waits for verified activation and Check again reveals unlocked slots', async () => {
  let state = { state: 'processing', capacity: 1 }
  const view = await render(() => state)
  assert.match(document.body.textContent, /waiting for payment confirmation/)
  assert.doesNotMatch(document.body.textContent, /Your team slots are ready/)
  state = { state: 'active', capacity: 3 }
  await act(async () => {
    document.querySelector('button').click()
    await new Promise((r) => setTimeout(r, 30))
  })
  assert.match(document.body.textContent, /Your team slots are ready/)
  assert.match(document.body.textContent, /3 team slots/)
  assert.equal(document.querySelector('a').getAttribute('href'), '/league-buddy')
  assert.ok(view.calls >= 2)
  await close(view.root)
})
test('incomplete checkout offers resume without claiming features unlocked', async () => {
  const view = await render(() => ({
    state: 'open',
    capacity: 1,
    checkoutUrl: 'https://checkout.stripe.com/test-fixture',
  }))
  assert.match(document.body.textContent, /Checkout was not completed/)
  assert.equal(document.querySelector('a').textContent, 'Resume secure checkout')
  assert.doesNotMatch(document.body.textContent, /slots are ready/)
  await close(view.root)
})
test('expired checkout gives recovery feedback and no resume URL', async () => {
  const view = await render(() => ({ state: 'expired', capacity: 1 }))
  assert.match(document.body.textContent, /Checkout expired/)
  assert.equal(document.querySelector('a'), null)
  await close(view.root)
})
test('signed-out return never fetches another account checkout or spins indefinitely', async () => {
  globalThis.billingTestUser = null
  let calls = 0
  globalThis.fetch = async () => {
    calls++
    throw Error('must not fetch')
  }
  const root = createRoot(document.getElementById('app'))
  await act(async () =>
    root.render(
      React.createElement(CheckoutConfirmation, {
        session: 'cs_test_fixture',
        accountId: globalThis.billingTestUser?.id ?? null,
      })
    )
  )
  assert.match(document.body.textContent, /Sign in to confirm/)
  assert.equal(calls, 0)
  await close(root)
})

// Isolate the existing account hook; exercise the real activation component and its requests.
const authPath = require.resolve('../lib/auth.tsx')
require.cache[authPath] = {
  id: authPath,
  filename: authPath,
  loaded: true,
  exports: { useAuth: () => ({ user }) },
}
const { TeamActivation } = await import('../components/league-buddy/TeamActivation.tsx')
async function activationView(full) {
  let active = false,
    finish
  const pending = new Promise((resolve) => {
    finish = resolve
  })
  const requests = []
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options })
    if (options?.method === 'POST') {
      await pending
      active = !full
      return { ok: true, json: async () => ({ needsUpgrade: full }) }
    }
    return {
      ok: true,
      json: async () => ({
        teams: [{ id: 'team', league_id: 'league', active }],
        capacity: full ? 1 : 3,
      }),
    }
  }
  const root = createRoot(document.getElementById('app'))
  await act(async () => {
    root.render(
      React.createElement(
        SWRConfig,
        { value: { provider: () => new Map(), dedupingInterval: 0 } },
        React.createElement(TeamActivation, { leagueId: 'league' }, 'TEAM_WORKSPACE')
      )
    )
    await new Promise((r) => setTimeout(r, 30))
  })
  return { root, finish, requests }
}
test('Activate button disables during write and reveals team workspace only after server activation', async () => {
  const view = await activationView(false)
  await act(async () => document.querySelector('button').click())
  assert.equal(document.querySelector('button').disabled, true)
  assert.match(document.body.textContent, /Connecting/)
  assert.doesNotMatch(document.body.textContent, /TEAM_WORKSPACE/)
  await act(async () => {
    view.finish()
    await new Promise((r) => setTimeout(r, 30))
  })
  assert.match(document.body.textContent, /TEAM_WORKSPACE/)
  assert.equal(
    JSON.parse(view.requests.find((r) => r.options?.method === 'POST').options.body).action,
    'activate'
  )
  await close(view.root)
})
test('Full-slot activation leaves workspace locked and offers Manage team slots', async () => {
  const view = await activationView(true)
  await act(async () => {
    document.querySelector('button').click()
    view.finish()
    await new Promise((r) => setTimeout(r, 30))
  })
  assert.match(document.body.textContent, /Add a slot or archive another team/)
  assert.doesNotMatch(document.body.textContent, /TEAM_WORKSPACE/)
  assert.equal(document.querySelector('a').getAttribute('href'), '/billing')
  await close(view.root)
})
