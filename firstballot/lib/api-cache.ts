// API cache utility to prevent duplicate API calls
interface CacheEntry {
  data: any
  timestamp: number
  ttl: number
}

import { CACHE_TTL, CACHE_KEYS, CACHE_CONFIG, CACHE_VALIDATION } from './cache-config'

class ApiCache {
  private cache = new Map<string, CacheEntry>()
  private pendingRequests = new Map<string, Promise<any>>()
  private hits = 0
  private misses = 0

  // Get cached data or fetch if not cached
  async getOrFetch<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl: number = 5 * 60 * 1000
  ): Promise<T> {
    // Check if we have a pending request
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key) as Promise<T>
    }

    // Check cache
    const cached = this.cache.get(key)
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      this.hits++
      return cached.data
    }

    this.misses++

    // Fetch new data
    const fetchPromise = fetchFn()
      .then((data) => {
        this.cache.set(key, {
          data,
          timestamp: Date.now(),
          ttl,
        })
        this.pendingRequests.delete(key)
        return data
      })
      .catch((error) => {
        this.pendingRequests.delete(key)
        throw error
      })

    this.pendingRequests.set(key, fetchPromise)
    return fetchPromise
  }

  // Clear cache
  clear() {
    this.cache.clear()
    this.pendingRequests.clear()
    this.hits = 0
    this.misses = 0
  }

  // Clear specific key
  clearKey(key: string) {
    this.cache.delete(key)
    this.pendingRequests.delete(key)
  }

  // Get cache stats for debugging
  getStats() {
    return {
      cacheSize: this.cache.size,
      pendingRequests: this.pendingRequests.size,
      cacheKeys: Array.from(this.cache.keys()),
      pendingKeys: Array.from(this.pendingRequests.keys()),
      memoryUsage: this.getMemoryUsage(),
      hitRate: this.getHitRate(),
      hits: this.hits,
      misses: this.misses,
    }
  }

  // Preload data into cache
  preload<T>(key: string, data: T, ttl: number = 5 * 60 * 1000) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    })
  }

  // Cleanup expired entries
  cleanup() {
    const now = Date.now()
    const keysToDelete: string[] = []

    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key)
      }
    })

    keysToDelete.forEach((key) => {
      this.cache.delete(key)
    })

    return keysToDelete.length
  }

  // Get memory usage in bytes
  private getMemoryUsage() {
    let size = 0
    this.cache.forEach((entry) => {
      size += JSON.stringify(entry.data).length
    })
    return size
  }

  // Get hit rate percentage
  private getHitRate() {
    const total = this.hits + this.misses
    return total > 0 ? (this.hits / total) * 100 : 0
  }

  // Start auto-cleanup every 5 minutes
  startAutoCleanup() {
    setInterval(
      () => {
        this.cleanup()
      },
      5 * 60 * 1000
    )
  }
}

export const apiCache = new ApiCache()

// Start auto-cleanup
if (typeof window !== 'undefined') {
  apiCache.startAutoCleanup()
}

// Re-export cache keys for backward compatibility
export { CACHE_KEYS } from './cache-config'
