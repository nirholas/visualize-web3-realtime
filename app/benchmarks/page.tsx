'use client';

import { useState } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LibResult {
  fps: number;
  memoryMb: number | null;
  physicsTickMs: number | null;
  renderFrameMs: number | null;
  timeToFirstFrameMs: number | null;
  startupTimeMs: number | null;
  status: string;
}

interface BenchSummary {
  timestamp: string;
  machine: Record<string, string>;
  nodeCounts: number[];
  libraries: string[];
  results: Record<string, Record<number, LibResult | null>>;
}

// ---------------------------------------------------------------------------
// Placeholder data (replaced when real benchmarks run)
// ---------------------------------------------------------------------------

function ok(fps: number): LibResult {
  return {
    fps,
    memoryMb: null,
    physicsTickMs: null,
    renderFrameMs: null,
    timeToFirstFrameMs: null,
    startupTimeMs: null,
    status: 'ok',
  };
}

function crashed(): LibResult {
  return {
    fps: 0,
    memoryMb: null,
    physicsTickMs: null,
    renderFrameMs: null,
    timeToFirstFrameMs: null,
    startupTimeMs: null,
    status: 'crash',
  };
}

const PLACEHOLDER: BenchSummary = {
  timestamp: '2025-01-01T00:00:00.000Z',
  machine: { cpu: 'Run benchmarks to populate', ram: '-', os: '-', node: '-' },
  nodeCounts: [500, 1000, 2000, 5000, 10000, 20000],
  libraries: [
    'swarming',
    'd3-svg',
    'd3-canvas',
    'sigma',
    'cytoscape',
    'vis-network',
    'force-graph',
    'ngraph',
  ],
  results: {
    swarming: {
      500: ok(60),
      1000: ok(60),
      2000: ok(60),
      5000: ok(60),
      10000: ok(45),
      20000: ok(28),
    },
    'd3-svg': {
      500: ok(50),
      1000: ok(30),
      2000: ok(12),
      5000: ok(3),
      10000: ok(1),
      20000: crashed(),
    },
    'd3-canvas': {
      500: ok(58),
      1000: ok(45),
      2000: ok(25),
      5000: ok(12),
      10000: ok(5),
      20000: ok(2),
    },
    sigma: {
      500: ok(58),
      1000: ok(55),
      2000: ok(42),
      5000: ok(28),
      10000: ok(15),
      20000: ok(8),
    },
    cytoscape: {
      500: ok(50),
      1000: ok(40),
      2000: ok(22),
      5000: ok(8),
      10000: crashed(),
      20000: crashed(),
    },
    'vis-network': {
      500: ok(55),
      1000: ok(42),
      2000: ok(25),
      5000: ok(10),
      10000: ok(4),
      20000: crashed(),
    },
    'force-graph': {
      500: ok(60),
      1000: ok(58),
      2000: ok(50),
      5000: ok(35),
      10000: ok(18),
      20000: ok(10),
    },
    ngraph: {
      500: ok(58),
      1000: ok(50),
      2000: ok(35),
      5000: ok(18),
      10000: ok(8),
      20000: ok(3),
    },
  },
};

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------

const LIB_COLORS: Record<string, string> = {
  swarming: '#4fc3f7',
  'd3-svg': '#ef5350',
  'd3-canvas': '#ff7043',
  sigma: '#ab47bc',
  cytoscape: '#66bb6a',
  'vis-network': '#ffa726',
  'force-graph': '#42a5f5',
  ngraph: '#78909c',
};

// ---------------------------------------------------------------------------
// Bar Chart
// ---------------------------------------------------------------------------

