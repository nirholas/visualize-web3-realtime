'use client'

import { useRef } from 'react'
import { motion, useInView, type Variants } from 'framer-motion'

interface PopOutElementProps {
  children: React.ReactNode
  delay?: number
  fromScale?: number
  className?: string
  spring?: { stiffness?: number; damping?: number; mass?: number }
  from?: 'bottom' | 'left' | 'right' | 'top'
  distance?: number
  show?: boolean
}

function getVariants(
  from: string,
  distance: number,
  fromScale: number,
  delay: number,
  spring: { stiffness?: number; damping?: number; mass?: number },
): Variants {
  const offsets: Record<string, { x: number; y: number }> = {
    bottom: { x: 0, y: distance },
    top: { x: 0, y: -distance },
    left: { x: -distance, y: 0 },
    right: { x: distance, y: 0 },
  }
  const offset = offsets[from] ?? offsets.bottom

  return {
    hidden: {
      opacity: 0,
      scale: fromScale,
      x: offset.x,
      y: offset.y,
    },
    visible: {
      opacity: 1,
      scale: 1,
      x: 0,
      y: 0,
      transition: {
        type: 'spring' as const,
        ...spring,
        delay,
      },
    },
  }
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
  const v = getVariants(from, distance, fromScale, delay, spring)

  return (
    <motion.div
      ref={ref}
      className={className}
      variants={v}
      initial="hidden"
      animate={visible ? 'visible' : 'hidden'}
    >
      {children}
    </motion.div>
  )
}
