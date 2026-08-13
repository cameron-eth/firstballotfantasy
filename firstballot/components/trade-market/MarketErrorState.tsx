'use client'

import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Header } from '@/components/header'

interface MarketErrorStateProps {
  message: string
  onBack: () => void
}

/** Shown when the trade market request fails. */
export function MarketErrorState({ message, onBack }: MarketErrorStateProps) {
  return (
    <div className="min-h-screen bg-background text-foreground p-4">
      <Header />
      <div className="max-w-4xl mx-auto text-center py-12">
        <p className="text-red-400 mb-6">{message}</p>
        <Button variant="secondary" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    </div>
  )
}
