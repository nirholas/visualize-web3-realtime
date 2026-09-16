// ============================================================================
// Swarming — script-tag entry point
//
// The IIFE bundle assigns this module's exports to `window.Swarming`, so the
// named export here is what CDN users call: `Swarming.create('#viz', {...})`.
// ============================================================================

import { Swarming } from './umd';

export const create = Swarming.create;
