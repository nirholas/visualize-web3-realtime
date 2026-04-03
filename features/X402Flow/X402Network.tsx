/**
 * Network Visualization — PumpFun World
 *
 * Giza-inspired 3D particle network with light theme, protocol filters,
 * labeled nodes, and clean professional UI.
 */

'use client';

import { Html } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Suspense, memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

import type { X402FlowTrace, VortexStage } from './types';

// ============================================================================
// Configuration
// ============================================================================

const FONT = "'IBM Plex Mono', monospace";

const NETWORK_CONFIG = {
    PRIMARY_NODES: 8,
    PARTICLES_PER_HUB: 250,
    PROXIMITY_THRESHOLD: 1.8,
    MAX_PROXIMITY_LINES: 800,
    TETHER_LINES_PER_HUB: 40,
    REPULSION_RADIUS: 6,
    REPULSION_STRENGTH: 15,
    SPRING_K: 2.5,
    DAMPING: 0.92,
    CAMERA_ORBIT_SPEED: 0.06,
    HUB_SPREAD: 18,
    CLUSTER_RADIUS: 4,
    DRIFT_SPEED: 0.3,
} as const;

const NETWORK_COLORS = {
    bg: '#ffffff',
    node: '#1a1a1a',
    particle: '#2a2a2a',
    line: '#888888',
    lineProximity: '#999999',
    paymentPulse: '#d49020',
    accent: '#1a1a1a',
    text: '#1a1a1a',
    textMuted: '#666666',
    textFaint: '#999999',
    surface: 'rgba(0, 0, 0, 0.04)',
    surfaceBorder: 'rgba(0, 0, 0, 0.10)',
};

const PROTOCOL_COLORS = ['#3d63ff', '#b6509e', '#00d395', '#00b88d', '#00b3ff', '#2f6bff', '#f5a623', '#e74c3c'];

function getProtocolColor(index: number): string {
    return PROTOCOL_COLORS[index % PROTOCOL_COLORS.length];
}

// ============================================================================
// Spatial hash
// ============================================================================

class SpatialHash {
    private cellSize: number;
    private cells: Map<string, number[]>;
    private resultBuffer: number[] = [];
    constructor(cellSize: number) { this.cellSize = cellSize; this.cells = new Map(); }
    clear() { for (const arr of this.cells.values()) arr.length = 0; }
    private key(x: number, y: number, z: number) {
        return `${Math.floor(x / this.cellSize)},${Math.floor(y / this.cellSize)},${Math.floor(z / this.cellSize)}`;
    }
    insert(index: number, x: number, y: number, z: number) {
        const k = this.key(x, y, z);
        let arr = this.cells.get(k);
        if (!arr) { arr = []; this.cells.set(k, arr); }
        arr.push(index);
    }
    queryNear(x: number, y: number, z: number): number[] {
        this.resultBuffer.length = 0;
        const cx = Math.floor(x / this.cellSize), cy = Math.floor(y / this.cellSize), cz = Math.floor(z / this.cellSize);
        for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
            const arr = this.cells.get(`${cx + dx},${cy + dy},${cz + dz}`);
            if (arr) for (const idx of arr) this.resultBuffer.push(idx);
        }
        return this.resultBuffer;
    }
}

// ============================================================================
// Hub positions
// ============================================================================

function generateHubPositions(count: number, spread: number): THREE.Vector3[] {
    const positions: THREE.Vector3[] = [new THREE.Vector3(0, 0, 0)];
    const protocolCount = Math.max(0, count - 1);
    const phi = (1 + Math.sqrt(5)) / 2;
    for (let i = 0; i < protocolCount; i++) {
        const theta = (2 * Math.PI * i) / phi;
        const y = (Math.sin(i * 1.3) * 0.5) * spread * 0.3;
        const r = spread * (0.5 + (i % 3) * 0.15 + 0.1);
        positions.push(new THREE.Vector3(Math.cos(theta) * r, y, Math.sin(theta) * r));
    }
    return positions;
}

// ============================================================================
// Origin Spokes
// ============================================================================

const OriginSpokes = memo<{ hubPositions: THREE.Vector3[]; nodeColor: string; stage: VortexStage }>(({ hubPositions, nodeColor, stage }) => {
    const lineRef = useRef<THREE.LineSegments>(null);
    const spokeCount = Math.max(0, hubPositions.length - 1);
    const positions = useMemo(() => {
        const arr = new Float32Array(spokeCount * 6);
        const origin = hubPositions[0];
        if (!origin) return arr;
        for (let i = 0; i < spokeCount; i++) {
            const hub = hubPositions[i + 1]; const i6 = i * 6;
            arr[i6] = origin.x; arr[i6 + 1] = origin.y; arr[i6 + 2] = origin.z;
            arr[i6 + 3] = hub.x; arr[i6 + 4] = hub.y; arr[i6 + 5] = hub.z;
        }
        return arr;
    }, [hubPositions, spokeCount]);
    useFrame((state) => {
        if (!lineRef.current || spokeCount === 0) return;
        const time = state.clock.getElapsedTime();
        const attr = lineRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;
        const arr = attr.array as Float32Array;
        const ox = Math.sin(time * 0.15) * 0.3, oy = Math.cos(time * 0.12) * 0.2, oz = Math.sin(time * 0.1) * 0.25;
        for (let i = 0; i < spokeCount; i++) {
            const hub = hubPositions[i + 1]; const i6 = i * 6;
            arr[i6] = ox; arr[i6 + 1] = oy; arr[i6 + 2] = oz;
            arr[i6 + 3] = hub.x + Math.sin(time * 0.15 + (i + 1) * 2.1) * 0.3;
            arr[i6 + 4] = hub.y + Math.cos(time * 0.12 + (i + 1) * 1.4) * 0.2;
            arr[i6 + 5] = hub.z + Math.sin(time * 0.1 + (i + 1) * 3.3) * 0.25;
        }
        attr.needsUpdate = true;
    });
    if (spokeCount === 0) return null;
    return (
        <lineSegments ref={lineRef}>
            <bufferGeometry><bufferAttribute args={[positions, 3]} attach="attributes-position" count={spokeCount * 2} itemSize={3} usage={THREE.DynamicDrawUsage} /></bufferGeometry>
            <lineBasicMaterial color={nodeColor} opacity={stage === 'calling' || stage === 'paying' ? 0.35 : 0.12} transparent />
        </lineSegments>
    );
});
OriginSpokes.displayName = 'OriginSpokes';

