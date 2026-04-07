'use client';

import React, { memo, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { CameraControls, Html } from '@react-three/drei';
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

import {
  type PumpGraphData,
  type PumpNode,
  type PumpLink,
  HUB_CENTRAL_ID,
  HUB_NODES,
  HUB_IDS,
} from './types';

// ---------------------------------------------------------------------------
// Simulation types
// ---------------------------------------------------------------------------

interface SimNode extends SimulationNodeDatum3D {
  id: string;
  type: 'token' | 'trade' | 'hub' | 'central';
  ticker?: string;
  isBuy?: boolean;
  solAmount?: number;
  label?: string;
  category?: string;
  timestamp: number;
  fx?: number | null;
  fy?: number | null;
  fz?: number | null;
}

interface SimEdge extends SimulationLinkDatum<SimNode> {
  source: string | SimNode;
  target: string | SimNode;
}

// ---------------------------------------------------------------------------
// Theme colors
// ---------------------------------------------------------------------------

interface ThemeColors {
  background: THREE.Color;
  edge: THREE.Color;
  edgeOpacity: number;
  hub: THREE.Color;         // monochrome for all hub/central nodes
  hubGlow: THREE.Color;     // glow color for hub nodes
  // Particle swarm colors (by category)
  buy: THREE.Color;         // green
  sell: THREE.Color;        // red
  create: THREE.Color;      // black/dark
  whale: THREE.Color;       // blue
  labelBg: string;
  labelText: string;
  labelShadow: string;
  ambientIntensity: number;
  directionalIntensity: number;
}

const DARK_THEME: ThemeColors = {
  background: new THREE.Color('#050505'),
  edge: new THREE.Color('#ffffff'),
  edgeOpacity: 0.25,
  hub: new THREE.Color('#cccccc'),       // monochrome light grey
  hubGlow: new THREE.Color('#999999'),
  buy: new THREE.Color('#4ade80'),       // green
  sell: new THREE.Color('#f87171'),      // red
  create: new THREE.Color('#666666'),    // dark grey (visible on dark bg)
  whale: new THREE.Color('#3b82f6'),     // blue
  labelBg: '#1a1a1a',
  labelText: '#ffffff',
  labelShadow: '0 2px 12px rgba(0,0,0,0.5)',
  ambientIntensity: 0.15,
  directionalIntensity: 0.4,
};

const LIGHT_THEME: ThemeColors = {
  background: new THREE.Color('#f8f9fa'),
  edge: new THREE.Color('#000000'),
  edgeOpacity: 0.18,
  hub: new THREE.Color('#444444'),       // monochrome dark grey
  hubGlow: new THREE.Color('#666666'),
  buy: new THREE.Color('#16a34a'),       // green
  sell: new THREE.Color('#dc2626'),      // red
  create: new THREE.Color('#222222'),    // black
  whale: new THREE.Color('#2563eb'),     // blue
  labelBg: '#ffffff',
  labelText: '#111111',
  labelShadow: '0 2px 12px rgba(0,0,0,0.15)',
  ambientIntensity: 0.6,
  directionalIntensity: 0.8,
};

// Helper: particle color by category
function particleColor(category: string | undefined, isBuy: boolean | undefined, theme: ThemeColors): THREE.Color {
  switch (category) {
    case 'creates': return theme.create;
    case 'whales':  return theme.whale;
    case 'buys':    return theme.buy;
    case 'sells':   return theme.sell;
    default:        return isBuy ? theme.buy : theme.sell;
  }
}

// ---------------------------------------------------------------------------
// Hub layout
// ---------------------------------------------------------------------------

const HUB_ORBIT_RADIUS = 55;

function hubPosition(index: number, total: number): [number, number, number] {
  const angle = (index / total) * Math.PI * 2 - Math.PI / 2;
  return [
    Math.cos(angle) * HUB_ORBIT_RADIUS,
    0,
    Math.sin(angle) * HUB_ORBIT_RADIUS,
  ];
}

// ---------------------------------------------------------------------------
// Force simulation wrapper
// ---------------------------------------------------------------------------

class PumpSimulation {
  nodes: SimNode[] = [];
  edges: SimEdge[] = [];
  private simulation: ReturnType<typeof forceSimulation<SimNode>>;
  private nodeMap = new Map<string, SimNode>();
  private hubsInitialized = false;

  private nodeId(nodeRef: string | PumpNode): string {
    return typeof nodeRef === 'string' ? nodeRef : nodeRef.id;
  }

  constructor() {
    this.simulation = forceSimulation<SimNode>([], 3)
      .numDimensions(3)
      .force(
        'charge',
        forceManyBody<SimNode>().strength((d) => {
          if (d.type === 'central') return -800;
          if (d.type === 'hub') return -500;
          if (d.type === 'token') return -20;
          if (d.type === 'trade') return -3;
          return -30;
        }),
      )
      .force('center', forceCenter<SimNode>(0, 0, 0).strength(0.02))
      .force(
        'collide',
        forceCollide<SimNode>().radius((d) => {
          if (d.type === 'central') return 12;
          if (d.type === 'hub') return 8;
          if (d.type === 'token') return 3;
          if (d.type === 'trade') return 1.5;
          return 1;
        }),
      )
      .force(
        'link',
        forceLink<SimNode, SimEdge>([])
          .id((d) => d.id)
          .distance((d) => {
            const src = typeof d.source === 'object' ? d.source : null;
            const tgt = typeof d.target === 'object' ? d.target : null;
            if (
              (src?.type === 'hub' && tgt?.type === 'central') ||
              (src?.type === 'central' && tgt?.type === 'hub')
            )
              return HUB_ORBIT_RADIUS;
            if (tgt?.type === 'hub' || src?.type === 'hub') return 18;
            return 40;
          })
          .strength((d) => {
            const src = typeof d.source === 'object' ? d.source : null;
            const tgt = typeof d.target === 'object' ? d.target : null;
            if (
              (src?.type === 'hub' && tgt?.type === 'central') ||
              (src?.type === 'central' && tgt?.type === 'hub')
            )
              return 0.05;
            return 0.3;
          }),
      )
      .alphaDecay(0.008)
      .velocityDecay(0.4);
  }

  private initHubs() {
    if (this.hubsInitialized) return;
    this.hubsInitialized = true;

    const central: SimNode = {
      id: HUB_CENTRAL_ID,
      type: 'central',
      label: 'PUMPFUN',
      timestamp: Date.now(),
      x: 0, y: 0, z: 0,
      fx: 0, fy: 0, fz: 0,
    };
    this.nodeMap.set(central.id, central);
    this.nodes.push(central);

    HUB_NODES.forEach((hub, i) => {
      const [hx, hy, hz] = hubPosition(i, HUB_NODES.length);
      const simNode: SimNode = {
        id: hub.id,
        type: 'hub',
        label: hub.label,
        timestamp: Date.now(),
        x: hx, y: hy, z: hz,
        fx: hx, fy: hy, fz: hz,
      };
      this.nodeMap.set(hub.id, simNode);
      this.nodes.push(simNode);
    });

    for (const hub of HUB_NODES) {
      this.edges.push({ source: hub.id, target: HUB_CENTRAL_ID });
    }
  }

  update(graphData: PumpGraphData) {
    this.initHubs();
    let changed = false;

    const activeIds = new Set<string>(HUB_IDS);
    for (const n of graphData.nodes) {
      if (HUB_IDS.has(n.id)) continue;
      activeIds.add(n.id);
      if (!this.nodeMap.has(n.id)) {
        const hubId = this.findTargetHub(n, graphData.links);
        const hubNode = hubId ? this.nodeMap.get(hubId) : null;
        const baseX = hubNode?.x ?? 0;
        const baseZ = hubNode?.z ?? 0;

        const simNode: SimNode = {
          id: n.id,
          type: n.type,
          ticker: n.ticker,
          isBuy: n.isBuy,
          solAmount: n.solAmount,
          label: n.label,
          category: n.category,
          timestamp: n.timestamp,
          x: baseX + (Math.random() - 0.5) * 30,
          y: (Math.random() - 0.5) * 20,
          z: baseZ + (Math.random() - 0.5) * 30,
        };
        this.nodeMap.set(n.id, simNode);
        this.nodes.push(simNode);
        changed = true;
      }
    }

    const before = this.nodes.length;
    this.nodes = this.nodes.filter((n) => activeIds.has(n.id));
    if (this.nodes.length !== before) {
      for (const [id] of this.nodeMap) {
        if (!activeIds.has(id)) this.nodeMap.delete(id);
      }
      changed = true;
    }

    const hubEdges = this.edges.filter((e) => {
      const src = typeof e.source === 'object' ? e.source.id : e.source;
      const tgt = typeof e.target === 'object' ? e.target.id : e.target;
      return (
        (HUB_IDS.has(src) && tgt === HUB_CENTRAL_ID) ||
        (src === HUB_CENTRAL_ID && HUB_IDS.has(tgt))
      );
    });

    const dataEdges = graphData.links
      .filter((l) => {
        const src = this.nodeId(l.source);
        const tgt = this.nodeId(l.target);
        return this.nodeMap.has(src) && this.nodeMap.has(tgt);
      })
      .map((l) => ({
        source: this.nodeId(l.source),
        target: this.nodeId(l.target),
      }));

    this.edges = [...hubEdges, ...dataEdges];

    if (changed) {
      this.simulation.nodes(this.nodes);
      this.simulation.numDimensions(3);
      (
        this.simulation.force('link') as ReturnType<typeof forceLink<SimNode, SimEdge>>
      ).links(this.edges);
      this.simulation.alpha(0.3).restart();
    }
  }

  private findTargetHub(node: PumpNode, links: PumpLink[]): string | null {
    for (const l of links) {
      const src = typeof l.source === 'string' ? l.source : l.source.id;
      const tgt = typeof l.target === 'string' ? l.target : l.target.id;
      if (src === node.id && HUB_IDS.has(tgt)) return tgt;
      if (tgt === node.id && HUB_IDS.has(src)) return src;
    }
    return null;
  }

  tick() {
    this.simulation.tick();
  }

  dispose() {
    this.simulation.stop();
  }
}

// ---------------------------------------------------------------------------
// Hub label (DOM overlay)
// ---------------------------------------------------------------------------

const HubLabel = memo<{
  label: string;
  position: [number, number, number];
  theme: ThemeColors;
}>(({ label, position, theme }) => (
  <Html position={position} center style={{ pointerEvents: 'none' }}>
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        transform: 'translateY(-14px)',
      }}
    >
      <div
        style={{
          background: theme.labelBg,
          color: theme.labelText,
          padding: '6px 14px',
          borderRadius: 20,
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 11,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          whiteSpace: 'nowrap',
          userSelect: 'none',
          boxShadow: theme.labelShadow,
        }}
      >
        {label}
      </div>
      <div
        style={{
          width: 0,
          height: 0,
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent',
          borderTop: `6px solid ${theme.labelBg}`,
          marginTop: -1,
        }}
      />
    </div>
  </Html>
));
HubLabel.displayName = 'HubLabel';

