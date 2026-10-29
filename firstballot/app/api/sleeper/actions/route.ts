import { loadTradeInventory } from '@/lib/sleeper-sdk/trade-inventory'
import { SLEEPER_CACHE, sleeperClient } from '@/lib/sleeper-sdk/client'
import { validateTradeExtras } from '@/lib/sleeper-sdk/trade-assets'
import {
  sleeperTokenIdentity,
  sleeperConnectionStatus,
  normalizeSleeperToken,
} from '@/lib/sleeper-sdk/token-identity'
import { loadToken, saveToken, deleteToken } from '@/lib/sleeper-sdk/token-store'
import { webAccount } from '@/lib/platform/auth'
import { readSession } from '@/lib/platform/session'
import { teamsFor } from '@/lib/platform/teams'
import { fail, failure } from '@/lib/platform/http'
import { NextRequest, NextResponse } from 'next/server'
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
  const session = readSession(request)
  if (!session) return fail(401, 'Sign in to connect Sleeper.')
  const body = await request.json().catch(() => null)
  if (
    !body ||
    (body.token != null && (typeof body.token !== 'string' || body.token.length > 12000)) ||
    (!['status', 'disconnect'].includes(body.action) && !/^\d{10,25}$/.test(body.leagueId ?? '')) ||
    !['status', 'connect', 'restore', 'disconnect', 'trade', 'lineup'].includes(body.action)
  )
    return fail(400, 'Invalid Sleeper request.')
  if (['trade', 'lineup'].includes(body.action)) {
    try {
      const teams = await teamsFor(await webAccount(request))
      if (!teams.some((t) => t.league_id === body.leagueId && t.active))
        return fail(403, 'Activate this team before sending an action.')
    } catch (e) {
      return failure(e)
    }
  }
  let token: string
  try {
    if (body.action === 'disconnect') {
      await deleteToken(session.userId)
      return reply({ disconnected: true })
    }
    const saved = body.action === 'connect' ? body.token?.trim() : await loadToken(session.userId)
    if (body.action === 'status') return reply(sleeperConnectionStatus(saved))
    if (!saved)
      return body.action === 'restore'
        ? reply({ connected: false })
        : fail(401, 'Connect your Sleeper token first.')
    token = saved
  } catch (e) {
    return fail(503, e instanceof Error ? e.message : 'Connection unavailable.')
  }
  let identity: { user_id?: string; exp?: number }
  try {
    token = normalizeSleeperToken(token)
    identity = sleeperTokenIdentity(token)
  } catch (e) {
    return fail(400, e instanceof Error ? e.message : 'Paste a valid Sleeper authorization token.')
  }
  if (!identity.user_id || !identity.exp || identity.exp * 1000 <= Date.now())
    return fail(401, 'Sleeper token has expired or is invalid.')
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
    const [read, rosters, league, state] = await Promise.all([
      gql({
        operationName: 'league_transactions_filtered',
        query: TRADE_QUERY,
        variables: { league_id: body.leagueId, limit: 200 },
      }),
      sleeperClient
        .read<ActionRoster[]>(`/league/${body.leagueId}/rosters`, SLEEPER_CACHE.fresh)
        .catch(() => null),
      sleeperClient.read<any>(`/league/${body.leagueId}`, SLEEPER_CACHE.fresh).catch(() => null),
      sleeperClient.read<any>('/state/nfl', SLEEPER_CACHE.fresh).catch(() => null),
    ])
    if (!rosters || !league || !state) return fail(502, 'Could not verify current league data.')
    const mine = rosters.find((r) => ownsRoster(r, String(identity.user_id)))
    if (!mine) return fail(403, 'This Sleeper account does not manage a team in this league.')
    const trades = read.league_transactions_filtered
    if (!Array.isArray(trades)) return fail(502, 'Sleeper did not return trade history.')
    if (body.action === 'connect' || body.action === 'restore') {
      if (body.action === 'connect') await saveToken(session.userId, token)
      return reply({
        connected: true,
        rosterId: mine.roster_id,
        heat: tradeHeat(trades, rosters),
        historyCount: trades.length,
        limited: trades.length >= 200,
      })
    }
    if (body.confirmed !== true || Number(body.rosterId) !== mine.roster_id)
      return fail(400, 'Review the action for your own team before confirming.')
    if (body.action === 'trade') {
      const other = rosters.find((r) => r.roster_id === body.partnerId)
      if (!other || !tradePlayersStillOwned(mine, other, body.give, body.receive))
        return fail(409, 'Player ownership changed. Refresh and review the trade again.')
      let assets
      try {
        assets = validateTradeExtras(
          mine.roster_id,
          other.roster_id,
          body,
          await loadTradeInventory(body.leagueId)
        )
      } catch (error) {
        return fail(409, error instanceof Error ? error.message : 'Could not verify trade assets.')
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
        return fail(502, 'No trade confirmation returned. Check Sleeper before retrying.')
      return reply({ trade: result.propose_trade })
    }
    if (
      league.season !== state.season ||
      state.season_type !== 'regular' ||
      Number(body.week) !== state.week
    )
      return fail(409, 'Lineup actions are available for the current regular-season week only.')
    const matchups = await sleeperClient
      .read<
        { roster_id: number; starters: string[] }[]
      >(`/league/${body.leagueId}/matchups/${state.week}`, SLEEPER_CACHE.fresh)
      .catch(() => null)
    if (!matchups) return fail(502, 'Could not verify the current lineup.')
    const matchup = matchups.find((r: { roster_id: number }) => r.roster_id === mine.roster_id)
    if (!matchup || !sameLineup(matchup.starters, body.expectedStarters))
      return fail(409, 'Your lineup changed. Refresh before reviewing it again.')
    const slots = (league.roster_positions as string[]).filter(
      (slot) => !['BN', 'IR', 'TAXI'].includes(slot)
    )
    if (
      !Array.isArray(body.starters) ||
      body.starters.length !== slots.length ||
      !body.starters.every((id: string) => mine.players?.includes(id))
    )
      return fail(400, 'The lineup must fill every starting slot with a rostered player.')
    // Sleeper enforces position eligibility, game locks and league restrictions.
    // Never retry a mutation automatically: a timeout may follow a successful write.
    const result = await gql(
      lineupOperation(body.leagueId, mine.roster_id, state.week, body.starters)
    )
    if (!sameLineup(result.update_matchup_leg?.starters, body.starters))
      return fail(502, 'No lineup confirmation returned. Check Sleeper before retrying.')
    return reply({ lineup: result.update_matchup_leg })
  } catch (error) {
    return fail(
      502,
      error instanceof Error && !/fetch|JSON|timeout|abort/i.test(error.message)
        ? error.message
        : 'Sleeper did not confirm the request. Check Sleeper before retrying an action.'
    )
  }
}
