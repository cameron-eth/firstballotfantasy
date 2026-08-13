'use client'

import { useState, useEffect, useCallback } from 'react'
import { Header } from '@/components/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import LeagueBuddy from '@/components/LeagueBuddy'
import { AlertCircle, Loader2 } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useMembershipCheck } from '@/hooks/use-membership'
import { LeagueCard } from '@/components/league-access-control'
import { sleeperApi } from '@/lib/nextjs-cache'
import { userApi } from '@/lib/user-api'
import type { SleeperUser } from '@/lib/sleeper-api'

import { useLeagueContext } from '@/lib/league-context'

export function LeagueBuddyView() {
  const { user: authUser } = useAuth()
  const { isMember } = useMembershipCheck()
  const {
    selectedLeagueId,
    selectLeague,
    leagues,
    isLoading: leaguesLoading,
  } = useLeagueContext()

  const [username, setUsername] = useState('')
  const [sleeperUser, setSleeperUser] = useState<SleeperUser | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // On mount, fetch the user settings for Sleeper username
  useEffect(() => {
    if (!authUser?.id) return

    const loadSettings = async () => {
      try {
        const data = await userApi.getUserSettings()
        if (data?.sleeper_username) {
          setUsername(data.sleeper_username)

          const userData = await sleeperApi.getUser(data.sleeper_username)
          if (userData) {
            setSleeperUser(userData as SleeperUser)
          }
        }
      } catch (err) {
        console.error('Failed to load settings:', err)
      }
    }

    loadSettings()
  }, [authUser?.id])

  const connectToSleeper = useCallback(
    async (usernameOverride?: string) => {
      const currentUsername = usernameOverride || username
      if (!currentUsername.trim()) {
        setError('Please enter a Sleeper username')
        return
      }
      try {
        setLoading(true)
        setError(null)

        const userData = await sleeperApi.getUser(currentUsername)
        if (!userData) throw new Error('Sleeper user not found')

        setSleeperUser(userData as SleeperUser)

        await userApi.updateUserSleeperProfile({
          sleeper_username: (userData as SleeperUser).username,
        })

        // Trigger a refresh of leagues in context
        window.location.reload() // Simplest way to re-sync everything for now
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to connect')
      } finally {
        setLoading(false)
      }
    },
    [username]
  )

  return (
    <div className="min-h-screen bg-slate-900">
      <Header />
      <main className="w-full px-2 sm:px-4 lg:px-6 py-6">
        <div className="space-y-6">
          {/* Connection Section */}
          {!sleeperUser && !leaguesLoading && (
            <Card className="bg-slate-800 border-slate-700 max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle className="text-green-400 font-mono">CONNECT TO SLEEPER</CardTitle>
                <p className="text-gray-300 text-sm">
                  Enter your Sleeper username to sync all your leagues automatically
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm text-gray-300 mb-2 block font-mono">USERNAME</label>
                  <Input
                    placeholder="e.g. commish123"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-slate-900 border-slate-700"
                  />
                </div>
                <Button
                  onClick={() => connectToSleeper()}
                  disabled={loading}
                  className="bg-yellow-400 text-slate-900 hover:bg-yellow-300 w-full font-bold"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'CONNECT ACCOUNT'}
                </Button>
                {error && (
                  <div className="flex items-center space-x-2 text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-400/20">
                    <AlertCircle className="h-4 w-4" />
                    <span>{error}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* League Selection (Grid) - Only show if no league is selected yet */}
          {leagues.length > 0 && !selectedLeagueId && (
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-white font-mono">YOUR LEAGUES</h2>
                <p className="text-slate-400">Select a league to begin analysis</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {leagues.map((league, index) => (
                  <LeagueCard
                    key={league.league_id}
                    league={league}
                    leagueIndex={index}
                    canAccess={index === 0 || isMember}
                    isMember={isMember}
                    isSelected={false}
                    onClick={() => selectLeague(league.league_id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* League Dashboard - Reacts to global selection */}
          {selectedLeagueId && sleeperUser && (
            <LeagueBuddy
              leagueId={selectedLeagueId}
              user={sleeperUser}
              leagues={leagues}
              onLeagueChange={selectLeague}
            />
          )}

          {/* Loading States */}
          {(leaguesLoading || loading) && !selectedLeagueId && (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <Loader2 className="h-12 w-12 text-yellow-400 animate-spin" />
              <p className="text-slate-400 font-mono animate-pulse">SYNCING LEAGUES...</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
