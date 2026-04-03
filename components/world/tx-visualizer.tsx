'use client';

import { memo, useCallback, useEffect, useRef } from 'react';
import type { VisualizerTx, VisualizerNode } from '@/types/visualizer';
import { CHAIN_MAP, TX_TYPE_MAP } from '@/types/visualizer';

// ─── Config ────────────────────────────────────────────────────────────

const NODE_LIFETIME = 8000;       // ms before fade
const FADE_DURATION = 2000;       // ms to fade out
const MAX_NODES = 150;
const MIN_RADIUS = 3;
const MAX_RADIUS = 28;
const AMOUNT_LOG_BASE = 10;       // log scale for radius mapping
const CENTER_PULL = 0.0003;
const DAMPING = 0.995;
const REPULSION = 80;

// ─── Radius from amount ────────────────────────────────────────────────

function amountToRadius(amount: number): number {
  const log = Math.log(Math.max(1, amount)) / Math.log(AMOUNT_LOG_BASE);
  return Math.min(MAX_RADIUS, Math.max(MIN_RADIUS, log * 4));
}

// ─── Particle ring around new nodes ────────────────────────────────────

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
}

// ─── Component ─────────────────────────────────────────────────────────

interface TxVisualizerProps {
  transactions: VisualizerTx[];
}

