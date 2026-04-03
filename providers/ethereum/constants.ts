/**
 * Ethereum Provider Constants
 * Contract addresses, event topics, and known tokens
 */

// Well-known token addresses for labeling
export const KNOWN_TOKENS: Record<string, { symbol: string; name: string; decimals: number }> = {
  '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': {
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18,
  },
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': {
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
  },
  '0xdac17f958d2ee523a2206206994597c13d831ec7': {
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
  },
  '0x6b175474e89094c44da98b954eedeac495271d0f': {
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    decimals: 18,
  },
  '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599': {
    symbol: 'WBTC',
    name: 'Wrapped BTC',
    decimals: 8,
  },
  '0x514910771af9ca656af840dff83e8264ecf986ca': {
    symbol: 'LINK',
    name: 'Chainlink',
    decimals: 18,
  },
  '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984': {
    symbol: 'UNI',
    name: 'Uniswap',
    decimals: 18,
  },
  '0x7fc66500c84a76ad7e9c93437e434122a1f3aed5': {
    symbol: 'AAVE',
    name: 'Aave',
    decimals: 18,
  },
  '0xc00e94cb662c3520282e6f5717214fead7b620da': {
    symbol: 'COMP',
    name: 'Compound',
    decimals: 18,
  },
};

// Uniswap event topics
export const UNISWAP_V2_SWAP_TOPIC =
  '0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822';
export const UNISWAP_V3_SWAP_TOPIC =
  '0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67';
export const ERC20_TRANSFER_TOPIC =
  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

// Minimum transfer value to display (in wei) — ~0.1 ETH equivalent
export const MIN_TRANSFER_VALUE = BigInt('100000000000000000');

// Event buffering
export const EVENT_BUFFER_SIZE = 300;
export const MAX_EVENTS_PER_SECOND = 10;
