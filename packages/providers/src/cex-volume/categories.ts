import type { CategoryConfig } from '@web3viz/core';

export const CEX_CATEGORIES: CategoryConfig[] = [
  { id: 'cexSpotTrades', label: 'CEX Trades', icon: '$', color: '#FFB300', sourceId: 'cex' },
  { id: 'cexLiquidations', label: 'Liquidations', icon: '\u2716', color: '#FF6D00', sourceId: 'cex' },
];
