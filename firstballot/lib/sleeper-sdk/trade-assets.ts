import type { TradeInventory } from './trade-inventory'
export interface TradeExtras {
  givePicks?: string[]
  receivePicks?: string[]
  giveFaab?: number
  receiveFaab?: number
}
export function validateTradeExtras(
  mine: number,
  theirs: number,
  extras: TradeExtras,
  inventory: TradeInventory
) {
  const { givePicks = [], receivePicks = [], giveFaab = 0, receiveFaab = 0 } = extras
  if (
    !Array.isArray(givePicks) ||
    !Array.isArray(receivePicks) ||
    givePicks.length + receivePicks.length > 40 ||
    new Set([...givePicks, ...receivePicks]).size !== givePicks.length + receivePicks.length
  )
    throw new Error('Invalid or duplicate draft picks.')
  const encode = (ids: string[], from: number, to: number) =>
    ids.map((id) => {
      const pick = inventory.picks.find((p) => p.id === id && p.owner_id === from)
      if (!pick) throw new Error('Pick ownership changed. Refresh and review the offer again.')
      return `${pick.roster_id},${pick.season},${pick.round},${from},${to}`
    })
  const draftPicks = [...encode(givePicks, mine, theirs), ...encode(receivePicks, theirs, mine)]
  const waiverBudget: string[] = []
  for (const [amount, from, to] of [
    [giveFaab, mine, theirs],
    [receiveFaab, theirs, mine],
  ]) {
    if (
      !Number.isSafeInteger(amount) ||
      amount < 0 ||
      (amount > 0 && (inventory.faab[from] == null || amount > inventory.faab[from]!))
    )
      throw new Error('FAAB exceeds the available budget or is not supported in this league.')
    if (amount) waiverBudget.push(`${from}-${to}-${amount}`)
  }
  return {
    draftPicks,
    waiverBudget,
    giveCount: givePicks.length + (giveFaab > 0 ? 1 : 0),
    receiveCount: receivePicks.length + (receiveFaab > 0 ? 1 : 0),
  }
}
