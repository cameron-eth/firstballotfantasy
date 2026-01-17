'use client'

import { ScoutingPortal } from '@/components/scouting'
import { Header } from '@/components/header'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function ProspectsContent() {
  const searchParams = useSearchParams()
  const leagueId = searchParams.get('leagueId') || ''
  
  return <ScoutingPortal leagueId={leagueId} initialTab="prospects" />
}

export default function ProspectsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-900">
        <Header />
        <div className="flex items-center justify-center h-[calc(100-64px)]">
          <div className="text-gray-400 font-mono animate-pulse">LOADING PROSPECTS...</div>
        </div>
      </div>
    }>
      <ProspectsContent />
    </Suspense>
  )
}


