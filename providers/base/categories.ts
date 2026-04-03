/**
 * Base (Coinbase L2) Event Categories
 */

import type { CategoryConfig } from '@web3viz/core';

export const BASE_CATEGORIES: CategoryConfig[] = [
  { id: 'baseSwaps',     label: 'Base Swaps',     icon: '↔', color: '#0052FF' },
  { id: 'baseTransfers', label: 'Base Transfers',  icon: '→', color: '#3B7CFF' },
  { id: 'baseMints',     label: 'Base Mints',      icon: '✦', color: '#6CA0FF' },
];
