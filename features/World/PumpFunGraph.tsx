// Re-export from the canonical location in app/pumpfun/
export { default, default as PumpFunGraph } from '@/app/pumpfun/PumpFunGraph';


// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Orbit camera radius */
const CAMERA_ORBIT_RADIUS = 500;

/** Camera orbit speed multiplier (radians per ms) */
const CAMERA_ORBIT_SPEED = 0.0001;

/** Duration to pause cinematic camera after user interaction (ms) */
const CAMERA_PAUSE_DURATION_MS = 8_000;

/** Maximum instanced mesh count for trade sprites */
const MAX_TRADE_SPRITES = 6_000;

/** Maximum instanced mesh count for token hubs */
const MAX_TOKEN_HUBS = 20;

// ---------------------------------------------------------------------------
// Simulation node / edge types
// ---------------------------------------------------------------------------

interface SwarmNode extends SimulationNodeDatum3D {
  id: string;
  type: 'token' | 'trade';
  label: string;
  tokenAddress: string;
  volume: number;
  isWhale?: boolean;
  isSniper?: boolean;
  bondingCurveProgress?: number;
  graduated?: boolean;
}

interface SwarmEdge extends SimulationLinkDatum<SwarmNode> {
  sourceId: string;
  targetId: string;
}

// ---------------------------------------------------------------------------
// Swarm Force Simulation
// ---------------------------------------------------------------------------

class SwarmSimulation {
  nodes: SwarmNode[] = [];
  edges: SwarmEdge[] = [];
  private simulation: ReturnType<typeof forceSimulation<SwarmNode>>;
  private nodeMap = new Map<string, SwarmNode>();

  constructor() {
    this.simulation = forceSimulation<SwarmNode>([], 3)
      .numDimensions(3)
      // Repulsion — tokens push far, trades buzz slightly
      .force(
        'charge',
        forceManyBody<SwarmNode>().strength((d) =>
          d.type === 'token' ? -300 : -2,
        ),
      )
      // Centering
      .force('center', forceCenter<SwarmNode>(0, 0, 0).strength(0.05))
      // Collision — large gap around tokens, tight trades
      .force(
        'collide',
        forceCollide<SwarmNode>()
          .radius((d) => (d.type === 'token' ? 25 : 2))
          .strength(0.7)
          .iterations(2),
      )
      // Links — tight orbit distance
      .force(
        'link',
        forceLink<SwarmNode, SwarmEdge>([])
          .id((d) => d.id)
          .distance(15)
          .strength(0.8),
      )
      .alphaDecay(0.01)
      .velocityDecay(0.4);
  }

