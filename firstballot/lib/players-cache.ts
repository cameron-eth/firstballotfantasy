// In-memory cache for NFL players data
// This is too large for Next.js cache (17MB+), so we handle it separately

interface PlayersCache {
  data: Record<string, any> | null
  timestamp: number
  loading: Promise<Record<string, any>> | null
}

const cache: PlayersCache = {
  data: null,
  timestamp: 0,
  loading: null,
}

// Cache for 6 hours (players don't change that often)
const CACHE_DURATION = 6 * 60 * 60 * 1000

async function fetchPlayersFromSleeper(): Promise<Record<string, any>> {
  const response = await fetch('https://api.sleeper.app/v1/players/nfl', {
    next: { revalidate: false }, // Don't use Next.js cache
  })

  if (!response.ok) {
    throw new Error('Failed to fetch players from Sleeper')
  }

  return response.json()
}

export async function getCachedPlayers(): Promise<Record<string, any>> {
  const now = Date.now()

  // If cache is valid, return it
  if (cache.data && now - cache.timestamp < CACHE_DURATION) {
    console.log('✅ Using cached player data')
    return cache.data
  }

  // If already loading, wait for that request
  if (cache.loading) {
    console.log('⏳ Waiting for existing player fetch...')
    return cache.loading
  }

  // Start new fetch
  console.log('🔄 Fetching fresh player data from Sleeper...')
  cache.loading = fetchPlayersFromSleeper()

  try {
    const data = await cache.loading
    cache.data = data
    cache.timestamp = now
    cache.loading = null
    console.log('✅ Player data cached successfully')
    return data
  } catch (error) {
    cache.loading = null
    throw error
  }
}

// Helper to get only specific players (much faster)
export async function getPlayersById(playerIds: string[]): Promise<Record<string, any>> {
  const allPlayers = await getCachedPlayers()
  const result: Record<string, any> = {}

  for (const id of playerIds) {
    if (allPlayers[id]) {
      result[id] = allPlayers[id]
    }
  }

  return result
}

// Clear cache (useful for testing)
export function clearPlayersCache(): void {
  cache.data = null
  cache.timestamp = 0
  cache.loading = null
  console.log('🗑️ Player cache cleared')
}
