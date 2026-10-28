// PR-16b (decision D4): trades are valued at the KTC price on their date where history
// exists; older trades have no trade-date price instead of today's.
import test from 'node:test'
import assert from 'node:assert/strict'
import { ktcDayFor, ktcDaysNeeded, tradeDateKtc, rankingsAtTradeDate } from '../lib/trade-market/trade-date-values.ts'
import { computeTradeAnalytics } from '../components/trade-market/analytics.ts'
import { processPlayerForTrade } from '../lib/trade-utils.ts'

const DAYS = ['2026-03-22', '2026-03-23', '2026-03-25'] // 03-24 missing, as real gaps are
const at = (iso) => Date.parse(`${iso}T15:00:00Z`)
const players = { 1: { first_name: 'Bijan', last_name: 'Robinson', full_name: 'Bijan Robinson', position: 'RB' }, 2: { first_name: 'Puka', last_name: 'Nacua', full_name: 'Puka Nacua', position: 'WR' } }
// Sleeper id → KTC id (the tier publish's match), and KTC values by KTC id.
const ktcIds = new Map([['1', 101], ['2', 202]])
const ktcByDay = { '2026-03-23': { 101: 9000, 202: 7000 }, '2026-03-25': { 101: 9500 } }
const trade = (id, iso) => ({ transaction_id: id, created: at(iso), type: 'trade', status: 'complete', roster_ids: [1, 2], adds: { 1: 1, 2: 2 }, drops: { 1: 2, 2: 1 }, draft_picks: [] })

test('a trade uses the newest complete KTC day on or before it', () => {
  assert.equal(ktcDayFor('2026-03-24', DAYS), '2026-03-23')
  assert.equal(ktcDayFor('2026-03-25', DAYS), '2026-03-25')
  assert.equal(ktcDayFor('2026-03-01', DAYS), null)
  assert.deepEqual(ktcDaysNeeded([trade('a', '2026-03-24'), trade('b', '2025-11-01')], DAYS), ['2026-03-23'])
})

test('trades before price history get no trade-date price, never today\'s', () => {
  const values = tradeDateKtc([trade('a', '2026-03-24'), trade('b', '2025-11-01'), trade('c', '2026-03-26')], ktcIds, ktcByDay, DAYS)
  assert.deepEqual(values.a, { 1: 9000, 2: 7000 })
  assert.equal(values.b, undefined)
  assert.deepEqual(values.c, { 1: 9500 }, 'a player KTC did not list that day is absent, not defaulted')
})

test('the trade-date valuation replaces today\'s price in the KPIs', () => {
  const t = trade('a', '2026-03-24')
  const today = { 1: { rank: 1, tier_name: 'Elite', ktc_value_sf: 4000 }, 2: { rank: 5, tier_name: 'Elite', ktc_value_sf: 4000 } }
  const cache = new Map(['1', '2'].map((id) => [id, processPlayerForTrade(id, players, today)]))
  const meta = (_l, rosterId) => ({ rosterId, ownerName: `O${rosterId}`, teamName: `T${rosterId}` })
  const values = tradeDateKtc([t], ktcIds, ktcByDay, DAYS)
  const onDate = (tr, pid) =>
    processPlayerForTrade(pid, players, rankingsAtTradeDate(pid, values[tr.transaction_id][pid] ?? null, today))
  const todayKpis = computeTradeAnalytics([t], players, meta, cache).rosterKPIs
  const dateKpis = computeTradeAnalytics([t], players, meta, cache, onDate).rosterKPIs
  // Equal today (4000 each way); on the trade date Bijan (9000) beat Puka (7000).
  assert.equal(todayKpis.find((r) => r.rosterId === 1).netKtc, 0)
  assert.ok(dateKpis.find((r) => r.rosterId === 1).netKtc > 0)
})
