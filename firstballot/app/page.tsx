'use client'

import { Header } from '@/components/header'
import { LandingPage } from '@/components/landing'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-900">
      <Header />
      <LandingPage />
    </div>
  )
}
