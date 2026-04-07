declare module 'react-force-graph-3d' {
  import type { Object3D, WebGLRenderer } from 'three';

  interface ForceGraph3DProps {
    graphData?: { nodes: unknown[]; links: unknown[] };
    width?: number;
    height?: number;
    backgroundColor?: string;
    showNavInfo?: boolean;
    linkOpacity?: number;
    extraRenderers?: unknown[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    nodeThreeObject?: (node: any) => Object3D;
    [key: string]: unknown;
  }

  const ForceGraph3D: React.FC<ForceGraph3DProps>;
  export default ForceGraph3D;
}
