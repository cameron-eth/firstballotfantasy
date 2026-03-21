import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Scouting Portal | First Ballot Fantasy',
  description: 'Full scouting portal with draft boards and prospect analysis',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
