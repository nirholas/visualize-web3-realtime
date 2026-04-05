/**
 * Type declarations for d3-force-3d — a drop-in 3D replacement for d3-force.
 *
 * The API mirrors d3-force but adds a `z` dimension to nodes and forces.
 * `forceSimulation(nodes, numDimensions)` accepts 1, 2, or 3.
 */
declare module 'd3-force-3d' {
  import type { SimulationNodeDatum, SimulationLinkDatum } from 'd3-force';

  // Extend the node datum with z-axis properties
  interface SimulationNodeDatum3D extends SimulationNodeDatum {
    z?: number;
    vz?: number;
    fz?: number | null;
  }

  // ---------------------------------------------------------------------------
  // Simulation
  // ---------------------------------------------------------------------------

  interface Simulation<
    NodeDatum extends SimulationNodeDatum3D = SimulationNodeDatum3D,
  > {
    restart(): this;
    stop(): this;
    tick(iterations?: number): this;
    nodes(): NodeDatum[];
    nodes(nodes: NodeDatum[]): this;
    alpha(): number;
    alpha(alpha: number): this;
    alphaMin(): number;
    alphaMin(min: number): this;
    alphaDecay(): number;
    alphaDecay(decay: number): this;
    alphaTarget(): number;
    alphaTarget(target: number): this;
    velocityDecay(): number;
    velocityDecay(decay: number): this;
    force(name: string): any;
    force(name: string, force: any): this;
    find(x: number, y?: number, z?: number, radius?: number): NodeDatum | undefined;
    randomSource(): () => number;
    randomSource(source: () => number): this;
    on(typenames: string): ((...args: any[]) => void) | undefined;
    on(typenames: string, listener: ((...args: any[]) => void) | null): this;
    numDimensions(): number;
    numDimensions(nDim: number): this;
  }

  export function forceSimulation<
    NodeDatum extends SimulationNodeDatum3D = SimulationNodeDatum3D,
  >(nodes?: NodeDatum[], numDimensions?: number): Simulation<NodeDatum>;

  // ---------------------------------------------------------------------------
  // Forces
  // ---------------------------------------------------------------------------

  interface ForceLink<
    NodeDatum extends SimulationNodeDatum3D,
    LinkDatum extends SimulationLinkDatum<NodeDatum>,
  > {
    (alpha: number): void;
    links(): LinkDatum[];
    links(links: LinkDatum[]): this;
    id(): (node: NodeDatum, i: number, nodes: NodeDatum[]) => string | number;
    id(id: (node: NodeDatum, i: number, nodes: NodeDatum[]) => string | number): this;
    distance(): (link: LinkDatum, i: number, links: LinkDatum[]) => number;
    distance(distance: number | ((link: LinkDatum, i: number, links: LinkDatum[]) => number)): this;
    strength(): (link: LinkDatum, i: number, links: LinkDatum[]) => number;
    strength(strength: number | ((link: LinkDatum, i: number, links: LinkDatum[]) => number)): this;
    iterations(): number;
    iterations(iterations: number): this;
  }

  export function forceLink<
    NodeDatum extends SimulationNodeDatum3D = SimulationNodeDatum3D,
    LinkDatum extends SimulationLinkDatum<NodeDatum> = SimulationLinkDatum<NodeDatum>,
  >(links?: LinkDatum[]): ForceLink<NodeDatum, LinkDatum>;

  interface ForceManyBody<NodeDatum extends SimulationNodeDatum3D = SimulationNodeDatum3D> {
    (alpha: number): void;
    strength(): (d: NodeDatum, i: number, data: NodeDatum[]) => number;
    strength(strength: number | ((d: NodeDatum, i: number, data: NodeDatum[]) => number)): this;
    theta(): number;
    theta(theta: number): this;
    distanceMin(): number;
    distanceMin(distance: number): this;
    distanceMax(): number;
    distanceMax(distance: number): this;
  }

