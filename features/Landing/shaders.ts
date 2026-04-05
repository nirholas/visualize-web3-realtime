/** Custom GLSL shaders for the Giza-style landing visualization */

// Simplex noise function for organic motion
const NOISE_GLSL = /* glsl */ `
// Simplex 3D noise (compact variant)
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
`

/** Vertex shader for agent particles orbiting protocol spheres */
export const agentVertexShader = /* glsl */ `
${NOISE_GLSL}

uniform float uTime;
uniform float uPointSize;
uniform vec3 uProtocolPos;
uniform float uOrbitRadius;
uniform vec3 uColor;

attribute float aPhase;
attribute float aSpeed;
attribute float aOrbitTilt;

varying float vAlpha;
varying vec3 vColor;

void main() {
  float t = uTime * aSpeed + aPhase;

  // Noise-driven orbital angles (Giza style)
  float theta = snoise(vec3(aPhase * 10.0, t * 0.3, 0.0)) * 3.14159 * 2.0;
  float phi = snoise(vec3(0.0, aPhase * 10.0, t * 0.25)) * 3.14159;

  // Apply tilt to create varied orbital planes
  float cosT = cos(aOrbitTilt);
  float sinT = sin(aOrbitTilt);

  vec3 orbitPos = vec3(
    sin(phi) * cos(theta),
    sin(phi) * sin(theta) * cosT - cos(phi) * sinT,
    sin(phi) * sin(theta) * sinT + cos(phi) * cosT
  ) * uOrbitRadius;

  // Slight radial breathing
  float breathe = 1.0 + snoise(vec3(t * 0.5, aPhase * 5.0, 0.0)) * 0.15;
  orbitPos *= breathe;

  vec3 worldPos = uProtocolPos + orbitPos;
  vec4 mvPos = modelViewMatrix * vec4(worldPos, 1.0);

  // Distance-based fog (Giza style)
  float dist = length(mvPos.xyz);
  float fog = 1.0 - clamp((dist - 3.0) / 8.0, 0.0, 1.0);
  fog = pow(fog, 2.5);

  vAlpha = fog * (0.5 + 0.5 * sin(t * 2.0 + aPhase));
  vColor = uColor;

  gl_Position = projectionMatrix * mvPos;
  gl_PointSize = uPointSize * (4.0 / -mvPos.z) * fog;
}
`

/** Fragment shader for agent particles */
export const agentFragmentShader = /* glsl */ `
varying float vAlpha;
varying vec3 vColor;

void main() {
  // Soft circle
  float dist = length(gl_PointCoord - vec2(0.5));
  if (dist > 0.5) discard;
  float alpha = smoothstep(0.5, 0.2, dist) * vAlpha;
  gl_FragColor = vec4(vColor, alpha);
}
`

/** Vertex shader for protocol spheres with noise surface */
export const sphereVertexShader = /* glsl */ `
${NOISE_GLSL}

uniform float uTime;

varying vec3 vNormal;
varying vec3 vViewPosition;
varying float vNoise;

void main() {
  vNormal = normalize(normalMatrix * normal);

  // Animate surface with noise
  float noise = snoise(vec3(
    position.x * 2.0 + uTime * 0.2,
    position.y * 2.0 + uTime * 0.15,
    position.z * 2.0 + uTime * 0.1
  ));
  vNoise = noise;

  // Subtle vertex displacement
  vec3 displaced = position + normal * noise * 0.08;

  vec4 mvPos = modelViewMatrix * vec4(displaced, 1.0);
  vViewPosition = -mvPos.xyz;
  gl_Position = projectionMatrix * mvPos;
}
`

/** Fragment shader for protocol spheres */
export const sphereFragmentShader = /* glsl */ `
uniform vec3 uColor;
uniform float uTime;

varying vec3 vNormal;
varying vec3 vViewPosition;
varying float vNoise;

void main() {
  // Rim lighting
  vec3 viewDir = normalize(vViewPosition);
  float rim = 1.0 - max(dot(viewDir, vNormal), 0.0);
  rim = pow(rim, 3.0);

  // Base color with noise modulation
  vec3 color = uColor * (0.6 + 0.4 * vNoise);

  // Add rim glow
  color += uColor * rim * 1.5;

  // Pulsing alpha
  float alpha = 0.3 + rim * 0.5 + 0.1 * sin(uTime * 0.8);

  gl_FragColor = vec4(color, alpha);
}
`

/** Vertex shader for connection trails */
export const trailVertexShader = /* glsl */ `
attribute float aProgress;

uniform float uTime;
uniform vec3 uColorA;
uniform vec3 uColorB;

varying float vAlpha;
varying vec3 vColor;

void main() {
  // Trail fades toward the tail
  float fade = pow(1.0 - aProgress, 2.0);

  // Pulse along the trail
  float pulse = 0.5 + 0.5 * sin(uTime * 3.0 - aProgress * 6.28);

  vAlpha = fade * pulse * 0.4;
  vColor = mix(uColorA, uColorB, aProgress);

  vec4 mvPos = modelViewMatrix * vec4(position, 1.0);

  // Distance fog
  float dist = length(mvPos.xyz);
  float fog = 1.0 - clamp((dist - 3.0) / 8.0, 0.0, 1.0);
  vAlpha *= pow(fog, 2.0);

  gl_Position = projectionMatrix * mvPos;
}
`

/** Fragment shader for connection trails */
export const trailFragmentShader = /* glsl */ `
varying float vAlpha;
varying vec3 vColor;

void main() {
  gl_FragColor = vec4(vColor, vAlpha);
}
`
