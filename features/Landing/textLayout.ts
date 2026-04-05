/**
 * Text layout math for the editorial engine landing page.
 * Handles interval subtraction for obstacle avoidance and column layout.
 * Adapted from the Pretext editorial engine demo.
 */

import {
  layoutNextLine,
  type LayoutCursor,
  type PreparedTextWithSegments,
} from '@chenglou/pretext'

import { MIN_SLOT_WIDTH } from './constants'

// ── Types ─────────���─────────────────────────────────────────────────────────

export type Interval = {
  left: number
  right: number
}

export type PositionedLine = {
  x: number
  y: number
  width: number
  text: string
}

export type CircleObstacle = {
  cx: number
  cy: number
  r: number
  hPad: number
  vPad: number
}

export type RectObstacle = {
  x: number
  y: number
  w: number
  h: number
}

// ── Interval math ───────────────────────────────────────────────────────────

/**
 * Subtract blocked intervals from a base interval, returning viable text slots.
 * Slots narrower than MIN_SLOT_WIDTH are discarded.
 */
export function carveTextLineSlots(base: Interval, blocked: Interval[]): Interval[] {
  let slots = [base]
  for (let bi = 0; bi < blocked.length; bi++) {
    const interval = blocked[bi]!
    const next: Interval[] = []
    for (let si = 0; si < slots.length; si++) {
      const slot = slots[si]!
      if (interval.right <= slot.left || interval.left >= slot.right) {
        next.push(slot)
        continue
      }
      if (interval.left > slot.left) next.push({ left: slot.left, right: interval.left })
      if (interval.right < slot.right) next.push({ left: interval.right, right: slot.right })
    }
    slots = next
  }
  return slots.filter(s => s.right - s.left >= MIN_SLOT_WIDTH)
}

/**
 * Compute the horizontal interval blocked by a circle for a given line band.
 * Returns null if the circle does not intersect the band.
 */
export function circleIntervalForBand(
  cx: number,
  cy: number,
  r: number,
  bandTop: number,
  bandBottom: number,
  hPad: number,
  vPad: number,
): Interval | null {
  const top = bandTop - vPad
  const bottom = bandBottom + vPad
  if (top >= cy + r || bottom <= cy - r) return null
  const minDy = cy >= top && cy <= bottom ? 0 : cy < top ? top - cy : cy - bottom
  if (minDy >= r) return null
  const maxDx = Math.sqrt(r * r - minDy * minDy)
  return { left: cx - maxDx - hPad, right: cx + maxDx + hPad }
}

// ── Column layout ───────────────────────────────────────────────────────────

/**
 * Lay out text in a column region, flowing around circle and rectangle obstacles.
 * Returns positioned lines and the cursor for handoff to the next column.
 */
export function layoutColumn(
  prepared: PreparedTextWithSegments,
  startCursor: LayoutCursor,
  regionX: number,
  regionY: number,
  regionW: number,
  regionH: number,
  lineHeight: number,
  circleObstacles: CircleObstacle[],
  rectObstacles: RectObstacle[],
  singleSlotOnly: boolean = false,
): { lines: PositionedLine[]; cursor: LayoutCursor } {
  let cursor: LayoutCursor = startCursor
  let lineTop = regionY
  const lines: PositionedLine[] = []
  let textExhausted = false

  while (lineTop + lineHeight <= regionY + regionH && !textExhausted) {
    const bandTop = lineTop
    const bandBottom = lineTop + lineHeight
    const blocked: Interval[] = []

    for (let i = 0; i < circleObstacles.length; i++) {
      const o = circleObstacles[i]!
      const interval = circleIntervalForBand(o.cx, o.cy, o.r, bandTop, bandBottom, o.hPad, o.vPad)
      if (interval !== null) blocked.push(interval)
    }

    for (let i = 0; i < rectObstacles.length; i++) {
      const rect = rectObstacles[i]!
      if (bandBottom <= rect.y || bandTop >= rect.y + rect.h) continue
      blocked.push({ left: rect.x, right: rect.x + rect.w })
    }

    const slots = carveTextLineSlots({ left: regionX, right: regionX + regionW }, blocked)
    if (slots.length === 0) {
      lineTop += lineHeight
      continue
    }

    const orderedSlots = singleSlotOnly
      ? [slots.reduce((best, slot) => {
          const bw = best.right - best.left
          const sw = slot.right - slot.left
          if (sw > bw) return slot
          if (sw < bw) return best
          return slot.left < best.left ? slot : best
        })]
      : [...slots].sort((a, b) => a.left - b.left)

    for (let si = 0; si < orderedSlots.length; si++) {
      const slot = orderedSlots[si]!
      const slotWidth = slot.right - slot.left
      const line = layoutNextLine(prepared, cursor, slotWidth)
      if (line === null) {
        textExhausted = true
        break
      }
      lines.push({
        x: Math.round(slot.left),
        y: Math.round(lineTop),
        text: line.text,
        width: line.width,
      })
      cursor = line.end
    }

    lineTop += lineHeight
  }

  return { lines, cursor }
}
