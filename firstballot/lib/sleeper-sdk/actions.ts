/** Authenticated operations mirror sleeper-sdk/python/src/sleeper/auth/client.py. */
export interface PrivateTrade {
  transaction_id: string
  creator: string
  status: string
  adds: Record<string, number> | null
  drops: Record<string, number> | null
}
export interface ActionRoster {
  roster_id: number
  owner_id: string
  co_owners?: string[] | null
  players?: string[]
  starters?: string[]
}

export function tradeHeat(trades: PrivateTrade[], rosters: ActionRoster[]) {
  const managers = new Map<string, Set<string>>()
  for (const trade of trades) {
    const creatorRosters = new Set(
      rosters
        .filter((r) => r.owner_id === trade.creator || r.co_owners?.includes(trade.creator))
        .map((r) => r.roster_id)
    )
    for (const [player, receiver] of Object.entries(trade.adds ?? {})) {
      if (
        !creatorRosters.has(Number(receiver)) ||
        Number(trade.drops?.[player]) === Number(receiver)
      )
        continue
      const interested = managers.get(player) ?? new Set<string>()
      interested.add(trade.creator)
      managers.set(player, interested)
    }
  }
  return Object.fromEntries([...managers].map(([id, people]) => [id, people.size]))
}

export const TRADE_QUERY = `query league_transactions_filtered($league_id: Snowflake!, $limit: Int) {
  league_transactions_filtered(league_id: $league_id, type_filters: ["trade"], status_filters: ["proposed", "complete", "rejected", "cancelled", "vetoed"], limit: $limit) {
    transaction_id creator status adds drops
  }
}`

export function tradeOperation(
  leagueId: string,
  mine: number,
  theirs: number,
  give: string[],
  receive: string[],
  assets: {
    draftPicks: string[]
    waiverBudget: string[]
    giveCount: number
    receiveCount: number
  } = { draftPicks: [], waiverBudget: [], giveCount: 0, receiveCount: 0 }
) {
  const ids = [...give, ...receive]
  if (
    mine === theirs ||
    !(give.length + assets.giveCount) ||
    !(receive.length + assets.receiveCount) ||
    new Set(ids).size !== ids.length ||
    ids.length > 40 ||
    ids.some((id) => !/^[a-z0-9]+$/i.test(id))
  )
    throw new Error('Choose different teams and at least one asset on each side.')
  return {
    operationName: 'propose_trade',
    query: `mutation propose_trade($league_id: Snowflake!, $k_adds: [String], $v_adds: [Int], $k_drops: [String], $v_drops: [Int], $draft_picks: [String], $waiver_budget: [String]) {
    propose_trade(league_id: $league_id, k_adds: $k_adds, v_adds: $v_adds, k_drops: $k_drops, v_drops: $v_drops, draft_picks: $draft_picks, waiver_budget: $waiver_budget) { transaction_id status }
  }`,
    variables: {
      league_id: leagueId,
      draft_picks: assets.draftPicks,
      waiver_budget: assets.waiverBudget,
      k_adds: ids,
      v_adds: [...give.map(() => theirs), ...receive.map(() => mine)],
      k_drops: ids,
      v_drops: [...give.map(() => mine), ...receive.map(() => theirs)],
    },
  }
}

export function lineupOperation(
  leagueId: string,
  rosterId: number,
  week: number,
  starters: string[]
) {
  if (
    !/^\d+$/.test(leagueId) ||
    !Number.isInteger(rosterId) ||
    rosterId < 1 ||
    !Number.isInteger(week) ||
    week < 1 ||
    week > 18 ||
    starters.some((id) => !/^[a-z0-9]+$/i.test(id)) ||
    new Set(starters).size !== starters.length
  )
    throw new Error('Invalid lineup.')
  return {
    operationName: 'update_matchup_leg',
    query: `mutation update_matchup_leg($starters_games: Map) {
    update_matchup_leg(league_id: "${leagueId}", roster_id: ${rosterId}, leg: ${week}, round: ${week}, starters: ${JSON.stringify(starters)}, starters_games: $starters_games) { roster_id starters }
  }`,
    variables: {},
  }
}

export function ownsRoster(roster: ActionRoster, userId: string) {
  return roster.owner_id === userId || roster.co_owners?.includes(userId) === true
}
export function tradePlayersStillOwned(
  mine: ActionRoster,
  other: ActionRoster,
  give: unknown,
  receive: unknown
) {
  return (
    Array.isArray(give) &&
    Array.isArray(receive) &&
    give.every((id) => typeof id === 'string' && mine.players?.includes(id)) &&
    receive.every((id) => typeof id === 'string' && other.players?.includes(id))
  )
}
export function sameLineup(current: unknown, expected: unknown) {
  return (
    Array.isArray(current) &&
    Array.isArray(expected) &&
    current.length === expected.length &&
    current.every((id, i) => id === expected[i])
  )
}
