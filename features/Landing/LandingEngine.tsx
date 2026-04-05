'use client'

/**
 * LandingEngine — Editorial engine landing page.
 * Inspired by the Pretext editorial engine demo, adapted to the app's visual identity.
 *
 * Architecture:
 * - Pretext for zero-DOM text measurement and line-by-line layout
 * - Animated orbs as circle obstacles, text reflows every frame
 * - DOM span pool for efficient rendering (no DOM reads per frame)
 * - Pointer events for drag/pause interaction
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import {
  prepareWithSegments,
  layoutWithLines,
  walkLineRanges,
  type LayoutCursor,
} from '@chenglou/pretext'

import {
  BODY_FONT,
  BODY_LINE_HEIGHT,
  HEADLINE_FONT_FAMILY,
  HEADLINE_COLOR,
  DROP_CAP_COLOR,
  DROP_CAP_LINES,
  TEXT_COLOR,
  GUTTER,
  COL_GAP,
  BOTTOM_GAP,
  MAX_CONTENT_WIDTH,
  NARROW_BREAKPOINT,
  NARROW_GUTTER,
  NARROW_COL_GAP,
  NARROW_BOTTOM_GAP,
  NARROW_ORB_SCALE,
  NARROW_ACTIVE_ORBS,
  PULLQUOTE_FONT,
  PULLQUOTE_LINE_HEIGHT,
  GLASS,
  ACCENT_INDIGO,
  MUTED_COLOR,
  FONT_FAMILY,
} from './constants'

import {
  HEADLINE_TEXT,
  BODY_TEXT,
  PULLQUOTE_TEXTS,
  PULLQUOTE_PLACEMENTS,
} from './content'

import {
  ORB_DEFS,
  createOrbs,
  stepPhysics,
  hitTestOrbs,
  orbStyle,
} from './orbPhysics'

import { syncPool, projectLines } from './domPool'

import {
  layoutColumn,
  type CircleObstacle,
  type RectObstacle,
  type PositionedLine,
} from './textLayout'

// ── Types ───────────────────────────────────────────────────────────────────

type TextProjection = {
  headlineLeft: number
  headlineTop: number
  headlineFont: string
  headlineLineHeight: number
  headlineLines: PositionedLine[]
  bodyFont: string
  bodyLineHeight: number
  bodyLines: PositionedLine[]
  pullquoteFont: string
  pullquoteLineHeight: number
  pullquoteLines: PositionedLine[]
}

type DragState = {
  orbIndex: number
  startPointerX: number
  startPointerY: number
  startOrbX: number
  startOrbY: number
}

type PointerSample = { x: number; y: number }

type PullquoteRect = RectObstacle & {
  lines: PositionedLine[]
  colIdx: number
}

type HeadlineFit = {
  fontSize: number
  lines: PositionedLine[]
}

// ── Animated counter hook ───────────────────────────────────────────────────

function useAnimatedCounter(target: number, duration: number = 2000, delay: number = 0): number {
  const [value, setValue] = useState(0)
  useEffect(() => {
    const timeout = setTimeout(() => {
      const start = performance.now()
      function tick() {
        const elapsed = performance.now() - start
        const t = Math.min(elapsed / duration, 1)
        // ease-out cubic
        const eased = 1 - Math.pow(1 - t, 3)
        setValue(Math.round(target * eased))
        if (t < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }, delay)
    return () => clearTimeout(timeout)
  }, [target, duration, delay])
  return value
}

// ── Component ───────────────────────────────────────────────────────────────

export default function LandingEngine() {
  const stageRef = useRef<HTMLDivElement>(null)
  const cleanupRef = useRef<(() => void) | null>(null)

  // Animated stat counters
  const nodeCount = useAnimatedCounter(5000, 2200, 300)
  const fpsCount = useAnimatedCounter(60, 1800, 500)

  useEffect(() => {
    const stage = stageRef.current
    if (!stage || cleanupRef.current) return

    document.fonts.ready.then(() => {
      if (!stageRef.current) return // unmounted during font load
      cleanupRef.current = init(stage)
    })

    return () => {
      cleanupRef.current?.()
      cleanupRef.current = null
    }
  }, [])

  return (
    <>
      <style>{`
        .le-stage {
          position: relative; width: 100vw; height: 100vh; overflow: hidden;
          background: radial-gradient(ellipse at 50% 30%, rgba(40, 50, 80, 0.12) 0%, rgba(10, 10, 18, 1) 60%);
        }
        .le-line {
          position: absolute; white-space: pre; z-index: 1;
          color: ${TEXT_COLOR};
          user-select: text; -webkit-user-select: text;
          transition: opacity 0.4s ease;
        }
        .le-headline-line {
          position: absolute; white-space: pre; z-index: 2;
          font-weight: 700; color: ${HEADLINE_COLOR};
          letter-spacing: 0.02em; text-transform: uppercase;
          user-select: text; -webkit-user-select: text;
          opacity: 0; transform: translateY(8px);
          animation: le-headline-in 0.6s ease forwards;
        }
        @keyframes le-headline-in {
          to { opacity: 1; transform: translateY(0); }
        }
        .le-drop-cap {
          position: absolute; pointer-events: none; z-index: 2;
          font-weight: 600; color: ${DROP_CAP_COLOR};
          opacity: 0; animation: le-fade-in 0.8s ease 0.4s forwards;
        }
        @keyframes le-fade-in {
          to { opacity: 1; }
        }
        .le-orb {
          position: absolute; border-radius: 50%; pointer-events: none; z-index: 10;
          will-change: transform;
          transition: box-shadow 0.3s ease, transform 0.3s ease;
        }
        .le-pq-box {
          position: absolute; pointer-events: none; z-index: 3;
          background: ${GLASS.bg};
          backdrop-filter: ${GLASS.blur};
          -webkit-backdrop-filter: ${GLASS.blur};
          border: ${GLASS.border};
          border-left: 3px solid ${ACCENT_INDIGO};
          border-radius: ${GLASS.radius}px;
          box-shadow: ${GLASS.shadow};
          opacity: 0; animation: le-fade-in 0.6s ease 0.8s forwards;
        }
        .le-pq-line {
          position: absolute; white-space: pre; z-index: 4;
          color: ${ACCENT_INDIGO}; font-weight: 500;
          letter-spacing: 0.06em; text-transform: uppercase;
          user-select: text; -webkit-user-select: text;
        }
        .le-brand {
          position: fixed; top: 18px; left: 24px; z-index: 100;
          font: 500 13px ${FONT_FAMILY};
          letter-spacing: 0.18em; text-transform: uppercase;
          color: ${HEADLINE_COLOR}; text-decoration: none;
          pointer-events: auto; white-space: nowrap;
          transition: color 0.2s ease;
        }
        .le-brand .le-brand-tld {
          color: ${ACCENT_INDIGO};
        }
        .le-brand:hover {
          color: #fff;
        }
        .le-hint {
          position: fixed; top: 16px; left: 50%; transform: translateX(-50%);
          font: 400 10px ${FONT_FAMILY};
          letter-spacing: 0.14em; text-transform: uppercase;
          color: ${MUTED_COLOR}; z-index: 100;
          background: rgba(10, 10, 18, 0.7);
          backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
          padding: 8px 18px; border-radius: 9999px;
          border: 1px solid rgba(255,255,255,0.04);
          pointer-events: none; white-space: nowrap;
          display: none;
        }
        .le-hint.le-visible { display: block; }
        .le-stats {
          position: fixed; top: 18px; right: 24px; z-index: 100;
          display: flex; flex-direction: column; align-items: flex-end; gap: 6px;
          pointer-events: none;
        }
        .le-stats-line {
          font: 500 10px ${FONT_FAMILY};
          letter-spacing: 0.14em; text-transform: uppercase;
          color: ${MUTED_COLOR};
          white-space: nowrap;
        }
        .le-stats-line strong {
          color: ${HEADLINE_COLOR};
          font-weight: 500;
        }
        .le-cta {
          position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%);
          z-index: 100; text-decoration: none;
          font: 500 11px ${FONT_FAMILY};
          letter-spacing: 0.1em; text-transform: uppercase;
          color: ${ACCENT_INDIGO};
          background: ${GLASS.bgSolid};
          backdrop-filter: ${GLASS.blur};
          -webkit-backdrop-filter: ${GLASS.blur};
          border: 1px solid rgba(129, 140, 248, 0.2);
          border-radius: 9999px;
          padding: 12px 32px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.4);
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .le-cta:hover {
          color: #fff;
          border-color: rgba(129, 140, 248, 0.5);
          box-shadow: 0 4px 32px rgba(129, 140, 248, 0.15), 0 4px 24px rgba(0,0,0,0.4);
        }
        .le-breathe-btn {
          position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
          z-index: 100;
          font: 500 11px ${FONT_FAMILY};
          letter-spacing: 0.1em; text-transform: uppercase;
          color: ${HEADLINE_COLOR};
          background: ${GLASS.bg};
          backdrop-filter: ${GLASS.blur};
          -webkit-backdrop-filter: ${GLASS.blur};
          border: 1px solid rgba(129, 140, 248, 0.25);
          border-radius: 9999px;
          padding: 10px 28px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.4);
          cursor: pointer;
          transition: all 0.3s ease;
          white-space: nowrap;
        }
        .le-breathe-btn:hover {
          color: #fff;
          border-color: rgba(129, 140, 248, 0.5);
          box-shadow: 0 4px 32px rgba(129, 140, 248, 0.2), 0 4px 24px rgba(0,0,0,0.4);
        }
        .le-breathe-btn.le-hidden { display: none; }
        @media (max-width: 760px) {
          .le-hint { display: none !important; }
          .le-stats { display: none; }
        }
        @media (prefers-reduced-motion: reduce) {
          .le-orb { transition: none !important; }
          .le-headline-line { animation: none !important; opacity: 1 !important; transform: none !important; }
          .le-drop-cap { animation: none !important; opacity: 1 !important; }
          .le-pq-box { animation: none !important; opacity: 1 !important; }
          .le-line { transition: none !important; }
        }
      `}</style>

      <div ref={stageRef} className="le-stage" />
      <a className="le-brand" href="/">SWARMING<span className="le-brand-tld">.world</span></a>
      <div className="le-stats">
        <span className="le-stats-line"><strong>{nodeCount.toLocaleString()}</strong> Nodes</span>
        <span className="le-stats-line"><strong>{fpsCount}</strong> Frames Per Second</span>
        <span className="le-stats-line"><strong>Zero</strong> Latency</span>
        <span className="le-stats-line">Not a Dashboard. A Living Network.</span>
      </div>
      <div className="le-hint">Drag the orbs &middot; Click to pause &middot; Zero DOM reads</div>
      <button className="le-breathe-btn" id="le-breathe-btn">See the Network Breathe</button>
      <a className="le-cta" href="/world">Enter World &rarr;</a>
    </>
  )
}

// ── Engine initialization (runs once after fonts load) ──────────────────────
// Returns a cleanup function for React unmount.

function init(stage: HTMLDivElement): () => void {
  const W0 = window.innerWidth
  const H0 = window.innerHeight

  // ── Prepare text ────────────────────────────────────────────────────────
  const preparedBody = prepareWithSegments(BODY_TEXT, BODY_FONT)
  const preparedPullquotes = PULLQUOTE_TEXTS.map(t => prepareWithSegments(t, PULLQUOTE_FONT))

  const dropCapSize = BODY_LINE_HEIGHT * DROP_CAP_LINES - 4
  const dropCapFont = `600 ${dropCapSize}px ${FONT_FAMILY}`
  const dropCapText = BODY_TEXT[0]!
  const preparedDropCap = prepareWithSegments(dropCapText, dropCapFont)

  let dropCapWidth = 0
  walkLineRanges(preparedDropCap, 9999, line => { dropCapWidth = line.width })
  const dropCapTotalW = Math.ceil(dropCapWidth) + 10

  // ── Create DOM elements ─────────────────────────────────────────────────

  const dropCapEl = document.createElement('div')
  dropCapEl.className = 'le-drop-cap'
  dropCapEl.textContent = dropCapText
  dropCapEl.style.font = dropCapFont
  dropCapEl.style.lineHeight = `${dropCapSize}px`
  stage.appendChild(dropCapEl)

  const orbStyles = ORB_DEFS.map(def => orbStyle(def.colorIndex))
  const orbEls = ORB_DEFS.map((def, i) => {
    const el = document.createElement('div')
    el.className = 'le-orb'
    el.style.background = orbStyles[i]!.background
    el.style.boxShadow = orbStyles[i]!.boxShadow
    stage.appendChild(el)
    return el
  })

  const bodyLinePool: HTMLSpanElement[] = []
  const headlineLinePool: HTMLSpanElement[] = []
  const pqLinePool: HTMLSpanElement[] = []
  const pqBoxPool: HTMLDivElement[] = []

  // ── State ───────────────────────────────────────────────────────────────

  const orbs = createOrbs(ORB_DEFS, W0, H0)
  let orbsActive = false
  let orbsFadeIn = 0
  let firstRender = true      // for body text entrance fade
  let renderCount = 0

  let pointer: PointerSample = { x: -9999, y: -9999 }
  let drag: DragState | null = null
  let interactionMode: 'idle' | 'text-select' = 'idle'
  let selectionActive = false
  let events = {
    pointerDown: null as PointerSample | null,
    pointerMove: null as PointerSample | null,
    pointerUp: null as PointerSample | null,
  }
  let lastFrameTime: number | null = null
  let committedProjection: TextProjection | null = null

  // ── Headline fit cache ──────────────────────────────────────────────────

  let cacheHlW = -1, cacheHlH = -1, cacheHlMax = -1
  let cacheHlSize = 24
  let cacheHlLines: PositionedLine[] = []

  function fitHeadline(maxWidth: number, maxHeight: number, maxSize: number = 72): HeadlineFit {
    if (maxWidth === cacheHlW && maxHeight === cacheHlH && maxSize === cacheHlMax) {
      return { fontSize: cacheHlSize, lines: cacheHlLines }
    }
    cacheHlW = maxWidth; cacheHlH = maxHeight; cacheHlMax = maxSize

    let lo = 16, hi = maxSize, best = lo
    let bestLines: PositionedLine[] = []

    while (lo <= hi) {
      const size = Math.floor((lo + hi) / 2)
      const font = `700 ${size}px ${HEADLINE_FONT_FAMILY}`
      const lineHeight = Math.round(size * 1.05)
      const prepared = prepareWithSegments(HEADLINE_TEXT, font)
      let breaksWord = false
      let lineCount = 0

      walkLineRanges(prepared, maxWidth, line => {
        lineCount++
        if (line.end.graphemeIndex !== 0) breaksWord = true
      })

      const totalHeight = lineCount * lineHeight
      if (!breaksWord && totalHeight <= maxHeight) {
        best = size
        const result = layoutWithLines(prepared, maxWidth, lineHeight)
        bestLines = result.lines.map((line, i) => ({
          x: 0,
          y: i * lineHeight,
          text: line.text,
          width: line.width,
        }))
        lo = size + 1
      } else {
        hi = size - 1
      }
    }

    cacheHlSize = best
    cacheHlLines = bestLines
    return { fontSize: best, lines: bestLines }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  function isSelectableTarget(target: EventTarget | null): boolean {
    return target instanceof Element &&
      target.closest('.le-line, .le-headline-line, .le-pq-line') !== null
  }

  function hasActiveSelection(): boolean {
    const sel = window.getSelection()
    return sel !== null && !sel.isCollapsed && sel.rangeCount > 0
  }

  function enterTextSelect() {
    interactionMode = 'text-select'
    events.pointerDown = events.pointerMove = events.pointerUp = null
    lastFrameTime = null
    stage.style.userSelect = ''
    stage.style.webkitUserSelect = ''
    document.body.style.cursor = ''
  }

  function syncSelection() {
    selectionActive = hasActiveSelection()
    if (selectionActive) {
      enterTextSelect()
    } else if (interactionMode === 'text-select' && drag === null) {
      interactionMode = 'idle'
    }
  }

  function isTextSelectActive(): boolean {
    return interactionMode === 'text-select' || selectionActive
  }

  // ── Projection equality check ───────────────────────────────────────────

  function linesEqual(a: PositionedLine[], b: PositionedLine[]): boolean {
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) {
      const l = a[i]!, r = b[i]!
      if (l.x !== r.x || l.y !== r.y || l.width !== r.width || l.text !== r.text) return false
    }
    return true
  }

  function projEqual(a: TextProjection | null, b: TextProjection): boolean {
    return a !== null &&
      a.headlineLeft === b.headlineLeft && a.headlineTop === b.headlineTop &&
      a.headlineFont === b.headlineFont && a.headlineLineHeight === b.headlineLineHeight &&
      a.bodyFont === b.bodyFont && a.bodyLineHeight === b.bodyLineHeight &&
      a.pullquoteFont === b.pullquoteFont && a.pullquoteLineHeight === b.pullquoteLineHeight &&
      linesEqual(a.headlineLines, b.headlineLines) &&
      linesEqual(a.bodyLines, b.bodyLines) &&
      linesEqual(a.pullquoteLines, b.pullquoteLines)
  }

  // ── Render frame ────────────────────────────────────────────────────────

  function render(now: number): boolean {
    const skipPhysics = isTextSelectActive() && drag === null

    const pageWidth = document.documentElement.clientWidth
    const pageHeight = document.documentElement.clientHeight
    const isNarrow = pageWidth < NARROW_BREAKPOINT
    const gutter = isNarrow ? NARROW_GUTTER : GUTTER
    const colGap = isNarrow ? NARROW_COL_GAP : COL_GAP
    const bottomGap = isNarrow ? NARROW_BOTTOM_GAP : BOTTOM_GAP
    const orbRadiusScale = isNarrow ? NARROW_ORB_SCALE : 1
    const activeOrbCount = isNarrow ? Math.min(NARROW_ACTIVE_ORBS, orbs.length) : orbs.length

    // ── Process events (skip if text selecting) ─────────────────────────
    if (!skipPhysics) {
      if (events.pointerDown !== null) {
        const down = events.pointerDown
        pointer = down
        if (drag === null) {
          const idx = hitTestOrbs(orbs, down.x, down.y, activeOrbCount, orbRadiusScale)
          if (idx !== -1) {
            const orb = orbs[idx]!
            drag = {
              orbIndex: idx,
              startPointerX: down.x,
              startPointerY: down.y,
              startOrbX: orb.x,
              startOrbY: orb.y,
            }
          }
        }
      }

      if (events.pointerMove !== null) {
        const move = events.pointerMove
        pointer = move
        if (drag !== null) {
          const orb = orbs[drag.orbIndex]!
          orb.x = drag.startOrbX + (move.x - drag.startPointerX)
          orb.y = drag.startOrbY + (move.y - drag.startPointerY)
        }
      }

      if (events.pointerUp !== null) {
        const up = events.pointerUp
        pointer = up
        if (drag !== null) {
          const dx = up.x - drag.startPointerX
          const dy = up.y - drag.startPointerY
          const orb = orbs[drag.orbIndex]!
          if (dx * dx + dy * dy < 16) {
            orb.paused = !orb.paused
          } else {
            orb.x = drag.startOrbX + dx
            orb.y = drag.startOrbY + dy
          }
          drag = null
        }
      }
    }

    // ── Physics ─────────────────────────────────────────────────────────
    const draggedIdx = drag?.orbIndex ?? -1
    const prevTime = lastFrameTime ?? now
    const dt = Math.min((now - prevTime) / 1000, 0.05)

    let stillAnimating = false

    if (orbsActive && !skipPhysics) {
      if (orbsFadeIn < 1) {
        orbsFadeIn = Math.min(1, orbsFadeIn + dt / 0.6)
        stillAnimating = true
      }

      stillAnimating = stepPhysics(
        orbs, dt, pageWidth, pageHeight, gutter, bottomGap,
        orbRadiusScale, activeOrbCount, draggedIdx, isNarrow,
      ) || stillAnimating
    }

    // ── Build obstacles ─────────────────────────────────────────────────
    const circleObstacles: CircleObstacle[] = []
    if (orbsActive) {
      for (let i = 0; i < activeOrbCount; i++) {
        const orb = orbs[i]!
        circleObstacles.push({
          cx: orb.x, cy: orb.y, r: orb.r * orbRadiusScale,
          hPad: isNarrow ? 10 : 14,
          vPad: isNarrow ? 2 : 4,
        })
      }
    }

    // ── Headline ────────────────────────────────────────────────────────
    const headlineWidth = Math.min(pageWidth - gutter * 2, 1000)
    const maxHeadlineHeight = Math.floor(pageHeight * (isNarrow ? 0.18 : 0.22))
    const { fontSize: hlSize, lines: hlLines } = fitHeadline(
      headlineWidth, maxHeadlineHeight, isNarrow ? 32 : 72,
    )
    const hlLineHeight = Math.round(hlSize * 1.05)
    const hlFont = `700 ${hlSize}px ${HEADLINE_FONT_FAMILY}`
    const hlHeight = hlLines.length * hlLineHeight

    // ── Body columns ────────────────────────────────────────────────────
    const bodyTop = gutter + hlHeight + (isNarrow ? 14 : 24)
    const bodyHeight = pageHeight - bodyTop - bottomGap - 60
    const columnCount = pageWidth > 1000 ? 3 : pageWidth > 640 ? 2 : 1
    const totalGutter = gutter * 2 + colGap * (columnCount - 1)
    const maxCW = Math.min(pageWidth, MAX_CONTENT_WIDTH)
    const colW = Math.floor((maxCW - totalGutter) / columnCount)
    const contentLeft = Math.round((pageWidth - (columnCount * colW + (columnCount - 1) * colGap)) / 2)
    const col0X = contentLeft

    // ── Drop cap obstacle ───────────────────────────────────────────────
    const dropCapRect: RectObstacle = {
      x: col0X - 2,
      y: bodyTop - 2,
      w: dropCapTotalW,
      h: DROP_CAP_LINES * BODY_LINE_HEIGHT + 2,
    }

    // ── Pull quotes ─────────────────────────────────────────────────────
    const pqRects: PullquoteRect[] = []
    for (let i = 0; i < PULLQUOTE_PLACEMENTS.length; i++) {
      if (isNarrow) break
      const placement = PULLQUOTE_PLACEMENTS[i]!
      if (placement.colIdx >= columnCount) continue

      const pqW = Math.round(colW * placement.wFrac)
      const pqLines = layoutWithLines(preparedPullquotes[i]!, pqW - 28, PULLQUOTE_LINE_HEIGHT).lines
      const pqH = pqLines.length * PULLQUOTE_LINE_HEIGHT + 24
      const colX = contentLeft + placement.colIdx * (colW + colGap)
      const pqX = placement.side === 'right' ? colX + colW - pqW : colX
      const pqY = Math.round(bodyTop + bodyHeight * placement.yFrac)
      const positioned = pqLines.map((line, li) => ({
        x: pqX + 20,
        y: pqY + 12 + li * PULLQUOTE_LINE_HEIGHT,
        text: line.text,
        width: line.width,
      }))

      pqRects.push({ x: pqX, y: pqY, w: pqW, h: pqH, lines: positioned, colIdx: placement.colIdx })
    }

    // ── Layout body text across columns ─────────────────────────────────
    const allBodyLines: PositionedLine[] = []
    let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 1 }

    for (let ci = 0; ci < columnCount; ci++) {
      const colX = contentLeft + ci * (colW + colGap)
      const rects: RectObstacle[] = []
      if (ci === 0) rects.push(dropCapRect)
      for (const pq of pqRects) {
        if (pq.colIdx === ci) rects.push({ x: pq.x, y: pq.y, w: pq.w, h: pq.h })
      }

      const result = layoutColumn(
        preparedBody, cursor, colX, bodyTop, colW, bodyHeight,
        BODY_LINE_HEIGHT, circleObstacles, rects, isNarrow,
      )
      allBodyLines.push(...result.lines)
      cursor = result.cursor
    }

    // ── Flatten pullquote lines ─────────────────────────────────────────
    const allPqLines: PositionedLine[] = []
    for (const pq of pqRects) {
      for (const line of pq.lines) allPqLines.push(line)
    }

    // ── Diff & project to DOM ───────────────────────────────────────────
    const projection: TextProjection = {
      headlineLeft: gutter,
      headlineTop: gutter,
      headlineFont: hlFont,
      headlineLineHeight: hlLineHeight,
      headlineLines: hlLines,
      bodyFont: BODY_FONT,
      bodyLineHeight: BODY_LINE_HEIGHT,
      bodyLines: allBodyLines,
      pullquoteFont: PULLQUOTE_FONT,
      pullquoteLineHeight: PULLQUOTE_LINE_HEIGHT,
      pullquoteLines: allPqLines,
    }

    if (!projEqual(committedProjection, projection)) {
      // Headline — stagger animation delay per line
      syncPool(headlineLinePool, projection.headlineLines.length, stage, () => {
        const el = document.createElement('span')
        el.className = 'le-headline-line'
        return el
      })
      for (let i = 0; i < projection.headlineLines.length; i++) {
        const el = headlineLinePool[i]!
        const line = projection.headlineLines[i]!
        el.textContent = line.text
        el.style.left = `${projection.headlineLeft + line.x}px`
        el.style.top = `${projection.headlineTop + line.y}px`
        el.style.font = projection.headlineFont
        el.style.lineHeight = `${projection.headlineLineHeight}px`
        el.style.animationDelay = `${i * 0.15}s`
      }

      // Body
      syncPool(bodyLinePool, projection.bodyLines.length, stage, () => {
        const el = document.createElement('span')
        el.className = 'le-line'
        return el
      })
      projectLines(bodyLinePool, projection.bodyLines, projection.bodyFont, projection.bodyLineHeight)

      // Body entrance fade on first render
      if (firstRender) {
        firstRender = false
        for (let i = 0; i < bodyLinePool.length; i++) {
          const el = bodyLinePool[i]!
          if (el.style.display === 'none') continue
          el.style.opacity = '0'
          const delay = 0.3 + i * 0.008 // stagger across all lines
          el.style.transitionDelay = `${delay}s`
          // Force a reflow to start the transition, then set opacity to 1
          requestAnimationFrame(() => {
            el.style.opacity = '1'
          })
        }
      }

      // Pullquotes
      syncPool(pqLinePool, projection.pullquoteLines.length, stage, () => {
        const el = document.createElement('span')
        el.className = 'le-pq-line'
        return el
      })
      projectLines(pqLinePool, projection.pullquoteLines, projection.pullquoteFont, projection.pullquoteLineHeight)

      committedProjection = projection
    }

    // ── Drop cap position ───────────────────────────────────────────────
    dropCapEl.style.left = `${col0X}px`
    dropCapEl.style.top = `${bodyTop}px`

    // ── Pullquote boxes ─────────────────────────────────────────────────
    syncPool(pqBoxPool, pqRects.length, stage, () => {
      const el = document.createElement('div')
      el.className = 'le-pq-box'
      return el
    })
    for (let i = 0; i < pqRects.length; i++) {
      const pq = pqRects[i]!
      const box = pqBoxPool[i]!
      box.style.left = `${pq.x}px`
      box.style.top = `${pq.y}px`
      box.style.width = `${pq.w}px`
      box.style.height = `${pq.h}px`
    }

    // ── Orb positions + hover glow ──────────────────────────────────────
    const hoveredOrb = orbsActive ? hitTestOrbs(orbs, pointer.x, pointer.y, activeOrbCount, orbRadiusScale) : -1

    for (let i = 0; i < orbs.length; i++) {
      const orb = orbs[i]!
      const el = orbEls[i]!
      if (!orbsActive || i >= activeOrbCount) { el.style.display = 'none'; continue }
      const r = orb.r * orbRadiusScale
      el.style.display = ''
      el.style.left = `${orb.x - r}px`
      el.style.top = `${orb.y - r}px`
      el.style.width = `${r * 2}px`
      el.style.height = `${r * 2}px`
      const baseOpacity = orb.paused ? 0.45 : 1
      el.style.opacity = `${baseOpacity * orbsFadeIn}`
      // Hover glow intensification
      const isHovered = i === hoveredOrb
      el.style.boxShadow = isHovered ? orbStyles[i]!.boxShadowHover : orbStyles[i]!.boxShadow
      el.style.transform = isHovered ? 'scale(1.05)' : 'scale(1)'
    }

    // ── Cursor ──────────────────────────────────────────────────────────
    stage.style.userSelect = drag !== null ? 'none' : ''
    stage.style.webkitUserSelect = drag !== null ? 'none' : ''
    document.body.style.cursor = drag !== null ? 'grabbing' : hoveredOrb !== -1 ? 'grab' : ''

    // ── Bookkeeping ─────────────────────────────────────────────────────
    events.pointerDown = events.pointerMove = events.pointerUp = null
    lastFrameTime = stillAnimating ? now : null
    renderCount++

    return stillAnimating
  }

  // ── RAF scheduler ───────────────────────────────────────────────────────

  let scheduledRaf: number | null = null
  function scheduleRender() {
    if (scheduledRaf !== null) return
    scheduledRaf = requestAnimationFrame(function frame(now) {
      scheduledRaf = null
      if (render(now)) scheduleRender()
    })
  }

  // ── Event listeners (named for cleanup) ─────────────────────────────────

  const onPointerDown = (e: PointerEvent) => {
    if (isSelectableTarget(e.target)) {
      if (e.pointerType === 'touch') enterTextSelect()
      return
    }
    if (!orbsActive) return
    const count = window.innerWidth < NARROW_BREAKPOINT ? NARROW_ACTIVE_ORBS : orbs.length
    const scale = window.innerWidth < NARROW_BREAKPOINT ? NARROW_ORB_SCALE : 1
    const hit = hitTestOrbs(orbs, e.clientX, e.clientY, count, scale)
    if (hit !== -1) e.preventDefault()
    else if (e.pointerType === 'touch' && selectionActive) { enterTextSelect(); return }
    events.pointerDown = { x: e.clientX, y: e.clientY }
    scheduleRender()
  }

  const onTouchMove = (e: TouchEvent) => {
    if (isTextSelectActive()) return
    e.preventDefault()
  }

  const onPointerMove = (e: PointerEvent) => {
    if (e.pointerType === 'touch' && isTextSelectActive() && drag === null) return
    events.pointerMove = { x: e.clientX, y: e.clientY }
    scheduleRender()
  }

  const onPointerUp = (e: PointerEvent) => {
    if (e.pointerType === 'touch' && isTextSelectActive() && drag === null) {
      syncSelection(); return
    }
    if (e.pointerType === 'touch') syncSelection()
    events.pointerUp = { x: e.clientX, y: e.clientY }
    scheduleRender()
  }

  const onPointerCancel = (e: PointerEvent) => {
    if (e.pointerType === 'touch') syncSelection()
    events.pointerUp = { x: e.clientX, y: e.clientY }
    scheduleRender()
  }

  const onResize = () => scheduleRender()
  const onSelectionChange = () => { syncSelection(); scheduleRender() }

  stage.addEventListener('pointerdown', onPointerDown)
  stage.addEventListener('touchmove', onTouchMove, { passive: false })
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('pointercancel', onPointerCancel)
  window.addEventListener('resize', onResize)
  document.addEventListener('selectionchange', onSelectionChange)

  // ── "See the Network Breathe" activation button ──────────────────────
  const breatheBtn = document.getElementById('le-breathe-btn')
  const hintEl = document.querySelector('.le-hint')

  const onBreatheClick = () => {
    if (orbsActive) return
    orbsActive = true
    orbsFadeIn = 0
    breatheBtn?.classList.add('le-hidden')
    hintEl?.classList.add('le-visible')
    scheduleRender()
  }

  breatheBtn?.addEventListener('click', onBreatheClick)

  // ── Start ─────────────────────────────────────────────────────────────
  scheduleRender()

  // ── Cleanup function for React unmount ────────────────────────────────
  return () => {
    if (scheduledRaf !== null) cancelAnimationFrame(scheduledRaf)
    stage.removeEventListener('pointerdown', onPointerDown)
    stage.removeEventListener('touchmove', onTouchMove)
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
    window.removeEventListener('pointercancel', onPointerCancel)
    window.removeEventListener('resize', onResize)
    document.removeEventListener('selectionchange', onSelectionChange)
    breatheBtn?.removeEventListener('click', onBreatheClick)
    document.body.style.cursor = ''
  }
}
