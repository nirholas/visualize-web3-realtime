'use client'

import { useRef, useMemo, useCallback, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { PROTOCOLS, type ProtocolNode } from './protocols'
import {
  agentVertexShader,
  agentFragmentShader,
  sphereVertexShader,
  sphereFragmentShader,
  trailVertexShader,
  trailFragmentShader,
} from './shaders'

// ─── Constants ───
const AGENTS_PER_PROTOCOL = 120
const TRAIL_SEGMENTS = 40
const BASE_ROTATION_SPEED = 0.0004
const WORLD_SCALE = 0.85

// ─── Types ───
export interface GraphBounds {
  top: number
  bottom: number
  left: number
  right: number
  centerX: number
  centerY: number
  radius: number
}

interface GizaSceneProps {
  onBoundsUpdate: (bounds: GraphBounds) => void
}

// ─── Agent Particles (instanced points orbiting a protocol) ───
function AgentCloud({ protocol }: { protocol: ProtocolNode }) {
  const pointsRef = useRef<THREE.Points>(null)
  const materialRef = useRef<THREE.ShaderMaterial>(null)

  const { phases, speeds, tilts } = useMemo(() => {
    const count = AGENTS_PER_PROTOCOL
    const phases = new Float32Array(count)
    const speeds = new Float32Array(count)
    const tilts = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      phases[i] = Math.random() * Math.PI * 2
      speeds[i] = 0.3 + Math.random() * 0.7
      tilts[i] = (Math.random() - 0.5) * Math.PI
    }
    return { phases, speeds, tilts }
  }, [])

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    // Dummy positions — real positions computed in vertex shader
    const positions = new Float32Array(AGENTS_PER_PROTOCOL * 3)
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1))
    geo.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1))
    geo.setAttribute('aOrbitTilt', new THREE.BufferAttribute(tilts, 1))
    return geo
  }, [phases, speeds, tilts])

  const color = useMemo(() => new THREE.Color(protocol.color), [protocol.color])
  const pos = useMemo(() => new THREE.Vector3(...protocol.position), [protocol.position])

  useFrame(({ clock }) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = clock.elapsedTime
    }
  })

  return (
    <points ref={pointsRef} geometry={geometry}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={agentVertexShader}
        fragmentShader={agentFragmentShader}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={{
          uTime: { value: 0 },
          uPointSize: { value: 3.0 },
          uProtocolPos: { value: pos },
          uOrbitRadius: { value: protocol.radius * 1.4 },
          uColor: { value: color },
        }}
      />
    </points>
  )
}

// ─── Protocol Sphere (animated noise surface) ───
function ProtocolSphere({ protocol }: { protocol: ProtocolNode }) {
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const color = useMemo(() => new THREE.Color(protocol.color), [protocol.color])

  useFrame(({ clock }) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = clock.elapsedTime
    }
  })

  return (
    <mesh position={protocol.position}>
      <sphereGeometry args={[protocol.radius * 0.3, 32, 32]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={sphereVertexShader}
        fragmentShader={sphereFragmentShader}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
        uniforms={{
          uColor: { value: color },
          uTime: { value: 0 },
        }}
      />
    </mesh>
  )
}

// ─── Protocol Label ───
function ProtocolLabel({ protocol }: { protocol: ProtocolNode }) {
  const { camera } = useThree()
  const spriteRef = useRef<THREE.Sprite>(null)
  const canvasTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 64
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = 'transparent'
    ctx.clearRect(0, 0, 256, 64)
    ctx.font = '500 24px "IBM Plex Mono", monospace'
    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(protocol.name.toUpperCase(), 128, 32)
    const tex = new THREE.CanvasTexture(canvas)
    tex.needsUpdate = true
    return tex
  }, [protocol.name])

  useFrame(() => {
    if (spriteRef.current) {
      spriteRef.current.lookAt(camera.position)
    }
  })

  return (
    <sprite
      ref={spriteRef}
      position={[
        protocol.position[0],
        protocol.position[1] - protocol.radius * 0.45,
        protocol.position[2],
      ]}
      scale={[2, 0.5, 1]}
    >
      <spriteMaterial map={canvasTexture} transparent opacity={0.6} depthWrite={false} />
    </sprite>
  )
}

// ─── Single trail line (imperative Three.js Line to avoid SVG <line> type conflict) ───
function TrailLine({ from, to }: { from: ProtocolNode; to: ProtocolNode }) {
  const lineRef = useRef<THREE.Line>(null)
  const materialRef = useRef<THREE.ShaderMaterial>(null)

  const lineObj = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const positions = new Float32Array(TRAIL_SEGMENTS * 3)
    const progress = new Float32Array(TRAIL_SEGMENTS)

    const mid = [
      (from.position[0] + to.position[0]) / 2 + (Math.random() - 0.5) * 1.5,
      (from.position[1] + to.position[1]) / 2 + (Math.random() - 0.5) * 1.5,
      (from.position[2] + to.position[2]) / 2 + (Math.random() - 0.5) * 1.5,
    ]

    for (let k = 0; k < TRAIL_SEGMENTS; k++) {
      const t = k / (TRAIL_SEGMENTS - 1)
      const inv = 1 - t
      positions[k * 3] = inv * inv * from.position[0] + 2 * inv * t * mid[0] + t * t * to.position[0]
      positions[k * 3 + 1] = inv * inv * from.position[1] + 2 * inv * t * mid[1] + t * t * to.position[1]
      positions[k * 3 + 2] = inv * inv * from.position[2] + 2 * inv * t * mid[2] + t * t * to.position[2]
      progress[k] = t
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('aProgress', new THREE.BufferAttribute(progress, 1))

    const mat = new THREE.ShaderMaterial({
      vertexShader: trailVertexShader,
      fragmentShader: trailFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uColorA: { value: new THREE.Color(from.color) },
        uColorB: { value: new THREE.Color(to.color) },
      },
    })

    const line = new THREE.Line(geo, mat)
    return { line, material: mat }
  }, [from, to])

  useFrame(({ clock }) => {
    lineObj.material.uniforms.uTime.value = clock.elapsedTime
  })

  return <primitive object={lineObj.line} />
}

