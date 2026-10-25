export type Target = {
  id: string
  name: string
  position: string
  team: string
  image: string | null
  kind: 'trade' | 'draft'
  year?: number
}
export type Scenario = {
  id: string
  name: string
  notes: string
  outgoing: string[]
  targets: Target[]
}
export function validateScenarios(value: unknown): value is Scenario[] {
  if (!Array.isArray(value) || value.length > 12) return false
  const text = (v: unknown, max: number) => typeof v === 'string' && v.length <= max
  return (
    new Set(value.map((s) => s?.id)).size === value.length &&
    value.every(
      (s) =>
        s &&
        /^[a-zA-Z0-9-]{1,64}$/.test(s.id) &&
        text(s.name, 80) &&
        s.name.trim() &&
        text(s.notes, 2000) &&
        Array.isArray(s.outgoing) &&
        s.outgoing.length <= 100 &&
        s.outgoing.every(
          (id: unknown) => typeof id === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(id)
        ) &&
        Array.isArray(s.targets) &&
        s.targets.length <= 100 &&
        new Set(s.targets.map((t: Target) => t?.id)).size === s.targets.length &&
        s.targets.every(
          (t: Target) =>
            t &&
            typeof t.id === 'string' &&
            /^(nfl|prospect):[a-zA-Z0-9_-]{1,64}$/.test(t.id) &&
            text(t.name, 120) &&
            text(t.position, 12) &&
            text(t.team, 100) &&
            ['trade', 'draft'].includes(t.kind) &&
            (t.image === null || (text(t.image, 1000) && /^https:\/\//.test(t.image))) &&
            (t.year === undefined || (Number.isInteger(t.year) && t.year >= 2020 && t.year <= 2100))
        )
    )
  )
}
export function plannedPositionCount(
  position: string,
  players: { playerId: string; position: string }[],
  scenario: Scenario
) {
  return (
    players.filter((p) => p.position === position && !scenario.outgoing.includes(p.playerId))
      .length + scenario.targets.filter((t) => t.position === position).length
  )
}
