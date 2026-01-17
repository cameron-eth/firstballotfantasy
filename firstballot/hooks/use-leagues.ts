/**
 * useLeagues Hook
 * Fetches and manages user's connected Sleeper leagues
 */

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth'
import type { UserLeague, SleeperLeagueResponse } from '@/types/league'

interface UseLeaguesReturn {
  leagues: UserLeague[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  addLeagueByUsername: (sleeperUsername: string) => Promise<UserLeague[]>
}

const SLEEPER_API_BASE = 'https://api.sleeper.app/v1'

export function useLeagues(): UseLeaguesReturn {
  const { user } = useAuth()
  const [leagues, setLeagues] = useState<UserLeague[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch leagues for a Sleeper username
  const fetchLeaguesForUsername = useCallback(async (sleeperUsername: string): Promise<UserLeague[]> => {
    try {
      // First get the Sleeper user ID
      const userResponse = await fetch(`${SLEEPER_API_BASE}/user/${sleeperUsername}`)
      if (!userResponse.ok) {
        throw new Error('Sleeper user not found')
      }
      const sleeperUser = await userResponse.json()
      const sleeperId = sleeperUser.user_id

      // Then fetch their leagues for current NFL season
      const currentYear = new Date().getFullYear()
      const leaguesResponse = await fetch(
        `${SLEEPER_API_BASE}/user/${sleeperId}/leagues/nfl/${currentYear}`
      )
      
      if (!leaguesResponse.ok) {
        throw new Error('Failed to fetch leagues')
      }

      const leaguesData: SleeperLeagueResponse[] = await leaguesResponse.json()
      
      // Transform to UserLeague format
      return leaguesData.map((league) => ({
        league_id: league.league_id,
        name: league.name,
        season: league.season,
        total_rosters: league.total_rosters,
        roster_positions: league.roster_positions,
        scoring_settings: league.scoring_settings,
        status: league.status as UserLeague['status'],
      }))
    } catch (err) {
      console.error('Error fetching leagues:', err)
      throw err
    }
  }, [])

  // Load leagues from user profile
  const fetchUserLeagues = useCallback(async () => {
    if (!user) {
      setLeagues([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Fetch user profile to get Sleeper username
      const profileResponse = await fetch('/api/user-profile')
      
      if (!profileResponse.ok) {
        // If profile doesn't exist or unauthorized, just assume no leagues for now
        if (profileResponse.status === 404 || profileResponse.status === 401) {
          setLeagues([])
          return
        }
        throw new Error(`Profile fetch failed: ${profileResponse.status}`)
      }

      const profile = await profileResponse.json()
      
      if (!profile.sleeper_username) {
        setLeagues([])
        return
      }

      const userLeagues = await fetchLeaguesForUsername(profile.sleeper_username)
      setLeagues(userLeagues)
    } catch (err) {
      console.error('Error loading leagues:', err)
      setError(err instanceof Error ? err.message : 'Failed to load leagues')
    } finally {
      setIsLoading(false)
    }
  }, [user, fetchLeaguesForUsername])

  // Add leagues by Sleeper username
  const addLeagueByUsername = useCallback(async (sleeperUsername: string): Promise<UserLeague[]> => {
    const newLeagues = await fetchLeaguesForUsername(sleeperUsername)
    setLeagues(newLeagues)
    return newLeagues
  }, [fetchLeaguesForUsername])

  // Fetch on mount and when user changes
  useEffect(() => {
    fetchUserLeagues()
  }, [fetchUserLeagues])

  return {
    leagues,
    isLoading,
    error,
    refetch: fetchUserLeagues,
    addLeagueByUsername,
  }
}

