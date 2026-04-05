// ============================================================================
// WGSL Shader Sources
//
// Exported as string constants for webpack/Next.js compatibility.
// The .wgsl files in this directory are the source-of-truth — these strings
// are kept in sync manually. For Vite-based projects, import with ?raw instead.
// ============================================================================

/**
 * Force simulation compute shader.
 * Implements many-body repulsion, center attraction, link springs,
 * collision detection, velocity decay, and position integration.
 */
export const FORCE_SHADER_SOURCE = /* wgsl */ `
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
  _pad0: f32,
}

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
  node_type: f32,
}

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

  // Many-body charge repulsion
  let charge_i = select(params.hub_charge, params.agent_charge, type_i > 0.5);

  for (var j = 0u; j < params.node_count; j++) {
    if (j == i) {
      continue;
    }
    let pos_j = vec3<f32>(positions[j].x, positions[j].y, positions[j].z);
    let diff = pos_i - pos_j;
    let dist_sq = dot(diff, diff) + SOFTENING;
    let dist = sqrt(dist_sq);

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

  // Center force
  force -= pos_i * params.center_strength;

  // Link forces
  for (var e = 0u; e < params.edge_count; e++) {
    let edge = edges[e];
    var other_idx = 0u;

    if (edge.source == i) {
      other_idx = edge.target;
    } else if (edge.target == i) {
      other_idx = edge.source;
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

  // Integrate
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
`;

/**
 * Node instanced rendering shader.
 * Billboarded quads with per-instance color, lit with simple directional light.
 */
export const RENDER_SHADER_SOURCE = /* wgsl */ `
struct Uniforms {
  view_proj: mat4x4<f32>,
  camera_pos: vec3<f32>,
  time: f32,
  viewport_size: vec2<f32>,
  _pad: vec2<f32>,
}

struct NodePosition {
  x: f32,
  y: f32,
  z: f32,
  radius: f32,
}

struct NodeColor {
  r: f32,
  g: f32,
  b: f32,
  emissive: f32,
}

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
  @location(1) color: vec4<f32>,
  @location(2) emissive: f32,
  @location(3) world_pos: vec3<f32>,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> node_positions: array<NodePosition>;
@group(0) @binding(2) var<storage, read> node_colors: array<NodeColor>;

const QUAD_POSITIONS = array<vec2<f32>, 6>(
  vec2<f32>(-1.0, -1.0), vec2<f32>(1.0, -1.0), vec2<f32>(1.0, 1.0),
  vec2<f32>(-1.0, -1.0), vec2<f32>(1.0, 1.0),  vec2<f32>(-1.0, 1.0),
);

const QUAD_UVS = array<vec2<f32>, 6>(
  vec2<f32>(0.0, 0.0), vec2<f32>(1.0, 0.0), vec2<f32>(1.0, 1.0),
  vec2<f32>(0.0, 0.0), vec2<f32>(1.0, 1.0), vec2<f32>(0.0, 1.0),
);

@vertex
fn vs_main(
  @builtin(vertex_index) vertex_idx: u32,
  @builtin(instance_index) instance_idx: u32,
) -> VertexOutput {
  let node = node_positions[instance_idx];
  let color = node_colors[instance_idx];
  let center = vec3<f32>(node.x, node.y, node.z);
  let radius = node.radius;

  let to_camera = normalize(uniforms.camera_pos - center);
  let right = normalize(cross(vec3<f32>(0.0, 1.0, 0.0), to_camera));
  let up = cross(to_camera, right);

  let quad_pos = QUAD_POSITIONS[vertex_idx % 6u];
  let world_offset = (right * quad_pos.x + up * quad_pos.y) * radius;
  let world_pos = center + world_offset;

  var out: VertexOutput;
  out.position = uniforms.view_proj * vec4<f32>(world_pos, 1.0);
  out.uv = QUAD_UVS[vertex_idx % 6u];
  out.color = vec4<f32>(color.r, color.g, color.b, 1.0);
  out.emissive = color.emissive;
  out.world_pos = world_pos;
  return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
  let centered = in.uv * 2.0 - vec2<f32>(1.0, 1.0);
  let dist = length(centered);
  let alpha = 1.0 - smoothstep(0.85, 1.0, dist);
  if (alpha < 0.01) {
    discard;
  }

  let light_dir = normalize(vec3<f32>(0.3, 0.8, 0.5));
  let normal = vec3<f32>(centered.x, centered.y, sqrt(max(1.0 - dot(centered, centered), 0.0)));
  let ndotl = max(dot(normal, light_dir), 0.0);
  let diffuse = 0.4 + 0.6 * ndotl;

  var final_color = in.color.rgb * diffuse;
  final_color += in.color.rgb * max(in.emissive - 1.0, 0.0);

  return vec4<f32>(final_color, alpha);
}
`;

