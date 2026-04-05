import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

/** Deterministic pseudo-random from seed */
function seeded(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export default function Icon512() {
  // Generate orbiting nodes
  const orbitNodes: { x: number; y: number; r: number; color: string }[] = [];
  const colors = ['#38bdf8', '#34d399', '#f472b6', '#fbbf24', '#818cf8', '#a78bfa', '#fb923c', '#67e8f9'];
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2 + seeded(i * 7) * 0.5;
    const dist = 100 + seeded(i * 13) * 80;
    orbitNodes.push({
      x: 256 + Math.cos(angle) * dist,
      y: 256 + Math.sin(angle) * dist,
      r: 10 + seeded(i * 11) * 14,
      color: colors[i],
    });
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: 512,
          height: 512,
          background: 'linear-gradient(135deg, #0a0a14, #0f1029, #0a0a14)',
          borderRadius: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Grid */}
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
            backgroundSize: '32px 32px',
          }}
        />
        {/* Central glow */}
        <div
          style={{
            position: 'absolute',
            width: 300,
            height: 300,
            background: 'radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 70%)',
            display: 'flex',
          }}
        />
        {/* Edge lines to orbiting nodes */}
        <svg width="512" height="512" style={{ position: 'absolute', top: 0, left: 0 } as React.CSSProperties}>
          {orbitNodes.map((n, i) => (
            <line
              key={i}
              x1="256"
              y1="256"
              x2={n.x}
              y2={n.y}
              stroke="rgba(129,140,248,0.15)"
              strokeWidth="1.5"
            />
          ))}
        </svg>
        {/* Central node */}
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 30% 30%, #a78bfa, #6366f1)',
            boxShadow: '0 0 40px rgba(129,140,248,0.5), 0 0 80px rgba(99,102,241,0.2)',
            display: 'flex',
            position: 'absolute',
          }}
        />
        {/* Orbiting nodes */}
        {orbitNodes.map((n, i) => (
          <div
            key={i}
            style={{
              width: n.r * 2,
              height: n.r * 2,
              borderRadius: '50%',
              background: n.color,
              position: 'absolute',
              left: n.x - n.r,
              top: n.y - n.r,
              boxShadow: `0 0 ${n.r}px ${n.color}`,
              opacity: 0.85,
              display: 'flex',
            }}
          />
        ))}
      </div>
    ),
    { ...size },
  );
}
