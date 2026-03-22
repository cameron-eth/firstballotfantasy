'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useNGSStats } from '@/hooks/use-ngs-stats'
import Link from 'next/link'

interface NGSStatsWidgetProps {
  type: 'passing' | 'rushing' | 'receiving'
  season?: string
  limit?: number
}

interface NGSWidgetPlayer {
  player_gsis_id: string
  player_display_name: string
  team_abbr: string
  player_position?: string
  fantasy_points?: number
  fantasy_ppg?: number
  pass_yards?: number
  pass_touchdowns?: number
  rush_yards?: number
  rush_touchdowns?: number
  targets?: number
  receptions?: number
  yards?: number
  rec_touchdowns?: number
}

export function NGSStatsWidget({ type, season = '2025', limit = 10 }: NGSStatsWidgetProps) {
  const { data, loading, error } = useNGSStats({
    type,
    season,
    limit,
    sort: 'fantasy_points',
    order: 'desc',
  })

  const getTitle = () => {
    switch (type) {
      case 'passing':
        return 'Top Fantasy QBs'
      case 'rushing':
        return 'Top Fantasy Rushers'
      case 'receiving':
        return 'Top Fantasy Receivers'
    }
  }

  const getDescription = () => {
    return `${season} Season - Fantasy PPR Scoring`
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(limit)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{getTitle()}</CardTitle>
          <CardDescription>{getDescription()}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-red-500 p-4 border border-red-200 rounded-lg bg-red-50">
            <strong>Error:</strong> {error.message}
          </div>
          <div className="mt-4 text-xs text-muted-foreground">
            Check console for details. Try visiting{' '}
            <code className="bg-muted px-1 py-0.5 rounded">/api/test-ngs</code> to test connection.
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{getTitle()}</CardTitle>
          <CardDescription>{getDescription()}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground p-4 border rounded-lg">
            No data available for {season} season
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{getTitle()}</CardTitle>
            <CardDescription>{getDescription()}</CardDescription>
          </div>
          <Link href={`/ngs-stats?type=${type}`} className="text-sm text-primary hover:underline">
            View All →
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.map((player: NGSWidgetPlayer, index: number) => (
            <div
              key={player.player_gsis_id}
              className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="text-lg font-bold text-muted-foreground w-6">{index + 1}</div>
                <div>
                  <div className="font-medium">{player.player_display_name}</div>
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {player.team_abbr}
                    </Badge>
                    {type === 'passing' && (
                      <span>
                        {player.pass_yards} yds, {player.pass_touchdowns} TD
                      </span>
                    )}
                    {type === 'rushing' && (
                      <>
                        <Badge className="text-xs bg-green-500">{player.player_position}</Badge>
                        <span>
                          {player.rush_yards} yds, {player.rush_touchdowns} TD
                        </span>
                      </>
                    )}
                    {type === 'receiving' && (
                      <>
                        <Badge
                          className={`text-xs ${
                            player.player_position === 'WR'
                              ? 'bg-blue-500'
                              : player.player_position === 'TE'
                                ? 'bg-orange-500'
                                : 'bg-green-500'
                          }`}
                        >
                          {player.player_position}
                        </Badge>
                        <span>
                          {player.receptions}/{player.targets}, {player.yards} yds
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold">{player.fantasy_points?.toFixed(1)}</div>
                <div className="text-xs text-muted-foreground">
                  {player.fantasy_ppg?.toFixed(1)} PPG
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
