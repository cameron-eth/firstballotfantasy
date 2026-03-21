import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Scout | First Ballot Fantasy',
  description: 'Advanced player scouting and comparison tools',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
