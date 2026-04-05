// ============================================================================
// Physics Web Worker — runs WASM force simulation off the main thread
//
// Communication protocol:
//   Main -> Worker: PhysicsCommand messages
//   Worker -> Main: PhysicsResponse messages
//
// Position data is transferred as Float64Array for zero-copy when possible.
// ============================================================================

import type { WasmSimulation } from './wasm-loader';

// ---------------------------------------------------------------------------
// Message types
// ---------------------------------------------------------------------------

export type PhysicsCommand =
  | { type: 'init'; config?: Record<string, unknown>; wasmUrl?: string }
  | { type: 'addNode'; id: string; x: number; y: number; z: number; nodeType: number; radius: number }
  | { type: 'addEdge'; source: string; target: string }
  | { type: 'removeNode'; id: string }
  | { type: 'removeEdge'; source: string; target: string }
  | { type: 'clear' }
  | { type: 'tick' }
  | { type: 'tickN'; n: number }
  | { type: 'setAlpha'; alpha: number }
  | { type: 'setCharge'; strength: number }
  | { type: 'setAgentCharge'; strength: number }
  | { type: 'setLinkDistance'; distance: number }
  | { type: 'setAgentLinkDistance'; distance: number }
  | { type: 'setCenterPull'; pull: number }
  | { type: 'setCollisionRadius'; radius: number }
  | { type: 'setTheta'; theta: number }
  | { type: 'setMouseRepulsion'; x: number; y: number; z: number; strength: number; radius: number }
  | { type: 'getPositions' }
  | { type: 'getNodeIds' }
  | { type: 'batch'; commands: PhysicsCommand[] };

export type PhysicsResponse =
  | { type: 'ready' }
  | { type: 'positions'; data: Float64Array }
  | { type: 'nodeIds'; data: string }
  | { type: 'error'; message: string }
  | { type: 'ack' };

// ---------------------------------------------------------------------------
// Worker implementation (only runs inside the worker context)
// ---------------------------------------------------------------------------

let sim: WasmSimulation | null = null;

async function handleInit(config?: Record<string, unknown>, wasmUrl?: string): Promise<void> {
  const { loadWasmPhysics } = await import('./wasm-loader');
  const wasm = await loadWasmPhysics(wasmUrl);
  sim = new wasm.Simulation(config);
}

function handleCommand(cmd: PhysicsCommand): PhysicsResponse | null {
  if (!sim && cmd.type !== 'init') {
    return { type: 'error', message: 'Simulation not initialized. Send "init" first.' };
  }

  switch (cmd.type) {
    case 'init':
      // Handled async separately
      return null;

    case 'addNode':
      sim!.add_node(cmd.id, cmd.x, cmd.y, cmd.z, cmd.nodeType, cmd.radius);
      return { type: 'ack' };

    case 'addEdge':
      sim!.add_edge(cmd.source, cmd.target);
      return { type: 'ack' };

    case 'removeNode':
      sim!.remove_node(cmd.id);
      return { type: 'ack' };

    case 'removeEdge':
      sim!.remove_edge(cmd.source, cmd.target);
      return { type: 'ack' };

    case 'clear':
      sim!.clear();
      return { type: 'ack' };

    case 'tick': {
      const positions = sim!.tick();
      return { type: 'positions', data: positions };
    }

    case 'tickN': {
      const positions = sim!.tick_n(cmd.n);
      return { type: 'positions', data: positions };
    }

    case 'setAlpha':
      sim!.set_alpha(cmd.alpha);
      return { type: 'ack' };

    case 'setCharge':
      sim!.set_charge(cmd.strength);
      return { type: 'ack' };

    case 'setAgentCharge':
      sim!.set_agent_charge(cmd.strength);
      return { type: 'ack' };

    case 'setLinkDistance':
      sim!.set_link_distance(cmd.distance);
      return { type: 'ack' };

    case 'setAgentLinkDistance':
      sim!.set_agent_link_distance(cmd.distance);
      return { type: 'ack' };

    case 'setCenterPull':
      sim!.set_center_pull(cmd.pull);
      return { type: 'ack' };

    case 'setCollisionRadius':
      sim!.set_collision_radius(cmd.radius);
      return { type: 'ack' };

    case 'setTheta':
      sim!.set_theta(cmd.theta);
      return { type: 'ack' };

    case 'setMouseRepulsion':
      sim!.set_mouse_repulsion(cmd.x, cmd.y, cmd.z, cmd.strength, cmd.radius);
      return { type: 'ack' };

    case 'getPositions': {
      const positions = sim!.get_positions();
      return { type: 'positions', data: positions };
    }

    case 'getNodeIds':
      return { type: 'nodeIds', data: sim!.get_node_ids() };

    case 'batch': {
      let lastPositionResponse: PhysicsResponse | null = null;
      for (const subcmd of cmd.commands) {
        const resp = handleCommand(subcmd);
        if (resp?.type === 'positions') {
          lastPositionResponse = resp;
        }
      }
      return lastPositionResponse ?? { type: 'ack' };
    }
  }
}

// Only set up message handler if we're in a Worker context
if (typeof self !== 'undefined' && typeof (self as DedicatedWorkerGlobalScope).onmessage !== 'undefined') {
  self.onmessage = async (event: MessageEvent<PhysicsCommand>) => {
    const cmd = event.data;

    try {
      if (cmd.type === 'init') {
        await handleInit(cmd.config, cmd.wasmUrl);
        (self as DedicatedWorkerGlobalScope).postMessage({ type: 'ready' } satisfies PhysicsResponse);
        return;
      }

      const response = handleCommand(cmd);
      if (response) {
        // Transfer Float64Array buffer for zero-copy
        if (response.type === 'positions' && response.data.buffer) {
          (self as DedicatedWorkerGlobalScope).postMessage(response, [response.data.buffer]);
        } else {
          (self as DedicatedWorkerGlobalScope).postMessage(response);
        }
      }
    } catch (err) {
      (self as DedicatedWorkerGlobalScope).postMessage({
        type: 'error',
        message: err instanceof Error ? err.message : String(err),
      } satisfies PhysicsResponse);
    }
  };
}
