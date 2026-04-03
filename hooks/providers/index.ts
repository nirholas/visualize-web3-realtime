// Provider barrel — import all available data sources from here
export { usePumpFunProvider, PUMPFUN_SOURCE, PUMPFUN_CATEGORIES, type PumpFunProviderResult } from './pumpfun';
export { useEthereumProvider, ETHEREUM_SOURCE, ETHEREUM_CATEGORIES, type EthereumProviderResult } from './ethereum';
export { useBaseProvider, BASE_SOURCE, BASE_CATEGORIES, type BaseProviderResult } from './base';
export { useAgentsProvider, AGENTS_SOURCE, AGENTS_CATEGORIES, type AgentsProviderResult } from './agents';
export { useERC8004Provider, ERC8004_SOURCE, ERC8004_CATEGORIES, type ERC8004ProviderResult } from './erc8004';
export { useCEXProvider, CEX_SOURCE, CEX_CATEGORIES, type CEXProviderResult } from './cex';

// Re-export source configs as a convenience array
import { PUMPFUN_SOURCE } from './pumpfun';
import { ETHEREUM_SOURCE } from './ethereum';
import { BASE_SOURCE } from './base';
import { AGENTS_SOURCE } from './agents';
import { ERC8004_SOURCE } from './erc8004';
import { CEX_SOURCE } from './cex';

import type { SourceConfig } from '@web3viz/core';

/** All available data source configurations */
export const ALL_SOURCES: SourceConfig[] = [
  PUMPFUN_SOURCE,
  ETHEREUM_SOURCE,
  BASE_SOURCE,
  AGENTS_SOURCE,
  ERC8004_SOURCE,
  CEX_SOURCE,
];

/** Map from source ID to source config — for O(1) lookup by provider ID */
export const SOURCE_CONFIG_MAP: Record<string, SourceConfig> = Object.fromEntries(
  ALL_SOURCES.map((s) => [s.id, s]),
);
