// ============================================================================
// Node Instanced Rendering Shader (WGSL)
//
// Renders nodes as instanced billboarded quads with per-instance color/size.
// Reads positions directly from the compute shader's output buffer —
// zero CPU readback for rendering.
// ============================================================================

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
  emissive: f32,  // emissive intensity (>1 for bloom)
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

// Quad vertices: 2 triangles forming a unit quad
const QUAD_POSITIONS = array<vec2<f32>, 6>(
  vec2<f32>(-1.0, -1.0),
  vec2<f32>( 1.0, -1.0),
  vec2<f32>( 1.0,  1.0),
  vec2<f32>(-1.0, -1.0),
  vec2<f32>( 1.0,  1.0),
  vec2<f32>(-1.0,  1.0),
);

const QUAD_UVS = array<vec2<f32>, 6>(
  vec2<f32>(0.0, 0.0),
  vec2<f32>(1.0, 0.0),
  vec2<f32>(1.0, 1.0),
  vec2<f32>(0.0, 0.0),
  vec2<f32>(1.0, 1.0),
  vec2<f32>(0.0, 1.0),
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

  // Billboard: align quad to face camera
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
  // Circular mask from UV
  let centered = in.uv * 2.0 - vec2<f32>(1.0, 1.0);
  let dist = length(centered);

  // Smooth circle with anti-aliased edge
  let alpha = 1.0 - smoothstep(0.85, 1.0, dist);
  if (alpha < 0.01) {
    discard;
  }

  // Simple lighting: ambient + directional
  let light_dir = normalize(vec3<f32>(0.3, 0.8, 0.5));
  let normal = vec3<f32>(centered.x, centered.y, sqrt(max(1.0 - dot(centered, centered), 0.0)));
  let ndotl = max(dot(normal, light_dir), 0.0);
  let diffuse = 0.4 + 0.6 * ndotl;

  var final_color = in.color.rgb * diffuse;

  // Add emissive glow (values > 1.0 will trigger bloom in post-processing)
  final_color += in.color.rgb * max(in.emissive - 1.0, 0.0);

  return vec4<f32>(final_color, alpha);
}
