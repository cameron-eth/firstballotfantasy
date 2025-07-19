"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Target, 
  Trophy, 
  BarChart3, 
  Zap, 
  ArrowRight, 
  Star, 
  Award,
  Brain,
  Database,
  LineChart,
  Users2,
  Target as TargetIcon,
  CheckCircle,
  Play,
  Music
} from "lucide-react"
import Link from "next/link"

interface OverviewData {
  topPerformers: any[]
  topPredictions: any[]
  breakouts: any[]
  busts: any[]
  positionStats: any[]
  overallStats: {
    totalRecords: number
    uniquePlayers: number
    seasonsAnalyzed: number
    overallR2: number
    pipelineRuntime: number
  }
}

export default function OverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchOverviewData()
  }, [])

  const fetchOverviewData = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/overview")
      if (!response.ok) {
        throw new Error("Failed to fetch overview data")
      }
      const result = await response.json()

      setData(result)
    } catch (err) {
      console.error("Error fetching overview data:", err)
      setError("Failed to load overview data")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900">
        <Header />
        <main className="w-full px-2 sm:px-4 lg:px-6 py-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-green-400 font-mono">LOADING OVERVIEW DATA...</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-900">
        <Header />
        <main className="w-full px-2 sm:px-4 lg:px-6 py-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-red-400 font-mono mb-4">ERROR: {error || "Failed to load data"}</p>
              <button
                onClick={fetchOverviewData}
                className="bg-yellow-400 text-slate-900 px-4 py-2 rounded-lg font-mono"
              >
                RETRY
              </button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <Header />

      <main className="w-full">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-20 px-4 sm:px-6 lg:px-8">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=&quot;60&quot; height=&quot;60&quot; viewBox=&quot;0 0 60 60&quot; xmlns=&quot;http://www.w3.org/2000/svg&quot;%3E%3Cg fill=&quot;none&quot; fill-rule=&quot;evenodd&quot;%3E%3Cg fill=&quot;%239C92AC&quot; fill-opacity=&quot;0.05&quot;%3E%3Ccircle cx=&quot;30&quot; cy=&quot;30&quot; r=&quot;2&quot;/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-50"></div>
          
          <div className="relative max-w-7xl mx-auto text-center">
            <div className="flex items-center justify-center mb-6">
              <Trophy className="h-12 w-12 text-yellow-400 mr-4 hidden sm:block" />
              <h1 className="text-5xl md:text-7xl font-bold text-white font-mono">
                FIRST BALLOT
              </h1>
            </div>
            <h2 className="text-2xl md:text-4xl font-bold text-green-400 font-mono mb-6">
              BUILT BY DEGENS <br/> FOR DEGENS
            </h2>
           
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link href="/draft-buddy">
                <Button className="bg-yellow-400 text-slate-900 hover:bg-yellow-300 px-8 py-4 text-lg font-mono">
                  <Zap className="h-5 w-5 mr-2" />
                  DRAFT BUDDY
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </Link>
              <Link href="/league-buddy">
                <Button variant="outline" className="border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-slate-900 px-8 py-4 text-lg font-mono">
                  <Users2 className="h-5 w-5 mr-2" />
                  LEAGUE BUDDY
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </Link>
            </div>

            {/* Social Media Links */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto mt-12">
              <a 
                href="https://www.tiktok.com/@firstballotfb" 
                target="_blank" 
                rel="noopener noreferrer"
                className="group bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6 hover:border-pink-400 transition-all duration-300 hover:scale-105"
              >
                <div className="flex items-center justify-center mb-4">
                  <Music className="h-8 w-8 text-pink-400 group-hover:scale-110 transition-transform" />
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-bold text-white font-mono mb-2">TikTok</h3>
                  <p className="text-sm text-gray-400 mb-3">@firstballotfb</p>
                  <p className="text-xs text-gray-500">Quick fantasy tips & insights</p>
                </div>
              </a>

              <a 
                href="https://www.youtube.com/@FirstBallotPod" 
                target="_blank" 
                rel="noopener noreferrer"
                className="group bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6 hover:border-red-400 transition-all duration-300 hover:scale-105"
              >
                <div className="flex items-center justify-center mb-4">
                  <Play className="h-8 w-8 text-red-400 group-hover:scale-110 transition-transform" />
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-bold text-white font-mono mb-2">YouTube</h3>
                  <p className="text-sm text-gray-400 mb-3">@FirstBallotPod</p>
                  <p className="text-xs text-gray-500">In-depth analysis & podcasts</p>
                </div>
              </a>
            </div>
            
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-800">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-white font-mono mb-4">
                POWERFUL FANTASY TOOLS
              </h2>
              <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                Everything you need to dominate your fantasy football league
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <Card className="bg-slate-700 border-slate-600 hover:border-yellow-400 transition-colors">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-yellow-400/20 rounded-lg">
                      <Zap className="h-6 w-6 text-yellow-400" />
                    </div>
                    <div>
                      <CardTitle className="text-white font-mono">Draft Buddy</CardTitle>
                      <p className="text-sm text-gray-400">Real-time draft analysis</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300 mb-4">
                    Live draft board with player rankings, tier analysis, and pick value calculations.
                  </p>
                  <Link href="/draft-buddy">
                    <Button variant="outline" size="sm" className="w-full border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-slate-900">
                      Launch Draft Buddy
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              <Card className="bg-slate-700 border-slate-600 hover:border-green-400 transition-colors">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-green-400/20 rounded-lg">
                      <Users2 className="h-6 w-6 text-green-400" />
                    </div>
                    <div>
                      <CardTitle className="text-white font-mono">League Buddy</CardTitle>
                      <p className="text-sm text-gray-400">Team analysis & insights</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300 mb-4">
                    Comprehensive league analysis with team grades, player insights, and transaction tracking.
                  </p>
                  <Link href="/league-buddy">
                    <Button variant="outline" size="sm" className="w-full border-green-400 text-green-400 hover:bg-green-400 hover:text-slate-900">
                      Launch League Buddy
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              <Card className="bg-slate-700 border-slate-600 hover:border-blue-400 transition-colors">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-400/20 rounded-lg">
                      <BarChart3 className="h-6 w-6 text-blue-400" />
                    </div>
                    <div>
                      <CardTitle className="text-white font-mono">Player Tiers</CardTitle>
                      <p className="text-sm text-gray-400">Position-based rankings</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300 mb-4">
                    Detailed player tier analysis with performance predictions and breakout/bust identification.
                  </p>
                  <Link href="/tiers">
                    <Button variant="outline" size="sm" className="w-full border-blue-400 text-blue-400 hover:bg-blue-400 hover:text-slate-900">
                      View Player Tiers
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>

             
            </div>
          </div>
        </section>


        {/* CTA Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-yellow-400/10 to-green-400/10">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white font-mono mb-6">
              BUILT BY DEGENS FOR DEGENS
            </h2>
           
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/draft-buddy">
                <Button className="bg-yellow-400 text-slate-900 hover:bg-yellow-300 px-8 py-4 text-lg font-mono">
                  <Trophy className="h-5 w-5 mr-2" />
                  START DRAFTING
                </Button>
              </Link>
              <Link href="/league-buddy">
                <Button variant="outline" className="border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-slate-900 px-8 py-4 text-lg font-mono">
                  <Users2 className="h-5 w-5 mr-2" />
                  ANALYZE LEAGUE
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