function extractNodeLabel(endpoint: string): string {
    try { const url = new URL(endpoint); return url.hostname.replace('www.', '').split('.')[0].toUpperCase(); }
    catch { return endpoint.slice(0, 16).toUpperCase(); }
}

// ============================================================================
// Primary Nodes
// ============================================================================

const PrimaryNodes = memo<{ apiEndpoints: string[]; hubPositions: THREE.Vector3[]; nodeColor: string; stage: VortexStage }>(({ hubPositions, stage, apiEndpoints, nodeColor }) => {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);
    const scaleRef = useRef<Float32Array>(new Float32Array(hubPositions.length).fill(1));
    const driftedPositions = useRef<THREE.Vector3[]>(hubPositions.map((p) => p.clone()));
    useFrame((state) => {
        if (!meshRef.current) return;
        const time = state.clock.getElapsedTime();
        for (let i = 0; i < hubPositions.length; i++) {
            const pos = hubPositions[i];
            const breathe = 1 + Math.sin(time * 0.8 + i * 1.7) * 0.08;
            const targetScale = (stage === 'calling' || stage === 'paying') ? 1.3 * breathe : breathe;
            scaleRef.current[i] += (targetScale - scaleRef.current[i]) * 0.05;
            dummy.position.copy(pos);
            const dx = Math.sin(time * 0.15 + i * 2.1) * 0.3;
            const dy = Math.cos(time * 0.12 + i * 1.4) * 0.2;
            const dz = Math.sin(time * 0.1 + i * 3.3) * 0.25;
            dummy.position.x += dx; dummy.position.y += dy; dummy.position.z += dz;
            dummy.scale.setScalar(scaleRef.current[i]);
            dummy.updateMatrix();
            meshRef.current.setMatrixAt(i, dummy.matrix);
            if (driftedPositions.current[i]) driftedPositions.current[i].set(pos.x + dx, pos.y + dy, pos.z + dz);
        }
        meshRef.current.instanceMatrix.needsUpdate = true;
    });
    const labels = useMemo(() => hubPositions.map((_, i) => {
        if (i === 0) return 'YOU ARE HERE';
        if (i - 1 < apiEndpoints.length) return extractNodeLabel(apiEndpoints[i - 1]);
        return null;
    }), [hubPositions, apiEndpoints]);
    return (
        <>
            <instancedMesh ref={meshRef} args={[undefined, undefined, hubPositions.length]}>
                <sphereGeometry args={[0.5, 24, 24]} />
                <meshBasicMaterial color={nodeColor} />
            </instancedMesh>
            {labels.map((label, i) => label ? (
                <NodeLabel key={`label-${i}`} color={i === 0 ? '#3d63ff' : getProtocolColor(i - 1)} label={label} isOrigin={i === 0} position={hubPositions[i]} positionRef={driftedPositions} index={i} />
            ) : null)}
        </>
    );
});
PrimaryNodes.displayName = 'PrimaryNodes';

// ============================================================================
// Node Label — Giza-style dark pill with downward arrow
// ============================================================================

const NodeLabel = memo<{ color: string; index: number; isOrigin?: boolean; label: string; position: THREE.Vector3; positionRef: React.MutableRefObject<THREE.Vector3[]> }>(({ label, position, positionRef, index, color, isOrigin }) => {
    const groupRef = useRef<THREE.Group>(null);
    useFrame(() => {
        if (!groupRef.current || !positionRef.current[index]) return;
        const p = positionRef.current[index];
        groupRef.current.position.set(p.x, p.y + 1.4, p.z);
    });
    return (
        <group ref={groupRef} position={[position.x, position.y + 1.4, position.z]}>
            <Html center distanceFactor={25} zIndexRange={[10, 0]}>
                <div style={{ alignItems: 'center', display: 'flex', flexDirection: 'column', pointerEvents: 'none' }}>
                    <div style={{
                        alignItems: 'center', background: '#1a1a1a', borderRadius: 20, color: '#ffffff', display: 'flex',
                        fontFamily: FONT, fontSize: isOrigin ? 10 : 9, fontWeight: 600, gap: 6, letterSpacing: '0.08em',
                        padding: '5px 12px', textTransform: 'uppercase', whiteSpace: 'nowrap',
                    }}>
                        {!isOrigin && <span style={{ background: color, borderRadius: '50%', display: 'inline-block', flexShrink: 0, height: 8, width: 8 }} />}
                        {label}
                    </div>
                    <div style={{ borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '5px solid #1a1a1a', height: 0, width: 0 }} />
                </div>
            </Html>
        </group>
    );
});
NodeLabel.displayName = 'NodeLabel';

