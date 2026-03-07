import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Rankings | First Ballot Fantasy',
  description: 'Dynasty player rankings powered by the FirstBallot model',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
