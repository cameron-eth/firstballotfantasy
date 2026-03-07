import type React from 'react'
import type { Metadata } from 'next'
import { Inter, Space_Grotesk } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/lib/auth'
import { LeagueProvider } from '@/lib/league-context'
import { Analytics } from '@vercel/analytics/next'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
})

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-space-grotesk',
})

export const metadata: Metadata = {
  title: {
    default: 'First Ballot Fantasy',
    template: '%s | First Ballot Fantasy',
  },
  description: 'Advanced dynasty fantasy football analytics — trade tools, prospect scouting, player rankings, and league intelligence.',
  generator: 'v0.dev',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} bg-background text-foreground min-h-screen font-sans antialiased`}
      >
        {process.env.NODE_ENV === 'development' && (
          <script src="https://unpkg.com/react-scan/dist/auto.global.js" crossOrigin="anonymous" />
        )}
        <AuthProvider>
          <LeagueProvider>{children}</LeagueProvider>
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  )
}
