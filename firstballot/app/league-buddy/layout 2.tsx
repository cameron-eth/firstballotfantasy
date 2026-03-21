import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'League Buddy | First Ballot Fantasy',
  description: 'Your dynasty league companion — standings, trades, and team analysis',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
