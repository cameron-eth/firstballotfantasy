// Cache utility functions to eliminate duplicate code across components

export const cacheUtils = {
  // Get cached data
  get: (key: string) => {
    try {
      const cached = localStorage.getItem(key)
      if (!cached) return null

      const data = JSON.parse(cached)
      return data
    } catch (error) {
      console.error('Error reading from cache:', error)
      return null
    }
  },

  // Set cached data
  set: (key: string, data: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(data))
    } catch (error) {
      console.error('Error writing to cache:', error)
    }
  },

  // Set cached data with TTL
  setWithExpiry: (key: string, data: any, ttl: number) => {
    try {
      const item = {
        data,
        timestamp: Date.now(),
        ttl,
      }
      localStorage.setItem(key, JSON.stringify(item))
    } catch (error) {
      console.error('Error writing to cache with expiry:', error)
    }
  },

  // Get cached data with TTL check
  getWithExpiry: (key: string) => {
    try {
      const item = localStorage.getItem(key)
      if (!item) return null

      const parsed = JSON.parse(item)
      if (parsed.timestamp && Date.now() - parsed.timestamp > parsed.ttl) {
        localStorage.removeItem(key)
        return null
      }

      return parsed.data
    } catch (error) {
      console.error('Error reading from cache with expiry:', error)
      return null
    }
  },

  // Check if cache is valid
  isValid: () => {
    const expiry = cacheUtils.get('firstballot_cache_expiry')
    if (!expiry) return false
    return Date.now() < expiry
  },

  // Set cache expiry
  setExpiry: () => {
    const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours in milliseconds
    cacheUtils.set('firstballot_cache_expiry', Date.now() + CACHE_DURATION)
  },

  // Clear all cache
  clear: () => {
    try {
      localStorage.removeItem('firstballot_sleeper_username')
      localStorage.removeItem('firstballot_sleeper_user')
      localStorage.removeItem('firstballot_sleeper_leagues')
      localStorage.removeItem('firstballot_cache_expiry')
      localStorage.removeItem('cachedLeagueId')
    } catch (error) {
      console.error('Error clearing cache:', error)
    }
  },

  // Get cache size in bytes
  getCacheSize: () => {
    try {
      let size = 0
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key?.startsWith('firstballot_') || key === 'cachedLeagueId') {
          size += localStorage.getItem(key)?.length || 0
        }
      }
      return size
    } catch (error) {
      console.error('Error calculating cache size:', error)
      return 0
    }
  },

  // Cleanup expired cache entries
  cleanup: () => {
    try {
      const keys = Object.keys(localStorage)
      let cleanedCount = 0

      keys.forEach((key) => {
        if (key.startsWith('firstballot_') || key === 'cachedLeagueId') {
          try {
            const item = localStorage.getItem(key)
            if (item) {
              const parsed = JSON.parse(item)
              if (parsed.timestamp && parsed.ttl && Date.now() - parsed.timestamp > parsed.ttl) {
                localStorage.removeItem(key)
                cleanedCount++
              }
            }
          } catch (error) {
            // Remove corrupted entries
            localStorage.removeItem(key)
            cleanedCount++
          }
        }
      })

      return cleanedCount
    } catch (error) {
      console.error('Error cleaning cache:', error)
      return 0
    }
  },

  // Cache keys - use unified configuration
  keys: {
    SLEEPER_USERNAME: 'firstballot_sleeper_username',
    SLEEPER_USER: 'firstballot_sleeper_user',
    SLEEPER_LEAGUES: 'firstballot_sleeper_leagues',
    CACHE_EXPIRY: 'firstballot_cache_expiry',
    LEAGUE_ID: 'cachedLeagueId',
  },
}