// ============================================================================
// Particle Swarm
// ============================================================================

const ParticleSwarm = memo<{ hubPositions: THREE.Vector3[]; mouseActive: React.MutableRefObject<boolean>; mouseWorldPos: React.MutableRefObject<THREE.Vector3>; stage: VortexStage; visibleHubs?: Set<number> }>(({ hubPositions, stage, mouseWorldPos, mouseActive, visibleHubs }) => {
    const totalParticles = hubPositions.length * NETWORK_CONFIG.PARTICLES_PER_HUB;
    const pointsRef = useRef<THREE.Points>(null);
    const particleState = useMemo(() => {
        const homePositions = new Float32Array(totalParticles * 3);
        const currentPositions = new Float32Array(totalParticles * 3);
        const velocities = new Float32Array(totalParticles * 3);
        const sizes = new Float32Array(totalParticles);
        const hubIndices = new Int32Array(totalParticles);
        const orbitSpeeds = new Float32Array(totalParticles);
        const orbitPhases = new Float32Array(totalParticles);
        const orbitTilts = new Float32Array(totalParticles);
        for (let h = 0; h < hubPositions.length; h++) {
            const hub = hubPositions[h];
            for (let p = 0; p < NETWORK_CONFIG.PARTICLES_PER_HUB; p++) {
                const i = h * NETWORK_CONFIG.PARTICLES_PER_HUB + p; const i3 = i * 3;
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos(2 * Math.random() - 1);
                const r = NETWORK_CONFIG.CLUSTER_RADIUS * (0.3 + Math.random() * 0.7);
                const x = hub.x + r * Math.sin(phi) * Math.cos(theta);
                const y = hub.y + r * Math.sin(phi) * Math.sin(theta);
                const z = hub.z + r * Math.cos(phi);
                homePositions[i3] = x; homePositions[i3 + 1] = y; homePositions[i3 + 2] = z;
                currentPositions[i3] = x; currentPositions[i3 + 1] = y; currentPositions[i3 + 2] = z;
                sizes[i] = 0.8 + Math.random() * 2.5;
                hubIndices[i] = h; orbitSpeeds[i] = 0.2 + Math.random() * 0.6;
                orbitPhases[i] = Math.random() * Math.PI * 2; orbitTilts[i] = (Math.random() - 0.5) * Math.PI * 0.4;
            }
        }
        return { currentPositions, homePositions, hubIndices, orbitPhases, orbitSpeeds, orbitTilts, sizes, velocities };
    }, [hubPositions, totalParticles]);
    useFrame((state) => {
        if (!pointsRef.current) return;
        const time = state.clock.getElapsedTime();
        const dt = Math.min(state.clock.getDelta(), 0.05);
        const posAttr = pointsRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;
        const positions = posAttr.array as Float32Array;
        const { homePositions, velocities, hubIndices, orbitSpeeds, orbitPhases, orbitTilts } = particleState;
        const stageIntensity = stage === 'calling' || stage === 'paying' ? 2.0 : stage === 'receiving' ? 1.5 : 1.0;
        const frameDamping = Math.pow(NETWORK_CONFIG.DAMPING, dt * 60);
        for (let i = 0; i < totalParticles; i++) {
            const i3 = i * 3; const hubIdx = hubIndices[i];
            if (visibleHubs && !visibleHubs.has(hubIdx)) continue;
            const hub = hubPositions[hubIdx];
            const speed = orbitSpeeds[i] * NETWORK_CONFIG.DRIFT_SPEED * stageIntensity;
            const phase = orbitPhases[i] + time * speed; const tilt = orbitTilts[i];
            const homeR = NETWORK_CONFIG.CLUSTER_RADIUS * (0.4 + 0.6 * ((Math.sin(phase * 0.3) + 1) / 2));
            const hx = hub.x + homeR * Math.cos(phase) * Math.cos(tilt);
            const hy = hub.y + homeR * Math.sin(phase) * 0.7;
            const hz = hub.z + homeR * Math.sin(phase) * Math.sin(tilt) + homeR * Math.cos(phase) * Math.sin(tilt) * 0.3;
            const driftX = Math.sin(time * 0.15 + hubIdx * 2.1) * 0.3;
            const driftY = Math.cos(time * 0.12 + hubIdx * 1.4) * 0.2;
            const driftZ = Math.sin(time * 0.1 + hubIdx * 3.3) * 0.25;
            homePositions[i3] = hx + driftX; homePositions[i3 + 1] = hy + driftY; homePositions[i3 + 2] = hz + driftZ;
            const ddx = homePositions[i3] - positions[i3];
            const ddy = homePositions[i3 + 1] - positions[i3 + 1];
            const ddz = homePositions[i3 + 2] - positions[i3 + 2];
            velocities[i3] += ddx * NETWORK_CONFIG.SPRING_K * dt;
            velocities[i3 + 1] += ddy * NETWORK_CONFIG.SPRING_K * dt;
            velocities[i3 + 2] += ddz * NETWORK_CONFIG.SPRING_K * dt;
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
            velocities[i3] *= frameDamping; velocities[i3 + 1] *= frameDamping; velocities[i3 + 2] *= frameDamping;
            positions[i3] += velocities[i3]; positions[i3 + 1] += velocities[i3 + 1]; positions[i3 + 2] += velocities[i3 + 2];
        }
        posAttr.needsUpdate = true;
    });
    return (
        <points ref={pointsRef}>
            <bufferGeometry>
                <bufferAttribute args={[particleState.currentPositions, 3]} attach="attributes-position" count={totalParticles} itemSize={3} usage={THREE.DynamicDrawUsage} />
                <bufferAttribute args={[particleState.sizes, 1]} attach="attributes-size" count={totalParticles} itemSize={1} />
            </bufferGeometry>
            <pointsMaterial color={NETWORK_COLORS.particle} depthWrite={false} opacity={0.7} size={0.08} sizeAttenuation transparent />
        </points>
    );
});
ParticleSwarm.displayName = 'ParticleSwarm';

