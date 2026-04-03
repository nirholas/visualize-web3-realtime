/**
 * Network Visualization — PumpFun World
 *
 * An interactive 3D particle network depicting x402 payment flows as a living,
 * breathing organism of nodes and particles.
 *
 * Visual elements:
 *   - Primary Nodes: Large white spheres representing wallets/payment hubs
 *   - Secondary Particles: Thousands of dots swarming around nodes (x402 data)
 *   - Connection Lines: Hub tethers + proximity-based dynamic web
 *   - Mouse Repulsion: Fluid physics with spring snap-back (Hooke's Law)
 *   - Bloom Post-Processing: Soft emissive glow on all elements
 *
 * Visual stages:
 *   1. IDLE     — Particles swarm lazily, camera drifts, organic breathing
 *   2. PROMPT   — Particles tighten around nodes, energy builds
 *   3. CALLING  — Particles stream between nodes, lines intensify
 *   4. PAYING   — Golden pulse ripples through the network
 *   5. RECEIVING — Data particles cascade back toward user node
 *   6. COMPLETE — Network pulses once, then settles into calm idle
 */

'use client';

import { Html } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
    Suspense,
    forwardRef,
    memo,
    useCallback,
    useEffect,
    useImperativeHandle,
    useMemo,
    useRef,
    useState,
} from 'react';
import * as THREE from 'three';

import type { X402FlowTrace, VortexStage } from './types';

// ============================================================================
// Configuration
// ============================================================================

const NETWORK_CONFIG = {
    /** Number of primary hub nodes */
    PRIMARY_NODES: 8,
    /** Particles per hub cluster */
    PARTICLES_PER_HUB: 250,
    /** Proximity threshold for drawing inter-particle lines */
    PROXIMITY_THRESHOLD: 1.8,
    /** Max proximity lines to draw (performance cap) */
    MAX_PROXIMITY_LINES: 800,
    /** Hub tether line count per node (subset of particles) */
    TETHER_LINES_PER_HUB: 40,
    /** Mouse repulsion radius */
    REPULSION_RADIUS: 6,
    /** Mouse repulsion strength */
    REPULSION_STRENGTH: 15,
    /** Spring constant (Hooke's law) for snap-back */
    SPRING_K: 2.5,
    /** Damping coefficient for drag */
    DAMPING: 0.92,
    /** Camera orbit speed (radians/sec) */
    CAMERA_ORBIT_SPEED: 0.06,
    /** Spread radius for hub positions */
    HUB_SPREAD: 18,
    /** Cluster radius around each hub */
    CLUSTER_RADIUS: 4,
    /** Ambient drift speed */
    DRIFT_SPEED: 0.3,
} as const;

/** User highlight color (blue) for "You Are Here" node */
const HIGHLIGHT_COLOR = '#3d63ff';

function truncateAddress(address: string): string {
    if (address.length <= 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Light theme — clean white background, dark nodes (Giza-inspired)
const NETWORK_COLORS = {
    bg: '#ffffff',
    node: '#1a1a1a',
    particle: '#2a2a2a',
    line: '#888888',
    lineProximity: '#999999',
    paymentPulse: '#d49020',
    accent: '#1a1a1a',
    /** Text colors */
    text: '#1a1a1a',
    textMuted: '#666666',
    textFaint: '#999999',
    /** UI surface overlays */
    surface: 'rgba(0, 0, 0, 0.04)',
    surfaceBorder: 'rgba(0, 0, 0, 0.10)',
};

export interface CameraMoveRequest {
    durationMs?: number;
    lookAt?: [number, number, number];
    position: [number, number, number];
}

export interface X402NetworkHandle {
    animateCameraTo: (request: CameraMoveRequest) => Promise<void>;
    focusHub: (index: number, durationMs?: number) => Promise<void>;
    getHubCount: () => number;
    getHubPosition: (index: number) => [number, number, number] | null;
    setOrbitEnabled: (enabled: boolean) => void;
}

interface CameraAnimation {
    durationMs: number;
    fromLookAt: THREE.Vector3;
    fromPos: THREE.Vector3;
    onDone?: () => void;
    startedAt: number;
    toLookAt: THREE.Vector3;
    toPos: THREE.Vector3;
}

// ============================================================================
// Utility: Spatial hash for proximity checks
// ============================================================================

class SpatialHash {
    private cellSize: number;
    private cells: Map<string, number[]>;
    /** Pre-allocated result buffer to avoid per-query allocations */
    private resultBuffer: number[] = [];

    constructor(cellSize: number) {
        this.cellSize = cellSize;
        this.cells = new Map();
    }

    clear() {
        // Reuse existing arrays by truncating instead of discarding
        for (const arr of this.cells.values()) {
            arr.length = 0;
        }
    }

    private key(x: number, y: number, z: number): string {
        const cx = Math.floor(x / this.cellSize);
        const cy = Math.floor(y / this.cellSize);
        const cz = Math.floor(z / this.cellSize);
        return `${cx},${cy},${cz}`;
    }

    insert(index: number, x: number, y: number, z: number) {
        const k = this.key(x, y, z);
        let arr = this.cells.get(k);
        if (!arr) {
            arr = [];
            this.cells.set(k, arr);
        }
        arr.push(index);
    }

    /** Returns a shared buffer — do NOT hold a reference across frames */
    queryNear(x: number, y: number, z: number): number[] {
        this.resultBuffer.length = 0;
        const cx = Math.floor(x / this.cellSize);
        const cy = Math.floor(y / this.cellSize);
        const cz = Math.floor(z / this.cellSize);

        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                for (let dz = -1; dz <= 1; dz++) {
                    const k = `${cx + dx},${cy + dy},${cz + dz}`;
                    const arr = this.cells.get(k);
                    if (arr) {
                        for (const idx of arr) this.resultBuffer.push(idx);
                    }
                }
            }
        }
        return this.resultBuffer;
    }
}

// ============================================================================
// Generate hub positions (hierarchical: central origin → radial protocol hubs)
// ============================================================================

function generateHubPositions(count: number, spread: number): THREE.Vector3[] {
    const positions: THREE.Vector3[] = [];

    // First node is the central origin (agent/user) at [0,0,0]
    positions.push(new THREE.Vector3(0, 0, 0));

    // Protocol hubs radiate outward from origin in a golden-angle spiral
    const protocolCount = Math.max(0, count - 1);
    const phi = (1 + Math.sqrt(5)) / 2;
    for (let i = 0; i < protocolCount; i++) {
        const theta = (2 * Math.PI * i) / phi;
        const y = (Math.sin(i * 1.3) * 0.5) * spread * 0.3;
        const r = spread * (0.5 + (i % 3) * 0.15 + 0.1);
        positions.push(
            new THREE.Vector3(
                Math.cos(theta) * r,
                y,
                Math.sin(theta) * r,
            ),
        );
    }

    return positions;
}

// ============================================================================
// Origin Spokes (thick lines from central node to protocol hubs)
// ============================================================================

interface OriginSpokesProps {
    /** Hub index to highlight (null = no filter) */
    highlightedHubIndex?: number | null;
    hubPositions: THREE.Vector3[];
    nodeColor: string;
    stage: VortexStage;
}

const OriginSpokes = memo<OriginSpokesProps>(({ hubPositions, nodeColor, stage, highlightedHubIndex }) => {
    const lineRef = useRef<THREE.LineSegments>(null);

    // Spoke lines from origin (index 0) to each protocol hub
    const spokeCount = Math.max(0, hubPositions.length - 1);
    const positions = useMemo(() => {
        const arr = new Float32Array(spokeCount * 6);
        const origin = hubPositions[0];
        if (!origin) return arr;

        for (let i = 0; i < spokeCount; i++) {
            const hub = hubPositions[i + 1];
            const i6 = i * 6;
            arr[i6] = origin.x;
            arr[i6 + 1] = origin.y;
            arr[i6 + 2] = origin.z;
            arr[i6 + 3] = hub.x;
            arr[i6 + 4] = hub.y;
            arr[i6 + 5] = hub.z;
        }
        return arr;
    }, [hubPositions, spokeCount]);

    // Animate spoke positions to follow hub drift
    useFrame((state) => {
        if (!lineRef.current || spokeCount === 0) return;
        const time = state.clock.getElapsedTime();
        const attr = lineRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;
        const arr = attr.array as Float32Array;

        // Origin drift
        const ox = Math.sin(time * 0.15) * 0.3;
        const oy = Math.cos(time * 0.12) * 0.2;
        const oz = Math.sin(time * 0.1) * 0.25;

        for (let i = 0; i < spokeCount; i++) {
            const hub = hubPositions[i + 1];
            const i6 = i * 6;
            arr[i6] = ox;
            arr[i6 + 1] = oy;
            arr[i6 + 2] = oz;
            arr[i6 + 3] = hub.x + Math.sin(time * 0.15 + (i + 1) * 2.1) * 0.3;
            arr[i6 + 4] = hub.y + Math.cos(time * 0.12 + (i + 1) * 1.4) * 0.2;
            arr[i6 + 5] = hub.z + Math.sin(time * 0.1 + (i + 1) * 3.3) * 0.25;
        }
        attr.needsUpdate = true;
    });

    if (spokeCount === 0) return null;

    const baseOpacity = stage === 'calling' || stage === 'paying' ? 0.5 : 0.2;
    const opacity = highlightedHubIndex != null ? baseOpacity * 0.15 : baseOpacity;

    return (
        <lineSegments ref={lineRef}>
            <bufferGeometry>
                <bufferAttribute
                    args={[positions, 3]}
                    attach="attributes-position"
                    count={spokeCount * 2}
                    itemSize={3}
                    usage={THREE.DynamicDrawUsage}
                />
            </bufferGeometry>
            <lineBasicMaterial
                color={nodeColor}
                opacity={opacity}
                transparent
            />
        </lineSegments>
    );
});

