'use client'

import { useState, useEffect } from 'react'
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

export default function StatsDashboardPage() {
  const [statType, setStatType] = useState<StatType>('passing')
  const [season, setSeason] = useState('2025')
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchStats()
  }, [statType, season])

  const fetchStats = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(
        `/api/ngs-stats?type=${statType}&season=${season}&limit=100&sort=fantasy_points&order=desc`
      )

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`)
      }

      const result = await response.json()
      setData(result.data || [])
    } catch (error: any) {
      console.error('Failed to fetch stats:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

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
          {loading ? (
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
          ) : error ? (
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-red-400">Error Loading Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">{error}</p>
              </CardContent>
            </Card>
          ) : (
            <NGSStatsTable key="passing" data={data} statType="passing" season={season} />
          )}
        </TabsContent>

        <TabsContent value="rushing" className="mt-6">
          {loading ? (
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
          ) : error ? (
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-red-400">Error Loading Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">{error}</p>
              </CardContent>
            </Card>
          ) : (
            <NGSStatsTable key="rushing" data={data} statType="rushing" season={season} />
          )}
        </TabsContent>

        <TabsContent value="receiving" className="mt-6">
          {loading ? (
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
          ) : error ? (
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-red-400">Error Loading Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">{error}</p>
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