// ============================================================================
// Connection Lines
// ============================================================================

const ConnectionLines = memo<{ hubPositions: THREE.Vector3[]; stage: VortexStage }>(({ hubPositions, stage }) => {
    const lineRef = useRef<THREE.LineSegments>(null);
    const pointsCacheRef = useRef<THREE.Points | null>(null);
    const spatialHash = useMemo(() => new SpatialHash(NETWORK_CONFIG.PROXIMITY_THRESHOLD), []);
    const maxLines = NETWORK_CONFIG.MAX_PROXIMITY_LINES + hubPositions.length * NETWORK_CONFIG.TETHER_LINES_PER_HUB;
    const linePositions = useMemo(() => new Float32Array(maxLines * 6), [maxLines]);
    const groupRef = useRef<THREE.Group>(null);
    useFrame(() => {
        if (!lineRef.current || !groupRef.current) return;
        if (!pointsCacheRef.current) {
            groupRef.current.parent?.traverse((child) => { if (child instanceof THREE.Points && !pointsCacheRef.current) pointsCacheRef.current = child; });
        }
        if (!pointsCacheRef.current) return;
        const posAttr = pointsCacheRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;
        if (!posAttr) return;
        const positions = posAttr.array as Float32Array;
        const totalParticles = posAttr.count;
        let lineIdx = 0; const maxIdx = maxLines * 6;
        for (let h = 0; h < hubPositions.length; h++) {
            const hub = hubPositions[h]; const startP = h * NETWORK_CONFIG.PARTICLES_PER_HUB;
            const step = Math.max(1, Math.floor(NETWORK_CONFIG.PARTICLES_PER_HUB / NETWORK_CONFIG.TETHER_LINES_PER_HUB));
            for (let p = startP; p < startP + NETWORK_CONFIG.PARTICLES_PER_HUB && lineIdx < maxIdx - 5; p += step) {
                const p3 = p * 3;
                linePositions[lineIdx++] = hub.x; linePositions[lineIdx++] = hub.y; linePositions[lineIdx++] = hub.z;
                linePositions[lineIdx++] = positions[p3]; linePositions[lineIdx++] = positions[p3 + 1]; linePositions[lineIdx++] = positions[p3 + 2];
            }
        }
        spatialHash.clear();
        for (let i = 0; i < totalParticles; i += 4) { const i3 = i * 3; spatialHash.insert(i, positions[i3], positions[i3 + 1], positions[i3 + 2]); }
        let proxCount = 0; const th2 = NETWORK_CONFIG.PROXIMITY_THRESHOLD * NETWORK_CONFIG.PROXIMITY_THRESHOLD;
        for (let i = 0; i < totalParticles && proxCount < NETWORK_CONFIG.MAX_PROXIMITY_LINES; i += 4) {
            const i3 = i * 3; const px = positions[i3], py = positions[i3 + 1], pz = positions[i3 + 2];
            for (const j of spatialHash.queryNear(px, py, pz)) {
                if (j <= i || lineIdx >= maxIdx - 5) continue;
                const j3 = j * 3; const ddx = px - positions[j3], ddy = py - positions[j3 + 1], ddz = pz - positions[j3 + 2];
                if (ddx * ddx + ddy * ddy + ddz * ddz < th2) {
                    linePositions[lineIdx++] = px; linePositions[lineIdx++] = py; linePositions[lineIdx++] = pz;
                    linePositions[lineIdx++] = positions[j3]; linePositions[lineIdx++] = positions[j3 + 1]; linePositions[lineIdx++] = positions[j3 + 2];
                    proxCount++;
                }
            }
        }
        const attr = lineRef.current.geometry.getAttribute('position') as THREE.BufferAttribute;
        (attr.array as Float32Array).set(linePositions); attr.needsUpdate = true;
        lineRef.current.geometry.setDrawRange(0, lineIdx / 3);
    });
    return (
        <group ref={groupRef}>
            <lineSegments ref={lineRef}>
                <bufferGeometry><bufferAttribute args={[linePositions, 3]} attach="attributes-position" count={maxLines * 2} itemSize={3} usage={THREE.DynamicDrawUsage} /></bufferGeometry>
                <lineBasicMaterial color={NETWORK_COLORS.line} opacity={stage === 'calling' || stage === 'paying' ? 0.18 : 0.06} transparent />
            </lineSegments>
        </group>
    );
});
ConnectionLines.displayName = 'ConnectionLines';

// ============================================================================
// Payment Pulse
// ============================================================================

