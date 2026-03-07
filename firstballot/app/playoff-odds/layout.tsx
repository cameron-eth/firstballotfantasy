import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Playoff Odds | First Ballot Fantasy',
  description: 'Real-time playoff probability calculator for your dynasty league',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