OriginSpokes.displayName = 'OriginSpokes';

// ============================================================================
// Node label extraction
// ============================================================================

function extractNodeLabel(endpoint: string): string {
    try {
        const url = new URL(endpoint);
        // Use hostname without TLD, uppercase
        const host = url.hostname.replace('www.', '');
        const parts = host.split('.');
        return parts[0].toUpperCase();
    } catch {
        return endpoint.slice(0, 16).toUpperCase();
    }
}

// ============================================================================
// Primary Nodes (large spheres with floating labels)
// ============================================================================

interface PrimaryNodesProps {
    apiEndpoints: string[];
    /** Per-hub category colors */
    categoryColors?: string[];
    /** Externally shared ref for drifted positions (used by YouAreHereMarker) */
    driftedPositionsRef?: React.MutableRefObject<THREE.Vector3[]>;
    /** Hub index to highlight (e.g. for address search) */
    highlightedHub?: number | null;
    /** Hub index highlighted by protocol filter sidebar (dims all others) */
    highlightedHubIndex?: number | null;
    hubPositions: THREE.Vector3[];
    nodeColor: string;
    stage: VortexStage;
}

const PrimaryNodes = memo<PrimaryNodesProps>(({ hubPositions, stage, apiEndpoints, categoryColors, nodeColor, highlightedHub, highlightedHubIndex, driftedPositionsRef }) => {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);
    const scaleRef = useRef<Float32Array>(new Float32Array(hubPositions.length).fill(1));
    const colorObj = useMemo(() => new THREE.Color(), []);

    // Track drifted positions for labels
    const driftedPositions = useRef<THREE.Vector3[]>(hubPositions.map((p) => p.clone()));

    // Sync external ref so YouAreHereMarker can track positions
    useEffect(() => {
        if (driftedPositionsRef) {
            driftedPositionsRef.current = driftedPositions.current;
        }
    });

    // Apply per-instance colors when categoryColors or highlight change
    useEffect(() => {
        if (!meshRef.current) return;
        const dimColor = new THREE.Color('#cccccc');
        for (let i = 0; i < hubPositions.length; i++) {
            const c = i === highlightedHub ? HIGHLIGHT_COLOR : (categoryColors?.[i] || nodeColor);
            colorObj.set(c);
            // Dim non-highlighted hubs when sidebar filter is active
            if (highlightedHubIndex != null && i !== highlightedHubIndex) {
                colorObj.lerp(dimColor, 0.85);
            }
            meshRef.current.setColorAt(i, colorObj);
        }
        if (meshRef.current.instanceColor) {
            meshRef.current.instanceColor.needsUpdate = true;
        }
    }, [categoryColors, nodeColor, hubPositions.length, colorObj, highlightedHub, highlightedHubIndex]);

    useFrame((state) => {
        if (!meshRef.current) return;
        const time = state.clock.getElapsedTime();

        for (let i = 0; i < hubPositions.length; i++) {
            const pos = hubPositions[i];
            const isActive = stage === 'calling' || stage === 'paying';
            const isHighlighted = i === highlightedHub;

            // Organic breathing pulse
            const breathe = 1 + Math.sin(time * 0.8 + i * 1.7) * 0.08;
            let targetScale = isActive ? 1.3 * breathe : breathe;

            // Highlighted node: 2.5x scale with gentle pulse
            if (isHighlighted) {
                const pulse = 1 + Math.sin(time * Math.PI) * 0.05; // 0.95–1.05 over ~2s
                targetScale = 2.5 * pulse;
            }

            scaleRef.current[i] += (targetScale - scaleRef.current[i]) * 0.05;

            const s = scaleRef.current[i];
            dummy.position.copy(pos);
            // Gentle drift
            const dx = Math.sin(time * 0.15 + i * 2.1) * 0.3;
            const dy = Math.cos(time * 0.12 + i * 1.4) * 0.2;
            const dz = Math.sin(time * 0.1 + i * 3.3) * 0.25;
            dummy.position.x += dx;
            dummy.position.y += dy;
            dummy.position.z += dz;
            dummy.scale.setScalar(s);
            dummy.updateMatrix();
            meshRef.current.setMatrixAt(i, dummy.matrix);

            // Update drifted positions for labels
            if (driftedPositions.current[i]) {
                driftedPositions.current[i].set(pos.x + dx, pos.y + dy, pos.z + dz);
            }
        }
        meshRef.current.instanceMatrix.needsUpdate = true;

        // Re-apply highlight color each frame (since color might drift with other effects)
        if (highlightedHub != null && meshRef.current) {
            colorObj.set(HIGHLIGHT_COLOR);
            meshRef.current.setColorAt(highlightedHub, colorObj);
            if (meshRef.current.instanceColor) {
                meshRef.current.instanceColor.needsUpdate = true;
            }
        }
    });

    // Labels for nodes that have an API endpoint name
    const labels = useMemo(() => {
        return hubPositions.map((_, i) => {
            if (i < apiEndpoints.length) {
                return extractNodeLabel(apiEndpoints[i]);
            }
            return null;
        });
    }, [hubPositions, apiEndpoints]);

    return (
        <>
            <instancedMesh ref={meshRef} args={[undefined, undefined, hubPositions.length]}>
                <sphereGeometry args={[0.5, 24, 24]} />
                <meshBasicMaterial color={nodeColor} />
            </instancedMesh>

            {/* Floating HTML labels (only for named nodes) */}
            {labels.map((label, i) =>
                label ? (
                    <NodeLabel
                        color={categoryColors?.[i] || nodeColor}
                        key={`label-${i}`}
                        label={label}
                        position={hubPositions[i]}
                        positionRef={driftedPositions}
                        index={i}
                    />
                ) : null,
            )}
        </>
    );
});

PrimaryNodes.displayName = 'PrimaryNodes';

// ============================================================================
// Node Label (Html overlay that follows drifting node)
// ============================================================================

interface NodeLabelProps {
    color: string;
    index: number;
    label: string;
    position: THREE.Vector3;
    positionRef: React.MutableRefObject<THREE.Vector3[]>;
}

const NodeLabel = memo<NodeLabelProps>(({ label, position, positionRef, index, color }) => {
    const groupRef = useRef<THREE.Group>(null);

    useFrame(() => {
        if (!groupRef.current || !positionRef.current[index]) return;
        const p = positionRef.current[index];
        groupRef.current.position.set(p.x, p.y + 1.2, p.z);
    });

    return (
        <group ref={groupRef} position={[position.x, position.y + 1.2, position.z]}>
            <Html center distanceFactor={25} zIndexRange={[10, 0]}>
                <div
                    style={{
                        alignItems: 'center',
                        background: 'rgba(0,0,0,0.75)',
                        border: `1px solid ${color}40`,
                        borderRadius: 6,
                        color: NETWORK_COLORS.text,
                        display: 'flex',
                        fontFamily: 'monospace',
                        fontSize: 10,
                        fontWeight: 600,
                        gap: 4,
                        letterSpacing: '0.05em',
                        padding: '3px 8px',
                        pointerEvents: 'none',
                        textTransform: 'uppercase',
                        whiteSpace: 'nowrap',
                    }}
                >
                    <span style={{ color, fontSize: 8 }}>●</span>
                    {label}
                </div>
            </Html>
        </group>
    );
});

