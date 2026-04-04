'use client';

import Link from 'next/link';

const tools = [
  {
    name: 'Cosmograph',
    href: '/tools/cosmograph',
    description: 'GPU-accelerated WebGL graph with millions of nodes via Apache Arrow & DuckDB.',
    category: 'Graph & Network',
    status: 'ready' as const,
  },
  {
    name: 'Reagraph',
    href: '/tools/reagraph',
    description: 'React-native WebGL network graph using Three.js and D3 force layout.',
    category: 'Graph & Network',
    status: 'ready' as const,
  },
  {
    name: 'Graphistry',
    href: '/tools/graphistry',
    description: 'GPU-powered visual graph intelligence platform for big data analysis.',
    category: 'Graph & Network',
    status: 'integration' as const,
  },
  {
    name: 'Blockchain Visualizer',
    href: '/tools/blockchain-viz',
    description: 'P2P network simulation with data packets flowing between abstract nodes.',
    category: 'Blockchain & Agents',
    status: 'ready' as const,
  },
  {
    name: 'AI Office',
    href: '/tools/ai-office',
    description: 'Procedural 3D world of autonomous AI agents — no imported assets, just math.',
    category: 'Blockchain & Agents',
    status: 'ready' as const,
  },
  {
    name: 'Creative Coding',
    href: '/tools/creative-coding',
    description: 'WebGL shader playground inspired by Cables.gl and Nodes.io.',
    category: 'Creative & WebGL',
    status: 'ready' as const,
  },
  {
    name: 'NVEIL',
    href: '/tools/nveil',
    description: 'Volumetric 3D data rendering and spatial dashboard integration.',
    category: 'Creative & WebGL',
    status: 'integration' as const,
  },
];

const statusColors = {
  ready: { bg: '#10b981', label: 'Ready' },
  integration: { bg: '#f59e0b', label: 'Integration' },
};

export default function ToolsHub() {
  return (
    <div
      style={{
        width: '100vw',
        minHeight: '100vh',
        background: '#0a0a12',
        color: '#e5e5e5',
        fontFamily: "'IBM Plex Mono', monospace",
        overflow: 'auto',
      }}
    >
      {/* Header */}
      <header
        style={{
          padding: '32px 40px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 500, letterSpacing: '0.05em', margin: 0 }}>
            Visualization Tools
          </h1>
          <p style={{ fontSize: 11, color: '#888', marginTop: 4, letterSpacing: '0.08em' }}>
            Standalone experiments — isolated from the main dashboard
          </p>
        </div>
        <Link
          href="/world"
          style={{
            fontSize: 11,
            color: '#888',
            textDecoration: 'none',
            padding: '6px 12px',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 4,
            transition: 'all 150ms',
          }}
        >
          ← Back to World
        </Link>
      </header>

      {/* Grid */}
      <main style={{ padding: '32px 40px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        {tools.map((tool) => {
          const status = statusColors[tool.status];
          return (
            <Link
              key={tool.href}
              href={tool.href}
              style={{
                display: 'block',
                textDecoration: 'none',
                color: 'inherit',
                padding: '20px 24px',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 8,
                transition: 'all 200ms',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <h2 style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>{tool.name}</h2>
                <span
                  style={{
                    fontSize: 9,
                    padding: '2px 8px',
                    borderRadius: 10,
                    background: `${status.bg}22`,
                    color: status.bg,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                  }}
                >
                  {status.label}
                </span>
              </div>
              <p style={{ fontSize: 11, color: '#999', lineHeight: 1.5, margin: 0 }}>
                {tool.description}
              </p>
              <div style={{ fontSize: 10, color: '#666', marginTop: 12, letterSpacing: '0.05em' }}>
                {tool.category}
              </div>
            </Link>
          );
        })}
      </main>
    </div>
  );
}
