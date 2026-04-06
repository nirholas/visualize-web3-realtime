'use client';

import React, { forwardRef, memo, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, CameraControls } from '@react-three/drei';
import CameraControlsImpl from 'camera-controls';
import * as THREE from 'three';
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  type SimulationNodeDatum3D,
} from 'd3-force-3d';
import type { SimulationLinkDatum } from 'd3-force';

import type { TopToken, TraderEdge } from '@web3viz/core';
import type { ShareColors } from './SharePanel';

import { ProtocolLabel } from './ProtocolLabel';
import { CHAIN_COLORS, COLOR_PALETTE, GRAPH_CONFIG } from './constants';
import YouAreHereMarker from './YouAreHereMarker';
import { PostProcessing } from '@web3viz/react-graph';
import { HubNodeMesh } from './components/HubNodeMesh';
import { AgentNodes } from './components/AgentNodes';
import { Edges } from './components/Edges';
import { EdgeParticles } from './components/EdgeParticles';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ForceNode extends SimulationNodeDatum3D {
  id: string;
  type: 'hub' | 'agent';
  label: string;
  radius: number;
  color: string;
  /** For agent nodes: which hub mint they belong to */
  hubTokenAddress?: string;
  /** Source provider that owns this node */
  source?: string;
  /** Whether this agent is a whale trader */
  isWhale?: boolean;
  /** Whether this agent is a detected sniper bot */
  isSniper?: boolean;
  /** Bonding curve progress 0–1 (for hub nodes, PumpFun only) */
  bondingCurveProgress?: number;
  /** Whether this hub token has graduated */
  graduated?: boolean;
}

interface ForceEdge extends SimulationLinkDatum<ForceNode> {
  sourceId: string;
  targetId: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const {
  MAX_AGENTS,
  HUB_BASE_RADIUS,
  HUB_MAX_RADIUS,
  IDLE_NODE_COUNT,
  IDLE_SPEED,
  IDLE_RADIUS_MIN,
  IDLE_RADIUS_MAX,
  IDLE_SPREAD,
} = GRAPH_CONFIG;

// ---------------------------------------------------------------------------
// Force simulation manager (runs outside React render cycle)
// ---------------------------------------------------------------------------

export class ForceGraphSimulation {
  nodes: ForceNode[] = [];
  edges: ForceEdge[] = [];
  private simulation: ReturnType<typeof forceSimulation<ForceNode>>;
  nodeMap = new Map<string, ForceNode>();

  constructor() {
    // numDimensions=3 enables full volumetric (spherical) layout
    this.simulation = forceSimulation<ForceNode>([], 3)
      .numDimensions(3)
      .force('charge', forceManyBody<ForceNode>().strength((d) => (d.type === 'hub' ? -120 : -0.3)))
      .force('center', forceCenter<ForceNode>(0, 0, 0).strength(0.12))
      .force(
        'collide',
        forceCollide<ForceNode>()
          .radius((d) => (d.type === 'hub' ? d.radius + 1 : d.radius + 0.05))
          .strength(0.4),
      )
      .force(
        'link',
        forceLink<ForceNode, ForceEdge>([])
          .id((d) => d.id)
          .distance((d) => {
            const src = d.source as ForceNode;
            const tgt = d.target as ForceNode;
            if (src.type === 'hub' && tgt.type === 'hub') return 18;
            return 1.5 + Math.random() * 2;
          })
          .strength((d) => {
            const src = d.source as ForceNode;
            const tgt = d.target as ForceNode;
            if (src.type === 'hub' && tgt.type === 'hub') return 0.15;
            return 0.6;
          }),
      )
      .alphaDecay(0.008)
      .velocityDecay(0.5);
  }

