// =============================================================================
// EVM Configuration
//
// Replace the WebSocket URL below with your own provider endpoint.
// You can get a free project ID from:
//   - Infura:   https://infura.io
//   - Alchemy:  https://alchemy.com
//   - QuickNode: https://quicknode.com
//
// The URL must be a WebSocket (wss://) endpoint that supports eth_subscribe.
// =============================================================================

/** WebSocket URL for an EVM-compatible JSON-RPC node */
export const EVM_WS_URL = "wss://mainnet.infura.io/ws/v3/YOUR_PROJECT_ID";

/** Display name for the chain */
export const CHAIN_NAME = "Ethereum";

/** Maximum number of address nodes to keep in the graph */
export const MAX_NODES = 200;

/** Maximum number of transaction edges to keep in the graph */
export const MAX_EDGES = 500;
