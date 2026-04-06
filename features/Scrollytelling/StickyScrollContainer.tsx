'use client'

import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { DashboardMockup } from './DashboardMockup'
import { PopOutElement } from './PopOutElement'

/* ── Badge / tag pop-out helpers ──────────────────────────────────────────── */

function Badge({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-full border border-slate-700/80 bg-slate-900/90 px-3 py-1 font-mono text-xs text-slate-300 shadow-lg backdrop-blur ${className}`}
    >
      {children}
    </div>
  )
}

function Tooltip({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-lg border border-slate-700/60 bg-slate-900/90 px-3 py-1.5 font-mono text-[11px] text-indigo-300 shadow-lg backdrop-blur ${className}`}
    >
      {children}
    </div>
  )
}

function Tag({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-md border border-purple-500/30 bg-purple-500/10 px-3 py-1 font-mono text-xs font-medium text-purple-300 ${className}`}
    >
      {children}
    </div>
  )
}

/* ── Text panel for each scroll state ─────────────────────────────────────── */

interface TextPanelProps {
  show: boolean
  align: 'left' | 'right'
  title: string
  subtitle: string
}

function TextPanel({ show, align, title, subtitle }: TextPanelProps) {
  return (
    <div
      className={`absolute top-1/2 -translate-y-1/2 max-w-xs ${
        align === 'left' ? 'left-0' : 'right-0'
      }`}
    >
      <PopOutElement show={show} from={align} distance={40} delay={0}>
        <h3 className="text-2xl font-semibold text-white sm:text-3xl">{title}</h3>
      </PopOutElement>
      <PopOutElement show={show} from={align} distance={30} delay={0.12}>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">{subtitle}</p>
      </PopOutElement>
    </div>
  )
}

/* ── Main StickyScrollContainer ───────────────────────────────────────────── */

export function StickyScrollContainer() {
  const containerRef = useRef<HTMLDivElement>(null)

  // useScroll tracks how far through the tall container we've scrolled
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  })

  // Derive which "state" we're in (0, 1, or 2)
  const state0 = useTransform(scrollYProgress, [0, 0.28, 0.33], [1, 1, 0])
  const state1 = useTransform(scrollYProgress, [0.3, 0.35, 0.62, 0.67], [0, 1, 1, 0])
  const state2 = useTransform(scrollYProgress, [0.64, 0.7, 1], [0, 1, 1])

  return (
    // Tall scroll runway: 300vh gives ~200vh of scroll travel
    <div ref={containerRef} className="relative" style={{ height: '300vh' }}>
      {/* Sticky viewport that locks to center */}
      <div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden px-6">
        {/* Container for dashboard + floating elements */}
        <div className="relative w-full max-w-5xl">
          {/* ── State 1: The Data ─────────────────────────────────── */}
          <motion.div className="absolute inset-0" style={{ opacity: state0 }}>
            <TextPanel
              show
              align="left"
              title="Live Web3 Streams."
              subtitle="Connect to any DEX in seconds. Real-time WebSocket feeds from Pump.fun, Raydium, and Uniswap pipe directly into the visualization engine."
            />
            {/* Floating badges */}
            <div className="absolute -right-4 top-[15%] flex flex-col gap-2 sm:right-4">
              <PopOutElement delay={0.2} from="right" distance={20}>
                <Badge>
                  <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-green-400" />
                  Pump.fun
                </Badge>
              </PopOutElement>
              <PopOutElement delay={0.35} from="right" distance={20}>
                <Badge>
                  <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-blue-400" />
                  Raydium
                </Badge>
              </PopOutElement>
              <PopOutElement delay={0.5} from="right" distance={20}>
                <Badge>
                  <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-pink-400" />
                  Uniswap
                </Badge>
              </PopOutElement>
            </div>
          </motion.div>

          {/* ── State 2: The Physics ──────────────────────────────── */}
          <motion.div className="absolute inset-0" style={{ opacity: state1 }}>
            <TextPanel
              show
              align="right"
              title="60 Frames Per Second. Zero Latency."
              subtitle="GPU-accelerated InstancedMesh rendering powered by d3-force-3d physics and SpatialHash collision grids. Buttery smooth at 5,000+ nodes."
            />
            {/* Floating tooltips */}
            <div className="absolute -left-4 top-[12%] flex flex-col gap-2 sm:left-4">
              <PopOutElement delay={0.15} from="left" distance={25}>
                <Tooltip>d3-force-3d</Tooltip>
              </PopOutElement>
              <PopOutElement delay={0.3} from="left" distance={25}>
                <Tooltip>InstancedMesh</Tooltip>
              </PopOutElement>
              <PopOutElement delay={0.45} from="left" distance={25}>
                <Tooltip>SpatialHash grids</Tooltip>
              </PopOutElement>
            </div>
          </motion.div>

          {/* ── State 3: The Interactivity ────────────────────────── */}
          <motion.div className="absolute inset-0" style={{ opacity: state2 }}>
            <TextPanel
              show
              align="left"
              title="Rich Interaction."
              subtitle="Every node is interactive. Hover for details, click to inspect, drag to rearrange, orbit and zoom the 3D scene."
            />
            {/* Floating interaction tags */}
            <div className="absolute -right-4 bottom-[15%] flex flex-wrap gap-2 sm:right-4">
              {['Hover', 'Click', 'Drag', 'Orbit', 'Zoom'].map((label, i) => (
                <PopOutElement key={label} delay={0.1 + i * 0.1} from="right" distance={15}>
                  <Tag>{label}</Tag>
                </PopOutElement>
              ))}
            </div>
          </motion.div>

          {/* ── Central Dashboard (always visible, content crossfades) ─ */}
          <div className="relative z-10 mx-auto max-w-3xl">
            <DashboardMockup scrollProgress={scrollYProgress} />
          </div>

          {/* Scroll progress indicator */}
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
            {[state0, state1, state2].map((opacity, i) => (
              <motion.div
                key={i}
                className="h-1.5 w-8 rounded-full bg-indigo-500"
                style={{ opacity }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
