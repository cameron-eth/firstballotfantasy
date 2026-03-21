import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Login | First Ballot Fantasy',
  description: 'Sign in to First Ballot Fantasy',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