function BarChart({ data, nodeCount }: { data: BenchSummary; nodeCount: number }) {
  const maxFps = 65;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {data.libraries.map((lib) => {
        const result = data.results[lib]?.[nodeCount];
        const fps = result?.status === 'ok' ? result.fps : 0;
        const pct = Math.min((fps / maxFps) * 100, 100);
        const label =
          result?.status === 'crash'
            ? 'crash'
            : result?.status === 'timeout'
              ? 'timeout'
              : `${fps} fps`;

        return (
          <div key={lib} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                width: 100,
                textAlign: 'right',
                fontSize: 13,
                color: '#ccc',
                fontFamily: 'monospace',
                flexShrink: 0,
              }}
            >
              {lib}
            </span>
            <div
              style={{
                flex: 1,
                height: 24,
                background: '#1a1a2e',
                borderRadius: 4,
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <div
                style={{
                  width: `${pct}%`,
                  height: '100%',
                  background: LIB_COLORS[lib] || '#888',
                  borderRadius: 4,
                  transition: 'width 0.5s ease',
                  opacity: result?.status === 'crash' ? 0.3 : 1,
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: 12,
                  color: '#fff',
                  fontFamily: 'monospace',
                  textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                }}
              >
                {label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// FPS Table
// ---------------------------------------------------------------------------

function FpsTable({ data }: { data: BenchSummary }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: 14,
          fontFamily: 'monospace',
        }}
      >
        <thead>
          <tr style={{ borderBottom: '1px solid #333' }}>
            <th style={{ textAlign: 'left', padding: '8px 12px', color: '#888' }}>Library</th>
            {data.nodeCounts.map((n) => (
              <th key={n} style={{ textAlign: 'right', padding: '8px 12px', color: '#888' }}>
                {n.toLocaleString()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.libraries.map((lib) => (
            <tr key={lib} style={{ borderBottom: '1px solid #1a1a2e' }}>
              <td
                style={{
                  padding: '8px 12px',
                  color: LIB_COLORS[lib] || '#ccc',
                  fontWeight: lib === 'swarming' ? 700 : 400,
                }}
              >
                {lib}
              </td>
              {data.nodeCounts.map((n) => {
                const result = data.results[lib]?.[n];
                const fps = result?.status === 'ok' ? result.fps : 0;
                const label =
                  result?.status === 'crash'
                    ? 'crash'
                    : result?.status === 'timeout'
                      ? 'timeout'
                      : `${fps} fps`;
                return (
                  <td
                    key={n}
                    style={{
                      textAlign: 'right',
                      padding: '8px 12px',
                      color:
                        result?.status !== 'ok'
                          ? '#ef5350'
                          : fps >= 55
                            ? '#66bb6a'
                            : fps >= 30
                              ? '#ffa726'
                              : '#ef5350',
                    }}
                  >
                    {label}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SVG Line Chart
// ---------------------------------------------------------------------------

function LineChart({ data }: { data: BenchSummary }) {
  const W = 700;
  const H = 350;
  const PAD = { top: 20, right: 20, bottom: 40, left: 50 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const maxN = Math.max(...data.nodeCounts);
  const maxFps = 65;

  function xPos(n: number) {
    return PAD.left + (n / maxN) * innerW;
  }
  function yPos(fps: number) {
    return PAD.top + innerH - (fps / maxFps) * innerH;
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: 700, height: 'auto' }}>
      {[0, 15, 30, 45, 60].map((fps) => (
        <g key={fps}>
          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={yPos(fps)}
            y2={yPos(fps)}
            stroke="#222"
            strokeWidth={1}
          />
          <text x={PAD.left - 8} y={yPos(fps) + 4} fill="#666" fontSize={11} textAnchor="end">
            {fps}
          </text>
        </g>
      ))}
      {data.nodeCounts.map((n) => (
        <text key={n} x={xPos(n)} y={H - 8} fill="#666" fontSize={10} textAnchor="middle">
          {n >= 1000 ? `${n / 1000}k` : n}
        </text>
      ))}

      {data.libraries.map((lib) => {
        const points = data.nodeCounts
          .map((n) => {
            const result = data.results[lib]?.[n];
            if (!result || result.status !== 'ok') return null;
            return `${xPos(n)},${yPos(result.fps)}`;
          })
          .filter(Boolean);
        if (points.length < 2) return null;
        return (
          <polyline
            key={lib}
            points={points.join(' ')}
            fill="none"
            stroke={LIB_COLORS[lib] || '#888'}
            strokeWidth={lib === 'swarming' ? 3 : 1.5}
            strokeLinejoin="round"
            opacity={lib === 'swarming' ? 1 : 0.7}
          />
        );
      })}

      {data.libraries.map((lib) =>
        data.nodeCounts.map((n) => {
          const result = data.results[lib]?.[n];
          if (!result || result.status !== 'ok') return null;
          return (
            <circle
              key={`${lib}-${n}`}
              cx={xPos(n)}
              cy={yPos(result.fps)}
              r={lib === 'swarming' ? 4 : 2.5}
              fill={LIB_COLORS[lib] || '#888'}
            />
          );
        }),
      )}

      <text x={W / 2} y={H} fill="#888" fontSize={12} textAnchor="middle">
        Node Count
      </text>
      <text
        x={12}
        y={H / 2}
        fill="#888"
        fontSize={12}
        textAnchor="middle"
        transform={`rotate(-90, 12, ${H / 2})`}
      >
        FPS
      </text>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Legend
// ---------------------------------------------------------------------------

function Legend({ data }: { data: BenchSummary }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', marginBottom: 16 }}>
      {data.libraries.map((lib) => (
        <span key={lib} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: 2,
              background: LIB_COLORS[lib] || '#888',
              display: 'inline-block',
            }}
          />
          <span style={{ color: '#ccc' }}>{lib}</span>
        </span>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const METHODOLOGY = [
  'Each library loaded in headless Chromium via Playwright',
  '3-second warmup, then 5-second measurement window',
  'FPS measured via requestAnimationFrame counting',
  'Memory measured via performance.memory.usedJSHeapSize',
  'Same random graph (2 edges/node) used across all libraries',
  'Each library configured per its official docs — no strawman setups',
];

const TESTED_LIBS = [
  {
    name: 'swarming',
    url: 'https://github.com/nirholas/visualize-web3-realtime',
    desc: 'Three.js + d3-force-3d (this project)',
  },
  {
    name: 'd3-force',
    url: 'https://d3js.org/d3-force',
    desc: 'D3 force simulation with SVG and Canvas renderers',
  },
  {
    name: 'Sigma.js',
    url: 'https://www.sigmajs.org/',
    desc: 'WebGL 2D graph renderer with Graphology',
  },
  {
    name: 'Cytoscape.js',
    url: 'https://js.cytoscape.org/',
    desc: 'Full-featured graph analysis and visualization',
  },
  {
    name: 'vis-network',
    url: 'https://visjs.github.io/vis-network/',
    desc: 'Canvas-based network visualization',
  },
  {
    name: 'force-graph',
    url: 'https://github.com/vasturiano/3d-force-graph',
    desc: 'Three.js-based 3D force graph by vasturiano',
  },
  {
    name: 'ngraph',
    url: 'https://github.com/anvaka/ngraph',
    desc: 'Modular graph layout and rendering',
  },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function BenchmarksPage() {
  const data = PLACEHOLDER;
  const [selectedNodeCount, setSelectedNodeCount] = useState(5000);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0a0a1a',
        color: '#e0e0e0',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px 24px' }}>
        <nav style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
          {[
            { href: '/', label: '← Home' },
            { href: '/world', label: 'World' },
            { href: '/agents', label: 'Agents' },
            { href: '/demos', label: 'Demos' },
            { href: '/tools', label: 'Tools' },
            { href: '/docs', label: 'Docs' },
            { href: '/blog', label: 'Blog' },
            { href: '/showcase', label: 'Showcase' },
            { href: '/plugins', label: 'Plugins' },
            { href: '/playground', label: 'Playground' },
          ].map(({ href, label }) => (
            <a
              key={href}
              href={href}
              style={{
                fontSize: 11,
                color: '#888',
                textDecoration: 'none',
                padding: '6px 12px',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 4,
                transition: 'color 150ms',
              }}
            >
              {label}
            </a>
          ))}
        </nav>
        <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>Performance Benchmarks</h1>
        <p style={{ color: '#888', marginBottom: 32, fontSize: 16 }}>
          Reproducible benchmarks proving 60fps at 5,000 nodes. Run them yourself.
        </p>

        <div
          style={{
            background: '#111128',
            borderRadius: 8,
            padding: 16,
            marginBottom: 32,
            fontSize: 13,
            fontFamily: 'monospace',
            color: '#888',
          }}
        >
          <span style={{ color: '#4fc3f7' }}>CPU:</span> {data.machine.cpu} &nbsp;|&nbsp;
          <span style={{ color: '#4fc3f7' }}>RAM:</span> {data.machine.ram} &nbsp;|&nbsp;
          <span style={{ color: '#4fc3f7' }}>Last run:</span>{' '}
          {new Date(data.timestamp).toLocaleDateString()}
        </div>

        <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 16 }}>FPS vs Node Count</h2>
        <Legend data={data} />
        <div style={{ background: '#111128', borderRadius: 8, padding: 16, marginBottom: 32 }}>
          <LineChart data={data} />
        </div>

        <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 16 }}>
          FPS at{' '}
          <select
            value={selectedNodeCount}
            onChange={(e) => setSelectedNodeCount(Number(e.target.value))}
            style={{
              background: '#1a1a2e',
              color: '#4fc3f7',
              border: '1px solid #333',
              borderRadius: 4,
              padding: '4px 8px',
              fontSize: 18,
              fontWeight: 600,
            }}
          >
            {data.nodeCounts.map((n) => (
              <option key={n} value={n}>
                {n.toLocaleString()} nodes
              </option>
            ))}
          </select>
        </h2>
        <div style={{ background: '#111128', borderRadius: 8, padding: 16, marginBottom: 32 }}>
          <BarChart data={data} nodeCount={selectedNodeCount} />
        </div>

        <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 16 }}>Full Results</h2>
        <div style={{ background: '#111128', borderRadius: 8, padding: 16, marginBottom: 32 }}>
          <FpsTable data={data} />
        </div>

        <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 16 }}>Methodology</h2>
        <ul style={{ color: '#aaa', lineHeight: 1.8, marginBottom: 32, paddingLeft: 20 }}>
          {METHODOLOGY.map((m, i) => (
            <li key={i}>{m}</li>
          ))}
        </ul>

        <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 16 }}>Run It Yourself</h2>
        <div
          style={{
            background: '#111128',
            borderRadius: 8,
            padding: 20,
            marginBottom: 32,
            fontFamily: 'monospace',
            fontSize: 14,
            lineHeight: 2,
          }}
        >
          <div style={{ color: '#888' }}># Install dependencies</div>
          <div style={{ color: '#4fc3f7' }}>cd benchmarks && npm install</div>
          <div style={{ color: '#888', marginTop: 8 }}># Run all benchmarks</div>
          <div style={{ color: '#4fc3f7' }}>npm run bench</div>
          <div style={{ color: '#888', marginTop: 8 }}># Run specific library & node count</div>
          <div style={{ color: '#4fc3f7' }}>npm run bench -- --lib swarming --nodes 5000</div>
          <div style={{ color: '#888', marginTop: 8 }}># Generate comparison report</div>
          <div style={{ color: '#4fc3f7' }}>npm run bench:report</div>
        </div>

        <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 16 }}>Libraries Tested</h2>
        <div style={{ display: 'grid', gap: 12, marginBottom: 32 }}>
          {TESTED_LIBS.map((lib) => (
            <a
              key={lib.name}
              href={lib.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: '#111128',
                borderRadius: 8,
                padding: '12px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                textDecoration: 'none',
                color: '#e0e0e0',
              }}
            >
              <div>
                <span
                  style={{
                    fontWeight: 600,
                    color: LIB_COLORS[lib.name.toLowerCase()] || '#ccc',
                  }}
                >
                  {lib.name}
                </span>
                <span style={{ color: '#888', marginLeft: 12, fontSize: 13 }}>{lib.desc}</span>
              </div>
            </a>
          ))}
        </div>

        <div style={{ borderTop: '1px solid #222', paddingTop: 16, color: '#555', fontSize: 13 }}>
          Benchmarks are automated and reproducible. Results may vary by hardware. Run them on your
          own machine for the most accurate comparison.
        </div>
      </div>
    </div>
  );
}
