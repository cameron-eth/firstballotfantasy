export interface ModelMetric {
  position: string
  r2: number
  rmse: number
  cv_r2_mean: number
  cv_r2_std: number
  records: number
  players: number
}

export interface OverallStats {
  totalRecords: number
  uniquePlayers: number
  seasonsAnalyzed: number
  overallR2: number
  pipelineRuntime: number
}

export interface MetricsData {
  modelMetrics: ModelMetric[]
  overallStats: OverallStats
}
