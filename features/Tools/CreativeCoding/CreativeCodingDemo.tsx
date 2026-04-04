'use client';

import { useRef, useMemo, useState, useCallback } from 'react';
import { Canvas, useFrame, extend } from '@react-three/fiber';
import * as THREE from 'three';
import ToolPageShell from '@/features/Tools/ToolPageShell';

// ---------------------------------------------------------------------------
// Custom shader material — generative particle system
// ---------------------------------------------------------------------------
const particleVertexShader = `
  uniform float uTime;
  uniform float uSpeed;
  uniform float uAmplitude;
  attribute float aPhase;
  attribute float aSize;
  varying float vAlpha;
  varying vec3 vColor;

  void main() {
    float t = uTime * uSpeed;
    vec3 pos = position;

    // Organic movement — Lissajous-like curves
    pos.x += sin(t + aPhase * 6.28) * uAmplitude;
    pos.y += cos(t * 0.7 + aPhase * 3.14) * uAmplitude * 0.6;
    pos.z += sin(t * 0.5 + aPhase * 9.42) * uAmplitude * 0.8;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = aSize * (200.0 / -mvPosition.z);

    // Distance-based fade
    float dist = length(pos);
    vAlpha = smoothstep(5.0, 0.5, dist) * 0.8;
    vColor = vec3(
      0.5 + 0.3 * sin(aPhase * 6.28),
      0.3 + 0.3 * sin(aPhase * 6.28 + 2.09),
      0.8 + 0.2 * sin(aPhase * 6.28 + 4.18)
    );
  }
`;

const particleFragmentShader = `
  varying float vAlpha;
  varying vec3 vColor;

  void main() {
    // Soft circular particle
    float r = length(gl_PointCoord - vec2(0.5));
    if (r > 0.5) discard;
    float alpha = vAlpha * smoothstep(0.5, 0.1, r);
    gl_FragColor = vec4(vColor, alpha);
  }
`;

// ---------------------------------------------------------------------------
// Particle field component
// ---------------------------------------------------------------------------
function ParticleField({ count, speed, amplitude }: { count: number; speed: number; amplitude: number }) {
  const meshRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const { geometry } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const phases = new Float32Array(count);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // Distribute in a sphere
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = Math.pow(Math.random(), 0.5) * 3;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
      phases[i] = Math.random();
      sizes[i] = 0.5 + Math.random() * 2;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('aPhase', new THREE.Float32BufferAttribute(phases, 1));
    geo.setAttribute('aSize', new THREE.Float32BufferAttribute(sizes, 1));

    return { geometry: geo };
  }, [count]);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
      materialRef.current.uniforms.uSpeed.value = speed;
      materialRef.current.uniforms.uAmplitude.value = amplitude;
    }
  });

  return (
    <points ref={meshRef} geometry={geometry}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={particleVertexShader}
        fragmentShader={particleFragmentShader}
        uniforms={{
          uTime: { value: 0 },
          uSpeed: { value: speed },
          uAmplitude: { value: amplitude },
        }}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// ---------------------------------------------------------------------------
// Wireframe attractor mesh
// ---------------------------------------------------------------------------
function WireAttractor() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.getElapsedTime();
    meshRef.current.rotation.x = t * 0.1;
    meshRef.current.rotation.y = t * 0.15;
    const s = 1 + Math.sin(t * 0.5) * 0.1;
    meshRef.current.scale.setScalar(s);
  });

  return (
    <mesh ref={meshRef}>
      <icosahedronGeometry args={[1.5, 2]} />
      <meshBasicMaterial color="#c084fc" wireframe opacity={0.08} transparent />
    </mesh>
  );
}

// ---------------------------------------------------------------------------
// Scene
// ---------------------------------------------------------------------------
function CreativeCodingScene({
  particleCount,
  speed,
  amplitude,
}: {
  particleCount: number;
  speed: number;
  amplitude: number;
}) {
  return (
    <>
      <color attach="background" args={['#050508']} />
      <ParticleField count={particleCount} speed={speed} amplitude={amplitude} />
      <WireAttractor />
    </>
  );
}

