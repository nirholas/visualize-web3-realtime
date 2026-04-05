import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'swarming — GPU-accelerated real-time network visualization';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** Deterministic pseudo-random from seed */
function seeded(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

/** Generate node positions for the visualization */
function generateNodes(count: number) {
  const nodes: { x: number; y: number; r: number; color: string; opacity: number }[] = [];
  const colors = ['#818cf8', '#6366f1', '#a78bfa', '#c084fc', '#38bdf8', '#34d399', '#f472b6'];

  for (let i = 0; i < count; i++) {
    const angle = seeded(i * 7 + 1) * Math.PI * 2;
    const dist = 80 + seeded(i * 13 + 3) * 200;
    nodes.push({
      x: 600 + Math.cos(angle) * dist * 1.4,
      y: 315 + Math.sin(angle) * dist * 0.7,
      r: 2 + seeded(i * 11 + 5) * 6,
      color: colors[i % colors.length],
      opacity: 0.4 + seeded(i * 17 + 9) * 0.6,
    });
  }
  return nodes;
}

/** Generate edges connecting nearby nodes */
function generateEdges(nodes: ReturnType<typeof generateNodes>) {
  const edges: { x1: number; y1: number; x2: number; y2: number; opacity: number }[] = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[i].x - nodes[j].x;
      const dy = nodes[i].y - nodes[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 120 && edges.length < 80) {
        edges.push({
          x1: nodes[i].x, y1: nodes[i].y,
          x2: nodes[j].x, y2: nodes[j].y,
          opacity: Math.max(0.08, 0.3 - dist / 400),
        });
      }
    }
  }
  return edges;
}

export default function OGImage() {
  const nodes = generateNodes(60);
  const edges = generateEdges(nodes);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #0a0a14 0%, #0f1029 50%, #0a0a14 100%)',
          color: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'monospace',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Grid overlay */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            backgroundImage:
              'linear-gradient(rgba(99,102,241,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.04) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        {/* Radial glow behind nodes */}
        <div
          style={{
            position: 'absolute',
            top: '20%',
            left: '25%',
            width: '50%',
            height: '60%',
            background: 'radial-gradient(ellipse, rgba(99,102,241,0.15) 0%, transparent 70%)',
            display: 'flex',
          }}
        />

        {/* Edge lines as thin divs */}
        {edges.map((e, i) => {
          const dx = e.x2 - e.x1;
          const dy = e.y2 - e.y1;
          const len = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx) * (180 / Math.PI);
          return (
            <div
              key={`e${i}`}
              style={{
                position: 'absolute',
                left: e.x1,
                top: e.y1,
                width: len,
                height: 1,
                background: `rgba(129,140,248,${e.opacity})`,
                transform: `rotate(${angle}deg)`,
                transformOrigin: '0 0',
                display: 'flex',
              }}
            />
          );
        })}

        {/* Node dots */}
        {nodes.map((n, i) => (
          <div
            key={`n${i}`}
            style={{
              position: 'absolute',
              left: n.x - n.r,
              top: n.y - n.r,
              width: n.r * 2,
              height: n.r * 2,
              borderRadius: '50%',
              background: n.color,
              opacity: n.opacity,
              boxShadow: `0 0 ${n.r * 3}px ${n.color}`,
              display: 'flex',
            }}
          />
        ))}

        {/* Title and tagline */}
        <div
          style={{
            position: 'absolute',
            bottom: 60,
            left: 60,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div
            style={{
              fontSize: 52,
              fontWeight: 600,
              letterSpacing: '-0.02em',
              display: 'flex',
            }}
          >
            swarming
          </div>
          <div
            style={{
              color: 'rgba(255, 255, 255, 0.5)',
              fontSize: 20,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              display: 'flex',
            }}
          >
            See your data swarm
          </div>
        </div>

        {/* Stats badge */}
        <div
          style={{
            position: 'absolute',
            top: 40,
            right: 60,
            display: 'flex',
            gap: 24,
            fontSize: 14,
            color: 'rgba(255,255,255,0.4)',
            letterSpacing: '0.05em',
          }}
        >
          <div style={{ display: 'flex' }}>5,000 NODES</div>
          <div style={{ display: 'flex' }}>60 FPS</div>
          <div style={{ display: 'flex' }}>REAL-TIME</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
