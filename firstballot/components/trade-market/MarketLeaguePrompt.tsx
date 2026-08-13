'use client'

import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Header } from '@/components/header'

interface MarketLeaguePromptProps {
  onSubmit: (leagueId: string) => void
  onBack: () => void
}

/** Shown when no league could be resolved from context, the URL, or the cache. */
export function MarketLeaguePrompt({ onSubmit, onBack }: MarketLeaguePromptProps) {
  const [value, setValue] = useState('')

  const submit = () => {
    const trimmed = value.trim()
    if (trimmed) onSubmit(trimmed)
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-4">
      <Header />
      <div className="max-w-4xl mx-auto text-center py-12">
        <p className="text-muted-foreground mb-6">
          No league ID found. Enter your Sleeper league ID.
        </p>
        <div className="flex items-center justify-center space-x-2 mb-6">
          <input
            type="text"
            placeholder="Enter league ID"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit()
            }}
            className="px-3 py-2 bg-card border border-border rounded text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-blue-500/60"
          />
          <Button onClick={submit}>Load League</Button>
        </div>
        <Button variant="secondary" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    </div>
  )
}
