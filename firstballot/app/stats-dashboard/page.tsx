'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { NGSStatsTable } from '@/components/ngs-stats-table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'

type StatType = 'passing' | 'rushing' | 'receiving'

interface NGSStatsResponse {
  data?: {
    player_gsis_id: string
    player_display_name: string
    player_position: string
    team_abbr: string
    fantasy_points: number
    fantasy_ppg: number
    pass_yards?: number
    pass_touchdowns?: number
    interceptions?: number
    passer_rating?: number
    completion_percentage?: number
    completion_percentage_above_expectation?: number
    rush_yards?: number
    rush_touchdowns?: number
    rush_attempts?: number
    efficiency?: number
    targets?: number
    receptions?: number
    yards?: number
    rec_touchdowns?: number
    avg_separation?: number
    avg_cushion?: number
    avg_yac?: number
  }[]
}

const fetchStats = async ([, statType, season]: [string, StatType, string]) => {
  const response = await fetch(
    `/api/ngs-stats?type=${statType}&season=${season}&limit=100&sort=fantasy_points&order=desc`
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.statusText}`)
  }

  const result: NGSStatsResponse = await response.json()
  return result.data || []
}

export default function StatsDashboardPage() {
  const [statType, setStatType] = useState<StatType>('passing')
  const [season, setSeason] = useState('2025')
  const { data = [], error, isLoading } = useSWR(
    ['ngs-stats', statType, season] as const,
    fetchStats
  )
  const errorMessage = error instanceof Error ? error.message : null

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Fantasy Stats Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Real-time NFL stats with fantasy scoring powered by Next Gen Stats
        </p>
      </div>

      <div className="flex items-center gap-4">
        <div>
          <label className="text-sm text-slate-400 mb-2 block">Season</label>
          <Select value={season} onValueChange={setSeason}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2023">2023</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs value={statType} onValueChange={(value) => setStatType(value as StatType)}>
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="passing">Passing</TabsTrigger>
          <TabsTrigger value="rushing">Rushing</TabsTrigger>
          <TabsTrigger value="receiving">Receiving</TabsTrigger>
        </TabsList>

        <TabsContent value="passing" className="mt-6">
          {isLoading ? (
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <Skeleton className="h-6 w-64" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[...Array(10)].map((_, i) => (
                    <Skeleton key={`passing-skeleton-${i}`} className="h-12 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : errorMessage ? (
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-red-400">Error Loading Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">{errorMessage}</p>
              </CardContent>
            </Card>
          ) : (
            <NGSStatsTable key="passing" data={data} statType="passing" season={season} />
          )}
        </TabsContent>

        <TabsContent value="rushing" className="mt-6">
          {isLoading ? (
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <Skeleton className="h-6 w-64" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[...Array(10)].map((_, i) => (
                    <Skeleton key={`rushing-skeleton-${i}`} className="h-12 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : errorMessage ? (
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-red-400">Error Loading Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">{errorMessage}</p>
              </CardContent>
            </Card>
          ) : (
            <NGSStatsTable key="rushing" data={data} statType="rushing" season={season} />
          )}
        </TabsContent>

        <TabsContent value="receiving" className="mt-6">
          {isLoading ? (
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <Skeleton className="h-6 w-64" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[...Array(10)].map((_, i) => (
                    <Skeleton key={`receiving-skeleton-${i}`} className="h-12 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : errorMessage ? (
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-red-400">Error Loading Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">{errorMessage}</p>
              </CardContent>
            </Card>
          ) : (
            <NGSStatsTable key="receiving" data={data} statType="receiving" season={season} />
          )}
        </TabsContent>
      </Tabs>

      <div className="text-sm text-muted-foreground">
        <p>
          Stats updated every 8 hours via automated pipeline. Values calculated based on fantasy PPR
          scoring and position scarcity.
        </p>
      </div>
    </div>
  )
}
