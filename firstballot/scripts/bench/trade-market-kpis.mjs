// Per-roster Trade Market KPIs from saved payloads (trade-market-payload.mjs), on both value
// bases, computed the way app/trade-market/page.tsx does. Usage:
//   node --import tsx --import ./tests/helpers/register.mjs scripts/bench/trade-market-kpis.mjs <payloadDir>
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
const { computeTradeAnalytics } = await import('../../components/trade-market/analytics.ts')
const { processPlayerForTrade } = await import('../../lib/trade-utils.ts')
const { rankingsAtTradeDate } = await import('../../lib/trade-market/trade-date-values.ts')
const pickValues = await import('../../lib/trade-market/pick-values.ts').catch(() => null)

const dir = process.argv[2]
const out = {}
for (const file of (await readdir(dir)).filter((f) => f.startsWith('tm-'))) {
  const { data } = JSON.parse(await readFile(join(dir, file), 'utf8'))
  const trades = data.transactions
  const getTeamMeta = (leagueId, rosterId) =>
    (leagueId ? data.teamsByLeague[leagueId] || [] : data.teams).find((t) => t.rosterId === rosterId) ||
    data.teams.find((t) => t.rosterId === rosterId)
  const cache = new Map()
  for (const tx of trades)
    for (const pid of [...Object.keys(tx.adds || {}), ...Object.keys(tx.drops || {})]) {
      const pv = processPlayerForTrade(pid, data.allPlayers, data.dynastyRankings)
      if (pv) cache.set(pid, pv)
    }
  const todayPick = pickValues
    ? (trade, pick) => pickValues.pickValue(data.pickKtc, 'today', trade, pick)
    : undefined
  const datedPick = pickValues
    ? (trade, pick) => pickValues.pickValue(data.pickKtc, 'tradeDate', trade, pick)
    : undefined
  const today = computeTradeAnalytics(trades, data.allPlayers, getTeamMeta, cache, undefined, todayPick)
  const dated = trades.filter((tx) => data.tradeDateKtc?.[tx.transaction_id])
  const onDate = (trade, pid) =>
    processPlayerForTrade(
      pid,
      data.allPlayers,
      rankingsAtTradeDate(pid, data.tradeDateKtc?.[trade.transaction_id]?.[pid] ?? null, data.dynastyRankings)
    )
  const tradeDate = computeTradeAnalytics(dated, data.allPlayers, getTeamMeta, cache, onDate, datedPick)
  const kpis = (a) =>
    Object.fromEntries(
      a.rosterKPIs.map((k) => [k.ownerName, { gained: k.ktcGained, lost: k.ktcLost, net: k.netKtc, wins: k.wins ?? k.winRate, grade: k.grade }])
    )
  out[data.leagueId] = { trades: trades.length, dated: dated.length, today: kpis(today), tradeDate: kpis(tradeDate) }
}
console.log(JSON.stringify(out))