// ---------------------------------------------------------------------------
// Central orb — with glow
// ---------------------------------------------------------------------------

const CentralOrb = memo<{ sim: PumpSimulation; theme: ThemeColors }>(
  ({ sim, theme }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const glowRef = useRef<THREE.Mesh>(null);
    const matRef = useRef<THREE.MeshStandardMaterial>(null);
    const glowMatRef = useRef<THREE.MeshStandardMaterial>(null);

    // Update material colors when theme changes
    useEffect(() => {
      if (matRef.current) {
        matRef.current.color.copy(theme.hub);
        matRef.current.emissive.copy(theme.hub);
      }
      if (glowMatRef.current) {
        glowMatRef.current.color.copy(theme.hubGlow);
        glowMatRef.current.emissive.copy(theme.hubGlow);
      }
    }, [theme]);

    useFrame(({ clock }) => {
      const node = sim.nodes.find((n) => n.id === HUB_CENTRAL_ID);
      if (!node || !meshRef.current) return;
      const x = node.x ?? 0;
      const y = node.y ?? 0;
      const z = node.z ?? 0;
      meshRef.current.position.set(x, y, z);
      const pulse = 1 + Math.sin(clock.elapsedTime * 1.2) * 0.05;
      meshRef.current.scale.setScalar(6 * pulse);

      if (glowRef.current) {
        glowRef.current.position.set(x, y, z);
        glowRef.current.scale.setScalar(9 * pulse);
      }
    });

    return (
      <>
        <mesh ref={meshRef}>
          <icosahedronGeometry args={[1, 3]} />
          <meshStandardMaterial
            ref={matRef}
            color={theme.hub}
            emissive={theme.hub}
            emissiveIntensity={1.0}
            roughness={0.15}
            metalness={0.3}
            toneMapped={false}
          />
        </mesh>
        <mesh ref={glowRef}>
          <icosahedronGeometry args={[1, 3]} />
          <meshStandardMaterial
            ref={glowMatRef}
            color={theme.hubGlow}
            emissive={theme.hubGlow}
            emissiveIntensity={0.4}
            transparent
            opacity={0.12}
            toneMapped={false}
          />
        </mesh>
      </>
    );
  },
);
CentralOrb.displayName = 'CentralOrb';