NodeLabel.displayName = 'NodeLabel';

// ============================================================================
// Particle Swarm (thousands of dots using Points + BufferGeometry)
// ============================================================================

interface ParticleSwarmProps {
    /** Hub index to highlight (null = no filter) */
    highlightedHubIndex?: number | null;
    hubPositions: THREE.Vector3[];
    mouseActive: React.MutableRefObject<boolean>;
    mouseWorldPos: React.MutableRefObject<THREE.Vector3>;
    /** Override particle color (defaults to NETWORK_COLORS.particle) */
    particleColor?: string;
    stage: VortexStage;
    /** Set of visible hub indices (all if undefined) */
    visibleHubs?: Set<number>;
}

const ParticleSwarm = memo<ParticleSwarmProps>(({ hubPositions, stage, mouseWorldPos, mouseActive, particleColor, visibleHubs, highlightedHubIndex }) => {
    const totalParticles = hubPositions.length * NETWORK_CONFIG.PARTICLES_PER_HUB;
    const pointsRef = useRef<THREE.Points>(null);

    // Resolved base color
    const baseColor = useMemo(() => new THREE.Color(particleColor || NETWORK_COLORS.particle), [particleColor]);

    // Per-particle state arrays
    const particleState = useMemo(() => {
        const homePositions = new Float32Array(totalParticles * 3);
        const currentPositions = new Float32Array(totalParticles * 3);
        const velocities = new Float32Array(totalParticles * 3);
        const sizes = new Float32Array(totalParticles);
        const hubIndices = new Int32Array(totalParticles);
        const orbitSpeeds = new Float32Array(totalParticles);
        const orbitPhases = new Float32Array(totalParticles);
        const orbitTilts = new Float32Array(totalParticles);
        const colors = new Float32Array(totalParticles * 3);

        for (let h = 0; h < hubPositions.length; h++) {
            const hub = hubPositions[h];
            for (let p = 0; p < NETWORK_CONFIG.PARTICLES_PER_HUB; p++) {
                const i = h * NETWORK_CONFIG.PARTICLES_PER_HUB + p;
                const i3 = i * 3;

                // Random position in a sphere around the hub
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos(2 * Math.random() - 1);
                const r = NETWORK_CONFIG.CLUSTER_RADIUS * (0.3 + Math.random() * 0.7);

                const x = hub.x + r * Math.sin(phi) * Math.cos(theta);
                const y = hub.y + r * Math.sin(phi) * Math.sin(theta);
                const z = hub.z + r * Math.cos(phi);

                homePositions[i3] = x;
                homePositions[i3 + 1] = y;
                homePositions[i3 + 2] = z;
                currentPositions[i3] = x;
                currentPositions[i3 + 1] = y;
                currentPositions[i3 + 2] = z;

                sizes[i] = 0.8 + Math.random() * 2.5;
                hubIndices[i] = h;
                orbitSpeeds[i] = 0.2 + Math.random() * 0.6;
                orbitPhases[i] = Math.random() * Math.PI * 2;
                orbitTilts[i] = (Math.random() - 0.5) * Math.PI * 0.4;

                // Initialize colors to base particle color
                colors[i3] = baseColor.r;
                colors[i3 + 1] = baseColor.g;
                colors[i3 + 2] = baseColor.b;
            }
        }

        return {
            colors,
            currentPositions,
            homePositions,
            hubIndices,
            orbitPhases,
            orbitSpeeds,
            orbitTilts,
            sizes,
            velocities,
        };
    }, [hubPositions, totalParticles, baseColor]);

    // Update particle colors when highlight filter changes
    useEffect(() => {
        if (!pointsRef.current) return;
        const { colors, hubIndices } = particleState;
        const dimColor = new THREE.Color('#ddd');
        const bright = baseColor;
        for (let i = 0; i < totalParticles; i++) {
            const i3 = i * 3;
            if (highlightedHubIndex != null && hubIndices[i] !== highlightedHubIndex) {
                colors[i3] = dimColor.r;
                colors[i3 + 1] = dimColor.g;
                colors[i3 + 2] = dimColor.b;
            } else {
                colors[i3] = bright.r;
                colors[i3 + 1] = bright.g;
                colors[i3 + 2] = bright.b;
            }
        }
        const colorAttr = pointsRef.current.geometry.getAttribute('color') as THREE.BufferAttribute;
        if (colorAttr) colorAttr.needsUpdate = true;
    }, [highlightedHubIndex, particleState, totalParticles, baseColor]);

    useFrame((state) => {
        if (!pointsRef.current) return;
        const time = state.clock.getElapsedTime();
        const dt = Math.min(state.clock.getDelta(), 0.05); // Clamp to avoid spiral on tab switch
        const posAttr = pointsRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;
        const positions = posAttr.array as Float32Array;

        const {
            homePositions,
            velocities,
            hubIndices,
            orbitSpeeds,
            orbitPhases,
            orbitTilts,
        } = particleState;

        const stageIntensity = stage === 'calling' || stage === 'paying' ? 2.0
            : stage === 'receiving' ? 1.5
            : 1.0;

        // Framerate-independent damping: damping^(dt*60) normalizes to 60fps reference
        const frameDamping = Math.pow(NETWORK_CONFIG.DAMPING, dt * 60);

        for (let i = 0; i < totalParticles; i++) {
            const i3 = i * 3;
            const hubIdx = hubIndices[i];

            // Skip particles belonging to hidden hubs
            if (visibleHubs && !visibleHubs.has(hubIdx)) continue;

            const hub = hubPositions[hubIdx];

            // Update home position (orbiting around hub)
            const speed = orbitSpeeds[i] * NETWORK_CONFIG.DRIFT_SPEED * stageIntensity;
            const phase = orbitPhases[i] + time * speed;
            const tilt = orbitTilts[i];
            const homeR = NETWORK_CONFIG.CLUSTER_RADIUS * (0.4 + 0.6 * ((Math.sin(phase * 0.3) + 1) / 2));

            // Orbit in tilted plane
            const hx = hub.x + homeR * Math.cos(phase) * Math.cos(tilt);
            const hy = hub.y + homeR * Math.sin(phase) * 0.7;
            const hz = hub.z + homeR * Math.sin(phase) * Math.sin(tilt) + homeR * Math.cos(phase) * Math.sin(tilt) * 0.3;

            // Add gentle hub drift
            const driftX = Math.sin(time * 0.15 + hubIdx * 2.1) * 0.3;
            const driftY = Math.cos(time * 0.12 + hubIdx * 1.4) * 0.2;
            const driftZ = Math.sin(time * 0.1 + hubIdx * 3.3) * 0.25;

            homePositions[i3] = hx + driftX;
            homePositions[i3 + 1] = hy + driftY;
            homePositions[i3 + 2] = hz + driftZ;

            // Spring force toward home (Hooke's law: F = -k * displacement)
            const dx = homePositions[i3] - positions[i3];
            const dy = homePositions[i3 + 1] - positions[i3 + 1];
            const dz = homePositions[i3 + 2] - positions[i3 + 2];

            velocities[i3] += dx * NETWORK_CONFIG.SPRING_K * dt;
            velocities[i3 + 1] += dy * NETWORK_CONFIG.SPRING_K * dt;
            velocities[i3 + 2] += dz * NETWORK_CONFIG.SPRING_K * dt;

            // Mouse repulsion
            if (mouseActive.current) {
                const mx = positions[i3] - mouseWorldPos.current.x;
                const my = positions[i3 + 1] - mouseWorldPos.current.y;
                const mz = positions[i3 + 2] - mouseWorldPos.current.z;
                const mDist = Math.sqrt(mx * mx + my * my + mz * mz);

                if (mDist < NETWORK_CONFIG.REPULSION_RADIUS && mDist > 0.1) {
                    const force = NETWORK_CONFIG.REPULSION_STRENGTH / (mDist * mDist);
                    velocities[i3] += (mx / mDist) * force * dt;
                    velocities[i3 + 1] += (my / mDist) * force * dt;
                    velocities[i3 + 2] += (mz / mDist) * force * dt;
                }
            }

            // Apply framerate-independent damping
            velocities[i3] *= frameDamping;
            velocities[i3 + 1] *= frameDamping;
            velocities[i3 + 2] *= frameDamping;

            // Integrate
            positions[i3] += velocities[i3];
            positions[i3 + 1] += velocities[i3 + 1];
            positions[i3 + 2] += velocities[i3 + 2];
        }

        posAttr.needsUpdate = true;
    });

    return (
        <points ref={pointsRef}>
            <bufferGeometry>
                <bufferAttribute
                    args={[particleState.currentPositions, 3]}
                    attach="attributes-position"
                    count={totalParticles}
                    itemSize={3}
                    usage={THREE.DynamicDrawUsage}
                />
                <bufferAttribute
                    args={[particleState.sizes, 1]}
                    attach="attributes-size"
                    count={totalParticles}
                    itemSize={1}
                />
                <bufferAttribute
                    args={[particleState.colors, 3]}
                    attach="attributes-color"
                    count={totalParticles}
                    itemSize={3}
                    usage={THREE.DynamicDrawUsage}
                />
            </bufferGeometry>
            <pointsMaterial
                blending={THREE.AdditiveBlending}
                depthWrite={false}
                opacity={highlightedHubIndex != null ? 0.5 : 0.7}
                size={0.08}
                sizeAttenuation
                transparent
                vertexColors
            />
        </points>
    );
});

