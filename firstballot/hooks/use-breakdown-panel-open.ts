'use client'

import { useCallback, useState, useSyncExternalStore } from 'react'

const MAX_WIDTH_LG = '(max-width: 1023px)'

function subscribeMediaQuery(onChange: () => void) {
  const mq = window.matchMedia(MAX_WIDTH_LG)
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}

function getMediaQuerySnapshot() {
  return window.matchMedia(MAX_WIDTH_LG).matches
}

/** Server / SSR: assume narrow so breakdown stays closed; avoids mobile hydration mismatch. */
function getMediaQueryServerSnapshot() {
  return true
}

/**
 * Subscribes to `(max-width: 1023px)` without useEffect + setState (see frontend skill guide).
 */
export function useIsBelowLgViewport() {
  return useSyncExternalStore(
    subscribeMediaQuery,
    getMediaQuerySnapshot,
    getMediaQueryServerSnapshot
  )
}

/**
 * Board Breakdown–style panels: default closed below lg, open at lg+.
 * User toggle overrides; while override is unset, open tracks viewport.
 */
export function useBreakdownPanelOpen() {
  const isNarrow = useIsBelowLgViewport()
  const [override, setOverride] = useState<boolean | undefined>(undefined)

  const open = override !== undefined ? override : !isNarrow

  const toggle = useCallback(() => {
    setOverride((o) => {
      const effective = o !== undefined ? o : !isNarrow
      return !effective
    })
  }, [isNarrow])

  return { open, toggle }
}
