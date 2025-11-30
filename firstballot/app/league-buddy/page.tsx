'use client'

import { AuthGuard } from '@/components/auth-guard'
import { LeagueBuddyView } from '@/components/league-buddy/LeagueBuddyView'

export default function LeagueBuddyPage() {
  return (
    <AuthGuard>
      <LeagueBuddyView />
    </AuthGuard>
  )
}
