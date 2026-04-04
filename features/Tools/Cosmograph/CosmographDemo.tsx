'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import ToolPageShell from '@/features/Tools/ToolPageShell';

// ---------------------------------------------------------------------------
// Mock data generator — creates a large random graph for GPU stress testing
// ---------------------------------------------------------------------------
interface GraphNode {
  id: string;
  x: number;
  y: number;
  size: number;
  color: string;
  label: string;
}

interface GraphEdge {
  source: string;
  target: string;
}

const PROTOCOL_COLORS = ['#c084fc', '#22d3ee', '#f472b6', '#34d399', '#fbbf24', '#fb923c'];

function generateGraph(nodeCount: number, edgeFactor: number): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  for (let i = 0; i < nodeCount; i++) {
    nodes.push({
      id: `n${i}`,
      x: (Math.random() - 0.5) * 2000,
      y: (Math.random() - 0.5) * 2000,
      size: 1 + Math.random() * 4,
      color: PROTOCOL_COLORS[i % PROTOCOL_COLORS.length],
      label: `Node ${i}`,
    });
  }

  for (let i = 0; i < nodeCount * edgeFactor; i++) {
    const a = Math.floor(Math.random() * nodeCount);
    let b = Math.floor(Math.random() * nodeCount);
    if (b === a) b = (a + 1) % nodeCount;
    edges.push({ source: `n${a}`, target: `n${b}` });
  }

  return { nodes, edges };
}

// ---------------------------------------------------------------------------
// Canvas-based GPU-style renderer (standalone, no external Cosmograph dep)
// ---------------------------------------------------------------------------
function useCanvasRenderer(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  nodes: GraphNode[],
  edges: GraphEdge[],
) {
  const frameRef = useRef<number>(0);
  const offsetRef = useRef({ x: 0, y: 0 });
  const scaleRef = useRef(1);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    // Simple force tick — move nodes slightly each frame
    const tick = () => {
      for (const n of nodes) {
        n.x += (Math.random() - 0.5) * 0.3;
        n.y += (Math.random() - 0.5) * 0.3;
      }
    };

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      const ox = offsetRef.current.x + w / 2;
      const oy = offsetRef.current.y + h / 2;
      const s = scaleRef.current;

      ctx.clearRect(0, 0, w, h);

      // Edges
      ctx.globalAlpha = 0.06;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 0.5;
      for (const e of edges) {
        const a = nodeMap.get(e.source);
        const b = nodeMap.get(e.target);
        if (!a || !b) continue;
        ctx.beginPath();
        ctx.moveTo(a.x * s + ox, a.y * s + oy);
        ctx.lineTo(b.x * s + ox, b.y * s + oy);
        ctx.stroke();
      }

      // Nodes
      ctx.globalAlpha = 0.85;
      for (const n of nodes) {
        ctx.fillStyle = n.color;
        ctx.beginPath();
        ctx.arc(n.x * s + ox, n.y * s + oy, n.size * s, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      tick();
      frameRef.current = requestAnimationFrame(draw);
    };

    frameRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [canvasRef, nodes, edges]);

  // Zoom handler
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      scaleRef.current *= e.deltaY > 0 ? 0.95 : 1.05;
      scaleRef.current = Math.max(0.05, Math.min(10, scaleRef.current));
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, [canvasRef]);

  // Pan handler
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let dragging = false;
    let lastX = 0, lastY = 0;
    const onDown = (e: PointerEvent) => { dragging = true; lastX = e.clientX; lastY = e.clientY; canvas.setPointerCapture(e.pointerId); };
    const onMove = (e: PointerEvent) => { if (!dragging) return; offsetRef.current.x += e.clientX - lastX; offsetRef.current.y += e.clientY - lastY; lastX = e.clientX; lastY = e.clientY; };
    const onUp = () => { dragging = false; };
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    return () => { canvas.removeEventListener('pointerdown', onDown); canvas.removeEventListener('pointermove', onMove); canvas.removeEventListener('pointerup', onUp); };
  }, [canvasRef]);
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function CosmographPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [nodeCount, setNodeCount] = useState(5000);
  const [edgeFactor, setEdgeFactor] = useState(2);
  const [graph, setGraph] = useState(() => generateGraph(5000, 2));

  const regenerate = useCallback(() => {
    setGraph(generateGraph(nodeCount, edgeFactor));
  }, [nodeCount, edgeFactor]);

  useCanvasRenderer(canvasRef, graph.nodes, graph.edges);

  return (
    <ToolPageShell
      title="Cosmograph"
      description="GPU-accelerated graph visualization"
      externalUrl="https://cosmograph.app/"
    >
      {/* Controls overlay */}
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
        }}
      >
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#888', width: 60 }}>Nodes</span>
          <input
            type="range"
            min={100}
            max={50000}
            step={100}
            value={nodeCount}
            onChange={(e) => setNodeCount(Number(e.target.value))}
            style={{ width: 120 }}
          />
          <span style={{ color: '#c084fc', width: 50, textAlign: 'right' }}>{nodeCount.toLocaleString()}</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#888', width: 60 }}>Density</span>
          <input
            type="range"
            min={1}
            max={8}
            step={0.5}
            value={edgeFactor}
            onChange={(e) => setEdgeFactor(Number(e.target.value))}
            style={{ width: 120 }}
          />
          <span style={{ color: '#22d3ee', width: 50, textAlign: 'right' }}>{edgeFactor}x</span>
        </label>
        <button
          onClick={regenerate}
          style={{
            marginTop: 4,
            padding: '6px 12px',
            background: 'rgba(192,132,252,0.15)',
            border: '1px solid rgba(192,132,252,0.3)',
            borderRadius: 4,
            color: '#c084fc',
            cursor: 'pointer',
            fontSize: 10,
            letterSpacing: '0.06em',
          }}
        >
          Regenerate Graph
        </button>
        <div style={{ fontSize: 9, color: '#555', marginTop: 2 }}>
          {graph.nodes.length.toLocaleString()} nodes · {graph.edges.length.toLocaleString()} edges
        </div>
      </div>

      {/* Stats overlay */}
      <div
        style={{
          position: 'absolute',
          bottom: 12,
          right: 12,
          zIndex: 10,
          fontSize: 9,
          color: '#555',
          letterSpacing: '0.08em',
        }}
      >
        Canvas 2D · Scroll to zoom · Drag to pan
      </div>

      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block', background: '#0a0a0f' }}
      />
    </ToolPageShell>
  );
}
