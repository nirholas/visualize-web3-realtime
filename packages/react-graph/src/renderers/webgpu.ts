// ============================================================================
// WebGPU Force Engine
//
// GPU-accelerated force simulation using WebGPU compute shaders.
// Falls back gracefully when WebGPU is unavailable.
// ============================================================================

/// <reference types="@webgpu/types" />

import { FORCE_SHADER_SOURCE } from './shaders';

// Minimal WebGPU ambient type declarations to avoid depending on @webgpu/types
/* eslint-disable @typescript-eslint/no-explicit-any */
type GPUDevice = any;
type GPUComputePipeline = any;
type GPUBindGroup = any;
type GPUBuffer = any;

// WebGPU buffer usage flags — declared locally to avoid depending on @webgpu/types
const GPU_BUFFER_USAGE = {
  STORAGE: 0x0080,
  COPY_SRC: 0x0004,
  COPY_DST: 0x0008,
  UNIFORM: 0x0040,
  MAP_READ: 0x0001,
} as const;
const GPU_MAP_MODE = { READ: 0x0001 } as const;
/* eslint-enable @typescript-eslint/no-explicit-any */

// ============================================================================
// Types
// ============================================================================

export interface GPUNodeData {
  x: number;
  y: number;
  z: number;
  radius: number;
  vx: number;
  vy: number;
  vz: number;
  /** 0 = hub, 1 = agent */
  nodeType: number;
}

export interface GPUEdgeData {
  source: number;
  target: number;
  restLength: number;
  strength: number;
}

interface SimParams {
  nodeCount: number;
  edgeCount: number;
  deltaTime: number;
  alpha: number;
  alphaDecay: number;
  alphaMin: number;
  velocityDecay: number;
  centerStrength: number;
  collisionStrength: number;
  hubCharge: number;
  agentCharge: number;
}

// ============================================================================
// WebGPU Force Engine
// ============================================================================

export class WebGPUForceEngine {
  private device: GPUDevice | null = null;
  private pipeline: GPUComputePipeline | null = null;
  private bindGroup: GPUBindGroup | null = null;

  private paramsBuffer: GPUBuffer | null = null;
  private positionBuffer: GPUBuffer | null = null;
  private velocityBuffer: GPUBuffer | null = null;
  private edgeBuffer: GPUBuffer | null = null;
  private readbackBuffer: GPUBuffer | null = null;

  private nodeCount = 0;
  private edgeCount = 0;
  private _ready = false;

  get ready(): boolean {
    return this._ready;
  }

  async init(): Promise<boolean> {
    if (typeof navigator === 'undefined' || !navigator.gpu) return false;

    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) return false;

      this.device = await adapter.requestDevice();
      const shaderModule = this.device.createShaderModule({
        code: FORCE_SHADER_SOURCE,
      });

      this.pipeline = this.device.createComputePipeline({
        layout: 'auto',
        compute: { module: shaderModule, entryPoint: 'compute_forces' },
      });