// ---------------------------------------------------------------------------
// Hub node spheres + labels — with glow halos
// ---------------------------------------------------------------------------

const HubNodes = memo<{ sim: PumpSimulation; darkMode: boolean; theme: ThemeColors }>(
  ({ sim, darkMode, theme }) => {
    const groupRef = useRef<THREE.Group>(null);
    const meshRefs = useRef<(THREE.Mesh | null)[]>([]);
    const glowRefs = useRef<(THREE.Mesh | null)[]>([]);
    const matRefs = useRef<(THREE.MeshStandardMaterial | null)[]>([]);
    const glowMatRefs = useRef<(THREE.MeshStandardMaterial | null)[]>([]);
    const labelPositions = useRef<[number, number, number][]>(
      HUB_NODES.map(() => [0, 0, 0] as [number, number, number]),
    );

    const [, forceUpdate] = React.useState(0);

    // Update materials when theme changes — all hubs monochrome
    useEffect(() => {
      HUB_NODES.forEach((_hub, i) => {
        if (matRefs.current[i]) {
          matRefs.current[i]!.color.copy(theme.hub);
          matRefs.current[i]!.emissive.copy(theme.hub);
        }
        if (glowMatRefs.current[i]) {
          glowMatRefs.current[i]!.color.copy(theme.hubGlow);
          glowMatRefs.current[i]!.emissive.copy(theme.hubGlow);
        }
      });
    }, [darkMode, theme]);

    useFrame(({ clock }) => {
      let posChanged = false;
      HUB_NODES.forEach((hub, i) => {
        const node = sim.nodes.find((n) => n.id === hub.id);
        const mesh = meshRefs.current[i];
        const glow = glowRefs.current[i];
        if (!node || !mesh) return;
        const x = node.x ?? 0;
        const y = node.y ?? 0;
        const z = node.z ?? 0;
        mesh.position.set(x, y, z);
        const pulse = 1 + Math.sin(clock.elapsedTime * 0.8 + i * 1.1) * 0.04;
        mesh.scale.setScalar(3.5 * pulse);

        if (glow) {
          glow.position.set(x, y, z);
          glow.scale.setScalar(5 * pulse);
        }

        const newLabelPos: [number, number, number] = [x, y + 7, z];
        const old = labelPositions.current[i];
        if (
          Math.abs(old[0] - newLabelPos[0]) > 0.1 ||
          Math.abs(old[1] - newLabelPos[1]) > 0.1 ||
          Math.abs(old[2] - newLabelPos[2]) > 0.1
        ) {
          labelPositions.current[i] = newLabelPos;
          posChanged = true;
        }
      });
      if (posChanged && Math.random() < 0.1) forceUpdate((c) => c + 1);
    });

    const centralNode = sim.nodes.find((n) => n.id === HUB_CENTRAL_ID);
    const centralLabelPos: [number, number, number] = [
      centralNode?.x ?? 0,
      (centralNode?.y ?? 0) + 10,
      centralNode?.z ?? 0,
    ];

    return (
      <group ref={groupRef}>
        {HUB_NODES.map((hub, i) => {
          return (
            <React.Fragment key={hub.id}>
              {/* Main hub sphere — monochrome */}
              <mesh ref={(el) => { meshRefs.current[i] = el; }}>
                <icosahedronGeometry args={[1, 2]} />
                <meshStandardMaterial
                  ref={(el) => { matRefs.current[i] = el; }}
                  color={theme.hub}
                  emissive={theme.hub}
                  emissiveIntensity={0.9}
                  roughness={0.2}
                  metalness={0.1}
                  toneMapped={false}
                />
              </mesh>
              {/* Glow halo — monochrome */}
              <mesh ref={(el) => { glowRefs.current[i] = el; }}>
                <icosahedronGeometry args={[1, 2]} />
                <meshStandardMaterial
                  ref={(el) => { glowMatRefs.current[i] = el; }}
                  color={theme.hubGlow}
                  emissive={theme.hubGlow}
                  emissiveIntensity={0.3}
                  transparent
                  opacity={0.1}
                  toneMapped={false}
                />
              </mesh>
              <HubLabel
                label={hub.label}
                position={labelPositions.current[i]}
                theme={theme}
              />
            </React.Fragment>
          );
        })}
        <HubLabel label="PUMPFUN" position={centralLabelPos} theme={theme} />
      </group>
    );
  },
);
HubNodes.displayName = 'HubNodes';