// ─── Connection Trails between protocols ───
function ConnectionTrails() {
  const pairs = useMemo(() => {
    const result: Array<{ from: ProtocolNode; to: ProtocolNode }> = []
    for (let i = 0; i < PROTOCOLS.length; i++) {
      for (let j = i + 1; j < PROTOCOLS.length; j++) {
        const a = PROTOCOLS[i]
        const b = PROTOCOLS[j]
        const dist = Math.sqrt(
          (a.position[0] - b.position[0]) ** 2 +
          (a.position[1] - b.position[1]) ** 2 +
          (a.position[2] - b.position[2]) ** 2
        )
        if (dist < 7) {
          result.push({ from: a, to: b })
        }
      }
    }
    return result
  }, [])

  return (
    <group>
      {pairs.map((pair, i) => (
        <TrailLine key={i} from={pair.from} to={pair.to} />
      ))}
    </group>
  )
}

// ─── Background particles (ambient dust) ───
function BackgroundDust() {
  const pointsRef = useRef<THREE.Points>(null)

  const geometry = useMemo(() => {
    const count = 300
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return geo
  }, [])

  useFrame(({ clock }) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = clock.elapsedTime * 0.02
      pointsRef.current.rotation.x = clock.elapsedTime * 0.01
    }
  })

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        color="#4a5568"
        size={0.02}
        transparent
        opacity={0.3}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

// ─── World group with auto-rotation + bounds projection ───
function WorldGroup({ onBoundsUpdate }: { onBoundsUpdate: (bounds: GraphBounds) => void }) {
  const groupRef = useRef<THREE.Group>(null)
  const { camera, size } = useThree()

  useFrame(({ clock }) => {
    if (!groupRef.current) return

    // Slow auto-rotation (Giza style)
    groupRef.current.rotation.y += BASE_ROTATION_SPEED
    groupRef.current.rotation.x = Math.sin(clock.elapsedTime * 0.05) * 0.1

    // Project the bounding sphere of all protocols to 2D screen space
    const tempVec = new THREE.Vector3()
    let minX = Infinity, maxX = -Infinity
    let minY = Infinity, maxY = -Infinity
    let cx = 0, cy = 0

    for (const proto of PROTOCOLS) {
      tempVec.set(...proto.position)
      groupRef.current.localToWorld(tempVec)
      tempVec.project(camera)

      const screenX = (tempVec.x + 1) / 2 * size.width
      const screenY = (1 - (tempVec.y + 1) / 2) * size.height

      const padding = proto.radius * 35
      minX = Math.min(minX, screenX - padding)
      maxX = Math.max(maxX, screenX + padding)
      minY = Math.min(minY, screenY - padding)
      maxY = Math.max(maxY, screenY + padding)
    }

    cx = (minX + maxX) / 2
    cy = (minY + maxY) / 2
    const radius = Math.max(maxX - minX, maxY - minY) / 2

    onBoundsUpdate({
      top: minY,
      bottom: maxY,
      left: minX,
      right: maxX,
      centerX: cx,
      centerY: cy,
      radius,
    })
  })

  return (
    <group ref={groupRef} scale={WORLD_SCALE}>
      {PROTOCOLS.map((proto) => (
        <group key={proto.id}>
          <ProtocolSphere protocol={proto} />
          <AgentCloud protocol={proto} />
          <ProtocolLabel protocol={proto} />
        </group>
      ))}
      <ConnectionTrails />
      <BackgroundDust />
    </group>
  )
}

// ─── Main exported component ───
export default function GizaScene({ onBoundsUpdate }: GizaSceneProps) {
  // Throttle bounds updates to avoid excessive re-renders
  const lastBoundsRef = useRef<GraphBounds | null>(null)
  const frameCount = useRef(0)

  const handleBoundsUpdate = useCallback((bounds: GraphBounds) => {
    frameCount.current++
    // Only propagate every 3rd frame
    if (frameCount.current % 3 !== 0) return
    lastBoundsRef.current = bounds
    onBoundsUpdate(bounds)
  }, [onBoundsUpdate])

  return (
    <Canvas
      camera={{ position: [0, 0, 12], fov: 45 }}
      dpr={[1, 1.5]}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      }}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'transparent',
      }}
    >
      <WorldGroup onBoundsUpdate={handleBoundsUpdate} />
    </Canvas>
  )
}
