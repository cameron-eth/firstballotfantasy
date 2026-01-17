'use client'

/**
 * League Context Provider
 * Global state management for selected league across the application
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '@/lib/auth'
import { leagueCache } from '@/lib/league-cache'
import type { UserLeague, LeagueContextType, SleeperLeagueResponse } from '@/types/league'

const SLEEPER_API_BASE = 'https://api.sleeper.app/v1'
const STORAGE_KEY = 'firstballot_selected_league_id'

// Create context with undefined default
const LeagueContext = createContext<LeagueContextType | undefined>(undefined)

// Provider component
export function LeagueProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [leagues, setLeagues] = useState<UserLeague[]>([])
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Derived selected league
  const selectedLeague = useMemo(() => {
    if (!selectedLeagueId) return leagues[0] || null
    return leagues.find((l) => l.league_id === selectedLeagueId) || leagues[0] || null
  }, [leagues, selectedLeagueId])

  // Fetch leagues for a Sleeper username
  const fetchLeaguesForUsername = useCallback(
    async (sleeperUsername: string): Promise<UserLeague[]> => {
      try {
        const userResponse = await fetch(`${SLEEPER_API_BASE}/user/${sleeperUsername}`)
        if (!userResponse.ok) throw new Error('Sleeper user not found')

        const sleeperUser = await userResponse.json()
        const sleeperId = sleeperUser.user_id

        const currentYear = new Date().getFullYear()
        const leaguesResponse = await fetch(
          `${SLEEPER_API_BASE}/user/${sleeperId}/leagues/nfl/${currentYear}`
        )

        if (!leaguesResponse.ok) throw new Error('Failed to fetch leagues')

        const leaguesData: SleeperLeagueResponse[] = await leaguesResponse.json()

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
        return []
      }
    },
    []
  )

  // Initial load
  const loadLeagues = useCallback(async () => {
    if (!user) {
      setLeagues([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      // 1. Get user profile
      const profileResponse = await fetch('/api/user-profile')

      if (!profileResponse.ok) {
        // If profile doesn't exist or unauthorized, just assume no leagues for now
        if (profileResponse.status === 404 || profileResponse.status === 401) {
          setLeagues([])
          setIsLoading(false)
          return
        }
        throw new Error(`Profile fetch failed: ${profileResponse.status}`)
      }

      const profile = await profileResponse.json()
      if (!profile.sleeper_username) {
        setLeagues([])
        setIsLoading(false)
        return
      }

      // 2. Fetch leagues from Sleeper
      const userLeagues = await fetchLeaguesForUsername(profile.sleeper_username)
      setLeagues(userLeagues)

      // 3. Restore selected league from cache
      const cachedId = localStorage.getItem(STORAGE_KEY) || leagueCache.getLeagueId()
      if (cachedId && userLeagues.some((l) => l.league_id === cachedId)) {
        setSelectedLeagueId(cachedId)
      } else if (userLeagues.length > 0) {
        setSelectedLeagueId(userLeagues[0].league_id)
      }
    } catch (err) {
      console.error('Error in LeagueProvider load:', err)
      setError(err instanceof Error ? err.message : 'Failed to load leagues')
    } finally {
      setIsLoading(false)
    }
  }, [user, fetchLeaguesForUsername])

  useEffect(() => {
    loadLeagues()
  }, [loadLeagues])

  // Sync selected league with cache
  useEffect(() => {
    if (selectedLeagueId) {
      leagueCache.setLeagueId(selectedLeagueId)
      localStorage.setItem(STORAGE_KEY, selectedLeagueId)
    }
  }, [selectedLeagueId])

  // Select a league
  const selectLeague = useCallback((leagueId: string) => {
    setSelectedLeagueId(leagueId)
  }, [])

  // Refresh all leagues data
  const refreshLeagues = useCallback(async () => {
    await loadLeagues()
  }, [loadLeagues])

  // Placeholder actions for interface compatibility
  const addLeague = useCallback(async (leagueId: string) => {
    // This is handled via sleeper_username in profile now
    return true
  }, [])

  const removeLeague = useCallback((leagueId: string) => {
    // Handled via Sleeper account
  }, [])

  const setDefaultLeague = useCallback((leagueId: string) => {
    // Handled via Sleeper account
  }, [])

  // Context value
  const value: LeagueContextType = useMemo(
    () => ({
      selectedLeagueId,
      selectedLeague,
      leagues,
      isLoading,
      error,
      selectLeague,
      addLeague,
      removeLeague,
      refreshLeagues,
      setDefaultLeague,
    }),
    [
      selectedLeagueId,
      selectedLeague,
      leagues,
      isLoading,
      error,
      selectLeague,
      addLeague,
      removeLeague,
      refreshLeagues,
      setDefaultLeague,
    ]
  )

  return <LeagueContext.Provider value={value}>{children}</LeagueContext.Provider>
}

// Hook to use league context
export function useLeagueContext(): LeagueContextType {
  const context = useContext(LeagueContext)
  if (context === undefined) {
    throw new Error('useLeagueContext must be used within a LeagueProvider')
  }
  return context
}

// Convenience hook for just the selected league
export function useSelectedLeague(): UserLeague | null {
  const { selectedLeague } = useLeagueContext()
  return selectedLeague
}
