import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Prospects | First Ballot Fantasy',
  description: 'Incoming NFL prospects and dynasty draft rankings',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
