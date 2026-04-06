'use client'

import dynamic from 'next/dynamic'
import { HeroSection } from './HeroSection'
import { StickyScrollContainer } from './StickyScrollContainer'
import { FooterCTA } from './FooterCTA'

// Lazy-load the R3F particles (needs browser APIs)
const FloatingParticles = dynamic(
  () => import('./FloatingParticles').then((m) => ({ default: m.FloatingParticles })),
  { ssr: false },
)

export function ScrollytellingPage() {
  return (
    <main
      className="relative min-h-screen bg-[#0a0a12] text-white selection:bg-indigo-500/30"
      style={{ overflow: 'auto', height: '100vh' }}
    >
      {/* Global floating particle background */}
      <FloatingParticles />

      {/* Hero */}
      <HeroSection />

      {/* Sticky Scrollytelling Sequence */}
      <StickyScrollContainer />

      {/* Final CTA */}
      <FooterCTA />
    </main>
  )
}

export default ScrollytellingPage
