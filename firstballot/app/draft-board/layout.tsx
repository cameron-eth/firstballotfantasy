import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Draft Board | First Ballot Fantasy',
  description: 'Live dynasty draft board with real-time picks and rankings',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