  update(graphData: PumpFunGraphData) {
    let changed = false;
    const incomingIds = new Set<string>();

    // ---- Token nodes ----
    for (const raw of graphData.nodes) {
      if (raw.type !== 'token') continue;
      incomingIds.add(raw.id);
      const existing = this.nodeMap.get(raw.id);
      if (existing) {
        existing.volume = raw.volume;
        existing.label = raw.label;
        existing.bondingCurveProgress = raw.bondingCurveProgress;
        existing.graduated = raw.graduated;
      } else {
        const angle = Math.random() * Math.PI * 2;
        const dist = 40 + Math.random() * 60;
        const node: SwarmNode = {
          id: raw.id,
          type: 'token',
          label: raw.label,
          tokenAddress: raw.tokenAddress,
          volume: raw.volume,
          bondingCurveProgress: raw.bondingCurveProgress,
          graduated: raw.graduated,
          x: Math.cos(angle) * dist,
          y: (Math.random() - 0.5) * 40,
          z: Math.sin(angle) * dist,
        };
        this.nodeMap.set(raw.id, node);
        this.nodes.push(node);
        changed = true;
      }
    }

    // ---- Trade nodes ----
    for (const raw of graphData.nodes) {
      if (raw.type !== 'trade') continue;
      incomingIds.add(raw.id);
      if (this.nodeMap.has(raw.id)) continue;
      const hub = this.nodeMap.get(raw.tokenAddress);
      const phi = Math.acos(1 - 2 * Math.random());
      const theta = Math.random() * Math.PI * 2;
      const r = 5 + Math.random() * 12;
      const node: SwarmNode = {
        id: raw.id,
        type: 'trade',
        label: raw.label,
        tokenAddress: raw.tokenAddress,
        volume: raw.volume,
        isWhale: raw.isWhale,
        isSniper: raw.isSniper,
        x: (hub?.x ?? 0) + Math.sin(phi) * Math.cos(theta) * r,
        y: (hub?.y ?? 0) + Math.sin(phi) * Math.sin(theta) * r,
        z: (hub?.z ?? 0) + Math.cos(phi) * r,
      };
      this.nodeMap.set(raw.id, node);
      this.nodes.push(node);
      changed = true;
    }

    // ---- Remove nodes no longer in graphData ----
    const toRemove = new Set<string>();
    for (const node of this.nodes) {
      if (!incomingIds.has(node.id)) {
        toRemove.add(node.id);
      }
    }
    if (toRemove.size > 0) {
      this.nodes = this.nodes.filter((n) => !toRemove.has(n.id));
      for (const id of toRemove) this.nodeMap.delete(id);
      changed = true;
    }

    // ---- Rebuild edges when topology changed ----
    if (changed) {
      const newEdges: SwarmEdge[] = [];
      for (const link of graphData.links) {
        const src = typeof link.source === 'string' ? link.source : link.source;
        const tgt = typeof link.target === 'string' ? link.target : link.target;
        if (this.nodeMap.has(src) && this.nodeMap.has(tgt)) {
          newEdges.push({
            sourceId: src,
            targetId: tgt,
            source: src,
            target: tgt,
          });
        }
      }
      this.edges = newEdges;

      this.simulation.nodes(this.nodes);
      this.simulation.numDimensions(3);
      (
        this.simulation.force('link') as ReturnType<typeof forceLink<SwarmNode, SwarmEdge>>
      ).links(this.edges);
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
// Scene sub-components
// ---------------------------------------------------------------------------

const SceneBackground = memo<{ color: string }>(({ color }) => {
  const { scene } = useThree();
  useEffect(() => {
    scene.background = new THREE.Color(color);
  }, [color, scene]);
  return null;
});
SceneBackground.displayName = 'SceneBackground';

// ---------------------------------------------------------------------------
// Token hub meshes — instanced emissive spheres
// ---------------------------------------------------------------------------

const TokenHubs = memo<{ sim: SwarmSimulation }>(({ sim }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const tempObj = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);
  const geometry = useMemo(() => new THREE.SphereGeometry(1, 24, 24), []);
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        roughness: 0.3,
        metalness: 0.1,
        emissive: new THREE.Color('#9945FF'),
        emissiveIntensity: 1.5,
        transparent: true,
        opacity: 0.9,
        toneMapped: false,
      }),
    [],
  );

  const PALETTE = useMemo(
    () => ['#9945FF', '#14F195', '#00D1FF', '#FF6B35', '#E84393', '#FFB300', '#00B3FF', '#818CF8'],
    [],
  );

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const hubs = sim.nodes.filter((n) => n.type === 'token');
    mesh.count = hubs.length;

    for (let i = 0; i < hubs.length; i++) {
      const n = hubs[i];
      const radius = 3 + Math.min(n.volume * 0.5, 8);
      tempObj.position.set(n.x ?? 0, n.y ?? 0, n.z ?? 0);
      tempObj.scale.setScalar(radius);
      tempObj.updateMatrix();
      mesh.setMatrixAt(i, tempObj.matrix);
      tempColor.set(PALETTE[i % PALETTE.length]);
      mesh.setColorAt(i, tempColor);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[geometry, material, MAX_TOKEN_HUBS]} frustumCulled={false} />
  );
});
TokenHubs.displayName = 'TokenHubs';

