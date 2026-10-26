'use client'
import { useSyncExternalStore } from 'react'
const query = '(min-width: 1024px) and (hover: hover) and (pointer: fine)'
function subscribe(callback: () => void) {
  const media = window.matchMedia(query)
  media.addEventListener('change', callback)
  return () => media.removeEventListener('change', callback)
}
export function useDesktopBuilder() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false
  )
}