// ---------------------------------------------------------------------------
// Trade / token particle nodes
// ---------------------------------------------------------------------------

const ParticleNodes = memo<{ sim: PumpSimulation; theme: ThemeColors }>(
  ({ sim, theme }) => {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const tempObj = useMemo(() => new THREE.Object3D(), []);
    const tempColor = useMemo(() => new THREE.Color(), []);
    const geo = useMemo(() => new THREE.SphereGeometry(1, 8, 8), []);
    const mat = useMemo(
      () =>
        new THREE.MeshStandardMaterial({
          roughness: 0.4,
          metalness: 0.0,
          transparent: true,
          opacity: 0.9,
          toneMapped: false,
        }),
      [],
    );

    useFrame(() => {
      const mesh = meshRef.current;
      if (!mesh) return;

      let idx = 0;
      for (const node of sim.nodes) {
        if (node.type === 'hub' || node.type === 'central') continue;
        tempObj.position.set(node.x ?? 0, node.y ?? 0, node.z ?? 0);

        if (node.type === 'token') {
          tempObj.scale.setScalar(1.5);
        } else {
          const size = 0.3 + Math.min((node.solAmount ?? 0) * 0.15, 1.2);
          tempObj.scale.setScalar(size);
        }

        // Color by category: buys=green, sells=red, creates=dark, whales=blue
        tempColor.copy(particleColor(node.category, node.isBuy, theme));

        tempObj.updateMatrix();
        mesh.setMatrixAt(idx, tempObj.matrix);
        mesh.setColorAt(idx, tempColor);
        idx++;
      }

      mesh.count = idx;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    });

    return (
      <instancedMesh ref={meshRef} args={[geo, mat, 5000]} frustumCulled={false} />
    );
  },
);
ParticleNodes.displayName = 'ParticleNodes';