ParticleSwarm.displayName = 'ParticleSwarm';

// ============================================================================
// Connection Lines (hub tethers + proximity web)
// ============================================================================

interface ConnectionLinesProps {
    /** Hub index to highlight (null = no filter) */
    highlightedHubIndex?: number | null;
    hubPositions: THREE.Vector3[];
    stage: VortexStage;
}

const ConnectionLines = memo<ConnectionLinesProps>(({ hubPositions, stage, highlightedHubIndex }) => {
    const lineRef = useRef<THREE.LineSegments>(null);
    const pointsCacheRef = useRef<THREE.Points | null>(null);
    const spatialHash = useMemo(() => new SpatialHash(NETWORK_CONFIG.PROXIMITY_THRESHOLD), []);

    // Pre-allocate line buffer (max possible lines)
    const maxLines = NETWORK_CONFIG.MAX_PROXIMITY_LINES + hubPositions.length * NETWORK_CONFIG.TETHER_LINES_PER_HUB;
    const linePositions = useMemo(() => new Float32Array(maxLines * 6), [maxLines]);

    // We need access to the particle positions from the parent scene
    // We'll use a group ref approach — find Points in parent
    const groupRef = useRef<THREE.Group>(null);

    useFrame(() => {
        if (!lineRef.current || !groupRef.current) return;

        // Cache the Points object reference (avoid per-frame scene traversal)
        if (!pointsCacheRef.current) {
            const parent = groupRef.current.parent;
            if (!parent) return;
            parent.traverse((child) => {
                if (child instanceof THREE.Points && !pointsCacheRef.current) {
                    pointsCacheRef.current = child;
                }
            });
        }
        const pointsObj = pointsCacheRef.current;
        if (!pointsObj) return;

        const posAttr = (pointsObj as THREE.Points).geometry.getAttribute('position') as THREE.BufferAttribute;
        if (!posAttr) return;
        const positions = posAttr.array as Float32Array;
        const totalParticles = posAttr.count;

        let lineIdx = 0;
        const maxIdx = maxLines * 6;

        // --- Hub tether lines ---
        const particlesPerHub = NETWORK_CONFIG.PARTICLES_PER_HUB;
        for (let h = 0; h < hubPositions.length; h++) {
            const hub = hubPositions[h];
            const startP = h * particlesPerHub;
            const step = Math.max(1, Math.floor(particlesPerHub / NETWORK_CONFIG.TETHER_LINES_PER_HUB));

            for (let p = startP; p < startP + particlesPerHub && lineIdx < maxIdx - 5; p += step) {
                const p3 = p * 3;
                linePositions[lineIdx++] = hub.x;
                linePositions[lineIdx++] = hub.y;
                linePositions[lineIdx++] = hub.z;
                linePositions[lineIdx++] = positions[p3];
                linePositions[lineIdx++] = positions[p3 + 1];
                linePositions[lineIdx++] = positions[p3 + 2];
            }
        }

        // --- Proximity web lines (using spatial hash) ---
        spatialHash.clear();

        // Sample a subset for performance (every 4th particle)
        const sampleStep = 4;
        for (let i = 0; i < totalParticles; i += sampleStep) {
            const i3 = i * 3;
            spatialHash.insert(i, positions[i3], positions[i3 + 1], positions[i3 + 2]);
        }

        let proximityCount = 0;
        const threshold2 = NETWORK_CONFIG.PROXIMITY_THRESHOLD * NETWORK_CONFIG.PROXIMITY_THRESHOLD;

        for (let i = 0; i < totalParticles && proximityCount < NETWORK_CONFIG.MAX_PROXIMITY_LINES; i += sampleStep) {
            const i3 = i * 3;
            const px = positions[i3];
            const py = positions[i3 + 1];
            const pz = positions[i3 + 2];
            const neighbors = spatialHash.queryNear(px, py, pz);

            for (const j of neighbors) {
                if (j <= i || lineIdx >= maxIdx - 5) continue;
                const j3 = j * 3;
                const ddx = px - positions[j3];
                const ddy = py - positions[j3 + 1];
                const ddz = pz - positions[j3 + 2];
                const dist2 = ddx * ddx + ddy * ddy + ddz * ddz;

                if (dist2 < threshold2) {
                    linePositions[lineIdx++] = px;
                    linePositions[lineIdx++] = py;
                    linePositions[lineIdx++] = pz;
                    linePositions[lineIdx++] = positions[j3];
                    linePositions[lineIdx++] = positions[j3 + 1];
                    linePositions[lineIdx++] = positions[j3 + 2];
                    proximityCount++;
                }
            }
        }

        // Update geometry
        const geom = lineRef.current.geometry;
        const attr = geom.getAttribute('position') as THREE.BufferAttribute;
        (attr.array as Float32Array).set(linePositions);
        attr.needsUpdate = true;
        geom.setDrawRange(0, lineIdx / 3);
    });

    const baseOpacity = stage === 'calling' || stage === 'paying' ? 0.25 : 0.1;
    const stageOpacity = highlightedHubIndex != null ? baseOpacity * 0.2 : baseOpacity;
    const opacity = highlightedHubIndex != null ? stageOpacity * 0.25 : stageOpacity;

    return (
        <group ref={groupRef}>
            <lineSegments ref={lineRef}>
                <bufferGeometry>
                    <bufferAttribute
                        args={[linePositions, 3]}
                        attach="attributes-position"
                        count={maxLines * 2}
                        itemSize={3}
                        usage={THREE.DynamicDrawUsage}
                    />
                </bufferGeometry>
                <lineBasicMaterial
                    blending={THREE.AdditiveBlending}
                    color={NETWORK_COLORS.line}
                    opacity={opacity}
                    transparent
                />
            </lineSegments>
        </group>
    );
});

ConnectionLines.displayName = 'ConnectionLines';

// ============================================================================
// Payment Pulse Effect (gold ripple during paying stage)
// ============================================================================

interface PaymentPulseProps {
    hubPositions: THREE.Vector3[];
    stage: VortexStage;
}

const PaymentPulse = memo<PaymentPulseProps>(({ hubPositions, stage }) => {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);

    const pulseData = useMemo(() => {
        return hubPositions.map((_, i) => ({
            delay: i * 0.15,
            speed: 1.5 + Math.random() * 0.5,
        }));
    }, [hubPositions]);

    useFrame((state) => {
        if (!meshRef.current) return;
        const time = state.clock.getElapsedTime();
        const isPaying = stage === 'paying' || stage === 'calling';

        for (let i = 0; i < hubPositions.length; i++) {
            const hub = hubPositions[i];
            const pd = pulseData[i];

            if (isPaying) {
                const t = ((time - pd.delay) * pd.speed) % 2;
                const scale = t > 0 ? t * 3 : 0;

                dummy.position.set(
                    hub.x + Math.sin(time * 0.15 + i * 2.1) * 0.3,
                    hub.y + Math.cos(time * 0.12 + i * 1.4) * 0.2,
                    hub.z + Math.sin(time * 0.1 + i * 3.3) * 0.25,
                );
                dummy.scale.setScalar(scale);
            } else {
                dummy.position.set(0, -100, 0); // hide off-screen
                dummy.scale.setScalar(0);
            }
            dummy.updateMatrix();
            meshRef.current.setMatrixAt(i, dummy.matrix);
        }
        meshRef.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, hubPositions.length]}>
            <ringGeometry args={[0.8, 1, 32]} />
            <meshBasicMaterial
                blending={THREE.AdditiveBlending}
                color={NETWORK_COLORS.paymentPulse}
                opacity={0.3}
                side={THREE.DoubleSide}
                transparent
            />
        </instancedMesh>
    );
});

