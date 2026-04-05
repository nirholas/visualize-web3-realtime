// ============================================================================
// swarming — Default configuration
//
// Sensible defaults for camera and data mapping. Physics defaults live in
// ./core/physics.ts. Theme configs live in ./themes/.
// ============================================================================

import type { SwarmingNode } from './types';

// ---------------------------------------------------------------------------
// Camera defaults
// ---------------------------------------------------------------------------

export interface CameraConfig {
  /** Camera position [x, y, z]. Default: [0, 55, 12] */
  position?: [number, number, number];
  /** Field of view in degrees. Default: 45 */
  fov?: number;
}

export const DEFAULT_CAMERA: Required<CameraConfig> = {
  position: [0, 55, 12],
  fov: 45,
};

// ---------------------------------------------------------------------------
// Default event-to-node mapper
// ---------------------------------------------------------------------------

/** Default WebSocket message mapper — extracts id/label/group/size from JSON */
export function defaultMapEvent(raw: Record<string, unknown>): SwarmingNode {
  return {
    id: String(
      raw.id ?? raw.txHash ?? raw.hash ?? raw.signature ?? raw.address ??
      Math.random().toString(36).slice(2),
    ),
    label: String(raw.label ?? raw.symbol ?? raw.name ?? raw.token ?? ''),
    group: raw.group != null ? String(raw.group) :
           raw.type != null ? String(raw.type) :
           raw.chain != null ? String(raw.chain) :
           raw.category != null ? String(raw.category) : undefined,
    size: typeof raw.value === 'number' ? raw.value :
          typeof raw.amount === 'number' ? raw.amount :
          typeof raw.size === 'number' ? raw.size : undefined,
    meta: raw.meta as Record<string, unknown> | undefined,
  };
}