export const TxVisualizer = memo<TxVisualizerProps>(({ transactions }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<VisualizerNode[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const prevTxCountRef = useRef(0);
  const animRef = useRef<number>(0);
  const sizeRef = useRef({ w: 0, h: 0 });

  // Track new transactions and create nodes
  useEffect(() => {
    const newCount = transactions.length;
    const prevCount = prevTxCountRef.current;
    if (newCount <= prevCount) {
      prevTxCountRef.current = newCount;
      return;
    }

    const newTxs = transactions.slice(0, newCount - prevCount);
    prevTxCountRef.current = newCount;

    const { w, h } = sizeRef.current;
    if (w === 0 || h === 0) return;

    for (const tx of newTxs) {
      const chainConf = CHAIN_MAP.get(tx.chain);
      const typeConf = TX_TYPE_MAP.get(tx.type);
      const color = typeConf?.color ?? '#666';

      // Spawn near center with some randomness
      const angle = Math.random() * Math.PI * 2;
      const dist = 40 + Math.random() * 120;
      const cx = w / 2 + Math.cos(angle) * dist;
      const cy = h / 2 + Math.sin(angle) * dist;

      const radius = amountToRadius(tx.amount);

      const node: VisualizerNode = {
        id: tx.id,
        tx,
        x: cx,
        y: cy,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        radius,
        opacity: 1,
        age: 0,
      };

      nodesRef.current.push(node);

      // Spawn burst particles
      const particleCount = Math.min(8, Math.floor(radius));
      for (let i = 0; i < particleCount; i++) {
        const a = (i / particleCount) * Math.PI * 2 + Math.random() * 0.5;
        const speed = 0.8 + Math.random() * 1.5;
        particlesRef.current.push({
          x: cx,
          y: cy,
          vx: Math.cos(a) * speed,
          vy: Math.sin(a) * speed,
          life: 600 + Math.random() * 400,
          maxLife: 1000,
          color: chainConf?.color ?? color,
        });
      }
    }

    // Trim old nodes
    if (nodesRef.current.length > MAX_NODES) {
      nodesRef.current = nodesRef.current.slice(-MAX_NODES);
    }
  }, [transactions]);

  // Canvas resize
  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    sizeRef.current = { w: rect.width, h: rect.height };
  }, []);

  // Animation loop
  useEffect(() => {
    handleResize();
    window.addEventListener('resize', handleResize);

    let lastTime = performance.now();

    const animate = (now: number) => {
      const dt = Math.min(now - lastTime, 50); // cap delta
      lastTime = now;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const { w, h } = sizeRef.current;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // Background grid
      drawGrid(ctx, w, h);

      const nodes = nodesRef.current;
      const particles = particlesRef.current;

      // ─── Update nodes ───────────────────────────────────
      for (let i = nodes.length - 1; i >= 0; i--) {
        const n = nodes[i];
        n.age += dt;

        // Fade after lifetime
        if (n.age > NODE_LIFETIME) {
          n.opacity = Math.max(0, 1 - (n.age - NODE_LIFETIME) / FADE_DURATION);
          if (n.opacity <= 0) {
            nodes.splice(i, 1);
            continue;
          }
        }

        // Gentle pull toward center
        const dx = w / 2 - n.x;
        const dy = h / 2 - n.y;
        n.vx += dx * CENTER_PULL;
        n.vy += dy * CENTER_PULL;

        // Repulsion from nearby nodes
        for (let j = i + 1; j < nodes.length; j++) {
          const m = nodes[j];
          const rx = n.x - m.x;
          const ry = n.y - m.y;
          const dist2 = rx * rx + ry * ry;
          const minDist = n.radius + m.radius + 4;
          if (dist2 < minDist * minDist && dist2 > 0.1) {
            const dist = Math.sqrt(dist2);
            const force = REPULSION / dist2;
            const fx = (rx / dist) * force;
            const fy = (ry / dist) * force;
            n.vx += fx;
            n.vy += fy;
            m.vx -= fx;
            m.vy -= fy;
          }
        }

        n.vx *= DAMPING;
        n.vy *= DAMPING;
        n.x += n.vx * (dt / 16);
        n.y += n.vy * (dt / 16);

        // Boundary bounce
        if (n.x < n.radius) { n.x = n.radius; n.vx *= -0.5; }
        if (n.x > w - n.radius) { n.x = w - n.radius; n.vx *= -0.5; }
        if (n.y < n.radius) { n.y = n.radius; n.vy *= -0.5; }
        if (n.y > h - n.radius) { n.y = h - n.radius; n.vy *= -0.5; }
      }

      // ─── Draw connections between same-token nodes ──────
      ctx.lineWidth = 0.5;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          if (nodes[i].tx.token !== nodes[j].tx.token) continue;
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 200) continue;
          const alpha = (1 - dist / 200) * 0.15 * Math.min(nodes[i].opacity, nodes[j].opacity);
          const typeConf = TX_TYPE_MAP.get(nodes[i].tx.type);
          ctx.strokeStyle = hexWithAlpha(typeConf?.color ?? '#666', alpha);
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.stroke();
        }
      }

      // ─── Draw nodes ─────────────────────────────────────
      for (const n of nodes) {
        const chainConf = CHAIN_MAP.get(n.tx.chain);
        const typeConf = TX_TYPE_MAP.get(n.tx.type);
        const baseColor = typeConf?.color ?? '#666';
        const chainColor = chainConf?.color ?? '#888';

        // Outer glow
        if (n.age < 1000) {
          const glowAlpha = (1 - n.age / 1000) * 0.3 * n.opacity;
          const gradient = ctx.createRadialGradient(n.x, n.y, n.radius, n.x, n.y, n.radius * 3);
          gradient.addColorStop(0, hexWithAlpha(baseColor, glowAlpha));
          gradient.addColorStop(1, hexWithAlpha(baseColor, 0));
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.radius * 3, 0, Math.PI * 2);
          ctx.fill();
        }

        // Node body
        ctx.fillStyle = hexWithAlpha(baseColor, n.opacity * 0.7);
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fill();

        // Chain-colored ring
        ctx.strokeStyle = hexWithAlpha(chainColor, n.opacity * 0.6);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius + 1, 0, Math.PI * 2);
        ctx.stroke();

        // Token label for bigger nodes
        if (n.radius > 8 && n.opacity > 0.3) {
          ctx.fillStyle = hexWithAlpha('#ffffff', n.opacity * 0.9);
          ctx.font = `600 ${Math.max(8, n.radius * 0.7)}px "JetBrains Mono", monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(n.tx.token, n.x, n.y);
        }
      }

      // ─── Update & draw particles ────────────────────────
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= dt;
        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }
        p.x += p.vx * (dt / 16);
        p.y += p.vy * (dt / 16);
        p.vx *= 0.98;
        p.vy *= 0.98;

        const alpha = (p.life / p.maxLife) * 0.6;
        ctx.fillStyle = hexWithAlpha(p.color, alpha);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animRef.current);
    };
  }, [handleResize]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ background: '#08080f' }}
    />
  );
});

TxVisualizer.displayName = 'TxVisualizer';

// ─── Helpers ───────────────────────────────────────────────────────────

function hexWithAlpha(hex: string, alpha: number): string {
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255).toString(16).padStart(2, '0');
  // Handle short hex
  if (hex.length === 4) {
    return `${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}${a}`;
  }
  return `${hex}${a}`;
}

function drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.strokeStyle = 'rgba(255,255,255,0.02)';
  ctx.lineWidth = 0.5;
  const step = 60;
  for (let x = step; x < w; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = step; y < h; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
}