  update(topTokens: TopToken[], traderEdges: TraderEdge[]) {
    let changed = false;

    // --- Hub nodes from top tokens ---
    const hubAddresses = new Set<string>();
    for (let i = 0; i < topTokens.length; i++) {
      const t = topTokens[i];
      hubAddresses.add(t.tokenAddress);
      const existing = this.nodeMap.get(t.tokenAddress);
      const maxVol = topTokens[0]?.volume || 1;
      const scaledRadius = HUB_BASE_RADIUS + (t.volume / maxVol) * (HUB_MAX_RADIUS - HUB_BASE_RADIUS);
      if (existing) {
        existing.radius = scaledRadius;
        existing.label = t.symbol || t.name;
        existing.source = t.source;
        existing.bondingCurveProgress = t.bondingCurveProgress;
        existing.graduated = t.graduated;
      } else {
        // Distribute hubs on a sphere using spherical coordinates
        const phi = Math.acos(1 - (2 * (i + 0.5)) / Math.max(topTokens.length, 1));
        const theta = Math.PI * (1 + Math.sqrt(5)) * i; // golden angle
        const dist = 10 + Math.random() * 4;
        const node: ForceNode = {
          id: t.tokenAddress,
          type: 'hub',
          label: t.symbol || t.name,
          radius: scaledRadius,
          color: CHAIN_COLORS[t.chain ?? ''] || COLOR_PALETTE[i % COLOR_PALETTE.length],
          source: t.source,
          bondingCurveProgress: t.bondingCurveProgress,
          graduated: t.graduated,
          x: Math.sin(phi) * Math.cos(theta) * dist,
          y: Math.sin(phi) * Math.sin(theta) * dist,
          z: Math.cos(phi) * dist,
        };
        this.nodeMap.set(t.tokenAddress, node);
        this.nodes.push(node);
        changed = true;
      }
    }

    // --- Agent nodes from trader edges ---
    const agentCount = this.nodes.filter((n) => n.type === 'agent').length;
    const budget = MAX_AGENTS - agentCount;
    let added = 0;

    for (const edge of traderEdges) {
      if (!hubAddresses.has(edge.tokenAddress)) continue;
      const agentId = `agent:${edge.trader}:${edge.tokenAddress}`;
      if (this.nodeMap.has(agentId)) continue;
      if (added >= budget) break;

      const hub = this.nodeMap.get(edge.tokenAddress);
      // Distribute agents spherically around their hub
      const aPhi = Math.acos(1 - 2 * Math.random());
      const aTheta = Math.random() * Math.PI * 2;
      const dist = 0.5 + Math.random() * 2.5;
      const node: ForceNode = {
        id: agentId,
        type: 'agent',
        label: edge.trader.slice(0, 6),
        radius: GRAPH_CONFIG.AGENT_RADIUS,
        color: '#555566',
        hubTokenAddress: edge.tokenAddress,
        source: edge.source,
        isWhale: edge.isWhale,
        isSniper: edge.isSniper,
        x: (hub?.x ?? 0) + Math.sin(aPhi) * Math.cos(aTheta) * dist,
        y: (hub?.y ?? 0) + Math.sin(aPhi) * Math.sin(aTheta) * dist,
        z: (hub?.z ?? 0) + Math.cos(aPhi) * dist,
      };
      this.nodeMap.set(agentId, node);
      this.nodes.push(node);
      added++;
      changed = true;
    }

    // --- Edges ---
    if (changed) {
      const newEdges: ForceEdge[] = [];

      // Hub-to-hub edges (fully connected between top tokens)
      const hubNodes = this.nodes.filter((n) => n.type === 'hub');
      for (let i = 0; i < hubNodes.length; i++) {
        for (let j = i + 1; j < hubNodes.length; j++) {
          newEdges.push({
            sourceId: hubNodes[i].id,
            targetId: hubNodes[j].id,
            source: hubNodes[i].id,
            target: hubNodes[j].id,
          });
        }
      }

      // Agent-to-hub edges
      for (const node of this.nodes) {
        if (node.type === 'agent' && node.hubTokenAddress && this.nodeMap.has(node.hubTokenAddress)) {
          newEdges.push({
            sourceId: node.id,
            targetId: node.hubTokenAddress,
            source: node.id,
            target: node.hubTokenAddress,
          });
        }
      }

      this.edges = newEdges;

      this.simulation.nodes(this.nodes);
      this.simulation.numDimensions(3);
      (this.simulation.force('link') as ReturnType<typeof forceLink<ForceNode, ForceEdge>>).links(this.edges);
      this.simulation.alpha(0.3).restart();
    }
  }

