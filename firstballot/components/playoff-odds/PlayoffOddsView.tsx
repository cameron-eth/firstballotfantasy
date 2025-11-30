'use client'

import { useSearchParams } from 'next/navigation'
import { Header } from '@/components/header'
import { PlayoffOddsSection } from '@/components/league-buddy/PlayoffOddsSection'
import { useLeagueData } from '@/components/league-buddy/useLeagueData'
import { LoadingSpinner } from '@/components/loading-spinner'
import { Card, CardContent } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useMemo, useState, useEffect } from 'react'

export function PlayoffOddsView() {
  const searchParams = useSearchParams()
  const leagueId = searchParams.get('leagueId') || ''
  const { user } = useAuth()

  const { teams, loading, error, currentWeek } = useLeagueData(leagueId, user)

  // Memoized sorted teams
  const sortedTeams = useMemo(() => {
    return [...teams].sort((a, b) => {
      // Sort by wins first, then by points
      if (a.wins !== b.wins) return b.wins - a.wins
      return b.pointsFor - a.pointsFor
    })
  }, [teams])

  // State for schedule
  const [scheduleData, setScheduleData] = useState<
    { [week: number]: { [rosterId: number]: number } } | undefined
  >(undefined)

  // Fetch remaining schedule
  useEffect(() => {
    if (!leagueId || !currentWeek || currentWeek >= 14) {
      setScheduleData(undefined)
      return
    }

    const fetchSchedule = async () => {
      const scheduleMap: { [week: number]: { [rosterId: number]: number } } = {}

      try {
        // Fetch matchups for remaining weeks
        for (let week = currentWeek + 1; week <= 14; week++) {
          const response = await fetch(
            `https://api.sleeper.app/v1/league/${leagueId}/matchups/${week}`,
            { cache: 'no-store' }
          )
          if (response.ok) {
            const matchups = await response.json()
            scheduleMap[week] = {}

            // Build matchup pairs
            const matchupGroups = new Map<number, any[]>()
            matchups.forEach((matchup: any) => {
              const matchupId = matchup.matchup_id
              if (!matchupGroups.has(matchupId)) {
                matchupGroups.set(matchupId, [])
              }
              matchupGroups.get(matchupId)!.push(matchup)
            })

            // Map each team to their opponent
            matchupGroups.forEach((teamsInMatchup) => {
              if (teamsInMatchup.length === 2) {
                const [team1, team2] = teamsInMatchup
                scheduleMap[week][team1.roster_id] = team2.roster_id
                scheduleMap[week][team2.roster_id] = team1.roster_id
              }
            })
          }
        }

        setScheduleData(Object.keys(scheduleMap).length > 0 ? scheduleMap : undefined)
      } catch (err) {
        console.error('Error fetching schedule:', err)
        setScheduleData(undefined)
      }
    }

    fetchSchedule()
  }, [leagueId, currentWeek])

  if (!leagueId) {
    return (
      <div className="min-h-screen bg-slate-900">
        <Header />
        <main className="w-full px-4 py-8">
          <Card className="bg-slate-800 border-slate-700 max-w-2xl mx-auto">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 text-red-400">
                <AlertCircle className="h-5 w-5" />
                <p className="font-mono">No league ID provided</p>
              </div>
              <p className="text-gray-400 text-sm mt-2">
                Please navigate to this page from League Buddy.
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900">
        <Header />
        <main className="w-full px-4 py-8">
          <div className="text-center py-8">
            <LoadingSpinner size="lg" text="Loading playoff odds..." />
          </div>
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900">
        <Header />
        <main className="w-full px-4 py-8">
          <Card className="bg-slate-800 border-slate-700 max-w-2xl mx-auto">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 text-red-400">
                <AlertCircle className="h-5 w-5" />
                <p className="font-mono">Error loading league data</p>
              </div>
              <p className="text-gray-400 text-sm mt-2">{error}</p>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <Header />
      <main className="w-full px-2 sm:px-4 lg:px-6 py-6">
        <div className="max-w-6xl mx-auto">
          <PlayoffOddsSection
            teams={sortedTeams}
            currentWeek={currentWeek}
            totalWeeks={14}
            playoffSpots={Math.ceil(sortedTeams.length / 2)}
            schedule={scheduleData}
          />
        </div>
      </main>
    </div>
  )
}
