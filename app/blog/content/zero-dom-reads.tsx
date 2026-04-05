import { BlogLayout } from "../components/BlogLayout";
import { CodeBlock } from "../components/CodeBlock";

export function ZeroDomReadsContent() {
  return (
    <BlogLayout>
      <p>
        On the Swarming landing page, text reflows around draggable orbs every
        single frame. You can grab a glowing sphere and drag it through a
        paragraph, and the words part around it in real time — no jank, no
        stutter, locked at 60fps. Getting there meant rethinking everything we
        knew about text layout on the web.
      </p>

      <p>
        This post walks through how we built a text layout engine that performs
        zero DOM reads per frame — no <code>getBoundingClientRect()</code>, no{" "}
        <code>offsetWidth</code>, no <code>getComputedStyle()</code>. Every
        measurement happens off-DOM, every position is pre-computed, and the
        browser&apos;s layout engine never enters the hot path.
      </p>

      <h2>Why CSS Flow Cannot Do This</h2>

      <p>
        Your first instinct might be to reach for CSS shapes, floats, or{" "}
        <code>shape-outside</code>. We tried. The moment you move an obstacle,
        the browser must reflow the surrounding text. That means it
        invalidates layout, recalculates positions for every affected element,
        and re-paints. On a page with a few hundred words, a single reflow
        triggered by dragging costs 8-16ms — your entire frame budget, gone.
      </p>

      <p>
        The core problem is the read-write cycle. To know where text ended up,
        you call <code>getBoundingClientRect()</code>. That forces the browser
        to flush pending style and layout changes synchronously. If you then
        write a new position and read again, you trigger{" "}
        <strong>layout thrashing</strong> — the single biggest performance
        killer in DOM-heavy applications. We needed a fundamentally different
        approach: measure text without the DOM, position it ourselves, and
        only write to the DOM once per frame.
      </p>

      <h2>Off-DOM Text Measurement with Pretext</h2>

      <p>
        The breakthrough came from{" "}
        <a
          href="https://github.com/chenglou/pretext"
          target="_blank"
          rel="noopener noreferrer"
        >
          @chenglou/pretext
        </a>
        , a library that measures text entirely off-DOM using canvas{" "}
        <code>measureText</code>. Instead of rendering spans and reading their
        widths back, pretext calculates glyph metrics directly. We feed it our
        content and get back precise segment widths without ever touching the
        document.
      </p>

      <p>
        The pipeline has three stages. First,{" "}
        <code>prepareWithSegments()</code> takes our raw text and font
        configuration and produces measured segments — chunks of text with
        known widths. Second, <code>layoutWithLines()</code> takes those
        segments, a target column width, and a list of obstacles, then
        produces an array of positioned lines. Third,{" "}
        <code>walkLineRanges()</code> lets us iterate over the results to
        build the final render data.
      </p>

      <CodeBlock
        filename="textLayout.ts"
        language="TypeScript"
        code={`import { prepareWithSegments, layoutWithLines, walkLineRanges } from '@chenglou/pretext';

// Measure text segments off-DOM — no spans, no offsetWidth
const segments = prepareWithSegments(text, {
  font: BODY_FONT,
  lineHeight: BODY_LINE_HEIGHT,
  letterSpacing: 0,
});

// Layout lines around obstacles, producing PositionedLine[]
const lines = layoutWithLines(segments, {
  columnWidth: containerWidth - GUTTER * 2,
  obstacles,
});

// Walk the results to extract positions
const positioned: PositionedLine[] = [];
walkLineRanges(lines, (x, y, width, lineText) => {
  positioned.push({ x, y, width, text: lineText });
});`}
      />

      <p>
        Every call in this pipeline is pure computation. No DOM nodes are
        created, no styles are computed by the browser, no layout is
        triggered. The entire measurement pass runs in well under 1ms for
        a typical page of text.
      </p>

      <h2>The Obstacle Abstraction</h2>

      <p>
        Text needs to know what to flow around. We defined two obstacle types
        that <code>layoutWithLines()</code> understands:{" "}
        <code>CircleObstacle</code> and <code>RectObstacle</code>. Each
        obstacle describes a region that text must avoid. The layout engine
        tests each line segment against every obstacle and splits or shifts
        the line accordingly.
      </p>

      <CodeBlock
        filename="textLayout.ts"
        language="TypeScript"
        code={`interface CircleObstacle {
  type: 'circle';
  cx: number;
  cy: number;
  radius: number;
}

interface RectObstacle {
  type: 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
}

// layoutColumn combines font config, obstacles, and container
// dimensions to produce fully positioned lines
function layoutColumn(
  text: string,
  columnWidth: number,
  obstacles: (CircleObstacle | RectObstacle)[],
  font: string,
  lineHeight: number,
): PositionedLine[] {
  const segments = prepareWithSegments(text, { font, lineHeight });
  return layoutWithLines(segments, { columnWidth, obstacles });
}`}
      />

      <p>
        The circle obstacle is the interesting one. For each line&apos;s
        y-range, we calculate the horizontal chord of the circle at that
        height and exclude that region from available line space. Text splits
        around the circle naturally, producing the organic wrapping effect
        you see on the landing page. The headline text uses a different
        font size and line-height than the body, and pullquotes have their
        own placement configuration — but they all flow through the same
        obstacle-aware layout function.
      </p>

      <h2>Physics Engine for Draggable Orbs</h2>

      <p>
        The obstacles are not static. They are draggable orbs with real
        physics — velocity, friction, boundary collision, and inter-orb
        repulsion. The <code>orbPhysics</code> module handles all of this.
      </p>

      <CodeBlock
        filename="orbPhysics.ts"
        language="TypeScript"
        code={`// Create orbs with initial positions and radii
const orbs = createOrbs(containerWidth, containerHeight);

// Each frame: step physics, then feed positions to text layout
function frame() {
  // Update velocities, apply friction, handle collisions
  stepPhysics(orbs, containerWidth, containerHeight);

  // Convert orb positions to CircleObstacles for text layout
  const obstacles: CircleObstacle[] = orbs.map(orb => ({
    type: 'circle',
    cx: orb.x,
    cy: orb.y,
    radius: orb.radius + 8, // padding so text doesn't clip
  }));

  // Re-layout text with new obstacle positions
  const lines = layoutColumn(text, columnWidth, obstacles, BODY_FONT, BODY_LINE_HEIGHT);

  // Sync DOM
  syncPool(lines);
  requestAnimationFrame(frame);
}

// Drag interaction
function onPointerDown(e: PointerEvent) {
  const hit = hitTestOrbs(orbs, e.clientX, e.clientY);
  if (hit) startDrag(hit, e);
}`}
      />

      <p>
        <code>stepPhysics()</code> runs every frame. It applies velocity
        damping, bounces orbs off container edges, and resolves overlaps
        between orbs using simple circle-circle collision. The drag
        interaction captures a pointer, tracks delta movement, and applies
        it as velocity so orbs feel weighty when released.{" "}
        <code>hitTestOrbs()</code> checks if a pointer coordinate falls
        within any orb&apos;s radius. <code>orbStyle()</code> generates the
        inline CSS for each orb&apos;s current position, producing{" "}
        <code>transform: translate3d(...)</code> values that the GPU
        composites without triggering layout.
      </p>

      <h2>The Span Pool Pattern</h2>

      <p>
        We now have positioned lines — an array of{" "}
        <code>PositionedLine</code> objects with exact x/y coordinates,
        widths, and text content. The naive approach would be to render
        them as React elements and let the virtual DOM diff handle updates.
        But at 60fps with 40-80 visible lines, even React&apos;s diffing
        overhead is too much. We need direct DOM manipulation, and we need
        it to be allocation-free.
      </p>

      <p>
        Enter the <strong>span pool</strong>. We pre-allocate a fixed set of
        DOM <code>&lt;span&gt;</code> elements and reuse them every frame.
        No elements are created or destroyed in the hot loop. The{" "}
        <code>syncPool()</code> function takes the current{" "}
        <code>PositionedLine[]</code> array, assigns each line to a pooled
        span, sets its <code>textContent</code> and{" "}
        <code>transform</code>, and hides any excess spans.
      </p>

      <CodeBlock
        filename="syncPool.ts"
        language="TypeScript"
        code={`const pool: HTMLSpanElement[] = [];

function ensurePool(container: HTMLElement, size: number) {
  while (pool.length < size) {
    const span = document.createElement('span');
    span.style.position = 'absolute';
    span.style.willChange = 'transform';
    span.style.whiteSpace = 'nowrap';
    container.appendChild(span);
    pool.push(span);
  }
}

function syncPool(lines: PositionedLine[]) {
  for (let i = 0; i < pool.length; i++) {
    const span = pool[i];
    if (i < lines.length) {
      const line = lines[i];
      span.textContent = line.text;
      span.style.transform = \`translate3d(\${line.x}px, \${line.y}px, 0)\`;
      span.style.display = '';
    } else {
      span.style.display = 'none';
    }
  }
}`}
      />

      <p>
        This pattern is critical. By reusing DOM nodes, we avoid the garbage
        collector, avoid layout tree mutations, and keep the browser&apos;s
        internal node count stable. The <code>will-change: transform</code>{" "}
        hint promotes each span to its own compositor layer, so updating{" "}
        <code>transform</code> triggers only compositing — no layout, no
        paint. <code>projectLines()</code> works alongside{" "}
        <code>syncPool()</code> to handle the mapping from logical lines to
        physical spans, accounting for the narrow breakpoint on mobile
        where column count and widths change.
      </p>

      <h2>Zero Reads Per Frame</h2>

      <p>
        Let us trace the entire frame to verify we never read from the DOM:
      </p>

      <ul>
        <li>
          <strong>Physics step:</strong> pure math on orb position/velocity
          arrays. No DOM.
        </li>
        <li>
          <strong>Text measurement:</strong> pretext uses canvas{" "}
          <code>measureText</code>. No DOM reads.
        </li>
        <li>
          <strong>Line layout:</strong> pure computation over segments and
          obstacles. No DOM.
        </li>
        <li>
          <strong>DOM sync:</strong> write-only. We set{" "}
          <code>textContent</code> and <code>transform</code> on pooled
          spans. We never read back positions.
        </li>
        <li>
          <strong>Orb rendering:</strong> <code>orbStyle()</code> produces
          transform strings from physics state. Write-only.
        </li>
      </ul>

      <p>
        Zero <code>getBoundingClientRect()</code> calls. Zero{" "}
        <code>offsetWidth</code> reads. Zero forced reflows. The browser
        layout engine does its job exactly once — during the initial page
        load — and never again during animation.
      </p>

      <CodeBlock
        filename="renderLoop.ts"
        language="TypeScript"
        code={`function renderFrame() {
  // 1. Physics: ~0.1ms — pure math
  stepPhysics(orbs, width, height);

  // 2. Obstacles: ~0.01ms — array map
  const obstacles = orbs.map(orbToObstacle);

  // 3. Layout: ~0.5ms — off-DOM text measurement + line breaking
  const bodyLines = layoutColumn(bodyText, colWidth, obstacles, BODY_FONT, BODY_LINE_HEIGHT);
  const headlineLines = layoutColumn(headline, colWidth, obstacles, HEADLINE_FONT, HEADLINE_LINE_HEIGHT);

  // 4. DOM sync: ~0.3ms — write-only, no reads
  syncPool(bodyLines);
  projectLines(headlineLines, headlinePool);

  // Total: ~0.9ms per frame — 15x under budget
  requestAnimationFrame(renderFrame);
}`}
      />

      <h2>Performance Results</h2>

      <p>
        We benchmarked on a mid-range laptop (M1 MacBook Air, Chrome 120)
        with the landing page fully loaded — headline, body text, pullquote,
        and three draggable orbs active simultaneously.
      </p>

      <ul>
        <li>
          <strong>Frame time:</strong> 0.8-1.2ms total JavaScript (layout +
          physics + DOM sync), leaving 15ms of headroom in every 16.6ms
          frame.
        </li>
        <li>
          <strong>DOM reads per frame:</strong> 0. Verified via Performance
          panel — no forced reflow markers, no layout thrashing warnings.
        </li>
        <li>
          <strong>GC pauses:</strong> negligible. The span pool eliminates
          allocation churn. No new objects are created per frame beyond a
          small <code>PositionedLine[]</code> array that is quickly
          collected.
        </li>
        <li>
          <strong>Mobile (iPhone 13):</strong> holds 60fps with two orbs.
          The narrow breakpoint reduces column count and line volume,
          keeping layout cost proportional.
        </li>
      </ul>

      <p>
        Compared to a naive CSS-based approach (which we prototyped early
        on), this architecture is roughly 10-15x faster per frame. The CSS
        version consistently dropped to 15-20fps during drag interactions
        due to synchronous reflow costs.
      </p>

      <h2>Lessons Learned</h2>

      <p>
        Building this engine reinforced a principle we keep coming back to:
        the fastest DOM operation is the one you do not perform. Every read
        you can replace with pre-computed data, every element you can reuse
        instead of recreate, every layout pass you can avoid — it all
        compounds.
      </p>

      <p>
        The key architectural decisions were: using pretext for off-DOM
        measurement so we never depend on rendered spans for sizing; defining
        obstacles as pure geometric data so layout is a pure function;
        pooling DOM nodes so the hot loop is allocation-free; and separating
        physics from rendering so each concern can be optimized
        independently.
      </p>

      <p>
        Constants like <code>GUTTER</code>, <code>COL_GAP</code>,{" "}
        <code>BODY_FONT</code>, and <code>BODY_LINE_HEIGHT</code> are defined
        once at module scope and fed into the layout functions. This makes
        the engine easy to tune — change a constant, and the next frame
        picks it up. No style recalculation, no cascade resolution, just a
        new number in a pure function.
      </p>

      <p>
        If you are building anything that requires per-frame text layout —
        interactive infographics, data-driven annotations, creative
        typography — we encourage you to explore this approach. The DOM is a
        great rendering target but a terrible measurement tool. Separate the
        two, and 60fps text reflow becomes not just possible, but easy.
      </p>
    </BlogLayout>
  );
}
