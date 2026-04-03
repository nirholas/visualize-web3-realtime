// ─── Chain & Transaction types for the real-time visualizer ────────────

export type Chain = 'solana' | 'ethereum' | 'bnbchain' | 'base' | 'arbitrum';

export type TxType = 'buy' | 'sell' | 'create' | 'transfer';

export type DataSource = 'pumpfun' | 'raydium' | 'uniswap' | 'pancakeswap' | 'all';

export interface VisualizerTx {
  id: string;
  chain: Chain;
  source: DataSource;
  type: TxType;
  token: string;
  amount: number;        // in USD
  solAmount?: number;     // chain-native amount
  wallet: string;         // truncated
  timestamp: number;
  signature?: string;
}

export interface VisualizerNode {
  id: string;
  tx: VisualizerTx;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
  age: number;           // ms since creation
}

export interface ChainConfig {
  id: Chain;
  label: string;
  color: string;
  icon: string;           // emoji or symbol
}

export interface SourceConfig {
  id: DataSource;
  label: string;
  chains: Chain[];
}

export const CHAINS: ChainConfig[] = [
  { id: 'solana',    label: 'Solana',    color: '#9945FF', icon: '◎' },
  { id: 'ethereum',  label: 'Ethereum',  color: '#627EEA', icon: 'Ξ' },
  { id: 'bnbchain',  label: 'BNB Chain', color: '#F0B90B', icon: '⬡' },
  { id: 'base',      label: 'Base',      color: '#0052FF', icon: '🔵' },
  { id: 'arbitrum',  label: 'Arbitrum',  color: '#28A0F0', icon: '🔷' },
];

export const SOURCES: SourceConfig[] = [
  { id: 'all',          label: 'All Sources',   chains: ['solana', 'ethereum', 'bnbchain', 'base', 'arbitrum'] },
  { id: 'pumpfun',      label: 'Pump.fun',      chains: ['solana'] },
  { id: 'raydium',      label: 'Raydium',       chains: ['solana'] },
  { id: 'uniswap',      label: 'Uniswap',       chains: ['ethereum', 'base', 'arbitrum'] },
  { id: 'pancakeswap',  label: 'PancakeSwap',   chains: ['bnbchain'] },
];

export const TX_TYPES: { id: TxType; label: string; color: string }[] = [
  { id: 'buy',      label: 'Buys',            color: '#00ff6a' },
  { id: 'sell',     label: 'Sells',           color: '#ff3b3b' },
  { id: 'create',   label: 'Token Creates',   color: '#f59e0b' },
  { id: 'transfer', label: 'Transfers',       color: '#666666' },
];

export const CHAIN_MAP = new Map(CHAINS.map(c => [c.id, c]));
export const TX_TYPE_MAP = new Map(TX_TYPES.map(t => [t.id, t]));
