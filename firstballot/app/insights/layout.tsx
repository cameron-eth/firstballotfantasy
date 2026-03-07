import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Insights | First Ballot Fantasy',
  description: 'Dynasty fantasy football insights and league intelligence',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
