export interface TierStats {
  percentage: string
  players: number
  avgPPG: string
}

export interface TeamArchetypeRoster {
  [position: string]: {
    tier: string
    ppg: string
  }
}

export interface TeamArchetype {
  id: string
  name: string
  description: string
  strategy: string
  roster: TeamArchetypeRoster
  pros: string[]
  cons: string[]
  draftStrategy: string[]
  expectedPPG: string
  probability: string
  riskLevel: string
  icon?: React.ComponentType<{ className?: string }>
}

export interface TeamBuilderData {
  tierDistribution: Record<string, TierStats>
  teamArchetypes: TeamArchetype[]
}
