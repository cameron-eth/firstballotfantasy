import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Team Builder | First Ballot Fantasy',
  description: 'Build and evaluate dynasty team rosters',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
