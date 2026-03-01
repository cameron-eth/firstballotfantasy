'use client'

import { RankingsGrid } from '@/components/prospect-board/rankings-grid'
import { Header } from '@/components/header'

export default function ProspectBoardPage() {
  return (
    <div className="prospect-board fb-app-surface min-h-screen bg-background text-foreground">
      <Header />
      <main className="px-4 sm:px-6 lg:px-8 py-8 max-w-[1600px] mx-auto">
        <RankingsGrid />
      </main>
    </div>
  )
}
