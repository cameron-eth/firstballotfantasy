'use client'

import { useEffect, useState } from 'react'

export function TradeMarketClock() {
  const [time, setTime] = useState<Date | null>(null)
  useEffect(() => {
    setTime(new Date())
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])
  return (
    <div className="font-mono text-sm text-muted-foreground">
      {time ? time.toLocaleTimeString() : '\u00A0'} EST
    </div>
  )
}
