import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Trade Market | First Ballot Fantasy',
  description: 'Analyze all trades in your dynasty league with value grades',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