/**
 * Bloom post-processing compute shader.
 * Two-pass Gaussian: extract bright pixels + horizontal blur, then vertical blur + composite.
 */
export const BLOOM_SHADER_SOURCE = /* wgsl */ `
struct BloomParams {
  width: u32,
  height: u32,
  threshold: f32,
  intensity: f32,
  radius: f32,
  direction: u32,
  _pad0: f32,
  _pad1: f32,
}

@group(0) @binding(0) var<uniform> params: BloomParams;
@group(0) @binding(1) var input_tex: texture_2d<f32>;
@group(0) @binding(2) var bloom_tex: texture_storage_2d<rgba16float, write>;
@group(0) @binding(3) var bloom_read: texture_2d<f32>;

const KERNEL_SIZE: i32 = 9;
const WEIGHTS = array<f32, 9>(
  0.0625, 0.09375, 0.125, 0.15625, 0.171875,
  0.15625, 0.125, 0.09375, 0.0625
);

fn luminance(c: vec3<f32>) -> f32 {
  return dot(c, vec3<f32>(0.2126, 0.7152, 0.0722));
}

@compute @workgroup_size(16, 16)
fn bloom_extract_and_blur_h(@builtin(global_invocation_id) gid: vec3<u32>) {
  let x = gid.x;
  let y = gid.y;
  if (x >= params.width || y >= params.height) { return; }

  var color = vec3<f32>(0.0, 0.0, 0.0);
  let half_kernel = KERNEL_SIZE / 2;

  for (var i = 0; i < KERNEL_SIZE; i++) {
    let offset = i - half_kernel;
    let sample_x = clamp(i32(x) + offset, 0, i32(params.width) - 1);
    let sample_color = textureLoad(input_tex, vec2<i32>(sample_x, i32(y)), 0).rgb;
    let lum = luminance(sample_color);
    let bright = select(vec3<f32>(0.0), sample_color, lum > params.threshold);
    color += bright * WEIGHTS[i];
  }

  textureStore(bloom_tex, vec2<u32>(x, y), vec4<f32>(color, 1.0));
}

@compute @workgroup_size(16, 16)
fn bloom_blur_v_and_composite(@builtin(global_invocation_id) gid: vec3<u32>) {
  let x = gid.x;
  let y = gid.y;
  if (x >= params.width || y >= params.height) { return; }

  var bloom_color = vec3<f32>(0.0, 0.0, 0.0);
  let half_kernel = KERNEL_SIZE / 2;

  for (var i = 0; i < KERNEL_SIZE; i++) {
    let offset = i - half_kernel;
    let sample_y = clamp(i32(y) + offset, 0, i32(params.height) - 1);
    let sample_color = textureLoad(bloom_read, vec2<i32>(i32(x), sample_y), 0).rgb;
    bloom_color += sample_color * WEIGHTS[i];
  }

  let original = textureLoad(input_tex, vec2<i32>(i32(x), i32(y)), 0).rgb;
  let final_color = original + bloom_color * params.intensity;
  textureStore(bloom_tex, vec2<u32>(x, y), vec4<f32>(final_color, 1.0));
}
`;
