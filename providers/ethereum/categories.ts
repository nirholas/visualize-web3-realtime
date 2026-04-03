/**
 * Ethereum Provider Categories
 * Event categories for swaps, transfers, and mints
 */

import type { CategoryConfig } from '@web3viz/core';

export const ETH_CATEGORIES: CategoryConfig[] = [
  { id: 'ethSwaps', label: 'ETH Swaps', icon: '↔', color: '#627EEA' },
  { id: 'ethTransfers', label: 'ETH Transfers', icon: '→', color: '#8B9DC3' },
  { id: 'ethMints', label: 'ETH Mints', icon: '✦', color: '#C99BFF' },
];
