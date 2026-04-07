'use client';

import React, { memo, useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import type { ForceGraphSimulation, ForceNode } from '../ForceGraph';
import { GRAPH_CONFIG, SWARM_COLORS } from '../constants';

const {
  PARTICLE_COUNT,
  SWARM_NOISE_FREQ,
  SWARM_NOISE_AMP,
  SWARM_ATTRACTION,
  SWARM_SPAWN_RADIUS,
} = GRAPH_CONFIG;

// ---------------------------------------------------------------------------
// 3D Curl Noise — generates divergence-free velocity fields for swirling motion
// ---------------------------------------------------------------------------

/** Simple smooth-noise scalar field using layered sin/cos (replaces heavy simplex lib) */
function snoiseScalar(x: number, y: number, z: number, seed: number): number {
  return (
    Math.sin(x * 1.7 + seed * 3.1) * Math.cos(y * 2.3 + seed * 0.7) * Math.sin(z * 1.9 + seed * 1.3) +
    Math.sin(x * 0.8 + z * 1.2 + seed * 2.1) * Math.cos(y * 1.5 + seed * 0.3) * 0.5
  );
}

const CURL_EPS = 0.01;

/** Compute curl of a 3-component potential field → divergence-free velocity */
function curlNoise(x: number, y: number, z: number, out: Float32Array, offset: number): void {
  // Three independent scalar fields (seeds 1, 2, 3) form the potential vector
  // Curl = ∇ × F
  const dFz_dy = (snoiseScalar(x, y + CURL_EPS, z, 3) - snoiseScalar(x, y - CURL_EPS, z, 3)) / (2 * CURL_EPS);
  const dFy_dz = (snoiseScalar(x, y, z + CURL_EPS, 2) - snoiseScalar(x, y, z - CURL_EPS, 2)) / (2 * CURL_EPS);

  const dFx_dz = (snoiseScalar(x, y, z + CURL_EPS, 1) - snoiseScalar(x, y, z - CURL_EPS, 1)) / (2 * CURL_EPS);
  const dFz_dx = (snoiseScalar(x + CURL_EPS, y, z, 3) - snoiseScalar(x - CURL_EPS, y, z, 3)) / (2 * CURL_EPS);

  const dFy_dx = (snoiseScalar(x + CURL_EPS, y, z, 2) - snoiseScalar(x - CURL_EPS, y, z, 2)) / (2 * CURL_EPS);
  const dFx_dy = (snoiseScalar(x, y + CURL_EPS, z, 1) - snoiseScalar(x, y - CURL_EPS, z, 1)) / (2 * CURL_EPS);

  out[offset] = dFz_dy - dFy_dz;
  out[offset + 1] = dFx_dz - dFz_dx;
  out[offset + 2] = dFy_dx - dFx_dy;
}

// ---------------------------------------------------------------------------
// Particle state
// ---------------------------------------------------------------------------

interface SwarmState {
  /** Particle positions [x,y,z, x,y,z, ...] */
  positions: Float32Array;
  /** Particle velocities [vx,vy,vz, ...] */
  velocities: Float32Array;
  /** Index of the target hub node for each particle */
  targetIdx: Uint16Array;
  /** Particle life (0..1, resets on arrival/expiry) */
  life: Float32Array;
  /** Per-particle color [r,g,b, ...] */
  colors: Float32Array;
  /** Per-particle size */
  sizes: Float32Array;
}

function createSwarmState(count: number): SwarmState {
  return {
    positions: new Float32Array(count * 3),
    velocities: new Float32Array(count * 3),
    targetIdx: new Uint16Array(count),
    life: new Float32Array(count),
    colors: new Float32Array(count * 3),
    sizes: new Float32Array(count),
  };
}

/** Spawn a particle at the edge of the simulation on a random point of a sphere */
function spawnParticle(
  state: SwarmState,
  i: number,
  hubs: ForceNode[],
  agentNodes: ForceNode[],
): void {
  const i3 = i * 3;

  // Pick a random target hub
  const tgtIdx = hubs.length > 0 ? Math.floor(Math.random() * hubs.length) : 0;
  state.targetIdx[i] = tgtIdx;

  // Spawn position: either at simulation edge (sphere) or at a random agent (source node)
  const spawnAtAgent = agentNodes.length > 0 && Math.random() < 0.4;
  if (spawnAtAgent) {
    const agent = agentNodes[Math.floor(Math.random() * agentNodes.length)];
    state.positions[i3] = agent.x ?? 0;
    state.positions[i3 + 1] = agent.y ?? 0;
    state.positions[i3 + 2] = agent.z ?? 0;
  } else {
    // Random point on a sphere of SWARM_SPAWN_RADIUS
    const phi = Math.acos(1 - 2 * Math.random());
    const theta = Math.random() * Math.PI * 2;
    state.positions[i3] = Math.sin(phi) * Math.cos(theta) * SWARM_SPAWN_RADIUS;
    state.positions[i3 + 1] = Math.sin(phi) * Math.sin(theta) * SWARM_SPAWN_RADIUS;
    state.positions[i3 + 2] = Math.cos(phi) * SWARM_SPAWN_RADIUS;
  }

  // Zero velocity
  state.velocities[i3] = 0;
  state.velocities[i3 + 1] = 0;
  state.velocities[i3 + 2] = 0;

  // Full life
  state.life[i] = 0;

  // Assign color based on a weighted random transaction type
  const roll = Math.random();
  let r: number, g: number, b: number;
  const c = new THREE.Color();
  if (roll < 0.15) {
    c.set(SWARM_COLORS.whale);    // Purple (15%)
  } else if (roll < 0.40) {
    c.set(SWARM_COLORS.buy);      // Blue (25%)
  } else if (roll < 0.55) {
    c.set(SWARM_COLORS.sell);     // Red (15%)
  } else if (roll < 0.70) {
    c.set(SWARM_COLORS.create);   // Yellow (15%)
  } else {
    c.set(SWARM_COLORS.default);  // Green (30%)
  }
  r = c.r; g = c.g; b = c.b;

  state.colors[i3] = r;
  state.colors[i3 + 1] = g;
  state.colors[i3 + 2] = b;

  // Random size variation
  state.sizes[i] = 1.5 + Math.random() * 2.5;
}

// ---------------------------------------------------------------------------
// Vertex & fragment shaders for THREE.Points
// ---------------------------------------------------------------------------

const vertexShader = /* glsl */ `
attribute float size;
attribute vec3 customColor;
varying vec3 vColor;
varying float vAlpha;

void main() {
  vColor = customColor;

  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

  // Size attenuation: further away = smaller
  gl_PointSize = size * (200.0 / -mvPosition.z);
  gl_PointSize = clamp(gl_PointSize, 1.0, 32.0);

  gl_Position = projectionMatrix * mvPosition;

  // Fade particles near the camera to avoid popping
  float dist = -mvPosition.z;
  vAlpha = smoothstep(0.5, 3.0, dist);
}
`;

const fragmentShader = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;

void main() {
  // Circular soft particle
  float d = length(gl_PointCoord - vec2(0.5));
  if (d > 0.5) discard;

  // Soft glow falloff from center
  float glow = 1.0 - smoothstep(0.0, 0.5, d);
  glow = pow(glow, 1.5);

  // Output HDR color for bloom pickup (multiply by 2.0 for brightness)
  gl_FragColor = vec4(vColor * 2.0, glow * vAlpha * 0.85);
}
`;

// ---------------------------------------------------------------------------
// React component
// ---------------------------------------------------------------------------

/** High-performance particle swarm — 10K+ colored particles attacking target nodes
 *  with curl-noise turbulence for organic swirling motion. */
export const EdgeParticles = memo(({ sim }: { sim: ForceGraphSimulation; isDark?: boolean }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const stateRef = useRef<SwarmState | null>(null);
  const curlBuf = useRef(new Float32Array(3));

  // Geometry + attributes (allocated once)
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const sizes = new Float32Array(PARTICLE_COUNT);

    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('customColor', new THREE.Float32BufferAttribute(colors, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1).setUsage(THREE.DynamicDrawUsage));

    return geo;
  }, []);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {},
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );

  // Initialize particle state
  useEffect(() => {
    const state = createSwarmState(PARTICLE_COUNT);
    stateRef.current = state;

    // Initial spawn — spread particles randomly so they don't all appear at once
    const hubs = sim.nodes.filter((n) => n.type === 'hub');
    const agents = sim.nodes.filter((n) => n.type === 'agent');
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      spawnParticle(state, i, hubs, agents);
      // Randomize initial life so particles are in different phases
      state.life[i] = Math.random();
    }
  }, [sim]);

  // Per-frame animation loop
  useFrame((_, delta) => {
    const pts = pointsRef.current;
    const state = stateRef.current;
    if (!pts || !state) return;

    const posArr = geometry.attributes.position as THREE.Float32BufferAttribute;
    const colorArr = geometry.attributes.customColor as THREE.Float32BufferAttribute;
    const sizeArr = geometry.attributes.size as THREE.Float32BufferAttribute;

    const hubs = sim.nodes.filter((n) => n.type === 'hub');
    const agents = sim.nodes.filter((n) => n.type === 'agent');
    if (hubs.length === 0) return;

    const dt = Math.min(delta, 0.05); // Cap delta to avoid large jumps

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;

      // Current position
      let px = state.positions[i3];
      let py = state.positions[i3 + 1];
      let pz = state.positions[i3 + 2];

      // Target hub position
      const tgtIdx = state.targetIdx[i] % hubs.length;
      const hub = hubs[tgtIdx];
      const tx = hub.x ?? 0;
      const ty = hub.y ?? 0;
      const tz = hub.z ?? 0;

      // Direction to target
      const dx = tx - px;
      const dy = ty - py;
      const dz = tz - pz;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;

      // --- Attraction force (pulls toward target) ---
      const attractScale = SWARM_ATTRACTION / dist;
      let ax = dx * attractScale;
      let ay = dy * attractScale;
      let az = dz * attractScale;

      // --- Curl noise turbulence (makes particles swirl) ---
      const noiseX = px * SWARM_NOISE_FREQ;
      const noiseY = py * SWARM_NOISE_FREQ;
      const noiseZ = pz * SWARM_NOISE_FREQ;
      curlNoise(noiseX, noiseY, noiseZ, curlBuf.current, 0);

      // Scale turbulence — stronger when far from target, weaker when close
      const turbFade = Math.min(dist / 15, 1.0);
      ax += curlBuf.current[0] * SWARM_NOISE_AMP * turbFade;
      ay += curlBuf.current[1] * SWARM_NOISE_AMP * turbFade;
      az += curlBuf.current[2] * SWARM_NOISE_AMP * turbFade;

      // Update velocity with forces + damping
      state.velocities[i3] = (state.velocities[i3] + ax * dt) * 0.96;
      state.velocities[i3 + 1] = (state.velocities[i3 + 1] + ay * dt) * 0.96;
      state.velocities[i3 + 2] = (state.velocities[i3 + 2] + az * dt) * 0.96;

      // Update position
      px += state.velocities[i3] * dt;
      py += state.velocities[i3 + 1] * dt;
      pz += state.velocities[i3 + 2] * dt;
      state.positions[i3] = px;
      state.positions[i3 + 1] = py;
      state.positions[i3 + 2] = pz;

      // Advance life
      state.life[i] += dt * 0.15;

      // Respawn if: arrived at target (within hub radius) or life expired
      const hubRadius = hub.radius ?? 1.5;
      if (dist < hubRadius + 0.5 || state.life[i] > 1.0) {
        spawnParticle(state, i, hubs, agents);
      }

      // Write to GPU buffers
      (posArr.array as Float32Array)[i3] = px;
      (posArr.array as Float32Array)[i3 + 1] = py;
      (posArr.array as Float32Array)[i3 + 2] = pz;

      (colorArr.array as Float32Array)[i3] = state.colors[i3];
      (colorArr.array as Float32Array)[i3 + 1] = state.colors[i3 + 1];
      (colorArr.array as Float32Array)[i3 + 2] = state.colors[i3 + 2];

      (sizeArr.array as Float32Array)[i] = state.sizes[i];
    }

    posArr.needsUpdate = true;
    colorArr.needsUpdate = true;
    sizeArr.needsUpdate = true;
  });

  return <points ref={pointsRef} geometry={geometry} material={material} frustumCulled={false} />;
});

EdgeParticles.displayName = 'EdgeParticles';
