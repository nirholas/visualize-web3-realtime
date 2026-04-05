// ============================================================================
// Physics Worker Bridge — main-thread API for the physics Web Worker
//
// Provides a Promise-based interface to the physics worker.
// Manages worker lifecycle and message routing.
// ============================================================================

import type { PhysicsCommand, PhysicsResponse } from './physics-worker';

export interface PhysicsWorkerOptions {
  /** WASM simulation config */
  config?: Record<string, unknown>;
  /** URL to the .wasm file (optional) */
  wasmUrl?: string;
  /** Callback for position updates from tick commands */
  onPositions?: (positions: Float64Array) => void;
}

export class PhysicsWorkerBridge {
  private worker: Worker | null = null;
  private ready = false;
  private readyPromise: Promise<void>;
  private resolveReady!: () => void;
  private onPositions?: (positions: Float64Array) => void;
  private pendingCallbacks: Array<(response: PhysicsResponse) => void> = [];

  constructor(options: PhysicsWorkerOptions = {}) {
    this.onPositions = options.onPositions;

    this.readyPromise = new Promise((resolve) => {
      this.resolveReady = resolve;
    });

    // Create the worker
    this.worker = new Worker(
      new URL('./physics-worker.ts', import.meta.url),
      { type: 'module' }
    );

    this.worker.onmessage = (event: MessageEvent<PhysicsResponse>) => {
      this.handleMessage(event.data);
    };

    this.worker.onerror = (err) => {
      console.error('[PhysicsWorker] Error:', err);
    };

    // Send init command
    this.send({ type: 'init', config: options.config, wasmUrl: options.wasmUrl });
  }

  private handleMessage(msg: PhysicsResponse): void {
    if (msg.type === 'ready') {
      this.ready = true;
      this.resolveReady();
      return;
    }

    if (msg.type === 'positions' && this.onPositions) {
      this.onPositions(msg.data);
    }

    // Resolve pending callback if any
    const cb = this.pendingCallbacks.shift();
    if (cb) cb(msg);
  }

  /** Wait for the worker to be initialized and ready. */
  async waitReady(): Promise<void> {
    return this.readyPromise;
  }

  /** Send a command to the worker (fire-and-forget). */
  send(cmd: PhysicsCommand): void {
    this.worker?.postMessage(cmd);
  }

  /** Send a command and wait for the response. */
  async sendAsync(cmd: PhysicsCommand): Promise<PhysicsResponse> {
    return new Promise((resolve) => {
      this.pendingCallbacks.push(resolve);
      this.send(cmd);
    });
  }

  // --- Convenience methods ---

  addNode(id: string, x: number, y: number, z: number, nodeType: number, radius: number): void {
    this.send({ type: 'addNode', id, x, y, z, nodeType, radius });
  }

  addEdge(source: string, target: string): void {
    this.send({ type: 'addEdge', source, target });
  }

  removeNode(id: string): void {
    this.send({ type: 'removeNode', id });
  }

  removeEdge(source: string, target: string): void {
    this.send({ type: 'removeEdge', source, target });
  }

  clear(): void {
    this.send({ type: 'clear' });
  }

  /** Request a tick. Positions will be delivered via onPositions callback. */
  tick(): void {
    this.send({ type: 'tick' });
  }

  /** Request a tick and wait for positions. */
  async tickAsync(): Promise<Float64Array> {
    const resp = await this.sendAsync({ type: 'tick' });
    if (resp.type === 'positions') return resp.data;
    throw new Error(`Unexpected response: ${resp.type}`);
  }

  /** Send a batch of commands. */
  batch(commands: PhysicsCommand[]): void {
    this.send({ type: 'batch', commands });
  }

  setAlpha(alpha: number): void {
    this.send({ type: 'setAlpha', alpha });
  }

  setCharge(strength: number): void {
    this.send({ type: 'setCharge', strength });
  }

  setMouseRepulsion(x: number, y: number, z: number, strength: number, radius: number): void {
    this.send({ type: 'setMouseRepulsion', x, y, z, strength, radius });
  }

  /** Terminate the worker. */
  dispose(): void {
    this.worker?.terminate();
    this.worker = null;
    this.ready = false;
  }
}
