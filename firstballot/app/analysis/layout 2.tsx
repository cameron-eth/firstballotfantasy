import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Analysis | First Ballot Fantasy',
  description: 'Model performance, breakout predictions, and player analytics',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