// ---------------------------------------------------------------------------
// Trade sprites — instanced tiny spheres (the swarm particles)
// ---------------------------------------------------------------------------

const TradeSprites = memo<{ sim: SwarmSimulation }>(({ sim }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const tempObj = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);
  const geometry = useMemo(() => new THREE.SphereGeometry(1, 6, 6), []);
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        roughness: 0.5,
        metalness: 0.0,
        emissive: new THREE.Color('#ffffff'),
        emissiveIntensity: 2.0,
        transparent: true,
        opacity: 0.8,
        toneMapped: false,
      }),
    [],
  );

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const trades = sim.nodes.filter((n) => n.type === 'trade');
    mesh.count = Math.min(trades.length, MAX_TRADE_SPRITES);

    for (let i = 0; i < mesh.count; i++) {
      const n = trades[i];
      const radius = n.isWhale ? 1.2 : n.isSniper ? 0.8 : 0.35;
      tempObj.position.set(n.x ?? 0, n.y ?? 0, n.z ?? 0);
      tempObj.scale.setScalar(radius);
      tempObj.updateMatrix();
      mesh.setMatrixAt(i, tempObj.matrix);

      if (n.isWhale) tempColor.set('#FFB300');
      else if (n.isSniper) tempColor.set('#FF4444');
      else tempColor.set('#7dd3fc');
      mesh.setColorAt(i, tempColor);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, MAX_TRADE_SPRITES]}
      frustumCulled={false}
    />
  );
});
TradeSprites.displayName = 'TradeSprites';

// ---------------------------------------------------------------------------
// Edge lines — connecting trades to their token hubs
// ---------------------------------------------------------------------------

const SwarmEdges = memo<{ sim: SwarmSimulation }>(({ sim }) => {
  const lineRef = useRef<THREE.LineSegments>(null);
  const maxSegments = MAX_TRADE_SPRITES;
  const positionsBuffer = useMemo(() => new Float32Array(maxSegments * 6), [maxSegments]);
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positionsBuffer, 3));
    geo.setDrawRange(0, 0);
    return geo;
  }, [positionsBuffer]);
  const material = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: '#334155',
        transparent: true,
        opacity: 0.12,
        toneMapped: false,
      }),
    [],
  );

  useFrame(() => {
    const line = lineRef.current;
    if (!line) return;
    const edges = sim.edges;
    const count = Math.min(edges.length, maxSegments);

    for (let i = 0; i < count; i++) {
      const e = edges[i];
      const src = e.source as SwarmNode;
      const tgt = e.target as SwarmNode;
      const off = i * 6;
      positionsBuffer[off] = src.x ?? 0;
      positionsBuffer[off + 1] = src.y ?? 0;
      positionsBuffer[off + 2] = src.z ?? 0;
      positionsBuffer[off + 3] = tgt.x ?? 0;
      positionsBuffer[off + 4] = tgt.y ?? 0;
      positionsBuffer[off + 5] = tgt.z ?? 0;
    }

    geometry.setDrawRange(0, count * 2);
    (geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  });

  return <lineSegments ref={lineRef} geometry={geometry} material={material} />;
});
SwarmEdges.displayName = 'SwarmEdges';

// ---------------------------------------------------------------------------
// Cinematic camera controller
// ---------------------------------------------------------------------------