const PaymentPulse = memo<{ hubPositions: THREE.Vector3[]; stage: VortexStage }>(({ hubPositions, stage }) => {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);
    const pulseData = useMemo(() => hubPositions.map((_, i) => ({ delay: i * 0.15, speed: 1.5 + Math.random() * 0.5 })), [hubPositions]);
    useFrame((state) => {
        if (!meshRef.current) return;
        const time = state.clock.getElapsedTime();
        const isPaying = stage === 'paying' || stage === 'calling';
        for (let i = 0; i < hubPositions.length; i++) {
            const hub = hubPositions[i]; const pd = pulseData[i];
            if (isPaying) {
                const t = ((time - pd.delay) * pd.speed) % 2;
                dummy.position.set(hub.x + Math.sin(time * 0.15 + i * 2.1) * 0.3, hub.y + Math.cos(time * 0.12 + i * 1.4) * 0.2, hub.z + Math.sin(time * 0.1 + i * 3.3) * 0.25);
                dummy.scale.setScalar(t > 0 ? t * 3 : 0);
            } else { dummy.position.set(0, -100, 0); dummy.scale.setScalar(0); }
            dummy.updateMatrix(); meshRef.current.setMatrixAt(i, dummy.matrix);
        }
        meshRef.current.instanceMatrix.needsUpdate = true;
    });
    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, hubPositions.length]}>
            <ringGeometry args={[0.8, 1, 32]} />
            <meshBasicMaterial color={NETWORK_COLORS.paymentPulse} opacity={0.2} side={THREE.DoubleSide} transparent />
        </instancedMesh>
    );
});
PaymentPulse.displayName = 'PaymentPulse';

// ============================================================================
// Camera + Mouse
// ============================================================================

const CameraController = memo(() => {
    const { camera } = useThree();
    useFrame((state) => {
        const time = state.clock.getElapsedTime(); const speed = NETWORK_CONFIG.CAMERA_ORBIT_SPEED;
        camera.position.x = Math.sin(time * speed) * 35;
        camera.position.y = Math.sin(time * speed * 0.3) * 5 + 3;
        camera.position.z = Math.cos(time * speed) * 35;
        camera.lookAt(0, 0, 0);
    });
    return null;
});
CameraController.displayName = 'CameraController';

const MouseTracker = memo<{ mouseWorldPos: React.MutableRefObject<THREE.Vector3>; mouseActive: React.MutableRefObject<boolean> }>(({ mouseWorldPos, mouseActive }) => {
    const { camera, gl } = useThree();
    const raycaster = useMemo(() => new THREE.Raycaster(), []);
    const mouseNDC = useMemo(() => new THREE.Vector2(), []);
    const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), []);
    const intersection = useMemo(() => new THREE.Vector3(), []);
    const camDir = useMemo(() => new THREE.Vector3(), []);
    useEffect(() => {
        const canvas = gl.domElement; let tid: ReturnType<typeof setTimeout>;
        const onMove = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            mouseNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            mouseNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
            raycaster.setFromCamera(mouseNDC, camera); camera.getWorldDirection(camDir);
            plane.normal.copy(camDir); plane.constant = 0;
            if (raycaster.ray.intersectPlane(plane, intersection)) mouseWorldPos.current.copy(intersection);
            mouseActive.current = true; clearTimeout(tid); tid = setTimeout(() => { mouseActive.current = false; }, 200);
        };
        const onLeave = () => { mouseActive.current = false; };
        canvas.addEventListener('mousemove', onMove); canvas.addEventListener('mouseleave', onLeave);
        return () => { canvas.removeEventListener('mousemove', onMove); canvas.removeEventListener('mouseleave', onLeave); clearTimeout(tid); };
    }, [camera, gl, mouseNDC, mouseWorldPos, mouseActive, plane, raycaster, intersection, camDir]);
    return null;
});
MouseTracker.displayName = 'MouseTracker';

// ============================================================================
// Timeline
// ============================================================================

interface TimelineEvent { color: string; icon: string; label: string; stage: VortexStage; timestamp: number; type: string; }

function extractDomain(url: string): string { try { return new URL(url).hostname.replace('www.', ''); } catch { return url.slice(0, 30); } }

function buildTimeline(flow: X402FlowTrace | null): TimelineEvent[] {
    if (!flow?.events?.length) return [];
    return flow.events.map((evt) => {
        const base = { timestamp: evt.timestamp, type: evt.type };
        switch (evt.type) {
            case 'api_call_start': return { ...base, color: '#3d63ff', icon: '\u2192', label: `Calling ${extractDomain(evt.apiUrl)}`, stage: 'calling' as VortexStage };
            case 'api_call_complete': return { ...base, color: '#00d395', icon: '\u2713', label: `Data from ${extractDomain(evt.apiUrl)}`, stage: 'receiving' as VortexStage };
            case 'payment_required': return { ...base, color: '#e74c3c', icon: '\u26A1', label: '402 \u2014 Payment Required', stage: 'calling' as VortexStage };
            case 'payment_signing': return { ...base, color: '#f5a623', icon: '\uD83D\uDD10', label: 'Signing EIP-712', stage: 'paying' as VortexStage };
            case 'payment_sent': return { ...base, color: '#f5a623', icon: '\uD83D\uDCB0', label: `${evt.amount || ''} USDC Sent`, stage: 'paying' as VortexStage };
            case 'payment_failed': return { ...base, color: '#e74c3c', icon: '\u2717', label: 'Payment Failed', stage: 'calling' as VortexStage };
            case 'budget_exceeded': return { ...base, color: '#e74c3c', icon: '\u26A0', label: 'Budget Exceeded', stage: 'idle' as VortexStage };
            case 'flow_complete': return { ...base, color: '#00d395', icon: '\u25CF', label: `Complete \u2014 $${evt.amount || '0'}`, stage: 'complete' as VortexStage };
            default: return { ...base, color: '#3d63ff', icon: '\u00B7', label: evt.type, stage: 'idle' as VortexStage };
        }
    });
}

