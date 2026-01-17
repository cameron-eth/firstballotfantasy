'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Header } from '@/components/header'
import { ScoutingPortal } from '@/components/scouting'

import { useLeagueContext } from '@/lib/league-context'

function ScoutingPortalWrapper() {
  const { selectedLeagueId } = useLeagueContext()

  return <ScoutingPortal leagueId={selectedLeagueId || ''} />
}

export default function ScoutingPortalPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-900">
          <Header />
          <main className="w-full px-4 py-8">
            <div className="max-w-4xl mx-auto text-center">
              <div className="w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-white">Loading scouting portal...</p>
            </div>
          </main>
        </div>
      }
    >
      <ScoutingPortalWrapper />
    </Suspense>
  )
}
