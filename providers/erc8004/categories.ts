/**
 * ERC-8004 Provider Categories
 * Event categories for mints, transfers, and metadata updates
 */

import type { CategoryConfig } from '@web3viz/core';

export const ERC8004_CATEGORIES: CategoryConfig[] = [
  { id: 'erc8004Mints', label: 'Asset Mints', icon: '◈', color: '#00BCD4', sourceId: 'erc8004' },
  { id: 'erc8004Transfers', label: 'Asset Transfers', icon: '◇', color: '#26C6DA', sourceId: 'erc8004' },
  { id: 'erc8004Updates', label: 'Metadata Updates', icon: '↻', color: '#00ACC1', sourceId: 'erc8004' },
];