PaymentPulse.displayName = 'PaymentPulse';

// ============================================================================
// Camera Controller (slow orbit + mouse influence)
// ============================================================================

interface CameraControllerProps {
    animationRef: React.MutableRefObject<CameraAnimation | null>;
    cameraRef: React.MutableRefObject<THREE.PerspectiveCamera | null>;
    orbitEnabledRef: React.MutableRefObject<boolean>;
}

const CameraController = memo<CameraControllerProps>(({ animationRef, cameraRef, orbitEnabledRef }) => {
    const { camera } = useThree();

    useEffect(() => {
        cameraRef.current = camera as THREE.PerspectiveCamera;
        return () => {
            cameraRef.current = null;
        };
    }, [camera, cameraRef]);

    useFrame((state) => {
        const activeAnimation = animationRef.current;
        if (activeAnimation) {
            const now = performance.now();
            const t = Math.min(1, (now - activeAnimation.startedAt) / activeAnimation.durationMs);
            const eased = 1 - Math.pow(1 - t, 3);

            camera.position.lerpVectors(activeAnimation.fromPos, activeAnimation.toPos, eased);
            const lookAt = new THREE.Vector3().lerpVectors(activeAnimation.fromLookAt, activeAnimation.toLookAt, eased);
            camera.lookAt(lookAt);

            if (t >= 1) {
                animationRef.current = null;
                activeAnimation.onDone?.();
            }
            return;
        }

        if (!orbitEnabledRef.current) return;

        const time = state.clock.getElapsedTime();
        const radius = 35;
        const speed = NETWORK_CONFIG.CAMERA_ORBIT_SPEED;

        camera.position.x = Math.sin(time * speed) * radius;
        camera.position.y = Math.sin(time * speed * 0.3) * 5 + 3;
        camera.position.z = Math.cos(time * speed) * radius;
        camera.lookAt(0, 0, 0);
    });

    return null;
});

CameraController.displayName = 'CameraController';

// ============================================================================
// Mouse Tracker (raycasts mouse onto invisible plane)
// ============================================================================

interface MouseTrackerProps {
    mouseWorldPos: React.MutableRefObject<THREE.Vector3>;
    mouseActive: React.MutableRefObject<boolean>;
}

const MouseTracker = memo<MouseTrackerProps>(({ mouseWorldPos, mouseActive }) => {
    const { camera, gl } = useThree();
    const raycaster = useMemo(() => new THREE.Raycaster(), []);
    const mouseNDC = useMemo(() => new THREE.Vector2(), []);
    const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), []);
    const intersection = useMemo(() => new THREE.Vector3(), []);
    const camDir = useMemo(() => new THREE.Vector3(), []);

    useEffect(() => {
        const canvas = gl.domElement;

        let timeoutId: ReturnType<typeof setTimeout>;

        const onMouseMove = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            mouseNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            mouseNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

            raycaster.setFromCamera(mouseNDC, camera);
            // Project onto a plane facing the camera
            camera.getWorldDirection(camDir);
            plane.normal.copy(camDir);
            plane.constant = 0;

            if (raycaster.ray.intersectPlane(plane, intersection)) {
                mouseWorldPos.current.copy(intersection);
            }
            mouseActive.current = true;

            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                mouseActive.current = false;
            }, 200);
        };

        const onMouseLeave = () => {
            mouseActive.current = false;
        };

        canvas.addEventListener('mousemove', onMouseMove);
        canvas.addEventListener('mouseleave', onMouseLeave);
        return () => {
            canvas.removeEventListener('mousemove', onMouseMove);
            canvas.removeEventListener('mouseleave', onMouseLeave);
            clearTimeout(timeoutId);
        };
    }, [camera, gl, mouseNDC, mouseWorldPos, mouseActive, plane, raycaster, intersection, camDir]);

    return null;
});

MouseTracker.displayName = 'MouseTracker';

// ============================================================================
// Timeline Event Labels (human-readable for scrubber)
// ============================================================================

interface TimelineEvent {
    color: string;
    icon: string;
    label: string;
    stage: VortexStage;
    timestamp: number;
    type: string;
}

function buildTimeline(flow: X402FlowTrace | null): TimelineEvent[] {
    if (!flow || !flow.events?.length) return [];

    return flow.events.map((evt) => {
        switch (evt.type) {
            case 'api_call_start': return {
                color: '#6080ff',
                icon: '→',
                label: `Calling ${extractDomain(evt.apiUrl)}`,
                stage: 'calling' as VortexStage,
                timestamp: evt.timestamp,
                type: evt.type,
            };
            case 'payment_required': return {
                color: '#ff6060',
                icon: '⚡',
                label: `402 — Payment Required`,
                stage: 'calling' as VortexStage,
                timestamp: evt.timestamp,
                type: evt.type,
            };
            case 'payment_signing': return {
                color: '#f5a623',
                icon: '🔐',
                label: `Signing EIP-712`,
                stage: 'paying' as VortexStage,
                timestamp: evt.timestamp,
                type: evt.type,
            };
            case 'payment_sent': return {
                color: '#f5a623',
                icon: '💰',
                label: `${evt.amount || ''} USDC Sent`,
                stage: 'paying' as VortexStage,
                timestamp: evt.timestamp,
                type: evt.type,
            };
            case 'api_call_complete': return {
                color: '#22c55e',
                icon: '✓',
                label: `Data from ${extractDomain(evt.apiUrl)}`,
                stage: 'receiving' as VortexStage,
                timestamp: evt.timestamp,
                type: evt.type,
            };
            case 'payment_failed': return {
                color: '#ff4040',
                icon: '✗',
                label: `Payment Failed`,
                stage: 'calling' as VortexStage,
                timestamp: evt.timestamp,
                type: evt.type,
            };
            case 'budget_exceeded': return {
                color: '#ff4040',
                icon: '⚠',
                label: `Budget Exceeded`,
                stage: 'idle' as VortexStage,
                timestamp: evt.timestamp,
                type: evt.type,
            };
            case 'flow_complete': return {
                color: '#22c55e',
                icon: '●',
                label: `Complete — $${evt.amount || '0'}`,
                stage: 'complete' as VortexStage,
                timestamp: evt.timestamp,
                type: evt.type,
            };
            default: return {
                color: '#6080ff',
                icon: '·',
                label: evt.type,
                stage: 'idle' as VortexStage,
                timestamp: evt.timestamp,
                type: evt.type,
            };
        }
    });
}

function extractDomain(url: string): string {
    try {
        return new URL(url).hostname.replace('www.', '');
    } catch {
        return url.slice(0, 30);
    }
}

// ============================================================================
// Timeline Scrubber (Giza-style top bar)
// ============================================================================

interface TimelineScrubberProps {
    currentIndex: number;
    isPlaying: boolean;
    onPause: () => void;
    onPlay: () => void;
    onScrub: (index: number) => void;
    timeline: TimelineEvent[];
}

