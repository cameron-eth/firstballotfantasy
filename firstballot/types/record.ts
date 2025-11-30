export interface BreakoutBustPlayer {
  player_name: string
  position: string
  season: number
  recent_team: string
  fantasy_ppg: number
  predicted_fantasy_ppg: number
  prediction_error: number
  surprise_factor: number
  performance_ratio: number
  tier_upgrade: boolean
  tier_downgrade: boolean
  age: number
  prospect_tier: string
  draft_round: string
  player_id?: string
}

export type StatType = 'passing' | 'rushing' | 'receiving'
