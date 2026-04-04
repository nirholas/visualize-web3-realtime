'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import ToolPageShell from '@/features/Tools/ToolPageShell';

// ---------------------------------------------------------------------------
// Graphistry is a GPU-powered platform. This page provides:
// 1. A local graph renderer as a preview / fallback
// 2. An iframe embed mode when a Graphistry URL is provided
// 3. API configuration panel for connecting to a Graphistry instance
// ---------------------------------------------------------------------------

// Demo data — financial transaction graph
function generateTransactionGraph(nodeCount: number) {
  const nodes: Array<{ id: string; x: number; y: number; type: string; label: string }> = [];
  const edges: Array<{ source: string; target: string; amount: number }> = [];

  const types = ['wallet', 'exchange', 'contract', 'bridge'];
  const typeColors: Record<string, string> = {
    wallet: '#627eea',
    exchange: '#f59e0b',
    contract: '#c084fc',
    bridge: '#22d3ee',
  };

  for (let i = 0; i < nodeCount; i++) {
    const type = types[i % types.length];
    nodes.push({
      id: `n${i}`,
      x: (Math.random() - 0.5) * 800,
      y: (Math.random() - 0.5) * 600,
      type,
      label: `${type}-${i.toString(16).padStart(3, '0')}`,
    });
  }

  for (let i = 0; i < nodeCount * 1.5; i++) {
    const a = Math.floor(Math.random() * nodeCount);
    let b = Math.floor(Math.random() * nodeCount);
    if (b === a) b = (a + 1) % nodeCount;
    edges.push({
      source: `n${a}`,
      target: `n${b}`,
      amount: Math.random() * 100,
    });
  }

  return { nodes, edges, typeColors };
}