const TimelineScrubber = memo<TimelineScrubberProps>(
    ({ timeline, currentIndex, isPlaying, onPlay, onPause, onScrub }) => {
        if (timeline.length === 0) return null;

        const current = timeline[currentIndex];

        return (
            <div
                style={{
                    alignItems: 'center',
                    display: 'flex',
                    gap: 12,
                    left: 0,
                    padding: '10px 16px',
                    position: 'absolute',
                    right: 0,
                    top: 0,
                    zIndex: 10,
                }}
            >
                {/* Play/Pause button */}
                <button
                    onClick={isPlaying ? onPause : onPlay}
                    style={{
                        alignItems: 'center',
                        background: NETWORK_COLORS.surface,
                        border: `1px solid ${NETWORK_COLORS.surfaceBorder}`,
                        borderRadius: 8,
                        color: NETWORK_COLORS.text,
                        cursor: 'pointer',
                        display: 'flex',
                        flexShrink: 0,
                        height: 32,
                        justifyContent: 'center',
                        width: 32,
                    }}
                >
                    {isPlaying ? '⏸' : '▶'}
                </button>

                {/* Tick marks / scrubber track */}
                <div
                    style={{
                        alignItems: 'center',
                        display: 'flex',
                        flex: 1,
                        gap: 2,
                        height: 32,
                        position: 'relative',
                    }}
                >
                    {timeline.map((evt, i) => (
                        <button
                            key={`${evt.type}-${i}`}
                            onClick={() => onScrub(i)}
                            style={{
                                background: i <= currentIndex ? evt.color : NETWORK_COLORS.surfaceBorder,
                                border: 'none',
                                borderRadius: 2,
                                cursor: 'pointer',
                                flex: 1,
                                height: i === currentIndex ? 24 : 16,
                                minWidth: 4,
                                opacity: i <= currentIndex ? 1 : 0.4,
                                transition: 'all 0.2s ease',
                            }}
                            title={evt.label}
                        />
                    ))}
                </div>

                {/* Current event label */}
                {current && (
                    <div
                        style={{
                            alignItems: 'center',
                            background: 'rgba(0,0,0,0.6)',
                            border: `1px solid ${current.color}40`,
                            borderRadius: 8,
                            color: current.color,
                            display: 'flex',
                            flexShrink: 0,
                            fontFamily: 'monospace',
                            fontSize: 11,
                            gap: 6,
                            padding: '4px 10px',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        <span>{current.icon}</span>
                        <span>{current.label}</span>
                    </div>
                )}
            </div>
        );
    },
);

TimelineScrubber.displayName = 'TimelineScrubber';

// ============================================================================
// Stats HUD (bottom bar with agent/volume/tx stats)
// ============================================================================

interface StatsHUDProps {
    currentIndex: number;
    flow: X402FlowTrace | null;
    timeline: TimelineEvent[];
}

const StatsHUD = memo<StatsHUDProps>(({ flow, timeline, currentIndex }) => {
    // Compute stats up to the current scrubber position
    const visibleEvents = timeline.slice(0, currentIndex + 1);
    const paymentCount = visibleEvents.filter((e) => e.type === 'payment_sent').length;
    const volume = flow?.apiCalls
        ?.slice(0, Math.ceil((currentIndex + 1) / 2))
        .reduce((sum, c) => sum + Number.parseFloat(c.amountPaid || '0'), 0)
        .toFixed(4) || '0.0000';

    const domains = new Set(
        visibleEvents
            .filter((e) => e.type === 'api_call_start')
            .map((e) => e.label.replace('Calling ', '')),
    );

    const current = timeline[currentIndex];

    return (
        <>
            <StatChip label="Nodes" value={String(domains.size || '—')} />
            <StatChip label="Volume" value={`$${volume}`} />
            <StatChip label="Payments" value={String(paymentCount)} />
            {flow?.agentAddress && (
                <StatChip label="Agent" value={`${flow.agentAddress.slice(0, 6)}...${flow.agentAddress.slice(-4)}`} />
            )}
            <div style={{ flex: 1 }} />
            <div
                style={{
                    color: NETWORK_COLORS.textFaint,
                    fontFamily: 'monospace',
                    fontSize: 10,
                    textTransform: 'uppercase',
                }}
            >
                {current ? `pump · ${current.stage}` : 'PumpFun Network'}
            </div>
        </>
    );
});

StatsHUD.displayName = 'StatsHUD';

const StatChip = memo<{ label: string; value: string }>(({ label, value }) => (
    <div style={{ alignItems: 'baseline', display: 'flex', gap: 8 }}>
        <span
            style={{
                color: NETWORK_COLORS.textFaint,
                fontFamily: 'monospace',
                fontSize: 10,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
            }}
        >
            {label}
        </span>
        <span
            style={{
                color: NETWORK_COLORS.text,
                fontFamily: 'monospace',
                fontSize: 14,
                fontWeight: 600,
            }}
        >
            {value}
        </span>
    </div>
));

StatChip.displayName = 'StatChip';

// ============================================================================
// Network Scene (assembles all sub-components)
// ============================================================================

interface NetworkSceneProps {
    apiEndpoints: string[];
    animationRef: React.MutableRefObject<CameraAnimation | null>;
    /** Per-hub colors (falls back to nodeColor) */
    cameraRef: React.MutableRefObject<THREE.PerspectiveCamera | null>;
    categoryColors?: string[];
    /** Ref to drifted node positions for journey overlay */
    driftedPositionsRef?: React.MutableRefObject<THREE.Vector3[]>;
    /** Hub index to highlight (null = no filter) */
    highlightedHubIndex?: number | null;
    hubPositions: THREE.Vector3[];
    mouseActive: React.MutableRefObject<boolean>;
    mouseWorldPos: React.MutableRefObject<THREE.Vector3>;
    nodeColor: string;
    /** Called when user dismisses highlight */
    onDismissHighlight?: () => void;
    orbitEnabledRef: React.MutableRefObject<boolean>;
    stage: VortexStage;
    /** Color for user/particle elements */
    userColor: string;
    /** Set of hub indices that are visible (all if undefined) */
    visibleHubs?: Set<number>;
}

const NetworkScene = memo<NetworkSceneProps>(
    ({
        hubPositions,
        stage,
        apiEndpoints,
        categoryColors,
        driftedPositionsRef,
        highlightedHubIndex,
        mouseWorldPos,
        mouseActive,
        nodeColor,
        userColor,
        visibleHubs,
        animationRef,
        orbitEnabledRef,
        cameraRef,
    }) => {
        return (
            <>
                <CameraController
                    animationRef={animationRef}
                    cameraRef={cameraRef}
                    orbitEnabledRef={orbitEnabledRef}
                />
                <MouseTracker mouseActive={mouseActive} mouseWorldPos={mouseWorldPos} />

                {/* Thick spokes from central origin to protocol hubs */}
                <OriginSpokes
                    highlightedHubIndex={highlightedHubIndex}
                    hubPositions={hubPositions}
                    nodeColor={nodeColor}
                    stage={stage}
                />

                <PrimaryNodes
                    apiEndpoints={apiEndpoints}
                    categoryColors={categoryColors}
                    driftedPositionsRef={driftedPositionsRef}
                    highlightedHubIndex={highlightedHubIndex}
                    hubPositions={hubPositions}
                    nodeColor={nodeColor}
                    stage={stage}
                />

                <ParticleSwarm
                    highlightedHubIndex={highlightedHubIndex}
                    hubPositions={hubPositions}
                    mouseActive={mouseActive}
                    mouseWorldPos={mouseWorldPos}
                    particleColor={userColor}
                    stage={stage}
                    visibleHubs={visibleHubs}
                />

                <ConnectionLines
                    highlightedHubIndex={highlightedHubIndex}
                    hubPositions={hubPositions}
                    stage={stage}
                />

                <PaymentPulse hubPositions={hubPositions} stage={stage} />
            </>
        );
    },
);

NetworkScene.displayName = 'NetworkScene';

// ============================================================================
// Customizable color theme (for snapshot editor)
// ============================================================================

export interface X402NetworkTheme {
    /** Background color */
    bg: string;
    /** Node/protocol color */
    nodeColor: string;
    /** User/agent color */
    userColor: string;
}

const DEFAULT_THEME: X402NetworkTheme = {
    bg: NETWORK_COLORS.bg,
    nodeColor: '#1a1a1a',
    userColor: '#1a1a1a',
};

// ============================================================================
// Sidebar Protocol Filters
// ============================================================================

interface SidebarFiltersProps {
    apiEndpoints: string[];
    hiddenNodes: Set<number>;
    onToggle: (index: number) => void;
}

const SidebarFilters = memo<SidebarFiltersProps>(({ apiEndpoints, hiddenNodes, onToggle }) => {
    if (apiEndpoints.length === 0) return null;

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                left: 12,
                position: 'absolute',
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 10,
            }}
        >
            {apiEndpoints.map((endpoint, i) => {
                const label = extractNodeLabel(endpoint);
                const isHidden = hiddenNodes.has(i + 1); // +1 because index 0 is origin
                return (
                    <button
                        key={endpoint}
                        onClick={() => onToggle(i + 1)}
                        style={{
                            alignItems: 'center',
                            background: isHidden ? 'rgba(180, 180, 210, 0.03)' : NETWORK_COLORS.surface,
                            border: `1px solid ${NETWORK_COLORS.surfaceBorder}`,
                            borderRadius: 10,
                            color: isHidden ? NETWORK_COLORS.textFaint : NETWORK_COLORS.textMuted,
                            cursor: 'pointer',
                            display: 'flex',
                            fontFamily: 'monospace',
                            fontSize: 10,
                            gap: 6,
                            justifyContent: 'center',
                            padding: '6px 10px',
                            transition: 'all 0.2s ease',
                            whiteSpace: 'nowrap',
                        }}
                        title={`Toggle ${label}`}
                    >
                        <span style={{ fontSize: 8, opacity: isHidden ? 0.3 : 1 }}>●</span>
                        {label}
                    </button>
                );
            })}
        </div>
    );
});

