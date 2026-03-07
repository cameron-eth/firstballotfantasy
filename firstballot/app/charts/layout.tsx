import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Charts | First Ballot Fantasy',
  description: 'Visual draft and performance analytics charts',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
