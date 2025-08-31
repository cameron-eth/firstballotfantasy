// League cache utility to standardize league ID caching across the application
import { cacheUtils } from './cache-utils'

export const leagueCache = {
  // Set league ID in both localStorage (persistent) and sessionStorage (current session)
  setLeagueId: (leagueId: string) => {
    cacheUtils.setWithExpiry('cachedLeagueId', leagueId, 24 * 60 * 60 * 1000) // 24 hours
    sessionStorage.setItem('currentLeagueId', leagueId)
  },
  
  // Get league ID with priority: sessionStorage (current session) > localStorage (persistent)
  getLeagueId: (): string | null => {
    // Try sessionStorage first (current session)
    const sessionId = sessionStorage.getItem('currentLeagueId')
    if (sessionId) return sessionId
    
    // Fall back to localStorage (persistent)
    return cacheUtils.getWithExpiry('cachedLeagueId')
  },
  
  // Clear league ID from both storages
  clearLeagueId: () => {
    localStorage.removeItem('cachedLeagueId')
    sessionStorage.removeItem('currentLeagueId')
  },
  
  // Check if league ID exists
  hasLeagueId: (): boolean => {
    return leagueCache.getLeagueId() !== null
  },
  
  // Get league ID with fallback to provided default
  getLeagueIdWithFallback: (defaultId?: string): string | null => {
    const cachedId = leagueCache.getLeagueId()
    if (cachedId) return cachedId
    return defaultId || null
  },
  
  // Update league ID if different from current
  updateLeagueId: (newLeagueId: string): boolean => {
    const currentId = leagueCache.getLeagueId()
    if (currentId !== newLeagueId) {
      leagueCache.setLeagueId(newLeagueId)
      return true // Updated
    }
    return false // No change needed
  }
} 