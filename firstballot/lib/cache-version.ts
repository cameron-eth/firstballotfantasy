import { useSyncExternalStore } from 'react'

const KEY = 'fb-cache-v'
const EVENT = 'fb-cache-version'

export function getCacheVersion(): number {
  try {
    return Number(window.localStorage.getItem(KEY)) || 0
  } catch {
    return 0
  }
}

/** Changing the version changes every cacheable URL, so browser and CDN copies are bypassed. */
export function bumpCacheVersion(): number {
  const next = Date.now()
  try {
    window.localStorage.setItem(KEY, String(next))
  } catch {
    // Storage blocked: the in-memory event below still refreshes this tab.
  }
  window.dispatchEvent(new Event(EVENT))
  return next
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange)
  window.addEventListener('storage', onChange)
  return () => {
    window.removeEventListener(EVENT, onChange)
    window.removeEventListener('storage', onChange)
  }
}

export function useCacheVersion(): number {
  return useSyncExternalStore(subscribe, getCacheVersion, () => 0)
}
