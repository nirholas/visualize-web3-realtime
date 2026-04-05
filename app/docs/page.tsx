import Link from 'next/link';
import { DocsShell } from './components/DocsShell';

export default function DocsHome() {
  return (
    <DocsShell>
      <div style={{ padding: '20px 0' }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: 600,
          color: '#e2e2f0',
          marginBottom: '12px',
          letterSpacing: '-0.03em',
        }}>
          <span style={{ color: '#a78bfa' }}>swarming</span> documentation
        </h1>
        <p style={{
          fontSize: '16px',
          color: '#8888aa',
          lineHeight: 1.6,
          maxWidth: 560,
          marginBottom: '40px',
        }}>
          Build real-time, interactive 3D visualizations of streaming data —
          blockchain transactions, AI agents, infrastructure monitoring, and beyond.
        </p>

        <div className="docs-grid" style={{ marginBottom: '40px' }}>
          <Link href="/docs/getting-started/installation" className="docs-card docs-card-highlight">
            <div style={{ fontSize: '20px', marginBottom: '8px' }}>01</div>
            <h3>Installation</h3>
            <p>Install the SDK and set up your project in under a minute.</p>
          </Link>
          <Link href="/docs/getting-started/quick-start" className="docs-card docs-card-highlight">
            <div style={{ fontSize: '20px', marginBottom: '8px' }}>02</div>
            <h3>Quick Start</h3>
            <p>Get a live 3D visualization running in 30 seconds.</p>
          </Link>
          <Link href="/docs/getting-started/first-visualization" className="docs-card docs-card-highlight">
            <div style={{ fontSize: '20px', marginBottom: '8px' }}>03</div>
            <h3>Your First Visualization</h3>
            <p>Build a complete real-time graph from scratch.</p>
          </Link>
        </div>

        <h2 style={{
          fontSize: '18px',
          fontWeight: 600,
          color: '#d8d8e8',
          marginBottom: '16px',
          marginTop: '48px',
        }}>
          Explore
        </h2>

        <div className="docs-grid">
          <Link href="/docs/guide/data-sources" className="docs-card">
            <h3>Data Sources</h3>
            <p>WebSocket streams, static data, custom providers</p>
          </Link>
          <Link href="/docs/guide/customization" className="docs-card">
            <h3>Customization</h3>
            <p>Themes, nodes, edges, physics, camera</p>
          </Link>
          <Link href="/docs/api/swarming-component" className="docs-card">
            <h3>API Reference</h3>
            <p>Complete props, hooks, and type documentation</p>
          </Link>
          <Link href="/docs/guide/performance" className="docs-card">
            <h3>Performance</h3>
            <p>Handle 10K+ nodes at 60fps</p>
          </Link>
          <Link href="/docs/examples/live-demos" className="docs-card">
            <h3>Examples</h3>
            <p>Live demos, CodeSandbox templates, use cases</p>
          </Link>
          <Link href="/docs/community/contributing" className="docs-card">
            <h3>Community</h3>
            <p>Contributing, changelog, roadmap, showcase</p>
          </Link>
        </div>
      </div>
    </DocsShell>
  );
}
