# Prompt 04: PBR Material Upgrade (MeshPhysicalMaterial)

## Objective
Upgrade hub node materials from `MeshStandardMaterial` to `MeshPhysicalMaterial` with tuned roughness, transmission, clearcoat, and IOR properties to achieve a polished, glass-like tech aesthetic for key scene elements.

## Problem
Current materials are basic `MeshStandardMaterial` with minimal configuration:
- Hub nodes: `roughness: 0.4, metalness: 0.1` (line ~60 of `packages/react-graph/src/ForceGraph.tsx`)
- Agent nodes: `roughness: 0.8, metalness: 0` (line ~143)
- Ground: plain `MeshStandardMaterial` with a flat color (line ~249)
- Edge lines: `lineBasicMaterial` with `opacity: 0.25`

These produce a flat, matte appearance with no depth, translucency, or visual sophistication.

## Prerequisites
- Prompt 01 (Tone Mapping) should be applied first — PBR materials look best with ACES Filmic tone mapping
- Prompt 02 (HDRI Lighting) should be applied first — physical materials need environment reflections to shine

## Implementation

### Step 1: Upgrade Hub Node Material

In `packages/react-graph/src/ForceGraph.tsx`, update the `HubNodes` component material:

```tsx
const material = useMemo(
  () => new THREE.MeshPhysicalMaterial({
    roughness: 0.25,
    metalness: 0.05,
    clearcoat: 0.3,
    clearcoatRoughness: 0.4,
    emissive: new THREE.Color('#ffffff'),
    emissiveIntensity: 0.08,
    envMapIntensity: 1.2,
  }),
  [],
);
```

**Why these values:**
- `roughness: 0.25` — slightly glossy, picks up environment reflections for a premium feel
- `clearcoat: 0.3` — adds a thin lacquer layer on top, like coated glass or polished resin
- `clearcoatRoughness: 0.4` — the clearcoat itself is slightly diffused, not mirror-sharp
- `emissiveIntensity: 0.08` — subtle self-illumination that triggers bloom in the post-processing pipeline
- `envMapIntensity: 1.2` — slightly boosted environment reflections

### Step 2: Upgrade Agent Node Material

Agent nodes are rendered via InstancedMesh at high count (5,000). Keep the material lightweight but add subtle polish:

```tsx
const material = useMemo(
  () => new THREE.MeshPhysicalMaterial({
    roughness: 0.6,
    metalness: 0.0,
    clearcoat: 0.15,
    clearcoatRoughness: 0.6,
    emissive: new THREE.Color('#ffffff'),
    emissiveIntensity: 0.03,
  }),
  [],
);
```

**Why**: Agent nodes should remain visually subordinate to hubs. Higher roughness keeps them matte. Minimal clearcoat adds a subtle sheen without competing with hubs.

### Step 3: Upgrade Ground Plane Material

Transform the ground from a flat color plane to a subtle, reflective surface:

```tsx
const Ground = memo<{ color?: string }>(({ color = '#f8f8fa' }) => (
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
    <planeGeometry args={[200, 200]} />
    <meshPhysicalMaterial
      color={color}
      roughness={0.85}
      metalness={0.0}
      clearcoat={0.05}
      clearcoatRoughness={0.9}
    />
  </mesh>
));
```

### Step 4: Apply Equivalent Changes in `features/World/ForceGraph.tsx`

The feature-level ForceGraph has its own material definitions. Apply the same material upgrades there, matching the hub/agent/ground patterns.

### Step 5: Dynamic Emissive Coloring for Bloom Integration

Hub nodes currently set color per-instance via `mesh.setColorAt()`. The emissive color should also update per-instance to match. Since `MeshPhysicalMaterial` doesn't support per-instance emissive out of the box, use one of these approaches:

**Option A (Simple):** Set the emissive color to white and keep `emissiveIntensity` low. The per-instance diffuse color provides the visual identity; the white emissive just adds uniform glow. This is the recommended approach.

**Option B (Advanced):** Write a custom shader chunk via `material.onBeforeCompile` to derive emissive color from the instance color attribute. Only pursue this if uniform white glow doesn't look right.

### Step 6: Performance Notes

`MeshPhysicalMaterial` is more expensive than `MeshStandardMaterial` per pixel due to additional clearcoat and transmission calculations. However:
- Hub nodes: max 8 instances — negligible impact
- Agent nodes: 5,000 instances, but they are small on screen (8x8 geometry, tiny radius) — the fragment shader cost scales with screen pixels, not instance count
- Ground: single large plane — minor cost

Expected impact: < 0.5ms per frame. If issues arise on low-end GPUs, agent nodes can fall back to `MeshStandardMaterial` while keeping hubs as `MeshPhysicalMaterial`.

## Files to Modify
- `packages/react-graph/src/ForceGraph.tsx` — Update `HubNodes`, `AgentNodes`, and `Ground` materials
- `features/World/ForceGraph.tsx` — Update equivalent material definitions

## Acceptance Criteria
- Hub nodes use `MeshPhysicalMaterial` with clearcoat and subtle emissive
- Hub nodes show environment reflections when HDRI lighting is active
- Agent nodes have upgraded material with minimal clearcoat
- Ground plane has subtle physical properties
- Per-instance coloring still works correctly for all node types
- Emissive properties are visible as soft glow when bloom is active (Prompt 03)
- No frame rate regression below 55fps at 5,000 agent nodes
- Visual comparison shows noticeably more depth and polish vs. old materials
