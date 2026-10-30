import test from 'node:test'
import assert from 'node:assert/strict'
import {
  pickAssetName,
  pickAssets,
  pickValue,
  tradePickKtc,
  unpricedPicks,
} from '../lib/trade-market/pick-values.ts'

const trade = (id, picks) => ({ transaction_id: id, draft_picks: picks })

test('a traded pick is priced as KTC’s Mid pick of its season and round, rounds 1–4 only', () => {
  assert.equal(pickAssetName({ season: '2027', round: 1 }), '2027 Mid 1st')
  assert.equal(pickAssetName({ season: 2028, round: 4 }), '2028 Mid 4th')
  assert.equal(pickAssetName({ season: '2027', round: 5 }), null)
  const assets = pickAssets([
    trade('a', [
      { season: '2027', round: 2 },
      { season: '2027', round: 6 },
    ]),
  ])
  assert.deepEqual([...assets], [['2027:2', '2027 Mid 2nd']])
})

test('trade-date prices use the trade’s KTC day, or the first listing for a pick not listed yet', () => {
  const trades = [
    trade('early', [
      { season: '2029', round: 1 },
      { season: '2027', round: 1 },
    ]),
    trade('none', []),
    trade('old', [{ season: '2027', round: 1 }]),
  ]
  const days = { early: '2026-08-14', old: null }
  const byTrade = tradePickKtc(
    trades,
    (t) => days[t.transaction_id],
    {
      '2026-08-14': { '2027 Mid 1st': 5900 },
    },
    new Map([['2029 Mid 1st', { day: '2026-09-22', value: 4300 }]])
  )
  assert.deepEqual(byTrade, { early: { '2029:1': 4300, '2027:1': 5900 } })
})

test('pick values sit on the player scale (KTC / 100) and an unpriced pick adds nothing', () => {
  const pickKtc = { today: { '2027:1': 5598 }, byTrade: { t: { '2027:1': 5900 } } }
  const t = { transaction_id: 't' }
  assert.equal(pickValue(pickKtc, 'today', t, { season: '2027', round: 1 }), 55.98)
  assert.equal(pickValue(pickKtc, 'tradeDate', t, { season: '2027', round: 1 }), 59)
  assert.equal(pickValue(pickKtc, 'today', t, { season: '2025', round: 1 }), 0)
  assert.equal(pickValue(undefined, 'today', t, { season: '2027', round: 1 }), 0)
  const trades = [
    trade('t', [
      { season: '2027', round: 1 },
      { season: '2025', round: 1 },
      { season: '2027', round: 5 },
    ]),
  ]
  assert.equal(unpricedPicks(trades, pickKtc, 'today'), 2)
})

test('the hard-coded pick scale is gone', async () => {
  const { readFile } = await import('node:fs/promises')
  const utils = await readFile(new URL('../lib/trade-utils.ts', import.meta.url), 'utf8')
  assert.doesNotMatch(utils, /getDraftPickValue|2027 class bonus/)
})