  tick() {
    this.simulation.tick();
  }

  dispose() {
    this.simulation.stop();
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Three.js sub-components
// ---------------------------------------------------------------------------

/** Scene background color controller */
const SceneBackground = memo<{ color: string }>(({ color }) => {
  const { scene } = useThree();
  useEffect(() => {
    scene.background = new THREE.Color(color);
  }, [color, scene]);
  return null;
});
SceneBackground.displayName = 'SceneBackground';

// ---------------------------------------------------------------------------
// Idle ambient scene — gentle drifting orbs when no data is active
// ---------------------------------------------------------------------------

interface IdleNode {
  x: number;
  z: number;
  vx: number;
  vz: number;
  radius: number;
  gray: number; // 0..1 lightness
}

function createIdleNodes(): IdleNode[] {
  const nodes: IdleNode[] = [];
  for (let i = 0; i < IDLE_NODE_COUNT; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * IDLE_SPREAD;
    nodes.push({
      x: Math.cos(angle) * dist,
      z: Math.sin(angle) * dist,
      vx: (Math.random() - 0.5) * IDLE_SPEED,
      vz: (Math.random() - 0.5) * IDLE_SPEED,
      radius: IDLE_RADIUS_MIN + Math.random() * (IDLE_RADIUS_MAX - IDLE_RADIUS_MIN),
      gray: 0.5 + Math.random() * 0.4,
    });
  }
  return nodes;
}

const IdleAmbientScene = memo(() => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const nodesRef = useRef<IdleNode[]>(createIdleNodes());
  const tempObj = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);
  const geometry = useMemo(() => new THREE.SphereGeometry(1, 16, 16), []);
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        roughness: 0.4,
        metalness: 0.0,
        emissive: new THREE.Color('#60a5fa'),
        emissiveIntensity: 1.2,
        transparent: true,
        opacity: 0.7,
        toneMapped: false,
      }),
    [],
  );

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const nodes = nodesRef.current;
    mesh.count = nodes.length;

    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      // Drift
      n.x += n.vx * delta * 60;
      n.z += n.vz * delta * 60;
      // Soft boundary: gently pull back toward center
      const dist = Math.sqrt(n.x * n.x + n.z * n.z);
      if (dist > IDLE_SPREAD) {
        const pull = 0.001 * (dist - IDLE_SPREAD);
        n.vx -= (n.x / dist) * pull;
        n.vz -= (n.z / dist) * pull;
      }
      // Damping
      n.vx *= 0.998;
      n.vz *= 0.998;

      tempObj.position.set(n.x, 0, n.z);
      tempObj.scale.setScalar(n.radius);
      tempObj.updateMatrix();
      mesh.setMatrixAt(i, tempObj.matrix);

      tempColor.setRGB(n.gray, n.gray, n.gray);
      mesh.setColorAt(i, tempColor);
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <>
      <Environment preset="studio" environmentIntensity={0.4} background={false} />
      <directionalLight position={[20, 40, 20]} intensity={0.3} />
      <instancedMesh ref={meshRef} args={[geometry, material, IDLE_NODE_COUNT]} frustumCulled={false} />
    </>
  );
});
IdleAmbientScene.displayName = 'IdleAmbientScene';

// ---------------------------------------------------------------------------
// Scene: assembles all 3D sub-components + camera
// ---------------------------------------------------------------------------

