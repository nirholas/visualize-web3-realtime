import { BlogLayout } from "../../components/BlogLayout";
import { CodeBlock } from "../../components/CodeBlock";

export default function ZeroDomReads() {
  return (
    <BlogLayout>
      <p>
        The Swarming landing page has a trick: text that reflows around
        draggable orbs in real-time. Drag an orb through a paragraph and the
        words part around it like water. This runs at 60fps with zero DOM
        reads per frame. Here&apos;s how.
      </p>

      <h2>Why CSS Can&apos;t Do This</h2>
      <p>
        CSS has <code>shape-outside</code> for flowing text around shapes.
        But it only works with floats, can&apos;t respond to drag in
        real-time, and &mdash; critically &mdash; triggers layout reflow
        when the shape changes. A single <code>getBoundingClientRect()</code>{" "}
        call forces the browser to synchronously compute layout. In an
        animation loop, this is catastrophic:
      </p>

      <CodeBlock
        filename="bad-approach.ts"
        language="typescript"
        code={`// The naive approach — triggers layout thrashing
function onAnimationFrame() {
  // Forces synchronous layout:
  const rect = element.getBoundingClientRect();

  // Invalidates layout:
  element.style.transform = \`translate(\${x}px, \${y}px)\`;

  // Forces layout AGAIN for the next read:
  const nextRect = otherElement.getBoundingClientRect();

  requestAnimationFrame(onAnimationFrame);
}
// Result: ~15fps, janky, browser screaming`}
      />

      <p>
        Each read-after-write cycle forces the browser to flush pending
        style/layout changes before it can answer your query. This is
        &ldquo;layout thrashing&rdquo; and it&apos;s the #1 cause of
        animation jank on the web.
      </p>

      <h2>Off-DOM Text Measurement with Pretext</h2>
      <p>
        The core insight is that text measurement and text rendering are
        separable. We use{" "}
        <a href="https://github.com/chenglou/pretext">@chenglou/pretext</a>{" "}
        to measure text entirely off-DOM using canvas{" "}
        <code>measureText()</code>.
      </p>

      <CodeBlock
        filename="text-measurement.ts"
        language="typescript"
        code={`import {
  prepareWithSegments,
  layoutWithLines,
  walkLineRanges,
} from '@chenglou/pretext';

// Step 1: Measure text segments off-DOM
// Uses canvas measureText() internally — no DOM reads
const prepared = prepareWithSegments(text, {
  font: BODY_FONT,
  lineHeight: BODY_LINE_HEIGHT,
});

// Step 2: Compute line breaks given width + obstacles
// Pure computation — no DOM involved
const layout = layoutWithLines(prepared, {
  width: columnWidth,
  obstacles: circleObstacles,
});

// Step 3: Walk resulting lines to get positions
const lines: PositionedLine[] = [];
walkLineRanges(layout, (line) => {
  lines.push({
    text: line.text,
    x: line.x,
    y: line.y,
    width: line.width,
  });
});`}
      />

      <p>
        <code>prepareWithSegments</code> creates an off-screen canvas
        context, measures every character width, and builds a lookup table.
        This happens once on init. <code>layoutWithLines</code> then uses
        that lookup table to compute line breaks, hyphenation, and obstacle
        avoidance &mdash; all with pure arithmetic, zero DOM access.
      </p>

      <h2>The Obstacle Model</h2>
      <p>
        Text avoidance is modeled with two primitives: circles and
        rectangles. The orbs are circles. Pull-quotes and other UI elements
        are rectangles. The layout engine checks each line against all
        obstacles and splits lines that would overlap.
      </p>

      <CodeBlock
        filename="textLayout.ts"
        language="typescript"
        code={`type CircleObstacle = {
  cx: number;
  cy: number;
  radius: number;
};

type RectObstacle = {
  x: number;
  y: number;
  width: number;
  height: number;
};

function layoutColumn(
  text: string,
  columnWidth: number,
  circles: CircleObstacle[],
  rects: RectObstacle[],
): PositionedLine[] {
  // For each potential line y-position:
  // 1. Check circle intersections → shrink available width
  // 2. Check rect intersections → shift line start
  // 3. Fit as many words as possible in remaining space
  // 4. Return { text, x, y, width }
  // Pure computation — O(lines × obstacles)
}`}
      />

      <p>
        The obstacle check is simple geometry: for a circle, compute the
        horizontal chord at the line&apos;s y-position. If the chord
        intersects the line&apos;s x-range, shorten the line. This runs in
        O(lines &times; obstacles), and with typically 5-8 orbs and ~100
        lines, it&apos;s trivially fast.
      </p>

      <h2>The Span Pool</h2>
      <p>
        We have positions for every line of text. Now we need to render them.
        The obvious approach &mdash; React state with <code>.map()</code>{" "}
        &mdash; means reconciling 100+ elements every frame. Even with
        React&apos;s diffing, this creates visible GC pauses from transient
        object allocation.
      </p>
      <p>
        Instead, we maintain a <strong>span pool</strong>: a fixed set of
        DOM span elements that we reuse by updating their{" "}
        <code>textContent</code> and <code>transform</code>.
      </p>

      <CodeBlock
        filename="domPool.ts"
        language="typescript"
        code={`function syncPool(
  container: HTMLElement,
  needed: number,
  pool: HTMLSpanElement[],
) {
  // Grow pool if needed (rare — only on resize)
  while (pool.length < needed) {
    const span = document.createElement('span');
    span.style.position = 'absolute';
    span.style.whiteSpace = 'pre';
    span.style.willChange = 'transform';
    container.appendChild(span);
    pool.push(span);
  }

  // Hide excess spans (don't remove — keep for reuse)
  for (let i = needed; i < pool.length; i++) {
    pool[i].style.display = 'none';
  }
}

function projectLines(
  lines: PositionedLine[],
  pool: HTMLSpanElement[],
) {
  for (let i = 0; i < lines.length; i++) {
    const span = pool[i];
    const line = lines[i];
    span.style.display = '';
    span.textContent = line.text;
    span.style.transform =
      \`translate(\${line.x}px, \${line.y}px)\`;
    // No DOM reads — only writes
  }
}`}
      />

      <p>
        The pool grows on demand but never shrinks. Excess spans are hidden
        with <code>display: none</code>, not removed. The hot path &mdash;
        every animation frame &mdash; only does DOM <em>writes</em>. Setting{" "}
        <code>textContent</code> and <code>transform</code> are pure writes
        that don&apos;t trigger synchronous layout.
      </p>

      <h2>The Physics Engine</h2>
      <p>
        The orbs need to feel physical. They drift, bounce off edges, and
        respond to drag. We use a minimal physics engine with velocity,
        friction, and boundary bounce:
      </p>

      <CodeBlock
        filename="orbPhysics.ts"
        language="typescript"
        code={`function stepPhysics(
  orbs: Orb[],
  dt: number,
  bounds: Rect,
) {
  for (const orb of orbs) {
    orb.x += orb.vx * dt;
    orb.y += orb.vy * dt;

    // Damped boundary bounce
    if (orb.x - orb.radius < bounds.left) {
      orb.x = bounds.left + orb.radius;
      orb.vx = Math.abs(orb.vx) * 0.8;
    }
    if (orb.x + orb.radius > bounds.right) {
      orb.x = bounds.right - orb.radius;
      orb.vx = -Math.abs(orb.vx) * 0.8;
    }
    // ... same for y

    orb.vx *= 0.995; // friction
    orb.vy *= 0.995;
  }
}

function hitTestOrbs(
  orbs: Orb[],
  px: number,
  py: number,
) {
  for (let i = orbs.length - 1; i >= 0; i--) {
    const dx = px - orbs[i].x;
    const dy = py - orbs[i].y;
    if (dx * dx + dy * dy < orbs[i].radius ** 2) {
      return i;
    }
  }
  return -1;
}`}
      />

      <p>
        The physics is intentionally simple. Velocity + friction + boundary
        bounce gives the orbs a satisfying heft while keeping the per-frame
        cost near zero.
      </p>

      <h2>Putting It All Together</h2>
      <p>
        The animation loop does exactly four things per frame:
      </p>
      <ul>
        <li>
          <strong>Step orb physics</strong> &mdash; update positions, apply
          friction
        </li>
        <li>
          <strong>Compute text layout</strong> &mdash; line breaks with
          obstacle avoidance, pure math
        </li>
        <li>
          <strong>Project lines to span pool</strong> &mdash; DOM writes only
        </li>
        <li>
          <strong>Update orb transforms</strong> &mdash; DOM writes only
        </li>
      </ul>
      <p>
        No DOM reads. No <code>getBoundingClientRect()</code>. No{" "}
        <code>offsetWidth</code>. No <code>getComputedStyle()</code>. The
        browser never needs to flush pending layout during the frame.
      </p>

      <h2>Performance Results</h2>
      <p>On a 2020 MacBook Air (M1):</p>
      <ul>
        <li>
          <strong>Frame time</strong>: 2-4ms (budget: 16ms for 60fps)
        </li>
        <li>
          <strong>Layout thrashing events</strong>: zero (verified with
          Chrome Performance panel)
        </li>
        <li>
          <strong>GC pauses</strong>: none during animation (no allocations
          in hot path)
        </li>
        <li>
          <strong>Span pool size</strong>: ~120 spans, created once, reused
          indefinitely
        </li>
      </ul>
      <p>
        The technique generalizes to any scenario where you need animated
        text layout: code editors with inline widgets, magazine-style
        layouts, or interactive infographics. The principle is always the
        same: measure off-DOM, compute with pure math, write in a batch.
        Zero reads.
      </p>

      <p>
        See it live at{" "}
        <a href="https://swarming.world">swarming.world</a> &mdash; the
        landing page is the demo.
      </p>
    </BlogLayout>
  );
}