// ---------------------------------------------------------------------------
// Shader code editor (mini display)
// ---------------------------------------------------------------------------
function ShaderDisplay({ code }: { code: string }) {
  return (
    <pre
      style={{
        margin: 0,
        padding: '10px 14px',
        background: 'rgba(0,0,0,0.4)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 4,
        fontSize: 9,
        color: '#888',
        lineHeight: 1.5,
        maxHeight: 200,
        overflow: 'auto',
        whiteSpace: 'pre-wrap',
        fontFamily: "'IBM Plex Mono', monospace",
      }}
    >
      {code}
    </pre>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function CreativeCodingDemo() {
  const [particleCount, setParticleCount] = useState(8000);
  const [speed, setSpeed] = useState(0.5);
  const [amplitude, setAmplitude] = useState(1.2);
  const [showShader, setShowShader] = useState(false);

  return (
    <ToolPageShell
      title="Creative Coding"
      description="WebGL shader playground"
      externalUrl="https://cables.gl/"
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
          maxWidth: 340,
        }}
      >
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#888', width: 70 }}>Particles</span>
          <input
            type="range" min={1000} max={50000} step={1000}
            value={particleCount}
            onChange={(e) => setParticleCount(Number(e.target.value))}
            style={{ width: 100 }}
          />
          <span style={{ color: '#c084fc', width: 50, textAlign: 'right' }}>{(particleCount / 1000).toFixed(0)}K</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#888', width: 70 }}>Speed</span>
          <input
            type="range" min={0.1} max={3} step={0.1}
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            style={{ width: 100 }}
          />
          <span style={{ color: '#22d3ee', width: 50, textAlign: 'right' }}>{speed.toFixed(1)}x</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#888', width: 70 }}>Amplitude</span>
          <input
            type="range" min={0.2} max={4} step={0.1}
            value={amplitude}
            onChange={(e) => setAmplitude(Number(e.target.value))}
            style={{ width: 100 }}
          />
          <span style={{ color: '#34d399', width: 50, textAlign: 'right' }}>{amplitude.toFixed(1)}</span>
        </label>
        <button
          onClick={() => setShowShader((s) => !s)}
          style={{
            marginTop: 4,
            padding: '4px 10px',
            background: 'rgba(192,132,252,0.1)',
            border: '1px solid rgba(192,132,252,0.2)',
            borderRadius: 4,
            color: '#c084fc',
            cursor: 'pointer',
            fontSize: 9,
            letterSpacing: '0.06em',
          }}
        >
          {showShader ? 'Hide' : 'Show'} Shader Code
        </button>
        {showShader && (
          <ShaderDisplay
            code={`// Vertex: Lissajous particle animation
pos.x += sin(t + phase * TAU) * amp;
pos.y += cos(t*0.7 + phase * PI) * amp*0.6;
pos.z += sin(t*0.5 + phase * 3PI) * amp*0.8;

// Fragment: Soft circular falloff
float r = length(gl_PointCoord - 0.5);
float alpha = smoothstep(0.5, 0.1, r);`}
          />
        )}
      </div>

      {/* Info */}
      <div
        style={{
          position: 'absolute',
          bottom: 12,
          right: 12,
          zIndex: 10,
          fontSize: 9,
          color: '#444',
          letterSpacing: '0.08em',
          textAlign: 'right',
        }}
      >
        Custom GLSL · Additive blending · No post-processing
        <br />
        Inspired by Cables.gl & Nodes.io
      </div>

      <Canvas camera={{ position: [0, 0, 5], fov: 60 }} style={{ width: '100%', height: '100%' }}>
        <CreativeCodingScene particleCount={particleCount} speed={speed} amplitude={amplitude} />
      </Canvas>
    </ToolPageShell>
  );
}