// ---------------------------------------------------------------------------
// Edge rendering — theme-aware color
// ---------------------------------------------------------------------------

const Edges = memo<{ sim: PumpSimulation; theme: ThemeColors }>(({ sim, theme }) => {
  const lineRef = useRef<THREE.LineSegments>(null);
  const positionsRef = useRef(new Float32Array(0));
  const matRef = useRef<THREE.LineBasicMaterial>(null);

  useEffect(() => {
    if (matRef.current) {
      matRef.current.color.copy(theme.edge);
      matRef.current.opacity = theme.edgeOpacity;
    }
  }, [theme]);

  useFrame(() => {
    const line = lineRef.current;
    if (!line) return;
    const geo = line.geometry;

    const edgeCount = sim.edges.length;
    const needed = edgeCount * 6;
    if (positionsRef.current.length < needed) {
      positionsRef.current = new Float32Array(needed);
      geo.setAttribute('position', new THREE.BufferAttribute(positionsRef.current, 3));
    }

    const pos = positionsRef.current;
    let idx = 0;
    for (const edge of sim.edges) {
      const src = typeof edge.source === 'object' ? edge.source : null;
      const tgt = typeof edge.target === 'object' ? edge.target : null;
      if (!src || !tgt) continue;
      pos[idx++] = src.x ?? 0;
      pos[idx++] = src.y ?? 0;
      pos[idx++] = src.z ?? 0;
      pos[idx++] = tgt.x ?? 0;
      pos[idx++] = tgt.y ?? 0;
      pos[idx++] = tgt.z ?? 0;
    }

    geo.setDrawRange(0, idx / 3);
    const posAttr = geo.getAttribute('position') as THREE.BufferAttribute | undefined;
    if (posAttr) posAttr.needsUpdate = true;
  });

  return (
    <lineSegments ref={lineRef}>
      <bufferGeometry />
      <lineBasicMaterial
        ref={matRef}
        color={theme.edge}
        transparent
        opacity={theme.edgeOpacity}
      />
    </lineSegments>
  );
});
Edges.displayName = 'PumpEdges';

