'use client'

import { Header } from '@/components/header'
import { LandingPage } from '@/components/landing'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <LandingPage />
    </div>
  )
}