// ============================================================================
// Timeline Scrubber — Giza-style top bar
// ============================================================================

const TimelineScrubber = memo<{ currentIndex: number; isPlaying: boolean; onPause: () => void; onPlay: () => void; onScrub: (i: number) => void; timeline: TimelineEvent[]; title: string }>(
    ({ timeline, currentIndex, isPlaying, onPlay, onPause, onScrub, title }) => (
        <div style={{ alignItems: 'center', background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)', borderBottom: '1px solid #eee', display: 'flex', gap: 12, left: 0, padding: '8px 16px', position: 'absolute', right: 0, top: 0, zIndex: 10 }}>
            <div style={{ alignItems: 'center', display: 'flex', gap: 8, marginRight: 8 }}>
                <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: '#1a1a1a', letterSpacing: '0.04em' }}>{title}</span>
                <span style={{ alignItems: 'center', background: '#f0f0f0', border: '1px solid #e0e0e0', borderRadius: '50%', color: '#999', display: 'flex', fontFamily: FONT, fontSize: 10, fontWeight: 600, height: 18, justifyContent: 'center', width: 18 }} title="About">i</span>
            </div>
            <button onClick={isPlaying ? onPause : onPlay} style={{ alignItems: 'center', background: '#1a1a1a', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', display: 'flex', flexShrink: 0, height: 32, justifyContent: 'center', width: 32 }}>
                <span style={{ fontSize: 12, lineHeight: 1 }}>{isPlaying ? '\u23F8' : '\u25B6'}</span>
            </button>
            {timeline.length > 0 ? (
                <div className="timeline-ticks" style={{ alignItems: 'center', display: 'flex', flex: 1, gap: 2, height: 32 }}>
                    {timeline.map((evt, i) => (
                        <button key={`${evt.type}-${i}`} onClick={() => onScrub(i)} style={{ background: i <= currentIndex ? '#1a1a1a' : '#e0e0e0', border: 'none', borderRadius: 2, cursor: 'pointer', flex: 1, height: i === currentIndex ? 22 : 14, minWidth: 3, opacity: i <= currentIndex ? 1 : 0.5, transition: 'all 0.2s ease' }} title={evt.label} />
                    ))}
                </div>
            ) : (
                <div style={{ flex: 1, height: 32, display: 'flex', alignItems: 'center' }}><div style={{ background: '#f0f0f0', borderRadius: 2, flex: 1, height: 4 }} /></div>
            )}
        </div>
    ),
);
TimelineScrubber.displayName = 'TimelineScrubber';

// ============================================================================
// Stats HUD
// ============================================================================

const StatChip = memo<{ label: string; value: string }>(({ label, value }) => (
    <div style={{ alignItems: 'center', background: '#fff', border: '1px solid #e5e5e5', borderRadius: 8, display: 'flex', gap: 8, padding: '8px 16px' }}>
        <span style={{ color: '#999', fontFamily: FONT, fontSize: 11, fontWeight: 400, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</span>
        <span style={{ color: '#1a1a1a', fontFamily: FONT, fontSize: 15, fontWeight: 600 }}>{value}</span>
    </div>
));
StatChip.displayName = 'StatChip';

const StatsHUD = memo<{ currentIndex: number; flow: X402FlowTrace | null; timeline: TimelineEvent[] }>(({ flow, timeline, currentIndex }) => {
    const visibleEvents = timeline.slice(0, currentIndex + 1);
    const paymentCount = visibleEvents.filter((e) => e.type === 'payment_sent').length;
    const volume = flow?.apiCalls?.slice(0, Math.ceil((currentIndex + 1) / 2)).reduce((sum, c) => sum + Number.parseFloat(c.amountPaid || '0'), 0).toFixed(4) || '0.0000';
    const domains = new Set(visibleEvents.filter((e) => e.type === 'api_call_start').map((e) => e.label.replace('Calling ', '')));
    return (<><StatChip label="Total Agents" value={String(domains.size || '\u2014')} /><StatChip label="Volume" value={`$${volume}`} /><StatChip label="Transactions" value={String(paymentCount)} /></>);
});
StatsHUD.displayName = 'StatsHUD';

// ============================================================================
// Network Scene
// ============================================================================

const NetworkScene = memo<{ apiEndpoints: string[]; hubPositions: THREE.Vector3[]; mouseActive: React.MutableRefObject<boolean>; mouseWorldPos: React.MutableRefObject<THREE.Vector3>; nodeColor: string; stage: VortexStage; visibleHubs?: Set<number> }>(
    ({ hubPositions, stage, apiEndpoints, mouseWorldPos, mouseActive, nodeColor, visibleHubs }) => (
        <>
            <CameraController />
            <MouseTracker mouseActive={mouseActive} mouseWorldPos={mouseWorldPos} />
            <OriginSpokes hubPositions={hubPositions} nodeColor={nodeColor} stage={stage} />
            <PrimaryNodes apiEndpoints={apiEndpoints} hubPositions={hubPositions} nodeColor={nodeColor} stage={stage} />
            <ParticleSwarm hubPositions={hubPositions} mouseActive={mouseActive} mouseWorldPos={mouseWorldPos} stage={stage} visibleHubs={visibleHubs} />
            <ConnectionLines hubPositions={hubPositions} stage={stage} />
            <PaymentPulse hubPositions={hubPositions} stage={stage} />
        </>
    ),
);
NetworkScene.displayName = 'NetworkScene';

// ============================================================================
// Theme + Sidebar + Actions
// ============================================================================

export interface X402NetworkTheme { bg: string; nodeColor: string; userColor: string; }
const DEFAULT_THEME: X402NetworkTheme = { bg: '#ffffff', nodeColor: '#1a1a1a', userColor: '#1a1a1a' };

const SidebarFilters = memo<{ apiEndpoints: string[]; hiddenNodes: Set<number>; activeFilter: number | null; onToggle: (i: number) => void }>(({ apiEndpoints, hiddenNodes, activeFilter, onToggle }) => {
    if (apiEndpoints.length === 0) return null;
    return (
        <div className="sidebar-desktop" style={{ display: 'flex', flexDirection: 'column', gap: 8, left: 16, position: 'absolute', top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}>
            {apiEndpoints.map((endpoint, i) => {
                const label = extractNodeLabel(endpoint);
                const color = getProtocolColor(i);
                const isActive = activeFilter === i + 1;
                const isHidden = hiddenNodes.has(i + 1);
                return (
                    <button key={endpoint} onClick={() => onToggle(i + 1)} aria-pressed={isActive} className="giza-protocol-btn" style={{
                        alignItems: 'center', background: isActive ? color : isHidden ? '#f5f5f5' : '#fff',
                        border: isActive ? `2px solid ${color}` : '2px solid #e5e5e5', borderRadius: '50%',
                        boxShadow: isActive ? `0 2px 12px ${color}40` : '0 1px 4px rgba(0,0,0,0.06)',
                        color: isActive ? '#fff' : isHidden ? '#ccc' : '#666', cursor: 'pointer', display: 'flex',
                        fontFamily: FONT, fontSize: 11, fontWeight: 600, height: 44, justifyContent: 'center',
                        opacity: isHidden && !isActive ? 0.5 : 1, padding: 0, position: 'relative', transition: 'all 0.2s ease', width: 44,
                    }} title={label}>
                        <span style={{ fontSize: 15, fontWeight: 700, lineHeight: 1 }}>{label.charAt(0)}</span>
                        <span className="giza-filter-label sidebar-label" style={{
                            alignItems: 'center', background: '#1a1a1a', borderRadius: 6, color: '#fff', display: 'none',
                            fontFamily: FONT, fontSize: 10, fontWeight: 500, left: 54, letterSpacing: '0.04em',
                            padding: '5px 10px', position: 'absolute', textTransform: 'uppercase', whiteSpace: 'nowrap', zIndex: 20,
                        }}>
                            <span style={{ background: color, borderRadius: '50%', display: 'inline-block', height: 6, marginRight: 6, width: 6 }} />
                            {label}
                        </span>
                    </button>
                );
            })}
            <style>{`.giza-protocol-btn:hover .giza-filter-label { display: flex !important; }`}</style>
        </div>
    );
});
SidebarFilters.displayName = 'SidebarFilters';

const AddressSearch = memo<{ onSearch: (addr: string) => void }>(({ onSearch }) => {
    const [value, setValue] = useState('');
    return (
        <div className="search-pill" style={{ alignItems: 'center', background: '#fff', border: '1px solid #e5e5e5', borderRadius: 8, display: 'flex', gap: 8, padding: '4px 4px 4px 14px' }}>
            <span style={{ color: '#999', fontFamily: FONT, fontSize: 11, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Address</span>
            <input onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && onSearch(value)} placeholder="0x..." style={{ background: 'transparent', border: 'none', color: '#1a1a1a', fontFamily: FONT, fontSize: 12, outline: 'none', width: 180 }} value={value} />
            <button onClick={() => onSearch(value)} style={{ background: '#1a1a1a', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', fontFamily: FONT, fontSize: 11, fontWeight: 600, padding: '8px 16px' }}>Go</button>
        </div>
    );
});
AddressSearch.displayName = 'AddressSearch';

const ActionButtons = memo<{ onShare?: () => void; onStartJourney?: () => void }>(({ onShare, onStartJourney }) => (
    <div style={{ alignItems: 'center', bottom: 16, display: 'flex', gap: 12, position: 'absolute', right: 16, zIndex: 10 }}>
        {onShare && <button onClick={onShare} style={{ alignItems: 'center', background: '#f0f0f0', border: '1px solid #e0e0e0', borderRadius: '50%', color: '#1a1a1a', cursor: 'pointer', display: 'flex', fontFamily: FONT, fontSize: 11, fontWeight: 500, height: 64, justifyContent: 'center', letterSpacing: '0.04em', width: 64 }}>Share</button>}
        {onStartJourney && <button onClick={onStartJourney} style={{ alignItems: 'center', background: '#1a1a1a', border: 'none', borderRadius: '50%', color: '#fff', cursor: 'pointer', display: 'flex', flexDirection: 'column', fontFamily: FONT, fontSize: 11, fontWeight: 600, gap: 2, height: 80, justifyContent: 'center', letterSpacing: '0.04em', lineHeight: 1.2, textAlign: 'center', width: 80 }}><span>Start</span><span>journey</span></button>}
    </div>
));
ActionButtons.displayName = 'ActionButtons';

// ============================================================================
// Main Export
// ============================================================================

const X402Network = memo<{
    apiEndpoints?: string[]; compact?: boolean; flow?: X402FlowTrace | null; height?: number | string;
    onShare?: () => void; onStartJourney?: () => void; stage?: VortexStage; theme?: Partial<X402NetworkTheme>; title?: string;
}>(({ stage: externalStage = 'idle', apiEndpoints = [], compact = false, flow = null, height: externalHeight, onShare, onStartJourney, theme: themeOverride, title = 'World of PumpFun' }) => {
    const mouseWorldPos = useRef(new THREE.Vector3());
    const mouseActive = useRef(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const [contextLost, setContextLost] = useState(false);
    const handleCanvasCreated = useCallback((state: { gl: THREE.WebGLRenderer }) => {
        const canvas = state.gl.domElement;
        canvas.addEventListener('webglcontextlost', (e: Event) => { e.preventDefault(); setContextLost(true); });
        canvas.addEventListener('webglcontextrestored', () => { setContextLost(false); });
    }, []);
    const theme = useMemo(() => ({ ...DEFAULT_THEME, ...themeOverride }), [themeOverride]);
    const [hiddenNodes, setHiddenNodes] = useState<Set<number>>(new Set());
    const [activeFilter, setActiveFilter] = useState<number | null>(null);
    const handleToggleNode = useCallback((index: number) => {
        setActiveFilter((prev) => (prev === index ? null : index));
        setHiddenNodes((prev) => { const next = new Set(prev); if (next.has(index)) next.delete(index); else next.add(index); return next; });
    }, []);
    const handleAddressSearch = useCallback((_address: string) => {}, []);
    const hubPositions = useMemo(() => generateHubPositions(Math.max(apiEndpoints.length + 1, NETWORK_CONFIG.PRIMARY_NODES), NETWORK_CONFIG.HUB_SPREAD), [apiEndpoints.length]);
    const visibleHubs = useMemo<Set<number> | undefined>(() => {
        if (hiddenNodes.size === 0) return undefined;
        const visible = new Set<number>();
        for (let i = 0; i < hubPositions.length; i++) if (!hiddenNodes.has(i)) visible.add(i);
        return visible;
    }, [hiddenNodes, hubPositions.length]);
    const timeline = useMemo(() => buildTimeline(flow), [flow]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);
    const playIntervalRef = useRef<ReturnType<typeof setInterval>>();
    const activeStage = timeline.length > 0 ? (timeline[Math.min(currentIndex, timeline.length - 1)]?.stage ?? 'idle') : externalStage;
    useEffect(() => {
        if (!isPlaying || timeline.length === 0) return;
        playIntervalRef.current = setInterval(() => { setCurrentIndex((prev) => { if (prev >= timeline.length - 1) { setIsPlaying(false); return prev; } return prev + 1; }); }, 1200);
        return () => clearInterval(playIntervalRef.current);
    }, [isPlaying, timeline.length]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { if (flow) { setCurrentIndex(0); setIsPlaying(true); } }, [flow?.flowId]);
    const handlePlay = useCallback(() => { if (currentIndex >= timeline.length - 1) setCurrentIndex(0); setIsPlaying(true); }, [currentIndex, timeline.length]);
    const handlePause = useCallback(() => setIsPlaying(false), []);
    const handleScrub = useCallback((index: number) => { setCurrentIndex(index); setIsPlaying(false); }, []);
    const height = externalHeight ?? (compact ? 300 : 600);

    return (
        <div ref={containerRef} style={{ background: theme.bg, height, overflow: 'hidden', position: 'relative', width: '100%' }}>
            <TimelineScrubber currentIndex={currentIndex} isPlaying={isPlaying} onPause={handlePause} onPlay={handlePlay} onScrub={handleScrub} timeline={timeline} title={title} />
            <Canvas camera={{ fov: compact ? 45 : 50, far: 200, near: 0.1, position: [0, 3, compact ? 40 : 35] }} dpr={[1, 1.5]} gl={{ powerPreference: 'low-power', preserveDrawingBuffer: true }} onCreated={handleCanvasCreated} style={{ height: '100%', width: '100%' }}>
                <color args={[theme.bg]} attach="background" />
                <Suspense fallback={null}>
                    <NetworkScene apiEndpoints={apiEndpoints} hubPositions={hubPositions} mouseActive={mouseActive} mouseWorldPos={mouseWorldPos} nodeColor={theme.nodeColor} stage={activeStage} visibleHubs={visibleHubs} />
                </Suspense>
            </Canvas>
            {contextLost && (
                <div onClick={() => window.location.reload()} role="button" tabIndex={0} style={{ alignItems: 'center', background: 'rgba(255,255,255,0.95)', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 12, inset: 0, justifyContent: 'center', position: 'absolute', zIndex: 100 }}>
                    <span style={{ color: '#1a1a1a', fontFamily: FONT, fontSize: 14 }}>WebGL context lost</span>
                    <span style={{ color: '#999', fontFamily: FONT, fontSize: 12 }}>Click to reload</span>
                </div>
            )}
            {!compact && apiEndpoints.length > 0 && <SidebarFilters apiEndpoints={apiEndpoints} hiddenNodes={hiddenNodes} activeFilter={activeFilter} onToggle={handleToggleNode} />}
            <div className="stats-bar" style={{ alignItems: 'center', background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)', borderTop: '1px solid #eee', bottom: 0, display: 'flex', gap: 12, left: 0, padding: '10px 16px', position: 'absolute', right: compact ? 0 : 180, zIndex: 10 }}>
                <StatsHUD currentIndex={currentIndex} flow={flow} timeline={timeline} />
                {!compact && <AddressSearch onSearch={handleAddressSearch} />}
            </div>
            {!compact && <ActionButtons onShare={onShare} onStartJourney={onStartJourney} />}
        </div>
    );
});
X402Network.displayName = 'X402Network';

export default X402Network;
export { DEFAULT_THEME, NETWORK_COLORS, PROTOCOL_COLORS, getProtocolColor };