SidebarFilters.displayName = 'SidebarFilters';

// ============================================================================
// Address Search Bar
// ============================================================================

interface AddressSearchProps {
    /** Highlighted address (shows truncated in input when set) */
    highlightedAddress?: string | null;
    /** Called when dismiss (×) is clicked to clear the highlight */
    onDismiss?: () => void;
    onSearch: (address: string) => void;
}

const AddressSearch = memo<AddressSearchProps>(({ onSearch, highlightedAddress, onDismiss }) => {
    const [value, setValue] = useState('');

    // Sync controlled value when highlight changes
    useEffect(() => {
        if (highlightedAddress) {
            setValue(highlightedAddress);
        }
    }, [highlightedAddress]);

    const handleDismiss = useCallback(() => {
        setValue('');
        onDismiss?.();
    }, [onDismiss]);

    return (
        <div style={{ alignItems: 'center', display: 'flex', gap: 8 }}>
            <span
                style={{
                    color: NETWORK_COLORS.textMuted,
                    fontFamily: 'monospace',
                    fontSize: 11,
                }}
            >
                Address
            </span>
            <input
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onSearch(value)}
                placeholder="0x..."
                style={{
                    background: highlightedAddress
                        ? `${HIGHLIGHT_COLOR}15`
                        : 'rgba(180, 180, 210, 0.06)',
                    border: `1px solid ${highlightedAddress ? `${HIGHLIGHT_COLOR}40` : NETWORK_COLORS.surfaceBorder}`,
                    borderRadius: 6,
                    color: NETWORK_COLORS.text,
                    fontFamily: 'monospace',
                    fontSize: 12,
                    outline: 'none',
                    padding: '6px 10px',
                    width: 160,
                }}
                value={highlightedAddress ? truncateAddress(highlightedAddress) : value}
            />
            {highlightedAddress ? (
                <button
                    onClick={handleDismiss}
                    style={{
                        background: 'rgba(180, 180, 210, 0.1)',
                        border: `1px solid ${NETWORK_COLORS.surfaceBorder}`,
                        borderRadius: 6,
                        color: NETWORK_COLORS.textMuted,
                        cursor: 'pointer',
                        fontFamily: 'monospace',
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '6px 14px',
                    }}
                >
                    ✕
                </button>
            ) : (
            <button
                onClick={() => onSearch(value)}
                style={{
                    background: NETWORK_COLORS.accent,
                    border: 'none',
                    borderRadius: 6,
                    color: '#000',
                    cursor: 'pointer',
                    fontFamily: 'monospace',
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '6px 14px',
                }}
            >
                Go
            </button>
            )}
        </div>
    );
});

AddressSearch.displayName = 'AddressSearch';

// ============================================================================
// Action Buttons (bottom right: Share + Explore — pill-style branded buttons)
// ============================================================================

interface ActionButtonsProps {
    onShare?: () => void;
    onStartJourney?: () => void;
}

const ActionButtons = memo<ActionButtonsProps>(({ onShare, onStartJourney }) => {
    const [shareHover, setShareHover] = useState(false);
    const [journeyHover, setJourneyHover] = useState(false);

    return (
        <div
            style={{
                alignItems: 'center',
                bottom: 16,
                display: 'flex',
                gap: 10,
                position: 'absolute',
                right: 16,
                zIndex: 10,
            }}
        >
            {onShare && (
                <button
                    onClick={onShare}
                    onMouseEnter={() => setShareHover(true)}
                    onMouseLeave={() => setShareHover(false)}
                    style={{
                        alignItems: 'center',
                        background: shareHover ? NETWORK_COLORS.surfaceBorder : NETWORK_COLORS.surface,
                        backdropFilter: 'blur(12px)',
                        border: `1px solid ${shareHover ? 'rgba(180,180,210,0.22)' : NETWORK_COLORS.surfaceBorder}`,
                        borderRadius: 8,
                        color: shareHover ? NETWORK_COLORS.text : NETWORK_COLORS.textMuted,
                        cursor: 'pointer',
                        display: 'flex',
                        fontFamily: 'monospace',
                        fontSize: 11,
                        gap: 6,
                        height: 36,
                        letterSpacing: '0.04em',
                        padding: '0 14px',
                        transition: 'all 0.18s ease',
                    }}
                >
                    <span style={{ fontSize: 11, opacity: 0.7 }}>&#x25c8;</span> Share
                </button>
            )}
            {onStartJourney && (
                <button
                    onClick={onStartJourney}
                    onMouseEnter={() => setJourneyHover(true)}
                    onMouseLeave={() => setJourneyHover(false)}
                    style={{
                        alignItems: 'center',
                        background: journeyHover
                            ? 'linear-gradient(135deg, #9b7ff8 0%, #6b4df4 100%)'
                            : 'linear-gradient(135deg, #8165ee 0%, #5b3de0 100%)',
                        border: 'none',
                        borderRadius: 8,
                        boxShadow: journeyHover
                            ? '0 4px 20px rgba(129,101,238,0.45)'
                            : '0 2px 8px rgba(129,101,238,0.2)',
                        color: '#fff',
                        cursor: 'pointer',
                        display: 'flex',
                        fontFamily: 'monospace',
                        fontSize: 12,
                        fontWeight: 600,
                        gap: 6,
                        height: 36,
                        letterSpacing: '0.05em',
                        padding: '0 18px',
                        transform: journeyHover ? 'translateY(-1px)' : 'none',
                        transition: 'all 0.18s ease',
                    }}
                >
                    Join the Network <span style={{ fontSize: 13 }}>&#x2192;</span>
                </button>
            )}
        </div>
    );
});

ActionButtons.displayName = 'ActionButtons';

// ============================================================================
// Main Export
// ============================================================================

interface X402NetworkProps {
    /** API endpoints involved in the flow */
    apiEndpoints?: string[];
    /** Per-hub category colors (one per apiEndpoint). Falls back to theme.nodeColor. */
    categoryColors?: string[];
    /** If true, renders compact (300px) for chat embed; otherwise full-size */
    compact?: boolean;
    /** Complete flow trace for timeline replay */
    flow?: X402FlowTrace | null;
    /** Container height */
    height?: number | string;
    /** Address currently highlighted (shown in search bar, null = none) */
    highlightedAddress?: string | null;
    /** Hub index to highlight for "You Are Here" marker */
    highlightedHubIndex?: number | null;
    /** Called when address search is submitted */
    onAddressSearch?: (address: string) => void;
    /** Called when highlight is dismissed */
    onDismissHighlight?: () => void;
    /** Called when Share is clicked */
    onShare?: () => void;
    /** Called when Start Journey is clicked */
    onStartJourney?: () => void;
    /** Current visualization stage (overridden by timeline when scrubbing) */
    stage?: VortexStage;
    /** Customizable color theme */
    theme?: Partial<X402NetworkTheme>;
    /** Title for snapshot watermark */
    title?: string;
}

