import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Trade Calculator | First Ballot Fantasy',
  description: 'Dynasty trade calculator with fair value analysis',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