// Canvas renderer for local preview
function useLocalRenderer(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  nodeCount: number,
) {
  const graphRef = useRef(generateTransactionGraph(nodeCount));
  const frameRef = useRef(0);
  const scaleRef = useRef(0.8);
  const offsetRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    graphRef.current = generateTransactionGraph(nodeCount);
  }, [nodeCount]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const typeColors: Record<string, string> = {
      wallet: '#627eea',
      exchange: '#f59e0b',
      contract: '#c084fc',
      bridge: '#22d3ee',
    };

    const draw = () => {
      const { nodes, edges } = graphRef.current;
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      const ox = offsetRef.current.x + w / 2;
      const oy = offsetRef.current.y + h / 2;
      const s = scaleRef.current;

      ctx.clearRect(0, 0, w, h);

      // Edges with gradient opacity based on amount
      for (const e of edges) {
        const a = nodes.find((n) => n.id === e.source);
        const b = nodes.find((n) => n.id === e.target);
        if (!a || !b) continue;
        ctx.globalAlpha = 0.03 + (e.amount / 100) * 0.06;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 0.5 + (e.amount / 100) * 1;
        ctx.beginPath();
        ctx.moveTo(a.x * s + ox, a.y * s + oy);
        ctx.lineTo(b.x * s + ox, b.y * s + oy);
        ctx.stroke();
      }

      // Nodes
      ctx.globalAlpha = 0.9;
      for (const n of nodes) {
        const size = n.type === 'exchange' ? 4 : n.type === 'contract' ? 3 : 2;
        ctx.fillStyle = typeColors[n.type] || '#888';
        ctx.beginPath();
        ctx.arc(n.x * s + ox, n.y * s + oy, size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      frameRef.current = requestAnimationFrame(draw);
    };

    frameRef.current = requestAnimationFrame(draw);

    // Wheel zoom
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      scaleRef.current *= e.deltaY > 0 ? 0.95 : 1.05;
      scaleRef.current = Math.max(0.1, Math.min(5, scaleRef.current));
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });

    // Drag pan
    let dragging = false;
    let lastX = 0, lastY = 0;
    const onDown = (e: PointerEvent) => { dragging = true; lastX = e.clientX; lastY = e.clientY; canvas.setPointerCapture(e.pointerId); };
    const onMove = (e: PointerEvent) => { if (!dragging) return; offsetRef.current.x += e.clientX - lastX; offsetRef.current.y += e.clientY - lastY; lastX = e.clientX; lastY = e.clientY; };
    const onUp = () => { dragging = false; };
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);

    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
    };
  }, [canvasRef, nodeCount]);
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function GraphistryDemo() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [nodeCount, setNodeCount] = useState(500);
  const [mode, setMode] = useState<'local' | 'embed'>('local');
  const [embedUrl, setEmbedUrl] = useState('');

  useLocalRenderer(canvasRef, nodeCount);

  return (
    <ToolPageShell
      title="Graphistry"
      description="GPU visual graph intelligence"
      externalUrl="https://www.graphistry.com/"
    >
      {/* Controls */}
      <div
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          zIndex: 10,
          background: 'rgba(10,10,15,0.85)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 6,
          padding: '12px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          fontSize: 11,
          minWidth: 260,
        }}
      >
        {/* Mode toggle */}
        <div style={{ display: 'flex', gap: 6 }}>
          {(['local', 'embed'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                flex: 1,
                padding: '4px 8px',
                background: mode === m ? 'rgba(192,132,252,0.2)' : 'transparent',
                border: `1px solid ${mode === m ? 'rgba(192,132,252,0.4)' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: 4,
                color: mode === m ? '#c084fc' : '#888',
                cursor: 'pointer',
                fontSize: 10,
                letterSpacing: '0.06em',
                textTransform: 'capitalize',
              }}
            >
              {m === 'local' ? 'Local Preview' : 'Graphistry Embed'}
            </button>
          ))}
        </div>

        {mode === 'local' && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#888', width: 50 }}>Nodes</span>
            <input
              type="range" min={50} max={5000} step={50}
              value={nodeCount}
              onChange={(e) => setNodeCount(Number(e.target.value))}
              style={{ width: 100 }}
            />
            <span style={{ color: '#f59e0b', width: 50, textAlign: 'right' }}>{nodeCount}</span>
          </label>
        )}

        {mode === 'embed' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ color: '#888', fontSize: 10 }}>Graphistry Hub URL</label>
            <input
              type="url"
              placeholder="https://hub.graphistry.com/graph/..."
              value={embedUrl}
              onChange={(e) => setEmbedUrl(e.target.value)}
              style={{
                padding: '6px 10px',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 4,
                color: '#e5e5e5',
                fontSize: 11,
                fontFamily: "'IBM Plex Mono', monospace",
                outline: 'none',
              }}
            />
            <div style={{ fontSize: 9, color: '#555' }}>
              Paste a Graphistry visualization URL to embed it here
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div
        style={{
          position: 'absolute',
          bottom: 12,
          left: 12,
          zIndex: 10,
          background: 'rgba(10,10,15,0.85)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 6,
          padding: '10px 14px',
          display: 'flex',
          gap: 12,
          fontSize: 10,
        }}
      >
        {[
          { label: 'Wallet', color: '#627eea' },
          { label: 'Exchange', color: '#f59e0b' },
          { label: 'Contract', color: '#c084fc' },
          { label: 'Bridge', color: '#22d3ee' },
        ].map((item) => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color }} />
            <span style={{ color: '#aaa' }}>{item.label}</span>
          </div>
        ))}
      </div>

      {mode === 'local' && (
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: '100%', display: 'block', background: '#0a0a12' }}
        />
      )}

      {mode === 'embed' && (
        embedUrl ? (
          <iframe
            src={embedUrl}
            style={{ width: '100%', height: '100%', border: 'none' }}
            sandbox="allow-scripts allow-same-origin allow-popups"
            title="Graphistry Embed"
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              color: '#555',
              fontSize: 12,
            }}
          >
            <div style={{ fontSize: 36, opacity: 0.2 }}>&#9678;</div>
            <div>Enter a Graphistry Hub URL to embed a visualization</div>
            <div style={{ fontSize: 10, color: '#444' }}>
              Or use the Local Preview mode for a standalone graph
            </div>
          </div>
        )
      )}
    </ToolPageShell>
  );
}
