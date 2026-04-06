'use client';

/**
 * Provider registration entry point (legacy).
 *
 * NOTE: The active app uses app/world/providers.ts to instantiate providers
 * and pass them to useProviders(). These side-effect imports are kept for
 * standalone use cases that rely on the global registry.
 */

import './solana-pumpfun';
import './ethereum';
import './base';
import './erc8004';

export {};
