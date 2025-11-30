export interface FantasyProductionTrend {
  season: number
  avgPPG: number
}

export interface DraftPositionDataPoint {
  draftPick: number
  fantasyPPG: number
}

export interface ModelPerformanceDataPoint {
  predicted: number
  actual: number
}
