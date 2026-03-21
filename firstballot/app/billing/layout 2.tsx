import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Billing | First Ballot Fantasy',
  description: 'Manage your First Ballot Fantasy subscription',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
