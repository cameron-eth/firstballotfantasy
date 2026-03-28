'use client'

import { RankingsGrid } from '@/components/prospect-board/rankings-grid'
import { Header } from '@/components/header'

export default function ProspectBoardPage() {
  return (
    <div className="prospect-board fb-app-surface min-h-screen bg-background text-foreground lg:h-screen lg:overflow-hidden lg:flex lg:flex-col">
      <Header />
      <main className="px-4 sm:px-6 lg:px-8 py-8 max-w-[1600px] mx-auto w-full lg:flex-1 lg:min-h-0 lg:overflow-hidden">
        <RankingsGrid />
      </main>
    </div>
  )
}
