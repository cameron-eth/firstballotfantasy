import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Prospect Board | First Ballot Fantasy',
  description: 'NFL prospect rankings and dynasty scouting board',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
