// T0 of docs/product/LEAGUE_TRADE_HISTORY_PLAN.md: a read-only audit of trade history for
// every connected league, plus the KTC pick data the later steps depend on. It writes the
// report data as JSON, and with --fixtures it records anonymized fixtures for T1's goldens.
//
//   /path/to/node22 --conditions=react-server --import tsx --import ./tests/helpers/register.mjs \
//     scripts/audit/trade-history.mjs <out.json> [--fixtures]
//
// Needs the Supabase env from .env.local (service role, read-only use). It calls the
// /api/trade-market handler directly, so the trades are exactly what Trade Market reads.
import { mkdir, writeFile } from 'node:fs/promises'
import { gzipSync } from 'node:zlib'

const { GET } = await import('../../app/api/trade-market/route.ts')
const { NextRequest } = await import('next/server')
const { supabaseAdmin } = await import('../../lib/supabase-server.ts')
const { sleeperClient, SLEEPER_CACHE } = await import('../../lib/sleeper-sdk/client.ts')
const { resolveLeagueContext } = await import('../../lib/league-metrics/context.ts')
const { tradeDay, ktcDayFor } = await import('../../lib/trade-market/trade-date-values.ts')
const { pickAssetName, pickKey } = await import('../../lib/trade-market/pick-values.ts')
const { completeKtcDays } = await import('../../lib/platform/ktc-days.ts')
const { readSnapshot } = await import('../../lib/platform/snapshots.ts')
const { TIER_KEY } = await import('../../lib/dynasty-tiers.ts')

const ROME_ODUNZE = '11620'
// Fixtures for T1: two SF dynasty leagues, a 1QB dynasty league and a 1QB redraft league.
const FIXTURES = {
  '1312168898304409600': 'sf-dynasty-a',
  '1332076845033590784': 'sf-dynasty-b',
  '1316872232240160768': '1qb-dynasty',
  '1391433358105387008': 'redraft-1qb',
}

const [outPath, flag] = process.argv.slice(2)
if (!outPath) {
  console.error('usage: trade-history.mjs <out.json> [--fixtures]')
  process.exit(1)
}

async function connectedLeagues() {
  const { data, error } = await supabaseAdmin.from('connected_teams').select('league_id')
  if (error) throw new Error('connected_teams unavailable')
  return [...new Set(data.map((row) => String(row.league_id)))]
}

async function tradeMarket(leagueId) {
  const response = await GET(
    new NextRequest(`https://audit.local/api/trade-market?leagueId=${leagueId}`)
  )
  if (!response.ok) throw new Error(`trade-market ${leagueId}: ${response.status}`)
  return (await response.json()).data
}

/** The rosters' owners per season of a lineage, oldest season first. */
function ownersBySeason(data) {
  return [...data.leagueHistory].reverse().map((league) => ({
    season: league.season,
    leagueId: league.leagueId,
    owners: new Map(
      (data.teamsByLeague[league.leagueId] ?? []).map((t) => [t.rosterId, t.ownerId ?? null])
    ),
  }))
}

/** Rosters whose owner changed between consecutive seasons, and managers who moved roster. */
function ownerChanges(seasons) {
  let rosterChanged = 0
  let managerMoved = 0
  let orphaned = 0
  for (let i = 1; i < seasons.length; i++) {
    const before = seasons[i - 1].owners
    const after = seasons[i].owners
    for (const [rosterId, owner] of after) {
      if (!owner) orphaned++
      else if (before.has(rosterId) && before.get(rosterId) !== owner) rosterChanged++
    }
    const rosterOf = new Map([...before].map(([rosterId, owner]) => [owner, rosterId]))
    for (const [rosterId, owner] of after)
      if (owner && rosterOf.has(owner) && rosterOf.get(owner) !== rosterId) managerMoved++
  }
  return { rosterChanged, managerMoved, orphaned }
}

function isFullyPriced(trade, data) {
  const players = data.tradeDateKtc?.[trade.transaction_id]
  if (!players) return false
  const picks = data.pickKtc?.byTrade?.[trade.transaction_id] ?? {}
  return (
    Object.keys(trade.adds ?? {}).every((pid) => players[pid] != null) &&
    (trade.draft_picks ?? []).every((pick) => picks[pickKey(pick)] != null)
  )
}

