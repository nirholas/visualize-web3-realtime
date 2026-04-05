/**
 * Lightweight DOM element pool for the landing page text rendering.
 * Elements are created lazily and recycled — hidden with display:none when unused.
 */

export function syncPool<T extends HTMLElement>(
  pool: T[],
  count: number,
  container: HTMLElement,
  create: () => T,
): void {
  while (pool.length < count) {
    const el = create()
    container.appendChild(el)
    pool.push(el)
  }
  for (let i = 0; i < pool.length; i++) {
    pool[i]!.style.display = i < count ? '' : 'none'
  }
}

export type PositionedLine = {
  x: number
  y: number
  text: string
  width: number
}

/**
 * Project positioned lines onto pooled span elements.
 * Updates textContent, left, top, font, and lineHeight.
 */
export function projectLines(
  pool: HTMLSpanElement[],
  lines: PositionedLine[],
  font: string,
  lineHeight: number,
): void {
  for (let i = 0; i < lines.length; i++) {
    const el = pool[i]!
    const line = lines[i]!
    el.textContent = line.text
    el.style.left = `${line.x}px`
    el.style.top = `${line.y}px`
    el.style.font = font
    el.style.lineHeight = `${lineHeight}px`
  }
}