const NetworkScene = memo<{
  sim: ForceGraphSimulation;
  topTokens: TopToken[];
  activeProtocol: string | null;
  highlightedHubIndex: number | null;
  /** Address of the searched agent — overrides hub-level highlighting */
  highlightedAddress?: string | null;
  onSelectProtocol: (mint: string | null) => void;
  onDismissHighlight?: () => void;
  shareColors?: ShareColors;
  isDark?: boolean;
}>(
  ({
    sim,
    topTokens,
    activeProtocol,
    highlightedHubIndex,
    highlightedAddress,
    onSelectProtocol,
    onDismissHighlight,
    shareColors,
    isDark = true,
  }) => {
    const [hoveredHub, setHoveredHub] = useState<string | null>(null);

    const hubIds = useMemo(() => topTokens.map((t) => ({ id: t.tokenAddress, label: t.symbol || t.name })), [topTokens]);

    // Hub-level highlight only used when there's no address search active
    const highlightedHubId =
      !highlightedAddress && highlightedHubIndex != null ? hubIds[highlightedHubIndex]?.id ?? null : null;

    // Track the highlighted agent's 3D position for the YouAreHereMarker
    const agentPositionRef = useRef<THREE.Vector3 | null>(null);

    // Tick simulation and update tracked positions each frame
    useFrame(() => {
      sim.tick();

      // Track highlighted agent position
      if (highlightedAddress) {
        const searchLower = highlightedAddress.toLowerCase();
        let found = false;
        for (const node of sim.nodes) {
          if (node.type !== 'agent') continue;
          const parts = node.id.split(':');
          if (parts.length >= 2 && parts[1].toLowerCase() === searchLower) {
            if (!agentPositionRef.current) agentPositionRef.current = new THREE.Vector3();
            agentPositionRef.current.set(node.x ?? 0, node.y ?? 0, node.z ?? 0);
            found = true;
            break;
          }
        }
        if (!found) agentPositionRef.current = null;
      } else {
        agentPositionRef.current = null;
      }
    });

    return (
      <>
        {shareColors && <SceneBackground color={shareColors.background} />}

        <Environment preset="studio" environmentIntensity={0.6} background={false} />
        <directionalLight position={[20, 40, 20]} intensity={0.4} />
        <directionalLight position={[-20, 30, -30]} intensity={0.15} color="#a78bfa" />

        <Edges
          sim={sim}
          activeProtocol={activeProtocol}
          highlightedHubId={highlightedHubId}
          highlightedAddress={highlightedAddress}
          isDark={isDark}
        />
        <EdgeParticles sim={sim} isDark={isDark} />
        {hubIds.map((hub, i) => (
          <HubNodeMesh
            key={hub.id}
            sim={sim}
            nodeId={hub.id}
            paletteIndex={i}
            isActive={activeProtocol === hub.id}
            isDimmed={activeProtocol !== null && activeProtocol !== hub.id}
            isHighlighted={highlightedHubId === hub.id}
            isHovered={hoveredHub === hub.id}
            onPointerOver={() => setHoveredHub(hub.id)}
            onPointerOut={() => setHoveredHub(null)}
            onClick={() => {
              onSelectProtocol(activeProtocol === hub.id ? null : hub.id);
              onDismissHighlight?.();
            }}
            colorOverride={shareColors?.palette?.[i]}
            isDark={isDark}
          />
        ))}
        <AgentNodes
          sim={sim}
          activeProtocol={activeProtocol}
          highlightedHubId={highlightedHubId}
          highlightedAddress={highlightedAddress}
          colorOverride={shareColors?.palette?.[hubIds.findIndex((h) => h.id === activeProtocol)]}
          isDark={isDark}
        />

        {agentPositionRef.current && <YouAreHereMarker position={agentPositionRef.current} />}
      </>
    );
  },
);
NetworkScene.displayName = 'NetworkScene';

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export interface ForceGraphHandle {
  /** Capture a high-resolution snapshot of the canvas as a data URL */
  capture: (width: number, height: number) => Promise<string>;
  /** Set camera to a specific position and target */
  setCamera: (
    position: [number, number, number],
    target: [number, number, number],
    animate?: boolean,
  ) => void;
  /** Get the current camera position and target */
  getCamera: () => { position: [number, number, number]; target: [number, number, number] };
  /** Get an array of the current hub IDs (token addresses) in order */
  getHubIds: () => string[];
}

