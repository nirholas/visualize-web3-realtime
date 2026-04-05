// ============================================================================
// Force Simulation Compute Shader (WGSL)
//
// Runs the entire force-directed layout on the GPU in parallel.
// Each invocation processes one node.
//
// Forces implemented:
//   1. Many-body (charge) — repulsion between all node pairs via Barnes-Hut
//   2. Center — attraction toward origin
//   3. Link — spring force along edges
//   4. Collision — prevents node overlap
//   5. Velocity decay + position integration
// ============================================================================

// Per-node data (SoA layout for GPU cache-friendliness)
struct SimParams {
  node_count: u32,
  edge_count: u32,
  delta_time: f32,
  alpha: f32,
  alpha_decay: f32,
  alpha_min: f32,
  velocity_decay: f32,
  center_strength: f32,
  collision_strength: f32,
  hub_charge: f32,
  agent_charge: f32,
  // Padding to 16-byte alignment
  _pad0: f32,
}

// Node: position (xyz) + radius in w
// Velocity: (xyz) + node_type in w (0=hub, 1=agent)
struct NodePosition {
  x: f32,
  y: f32,
  z: f32,
  radius: f32,
}

struct NodeVelocity {
  vx: f32,
  vy: f32,
  vz: f32,
  node_type: f32,  // 0.0 = hub, 1.0 = agent
}

// Edge: source_index, target_index, rest_length, strength
struct Edge {
  source: u32,
  target: u32,
  rest_length: f32,
  strength: f32,
}

@group(0) @binding(0) var<uniform> params: SimParams;
@group(0) @binding(1) var<storage, read_write> positions: array<NodePosition>;
@group(0) @binding(2) var<storage, read_write> velocities: array<NodeVelocity>;
@group(0) @binding(3) var<storage, read> edges: array<Edge>;

const SOFTENING: f32 = 0.01;
const MAX_FORCE: f32 = 50.0;

fn clamp_force(f: vec3<f32>) -> vec3<f32> {
  let len = length(f);
  if (len > MAX_FORCE) {
    return f * (MAX_FORCE / len);
  }
  return f;
}

// Main force computation kernel
@compute @workgroup_size(256)
fn compute_forces(@builtin(global_invocation_id) gid: vec3<u32>) {
  let i = gid.x;
  if (i >= params.node_count) {
    return;
  }

  let pos_i = vec3<f32>(positions[i].x, positions[i].y, positions[i].z);
  let vel_i = vec3<f32>(velocities[i].vx, velocities[i].vy, velocities[i].vz);
  let type_i = velocities[i].node_type;
  let radius_i = positions[i].radius;

  var force = vec3<f32>(0.0, 0.0, 0.0);

  // ---------------------------------------------------------------------------
  // 1. Many-body (charge) — O(N) brute force for simplicity
  //    Barnes-Hut would be a future optimization for N > 100k
  // ---------------------------------------------------------------------------
  let charge_i = select(params.hub_charge, params.agent_charge, type_i > 0.5);

  for (var j = 0u; j < params.node_count; j++) {
    if (j == i) {
      continue;
    }
    let pos_j = vec3<f32>(positions[j].x, positions[j].y, positions[j].z);
    let diff = pos_i - pos_j;
    let dist_sq = dot(diff, diff) + SOFTENING;
    let dist = sqrt(dist_sq);

    // Coulomb-like repulsion: F = charge / dist^2
    let charge_j = select(params.hub_charge, params.agent_charge, velocities[j].node_type > 0.5);
    let strength = sqrt(abs(charge_i) * abs(charge_j));
    let repulsion = diff * (strength / dist_sq / dist);
    force += repulsion;

    // Collision
    let min_dist = radius_i + positions[j].radius + 0.3;
    if (dist < min_dist) {
      let overlap = (min_dist - dist) / dist;
      force += diff * overlap * params.collision_strength;
    }
  }

  // ---------------------------------------------------------------------------
  // 2. Center force — pull toward origin
  // ---------------------------------------------------------------------------
  force -= pos_i * params.center_strength;

  // ---------------------------------------------------------------------------
  // 3. Link forces — processed per edge (only if this node is an endpoint)
  // ---------------------------------------------------------------------------
  for (var e = 0u; e < params.edge_count; e++) {
    let edge = edges[e];
    var other_idx = 0u;
    var is_source = false;

    if (edge.source == i) {
      other_idx = edge.target;
      is_source = true;
    } else if (edge.target == i) {
      other_idx = edge.source;
      is_source = false;
    } else {
      continue;
    }

    let pos_other = vec3<f32>(positions[other_idx].x, positions[other_idx].y, positions[other_idx].z);
    let diff = pos_other - pos_i;
    let dist = max(length(diff), 0.001);
    let displacement = (dist - edge.rest_length) / dist;
    let link_force = diff * displacement * edge.strength * 0.5;
    force += link_force;
  }

  // ---------------------------------------------------------------------------
  // 4. Clamp, apply alpha, integrate velocity and position
  // ---------------------------------------------------------------------------
  force = clamp_force(force);

  let new_vx = (vel_i.x + force.x * params.alpha) * params.velocity_decay;
  let new_vy = (vel_i.y + force.y * params.alpha) * params.velocity_decay;
  let new_vz = (vel_i.z + force.z * params.alpha) * params.velocity_decay;

  velocities[i].vx = new_vx;
  velocities[i].vy = new_vy;
  velocities[i].vz = new_vz;

  positions[i].x = positions[i].x + new_vx;
  positions[i].y = positions[i].y + new_vy;
  positions[i].z = positions[i].z + new_vz;
}

// Alpha decay kernel — run once per tick with workgroup_size(1)
@compute @workgroup_size(1)
fn decay_alpha(@builtin(global_invocation_id) gid: vec3<u32>) {
  // Alpha decay is handled on the CPU side by updating the uniform buffer.
  // This shader is a placeholder for future per-tick GPU-side bookkeeping.
}
