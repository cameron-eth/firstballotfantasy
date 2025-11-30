'use client'

import { useEffect } from 'react'
import { HeroSection } from './HeroSection'
import { StatsSection } from './StatsSection'
import { FeaturesSection } from './FeaturesSection'
import { CommunitySection } from './CommunitySection'

export function LandingPage() {
  useEffect(() => {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -100px 0px',
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible')
        }
      })
    }, observerOptions)

    document.querySelectorAll('.animate-on-scroll').forEach((el) => {
      observer.observe(el)
    })

    return () => observer.disconnect()
  }, [])

  return (
    <main className="w-full px-3 sm:px-4 md:px-6 lg:px-8 overflow-hidden">
      <HeroSection />
      <StatsSection />
      <FeaturesSection />
      <CommunitySection />
      {/* Footer Spacing */}
      <div className="h-16 sm:h-20 md:h-24" />
    </main>
  )
}
