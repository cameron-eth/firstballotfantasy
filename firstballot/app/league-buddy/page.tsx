'use client'

import { Suspense } from 'react'
import { AuthGuard } from '@/components/auth-guard'
import { LeagueBuddyView } from '@/components/league-buddy/LeagueBuddyView'

export default function LeagueBuddyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900 p-8 text-slate-300">Loading league workspace…</div>}>
      <AuthGuard>
        <LeagueBuddyView />
      </AuthGuard>
    </Suspense>
  )
}