// ---------------------------------------------------------------------------
// Scene
// ---------------------------------------------------------------------------

const PumpScene = memo<{ sim: PumpSimulation; darkMode: boolean }>(
  ({ sim, darkMode }) => {
    const { scene } = useThree();
    const theme = darkMode ? DARK_THEME : LIGHT_THEME;

    useEffect(() => {
      scene.background = theme.background.clone();
    }, [scene, theme.background, darkMode]);

    useFrame(() => {
      sim.tick();
    });

    return (
      <>
        <directionalLight position={[20, 40, 20]} intensity={theme.directionalIntensity} />
        <ambientLight intensity={theme.ambientIntensity} />
        <CentralOrb sim={sim} theme={theme} />
        <HubNodes sim={sim} darkMode={darkMode} theme={theme} />
        <ParticleNodes sim={sim} theme={theme} />
        <Edges sim={sim} theme={theme} />
        <CameraControls makeDefault />
      </>
    );
  },
);
PumpScene.displayName = 'PumpScene';

// ---------------------------------------------------------------------------
// Exported component
// ---------------------------------------------------------------------------

export function PumpForceGraph({
  graphData,
  darkMode = true,
}: {
  graphData: PumpGraphData;
  darkMode?: boolean;
}) {
  const simRef = useRef<PumpSimulation | null>(null);
  if (!simRef.current) simRef.current = new PumpSimulation();

  useEffect(() => {
    simRef.current!.update(graphData);
  }, [graphData]);

  useEffect(() => {
    return () => simRef.current?.dispose();
  }, []);

  return (
    <Canvas
      camera={{ position: [0, 60, 140], fov: 55, near: 0.1, far: 2000 }}
      gl={{ antialias: true, alpha: false }}
      style={{ width: '100%', height: '100%' }}
    >
      <PumpScene sim={simRef.current} darkMode={darkMode} />
    </Canvas>
  );
}
