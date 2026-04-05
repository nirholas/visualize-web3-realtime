'use client'

import { useCallback, useRef, useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import type { GraphBounds } from './GizaScene'

// Lazy-load 3D scene and editorial overlay (both need browser APIs)
const GizaScene = dynamic(() => import('./GizaScene'), { ssr: false })
const EditorialOverlay = dynamic(() => import('./EditorialOverlay'), { ssr: false })

export default function LandingPage() {
  const [graphBounds, setGraphBounds] = useState<GraphBounds | null>(null)
  const [ready, setReady] = useState(false)

  // Fade in after a short delay to let fonts + WebGL initialize
  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 600)
    return () => clearTimeout(timer)
  }, [])

  const handleBoundsUpdate = useCallback((bounds: GraphBounds) => {
    setGraphBounds(bounds)
  }, [])

  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: '#0a0a12',
        opacity: ready ? 1 : 0,
        transition: 'opacity 800ms ease',
      }}
    >
      {/* Background gradient overlay — teal/dark like Giza */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at 50% 40%, rgba(26, 58, 53, 0.4) 0%, rgba(10, 10, 18, 0.95) 70%)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* 3D Giza-style graph — renders behind text */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 2 }}>
        <GizaScene onBoundsUpdate={handleBoundsUpdate} />
      </div>

      {/* Pretext editorial text overlay — flows around the 3D graph */}
      <EditorialOverlay graphBounds={graphBounds} />

      {/* Bottom-right nav links */}
      <nav
        style={{
          position: 'absolute',
          bottom: 24,
          right: 32,
          display: 'flex',
          gap: 20,
          zIndex: 20,
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 11,
          fontWeight: 400,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        <a
          href="/world"
          style={{
            color: '#94a3b8',
            textDecoration: 'none',
            transition: 'color 150ms ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#ffffff' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8' }}
        >
          Open App
        </a>
        <a
          href="/tools"
          style={{
            color: '#94a3b8',
            textDecoration: 'none',
            transition: 'color 150ms ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#ffffff' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8' }}
        >
          Tools
        </a>
        <a
          href="https://github.com/nirholas/swarming.world"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: '#94a3b8',
            textDecoration: 'none',
            transition: 'color 150ms ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#ffffff' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8' }}
        >
          GitHub
        </a>
      </nav>

      {/* Bottom-left branding */}
      <div
        style={{
          position: 'absolute',
          bottom: 24,
          left: 32,
          zIndex: 20,
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 10,
          fontWeight: 300,
          letterSpacing: '0.06em',
          color: '#555',
          textTransform: 'uppercase',
        }}
      >
        swarming.world
      </div>
    </div>
  )
}
