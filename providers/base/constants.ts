/**
 * Base (Coinbase L2) Provider Constants
 * Contract addresses, event topics, and known tokens
 */

// Well-known Base token addresses for labeling
export const KNOWN_BASE_TOKENS: Record<string, { symbol: string; name: string; decimals: number }> = {
  '0x4200000000000000000000000000000000000006': {
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18,
  },
  '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913': {
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
  },
  '0xd9aaec86b65d86f6a7b5b1b0c42ffa531710b6ca': {
    symbol: 'USDbC',
    name: 'USD Base Coin',
    decimals: 6,
  },
  '0x50c5725949a6f0c72e6c4a641f24049a917db0cb': {
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    decimals: 18,
  },
  '0x940181a94a35a4569e4529a3cdfb74e38fd98631': {
    symbol: 'AERO',
    name: 'Aerodrome',
    decimals: 18,
  },
  '0x532f27101965dd16442e59d40670faf5ebb142e4': {
    symbol: 'BRETT',
    name: 'Brett',
    decimals: 18,
  },
  '0xfa980ced6895ac314e7de34ef1bfae90a5add21b': {
    symbol: 'PRIME',
    name: 'Echelon Prime',
    decimals: 18,
  },
};

// Aerodrome (Uniswap V2-style) swap topic — same as Uniswap V2
export const AERODROME_SWAP_TOPIC =
  '0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822';

// Uniswap V3 on Base swap topic
export const UNISWAP_V3_SWAP_TOPIC =
  '0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67';

// ERC-20 Transfer topic
export const ERC20_TRANSFER_TOPIC =
  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

// Minimum transfer value to display (in wei) — ~0.05 ETH equivalent
// Lower threshold than Ethereum mainnet since Base has cheaper txs
export const MIN_TRANSFER_VALUE = BigInt('50000000000000000');

// Event buffering — Base has faster blocks (~2s), so higher throttle
export const EVENT_BUFFER_SIZE = 300;
export const MAX_EVENTS_PER_SECOND = 10;
