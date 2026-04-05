// ============================================================================
// Bloom Post-Processing Compute Shader (WGSL)
//
// Two-pass Gaussian bloom:
//   Pass 1: Extract bright pixels (luminance > threshold) + horizontal blur
//   Pass 2: Vertical blur + composite with original
//
// Runs entirely in compute — no render passes needed.
// ============================================================================

struct BloomParams {
  width: u32,
  height: u32,
  threshold: f32,
  intensity: f32,
  radius: f32,
  direction: u32,  // 0 = horizontal + extract, 1 = vertical + composite
  _pad0: f32,
  _pad1: f32,
}

@group(0) @binding(0) var<uniform> params: BloomParams;
@group(0) @binding(1) var input_tex: texture_2d<f32>;
@group(0) @binding(2) var bloom_tex: texture_storage_2d<rgba16float, write>;
@group(0) @binding(3) var bloom_read: texture_2d<f32>;

// 9-tap Gaussian weights (sigma ~= 3)
const KERNEL_SIZE: i32 = 9;
const WEIGHTS = array<f32, 9>(
  0.0625, 0.09375, 0.125, 0.15625, 0.171875,
  0.15625, 0.125, 0.09375, 0.0625
);

fn luminance(c: vec3<f32>) -> f32 {
  return dot(c, vec3<f32>(0.2126, 0.7152, 0.0722));
}

// Pass 1: Extract bright pixels and blur horizontally
@compute @workgroup_size(16, 16)
fn bloom_extract_and_blur_h(@builtin(global_invocation_id) gid: vec3<u32>) {
  let x = gid.x;
  let y = gid.y;

  if (x >= params.width || y >= params.height) {
    return;
  }

  var color = vec3<f32>(0.0, 0.0, 0.0);
  let half_kernel = KERNEL_SIZE / 2;

  for (var i = 0; i < KERNEL_SIZE; i++) {
    let offset = i - half_kernel;
    let sample_x = clamp(i32(x) + offset, 0, i32(params.width) - 1);
    let sample_pos = vec2<i32>(sample_x, i32(y));
    let sample_color = textureLoad(input_tex, sample_pos, 0).rgb;

    // Extract: only keep pixels above luminance threshold
    let lum = luminance(sample_color);
    let bright = select(vec3<f32>(0.0), sample_color, lum > params.threshold);

    color += bright * WEIGHTS[i];
  }

  textureStore(bloom_tex, vec2<u32>(x, y), vec4<f32>(color, 1.0));
}

// Pass 2: Vertical blur and composite with original
@compute @workgroup_size(16, 16)
fn bloom_blur_v_and_composite(@builtin(global_invocation_id) gid: vec3<u32>) {
  let x = gid.x;
  let y = gid.y;

  if (x >= params.width || y >= params.height) {
    return;
  }

  var bloom_color = vec3<f32>(0.0, 0.0, 0.0);
  let half_kernel = KERNEL_SIZE / 2;

  for (var i = 0; i < KERNEL_SIZE; i++) {
    let offset = i - half_kernel;
    let sample_y = clamp(i32(y) + offset, 0, i32(params.height) - 1);
    let sample_pos = vec2<i32>(i32(x), sample_y);
    let sample_color = textureLoad(bloom_read, sample_pos, 0).rgb;

    bloom_color += sample_color * WEIGHTS[i];
  }

  // Composite: original + bloom * intensity
  let original = textureLoad(input_tex, vec2<i32>(i32(x), i32(y)), 0).rgb;
  let final_color = original + bloom_color * params.intensity;

  textureStore(bloom_tex, vec2<u32>(x, y), vec4<f32>(final_color, 1.0));
}
