'use client'

import { Header } from '@/components/header'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { useCharts } from '@/hooks/use-charts'
import { ProductionTrendsChart } from './ProductionTrendsChart'
import { DraftAnalysisChart } from './DraftAnalysisChart'
import { ChartInsights } from './ChartInsights'

export function ChartsView() {
  const { draftPositionData, loading } = useCharts()

  return (
    <div className="min-h-screen bg-slate-900">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-mono font-bold text-yellow-400 mb-2">KEY VISUALIZATIONS</h1>
          <p className="text-green-400">
            Core insights from the fantasy football analytics pipeline
          </p>
        </div>

        <Tabs defaultValue="production-trends" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-slate-800 border-slate-700">
            <TabsTrigger
              value="production-trends"
              className="text-slate-300 data-[state=active]:bg-yellow-400 data-[state=active]:text-slate-900"
            >
              Production Trends
            </TabsTrigger>
            <TabsTrigger
              value="draft-analysis"
              className="text-slate-300 data-[state=active]:bg-yellow-400 data-[state=active]:text-slate-900"
            >
              Draft Analysis
            </TabsTrigger>
            <TabsTrigger
              value="trade-analysis"
              className="text-slate-300 data-[state=active]:bg-yellow-400 data-[state=active]:text-slate-900"
            >
              Trade Analysis
            </TabsTrigger>
            <TabsTrigger
              value="insights"
              className="text-slate-300 data-[state=active]:bg-yellow-400 data-[state=active]:text-slate-900"
            >
              Insights
            </TabsTrigger>
          </TabsList>

          <TabsContent value="production-trends" className="space-y-6">
            <ProductionTrendsChart />
          </TabsContent>

          <TabsContent value="draft-analysis" className="space-y-6">
            <DraftAnalysisChart data={draftPositionData} loading={loading} />
          </TabsContent>

          <TabsContent value="trade-analysis" className="space-y-6">
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="text-center py-8">
                <p className="text-gray-400">Trade market analysis coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="insights" className="space-y-6">
            <ChartInsights />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
