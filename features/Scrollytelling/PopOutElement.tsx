'use client'

import { useRef } from 'react'
import {
  motion,
  useInView,
  type Variant,
} from 'framer-motion'

interface PopOutElementProps {
  children: React.ReactNode
  /** Delay in seconds before this element animates in */
  delay?: number
  /** Starting scale (default 0.8) */
  fromScale?: number
  /** className for the wrapper */
  className?: string
  /** Override the spring config */
  spring?: { stiffness?: number; damping?: number; mass?: number }
  /** Direction the element slides from */
  from?: 'bottom' | 'left' | 'right' | 'top'
  /** Distance in px for the slide */
  distance?: number
  /** Whether animation is driven externally (skip inView trigger) */
  show?: boolean
}

const directionOffsets: Record<string, (d: number) => { x: number; y: number }> = {
  bottom: (d) => ({ x: 0, y: d }),
  top: (d) => ({ x: 0, y: -d }),
  left: (d) => ({ x: -d, y: 0 }),
  right: (d) => ({ x: d, y: 0 }),
}

export function PopOutElement({
  children,
  delay = 0,
  fromScale = 0.8,
  className,
  spring = { stiffness: 300, damping: 20, mass: 0.8 },
  from = 'bottom',
  distance = 30,
  show,
}: PopOutElementProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-10% 0px' })

  const visible = show !== undefined ? show : isInView

  const offset = directionOffsets[from](distance)

  const hidden: Variant = {
    opacity: 0,
    scale: fromScale,
    x: offset.x,
    y: offset.y,
  }

  const visibleVariant: Variant = {
    opacity: 1,
    scale: 1,
    x: 0,
    y: 0,
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={hidden}
      animate={visible ? visibleVariant : hidden}
      transition={{
        type: 'spring',
        ...spring,
        delay,
      }}
    >
      {children}
    </motion.div>
  )
}