  export function forceManyBody<
    NodeDatum extends SimulationNodeDatum3D = SimulationNodeDatum3D,
  >(): ForceManyBody<NodeDatum>;

  interface ForceCenter<NodeDatum extends SimulationNodeDatum3D = SimulationNodeDatum3D> {
    (alpha: number): void;
    x(): number;
    x(x: number): this;
    y(): number;
    y(y: number): this;
    z(): number;
    z(z: number): this;
    strength(): number;
    strength(strength: number): this;
  }

  export function forceCenter<
    NodeDatum extends SimulationNodeDatum3D = SimulationNodeDatum3D,
  >(x?: number, y?: number, z?: number): ForceCenter<NodeDatum>;

  interface ForceCollide<NodeDatum extends SimulationNodeDatum3D = SimulationNodeDatum3D> {
    (alpha: number): void;
    radius(): (node: NodeDatum, i: number, nodes: NodeDatum[]) => number;
    radius(radius: number | ((node: NodeDatum, i: number, nodes: NodeDatum[]) => number)): this;
    strength(): number;
    strength(strength: number): this;
    iterations(): number;
    iterations(iterations: number): this;
  }

  export function forceCollide<
    NodeDatum extends SimulationNodeDatum3D = SimulationNodeDatum3D,
  >(): ForceCollide<NodeDatum>;

  interface ForceRadial<NodeDatum extends SimulationNodeDatum3D = SimulationNodeDatum3D> {
    (alpha: number): void;
    radius(): (node: NodeDatum, i: number, nodes: NodeDatum[]) => number;
    radius(radius: number | ((node: NodeDatum, i: number, nodes: NodeDatum[]) => number)): this;
    x(): number;
    x(x: number): this;
    y(): number;
    y(y: number): this;
    z(): number;
    z(z: number): this;
    strength(): number;
    strength(strength: number): this;
  }

  export function forceRadial<
    NodeDatum extends SimulationNodeDatum3D = SimulationNodeDatum3D,
  >(radius?: number | ((node: NodeDatum) => number), x?: number, y?: number, z?: number): ForceRadial<NodeDatum>;

  interface ForceX<NodeDatum extends SimulationNodeDatum3D = SimulationNodeDatum3D> {
    (alpha: number): void;
    x(): number | ((d: NodeDatum) => number);
    x(x: number | ((d: NodeDatum) => number)): this;
    strength(): number | ((d: NodeDatum) => number);
    strength(strength: number | ((d: NodeDatum) => number)): this;
  }
  export function forceX<NodeDatum extends SimulationNodeDatum3D = SimulationNodeDatum3D>(
    x?: number | ((d: NodeDatum) => number),
  ): ForceX<NodeDatum>;

  interface ForceY<NodeDatum extends SimulationNodeDatum3D = SimulationNodeDatum3D> {
    (alpha: number): void;
    y(): number | ((d: NodeDatum) => number);
    y(y: number | ((d: NodeDatum) => number)): this;
    strength(): number | ((d: NodeDatum) => number);
    strength(strength: number | ((d: NodeDatum) => number)): this;
  }
  export function forceY<NodeDatum extends SimulationNodeDatum3D = SimulationNodeDatum3D>(
    y?: number | ((d: NodeDatum) => number),
  ): ForceY<NodeDatum>;

  interface ForceZ<NodeDatum extends SimulationNodeDatum3D = SimulationNodeDatum3D> {
    (alpha: number): void;
    z(): number | ((d: NodeDatum) => number);
    z(z: number | ((d: NodeDatum) => number)): this;
    strength(): number | ((d: NodeDatum) => number);
    strength(strength: number | ((d: NodeDatum) => number)): this;
  }
  export function forceZ<NodeDatum extends SimulationNodeDatum3D = SimulationNodeDatum3D>(
    z?: number | ((d: NodeDatum) => number),
  ): ForceZ<NodeDatum>;
}