const CinematicCamera = memo<{ cameraControlsRef: React.RefObject<CameraControlsImpl> }>(
  ({ cameraControlsRef }) => {
    /** Timestamp when the user last interacted (ms) */
    const lastInteractionRef = useRef(0);
    const orbitActiveRef = useRef(true);

    // Listen for user interactions to pause cinematic orbit
    useEffect(() => {
      const ctrl = cameraControlsRef.current;
      if (!ctrl) return;

      const handleInteraction = () => {
        lastInteractionRef.current = Date.now();
        orbitActiveRef.current = false;
      };

      // CameraControls events for user manipulation
      ctrl.addEventListener('controlstart', handleInteraction);

      return () => {
        ctrl.removeEventListener('controlstart', handleInteraction);
      };
    }, [cameraControlsRef]);

    // Continuous orbit via requestAnimationFrame
    useFrame(() => {
      const ctrl = cameraControlsRef.current;
      if (!ctrl) return;

      // Resume cinematic mode after pause duration
      if (!orbitActiveRef.current) {
        if (Date.now() - lastInteractionRef.current > CAMERA_PAUSE_DURATION_MS) {
          orbitActiveRef.current = true;
        } else {
          return;
        }
      }

      const angle = Date.now() * CAMERA_ORBIT_SPEED;
      const x = CAMERA_ORBIT_RADIUS * Math.cos(angle);
      const z = CAMERA_ORBIT_RADIUS * Math.sin(angle);

      // Smooth transition — setLookAt with no animation to avoid jitter
      ctrl.setLookAt(x, 80, z, 0, 0, 0, false);
    });

    return null;
  },
);
CinematicCamera.displayName = 'CinematicCamera';

// ---------------------------------------------------------------------------
// Main scene
// ---------------------------------------------------------------------------

const PumpFunScene = memo<{ graphData: PumpFunGraphData }>(({ graphData }) => {
  const sim = useMemo(() => new SwarmSimulation(), []);
  const cameraControlsRef = useRef<CameraControlsImpl>(null!);

  // Dispose simulation on unmount
  useEffect(() => () => sim.dispose(), [sim]);

  // Push new graph data into simulation
  useEffect(() => {
    sim.update(graphData);
  }, [sim, graphData]);

  // Tick simulation every frame
  useFrame(() => {
    sim.tick();
  });

  return (
    <>
      <SceneBackground color="#0a0a0f" />
      <Environment preset="night" environmentIntensity={0.3} background={false} />
      <directionalLight position={[30, 50, 30]} intensity={0.3} />
      <ambientLight intensity={0.1} />

      <TokenHubs sim={sim} />
      <TradeSprites sim={sim} />
      <SwarmEdges sim={sim} />

      <CameraControls
        ref={cameraControlsRef}
        minDistance={20}
        maxDistance={800}
        truckSpeed={0}
        mouseButtons={{ left: 1, middle: 0, right: 2, wheel: 8 }}
        touches={{ one: 32, two: 1024, three: 0 }}
      />
      <CinematicCamera cameraControlsRef={cameraControlsRef} />
      <PostProcessing />
    </>
  );
});
PumpFunScene.displayName = 'PumpFunScene';

// ---------------------------------------------------------------------------
// Public handle
// ---------------------------------------------------------------------------

export interface PumpFunGraphHandle {
  getCanvasElement: () => HTMLCanvasElement | null;
}

export interface PumpFunGraphProps {
  graphData: PumpFunGraphData;
}

// ---------------------------------------------------------------------------
// Exported Canvas wrapper
// ---------------------------------------------------------------------------

export const PumpFunGraph = forwardRef<PumpFunGraphHandle, PumpFunGraphProps>(
  ({ graphData }, ref) => {
    const glRef = useRef<THREE.WebGLRenderer | null>(null);

    useImperativeHandle(ref, () => ({
      getCanvasElement: () => glRef.current?.domElement ?? null,
    }));

    return (
      <Canvas
        camera={{ position: [0, 80, 500], fov: 50, near: 0.1, far: 2000 }}
        gl={{ preserveDrawingBuffer: true, antialias: false, stencil: false }}
        onCreated={({ gl }) => {
          glRef.current = gl;
        }}
      >
        <PumpFunScene graphData={graphData} />
      </Canvas>
    );
  },
);
PumpFunGraph.displayName = 'PumpFunGraph';

export default PumpFunGraph;