const X402Network = memo(forwardRef<X402NetworkHandle, X402NetworkProps>(
    ({
        stage: externalStage = 'idle',
        apiEndpoints = [],
        categoryColors = [],
        compact = false,
        flow = null,
        height: externalHeight,
        highlightedAddress = null,
        highlightedHubIndex = null,
        onAddressSearch,
        onDismissHighlight,
        onShare,
        onStartJourney,
        theme: themeOverride,
        title = 'PumpFun · Live Network',
    }, ref) => {
        const mouseWorldPos = useRef(new THREE.Vector3());
        const mouseActive = useRef(false);
        const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
        const orbitEnabledRef = useRef(true);
        const animationRef = useRef<CameraAnimation | null>(null);
        const driftedPositionsRef = useRef<THREE.Vector3[]>([]);
        const containerRef = useRef<HTMLDivElement>(null);
        const [contextLost, setContextLost] = useState(false);

        const handleCanvasCreated = useCallback((state: { gl: THREE.WebGLRenderer }) => {
            const canvas = state.gl.domElement;
            const onLost = (e: Event) => {
                e.preventDefault();
                setContextLost(true);
            };
            const onRestored = () => {
                setContextLost(false);
            };
            canvas.addEventListener('webglcontextlost', onLost);
            canvas.addEventListener('webglcontextrestored', onRestored);
        }, []);

        // Merge theme
        const theme = useMemo(() => ({ ...DEFAULT_THEME, ...themeOverride }), [themeOverride]);

        // Node visibility (filtering is now handled by the page-level category toggles)
        const hiddenNodes = useMemo(() => new Set<number>(), []);

        const handleAddressSearch = useCallback((address: string) => {
            if (onAddressSearch) {
                onAddressSearch(address);
            }
        }, [onAddressSearch]);

        // Generate hub positions based on API count or default
        const hubPositions = useMemo(() => {
            const count = Math.max(apiEndpoints.length, NETWORK_CONFIG.PRIMARY_NODES);
            return generateHubPositions(count, NETWORK_CONFIG.HUB_SPREAD);
        }, [apiEndpoints.length]);

        // Compute visible hub indices (invert hiddenNodes)
        const visibleHubs = useMemo<Set<number> | undefined>(() => {
            if (hiddenNodes.size === 0) return undefined; // all visible
            const visible = new Set<number>();
            for (let i = 0; i < hubPositions.length; i++) {
                if (!hiddenNodes.has(i)) visible.add(i);
            }
            return visible;
        }, [hiddenNodes, hubPositions.length]);

        // Timeline state
        const timeline = useMemo(() => buildTimeline(flow), [flow]);
        const [currentIndex, setCurrentIndex] = useState(0);
        const [isPlaying, setIsPlaying] = useState(true);
        const playIntervalRef = useRef<ReturnType<typeof setInterval>>();

        // Derive stage from timeline position (or use external stage if no timeline)
        const activeStage = timeline.length > 0
            ? (timeline[Math.min(currentIndex, timeline.length - 1)]?.stage ?? 'idle')
            : externalStage;

        // Auto-play through timeline events
        useEffect(() => {
            if (!isPlaying || timeline.length === 0) return;

            playIntervalRef.current = setInterval(() => {
                setCurrentIndex((prev) => {
                    if (prev >= timeline.length - 1) {
                        setIsPlaying(false);
                        return prev;
                    }
                    return prev + 1;
                });
            }, 1200); // 1.2s per event step

            return () => clearInterval(playIntervalRef.current);
        }, [isPlaying, timeline.length]);

        // Reset when flow changes
        useEffect(() => {
            if (flow) {
                setCurrentIndex(0);
                setIsPlaying(true);
            }
        }, [flow?.flowId]);

        const handlePlay = useCallback(() => {
            if (currentIndex >= timeline.length - 1) setCurrentIndex(0);
            setIsPlaying(true);
        }, [currentIndex, timeline.length]);

        const handlePause = useCallback(() => setIsPlaying(false), []);

        const handleScrub = useCallback((index: number) => {
            setCurrentIndex(index);
            setIsPlaying(false);
        }, []);

        const height = externalHeight ?? (compact ? 300 : 600);

        const animateCameraTo = useCallback(async (request: CameraMoveRequest) => {
            if (!cameraRef.current) return;

            const fromPos = cameraRef.current.position.clone();
            const fromLookAt = new THREE.Vector3(0, 0, 0);
            const toPos = new THREE.Vector3(...request.position);
            const toLookAt = new THREE.Vector3(...(request.lookAt ?? [0, 0, 0]));

            await new Promise<void>((resolve) => {
                animationRef.current = {
                    durationMs: request.durationMs ?? 1200,
                    fromLookAt,
                    fromPos,
                    onDone: resolve,
                    startedAt: performance.now(),
                    toLookAt,
                    toPos,
                };
            });
        }, []);

        const focusHub = useCallback(async (index: number, durationMs = 1200) => {
            const hub = hubPositions[index];
            if (!hub) return;

            const offset = new THREE.Vector3(7, 4, 9);
            await animateCameraTo({
                durationMs,
                lookAt: [hub.x, hub.y, hub.z],
                position: [hub.x + offset.x, hub.y + offset.y, hub.z + offset.z],
            });
        }, [animateCameraTo, hubPositions]);

        useImperativeHandle(ref, () => ({
            animateCameraTo,
            focusHub,
            getHubCount: () => hubPositions.length,
            getHubPosition: (index: number) => {
                const hub = hubPositions[index];
                return hub ? [hub.x, hub.y, hub.z] : null;
            },
            setOrbitEnabled: (enabled: boolean) => {
                orbitEnabledRef.current = enabled;
            },
        }), [animateCameraTo, focusHub, hubPositions]);

        return (
            <div
                ref={containerRef}
                style={{
                    background: theme.bg,
                    borderRadius: compact ? 12 : 16,
                    height,
                    overflow: 'hidden',
                    position: 'relative',
                    width: '100%',
                }}
            >
                {/* Snapshot header watermark */}
                {!compact && (
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            left: 0,
                            padding: '10px 16px',
                            position: 'absolute',
                            right: 0,
                            top: timeline.length > 0 ? 48 : 0,
                            zIndex: 5,
                        }}
                    >
                        <span
                            style={{
                                color: NETWORK_COLORS.textFaint,
                                fontFamily: 'monospace',
                                fontSize: 10,
                                letterSpacing: '0.08em',
                                textTransform: 'uppercase',
                            }}
                        >
                            {title}
                        </span>
                        <span
                            style={{
                                color: NETWORK_COLORS.textFaint,
                                fontFamily: 'monospace',
                                fontSize: 10,
                                textTransform: 'uppercase',
                            }}
                        >
                            {new Date().toLocaleDateString('en-GB', {
                                day: 'numeric',
                                month: 'long',
                                weekday: 'long',
                                year: 'numeric',
                            }).toUpperCase()}
                        </span>
                    </div>
                )}

                {/* Timeline scrubber (top bar) */}
                <TimelineScrubber
                    currentIndex={currentIndex}
                    isPlaying={isPlaying}
                    onPause={handlePause}
                    onPlay={handlePlay}
                    onScrub={handleScrub}
                    timeline={timeline}
                />

                <Canvas
                    camera={{ fov: compact ? 45 : 50, far: 200, near: 0.1, position: [0, 3, compact ? 40 : 35] }}
                    dpr={[1, 1.5]}
                    gl={{ powerPreference: 'low-power', preserveDrawingBuffer: true }}
                    onCreated={handleCanvasCreated}
                    style={{ height: '100%', width: '100%' }}
                >
                    <color args={[theme.bg]} attach="background" />
                    <Suspense fallback={null}>
                        <NetworkScene
                            apiEndpoints={apiEndpoints}
                            animationRef={animationRef}
                            cameraRef={cameraRef}
                            categoryColors={categoryColors}
                            driftedPositionsRef={driftedPositionsRef}
                            highlightedHubIndex={highlightedHubIndex}
                            hubPositions={hubPositions}
                            mouseActive={mouseActive}
                            mouseWorldPos={mouseWorldPos}
                            nodeColor={theme.nodeColor}
                            onDismissHighlight={onDismissHighlight}
                            orbitEnabledRef={orbitEnabledRef}
                            stage={activeStage}
                            userColor={theme.userColor}
                            visibleHubs={visibleHubs}
                        />
                    </Suspense>
                </Canvas>

                {contextLost && (
                    <div
                        onClick={() => window.location.reload()}
                        role="button"
                        style={{
                            alignItems: 'center',
                            background: 'rgba(0,0,0,0.85)',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 12,
                            inset: 0,
                            justifyContent: 'center',
                            position: 'absolute',
                            zIndex: 100,
                        }}
                        tabIndex={0}
                    >
                        <span style={{ color: '#fff', fontFamily: 'monospace', fontSize: 14 }}>
                            WebGL context lost
                        </span>
                        <span style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace', fontSize: 12 }}>
                            Click to reload
                        </span>
                    </div>
                )}

                {/* Bottom bar: stats + address search */}
                <div
                    style={{
                        alignItems: 'center',
                        background: 'linear-gradient(transparent, rgba(0,0,0,0.4))',
                        bottom: 0,
                        display: 'flex',
                        gap: 24,
                        left: 0,
                        padding: '16px 20px 12px',
                        position: 'absolute',
                        right: compact ? 0 : 140,
                        zIndex: 10,
                    }}
                >
                    <StatsHUD
                        currentIndex={currentIndex}
                        flow={flow}
                        timeline={timeline}
                    />
                    {!compact && (
                        <AddressSearch
                            highlightedAddress={highlightedAddress}
                            onDismiss={onDismissHighlight}
                            onSearch={handleAddressSearch}
                        />
                    )}
                </div>

                {/* Action buttons: Share + Start Journey (full mode only) */}
                {!compact && (
                    <ActionButtons
                        onShare={onShare}
                        onStartJourney={onStartJourney}
                    />
                )}
            </div>
        );
    },
));

X402Network.displayName = 'X402Network';

export default X402Network;
export { DEFAULT_THEME, NETWORK_COLORS };
