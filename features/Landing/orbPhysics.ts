/**
 * Orb physics: velocity integration, wall bouncing, inter-orb repulsion.
 * Adapted from the Pretext editorial engine demo.
 */

import { ORB_COLORS } from './constants'

export type OrbDefinition = {
  fx: number   // fractional x position (0-1)
  fy: number   // fractional y position (0-1)
  r: number    // radius in px
  vx: number   // velocity x
  vy: number   // velocity y
  colorIndex: number
}

export type Orb = {
  x: number
  y: number
  r: number
  vx: number
  vy: number
  paused: boolean
}

/** Default orb definitions — positioned fractionally, sized for editorial layout */
export const ORB_DEFS: OrbDefinition[] = [
  { fx: 0.50, fy: 0.24, r: 100, vx: 22, vy: 14, colorIndex: 0 },
  { fx: 0.20, fy: 0.50, r: 80,  vx: -17, vy: 24, colorIndex: 1 },
  { fx: 0.72, fy: 0.56, r: 90,  vx: 14, vy: -19, colorIndex: 2 },
  { fx: 0.36, fy: 0.74, r: 70,  vx: -24, vy: -12, colorIndex: 3 },
  { fx: 0.84, fy: 0.20, r: 60,  vx: -11, vy: 17, colorIndex: 4 },
]

export function createOrbs(defs: OrbDefinition[], w: number, h: number): Orb[] {
  return defs.map(d => ({
    x: d.fx * w,
    y: d.fy * h,
    r: d.r,
    vx: d.vx,
    vy: d.vy,
    paused: false,
  }))
}

export function stepPhysics(
  orbs: Orb[],
  dt: number,
  pageWidth: number,
  pageHeight: number,
  gutter: number,
  bottomGap: number,
  orbRadiusScale: number,
  activeOrbCount: number,
  draggedOrbIndex: number,
  isNarrow: boolean,
): boolean {
  let stillAnimating = false

  // Velocity integration + wall bounce
  for (let i = 0; i < activeOrbCount; i++) {
    const orb = orbs[i]!
    const radius = orb.r * orbRadiusScale
    if (orb.paused || i === draggedOrbIndex) continue
    stillAnimating = true

    orb.x += orb.vx * dt
    orb.y += orb.vy * dt

    if (orb.x - radius < 0) {
      orb.x = radius
      orb.vx = Math.abs(orb.vx)
    }
    if (orb.x + radius > pageWidth) {
      orb.x = pageWidth - radius
      orb.vx = -Math.abs(orb.vx)
    }
    if (orb.y - radius < gutter * 0.5) {
      orb.y = radius + gutter * 0.5
      orb.vy = Math.abs(orb.vy)
    }
    if (orb.y + radius > pageHeight - bottomGap) {
      orb.y = pageHeight - bottomGap - radius
      orb.vy = -Math.abs(orb.vy)
    }
  }

  // Pairwise repulsion
  for (let i = 0; i < activeOrbCount; i++) {
    const a = orbs[i]!
    const aR = a.r * orbRadiusScale
    for (let j = i + 1; j < activeOrbCount; j++) {
      const b = orbs[j]!
      const bR = b.r * orbRadiusScale
      const dx = b.x - a.x
      const dy = b.y - a.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      const minDist = aR + bR + (isNarrow ? 12 : 20)
      if (dist >= minDist || dist <= 0.1) continue

      const force = (minDist - dist) * 0.8
      const nx = dx / dist
      const ny = dy / dist

      if (!a.paused && i !== draggedOrbIndex) {
        a.vx -= nx * force * dt
        a.vy -= ny * force * dt
      }
      if (!b.paused && j !== draggedOrbIndex) {
        b.vx += nx * force * dt
        b.vy += ny * force * dt
      }
    }
  }

  return stillAnimating
}

export function hitTestOrbs(
  orbs: Orb[],
  px: number,
  py: number,
  activeCount: number,
  radiusScale: number,
): number {
  for (let i = activeCount - 1; i >= 0; i--) {
    const orb = orbs[i]!
    const r = orb.r * radiusScale
    const dx = px - orb.x
    const dy = py - orb.y
    if (dx * dx + dy * dy <= r * r) return i
  }
  return -1
}

/** Build CSS for an orb div matching the app's hub node glow aesthetic */
export function orbStyle(colorIndex: number): { background: string; boxShadow: string; boxShadowHover: string } {
  const c = ORB_COLORS[colorIndex % ORB_COLORS.length]!
  const [r, g, b] = c.rgb
  return {
    background: `radial-gradient(circle at 40% 40%, rgba(${r},${g},${b},0.30), rgba(${r},${g},${b},0.10) 50%, transparent 70%)`,
    boxShadow: `0 0 20px 4px rgba(${r},${g},${b},0.18), 0 0 40px 12px rgba(${r},${g},${b},0.10), 0 0 70px 30px rgba(${r},${g},${b},0.04)`,
    boxShadowHover: `0 0 24px 6px rgba(${r},${g},${b},0.28), 0 0 50px 16px rgba(${r},${g},${b},0.16), 0 0 90px 40px rgba(${r},${g},${b},0.06)`,
  }
}
