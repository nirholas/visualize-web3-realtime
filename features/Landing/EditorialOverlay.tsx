'use client'

import { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import { prepareWithSegments, layoutNextLine, layoutWithLines, walkLineRanges } from '@chenglou/pretext'
import type { GraphBounds } from './GizaScene'
import { LANDING_COPY, HEADLINE, SUBHEAD } from './protocols'

// ─── Constants ───
const BODY_FONT_FAMILY = '"Iowan Old Style", "Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif'
const BODY_FONT = `18px ${BODY_FONT_FAMILY}`
const BODY_LINE_HEIGHT = 30
const HEADLINE_FONT_FAMILY = '"IBM Plex Mono", monospace'
const SUBHEAD_FONT = `300 14px ${HEADLINE_FONT_FAMILY}`
const SUBHEAD_LINE_HEIGHT = 22
const GUTTER = 48
const MIN_SLOT_WIDTH = 60
const TEXT_COLOR = '#d8d8e8'
const HEADLINE_COLOR = '#ffffff'
const SUBHEAD_COLOR = '#94a3b8'
const CTA_COLOR = '#3d63ff'

// ─── Interval helpers (from Pretext editorial engine) ───
interface Interval {
  left: number
  right: number
}

interface PositionedLine {
  x: number
  y: number
  text: string
  width: number
}

/** Carve available text slots by subtracting blocked intervals */
function carveTextLineSlots(base: Interval, blocked: Interval[]): Interval[] {
  let slots = [base]
  for (const interval of blocked) {
    const next: Interval[] = []
    for (const slot of slots) {
      if (interval.right <= slot.left || interval.left >= slot.right) {
        next.push(slot)
        continue
      }
      if (interval.left > slot.left) next.push({ left: slot.left, right: interval.left })
      if (interval.right < slot.right) next.push({ left: interval.right, right: slot.right })
    }
    slots = next
  }
  return slots.filter(slot => slot.right - slot.left >= MIN_SLOT_WIDTH)
}

/** Compute the horizontal interval blocked by a circle at a given vertical band */
function circleIntervalForBand(
  cx: number, cy: number, r: number,
  bandTop: number, bandBottom: number,
  hPad: number, vPad: number,
): Interval | null {
  const top = cy - r - vPad
  const bot = cy + r + vPad
  if (bandBottom < top || bandTop > bot) return null

  // Find the chord width at this band
  const bandMid = (bandTop + bandBottom) / 2
  const dy = Math.abs(bandMid - cy)
  const effectiveR = r + hPad
  if (dy >= effectiveR) return null

  const halfChord = Math.sqrt(effectiveR * effectiveR - dy * dy)
  return { left: cx - halfChord, right: cx + halfChord }
}

// ─── Headline binary search sizing (from Pretext editorial engine) ───
interface HeadlineFit {
  size: number
  lines: Array<{ text: string; width: number }>
  height: number
}

function fitHeadline(maxWidth: number, maxHeight: number, maxSize = 72): HeadlineFit {
  let lo = 20, hi = maxSize, best = lo
  let bestLines: Array<{ text: string; width: number }> = []
  let bestHeight = 0

  while (lo <= hi) {
    const size = Math.floor((lo + hi) / 2)
    const font = `600 ${size}px ${HEADLINE_FONT_FAMILY}`
    const prepared = prepareWithSegments(HEADLINE, font)
    const lineHeight = size * 1.2
    let breaksWord = false

    walkLineRanges(prepared, maxWidth, (line) => {
      if (line.end.graphemeIndex !== 0) breaksWord = true
    })

    const result = layoutWithLines(prepared, maxWidth, lineHeight)
    const totalHeight = result.height

    if (!breaksWord && totalHeight <= maxHeight) {
      best = size
      bestLines = result.lines.map((l) => ({ text: l.text, width: l.width }))
      bestHeight = totalHeight
      lo = size + 1
    } else {
      hi = size - 1
    }
  }

  return { size: best, lines: bestLines, height: bestHeight }
}

// ─── The editorial layout engine ───
function layoutColumn(
  prepared: ReturnType<typeof prepareWithSegments>,
  startCursor: { segmentIndex: number; graphemeIndex: number },
  regionX: number, regionY: number, regionW: number, regionH: number,
  lineHeight: number,
  circleBounds: { cx: number; cy: number; r: number } | null,
): { lines: PositionedLine[]; cursor: { segmentIndex: number; graphemeIndex: number } } {
  let cursor = startCursor
  let lineTop = regionY
  const lines: PositionedLine[] = []
  let textExhausted = false

  while (lineTop + lineHeight <= regionY + regionH && !textExhausted) {
    const bandTop = lineTop
    const bandBottom = lineTop + lineHeight

    // Compute blocked intervals from the 3D graph projection
    const blocked: Interval[] = []
    if (circleBounds) {
      const interval = circleIntervalForBand(
        circleBounds.cx, circleBounds.cy, circleBounds.r,
        bandTop, bandBottom,
        30, 20, // hPad, vPad
      )
      if (interval) blocked.push(interval)
    }

    // Carve available slots
    const slots = carveTextLineSlots({ left: regionX, right: regionX + regionW }, blocked)
    if (slots.length === 0) {
      lineTop += lineHeight
      continue
    }

    // Fill each slot with text
    for (const slot of slots) {
      const slotWidth = slot.right - slot.left
      const line = layoutNextLine(prepared, cursor, slotWidth)
      if (line === null) {
        textExhausted = true
        break
      }
      lines.push({ x: slot.left, y: lineTop, text: line.text, width: line.width })
      cursor = line.end
    }
    lineTop += lineHeight
  }

  return { lines, cursor }
}

// ─── DOM Pool (from Pretext editorial engine pattern) ───
function syncPool<T extends HTMLElement>(
  pool: T[],
  count: number,
  parent: HTMLElement,
  create: () => T,
): void {
  while (pool.length < count) {
    const el = create()
    pool.push(el)
    parent.appendChild(el)
  }
  for (let i = 0; i < pool.length; i++) {
    pool[i].style.display = i < count ? '' : 'none'
  }
}

// ─── Main component ───
interface EditorialOverlayProps {
  graphBounds: GraphBounds | null
}

export default function EditorialOverlay({ graphBounds }: EditorialOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const headlinePoolRef = useRef<HTMLSpanElement[]>([])
  const subheadPoolRef = useRef<HTMLSpanElement[]>([])
  const bodyPoolRef = useRef<HTMLSpanElement[]>([])
  const ctaRef = useRef<HTMLAnchorElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const boundsRef = useRef<GraphBounds | null>(null)
  const [fontsReady, setFontsReady] = useState(false)
  const preparedRef = useRef<{
    body: ReturnType<typeof prepareWithSegments>
    subhead: ReturnType<typeof prepareWithSegments>
  } | null>(null)

  // Wait for fonts, then prepare text
  useEffect(() => {
    document.fonts.ready.then(() => {
      preparedRef.current = {
        body: prepareWithSegments(LANDING_COPY, BODY_FONT),
        subhead: prepareWithSegments(SUBHEAD, SUBHEAD_FONT),
      }
      setFontsReady(true)
    })
  }, [])

  // Keep bounds ref updated
  useEffect(() => {
    boundsRef.current = graphBounds
  }, [graphBounds])

  // Create DOM elements
  const createSpan = useCallback((className: string) => {
    const el = document.createElement('span')
    el.className = className
    el.style.position = 'absolute'
    el.style.whiteSpace = 'pre'
    el.style.pointerEvents = 'none'
    return el
  }, [])

  // Main render loop
  useEffect(() => {
    if (!fontsReady || !containerRef.current || !preparedRef.current) return

    const container = containerRef.current
    const headlinePool = headlinePoolRef.current
    const subheadPool = subheadPoolRef.current
    const bodyPool = bodyPoolRef.current

    // Create CTA button
    if (!ctaRef.current) {
      const cta = document.createElement('a')
      cta.href = '/world'
      cta.textContent = 'ENTER THE WORLD \u2192'
      cta.style.position = 'absolute'
      cta.style.fontFamily = `'IBM Plex Mono', monospace`
      cta.style.fontSize = '13px'
      cta.style.fontWeight = '500'
      cta.style.letterSpacing = '0.12em'
      cta.style.textTransform = 'uppercase'
      cta.style.color = '#ffffff'
      cta.style.background = CTA_COLOR
      cta.style.padding = '12px 28px'
      cta.style.borderRadius = '4px'
      cta.style.textDecoration = 'none'
      cta.style.pointerEvents = 'auto'
      cta.style.transition = 'background 150ms ease, transform 150ms ease'
      cta.style.display = 'none'
      cta.onmouseenter = () => { cta.style.background = '#5b7fff'; cta.style.transform = 'translateY(-1px)' }
      cta.onmouseleave = () => { cta.style.background = CTA_COLOR; cta.style.transform = 'translateY(0)' }
      container.appendChild(cta)
      ctaRef.current = cta
    }

    let prevProjection = ''

    function render() {
      const bounds = boundsRef.current
      const { body: preparedBody, subhead: preparedSubhead } = preparedRef.current!
      const W = container.clientWidth
      const H = container.clientHeight

      if (W === 0 || H === 0) {
        rafRef.current = requestAnimationFrame(render)
        return
      }

      // Circle obstacle from 3D graph projection
      const circleBounds = bounds ? {
        cx: bounds.centerX,
        cy: bounds.centerY,
        r: bounds.radius * 0.65,
      } : null

      // ── Headline (top of page, full width) ──
      const headlineMaxW = W - GUTTER * 2
      const headlineFit = fitHeadline(headlineMaxW, 200)
      const headlineLineHeight = headlineFit.size * 1.2

      syncPool(headlinePool, headlineFit.lines.length, container, () => {
        const el = createSpan('editorial-headline')
        el.style.fontFamily = `'IBM Plex Mono', monospace`
        el.style.fontWeight = '600'
        el.style.color = HEADLINE_COLOR
        el.style.letterSpacing = '-0.02em'
        return el
      })

      const headlineTop = GUTTER + 60
      let headlineBottom = headlineTop
      headlineFit.lines.forEach((line, i) => {
        const el = headlinePool[i]
        const y = headlineTop + i * headlineLineHeight
        el.style.fontSize = `${headlineFit.size}px`
        el.style.left = `${GUTTER}px`
        el.style.top = `${y}px`
        el.textContent = line.text
        headlineBottom = y + headlineLineHeight
      })

      // ── Subhead ──
      const subheadTop = headlineBottom + 12
      const subheadResult = layoutColumn(
        preparedSubhead,
        { segmentIndex: 0, graphemeIndex: 0 },
        GUTTER, subheadTop, headlineMaxW, 80,
        SUBHEAD_LINE_HEIGHT,
        null, // no obstacle for subhead
      )

      syncPool(subheadPool, subheadResult.lines.length, container, () => {
        const el = createSpan('editorial-subhead')
        el.style.fontFamily = `'IBM Plex Mono', monospace`
        el.style.fontWeight = '300'
        el.style.fontSize = '14px'
        el.style.color = SUBHEAD_COLOR
        el.style.letterSpacing = '0.02em'
        return el
      })

      let subheadBottom = subheadTop
      subheadResult.lines.forEach((line, i) => {
        const el = subheadPool[i]
        el.style.left = `${line.x}px`
        el.style.top = `${line.y}px`
        el.textContent = line.text
        subheadBottom = line.y + SUBHEAD_LINE_HEIGHT
      })

      // ── Body text (flows around the 3D graph) ──
      const bodyTop = subheadBottom + 32
      const bodyMaxH = H - bodyTop - 80 // leave room for CTA

      const bodyResult = layoutColumn(
        preparedBody,
        { segmentIndex: 0, graphemeIndex: 0 },
        GUTTER, bodyTop, W - GUTTER * 2, bodyMaxH,
        BODY_LINE_HEIGHT,
        circleBounds,
      )

      syncPool(bodyPool, bodyResult.lines.length, container, () => {
        const el = createSpan('editorial-body')
        el.style.fontFamily = BODY_FONT_FAMILY
        el.style.fontSize = '18px'
        el.style.color = TEXT_COLOR
        el.style.lineHeight = `${BODY_LINE_HEIGHT}px`
        return el
      })

      // Build projection string for diff check
      let projection = ''
      bodyResult.lines.forEach((line, i) => {
        projection += `${line.x},${line.y},${line.text.length};`
        const el = bodyPool[i]
        el.style.left = `${line.x}px`
        el.style.top = `${line.y}px`
        el.textContent = line.text
      })

      // Position CTA after the last body line
      if (ctaRef.current && bodyResult.lines.length > 0) {
        const lastLine = bodyResult.lines[bodyResult.lines.length - 1]
        const ctaY = lastLine.y + BODY_LINE_HEIGHT + 28
        ctaRef.current.style.left = `${GUTTER}px`
        ctaRef.current.style.top = `${ctaY}px`
        ctaRef.current.style.display = ctaY < H - 20 ? '' : 'none'
      }

      prevProjection = projection
      rafRef.current = requestAnimationFrame(render)
    }

    rafRef.current = requestAnimationFrame(render)

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [fontsReady, createSpan])

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 10,
      }}
    />
  )
}
