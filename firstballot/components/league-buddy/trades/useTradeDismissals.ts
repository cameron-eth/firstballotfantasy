'use client'
import { useEffect, useState } from 'react'
export const DISMISSAL_TTL = 24 * 60 * 60 * 1000
export function activeDismissals(value: unknown, now = Date.now()): Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(
    Object.entries(value).filter(
      ([, at]) => typeof at === 'number' && at <= now && now - at < DISMISSAL_TTL
    )
  )
}
export function useTradeDismissals(scope: string) {
  const key = `trade-dismissals:v1:${scope}`
  const [cache, setCache] = useState<{ key: string; entries: Record<string, number> }>({
    key: '',
    entries: {},
  })
  useEffect(() => {
    const refresh = () => {
      try {
        const entries = activeDismissals(JSON.parse(localStorage.getItem(key) || '{}'))
        localStorage.setItem(key, JSON.stringify(entries))
        setCache({ key, entries })
      } catch {
        setCache((previous) => ({
          key,
          entries: previous.key === key ? activeDismissals(previous.entries) : {},
        }))
      }
    }
    refresh()
    const timer = setInterval(refresh, 30_000)
    window.addEventListener('focus', refresh)
    window.addEventListener('storage', refresh)
    return () => {
      clearInterval(timer)
      window.removeEventListener('focus', refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [key])
  const entries = cache.key === key ? cache.entries : {}
  return {
    dismissed: Object.keys(entries),
    dismiss: (id: string) => {
      const next = { ...activeDismissals(entries), [id]: Date.now() }
      try {
        localStorage.setItem(key, JSON.stringify(next))
      } catch {
        /* Keep dismissal in memory if storage is unavailable. */
      }
      setCache({ key, entries: next })
    },
  }
}
