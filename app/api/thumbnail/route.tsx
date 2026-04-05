import { ImageResponse } from 'next/og';
import { type NextRequest } from 'next/server';

export const runtime = 'edge';

const DEMOS: Record<string, { title: string; subtitle: string; color: string; nodeCount: number }> = {
  github: { title: 'GitHub Activity', subtitle: 'Commits · PRs · Issues', color: '#818cf8', nodeCount: 40 },
  kubernetes: { title: 'Kubernetes', subtitle: 'Pods · Services · Nodes', color: '#38bdf8', nodeCount: 35 },
  social: { title: 'Social Network', subtitle: 'Users · Posts · Follows', color: '#f472b6', nodeCount: 45 },
  'api-traffic': { title: 'API Traffic', subtitle: 'Requests · Latency · Errors', color: '#fbbf24', nodeCount: 50 },
  'ai-agents': { title: 'AI Agents', subtitle: 'Tasks · Messages · Tools', color: '#a78bfa', nodeCount: 30 },
  iot: { title: 'IoT Sensors', subtitle: 'Devices · Readings · Alerts', color: '#34d399', nodeCount: 38 },
};

function seeded(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export async function GET(req: NextRequest) {
  const demo = req.nextUrl.searchParams.get('demo') ?? 'github';
  const config = DEMOS[demo] ?? DEMOS.github;

  const nodes: { x: number; y: number; r: number; opacity: number }[] = [];
  for (let i = 0; i < config.nodeCount; i++) {
    const angle = seeded(i * 7 + 1) * Math.PI * 2;
    const dist = 40 + seeded(i * 13 + 3) * 100;
    nodes.push({
      x: 200 + Math.cos(angle) * dist,
      y: 140 + Math.sin(angle) * dist * 0.65,
      r: 2 + seeded(i * 11 + 5) * 4,
      opacity: 0.3 + seeded(i * 17 + 9) * 0.7,
    });
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: 400,
          height: 300,
          background: 'linear-gradient(135deg, #0a0a14, #0f1029)',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'monospace',
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
              'linear-gradient(rgba(99,102,241,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.03) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />
        {/* Radial glow */}
        <div
          style={{
            position: 'absolute',
            top: '10%',
            left: '20%',
            width: '60%',
            height: '60%',
            background: `radial-gradient(ellipse, ${config.color}22 0%, transparent 70%)`,
            display: 'flex',
          }}
        />
        {/* Nodes */}
        {nodes.map((n, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: n.x - n.r,
              top: n.y - n.r,
              width: n.r * 2,
              height: n.r * 2,
              borderRadius: '50%',
              background: config.color,
              opacity: n.opacity,
              boxShadow: `0 0 ${n.r * 2}px ${config.color}`,
              display: 'flex',
            }}
          />
        ))}
        {/* Title overlay */}
        <div
          style={{
            position: 'absolute',
            bottom: 20,
            left: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 600, color: '#fff', display: 'flex' }}>
            {config.title}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'flex' }}>
            {config.subtitle}
          </div>
        </div>
      </div>
    ),
    { width: 400, height: 300 },
  );
}
