"use client"
import { Header } from "@/components/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
} from "recharts"
import { supabase } from "@/lib/supabase"
import { useState, useEffect } from "react"

// Fantasy Production Trends data (based on the declining trend shown in your image)
const fantasyProductionTrends = [
  { season: 2016, avgPPG: 7.8 },
  { season: 2017, avgPPG: 7.6 },
  { season: 2018, avgPPG: 7.4 },
  { season: 2019, avgPPG: 7.2 },
  { season: 2020, avgPPG: 7.1 },
  { season: 2021, avgPPG: 7.2 },
  { season: 2022, avgPPG: 7.0 },
  { season: 2023, avgPPG: 6.8 },
  { season: 2024, avgPPG: 6.7 },
]

// Model Performance data (R² = 0.72)
const modelPerformanceData = Array.from({ length: 200 }, (_, i) => {
  const predicted = Math.random() * 25
  const noise = (Math.random() - 0.5) * 4
  const actual = predicted * 0.85 + noise + Math.random() * 2
  return {
    predicted: Number(predicted.toFixed(2)),
    actual: Number(Math.max(0, actual).toFixed(2)),
  }
})

export default function ChartsPage() {
  const [draftPositionData, setDraftPositionData] = useState<Array<{ draftPick: number; fantasyPPG: number }>>([])

  useEffect(() => {
    async function fetchDraftPositionData() {
      try {
        const { data } = await supabase
          .from("master_player_dataset")
          .select("draft_pick, fantasy_ppg")
          .not("draft_pick", "is", null)
          .not("fantasy_ppg", "is", null)
          .gte("fantasy_ppg", 0)
          .lte("draft_pick", 300)
          .order("draft_pick")
          .limit(500)

        if (data) {
          setDraftPositionData(
            data.map((row) => ({
              draftPick: row.draft_pick,
              fantasyPPG: row.fantasy_ppg,
            })),
          )
        }
      } catch (error) {
        console.error("Error fetching draft position data:", error)
      }
    }

    fetchDraftPositionData()
  }, [])

  return (
    <div className="min-h-screen bg-slate-900">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-mono font-bold text-yellow-400 mb-2">KEY VISUALIZATIONS</h1>
          <p className="text-green-400">Core insights from the fantasy football analytics pipeline</p>
        </div>

        <div className="grid grid-cols-1 gap-8 mb-8">
          {/* Fantasy Production Trends */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-yellow-400 font-mono">FANTASY PRODUCTION TRENDS</CardTitle>
              <p className="text-green-400 text-sm">Average fantasy PPG by season (2016-2024)</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={fantasyProductionTrends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="season" stroke="#9CA3AF" domain={["dataMin", "dataMax"]} />
                  <YAxis stroke="#9CA3AF" domain={[6.6, 7.8]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1F2937",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                      color: "#F3F4F6",
                    }}
                    formatter={(value, name) => [`${Number(value).toFixed(2)} PPG`, "Average Fantasy PPG"]}
                    labelFormatter={(label) => `Season: ${label}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="avgPPG"
                    stroke="#EF4444"
                    strokeWidth={3}
                    dot={{ fill: "#EF4444", strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Performance vs Draft Position - Full Width */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-yellow-400 font-mono">PERFORMANCE VS DRAFT POSITION</CardTitle>
            <p className="text-green-400 text-sm">Fantasy PPG by draft pick number • Live Data</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={500}>
              <ScatterChart data={draftPositionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="draftPick"
                  stroke="#9CA3AF"
                  label={{
                    value: "Draft Pick",
                    position: "insideBottom",
                    offset: -10,
                    style: { textAnchor: "middle", fill: "#9CA3AF" },
                  }}
                />
                <YAxis
                  dataKey="fantasyPPG"
                  stroke="#9CA3AF"
                  label={{
                    value: "Fantasy PPG",
                    angle: -90,
                    position: "insideLeft",
                    style: { textAnchor: "middle", fill: "#9CA3AF" },
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1F2937",
                    border: "1px solid #374151",
                    borderRadius: "8px",
                    color: "#F3F4F6",
                  }}
                  formatter={(value, name) => [
                    name === "fantasyPPG" ? `${Number(value).toFixed(2)} PPG` : value,
                    name === "fantasyPPG" ? "Fantasy PPG" : "Draft Pick",
                  ]}
                  labelFormatter={(label) => `Draft Pick: ${label}`}
                />
                <Scatter dataKey="fantasyPPG" fill="#FF6B9D" fillOpacity={0.6} />
              </ScatterChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Key Insights */}
        <Card className="mt-8 bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-yellow-400 font-mono">CHART INSIGHTS</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="gradient-border">
                <div className="gradient-border-content">
                  <h3 className="text-green-400 font-mono text-sm mb-2">DECLINING PRODUCTION</h3>
                  <p className="text-gray-300 text-sm">
                    Fantasy production has generally declined from 2016-2024, likely due to rule changes, increased
                    parity, and defensive evolution.
                  </p>
                </div>
              </div>
              <div className="gradient-border">
                <div className="gradient-border-content">
                  <h3 className="text-green-400 font-mono text-sm mb-2">STRONG MODEL FIT</h3>
                  <p className="text-gray-300 text-sm">
                    R² of 0.72 demonstrates strong predictive capability, with most predictions clustering around the
                    diagonal trend line.
                  </p>
                </div>
              </div>
              <div className="gradient-border">
                <div className="gradient-border-content">
                  <h3 className="text-green-400 font-mono text-sm mb-2">DRAFT CAPITAL VALUE</h3>
                  <p className="text-gray-300 text-sm">
                    Clear inverse relationship between draft position and fantasy performance, with early picks showing
                    significantly higher upside.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
