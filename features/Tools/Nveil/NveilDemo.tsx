'use client';

import { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';
import ToolPageShell from '@/features/Tools/ToolPageShell';

// ---------------------------------------------------------------------------
// NVEIL-inspired volumetric data rendering demo
// Transforms raw data into spatial 3D columns / bars / point clouds
// ---------------------------------------------------------------------------

interface DataPoint {
  x: number;
  z: number;
  value: number;
  category: string;
}

const CATEGORIES = ['DeFi', 'NFT', 'L2', 'Bridge', 'DEX'];
const CATEGORY_COLORS: Record<string, string> = {
  DeFi: '#c084fc',
  NFT: '#f472b6',
  L2: '#22d3ee',
  Bridge: '#34d399',
  DEX: '#fbbf24',
};

function generateDataset(rows: number, cols: number): DataPoint[] {
  const points: DataPoint[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      points.push({
        x: c - cols / 2,
        z: r - rows / 2,
        value: Math.random() * 2 + Math.sin(r * 0.3 + c * 0.5) * 0.5 + 0.5,
        category: CATEGORIES[(r + c) % CATEGORIES.length],
      });
    }
  }
  return points;
}

// ---------------------------------------------------------------------------
// 3D Bar chart
// ---------------------------------------------------------------------------
function DataBars({ data, animate }: { data: DataPoint[]; animate: boolean }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const colorObj = useMemo(() => new THREE.Color(), []);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = animate ? state.clock.getElapsedTime() : 0;

    for (let i = 0; i < data.length; i++) {
      const d = data[i];
      const height = d.value * (animate ? (1 + Math.sin(t * 0.8 + i * 0.1) * 0.2) : 1);
      dummy.position.set(d.x * 0.6, height / 2, d.z * 0.6);
      dummy.scale.set(0.4, height, 0.4);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);

      colorObj.set(CATEGORY_COLORS[d.category] || '#888');
      meshRef.current.setColorAt(i, colorObj);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, data.length]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial roughness={0.5} metalness={0.3} toneMapped={false} />
    </instancedMesh>
  );
}

// ---------------------------------------------------------------------------
// Base platform
// ---------------------------------------------------------------------------
function Platform({ rows, cols }: { rows: number; cols: number }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
      <planeGeometry args={[cols * 0.7, rows * 0.7]} />
      <meshStandardMaterial color="#111118" roughness={0.9} />
    </mesh>
  );
}

// ---------------------------------------------------------------------------
// Axis labels
// ---------------------------------------------------------------------------
function AxisLabels({ rows, cols }: { rows: number; cols: number }) {
  return (
    <group>
      <Text
        position={[0, -0.3, rows * 0.35 + 0.5]}
        fontSize={0.2}
        color="#555"
        anchorX="center"
        font="https://fonts.gstatic.com/s/ibmplexmono/v19/-F63fjptAgt5VM-kVkqdyU8n1iIq131nj-otFQ.woff2"
      >
        Transaction Volume by Category
      </Text>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Scene
// ---------------------------------------------------------------------------
function NveilScene({ gridSize, animate }: { gridSize: number; animate: boolean }) {
  const data = useMemo(() => generateDataset(gridSize, gridSize), [gridSize]);

  return (
    <>
      <color attach="background" args={['#08080e']} />
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 8, 5]} intensity={0.7} color="#ffffff" />
      <pointLight position={[-3, 5, -3]} intensity={0.4} color="#c084fc" />

      <Platform rows={gridSize} cols={gridSize} />
      <DataBars data={data} animate={animate} />
      <AxisLabels rows={gridSize} cols={gridSize} />

      <gridHelper args={[gridSize * 0.7, gridSize, '#1a1a2e', '#1a1a2e']} position={[0, 0.001, 0]} />

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minPolarAngle={0.3}
        maxPolarAngle={Math.PI / 2.2}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function NveilDemo() {
  const [gridSize, setGridSize] = useState(10);
  const [animate, setAnimate] = useState(true);
  const [mode, setMode] = useState<'local' | 'embed'>('local');
  const [embedUrl, setEmbedUrl] = useState('');

  return (
    <ToolPageShell
      title="NVEIL"
      description="Volumetric 3D data rendering"
      externalUrl="https://www.nveil.com/"
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
              }}
            >
              {m === 'local' ? 'Local Demo' : 'NVEIL Embed'}
            </button>
          ))}
        </div>

        {mode === 'local' && (
          <>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#888', width: 60 }}>Grid</span>
              <input
                type="range" min={4} max={20} step={1}
                value={gridSize}
                onChange={(e) => setGridSize(Number(e.target.value))}
                style={{ width: 100 }}
              />
              <span style={{ color: '#c084fc', width: 50, textAlign: 'right' }}>{gridSize}x{gridSize}</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={animate}
                onChange={(e) => setAnimate(e.target.checked)}
              />
              <span style={{ color: '#888' }}>Animate bars</span>
            </label>
            <div style={{ fontSize: 9, color: '#555' }}>
              {gridSize * gridSize} data points
            </div>
          </>
        )}

        {mode === 'embed' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ color: '#888', fontSize: 10 }}>NVEIL Dashboard URL</label>
            <input
              type="url"
              placeholder="https://app.nveil.com/..."
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
              Paste an NVEIL visualization URL to embed it
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
        {CATEGORIES.map((cat) => (
          <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: CATEGORY_COLORS[cat] }} />
            <span style={{ color: '#aaa' }}>{cat}</span>
          </div>
        ))}
      </div>

      {mode === 'local' && (
        <Canvas camera={{ position: [6, 5, 6], fov: 50 }} style={{ width: '100%', height: '100%' }}>
          <NveilScene gridSize={gridSize} animate={animate} />
        </Canvas>
      )}

      {mode === 'embed' && (
        embedUrl ? (
          <iframe
            src={embedUrl}
            style={{ width: '100%', height: '100%', border: 'none' }}
            sandbox="allow-scripts allow-same-origin allow-popups"
            title="NVEIL Embed"
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
            <div>Enter an NVEIL dashboard URL to embed a visualization</div>
            <div style={{ fontSize: 10, color: '#444' }}>
              Or use the Local Demo mode for a volumetric 3D preview
            </div>
          </div>
        )
      )}
    </ToolPageShell>
  );
}