function leagueStats(data, league) {
  const trades = data.transactions
  const status = {}
  for (const t of trades) status[t.status ?? 'unknown'] = (status[t.status ?? 'unknown'] ?? 0) + 1
  const priced = trades.filter((t) => data.tradeDateKtc?.[t.transaction_id])
  const picks = trades.flatMap((t) => t.draft_picks ?? [])
  const faab = trades.flatMap((t) => t.waiver_budget ?? [])
  const players = trades.reduce((n, t) => n + Object.keys(t.adds ?? {}).length, 0)
  const rome = trades.filter((t) => t.adds?.[ROME_ODUNZE] != null)
  const seasons = ownersBySeason(data)
  return {
    name: league.name,
    format: resolveLeagueContext(league).superflex ? 'sf' : '1qb',
    type:
      Number(league.settings?.type) === 2
        ? 'dynasty'
        : Number(league.settings?.type) === 1
          ? 'keeper'
          : 'redraft',
    teams: league.total_rosters,
    seasons: seasons.map((s) => s.season),
    trades: trades.length,
    status,
    pricedAtTradeDate: priced.length,
    fullyPriced: trades.filter((t) => isFullyPriced(t, data)).length,
    multiTeam: trades.filter((t) => (t.roster_ids ?? []).length > 2).length,
    withPicks: trades.filter((t) => (t.draft_picks ?? []).length).length,
    withFaab: trades.filter((t) => (t.waiver_budget ?? []).length).length,
    faabTotal: faab.reduce((n, w) => n + Number(w.amount || 0), 0),
    assets: {
      players,
      picks: picks.length,
      picksPastRound4: picks.filter((p) => p.round > 4).length,
      faabMoves: faab.length,
    },
    pickOnly: trades.filter(
      (t) => !Object.keys(t.adds ?? {}).length && (t.draft_picks ?? []).length
    ).length,
    unpricedPicks: {
      today: picks.filter((p) => data.pickKtc?.today?.[pickKey(p)] == null).length,
    },
    owners: ownerChanges(seasons),
    rome: {
      trades: rome.length,
      priced: rome.filter((t) => data.tradeDateKtc?.[t.transaction_id]).length,
    },
    firstTrade: trades.length
      ? tradeDay([...trades].sort((a, b) => a.created - b.created)[0])
      : null,
    lastTrade: trades.length
      ? tradeDay([...trades].sort((a, b) => b.created - a.created)[0])
      : null,
  }
}

async function ktcCoverage() {
  const days = await completeKtcDays()
  const { data: first } = await supabaseAdmin
    .from('ktc_player_values')
    .select('scraped_date')
    .order('scraped_date', { ascending: true })
    .limit(1)
    .maybeSingle()
  const picks = []
  for (const season of [2025, 2026, 2027, 2028, 2029, 2030])
    for (const kind of ['Mid 1st', 'Pick 1.01']) {
      const name = `${season} ${kind}`
      const [{ data: from }, { data: to }] = await Promise.all(
        [true, false].map((ascending) =>
          supabaseAdmin
            .from('ktc_player_values')
            .select('scraped_date,value_sf,value_1qb')
            .eq('player_name', name)
            .order('scraped_date', { ascending })
            .limit(1)
            .maybeSingle()
        )
      )
      picks.push({
        asset: name,
        from: from?.scraped_date ?? null,
        to: to?.scraped_date ?? null,
        latestSf: to?.value_sf ?? null,
        latest1qb: to?.value_1qb ?? null,
      })
    }
  return {
    firstRow: first?.scraped_date ?? null,
    completeDays: days.length,
    firstComplete: days[0] ?? null,
    lastComplete: days.at(-1) ?? null,
    picks,
  }
}

/** KTC SF and 1QB values for every asset of each trade on its KTC day: { tx: { asset: [sf, 1qb] } }. */
async function tradeValues(trades, ktcIds, days) {
  const wanted = new Map()
  for (const trade of trades) {
    const day = ktcDayFor(tradeDay(trade), days)
    if (!day) continue
    const assets = [
      ...Object.keys(trade.adds ?? {}).flatMap((pid) =>
        ktcIds[pid] != null ? [`ktc:${ktcIds[pid]}`] : []
      ),
      ...(trade.draft_picks ?? []).flatMap((pick) =>
        pickAssetName(pick) ? [`pick:${pickAssetName(pick)}`] : []
      ),
    ]
    wanted.set(trade.transaction_id, { day, assets })
  }
  const byDay = new Map()
  for (const { day, assets } of wanted.values())
    byDay.set(day, new Set([...(byDay.get(day) ?? []), ...assets]))
  const values = new Map()
  for (const [day, assets] of byDay) {
    const ids = [...assets].filter((a) => a.startsWith('ktc:')).map((a) => Number(a.slice(4)))
    const names = [...assets].filter((a) => a.startsWith('pick:')).map((a) => a.slice(5))
    const queries = [
      ids.length &&
        supabaseAdmin
          .from('ktc_player_values')
          .select('ktc_player_id,player_name,value_sf,value_1qb')
          .eq('scraped_date', day)
          .in('ktc_player_id', ids),
      names.length &&
        supabaseAdmin
          .from('ktc_player_values')
          .select('ktc_player_id,player_name,value_sf,value_1qb')
          .eq('scraped_date', day)
          .in('player_name', names),
    ].filter(Boolean)
    for (const { data, error } of await Promise.all(queries)) {
      if (error) throw new Error('KTC values unavailable')
      for (const row of data ?? []) {
        values.set(`${day}|ktc:${row.ktc_player_id}`, [row.value_sf, row.value_1qb])
        values.set(`${day}|pick:${row.player_name}`, [row.value_sf, row.value_1qb])
      }
    }
  }
  const result = {}
  for (const [tx, { day, assets }] of wanted)
    result[tx] = {
      day,
      values: Object.fromEntries(
        assets.flatMap((a) => (values.has(`${day}|${a}`) ? [[a, values.get(`${day}|${a}`)]] : []))
      ),
    }
  return result
}