export interface ForceGraphProps {
  topTokens: TopToken[];
  traderEdges: TraderEdge[];
  activeProtocol: string | null;
  highlightedHubIndex: number | null;
  /** If set, highlights this specific agent address */
  highlightedAddress?: string | null;
  onSelectProtocol: (mint: string | null) => void;
  onDismissHighlight?: () => void;
  /** For snapshot sharing — overrides default colors */
  shareColors?: ShareColors;
  /** Dark or light mode */
  isDark?: boolean;
}

const ForceGraph = forwardRef<ForceGraphHandle, ForceGraphProps>(
  (
    {
      topTokens,
      traderEdges,
      activeProtocol,
      highlightedHubIndex,
      highlightedAddress,
      onSelectProtocol,
      onDismissHighlight,
      shareColors,
      isDark,
    },
    ref,
  ) => {
    const sim = useMemo(() => new ForceGraphSimulation(), []);
    const cameraControlsRef = useRef<CameraControlsImpl>(null!);
    const { gl, scene, camera } = useThree();

    // Update simulation on data change
    useEffect(() => {
      sim.update(topTokens, traderEdges);
    }, [sim, topTokens, traderEdges]);

    // Expose capture handle
    useImperativeHandle(ref, () => ({
      capture: async (width: number, height: number) => {
        const currentSize = new THREE.Vector2();
        gl.getSize(currentSize);
        gl.setSize(width, height, false);
        gl.render(scene, camera);
        const dataUrl = gl.domElement.toDataURL('image/png');
        gl.setSize(currentSize.x, currentSize.y, false);
        return dataUrl;
      },
      setCamera: (position, target, animate = false) => {
        cameraControlsRef.current?.setLookAt(...position, ...target, animate);
      },
      getCamera: () => {
        const pos = cameraControlsRef.current?.getPosition(new THREE.Vector3());
        const tgt = cameraControlsRef.current?.getTarget(new THREE.Vector3());
        return {
          position: (pos?.toArray() as [number, number, number]) || [0, 0, 50],
          target: (tgt?.toArray() as [number, number, number]) || [0, 0, 0],
        };
      },
      getHubIds: () => sim.nodes.filter((n) => n.type === 'hub').map((n) => n.id),
    }));

    const showNetwork = topTokens.length > 0;

    return (
      <>
        {showNetwork ? (
          <NetworkScene
            sim={sim}
            topTokens={topTokens}
            activeProtocol={activeProtocol}
            highlightedHubIndex={highlightedHubIndex}
            highlightedAddress={highlightedAddress}
            onSelectProtocol={onSelectProtocol}
            onDismissHighlight={onDismissHighlight}
            shareColors={shareColors}
            isDark={isDark}
          />
        ) : (
          <IdleAmbientScene />
        )}
        <CameraControls
          ref={cameraControlsRef}
          minDistance={5}
          maxDistance={120}
          truckSpeed={0}
          mouseButtons={{ left: 1, middle: 0, right: 2, wheel: 8 }}
          touches={{ one: 32, two: 1024, three: 0 }}
        />
        <PostProcessing isDark={isDark} />
      </>
    );
  },
);
ForceGraph.displayName = 'ForceGraph';

const ForceGraphCanvas = forwardRef<ForceGraphHandle, ForceGraphProps>((props, ref) => {
  return (
    <Canvas
      camera={{ position: [0, 0, 50], fov: 45, near: 0.1, far: 1000 }}
      gl={{ preserveDrawingBuffer: true, antialias: true }}
      frameloop="demand"
    >
      <ForceGraph {...props} ref={ref} />
    </Canvas>
  );
});
ForceGraphCanvas.displayName = 'ForceGraphCanvas';

export default ForceGraphCanvas;
