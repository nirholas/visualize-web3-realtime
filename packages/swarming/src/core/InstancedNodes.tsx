import { memo, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { SwarmingSimulation } from './physics';

// ---------------------------------------------------------------------------
// Hub Nodes — high-detail spheres with emissive glow
// ---------------------------------------------------------------------------

export const HubNodes = memo<{
  sim: SwarmingSimulation;
  emissiveIntensity: number;
}>(({ sim, emissiveIntensity }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const tempObj = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);
  const geometry = useMemo(() => new THREE.SphereGeometry(1, 32, 32), []);
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        roughness: 0.3,
        metalness: 0.1,
        emissive: new THREE.Color('#ffffff'),
        emissiveIntensity,
        envMapIntensity: 1.2,
        toneMapped: false,
      }),
    [emissiveIntensity],
  );

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const hubs = sim.nodes.filter((n) => n.type === 'hub');
    mesh.count = hubs.length;

    for (let i = 0; i < hubs.length; i++) {
      const node = hubs[i];
      tempObj.position.set(node.x ?? 0, node.y ?? 0, node.z ?? 0);
      tempObj.scale.setScalar(node.radius);
      tempObj.updateMatrix();
      mesh.setMatrixAt(i, tempObj.matrix);
      tempColor.set(node.color);
      mesh.setColorAt(i, tempColor);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, 100]}
      frustumCulled={false}
    />
  );
});
HubNodes.displayName = 'HubNodes';

// ---------------------------------------------------------------------------
// Leaf Nodes — low-detail spheres for thousands of items
// ---------------------------------------------------------------------------

export const LeafNodes = memo<{
  sim: SwarmingSimulation;
  maxNodes: number;
  emissiveIntensity: number;
}>(({ sim, maxNodes, emissiveIntensity }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const tempObj = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);
  const geometry = useMemo(() => new THREE.SphereGeometry(1, 8, 8), []);
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        roughness: 0.4,
        metalness: 0.0,
        emissive: new THREE.Color('#ffffff'),
        emissiveIntensity,
        toneMapped: false,
      }),
    [emissiveIntensity],
  );

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const leaves = sim.nodes.filter((n) => n.type === 'leaf');
    const count = Math.min(leaves.length, maxNodes);
    mesh.count = count;

    for (let i = 0; i < count; i++) {
      const node = leaves[i];
      tempObj.position.set(node.x ?? 0, node.y ?? 0, node.z ?? 0);
      tempObj.scale.setScalar(node.radius);
      tempObj.updateMatrix();
      mesh.setMatrixAt(i, tempObj.matrix);
      tempColor.set(node.color);
      mesh.setColorAt(i, tempColor);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, maxNodes]}
      frustumCulled={false}
    />
  );
});
LeafNodes.displayName = 'LeafNodes';