/** A stable alias (m1, m2, …) per Sleeper user id, so fixtures carry no user ids. */
function managerAlias(managers, id) {
  if (id == null) return null
  if (!managers.has(id)) managers.set(id, `m${managers.size + 1}`)
  return managers.get(id)
}

/** An anonymized fixture: people and leagues renamed, only the fields T1 reads. */
async function fixture(label, data, stats, ktcIds, days) {
  const managers = new Map()
  const leagueAlias = new Map(data.leagueHistory.map((l) => [l.leagueId, `${label}:${l.season}`]))
  const trades = [...data.transactions]
    .sort((a, b) => a.created - b.created)
    .map((t, i) => ({
      id: `t${i + 1}`,
      league: leagueAlias.get(t._leagueId) ?? null,
      created: t.created,
      status: t.status,
      roster_ids: t.roster_ids ?? [],
      adds: t.adds ?? {},
      drops: t.drops ?? {},
      draft_picks: (t.draft_picks ?? []).map((p) => ({
        season: p.season,
        round: p.round,
        roster_id: p.roster_id,
        owner_id: p.owner_id,
        previous_owner_id: p.previous_owner_id,
      })),
      waiver_budget: (t.waiver_budget ?? []).map((w) => ({
        sender: w.sender,
        receiver: w.receiver,
        amount: w.amount,
      })),
      _tx: t.transaction_id,
    }))
  const values = await tradeValues(data.transactions, ktcIds, days)
  const involved = new Set(trades.flatMap((t) => Object.keys(t.adds)))
  return {
    label,
    format: stats.format,
    type: stats.type,
    seasons: data.leagueHistory.map((l) => ({
      league: leagueAlias.get(l.leagueId),
      season: l.season,
      owners: Object.fromEntries(
        (data.teamsByLeague[l.leagueId] ?? []).map((t) => [
          t.rosterId,
          managerAlias(managers, t.ownerId),
        ])
      ),
    })),
    ktcIds: Object.fromEntries(
      [...involved].flatMap((pid) => (ktcIds[pid] != null ? [[pid, ktcIds[pid]]] : []))
    ),
    trades: trades.map(({ _tx, ...t }) => ({ ...t, ktc: values[_tx] ?? null })),
    recordedAt: new Date().toISOString().slice(0, 10),
  }
}

const tiers = await readSnapshot(TIER_KEY)
const ktcIds = Object.fromEntries(
  Object.entries(tiers?.payload?.identity ?? {}).flatMap(([pid, who]) =>
    who.ktcId != null ? [[pid, who.ktcId]] : []
  )
)
const days = await completeKtcDays()
const report = { recordedAt: new Date().toISOString(), ktc: await ktcCoverage(), leagues: {} }
for (const leagueId of await connectedLeagues()) {
  const league = await sleeperClient.getLeague(leagueId, SLEEPER_CACHE.fresh)
  const data = await tradeMarket(leagueId)
  const stats = leagueStats(data, league)
  report.leagues[leagueId] = stats
  console.log(leagueId, stats.name, `${stats.trades} trades, ${stats.pricedAtTradeDate} priced`)
  if (flag === '--fixtures' && FIXTURES[leagueId]) {
    await mkdir(new URL('../../tests/fixtures/trade-history/', import.meta.url), {
      recursive: true,
    })
    const body = await fixture(FIXTURES[leagueId], data, stats, ktcIds, days)
    await writeFile(
      new URL(`../../tests/fixtures/trade-history/${FIXTURES[leagueId]}.json.gz`, import.meta.url),
      gzipSync(JSON.stringify(body))
    )
  }
}
await writeFile(outPath, JSON.stringify(report, null, 2))
