'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import * as THREE from 'three';
import {
  CSS2DRenderer,
  CSS2DObject,
} from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import type { PumpGraphData, PumpNode } from './types';

// ---------------------------------------------------------------------------
// Glow Texture Factory
// ---------------------------------------------------------------------------

function createGlowTexture(color: string): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const half = size / 2;
  const gradient = ctx.createRadialGradient(half, half, 0, half, half, half);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, 'transparent');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

// Lazy-initialized singletons — created once on first access (client only)
let _buyTexture: THREE.CanvasTexture | null = null;
let _sellTexture: THREE.CanvasTexture | null = null;

function getBuyTexture(): THREE.CanvasTexture {
  if (!_buyTexture) _buyTexture = createGlowTexture('#00ff00');
  return _buyTexture;
}

function getSellTexture(): THREE.CanvasTexture {
  if (!_sellTexture) _sellTexture = createGlowTexture('#ff0000');
  return _sellTexture;
}

// ---------------------------------------------------------------------------
// useWindowSize Hook
// ---------------------------------------------------------------------------

function useWindowSize(): { width: number; height: number } {
  const [size, setSize] = useState(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));

  useEffect(() => {
    const onResize = () =>
      setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return size;
}

// ---------------------------------------------------------------------------
// PumpFunGraph Component
// ---------------------------------------------------------------------------

interface PumpFunGraphProps {
  graphData: PumpGraphData;
}

export function PumpFunGraph({ graphData }: PumpFunGraphProps) {
  const { width, height } = useWindowSize();

  // Create CSS2DRenderer once and persist across renders
  const extraRenderers = useMemo(
    () => [new CSS2DRenderer() as unknown as THREE.WebGLRenderer],
    [],
  );

  // ------------------------------------------------------------------
  // nodeThreeObject: token → CSS2D pill badge,  trade → glow Sprite
  // ------------------------------------------------------------------
  const nodeThreeObject = useCallback((node: PumpNode) => {
    if (node.type === 'token') {
      const div = document.createElement('div');
      div.textContent = node.ticker ?? node.id.slice(0, 6);
      Object.assign(div.style, {
        padding: '3px 10px',
        borderRadius: '999px',
        background: 'rgba(15, 15, 25, 0.75)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        color: '#ffffff',
        fontSize: '11px',
        fontFamily:
          "'SF Mono', 'Fira Code', 'Cascadia Code', ui-monospace, monospace",
        fontWeight: '600',
        letterSpacing: '0.04em',
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        userSelect: 'none',
        textShadow: '0 0 6px rgba(255,255,255,0.25)',
      } satisfies Partial<CSSStyleDeclaration>);

      return new CSS2DObject(div);
    }

    // trade node → neon glow sprite
    const material = new THREE.SpriteMaterial({
      map: node.isBuy ? getBuyTexture() : getSellTexture(),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(3, 3, 3);
    return sprite;
  }, []);

  return (
    <ForceGraph3D
      graphData={graphData}
      width={width}
      height={height}
      backgroundColor="#030303"
      showNavInfo={false}
      linkOpacity={0.02}
      extraRenderers={extraRenderers}
      nodeThreeObject={nodeThreeObject}
    />
  );
}

