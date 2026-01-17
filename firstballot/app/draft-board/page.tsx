'use client'

import { ScoutingPortal } from '@/components/scouting'
import { Header } from '@/components/header'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function DraftBoardContent() {
  const searchParams = useSearchParams()
  const leagueId = searchParams.get('leagueId') || ''
  
  return <ScoutingPortal leagueId={leagueId} initialTab="draftboard" />
}

export default function DraftBoardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-900">
        <Header />
        <div className="flex items-center justify-center h-[calc(100-64px)]">
          <div className="text-gray-400 font-mono animate-pulse">LOADING DRAFT BOARD...</div>
        </div>
      </div>
    }>
      <DraftBoardContent />
    </Suspense>
  )
}


