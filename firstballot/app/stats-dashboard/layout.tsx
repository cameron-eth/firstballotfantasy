import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Stats Dashboard | First Ballot Fantasy',
  description: 'Next Gen Stats and advanced fantasy football metrics',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
