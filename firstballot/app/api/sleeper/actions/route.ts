import { loadTradeInventory } from '@/lib/sleeper-sdk/trade-inventory'
import { validateTradeExtras } from '@/lib/sleeper-sdk/trade-assets'
import { sleeperTokenIdentity, sleeperConnectionStatus, normalizeSleeperToken } from '@/lib/sleeper-sdk/token-identity'
import { loadToken, saveToken, deleteToken } from '@/lib/sleeper-sdk/token-store'
import { webAccount } from '@/lib/platform/auth'
import { teamsFor } from '@/lib/platform/teams'
import { failure } from '@/lib/platform/http'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import {
  ownsRoster,
  tradePlayersStillOwned,
  sameLineup,
  TRADE_QUERY,
  tradeHeat,
  tradeOperation,
  lineupOperation,
  type ActionRoster,
} from '@/lib/sleeper-sdk/actions'

export const dynamic = 'force-dynamic'
const reply = (data: unknown, status = 200) =>
  NextResponse.json(data, { status, headers: { 'Cache-Control': 'private, no-store' } })

export async function POST(request: NextRequest) {
  const jwt = request.headers.get('x-user-jwt')
  if (!jwt) return reply({ error: 'Sign in to connect Sleeper.' }, 401)
  const {
    data: { user },
    error,
  } = await supabaseServer.auth.getUser(jwt)
  if (error || !user) return reply({ error: 'Sign in again to continue.' }, 401)
  const body = await request.json().catch(() => null)
  if (
    !body ||
    (body.token != null && (typeof body.token !== 'string' || body.token.length > 12000)) ||
    (!['status', 'disconnect'].includes(body.action) && !/^\d{10,25}$/.test(body.leagueId ?? '')) ||
    !['status', 'connect', 'restore', 'disconnect', 'trade', 'lineup'].includes(body.action)
  )
    return reply({ error: 'Invalid Sleeper request.' }, 400)
  if (['trade','lineup'].includes(body.action)) {
    try {
      const teams = await teamsFor(await webAccount(request))
      if (!teams.some(t=>t.league_id===body.leagueId && t.active)) return reply({error:'Activate this team before sending an action.'},403)
    } catch(e) {return failure(e)}
  }
  let token: string
  try {
    if (body.action === 'disconnect') {
      await deleteToken(user.id)
      return reply({ disconnected: true })
    }
    const saved = body.action === 'connect' ? body.token?.trim() : await loadToken(user.id)
    if (body.action === 'status') return reply(sleeperConnectionStatus(saved))
    if (!saved)
      return reply(
        body.action === 'restore'
          ? { connected: false }
          : { error: 'Connect your Sleeper token first.' },
        body.action === 'restore' ? 200 : 401
      )
    token = saved
  } catch (e) {
    return reply({ error: e instanceof Error ? e.message : 'Connection unavailable.' }, 503)
  }
  let identity: { user_id?: string; exp?: number }
  try {
    token = normalizeSleeperToken(token)
    identity = sleeperTokenIdentity(token)
  } catch (e) {
    return reply({ error: e instanceof Error ? e.message : 'Paste a valid Sleeper authorization token.' }, 400)
  }
  if (!identity.user_id || !identity.exp || identity.exp * 1000 <= Date.now())
    return reply({ error: 'Sleeper token has expired or is invalid.' }, 401)
  // Decoded claims are not trusted for authorization. Sleeper verifies the token on
  // the read below before we inspect ownership or permit any fixed mutation.
  const gql = async (operation: { operationName: string; query: string; variables: object }) => {
    const response = await fetch('https://sleeper.com/graphql', {
      method: 'POST',
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
      headers: {
        authorization: token,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0',
        origin: 'https://sleeper.com',
        referer: 'https://sleeper.com/',
        'x-sleeper-graphql-op': operation.operationName,
      },
      body: JSON.stringify(operation),
    })
    const result = await response.json()
    if (!response.ok || result.errors || !result.data)
      throw new Error(
        'Sleeper could not complete the request. Check your token and league permissions. If submitting an action, check Sleeper before trying again.'
      )
    return result.data
  }
  try {
    const [read, rosterResponse, leagueResponse, stateResponse] = await Promise.all([
      gql({
        operationName: 'league_transactions_filtered',
        query: TRADE_QUERY,
        variables: { league_id: body.leagueId, limit: 200 },
      }),
      fetch(`https://api.sleeper.app/v1/league/${body.leagueId}/rosters`, { cache: 'no-store' }),
      fetch(`https://api.sleeper.app/v1/league/${body.leagueId}`, { cache: 'no-store' }),
      fetch('https://api.sleeper.app/v1/state/nfl', { cache: 'no-store' }),
    ])
    if (![rosterResponse, leagueResponse, stateResponse].every((r) => r.ok))
      return reply({ error: 'Could not verify current league data.' }, 502)
    const rosters: ActionRoster[] = await rosterResponse.json()
    const league = await leagueResponse.json()
    const state = await stateResponse.json()
    const mine = rosters.find((r) => ownsRoster(r, String(identity.user_id)))
    if (!mine)
      return reply({ error: 'This Sleeper account does not manage a team in this league.' }, 403)
    const trades = read.league_transactions_filtered
    if (!Array.isArray(trades))
      return reply({ error: 'Sleeper did not return trade history.' }, 502)
    if (body.action === 'connect' || body.action === 'restore') {
      if (body.action === 'connect') await saveToken(user.id, token)
      return reply({
        connected: true,
        rosterId: mine.roster_id,
        heat: tradeHeat(trades, rosters),
        historyCount: trades.length,
        limited: trades.length >= 200,
      })
    }
    if (body.confirmed !== true || Number(body.rosterId) !== mine.roster_id)
      return reply({ error: 'Review the action for your own team before confirming.' }, 400)
    if (body.action === 'trade') {
      const other = rosters.find((r) => r.roster_id === body.partnerId)
      if (!other || !tradePlayersStillOwned(mine, other, body.give, body.receive))
        return reply(
          { error: 'Player ownership changed. Refresh and review the trade again.' },
          409
        )
      let assets
      try {
        assets = validateTradeExtras(
          mine.roster_id,
          other.roster_id,
          body,
          await loadTradeInventory(body.leagueId)
        )
      } catch (error) {
        return reply(
          { error: error instanceof Error ? error.message : 'Could not verify trade assets.' },
          409
        )
      }
      const operation = tradeOperation(
        body.leagueId,
        mine.roster_id,
        other.roster_id,
        body.give,
        body.receive,
        assets
      )
      const result = await gql(operation)
      if (!result.propose_trade?.transaction_id)
        return reply(
          { error: 'No trade confirmation returned. Check Sleeper before retrying.' },
          502
        )
      return reply({ trade: result.propose_trade })
    }
    if (
      league.season !== state.season ||
      state.season_type !== 'regular' ||
      Number(body.week) !== state.week
    )
      return reply(
        { error: 'Lineup actions are available for the current regular-season week only.' },
        409
      )
    const matchupResponse = await fetch(
      `https://api.sleeper.app/v1/league/${body.leagueId}/matchups/${state.week}`,
      { cache: 'no-store' }
    )
    if (!matchupResponse.ok) return reply({ error: 'Could not verify the current lineup.' }, 502)
    const matchup = (await matchupResponse.json()).find(
      (r: { roster_id: number }) => r.roster_id === mine.roster_id
    )
    if (!matchup || !sameLineup(matchup.starters, body.expectedStarters))
      return reply({ error: 'Your lineup changed. Refresh before reviewing it again.' }, 409)
    const slots = (league.roster_positions as string[]).filter(
      (slot) => !['BN', 'IR', 'TAXI'].includes(slot)
    )
    if (
      !Array.isArray(body.starters) ||
      body.starters.length !== slots.length ||
      !body.starters.every((id: string) => mine.players?.includes(id))
    )
      return reply(
        { error: 'The lineup must fill every starting slot with a rostered player.' },
        400
      )
    // Sleeper enforces position eligibility, game locks and league restrictions.
    // Never retry a mutation automatically: a timeout may follow a successful write.
    const result = await gql(
      lineupOperation(body.leagueId, mine.roster_id, state.week, body.starters)
    )
    if (!sameLineup(result.update_matchup_leg?.starters, body.starters))
      return reply(
        { error: 'No lineup confirmation returned. Check Sleeper before retrying.' },
        502
      )
    return reply({ lineup: result.update_matchup_leg })
  } catch (error) {
    return reply(
      {
        error:
          error instanceof Error && !/fetch|JSON|timeout|abort/i.test(error.message)
            ? error.message
            : 'Sleeper did not confirm the request. Check Sleeper before retrying an action.',
      },
      502
    )
  }
}
