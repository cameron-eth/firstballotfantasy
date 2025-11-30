'use client'

import { Suspense } from 'react'
import { AuthGuard } from '@/components/auth-guard'
import { PlayoffOddsView } from '@/components/playoff-odds/PlayoffOddsView'
import { Header } from '@/components/header'
import { LoadingSpinner } from '@/components/loading-spinner'

export default function PlayoffOddsPage() {
  return (
    <AuthGuard>
      <Suspense
        fallback={
          <div className="min-h-screen bg-slate-900">
            <Header />
            <main className="w-full px-4 py-8">
              <div className="text-center py-8">
                <LoadingSpinner size="lg" text="Loading playoff odds..." />
              </div>
            </main>
          </div>
        }
      >
        <PlayoffOddsView />
      </Suspense>
    </AuthGuard>
  )
}