      this._ready = true;
      return true;
    } catch {
      return false;
    }
  }

  uploadGraph(nodes: GPUNodeData[], edges: GPUEdgeData[]): void {
    if (!this.device || !this.pipeline) return;

    this.nodeCount = nodes.length;
    this.edgeCount = edges.length;

    if (this.nodeCount === 0) return;

    // Position buffer: [x, y, z, radius] per node
    const posData = new Float32Array(this.nodeCount * 4);
    for (let i = 0; i < this.nodeCount; i++) {
      const n = nodes[i];
      posData[i * 4] = n.x;
      posData[i * 4 + 1] = n.y;
      posData[i * 4 + 2] = n.z;
      posData[i * 4 + 3] = n.radius;
    }

    // Velocity buffer: [vx, vy, vz, nodeType] per node
    const velData = new Float32Array(this.nodeCount * 4);
    for (let i = 0; i < this.nodeCount; i++) {
      const n = nodes[i];
      velData[i * 4] = n.vx;
      velData[i * 4 + 1] = n.vy;
      velData[i * 4 + 2] = n.vz;
      velData[i * 4 + 3] = n.nodeType;
    }

    // Edge buffer: [source, target, restLength, strength] per edge
    const edgeData = new Float32Array(Math.max(this.edgeCount, 1) * 4);
    for (let i = 0; i < this.edgeCount; i++) {
      const e = edges[i];
      edgeData[i * 4] = e.source;
      edgeData[i * 4 + 1] = e.target;
      edgeData[i * 4 + 2] = e.restLength;
      edgeData[i * 4 + 3] = e.strength;
    }

    const device = this.device;
    const usage = GPU_BUFFER_USAGE.STORAGE | GPU_BUFFER_USAGE.COPY_SRC | GPU_BUFFER_USAGE.COPY_DST;

    this.disposeBuffers();

    this.positionBuffer = device.createBuffer({ size: posData.byteLength, usage });
    device.queue.writeBuffer(this.positionBuffer, 0, posData);

    this.velocityBuffer = device.createBuffer({ size: velData.byteLength, usage });
    device.queue.writeBuffer(this.velocityBuffer, 0, velData);

    this.edgeBuffer = device.createBuffer({
      size: edgeData.byteLength,
      usage: GPU_BUFFER_USAGE.STORAGE | GPU_BUFFER_USAGE.COPY_DST,
    });
    device.queue.writeBuffer(this.edgeBuffer, 0, edgeData);

    this.paramsBuffer = device.createBuffer({
      size: 48, // 12 floats
      usage: GPU_BUFFER_USAGE.UNIFORM | GPU_BUFFER_USAGE.COPY_DST,
    });

    this.readbackBuffer = device.createBuffer({
      size: posData.byteLength,
      usage: GPU_BUFFER_USAGE.MAP_READ | GPU_BUFFER_USAGE.COPY_DST,
    });

    this.bindGroup = device.createBindGroup({
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.paramsBuffer } },
        { binding: 1, resource: { buffer: this.positionBuffer } },
        { binding: 2, resource: { buffer: this.velocityBuffer } },
        { binding: 3, resource: { buffer: this.edgeBuffer } },
      ],
    });
  }

  tick(params: SimParams): void {
    if (!this.device || !this.pipeline || !this.bindGroup || !this.paramsBuffer) return;
    if (this.nodeCount === 0) return;

    const paramsData = new Float32Array([
      params.nodeCount,
      params.edgeCount,
      params.deltaTime,
      params.alpha,
      params.alphaDecay,
      params.alphaMin,
      params.velocityDecay,
      params.centerStrength,
      params.collisionStrength,
      params.hubCharge,
      params.agentCharge,
      0, // padding
    ]);

    // Reinterpret first two as u32
    const view = new DataView(paramsData.buffer);
    view.setUint32(0, params.nodeCount, true);
    view.setUint32(4, params.edgeCount, true);

    this.device.queue.writeBuffer(this.paramsBuffer, 0, paramsData);

    const encoder = this.device.createCommandEncoder();
    const pass = encoder.beginComputePass();
    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.bindGroup);
    pass.dispatchWorkgroups(Math.ceil(this.nodeCount / 256));
    pass.end();

    this.device.queue.submit([encoder.finish()]);
  }

  async readPositions(): Promise<Float32Array | null> {
    if (!this.device || !this.positionBuffer || !this.readbackBuffer) return null;

    const encoder = this.device.createCommandEncoder();
    encoder.copyBufferToBuffer(
      this.positionBuffer,
      0,
      this.readbackBuffer,
      0,
      this.nodeCount * 16,
    );
    this.device.queue.submit([encoder.finish()]);

    await this.readbackBuffer.mapAsync(GPU_MAP_MODE.READ);
    const data = new Float32Array(this.readbackBuffer.getMappedRange().slice(0));
    this.readbackBuffer.unmap();
    return data;
  }

  private disposeBuffers(): void {
    this.positionBuffer?.destroy();
    this.velocityBuffer?.destroy();
    this.edgeBuffer?.destroy();
    this.paramsBuffer?.destroy();
    this.readbackBuffer?.destroy();
    this.positionBuffer = null;
    this.velocityBuffer = null;
    this.edgeBuffer = null;
    this.paramsBuffer = null;
    this.readbackBuffer = null;
    this.bindGroup = null;
  }

  dispose(): void {
    this.disposeBuffers();
    this.device?.destroy();
    this.device = null;
    this.pipeline = null;
    this._ready = false;
  }
}
